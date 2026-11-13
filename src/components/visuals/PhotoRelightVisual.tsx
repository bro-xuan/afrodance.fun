/**
 * Animated pixel-art scene for the "CineGlow" project card.
 *
 * A print lies on CineGlow's dark lab table. A line of light walks across it
 * from the sun's side, and behind the line the flat, overcast selfie comes
 * back relit in golden hour: warm skin, a rim of light on the hair and the
 * shoulder, a low sun on the horizon, and a warm glow on the table round the
 * print. It holds, then the line walks back to show the original again.
 * Beside the print stand a film canister (the Film Lab) and a strip of looks
 * with Golden Hour marked in the app's safelight red. Loop is 8s. Pure SVG +
 * CSS keyframes (see globals.css, "CineGlow (PhotoRelightVisual)"); the base
 * frame is the line halfway, original on the left and relit on the right,
 * which is what prefers-reduced-motion gets. Server-rendered, no JS shipped.
 */
import type { ReactElement } from "react";

type Row = [y: number, x: number, width: number];
type Look = "original" | "relit";

/** Where the print lies on the 96×40 table. */
const PX = 34;
const PY = 4;
/** The relit layer is cut into strips this wide, one per step of the line. */
const STRIP = 4;
const STRIPS = 7;
/** Strips already relit in the still frame: the right three, so the line stands halfway. */
const STILL_FROM = 4;
/** Seconds between two steps of the line (keep in step with globals.css). */
const STEP_S = 0.2;

// The photo, 28×32: a selfie against an evening sky, the sun low on the right.
// a sky · f ground · h hair · r hair rim · s skin · d skin shadow · l skin
// highlight · e eye · m mouth · n neck · t shirt · u shirt shadow · v shirt rim
// · o sun · g sun glow. Rims, highlights and the sun only show once relit.
const PHOTO = [
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaahhhhhhhhaaaaaaaaaa",
  "aaaaaaaahhhhhhhhhhhraaaaaaaa",
  "aaaaaaahhhhhhhhhhhhhraaaaaaa",
  "aaaaaaahhhhhhhhhhhhhraaaaaaa",
  "aaaaaaahhhsssssssshhraaaaaaa",
  "aaaaaaahhdsssssssslhraaaaaaa",
  "aaaaaaahhdsssssssslhraaaaaaa",
  "aaaaaaahhdsssssssslhraaaaaaa",
  "aaaaaaahhdseesseeslhraaaaaaa",
  "aaaaaaahhdsssssssllhraaaaaaa",
  "aaaaaaahhdsssdsssllhraaaaaaa",
  "aaaaaaahhdsssssssllhraaaaaaa",
  "aaaaaaahhdssmmmmsllhraaaaaaa",
  "aaaaaaaaadsssssssllaaagggaaa",
  "aaaaaaaaaadsssssslaaagooogaa",
  "aaaaaaaaaaannnnnnaaaagooogaa",
  "aaaaaaaaaaannnnnnaaaagooogaa",
  "aaaaaaaaaaannnnnnaaaaagggaaa",
  "fffffffffffnnnnnnfffffffffff",
  "ffffffuutttnnnnnnttttvffffff",
  "ffffuuutttttnnnnttttttvvffff",
  "fffuuutttttttnnttttttttvvfff",
  "ffuuuttttttttttttttttttvvvff",
  "fuuuttttttttttttttttttttvvvf",
  "fuuuttttttttttttttttttttvvvf",
  "fuuuttttttttttttttttttttvvvf",
  "fuuuttttttttttttttttttttvvvf",
  "fuuuttttttttttttttttttttvvvf",
  "fuuuttttttttttttttttttttvvvf",
];

// Overcast and flat: no rim, no highlight, no sun (those fall back to the sky).
const ORIGINAL: Record<string, string> = {
  f: "#5e666e",
  h: "#3a3433",
  r: "#3a3433",
  s: "#b59b8b",
  d: "#9e8678",
  l: "#b59b8b",
  e: "#3b3232",
  m: "#8e6e66",
  n: "#9e8678",
  t: "#56667a",
  u: "#4a586a",
  v: "#56667a",
};

