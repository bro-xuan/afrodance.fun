import { corr, pairedReturns } from "@/app/marketintel/lib/quant";
import type { CrossData, CrossQuote } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, num, settle } from "../_lib/http";
import { yahooChart, type YBar } from "../_lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 20;

/**
 * Live cross-asset tape for BTC: dollar, yields, equity futures and gold
 * from Yahoo (FRED prints a day late), plus how tightly BTC has actually
 * traded with Nasdaq and the dollar lately. If the correlation is near zero,
 * the macro tape matters less for today's BTC move.
 */

const DAY = 86_400_000;
const SYMBOLS = [
  { key: "dxy", symbol: "DX-Y.NYB", label: "Dollar index (DXY)", unit: "index" as const },
  { key: "us10y", symbol: "^TNX", label: "US 10Y yield", unit: "pct" as const },
  { key: "nq", symbol: "NQ=F", label: "Nasdaq 100 futures", unit: "index" as const },
  { key: "es", symbol: "ES=F", label: "S&P 500 futures", unit: "index" as const },
  { key: "gold", symbol: "GC=F", label: "Gold futures", unit: "usd" as const },
];

const dateNY = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export async function GET() {
  const now = Date.now();
  const { values: v, sources } = await settle({
    ...Object.fromEntries(SYMBOLS.map((s) => [`yahoo-${s.key}`, () => yahooChart(s.symbol, "6mo", "1d")])),
    "binance-btc-1d": async () => {
      const rows = await getJSON<[number, string, string, string, string][]>("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=200");
      return rows.flatMap((k) => {
        const c = num(k[4]);
        return c === null ? [] : [{ t: k[0], c }];
      });
    },
  } as Record<string, () => Promise<unknown>>);

  const quotes: CrossQuote[] = SYMBOLS.flatMap((s) => {
    const r = v[`yahoo-${s.key}`] as Awaited<ReturnType<typeof yahooChart>> | null;
    if (!r?.bars.length) return [];
    const lastT = (r.meta.regularMarketTime ?? 0) * 1000 || r.bars.at(-1)!.t;
    const last = r.meta.regularMarketPrice ?? r.bars.at(-1)!.c;
    // Previous session's close: the last daily bar dated before the quote's day.
    const prev = [...r.bars].reverse().find((b) => dateNY(b.t) < dateNY(lastT))?.c ?? null;
    return [{
      key: s.key, label: s.label, unit: s.unit, last, t: lastT,
      change: prev !== null ? (s.unit === "pct" ? last - prev : (last / prev - 1) * 100) : null,
      stale: now - lastT > 6 * 3_600_000, // market closed (weekend, holiday, overnight break)
    }];
  });

  // BTC's daily close is 00:00 UTC, i.e. ~20:00 New York the previous day,
  // right after the US close: date it to the New York session it ends.
  const btc = ((v["binance-btc-1d"] as { t: number; c: number }[] | null) ?? []).map((x) => ({ date: dateNY(x.t + DAY - 1), c: x.c }));
  const daily = (key: string) => ((v[`yahoo-${key}`] as { bars: YBar[] } | null)?.bars ?? []).map((b) => ({ date: dateNY(b.t), c: b.c }));
  const sd = (xs: readonly number[]) => {
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
  };
  const pair = (key: string, label: string) => {
    const [a, b] = pairedReturns(btc, daily(key));
    const c30 = corr(a.slice(-30), b.slice(-30));
    const sdB = b.length >= 30 ? sd(b.slice(-30)) : 0;
    return {
      key, label,
      corr30: c30,
      corr90: corr(a.slice(-90), b.slice(-90)),
      // BTC % move per 1% move in the other market, over 30 sessions: corr × σBTC / σother.
      beta30: c30 !== null && sdB > 0 ? (c30 * sd(a.slice(-30))) / sdB : null,
    };
  };

  const body: CrossData = {
    asOf: now,
    quotes,
    correlations: [pair("nq", "BTC vs Nasdaq 100"), pair("dxy", "BTC vs dollar (DXY)"), pair("gold", "BTC vs gold")],
    sources,
  };
  return cachedJson(body, 60);
}
