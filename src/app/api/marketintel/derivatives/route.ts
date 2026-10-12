import type { DerivativesData, OiPoint, RatioPoint } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, num, settle } from "../_lib/http";
import { fetchVenues, weightedFunding } from "../_lib/venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Binance & Bybit geo-block US datacenters; Frankfurt reaches every venue.
export const preferredRegion = ["fra1"];
export const maxDuration = 20;

const HOURS = 48;
const BF = "https://fapi.binance.com";

type Kline = [number, string, string, string, string, ...unknown[]];
type Pt = { t: number; v: number };

const series = <T>(rows: T[], t: (r: T) => unknown, v: (r: T) => unknown): Pt[] =>
  rows.flatMap((r) => {
    const tt = num(t(r));
    const vv = num(v(r));
    return tt !== null && vv !== null ? [{ t: tt, v: vv }] : [];
  });

const binanceRatio = (path: string, field: string) => async () =>
  series(
    await getJSON<Record<string, string>[]>(`${BF}/futures/data/${path}?symbol=BTCUSDT&period=1h&limit=${HOURS}`),
    (r) => r.timestamp,
    (r) => r[field],
  );

export async function GET() {
  const [{ venues, sources: venueSources }, hist] = await Promise.all([
    fetchVenues(),
    settle({
      "binance-klines": async () =>
        series(await getJSON<Kline[]>(`${BF}/fapi/v1/klines?symbol=BTCUSDT&interval=1h&limit=${HOURS}`), (k) => k[0], (k) => k[4]),
      // OI history is kept in BTC (coins), not USD: USD OI rises mechanically
      // with price, which would hide whether positions are actually opening.
      "binance-oi-hist": binanceRatio("openInterestHist", "sumOpenInterest"),
      "bybit-oi-hist": async () => {
        const r = await getJSON<{ result: { list: { openInterest: string; timestamp: string }[] } }>(
          `https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=${HOURS}`,
        );
        return series(r.result.list, (x) => x.timestamp, (x) => x.openInterest); // BTC
      },
      "okx-oi-hist": async () => {
        const r = await getJSON<{ data: string[][] }>(
          `https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=BTC-USDT-SWAP&period=1H&limit=${HOURS}`,
        );
        return series(r.data, (x) => x[0], (x) => x[2]); // [ts, contracts, BTC, USD]
      },
      "binance-ls-accounts": binanceRatio("globalLongShortAccountRatio", "longShortRatio"),
      "binance-ls-top": binanceRatio("topLongShortPositionRatio", "longShortRatio"),
      "binance-taker": binanceRatio("takerlongshortRatio", "buySellRatio"),
      "bybit-ls": async () => {
        const r = await getJSON<{ result: { list: { buyRatio: string; sellRatio: string; timestamp: string }[] } }>(
          `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=${HOURS}`,
        );
        return series(r.result.list, (x) => x.timestamp, (x) => Number(x.buyRatio) / Number(x.sellRatio));
      },
      "okx-ls": async () => {
        const r = await getJSON<{ data: string[][] }>("https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H");
        return series(r.data.slice(0, HOURS), (x) => x[0], (x) => x[1]);
      },
      // Context for "is this funding / OI level unusual?": 90 days of Binance
      // 8h funding prints and 30 days of daily OI (BTC).
      "binance-funding-hist": async () =>
        series(await getJSON<{ fundingTime: number; fundingRate: string }[]>(`${BF}/fapi/v1/fundingRate?symbol=BTCUSDT&limit=270`), (r) => r.fundingTime, (r) => r.fundingRate),
      "binance-oi-daily": async () =>
        series(
          await getJSON<Record<string, string>[]>(`${BF}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=30`),
          (r) => r.timestamp,
          (r) => r.sumOpenInterest,
        ),
      "coinbase-spot": async () => num((await getJSON<{ price: string }>("https://api.exchange.coinbase.com/products/BTC-USD/ticker")).price),
      "binance-spot": async () => num((await getJSON<{ price: string }>("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")).price),
    }),
  ]);

  const v = hist.values;
  const at = (s: Pt[] | null) => new Map((s ?? []).map((p) => [p.t, p.v]));
  const price = at(v["binance-klines"]);
  const bOi = at(v["binance-oi-hist"]);
  const yOi = at(v["bybit-oi-hist"]);
  const oOi = at(v["okx-oi-hist"]);

  // Hourly grid, newest hour = the last kline open.
  const lastT = Math.max(0, ...[...price.keys(), ...bOi.keys(), ...oOi.keys()]);
  const grid = lastT ? Array.from({ length: HOURS }, (_, i) => lastT - (HOURS - 1 - i) * 3_600_000) : [];

  const oiHistory: OiPoint[] = grid.map((t) => ({
    t,
    price: price.get(t) ?? null,
    binance: bOi.get(t) ?? null,
    bybit: yOi.get(t) ?? null,
    okx: oOi.get(t) ?? null,
  }));

  const la = at(v["binance-ls-accounts"]);
  const lt = at(v["binance-ls-top"]);
  const tk = at(v["binance-taker"]);
  const yl = at(v["bybit-ls"]);
  const ol = at(v["okx-ls"]);
  const ratios: RatioPoint[] = grid.map((t) => ({
    t,
    binanceAccounts: la.get(t) ?? null,
    binanceTop: lt.get(t) ?? null,
    binanceTaker: tk.get(t) ?? null,
    bybitAccounts: yl.get(t) ?? null,
    okxAccounts: ol.get(t) ?? null,
  }));

  const cb = v["coinbase-spot"];
  const bn = v["binance-spot"];
  const klines = v["binance-klines"] ?? [];

  const body: DerivativesData = {
    asOf: Date.now(),
    price: bn ?? klines.at(-1)?.v ?? null,
    price24hAgo: klines.length > 24 ? klines[klines.length - 25].v : null,
    venues,
    totalOiUsd: venues.reduce((s, x) => s + x.oiUsd, 0),
    weightedFunding8h: weightedFunding(venues),
    oiHistory,
    ratios,
    coinbasePremiumPct: cb && bn ? ((cb - bn) / bn) * 100 : null,
    fundingHistory: v["binance-funding-hist"] ?? [],
    oiDaily: v["binance-oi-daily"] ?? [],
    sources: [...venueSources, ...hist.sources],
  };
  return cachedJson(body, 30);
}
