import snapshot from "../data/indicators.json";
import cyclesSnapshot from "../data/cycles.json";
import scoreHistorySnapshot from "../data/score-history.json";
import type { CyclesSnapshot, IndicatorsSnapshot, ScoreHistory } from "../types";
import { isTwoSided, phaseCounts } from "./insights";

export const data = snapshot as unknown as IndicatorsSnapshot;
export const cycles = cyclesSnapshot as unknown as CyclesSnapshot;
export const scoreHistory = scoreHistorySnapshot as unknown as ScoreHistory;

/** Headline numbers shared by every sub-page (hero, nav badges, provenance). */
export function summary() {
  const rows = data.rows ?? [];
  // Headline = two-sided signals only. One-sided triggers (Pi Cycle Bottom,
  // Hash Ribbons, Pi Cycle Top) can't speak to the other extreme, so they
  // live in the watch panels instead of the average.
  const core = rows.filter(isTwoSided);
  const scored = core.filter((r) => r.available && r.score !== null);
  const aggregate = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.score as number), 0) / scored.length)
    : null;
  const counts = phaseCounts(core);
  const asOf = rows.map((r) => r.asOfDate).filter(Boolean).sort().at(-1) ?? null;
  return { rows, core, scored, aggregate, counts, asOf };
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
