// The city plan: nine blocks in a grid with streets between them, the Spree
// cutting through between the second and third columns with Museum Island in
// it, a ring road round the outside, and the traffic that runs through it all.
// The numbers are in grid.ts and the places in blocks/; this file lays the
// ground they stand on.
//
// The land is one base in two pieces (road surface at z = 0), standing on the
// paper like a model on a table; blocks stand CURB higher and their edges are
// sidewalks, or a riverside walk where they meet the Spree. The river lies on
// the paper, WATER below the road, and runs on past both ends of the base.

import { C30, Rng, V2, V3, clamp, paperX, paperY } from "../engine/math";
import { Mesh } from "../engine/mesh";
import { F_WATER, L_MARK, L_RIPPLE, L_SPARK, Pen, Plane } from "../engine/pen";
import { ampel } from "./berlin";
import { beyond } from "./beyond";
import { axisBridges, elevated, oberbaum, roadBridge } from "./bridges";
import { FRAME } from "./frame";
import {
  AXIS_W,
  AXIS_Y,
  BLOCK,
  BRIDGE_Y,
  COLS,
  COL_X,
  CURB,
  GRID_X,
  ISLAND,
  LANE,
  MARGIN,
  QUAY,
  QUAY_LINE,
  REACH_N,
  REACH_S,
  RIVER,
  RIVER_MID,
  ROWS,
  ROW_Y,
  RX0,
  RX1,
  ReachPt,
  TAIL,
  TOUR_VIEW,
  TRAFFIC_HORIZON,
  WATER,
  X0,
  X1,
  Y0,
  Y1,
  blockOrigin,
  inWater,
  islandOutline,
  onBase,
  onReach,
} from "./grid";
import { bench, bikeRow, bricks, lamp, person, railing, randomLook, tree } from "./kit";
import { Route, VEHICLE_SIZE, VehicleKind, boat, cyclist, offsetLoop, riverBoats, rounded, tram, vehicle, walker } from "./motion";
import { C } from "./palette";
import { BlockBuilder, BlockCtx, Mover, Stop } from "./types";

export * from "./grid";

export interface BlockDef {
  id: string;
  i: number;
  j: number;
  /** When the block starts to draw. */
  t: number;
  name: string;
  note: string;
  build: BlockBuilder;
  /** Stretches of the riverside walk to leave without a railing (local y, along the bank): steps down to the water, a gangway. */
  gaps?: [number, number][];
  /** Stretches of the riverside walk the city leaves alone: no benches, no idlers (local y). A memorial wants quiet. */
  quiet?: [number, number][];
}

export interface IsletDef {
  id: string;
  /** World centre. The builder's local frame runs from (0,0) to (40,40) around it. */
  x: number;
  y: number;
  t: number;
  name: string;
  note: string;
  build: BlockBuilder;
  /** Museum Island: the city lays its ground, walls and bridges, and local z = 0 is its street level, not the paper. */
  island?: boolean;
  /** A passing visit rather than a full stop. Default true. */
  quick?: boolean;
}

export interface City {
  mesh: Mesh;
  movers: Mover[];
  stops: Stop[];
  /** Paper-space bounds of the land and the places off it: what the wide view frames. The river runs on past it. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Timeline second by which the whole drawing is finished. */
  done: number;
  /** Timeline second from which nothing in the static drawing is still arriving. */
  settled: number;
  /** The band of depth (x + y + z) the renderer should cover: everything drawn, with room for things that fly. */
  depth: { mid: number; half: number };
  /** Times two boats, cars or trams meet in one loop of the film. Should be none. */
  trafficClashes: number;
  /** Vehicles left out because there was no clear place for them. */
  trafficDropped: number;
}

type Box = { x0: number; y0: number; x1: number; y1: number };

// ---------------------------------------------------------------- the river

/** When the river reaches a point: it flows in from the lower left of the page (the south) and on through the city. */
function flowT(x: number, y: number): number {
  if (y > Y1) return 0.6 - 0.5 * clamp(Math.hypot(x - RIVER_MID, y - Y1) / 120, 0, 1);
  if (y < Y0) return 1.6 + 0.5 * clamp(Math.hypot(x - RIVER_MID, y - Y0) / 120, 0, 1);
  return 0.6 + ((Y1 - y) / (Y1 - Y0)) * 1.0;
}

const RIPPLE = { len: 1.5, ang: -Math.PI / 4, jit: 0.08, bend: 0.22, color: C.waterInk, w: 0.075, kind: L_RIPPLE, alpha: 0.75 };

