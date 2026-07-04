import type { IndicatorRow } from "../types";
import { PHASE_META, metaForPhase } from "../lib/phase-meta";
import { PhaseBadge } from "./PhaseBadge";
import { IndicatorBar } from "./IndicatorBar";

const GRID = "md:grid md:grid-cols-[1.9fr_6rem_3.5rem_4rem_1.7fr] md:items-center md:gap-4";

function ChangeCell({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[#b4b8bd]">—</span>;
  const color = change > 0 ? "text-[#1e7d3f]" : change < 0 ? "text-[#c0392b]" : "text-[#9aa0a6]";
  const sign = change > 0 ? "+" : "";
  return <span className={`tabular-nums font-medium ${color}`}>{sign}{change}</span>;
}

function Row({ row }: { row: IndicatorRow }) {
  const accent = row.phase ? metaForPhase(row.phase).accent : "#9aa0a6";
  return (
    <div className={`border-t border-[#eef0f2] py-4 ${GRID} ${row.available ? "" : "opacity-55"}`}>
      {/* Metric */}
      <div>
        <div className="font-medium text-[#1f2328]">{row.name}</div>
        <div className="mt-0.5 text-xs leading-snug text-[#8b9096]">{row.blurb}</div>
      </div>

      {/* Phase · Score · 30d — a flex strip on mobile, grid cells on md+ */}
      <div className="mt-3 flex items-center gap-6 md:mt-0 md:contents">
        <div className="md:justify-self-start">
          <div className="mb-1 text-[0.65rem] uppercase tracking-wide text-[#a4a9ae] md:hidden">Phase</div>
          <PhaseBadge phase={row.phase} />
        </div>
        <div className="md:justify-self-end">
          <div className="mb-1 text-[0.65rem] uppercase tracking-wide text-[#a4a9ae] md:hidden">Score</div>
          {row.score === null
            ? <span className="text-[#b4b8bd]">—</span>
            : <span className="text-lg font-semibold tabular-nums" style={{ color: accent }}>{row.score}</span>}
        </div>
        <div className="md:justify-self-end">
          <div className="mb-1 text-[0.65rem] uppercase tracking-wide text-[#a4a9ae] md:hidden">30d</div>
          <ChangeCell change={row.change30d} />
        </div>
      </div>

      {/* Indicator bar */}
      <div className="mt-4 md:mt-0">
        {row.available
          ? <IndicatorBar score={row.score} />
          : <span className="text-xs italic text-[#a4a9ae]">data unavailable</span>}
      </div>
    </div>
  );
}

export function IndicatorTable({ rows }: { rows: IndicatorRow[] }) {
  return (
    <section className="rounded-2xl border border-[#eceef0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] sm:p-7">
      <h2 className="mb-1 text-lg font-semibold text-[#1f2328]">Market Signals</h2>
      <p className="mb-4 text-sm text-[#8b9096]">
        Each score is the metric&apos;s current standing across its full history (0 = deepest bottom,
        100 = frothiest top). Low and orange = accumulation territory.
      </p>

      {/* Column header (md+) */}
      <div className={`hidden pb-2 text-xs font-medium uppercase tracking-wide text-[#a4a9ae] ${GRID}`}>
        <div>Metric</div>
        <div>Phase</div>
        <div className="justify-self-end">Score</div>
        <div className="justify-self-end">30d</div>
        <div>Indicator</div>
      </div>

      <div>
        {rows.map((row) => <Row key={row.slug} row={row} />)}
      </div>

      {/* Phase legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eef0f2] pt-4 text-xs text-[#8b9096]">
        <span className="font-medium text-[#6b7075]">Phases:</span>
        {PHASE_META.map((m) => (
          <span key={m.phase} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.accent }} />
            {m.phase} <span className="text-[#b4b8bd]">({m.min}–{m.max})</span>
          </span>
        ))}
      </div>
    </section>
  );
}
