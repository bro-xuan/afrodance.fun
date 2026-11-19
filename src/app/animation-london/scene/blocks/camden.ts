// Camden Lock: an islet off the top right corner of the page. The Regent's
// Canal cuts across it and steps down through a pair of locks side by side.
// One of them is at work: a painted narrowboat comes in on the low side, the
// gates shut behind it, the water lifts it, and it goes on its way. The other
// stands full, and people eat their lunch on its beams. Behind are the market
// hall with its clock, three shops with a giant boot, a dragon and a chair
// bolted to them, and the railway bridge with the place's name on it. In
// front are the food stalls, a band, and punks sitting on the canal wall.

import { RGB, Rng, V2, V3, clamp, hex, scaleRGB, smooth } from "../../engine/math";
import { F_NEON, F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen } from "../../engine/pen";
import { hullShape, wake } from "../boats";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, cyclist, drape, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  bench,
  bikeRow,
  bin,
  bollard,
  bricks,
  bulb,
  cafeTable,
  clock,
  dogOn,
  duckOn,
  hat,
  lamp,
  lightString,
  neonSign,
  office,
  person,
  pigeon,
  pub,
  railing,
  randomLook,
  speckle,
  stall,
  steps,
  swan,
  tree,
  windowAt,
} from "../props";

// ---------------------------------------------------------------- the lie of the land

/** Height of the ground above the paper, and of the canal above and below the locks. */
const G = 2.4;
const Z_HI = 1.95;
const Z_LO = 0.7;
/** Below the locks the south bank drops with the canal: the height of that lower quay, and where the step down is. */
const GL = 1.3;
const STEP_X = 27.6;
/** The islet: a rounded rectangle. */
const X0 = 1;
const X1 = 39;
const Y0 = 3;
const Y1 = 37;
const RAD = 5.5;
/** The canal's north and south walls, and the island between the two locks. */
const CY0 = 16.8;
const CY1 = 23.2;
const ISL0 = 19.2;
const ISL1 = 20.8;
const ISL_X0 = 12.4;
const ISL_X1 = 27;
/** The working lock, the nearer one: its top and bottom gates, the line down its middle, where a boat lies in it. */
const XG = 14;
const XB = 25.5;
const LOCK_Y = (ISL1 + CY1) / 2;
const BERTH = 19.8;
/** The lock that stands full: its top and bottom gates. */
const XGN = 15.7;
const XBN = 24.3;
/** Half a gate's thickness, the top of a gate, and the sills the gates shut against. */
const HALF = 0.11;
const GATE_TOP = G + 0.75;
const SILL_HI = 0.95;
const SILL_LO = 0.25;
const LEAF = 1.2;

/** The lane that runs under the railway, and the viaduct that carries it: back edge, depth, height of the track. */
const LANE0 = 4.8;
const LANE1 = 13.6;
const VY0 = 4.1;
const VD = 3.3;
const VH = 4.3;
const V_END = 35.4;

/** The footbridge over the canal below the locks: its west edge, its width, the north end of its ramp and the foot of its steps. */
const FB_X = 30.4;
const FB_W = 2.2;
const FB_Y0 = 14.6;
const FB_Y1 = 26.6;

const BRICK = hex("#a98363");
const BRICK_D = hex("#86654a");
const STOCK = hex("#c2a06c");
const STOCK_D = hex("#9e7f52");
const GATE = hex("#2e2c2e");
const BED = hex("#62717a");
const GIRDER = hex("#3d8a86");
const GIRDER_D = hex("#2c6663");

const RIPPLE = { len: 1.2, ang: -Math.PI / 4, jit: 0.08, bend: 0.22, color: C.waterInk, w: 0.07, kind: L_RIPPLE, alpha: 0.75 };

/** The islet's outline, `inset` units in from its edge. `waver` lets the edge wander a little. */
function outline(inset = 0, waver = false): V2[] {
  const x0 = X0 + inset;
  const x1 = X1 - inset;
  const y0 = Y0 + inset;
  const y1 = Y1 - inset;
  const r = RAD - inset * 0.6;
  const pts: V2[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= 6; k++) {
      const t = a0 + ((k / 6) * Math.PI) / 2;
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
  };
  const run = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.round(Math.hypot(bx - ax, by - ay) / 3.5);
    for (let k = 1; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  };
  arc(x1 - r, y1 - r, 0);
  run(x1 - r, y1, x0 + r, y1);
  arc(x0 + r, y1 - r, Math.PI / 2);
  run(x0, y1 - r, x0, y0 + r);
  arc(x0 + r, y0 + r, Math.PI);
  run(x0 + r, y0, x1 - r, y0);
  arc(x1 - r, y0 + r, Math.PI * 1.5);
  run(x1, y0 + r, x1, y1 - r);
  if (!waver) return pts;
  return pts.map(([x, y]) => {
    const t = Math.atan2(y - 20, x - 20);
    const k = 1 + 0.011 * Math.sin(5 * t + 0.7) + 0.006 * Math.sin(11 * t);
    return [20 + (x - 20) * k, 20 + (y - 20) * k] as V2;
  });
}

