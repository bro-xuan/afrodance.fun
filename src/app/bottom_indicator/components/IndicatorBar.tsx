import { PHASE_TICKS } from "../lib/phase-meta";

/**
 * Static, non-interactive orange→blue gradient meter with a knob at `score`.
 * Orange (left) = capitulation/bottom, blue (right) = euphoria/top.
 * Pure CSS/SSR — no <input>, no JS. Mirrors the .cm-scrubber visual language.
 */
export function IndicatorBar({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="bi-bar-track bi-bar-track--empty" aria-hidden />;
  }
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative w-full"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Bottom-to-top score"
    >
      <div className="bi-bar-track">
        {PHASE_TICKS.map((t) => (
          <span key={t} className="bi-bar-tick" style={{ left: `${t}%` }} />
        ))}
      </div>
      <span className="bi-bar-knob" style={{ left: `${pct}%` }} />
    </div>
  );
}
