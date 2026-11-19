// The city plan. Nine blocks in a diamond with streets between them, a ring
// road round the outside, and the Thames cutting across between the second
// and third rows. The land is a slab standing on the paper; the river lies
// flat on the paper and runs off both sides of the page.
//
//              (0,0) Palace
//       (0,1) Westminster   (1,0) West End
// (0,2) South Bank   (1,1) St Paul's   (2,0) Bloomsbury
//       (1,2) Bankside      (2,1) The Tower
//              (2,2) London Bridge
//
// Block (i, j) has its far corner at world (COL[i], ROW[j]). West is up and to
// the left, so the river flows from the top left of the page to the bottom
// right, with Westminster and the Tower on its north bank.

import { C30, Rng, V2, V3, clamp, paperX, paperY, smooth } from "../engine/math";
import { Mesh } from "../engine/mesh";
import { F_WATER, L_MARK, L_RIPPLE, L_SPARK, Pen, Plane } from "../engine/pen";
import { beyond } from "./beyond";
import { LANE_A, LANE_B, RIVER, TB_A, TB_B, WATER, albertBridge, londonBridge, millenniumBridge, towerBridge, towerBridgeLeaves, westminsterBridge } from "./bridges";
import { bench, bollard, bricks, lamp, person, railing, randomLook, speckle, tree } from "./kit";
import { pigeon } from "./folk";
import { Route, Turning, cyclists, rounded, walker } from "./motion";
import { C } from "./palette";
import { bin, busStop, cycleDock, globeLamp, lightString, phoneBox, pillarBox, zebra } from "./street";
import { Halt, Lane, TRAFFIC_HORIZON, Traffic } from "./traffic";
import { BlockCtx, Mover, Stop } from "./types";
import { Face, LINE_BLACK, LINE_GREY, buried, service, tunnel } from "./underground";
import { BOAT_LEN, BoatKind, buses, cabs, cars, riverFleet, sailingBarge } from "./vehicles";

export { RIVER, WATER };
export const BLOCK = 48;
export const STREET = 10;
/** World x of each column's far edge, and world y of each row's (the third row is across the river). */
export const COL = [0, BLOCK + STREET, 2 * (BLOCK + STREET)];
export const ROW = [0, BLOCK + STREET, 2 * BLOCK + STREET + RIVER];
/** The far side of the last column and row. */
export const GX = COL[2] + BLOCK;
export const GY = ROW[2] + BLOCK;
/** The north and south banks of the river. */
export const RY0 = ROW[1] + BLOCK;
export const RY1 = RY0 + RIVER;
/** The middle of the stream, and the two lanes the river traffic keeps to (westbound on the north side). */
export const MID = (RY0 + RY1) / 2;
export const LANE_N = RY1 - LANE_B;
export const LANE_S = RY1 - LANE_A;
/** Pavement outside the ring road, and the edges of the slab. */
export const VERGE = 2.6;
export const X0 = -STREET - VERGE;
export const X1 = GX + STREET + VERGE;
export const Y0 = -STREET - VERGE;
export const Y1 = GY + STREET + VERGE;
/** Depth of the pavement the city lays inside every block edge that faces a street: blocks keep off it. */
export const WALK = 4;
/** Depth of the riverside walk the city lays along the north edge of the south-bank blocks. */
export const PROM = 5.4;
/** How far from its kerb the middle of a traffic lane is. */
export const LANE = 3;
/** Height of the street above the river. */
const H = -WATER;
/** The band of depth (x + y + z) the drawing lies in. */
export const DEPTH = { mid: 175, half: 310 };

/** What a block's builder is handed: the usual, plus a say in the traffic. */
export interface LondonCtx extends BlockCtx {
  /** Column and row of the block; -1 for an islet. */
  i: number;
  j: number;
  /** Ask the traffic to stop short of a point on a road (world coordinates) while `closed(t)` holds. */
  halt(h: Halt): void;
  /** The timeline second the camera arrives at the close-up, if the tour ends here. Only known inside a mover. */
  closeup(): number | null;
}

export type LondonBuilder = (c: LondonCtx) => void;

export interface BlockDef {
  id: string;
  i: number;
  j: number;
  /** When the block starts to draw. */
  t: number;
  name: string;
  note: string;
  build: LondonBuilder;
}

export interface IsletDef {
  id: string;
  /** World centre. The builder's local frame runs from (0,0) to (40,40) around it, z = 0 on the paper. */
  x: number;
  y: number;
  t: number;
  name: string;
  note: string;
  build: LondonBuilder;
}

export interface City {
  mesh: Mesh;
  movers: Mover[];
  stops: Stop[];
  /** Paper-space bounds of the land and the islets: what the wide view frames. The river runs on past it. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Timeline second by which the whole drawing is finished. */
  done: number;
  /** Timeline second from which nothing in the static drawing is still arriving. */
  settled: number;
  traffic: Traffic;
  /** How far Tower Bridge's leaves are up (radians) at a timeline second. */
  bridgeLift: (t: number) => number;
  /** How many boats share the river, and the least clear water between any two of them, bow to stern. */
  boats: { count: number; gap: number };
}

export function blockOrigin(i: number, j: number): V2 {
  return [COL[i], ROW[j]];
}

// ---------------------------------------------------------------- the river

interface Reach {
  x: number;
  y: number;
  /** Half the river's width here. */
  hw: number;
  /** Unit vector across the stream. */
  nx: number;
  ny: number;
  /** Distance from the edge of the slab. */
  u: number;
}

const TAIL = 330;
const TAIL_STEP = 3;

/** The river beyond the slab: upstream (west) it narrows and swings left across the page, downstream it widens and swings right. */
function reach(east: boolean): Reach[] {
  const out: Reach[] = [];
  let x = east ? X1 : X0;
  let y = MID;
  for (let u = 0; u <= TAIL; u += TAIL_STEP) {
    const th = east
      ? -(Math.PI * 0.42) * smooth(18, 92, u) + 0.14 * Math.sin(u / 40 + 1) * smooth(70, 150, u)
      : Math.PI - (Math.PI / 4) * smooth(20, 95, u) + 0.2 * Math.sin(u / 36) * smooth(45, 120, u);
    const wide = RIVER / 2 + (east ? 4 : -4.5) * smooth(15, 170, u);
    const hw = wide * (1 + 0.03 * Math.sin(u / 7.3 + (east ? 0 : 2)) * smooth(8, 30, u));
    out.push({ x, y, hw, nx: -Math.sin(th), ny: Math.cos(th), u });
    x += Math.cos(th) * TAIL_STEP;
    y += Math.sin(th) * TAIL_STEP;
  }
  return out;
}

const WEST = reach(false);
const EAST = reach(true);

/** True over the river: between the banks, or in the reaches beyond the slab. */
export function inWater(x: number, y: number, pad = 0.4): boolean {
  if (x >= X0 && x <= X1) return y > RY0 + pad && y < RY1 - pad;
  const pts = x < X0 ? WEST : EAST;
  let best = Infinity;
  let at = pts[0];
  for (const p of pts) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < best) {
      best = d;
      at = p;
    }
  }
  return Math.sqrt(best) < at.hw - pad;
}

/** When the river reaches a point: it flows in from the top left of the page. */
function flowT(x: number, y: number): number {
  if (x < X0) return 0.7 - 0.55 * clamp(Math.hypot(x - X0, y - MID) / 110, 0, 1);
  if (x > X1) return 1.7 + 0.5 * clamp(Math.hypot(x - X1, y - MID) / 110, 0, 1);
  return 0.7 + ((x - X0) / (X1 - X0)) * 1.0;
}

const RIPPLE = { len: 1.5, ang: -Math.PI / 4, jit: 0.08, bend: 0.22, color: C.waterInk, w: 0.075, kind: L_RIPPLE, alpha: 0.75 };

