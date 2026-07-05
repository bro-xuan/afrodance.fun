import type { Phase } from "../types";
import { metaForPhase } from "../lib/phase-meta";

export function PhaseBadge({ phase }: { phase: Phase | null }) {
  if (!phase) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#f1f2f4] px-2.5 py-0.5 text-xs font-medium text-[#9aa0a6]">
        n/a
      </span>
    );
  }
  const meta = metaForPhase(phase);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
      {phase}
    </span>
  );
}
