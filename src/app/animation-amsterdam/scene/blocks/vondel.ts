// Vondelpark: lawns, a pond with a fountain, the round blue teahouse, a
// bandstand, a playground, and the whole city lying about on the grass.
// Parakeets commute between the trees.
//
// The park fills the block inside the canal-side streets; its fourth side runs
// down to the outer water. Two paths cross at the statue of Vondel and a ring
// path loops the whole park.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { Look, W_FINE, W_THIN, bench, cafeTable, flag, flowerBed, hedge, lamp, person, railing, randomLook, tree } from "../kit";
import { Route, castWalker, makeSprite, walker } from "../motion";
import { C, SHIRT } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const X0 = 6.6;
const X1 = 41.4;
const Y0 = 6.6;
const Y1 = 47.4;

const TEA_BLUE = hex("#2f78c8");
const PARK_GREEN: RGB = [52, 78, 66];
const BRONZE = hex("#4c8275");
const PARAKEET = hex("#58c043");
const PARAKEET_DARK = hex("#3d9636");

// ---------------------------------------------------------------- geometry

/** A smooth curve through control points, sampled about every `step` units. */
function curve(ctrl: V2[], closed: boolean, step = 0.7): V2[] {
  const n = ctrl.length;
  const out: V2[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = ctrl[closed ? (i + n - 1) % n : Math.max(0, i - 1)];
    const p1 = ctrl[i % n];
    const p2 = ctrl[(i + 1) % n];
    const p3 = ctrl[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    const k = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(ctrl[n - 1]);
  return out;
}

function distToPath(x: number, y: number, pts: V2[], closed: boolean): number {
  let best = Infinity;
  const n = pts.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
    if (d < best) best = d;
  }
  return best;
}

function inPoly(x: number, y: number, pts: V2[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Points shifted sideways off a path by `o` (positive is to the left of travel). */
function sideOf(pts: V2[], closed: boolean, o: number): V2[] {
  const n = pts.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    out.push([pts[i][0] - (dy / d) * o, pts[i][1] + (dx / d) * o]);
  }
  return out;
}

interface Walk {
  pts: V2[];
  closed: boolean;
  w: number;
}

function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): V2[] {
  const out: V2[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + (i / 5) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  corner(x1 - r, y0 + r, Math.PI * 1.5);
  return out;
}

function ring3(cx: number, cy: number, r: number, z: number, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return out;
}

// ---------------------------------------------------------------- the plan

const STATUE: V2 = [24, 24];
const TEA: V2 = [16.3, 16.5];
const BAND: V2 = [33.6, 14.2];
const FOUNTAIN: V2 = [15.6, 35.4];

const LOOP = curve(
  [
    [9.6, 10.6],
    [16, 8.9],
    [24, 8.7],
    [32, 8.9],
    [38.4, 10.8],
    [40, 17],
    [40.1, 24],
    [40, 32],
    [38.6, 40.5],
    [33, 44.9],
    [24, 45.6],
    [15, 45],
    [9.4, 41.5],
    [8.3, 33],
    [8.2, 24],
    [8.3, 16],
  ],
  true,
);

const WALKS: Walk[] = [
  { pts: LOOP, closed: true, w: 2.0 },
  {
    pts: curve(
      [
        [24, 6.6],
        [24, 14],
        [24, 20.9],
      ],
      false,
    ),
    closed: false,
    w: 1.7,
  },
  {
    pts: curve(
      [
        [24, 27.1],
        [24, 31.4],
      ],
      false,
    ),
    closed: false,
    w: 1.7,
  },
  {
    pts: curve(
      [
        [24, 36.8],
        [24.2, 41],
        [24, 45.6],
      ],
      false,
    ),
    closed: false,
    w: 1.7,
  },
  {
    pts: curve(
      [
        [6.6, 24],
        [14, 24],
        [20.9, 24],
      ],
      false,
    ),
    closed: false,
    w: 1.7,
  },
  {
    pts: curve(
      [
        [27.1, 24],
        [33, 24],
        [41.4, 24],
      ],
      false,
    ),
    closed: false,
    w: 1.7,
  },
];

const POND = curve(
  [
    [10.3, 35.5],
    [11.5, 31.8],
    [15.5, 30.3],
    [19.5, 30.9],
    [22, 32.5],
    [24, 32.8],
    [26.3, 32.3],
    [28.6, 32.5],
    [29.7, 34.2],
    [28.6, 35.9],
    [26.2, 35.9],
    [24, 35.5],
    [22.6, 36.6],
    [21.6, 39.2],
    [18, 40.6],
    [13.5, 40.2],
    [10.9, 38.3],
  ],
  true,
  0.6,
);

/** The footbridge over the narrow part of the pond: runs along y at x = 24. */
const BR_Y0 = 31.3;
const BR_Y1 = 36.9;
const BR_X0 = 23.15;
const BR_W = 1.7;
function bridgeTop(y: number): number {
  const L = BR_Y1 - BR_Y0;
  const t = (y - BR_Y0 - L / 2) / (L / 2);
  return Math.abs(t) >= 1 ? 0 : 0.9 * (1 - t * t) + 0.1;
}

function onAnyPath(x: number, y: number, pad: number, skip = -1): boolean {
  for (let i = 0; i < WALKS.length; i++) {
    if (i === skip) continue;
    const w = WALKS[i];
    if (distToPath(x, y, w.pts, w.closed) < w.w / 2 + pad) return true;
  }
  return false;
}

/** True where the lawn is just lawn: not a path, the pond, a terrace or a play area. */
function onLawn(x: number, y: number, pad = 0.25): boolean {
  if (x < X0 + 0.3 || x > X1 - 0.3 || y < Y0 + 0.3 || y > Y1 - 0.3) return false;
  if (onAnyPath(x, y, pad)) return false;
  if (Math.hypot(x - STATUE[0], y - STATUE[1]) < 3.3 + pad) return false;
  if (Math.hypot(x - TEA[0], y - TEA[1]) < 6.2 + pad) return false;
  if (Math.hypot(x - BAND[0], y - BAND[1]) < 3.6 + pad) return false;
  if (x > 31.4 - pad && x < 38.4 + pad && y > 33.2 - pad && y < 41.4 + pad) return false;
  if (inPoly(x, y, POND) || distToPath(x, y, POND, true) < pad + 0.2) return false;
  return true;
}

// ---------------------------------------------------------------- small props

function plankBench(pen: Pen, x: number, y: number, len = 1.9): void {
  pen.begin();
  pen.box(x - len / 2, y - 0.22, 0.34, len, 0.44, 0.1, C.wood, { w: W_THIN });
  for (const s of [-1, 1]) pen.pole([x + s * (len / 2 - 0.2), y, 0], [x + s * (len / 2 - 0.2), y, 0.34], 0.1, C.woodDark, { ink: false });
  pen.end();
}

/** Someone flat out on a towel, seen from above. */
function sunbather(pen: Pen, rng: Rng, x: number, y: number, rot: number): void {
  const lk = randomLook(rng);
  pen.push(x, y, 0, rot);
  const g = pen.floor(0.02, 2);
  pen.begin();
  g.rect(-0.62, -1.2, 0.62, 1.2, rng.pick([C.red, C.yellow, C.sky, C.pink, C.orange]), { outline: true, w: W_FINE, grain: 0.6 });
  g.seg(-0.62, -0.6, 0.62, -0.6, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  g.seg(-0.62, 0.6, 0.62, 0.6, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  g.rect(-0.3, 0.15, -0.06, 1.0, lk.skin, { outline: true, w: W_FINE, layer: 2, grain: 0.3 });
  g.rect(0.06, 0.15, 0.3, 1.0, lk.skin, { outline: true, w: W_FINE, layer: 2, grain: 0.3 });
  g.rect(-0.34, -0.5, 0.34, 0.2, lk.top, { outline: true, w: W_FINE, layer: 3 });
  g.seg(-0.34, -0.3, -0.62, 0.1, { w: 0.16, color: lk.skin, kind: L_MARK, wobble: 0, layer: 3 });
  g.seg(0.34, -0.3, 0.62, -0.7, { w: 0.16, color: lk.skin, kind: L_MARK, wobble: 0, layer: 3 });
  g.circle(0, -0.8, 0.3, lk.skin, { outline: true, w: W_FINE, layer: 4, seg: 9, grain: 0.3 });
  g.ellipse(0, -0.92, 0.32, 0.2, lk.hair, { layer: 5, seg: 8, a0: Math.PI, a1: Math.PI * 2 });
  pen.end();
  pen.pop();
}

/** A blanket on the grass with people, a basket and a bottle. */
function picnic(pen: Pen, rng: Rng, x: number, y: number, n: number, col: RGB): void {
  pen.push(x, y, 0, rng.range(-12, 12));
  const g = pen.floor(0.02, 2);
  pen.begin();
  g.rect(-1.4, -1.1, 1.4, 1.1, col, { outline: true, w: W_FINE, grain: 0.7 });
  for (let i = -1; i <= 1; i++) {
    g.seg(-1.4, i * 0.55, 1.4, i * 0.55, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, layer: 1, alpha: 0.9 });
    g.seg(i * 0.7, -1.1, i * 0.7, 1.1, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, layer: 1, alpha: 0.9 });
  }
  pen.box(-0.25, -0.2, 0.02, 0.55, 0.4, 0.32, C.wood, { w: W_FINE });
  pen.pole([0.5, 0.2, 0.02], [0.5, 0.2, 0.5], 0.13, C.green, { ink: false });
  const spots: V2[] = [
    [-0.9, -0.7],
    [0.95, -0.55],
    [-0.8, 0.75],
    [0.9, 0.8],
  ];
  for (let i = 0; i < n; i++) {
    person(pen, spots[i][0], spots[i][1], 0, randomLook(rng), "sit", spots[i][0] > 0, i === 3 ? 0.72 : 1);
  }
  pen.end();
  pen.pop();
}

/** Something held: drawn on a card in front of the figure standing at the same spot. */
function held(pen: Pen, x: number, y: number, z: number, draw: (c: Plane) => void): void {
  const c = pen.card(x, y, z);
  c.layer = 6;
  pen.begin();
  draw(c);
  pen.end();
}

function gatePost(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.box(x - 0.42, y - 0.42, 0, 0.84, 0.84, 2.5, C.brick);
  pen.box(x - 0.52, y - 0.52, 2.5, 1.04, 1.04, 0.2, C.stone, { w: W_THIN });
  pen.card(x, y, 2.7).circle(0, 0.3, 0.27, C.lamp, { outline: true, w: W_FINE, glow: 1, seg: 9, grain: 0.2 });
  pen.end();
}

// ---------------------------------------------------------------- creatures (sprites)

const P: V3 = [0, 0, 0];

/** [facing right, facing left] */
function pair(draw: (pen: Pen, flip: boolean) => void, seed: number): [Sprite, Sprite] {
  return [makeSprite((pen) => draw(pen, false), 0, seed), makeSprite((pen) => draw(pen, true), 0, seed)];
}

function duckShape(pen: Pen, flip: boolean, kind: "mallard" | "duckling" | "swan"): void {
  const c = pen.card(0, 0, 0, flip);
  if (kind === "swan") {
    c.ellipse(0, 0.3, 0.62, 0.32, C.white, { outline: true, w: W_FINE, seg: 12, grain: 0.3 });
    c.line(
      [
        [-0.5, 0.42],
        [-0.1, 0.62],
        [0.3, 0.5],
      ],
      { w: 0.05, wobble: 0, layer: 1 },
    );
    c.bar(0.42, 0.42, 0.66, 0.74, 0.14, C.white, { layer: 1 });
    c.bar(0.66, 0.74, 0.54, 1.04, 0.13, C.white, { layer: 1 });
    c.circle(0.6, 1.1, 0.15, C.white, { outline: true, w: W_FINE, seg: 8, layer: 2, grain: 0.3 });
    c.poly(
      [
        [0.72, 1.14],
        [0.95, 1.04],
        [0.72, 1.02],
      ],
      C.orange,
      { outline: true, w: 0.04, layer: 3 },
    );
  } else {
    const s = kind === "duckling" ? 0.55 : 1;
    const body = kind === "duckling" ? C.yellow : hex("#9a7650");
    const hd = kind === "duckling" ? C.yellow : hex("#2f7a55");
    c.ellipse(0, 0.2 * s, 0.42 * s, 0.24 * s, body, { outline: true, w: W_FINE, seg: 10, grain: 0.4 });
    c.poly(
      [
        [-0.38 * s, 0.26 * s],
        [-0.6 * s, 0.44 * s],
        [-0.3 * s, 0.4 * s],
      ],
      body,
      { outline: true, w: 0.04, layer: 1 },
    );
    c.circle(0.36 * s, 0.5 * s, 0.17 * s, hd, { outline: true, w: W_FINE, seg: 8, layer: 2, grain: 0.3 });
    c.poly(
      [
        [0.5 * s, 0.54 * s],
        [0.72 * s, 0.47 * s],
        [0.5 * s, 0.42 * s],
      ],
      C.orange,
      { layer: 3 },
    );
  }
  // a little wake
  const g = pen.floor(0.01, 0);
  g.line(
    [
      [-0.5, 0.35],
      [-0.9, 0.0],
      [-0.5, -0.35],
    ],
    { w: 0.06, color: C.white, kind: L_RIPPLE, wobble: 0, alpha: 0.8 },
  );
}

function parakeetShape(pen: Pen, flip: boolean, wings: -1 | 0 | 1): void {
  const c = pen.card(0, 0, 0, flip);
  const k = 1.25;
  c.poly(
    [
      [-0.2 * k, 0.02 * k],
      [-0.78 * k, -0.14 * k],
      [-0.74 * k, -0.02 * k],
      [-0.2 * k, 0.14 * k],
    ],
    PARAKEET_DARK,
    { outline: true, w: 0.045 },
  );
  c.ellipse(0, 0.08 * k, 0.3 * k, 0.16 * k, PARAKEET, { outline: true, w: 0.045, seg: 9, layer: 1, grain: 0.3 });
  c.circle(0.28 * k, 0.17 * k, 0.14 * k, PARAKEET, { outline: true, w: 0.045, seg: 8, layer: 2, grain: 0.3 });
  c.poly(
    [
      [0.4 * k, 0.2 * k],
      [0.52 * k, 0.14 * k],
      [0.4 * k, 0.1 * k],
    ],
    C.red,
    { layer: 3 },
  );
  if (wings === 1) {
    c.poly(
      [
        [-0.14 * k, 0.14 * k],
        [0.12 * k, 0.14 * k],
        [0.0, 0.68 * k],
        [-0.26 * k, 0.5 * k],
      ],
      PARAKEET_DARK,
      { outline: true, w: 0.045, layer: 2 },
    );
  } else if (wings === -1) {
    c.poly(
      [
        [-0.14 * k, 0.04 * k],
        [0.12 * k, 0.04 * k],
        [-0.02 * k, -0.46 * k],
        [-0.26 * k, -0.3 * k],
      ],
      PARAKEET_DARK,
      { outline: true, w: 0.045, layer: 2 },
    );
  }
}

function dogShape(pen: Pen, flip: boolean, frame: 0 | 1 | 2, col: RGB): void {
  const c = pen.card(0, 0, 0, flip);
  if (frame === 0) {
    c.bar(-0.36, 0.42, -0.64, 0.06, 0.13, col);
    c.bar(0.3, 0.42, 0.62, 0.1, 0.13, col);
  } else if (frame === 1) {
    c.bar(-0.3, 0.42, -0.12, 0.05, 0.13, col);
    c.bar(0.24, 0.42, 0.08, 0.05, 0.13, col);
  } else {
    c.bar(-0.34, 0.42, -0.34, 0.04, 0.13, col);
    c.bar(0.3, 0.42, 0.3, 0.04, 0.13, col);
  }
  c.poly(
    [
      [-0.5, 0.36],
      [0.42, 0.36],
      [0.46, 0.74],
      [-0.46, 0.7],
    ],
    col,
    { outline: true, w: W_FINE, layer: 1 },
  );
  c.bar(-0.46, 0.66, -0.76, frame === 2 ? 0.86 : 1.0, 0.1, col, { layer: 1 });
  c.circle(0.56, 0.86, 0.24, col, { outline: true, w: W_FINE, seg: 9, layer: 2, grain: 0.4 });
  c.poly(
    [
      [0.72, 0.88],
      [0.97, 0.82],
      [0.74, 0.72],
    ],
    col,
    { outline: true, w: 0.045, layer: 2 },
  );
  c.poly(
    [
      [0.4, 1.0],
      [0.47, 1.2],
      [0.6, 1.02],
    ],
    scaleRGB(col, 0.7),
    { layer: 3 },
  );
}

function noteShape(pen: Pen, two: boolean): void {
  const c = pen.card(0, 0, 0);
  c.ellipse(0, 0.12, 0.17, 0.12, C.ink, { seg: 8, grain: 0 });
  c.seg(0.15, 0.14, 0.15, 0.8, { w: 0.06, wobble: 0 });
  if (two) {
    c.ellipse(0.5, 0.2, 0.17, 0.12, C.ink, { seg: 8, grain: 0 });
    c.seg(0.65, 0.22, 0.65, 0.88, { w: 0.06, wobble: 0 });
    c.seg(0.15, 0.8, 0.65, 0.88, { w: 0.12, wobble: 0 });
  } else {
    c.line(
      [
        [0.15, 0.8],
        [0.4, 0.66],
        [0.42, 0.5],
      ],
      { w: 0.07, wobble: 0 },
    );
  }
}

// ---------------------------------------------------------------- the park

export const vondel: BlockBuilder = (c: BlockCtx) => {
  const { pen, rng } = c;
  const w3 = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];

  // ---- ground: lawn, paths, pond, terraces
  c.early(() => {
    const lawn = pen.floor(0, 1);
    lawn.poly(roundRect(X0, Y0, X1, Y1, 1.6), C.grass, { outline: true, w: W_THIN });
    // paler patches where the sun gets through
    for (const [px, py, rx, ry] of [
      [13, 28, 3.2, 1.6],
      [31, 28.5, 4.4, 2.2],
      [29, 19.5, 3.2, 1.7],
      [16, 42.6, 5, 1.2],
      [28, 40.5, 2.2, 2.6],
      [20.5, 12.5, 1.6, 2.4],
    ]) {
      const pts: V2[] = [];
      const ph = rng.range(0, 6.28);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const k = 1 + 0.12 * Math.sin(3 * a + ph);
        pts.push([px + Math.cos(a) * rx * k, py + Math.sin(a) * ry * k]);
      }
      lawn.poly(pts, C.grassLight, { layer: 0.4, grain: 0.9 });
    }
    lawn.ticks(X0, Y0, X1, Y1, { n: 520, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06, layer: 0.6, inside: (a, b) => onLawn(a, b) });

    const g = pen.floor(0, 2);
    // paths: sand, no ink, just a darker edge that stops where another path joins
    const edge = scaleRGB(C.path, 0.82);
    WALKS.forEach((wk, wi) => {
      const L = sideOf(wk.pts, wk.closed, wk.w / 2);
      const R = sideOf(wk.pts, wk.closed, -wk.w / 2);
      const n = wk.pts.length;
      const m = wk.closed ? n : n - 1;
      pen.begin();
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % n;
        g.poly([L[i], L[j], R[j], R[i]], C.path, { grain: 0.9 });
      }
      for (const side of [L, R]) {
        let run: V2[] = [];
        const flush = () => {
          if (run.length > 1) g.line(run, { w: 0.07, color: edge, kind: L_MARK, wobble: 0.5 });
          run = [];
        };
        for (let i = 0; i <= (wk.closed ? n : n - 1); i++) {
          const p = side[i % n];
          const hidden =
            onAnyPath(p[0], p[1], -0.12, wi) || Math.hypot(p[0] - STATUE[0], p[1] - STATUE[1]) < 3.25 || (Math.abs(p[0] - 24) < 1.2 && p[1] > BR_Y0 && p[1] < BR_Y1);
          if (hidden) flush();
          else run.push(p);
        }
        flush();
      }
      pen.end();
    });
    // the round place at the statue, the teahouse terrace, the bandstand's gravel
    g.circle(STATUE[0], STATUE[1], 3.3, C.path, { seg: 26, grain: 0.9 });
    g.circle(STATUE[0], STATUE[1], 3.3, null, { ink: edge, w: 0.07, seg: 26 });
    g.circle(TEA[0], TEA[1], 6.2, C.plaza, { seg: 30, outline: true, ink: scaleRGB(C.plaza, 0.8), w: 0.07 });
    g.circle(TEA[0], TEA[1], 4.5, null, { ink: scaleRGB(C.plaza, 0.85), w: 0.06, seg: 26 });
    g.circle(BAND[0], BAND[1], 3.6, C.path, { seg: 22, outline: true, ink: edge, w: 0.07 });
    // playground sand
    g.poly(roundRect(31.4, 33.2, 38.4, 41.4, 0.9), C.sand, { outline: true, ink: C.woodDark, w: 0.1 });
    pen.floor(0, 3).ticks(31.8, 33.6, 38, 41, { n: 40, len: 0.25, ang: 0.3, jit: 1.5, color: scaleRGB(C.sand, 0.82), w: 0.06 });

    // the pond
    g.poly(POND, C.water, { kind: F_WATER, outline: true, ink: C.waterInk, w: 0.1 });
    const pw = pen.floor(0, 3);
    pw.ticks(10, 30, 30, 41, {
      n: 46,
      len: 0.9,
      ang: -Math.PI / 4,
      jit: 0.08,
      bend: 0.22,
      color: C.waterInk,
      w: 0.065,
      kind: L_RIPPLE,
      alpha: 0.8,
      inside: (a, b) => inPoly(a, b, POND) && distToPath(a, b, POND, true) > 0.7 && !(Math.abs(a - 24) < 1.1),
    });
    // shade under the footbridge
    pw.rect(BR_X0, 32.9, BR_X0 + BR_W, 35.4, C.waterDeep, { grain: 0.6 });
    // lily pads in the bay
    for (let i = 0; i < 9; i++) {
      const a = rng.range(0, 6.28);
      const r = rng.range(0.2, 1.2);
      const lx = 28 + Math.cos(a) * r;
      const ly = 34.2 + Math.sin(a) * r * 0.9;
      pw.ellipse(lx, ly, 0.34, 0.3, C.leafDark, { outline: true, w: 0.04, seg: 8, a0: 0.5, a1: 6.0, grain: 0.4 });
      if (i % 3 === 0) pen.card(lx, ly, 0).circle(0, 0.18, 0.13, C.pink, { seg: 6, grain: 0, outline: true, w: 0.035 });
    }
  });

  // ---- the edge of the park: hedge, railings, gates, a ring of trees
  const fence = (pts: V3[]) => railing(pen, pts, 0.8, PARK_GREEN, 1.6);
  fence([
    [X0, 22.3, 0],
    [X0, Y0 + 1.2, 0],
  ]);
  fence([
    [X0 + 1.2, Y0, 0],
    [22.3, Y0, 0],
  ]);
  fence([
    [25.7, Y0, 0],
    [X1 - 1.2, Y0, 0],
  ]);
  fence([
    [X1, Y0 + 1.2, 0],
    [X1, 22.3, 0],
  ]);
  fence([
    [X1, 25.7, 0],
    [X1, Y1 - 1.4, 0],
  ]);
  fence([
    [X0, 25.7, 0],
    [X0, Y1 - 1.4, 0],
  ]);
  railing(
    pen,
    [
      [X0 + 1.4, Y1, 0],
      [X1 - 1.4, Y1, 0],
    ],
    0.8,
    PARK_GREEN,
    1.6,
  );
  hedge(pen, 8.4, 6.9, 13.6, 0.5, 0.6);
  hedge(pen, 26, 6.9, 13.6, 0.5, 0.6);
  hedge(pen, 6.9, 8.4, 0.5, 13.6, 0.6);
  hedge(pen, 6.9, 26, 0.5, 19.5, 0.6);

  for (const [gx, gy, side] of [
    [X1, 24, "x"],
    [24, Y0, "y"],
    [X0, 24, "x"],
  ] as const) {
    if (side === "x") {
      gatePost(pen, gx, gy - 1.75);
      gatePost(pen, gx, gy + 1.75);
      const f = pen.wall("x+", gx - 0.1, gy - 1.33, 2.55, 0.2, 2.66);
      pen.obj(() => {
        f.rect(0, 0, 2.66, 0.72, C.door, { outline: true, w: W_THIN });
        f.text("VONDELPARK", 1.33, 0.2, 0.27, { align: "c", color: C.gold, kind: L_MARK, layer: 1, w: 0.06 });
      });
    } else {
      gatePost(pen, gx - 1.75, gy);
      gatePost(pen, gx + 1.75, gy);
      const f = pen.wall("y+", gx - 1.33, gy - 0.1, 2.55, 2.66, 0.2);
      pen.obj(() => {
        f.rect(0, 0, 2.66, 0.72, C.door, { outline: true, w: W_THIN });
        f.text("VONDELPARK", 1.33, 0.2, 0.27, { align: "c", color: C.gold, kind: L_MARK, layer: 1, w: 0.06 });
      });
    }
  }

  // trees just inside the fence: thick along the two far sides, lighter on the near ones
  for (let a = 8.6; a < 40; a += rng.range(3.4, 4.4)) {
    if (Math.abs(a - 24) < 2.6) continue;
    tree(pen, rng, a, 7.5, { kind: rng.chance(0.25) ? "tall" : "round" });
  }
  for (let a = 9.5; a < 46; a += rng.range(3.4, 4.4)) {
    if (Math.abs(a - 24) < 2.6) continue;
    tree(pen, rng, 7.45, a, { kind: rng.chance(0.25) ? "tall" : "round" });
  }
  for (let a = 9; a < 45; a += rng.range(6, 7.5)) {
    if (Math.abs(a - 24) < 2.8) continue;
    tree(pen, rng, 40.95, a, { kind: rng.chance(0.4) ? "blossom" : "round", r: 1.15, h: 1.6 });
  }

  // ---- the Blauwe Theehuis: two stacked saucers of glass and blue steel
  {
    const [tx, ty] = TEA;
    const roof = hex("#cfe1f1");
    const mullions = (r: number, z0: number, z1: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pen.stroke(
          [
            [tx + Math.cos(a) * r, ty + Math.sin(a) * r, z0],
            [tx + Math.cos(a) * r, ty + Math.sin(a) * r, z1],
          ],
          { w: 0.09, color: TEA_BLUE, kind: L_MARK, wobble: 0 },
        );
      }
    };
    pen.obj(() => {
      pen.cyl(tx, ty, 0, 2.85, 0.45, TEA_BLUE, { seg: 16, top: null });
      pen.cyl(tx, ty, 0.45, 2.8, 1.6, C.glassPale, { seg: 16, top: null, glow: 0.85, grain: 0.4 });
      mullions(2.82, 0.45, 2.05, 16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        pen.pole([tx + Math.cos(a) * 3.95, ty + Math.sin(a) * 3.95, 0], [tx + Math.cos(a) * 3.95, ty + Math.sin(a) * 3.95, 2.05], 0.11, TEA_BLUE);
      }
    });
    pen.obj(() => {
      pen.cyl(tx, ty, 2.05, 4.4, 0.5, TEA_BLUE, { seg: 22, top: C.stone });
      railing(pen, ring3(tx, ty, 4.25, 2.55, 22), 0.6, TEA_BLUE, 1.3);
    }, 0.12);
    pen.obj(() => {
      pen.cyl(tx, ty, 2.55, 1.9, 1.75, C.glassPale, { seg: 14, top: null, glow: 0.85, grain: 0.4 });
      mullions(1.92, 2.55, 4.3, 14);
    }, 0.24);
    pen.obj(() => {
      pen.cyl(tx, ty, 4.3, 2.75, 0.5, TEA_BLUE, { seg: 20, top: roof });
    }, 0.36);
    flag(pen, tx, ty, 4.8, 2.3, "amsterdam", 0.7);
    // people leaning on the upper rail
    for (const a of [-0.6, -0.05, 0.5, 1.05, 1.62, 2.2]) {
      person(pen, tx + Math.cos(a) * 3.3, ty + Math.sin(a) * 3.3, 2.55, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5));
    }
    // terrace tables to either side, so the saucers stay in view
    const sun = [TEA_BLUE, C.white, null, C.yellow, TEA_BLUE];
    [-0.82, -0.2, 0.78, 1.78, 2.4].forEach((a, i) => {
      cafeTable(pen, rng, tx + Math.cos(a) * 5.3, ty + Math.sin(a) * 5.3, sun[i], rng.int(2, 5));
    });
    person(pen, tx + 2.5, ty + 4.0, 0, { skin: hex("#eebb96"), hair: hex("#2b2019"), top: C.white, legs: C.black, long: false, hat: null }, "walkA", false);
    held(pen, tx + 2.5, ty + 4.0, 0, (cd) => {
      cd.rect(0.42, 1.0, 0.95, 1.06, C.greyDark, { outline: true, w: 0.04 });
      cd.rect(0.5, 1.06, 0.62, 1.3, C.orange, { outline: true, w: 0.04 });
      cd.rect(0.74, 1.06, 0.86, 1.26, C.yellow, { outline: true, w: 0.04 });
    });
  }

  // ---- the bandstand, the band, and the people who came to listen
  {
    const [bx, by] = BAND;
    pen.obj(() => {
      pen.cyl(bx, by, 0, 2.6, 0.5, C.stone, { seg: 8 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        pen.pole([bx + Math.cos(a) * 2.35, by + Math.sin(a) * 2.35, 0.5], [bx + Math.cos(a) * 2.35, by + Math.sin(a) * 2.35, 4.0], 0.11, C.white);
      }
      const rail: V3[] = [];
      for (let i = 2; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        rail.push([bx + Math.cos(a) * 2.35, by + Math.sin(a) * 2.35, 0.5]);
      }
      railing(pen, rail, 0.6, C.white, 2.2);
    });
    pen.obj(() => {
      pen.cyl(bx, by, 3.9, 2.9, 0.16, C.white, { seg: 8, top: null });
      pen.cone(bx, by, 4.05, 2.95, 1.4, C.copper, { seg: 8, crease: 8 });
      pen.pole([bx, by, 5.45], [bx, by, 6.0], 0.08, C.gold);
      pen.card(bx, by, 6.0).circle(0, 0.16, 0.17, C.gold, { outline: true, w: W_FINE, seg: 8 });
    }, 0.2);
    const uniform = (i: number): Look => ({ skin: [hex("#f6d3b8"), hex("#d39a6c"), hex("#a8724c"), hex("#eebb96")][i % 4], hair: hex("#2b2019"), top: C.redDark, legs: C.black, long: false, hat: C.black });
    const band: [number, number, string][] = [
      [1.5, -0.4, "trumpet"],
      [0.9, 0.9, "tuba"],
      [-0.2, 1.55, "drum"],
      [0.1, 0.0, "trumpet"],
    ];
    band.forEach(([dx, dy, what], i) => {
      person(pen, bx + dx, by + dy, 0.5, uniform(i), "stand", i % 2 === 0);
      held(pen, bx + dx, by + dy, 0.5, (cd) => {
        const s = i % 2 === 0 ? -1 : 1;
        if (what === "trumpet") {
          cd.bar(s * 0.1, 1.5, s * 0.72, 1.62, 0.1, C.gold);
          cd.circle(s * 0.78, 1.63, 0.16, C.gold, { outline: true, w: 0.04, seg: 8, layer: 1 });
        } else if (what === "tuba") {
          cd.circle(s * 0.32, 1.25, 0.34, C.gold, { outline: true, w: 0.045, seg: 10 });
          cd.circle(s * 0.5, 1.9, 0.26, C.gold, { outline: true, w: 0.045, seg: 9, layer: 1 });
          cd.bar(s * 0.36, 1.5, s * 0.48, 1.75, 0.12, C.gold);
        } else {
          cd.ellipse(0, 0.95, 0.42, 0.3, C.white, { outline: true, w: 0.045, seg: 10 });
          cd.rect(-0.42, 0.72, 0.42, 0.95, C.red, { outline: true, w: 0.045 });
        }
      });
    });
    // the conductor, down on the gravel with his back to the benches
    person(pen, bx + 2.6, by + 2.5, 0, { skin: hex("#eebb96"), hair: hex("#d9d5cf"), top: C.black, legs: C.black, long: false, hat: null }, "cheer", false);
    // benches in rows, and a few who brought their own blanket
    for (let r = 0; r < 3; r++) {
      for (const ax of [31.3, 34.4, 37.0]) {
        if (r === 2 && ax > 36) continue;
        const yy = 18.5 + r * 1.55;
        plankBench(pen, ax, yy, 2.2);
        for (const o of [-0.62, 0.05, 0.7]) {
          if (rng.chance(0.2)) continue;
          person(pen, ax + o, yy - 0.05, 0, randomLook(rng), "sit", rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
        }
      }
    }
    person(pen, 29.6, 17.4, 0, randomLook(rng), "cheer", false, 0.72);
    person(pen, 30.3, 17.9, 0, randomLook(rng), "wave", true, 0.72);
  }

  // ---- a small rose garden
  {
    const roses = [C.red, C.pink, C.white, hex("#f6a4b8"), C.red];
    for (const [rx, ry] of [
      [26.2, 10.9],
      [28.6, 10.9],
      [26.2, 13.2],
      [28.6, 13.2],
    ]) {
      flowerBed(pen, rng, rx, ry, 1.9, 1.8, roses, 3.2);
    }
    pen.obj(() => {
      pen.cyl(28.35, 12.95, 0, 0.3, 0.7, C.stone, { seg: 8 });
      pen.card(28.35, 12.95, 0.7).circle(0, 0.2, 0.22, C.stone, { outline: true, w: W_FINE, seg: 8 });
    });
    hedge(pen, 25.7, 10.4, 5.3, 0.3, 0.45);
    hedge(pen, 25.7, 10.7, 0.3, 4.6, 0.45);
  }

  // ---- Vondel himself, in bronze, with a pigeon
  {
    const [sx, sy] = STATUE;
    pen.obj(() => {
      pen.box(sx - 1.0, sy - 1.0, 0, 2.0, 2.0, 0.4, C.stone);
      pen.box(sx - 0.65, sy - 0.65, 0.4, 1.3, 1.3, 2.1, C.stone);
      pen.box(sx - 0.78, sy - 0.78, 2.5, 1.56, 1.56, 0.22, C.stoneDark, { w: W_THIN });
      pen.wall("y+", sx - 0.65, sy - 0.65, 0.4, 1.3, 1.3).text("VONDEL", 0.65, 1.2, 0.17, { align: "c", w: 0.05, color: C.inkSoft });
      pen.wall("x+", sx - 0.65, sy - 0.65, 0.4, 1.3, 1.3).text("VONDEL", 0.65, 1.2, 0.17, { align: "c", w: 0.05, color: C.inkSoft });
    });
    const bronze: Look = { skin: BRONZE, hair: BRONZE, top: BRONZE, legs: scaleRGB(BRONZE, 0.85), long: true, hat: null };
    pen.obj(() => {
      pen.box(sx - 0.4, sy - 0.35, 2.72, 0.8, 0.7, 0.5, scaleRGB(BRONZE, 0.85), { w: W_THIN });
      person(pen, sx, sy, 2.82, bronze, "sit", false, 1.15);
      const pg = pen.card(sx, sy, 4.95);
      pg.layer = 6;
      pg.ellipse(0.02, 0.1, 0.2, 0.13, C.slateLight, { outline: true, w: 0.04, seg: 8 });
      pg.circle(0.2, 0.22, 0.09, C.slateLight, { outline: true, w: 0.04, seg: 7 });
    }, 0.25);
    // a ring of flowers round the plinth
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      pen.card(sx + Math.cos(a) * 1.75, sy + Math.sin(a) * 1.75, 0).circle(0, 0.25, 0.17, [C.red, C.yellow, C.orange][i % 3], { seg: 6, grain: 0, sway: 0.1, outline: true, w: 0.035 });
    }
    bench(pen, sx - 2.3, sy - 2.2, 45);
    bench(pen, sx + 2.4, sy - 2.3, 315);
    person(pen, sx + 2.25, sy - 2.15, 0, randomLook(rng), "sit", false);
    person(pen, sx - 2.5, sy + 1.0, 0, randomLook(rng), "stand", true);
    held(pen, sx - 2.5, sy + 1.0, 0, (cd) => cd.rect(-0.2, 1.52, 0.2, 1.78, C.black, { outline: true, w: 0.04 }));
  }

  // ---- ice-cream cart, with a queue that is mostly children
  {
    const ix = 27.6;
    const iy = 20.6;
    pen.obj(() => {
      pen.box(ix - 0.9, iy - 0.5, 0.35, 1.8, 1.0, 0.85, C.white);
      const f = pen.wall("y+", ix - 0.9, iy - 0.5, 0.35, 1.8, 1.0);
      f.rect(0, 0.28, 1.8, 0.56, C.pink, { grain: 0.5 });
      f.text("IJS", 0.9, 0.62, 0.17, { align: "c", w: 0.05 });
      for (const wx of [ix - 0.55, ix + 0.55]) {
        const wp = pen.plane([wx, iy + 0.53, 0.33], [1, 0, 0], [0, 0, 1], 0, true);
        wp.circle(0, 0, 0.32, C.white, { outline: true, w: 0.06, seg: 10 });
      }
      pen.pole([ix, iy, 1.2], [ix, iy, 2.7], 0.08, C.white, { ink: false });
      pen.cone(ix, iy, 2.4, 1.4, 0.5, C.pink, { seg: 8, crease: 8 });
      const sign = pen.card(ix + 0.95, iy - 0.45, 1.25);
      sign.poly(
        [
          [-0.2, 0.5],
          [0.2, 0.5],
          [0, -0.1],
        ],
        C.ochre,
        { outline: true, w: 0.045 },
      );
      sign.circle(0, 0.62, 0.22, C.pink, { outline: true, w: 0.045, seg: 8, layer: 1 });
      sign.circle(0.1, 0.86, 0.17, C.cream, { outline: true, w: 0.045, seg: 8, layer: 2 });
    });
    person(pen, ix, iy - 0.75, 0, { skin: hex("#d39a6c"), hair: hex("#1c1a1c"), top: C.white, legs: C.blueDark, long: false, hat: C.pink }, "stand", false);
    const q: [number, number, number][] = [
      [0.2, 1.2, 0.72],
      [0.5, 2.0, 0.72],
      [0.25, 2.8, 1],
      [0.7, 3.5, 0.72],
    ];
    q.forEach(([dx, dy, s], i) => person(pen, ix + dx, iy + dy, 0, randomLook(rng), i === 1 ? "cheer" : "stand", i % 2 === 0, s));
  }

  // ---- the footbridge
  {
    const L = BR_Y1 - BR_Y0;
    const side = pen.plane([BR_X0, BR_Y0, 0], [0, 1, 0], [0, 0, 1]);
    const prof: V2[] = [[0, 0]];
    const n = 12;
    for (let i = 0; i <= n; i++) prof.push([(L * i) / n, bridgeTop(BR_Y0 + (L * i) / n)]);
    prof.push([L, 0]);
    for (let i = n - 1; i >= 1; i--) {
      const a = (L * i) / n;
      if (a < 0.7 || a > L - 0.7) continue;
      prof.push([a, Math.max(0.02, bridgeTop(BR_Y0 + a) - 0.3)]);
    }
    pen.obj(() => {
      side.extrude(prof, BR_W, C.wood, { crease: 25, w: 0.1 });
      for (const x of [BR_X0 + 0.08, BR_X0 + BR_W - 0.08]) {
        const pts: V3[] = [];
        for (let i = 0; i <= 8; i++) {
          const y = BR_Y0 + (L * i) / 8;
          pts.push([x, y, bridgeTop(y)]);
        }
        railing(pen, pts, 0.75, PARK_GREEN, 0.9);
      }
    });
    person(pen, 24.3, 34.1, bridgeTop(34.1), randomLook(rng), "wave", false);
    person(pen, 23.7, 33.5, bridgeTop(33.5), randomLook(rng), "stand", true, 0.72);
  }

  // ---- the fountain's stone base (the water is a mover), and reeds
  pen.obj(() => {
    pen.cyl(FOUNTAIN[0], FOUNTAIN[1], 0, 0.55, 0.3, C.stone, { seg: 10 });
    pen.cyl(FOUNTAIN[0], FOUNTAIN[1], 0.3, 0.2, 0.3, C.stone, { seg: 8 });
  });
  for (const [rx, ry] of [
    [11.2, 33.2],
    [11.6, 37.9],
    [20.8, 39.6],
    [28.9, 33],
  ]) {
    pen.obj(() => {
      for (let i = 0; i < 7; i++) {
        const cd = pen.card(rx + rng.range(-0.5, 0.5), ry + rng.range(-0.5, 0.5), 0);
        const h = rng.range(0.7, 1.3);
        cd.bar(0, 0, rng.range(-0.15, 0.15), h, 0.08, C.leafDark, { ink: false, sway: 0, swayB: 0.3 });
        if (i % 3 === 0) cd.bar(0, h * 0.75, 0, h * 1.05, 0.15, C.woodDark, { ink: false, sway: 0.25, swayB: 0.3 });
      }
    });
  }

  // ---- a heron, perfectly still, and a child feeding the ducks
  pen.obj(() => {
    const hc = pen.card(21.9, 38.3, 0);
    hc.bar(-0.08, 0, -0.06, 0.62, 0.05, C.ochre, { ink: false });
    hc.bar(0.1, 0, 0.08, 0.62, 0.05, C.ochre, { ink: false });
    hc.ellipse(0, 0.82, 0.36, 0.24, C.slateLight, { outline: true, w: W_FINE, seg: 10, layer: 1 });
    hc.bar(0.22, 0.95, 0.3, 1.5, 0.11, C.stone, { layer: 2 });
    hc.circle(0.33, 1.58, 0.13, C.white, { outline: true, w: 0.045, seg: 8, layer: 3 });
    hc.poly(
      [
        [0.42, 1.62],
        [0.86, 1.5],
        [0.42, 1.52],
      ],
      C.ochre,
      { outline: true, w: 0.04, layer: 4 },
    );
    hc.seg(0.22, 1.66, 0.02, 1.76, { w: 0.05, wobble: 0, layer: 4 });
  });
  person(pen, 12.4, 39.9, 0, randomLook(rng), "wave", false, 0.72);
  person(pen, 11.6, 40.2, 0, randomLook(rng), "stand", true);

  // ---- lawn life
  // a guitarist and a half circle of listeners
  {
    const gx = 17.3;
    const gy = 27.0;
    person(pen, gx, gy, 0, { skin: hex("#eebb96"), hair: hex("#7c5230"), top: hex("#3f8f58"), legs: hex("#2f3b55"), long: true, hat: null }, "sit", false);
    held(pen, gx, gy, 0, (cd) => {
      cd.ellipse(0.12, 0.72, 0.3, 0.24, C.wood, { outline: true, w: 0.045, seg: 10 });
      cd.circle(0.12, 0.72, 0.09, C.woodDark, { seg: 7, layer: 1 });
      cd.bar(0.3, 0.84, 0.85, 1.2, 0.09, C.woodDark, { layer: 1 });
    });
    for (const a of [-0.3, 0.35, 1.0, 1.65, 2.3]) {
      person(pen, gx + Math.cos(a) * 1.9, gy + Math.sin(a) * 1.5 + 0.3, 0, randomLook(rng), "sit", Math.cos(a) > 0.2, rng.chance(0.2) ? 0.72 : 1);
    }
  }
  // a hammock slung between two trees, someone in it
  {
    const hy = 26.9;
    tree(pen, rng, 10.5, hy, { h: 2.3, r: 1.45 });
    tree(pen, rng, 13.9, hy, { h: 2.3, r: 1.45 });
    const hp = pen.plane([10.65, hy, 0], [1, 0, 0], [0, 0, 1], 0, true);
    const top = (a: number) => 1.55 - 0.42 * Math.sin((Math.PI * a) / 3.1);
    const bot = (a: number) => 1.55 - 1.05 * Math.sin((Math.PI * a) / 3.1);
    const band: V2[] = [];
    for (let i = 1; i <= 9; i++) band.push([(3.1 * i) / 10, top((3.1 * i) / 10)]);
    for (let i = 9; i >= 1; i--) band.push([(3.1 * i) / 10, bot((3.1 * i) / 10)]);
    pen.obj(() => {
      hp.poly(band, C.orange, { outline: true, w: W_THIN, grain: 0.7 });
      for (const k of [0.33, 0.66]) {
        const pts: V2[] = [];
        for (let i = 1; i <= 9; i++) {
          const a = (3.1 * i) / 10;
          pts.push([a, top(a) + (bot(a) - top(a)) * k]);
        }
        hp.line(pts, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
      }
      hp.seg(0, 1.55, 0.31, top(0.31), { w: 0.06, kind: L_BAR, wobble: 0 });
      hp.seg(3.1, 1.55, 2.79, top(2.79), { w: 0.06, kind: L_BAR, wobble: 0 });
      // head at one end, feet at the other
      const hd = pen.card(11.45, hy, 1.25);
      hd.layer = 3;
      hd.circle(0, 0.2, 0.3, hex("#d39a6c"), { outline: true, w: W_FINE, seg: 9 });
      hd.ellipse(-0.05, 0.36, 0.32, 0.2, hex("#2b2019"), { seg: 8, a0: 0, a1: Math.PI, layer: 1 });
      const ft = pen.card(13.25, hy, 1.3);
      ft.layer = 3;
      ft.circle(-0.1, 0.12, 0.13, hex("#d39a6c"), { outline: true, w: 0.04, seg: 7 });
      ft.circle(0.14, 0.16, 0.13, hex("#d39a6c"), { outline: true, w: 0.04, seg: 7 });
    });
  }
  // picnics
  picnic(pen, rng, 27.6, 27.0, 4, C.red);
  picnic(pen, rng, 34.4, 26.6, 3, C.blue);
  picnic(pen, rng, 20.4, 18.6, 2, C.yellow);
  // sunbathers by the pond
  sunbather(pen, rng, 11.8, 42.4, 80);
  sunbather(pen, rng, 14.6, 42.6, 96);
  sunbather(pen, rng, 18.4, 42.3, 84);
  pen.obj(() => {
    pen.pole([16.5, 41.7, 0], [16.5, 41.7, 2.0], 0.08, C.white, { ink: false });
    pen.cone(16.5, 41.7, 1.75, 1.3, 0.45, C.yellow, { seg: 8, crease: 8 });
  });
  // yoga: one teacher, six mats
  {
    const mats = [C.purple, C.teal, C.pink, C.orange, C.sky, C.lilac];
    const g = pen.floor(0.02, 2);
    let k = 0;
    for (const my of [39.4, 41.7]) {
      for (const mx of [26.1, 27.6, 29.1]) {
        const col = mats[k % mats.length];
        pen.obj(() => {
          g.rect(mx, my, mx + 0.95, my + 1.9, col, { outline: true, w: W_FINE, grain: 0.6 });
        });
        person(pen, mx + 0.48, my + 0.9, 0, randomLook(rng), "cheer", k % 2 === 0);
        k++;
      }
    }
    pen.obj(() => g.rect(27.6, 37.0, 28.55, 38.9, C.green, { outline: true, w: W_FINE, grain: 0.6 }));
    person(pen, 28.08, 37.9, 0, { skin: hex("#a8724c"), hair: hex("#1c1a1c"), top: C.white, legs: C.purple, long: true, hat: null }, "cheer", false);
  }
  // the dog's owner, arm up, about to throw again
  person(pen, 30.4, 29.5, 0, randomLook(rng), "wave", false);
  // the kite flyer
  person(pen, 20.6, 43.6, 0, randomLook(rng), "wave", false, 0.78);
  // strollers and sitters
  for (const [px, py, pose, s] of [
    [12.3, 30.3, "stand", 1],
    [13.2, 30.6, "stand", 0.72],
    [19.6, 29.7, "sit", 1],
    [29.3, 31.2, "stand", 1],
    [36.9, 30.6, "sit", 1],
    [37.4, 31.1, "sit", 1],
    [35.8, 20.0, "stand", 1],
    [20.6, 11.4, "stand", 1],
    [12.2, 22.0, "sit", 1],
    [22.6, 44.3, "stand", 1],
  ] as const) {
    person(pen, px, py, 0, randomLook(rng), pose, rng.chance(0.5), s);
  }

  // ---- the playground
  {
    // slide
    pen.obj(() => {
      for (const [px, py] of [
        [32.5, 34.4],
        [33.7, 34.4],
        [32.5, 35.6],
        [33.7, 35.6],
      ]) {
        pen.pole([px, py, 0], [px, py, 2.4], 0.12, C.yellow);
      }
      pen.box(32.45, 34.35, 1.45, 1.3, 1.3, 0.12, C.blue, { w: W_THIN });
      pen.pyramid(32.35, 34.25, 2.4, 1.5, 1.5, 0.75, C.red);
      // the chute
      pen.fill(
        [
          [32.7, 35.6, 1.55],
          [33.5, 35.6, 1.55],
          [33.5, 38.5, 0.15],
          [32.7, 38.5, 0.15],
        ],
        C.red,
        { outline: true, w: W_THIN },
      );
      for (const x of [32.7, 33.5]) {
        pen.stroke(
          [
            [x, 35.6, 1.9],
            [x, 38.5, 0.45],
          ],
          { w: 0.1, color: C.redDark, kind: L_BAR, wobble: 0 },
        );
      }
      // ladder at the back
      for (let i = 1; i <= 4; i++) {
        pen.stroke(
          [
            [32.5, 34.4, i * 0.3],
            [33.7, 34.4, i * 0.3],
          ],
          { w: 0.07, color: C.yellow, kind: L_BAR, wobble: 0 },
        );
      }
    });
    person(pen, 33.1, 35.0, 1.57, randomLook(rng), "cheer", false, 0.7);
    person(pen, 33.1, 37.4, 0.75, randomLook(rng), "sit", false, 0.7);
    // swing frame (the swings themselves move)
    pen.obj(() => {
      for (const x of [35.3, 37.7]) {
        pen.pole([x, 35.3, 0], [x, 36.2, 2.5], 0.12, C.blue);
        pen.pole([x, 37.1, 0], [x, 36.2, 2.5], 0.12, C.blue);
      }
      pen.pole([35.3, 36.2, 2.5], [37.7, 36.2, 2.5], 0.13, C.blue);
    });
    // seesaw
    pen.obj(() => {
      pen.box(33.35, 39.75, 0, 0.5, 0.5, 0.5, C.blue, { w: W_THIN });
      pen.pole([32.1, 40, 0.28], [34.9, 40, 0.92], 0.16, C.yellow);
    });
    person(pen, 32.25, 40, 0.3, randomLook(rng), "sit", false, 0.7);
    person(pen, 34.75, 40, 0.9, randomLook(rng), "cheer", true, 0.7);
    // sandpit things
    pen.obj(() => {
      pen.cyl(36.2, 39.4, 0, 0.2, 0.3, C.red, { seg: 7, w: W_FINE });
      pen.cone(35.6, 39.9, 0, 0.35, 0.35, C.sand, { seg: 7, w: W_FINE });
    });
    person(pen, 36.6, 40.1, 0, randomLook(rng), "sit", true, 0.7);
    person(pen, 35.3, 40.6, 0, randomLook(rng), "sit", false, 0.7);
    bench(pen, 37.8, 38.2, 270);
    person(pen, 37.6, 37.9, 0, randomLook(rng), "sit", true);
    person(pen, 37.6, 38.6, 0, randomLook(rng), "sit", true);
  }

  // ---- trees inside the park (the perching ones are placed by hand)
  const PERCH: V3[] = [
    [10.9, 21.6, 4.9],
    [26.6, 16.6, 4.9],
    [38.0, 21.7, 4.9],
    [22.2, 29.9, 4.9],
  ];
  for (const p of PERCH) tree(pen, rng, p[0], p[1], { h: 2.2, r: 1.55, color: C.leaf2 });
  for (const [tx, ty, kind] of [
    [11.6, 11.6, "tall"],
    [13.3, 10.9, "tall"],
    [21.7, 10.9, "round"],
    [10.6, 16.4, "round"],
    [22.3, 21.3, "blossom"],
    [27.4, 20.9, "blossom"],
    [38.0, 11.8, "tall"],
    [38.3, 17.0, "round"],
    [10.5, 30.6, "round"],
    [10.4, 40.7, "round"],
    [22.8, 41.2, "blossom"],
    [30.5, 36.5, "blossom"],
    [38.3, 32.1, "round"],
    [37.9, 43.0, "round"],
    [25.9, 30.9, "round"],
    [20.8, 20.9, "round"],
    [29.6, 22.3, "blossom"],
    [19.2, 22.2, "round"],
    [36.6, 23.0, "blossom"],
    [26.2, 44.2, "bush"],
    [12.6, 44.1, "bush"],
    [17.6, 44.1, "bush"],
    [31.5, 43.9, "bush"],
  ] as const) {
    tree(pen, rng, tx, ty, { kind });
  }
  // lamps and benches on the ring path, facing the water on the open side
  for (const [lx, ly] of [
    [22.9, 10.2],
    [25.2, 17.5],
    [22.8, 29.4],
    [25.3, 42.5],
    [38.7, 25.3],
    [9.8, 25.3],
    [14.5, 46.6],
    [33.5, 46.4],
  ]) {
    lamp(pen, lx, ly, 0, 2.7);
  }
  for (const bx of [11.5, 19.2, 28.6, 36.5]) {
    bench(pen, bx, 46.75, 0);
    if (rng.chance(0.75)) person(pen, bx - 0.4, 46.8, 0, randomLook(rng), "sit", false);
    if (rng.chance(0.5)) person(pen, bx + 0.45, 46.8, 0, randomLook(rng), "sit", true);
  }

  // ================================================================ movers
  const born = c.done;

  // ---- joggers, skaters and strollers on the ring path
  {
    const lane = (o: number, rev: boolean): Route => {
      const pts = sideOf(LOOP, true, o);
      const v: V3[] = pts.map((p) => w3(p[0], p[1], 0));
      return new Route(rev ? v.reverse() : v, true);
    };
    const a = lane(0.5, false);
    const b = lane(-0.5, true);
    const sporty = (i: number): Look => ({
      skin: [hex("#f6d3b8"), hex("#a8724c"), hex("#eebb96"), hex("#6f4630")][i % 4],
      hair: [hex("#2b2019"), hex("#c99a55"), hex("#b24e30")][i % 3],
      top: SHIRT[(i * 3 + 1) % 8],
      legs: C.black,
      long: i % 2 === 0,
      hat: i % 3 === 0 ? C.white : null,
    });
    for (let i = 0; i < 5; i++) c.movers.push(walker(i % 2 ? a : b, rng, born + rng.range(0, 1.2), rng.range(3.0, 3.9), castWalker(sporty(i), 40 + i)));
    for (let i = 0; i < 6; i++) c.movers.push(walker(i % 2 ? a : b, rng, born + rng.range(0, 1.2)));
  }
  // ---- two roller skaters, gliding where the others jog
  {
    const skater = (seed: number, helmet: RGB): [Sprite, Sprite] => {
      const lk: Look = { ...randomLook(new Rng(seed)), hat: helmet, legs: C.black };
      return pair((p, flip) => {
        person(p, 0, 0, 0.12, lk, "walkA", flip);
        const cd = p.card(0, 0, 0, flip);
        cd.layer = 5;
        for (const a of [-0.44, -0.24, 0.22, 0.42]) cd.circle(a, 0.1, 0.09, C.orange, { seg: 6, grain: 0, outline: true, w: 0.03 });
      }, seed);
    };
    const pts = sideOf(LOOP, true, 0.1).map((p) => w3(p[0], p[1], 0));
    const ring = new Route(pts, true);
    [skater(301, C.pink), skater(302, C.yellow)].forEach((spr, i) => {
      const s0 = (i * 0.47 + 0.2) * ring.length;
      const t0 = born + 0.4 + i * 0.5;
      c.movers.push((m) => {
        if (m.t < t0) return;
        // long lazy strides: a little faster, a little slower
        const s = s0 + 4.6 * m.t + 0.5 * Math.sin(m.t * 2.2 + i);
        ring.pos(s, P);
        const h = ring.heading(s, 1.2);
        m.put(spr[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1], P[0], P[1], P[2], t0);
      });
    });
  }
  // ---- a stroll round the pond and over the footbridge
  {
    const ctrl: V2[] = [
      [24.35, 27.4],
      [24.35, 31.2],
      [24.35, 37],
      [24.5, 41],
      [24.2, 44.6],
      [20, 45.3],
      [15, 44.7],
      [9.8, 41.2],
      [8.7, 33],
      [9.0, 25.4],
      [14, 24.3],
      [20.4, 24.3],
      [21.4, 26.4],
    ];
    const pts = curve(ctrl, true, 0.5);
    const route = new Route(
      pts.map((p) => w3(p[0], p[1], Math.abs(p[0] - 24) < 1.0 ? bridgeTop(p[1]) : 0)),
      true,
    );
    for (let i = 0; i < 4; i++) c.movers.push(walker(route, rng, born + rng.range(0, 1.5), rng.range(1.0, 1.5)));
  }

  // ---- ducks, ducklings in a line, and a pair of swans
  {
    const mallard = pair((p, f) => duckShape(p, f, "mallard"), 21);
    const duckling = pair((p, f) => duckShape(p, f, "duckling"), 22);
    const swan = pair((p, f) => duckShape(p, f, "swan"), 23);
    const ring = (cx: number, cy: number, rx: number, ry: number): Route => {
      const pts: V3[] = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pts.push(w3(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0.03));
      }
      return new Route(pts, true);
    };
    const family = ring(16.2, 35.4, 4.1, 3.0);
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = 4 + 0.62 * m.t;
      for (let k = 0; k < 5; k++) {
        const sk = s - k * 0.66;
        family.pos(sk, P);
        const h = family.heading(sk, 0.6);
        m.put((k === 0 ? mallard : duckling)[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1], P[0], P[1], P[2], born + 0.1 * k);
      }
    });
    const two = ring(18.6, 37.6, 1.7, 1.3);
    c.movers.push((m) => {
      if (m.t < born) return;
      for (let k = 0; k < 2; k++) {
        const sk = 1 - 0.4 * m.t - k * 1.1;
        two.pos(sk, P);
        const h = two.heading(sk, 0.5) + Math.PI;
        m.put(mallard[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1], P[0], P[1], P[2], born + 0.3);
      }
    });
    // swans glide under the footbridge and back
    const glide = new Route(
      curve(
        [
          [17.5, 32.6],
          [21.4, 33.5],
          [24, 33.8],
          [26.8, 33.5],
          [28.4, 34.1],
          [26.8, 34.9],
          [24, 34.7],
          [21.6, 35.2],
          [19.6, 37.6],
          [15.6, 38.4],
          [12.6, 36.4],
          [13.5, 33.6],
        ],
        true,
        0.5,
      ).map((p) => w3(p[0], p[1], 0.03)),
      true,
    );
    c.movers.push((m) => {
      if (m.t < born) return;
      for (let k = 0; k < 2; k++) {
        const sk = 10 + 0.5 * m.t - k * 1.7;
        glide.pos(sk, P);
        const h = glide.heading(sk, 0.8);
        m.put(swan[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1], P[0], P[1], P[2], born + 0.5);
      }
    });
  }

  // ---- the fountain
  {
    const f = w3(FOUNTAIN[0], FOUNTAIN[1], 0.6);
    const spray: RGB = [236, 247, 253];
    c.movers.push((m) => {
      if (m.t < born || !m.sees(f[0], f[1], f[2], 6)) return;
      const pen2 = m.pen;
      const k = Math.min(1, (m.t - born) / 1.2);
      pen2.begin();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const h = (1.15 + 0.22 * Math.sin(m.clock * 2.4 + i * 1.7)) * k;
        const pts: V3[] = [];
        for (let s = 0; s <= 6; s++) {
          const u = s / 6;
          const r = 1.25 * u * k;
          pts.push([f[0] + Math.cos(a) * r, f[1] + Math.sin(a) * r, f[2] + 4 * h * u * (1 - u) - 0.56 * u]);
        }
        pen2.strokeW(pts, { w: 0.09, color: spray, kind: L_BAR, wobble: 0 });
      }
      const top = 1.9 * k + 0.15 * Math.sin(m.clock * 3.1);
      pen2.strokeW(
        [
          [f[0], f[1], f[2]],
          [f[0], f[1], f[2] + top],
        ],
        { w: 0.12, color: spray, kind: L_BAR, wobble: 0 },
      );
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + m.clock * 0.7;
        pen2.strokeW(
          [
            [f[0], f[1], f[2] + top],
            [f[0] + Math.cos(a) * 0.3, f[1] + Math.sin(a) * 0.3, f[2] + top - 0.35],
          ],
          { w: 0.07, color: spray, kind: L_BAR, wobble: 0 },
        );
      }
      pen2.end();
    });
  }

  // ---- fetch: the ball goes out, the dog goes after it, the dog comes back
  {
    const col = hex("#c58a4a");
    const run = [pair((p, f) => dogShape(p, f, 0, col), 31), pair((p, f) => dogShape(p, f, 1, col), 32)];
    const idle = pair((p, f) => dogShape(p, f, 2, col), 33);
    const ball = makeSprite((p) => p.card(0, 0, 0).circle(0, 0.13, 0.14, C.yellow, { outline: true, w: 0.045, seg: 8, grain: 0 }), 0, 34);
    const A: V2 = [31.3, 29.2];
    const B: V2 = [37.2, 27.3];
    const T = 6.6;
    c.movers.push((m) => {
      if (m.t < born) return;
      const u = (m.t - born) % T;
      let d: number;
      let dir = 0;
      if (u < 0.35) d = 0;
      else if (u < 2.1) {
        const e = (u - 0.35) / 1.75;
        d = e * e * (3 - 2 * e);
        dir = 1;
      } else if (u < 2.6) d = 1;
      else if (u < 4.6) {
        const e = (u - 2.6) / 2.0;
        d = 1 - e * e * (3 - 2 * e);
        dir = -1;
      } else d = 0;
      const dx = A[0] + (B[0] - A[0]) * d;
      const dy = A[1] + (B[1] - A[1]) * d;
      const hop = dir !== 0 ? Math.abs(Math.sin(m.t * 11)) * 0.18 : 0;
      const spr = dir === 0 ? idle[d < 0.5 ? 0 : 1] : run[Math.floor(m.t * 9) & 1][dir > 0 ? 0 : 1];
      const dw = w3(dx, dy, hop);
      m.put(spr, dw[0], dw[1], dw[2], born);
      // the ball: thrown, lying in the grass, then carried home in the dog's mouth
      let bx: number;
      let by: number;
      let bz: number;
      if (u < 1.0) {
        const e = u / 1.0;
        bx = 30.9 + (B[0] + 0.5 - 30.9) * e;
        by = 29.4 + (B[1] - 29.4) * e;
        bz = 1.7 * (1 - e) + 5.2 * e * (1 - e);
      } else if (u < 2.35) {
        bx = B[0] + 0.5;
        by = B[1];
        bz = 0;
      } else if (u < 4.6) {
        bx = dx - 0.45;
        by = dy + 0.45;
        bz = 0.72 + hop;
      } else return;
      const bw = w3(bx, by, bz);
      m.put(ball, bw[0], bw[1], bw[2], born);
    });
  }

  // ---- a kite, and its string
  {
    const kid = w3(20.6, 43.6, 0);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(kid[0] - 3, kid[1] - 3, 7, 14)) return;
      const k = Math.min(1, (m.t - born) / 1.5);
      const sx = 1.7 * Math.sin(m.t * 0.7) + 0.5 * Math.sin(m.t * 1.9);
      // out over the lawn to one side, so the string does not cross the pond
      const kx = kid[0] - 6.4 * k + sx * 0.5;
      const ky = kid[1] - 0.6 * k - sx * 0.5;
      const kz = 1.6 + (6.6 + 0.7 * Math.sin(m.t * 1.1 + 1)) * k;
      const pen2 = m.pen;
      pen2.begin();
      const hx = kid[0] + 0.28;
      const hz = 1.45;
      pen2.strokeW(
        [
          [hx, kid[1] - 0.28, hz],
          [(hx + kx) / 2, (kid[1] + ky) / 2, (hz + kz) / 2 - 0.7],
          [kx, ky, kz],
        ],
        { w: 0.04, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
      pen2.push(kx, ky, kz);
      const cd = pen2.card(0, 0, 0);
      const tilt = 0.25 * Math.sin(m.t * 0.7 + 0.6);
      const rot = (a: number, b: number): V2 => [a * Math.cos(tilt) - b * Math.sin(tilt), a * Math.sin(tilt) + b * Math.cos(tilt)];
      cd.poly([rot(0, 1.25), rot(0.72, 0.5), rot(0, -0.55), rot(-0.72, 0.5)], C.red, { outline: true, w: W_FINE, wobble: 0 });
      cd.poly([rot(0, 1.25), rot(0.72, 0.5), rot(0, 0.5)], C.yellow, { layer: 1, wobble: 0 });
      cd.poly([rot(0, -0.55), rot(-0.72, 0.5), rot(0, 0.5)], C.yellow, { layer: 1, wobble: 0 });
      cd.line([rot(0, 1.25), rot(0, -0.55)], { w: 0.05, wobble: 0, layer: 2 });
      cd.line([rot(-0.72, 0.5), rot(0.72, 0.5)], { w: 0.05, wobble: 0, layer: 2 });
      // tail with bows
      const tail: V2[] = [];
      for (let i = 0; i <= 6; i++) {
        const b = -0.55 - i * 0.42;
        tail.push(rot(0.28 * Math.sin(m.t * 3 + i * 0.9), b));
      }
      cd.line(tail, { w: 0.05, color: C.blue, kind: L_MARK, wobble: 0 });
      for (let i = 1; i <= 5; i += 2) {
        const p = tail[i];
        cd.poly(
          [
            [p[0] - 0.2, p[1] + 0.1],
            [p[0] + 0.2, p[1] - 0.1],
            [p[0] + 0.2, p[1] + 0.1],
            [p[0] - 0.2, p[1] - 0.1],
          ],
          i === 3 ? C.yellow : C.blue,
          { layer: 1 },
        );
      }
      pen2.pop();
      pen2.end();
    });
  }

  // ---- parakeets: a small green flock that flits from tree to tree
  {
    const fly = [pair((p, f) => parakeetShape(p, f, 1), 51), pair((p, f) => parakeetShape(p, f, -1), 52)];
    const perched = pair((p, f) => parakeetShape(p, f, 0), 53);
    const stops = PERCH.map((p) => w3(p[0], p[1], p[2]));
    const LEG = 2.3;
    const REST = 2.9;
    const T = (LEG + REST) * stops.length;
    c.movers.push((m) => {
      if (m.t < born + 0.6) return;
      for (let i = 0; i < 7; i++) {
        const u = (((m.t - born - i * 0.17) % T) + T) % T;
        const leg = Math.floor(u / (LEG + REST));
        const v = u - leg * (LEG + REST);
        const a = stops[leg];
        const b = stops[(leg + 1) % stops.length];
        // each bird keeps its own place in the flock and on the branch
        const ox = (i - 3) * 0.34;
        const oz = ((i * 5) % 3) * 0.22;
        if (v < REST) {
          m.put(perched[i % 2], a[0] + ox, a[1] - ox, a[2] + oz * 0.5 + 0.03 * Math.sin(m.clock * 5 + i), born + 0.6);
        } else {
          const e0 = (v - REST) / LEG;
          const e = e0 * e0 * (3 - 2 * e0);
          const x = a[0] + (b[0] - a[0]) * e + ox * 1.6;
          const y = a[1] + (b[1] - a[1]) * e - ox * 1.6;
          const z = a[2] + (b[2] - a[2]) * e + Math.sin(Math.PI * e) * (2.4 + oz) + oz;
          const right = b[0] - a[0] - (b[1] - a[1]) >= 0;
          m.put(fly[Math.floor(m.t * 10 + i) & 1][right ? 0 : 1], x, y, z, born + 0.6);
        }
      }
    });
  }

  // ---- swings
  {
    const kids = [makeSprite((p) => person(p, 0, 0, 0, randomLook(new Rng(71)), "bust", false, 0.7), 0, 71), makeSprite((p) => person(p, 0, 0, 0, randomLook(new Rng(77)), "bust", true, 0.7), 0, 72)];
    const L = 1.85;
    c.movers.push((m) => {
      const o = w3(36.5, 36.2, 2.5);
      if (m.t < born || !m.sees(o[0], o[1], 1, 6)) return;
      const pen2 = m.pen;
      pen2.begin();
      for (let i = 0; i < 2; i++) {
        const th = 0.62 * Math.sin(m.t * 2.3 + i * 2.1);
        const px = o[0] - 0.55 + i * 1.1;
        const sy = o[1] + Math.sin(th) * L;
        const sz = o[2] - Math.cos(th) * L;
        for (const s of [-0.2, 0.2]) {
          pen2.strokeW(
            [
              [px + s, o[1], o[2]],
              [px + s, sy, sz],
            ],
            { w: 0.05, color: C.greyDark, kind: L_BAR, wobble: 0 },
          );
        }
        pen2.strokeW(
          [
            [px - 0.26, sy, sz],
            [px + 0.26, sy, sz],
          ],
          { w: 0.12, color: C.woodDark, kind: L_BAR, wobble: 0 },
        );
        m.put(kids[i], px, sy, sz - 0.02, born);
      }
      pen2.end();
    });
  }

  // ---- music drifting up from the bandstand
  {
    const notes = [makeSprite((p) => noteShape(p, false), 0, 81), makeSprite((p) => noteShape(p, true), 0, 82)];
    const o = w3(BAND[0], BAND[1], 5.6);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(o[0], o[1], o[2], 8)) return;
      for (let i = 0; i < 5; i++) {
        const u = ((((m.t - born) * 0.3 + i / 5) % 1) + 1) % 1;
        const p = 1.05 * Math.min(1, u * 6, (1 - u) * 3);
        const sx = 0.9 * Math.sin(i * 2.3 + u * 5) + (i - 2) * 0.35;
        m.put(notes[i % 2], o[0] + sx * 0.5, o[1] - sx * 0.5, o[2] + u * 3.6, m.t - p);
      }
    });
  }
};
