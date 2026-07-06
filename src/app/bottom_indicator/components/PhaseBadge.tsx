import type { Phase } from "../types";
import { metaForPhase } from "../lib/phase-meta";

/** Small zone pill (dark-theme): tinted fill + zone-colored label. */
export function PhaseBadge({ phase, size = "sm" }: { phase: Phase | null; size?: "sm" | "xs" }) {
  const pad = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";
  if (!phase) {
    return (
      <span className={`inline-flex items-center rounded-full bg-[#1c2740] font-medium text-[#7f8ca3] ${pad}`}>
        n/a
      </span>
    );
  }
  const meta = metaForPhase(phase);
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${pad}`}
      style={{ backgroundColor: `${meta.hex}22`, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}
