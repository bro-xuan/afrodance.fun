import type { IndicatorRow } from "../types";
import { metaForPhase, phaseForScore } from "../lib/phase-meta";
import type { Group } from "../lib/insights";
import { PhaseBadge } from "./PhaseBadge";
import { DotMeter } from "./DotMeter";

const ROW = "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1.6fr)_3.2rem_3.4rem_minmax(7rem,1.5fr)]";

function Change({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[#5c6a83]">—</span>;
  if (change === 0) return <span className="tabular-nums text-[#7f8ca3]">0</span>;
  const up = change > 0;
  // Score up = pricier = less bottom-y. Neutral-tinted arrows; the sign carries it.
  return (
    <span className={`tabular-nums font-medium ${up ? "text-[#f0a868]" : "text-[#5fc98b]"}`}>
      {up ? "▲" : "▼"} {Math.abs(change)}
    </span>
  );
}

function Row({ row }: { row: IndicatorRow }) {
  const meta = row.phase ? metaForPhase(row.phase) : null;
  return (
    <div className={`border-t border-[#1a2438] py-3.5 ${ROW} ${row.available ? "" : "opacity-50"}`}>
      {/* name + blurb */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#e6edf5]">{row.name}</span>
          {row.phase && <span className="md:hidden"><PhaseBadge phase={row.phase} size="xs" /></span>}
        </div>
        <div className="mt-0.5 text-xs leading-snug text-[#7f8ca3]">{row.blurb}</div>
      </div>

      {/* mobile: score+change inline; desktop: dedicated cells */}
      <div className="flex items-center gap-4 justify-self-end md:contents">
        <div className="text-right md:justify-self-center">
          {row.score === null ? (
            <span className="text-[#5c6a83]">—</span>
          ) : (
            <span className="text-xl font-semibold tabular-nums" style={{ color: meta?.text }}>{row.score}</span>
          )}
        </div>
        <div className="text-right text-sm md:justify-self-center">
          <Change change={row.change30d} />
        </div>
      </div>

      {/* meter — full row on mobile, cell on desktop */}
      <div className="col-span-2 md:col-span-1">
        {row.available ? (
          <DotMeter score={row.score} />
        ) : (
          <span className="text-xs italic text-[#5c6a83]">data unavailable</span>
        )}
      </div>
    </div>
  );
}

function GroupPanel({ group }: { group: Group }) {
  return (
    <section className="rounded-xl border border-[#1a2438] bg-[#0f1724] p-4 sm:p-5">
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-[#1a2438] pb-3">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#aab6c9]">{group.title}</h3>
          <p className="mt-0.5 text-xs text-[#7f8ca3]">{group.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          {group.avgScore !== null && (
            <span className="text-sm tabular-nums text-[#8695ac]">
              avg <span className="font-semibold" style={{ color: metaForPhase(phaseForScore(group.avgScore)).text }}>{group.avgScore}</span>
            </span>
          )}
          <PhaseBadge phase={group.avgPhase} size="xs" />
        </div>
      </header>
      <div>{group.rows.map((r) => <Row key={r.slug} row={r} />)}</div>
    </section>
  );
}

export function IndicatorGroups({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => <GroupPanel key={g.key} group={g} />)}
    </div>
  );
}
