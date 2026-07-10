/**
 * Animated pixel-art scene for the "Earl" project card.
 *
 * An ornate gold picture frame hangs on a museum wall. Inside, a classical
 * sepia cameo (dark bust profile on a parchment medallion) holds serenely,
 * then dissolves into diffusion-style static and re-renders itself: a bright
 * gold "paint head" sweeps top-to-bottom while the noise denoises back into
 * the finished portrait, then it holds again. The corner gems twinkle. Pure
 * SVG + CSS keyframes (see globals.css, "Earl portrait card visual") —
 * server-rendered, no JS shipped.
 */

// 3x5 bitmap glyphs for the little brass nameplate, drawn as 1px rects.
const GLYPHS: Record<string, string[]> = {
  E: ["111", "100", "110", "100", "111"],
  A: ["111", "101", "111", "101", "101"],
  R: ["110", "101", "110", "101", "101"],
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
                key={i + "-" + ry + "-" + rx}
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

// Parchment medallion (cream oval), row by row: [y, x, width].
const OVAL: number[][] = [
  [6, 40, 16],
  [7, 37, 22],
  [8, 35, 26],
  [9, 33, 30],
  [10, 32, 32],
  [11, 31, 34],
  [12, 30, 36],
  [13, 29, 38],
  [14, 29, 38],
  [15, 28, 40],
  [16, 28, 40],
  [17, 28, 40],
  [18, 28, 40],
  [19, 28, 40],
  [20, 29, 38],
  [21, 29, 38],
  [22, 30, 36],
  [23, 31, 34],
  [24, 32, 32],
  [25, 33, 30],
  [26, 35, 26],
  [27, 37, 22],
  [28, 40, 16],
  [29, 44, 8],
];

// Dark bust profile (facing left), row by row: [y, x, width].
const BUST: number[][] = [
  [9, 46, 10],
  [10, 43, 15],
  [11, 41, 17],
  [12, 40, 18],
  [13, 39, 19],
  [14, 39, 19],
  [15, 41, 17],
  [16, 40, 18],
  [17, 41, 17],
  [18, 43, 15],
  [19, 46, 10],
  [20, 46, 10],
  [21, 45, 12],
  [22, 42, 18],
  [23, 39, 24],
  [24, 37, 26],
  [25, 36, 26],
  [26, 37, 24],
  [27, 38, 20],
  [28, 41, 14],
  [29, 45, 6],
];

// Lit front edge of the profile — a 1px warmer highlight that carves the face.
const RIM: number[][] = [
  [12, 40],
  [13, 39],
  [14, 39],
  [15, 41],
  [16, 40],
  [17, 41],
  [18, 43],
];

export default function PortraitFrameVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#c9a800]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            {/* coarse gold diffusion static */}
            <pattern
              id="epv-static-a"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="2" height="2" fill="#c9a800" />
              <rect x="2" y="2" width="2" height="2" fill="#1a130a" />
              <rect x="2" y="0" width="2" height="2" fill="#7a5f00" />
              <rect x="0" y="2" width="2" height="2" fill="#3a2c08" />
            </pattern>
            {/* fine parchment/sepia static */}
            <pattern
              id="epv-static-b"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#e6d3a3" />
              <rect x="1" y="1" width="1" height="1" fill="#2a1f12" />
              <rect x="1" y="0" width="1" height="1" fill="#8a6d00" />
              <rect x="0" y="1" width="1" height="1" fill="#1a130a" />
            </pattern>
          </defs>

          {/* ---- ornate gold frame ---- */}
          <rect x="0" y="0" width="96" height="40" fill="#c9a800" />
          <rect x="0" y="0" width="96" height="2" fill="#f7d51d" />
          <rect x="0" y="0" width="2" height="40" fill="#f7d51d" />
          <rect x="0" y="38" width="96" height="2" fill="#5c4700" />
          <rect x="94" y="0" width="2" height="40" fill="#5c4700" />
          {/* sunken molding around the picture */}
          <rect x="4" y="4" width="88" height="28" fill="#7a5f00" />
          {/* picture recess */}
          <rect x="6" y="5" width="84" height="26" fill="#1a130a" />

          {/* ---- the finished cameo (always drawn underneath the static) ---- */}
          {OVAL.map((r, i) => (
            <rect
              key={"ov" + i}
              x={r[1]}
              y={r[0]}
              width={r[2]}
              height={1}
              fill="#e6d3a3"
            />
          ))}
          {BUST.map((r, i) => (
            <rect
              key={"bu" + i}
              x={r[1]}
              y={r[0]}
              width={r[2]}
              height={1}
              fill="#2a1f12"
            />
          ))}
          {RIM.map((r, i) => (
            <rect
              key={"rm" + i}
              x={r[1]}
              y={r[0]}
              width={1}
              height={1}
              fill="#5a4326"
            />
          ))}

          {/* ---- diffusion static overlays (fade in then denoise away) ---- */}
          <rect
            className="epv-noise-a"
            x="6"
            y="5"
            width="84"
            height="26"
            fill="url(#epv-static-a)"
          />
          <rect
            className="epv-noise-b"
            x="6"
            y="5"
            width="84"
            height="26"
            fill="url(#epv-static-b)"
          />

          {/* ---- gold "paint head" sweeping down during the re-render ---- */}
          <g className="epv-scan">
            <rect x="6" y="6" width="84" height="1" fill="#fff2a8" />
            <rect x="6" y="7" width="84" height="1" fill="#f7d51d" />
          </g>

          {/* ---- brass nameplate ---- */}
          <rect x="34" y="33" width="28" height="6" fill="#1a130a" />
          <rect x="34" y="33" width="28" height="1" fill="#5c4700" />
          <PixelWord word="EARL" x={41} y={34} fill="#e6d3a3" />

          {/* ---- ornaments: edge studs (static) + twinkling corner gems ---- */}
          <rect x="47" y="1" width="2" height="2" fill="#f7d51d" />
          <rect x="1" y="19" width="2" height="2" fill="#f7d51d" />
          <rect x="93" y="19" width="2" height="2" fill="#f7d51d" />
          <g className="epv-gem">
            <rect x="2" y="2" width="3" height="3" fill="#f7d51d" />
            <rect x="3" y="3" width="1" height="1" fill="#fff2a8" />
            <rect x="91" y="2" width="3" height="3" fill="#f7d51d" />
            <rect x="92" y="3" width="1" height="1" fill="#fff2a8" />
            <rect x="2" y="35" width="3" height="3" fill="#f7d51d" />
            <rect x="3" y="36" width="1" height="1" fill="#fff2a8" />
            <rect x="91" y="35" width="3" height="3" fill="#f7d51d" />
            <rect x="92" y="36" width="1" height="1" fill="#fff2a8" />
          </g>
        </svg>
      </div>
    </div>
  );
}