/** Lay the Spree. Returns the range of fills that make up the reaches beyond the base. */
function water(pen: Pen): [number, number] {
  pen.reveal = (x, y) => flowT(x, y);
  const g = pen.floor(WATER, 0);
  const opt = { kind: F_WATER };
  const n = 16;
  const step = (Y1 - Y0) / n;
  for (let k = 0; k < n; k++) g.rect(RX0 - 0.3, Y0 + k * step, RX1 + 0.3, Y0 + (k + 1) * step + 0.05, C.water, opt);
  const first = pen.m.fn;
  for (const pts of [REACH_N, REACH_S]) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      if (a.hw < 0.05 && b.hw < 0.05) continue;
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
  for (let y = Y0; y < Y1; y += 28) gt.ticks(RX0 + 0.6, y, RX1 - 0.6, Math.min(Y1, y + 28), { ...RIPPLE, n: 70, inside: (a, b) => inWater(a, b, 0.8) });
  for (const pts of [REACH_N, REACH_S]) {
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

// ---------------------------------------------------------------- the ground

/** The heart of the city: the streets and the blocks spread outwards from here. */
const CENTRE: V2 = [COL_X[1] + BLOCK / 2, ROW_Y[1] + BLOCK / 2];
const REACH = Math.hypot(GRID_X, MARGIN * 2 + ROW_Y[ROWS - 1] + BLOCK) * 0.62;
const groundReveal = (x: number, y: number) => 0.5 + (Math.hypot(x - CENTRE[0], y - CENTRE[1]) / REACH) * 1.3;

type Span = [number, number, "r" | "b"];

/** One axis of a piece of the base: blocks ("b") with a road ("r") between each pair, and optionally one before and after. */
function spans(starts: number[], before: boolean, after: boolean): Span[] {
  const out: Span[] = [];
  if (before) out.push([starts[0] - MARGIN, starts[0], "r"]);
  starts.forEach((s, k) => {
    out.push([s, s + BLOCK, "b"]);
    if (k + 1 < starts.length) out.push([s + BLOCK, starts[k + 1], "r"]);
  });
  if (after) out.push([starts[starts.length - 1] + BLOCK, starts[starts.length - 1] + BLOCK + MARGIN, "r"]);
  return out;
}

const AFTER = FRAME.river.after;
/** The two pieces of the base, west and east of the river: their cells along x. Both share the cells along y. */
const PIECES: Span[][] = [spans(COL_X.slice(0, AFTER + 1), true, false), spans(COL_X.slice(AFTER + 1), false, true)];
const SPANS_Y: Span[] = spans(ROW_Y, true, true);

/** A wall facing the camera: stone cap, coursed stone below, and a water line at the foot where it stands in the river. */
export function quayWall(f: Plane, len: number, h: number, edged = true, wet = true): void {
  f.rect(0, 0, len, h, C.quay, { grain: 0.7 });
  f.rect(0, h - 0.42, len, h, C.quayCap, { grain: 0.5 });
  f.seg(0, h - 0.42, len, h - 0.42, { w: 0.07 });
  // a wall standing on its own needs its top edge inked; one on a box already has it
  if (edged) f.seg(0, h, len, h, { w: 0.08 });
  bricks(f, 0.3, 0.15, len - 0.3, h - 0.55, C.quayDark, 0.5);
  if (wet) f.seg(0, 0.02, len, 0.02, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
}

/** Lettering painted on the road, to be read from the bottom of the page. */
function roadText(pen: Pen, str: string, x: number, y: number, size: number, alongX: boolean, color = C.roadLine): void {
  const p = alongX ? pen.plane([x, y, 0], [1, 0, 0], [0, -1, 0], 2, true) : pen.plane([x, y, 0], [0, -1, 0], [-1, 0, 0], 2, true);
  p.text(str, 0, 0, size, { align: "c", color, kind: L_MARK, w: 0.075, wobble: 0.3 });
}

/** The base under everything: its roads and their markings, and its walls down to the paper. */
function base(pen: Pen): void {
  pen.reveal = groundReveal;
  const road = pen.floor(0, 0);
  const paint = pen.floor(0, 1);
  for (const xs of PIECES) {
    for (const [x0, x1, kx] of xs) {
      for (const [y0, y1, ky] of SPANS_Y) {
        if (kx === "b" && ky === "b") continue;
        pen.obj(() => {
          road.rect(x0 - 0.15, y0 - 0.15, x1 + 0.15, y1 + 0.15, C.road, { grain: 0.8 });
          if (kx === "r" && ky === "r") return;
          // a stretch of road between two corners: a dashed centre line, and a crossing at each end
          const along = ky === "r"; // the road runs along x
          const [s0, s1] = along ? [x0, x1] : [y0, y1];
          const [w0, w1] = along ? [y0, y1] : [x0, x1];
          const mid = (w0 + w1) / 2;
          const put = (p0: number, p1: number, q0: number, q1: number) =>
            along ? paint.rect(p0, q0, p1, q1, C.roadLine, { grain: 0.3 }) : paint.rect(q0, p0, q1, p1, C.roadLine, { grain: 0.3 });
          for (let s = s0 + 4.2; s + 1.6 < s1 - 4.2; s += 3.4) put(s, s + 1.6, mid - 0.09, mid + 0.09);
          for (const e of [s0 + 0.7, s1 - 2.7]) {
            for (let q = w0 + 0.9; q + 0.5 < w1 - 0.6; q += 1.05) put(e, e + 2.0, q, q + 0.5);
          }
        });
      }
    }
  }
  // the walls the camera sees, down to the paper, in pieces that arrive with their cells; and the far edges, inked
  const h = -WATER;
  for (const [y0, y1] of SPANS_Y) {
    pen.obj(() => quayWall(pen.wall("x+", X1, y0, WATER, 0, y1 - y0), y1 - y0, h, true, false));
    pen.stroke(
      [
        [X0, y0, 0],
        [X0, y1, 0],
      ],
      { w: 0.08 },
    );
  }
  for (const xs of PIECES) {
    for (const [x0, x1] of xs) {
      pen.obj(() => quayWall(pen.wall("y+", x0, Y1, WATER, x1 - x0, 0), x1 - x0, h, true, false));
      pen.stroke(
        [
          [x0, Y0, 0],
          [x1, Y0, 0],
        ],
        { w: 0.08 },
      );
    }
  }
  wallTrace(pen);
}

/**
 * Where the Wall stood there is a double row of cobbles set into the road, as
 * there is in the real city. Here it runs from the Spree west between the
 * Reichstag and the Gate, south down the Gate's far side, and back east to the
 * river past Checkpoint Charlie: west of it and south of it was West Berlin.
 */
export const WALL = { x: COL_X[1] - 3, yN: ROW_Y[1] - 3, yS: ROW_Y[1] + BLOCK + 3 };
function wallTrace(pen: Pen): void {
  const { x, yN, yS } = WALL;
  const path: V2[] = [
    [RX0 - 0.5, yN],
    [x, yN],
    [x, yS],
    [RX0 - 0.5, yS],
  ];
  for (let k = 0; k + 1 < path.length; k++) {
    const [ax, ay] = path[k];
    const [bx, by] = path[k + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    // in pieces, so the line arrives with the road it is set into
    for (let s0 = 0; s0 < len; s0 += 8) {
      pen.obj(() => {
        for (const side of [-0.17, 0.17]) {
          for (let s = s0; s < Math.min(len, s0 + 8) - 0.2; s += 0.52) {
            const px = ax + ux * s - uy * side;
            const py = ay + uy * s + ux * side;
            pen.stroke(
              [
                [px, py, 0.01],
                [px + ux * 0.36, py + uy * 0.36, 0.01],
              ],
              { w: 0.24, color: C.brickBrown, kind: L_MARK, wobble: 0, layer: 2 },
            );
          }
        }
      });
    }
  }
  roadText(pen, "BERLINER MAUER", (x + RX0) / 2 + 6, yN - 1.1, 0.62, true, C.brickBrown);
  roadText(pen, "BERLINER MAUER", x - 1.1, (yN + yS) / 2, 0.62, false, C.brickBrown);
}

/** The slab a block stands on: a curb, a paved top, and where it meets the Spree an embankment wall down to the water. */
function slab(pen: Pen, c: BlockCtx): void {
  pen.reveal = () => c.t;
  pen.begin();
  pen.box(0, 0, -CURB, BLOCK, BLOCK, CURB, C.curb, { top: C.paving });
  if (c.river === "xp") quayWall(pen.wall("x+", 0, 0, c.waterZ, BLOCK, BLOCK), BLOCK, -c.waterZ, false);
  pen.floor(0, 1).loop(
    [
      [0.62, 0.62],
      [BLOCK - 0.62, 0.62],
      [BLOCK - 0.62, BLOCK - 0.62],
      [0.62, BLOCK - 0.62],
    ],
    { w: 0.07 },
  );
  pen.end();
}

/** Museum Island's ground: a stone-walled spindle of land with a paved top and a railing round its edge. */
function islandSlab(pen: Pen, t: number): void {
  pen.reveal = () => t;
  const top = CURB;
  const out = islandOutline();
  pen.begin();
  pen.extrude(out, WATER, top, C.quay, { top: C.paving, crease: 30 });
  // the straight east wall faces the camera: dress it like the embankments
  const y0 = ISLAND.y0 + ISLAND.tipN;
  const y1 = ISLAND.y1 - ISLAND.tipS;
  quayWall(pen.wall("x+", ISLAND.x1, y0, WATER, 0, y1 - y0), y1 - y0, top - WATER, false);
  // a stone cap round the pointed ends, where the wall is curved
  for (const grow of [0]) {
    const rim = islandOutline(grow).map((p) => [p[0], p[1], top - 0.42] as V3);
    pen.stroke(rim.slice(0, 11), { w: 0.07 });
  }
  pen.floor(top, 1).loop(islandOutline(-0.6), { w: 0.07 });
  pen.end();
  // the railing, in runs between the bridges that land on the island
  const rail = islandOutline(-0.3).map((p) => [p[0], p[1], top] as V3);
  rail.push(rail[0]);
  let run: V3[] = [];
  const flush = () => {
    if (run.length > 1) railing(pen, run, 0.85, C.steelDark, 1.5);
    run = [];
  };
  for (const p of rail) {
    if (Math.abs(p[1] - AXIS_Y) < AXIS_W / 2 + 0.3) flush();
    else run.push(p);
  }
  flush();
}

// ---------------------------------------------------------------- dressing the edges

type Side = "xp" | "xm" | "yp" | "ym";
/** A frame in which a block edge runs along local +x at y = 0 with the block on +y. */
const EDGE_FRAMES: Record<Side, [number, number, number]> = {
  ym: [0, 0, 0],
  xp: [BLOCK, 0, 90],
  yp: [BLOCK, BLOCK, 180],
  xm: [0, BLOCK, 270],
};

/** A sidewalk: granite slabs, a row of limes with lamps between them, a few parked bikes and people. */
function dressSidewalk(c: BlockCtx, side: Side): void {
  const { pen, rng } = c;
  const [fx, fy, rot] = EDGE_FRAMES[side];
  pen.push(fx, fy, 0, rot);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(0.62, 0.62, BLOCK - 0.62, QUAY, C.stone);
    g.seg(0.62, QUAY, BLOCK - 0.62, QUAY, { w: 0.07, color: C.stoneDark, kind: L_MARK });
    pen.floor(0, 2).ticks(1, 0.9, BLOCK - 1, QUAY - 0.25, { n: Math.round(BLOCK * 0.8), len: 0.5, ang: Math.PI / 2, jit: 0.02, color: C.stoneDark, w: 0.05 });
  });
  const trees: number[] = [];
  for (let a = 5; a < BLOCK - 4; a += rng.range(7, 9)) {
    trees.push(a);
    tree(pen, rng, a, 1.05, { kind: "round", h: 1.7, r: 1.15 });
  }
  for (let k = 0; k + 1 < trees.length; k++) {
    const mid = (trees[k] + trees[k + 1]) / 2;
    if (k % 2 === 0) lamp(pen, mid, 0.55, 0, 3.0);
    else if (rng.chance(0.55)) bikeRow(pen, rng, mid - 1.1, 1.25, 4, 270, 0.62);
  }
  for (let k = 0; k < 2; k++) {
    const a = rng.range(4, BLOCK - 4);
    person(pen, a, QUAY_LINE + rng.range(-0.4, 0.4), 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5));
  }
  pen.pop();
}

/**
 * The riverside walk along a bank of the Spree: setts, an iron railing over
 * the water, lamps, benches that face the river and people leaning on the
 * rail. Limes only on the west bank: on the east one they would stand between
 * the camera and the river.
 */
function dressBank(c: BlockCtx, side: "xp" | "xm", gaps: [number, number][], quiet: [number, number][]): void {
  const { pen, rng } = c;
  const [fx, fy, rot] = EDGE_FRAMES[side];
  // the stretches are given along local y; along this edge that is a (west bank) or BLOCK - a (east bank)
  const within = (list: [number, number][], a: number) => {
    const y = side === "xp" ? a : BLOCK - a;
    return list.some(([g0, g1]) => y > g0 && y < g1);
  };
  const open = (a: number) => within(gaps, a);
  const hush = (a: number) => within(gaps, a) || within(quiet, a);
  pen.push(fx, fy, 0, rot);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(0.62, 0.62, BLOCK - 0.62, QUAY, C.cobble);
    g.seg(0.62, QUAY, BLOCK - 0.62, QUAY, { w: 0.07, color: C.cobbleDark, kind: L_MARK });
    pen.floor(0, 2).ticks(1, 0.9, BLOCK - 1, QUAY - 0.25, { n: Math.round(BLOCK * 1.6), len: 0.34, ang: 0, jit: 0.3, color: C.cobbleDark, w: 0.05 });
  });
  // the railing, broken where the block wants to reach the water
  let run: V3[] = [];
  const flush = () => {
    if (run.length > 1) railing(pen, run, 0.85, C.steelDark, 1.5);
    run = [];
  };
  for (let a = 0.5; a <= BLOCK - 0.5 + 1e-6; a += 1.5) {
    if (open(a)) flush();
    else run.push([a, 0.3, 0]);
  }
  flush();
  for (let a = 6; a < BLOCK - 4; a += 12) {
    if (!open(a)) lamp(pen, a + rng.range(-0.5, 0.5), 0.85, 0, 3.0);
  }
  if (side === "xp") {
    for (let a = 4.5; a < BLOCK - 3; a += rng.range(8, 10)) {
      if (!open(a)) tree(pen, rng, a, 2.7, { kind: "elm", h: 2.2, r: 1.5 });
    }
  }
  for (let a = 11; a < BLOCK - 8; a += 12) {
    if (rng.chance(0.3) || hush(a) || hush(a - 1.2) || hush(a + 1.2)) continue;
    // benches face the water
    bench(pen, a, 2.2, 180);
    if (rng.chance(0.75)) person(pen, a - 0.45, 2.0, 0.3, randomLook(rng), "sit", rng.chance(0.5));
    if (rng.chance(0.5)) person(pen, a + 0.45, 2.0, 0.3, randomLook(rng), "sit", rng.chance(0.5));
  }
  for (let k = 0; k < 4; k++) {
    const a = rng.range(3, BLOCK - 3);
    const look = randomLook(rng);
    const pose = rng.pick(["stand", "stand", "wave"] as const);
    const flip = rng.chance(0.5);
    const small = rng.chance(0.15);
    if (hush(a)) continue;
    person(pen, a, 0.75, 0, look, pose, flip, small ? 0.72 : 1);
  }
  pen.pop();
}

