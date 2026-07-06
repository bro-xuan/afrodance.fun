import type { Phase } from "../types";
import { metaForPhase } from "../lib/phase-meta";

/**
 * Segmented bar showing how the scored indicators distribute across the five
 * zones — the "weight of evidence" behind the aggregate. Widths come straight
 * from the live counts, so a bottom-heavy market shows a mostly-green bar.
 */
export function ConvictionBar({ counts, total }: { counts: { phase: Phase; count: number }[]; total: number }) {
  return (
    <div>
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {counts.map(({ phase, count }) => {
          if (!count) return null;
          const meta = metaForPhase(phase);
          return (
            <div
              key={phase}
              style={{ flexGrow: count, backgroundColor: meta.hex }}
              className="rounded-full"
              title={`${count} ${count === 1 ? "signal" : "signals"} · ${meta.label}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8695ac]">
        {counts.filter((c) => c.count).map(({ phase, count }) => {
          const meta = metaForPhase(phase);
          return (
            <span key={phase} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.hex }} />
              <span className="tabular-nums text-[#c7d0de]">{count}</span> {meta.label}
            </span>
          );
        })}
        <span className="text-[#5c6a83]">· {total} signals total</span>
      </div>
    </div>
  );
}
