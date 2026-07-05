import type { Phase } from "../types";

/**
 * Presentation config for the five phases, coldest → hottest.
 * Colors track the orange→blue indicator bar: orange = capitulation/bottom,
 * blue = euphoria/top. The score→phase math lives in scripts/fetch-indicators.mjs
 * (Node can't import this .ts); the boundaries here must stay in sync with it.
 */
export interface PhaseMeta {
  phase: Phase;
  /** Inclusive lower / exclusive upper score bound (0–100). */
  min: number;
  max: number;
  /** Tailwind classes for the badge pill. */
  badge: string;
  /** Hex used for the score number + bar knob ring at this phase. */
  accent: string;
}

export const PHASE_META: PhaseMeta[] = [
  { phase: "Bottom", min: 0, max: 20, badge: "bg-[#fdece0] text-[#c2570f]", accent: "#c2570f" },
  { phase: "Bearish", min: 20, max: 40, badge: "bg-[#fbf0d4] text-[#8a6d1a]", accent: "#8a6d1a" },
  { phase: "Neutral", min: 40, max: 60, badge: "bg-[#eef0f2] text-[#55606b]", accent: "#55606b" },
  { phase: "Bullish", min: 60, max: 80, badge: "bg-[#dcecfa] text-[#1f6fb2]", accent: "#1f6fb2" },
  { phase: "Top", min: 80, max: 100, badge: "bg-[#d6e4fb] text-[#1e40af]", accent: "#1e40af" },
];

export function metaForPhase(phase: Phase): PhaseMeta {
  return PHASE_META.find((m) => m.phase === phase) ?? PHASE_META[2];
}

/** Score (0–100) → phase. Kept in sync with scripts/fetch-indicators.mjs. */
export function phaseForScore(score: number): Phase {
  return (PHASE_META.find((m) => score >= m.min && score < m.max) ?? PHASE_META[4]).phase;
}

/** Interior phase boundaries as percentages, for the bar's tick marks. */
export const PHASE_TICKS = [20, 40, 60, 80];
