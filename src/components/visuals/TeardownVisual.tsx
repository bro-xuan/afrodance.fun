/**
 * Animated pixel-art scene for the "3D of Everything" project card.
 *
 * A pocket watch on a cream blueprint grid takes itself apart: the case, the
 * mainspring barrel, two wheels of the train, the balance and the dial slide
 * out into an exploded row, the wheels turn and the balance swings while a
 * vermilion dotted line follows the power from the crown to the balance, then
 * everything slides back into a closed watch whose seconds hand ticks round.
 * Loop is 8s. Pure SVG + CSS keyframes (see globals.css, "3D of Everything
 * card visual"); the base frame is the exploded row, which is what
 * prefers-reduced-motion gets. Server-rendered, no JS shipped.
 */
import type { CSSProperties } from "react";

type Row = [y: number, x: number, width: number];
type Px = [x: number, y: number];

/** The rows of a pixel disc of radius r centred on pixel (cx, cy). */
function disc(cx: number, cy: number, r: number): Row[] {
  const rows: Row[] = [];
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
    rows.push([cy + dy, cx - half, 2 * half + 1]);
  }
  return rows;
}

/** Single pixels at `count` even angles on a circle of radius r, starting at `offset` degrees. */
function around(cx: number, cy: number, r: number, count: number, offset = 0): Px[] {
  return Array.from({ length: count }, (_, i) => {
    const a = ((offset + (360 * i) / count) * Math.PI) / 180;
    return [cx + Math.round(r * Math.cos(a)), cy + Math.round(r * Math.sin(a))];
  });
}

/** The pixels of a straight spoke from the centre out to radius r, at `angle` degrees. */
function spoke(cx: number, cy: number, r: number, angle: number): Px[] {
  const a = (angle * Math.PI) / 180;
  return Array.from({ length: r + 1 }, (_, t) => [cx + Math.round(t * Math.cos(a)), cy + Math.round(t * Math.sin(a))]);
}

/** Where the watch sits when it's whole; each part is drawn exploded and slides here and back. */
const HOME: Px = [48, 22];

const CASE: Px = [14, 22];
const BARREL: Px = [33, 20];
const WHEEL: Px = [47, 24];
const PINION: Px = [58, 19];
const BALANCE: Px = [69, 24];
const DIAL: Px = [84, 22];

const slide = ([x, y]: Px): CSSProperties =>
  ({ "--tdv-dx": `${HOME[0] - x}px`, "--tdv-dy": `${HOME[1] - y}px` }) as CSSProperties;

const GOLD = "#d9a441";
const GOLD_DARK = "#a8761f";
const GOLD_LIGHT = "#f2cf74";
const BLUE = "#2f5fa8";
const BLUE_LIGHT = "#6f9be0";
const INK = "#2d2d2d";
const VERMILION = "#e0531f";

function Rows({ rows, fill }: { rows: Row[]; fill: string }) {
  return rows.map(([y, x, w]) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={1} fill={fill} />);
}

function Pixels({ px, fill }: { px: Px[]; fill: string }) {
  return px.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
}

/** A gear: rim, spokes and hub, with its teeth in two frames half a tooth apart (swapped by CSS to turn it). */
function Gear({ at, r, teeth, spin }: { at: Px; r: number; teeth: number; spin: "a" | "b" }) {
  const [cx, cy] = at;
  const half = 180 / teeth;
  return (
    <>
      <Rows rows={disc(cx, cy, r)} fill={GOLD_DARK} />
      <Rows rows={disc(cx, cy, r - 1)} fill={GOLD} />
      <Rows rows={disc(cx, cy, r - 2)} fill="#f7f1e3" />
      {[45, 135, 225, 315].map((a) => (
        <Pixels key={a} px={spoke(cx, cy, r - 2, a)} fill={GOLD} />
      ))}
      <rect x={cx - 1} y={cy - 1} width={3} height={3} fill={GOLD_DARK} />
      <rect x={cx} y={cy} width={1} height={1} fill={GOLD_LIGHT} />
      <g className={`tdv-spin-${spin}`}>
        <Pixels px={around(cx, cy, r + 1, teeth)} fill={GOLD_DARK} />
      </g>
      <g className={`tdv-spin-${spin === "a" ? "b" : "a"}`}>
        <Pixels px={around(cx, cy, r + 1, teeth, half)} fill={GOLD_DARK} />
      </g>
    </>
  );
}

