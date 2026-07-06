import type { Phase } from "../types";

/**
 * Presentation config for the five zones, cheapest → most expensive.
 *
 * VALUATION color semantics (NOT Fear-&-Greed sentiment): low score = green =
 * historically cheap = accumulate; high score = red = historically expensive =
 * distribute. Because hue alone can't say "is low good or bad", every zone also
 * carries a plain `label`, a `meaning`, and an `action` — the page never relies
 * on color alone.
 *
 * The internal phase KEYS (Bottom/Bearish/Neutral/Bullish/Top) and the
 * 0/20/40/60/80/100 boundaries stay in sync with scripts/fetch-indicators.mjs;
 * only the display labels and colors live here.
 */
export interface PhaseMeta {
  /** Internal key, kept in sync with the fetch script. */
  phase: Phase;
  /** Display name shown to readers (the valuation ladder). */
  label: string;
  /** What it means for a buyer, one word. */
  meaning: string;
  /** Suggested stance — closes the "is low good or bad" loop. */
  action: string;
  /** Inclusive lower / exclusive upper score bound (0–100). */
  min: number;
  max: number;
  /** Saturated zone hue for marks (gauge arc, meter dots). */
  hex: string;
  /** Brighter, contrast-safe variant for text/numbers on the dark surface. */
  text: string;
  /** @deprecated alias of `text`, kept so older callers don't break. */
  accent: string;
}

const mk = (
  phase: Phase, label: string, meaning: string, action: string,
  min: number, max: number, hex: string, text: string,
): PhaseMeta => ({ phase, label, meaning, action, min, max, hex, text, accent: text });

/** Five zones, cheapest (green) → most expensive (red). */
export const PHASE_META: PhaseMeta[] = [
  mk("Bottom",  "Deep Value",  "Historically cheap", "Accumulate", 0,  20,  "#10b981", "#34d399"),
  mk("Bearish", "Value",       "Undervalued",        "Accumulate", 20, 40,  "#5aa832", "#8fd06f"),
  mk("Neutral", "Fair Value",  "Around fair",        "Hold",       40, 60,  "#eab308", "#facc15"),
  mk("Bullish", "Premium",     "Getting rich",       "Trim",       60, 80,  "#f97316", "#fb923c"),
  mk("Top",     "Overheated",  "Historically dear",  "Distribute", 80, 100, "#ef4444", "#f87171"),
];

export function metaForPhase(phase: Phase): PhaseMeta {
  return PHASE_META.find((m) => m.phase === phase) ?? PHASE_META[2];
}

/** Score (0–100) → phase. Kept in sync with scripts/fetch-indicators.mjs. */
export function phaseForScore(score: number): Phase {
  return (PHASE_META.find((m) => score >= m.min && score < m.max) ?? PHASE_META[4]).phase;
}