/**
 * A pedestrian light at every street corner of a block, with the little men of
 * the East, who after 1990 took over the whole city: green on two corners,
 * red on the other two.
 */
function crossings(c: BlockCtx): void {
  const k = 0.95;
  const corners: [number, number][] = [
    [k, k],
    [BLOCK - k, k],
    [BLOCK - k, BLOCK - k],
    [k, BLOCK - k],
  ];
  corners.forEach(([x, y], n) => {
    // not on a corner that is a river bank: there is nothing to cross to
    if ((c.river === "xp" && x > BLOCK / 2) || (c.river === "xm" && x < BLOCK / 2)) return;
    ampel(c.pen, x, y, 0, (n + c.i + c.j) % 2 === 0);
  });
}

// ---------------------------------------------------------------- traffic

interface Hull {
  route: Route;
  /** Place on the route at t = 0, as a fraction of its length. */
  at: number;
  speed: number;
  /** Half length and half width, with a little room to spare. */
  a: number;
  b: number;
  span: number;
}

const HP: V3 = [0, 0, 0];

/** Do two vehicles overlap at time t? Each is a rectangle lying along its heading. */
function touching(p: Hull, q: Hull, t: number): boolean {
  const sp = p.at * p.route.length + p.speed * t;
  const sq = q.at * q.route.length + q.speed * t;
  p.route.pos(sp, HP);
  const px = HP[0];
  const py = HP[1];
  q.route.pos(sq, HP);
  const dx = HP[0] - px;
  const dy = HP[1] - py;
  const reach = p.a + q.a;
  if (dx * dx + dy * dy > reach * reach) return false;
  const hp = p.route.heading(sp, p.span);
  const hq = q.route.heading(sq, q.span);
  const ux = Math.cos(hp);
  const uy = Math.sin(hp);
  const vx = Math.cos(hq);
  const vy = Math.sin(hq);
  // separating axes: along and across each vehicle
  const dot = Math.abs(ux * vx + uy * vy);
  const crs = Math.abs(ux * vy - uy * vx);
  if (Math.abs(dx * ux + dy * uy) > p.a + q.a * dot + q.b * crs) return false;
  if (Math.abs(-dx * uy + dy * ux) > p.b + q.a * crs + q.b * dot) return false;
  if (Math.abs(dx * vx + dy * vy) > q.a + p.a * dot + p.b * crs) return false;
  if (Math.abs(-dx * vy + dy * vx) > q.b + p.a * crs + p.b * dot) return false;
  return true;
}

