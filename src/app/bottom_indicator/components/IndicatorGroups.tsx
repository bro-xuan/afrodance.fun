import type { IndicatorRow } from "../types";
import { metaForPhase, phaseForScore } from "../lib/phase-meta";
import { sideOf, type Group } from "../lib/insights";
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

/** Marks one-sided specialist triggers so a reader knows why their score
 *  looks "wrong" on the blind side and why they skip the averages. */
function SideTag({ row }: { row: IndicatorRow }) {
  const side = sideOf(row);
  if (side === "both") return null;
  return (
    <span
      className="rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.08em]"
      style={
        side === "bottom"
          ? { borderColor: "#10b98155", color: "#34d399" }
          : { borderColor: "#ef444455", color: "#f87171" }
      }
      title={`One-sided trigger — only meaningful at cycle ${side}s; excluded from averages.`}
    >
      {side}-only
    </span>
  );
}

function Row({ row }: { row: IndicatorRow }) {
  const meta = row.phase ? metaForPhase(row.phase) : null;
  return (
    <div className={`border-t border-[#1a2438] py-3.5 ${ROW} ${row.available ? "" : "opacity-50"}`}>
      {/* name + blurb */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#e6edf5]">{row.name}</span>
          <SideTag row={row} />
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
            <span
              className="text-sm tabular-nums text-[#8695ac]"
              title="Average of the group's two-sided signals — one-sided triggers are excluded."
            >
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
