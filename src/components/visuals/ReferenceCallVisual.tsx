/**
 * Animated pixel-art scene for the "ReferReady" project card.
 *
 * A reference call in progress: a chunky pixel telephone handset on the left
 * emits three concentric blue sound-wave arcs that ripple outward, while a
 * 3-item prep checklist on the right ticks its boxes one at a time (blue
 * checkmarks) and then resets for the next call. Pure SVG + CSS keyframes
 * (see globals.css, "ReferReady call card visual") — server-rendered, no JS.
 *
 * Static (reduced-motion / first-paint) frame = all three waves lit and all
 * three boxes checked: a finished "call connected, prep done" picture.
 */

type RcvPx = [number, number];

// Concentric sound-wave arcs, drawn as 1px rects so they stay pixel-crisp.
const RCV_WAVE1: RcvPx[] = [
  [25, 13], [26, 14], [26, 15], [26, 16], [26, 17], [26, 18], [25, 19],
];
const RCV_WAVE2: RcvPx[] = [
  [26, 10], [27, 11], [28, 12], [28, 13], [29, 14], [29, 15], [29, 16],
  [29, 17], [29, 18], [28, 19], [28, 20], [27, 21], [26, 22],
];
const RCV_WAVE3: RcvPx[] = [
  [26, 7], [28, 8], [29, 9], [30, 10], [31, 11], [31, 12], [32, 13], [32, 14],
  [32, 15], [32, 16], [32, 17], [32, 18], [32, 19], [31, 20], [31, 21],
  [30, 22], [29, 23], [28, 24], [26, 25],
];

// A single bold checkmark, relative to the top-left of its 6x6 box.
const RCV_CHECK: RcvPx[] = [
  [1, 2], [1, 3], [2, 3], [2, 4], [3, 2], [3, 3], [4, 1], [4, 2], [5, 0], [5, 1],
];

function RcvWave({ pts, cls, fill }: { pts: RcvPx[]; cls: string; fill: string }) {
  return (
    <g className={cls} fill={fill}>
      {pts.map((p, i) => (
        <rect key={i} x={p[0]} y={p[1]} width={1} height={1} />
      ))}
    </g>
  );
}

function RcvBox({ by }: { by: number }) {
  return (
    <g>
      <rect x={53} y={by + 1} width={4} height={4} fill="#fbf7ee" />
      <rect x={52} y={by} width={6} height={1} fill="#2d2d2d" />
      <rect x={52} y={by + 5} width={6} height={1} fill="#2d2d2d" />
      <rect x={52} y={by} width={1} height={6} fill="#2d2d2d" />
      <rect x={57} y={by} width={1} height={6} fill="#2d2d2d" />
    </g>
  );
}

function RcvCheck({ by, cls }: { by: number; cls: string }) {
  return (
    <g className={cls} fill="#1a7abb">
      {RCV_CHECK.map((p, i) => (
        <rect key={i} x={52 + p[0]} y={by + p[1]} width={1} height={1} />
      ))}
    </g>
  );
}

function RcvItem({ y, segs }: { y: number; segs: RcvPx[] }) {
  return (
    <g fill="#9a8f7d">
      {segs.map((s, i) => (
        <rect key={i} x={s[0]} y={y} width={s[1]} height={2} />
      ))}
    </g>
  );
}

export default function ReferenceCallVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f7f1e3]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="rcv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#f7f1e3" />
          <rect x="2" y="2" width="92" height="36" fill="url(#rcv-grid)" />

          {/* telephone handset */}
          <g fill="#1a7abb">
            <rect x="16" y="12" width="4" height="1" />
            <rect x="15" y="13" width="6" height="4" />
            <rect x="16" y="17" width="4" height="1" />
            <rect x="7" y="24" width="4" height="1" />
            <rect x="6" y="25" width="6" height="4" />
            <rect x="7" y="29" width="4" height="1" />
            <rect x="13" y="17" width="3" height="2" />
            <rect x="12" y="19" width="3" height="2" />
            <rect x="11" y="21" width="3" height="2" />
            <rect x="10" y="23" width="3" height="2" />
          </g>
          <g fill="#0e4d78">
            <rect x="20" y="13" width="1" height="4" />
            <rect x="16" y="17" width="4" height="1" />
            <rect x="11" y="25" width="1" height="4" />
            <rect x="7" y="29" width="4" height="1" />
            <rect x="15" y="18" width="1" height="1" />
            <rect x="14" y="20" width="1" height="1" />
            <rect x="13" y="22" width="1" height="1" />
          </g>
          <g fill="#5cb0e6">
            <rect x="16" y="13" width="1" height="1" />
            <rect x="7" y="25" width="1" height="1" />
          </g>

          {/* concentric sound waves (blue accent) rippling outward */}
          <RcvWave pts={RCV_WAVE1} cls="rcv-wave1" fill="#3d9bd4" />
          <RcvWave pts={RCV_WAVE2} cls="rcv-wave2" fill="#2585c5" />
          <RcvWave pts={RCV_WAVE3} cls="rcv-wave3" fill="#1a7abb" />

          {/* 3-item prep checklist */}
          <RcvItem y={10} segs={[[61, 9], [72, 6], [80, 6]]} />
          <RcvItem y={20} segs={[[61, 7], [70, 8], [81, 5]]} />
          <RcvItem y={30} segs={[[61, 10], [73, 5], [80, 7]]} />

          <RcvBox by={8} />
          <RcvBox by={18} />
          <RcvBox by={28} />

          <RcvCheck by={8} cls="rcv-check1" />
          <RcvCheck by={18} cls="rcv-check2" />
          <RcvCheck by={28} cls="rcv-check3" />
        </svg>
      </div>
    </div>
  );
}
