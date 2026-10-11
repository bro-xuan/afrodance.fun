import type { LiqBin, LiquidationData } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, settle } from "../_lib/http";
import { fetchVenues } from "../_lib/venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 25;

/**
 * Liquidation map — an ESTIMATE of where leveraged positions would be force-
 * closed, built the same way the commercial maps (CoinGlass, Hyblock) are:
 *
 *   1. Walk Binance BTCUSDT 15-minute candles + open-interest snapshots for
 *      the last ~5 days (the deepest window Binance serves at 15m).
 *   2. Every interval where OI rose, new positions opened near that candle's
 *      typical price. Split long vs short by Binance's top-trader long/short
 *      position ratio for the interval, then spread each side across a fixed
 *      leverage mix (5x…100x) and compute each cohort's liquidation price.
 *   3. Where OI fell, shrink every open cohort pro-rata (positions closed).
 *   4. A cohort is removed once a later candle's wick trades through its
 *      liquidation price — it already got liquidated.
 *   5. Bin what survives, and scale Binance → all venues by the current
 *      aggregate-OI / Binance-OI ratio.
 *
 * Nobody outside an exchange knows true per-position leverage, so this is a
 * model, labelled as such on the page. Actual exchange-reported liquidations
 * are served alongside (OKX REST backfill here; live Binance/Bybit/OKX
 * websockets in the browser).
 */

const BF = "https://fapi.binance.com";
const N = 500; // 15m × 500 ≈ 5.2 days
const LEVERAGE: [number, number][] = [
  [5, 0.12],
  [10, 0.28],
  [25, 0.3],
  [50, 0.2],
  [100, 0.1],
];
const MMR = 0.004; // maintenance margin, BTC tier-1-ish
const RANGE = 0.15; // map ±15% around spot

type Kline = [number, string, string, string, string, ...unknown[]];
type Cohort = { liq: number; usd: number; side: "long" | "short" };

function niceStep(raw: number): number {
  const steps = [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
  return steps.find((s) => s >= raw) ?? 5000;
}

function buildMap(klines: Kline[], oi: Map<number, number>, longShare: Map<number, number>) {
  const cohorts: Cohort[] = [];
  let prevOi: number | null = null;

  for (const k of klines) {
    const t = k[0];
    const h = Number(k[2]);
    const l = Number(k[3]);
    const c = Number(k[4]);

    // Wicks through liquidation prices wipe those cohorts.
    for (let i = cohorts.length - 1; i >= 0; i--) {
      const co = cohorts[i];
      if ((co.side === "long" && l <= co.liq) || (co.side === "short" && h >= co.liq)) cohorts.splice(i, 1);
    }

    const cur = oi.get(t);
    if (cur === undefined) continue;
    if (prevOi !== null) {
      const d = cur - prevOi;
      if (d > 0) {
        const entry = (h + l + c) / 3;
        const ls = Math.min(0.8, Math.max(0.2, longShare.get(t) ?? 0.5));
        const usd = d * entry * 2;
        for (const [lev, w] of LEVERAGE) {
          cohorts.push({ side: "long", usd: usd * ls * w, liq: entry * (1 - 1 / lev + MMR) });
          cohorts.push({ side: "short", usd: usd * (1 - ls) * w, liq: entry * (1 + 1 / lev - MMR) });
        }
      } else if (d < 0 && prevOi > 0) {
        const keep = Math.max(0, 1 - -d / prevOi);
        for (const co of cohorts) co.usd *= keep;
      }
    }
    prevOi = cur;
  }
  return cohorts;
}

export async function GET() {
  const [{ venues }, res] = await Promise.all([
    fetchVenues(),
    settle({
      "binance-klines-15m": () => getJSON<Kline[]>(`${BF}/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=${N}`),
      "binance-oi-15m": () =>
        getJSON<{ timestamp: number; sumOpenInterest: string }[]>(`${BF}/futures/data/openInterestHist?symbol=BTCUSDT&period=15m&limit=${N}`),
      "binance-top-15m": () =>
        getJSON<{ timestamp: number; longAccount: string }[]>(`${BF}/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=15m&limit=${N}`),
    }),
  ]);

  const klines = res.values["binance-klines-15m"] ?? [];
  const price = klines.length ? Number(klines[klines.length - 1][4]) : null;
  const oi = new Map((res.values["binance-oi-15m"] ?? []).map((r) => [r.timestamp, Number(r.sumOpenInterest)]));
  const ls = new Map((res.values["binance-top-15m"] ?? []).map((r) => [r.timestamp, Number(r.longAccount)]));

  const binanceOi = venues.find((v) => v.exchange === "Binance" && v.market === "BTCUSDT perp")?.oiUsd;
  const totalOi = venues.reduce((s, v) => s + v.oiUsd, 0);
  const scale = binanceOi && totalOi ? totalOi / binanceOi : 1;

  let bins: LiqBin[] = [];
  let binSize = 0;
  if (price && oi.size > 1) {
    binSize = niceStep(price * 0.0025);
    const lo = Math.floor((price * (1 - RANGE)) / binSize) * binSize;
    const hi = Math.ceil((price * (1 + RANGE)) / binSize) * binSize;
    const map = new Map<number, LiqBin>();
    for (let p = lo; p <= hi; p += binSize) map.set(p, { price: p, longUsd: 0, shortUsd: 0 });
    for (const co of buildMap(klines, oi, ls)) {
      if (co.liq < lo || co.liq > hi) continue;
      const b = map.get(Math.floor(co.liq / binSize) * binSize);
      if (!b) continue;
      if (co.side === "long") b.longUsd += co.usd * scale;
      else b.shortUsd += co.usd * scale;
    }
    bins = [...map.values()];
  }

  const firstKline = klines[0]?.[0];

  const body: LiquidationData = {
    asOf: Date.now(),
    price,
    binSize,
    bins,
    scale,
    windowHours: firstKline ? Math.round((Date.now() - firstKline) / 3_600_000) : 0,
    sources: res.sources,
  };
  return cachedJson(body, 60);
}