// Golden hour: warm light from the low sun on the right.
const RELIT: Record<string, string> = {
  f: "#a85f3b",
  h: "#3a2316",
  r: "#f2a65a",
  s: "#e7ad82",
  d: "#b97650",
  l: "#fbd6a8",
  e: "#2b1a12",
  m: "#b9574a",
  n: "#b97650",
  t: "#3f5a7a",
  u: "#2c3f57",
  v: "#e5a060",
  o: "#fff3d2",
  g: "#ffd07a",
};

function sky(look: Look, y: number) {
  if (look === "original") return y < 7 ? "#9aa2aa" : y < 14 ? "#9098a1" : "#868f98";
  return y < 5 ? "#f6d7a0" : y < 10 ? "#f3c281" : y < 15 ? "#efa862" : "#e68e4c";
}

function colour(look: Look, ch: string, y: number) {
  return (look === "original" ? ORIGINAL : RELIT)[ch] ?? sky(look, y);
}

/** The photo in one look, one rect per run of a colour along each row. */
function Photo({ look }: { look: Look }) {
  const rects: ReactElement[] = [];
  PHOTO.forEach((row, y) => {
    let start = 0;
    for (let x = 1; x <= row.length; x++) {
      const fill = colour(look, row[start], y);
      if (x < row.length && colour(look, row[x], y) === fill) continue;
      rects.push(<rect key={`${y}-${start}`} x={PX + start} y={PY + y} width={x - start} height={1} fill={fill} />);
      start = x;
    }
  });
  return rects;
}

/** The rows of a pixel ellipse centred on (cx, cy), cut to the 40px-tall table. */
function ellipse(cx: number, cy: number, rx: number, ry: number): Row[] {
  const rows: Row[] = [];
  for (let dy = -ry; dy <= ry; dy++) {
    const y = cy + dy;
    if (y < 0 || y > 39) continue;
    const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
    rows.push([y, cx - half, 2 * half + 1]);
  }
  return rows;
}

function Rows({ rows }: { rows: Row[] }) {
  return rows.map(([y, x, w]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} />);
}

const FILM = "#d9a45e";
const SAFELIGHT = "#e5412d";

/** A 9×10 frame on the strip of looks: a sky in three bands, a little figure, and its light. */
function LookFrame({ y, bands, skin, hair, top, light }: {
  y: number;
  bands: [string, string, string];
  skin: string;
  hair: string;
  top: string;
  light: [x: number, y: number, fill: string];
}) {
  return (
    <>
      <rect x={73} y={y} width={9} height={4} fill={bands[0]} />
      <rect x={73} y={y + 4} width={9} height={3} fill={bands[1]} />
      <rect x={73} y={y + 7} width={9} height={3} fill={bands[2]} />
      <rect x={76} y={y + 3} width={3} height={1} fill={hair} />
      <rect x={76} y={y + 4} width={3} height={2} fill={skin} />
      <rect x={75} y={y + 7} width={5} height={1} fill={top} />
      <rect x={74} y={y + 8} width={7} height={2} fill={top} />
      <rect x={light[0]} y={y + light[1]} width={1} height={1} fill={light[2]} />
    </>
  );
}