/** Is a point on the islet, at least `pad` in from its edge? */
function onLand(x: number, y: number, pad = 0): boolean {
  const x0 = X0 + pad;
  const x1 = X1 - pad;
  const y0 = Y0 + pad;
  const y1 = Y1 - pad;
  const r = RAD - pad * 0.6;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = clamp(x, x0 + r, x1 - r);
  const cy = clamp(y, y0 + r, y1 - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

/** The part of a polygon on one side of the line x = v (axis 0) or y = v (axis 1). */
function clip(poly: V2[], axis: 0 | 1, v: number, keepLess: boolean): V2[] {
  const out: V2[] = [];
  const inside = (p: V2) => (keepLess ? p[axis] <= v : p[axis] >= v);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = inside(a);
    if (ia) out.push(a);
    if (ia !== inside(b)) {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** The pieces the islet is cut into: land either side of the canal, and the canal above and below the locks. */
interface Shape {
  north: V2[];
  /** The south bank: the part level with the top of the locks, and the lower quay below them. */
  south: V2[];
  quay: V2[];
  upper: V2[];
  lower: V2[];
  /** Where the canal's walls start and end (x). */
  xw: number;
  xe: number;
}

function shape(): Shape {
  const shore = outline(0, true);
  const band = clip(clip(shore, 1, CY0, false), 1, CY1, true);
  // the band's two ends: the west one runs south to north, the east one north to south
  const west = band.filter((p) => p[0] < 20);
  const east = band.filter((p) => p[0] > 20);
  return {
    north: clip(shore, 1, CY0, true),
    south: clip(clip(shore, 1, CY1, false), 0, STEP_X, true),
    quay: clip(clip(shore, 1, CY1, false), 0, STEP_X, false),
    upper: [[XG - HALF, CY1], [XG - HALF, ISL1], [ISL_X0, ISL1], [ISL_X0, ISL0], [XGN - HALF, ISL0], [XGN - HALF, CY0], ...west.slice().reverse()],
    lower: [[XB + HALF, CY1], ...east.slice().reverse(), [XBN + HALF, CY0], [XBN + HALF, ISL0], [ISL_X1, ISL0], [ISL_X1, ISL1], [XB + HALF, ISL1]],
    xw: west[west.length - 1][0],
    xe: east[0][0],
  };
}

const look = (skin: RGB, hair: RGB, top: RGB, legs: RGB, long = false, cap: RGB | null = null): Look => ({ skin, hair, top, legs, long, hat: cap });

/** The outline of a fat stroke along a line of points, thinner at both ends. */
function ribbon(pts: V2[], hw: number): V2[] {
  const left: V2[] = [];
  const right: V2[] = [];
  const n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = hw * (0.35 + 0.65 * Math.sin((0.08 + (0.84 * i) / n) * Math.PI));
    left.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]);
    right.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------- the canal and its locks

/** The land itself, the water, and the brickwork of the locks. Everything here is in the islet's own frame, z = 0 on the paper. */
function land(c: LondonCtx, s: Shape): void {
  const { pen } = c;
  pen.extrude(s.north, 0, G, BRICK, { top: C.paving, crease: 30 });
  pen.extrude(s.south, 0, G, BRICK, { top: C.paving, crease: 30 });
  pen.extrude(s.quay, 0, GL, BRICK, { top: C.flag, crease: 30 });
  pen.box(ISL_X0, ISL0, 0, ISL_X1 - ISL_X0, ISL1 - ISL0, G, BRICK, { top: C.flag });
  // the canal above the locks and below them: slabs of water, so the cut end of the islet shows a slice of it
  pen.extrude(s.upper, 0, Z_HI, C.waterDeep, { top: C.water, kind: F_WATER, crease: 30, w: 0.08 });
  pen.extrude(s.lower, 0, Z_LO, C.waterDeep, { top: C.water, kind: F_WATER, crease: 30, w: 0.08 });
  // the lock that stands full, and the floor of the one that works (its water comes and goes)
  pen.floor(Z_HI, 0).rect(XGN + HALF, CY0, XBN - HALF, ISL0, C.water, { kind: F_WATER });
  pen.floor(0.3, 0).rect(XG - HALF, ISL1, XB + HALF, CY1, BED, { grain: 0.8 });

  pen.obj(() => {
    pen.floor(Z_HI, 1).ticks(s.xw + 0.8, CY0 + 0.4, ISL_X0 - 0.3, CY1 - 0.4, { ...RIPPLE, n: 34 });
    pen.floor(Z_HI, 1).ticks(XGN + 0.5, CY0 + 0.4, XBN - 0.5, ISL0 - 0.4, { ...RIPPLE, n: 9 });
    pen.floor(Z_LO, 1).ticks(ISL_X1 + 0.4, CY0 + 0.4, s.xe - 0.8, CY1 - 0.4, { ...RIPPLE, n: 34 });
  });

  // the canal's north wall: a stone coping, brick, and the line the water leaves
  pen.obj(() => {
    const len = s.xe - s.xw - 0.2;
    const f = pen.wall("y+", s.xw + 0.1, CY0 - 1, 0, len, 1);
    const at = (x: number) => x - s.xw - 0.1;
    f.rect(0, G - 0.28, len, G, C.graniteCap, { grain: 0.4 });
    f.seg(0, G - 0.28, len, G - 0.28, { w: 0.06 });
    f.rect(at(XBN + HALF), Z_LO, len, Z_LO + 0.5, BRICK_D, { grain: 0.8 });
    bricks(f, at(XBN + HALF) + 0.2, Z_LO + 0.55, len - 0.2, G - 0.36, BRICK_D, 0.7);
    f.seg(at(XBN + HALF), Z_LO + 0.03, len, Z_LO + 0.03, { w: 0.16, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
    f.seg(0, Z_HI + 0.03, at(XBN - HALF), Z_HI + 0.03, { w: 0.12, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
  });
  // the island: the working lock's wall, dark as far up as the water comes, with a ladder let into it
  pen.obj(() => {
    const len = ISL_X1 - ISL_X0;
    const f = pen.wall("y+", ISL_X0, ISL0, 0, len, ISL1 - ISL0);
    f.rect(0, G - 0.28, len, G, C.graniteCap, { grain: 0.4 });
    f.seg(0, G - 0.28, len, G - 0.28, { w: 0.06 });
    f.rect(XG - ISL_X0, Z_LO - 0.2, XB - ISL_X0, Z_HI + 0.06, BRICK_D, { grain: 0.8 });
    f.seg(XG - ISL_X0, Z_HI + 0.06, XB - ISL_X0, Z_HI + 0.06, { w: 0.07, color: C.hedge, kind: L_MARK, wobble: 0.6, alpha: 0.75 });
    bricks(f, 0.2, Z_HI + 0.12, len - 0.2, G - 0.34, BRICK_D, 0.6);
    const la = 21.6 - ISL_X0;
    for (const d of [-0.2, 0.2]) f.seg(la + d, 0.5, la + d, G - 0.05, { w: 0.06, color: C.metal, kind: L_MARK, wobble: 0, layer: 1 });
    for (let b = 0.7; b < G - 0.1; b += 0.3) f.seg(la - 0.2, b, la + 0.2, b, { w: 0.05, color: C.metal, kind: L_MARK, wobble: 0, layer: 1 });
    const nose = pen.wall("x+", ISL_X0, ISL0, 0, len, ISL1 - ISL0);
    nose.rect(0, G - 0.28, ISL1 - ISL0, G, C.graniteCap, { grain: 0.4 });
    nose.rect(0, Z_LO, ISL1 - ISL0, Z_LO + 0.5, BRICK_D, { grain: 0.8 });
    // the sill the working lock's top gates shut against
    const sill = pen.wall("x+", XG - HALF - 1, ISL1, 0, 1, CY1 - ISL1);
    sill.rect(0, 0.3, CY1 - ISL1, SILL_HI + 0.08, BRICK_D, { grain: 0.8 });
    bricks(sill, 0.1, 0.4, CY1 - ISL1 - 0.1, SILL_HI, BRICK, 1.2);
  }, 0.1);
}

/**
 * One leaf of a lock gate with its balance beam, in a frame whose origin is
 * the leaf's hinge and whose +x runs along the leaf. `sill` is the height the
 * leaf stands on; `tail` is how far the beam reaches back over the lockside.
 */
function leaf(pen: Pen, sill: number, tail: number): void {
  const h = GATE_TOP - sill;
  pen.box(0, -HALF, sill, LEAF, HALF * 2, h, GATE, { w: 0.09 });
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, 0, -HALF, sill, LEAF, HALF * 2);
    f.rect(0.06, h - 0.48, LEAF - 0.06, h - 0.3, C.white, { grain: 0.2 });
    for (const a of [0.4, 0.8]) f.seg(a, 0.12, a, h - 0.52, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0 });
  }
  // the beam, black with a white end, and the post of the paddle gear
  pen.box(-tail, -0.16, GATE_TOP, tail + LEAF + 0.06, 0.32, 0.3, GATE, { w: 0.09 });
  pen.box(-tail - 0.03, -0.19, GATE_TOP - 0.03, 0.62, 0.38, 0.36, C.white, { w: W_FINE });
  pen.pole([LEAF * 0.6, 0, GATE_TOP + 0.3], [LEAF * 0.6, 0, GATE_TOP + 1.0], 0.09, C.white);
  pen.card(LEAF * 0.6, 0, GATE_TOP + 1.0).circle(0, 0.05, 0.11, C.red, { seg: 6, grain: 0, outline: true, w: 0.03 });
}

/** The gates of the lock that stands full: shut, all four. */
function stillGates(pen: Pen): void {
  const at = (x: number, y: number, deg: number, sill: number, tail: number) => {
    pen.push(x, y, 0, deg);
    pen.obj(() => leaf(pen, sill, tail), 0.2);
    pen.pop();
  };
  at(XBN, CY0, 90, SILL_LO, 2.3);
  at(XBN, ISL0, 270, SILL_LO, 1.1);
  at(XGN, CY0, 90, SILL_HI, 2.3);
  at(XGN, ISL0, 270, SILL_HI, 1.1);
}

// ---------------------------------------------------------------- the footbridge and the step down

/** Height of the footbridge's deck above the paper at local y: a ramp up from the north quay, a hump over the canal, steps down to the lower quay. */
function deckZ(y: number): number {
  if (y <= FB_Y0) return G;
  if (y >= FB_Y1) return GL;
  const hump = (v: number) => G + 0.06 + 1.5 * Math.pow(Math.max(0, Math.sin((Math.PI * (25.4 - v)) / 10.8)), 1.15);
  if (y <= CY1) return hump(y);
  return hump(CY1) + (GL - hump(CY1)) * ((y - CY1) / (FB_Y1 - CY1));
}

/** The iron footbridge that humps over the canal below the locks, black with its ribs picked out in white. */
function footbridge(pen: Pen): void {
  const len = FB_Y1 - FB_Y0;
  // seen from the east: a runs north from the foot of the steps, b is height above the paper
  const top = (a: number) => deckZ(FB_Y1 - a);
  const a0 = FB_Y1 - CY1;
  const a1 = FB_Y1 - CY0;
  const mid = (a0 + a1) / 2;
  const ra = (a1 - a0) / 2;
  const spring = G - 0.45;
  const rb = top(mid) - 0.3 - spring;
  const under = (a: number) => spring + rb * Math.sqrt(Math.max(0, 1 - Math.pow((a - mid) / ra, 2)));
  // where the deck is sampled: evenly along the hump and the ramp, then down the steps
  const along: number[] = [];
  for (let i = 1; i <= 16; i++) along.push(len - ((len - a0) * i) / 16);
  for (let i = 1; i < 4; i++) along.push(a0 - (a0 * i) / 4);
  pen.begin();
  const prof: V2[] = [
    [0, GL],
    [a0, GL],
  ];
  const na = 14;
  for (let i = 1; i < na; i++) {
    const a = a0 + ((a1 - a0) * i) / na;
    prof.push([a, under(a)]);
  }
  prof.push([a1, G], [len, G]);
  for (const a of along) prof.push([a, top(a)]);
  pen.wall("x+", FB_X, FB_Y0, 0, 0, len).extrude(prof, FB_W, GATE, { crease: 25, w: 0.1 });
  // the boards of the deck, and the treads of the steps
  const edge = [len, ...along, 0];
  for (let i = 0; i + 1 < edge.length; i++) {
    const ya = FB_Y1 - edge[i];
    const yb = FB_Y1 - edge[i + 1];
    pen.fill(
      [
        [FB_X + 0.22, ya, deckZ(ya) + 0.012],
        [FB_X + FB_W - 0.22, ya, deckZ(ya) + 0.012],
        [FB_X + FB_W - 0.22, yb, deckZ(yb) + 0.012],
        [FB_X + 0.22, yb, deckZ(yb) + 0.012],
      ],
      yb > CY1 + 0.01 ? C.stone : C.wood,
      { layer: 1, grain: 0.7 },
    );
  }
  for (let k = 1; k < 8; k++) {
    const y = CY1 + ((FB_Y1 - CY1) * k) / 8;
    pen.stroke(
      [
        [FB_X + 0.22, y, deckZ(y) + 0.03],
        [FB_X + FB_W - 0.22, y, deckZ(y) + 0.03],
      ],
      { w: 0.06, color: C.inkSoft, kind: L_MARK, wobble: 0.2 },
    );
  }
  // the east face: the arch rib, the line of the deck, and the uprights between them
  const f = pen.wall("x+", FB_X, FB_Y0, 0, FB_W, len);
  const rib: V2[] = [];
  for (let i = 0; i <= na; i++) {
    const a = a0 + ((a1 - a0) * i) / na;
    rib.push([a, under(a) + 0.09]);
  }
  f.line(rib, { w: 0.13, color: C.white, kind: L_MARK, wobble: 0.2, layer: 1 });
  f.line(
    edge.map((a) => [a, top(a) - 0.1] as V2),
    { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.2, layer: 1 },
  );
  for (let a = a0 + 0.3; a < a1 - 0.2; a += 0.42) {
    if (top(a) - under(a) < 0.5) continue;
    f.seg(a, under(a) + 0.16, a, top(a) - 0.16, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  pen.end();
  for (const x of [FB_X + 0.08, FB_X + FB_W - 0.08]) {
    railing(
      pen,
      edge.map((a) => [x, FB_Y1 - a, top(a)] as V3),
      0.85,
      GATE,
      0.6,
    );
  }
  // bulbs along the downstream rail, for the evening
  pen.obj(() => {
    for (const a of edge) if (a > 0.4 && a < len - 0.4) bulb(pen, FB_X + FB_W - 0.04, FB_Y1 - a, top(a) + 0.95, 0.17);
  });
}

/** Where the south bank drops beside the locks: the wall, a flight of steps down to the lower quay, and a rail along the top. */
function stepDown(pen: Pen): void {
  const south = 36.6;
  pen.obj(() => {
    const len = south - CY1;
    const f = pen.wall("x+", STEP_X - 1, CY1, GL, 1, len);
    f.rect(0, G - GL - 0.26, len, G - GL, C.graniteCap, { grain: 0.4 });
    f.seg(0, G - GL - 0.26, len, G - GL - 0.26, { w: 0.06 });
    bricks(f, 0.2, 0.08, len - 2.4, G - GL - 0.32, BRICK_D, 1.1);
  });
  pen.push(STEP_X, 25.3, GL, 270);
  steps(pen, 0, 0, 0, 1.6, 1.8, G - GL, 5, C.stone);
  pen.pop();
  railing(
    pen,
    [
      [STEP_X - 0.14, 25.45, G],
      [STEP_X - 0.14, 35.9, G],
    ],
    0.85,
    C.iron,
    1.2,
  );
}

// ---------------------------------------------------------------- the railway

/** The viaduct along the back of the islet, and the girder bridge that carries it over the lane, with the name on it. */
function railway(c: LondonCtx): void {
  const { pen } = c;
  const top = VH;
  pen.obj(() => {
    pen.box(3.6, VY0, 0, LANE0 - 3.6, VD, top, STOCK, { top: C.ballast });
    const f = pen.wall("y+", 3.6, VY0, 0, LANE0 - 3.6, VD);
    f.rect(0, top - 0.34, LANE0 - 3.6, top, C.graniteCap, { grain: 0.5 });
  });
  // east of the lane: brick arches all the way
  pen.obj(() => {
    const len = V_END - LANE1;
    pen.box(LANE1, VY0, 0, len, VD, top, STOCK, { top: C.ballast });
    const f = pen.wall("y+", LANE1, VY0, 0, len, VD);
    f.rect(0, top - 0.34, len, top, C.graniteCap, { grain: 0.5 });
    f.seg(0, top - 0.34, len, top - 0.34, { w: 0.06 });
    const bay = (len - 1.2) / 5;
    for (let k = 0; k < 5; k++) {
      const a = 1.2 + k * bay;
      const r = (bay - 0.9) / 2;
      const arch: V2[] = [
        [a, 0],
        [a + 2 * r, 0],
        [a + 2 * r, 1.5],
      ];
      for (let q = 1; q < 7; q++) arch.push([a + r + Math.cos((q / 7) * Math.PI) * r, 1.5 + Math.sin((q / 7) * Math.PI) * r]);
      arch.push([a, 1.5]);
      f.poly(arch, C.brickBrown, { outline: true, w: 0.08, grain: 0.7 });
    }
    bricks(f, 0.2, 0.2, len - 0.2, top - 0.5, STOCK_D, 0.22);
    const e = pen.wall("x+", LANE1, VY0, 0, len, VD);
    e.rect(0, top - 0.34, VD, top, C.graniteCap, { grain: 0.5 });
  }, 0.08);
  // the bridge over the lane: a deck slung between two deep plate girders, the nearer one lettered
  pen.obj(() => {
    const x = LANE0 - 0.6;
    const len = LANE1 - LANE0 + 1.2;
    pen.box(x, VY0 + 0.3, top - 0.55, len, VD - 0.6, 0.55, GIRDER_D, { top: C.ballast, w: W_THIN });
    pen.box(x, VY0 + 0.02, 3.0, len, 0.3, 1.95, GIRDER, { w: 0.1 });
    pen.box(x, VY0 + VD - 0.32, 3.0, len, 0.3, 1.95, GIRDER, { w: 0.1 });
    const f = pen.wall("y+", x, VY0 + VD - 0.32, 3.0, len, 0.3);
    f.rect(0, 0, len, 0.2, GIRDER_D, { grain: 0.4 });
    f.rect(0, 1.75, len, 1.95, GIRDER_D, { grain: 0.4 });
    for (const a of [0.3, len - 0.3]) f.seg(a, 0.2, a, 1.75, { w: 0.07, color: GIRDER_D, kind: L_MARK, wobble: 0 });
    f.text("CAMDEN LOCK", len / 2 - 0.2, 0.52, 0.86, { align: "c", color: C.redDark, kind: L_MARK, w: 0.2, wobble: 0.2, layer: 1 });
    f.text("CAMDEN LOCK", len / 2 - 0.25, 0.57, 0.86, { align: "c", color: C.yellow, kind: L_MARK, w: 0.14, wobble: 0.2, layer: 2, bias: 0.2 });
    f.text("CAMDEN LOCK", len / 2 - 0.25, 0.57, 0.86, { align: "c", kind: L_LIGHT, w: 0.16, wobble: 0, layer: 3 });
  }, 0.25);
  // the rails, and the line trailing off both ends as an unfinished sketch
  pen.obj(() => {
    for (const y of [VY0 + VD / 2 - 0.55, VY0 + VD / 2 + 0.55]) {
      pen.stroke(
        [
          [3.7, y, top + 0.04],
          [V_END - 0.1, y, top + 0.04],
        ],
        { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2 },
      );
      for (const [from, dir] of [
        [3.6, -1],
        [V_END, 1],
      ]) {
        for (let k = 0; k < 6; k++) {
          pen.stroke(
            [
              [from + dir * (0.3 + k * 1.1), y, top + 0.04],
              [from + dir * (0.3 + k * 1.1 + 0.7), y, top + 0.04],
            ],
            { w: 0.07, color: C.inkSoft, kind: L_MARK, wobble: 1.4, alpha: 0.85 * (1 - k / 6.5) },
          );
        }
      }
    }
    for (let x = 4.0; x < V_END - 0.2; x += 1.05) {
      pen.stroke(
        [
          [x, VY0 + VD / 2 - 0.85, top + 0.02],
          [x, VY0 + VD / 2 + 0.85, top + 0.02],
        ],
        { w: 0.11, color: C.woodDark, kind: L_MARK, wobble: 0, alpha: 0.8 },
      );
    }
  }, 0.35);
}

/** One carriage of the train that crosses the viaduct, centred on the origin. */
function carriage(pen: Pen): void {
  const L = 5.0;
  const W = 1.9;
  pen.box(-L / 2, -W / 2, 0.3, L, W, 2.0, C.white, { top: C.slateLight, w: 0.1 });
  for (const side of ["y+", "y-", "x+", "x-"] as const) {
    const f = pen.wall(side, -L / 2, -W / 2, 0.3, L, W);
    const w = side.startsWith("y") ? L : W;
    f.rect(0, 0, w, 0.5, C.navy, { grain: 0.5 });
    f.rect(0, 0.5, w, 0.66, C.orange, { grain: 0.4 });
    if (side.startsWith("y")) {
      f.rect(0.3, 0.95, w - 0.3, 1.65, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
      for (const a of [1.25, 3.75]) f.rect(a - 0.4, 0.14, a + 0.4, 1.76, C.orange, { outline: true, w: W_FINE, layer: 1, grain: 0.4 });
    } else f.rect(0.25, 0.9, w - 0.25, 1.7, C.glass, { outline: true, w: W_FINE, glow: 0.85 });
  }
  pen.box(-L / 2 + 0.5, -W / 2 + 0.15, 0, 1.0, W - 0.3, 0.3, C.charcoal, { edges: false });
  pen.box(L / 2 - 1.5, -W / 2 + 0.15, 0, 1.0, W - 0.3, 0.3, C.charcoal, { edges: false });
}

// ---------------------------------------------------------------- the buildings behind the canal

/** The market hall: brick, a slate roof with a strip of glass along the ridge, and a clock tower on the corner. */
function hall(c: LondonCtx): void {
  const { pen, rng } = c;
  const x = 17.6;
  const y = 8.4;
  const w = 9.4;
  const d = 5.2;
  const h = 6.0;
  pen.push(x, y, 0);
  office(pen, rng, w, d, h, { style: "brick", plant: false, lit: 0.75, wall: STOCK });
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, 0, w, d);
    // the way in, and the name over it
    const door: V2[] = [
      [2.6, 0],
      [4.4, 0],
      [4.4, 1.6],
    ];
    for (let q = 1; q < 7; q++) door.push([3.5 + Math.cos((q / 7) * Math.PI) * 0.9, 1.6 + Math.sin((q / 7) * Math.PI) * 0.9]);
    door.push([2.6, 1.6]);
    f.poly(door, hex("#4b3a30"), { outline: true, w: W_THIN, layer: 3, grain: 0.6, glow: 0.35 });
    f.rect(0.5, 2.86, 6.9, 3.52, C.black, { outline: true, w: W_FINE, layer: 3, grain: 0.4 });
    f.text("CAMDEN MARKET", 3.7, 3.03, 0.36, { align: "c", color: C.gold, kind: L_MARK, w: 0.065, wobble: 0.3, layer: 4 });
  }, 0.1);
  pen.obj(() => {
    pen.gable(-0.2, -0.2, h, w + 0.4, d + 0.4, 1.2, "x", C.slate, { gable: STOCK });
    pen.box(0.8, d / 2 - 0.45, h + 1.0, 4.6, 0.9, 0.5, C.glassPale, { top: C.glassLight, w: W_THIN, glow: 0.8, grain: 0.3 });
  }, 0.2);
  // the clock tower
  const tx = w - 2.3;
  const ty = d - 2.1;
  const th = 9.4;
  pen.obj(() => {
    pen.box(tx, ty, 0, 2.4, 2.4, th, STOCK_D);
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, tx, ty, 0, 2.4, 2.4);
      f.rect(0, 6.5, 2.4, 6.8, C.cream, { grain: 0.3 });
      f.seg(0, 6.5, 2.4, 6.5, { w: W_FINE });
      clock(f, 1.2, 8.0, 0.82, 12, 40);
      windowAt(f, 0.75, 3.6, 1.65, 5.4, rng.chance(0.7), C.cream);
      f.rect(0.7, 0.3, 1.7, 2.3, hex("#4b3a30"), { outline: true, w: W_FINE, grain: 0.6 });
      f.rect(0, th - 0.3, 2.4, th, C.cream, { grain: 0.3, layer: 1 });
    }
  }, 0.3);
  pen.obj(() => {
    pen.pyramid(tx - 0.2, ty - 0.2, th, 2.8, 2.8, 2.0, C.copper);
    pen.pole([tx + 1.2, ty + 1.2, th + 2.0], [tx + 1.2, ty + 1.2, th + 3.0], 0.07, C.gold, { ink: false });
    const k = pen.card(tx + 1.2, ty + 1.2, th + 2.6);
    k.poly(
      [
        [-0.5, 0.06],
        [0.3, 0.06],
        [0.3, 0.2],
        [0.62, 0],
        [0.3, -0.2],
        [0.3, -0.06],
        [-0.5, -0.06],
      ],
      C.gold,
      { outline: true, w: 0.035, grain: 0.2, sway: 0.08 },
    );
  }, 0.45);
  pen.pop();
}

/** Three shops in loud colours, each with something enormous bolted to its front, and a mural on the end wall. */
function shops(c: LondonCtx): void {
  const { pen, rng } = c;
  const y = 8.6;
  const d = 4.8;
  const w = 2.8;
  const each: [number, number, RGB, string, RGB][] = [
    [28.2, 5.9, hex("#f0c236"), "PUNK", hex("#2f2d31")],
    [31.0, 6.4, hex("#c2402f"), "TATTOO", C.neonPink],
    [33.8, 5.6, hex("#35a5a0"), "RETRO", hex("#f4efe2")],
  ];
  each.forEach(([x, h, wall, name, fascia], i) => {
    pen.push(x, y, 0);
    pen.obj(() => {
      pen.box(0, 0, 0, w, d, h, wall, { top: C.charcoal });
      const f = pen.wall("y+", 0, 0, 0, w, d);
      // the shop front: a window full of light, a door, the name
      f.rect(0.25, 0.4, 1.7, 2.2, C.glassLight, { outline: true, w: W_THIN, glow: 0.9, grain: 0.3 });
      f.rect(1.85, 0, 2.55, 2.2, scaleRGB(wall, 0.7), { outline: true, w: W_THIN });
      if (i === 1) neonSign(f, name, w / 2, 2.5, 0.34, fascia, 1);
      else {
        f.rect(0.12, 2.36, w - 0.12, 3.0, fascia, { outline: true, w: W_FINE, grain: 0.3 });
        f.text(name, w / 2, 2.5, 0.36, { align: "c", color: i === 0 ? C.yellow : C.redDark, kind: L_MARK, w: 0.075, wobble: 0.3, layer: 1 });
      }
      for (const a of [0.35, 1.65]) windowAt(f, a, h - 1.75, a + 0.8, h - 0.5, rng.chance(0.6), C.white);
      f.rect(0, h - 0.26, w, h, scaleRGB(wall, 1.25), { grain: 0.3 });
    });
    if (i === 0) {
      // a boot the height of a storey
      pen.obj(() => {
        const f = pen.wall("y+", 0, 0, 0, w, d);
        f.extrude(
          [
            [0.4, 3.15],
            [2.4, 3.15],
            [2.46, 3.5],
            [2.25, 3.92],
            [1.68, 4.08],
            [1.5, 4.5],
            [1.48, 5.5],
            [0.52, 5.5],
            [0.48, 4.3],
          ],
          0.55,
          hex("#8f2430"),
          { w: 0.1, crease: 25 },
        );
        const g = pen.wall("y+", 0, 0, 0, w, d + 0.55);
        g.rect(0.4, 3.15, 2.44, 3.36, C.black, { grain: 0.3 });
        g.seg(0.5, 3.46, 2.36, 3.46, { w: 0.07, color: C.yellow, kind: L_MARK, wobble: 0.3, layer: 1 });
        g.line(
          [
            [1.62, 4.1],
            [1.9, 3.7],
            [2.3, 3.62],
          ],
          { w: 0.05, color: hex("#5e141d"), kind: L_MARK, wobble: 0.3, layer: 1 },
        );
        for (let b = 4.25; b < 5.4; b += 0.2) g.seg(1.1, b, 1.42, b + 0.07, { w: 0.06, color: C.yellow, kind: L_MARK, wobble: 0, layer: 1 });
        g.rect(0.56, 5.3, 0.74, 5.64, C.yellow, { outline: true, w: 0.03, layer: 1, grain: 0.2 });
      }, 0.25);
    } else if (i === 1) {
      // a dragon climbing the wall, breathing a little fire
      pen.obj(() => {
        const f = pen.wall("y+", 0, 0, 0, w, d);
        const green = hex("#4fae5c");
        const spine: V2[] = [];
        for (let k = 0; k <= 12; k++) {
          const u = k / 12;
          spine.push([0.35 + 1.5 * u + 0.1 * Math.sin(u * 5), 3.3 + 2.25 * u + 0.42 * Math.sin(u * Math.PI * 2.5)]);
        }
        f.poly(
          [
            [1.05, 4.5],
            [0.38, 5.9],
            [1.3, 5.5],
          ],
          C.purple,
          { outline: true, w: W_FINE, layer: 2, grain: 0.4 },
        );
        f.poly(ribbon(spine, 0.27), green, { outline: true, w: W_THIN, layer: 3, grain: 0.4 });
        f.line(spine.slice(1, -1), { w: 0.07, color: hex("#c9e27a"), kind: L_MARK, wobble: 0.3, layer: 4 });
        const [ha, hb] = spine[spine.length - 1];
        f.poly(
          [
            [ha - 0.2, hb - 0.22],
            [ha + 0.5, hb - 0.12],
            [ha + 0.56, hb + 0.1],
            [ha + 0.12, hb + 0.34],
            [ha - 0.22, hb + 0.14],
          ],
          green,
          { outline: true, w: W_THIN, layer: 5, grain: 0.4 },
        );
        f.circle(ha + 0.16, hb + 0.12, 0.07, C.yellow, { layer: 6, seg: 6, grain: 0 });
        f.poly(
          [
            [ha + 0.56, hb - 0.02],
            [ha + 0.86, hb + 0.3],
            [ha + 0.72, hb + 0.04],
            [ha + 0.9, hb - 0.12],
          ],
          C.orange,
          { outline: true, w: 0.035, layer: 5, grain: 0.2, glow: 1, kind: F_NEON },
        );
      }, 0.25);
    } else {
      // a red chair, sitting on a ledge as if somebody might want it
      pen.obj(() => {
        const z = 3.3;
        pen.box(0.45, d, z - 0.12, 1.9, 0.95, 0.12, C.white, { w: W_FINE });
        for (const a of [0.75, 1.93]) pen.pole([a, d + 0.74, z], [a, d + 0.74, z + 0.8], 0.13, C.red);
        pen.box(0.7, d + 0.02, z + 0.8, 1.3, 0.8, 0.13, C.red, { w: W_THIN });
        pen.box(0.7, d + 0.02, z + 0.93, 1.3, 0.12, 1.15, C.red, { w: W_THIN });
        const f = pen.wall("y+", 0.7, d + 0.02, z + 0.93, 1.3, 0.12);
        for (const a of [0.33, 0.65, 0.97]) f.seg(a, 0.1, a, 1.0, { w: 0.05, color: C.redDark, kind: L_MARK, wobble: 0 });
      }, 0.25);
    }
    pen.pop();
  });
  // the end wall has been painted, and is being painted again
  pen.obj(() => {
    const f = pen.wall("x+", 33.8, y, 0, w, d);
    const paint = [C.pink, C.yellow, hex("#58b7a3"), C.purple, C.orange, C.sky];
    for (let k = 0; k < 6; k++) f.circle(0.75 + k * 0.66, 1.7 + (k % 2) * 0.55 + rng.range(-0.1, 0.1), 0.62, paint[k], { layer: 1 + k * 0.1, grain: 0.4, seg: 10 });
    f.text("CAMDEN", d / 2, 1.62, 0.72, { align: "c", color: C.black, kind: L_MARK, w: 0.26, wobble: 0.5, layer: 2 });
    f.text("CAMDEN", d / 2 - 0.04, 1.66, 0.72, { align: "c", color: C.white, kind: L_MARK, w: 0.13, wobble: 0.5, layer: 3, bias: 0.3 });
    f.line(
      [
        [0.5, 0.75],
        [1.5, 0.95],
        [2.6, 0.7],
        [3.6, 0.95],
        [4.3, 0.75],
      ],
      { w: 0.1, color: C.neonBlue, kind: L_MARK, wobble: 0.8, layer: 2 },
    );
  }, 0.35);
  const sprayer = look(SKIN[2], C.black, C.charcoal, hex("#3c3a3d"), false, C.red);
  pen.obj(() => {
    person(pen, 37.55, 11.2, 0, sprayer, "wave", true);
    pen.card(37.55, 11.2, 0, true).rect(0.56, 1.84, 0.72, 2.12, C.metal, { outline: true, w: 0.03, layer: 5, grain: 0 });
  });
}

// ---------------------------------------------------------------- boats and ducks

interface Livery {
  cabin: RGB;
  panel: RGB;
  trim: RGB;
  name: string;
  seed: number;
}

/** A narrowboat: long, low and painted, with a garden on the roof. Bow towards local +x, waterline at z = 0. */
function narrowboat(pen: Pen, o: Livery, moving: boolean): void {
  const rng = new Rng(o.seed);
  pen.extrude(hullShape(8.6, 1.5, 0.14), -0.1, 0.42, C.black, { top: C.woodDark, crease: 28, w: 0.1 });
  pen.extrude(hullShape(8.64, 1.55, 0.14), 0.27, 0.42, o.trim, { crease: 28, w: W_FINE });
  const x0 = -2.9;
  const len = 5.2;
  const w = 1.14;
  pen.box(x0, -w / 2, 0.42, len, w, 0.9, o.cabin, { top: scaleRGB(o.cabin, 0.82), w: W_THIN });
  for (const side of ["y+", "y-", "x+", "x-"] as const) {
    const f = pen.wall(side, x0, -w / 2, 0.42, len, w);
    if (side.startsWith("x")) {
      f.rect(0.28, 0.1, w - 0.28, 0.78, C.woodDark, { outline: true, w: W_FINE });
      continue;
    }
    // two painted panels, two portholes, and her name between them
    for (const a of [0.2, 3.95]) {
      f.rect(a, 0.12, a + 1.05, 0.78, o.panel, { outline: true, w: W_FINE, grain: 0.4 });
      f.poly(
        [
          [a + 0.52, 0.2],
          [a + 0.86, 0.45],
          [a + 0.52, 0.7],
          [a + 0.18, 0.45],
        ],
        C.yellow,
        { layer: 1, grain: 0.2 },
      );
      f.circle(a + 0.52, 0.45, 0.1, C.red, { layer: 2, seg: 6, grain: 0 });
    }
    for (const a of [1.55, 3.65]) f.circle(a, 0.5, 0.17, C.glass, { outline: true, w: 0.045, ink: C.gold, glow: 0.9, seg: 9, grain: 0.3 });
    f.rect(1.86, 0.2, 3.34, 0.7, C.cream, { outline: true, w: W_FINE, grain: 0.3 });
    f.text(o.name, 2.6, 0.33, 0.25, { align: "c", color: o.cabin, kind: L_MARK, w: 0.05, wobble: 0.2, layer: 1 });
  }
  // the roof: flower pots, a boat pole, the stove's chimney, a painted water can, and the dog
  for (let i = 0; i < 4; i++) {
    const k = pen.card(-2.4 + i * 0.5, i % 2 === 0 ? 0.26 : -0.26, 1.32);
    k.rect(-0.14, 0, 0.14, 0.2, C.tile, { outline: true, w: 0.035 });
    k.circle(0, 0.34, 0.19, rng.pick([C.red, C.pink, C.yellow]), { outline: true, w: 0.035, seg: 7, layer: 1, sway: 0.05 });
  }
  pen.box(-0.3, 0.3, 1.32, 2.4, 0.1, 0.06, C.wood, { w: 0.04 });
  pen.pole([1.95, -0.28, 1.32], [1.95, -0.28, 1.9], 0.13, C.black);
  pen.card(1.95, -0.28, 1.32).rect(-0.075, 0.42, 0.075, 0.5, C.gold, { grain: 0 });
  pen.cyl(1.35, 0.3, 1.32, 0.15, 0.3, C.red, { seg: 6, w: 0.04 });
  dogOn(pen.card(0.55, -0.12, 1.32), hex("#b98352"), { s: 0.72 });
  // somebody steering at the stern, somebody keeping a look-out at the bow
  person(pen, -3.55, 0.06, 0.42, look(SKIN[1], HAIR[7], o.trim, C.navy, false, C.navy), "bust", false);
  pen.pole([-4.22, 0, 0.72], [-3.3, -0.26, 1.18], 0.07, C.wood, { ink: false });
  person(pen, 2.95, 0, 0.42, randomLook(rng), "bust", true, 0.8);
  if (moving) wake(pen, -4.5, 0.62);
}

// ---------------------------------------------------------------- the ground, and what stands still on it

/** Paving, towpath and market square, laid on top of the land. */
function ground(c: LondonCtx, s: Shape): void {
  const { pen } = c;
  const g1 = pen.floor(G, 1);
  const g2 = pen.floor(G, 2);
  const g3 = pen.floor(G, 3);
  const xa = s.xw + 0.5;
  const xb = s.xe - 0.5;
  // the lane under the railway, and the quay it comes out on
  g1.poly(
    [
      [LANE0, 3.75],
      [LANE1, 3.75],
      [LANE1, 13.6],
      [xb, 13.6],
      [xb, CY0 - 0.42],
      [xa, CY0 - 0.42],
      [xa, 14.2],
      [LANE0, 14.2],
    ],
    C.flag,
    { grain: 0.6 },
  );
  g2.rect(LANE0 + 0.5, 3.75, LANE1 - 0.5, 13.4, C.street, { grain: 0.8 });
  speckle(g3, LANE0 + 0.7, 3.9, LANE1 - 0.7, 13.2, C.streetDark, 0.5);
  speckle(g3, LANE1 + 0.3, 13.8, xb - 0.3, CY0 - 0.6, C.flagDark, 0.3);
  // stone edging along both sides of the canal
  g2.rect(xa, CY0 - 0.42, xb, CY0, C.graniteCap, { grain: 0.4 });
  g3.seg(xa, CY0 - 0.42, xb, CY0 - 0.42, { w: 0.05 });
  g2.rect(xa, CY1, STEP_X, CY1 + 0.42, C.graniteCap, { grain: 0.4 });
  g3.seg(xa, CY1 + 0.42, STEP_X, CY1 + 0.42, { w: 0.05 });
  // the lockside and the towpath, as far as the step down
  g1.rect(xa, CY1 + 0.42, STEP_X, 26.5, C.flag, { grain: 0.6 });
  g3.seg(xa, 26.5, STEP_X, 26.5, { w: 0.05, color: C.flagDark, kind: L_MARK });
  for (const y of [25.3, 26.4]) g3.seg(3.0, y, 26.9, y, { w: 0.05, color: C.roadLine, kind: L_MARK, wobble: 0.3, alpha: 0.9 });
  speckle(g3, xa + 0.3, CY1 + 0.6, STEP_X - 0.3, 25.2, C.flagDark, 0.3);
  // the market square
  g1.poly(clip(clip(outline(0.9), 1, 26.5, false), 0, STEP_X, true), C.plaza, { grain: 0.7 });
  speckle(g3, 2.4, 26.8, STEP_X - 0.3, 36, C.streetDark, 0.3, (a, b) => onLand(a, b, 1.2));
  // the lower quay
  const q2 = pen.floor(GL, 2);
  q2.rect(STEP_X, CY1, xb, CY1 + 0.42, C.graniteCap, { grain: 0.4 });
  pen.floor(GL, 3).seg(STEP_X, CY1 + 0.42, xb, CY1 + 0.42, { w: 0.05 });
  speckle(q2, STEP_X + 0.4, CY1 + 0.7, 38.4, 36, C.flagDark, 0.3, (a, b) => onLand(a, b, 0.9));
}

/** A weeping willow, trailing over the water. */
function willow(pen: Pen, rng: Rng, x: number, y: number): void {
  const green = hex("#a9d77f");
  pen.begin();
  pen.pole([x, y, 0], [x, y, 2.5], 0.34, C.trunk);
  const k = pen.card(x, y, 2.0);
  const crown: V2[] = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    crown.push([Math.cos(t) * 1.9 * (1 + 0.05 * Math.sin(3 * t)), 1.5 + Math.sin(t) * 1.2]);
  }
  k.poly(crown, green, { outline: true, w: 0.1, sway: 0.3, layer: 1 });
  for (let i = 0; i < 11; i++) {
    const a = -1.7 + i * 0.34;
    const top = 1.5 - 0.9 * Math.sqrt(Math.max(0, 1 - Math.pow(a / 1.9, 2)));
    const len = rng.range(1.1, 1.9);
    k.line(
      [
        [a, top + 0.25],
        [a + rng.range(-0.08, 0.08), top - len * 0.5],
        [a + rng.range(-0.12, 0.12), top - len],
      ],
      { w: 0.07, color: scaleRGB(green, 0.76), kind: L_MARK, sway: 0.1, swayB: 0.45, layer: 2, wobble: 0.4 },
    );
  }
  pen.end();
}

/** Something to eat, in the hand of whoever is at (x, y, z). */
function snack(pen: Pen, x: number, y: number, z: number, flip: boolean, rgb: RGB, sit = false): void {
  pen.card(x, y, z, flip).rect(0.36, sit ? 0.62 : 0.86, 0.6, sit ? 0.82 : 1.06, rgb, { outline: true, w: 0.03, layer: 5, grain: 0.2 });
}

const MOHAWKS: RGB[] = [C.pink, hex("#5fd35f"), hex("#4aa3f0"), C.orange, C.yellow];
const punk = (rng: Rng): Look => look(rng.pick(SKIN), C.black, rng.pick([C.black, C.charcoal, hex("#3a2f3f")]), rng.pick([C.redDark, C.black, hex("#3b4a2f")]));
const goth = (): Look => look(SKIN[0], C.black, C.black, C.black, true);

/** The band: guitar, drums, a singer and a keyboard, an amplifier, and an open case for coins. */
function band(pen: Pen, rng: Rng): void {
  const y = 30.9;
  // guitar
  pen.obj(() => {
    person(pen, 3.3, y + 0.2, 0, look(SKIN[2], HAIR[0], C.red, C.black, true), "stand");
    const k = pen.card(3.3, y + 0.2, 0);
    k.ellipse(0.1, 1.0, 0.3, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 8 });
    k.bar(0.28, 1.08, 0.78, 1.38, 0.07, C.woodDark, { layer: 5 });
  });
  // drums, and the drummer behind them
  pen.obj(() => {
    person(pen, 4.9, y - 0.9, 0.1, look(SKIN[3], C.black, C.yellow, C.navy), "sit");
    pen.cyl(4.95, y - 0.2, 0, 0.42, 0.62, C.red, { seg: 10, w: W_FINE, top: C.white });
    pen.cyl(5.65, y - 0.5, 0.3, 0.26, 0.4, C.red, { seg: 8, w: W_FINE, top: C.white });
    pen.pole([4.3, y - 0.4, 0], [4.3, y - 0.4, 1.25], 0.05, C.metal, { ink: false });
    pen.card(4.3, y - 0.4, 1.25).ellipse(0, 0, 0.34, 0.07, C.gold, { outline: true, w: 0.03, seg: 8, grain: 0.2 });
  });
  // the singer, at a microphone
  pen.obj(() => {
    const lk = look(SKIN[1], hex("#d04f8f"), C.black, hex("#3a2f3f"), true);
    person(pen, 6.3, y + 0.35, 0, lk, "wave", true);
    pen.pole([6.85, y + 0.55, 0], [6.85, y + 0.55, 1.6], 0.05, C.metal, { ink: false });
    pen.card(6.85, y + 0.55, 1.6).circle(0, 0.06, 0.09, C.black, { seg: 6, grain: 0 });
  });
  // keyboard
  pen.obj(() => {
    person(pen, 8.0, y - 0.45, 0, look(SKIN[0], HAIR[4], C.teal, C.black), "stand", true);
    pen.box(7.4, y - 0.15, 0.95, 1.3, 0.4, 0.1, C.white, { w: W_FINE, top: C.black });
    pen.pole([7.6, y + 0.05, 0], [7.6, y + 0.05, 0.95], 0.05, C.metal, { ink: false });
    pen.pole([8.5, y + 0.05, 0], [8.5, y + 0.05, 0.95], 0.05, C.metal, { ink: false });
  });
  pen.obj(() => {
    pen.box(2.0, y - 1.3, 0, 0.9, 0.6, 1.0, C.charcoal, { w: W_THIN });
    pen.wall("y+", 2.0, y - 1.3, 0, 0.9, 0.6).rect(0.1, 0.12, 0.8, 0.78, C.greyDark, { outline: true, w: 0.035, grain: 0.8 });
    pen.box(4.7, y + 1.2, 0, 1.3, 0.5, 0.12, C.black, { top: C.redDark, w: W_FINE });
  });
  // the people who have stopped to listen
  const crowd: [number, number, number][] = [
    [2.9, 33.5, 1],
    [3.9, 33.9, 1],
    [4.9, 34.2, 0.72],
    [5.8, 34.0, 1],
    [6.8, 33.8, 1],
    [7.8, 33.4, 1],
    [4.4, 35.1, 1],
    [6.3, 35.1, 1],
  ];
  crowd.forEach(([x, yy, s], i) => {
    const spiky = i === 1 || i === 6;
    const pose: Pose = rng.pick(["stand", "stand", "cheer", "wave"]);
    const flip = x > 5.2;
    person(pen, x, yy, 0, spiky ? punk(rng) : randomLook(rng), pose, flip, s);
    if (spiky) hat(pen, x, yy, 0, "mohawk", { flip, color: MOHAWKS[i % MOHAWKS.length] });
  });
}