/** Lay the river. Returns the range of fills that make up the reaches beyond the slab. */
function water(pen: Pen): [number, number] {
  pen.reveal = (x, y) => flowT(x, y);
  const g = pen.floor(WATER, 0);
  const opt = { kind: F_WATER };
  for (let x = X0; x < X1 - 0.01; x += 11.825) g.rect(x, RY0 - 0.3, Math.min(X1, x + 11.825), RY1 + 0.3, C.water, opt);
  const first = pen.m.fn;
  for (const pts of [WEST, EAST]) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      g.poly(
        [
          [a.x + a.nx * a.hw, a.y + a.ny * a.hw],
          [b.x + b.nx * b.hw, b.y + b.ny * b.hw],
          [b.x - b.nx * b.hw, b.y - b.ny * b.hw],
          [a.x - a.nx * a.hw, a.y - a.ny * a.hw],
        ],
        C.water,
        opt,
      );
    }
    // a wash line where the water meets the paper
    for (const s of [-1, 1]) {
      for (let k = 0; k + 1 < pts.length; k += 10) {
        const line: V3[] = [];
        for (let q = k; q <= Math.min(pts.length - 1, k + 10); q++) line.push([pts[q].x + s * pts[q].nx * pts[q].hw, pts[q].y + s * pts[q].ny * pts[q].hw, WATER]);
        pen.stroke(line, { w: 0.16, color: C.waterDeep, kind: L_MARK, wobble: 1.5, alpha: 0.75 });
      }
    }
  }
  const last = pen.m.fn;
  // ripples
  const gt = pen.floor(WATER, 1);
  for (let x = X0; x < X1; x += 21) gt.ticks(x, RY0 + 0.6, Math.min(X1, x + 21), RY1 - 0.6, { ...RIPPLE, n: 48 });
  for (const pts of [WEST, EAST]) {
    for (let k = 0; k + 7 < pts.length; k += 7) {
      let ax = Infinity;
      let ay = Infinity;
      let bx = -Infinity;
      let by = -Infinity;
      for (let q = k; q <= k + 7; q++) {
        const p = pts[q];
        for (const s of [-1, 1]) {
          ax = Math.min(ax, p.x + s * p.nx * p.hw);
          bx = Math.max(bx, p.x + s * p.nx * p.hw);
          ay = Math.min(ay, p.y + s * p.ny * p.hw);
          by = Math.max(by, p.y + s * p.ny * p.hw);
        }
      }
      const u0 = pts[k].u;
      const u1 = pts[k + 7].u;
      gt.ticks(ax, ay, bx, by, { ...RIPPLE, n: Math.round((bx - ax) * (by - ay) * 0.075), inside: (a, b) => inWater(a, b, 1) && onReach(pts, a, b, u0, u1) });
    }
  }
  return [first, last];
}

/** Is a point of the reach nearest a stretch between two distances from the slab? (Keeps ripple patches from overlapping.) */
function onReach(pts: Reach[], x: number, y: number, u0: number, u1: number): boolean {
  let best = Infinity;
  let at = pts[0];
  for (const p of pts) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < best) {
      best = d;
      at = p;
    }
  }
  return at.u >= u0 && at.u < u1;
}

// ---------------------------------------------------------------- the ground

const CENTRE: V2 = [COL[1] + BLOCK / 2, ROW[1] + BLOCK / 2];
/** When a piece of road arrives: the streets spread outwards from the middle of the city. */
const roadT = (x: number, y: number) => 0.55 + (Math.hypot(x - CENTRE[0], y - CENTRE[1]) / 150) * 1.15;

/** The stretches of street between junctions: [x0, y0, x1, y1, runs along x?]. */
function streets(): [number, number, number, number, boolean][] {
  const out: [number, number, number, number, boolean][] = [];
  const spansY: [number, number][] = [
    [0, 48],
    [58, RY0],
    [RY1, GY],
  ];
  for (const x of [-STREET, 48, 106, GX]) for (const [a, b] of spansY) out.push([x, a, x + STREET, b, false]);
  for (const y of [-STREET, 48, GY]) for (const i of [0, 1, 2]) out.push([COL[i], y, COL[i] + BLOCK, y + STREET, true]);
  return out;
}

/** Lettering painted on the road, to be read from the bottom of the page. */
function roadText(pen: Pen, str: string, x: number, y: number, size: number, alongX: boolean): void {
  const p = alongX ? pen.plane([x, y, 0], [1, 0, 0], [0, -1, 0], 2, true) : pen.plane([x, y, 0], [0, -1, 0], [-1, 0, 0], 2, true);
  p.text(str, 0, 0, size, { align: "c", color: C.roadLine, kind: L_MARK, w: 0.085, wobble: 0.3 });
}