export default function PhotoRelightVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#0b0907]">
        <svg viewBox="0 0 96 40" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
          <defs>
            <g id="rlv-relit">
              <Photo look="relit" />
            </g>
            {Array.from({ length: STRIPS }, (_, i) => (
              <clipPath key={i} id={`rlv-strip-${i}`}>
                <rect x={PX + i * STRIP} y={PY} width={STRIP} height={PHOTO.length} />
              </clipPath>
            ))}
          </defs>

          {/* the lab table */}
          <rect x="0" y="0" width="96" height="40" fill="#0b0907" />

          {/* warm light on the table round the print, up while it's relit */}
          <g className="rlv-glow" fill="#f2a44e">
            <g opacity={0.09}>
              <Rows rows={ellipse(48, 20, 30, 21)} />
            </g>
            <g opacity={0.12}>
              <Rows rows={ellipse(48, 20, 25, 19)} />
            </g>
            <g opacity={0.16}>
              <Rows rows={ellipse(48, 20, 20, 18)} />
            </g>
          </g>

          {/* film canister, standing on the table */}
          <rect x={14} y={9} width={4} height={2} fill="#3b332d" />
          <rect x={11} y={11} width={10} height={2} fill="#2a2420" />
          <rect x={12} y={11} width={8} height={1} fill="#463c35" />
          <rect x={11} y={13} width={10} height={18} fill="#16110e" />
          <rect x={11} y={16} width={10} height={11} fill={FILM} />
          <rect x={11} y={19} width={10} height={2} fill={SAFELIGHT} />
          <rect x={13} y={23} width={5} height={1} fill="#7a5a30" />
          <rect x={13} y={25} width={3} height={1} fill="#7a5a30" />
          <rect x={12} y={13} width={1} height={18} fill="#ffffff" opacity={0.14} />
          <rect x={20} y={13} width={1} height={18} fill="#000000" opacity={0.35} />
          <rect x={11} y={31} width={10} height={2} fill="#2a2420" />
          {/* its leader, pulled out towards the print */}
          <rect x={21} y={26} width={6} height={4} fill="#5a3520" />
          <rect x={22} y={27} width={1} height={1} fill="#0b0907" />
          <rect x={24} y={27} width={1} height={1} fill="#0b0907" />
          <rect x={26} y={27} width={1} height={1} fill="#0b0907" />

          {/* the print: the original, with the relit photo laid over it strip by strip */}
          <g id="rlv-original">
            <Photo look="original" />
          </g>
          {Array.from({ length: STRIPS }, (_, i) => (
            <g
              key={i}
              className="rlv-reveal"
              style={{ opacity: i >= STILL_FROM ? 1 : 0, animationDelay: `${(STEP_S * (STRIPS - 1 - i)).toFixed(1)}s` }}
            >
              <g className="rlv-revert" style={{ animationDelay: `${(STEP_S * i).toFixed(1)}s` }}>
                <use href="#rlv-relit" clipPath={`url(#rlv-strip-${i})`} />
              </g>
            </g>
          ))}

          {/* the line of light */}
          <g className="rlv-line">
            <rect x={PX - 1} y={PY - 1} width={1} height={PHOTO.length + 2} fill="#f2a44e" opacity={0.5} />
            <rect x={PX + 1} y={PY - 1} width={1} height={PHOTO.length + 2} fill="#f2a44e" opacity={0.5} />
            <rect x={PX} y={PY - 1} width={1} height={PHOTO.length + 2} fill="#fff4d6" />
          </g>

          {/* a strip of looks running off the table: Golden Hour, Night, Flash */}
          <rect x={69} y={0} width={1} height={40} fill="#241e19" />
          <rect x={85} y={0} width={1} height={40} fill="#241e19" />
          <rect x={70} y={0} width={15} height={40} fill="#050403" />
          {Array.from({ length: 13 }, (_, k) => (
            <g key={k} fill="#2b2620">
              <rect x={71} y={1 + 3 * k} width={1} height={1} />
              <rect x={83} y={1 + 3 * k} width={1} height={1} />
            </g>
          ))}
          <LookFrame
            y={4}
            bands={["#f6d7a0", "#efa862", "#e68e4c"]}
            skin="#e7ad82"
            hair="#3a2316"
            top="#3f5a7a"
            light={[80, 5, "#fff3d2"]}
          />
          <LookFrame
            y={16}
            bands={["#15123a", "#2b2672", "#3f389e"]}
            skin="#b8a9e0"
            hair="#1b1640"
            top="#2a2466"
            light={[74, 1, "#f4e9d6"]}
          />
          <LookFrame
            y={28}
            bands={["#2a2420", "#2a2420", "#3a2e24"]}
            skin="#f7e2cf"
            hair="#1c1512"
            top="#e9d5c2"
            light={[80, 1, "#fff8ec"]}
          />
          {/* edge print, and Golden Hour marked as the chosen look */}
          <g fill={FILM}>
            <rect x={70} y={5} width={1} height={2} />
            <rect x={70} y={17} width={1} height={2} />
            <rect x={70} y={29} width={1} height={2} />
          </g>
          <g fill={SAFELIGHT}>
            <rect x={72} y={3} width={11} height={1} />
            <rect x={72} y={14} width={11} height={1} />
            <rect x={72} y={4} width={1} height={10} />
            <rect x={82} y={4} width={1} height={10} />
          </g>
        </svg>
      </div>
    </div>
  );
}