/**
 * Give each vehicle a starting place on its loop so that no two ever meet in
 * one loop of the film. Loops cross at junctions, so each vehicle in turn is
 * tried at evenly spaced places round its loop and put in the middle of the
 * widest stretch that never touches anything already placed. One with no
 * clear place at all is left out.
 */
function placeFleet<T extends Omit<Hull, "at">>(wanted: T[], from: number): { placed: (T & { at: number })[]; dropped: number; clashes: number } {
  const STEP = 0.35;
  const steps = Math.ceil((TRAFFIC_HORIZON - from) / STEP);
  const track = (h: Hull): Float32Array => {
    const out = new Float32Array(steps * 2);
    for (let k = 0; k < steps; k++) {
      h.route.pos(h.at * h.route.length + h.speed * (from + k * STEP), HP);
      out[k * 2] = HP[0];
      out[k * 2 + 1] = HP[1];
    }
    return out;
  };
  const meets = (h: Hull, path: Float32Array, o: Hull, opath: Float32Array): number => {
    let hits = 0;
    const reach = (h.a + o.a) * (h.a + o.a);
    for (let k = 0; k < steps; k++) {
      const dx = opath[k * 2] - path[k * 2];
      const dy = opath[k * 2 + 1] - path[k * 2 + 1];
      if (dx * dx + dy * dy < reach && touching(h, o, from + k * STEP)) hits++;
    }
    return hits;
  };
  const placed: { h: T & { at: number }; path: Float32Array }[] = [];
  let dropped = 0;
  // the longest first: a tram needs more clear road than a car, and finds it more easily on an empty one
  for (const w of wanted.slice().sort((p, q) => q.a - p.a)) {
    // one place to try for every few units of the loop
    const N = Math.max(40, Math.round(w.route.length / 4));
    const hits: number[] = [];
    for (let c = 0; c < N; c++) {
      const h = { ...w, at: (c + 0.5) / N };
      const path = track(h);
      let n = 0;
      for (const o of placed) {
        n += meets(h, path, o.h, o.path);
        if (n > 0) break;
      }
      hits.push(n);
    }
    // the middle of the widest clear stretch, going round the loop
    let best = -1;
    let bestRun = 0;
    let run = 0;
    for (let c = 0; c < N * 2; c++) {
      if (hits[c % N] === 0) {
        run++;
        if (run > bestRun && run <= N) {
          bestRun = run;
          best = c - (run - 1) / 2;
        }
      } else run = 0;
    }
    if (best < 0) {
      dropped++;
      continue;
    }
    const h = { ...w, at: (((best % N) + N) % N + 0.5) / N };
    placed.push({ h, path: track(h) });
  }
  // and check the result independently, pair by pair
  let clashes = 0;
  for (let p = 0; p < placed.length; p++) {
    for (let q = p + 1; q < placed.length; q++) clashes += meets(placed[p].h, placed[p].path, placed[q].h, placed[q].path) > 0 ? 1 : 0;
  }
  return { placed: placed.map((x) => x.h), dropped, clashes };
}

