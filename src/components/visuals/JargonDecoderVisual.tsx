// 3x5 bitmap glyphs, drawn as 1px rects so labels stay crisp at any scale.
const GLYPHS: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  G: ["111", "100", "101", "101", "111"],
  K: ["101", "110", "100", "110", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["101", "111", "111", "111", "101"],
  O: ["111", "101", "101", "101", "111"],
  R: ["110", "101", "110", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  Y: ["101", "101", "010", "010", "010"],
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

export default function JargonDecoderVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#0d1f14]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="ctv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#12281a" />
            </pattern>
            <pattern
              id="ctv-dg"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#4a7c10" />
              <rect x="1" y="1" width="1" height="1" fill="#25400a" />
            </pattern>
            <pattern
              id="ctv-da"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#d9a441" />
              <rect x="1" y="1" width="1" height="1" fill="#6b4d12" />
            </pattern>
            <pattern
              id="ctv-dr"
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="#e0483a" />
              <rect x="1" y="1" width="1" height="1" fill="#5c1a12" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#0d1f14" />
          <rect x="0" y="0" width="96" height="40" fill="url(#ctv-grid)" />

          {/* IN prompt chevron */}
          <g fill="#4a7c10">
            <rect x="8" y="4" width="1" height="1" />
            <rect x="9" y="5" width="1" height="1" />
            <rect x="10" y="6" width="1" height="1" />
            <rect x="9" y="7" width="1" height="1" />
            <rect x="8" y="8" width="1" height="1" />
          </g>

          {/* jargon input — flips between two buzzwords, then settles */}
          <g className="ctv-jargon-a">
            <PixelWord word="SYNERGY" x={13} y={4} fill="#7d8f74" />
          </g>
          <g className="ctv-jargon-b">
            <PixelWord word="LEVERAGE" x={13} y={4} fill="#7d8f74" />
          </g>

          {/* dashed divider between input and decoded output */}
          {[
            8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72,
            76, 80, 84,
          ].map((dx) => (
            <rect
              key={"d" + dx}
              x={dx}
              y={13}
              width={2}
              height={1}
              fill="#24401a"
            />
          ))}

          {/* OUT prompt chevron */}
          <g fill="#92cc41">
            <rect x="8" y="17" width="1" height="1" />
            <rect x="9" y="18" width="1" height="1" />
            <rect x="10" y="19" width="1" height="1" />
            <rect x="9" y="20" width="1" height="1" />
            <rect x="8" y="21" width="1" height="1" />
          </g>

          {/* plain-English output (always drawn; decode beam reveals it) */}
          <PixelWord word="TEAMWORK" x={13} y={17} fill="#92cc41" />
          <rect
            className="ctv-cursor"
            x={45}
            y={17}
            width={2}
            height={5}
            fill="#92cc41"
          />

          {/* decode beam / cover: hides the output, wipes away left-to-right */}
          <rect
            className="ctv-cover"
            x={13}
            y={16}
            width={36}
            height={8}
            fill="#0d1f14"
          />

          {/* BS meter */}
          <PixelWord word="BS" x={4} y={30} fill="#7d8f74" />
          <rect x="16" y="30" width="24" height="5" fill="url(#ctv-dg)" />
          <rect x="40" y="30" width="20" height="5" fill="url(#ctv-da)" />
          <rect
            className="ctv-redzone"
            x="60"
            y="30"
            width="28"
            height="5"
            fill="url(#ctv-dr)"
          />
          {/* meter frame (crisp 1px rects) */}
          <g fill="#3a5c22">
            <rect x="15" y="29" width="74" height="1" />
            <rect x="15" y="35" width="74" height="1" />
            <rect x="15" y="29" width="1" height="7" />
            <rect x="88" y="29" width="1" height="7" />
          </g>
          {/* needle — climbs, overshoots red, settles high */}
          <rect
            className="ctv-needle"
            x="16"
            y="29"
            width="2"
            height="7"
            fill="#f2ffe6"
          />
        </svg>
      </div>
    </div>
  );
}
