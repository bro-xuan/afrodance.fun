// Shared types for the BTC bottom-indicator dashboard.

/** Market cycle phase, coldest → hottest. Low score = capitulation/bottom. */
export type Phase = "Bottom" | "Bearish" | "Neutral" | "Bullish" | "Top";

/**
 * Which raw direction means "bottom" for a metric.
 * Nearly every valuation metric here is `lowIsBottom` (cheap = capitulation),
 * but the field exists so an inverted metric can be added without special-casing.
 */
export type Direction = "lowIsBottom" | "highIsBottom";

/**
 * How a metric is turned into a 0–100 score.
 * - `oscillator`: mean-reverting ratio (MVRV, NUPL, SOPR…). Score = percentile of
 *   the raw value across its own history.
 * - `priceModel`: a USD price level (Realized/Balanced Price…) that only trends up
 *   over time, so its raw percentile is meaningless. Score = percentile of
 *   (spot price ÷ model price) — how far spot sits below/above the model band.
 */
export type MetricKind = "oscillator" | "priceModel";

export interface MetricDef {
  /** API path segment on bitcoin-data.com, e.g. "mvrv-zscore". */
  slug: string;
  /** Human label shown in the table. */
  name: string;
  /** Short one-liner explaining what the metric says about a bottom. */
  blurb: string;
  direction: Direction;
  kind: MetricKind;
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
  available: boolean;
}

export interface IndicatorsSnapshot {
  /** ISO timestamp the snapshot was generated. */
  generatedAt: string;
  /** BTC spot close used for price-model ratios, for context in the header. */
  btcPrice: number | null;
  rows: IndicatorRow[];
}