type Rect = [number, number, number, number];

/** The rectangle round a piece of land along the middle of its streets (or LANE / 2 out, on an outside edge). */
function ringOf([x0, y0, x1, y1]: Rect, z: number): V3[] {
  return [
    [x0 - LANE / 2, y0 - LANE / 2, z],
    [x1 + LANE / 2, y0 - LANE / 2, z],
    [x1 + LANE / 2, y1 + LANE / 2, z],
    [x0 - LANE / 2, y1 + LANE / 2, z],
  ];
}

/**
 * A loop round a piece of land, `side` units off the middle of its streets
 * (positive: away from the land). Berlin drives on the right, which on this
 * page means going round the other way from the order the corners are listed
 * in: pass `clockwise` false for that, true for people walking the other way.
 */
function around(r: Rect, z: number, side: number, radius: number, clockwise = false): Route {
  let p = ringOf(r, z);
  let off = side;
  if (!clockwise) {
    p = p.slice().reverse();
    off = -side;
  }
  return new Route(rounded(offsetLoop(p, off), true, radius), true);
}

/** The loops the road traffic drives: round each block west of the river, and round each row's pair of blocks across it, over two bridges. */
function roadLoops(): { rect: Rect; long: boolean; row: number }[] {
  const out: { rect: Rect; long: boolean; row: number }[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < AFTER; i++) out.push({ rect: [COL_X[i], ROW_Y[j], COL_X[i] + BLOCK, ROW_Y[j] + BLOCK], long: false, row: j });
    out.push({ rect: [COL_X[AFTER], ROW_Y[j], GRID_X, ROW_Y[j] + BLOCK], long: true, row: j });
  }
  return out;
}

/** The line the trams run on: the middle row's long loop, over the two bridges either side of the island. */
export const TRAM_ROW = 1;
const CAR_SIDE = 1.8;

