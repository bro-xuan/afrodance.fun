import type { IndicatorRow, Phase } from "../types";
import { metaForPhase, phaseForScore, PHASE_META } from "./phase-meta";

/**
 * Derived, presentation-time facts about the snapshot. Everything here is
 * computed from the data so the page stays correct as it refreshes daily —
 * no number or verdict is hardcoded to a particular day's reading.
 */

/** The three instrument groups, in display order. */
export const CATEGORY_GROUPS: { key: string; title: string; slugs: string[] }[] = [
  {
    key: "valuation",
    title: "Valuation · On-chain",
    slugs: ["mvrv-zscore", "mvrv", "nupl", "sopr", "reserve-risk", "sth-mvrv", "lth-mvrv", "rhodl-ratio"],
  },
  {
    key: "miner",
    title: "Miner stress",
    slugs: ["puell-multiple", "hashrate"],
  },
  {
    key: "price",
    title: "Price & trend models",
    slugs: ["realized-price", "balanced-price", "mayer-multiple", "mayer-200w", "pi-cycle-bottom"],
  },
];

export interface Group {
  key: string;
  title: string;
  rows: IndicatorRow[];
  avgScore: number | null;
  avgPhase: Phase | null;
  summary: string;
}

const scored = (rows: IndicatorRow[]) => rows.filter((r) => r.available && r.score !== null);

export function meanScore(rows: IndicatorRow[]): number | null {
  const s = scored(rows);
  return s.length ? Math.round(s.reduce((a, r) => a + (r.score as number), 0) / s.length) : null;
}

/** Count of scored indicators sitting in each phase, in cheap→dear order. */
export function phaseCounts(rows: IndicatorRow[]): { phase: Phase; count: number }[] {
  const s = scored(rows);
  return PHASE_META.map((m) => ({
    phase: m.phase,
    count: s.filter((r) => phaseForScore(r.score as number) === m.phase).length,
  }));
}

/** One-line, data-driven summary for a group header. */
function groupSummary(avgPhase: Phase | null, key: string): string {
  if (!avgPhase) return "no data";
  const noun =
    key === "miner" ? "miners" : key === "price" ? "price vs models" : "on-chain value";
  const byPhase: Record<Phase, string> = {
    Bottom: "deeply cheap",
    Bearish: "undervalued",
    Neutral: "around fair value",
    Bullish: "getting rich",
    Top: "historically expensive",
  };
  return `${noun} — ${byPhase[avgPhase]}`;
}

export function buildGroups(rows: IndicatorRow[]): Group[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return CATEGORY_GROUPS.map((g) => {
    const groupRows = g.slugs.map((s) => bySlug.get(s)).filter(Boolean) as IndicatorRow[];
    const avgScore = meanScore(groupRows);
    const avgPhase = avgScore !== null ? phaseForScore(avgScore) : null;
    return { key: g.key, title: g.title, rows: groupRows, avgScore, avgPhase, summary: groupSummary(avgPhase, g.key) };
  }).filter((g) => g.rows.length);
}

/**
 * Plain-language verdict for the aggregate. Phase-aware so it reads correctly
 * whether BTC is cheap, fair, or expensive — the numbers are interpolated live.
 */
export function verdict(aggregate: number, counts: { phase: Phase; count: number }[], total: number): string {
  const meta = metaForPhase(phaseForScore(aggregate));
  const cheaperThan = 100 - aggregate; // score = percentile of value; low = cheap
  const dearerThan = aggregate;
  const bottomCount = counts.find((c) => c.phase === "Bottom")?.count ?? 0;
  const topCount = counts.find((c) => c.phase === "Top")?.count ?? 0;

  switch (meta.phase) {
    case "Bottom":
      return `Historically cheap. At ${aggregate}/100, Bitcoin sits deep in its ${meta.label} zone — the average of ${total} cycle signals is priced closer to past bottoms than on roughly ${cheaperThan}% of every day BTC has ever traded${
        bottomCount ? `, and ${bottomCount} of ${total} read “${meta.label}” outright` : ""
      }. Historically an accumulation phase, not a euphoric top.`;
    case "Bearish":
      return `Leaning cheap. At ${aggregate}/100, Bitcoin is in the ${meta.label} zone — priced below where it traded on about ${cheaperThan}% of its history. Historically closer to accumulation than distribution.`;
    case "Neutral":
      return `Fairly valued. At ${aggregate}/100, Bitcoin sits mid-range in its ${meta.label} zone — neither historically cheap nor expensive. No strong cycle edge either way.`;
    case "Bullish":
      return `Leaning expensive. At ${aggregate}/100, Bitcoin is in the ${meta.label} zone — richer than on roughly ${dearerThan}% of its history. Historically closer to distribution than a bottom.`;
    default:
      return `Historically expensive. At ${aggregate}/100, Bitcoin sits deep in its ${meta.label} zone — pricier than on about ${dearerThan}% of every day it has traded${
        topCount ? `, with ${topCount} of ${total} reading “${meta.label}” outright` : ""
      }. Historically a distribution phase, not a bottom.`;
  }
}
