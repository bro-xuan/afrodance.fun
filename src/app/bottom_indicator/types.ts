// Shared types for the BTC bottom & top indicator dashboard.

/** Market cycle phase, coldest → hottest. Low score = capitulation/bottom. */
export type Phase = "Bottom" | "Bearish" | "Neutral" | "Bullish" | "Top";

/**
 * Which extreme(s) a signal can genuinely call.
 * - `both`: mean-reverting metric whose lows marked bottoms AND whose highs
 *   marked tops (MVRV, NUPL, Mayer…). Counts toward the headline average.
 * - `bottom` / `top`: one-sided specialist trigger (Pi Cycle Bottom, Hash
 *   Ribbons, Pi Cycle Top). Only meaningful at its own extreme — its reading
 *   on the blind side is noise, so it is excluded from the headline average
 *   and only counts toward its own watch panel.
 */
export type Side = "both" | "bottom" | "top";

/**
 * Which raw direction means "bottom" for a metric.
 * Nearly every valuation metric here is `lowIsBottom` (cheap = capitulation),
 * but the field exists so an inverted metric can be added without special-casing.
 */
export type Direction = "lowIsBottom" | "highIsBottom";

/**
 * How a metric is turned into a 0–100 score.
 * - `oscillator`: mean-reverting ratio (MVRV, NUPL, SOPR, Puell, Hash Ribbons…).
 *   Score = percentile of the raw value across its own history.
 * - `priceModel`: a USD price level (Realized/Balanced Price…) that only trends up
 *   over time, so its raw percentile is meaningless. Score = percentile of
 *   (spot price ÷ model price) — how far spot sits below/above the model band.
 * - `priceDerived`: a ratio computed entirely from the BTC price series
 *   (Mayer Multiple, 200-week MA, Pi Cycle Bottom). Scored like an oscillator.
 */
export type MetricKind = "oscillator" | "priceModel" | "priceDerived";

export interface MetricDef {
  /** API path segment on bitcoin-data.com, e.g. "mvrv-zscore". */
  slug: string;
  /** Human label shown in the table. */
  name: string;
  /** Short one-liner explaining what the metric says about a bottom. */
  blurb: string;
  direction: Direction;
  kind: MetricKind;
  side: Side;
}

export interface IndicatorRow {
  slug: string;
  name: string;
  blurb: string;
  /** null when the metric could not be fetched/scored. */
  phase: Phase | null;
  /** 0–100, low = bottom. null when unavailable. */
  score: number | null;
  /** Signed change in score over ~30 days. null when unavailable. */
  change30d: number | null;
  /** Latest raw metric value (for tooltip / transparency). */
  rawValue: number | null;
  /** ISO date the latest datapoint is from (API `d` field). */
  asOfDate: string | null;
  /**
   * ISO timestamp this row was last fetched. Drives stalest-first fetch order
   * in scripts/fetch-indicators.mjs so rate-limited runs rotate coverage;
   * optional because snapshots written before this field existed lack it.
   */
  fetchedAt?: string | null;
  /**
   * Which extreme(s) the signal can call; see {@link Side}. Optional because
   * snapshots written before this field existed lack it (treated as "both",
   * with a fallback map in lib/insights.ts for the known one-sided slugs).
   */
  side?: Side;
  available: boolean;
}

export interface IndicatorsSnapshot {
  /** ISO timestamp the snapshot was generated. */
  generatedAt: string;
  /** BTC spot close used for price-model ratios, for context in the header. */
  btcPrice: number | null;
  rows: IndicatorRow[];
}