export default function TeardownVisual() {
  const [kx, ky] = CASE;
  const [bx, by] = BARREL;
  const [lx, ly] = BALANCE;
  const [dx, dy] = DIAL;

  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f7f1e3]">
        <svg viewBox="0 0 96 40" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
          <defs>
            <pattern id="tdv-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
          </defs>

          {/* blueprint paper */}
          <rect x="0" y="0" width="96" height="40" fill="#f7f1e3" />
          <rect x="0" y="0" width="96" height="40" fill="url(#tdv-grid)" />

          {/* case, with its bow and crown: the back of the watch, drawn first */}
          <g className="tdv-part" style={slide(CASE)}>
            <rect x={kx - 3} y={2} width={7} height={1} fill={GOLD_DARK} />
            <rect x={kx - 4} y={3} width={1} height={4} fill={GOLD_DARK} />
            <rect x={kx + 4} y={3} width={1} height={4} fill={GOLD_DARK} />
            <rect x={kx - 2} y={6} width={5} height={3} fill={GOLD} />
            <rect x={kx - 2} y={6} width={5} height={1} fill={GOLD_LIGHT} />
            <rect x={kx - 1} y={7} width={1} height={2} fill={GOLD_DARK} />
            <rect x={kx + 1} y={7} width={1} height={2} fill={GOLD_DARK} />
            <Rows rows={disc(kx, ky, 12)} fill={GOLD_DARK} />
            <Rows rows={disc(kx, ky, 11)} fill={GOLD} />
            <Rows rows={disc(kx, ky, 8)} fill={GOLD_DARK} />
            <Rows rows={disc(kx, ky, 7)} fill={GOLD} />
            <rect x={kx - 7} y={ky - 8} width={3} height={1} fill={GOLD_LIGHT} />
            <rect x={kx - 9} y={ky - 6} width={1} height={3} fill={GOLD_LIGHT} />
          </g>

          {/* mainspring barrel: a toothed drum with the blue spring coiled inside */}
          <g className="tdv-part" style={slide(BARREL)}>
            <Rows rows={disc(bx, by, 6)} fill={GOLD_DARK} />
            <Rows rows={disc(bx, by, 5)} fill={BLUE} />
            <Rows rows={disc(bx, by, 3)} fill={BLUE_LIGHT} />
            <Rows rows={disc(bx, by, 2)} fill={BLUE} />
            <rect x={bx} y={by} width={1} height={1} fill={GOLD_LIGHT} />
            <g className="tdv-spin-a">
              <Pixels px={around(bx, by, 7, 14)} fill={GOLD_DARK} />
            </g>
            <g className="tdv-spin-b">
              <Pixels px={around(bx, by, 7, 14, 180 / 14)} fill={GOLD_DARK} />
            </g>
          </g>

          {/* the train: a big wheel and a small one, turning opposite ways */}
          <g className="tdv-part" style={slide(WHEEL)}>
            <Gear at={WHEEL} r={6} teeth={16} spin="a" />
          </g>
          <g className="tdv-part" style={slide(PINION)}>
            <Gear at={PINION} r={4} teeth={10} spin="b" />
          </g>

          {/* balance: a gold ring on a blue hairspring, swinging between two frames */}
          <g className="tdv-part" style={slide(BALANCE)}>
            <Rows rows={disc(lx, ly, 5)} fill={GOLD_DARK} />
            <Rows rows={disc(lx, ly, 4)} fill="#f7f1e3" />
            <Pixels px={around(lx, ly, 2, 8)} fill={BLUE_LIGHT} />
            <rect x={lx} y={ly} width={1} height={1} fill={BLUE} />
            <g className="tdv-swing-a">
              <Pixels px={[...spoke(lx, ly, 4, 20), ...spoke(lx, ly, 4, 200)]} fill={GOLD} />
            </g>
            <g className="tdv-swing-b">
              <Pixels px={[...spoke(lx, ly, 4, 160), ...spoke(lx, ly, 4, 340)]} fill={GOLD} />
            </g>
          </g>

          {/* dial on top, so the closed watch shows only its face */}
          <g className="tdv-part" style={slide(DIAL)}>
            <Rows rows={disc(dx, dy, 9)} fill={INK} />
            <Rows rows={disc(dx, dy, 8)} fill="#fbf8ef" />
            <Pixels px={around(dx, dy, 7, 12, -90)} fill="#b9ad92" />
            <Pixels px={around(dx, dy, 7, 4, -90)} fill={INK} />
            {/* hour and minute hands at ten past ten */}
            <Pixels px={spoke(dx, dy, 4, -150)} fill={INK} />
            <Pixels px={spoke(dx, dy, 6, -30)} fill={INK} />
            <g className="tdv-seconds" style={{ transformOrigin: `${dx + 0.5}px ${dy + 0.5}px` }}>
              <Pixels px={spoke(dx, dy, 6, 90)} fill={VERMILION} />
            </g>
            <rect x={dx} y={dy} width={1} height={1} fill={VERMILION} />
          </g>

          {/* the power, crown to balance, while it's apart */}
          <polyline
            className="tdv-power"
            points={`${kx},9 ${bx},${by} ${WHEEL[0]},${WHEEL[1]} ${PINION[0]},${PINION[1]} ${lx},${ly}`}
            fill="none"
            stroke={VERMILION}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </svg>
      </div>
    </div>
  );
}
