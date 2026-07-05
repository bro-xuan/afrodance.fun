import { metaForPhase, phaseForScore } from "../lib/phase-meta";

/**
 * Shared-axis meter: the same 0–100 track (dim zone tints) with a single bright
 * dot at the score. Because every row uses the identical axis, reading down a
 * column makes clustering obvious — all dots hard-left = everything's cheap.
 */
const ZONE_TRACK =
  "linear-gradient(to right," +
  "#10b981 0%,#10b981 20%," +
  "#5aa832 20%,#5aa832 40%," +
  "#eab308 40%,#eab308 60%," +
  "#f97316 60%,#f97316 80%," +
  "#ef4444 80%,#ef4444 100%)";

export function DotMeter({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="h-1.5 w-full rounded-full bg-[#1c2740]" aria-hidden />;
  }
  const pct = Math.max(0, Math.min(100, score));
  const meta = metaForPhase(phaseForScore(pct));
  return (
    <div className="relative h-4 w-full" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full opacity-25"
        style={{ background: ZONE_TRACK }} />
      {/* interior zone ticks */}
      {[20, 40, 60, 80].map((t) => (
        <span key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-[#0f1724]" style={{ left: `${t}%` }} />
      ))}
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${pct}%`,
          backgroundColor: meta.hex,
          boxShadow: `0 0 0 3px #0f1724, 0 0 8px ${meta.hex}`,
        }}
      />
    </div>
  );
}