/** Everything that moves through the city's own ground. Returns how traffic placement went. */
function traffic(pen: Pen, movers: Mover[], born: number): { clashes: number; dropped: number } {
  const rng = new Rng(8086);
  const start = () => born + rng.range(0, 1.6);
  // cars, buses and trams round the loops, cyclists by the far kerb, people on the sidewalks
  const wanted: (Omit<Hull, "at"> & { kind: VehicleKind })[] = [];
  const speed = 4.2;
  for (const { rect, long, row } of roadLoops()) {
    const route = around(rect, 0, CAR_SIDE, 3.2);
    let kinds: VehicleKind[];
    if (long) {
      kinds =
        row === TRAM_ROW
          ? ["tram", "tram", "bus", "car", "taxi", "car", "trabi"]
          : row === 0
            ? ["bus", "car", "car", "taxi", "car", "trabi", "car"]
            : ["car", "bus", "car", "trabi", "car", "taxi", "car"];
    } else kinds = row === 0 ? ["car", "bus", "car"] : row === 1 ? ["bus", "taxi", "car"] : ["car", "car", "taxi"];
    for (const kind of kinds) wanted.push({ route, speed, kind, ...VEHICLE_SIZE[kind] });
    const bikes = around(rect, 0, LANE / 2 - 1.2, 1.6);
    for (let k = 0; k < (long ? 5 : 2); k++) movers.push(cyclist(bikes, rng, start(), rng.range(3.6, 4.6)));
    if (long && row === TRAM_ROW) {
      // the rails the trams run on, set into the road
      pen.reveal = () => born - 1.4;
      pen.begin();
      for (const o of [-0.55, 0.55]) {
        const rail = rounded(offsetLoop(ringOf(rect, 0).slice().reverse(), -(CAR_SIDE + o)), true, 3.2 + o);
        rail.push(rail[0]);
        pen.strokeW(
          rail.map((p) => [p[0], p[1], 0.03] as V3),
          { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2, layer: 3 },
        );
      }
      pen.end();
    }
  }
  // people walk round every block on its sidewalk, both ways
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const rect: Rect = [COL_X[i], ROW_Y[j], COL_X[i] + BLOCK, ROW_Y[j] + BLOCK];
      const w1 = around(rect, CURB, -(LANE / 2 + QUAY_LINE), 1.0);
      const w2 = around(rect, CURB, -(LANE / 2 + QUAY_LINE), 1.0, true);
      for (let k = 0; k < 3; k++) movers.push(walker(w1, rng, start()));
      for (let k = 0; k < 3; k++) movers.push(walker(w2, rng, start()));
    }
  }
  // and stroll the axis: from the Gate, over the island, to the foot of the TV tower and back, keeping right
  const xw = COL_X[1] + 17;
  const xe = COL_X[2] + 9;
  const axis = new Route(
    rounded(
      [
        [xw, AXIS_Y + 1.15, CURB],
        [xe, AXIS_Y + 1.15, CURB],
        [xe, AXIS_Y - 1.15, CURB],
        [xw, AXIS_Y - 1.15, CURB],
      ],
      true,
      1.0,
    ),
    true,
  );
  for (let k = 0; k < 18; k++) movers.push(walker(axis, rng, start()));

  const road = placeFleet(wanted, born - 1);
  for (const h of road.placed) {
    if (h.kind === "tram") movers.push(tram(h.route, h.at, start(), h.speed));
    else movers.push(vehicle(h.route, rng, start(), h.kind, h.speed, h.at));
  }

  // the river: one long loop, downstream (north) along the east bank and back up along the west, turning far beyond the base
  const river = riverRoute();
  const fleet = riverBoats();
  const boats: (Omit<Hull, "at"> & { k: number })[] = [];
  for (let k = 0; k < 22; k++) {
    const kind = fleet[k % fleet.length];
    boats.push({ route: river, speed: 3, k: k % fleet.length, a: kind.len / 2 + 0.9, b: kind.beam / 2 + 0.12, span: kind.len > 8 ? 5 : 3 });
  }
  const water = placeFleet(boats, born - 1);
  for (const h of water.placed) movers.push(boat(h.route, rng, start(), fleet[h.k].turning, h.speed, h.at));
  return { clashes: road.clashes + water.clashes, dropped: road.dropped + water.dropped };
}

/** How far from the middle of the stream the boats keep, along the base (world y) and out in the reaches (distance u from the base). */
const LANE_E = RX1 - 4.6 - RIVER_MID;
const LANE_W = RIVER_MID - (RX0 + 4.6);
/** The middle arch of the Oberbaumbrücke takes both directions, close together. */
const LANE_ARCH = 2.3;
const LANE_OPEN = 6.5;
/** Where the boats turn round, out in each reach. */
const TURN_AT = TAIL - 96;