/** The food stalls, and everybody queueing, eating and looking at records. */
function market(pen: Pen, rng: Rng): void {
  const stalls: [number, number, string, RGB, RGB[]][] = [
    [9.6, 27.6, "NOODLES", C.red, [C.cream, C.yellow, C.orange, C.white]],
    [13.8, 27.6, "BAGELS", C.yellow, [C.ochre, hex("#c98b4f"), C.cream, C.wood]],
    [18.0, 27.6, "CHURROS", C.orange, [hex("#c98b4f"), C.gold, C.brickBrown, C.cream]],
    [11.7, 31.8, "VINYL", C.purple, [C.black, C.red, C.blue, C.charcoal]],
    [15.9, 31.8, "BOOTS", C.green, [C.black, C.redDark, C.purple, C.brickBrown]],
  ];
  for (const [x, y, sign, a, goods] of stalls) {
    pen.push(x, y, 0);
    stall(pen, rng, { sign, a, goods });
    for (const dx of [0.7, 1.7, 2.7]) bulb(pen, dx, 2.5, 2.05, 0.22);
    pen.pop();
  }
  // customers: two or three at every stall, and the goths have found the records
  for (const [x, y, sign] of stalls) {
    const n = sign === "VINYL" ? 3 : rng.int(2, 4);
    for (let k = 0; k < n; k++) {
      const px = x + 0.5 + k * 1.05 + rng.range(-0.15, 0.15);
      const py = y + 3.05 + rng.range(-0.1, 0.25);
      const lk = sign === "VINYL" ? goth() : randomLook(rng);
      const flip = rng.chance(0.5);
      const small = sign !== "VINYL" && rng.chance(0.15);
      person(pen, px, py, 0, lk, rng.pick(["stand", "stand", "wave"]), flip, small ? 0.72 : 1);
      if (sign !== "VINYL" && sign !== "BOOTS" && rng.chance(0.6) && !small) snack(pen, px, py, 0, flip, rng.pick([C.white, C.yellow, C.cream]));
    }
  }
  // tables under parasols
  cafeTable(pen, rng, 24.5, 28.9, C.red, 3);
  cafeTable(pen, rng, 24.9, 32.8, null, 2);
  // lights strung over the stalls from four poles
  const poles: V2[] = [
    [9.1, 27.2],
    [22.2, 27.2],
    [22.2, 35.0],
    [9.1, 35.0],
  ];
  pen.obj(() => {
    for (const [x, y] of poles) pen.pole([x, y, 0], [x, y, 3.7], 0.1, C.iron);
  });
  for (let k = 0; k < 4; k++) {
    const a = poles[k];
    const b = poles[(k + 1) % 4];
    lightString(pen, [a[0], a[1], 3.65], [b[0], b[1], 3.65], k % 2 === 0 ? 14 : 9, 0.6);
  }
}

