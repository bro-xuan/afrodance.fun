import { NO_EDGE, type Horizon } from "./signals";
import type { Envelope } from "./types";

/**
 * Track record for the pulse. Every hour the server logs the three horizon
 * scores next to BTC's price; once enough time has passed, each logged score
 * is checked against what price actually did over that horizon. A bias score
 * nobody can audit is just an opinion, so this is the audit.
 */

export const HOUR = 3_600_000;

/** One hourly snapshot. Scores are −100 … +100, null if a horizon had too few reads to trust. */
export type PulseSample = {
  t: number; // start of the UTC hour: one sample per hour
  at: number; // when the price was actually captured; grading uses this
  px: number; // BTCUSDT spot (Binance, Bybit fallback) at `at`
  model: number; // signals MODEL version that produced the scores
  h: Record<Horizon, number | null>;
  n: Record<Horizon, number>; // reads behind each score
  r: Record<string, number>; // each read's score ×100, for re-weighting later
};

/**
 * Fewest reads a horizon needs before its score is logged. A feed outage
 * that leaves macro running on two reads would otherwise go on record as a
 * confident call and get graded like one.
 */
export const MIN_READS: Record<Horizon, number> = { intraday: 5, swing: 8, macro: 4 };

/** Rolling window the record is graded over (bounds the Redis read too). */
export const GRADE_DAYS = 365;

/** How far ahead each horizon's call is graded. */
export const FORWARD: Record<Horizon, number> = { intraday: 24 * HOUR, swing: 7 * 24 * HOUR, macro: 30 * 24 * HOUR };
export const FORWARD_LABEL: Record<Horizon, string> = { intraday: "24h", swing: "7d", macro: "30d" };

/** |score| at or above this is a directional call: anything the pulse labels bullish or bearish. */
export const CALL = NO_EDGE;

export type HorizonStats = {
  graded: number; // samples whose forward window has closed
  calls: number; // graded samples with |score| ≥ CALL
  hitRate: number | null; // share of calls where price went the called way
  bullAvg: number | null; // mean forward return (%) after bullish calls
  bearAvg: number | null; // mean forward return (%) after bearish calls
  baseAvg: number | null; // mean forward return (%) over all graded hours: the drift to beat
  baseUp: number | null; // share of graded windows that ended up: what always-long would hit
  windows: number; // non-overlapping forward windows in the graded span: the honest sample size
};

export type TrackPoint = { t: number; px: number } & Record<Horizon, number | null>;

export type PulseHistory = Envelope<{
  since: number | null;
  samples: number;
  model: number; // stats grade only samples from this model version
  series: TrackPoint[]; // last 30 days
  stats: Record<Horizon, HorizonStats>;
}>;

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Sample captured nearest to `t` within `tol`, from samples sorted by capture time. */
function near(samples: PulseSample[], t: number, tol: number): PulseSample | null {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].at < t) lo = mid + 1;
    else hi = mid;
  }
  const cands = [samples[lo - 1], samples[lo]].filter((s): s is PulseSample => !!s && Math.abs(s.at - t) <= tol);
  return cands.sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0] ?? null;
}

/** Grade one horizon. `samples` must be sorted by capture time and come from one model version. */
export function horizonStats(samples: PulseSample[], h: Horizon): HorizonStats {
  const F = FORWARD[h];
  // Hourly logging can miss an hour or two; allow a little slack on the far end.
  const tol = Math.max(2 * HOUR, F * 0.02);
  const graded: { t: number; score: number; ret: number }[] = [];
  for (const s of samples) {
    const score = s.h[h];
    if (score === null) continue;
    const later = near(samples, s.at + F, tol);
    if (!later) continue;
    graded.push({ t: s.at, score, ret: (later.px / s.px - 1) * 100 });
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
    baseUp: graded.length ? graded.filter((g) => g.ret > 0).length / graded.length : null,
    windows: Math.floor(span / F),
  };
}
