/**
 * Animated pixel-art scene for the "Market Intel" project card.
 *
 * A miniature of the real page: candles print one by one on a cream trading
 * screen, then the three bias meters (Intraday, Swing, Macro) fill out from
 * their centre ticks, and the verdict LONG blinks once they agree enough.
 * Pure SVG + CSS keyframes (see globals.css, "Market Intel card visual"):
 * server-rendered, no JS shipped.
 */

// 3x5 bitmap glyphs, drawn as 1px rects so labels stay crisp at any scale.
const GLYPHS: Record<string, string[]> = {
  I: ["111", "010", "010", "010", "111"],
  S: ["111", "100", "111", "001", "111"],
  M: ["101", "111", "101", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  O: ["111", "101", "101", "101", "111"],
  N: ["110", "101", "101", "101", "101"],
  G: ["111", "100", "101", "101", "111"],
};

function PixelWord({ word, x, y, fill }: { word: string; x: number; y: number; fill: string }) {
  return (
    <g fill={fill}>
      {[...word].flatMap((ch, i) =>
        (GLYPHS[ch] ?? []).flatMap((row, ry) =>
          [...row].map((bit, rx) =>
            bit === "1" ? <rect key={`${i}-${ry}-${rx}`} x={x + i * 4 + rx} y={y + ry} width={1} height={1} /> : null,
          ),
        ),
      )}
    </g>
  );
}

// An uptrend with pullbacks, in screen y (down = lower price): open, close, high, low.
const CANDLES: [number, number, number, number][] = [
  [28, 26, 25, 30],
  [26, 27, 24, 29],
  [27, 23, 22, 28],
  [23, 24, 21, 26],
  [24, 19, 18, 25],
  [19, 20, 17, 22],
  [20, 14, 12, 21],
  [14, 10, 8, 15],
];

const UP = "#4a7c10";
const DOWN = "#cf3a2a";

// Bias meters: track x 68..90, centre tick at 79. Positive bars grow right.
const METERS = [
  { label: "I", y: 8, len: 8 },
  { label: "S", y: 15, len: 6 },
  { label: "M", y: 22, len: -4 },
];

export default function MarketIntelVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f7f1e3]">
        <svg viewBox="0 0 96 40" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
          <defs>
            <pattern id="miv-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#f7f1e3" />
          <rect x="4" y="6" width="54" height="28" fill="url(#miv-grid)" />

          {/* candles print left to right */}
          {CANDLES.map(([o, c, h, l], i) => {
            const x = 7 + i * 6;
            const fill = c < o ? UP : DOWN;
            return (
              <g key={i} className="miv-candle" style={{ animationDelay: `${i * 0.35}s` }} fill={fill}>
                <rect x={x + 1} y={h} width={1} height={l - h} />
                <rect x={x} y={Math.min(o, c)} width={3} height={Math.max(1, Math.abs(o - c))} />
              </g>
            );
          })}

          {/* divider between chart and the bias panel */}
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x="61" y={5 + i * 2} width="1" height="1" fill="#c9bfa6" />
          ))}

          {/* the three horizon meters */}
          {METERS.map((m) => (
            <g key={m.label}>
              <PixelWord word={m.label} x={64} y={m.y} fill="#2d2d2d" />
              <rect x="68" y={m.y + 2} width="23" height="1" fill="#d8ccb0" />
              <rect x="79" y={m.y} width="1" height="5" fill="#2d2d2d" />
              <rect
                className={m.len > 0 ? "miv-bar miv-bar-pos" : "miv-bar miv-bar-neg"}
                x={m.len > 0 ? 80 : 79 + m.len}
                y={m.y + 1}
                width={Math.abs(m.len)}
                height="3"
                fill={m.len > 0 ? UP : DOWN}
              />
            </g>
          ))}

          {/* verdict */}
          <g className="miv-verdict">
            <rect x="64" y="30" width="26" height="7" fill="#e3efcf" />
            <PixelWord word="LONG" x={69} y={31} fill={UP} />
          </g>
        </svg>
      </div>
    </div>
  );
}