/** Everyone else who is standing or sitting about, and the furniture of the place. */
function life(c: LondonCtx): void {
  const { pen, rng } = c;
  // lunch on the beams of the lock that is not in use
  const eaters: [number, number, boolean][] = [
    [XBN, 15.1, false],
    [XBN, 16.0, false],
    [XGN, 15.3, true],
  ];
  for (const [x, y, flip] of eaters) {
    const lk = randomLook(rng);
    person(pen, x, y, GATE_TOP + 0.3 - G - 0.47, lk, "sit", flip);
    snack(pen, x, y, GATE_TOP + 0.3 - G - 0.47, flip, rng.pick([C.white, C.yellow]), true);
  }
  // and on the island, legs over the working lock, watching the boat come up
  for (const x of [17.6, 18.5, 22.9]) person(pen, x, ISL1 - 0.08, -0.45, randomLook(rng), "sit", true, x === 18.5 ? 0.72 : 1);
  pen.obj(() => {
    // somebody on the island with a windlass, waiting to wind the paddles
    const lk = look(SKIN[1], HAIR[2], hex("#6f8f4e"), C.navy, false, hex("#6f5d4d"));
    person(pen, 16.5, 20.0, 0, lk, "wave");
    pen.card(16.5, 20.0, 0).line(
      [
        [0.64, 1.86],
        [0.84, 1.86],
        [0.84, 2.1],
      ],
      { w: 0.06, color: C.metal, kind: L_BAR, wobble: 0, layer: 5 },
    );
  });
  // mooring bollards, and a lifebuoy on a post
  for (const [x, y] of [
    [16.9, 23.75],
    [22.7, 23.75],
    [19.0, 16.25],
    [21.6, 16.25],
    [10.0, 23.75],
  ]) {
    bollard(pen, x, y);
  }
  pen.obj(() => {
    pen.pole([27.6, 16.0, 0], [27.6, 16.0, 1.5], 0.08, C.white);
    const k = pen.card(27.6, 16.0, 1.1);
    k.circle(0, 0.3, 0.3, null, { ink: C.red, w: 0.15, seg: 10 });
    for (const t of [0.8, 2.4, 4.0, 5.5]) k.seg(Math.cos(t) * 0.24, 0.3 + Math.sin(t) * 0.24, Math.cos(t) * 0.36, 0.3 + Math.sin(t) * 0.36, { w: 0.1, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  });

  // the north quay: people in front of the hall and the shops
  for (const [x, y] of [
    [20.6, 14.9],
    [21.5, 15.2],
    [23.0, 14.8],
    [29.0, 14.6],
    [29.9, 15.4],
    [33.2, 14.5],
    [34.4, 14.9],
    [35.6, 15.5],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave", "cheer"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
  // two looking up at the dragon, one photographing the boot
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 29.6, 14.3, 0, lk, "stand", true);
    const k = pen.card(29.6, 14.3, 0, true);
    k.bar(0.34, 1.34, 0.7, 1.72, 0.17, lk.top, { layer: 4 });
    k.rect(0.66, 1.66, 0.84, 1.98, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  });
  // in the lane under the bridge
  for (const [x, y] of [
    [7.4, 9.2],
    [8.3, 9.6],
    [10.9, 11.4],
    [9.6, 6.4],
    [11.6, 8.2],
  ]) {
    const lk = rng.chance(0.4) ? punk(rng) : randomLook(rng);
    const flip = rng.chance(0.5);
    person(pen, x, y, 0, lk, rng.pick(["stand", "wave", "walkA"]), flip);
    if (lk.hair === C.black && lk.top !== C.white && rng.chance(0.7)) hat(pen, x, y, 0, "mohawk", { flip, color: rng.pick(MOHAWKS) });
  }
  // outside the pub, with pints
  for (const [x, y] of [
    [2.3, 14.9],
    [3.3, 15.2],
    [4.2, 14.8],
  ]) {
    const flip = rng.chance(0.5);
    person(pen, x, y, 0, randomLook(rng), "stand", flip);
    pen.card(x, y, 0, flip).rect(0.4, 0.86, 0.56, 1.16, C.gold, { outline: true, w: 0.03, layer: 5, grain: 0 });
  }

  // the towpath: a bench by the willow, somebody with a dog, pigeons after crumbs
  willow(pen, rng, 3.5, 27.9);
  bench(pen, 6.6, 27.0, 180);
  person(pen, 6.3, 26.95, 0.42, randomLook(rng), "sit");
  person(pen, 7.0, 26.95, 0.42, randomLook(rng), "sit", true);
  bench(pen, 23.4, 27.0, 180);
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 11.6, 24.4, 0, lk, "stand");
    dogOn(pen.card(12.7, 24.5, 0), hex("#e0994d"), { corgi: true });
    pen.card(11.6, 24.4, 0).line(
      [
        [0.43, 0.9],
        [0.9, 0.62],
      ],
      { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0, layer: 4 },
    );
  });
  for (let k = 0; k < 5; k++) pigeon(pen, rng.range(21.5, 26.5), rng.range(34.2, 35.6), 0, rng.chance(0.5), rng.chance(0.5));
  // more of the market square: a few standing about, three at the rail looking down on the quay
  for (const [x, y] of [
    [23.7, 30.9],
    [21.2, 33.0],
    [19.6, 35.4],
    [22.6, 34.6],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  for (const y of [27.9, 30.6, 34.3]) person(pen, STEP_X - 0.55, y, 0, randomLook(rng), y > 34 ? "wave" : "stand", false);
  bin(pen, 26.7, 27.1);
  bin(pen, 9.0, 36.0);
  tree(pen, rng, 21.6, 35.6, { kind: "blossom" });
  tree(pen, rng, 15.2, 15.0, { kind: "elm" });
  for (const [x, y] of [
    [8.4, 23.95],
    [20.4, 23.95],
    [14.6, 15.9],
    [26.4, 15.3],
    [36.4, 15.8],
    [5.4, 15.6],
  ]) {
    lamp(pen, x, y);
  }
}

/** The lower quay below the locks: tables under parasols, bicycles, and punks on the canal wall. Drawn with z = 0 on the quay. */
function quayLife(c: LondonCtx): void {
  const { pen, rng } = c;
  // punks on the wall, legs over the water, a radio beside them
  [33.7, 34.6, 35.5, 36.5].forEach((x, i) => {
    person(pen, x, CY1 + 0.08, -0.45, punk(rng), "sit", false);
    hat(pen, x, CY1 + 0.08, -0.45, "mohawk", { pose: "sit", color: MOHAWKS[i] });
  });
  pen.obj(() => {
    pen.box(37.2, CY1 + 0.5, 0, 0.8, 0.36, 0.46, C.charcoal, { w: W_FINE });
    const f = pen.wall("y+", 37.2, CY1 + 0.5, 0, 0.8, 0.36);
    for (const a of [0.2, 0.6]) f.circle(a, 0.23, 0.13, C.grey, { outline: true, w: 0.03, seg: 7, grain: 0.4 });
  });
  const tables: [number, number, RGB | null][] = [
    [30.2, 29.5, C.yellow],
    [34.3, 30.0, C.blue],
    [31.9, 33.1, null],
    [35.4, 32.9, C.red],
  ];
  for (const [x, y, par] of tables) cafeTable(pen, rng, x, y, par, rng.int(2, 5));
  // people between the tables, a few more punks, somebody photographing the bridge
  for (const [x, y] of [
    [29.1, 31.6],
    [32.9, 31.4],
    [36.9, 31.0],
    [33.6, 35.0],
    [29.6, 35.2],
    [36.3, 26.6],
    [37.2, 27.3],
  ]) {
    const spiky = y < 28;
    const flip = rng.chance(0.5);
    person(pen, x, y, 0, spiky ? punk(rng) : randomLook(rng), rng.pick(["stand", "stand", "wave"]), flip, !spiky && rng.chance(0.2) ? 0.72 : 1);
    if (spiky) hat(pen, x, y, 0, "mohawk", { flip, color: rng.pick(MOHAWKS) });
  }
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 29.3, 27.3, 0, lk, "stand");
    const k = pen.card(29.3, 27.3, 0);
    k.bar(0.34, 1.34, 0.7, 1.7, 0.17, lk.top, { layer: 4 });
    k.rect(0.66, 1.64, 0.84, 1.96, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  });
  for (let k = 0; k < 5; k++) pigeon(pen, rng.range(29.4, 35.4), rng.range(34.5, 35.6), 0, rng.chance(0.5), rng.chance(0.5));
  // lights strung over the tables from three poles
  const poles: V2[] = [
    [28.3, 27.2],
    [37.7, 28.5],
    [33.5, 35.4],
  ];
  pen.obj(() => {
    for (const [x, y] of poles) pen.pole([x, y, 0], [x, y, 3.5], 0.1, C.iron);
  });
  lightString(pen, [poles[0][0], poles[0][1], 3.45], [poles[1][0], poles[1][1], 3.45], 12, 0.7);
  lightString(pen, [poles[1][0], poles[1][1], 3.45], [poles[2][0], poles[2][1], 3.45], 10, 0.6);
  bikeRow(pen, rng, 33.3, 26.3, 5, 270);
  tree(pen, rng, 28.8, 35.4, { kind: "round" });
  bollard(pen, 29.9, 23.75);
  bollard(pen, 38.1, 23.75);
  lamp(pen, 38.2, 26.6);
  lamp(pen, 28.5, 26.6);
}

