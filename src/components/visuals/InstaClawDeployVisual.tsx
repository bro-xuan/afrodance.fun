// 3x5 bitmap glyphs, drawn as 1px rects so labels stay crisp at any scale.
const GLYPHS: Record<string, string[]> = {
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  P: ["111", "101", "111", "100", "100"],
  L: ["100", "100", "100", "100", "111"],
  O: ["111", "101", "101", "101", "111"],
  Y: ["101", "101", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  S: ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "0": ["111", "101", "101", "101", "111"],
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

// A tiny 5-pixel plus-shaped EU star.
function Star({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx} y={cy} width={1} height={1} />
      <rect x={cx - 1} y={cy} width={1} height={1} />
      <rect x={cx + 1} y={cy} width={1} height={1} />
      <rect x={cx} y={cy - 1} width={1} height={1} />
      <rect x={cx} y={cy + 1} width={1} height={1} />
    </g>
  );
}

// 8 stars evenly ringed around the server centre (22,21), radius ~11 —
// symmetric about the centre, spark lands crisply on each station.
const STARS: [number, number][] = [
  [22, 10],
  [30, 13],
  [33, 21],
  [30, 29],
  [22, 32],
  [14, 29],
  [11, 21],
  [14, 13],
];

// Segment-gap columns painted over the fill so it always reads as 8 blocks.
const GAPS = [46, 52, 58, 64, 70, 76, 82];

export default function InstaClawDeployVisual() {
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
              id="icv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#f7f1e3" />
          <rect x="0" y="7" width="96" height="27" fill="url(#icv-grid)" />

          {/* ── EU star ring around the server ── */}
          <g className="icv-ring" fill="#c9a800">
            {STARS.map(([cx, cy], i) => (
              <Star key={"s-" + i} cx={cx} cy={cy} />
            ))}
          </g>
          {/* one bright spark chases station-to-station like a spinner —
              8 crisp sparks frame-swapped by opacity (no transform, so the
              pixel plus never rotates/blurs and always lands on a station) */}
          <g fill="#e8b923">
            {STARS.map(([cx, cy], i) => (
              <g
                key={"spk-" + i}
                className="icv-spark"
                style={{ animationDelay: -(i * 0.75) + "s" }}
              >
                <Star cx={cx} cy={cy} />
              </g>
            ))}
          </g>

          {/* ── server rack ── */}
          <g>
            <rect x="16" y="15" width="12" height="12" fill="#31435f" />
            <rect x="16" y="15" width="12" height="1" fill="#4b6386" />
            <rect x="16" y="15" width="1" height="12" fill="#233149" />
            <rect x="17" y="21" width="10" height="1" fill="#141d2b" />
            <rect x="21" y="17" width="4" height="1" fill="#141d2b" />
            <rect x="21" y="19" width="4" height="1" fill="#141d2b" />
            <rect x="21" y="23" width="4" height="1" fill="#141d2b" />
            <rect x="21" y="25" width="4" height="1" fill="#141d2b" />
            <rect
              className="icv-led"
              x="18"
              y="17"
              width="2"
              height="2"
              fill="#6aad30"
            />
            <rect x="18" y="23" width="2" height="2" fill="#d44332" />
          </g>

          {/* ── progress bar ── */}
          <rect x="40" y="12" width="50" height="7" fill="#e4dac2" />
          <g className="icv-fill">
            <rect x="41" y="13" width="48" height="5" fill="#6aad30" />
          </g>
          {GAPS.map((gx) => (
            <rect
              key={"g-" + gx}
              x={gx}
              y={13}
              width={1}
              height={5}
              fill="#e4dac2"
            />
          ))}
          {/* accent frame around the bar */}
          <rect x="40" y="12" width="50" height="1" fill="#d44332" />
          <rect x="40" y="18" width="50" height="1" fill="#d44332" />
          <rect x="40" y="12" width="1" height="7" fill="#d44332" />
          <rect x="89" y="12" width="1" height="7" fill="#d44332" />

          {/* ── DEPLOYED payoff ── */}
          <g className="icv-deployed">
            <PixelWord word="DEPLOYED" x={49} y={22} fill="#4a7c10" />
          </g>

          {/* ── red title bar ── */}
          <rect x="0" y="0" width="96" height="7" fill="#d44332" />
          <rect x="3" y="2" width="2" height="2" fill="#f4f4f4" />
          <rect x="7" y="2" width="2" height="2" fill="#ffcc33" />
          <rect x="11" y="2" width="2" height="2" fill="#92cc41" />
          <PixelWord word="EU" x={85} y={1} fill="#fff0ec" />

          {/* ── red footer / prompt ── */}
          <rect x="0" y="34" width="96" height="6" fill="#d44332" />
          <g fill="#fff0ec">
            <rect x="4" y="35" width="1" height="1" />
            <rect x="5" y="36" width="1" height="1" />
            <rect x="6" y="37" width="1" height="1" />
            <rect x="5" y="38" width="1" height="1" />
            <rect x="4" y="39" width="1" height="1" />
          </g>
          <rect
            className="icv-cursor"
            x="9"
            y="35"
            width="4"
            height="5"
            fill="#92cc41"
          />
          <PixelWord word="60S" x={79} y={35} fill="#fff0ec" />
        </svg>
      </div>
    </div>
  );
}