/** Lay the streets, the ring road and the pavement outside it, and the cut edges of the slab. */
function ground(pen: Pen): void {
  pen.reveal = (x, y) => roadT(x, y);
  const xs = [X0, -STREET, 0, 48, 58, 106, 116, GX, GX + STREET, X1];
  const xk = "vrbrbrbrv";
  const bands: [number[], string][] = [
    [[Y0, -STREET, 0, 48, 58, RY0], "vrbrb"],
    [[RY1, GY, GY + STREET, Y1], "brv"],
  ];
  const g = pen.floor(0, 0);
  for (const [ys, yk] of bands) {
    for (let i = 0; i < xk.length; i++) {
      for (let j = 0; j < yk.length; j++) {
        if (xk[i] === "b" && yk[j] === "b") continue;
        const verge = xk[i] === "v" || yk[j] === "v";
        g.rect(xs[i], ys[j], xs[i + 1], ys[j + 1], verge ? C.flag : C.tarmac, { grain: verge ? 0.6 : 0.9 });
      }
    }
  }
  const mark = pen.floor(0, 2);
  // the kerb of the outer pavement, and the far edges of the slab
  pen.obj(() => {
    const kerb = { w: 0.07 };
    mark.seg(-STREET, -STREET, GX + STREET, -STREET, kerb);
    mark.seg(-STREET, GY + STREET, GX + STREET, GY + STREET, kerb);
    for (const x of [-STREET, GX + STREET]) {
      mark.seg(x, -STREET, x, RY0, kerb);
      mark.seg(x, RY1, x, GY + STREET, kerb);
    }
    mark.seg(X0, Y0, X1, Y0, { w: 0.1 });
    mark.seg(X0, Y0, X0, RY0, { w: 0.1 });
    mark.seg(X0, RY1, X0, Y1, { w: 0.1 });
    mark.seg(X0, RY1, X1, RY1, { w: 0.1 });
  });
  // road markings: a dashed line down the middle, double yellow lines along every kerb
  for (const [x0, y0, x1, y1, alongX] of streets()) {
    pen.obj(() => {
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const len = alongX ? x1 - x0 : y1 - y0;
      for (let a = 1.2; a < len - 1.5; a += 2.9) {
        if (alongX) mark.seg(x0 + a, my, x0 + a + 1.45, my, { w: 0.11, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
        else mark.seg(mx, y0 + a, mx, y0 + a + 1.45, { w: 0.11, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
      }
      for (const off of [0.3, 0.5, STREET - 0.5, STREET - 0.3]) {
        const o = { w: 0.05, color: C.yellowLine, kind: L_MARK, wobble: 0.15, alpha: 0.95 };
        if (alongX) mark.seg(x0 + 1.0, y0 + off, x1 - 1.0, y0 + off, o);
        else mark.seg(x0 + off, y0 + 1.0, x0 + off, y1 - 1.0, o);
      }
      // a stop line at each end
      // a stop line across each lane at the end it drives towards (traffic keeps left)
      const stop = { w: 0.2, color: C.roadLine, kind: L_MARK, wobble: 0.1 };
      if (alongX) {
        mark.seg(x1 - 0.3, y0 + 0.4, x1 - 0.3, my - 0.3, stop);
        mark.seg(x0 + 0.3, my + 0.3, x0 + 0.3, y1 - 0.4, stop);
      } else {
        mark.seg(x0 + 0.4, y0 + 0.3, mx - 0.3, y0 + 0.3, stop);
        mark.seg(mx + 0.3, y1 - 0.3, x1 - 0.4, y1 - 0.3, stop);
      }
    }, 0.2);
  }
  // yellow boxes on the two busiest junctions, and a word of advice for visitors
  for (const x of [48, 106]) {
    pen.obj(() => {
      const o = { w: 0.06, color: C.yellowLine, kind: L_MARK, wobble: 0.2, alpha: 0.95 };
      mark.loop(
        [
          [x + 0.5, 48.5],
          [x + 9.5, 48.5],
          [x + 9.5, 57.5],
          [x + 0.5, 57.5],
        ],
        o,
      );
      for (let k = 1; k < 9; k++) {
        const a = k * 2.25 - 1.1;
        const p0: V2 = a <= 9 ? [x + 0.5 + a, 48.5] : [x + 9.5, 48.5 + a - 9];
        const p1: V2 = a <= 9 ? [x + 0.5, 48.5 + a] : [x + 0.5 + a - 9, 57.5];
        mark.seg(p0[0], p0[1], p1[0], p1[1], o);
        mark.seg(2 * x + 10 - p0[0], p0[1], 2 * x + 10 - p1[0], p1[1], o);
      }
    }, 0.3);
  }
  pen.obj(() => {
    roadText(pen, "LOOK RIGHT", 140, 49.2, 0.42, true);
    roadText(pen, "LOOK LEFT", 82, 56.6, 0.42, true);
    roadText(pen, "LOOK RIGHT", 140, 189.2, 0.42, true);
    roadText(pen, "BUS LANE", 56.4, 82, 0.5, false);
    roadText(pen, "SLOW", 114.2, 20, 0.6, false);
  }, 0.4);

  // the embankment under the ends of the streets, where the bridges land
  for (const [xa, xb] of [
    [X0, 0],
    [48, 58],
    [106, 116],
    [GX, X1],
  ]) {
    pen.obj(() => {
      const f = pen.wall("y+", xa, RY0 - 1, WATER, xb - xa, 1, 0);
      f.rect(0, 0, xb - xa, H, C.granite);
      embankment(pen.wall("y+", xa, RY0 - 1, WATER, xb - xa, 1), xb - xa, false);
      f.loop(
        [
          [0, 0],
          [xb - xa, 0],
          [xb - xa, H],
          [0, H],
        ],
        { w: 0.1 },
      );
    }, 0.1);
  }
  // the cut faces of the slab: along the front of the south bank, and down the east side
  const face = (f: Plane, len: number, at: (a: number) => V2) => {
    const n = Math.max(2, Math.round(len / 16));
    for (let k = 0; k < n; k++) {
      const a0 = (k * len) / n;
      const a1 = ((k + 1) * len) / n;
      const [wx, wy] = at((a0 + a1) / 2);
      pen.reveal = () => roadT(wx, wy) + 0.1;
      pen.begin();
      f.rect(a0, 0, a1, H, C.clay, { grain: 0.9 });
      f.rect(a0, H - 0.36, a1, H, C.graniteCap, { grain: 0.5, layer: 1 });
      f.seg(a0, H - 0.36, a1, H - 0.36, { w: 0.06, layer: 1 });
      f.seg(a0, H, a1, H, { w: 0.1 });
      f.seg(a0, 0, a1, 0, { w: 0.1 });
      // strata: two wavering seams of darker clay, and a scatter of pebbles
      for (const b of [1.25, 2.7]) {
        const pts: V2[] = [];
        for (let a = a0; a <= a1 + 0.01; a += (a1 - a0) / 6) pts.push([a, b + 0.16 * Math.sin(a * 0.31 + b * 3)]);
        f.line(pts, { w: 0.07, color: C.clayDark, kind: L_MARK, wobble: 1.2, alpha: 0.8, layer: 1 });
      }
      f.ticks(a0, 0.2, a1, H - 0.6, { n: Math.round((a1 - a0) * 2.2), len: 0.3, ang: 0, jit: 0.4, color: C.clayDark, w: 0.07, alpha: 0.7, layer: 1 });
      f.ticks(a0, 0.2, a1, H - 0.6, { n: Math.round((a1 - a0) * 0.9), len: 0.22, ang: 0, jit: 1.5, color: C.clayLight, w: 0.12, layer: 1 });
      pen.end();
    }
    pen.reveal = (x, y) => roadT(x, y);
    pen.obj(() => {
      f.seg(0, 0, 0, H, { w: 0.1 });
      f.seg(len, 0, len, H, { w: 0.1 });
    }, 0.3);
  };
  face(pen.wall("y+", X0, RY1, WATER, X1 - X0, Y1 - RY1, 0), X1 - X0, (a) => [X0 + a, Y1]);
  face(pen.wall("x+", X0, RY1, WATER, X1 - X0, Y1 - RY1, 0), Y1 - RY1, (a) => [X1, Y1 - a]);
  face(pen.wall("x+", X0, Y0, WATER, X1 - X0, RY0 - Y0, 0), RY0 - Y0, (a) => [X1, RY0 - a]);
}

/**
 * The outer pavement and the streets, dressed: lamps along the two front
 * edges, a few zebra crossings, and people who have sat down on the very edge
 * of the city with their legs over the side.
 */
function edges(pen: Pen): void {
  const rng = new Rng(1215);
  pen.rng = rng.fork();
  pen.reveal = (x, y) => roadT(x, y) + 0.5;
  for (let x = 2; x < GX; x += 15.5) lamp(pen, x + rng.range(-1, 1), GY + STREET + 1.25);
  for (let y = RY1 + 8; y < GY; y += 15.5) lamp(pen, GX + STREET + 1.25, y + rng.range(-1, 1));
  for (let y = 6; y < RY0 - 6; y += 15.5) lamp(pen, GX + STREET + 1.25, y + rng.range(-1, 1));
  // zebra crossings: over the two streets north of the river, and the road along the front
  for (const [x, y, rot] of [
    [48, 23, 270],
    [106, 84, 270],
    [79, GY, 0],
  ]) {
    pen.push(x, y, 0, rot);
    zebra(pen, STREET, 3);
    pen.pop();
  }
  // sitting on the edge of the world
  for (const x of [18.5, 19.4, 71, 96.3, 97.2, 98.1, 133, 150.5]) {
    person(pen, x + rng.range(-0.1, 0.1), Y1 - 0.12, -0.36, randomLook(rng), "sit", rng.chance(0.3), rng.chance(0.2) ? 0.72 : 1);
  }
  for (const y of [152, 153, 171.5, 26, 27, 61]) {
    person(pen, X1 - 0.12, y + rng.range(-0.1, 0.1), -0.36, randomLook(rng), "sit", true, rng.chance(0.2) ? 0.72 : 1);
  }
  for (const [x, y] of [
    [40, GY + STREET + 1.6],
    [41.2, GY + STREET + 1.2],
    [118, GY + STREET + 1.7],
    [GX + STREET + 1.5, 92],
    [GX + STREET + 1.2, 93.2],
  ]) {
    pigeon(pen, x, y, 0, rng.chance(0.5), rng.chance(0.4));
  }
}

/** Dress an embankment wall: a stone cap, courses of granite, the dark band the tide leaves, and (on request) lions' heads holding mooring rings. */
function embankment(f: Plane, len: number, lions: boolean): void {
  f.rect(0, H - 0.45, len, H, C.graniteCap, { grain: 0.5 });
  f.seg(0, H - 0.45, len, H - 0.45, { w: 0.07 });
  f.rect(0, 0, len, 1.15, C.graniteDark, { grain: 0.8 });
  f.seg(0, 1.15, len, 1.15, { w: 0.09, color: C.hedge, kind: L_MARK, wobble: 0.8, alpha: 0.75 });
  bricks(f, 0.3, 1.4, len - 0.3, H - 0.6, C.graniteDark, 0.5);
  f.seg(0, 0.03, len, 0.03, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
  if (!lions) return;
  for (let a = 3; a < len - 1; a += 6) {
    f.circle(a, 3.05, 0.34, C.bronze, { outline: true, w: 0.045, layer: 1, seg: 9, grain: 0.4 });
    f.circle(a, 2.62, 0.2, null, { ink: C.iron, w: 0.07, layer: 2, seg: 8 });
  }
}

/** The slab a block stands on. Blocks on the north bank show their embankment wall to the river. */
function pad(pen: Pen, c: LondonCtx): void {
  pen.reveal = () => c.t;
  pen.begin();
  pen.box(0, 0, WATER, BLOCK, BLOCK, H, C.granite, { top: C.paving });
  if (c.j === 1) embankment(pen.wall("y+", 0, 0, WATER, BLOCK, BLOCK), BLOCK, true);
  pen.end();
}

type Side = "xm" | "xp" | "ym" | "yp";
/** A frame for each edge of a block in which the kerb runs along local +x through the origin and the block is on +y. */
const FRAMES: Record<Side, [number, number, number]> = {
  ym: [0, 0, 0],
  xp: [BLOCK, 0, 90],
  yp: [BLOCK, BLOCK, 180],
  xm: [0, BLOCK, 270],
};

/** Where the bus stops are: for each block, the edges that have one and how far along the kerb it stands. */
const BUS_STOPS: Record<string, [Side, number][]> = {
  "0,0": [["yp", 6]],
  "1,0": [["yp", 9]],
  "2,0": [["yp", 26]],
  "0,1": [["xm", 30]],
  "1,1": [["xm", 8]],
  "2,1": [["xm", 30]],
  "0,2": [["xp", 9]],
  "1,2": [["xp", 30]],
  "2,2": [["yp", 28]],
};

/** Stretches of pavement (distance along the kerb, in the edge's own frame) that are left clear of furniture. */
const WALK_CLEAR: Record<string, [Side, number, number][]> = {
  // the zebra crossing between the palace and Westminster: both kerbs
  "0,0": [["yp", 19, 26]],
  "0,1": [["ym", 22.5, 34]],
};

/**
 * The pavement along one street edge of a block: paving flags behind a stone
 * kerb, plane trees, lamps, and whatever else the edge has room for (a phone
 * box, a pillar box, a rack of hire bikes, a bus stop).
 */
function dressWalk(c: LondonCtx, side: Side, stops: number[], clear: [number, number][]): void {
  const { pen, rng } = c;
  const [fx, fy, rot] = FRAMES[side];
  // edges nearest the camera get fewer trees, so the block behind can be seen
  const front = side === "xp" || side === "yp";
  pen.push(fx, fy, 0, rot);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(0.02, 0.02, BLOCK - 0.02, WALK, C.flag, { grain: 0.6 });
    g.rect(0.02, 0.02, BLOCK - 0.02, 0.3, C.graniteCap, { grain: 0.4, layer: 1 });
    const g2 = pen.floor(0, 2);
    g2.seg(0.3, 0.3, BLOCK - 0.3, 0.3, { w: 0.05 });
    g2.seg(WALK, WALK, BLOCK - WALK, WALK, { w: 0.06, color: C.flagDark, kind: L_MARK });
    for (const y of [1.55, 2.8]) g2.seg(0.4, y, BLOCK - 0.4, y, { w: 0.04, color: C.flagDark, kind: L_MARK, alpha: 0.7, wobble: 0.5 });
    g2.ticks(0.5, 0.4, BLOCK - 0.5, WALK - 0.1, { n: 60, len: 1.1, ang: Math.PI / 2, jit: 0.02, color: C.flagDark, w: 0.04, alpha: 0.7 });
    // the yellow cage on the road where the bus pulls in
    for (const a of stops) {
      const o = { w: 0.07, color: C.yellowLine, kind: L_MARK, wobble: 0.2 };
      for (let k = 0; k < 6; k++) g2.seg(a - 2.6 + k * 1.75, -1.75, a - 2.6 + k * 1.75 + 1.1, -1.75, o);
      g2.seg(a - 2.6, -1.75, a - 2.6, -0.1, o);
      g2.seg(a + 7.25, -1.75, a + 7.25, -0.1, o);
    }
  });
  const taken: [number, number][] = [[0, 3.4], [BLOCK - 3.4, BLOCK], ...clear];
  const free = (a0: number, a1: number) => !taken.some(([p, q]) => a1 > p && a0 < q);
  const take = (a0: number, a1: number) => taken.push([a0, a1]);
  for (const a of stops) {
    pen.push(a, 0, 0);
    busStop(pen, rng, rng.int(2, 5));
    pen.pop();
    take(a - 1, a + 5.4);
  }
  // one or two things per edge, wherever they fit
  const things = ["phone", "pillar", "dock", "bench", "bin", "bollards", "phone", "bin"];
  const n = rng.int(1, 4);
  for (let k = 0; k < n; k++) {
    const kind = rng.pick(things);
    const w = kind === "dock" ? 4.4 : kind === "bollards" ? 3.2 : kind === "bench" ? 2.2 : 1.4;
    const a = rng.range(4.5, BLOCK - 4.5 - w);
    if (!free(a - 0.4, a + w + 0.4)) continue;
    take(a, a + w);
    if (kind === "phone") {
      phoneBox(pen, a + 0.7, 1.05, 0);
      if (rng.chance(0.4) && free(a + w, a + w + 1.5)) {
        phoneBox(pen, a + 2.0, 1.05, 0);
        take(a + w, a + w + 1.4);
      }
    } else if (kind === "pillar") pillarBox(pen, a + 0.7, 0.95);
    else if (kind === "dock") cycleDock(pen, rng, a + 1.1, 0.55, 5, 0);
    else if (kind === "bench") {
      bench(pen, a + 1.1, 0.95, 0);
      if (rng.chance(0.6)) person(pen, a + 1.1 + rng.range(-0.5, 0.5), 1.0, 0.42, randomLook(rng), "sit", rng.chance(0.5));
    } else if (kind === "bin") bin(pen, a + 0.7, 0.85);
    else for (let q = 0; q < 4; q++) bollard(pen, a + 0.3 + q * 0.9, 0.55);
  }
  for (let a = 6 + rng.range(-1, 1); a < BLOCK - 4; a += 12) {
    if (!free(a - 0.5, a + 0.5)) continue;
    lamp(pen, a, 0.8);
    take(a - 0.7, a + 0.7);
  }
  for (let a = 4.6 + rng.range(0, 2); a < BLOCK - 4.2; a += front ? rng.range(11, 14) : rng.range(7.5, 9.5)) {
    if (!free(a - 1.1, a + 1.1)) continue;
    pen.floor(0, 2).rect(a - 0.5, 0.75, a + 0.5, 1.75, C.flagDark, { outline: true, w: 0.04, grain: 0.5 });
    tree(pen, rng, a, 1.25, { kind: "elm" });
    take(a - 0.9, a + 0.9);
  }
  // somebody waiting, somebody on the phone
  for (let k = 0; k < 2; k++) {
    const a = rng.range(5, BLOCK - 5);
    if (!free(a - 0.5, a + 0.5)) continue;
    person(pen, a, rng.range(0.8, 1.3), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
  }
  pen.pop();
}

/** Stretches of the riverside walk a block wants left clear (local x), by block id. */
const PROM_CLEAR: Record<string, [number, number][]> = {
  bankside: [[24.5, 33.5]],
};

/** The riverside walk along the south bank: railings, globe lamps with lights strung between them, benches facing the water. */
function dressProm(c: LondonCtx, clear: [number, number][]): void {
  const { pen, rng } = c;
  const off = (a: number, pad = 0.8) => clear.some(([p, q]) => a > p - pad && a < q + pad);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(0.02, 0.02, BLOCK - 0.02, PROM, C.plaza, { grain: 0.7 });
    g.rect(0.02, 0.02, BLOCK - 0.02, 0.34, C.graniteCap, { grain: 0.4, layer: 1 });
    const g2 = pen.floor(0, 2);
    g2.seg(0.3, 0.34, BLOCK - 0.3, 0.34, { w: 0.05 });
    g2.seg(0.4, PROM, BLOCK - 0.4, PROM, { w: 0.06, color: C.streetDark, kind: L_MARK });
    speckle(g2, 0.5, 0.5, BLOCK - 0.5, PROM - 0.2, C.streetDark, 0.35);
  });
  // railings, in runs between the stretches left clear
  const cuts = [0.4, ...clear.flat(), BLOCK - 0.4];
  for (let k = 0; k + 1 < cuts.length; k += 2) {
    railing(
      pen,
      [
        [cuts[k], 0.2, 0],
        [cuts[k + 1], 0.2, 0],
      ],
      0.9,
      C.iron,
      1.2,
    );
  }
  const posts: number[] = [];
  for (let a = 3; a < BLOCK - 2; a += 7) {
    if (off(a)) continue;
    globeLamp(pen, a, 0.62, 0, 3.2);
    posts.push(a);
  }
  for (let k = 0; k + 1 < posts.length; k++) {
    if (posts[k + 1] - posts[k] > 7.5) continue;
    lightString(pen, [posts[k], 0.62, 3.2], [posts[k + 1], 0.62, 3.2], 7, 0.55);
  }
  for (let a = 6.5; a < BLOCK - 4; a += 7) {
    if (off(a, 1.6) || rng.chance(0.25)) continue;
    bench(pen, a, 1.75, 180);
    if (rng.chance(0.7)) person(pen, a + rng.range(-0.5, 0.5), 1.72, 0.42, randomLook(rng), "sit", rng.chance(0.5));
  }
  for (let a = 4.5 + rng.range(0, 2); a < BLOCK - 3; a += rng.range(9, 12)) {
    if (off(a, 1.4)) continue;
    tree(pen, rng, a, 4.5, { kind: "elm" });
  }
  // people leaning on the rail, watching the river
  for (let k = 0; k < 5; k++) {
    const a = rng.range(2, BLOCK - 2);
    if (off(a) || posts.some((p) => Math.abs(p - a) < 0.6)) continue;
    person(pen, a, 0.75, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
}

// ---------------------------------------------------------------- bridges

const BRIDGE_W = STREET;
/** The Millennium Bridge: its west edge (world x) and its width. Blocks at either end leave its landing clear. */
export const FOOTBRIDGE_X = COL[1] + 27;
export const FOOTBRIDGE_W = 4;
/** World x of the road Tower Bridge carries. */
const TOWER_X = GX;

function inBridgeFrame(pen: Pen, x: number, draw: () => void): void {
  pen.push(x, RY1, 0, 270);
  draw();
  pen.pop();
}

function bridges(pen: Pen, tAt: (i: number, j: number) => number): number {
  const rng = new Rng(77);
  pen.rng = rng.fork();
  const when = (i: number) => Math.max(tAt(Math.max(0, i - 1), 1), tAt(Math.min(2, i), 1), tAt(Math.max(0, i - 1), 2), tAt(Math.min(2, i), 2)) + 0.9;
  const shade = (x: number, w: number) => pen.floor(WATER, 2).rect(x - 0.6, RY0, x + w - 0.2, RY1, C.waterDeep, { grain: 0.6, kind: F_WATER });
  let done = 0;
  const each: [number, number, () => void][] = [
    [-STREET, when(0), () => albertBridge(pen, BRIDGE_W)],
    [48, when(1), () => westminsterBridge(pen, BRIDGE_W)],
    [FOOTBRIDGE_X, Math.max(tAt(1, 1), tAt(1, 2)) + 1.1, () => millenniumBridge(pen, FOOTBRIDGE_W)],
    [106, when(2), () => londonBridge(pen, BRIDGE_W)],
    [TOWER_X, when(3), () => towerBridge(pen, rng, BRIDGE_W)],
  ];
  for (const [x, t, draw] of each) {
    pen.reveal = (_x, _y, z) => t + clamp((z - WATER) / 14, 0, 1) * 0.8;
    shade(x, x === FOOTBRIDGE_X ? FOOTBRIDGE_W : BRIDGE_W);
    inBridgeFrame(pen, x, draw);
    done = Math.max(done, t + 2.0);
  }
  return done;
}

/** The stretch of road (world y) that lifts when Tower Bridge opens, and the road it is on (world x). */
export const TOWER_BRIDGE = { x0: GX, x1: GX + STREET, y0: RY1 - TB_B, y1: RY1 - TB_A };

/** How long Tower Bridge's cycle is, and the moments in it, in seconds after the lights go red. */
const TB_PERIOD = 40;
const TB_RISE = 6.5;
const TB_UP = 9.5;
const TB_FALL = 14.7;
const TB_DOWN = 17.7;
const TB_GREEN = 18.2;
const TB_SAIL = 2.2;
const TB_PASSAGE = 16.3;
/** Where the barge waits either side of the bridge (world x). */
const BARGE_EAST = X1 + 21;
const BARGE_WEST = GX - 16;

/** Tower Bridge at work: the lights, the barriers, the leaves, and the sailing barge it all happens for. Returns how far the leaves are up at a given second. */
function towerBridgeLife(movers: Mover[], traffic: Traffic, born: number, shown: number, visit: () => number | null): (t: number) => number {
  // On the tour the first lift is timed so the barge is under the bridge as the camera arrives.
  const start = (): number => {
    const at = visit();
    return at == null ? born + 9 : at - 10.2;
  };
  const cycle = (t: number): [number, number] => {
    const tt = t - start();
    const n = Math.floor(tt / TB_PERIOD);
    return [n, tt - n * TB_PERIOD];
  };
  const shut = (t: number) => t > born && cycle(t)[1] < TB_GREEN - 0.5;
  const liftAt = (t: number): number => {
    const p = t > born ? cycle(t)[1] : TB_PERIOD - 1;
    return 1.25 * (smooth(TB_RISE, TB_UP, p) - smooth(TB_FALL, TB_DOWN, p));
  };
  traffic.halts.push({ x: TOWER_X + LANE, y: RY1 + 5.2, r: 0.4, closed: shut });
  traffic.halts.push({ x: TOWER_X + STREET - LANE, y: RY0 - 5.2, r: 0.4, closed: shut });
  movers.push((m) => {
    if (m.t < shown || !m.sees(TOWER_X + 5, MID, 4, 26)) return;
    const p = m.t > born ? cycle(m.t)[1] : TB_PERIOD - 1;
    const lift = liftAt(m.t);
    const bar = smooth(0.3, 1.6, p) - smooth(TB_DOWN, TB_GREEN, p);
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => shown;
    dp.rng = new Rng(1894);
    inBridgeFrame(dp, TOWER_X, () => towerBridgeLeaves(dp, BRIDGE_W, lift, bar));
    dp.reveal = keep;
    dp.rng = keepRng;
  });
  const barge = new Turning(
    (p) => {
      p.push(0, 0, 0, 0, 0.8);
      sailingBarge(p, new Rng(7));
      p.pop();
    },
    32,
    77,
  );
  movers.push((m) => {
    if (m.t < born) return;
    const [n, p] = cycle(m.t);
    const west = ((n % 2) + 2) % 2 === 0;
    const k = 0.5 - 0.5 * Math.cos(Math.PI * clamp((p - TB_SAIL) / TB_PASSAGE, 0, 1));
    const x = west ? BARGE_EAST - (BARGE_EAST - BARGE_WEST) * k : BARGE_WEST + (BARGE_EAST - BARGE_WEST) * k;
    const turn = Math.PI * smooth(TB_SAIL + TB_PASSAGE + 0.6, TB_SAIL + TB_PASSAGE + 3.4, p);
    m.put(barge.at((west ? Math.PI : 0) + turn), x, MID, WATER, born);
  });
  return liftAt;
}

// ---------------------------------------------------------------- the Underground

/**
 * Two Tube lines show in the cut faces of the slab: one along the front of the
 * south bank, one down the east side that goes under the river on its way.
 */
function underground(pen: Pen, movers: Mover[], born: number): void {
  const rng = new Rng(1863);
  pen.rng = rng.fork();
  const south: Face = {
    o: [X0, Y1, WATER],
    dir: [1, 0],
    side: "y+",
    len: X1 - X0,
    a0: 7,
    a1: X1 - X0 - 7,
    stations: [
      { name: "WATERLOO", at: 24 - X0, line: LINE_GREY },
      { name: "SOUTHWARK", at: COL[1] + 24 - X0, line: LINE_GREY },
      { name: "BOROUGH", at: COL[2] + 20 - X0, line: LINE_GREY },
    ],
    t: (a) => roadT(X0 + a, Y1),
  };
  const eastNorth: Face = {
    o: [X1, RY0, WATER],
    dir: [0, -1],
    side: "x+",
    len: RY0 - Y0,
    a0: 4.5,
    a1: RY0 - Y0 - 6.5,
    stations: [
      { name: "TOWER HILL", at: RY0 - (ROW[1] + 26), line: LINE_BLACK },
      { name: "ALDGATE", at: RY0 - 24, line: LINE_BLACK },
    ],
    t: (a) => roadT(X1, RY0 - a),
  };
  const eastSouth: Face = {
    o: [X1, Y1, WATER],
    dir: [0, -1],
    side: "x+",
    len: Y1 - RY1,
    a0: 6.5,
    a1: Y1 - RY1 - 4.5,
    stations: [{ name: "LONDON BRIDGE", at: Y1 - (ROW[2] + 25), line: LINE_BLACK }],
    t: (a) => roadT(X1, Y1 - a),
  };
  for (const f of [south, eastNorth, eastSouth]) tunnel(pen, rng, f);
  buried(pen, south, 66, "ammonite");
  buried(pen, south, 122, "chest");
  buried(pen, south, 174, "bones");
  buried(pen, eastNorth, 52, "amphora");
  buried(pen, eastNorth, 103, "boot");
  // trains run west to east under the south bank, and north to south down the east side
  service(movers, [{ face: south, from: 0, dir: 1 }], born, 26, 3);
  const under = RIVER + eastNorth.a0 + (eastSouth.len - eastSouth.a1);
  service(
    movers,
    [
      { face: eastNorth, from: 0, dir: -1 },
      { face: eastSouth, from: eastNorth.a1 - eastNorth.a0 + under, dir: -1 },
    ],
    born,
    30,
    11,
  );
}

// ---------------------------------------------------------------- traffic

/** A lane that hugs a rectangle of the street grid: anticlockwise for a cell (keeping it on the left), clockwise for the ring. */
function circuit(x0: number, y0: number, x1: number, y1: number, off: number, outer = false): V3[] {
  if (outer) {
    return rounded(
      [
        [x0 - off, y0 - off, 0],
        [x1 + off, y0 - off, 0],
        [x1 + off, y1 + off, 0],
        [x0 - off, y1 + off, 0],
      ],
      true,
      6.5,
    );
  }
  return rounded(
    [
      [x0 - off, y0 - off, 0],
      [x0 - off, y1 + off, 0],
      [x1 + off, y1 + off, 0],
      [x1 + off, y0 - off, 0],
    ],
    true,
    Math.min(2.9, off + 0.2),
  );
}

/** The cells of the street grid that have a lane round them: [x0, y0, x1, y1]. */
function cells(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const i of [0, 1, 2]) out.push([COL[i], 0, COL[i] + BLOCK, BLOCK]);
  for (const i of [0, 1, 2]) out.push([COL[i], ROW[1], COL[i] + BLOCK, GY]);
  return out;
}

function roadTraffic(movers: Mover[], traffic: Traffic, born: number, stopPoints: V2[]): void {
  const rng = new Rng(8086);
  const start = () => born + rng.range(0, 1.6);
  const fleet = { bus: buses(), cab: cabs(), car: cars() };
  const lanes: Lane[] = [];
  for (const [x0, y0, x1, y1] of cells()) lanes.push(new Lane(new Route(circuit(x0, y0, x1, y1, LANE), true)));
  // the outer lane of the ring road goes the other way round the whole city
  lanes.push(new Lane(new Route(circuit(-STREET, -STREET, GX + STREET, GY + STREET, -LANE, true), true)));
  for (const lane of lanes) {
    for (const [x, y] of stopPoints) {
      const near = lane.nearest(x, y);
      if (near.d < 1.2) lane.stops.push(near.s);
    }
    const L = lane.route.length;
    const n = Math.max(3, Math.round(L / 42));
    const kinds = ["bus", "cab", "car", "car", "cab", "bus", "car", "cab", "car"] as const;
    const shift = rng.int(0, 9);
    for (let k = 0; k < n; k++) {
      const kind = kinds[(k + shift) % kinds.length];
      const set = rng.pick(fleet[kind]);
      lane.vehicles.push({
        len: kind === "bus" ? 8.6 : kind === "cab" ? 4.5 : 4.4,
        speed: kind === "bus" ? 5.3 : kind === "cab" ? 6.1 : rng.range(5.6, 6.0),
        at: (k + rng.range(-0.22, 0.22)) / n,
        bus: kind === "bus",
        sprite: (h) => set.at(h),
        born: start(),
      });
    }
    traffic.lanes.push(lane);
  }

  // Cyclists keep to the kerb, in the same direction as the traffic beside them. They are traffic too:
  // they wait at a closed bridge or a crossing in use like everyone else.
  const riders = cyclists();
  const bikeLane = (pts: V3[], n: number) => {
    const lane = new Lane(new Route(pts, true));
    for (let k = 0; k < n; k++) {
      const kind = rng.pick(riders);
      const phase = rng.next() * 10;
      lane.vehicles.push({
        len: 1.9,
        speed: rng.range(4.5, 5.3),
        at: (k + rng.range(-0.3, 0.3)) / n,
        pedals: true,
        sprite: (h, t, moving) => kind.frames[moving ? Math.floor(t * 3.2 + phase) & 1 : 0].at(h),
        born: start(),
      });
    }
    traffic.lanes.push(lane);
  };
  for (const [x0, y0, x1, y1] of cells()) bikeLane(circuit(x0, y0, x1, y1, 1.3), y1 - y0 > 60 ? 5 : 3);
  bikeLane(circuit(-STREET, -STREET, GX + STREET, GY + STREET, -1.3, true), 7);

  movers.push(traffic.mover(born - 3));

  // people on the pavements: round each block, both ways
  for (const j of [0, 1, 2]) {
    for (const i of [0, 1, 2]) {
      const [ox, oy] = blockOrigin(i, j);
      for (const [off, back] of [
        [2.25, false],
        [3.25, true],
      ] as const) {
        const a = off;
        const b = BLOCK - off;
        let pts: V3[];
        if (j === 1) {
          // no pavement along the river here: up one side, along the top, down the other, and back the same way
          const turn = BLOCK - 5;
          pts = [
            [ox + a, oy + turn, 0],
            [ox + a, oy + a, 0],
            [ox + b, oy + a, 0],
            [ox + b, oy + turn, 0],
            [ox + b - 0.5, oy + turn, 0],
            [ox + b - 0.5, oy + a + 0.5, 0],
            [ox + a + 0.5, oy + a + 0.5, 0],
            [ox + a + 0.5, oy + turn, 0],
          ];
        } else {
          const top = j === 2 ? off + 0.3 : a;
          pts = [
            [ox + a, oy + top, 0],
            [ox + b, oy + top, 0],
            [ox + b, oy + b, 0],
            [ox + a, oy + b, 0],
          ];
        }
        if (back) pts.reverse();
        const r = new Route(rounded(pts, true, 0.5), true);
        for (let k = 0; k < 5; k++) movers.push(walker(r, rng, start()));
      }
    }
  }
  // and over the bridges, on the downstream footway of each
  for (const [x, w] of [
    [48, BRIDGE_W],
    [106, BRIDGE_W],
    [-STREET, BRIDGE_W],
    [FOOTBRIDGE_X, FOOTBRIDGE_W],
  ]) {
    const foot = x === FOOTBRIDGE_X;
    const xa = foot ? x + 1.2 : x + w - 0.66;
    const xb = foot ? x + w - 1.2 : x + w - 0.38;
    const ya = RY0 - (foot ? 2.5 : 1.2);
    const yb = RY1 + (foot ? 2.5 : 1.2);
    const r = new Route(
      rounded(
        [
          [xa, ya, 0],
          [xa, yb, 0],
          [xb, yb, 0],
          [xb, ya, 0],
        ],
        true,
        0.15,
      ),
      true,
    );
    for (let k = 0; k < (foot ? 12 : 7); k++) movers.push(walker(r, rng, start()));
  }
}

const BOAT_SPEED = 3.1;

/** The river traffic: one long loop, down river on the south side and back up on the north, turning beyond the bridges. */
function riverTraffic(movers: Mover[], born: number): { count: number; gap: number } {
  const r = (LANE_S - LANE_N) / 2;
  const xw = X0 - 15;
  const xe = X1 + 9;
  const pts: V3[] = [];
  pts.push([xw, LANE_S, WATER], [xe, LANE_S, WATER]);
  for (let k = 1; k < 12; k++) {
    const t = Math.PI / 2 - (Math.PI * k) / 12;
    pts.push([xe + Math.cos(t) * r, MID + Math.sin(t) * r, WATER]);
  }
  pts.push([xe, LANE_N, WATER], [xw, LANE_N, WATER]);
  for (let k = 1; k < 12; k++) {
    const t = -Math.PI / 2 - (Math.PI * k) / 12;
    pts.push([xw + Math.cos(t) * r, MID + Math.sin(t) * r, WATER]);
  }
  const route = new Route(pts, true);
  const fleet = riverFleet();
  const order: BoatKind[] = ["tour", "bus", "rib", "tour", "lighter", "lighter", "tug", "bus", "tour", "rib", "bus"];
  // space them evenly, except that the tug keeps its barges close behind it
  const free = route.length - order.reduce((s, k) => s + BOAT_LEN[k], 0) - 2 * 1.3;
  const gap = free / (order.length - 2);
  let s = 0;
  const rng = new Rng(404);
  order.forEach((kind, i) => {
    const set = fleet[kind][i % fleet[kind].length];
    const at = s / route.length;
    const b = born + rng.range(0, 1.5);
    const span = kind === "rib" || kind === "tug" ? 3 : 5;
    const P: V3 = [0, 0, 0];
    movers.push((m) => {
      if (m.t < b) return;
      const d = at * route.length + BOAT_SPEED * m.t;
      route.pos(d, P);
      if (!m.sees(P[0], P[1], P[2])) return;
      m.put(set.at(route.heading(d, span)), P[0], P[1], P[2], b);
    });
    // (each boat is placed ahead of the one before it; a barge keeps close to whatever is towing it)
    const next = order[i + 1];
    s += BOAT_LEN[kind] / 2 + (next ? BOAT_LEN[next] / 2 : 0) + (kind === "lighter" ? 1.3 : gap);
  });
  // they all keep the same speed, so the water between them never changes
  return { count: order.length, gap: Math.min(1.3, gap) };
}

/** Once it is dark: fireworks over the river. Each rocket climbs, bursts into a ring of sparks, and droops. */
function fireworks(movers: Mover[]): void {
  const rng = new Rng(1231);
  const colours: [number, number, number][] = [
    [255, 214, 120],
    [255, 120, 96],
    [255, 255, 255],
    [140, 230, 170],
    [255, 150, 205],
    [150, 200, 255],
  ];
  const k = 1 / (2 * C30);
  const shells: { at: number; x: number; y: number; z: number; r: number; c: [number, number, number]; c2: [number, number, number]; n: number; spin: number }[] = [];
  for (let i = 0; i < 34; i++) {
    // they go up from the middle of the river, all along it: each one well away from the one before
    shells.push({
      at: 0.15 + i * 0.2 + rng.range(-0.08, 0.08),
      x: -6 + (GX + 12) * ((i * 0.618034 + 0.3) % 1) + rng.range(-5, 5),
      y: rng.range(RY0 + 8, RY1 - 8),
      z: rng.range(30, 52),
      r: rng.range(12, 21),
      c: rng.pick(colours),
      c2: rng.pick(colours),
      n: rng.int(18, 26),
      spin: rng.range(0, 1),
    });
  }
  movers.push((m) => {
    if (m.night < 0.5) return;
    const tau = m.t - m.nightAt;
    for (const s of shells) {
      const u = tau - s.at;
      if (u < -0.55 || u > 1.7) continue;
      if (!m.sees(s.x, s.y, s.z, 40)) continue;
      if (u < 0) {
        // the rocket on its way up
        const f = 1 + u / 0.55;
        const z1 = WATER + (s.z - WATER) * (1 - (1 - f) * (1 - f));
        m.pen.stroke(
          [
            [s.x, s.y, Math.max(WATER, z1 - 3.5)],
            [s.x, s.y, z1],
          ],
          { w: 0.32, color: [255, 236, 190], kind: L_SPARK, wobble: 0, alpha: 0.9 },
        );
        continue;
      }
      const grow = 1 - Math.exp(-3.4 * u);
      const fade = Math.pow(Math.max(0, 1 - u / 1.7), 1.4);
      const drop = 2.6 * u * u;
      for (let ring = 0; ring < 2; ring++) {
        const R = s.r * grow * (ring ? 0.55 : 1);
        const col = ring ? s.c2 : s.c;
        const n = ring ? Math.round(s.n * 0.6) : s.n;
        for (let q = 0; q < n; q++) {
          const a = ((q + s.spin + ring * 0.5) / n) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const r0 = R * 0.7;
          m.pen.stroke(
            [
              [s.x + ca * r0 * k, s.y - ca * r0 * k, s.z + sa * r0 - drop],
              [s.x + ca * R * k, s.y - ca * R * k, s.z + sa * R - drop],
            ],
            { w: ring ? 0.3 : 0.4, color: col, kind: L_SPARK, wobble: 0, alpha: fade },
          );
          // a bright bead at the tip of each spark
          if (!ring) {
            m.pen.stroke(
              [
                [s.x + ca * R * 0.985 * k, s.y - ca * R * 0.985 * k, s.z + sa * R * 0.985 - drop],
                [s.x + ca * R * k, s.y - ca * R * k, s.z + sa * R - drop],
              ],
              { w: 0.7, color: [255, 250, 235], kind: L_SPARK, wobble: 0, alpha: fade },
            );
          }
        }
      }
    }
  });
}

/**
 * Things that only show after dark: stars scattered over the bare paper and
 * a crescent moon. They are drawn in the paper's own colour, so by day they
 * cannot be seen; at night anything that glows turns to warm light.
 */
function night(pen: Pen, b: { x0: number; y0: number; x1: number; y1: number }, islets: IsletDef[]): void {
  const rng = new Rng(1234);
  const paper: [number, number, number] = [243, 239, 228];
  const z = WATER + 0.02;
  pen.reveal = () => 0;
  const world = (px: number, py: number): V2 => {
    const a = px / (2 * C30);
    const c = py + z;
    return [a + c, c - a];
  };
  const free = (x: number, y: number) => {
    if (x > X0 - 3 && x < X1 + 3 && y > Y0 - 3 && y < Y1 + 3) return false;
    if (inWater(x, y, -3)) return false;
    for (const s of islets) if (Math.hypot(x - s.x, y - s.y) < 27) return false;
    return true;
  };
  const w = b.x1 - b.x0;
  for (let k = 0; k < 520; k++) {
    const px = rng.range(b.x0 - w * 0.35, b.x1 + w * 0.35);
    const py = rng.range(b.y0 - 12, b.y1 + 12);
    const [x, y] = world(px, py);
    if (!free(x, y)) continue;
    const r = rng.chance(0.12) ? rng.range(0.5, 0.75) : rng.range(0.18, 0.4);
    const c = pen.card(x, y, z);
    // a four-pointed star
    c.poly(
      [
        [0, r],
        [r * 0.22, r * 0.22],
        [r, 0],
        [r * 0.22, -r * 0.22],
        [0, -r],
        [-r * 0.22, -r * 0.22],
        [-r, 0],
        [-r * 0.22, r * 0.22],
      ],
      paper,
      { glow: 1, grain: 0, shade: false },
    );
  }
  // the moon, top right of the city
  const [mx, my] = world(b.x0 + w * 0.6, b.y0 + 4);
  const moon: V2[] = [];
  const R = 5.2;
  for (let k = 0; k <= 16; k++) {
    const t = -Math.PI / 2 + (k / 16) * Math.PI;
    moon.push([Math.cos(t) * R, Math.sin(t) * R]);
  }
  for (let k = 16; k >= 0; k--) {
    const t = -Math.PI / 2 + (k / 16) * Math.PI;
    moon.push([Math.cos(t) * R * 0.52 - R * 0.12, Math.sin(t) * R]);
  }
  pen.card(mx, my, z).poly(moon, paper, { glow: 1, grain: 0, shade: false });
}

// ---------------------------------------------------------------- putting it together

function makeCtx(pen: Pen, rng: Rng, ox: number, oy: number, oz: number, t: number, movers: Mover[], quay: BlockCtx["quay"], span: number, stop: Stop, i: number, j: number, traffic: Traffic): LondonCtx {
  const sweep = 1.25;
  const jit = new Rng(Math.floor(ox * 7 + oy * 13 + 5));
  const normal = (x: number, y: number) => t + 0.5 + ((x - ox + (y - oy)) / (2 * span)) * sweep + jit.range(-0.07, 0.07);
  const c: LondonCtx = {
    pen,
    rng,
    ox,
    oy,
    oz,
    t,
    done: t + 0.5 + sweep + 1.15,
    movers,
    quay,
    i,
    j,
    early(fn) {
      const keep = pen.reveal;
      pen.reveal = (x, y) => t + 0.22 + ((x - ox + (y - oy)) / (2 * span)) * 0.5;
      fn();
      pen.reveal = keep;
    },
    focus(x, y, zoom = 1) {
      stop.x = ox + x;
      stop.y = oy + y;
      stop.zoom = zoom;
    },
    visit: () => stop.at ?? null,
    closeup: () => stop.closeAt ?? null,
    halt: (h) => traffic.halts.push(h),
  };
  pen.reveal = normal;
  return c;
}

export function buildCity(blocks: BlockDef[], islets: IsletDef[]): City {
  const mesh = new Mesh(1 << 18, 1 << 18);
  const pen = new Pen(mesh, 1851);
  const movers: Mover[] = [];
  const stops: Stop[] = [];
  const traffic = new Traffic();
  let done = 0;

  const reaches = water(pen);
  pen.rng = new Rng(2012);
  ground(pen);

  const tOf = new Map<string, number>();
  for (const b of blocks) tOf.set(b.i + "," + b.j, b.t);
  const tAt = (i: number, j: number) => tOf.get(i + "," + j) ?? 0.9;
  const stopPoints: V2[] = [];

  for (const b of blocks) {
    const [ox, oy] = blockOrigin(b.i, b.j);
    const rng = new Rng(1000 + b.i * 31 + b.j * 97);
    pen.rng = rng.fork();
    // every edge has a pavement or a riverside walk, except the north bank's river edge, which is the block's own
    const quay = { xm: true, xp: true, ym: true, yp: b.j !== 1 };
    const stop: Stop = { id: b.id, name: b.name, note: b.note, x: ox + BLOCK / 2, y: oy + BLOCK / 2, zoom: 1 };
    pen.push(ox, oy, 0);
    const c = makeCtx(pen, rng, ox, oy, 0, b.t, movers, quay, BLOCK, stop, b.i, b.j, traffic);
    const normal = pen.reveal;
    pad(pen, c);
    pen.reveal = normal;
    const here = BUS_STOPS[b.i + "," + b.j] ?? [];
    for (const side of ["ym", "xm", "xp", "yp"] as const) {
      if (side === "yp" && b.j === 1) continue;
      if (side === "ym" && b.j === 2) {
        dressProm(c, PROM_CLEAR[b.id] ?? []);
        continue;
      }
      const at = here.filter((s) => s[0] === side).map((s) => s[1]);
      dressWalk(
        c,
        side,
        at,
        (WALK_CLEAR[b.i + "," + b.j] ?? []).filter((w) => w[0] === side).map((w) => [w[1], w[2]] as [number, number]),
      );
      // where the bus stands, out in its lane
      const [fx, fy, rot] = FRAMES[side];
      const rad = (rot * Math.PI) / 180;
      for (const a of at) stopPoints.push([ox + fx + Math.cos(rad) * (a + 2.4) + Math.sin(rad) * LANE, oy + fy + Math.sin(rad) * (a + 2.4) - Math.cos(rad) * LANE]);
    }
    b.build(c);
    pen.pop();
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  done = Math.max(done, bridges(pen, tAt));
  edges(pen);

  for (const s of islets) {
    const rng = new Rng(5000 + Math.floor(s.x * 3 + s.y * 7));
    pen.rng = rng.fork();
    const stop: Stop = { id: s.id, name: s.name, note: s.note, x: s.x, y: s.y, zoom: 1.2, quick: true };
    pen.push(s.x - 20, s.y - 20, WATER);
    const c = makeCtx(pen, rng, s.x - 20, s.y - 20, WATER, s.t, movers, { xm: false, xp: false, ym: false, yp: false }, 40, stop, -1, -1, traffic);
    const first = mesh.fn;
    s.build(c);
    pen.pop();
    // Frame the islet by what was actually drawn: fill most of the view, unless its builder asked for a closer one.
    let ix0 = Infinity;
    let iy0 = Infinity;
    let ix1 = -Infinity;
    let iy1 = -Infinity;
    for (let k = first * 6; k < mesh.fn * 6; k += 6) {
      const px = paperX(mesh.fv[k], mesh.fv[k + 1]);
      const py = paperY(mesh.fv[k], mesh.fv[k + 1], mesh.fv[k + 2]);
      if (px < ix0) ix0 = px;
      if (px > ix1) ix1 = px;
      if (py < iy0) iy0 = py;
      if (py > iy1) iy1 = py;
    }
    if (ix1 > ix0) {
      // a tour stop at zoom 1 shows about 104 x 66 units
      const fit = Math.min((104 * 0.76) / (ix1 - ix0), (66 * 0.74) / (iy1 - iy0), 1.9);
      if (fit > stop.zoom) {
        stop.zoom = fit;
        // the camera aims 4.5 units above the ground point it is given
        const a = (ix0 + ix1) / 2 / (2 * C30);
        const g = (iy0 + iy1) / 2 + 4.5;
        stop.x = a + g;
        stop.y = g - a;
      }
    }
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  underground(pen, movers, done - 0.6);
  const far0 = mesh.fn;
  beyond(pen, movers, WEST, EAST, 2.3, done - 0.6);
  const far: [number, number] = [far0, mesh.fn];

  pen.rng = new Rng(31337);
  const born = done - 0.6;
  roadTraffic(movers, traffic, born, stopPoints);
  const boats = riverTraffic(movers, born);
  const tower = stops.find((s) => s.id === "tower");
  const bridgeLift = towerBridgeLife(movers, traffic, born, tAt(2, 1) + 1.6, () => tower?.at ?? null);
  fireworks(movers);

  // paper bounds of the land and the islets (the river's far reaches, and what floats on them, are left out: they run off the page)
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const fv = mesh.fv;
  for (let k = 0; k < mesh.fn * 6; k += 6) {
    if ((k >= reaches[0] * 6 && k < reaches[1] * 6) || (k >= far[0] * 6 && k < far[1] * 6)) continue;
    const px = paperX(fv[k], fv[k + 1]);
    const py = paperY(fv[k], fv[k + 1], fv[k + 2]);
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
  }
  night(pen, { x0, y0, x1, y1 }, islets);
  // when the last thing to be drawn in has all its colour (a second after it starts)
  // (the buffers are looked up afresh: adding the stars may have moved them)
  let latest = 0;
  const fv2 = mesh.fv;
  for (let k = 3; k < mesh.fn * 6; k += 6) if (fv2[k] > latest) latest = fv2[k];
  const lv = mesh.lv;
  for (let k = 6; k < mesh.ln * 12; k += 12) if (lv[k] > latest) latest = lv[k];
  return { mesh, movers, stops, bounds: { x0, y0, x1, y1 }, done, settled: latest + 1.05, traffic, bridgeLift, boats };
}

export { TRAFFIC_HORIZON };
