/**
 * Animated pixel-art scene for the "BTC Bottom & Top Indicator" project card.
 *
 * A miniature of the real dashboard: a price line draws itself through one
 * full market cycle on a dark terminal screen, SELL flashes as it enters the
 * red top zone, BUY as it capitulates into the green bottom zone, then the
 * live tip blinks until the next cycle. A pixel Bitcoin coin spins on the
 * corner of the frame. Pure SVG + CSS keyframes (see globals.css, "BTC cycle
 * card visual") — server-rendered, no JS shipped.
 */

// 3x5 bitmap glyphs, drawn as 1px rects so labels stay crisp at any scale.
const GLYPHS: Record<string, string[]> = {
  B: ["110", "101", "110", "101", "110"],
  U: ["101", "101", "101", "101", "111"],
  Y: ["101", "101", "010", "010", "010"],
  S: ["111", "100", "111", "001", "111"],
  E: ["111", "100", "110", "100", "111"],
  L: ["100", "100", "100", "100", "111"],
};

function PixelWord({
  word,
  x,
  y,
  fill,
}: {
  word: string;
  x: number;
  y: number;
  fill: string;
}) {
  return (
    <g fill={fill}>
      {[...word].flatMap((ch, i) =>
        (GLYPHS[ch] ?? []).flatMap((row, ry) =>
          [...row].map((bit, rx) =>
            bit === "1" ? (
              <rect
                key={`${i}-${ry}-${rx}`}
                x={x + i * 4 + rx}
                y={y + ry}
                width={1}
                height={1}
              />
            ) : null
          )
        )
      )}
    </g>
  );
}

/*
 * One market cycle as an axis-aligned (hard pixel steps) path:
 * chop → rally → blow-off top (y8, inside the red band) → crash with a
 * dead-cat bounce → capitulation trough (y32, inside the green band) →
 * recovery. pathLength=100 normalizes the dash draw; the peak sits at 35%
 * of the path and the trough at 70%, which the CSS flash timings match.
 */
const CYCLE_PATH =
  "M4 24H8V22H12V24H16V20H20V18H24V20H28V14H32V10H36V8H44V12H48V18H52V16H56V24H60V28H64V32H72V28H76V30H80V24H84V22H88V18H92V16";

export default function BtcCycleVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#0a0e17]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="btcv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#1c2637" />
            </pattern>
            <pattern
              id="btcv-dither-red"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#e05f4e" />
              <rect x="1" y="1" width="1" height="1" fill="#7a2c22" />
            </pattern>
            <pattern
              id="btcv-dither-green"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#92cc41" />
              <rect x="1" y="1" width="1" height="1" fill="#3d5c14" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#0a0e17" />
          <rect x="4" y="6" width="88" height="28" fill="url(#btcv-grid)" />

          {/* top (sell) and bottom (buy) zones — glow while the line is inside */}
          <rect
            className="btcv-band-top"
            x="4"
            y="6"
            width="88"
            height="4"
            fill="url(#btcv-dither-red)"
          />
          <rect
            className="btcv-band-bot"
            x="4"
            y="30"
            width="88"
            height="4"
            fill="url(#btcv-dither-green)"
          />

          {/* the cycle, drawn pixel-column by pixel-column */}
          <path
            className="btcv-draw"
            d={CYCLE_PATH}
            pathLength={100}
            fill="none"
            stroke="#f7931a"
            strokeWidth="2"
          />

          {/* live tip — blinks once the cycle has fully printed */}
          <rect
            className="btcv-tip"
            x="90"
            y="14"
            width="3"
            height="3"
            fill="#ffdd57"
          />

          <g className="btcv-sell">
            <PixelWord word="SELL" x={66} y={11} fill="#ff5a49" />
          </g>
          <g className="btcv-buy">
            <PixelWord word="BUY" x={24} y={25} fill="#92cc41" />
          </g>
        </svg>
      </div>

      {/* spinning pixel Bitcoin, pinned to the screen corner like a badge */}
      <svg
        viewBox="0 0 12 12"
        className="absolute -left-2.5 -top-2.5 h-7 w-7"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* frame 1 — coin face with ₿ */}
        <g className="btcv-coin-front">
          <g fill="#8a5300">
            <rect x="3" y="1" width="6" height="10" />
            <rect x="1" y="3" width="10" height="6" />
            <rect x="2" y="2" width="8" height="8" />
          </g>
          <g fill="#f7931a">
            <rect x="4" y="2" width="4" height="8" />
            <rect x="2" y="4" width="8" height="4" />
            <rect x="3" y="3" width="6" height="6" />
          </g>
          <g fill="#ffc966">
            <rect x="4" y="2" width="2" height="1" />
            <rect x="3" y="3" width="1" height="1" />
            <rect x="2" y="4" width="1" height="2" />
          </g>
          {/* ₿ — 3x5 "B" plus the top/bottom nubs */}
          <g fill="#fff8ec">
            <rect x="6" y="3" width="1" height="1" />
            <rect x="5" y="4" width="2" height="1" />
            <rect x="5" y="5" width="1" height="1" />
            <rect x="7" y="5" width="1" height="1" />
            <rect x="5" y="6" width="2" height="1" />
            <rect x="5" y="7" width="1" height="1" />
            <rect x="7" y="7" width="1" height="1" />
            <rect x="5" y="8" width="2" height="1" />
            <rect x="6" y="9" width="1" height="1" />
          </g>
        </g>
        {/* frame 2 — half turn */}
        <g className="btcv-coin-half">
          <g fill="#8a5300">
            <rect x="4" y="1" width="4" height="10" />
            <rect x="3" y="2" width="6" height="8" />
          </g>
          <rect x="4" y="2" width="4" height="8" fill="#f7931a" />
          <rect x="5" y="2" width="1" height="8" fill="#ffc966" />
        </g>
        {/* frame 3 — edge on */}
        <g className="btcv-coin-edge">
          <rect x="5" y="1" width="2" height="10" fill="#8a5300" />
          <rect x="5" y="2" width="1" height="8" fill="#c77b16" />
        </g>
      </svg>
    </div>
  );
}