// ---------------------------------------------------------------- the working lock

/** One turn of the lock, in seconds after a boat appears below it. */
const PERIOD = 30;
const T_IN = 8.6; // the boat is in the lock
const T_SHUT = 10.2; // the bottom gates are shut behind it, and the paddles are opened
const T_FULL = 13.6; // the lock is full
const T_OPEN = 15.2; // the top gates are open
const T_GO = 15.4; // the boat sets off again
const T_GONE = 23.0; // and is away up the canal
const T_CLEAR = 20.6; // by now it is clear of the top gates, which start to shut
const T_SHUT2 = 22.2;
const T_EMPTY = 25.6; // the lock has been emptied for the next boat
const T_READY = 27.2; // and the bottom gates stand open again
/** Where a boat appears below the locks, and where it is last seen above them (x of its middle). */
const X_IN = 34.4;
const X_OUT = 5.4;

interface LockState {
  /** Height of the water in the lock. */
  level: number;
  /** How far open the top and bottom gates are, 0 to 1, and whether they are moving. */
  top: number;
  bottom: number;
  topMoving: boolean;
  bottomMoving: boolean;
  /** Which way the water in the lock is going: 1 filling, -1 emptying, 0 still. */
  flow: number;
  /** The boat: which one, where its middle is, how much of it has been drawn (0 to 1.2), and whether it is under way. */
  boat: number;
  x: number;
  drawn: number;
  moving: boolean;
}

