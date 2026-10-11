import { describe, expect, it } from "vitest";
import { buildSignals, composite, type Signal } from "./signals";
import type { Candle, DerivativesData, MacroData, MacroStat, PriceData } from "./types";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 11, 20);
const today = Math.floor(now / DAY) * DAY;

const candle = (t: number, c: number, v = 100, delta = 0): Candle => ({ t, o: c, h: c * 1.002, l: c * 0.998, c, v, delta });
/** `days` completed daily candles following `f`, plus today's in-progress one. */
function daily(days: number, f: (i: number) => number): Candle[] {
  return Array.from({ length: days + 1 }, (_, i) => candle(today - (days - i) * DAY, f(i)));
}
const hourly = (n: number, c: (i: number) => number, delta = 0) =>
  Array.from({ length: n }, (_, i) => candle(now - (n - 1 - i) * 3_600_000, c(i), 100, delta));
const px = (d: Candle[], h: Candle[] = []): PriceData => ({ asOf: now, daily: d, hourly: h, sources: [] });
const find = (s: Signal[], key: string) => s.find((x) => x.key === key);

describe("trend read", () => {
  it("is bullish above a rising 200D and bearish below a falling one", () => {
    const up = daily(260, (i) => 50_000 * Math.exp(0.003 * i));
    const down = daily(260, (i) => 100_000 * Math.exp(-0.003 * i));
    const bull = find(buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px(up), now }), "trend")!;
    const bear = find(buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px(down), now }), "trend")!;
    expect(bull.score).toBeGreaterThan(0.4);
    expect(bull.read).toMatch(/uptrend/);
    expect(bear.score).toBeLessThan(-0.4);
    expect(bear.read).toMatch(/downtrend/);
  });

  it("stays out until there are 200 completed days, rather than switching formula", () => {
    const short = daily(150, (i) => 50_000 + i * 100);
    const s = buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px(short), now });
    expect(find(s, "trend")).toBeUndefined();
  });
});

describe("tape read", () => {
  it("is bullish when spot closes over VWAP on net taker buying", () => {
    const h = hourly(24, (i) => 80_000 + i * 40, 10); // +10% net taker share
    const t = find(buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px([], h), now }), "tape")!;
    expect(t.score).toBeGreaterThan(0.3);
  });

  it("ignores taker flow on the Bybit fallback, which has no taker split", () => {
    const t = find(buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px([], hourly(24, () => 80_000)), now }), "tape")!;
    expect(t.read).toMatch(/No taker split/);
    expect(t.score).toBe(0);
  });

  it("skips a zero-volume window instead of printing NaN", () => {
    const h = hourly(24, () => 80_000).map((c) => ({ ...c, v: 0 }));
    expect(find(buildSignals({ d: null, l: null, e: null, p: null, m: null, v: null, px: px([], h), now }), "tape")).toBeUndefined();
  });
});

describe("open interest read", () => {
  const der = (oiNow: number, pxNow: number): DerivativesData => ({
    asOf: now, sources: [], price: pxNow, price24hAgo: 80_000, venues: [], totalOiUsd: 0, weightedFunding8h: null,
    ratios: [], coinbasePremiumPct: null,
    oiHistory: [
      { t: now - 24 * 3_600_000, price: 80_000, binance: 100, bybit: 100, okx: 100 },
      { t: now, price: pxNow, binance: oiNow, bybit: oiNow, okx: oiNow },
    ],
  });
  const oi = (oiNow: number, pxNow: number) =>
    find(buildSignals({ d: der(oiNow, pxNow), l: null, e: null, p: null, m: null, v: null, px: null, now }), "oi-regime")!.score;

  it("backs a rally on rising OI and half-fades one on falling OI", () => {
    expect(oi(104, 82_000)).toBeCloseTo(1);
    expect(oi(96, 82_000)).toBeCloseTo(-0.5);
  });
  it("reads long capitulation (both falling) as mildly bullish", () => {
    expect(oi(96, 78_000)).toBeCloseTo(0.5);
  });
  it("stays neutral when OI barely moves", () => {
    expect(oi(100.2, 82_000)).toBe(0);
  });
});

describe("macro read", () => {
  const stat = (key: string, value: number, change: number): MacroStat => ({ key, label: key, value, unit: "index", change, series: [], note: "", source: "" });
  const mac = (stats: MacroStat[]): MacroData => ({ asOf: now, sources: [], stats, fearGreed: null, options: { putCallOi: null, nextExpiry: null, nextExpiryMaxPain: null, nextExpiryOiBtc: null } });
  const run = (stats: MacroStat[]) => find(buildSignals({ d: null, l: null, e: null, p: null, m: mac(stats), v: null, px: null, now }), "macro");

  it("is bearish when the dollar and yields rise", () => {
    expect(run([stat("dxy", 121, 2.8), stat("us10y", 5.2, 0.42)])!.score).toBeLessThan(-0.3);
  });
  it("is bullish when liquidity and stablecoins grow and the dollar falls", () => {
    expect(run([stat("netliq", 6, 0.2), stat("stables", 311, 9), stat("dxy", 118, -3)])!.score).toBeGreaterThan(0.3);
  });
  it("needs at least two legs", () => {
    expect(run([stat("dxy", 121, 2.8)])).toBeUndefined();
  });
});

describe("composite", () => {
  const sig = (key: string, score: number, w: Signal["w"]): Signal => ({
    key, label: key, kind: "Flow", contrarian: false, value: "", read: "", score, w, lean: score >= 0.2 ? "bull" : score <= -0.2 ? "bear" : "neutral",
  });

  it("weights each read only in the horizons it belongs to", () => {
    const s = [sig("a", 1, { intraday: 1 }), sig("b", -1, { swing: 1, macro: 3 }), sig("c", 0.5, { macro: 1 })];
    expect(composite(s, "intraday")!.net).toBeCloseTo(100);
    expect(composite(s, "swing")!.net).toBeCloseTo(-100);
    expect(composite(s, "macro")!.net).toBeCloseTo(((-3 + 0.5) / 4) * 100);
    expect(composite(s, "macro")!.count).toBe(2);
  });

  it("returns null for a horizon with no reads", () => {
    expect(composite([sig("a", 1, { intraday: 1 })], "macro")).toBeNull();
  });

  it("labels inside ±8 as no edge", () => {
    expect(composite([sig("a", 0.07, { swing: 1 })], "swing")!.label).toMatch(/No edge/);
    expect(composite([sig("a", 0.1, { swing: 1 })], "swing")!.label).toBe("Mildly bullish");
  });
});
