/**
 * Animated pixel-art scene for the "Analog Camera Museum" project card.
 *
 * A tiny instant camera lives on a dark blue screen: the lens sits with its
 * iris open, then the shutter snaps shut, a flash bulb and the whole screen
 * pop white, and — hidden under that flash — a fresh instant photo feeds out
 * of the bottom slot and develops in chunky bands from a blank cream card
 * into a little blue landscape. Blue accent trim throughout. Loop is 6s.
 * Pure SVG + CSS keyframes (see globals.css, "Analog camera card visual") —
 * server-rendered, no JS shipped.
 */

// Concentric pixel discs that build the lens barrel (each row is [y, x, width]).
const ACV_OUTER: number[][] = [
  [6, 44, 8], [7, 42, 12], [8, 41, 14], [9, 40, 16], [10, 39, 18],
  [11, 39, 18], [12, 38, 20], [13, 38, 20], [14, 38, 20], [15, 38, 20],
  [16, 38, 20], [17, 38, 20], [18, 38, 20], [19, 39, 18], [20, 39, 18],
  [21, 40, 16], [22, 41, 14], [23, 42, 12], [24, 44, 8],
];
const ACV_BARREL: number[][] = [
  [9, 44, 8], [10, 43, 10], [11, 42, 12], [12, 42, 12], [13, 41, 14],
  [14, 41, 14], [15, 41, 14], [16, 41, 14], [17, 41, 14], [18, 42, 12],
  [19, 42, 12], [20, 43, 10], [21, 44, 8],
];
const ACV_IRIS: number[][] = [
  [10, 45, 6], [11, 44, 8], [12, 43, 10], [13, 42, 12], [14, 42, 12],
  [15, 42, 12], [16, 42, 12], [17, 42, 12], [18, 43, 10], [19, 44, 8],
  [20, 45, 6],
];
const ACV_HOLE: number[][] = [
  [11, 45, 6], [12, 44, 8], [13, 43, 10], [14, 43, 10], [15, 43, 10],
  [16, 43, 10], [17, 43, 10], [18, 44, 8], [19, 45, 6],
];

export default function AnalogCameraVisual() {
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
              id="acv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
          </defs>

          {/* screen */}
          <rect x="0" y="0" width="96" height="40" fill="#f7f1e3" />
          <rect x="0" y="0" width="96" height="40" fill="url(#acv-grid)" />

          {/* instant photo — drawn UNDER the camera so it feeds from the slot */}
          <g className="acv-photo">
            {/* cream film card */}
            <rect x="37" y="20" width="22" height="18" fill="#e9e5d2" />
            {/* blue frame on the exposed (lower) part of the card */}
            <rect x="37" y="27" width="1" height="11" fill="#1a7abb" />
            <rect x="58" y="27" width="1" height="11" fill="#1a7abb" />
            <rect x="37" y="37" width="22" height="1" fill="#1a7abb" />
            {/* the developing image */}
            <g className="acv-develop">
              <rect x="40" y="29" width="16" height="6" fill="#bfe3ff" />
              <rect x="41" y="30" width="2" height="2" fill="#eba417" />
              {/* far ridge */}
              <rect x="51" y="32" width="4" height="1" fill="#5ab0e6" />
              <rect x="50" y="33" width="6" height="2" fill="#5ab0e6" />
              {/* near peak */}
              <rect x="46" y="31" width="2" height="1" fill="#1a7abb" />
              <rect x="45" y="32" width="4" height="1" fill="#1a7abb" />
              <rect x="44" y="33" width="6" height="1" fill="#1a7abb" />
              <rect x="42" y="34" width="10" height="1" fill="#1a7abb" />
            </g>
          </g>

          {/* camera body */}
          <rect x="14" y="2" width="68" height="25" fill="#33475d" />
          <rect x="14" y="2" width="7" height="25" fill="#26374a" />
          <rect x="14" y="2" width="68" height="1" fill="#46607a" />
          <rect x="14" y="25" width="68" height="2" fill="#1c2938" />
          {/* blue accent trim */}
          <rect x="14" y="7" width="68" height="1" fill="#1e88d6" />
          <rect x="14" y="22" width="68" height="1" fill="#1a7abb" />
          {/* shutter button on the top edge */}
          <rect x="46" y="0" width="5" height="2" fill="#cf4a38" />
          <rect x="46" y="0" width="5" height="1" fill="#e0836f" />
          {/* viewfinder */}
          <rect x="21" y="3" width="11" height="6" fill="#1a7abb" />
          <rect x="22" y="4" width="9" height="4" fill="#0a1420" />
          <rect x="23" y="5" width="2" height="1" fill="#3aa0e0" />
          {/* flash unit */}
          <rect x="60" y="4" width="15" height="6" fill="#1c2836" />
          <rect x="60" y="4" width="15" height="1" fill="#1e88d6" />
          <rect x="62" y="6" width="9" height="3" fill="#93b4cc" />
          {/* status LED */}
          <rect className="acv-led" x="17" y="23" width="2" height="2" fill="#1e88d6" />
          {/* photo slot */}
          <rect x="36" y="24" width="24" height="2" fill="#0a0e17" />

          {/* lens */}
          <g>
            {ACV_OUTER.map((r, i) => (
              <rect key={"acv-o" + i} x={r[1]} y={r[0]} width={r[2]} height={1} fill="#1a7abb" />
            ))}
            {ACV_BARREL.map((r, i) => (
              <rect key={"acv-b" + i} x={r[1]} y={r[0]} width={r[2]} height={1} fill="#4a5f78" />
            ))}
            {ACV_IRIS.map((r, i) => (
              <rect key={"acv-i" + i} x={r[1]} y={r[0]} width={r[2]} height={1} fill="#1e88d6" />
            ))}
            {ACV_HOLE.map((r, i) => (
              <rect key={"acv-h" + i} x={r[1]} y={r[0]} width={r[2]} height={1} fill="#0a1420" />
            ))}
            {/* glass highlight */}
            <rect x="44" y="12" width="2" height="1" fill="#7fbce8" />
            <rect x="44" y="13" width="1" height="1" fill="#7fbce8" />
          </g>

          {/* shutter-shut overlay — pops blue over the aperture on the blink */}
          <g className="acv-shut" opacity="0">
            {ACV_HOLE.map((r, i) => (
              <rect key={"acv-s" + i} x={r[1]} y={r[0]} width={r[2]} height={1} fill="#2aa8ff" />
            ))}
            <rect x="47" y="14" width="2" height="2" fill="#0a1420" />
          </g>

          {/* flash bulb pop */}
          <rect className="acv-bulb" x="62" y="6" width="9" height="3" fill="#ffffff" opacity="0" />

          {/* whole-screen flash */}
          <rect className="acv-flash" x="0" y="0" width="96" height="40" fill="#ffffff" opacity="0" />
        </svg>
      </div>
    </div>
  );
}
