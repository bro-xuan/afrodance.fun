import type { Candle, CmeGap } from "./types";

/**
 * Levels desks mark that need more than one candle: anchored VWAPs, the
 * volume profile, the previous week's range and the CME weekend gap.
 */

const DAY = 86_400_000;
export type Bar = { t: number; o: number; h: number; l: number; c: number };

/** Volume-weighted average price of the hourly bars since `from`. */
export function vwapSince(hourly: Candle[], from: number): number | null {
  const xs = hourly.filter((c) => c.t >= from);
  const vol = xs.reduce((s, c) => s + c.v, 0);
  return xs.length >= 2 && vol > 0 ? xs.reduce((s, c) => s + ((c.h + c.l + c.c) / 3) * c.v, 0) / vol : null;
}

/**
 * Volume profile: spread each bar's volume evenly over its range in `bin`
 * buckets. POC = busiest price; value area = the 70% of volume around it,
 * grown one bucket at a time toward the busier neighbour (the standard way).
 */
export function volumeProfile(hourly: Candle[], bin: number): { poc: number; vah: number; val: number } | null {
  if (hourly.length < 24) return null;
  const vol = new Map<number, number>();
  for (const c of hourly) {
    const lo = Math.floor(c.l / bin);
    const hi = Math.floor(c.h / bin);
    const share = c.v / (hi - lo + 1);
    for (let b = lo; b <= hi; b++) vol.set(b, (vol.get(b) ?? 0) + share);
  }
  const keys = [...vol.keys()].sort((a, b) => a - b);
  const total = keys.reduce((s, k) => s + vol.get(k)!, 0);
  if (!total) return null;
  let poc = keys[0];
  for (const k of keys) if (vol.get(k)! > vol.get(poc)!) poc = k;
  let lo = poc;
  let hi = poc;
  let inside = vol.get(poc)!;
  while (inside < total * 0.7) {
    const down = vol.get(lo - 1) ?? 0;
    const up = vol.get(hi + 1) ?? 0;
    if (!down && !up && lo <= keys[0] && hi >= keys[keys.length - 1]) break;
    if (up >= down) inside += vol.get(++hi) ?? 0;
    else inside += vol.get(--lo) ?? 0;
  }
  return { poc: (poc + 0.5) * bin, vah: (hi + 1) * bin, val: lo * bin };
}

/** High and low of the previous Monday–Sunday UTC week, from daily candles. */
export function prevWeek(daily: Candle[], weekStart: number): { h: number; l: number } | null {
  const xs = daily.filter((c) => c.t >= weekStart - 7 * DAY && c.t < weekStart);
  return xs.length >= 5 ? { h: Math.max(...xs.map((c) => c.h)), l: Math.min(...xs.map((c) => c.l)) } : null;
}

/**
 * Newest CME gap price hasn't traded back through. CME BTC futures pause
 * over part of the weekend (and on holidays), so a > 24h hole between hourly
 * bars is a closure; the gap "fills" when a later bar trades through the last
 * close before it. With near-24/7 CME trading these are smaller and rarer
 * than they used to be, so often there's none open.
 */
export function cmeGap(bars: Bar[], spotAt: (t: number) => number | null): CmeGap | null {
  if (bars.length < 2) return null;
  // Basis from the same hour on both markets: over a weekend CME's last bar
  // is Friday's, and today's spot would bake the weekend move in.
  const lastBar = bars[bars.length - 1];
  const spot = spotAt(lastBar.t);
  if (!spot) return null;
  for (let i = bars.length - 1; i > 0; i--) {
    if (bars[i].t - bars[i - 1].t < DAY) continue;
    const close = bars[i - 1].c;
    const reopen = bars[i].o;
    if (Math.abs(reopen / close - 1) < 0.001) continue; // no real gap
    const filled = bars.slice(i).some((b) => b.l <= close && b.h >= close);
    if (!filled) return { close, reopen, t: bars[i - 1].t, basis: lastBar.c / spot - 1 };
  }
  return null;
}
