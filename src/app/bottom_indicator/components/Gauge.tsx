import { PHASE_META, metaForPhase, phaseForScore } from "../lib/phase-meta";

/**
 * Semicircular valuation gauge (the Fear-&-Greed silhouette everyone knows).
 * Pure SSR SVG — the needle angle and active zone are baked at build time, so
 * there is no client JS. Green (left) = cheap/accumulate, red (right) =
 * expensive/distribute; the lit zone is the one the score sits in.
 */

const CX = 200;
const CY = 200;
const R = 160; // centerline radius of the arc band
const TH = 26; // band thickness

// score → point on the arc centerline (upper semicircle: 0 at left, 100 at right)
const rad = (s: number) => Math.PI * (1 - s / 100);
const px = (s: number, r = R) => CX + r * Math.cos(rad(s));
const py = (s: number, r = R) => CY - r * Math.sin(rad(s));

function segPath(s1: number, s2: number): string {
  return `M ${px(s1).toFixed(2)} ${py(s1).toFixed(2)} A ${R} ${R} 0 0 0 ${px(s2).toFixed(2)} ${py(s2).toFixed(2)}`;
}

export function Gauge({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const active = phaseForScore(s);
  const meta = metaForPhase(active);
  const needleAngle = (s / 100) * 180; // rotate a left-pointing needle up toward the score
  const GAP = 0.9; // score-unit gap between zones

  return (
    <svg viewBox="0 0 400 238" className="block w-full" role="img"
      aria-label={`Bitcoin cycle score ${s} of 100 — ${meta.label}`}>
      <defs>
        <filter id="zoneGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Zone bands: full colour so the scale reads green→red; the active one
          is at full opacity + a glow, the rest dimmed but still legible. */}
      {PHASE_META.map((z) => {
        const isActive = z.phase === active;
        const a = z.min + (z.min > 0 ? GAP : 0);
        const b = z.max - (z.max < 100 ? GAP : 0);
        return (
          <g key={z.phase}>
            {isActive && (
              <path d={segPath(a, b)} stroke={z.hex} strokeWidth={TH} fill="none"
                strokeLinecap="round" opacity={0.6} filter="url(#zoneGlow)" />
            )}
            <path d={segPath(a, b)} stroke={z.hex} strokeWidth={TH} fill="none"
              strokeLinecap="round" opacity={isActive ? 1 : 0.7} />
          </g>
        );
      })}

      {/* Readout in the upper bowl (kept clear of the needle sweep below). */}
      <text x={CX} y={124} textAnchor="middle" fontSize={62} fontWeight={300}
        fill="#f2f6fb">{s}</text>
      <text x={CX} y={150} textAnchor="middle" fontSize={15} fontWeight={700}
        letterSpacing="2.4" fill={meta.text}>{meta.label.toUpperCase()}</text>

      {/* Needle + hub (occupies the lower bowl). */}
      <g transform={`rotate(${needleAngle.toFixed(2)} ${CX} ${CY})`}>
        <polygon points={`${CX - (R - TH / 2 - 4)},${CY} ${CX - 6},${CY - 5} ${CX - 6},${CY + 5}`}
          fill="#e6edf5" />
      </g>
      <circle cx={CX} cy={CY} r={10} fill="#0f1724" stroke="#e6edf5" strokeWidth={3} />

      {/* Scale ends */}
      <text x={px(0)} y={228} textAnchor="middle" fontSize={12} fill="#5c6a83">0</text>
      <text x={px(100)} y={228} textAnchor="middle" fontSize={12} fill="#5c6a83">100</text>
    </svg>
  );
}