function riverRoute(): Route {
  const z = WATER;
  // from the middle of the stream out to the lane, by where along the river we are
  const laneAt = (y: number, lane: number): number => {
    // drawing in towards the Oberbaumbrücke's middle arch
    const k = clamp((y - (BRIDGE_Y[3] - 44)) / 36, 0, 1);
    return lane + (LANE_ARCH - lane) * (k * k * (3 - 2 * k));
  };
  const inReach = (u: number, from: number): number => {
    const k = clamp((u - 6) / 50, 0, 1);
    return from + (LANE_OPEN - from) * (k * k * (3 - 2 * k));
  };
  const east: V3[] = [];
  const west: V3[] = [];
  const pick = (pts: ReachPt[]) => pts.filter((p) => p.u > 0 && p.u <= TURN_AT && p.u % 9 === 0);
  // northbound, on the east side: up the south reach, through the city, out along the north reach
  const south = pick(REACH_S).reverse();
  const north = pick(REACH_N);
  // (the south reach's own cross vector points west, the north reach's east)
  for (const p of south) east.push([p.x - p.nx * inReach(p.u, LANE_ARCH), p.y - p.ny * inReach(p.u, LANE_ARCH), z]);
  for (let y = Y1; y >= Y0 - 1e-6; y -= 7) east.push([RIVER_MID + laneAt(y, LANE_E), y, z]);
  for (const p of north) east.push([p.x + p.nx * inReach(p.u, LANE_E), p.y + p.ny * inReach(p.u, LANE_E), z]);
  // southbound, on the west side
  for (const p of north.slice().reverse()) west.push([p.x - p.nx * inReach(p.u, LANE_W), p.y - p.ny * inReach(p.u, LANE_W), z]);
  for (let y = Y0; y <= Y1 + 1e-6; y += 7) west.push([RIVER_MID - laneAt(y, LANE_W), y, z]);
  for (const p of south.slice().reverse()) west.push([p.x + p.nx * inReach(p.u, LANE_ARCH), p.y + p.ny * inReach(p.u, LANE_ARCH), z]);
  return new Route(rounded([...east, ...west], true, 4.5), true);
}

// ---------------------------------------------------------------- night

