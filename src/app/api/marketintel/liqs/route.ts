import type { RealizedLiq, RealizedLiqData } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, num } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 20;

/**
 * Liquidations that actually happened, last 24h. OKX is the one major venue
 * with a public REST history of forced orders (Binance and Bybit only stream
 * them live), so this is OKX's BTC-USDT swap; the client scales totals to all
 * venues by OKX's share of open interest, the same way the liquidation map
 * scales Binance. One contract = 0.01 BTC.
 */

const URL_ = "https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&uly=BTC-USDT&state=filled&limit=100";
const CT = 0.01;
const H = 3_600_000;
const MAX_PAGES = 20;

type Detail = { bkPx: string; sz: string; posSide: string; ts: string };

export async function GET() {
  const now = Date.now();
  const since = now - 24 * H;
  const orders: RealizedLiq[] = [];
  let after: string | null = null;
  let error: string | undefined;
  let pages = 0;
  try {
    for (; pages < MAX_PAGES; pages++) {
      const r: { code: string; data: { details: Detail[] }[] } = await getJSON(`${URL_}${after ? `&after=${after}` : ""}`);
      const ds = r.data?.[0]?.details ?? [];
      for (const d of ds) {
        const t = num(d.ts);
        const px = num(d.bkPx);
        const sz = num(d.sz);
        if (t === null || px === null || sz === null || t < since) continue;
        orders.push({ t, side: d.posSide === "short" ? "short" : "long", px, usd: sz * CT * px });
      }
      if (ds.length < 100 || num(ds[ds.length - 1].ts)! < since) break;
      after = ds[ds.length - 1].ts;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const oldest = orders.reduce((m, o) => Math.min(m, o.t), now);
  const sum = (hours: number) => {
    const xs = orders.filter((o) => o.t >= now - hours * H);
    return { long: xs.filter((o) => o.side === "long").reduce((s, o) => s + o.usd, 0), short: xs.filter((o) => o.side === "short").reduce((s, o) => s + o.usd, 0) };
  };
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const t = Math.floor(now / H) * H - (23 - i) * H;
    const xs = orders.filter((o) => o.t >= t && o.t < t + H);
    return { t, long: xs.filter((o) => o.side === "long").reduce((s, o) => s + o.usd, 0), short: xs.filter((o) => o.side === "short").reduce((s, o) => s + o.usd, 0) };
  });

  const body: RealizedLiqData = {
    asOf: now,
    h1: sum(1),
    h4: sum(4),
    h24: sum(24),
    hourly,
    largest: [...orders].sort((a, b) => b.usd - a.usd).slice(0, 8),
    // If the page cap hit before 24h, say how far back the totals reach.
    coverageHours: pages >= MAX_PAGES ? (now - oldest) / H : 24,
    sources: [{ source: "okx-liquidations", ok: !error, ...(error ? { error: error.slice(0, 120) } : {}) }],
  };
  return cachedJson(body, 60);
}
