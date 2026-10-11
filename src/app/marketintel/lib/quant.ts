import type { Candle, ExpiryVol, MacroData, VolData } from "./types";
import type { liqMagnet } from "./signals";

/**
 * Small quant toolkit for the dashboard: realized vol, the expected move
 * implied by options, barrier-touch odds, and the key price levels traders
 * actually mark on their charts.
 */

const DAY = 86_400_000;
const sq = (x: number) => x * x;

/** Annualised close-to-close realized vol (%) over the last `n` returns. BTC trades 365 days. */
export function realizedVol(candles: Candle[], n: number, periodsPerYear = 365): number | null {
  const c = candles.slice(-(n + 1));
  if (c.length < n + 1) return null;
  const r = c.slice(1).map((x, i) => Math.log(x.c / c[i].c));
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + sq(x - mean), 0) / (r.length - 1);
  return Math.sqrt(v * periodsPerYear) * 100;
}

/** 1σ move in $ over `days`, from an annualised vol in %. */
export const sigmaMove = (spot: number, volPct: number, days: number) => spot * (volPct / 100) * Math.sqrt(days / 365);

// Abramowitz-Stegun 7.1.26, |error| < 1.5e-7: plenty for deltas and touch odds.
export function normCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * Odds a driftless lognormal path touches `barrier` before `days` (reflection
 * principle): 2·(1 − N(|ln(B/S)| / σ√T)). The "fair" price of a Polymarket
 * hit market if options vol is right.
 */
export function touchProb(spot: number, barrier: number, volPct: number, days: number): number {
  const sd = (volPct / 100) * Math.sqrt(days / 365);
  if (sd <= 0) return 0;
  return Math.min(1, 2 * (1 - normCdf(Math.abs(Math.log(barrier / spot)) / sd)));
}

/** Expiry closest to `targetDays`, among those with a usable value for `pick`. */
export function nearestExpiry(v: VolData | null, targetDays: number, pick: (e: ExpiryVol) => number | null): ExpiryVol | null {
  const xs = (v?.expiries ?? []).filter((e) => pick(e) !== null);
  return xs.reduce<ExpiryVol | null>((b, e) => (!b || Math.abs(e.days - targetDays) < Math.abs(b.days - targetDays) ? e : b), null);
}

// ── Key levels ─────────────────────────────────────────────────────────────
export type LevelKind = "session" | "open" | "liq" | "options" | "vol";
export type Level = { key: string; label: string; price: number; kind: LevelKind; note: string };

const utcDay = (t: number) => Math.floor(t / DAY) * DAY;
const utcWeekStart = (t: number) => {
  const d = utcDay(t);
  return d - (((new Date(d).getUTCDay() + 6) % 7) * DAY); // Monday 00:00 UTC
};
const utcMonthStart = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

export function keyLevels(
  daily: Candle[],
  hourly: Candle[],
  spot: number | null,
  mag: ReturnType<typeof liqMagnet>,
  macro: MacroData | null,
  dvol: number | null,
  now = Date.now(),
): Level[] {
  const out: Level[] = [];
  const today = utcDay(now);
  const prev = daily.filter((c) => c.t < today).at(-1);
  if (prev) {
    out.push({ key: "pdh", label: "Prev. day high", price: prev.h, kind: "session", note: "Yesterday's UTC high. First resistance, often swept" });
    out.push({ key: "pdl", label: "Prev. day low", price: prev.l, kind: "session", note: "Yesterday's UTC low. First support, often swept" });
  }
  // Last 7d range from hourly candles.
  const wk = hourly.filter((c) => c.t >= now - 7 * DAY);
  if (wk.length) {
    out.push({ key: "7dh", label: "7 day high", price: Math.max(...wk.map((c) => c.h)), kind: "session", note: "Top of the past week's range" });
    out.push({ key: "7dl", label: "7 day low", price: Math.min(...wk.map((c) => c.l)), kind: "session", note: "Bottom of the past week's range" });
  }
  const wOpen = daily.find((c) => c.t === utcWeekStart(now)) ?? hourly.find((c) => c.t === utcWeekStart(now));
  if (wOpen) out.push({ key: "wo", label: "Weekly open", price: wOpen.o, kind: "open", note: "Monday 00:00 UTC. Above it, the week is green" });
  const mOpen = daily.find((c) => c.t === utcMonthStart(now));
  if (mOpen) out.push({ key: "mo", label: "Monthly open", price: mOpen.o, kind: "open", note: "1st of the month, 00:00 UTC" });

  if (mag?.peakAbove.v) out.push({ key: "liqu", label: "Short liq cluster", price: mag.peakAbove.price, kind: "liq", note: `Densest short liquidations within +5% (model)` });
  if (mag?.peakBelow.v) out.push({ key: "liqd", label: "Long liq cluster", price: mag.peakBelow.price, kind: "liq", note: `Densest long liquidations within −5% (model)` });

  const mp = macro?.options.nextExpiryMaxPain;
  if (mp) out.push({ key: "mp", label: "Max pain", price: mp, kind: "options", note: "Next Friday Deribit expiry. Spot tends to pin toward it" });

  if (spot && dvol) {
    const m = sigmaMove(spot, dvol, 1);
    out.push({ key: "s1u", label: "+1σ today", price: spot + m, kind: "vol", note: `1-day expected move from DVOL ${dvol.toFixed(0)}` });
    out.push({ key: "s1d", label: "−1σ today", price: spot - m, kind: "vol", note: `About 68% of days close inside ±1σ` });
  }
  return out.sort((a, b) => b.price - a.price);
}