/** Everything about the lock at a moment of its turn. */
function lockAt(p: number, turn: number): LockState {
  const fill = smooth(T_SHUT, T_FULL, p) - smooth(T_SHUT2, T_EMPTY, p);
  const s: LockState = {
    level: Z_LO + (Z_HI - Z_LO) * fill,
    top: smooth(T_FULL, T_OPEN, p) - smooth(T_CLEAR, T_SHUT2, p),
    bottom: 1 - smooth(T_IN, T_SHUT, p) + smooth(T_EMPTY, T_READY, p),
    topMoving: (p > T_FULL && p < T_OPEN) || (p > T_CLEAR && p < T_SHUT2),
    bottomMoving: (p > T_IN && p < T_SHUT) || (p > T_EMPTY && p < T_READY),
    flow: p > T_SHUT && p < T_FULL ? 1 : p > T_SHUT2 && p < T_EMPTY ? -1 : 0,
    boat: -1,
    x: 0,
    drawn: 0,
    moving: false,
  };
  if (p < T_GONE) {
    s.boat = ((turn % 2) + 2) % 2;
    if (p < T_IN) {
      s.x = X_IN - (X_IN - BERTH) * smooth(0.4, T_IN, p);
      s.drawn = Math.min(1.2, p);
      s.moving = p > 0.9 && p < T_IN - 0.5;
    } else if (p < T_GO) {
      s.x = BERTH;
      s.drawn = 1.2;
    } else {
      s.x = BERTH - (BERTH - X_OUT) * smooth(T_GO, T_GONE, p);
      // it rubs itself out as it reaches the edge of the islet
      s.drawn = 1.2 * clamp((s.x - X_OUT) / 2.2, 0, 1);
      s.moving = p > T_GO + 0.5;
    }
  }
  return s;
}

