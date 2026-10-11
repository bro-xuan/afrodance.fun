import type { Horizon } from "./signals";
import type { Envelope } from "./types";

/**
 * Track record for the pulse. Every hour the server logs the three horizon
 * scores next to BTC's price; once enough time has passed, each logged score
 * is checked against what price actually did over that horizon. A bias score
 * nobody can audit is just an opinion, so this is the audit.
 */

export const HOUR = 3_600_000;

/** One hourly snapshot. Scores are −100 … +100, null if a horizon had no reads. */
export type PulseSample = {
  t: number; // start of the UTC hour
  px: number; // BTC spot at record time
  h: Record<Horizon, number | null>;
  r: Record<string, number>; // each read's score ×100, for re-weighting later
};

/** How far ahead each horizon's call is graded. */
export const FORWARD: Record<Horizon, number> = { intraday: 24 * HOUR, swing: 7 * 24 * HOUR, macro: 30 * 24 * HOUR };
export const FORWARD_LABEL: Record<Horizon, string> = { intraday: "24h", swing: "7d", macro: "30d" };

/** |score| at or above this is a directional call ("Mildly" and up). Below it the pulse says "no edge". */
export const CALL = 20;

export type HorizonStats = {
  graded: number; // samples whose forward window has closed
  calls: number; // graded samples with |score| ≥ CALL
  hitRate: number | null; // share of calls where price went the called way
  bullAvg: number | null; // mean forward return (%) after bullish calls
  bearAvg: number | null; // mean forward return (%) after bearish calls
  baseAvg: number | null; // mean forward return (%) over all graded hours: the drift to beat
  windows: number; // non-overlapping forward windows in the graded span: the honest sample size
};

export type TrackPoint = { t: number; px: number } & Record<Horizon, number | null>;

export type PulseHistory = Envelope<{
  since: number | null;
  samples: number;
  series: TrackPoint[]; // last 30 days
  stats: Record<Horizon, HorizonStats>;
  recorded?: PulseSample | null; // the snapshot this request wrote, when asked to record
}>;

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Sample nearest to `t` within `tol`, from samples sorted by t. */
function near(samples: PulseSample[], t: number, tol: number): PulseSample | null {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const cands = [samples[lo - 1], samples[lo]].filter((s): s is PulseSample => !!s && Math.abs(s.t - t) <= tol);
  return cands.sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0] ?? null;
}

export function horizonStats(samples: PulseSample[], h: Horizon): HorizonStats {
  const F = FORWARD[h];
  // Hourly logging can miss an hour or two; allow a little slack on the far end.
  const tol = Math.max(2 * HOUR, F * 0.02);
  const graded: { t: number; score: number; ret: number }[] = [];
  for (const s of samples) {
    const score = s.h[h];
    if (score === null) continue;
    const later = near(samples, s.t + F, tol);
    if (!later) continue;
    graded.push({ t: s.t, score, ret: (later.px / s.px - 1) * 100 });
  }
  const calls = graded.filter((g) => Math.abs(g.score) >= CALL);
  const hits = calls.filter((g) => Math.sign(g.ret) === Math.sign(g.score));
  const span = graded.length ? graded[graded.length - 1].t - graded[0].t + F : 0;
  return {
    graded: graded.length,
    calls: calls.length,
    hitRate: calls.length ? hits.length / calls.length : null,
    bullAvg: mean(calls.filter((g) => g.score > 0).map((g) => g.ret)),
    bearAvg: mean(calls.filter((g) => g.score < 0).map((g) => g.ret)),
    baseAvg: mean(graded.map((g) => g.ret)),
    windows: Math.floor(span / F),
  };
}