/** Once it is dark: fireworks over the city. Each rocket climbs, bursts into a ring of sparks, and droops. */
function fireworks(movers: Mover[], b: Box): void {
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
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const shells: { at: number; x: number; y: number; z: number; r: number; c: [number, number, number]; c2: [number, number, number]; n: number; spin: number }[] = [];
  for (let i = 0; i < 20; i++) {
    // spread across the sky over the city, as the page sees it
    const px = rng.range(b.x0 + w * 0.1, b.x1 - w * 0.1);
    const py = rng.range(b.y0 + h * 0.08, b.y0 + h * 0.55);
    const z = rng.range(36, 54);
    const a = px * k;
    const bb = py + z;
    shells.push({
      at: 0.15 + i * 0.36 + rng.range(-0.12, 0.12),
      x: a + bb,
      y: bb - a,
      z,
      r: rng.range(11, 19),
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
function night(pen: Pen, b: Box, islets: IsletDef[]): void {
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
    if (onBase(x, y, 4) || (x > RX0 - 4 && x < RX1 + 4 && y > Y0 - 4 && y < Y1 + 8) || inWater(x, y, -3)) return false;
    for (const s of islets) if (Math.hypot(x - s.x, y - s.y) < 29) return false;
    return true;
  };
  for (let k = 0; k < 460; k++) {
    const [x, y] = world(rng.range(b.x0 - 30, b.x1 + 30), rng.range(b.y0 - 10, b.y1 + 6));
    if (!free(x, y)) continue;
    const r = rng.chance(0.12) ? rng.range(0.5, 0.75) : rng.range(0.18, 0.4);
    pen.card(x, y, z).poly(
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
  // the moon, over the top right of the city, clear of the river
  const [mx, my] = world(b.x0 + (b.x1 - b.x0) * 0.86, b.y0 + 12);
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

// ---------------------------------------------------------------- building it

function makeCtx(pen: Pen, rng: Rng, ox: number, oy: number, oz: number, t: number, movers: Mover[], at: { i: number; j: number }, span: number, stop: Stop): BlockCtx {
  const sweep = 1.25;
  const jit = new Rng(Math.floor(ox * 7 + oy * 13 + 5));
  const normal = (x: number, y: number) => t + 0.5 + ((x - ox + (y - oy)) / (2 * span)) * sweep + jit.range(-0.07, 0.07);
  const onGrid = at.i >= 0;
  const river = !onGrid ? null : at.i === AFTER ? "xp" : at.i === AFTER + 1 ? "xm" : null;
  const c: BlockCtx = {
    pen,
    rng,
    ox,
    oy,
    oz,
    t,
    done: t + 0.5 + sweep + 1.15,
    movers,
    quay: { xm: onGrid, xp: onGrid, ym: onGrid, yp: onGrid },
    i: at.i,
    j: at.j,
    river,
    waterZ: WATER - oz,
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
    stay: () => (stop.at == null ? null : { at: stop.at, leave: stop.leave ?? stop.at, closeup: stop.closeup ?? null }),
  };
  pen.reveal = normal;
  return c;
}

/** Paper extent of the fills from vertex `from` up to `to`. */
function extent(mesh: Mesh, from: number, to: number, into?: Box): Box {
  const e = into ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const fv = mesh.fv;
  for (let k = from * 6; k < to * 6; k += 6) {
    const px = paperX(fv[k], fv[k + 1]);
    const py = paperY(fv[k], fv[k + 1], fv[k + 2]);
    if (px < e.x0) e.x0 = px;
    if (px > e.x1) e.x1 = px;
    if (py < e.y0) e.y0 = py;
    if (py > e.y1) e.y1 = py;
  }
  return e;
}

export function buildCity(blocks: BlockDef[], islets: IsletDef[]): City {
  const mesh = new Mesh(1 << 18, 1 << 18);
  const pen = new Pen(mesh, 1971);
  const movers: Mover[] = [];
  const stops: Stop[] = [];
  let done = 0;

  const [reachFirst, reachLast] = water(pen);
  base(pen);

  const tOf = new Map<string, number>();
  for (const b of blocks) tOf.set(b.i + "," + b.j, b.t);
  const tAt = (i: number, j: number) => tOf.get(i + "," + j) ?? 0.5;

  for (const b of blocks) {
    const [ox, oy] = blockOrigin(b.i, b.j);
    const rng = new Rng(1000 + b.i * 31 + b.j * 97);
    pen.rng = rng.fork();
    const stop: Stop = { id: b.id, name: b.name, note: b.note, x: ox + BLOCK / 2, y: oy + BLOCK / 2, zoom: 1 };
    pen.push(ox, oy, CURB);
    const c = makeCtx(pen, rng, ox, oy, CURB, b.t, movers, b, BLOCK, stop);
    const normal = pen.reveal;
    slab(pen, c);
    pen.reveal = normal;
    for (const side of ["ym", "xm", "xp", "yp"] as const) {
      if (side === c.river) dressBank(c, side, b.gaps ?? [], b.quiet ?? []);
      else dressSidewalk(c, side);
    }
    crossings(c);
    b.build(c);
    pen.pop();
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  // the bridges: four that carry roads over the Spree (the last is the Oberbaumbrücke), and the two footbridges of the axis
  const brng = new Rng(77);
  pen.rng = brng.fork();
  BRIDGE_Y.forEach((y0, k) => {
    const rows = k === 0 ? [0] : k === BRIDGE_Y.length - 1 ? [ROWS - 1] : [k - 1, k];
    const t = Math.max(...rows.flatMap((j) => [tAt(AFTER, j), tAt(AFTER + 1, j)])) + 0.9;
    pen.reveal = () => t;
    pen.push(RX0, y0, 0);
    if (k === BRIDGE_Y.length - 1) oberbaum(pen, brng, RIVER, LANE);
    else roadBridge(pen, brng, RIVER, LANE, k);
    pen.pop();
    done = Math.max(done, t + 1.6);
  });

  for (const s of islets) {
    const rng = new Rng(5000 + Math.floor(s.x * 3 + s.y * 7));
    pen.rng = rng.fork();
    const oz = s.island ? CURB : WATER;
    const stop: Stop = { id: s.id, name: s.name, note: s.note, x: s.x, y: s.y, zoom: 1.2, quick: s.quick !== false };
    if (s.island) {
      islandSlab(pen, s.t);
      pen.reveal = () => s.t + 0.5;
      axisBridges(pen, rng);
    }
    pen.push(s.x - 20, s.y - 20, oz);
    const c = makeCtx(pen, rng, s.x - 20, s.y - 20, oz, s.t, movers, { i: -1, j: -1 }, 40, stop);
    const first = mesh.fn;
    s.build(c);
    pen.pop();
    // frame the island by what was actually drawn, unless its builder asked for a closer view
    const e = extent(mesh, first, mesh.fn);
    if (e.x1 > e.x0) {
      const fit = Math.min((TOUR_VIEW.w * 0.76) / (e.x1 - e.x0), (TOUR_VIEW.h * 0.74) / (e.y1 - e.y0), 1.9);
      if (fit > stop.zoom) {
        stop.zoom = fit;
        // the camera aims 4.5 units above the ground point it is given
        const a = (e.x0 + e.x1) / 2 / (2 * C30);
        const g = (e.y0 + e.y1) / 2 + 4.5;
        stop.x = a + g;
        stop.y = g - a;
      }
    }
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  // the U1 on its viaduct along the south edge, over the Oberbaumbrücke
  pen.rng = new Rng(4242);
  {
    const t = Math.max(tAt(AFTER, ROWS - 1), tAt(AFTER + 1, ROWS - 1)) + 1.2;
    pen.reveal = (x) => t + ((x - COL_X[AFTER]) / (GRID_X - COL_X[AFTER])) * 0.9;
    // (it sets off so as to be crossing as the camera reaches the block across the river, at the foot of the bridge)
    const far = blocks.find((b) => b.i === AFTER + 1 && b.j === ROWS - 1);
    const farStop = far ? stops.find((q) => q.id === far.id) : undefined;
    elevated(pen, movers, t + 2.2, () => farStop?.at ?? null);
    // and, in the river just upstream of the bridge, the Molecule Man and the swimming-pool barge
    beyond(pen, movers, t + 0.6, t + 2.6);
    done = Math.max(done, t + 2.8);
  }

  pen.rng = new Rng(31337);
  const tr = traffic(pen, movers, done - 0.6);

  // what the wide view frames: everything but the river's far reaches, which run off the page
  const bounds = extent(mesh, reachLast, mesh.fn, extent(mesh, 0, reachFirst));
  if (FRAME.fireworks) fireworks(movers, bounds);
  night(pen, bounds, islets);

  // when the last thing to be drawn in has all its colour (a second after it starts),
  // and how deep the drawing goes (the buffers are looked up afresh: they may have grown)
  let latest = 0;
  let lo = Infinity;
  let hi = -Infinity;
  const fv = mesh.fv;
  for (let k = 0; k < mesh.fn * 6; k += 6) {
    if (fv[k + 3] > latest) latest = fv[k + 3];
    const d = fv[k] + fv[k + 1] + fv[k + 2] + fv[k + 5];
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  const lv = mesh.lv;
  for (let k = 0; k < mesh.ln * 12; k += 12) {
    if (lv[k + 6] > latest) latest = lv[k + 6];
    for (let e = 0; e < 6; e += 3) {
      const d = lv[k + e] + lv[k + e + 1] + lv[k + e + 2] + lv[k + 9];
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
  }
  // room above for whatever flies (a kite, fireworks) and below for the stroke lift
  lo -= 20;
  hi += 70;
  return {
    mesh,
    movers,
    stops,
    bounds,
    done,
    settled: latest + 1.05,
    depth: { mid: (lo + hi) / 2, half: (hi - lo) / 2 },
    trafficClashes: tr.clashes,
    trafficDropped: tr.dropped,
  };
}