/** The gates, the water and the two people who work the working lock. Drawn afresh every frame, in the islet's frame. */
function lockMoving(pen: Pen, s: LockState, t: number): void {
  pen.begin();
  pen.floor(s.level, 1).rect(XG - HALF, ISL1, XB + HALF, CY1, C.water, { kind: F_WATER });
  if (s.flow !== 0) {
    // water boiling up where the paddles let it through
    const g = pen.floor(s.flow > 0 ? s.level : Z_LO, 2);
    const x0 = s.flow > 0 ? XG + 0.3 : XB + 0.4;
    for (let k = 0; k < 6; k++) {
      const y = ISL1 + 0.3 + (k * (CY1 - ISL1 - 0.6)) / 5;
      const a = x0 + (k % 2) * 0.5;
      g.line(
        [
          [a, y],
          [a + 0.7, y + 0.16],
          [a + 1.5, y - 0.1],
        ],
        { w: 0.11, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
      );
    }
  }
  const crewA = look(SKIN[1], HAIR[1], C.red, C.navy, false, C.navy);
  const crewB = look(SKIN[3], C.black, C.yellow, hex("#3c3a3d"));
  const step: Pose = Math.floor(t * 2.6) & 1 ? "walkA" : "walkB";
  // each leaf swings back against its wall, upstream, as it opens
  const gate = (x: number, sill: number, open: number, moving: boolean, crew: Look) => {
    pen.push(x, ISL1, 0, 90 + 90 * open);
    leaf(pen, sill, 1.1);
    pen.pop();
    pen.push(x, CY1, 0, 270 - 90 * open);
    leaf(pen, sill, 1.9);
    // whoever is working this gate walks the beam round
    person(pen, -1.5, -0.5, G, crew, moving ? step : "stand", x === XG);
    pen.pop();
  };
  gate(XG, SILL_HI, s.top, s.topMoving, crewA);
  gate(XB, SILL_LO, s.bottom, s.bottomMoving, crewB);
  pen.end();
}

// ---------------------------------------------------------------- everything that moves

function motion(c: LondonCtx): void {
  const { pen, rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done + 0.1;
  const shown = pen.reveal(c.ox + 20, c.oy + 22, 0) + 0.45;

  // ---- the lock
  /** When a turn of the lock starts. On the tour, one is timed so the boat is rising as the camera arrives. */
  const start = (): number => {
    const at = c.visit();
    return at == null ? born + 1 : at - 0.6 - T_SHUT;
  };
  const lock = (t: number): LockState => {
    // while the place is still being drawn the lock stands as it will be the moment it comes to life
    const tt = Math.max(t, born) - start();
    const turn = Math.floor(tt / PERIOD);
    return lockAt(tt - turn * PERIOD, turn);
  };
  c.movers.push((m) => {
    if (m.t < shown || !m.sees(c.ox + 20, c.oy + 22, c.oz + 3, 14)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => shown;
    dp.rng = new Rng(1820);
    dp.push(c.ox, c.oy, c.oz);
    lockMoving(dp, lock(m.t), m.t);
    dp.pop();
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the boats: two take it in turns
  const liveries: Livery[] = [
    { cabin: hex("#2f6b4f"), panel: C.red, trim: C.red, name: "ROSIE", seed: 11 },
    { cabin: C.royal, panel: C.cream, trim: C.yellow, name: "HERON", seed: 12 },
  ];
  const boats = liveries.map((o) => [makeSprite((p) => narrowboat(p, o, false), 180, o.seed), makeSprite((p) => narrowboat(p, o, true), 180, o.seed)]);
  c.movers.push((m) => {
    if (m.t < born) return;
    const s = lock(m.t);
    // (a boat caught half way when the place comes to life sketches itself in where it is)
    const drawn = Math.min(s.drawn, m.t - born);
    if (s.boat < 0 || drawn <= 0) return;
    const p = W(s.x, LOCK_Y, s.level);
    m.put(boats[s.boat][s.moving ? 1 : 0], p[0], p[1], p[2], m.t - drawn);
  });

  // ---- a duck and her ducklings, round and round above the locks
  const pond = new Route(
    rounded(
      [
        [3.6, 17.5],
        [10.6, 17.5],
        [10.6, 19.0],
        [3.6, 19.0],
      ].map(([x, y]) => W(x, y, Z_HI)),
      true,
      0.65,
    ),
    true,
  );
  const fowl = (kind: "duck" | "duckling") => [false, true].map((flip) => makeSprite((p) => duckOn(p.card(0, 0, 0, flip), kind), 0, 61));
  const mother = fowl("duck");
  const young = fowl("duckling");
  for (let i = 0; i < 5; i++) {
    const set = i === 0 ? mother : young;
    c.movers.push(
      traveler(pond, {
        speed: 0.55,
        at: 0.5 - (i === 0 ? 0 : 0.25 + i * 0.42) / pond.length,
        born: born + i * 0.1,
        span: 0.5,
        sprite: (h) => set[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1],
      }),
    );
  }

  // ---- bicycles along the towpath
  const towpath = new Route(
    rounded(
      [
        [3.2, 25.55],
        [26.7, 25.55],
        [26.7, 26.15],
        [3.2, 26.15],
      ].map(([x, y]) => W(x, y, G)),
      true,
      0.3,
    ),
    true,
  );
  c.movers.push(cyclist(towpath, rng, born + 0.2, 4.4, 0.1));
  c.movers.push(cyclist(towpath, rng, born + 0.5, 4.9, 0.62));

  // ---- people on foot: through the market, up the lane and under the bridge, along the quay, over the footbridge
  const loop = (pts: number[][], r = 0.4, z = G) =>
    new Route(
      rounded(
        pts.map(([x, y]) => W(x, y, z)),
        true,
        r,
      ),
      true,
    );
  const rounds: [Route, number][] = [
    [
      loop([
        [10.4, 31.0],
        [22.7, 31.0],
        [22.7, 35.2],
        [10.4, 35.2],
      ]),
      6,
    ],
    [
      loop(
        [
          [28.7, 27.8],
          [37.0, 27.8],
          [37.0, 34.3],
          [28.7, 34.3],
        ],
        0.4,
        GL,
      ),
      5,
    ],
    [
      loop([
        [6.2, 13.0],
        [6.2, 3.95],
        [12.2, 3.95],
        [12.2, 13.0],
      ]),
      6,
    ],
    [
      loop(
        [
          [16.2, 13.95],
          [36.0, 13.95],
          [36.0, 14.35],
          [16.2, 14.35],
        ],
        0.15,
      ),
      5,
    ],
  ];
  for (const [route, n] of rounds) for (let k = 0; k < n; k++) c.movers.push(walker(route, rng, born + rng.range(0, 1)));
  const over = new Route(
    drape(
      rounded(
        [
          [FB_X + 0.55, 13.9],
          [FB_X + 0.55, 27.3],
          [FB_X + FB_W - 0.55, 27.3],
          [FB_X + FB_W - 0.55, 13.9],
        ].map(([x, y]) => W(x, y, 0)),
        true,
        0.3,
      ),
      true,
      (_x, y) => c.oz + deckZ(y - c.oy),
      0.45,
    ),
    true,
  );
  for (let k = 0; k < 4; k++) c.movers.push(walker(over, rng, born + rng.range(0, 1)));

  // ---- steam off the hot food
  const puff = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.circle(0, 0, 0.32, C.white, { outline: true, w: 0.035, ink: C.grey, seg: 9, grain: 0.2 });
      k.circle(0.28, 0.16, 0.24, C.white, { outline: true, w: 0.035, ink: C.grey, seg: 8, grain: 0.2, layer: 1 });
      k.circle(-0.24, 0.14, 0.2, C.white, { outline: true, w: 0.035, ink: C.grey, seg: 8, grain: 0.2, layer: 1 });
    },
    0,
    51,
  );
  const pots: [V3, number][] = [
    [W(10.6, 30.2, G + 2.3), 0],
    [W(19.3, 30.2, G + 2.3), 0.37],
    [W(12.1, 30.25, G + 2.3), 0.7],
  ];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 14, c.oy + 30, c.oz + 5, 10)) return;
    for (const [at, ph] of pots) {
      for (let i = 0; i < 3; i++) {
        const u = (m.t / 3.3 + i / 3 + ph) % 1;
        const sx = Math.sin(u * 6 + i * 2 + ph * 9) * 0.3;
        // each puff sketches itself in, then runs its drawing backwards to fade as it rises
        const drawn = Math.min(u * 3.3, ((1 - u) / 0.3) * 1.05);
        m.put(puff, at[0] + sx, at[1] - sx, at[2] + u * 2.6, m.t - drawn, 0.55 + u * 0.85);
      }
    }
  });

  // ---- notes drifting up from the band
  const note = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.ellipse(0, 0, 0.17, 0.12, C.black, { grain: 0, seg: 8 });
      k.seg(0.15, 0.02, 0.15, 0.62, { w: 0.05, kind: L_BAR, wobble: 0 });
      k.seg(0.15, 0.62, 0.4, 0.5, { w: 0.07, kind: L_BAR, wobble: 0 });
    },
    0,
    71,
  );
  const np = W(5.4, 30.9, G + 2.9);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(np[0], np[1], np[2], 8)) return;
    for (let i = 0; i < 4; i++) {
      const u = (m.t / 3.4 + i / 4) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      const drawn = Math.min(u * 3.4, ((1 - u) / 0.3) * 1.05);
      m.put(note, np[0] + sx + i * 0.3 - 0.5, np[1] - sx - i * 0.3 + 0.5, np[2] + u * 3.0, m.t - drawn);
    }
  });

  // ---- the train: three carriages across the viaduct, one way and then the other
  const car = makeSprite(carriage, 0, 81);
  const TRAIN = 15;
  const SPEED = 6.5;
  const ty = c.oy + VY0 + VD / 2;
  const tz = c.oz + G + VH;
  const xa = 3.6 + 2.6;
  const xb = V_END - 2.6;
  c.movers.push((m) => {
    if (m.t < born + 1) return;
    const tt = m.t - born - 1;
    const pass = Math.floor(tt / TRAIN);
    const p = tt - pass * TRAIN;
    const east = pass % 2 === 1;
    for (let i = 0; i < 3; i++) {
      // each carriage is drawn as it comes onto the viaduct and rubbed out as it leaves the far end
      const d = p * SPEED - i * 5.3 - 2.4;
      if (d < 0 || d > xb - xa + 4.8) continue;
      const x = east ? xa - 2.4 + d : xb + 2.4 - d;
      const drawn = 1.2 * Math.min(clamp(d / 2.6, 0, 1), clamp((xb - xa + 4.8 - d) / 2.6, 0, 1));
      m.put(car, c.ox + x, ty, tz, m.t - drawn);
    }
  });
}

// ---------------------------------------------------------------- the islet

export const camden: LondonBuilder = (c) => {
  const { pen, rng } = c;
  const s = shape();
  c.early(() => {
    land(c, s);
    ground(c, s);
  });
  stillGates(pen);
  stepDown(pen);
  footbridge(pen);
  // a swan and a couple of ducks below the locks
  swan(pen, 35.2, 18.0, Z_LO);
  pen.obj(() => duckOn(pen.card(29.0, 17.9, Z_LO), "drake"));
  pen.obj(() => duckOn(pen.card(29.8, 18.3, Z_LO, true), "duck"));

  pen.push(0, 0, G);
  railway(c);
  pen.push(1.5, 9.0, 0);
  pub(pen, rng, "THE LOCK", { w: 3.1, d: 5.0, floors: 1, tiles: C.ironGreen });
  pen.pop();
  hall(c);
  shops(c);
  band(pen, rng);
  market(pen, rng);
  life(c);
  pen.pop();
  pen.push(0, 0, GL);
  quayLife(c);
  pen.pop();

  motion(c);
};
