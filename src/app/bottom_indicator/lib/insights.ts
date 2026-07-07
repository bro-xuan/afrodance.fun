import type { IndicatorRow, Phase, Side } from "../types";
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
    slugs: ["realized-price", "balanced-price", "mayer-multiple", "mayer-200w", "pi-cycle-bottom", "pi-cycle-top"],
  },
];

// ── Sidedness ────────────────────────────────────────────────────────────────

/** Fallback for snapshots written before rows carried a `side` field. */
const SIDE_FALLBACK: Record<string, Side> = {
  "pi-cycle-bottom": "bottom",
  hashrate: "bottom",
  "pi-cycle-top": "top",
};

/** Which extreme(s) a row can call — see the `Side` type for semantics. */
export function sideOf(row: IndicatorRow): Side {
  return row.side ?? SIDE_FALLBACK[row.slug] ?? "both";
}

/** True for signals whose lows marked bottoms AND whose highs marked tops. */
export const isTwoSided = (row: IndicatorRow) => sideOf(row) === "both";

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
    // Like the headline: only two-sided signals average. A one-sided trigger's
    // blind-side percentile (e.g. Pi Cycle Top deep in a bear) is noise.
    const avgScore = meanScore(groupRows.filter(isTwoSided));
    const avgPhase = avgScore !== null ? phaseForScore(avgScore) : null;
    return { key: g.key, title: g.title, rows: groupRows, avgScore, avgPhase, summary: groupSummary(avgPhase, g.key) };
  }).filter((g) => g.rows.length);
}

// ── Extreme watch (bottom / top panels) ─────────────────────────────────────

export interface Watch {
  side: "bottom" | "top";
  /** Scored signals allowed to speak to this extreme (two-sided + own-side triggers). */
  eligible: IndicatorRow[];
  /** The subset currently sitting in this extreme's zone. */
  firing: IndicatorRow[];
}

/**
 * Everything currently ringing at one end of the cycle. "Firing" means the
 * signal's score sits in the extreme zone (<20 for bottoms, ≥80 for tops —
 * the same boundaries as the Deep Value / Overheated gauge zones).
 */
export function buildWatch(rows: IndicatorRow[], side: "bottom" | "top"): Watch {
  const eligible = scored(rows).filter((r) => sideOf(r) === "both" || sideOf(r) === side);
  const firing = eligible.filter((r) =>
    side === "bottom" ? (r.score as number) < 20 : (r.score as number) >= 80,
  );
  return { side, eligible, firing };
}

export interface Trigger {
  row: IndicatorRow;
  state: "fired" | "near" | "quiet";
  /** Human rule, e.g. "fires at ≤ 1.00". */
  rule: string;
}

/**
 * Status of the one-sided specialist triggers for one extreme. All three are
 * built as ratios that pivot on 1.0: Pi Cycle Bottom and Hash Ribbons fire at
 * or below it, Pi Cycle Top fires at or above it. "Near" = within ~8% of the
 * line, so the panel telegraphs an approaching cross before it happens.
 */
export function buildTriggers(rows: IndicatorRow[], side: "bottom" | "top"): Trigger[] {
  return rows
    .filter((r) => sideOf(r) === side && r.available && r.rawValue !== null)
    .map((r) => {
      const v = r.rawValue as number;
      const fired = side === "bottom" ? v <= 1 : v >= 1;
      const near = side === "bottom" ? v <= 1.08 : v >= 0.92;
      return {
        row: r,
        state: fired ? "fired" : near ? "near" : "quiet",
        rule: side === "bottom" ? "fires at ≤ 1.00" : "fires at ≥ 1.00",
      } as Trigger;
    });
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
      return `Historically cheap. At ${aggregate}/100, Bitcoin sits deep in its ${meta.label} zone — the average of ${total} two-sided cycle signals is priced closer to past bottoms than on roughly ${cheaperThan}% of every day BTC has ever traded${
        bottomCount ? `, and ${bottomCount} of ${total} read “${meta.label}” outright` : ""
      }. Historically an accumulation phase, not a euphoric top.`;
    case "Bearish":
      return `Leaning cheap. At ${aggregate}/100, Bitcoin is in the ${meta.label} zone — priced below where it traded on about ${cheaperThan}% of its history. Historically closer to accumulation than distribution.`;
    case "Neutral":
      return `Fairly valued. At ${aggregate}/100, Bitcoin sits mid-range in its ${meta.label} zone — neither historically cheap nor expensive. No strong cycle edge either way.`;
    case "Bullish":
      return `Leaning expensive. At ${aggregate}/100, Bitcoin is in the ${meta.label} zone — richer than on roughly ${dearerThan}% of its history. Historically closer to distribution than a bottom.`;
    default:
      return `Historically expensive. At ${aggregate}/100, Bitcoin sits deep in its ${meta.label} zone — the average of ${total} two-sided cycle signals is pricier than on about ${dearerThan}% of every day it has traded${
        topCount ? `, with ${topCount} of ${total} reading “${meta.label}” outright` : ""
      }. Historically a distribution phase, not a bottom.`;
  }
}
