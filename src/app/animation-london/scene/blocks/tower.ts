// The Tower. Nine centuries of fortress on the river: the White Tower inside
// its ring of battlements, Traitors' Gate under the wharf, ravens on the green,
// Yeoman Warders, and a queue for the Crown Jewels. Looking over its shoulder
// from the north are the City's towers of glass (the Gherkin, the Cheesegrater,
// the Walkie-Talkie, and a crane putting up the next one) with the Monument at
// their feet. When Tower Bridge opens next door, everyone on the wharf turns
// to watch.

import { RGB, Rng, V2, V3, ease, hex, scaleRGB } from "../../engine/math";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, WalkerKind, makeSprite, rounded, walker } from "../motion";
import { C } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  archWindow,
  battlements,
  beefeater,
  bench,
  bin,
  flag,
  globeLamp,
  guardsman,
  hat,
  lamp,
  lancet,
  person,
  phoneBox,
  pigeon,
  pointed,
  railing,
  randomLook,
  raven,
  riverBus,
  snapper,
  speckle,
  stall,
  steps,
  suit,
  tree,
  tubeEntrance,
  tufts,
  umbrella,
  windowAt,
} from "../props";

const STONE = hex("#d9cfb8");
const STONE_D = hex("#bdb198");
const STONE_L = hex("#ece4d0");
const KEEP = hex("#f1ead8");
const KEEP_D = hex("#d6ccb4");
const LEAD = hex("#9aa5b0");
const ROOF = hex("#b9bec2");
const BEAM = hex("#4a3a30");
const TILE = hex("#a8563f");
const POPPY = hex("#d5362b");
const POPPY_D = hex("#a3241b");
const DARK = hex("#4b4038");
const CRANE = hex("#e9b530");
const CONCRETE = hex("#bdb9b0");
const FRAME = hex("#f6f3ea");
const GLASS_A = hex("#a9c8dc");
const GLASS_B = hex("#5f86ad");

// The fortress: the rectangle its curtain wall runs round, and the wall itself.
const WX0 = 7;
const WX1 = 40.5;
const WY0 = 27;
const WY1 = 42.8;
const WALL_H = 2.6;
const WALL_T = 0.9;
// The White Tower: its far corner, the length of a side, its height.
const KX = 12.5;
const KY = 29;
const KS = 10;
const KH = 10.5;
// The way in: a gate in the east wall, over a causeway across the moat.
const GATE_Y = 32.1;
// Tower Green, where the ravens live: x0, y0, x1, y1.
const GREEN: [number, number, number, number] = [30.6, 33, 37.4, 39.6];
// The places one raven flaps between: the grass, a roof ridge, its perch.
const PERCHES: V3[] = [
  [33.6, 36.3, 0],
  [35.25, 31.3, 4.82],
  [36.3, 38.4, 1.3],
];
// The crane: where its mast stands, and the height its jib turns at.
const CRANE_X = 37;
const CRANE_Y = 6.8;
const CRANE_Z = 27;
// The Cheesegrater: its footprint and height, and where its sloping south face is at a given height.
const CG_X0 = 16.5;
const CG_X1 = 24;
const CG_Y = 5.2;
const CG_H = 33;
const cgSouth = (z: number) => 13.2 - (5.8 * z) / CG_H;
// Where people stand along the wharf rail (local x).
const WATCHERS = [16.85, 18.95, 22.3, 23.6, 24.9, 26.2, 27.5, 28.7, 31.0, 32.3, 33.6, 34.9];

type Hole = [number, number, number, number];
type Quad = [V3, V3, V3, V3];

/** A round-headed opening: a Norman window, a water gate. */
function roundArch(a0: number, b0: number, a1: number, b1: number, n = 6): V2[] {
  const r = (a1 - a0) / 2;
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, b1 - r],
  ];
  for (let k = 1; k < n; k++) {
    const t = (k / n) * Math.PI;
    pts.push([a0 + r + Math.cos(t) * r, b1 - r + Math.sin(t) * r]);
  }
  pts.push([a0, b1 - r]);
  return pts;
}

function insidePoly(poly: V2[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Courses of stone on a wall, keeping clear of its windows and doors. */
function masonry(f: Plane, a0: number, b0: number, a1: number, b1: number, rgb: RGB, density: number, holes: Hole[] = []): void {
  f.ticks(a0, b0, a1, b1, {
    n: Math.round((a1 - a0) * (b1 - b0) * 0.55 * density),
    len: 0.55,
    ang: 0,
    jit: 0.015,
    color: rgb,
    w: 0.055,
    inside: (a, b) => !holes.some((h) => a > h[0] - 0.32 && a < h[2] + 0.32 && b > h[1] - 0.1 && b < h[3] + 0.1),
  });
}

/** A point on a four-cornered face: u across it, v up it, both 0 to 1. Corners run bottom left, bottom right, top right, top left. */
function onQuad(q: Quad, u: number, v: number): V3 {
  const lo = [0, 1, 2].map((k) => q[0][k] + (q[1][k] - q[0][k]) * u);
  const hi = [0, 1, 2].map((k) => q[3][k] + (q[2][k] - q[3][k]) * u);
  return [lo[0] + (hi[0] - lo[0]) * v, lo[1] + (hi[1] - lo[1]) * v, lo[2] + (hi[2] - lo[2]) * v];
}

/** Glaze a four-cornered face: tinted glass, mullions up it, floor lines across it, and a few cells lit for the night. */
function glaze(pen: Pen, rng: Rng, q: Quad, cols: number, rows: number, glass: RGB, lit: number, mull = 0.05): void {
  const p = (u: number, v: number) => onQuad(q, u, v);
  pen.fill([p(0.015, 0.008), p(0.985, 0.008), p(0.985, 0.992), p(0.015, 0.992)], glass, { layer: 1, glow: 0.07, grain: 0.5 });
  for (let i = 1; i < cols; i++) pen.stroke([p(i / cols, 0.01), p(i / cols, 0.99)], { w: mull, color: FRAME, kind: L_MARK, wobble: 0, layer: 2 });
  for (let j = 1; j < rows; j++) pen.stroke([p(0.02, j / rows), p(0.98, j / rows)], { w: 0.04, color: FRAME, kind: L_MARK, wobble: 0, layer: 2, alpha: 0.85 });
  const n = Math.round(cols * rows * lit);
  for (let k = 0; k < n; k++) {
    const i = rng.int(0, cols);
    const j = rng.int(0, rows);
    pen.fill([p((i + 0.1) / cols, (j + 0.14) / rows), p((i + 0.9) / cols, (j + 0.14) / rows), p((i + 0.9) / cols, (j + 0.86) / rows), p((i + 0.1) / cols, (j + 0.86) / rows)], C.glassLight, {
      layer: 2,
      glow: 1,
      grain: 0.3,
    });
  }
}

/** A red lamp on top of something tall, so that aeroplanes miss it. */
function beacon(pen: Pen, x: number, y: number, z: number): void {
  pen.card(x, y, z).circle(0, 0.16, 0.16, C.red, { glow: 1, kind: F_NEON, seg: 7, grain: 0, outline: true, w: 0.03 });
}

// ---------------------------------------------------------------- the ground

/** Lay the lawns, the gravel, the cobbles and the poppies. */
function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // the moat: dry since 1843, and mown
  g1.poly(
    [
      [4, 24.2],
      [44, 24.2],
      [44, WY1],
      [WX1, WY1],
      [WX1, WY0],
      [WX0, WY0],
      [WX0, WY1],
      [4, WY1],
    ],
    C.grass,
    { outline: true, w: W_THIN },
  );
  tufts(g3, 4.3, 24.4, 43.8, 26.8, 0.3);
  // inside the walls: gravel, and Tower Green
  g1.rect(WX0 + WALL_T, WY0 + WALL_T, WX1 - WALL_T, WY1 - WALL_T, C.gravel, { grain: 0.8 });
  g2.rect(GREEN[0], GREEN[1], GREEN[2], GREEN[3], C.grass, { outline: true, w: W_THIN });
  tufts(g3, GREEN[0] + 0.2, GREEN[1] + 0.2, GREEN[2] - 0.2, GREEN[3] - 0.2, 0.45);
  speckle(g3, 23.5, 31.6, 39.4, 41.6, C.streetDark, 0.3, (a, b) => !(a > GREEN[0] - 0.2 && a < GREEN[2] + 0.2 && b > GREEN[1] - 0.2 && b < GREEN[3] + 0.2));
  // the causeway over the moat to the east gate
  g2.rect(WX1, GATE_Y - 1.0, 44, GATE_Y + 1.0, C.plaza, { outline: true, w: W_FINE });
  // the wharf, cobbled
  g1.rect(4, WY1, 44, 47.95, C.plaza, { grain: 0.7 });
  speckle(g3, 4.3, WY1 + 0.2, 43.8, 47.6, C.streetDark, 0.35);
  // a sea of ceramic poppies in the moat, either side of the causeway: one drift pours out of a window in the wall
  const wave: V2[] = [];
  for (let k = 0; k <= 10; k++) wave.push([WX1 + 0.15 + 0.1 * Math.sin(k * 1.3), 33.4 + k * 0.82]);
  for (let k = 10; k >= 0; k--) wave.push([WX1 + 1.2 + 2.0 * Math.exp(-Math.pow((k - 2.5) / 3.2, 2)) + 0.2 * Math.sin(k * 2.1), 33.4 + k * 0.82]);
  const drift: V2[] = [
    [42.0, 27.65],
    [43.1, 27.5],
    [43.85, 28.3],
    [43.7, 29.7],
    [43.9, 30.85],
    [41.9, 30.9],
    [40.65, 30.85],
    [40.7, 29.5],
    [41.5, 28.8],
  ];
  for (const poly of [wave, drift]) g2.poly(poly, POPPY, { grain: 0.8 });
  g3.ticks(WX1, 27.5, 44, 41.6, { n: 290, len: 0.3, ang: 1.2, jit: 0.9, color: POPPY_D, w: 0.09, inside: (a, b) => insidePoly(wave, a, b) || insidePoly(drift, a, b) });
  // Tower Hill: a strip of garden, the round plaza the Gherkin stands in, the mud of the building site
  g1.rect(12.5, 19.9, 35.5, 23.6, C.grass, { outline: true, w: W_THIN });
  tufts(g3, 12.7, 20.1, 35.3, 23.4, 0.3);
  g1.circle(10.5, 10, 5.6, hex("#e6dfd0"), { outline: true, w: W_FINE, seg: 24 });
  g1.rect(36, 5, 43.5, 14.46, hex("#d9c9a8"), { outline: true, w: W_FINE });
  speckle(g3, 36.2, 5.2, 43.3, 14.2, C.woodDark, 0.4);
}

// ---------------------------------------------------------------- the City's towers

/** The Gherkin: a round cigar of glass, dark bands spiralling up it under a diamond lattice. */
function gherkin(c: LondonCtx): void {
  const { pen, rng } = c;
  const cx = 10.5;
  const cy = 10;
  const R = 3.7;
  const H = 30;
  const n = 16;
  const K = 15;
  const rad = (u: number) => (u < 0.36 ? R * (0.8 + 0.2 * Math.sin((Math.PI / 2) * (u / 0.36))) : R * Math.pow(Math.cos((Math.PI / 2) * ((u - 0.36) / 0.64)), 0.78));
  const at = (k: number, i: number, lift = 0): V3 => {
    const u = k / K;
    const a = (i / n) * Math.PI * 2;
    const r = rad(u) + lift;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, u * H];
  };
  // which way round the tower the camera can see
  const seen = (i: number) => {
    const a = (i / n) * Math.PI * 2;
    return Math.cos(a) + Math.sin(a) > -0.2;
  };
  pen.obj(() => {
    const verts: V3[] = [];
    const faces: number[][] = [];
    const cols: RGB[] = [];
    for (let k = 0; k < K; k++) for (let i = 0; i < n; i++) verts.push(at(k, i));
    verts.push([cx, cy, H]);
    for (let k = 0; k < K - 1; k++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i]);
        cols.push((((i - k) % 8) + 8) % 8 < 2 ? GLASS_B : GLASS_A);
      }
    }
    for (let i = 0; i < n; i++) {
      faces.push([(K - 1) * n + i, (K - 1) * n + ((i + 1) % n), K * n]);
      cols.push(GLASS_A);
    }
    pen.solid(verts, faces, cols, { crease: 40, over: 0, glow: 0.07, grain: 0.5 });
    // the lattice: steel spiralling up both ways
    const steel = { w: 0.06, color: FRAME, kind: L_MARK, wobble: 0, alpha: 0.9 };
    for (let j = 0; j < n; j += 2) {
      for (const dir of [1, -1]) {
        let run: V3[] = [];
        for (let k = 0; k <= K; k++) {
          const i = j + dir * k;
          if (k === K) run.push([cx, cy, H]);
          else if (seen(((i % n) + n) % n)) run.push(at(k, i, 0.02));
          else {
            if (run.length > 1) pen.stroke(run, steel);
            run = [];
          }
        }
        if (run.length > 1) pen.stroke(run, steel);
      }
    }
    // the legs it stands on
    for (let i = 0; i < n; i++) {
      if (!seen(i) || !seen((i + 1) % n)) continue;
      const a = at(0, i, 0.03);
      const b = at(0, i + 1, 0.03);
      pen.stroke([[a[0], a[1], 0.1], at(1, i + 0.5, 0.03), [b[0], b[1], 0.1]], { w: 0.13, color: FRAME, kind: L_MARK, wobble: 0 });
    }
    // floors where somebody is working late
    for (let q = 0; q < 18; q++) {
      const k = rng.int(1, K - 3);
      const i = rng.int(0, n);
      if (!seen(i) || !seen((i + 1) % n)) continue;
      pen.fill([at(k, i, 0.03), at(k, i + 1, 0.03), at(k + 1, i + 1, 0.03), at(k + 1, i, 0.03)], C.glassLight, { glow: 1, bias: 0.05, grain: 0.3 });
    }
  }, 0.2);
  beacon(pen, cx, cy, H);
}

/** The Cheesegrater: a wedge whose south face leans back, braced with heavy steel, its lifts on show up one side. */
function cheesegrater(c: LondonCtx): void {
  const { pen, rng } = c;
  const glass = hex("#b7cfdd");
  const cuts = [0, 3.6, 13.4, 23.2, CG_H];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const z0 = cuts[k];
    const z1 = cuts[k + 1];
    const s0 = cgSouth(z0);
    const s1 = cgSouth(z1);
    pen.obj(() => {
      pen.solid(
        [
          [CG_X0, CG_Y, z0],
          [CG_X1, CG_Y, z0],
          [CG_X1, s0, z0],
          [CG_X0, s0, z0],
          [CG_X0, CG_Y, z1],
          [CG_X1, CG_Y, z1],
          [CG_X1, s1, z1],
          [CG_X0, s1, z1],
        ],
        [
          [1, 2, 6, 5],
          [2, 3, 7, 6],
          [4, 5, 6, 7],
        ],
        [k === 0 ? C.glass : glass, k === 0 ? C.glass : glass, k === cuts.length - 2 ? C.slateLight : null],
        { w: 0.11 },
      );
      const south: Quad = [
        [CG_X0, s0, z0],
        [CG_X1, s0, z0],
        [CG_X1, s1, z1],
        [CG_X0, s1, z1],
      ];
      if (k === 0) {
        // the open hall at its foot: giant braces, and light spilling out
        pen.fill([onQuad(south, 0.3, 0.05), onQuad(south, 0.7, 0.05), onQuad(south, 0.7, 0.8), onQuad(south, 0.3, 0.8)], C.glassLight, { layer: 1, glow: 1, grain: 0.3 });
        pen.stroke([onQuad(south, 0.02, 0.02), onQuad(south, 0.25, 0.98), onQuad(south, 0.5, 0.02), onQuad(south, 0.75, 0.98), onQuad(south, 0.98, 0.02)], { w: 0.16, color: FRAME, kind: L_MARK, wobble: 0, layer: 2 });
        return;
      }
      const rows = Math.round((z1 - z0) / 1.22);
      glaze(pen, rng, south, 5, rows, scaleRGB(glass, 0.9), 0.14);
      // the megaframe: a chevron of heavy steel across each stage
      pen.stroke([onQuad(south, 0.02, 0.02), onQuad(south, 0.5, 0.98), onQuad(south, 0.98, 0.02)], { w: 0.17, color: FRAME, kind: L_MARK, wobble: 0, layer: 3 });
      const east: Quad = [
        [CG_X1, s0, z0],
        [CG_X1, 6.95, z0],
        [CG_X1, 6.95, z1],
        [CG_X1, s1, z1],
      ];
      glaze(pen, rng, east, 4, rows, scaleRGB(glass, 0.97), 0.14);
    }, 0.1 + k * 0.17);
  }
  // the lift shaft, painted yellow all the way up
  pen.obj(() => {
    const f = pen.wall("x+", CG_X0, CG_Y, 0, CG_X1 - CG_X0, 8, 2);
    f.rect(6.5, 0.3, 7.8, CG_H - 0.3, C.charcoal, { grain: 0.5 });
    for (const a of [6.82, 7.15, 7.48]) f.seg(a, 0.4, a, CG_H - 0.4, { w: 0.08, color: C.yellow, kind: L_MARK, wobble: 0, layer: 1 });
    for (let b = 2.4; b < CG_H - 1; b += 2.45) f.seg(6.55, b, 7.75, b, { w: 0.06, color: C.orange, kind: L_MARK, wobble: 0, layer: 1 });
  }, 0.55);
  pen.obj(() => pen.box(CG_X0 + 1.2, CG_Y + 0.4, CG_H, 3, 1.3, 0.8, C.grey, { w: W_THIN, top: C.greyDark }), 0.62);
  beacon(pen, CG_X1 - 0.6, CG_Y + 0.5, CG_H);
  // two people out for a breath of air, and a doorman
  person(pen, 18.2, 14.1, 0, suit(rng), "stand", false);
  person(pen, 19.0, 14.3, 0, suit(rng), "wave", true);
  person(pen, 22.4, 13.9, 0, { ...suit(rng), top: C.charcoal }, "stand", true);
}

/** The Walkie-Talkie: wider at the top than at the bottom, with a garden under glass on its roof. */
function walkie(c: LondonCtx): void {
  const { pen, rng } = c;
  const glass = hex("#a6c6d8");
  const H = 22;
  // its footprint at a height: it gets bigger as it goes up
  const foot = (z: number): [number, number, number, number] => {
    const u = z / H;
    const e = 0.4 * u + 0.6 * u * u;
    return [27 - 0.9 * e, 6.5 - 1.1 * e, 33 + 0.9 * e, 12 + 1.2 * e];
  };
  const cuts = [0, 7.4, 14.8, H];
  for (let k = 0; k < 3; k++) {
    const z0 = cuts[k];
    const z1 = cuts[k + 1];
    pen.obj(() => {
      const [ax, ay, bx, by] = foot(z0);
      const [ex, ey, fx, fy] = foot(z1);
      pen.solid(
        [
          [ax, ay, z0],
          [bx, ay, z0],
          [bx, by, z0],
          [ax, by, z0],
          [ex, ey, z1],
          [fx, ey, z1],
          [fx, fy, z1],
          [ex, fy, z1],
        ],
        [
          [1, 2, 6, 5],
          [2, 3, 7, 6],
          [4, 5, 6, 7],
        ],
        [glass, glass, null],
        { w: 0.11 },
      );
      // white fins up the glass, fanning out with it
      glaze(
        pen,
        rng,
        [
          [ax, by, z0],
          [bx, by, z0],
          [fx, fy, z1],
          [ex, fy, z1],
        ],
        9,
        5,
        scaleRGB(glass, 0.9),
        0.12,
        0.075,
      );
      glaze(
        pen,
        rng,
        [
          [bx, by, z0],
          [bx, ay, z0],
          [fx, ey, z1],
          [fx, fy, z1],
        ],
        7,
        5,
        scaleRGB(glass, 0.97),
        0.12,
        0.075,
      );
    }, 0.1 + k * 0.18);
  }
  pen.obj(() => {
    const [ax, ay, bx, by] = foot(H);
    pen.solid(
      [
        [ax, ay, H],
        [bx, ay, H],
        [bx, by, H],
        [ax, by, H],
        [ax, ay, H + 1.0],
        [bx, ay, H + 1.0],
        [bx, by, H + 3.3],
        [ax, by, H + 3.3],
      ],
      [
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [4, 5, 6, 7],
      ],
      C.glassPale,
      { w: 0.11, glow: 0.5, grain: 0.4 },
    );
    // the garden in the sky, seen through the glass
    const w = bx - ax;
    const d = by - ay;
    const f = pen.wall("y+", ax, ay, H, w, d);
    for (let a = 0.7; a < w - 0.3; a += 1.35) f.circle(a, 0.95, 0.5, rng.pick([C.leaf, C.leafDark, C.leaf2]), { seg: 8, grain: 0.3, glow: 0.2 });
    for (let a = 0.78; a < w; a += 0.78) f.seg(a, 0.05, a, 3.25, { w: 0.05, color: FRAME, kind: L_MARK, wobble: 0, layer: 1 });
    const g = pen.wall("x+", ax, ay, H, w, d);
    for (let a = 0.7; a < d * 0.6; a += 1.35) g.circle(a, 0.8, 0.42, C.leaf, { seg: 8, grain: 0.3, glow: 0.2 });
    for (let a = 0.78; a < d; a += 0.78) g.seg(a, 0.05, a, 3.25 - (2.3 * a) / d, { w: 0.05, color: FRAME, kind: L_MARK, wobble: 0, layer: 1 });
    for (let x = ax + 1.3; x < bx; x += 1.3) {
      pen.stroke(
        [
          [x, ay, H + 1.0],
          [x, by, H + 3.3],
        ],
        { w: 0.05, color: FRAME, kind: L_MARK, wobble: 0 },
      );
    }
  }, 0.62);
  beacon(pen, 30, 9, H + 2.2);
  person(pen, 29.3, 12.7, 0, { ...suit(rng), top: C.redDark }, "stand", false);
}

/** The turning part of the crane: cab, jib, counterweight, and whatever is on the hook. Drawn afresh every frame. */
function craneTop(pen: Pen, x: number, y: number, deg: number, hook: number): void {
  const J = 8.6;
  const bar = (a: V3, b: V3, w = 0.09) => pen.stroke([a, b], { w, color: CRANE, kind: L_BAR, wobble: 0 });
  pen.push(x, y, CRANE_Z, deg);
  pen.begin();
  pen.box(-0.55, -0.55, 0, 1.1, 1.1, 0.45, CRANE, { w: W_THIN });
  pen.box(0.35, 0.55, 0.1, 0.95, 0.75, 0.9, C.white, { w: W_THIN, top: CRANE });
  // the cat head, and the ties that hold both arms up
  bar([0, 0, 0.45], [0, 0, 3.6], 0.14);
  bar([0.5, 0, 1.0], [J, 0, 1.0], 0.1);
  bar([0.5, 0, 1.9], [J, 0, 1.45], 0.1);
  const n = 11;
  for (let k = 0; k < n; k++) {
    const a = 0.5 + (k * (J - 0.5)) / n;
    const b = 0.5 + ((k + 1) * (J - 0.5)) / n;
    const za = 1.9 - (0.45 * k) / n;
    const zb = 1.9 - (0.45 * (k + 1)) / n;
    if (k % 2 === 0) bar([a, 0, 1.0], [b, 0, zb], 0.055);
    else bar([a, 0, za], [b, 0, 1.0], 0.055);
  }
  bar([0, 0, 3.6], [J * 0.62, 0, 1.75], 0.045);
  bar([0, 0, 3.6], [-3.3, 0, 1.2], 0.045);
  bar([-0.5, 0, 1.0], [-3.5, 0, 1.0], 0.1);
  pen.box(-3.6, -0.4, 0.25, 1.0, 0.8, 0.9, CONCRETE, { w: W_THIN });
  // the trolley, the rope, and a bundle of steel on the hook
  const tr = 5.7;
  const hz = hook - CRANE_Z;
  pen.box(tr - 0.25, -0.2, 0.72, 0.5, 0.4, 0.26, C.charcoal, { w: W_FINE });
  for (const [a, b] of [
    [[tr, 0, 0.72], [tr, 0, hz + 0.5]],
    [[tr, 0, hz + 0.5], [tr - 0.9, 0, hz + 0.12]],
    [[tr, 0, hz + 0.5], [tr + 0.9, 0, hz + 0.12]],
  ] as [V3, V3][]) {
    pen.stroke([a, b], { w: 0.04, kind: L_BAR, wobble: 0 });
  }
  pen.box(tr - 1.1, -0.2, hz - 0.14, 2.2, 0.4, 0.26, TILE, { w: W_FINE });
  // lights for the night: red at the tip, white along the jib
  pen.card(J, 0, 1.45).circle(0, 0.16, 0.15, C.red, { glow: 1, kind: F_NEON, seg: 6, grain: 0 });
  for (let a = 1.5; a < J; a += 1.4) {
    pen.stroke(
      [
        [a, 0, 1.05],
        [a + 0.02, 0, 1.05],
      ],
      { w: 0.2, kind: L_LIGHT, wobble: 0 },
    );
  }
  pen.end();
  pen.pop();
}

/** The building site: a concrete core, four floors of frame, a hoarding round it, and the crane's mast. */
function site(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.box(36, 14.3, 0, 7.5, 0.16, 1.9, C.royal, { w: W_THIN });
    const f = pen.wall("y+", 36, 14.3, 0, 7.5, 0.16);
    f.rect(0, 1.35, 7.5, 1.75, C.white, { grain: 0.3 });
    f.text("HARD HATS", 3.75, 0.5, 0.42, { align: "c", color: C.white, kind: L_MARK, w: 0.07, wobble: 0.3 });
    pen.box(43.34, 5, 0, 0.16, 9.46, 1.9, C.royal, { w: W_THIN });
    pen.wall("x+", 43.34, 5, 0, 0.16, 9.46).rect(0, 1.35, 9.46, 1.75, C.white, { grain: 0.3 });
  });
  const fx = 38.4;
  const fy = 7.6;
  const fw = 4.6;
  const fd = 6.0;
  pen.obj(() => pen.box(fx + 0.3, fy + 0.3, 0, 2.0, 2.2, 13.4, CONCRETE, { top: C.greyDark }), 0.1);
  for (let k = 0; k < 4; k++) {
    const z = 2.7 * (k + 1);
    pen.obj(() => {
      pen.box(fx, fy, z - 0.24, fw, fd, 0.24, CONCRETE, { top: hex("#cfcbc2"), w: W_THIN });
      // steel columns, in red oxide
      for (const [px, py] of [
        [fx + fw - 0.15, fy + fd - 0.15],
        [fx + 0.15, fy + fd - 0.15],
        [fx + fw - 0.15, fy + 0.15],
        [fx + fw - 0.15, fy + fd / 2],
        [fx + fw / 2, fy + fd - 0.15],
      ]) {
        pen.pole([px, py, z - 2.7], [px, py, z - 0.24], 0.18, TILE);
      }
      // orange netting along the open edges
      for (const side of ["y+", "x+"] as const) {
        const f = pen.wall(side, fx, fy, z, fw, fd);
        const len = side === "y+" ? fw : fd;
        for (const ang of [0.9, -0.9]) f.ticks(0, 0, len, 0.8, { n: Math.round(len * 8), len: 0.5, ang, jit: 0.15, color: C.orange, w: 0.045 });
        f.seg(0, 0.8, len, 0.8, { w: 0.06, color: C.orange, kind: L_MARK, wobble: 0 });
      }
    }, 0.15 + k * 0.12);
  }
  // the crane's mast
  pen.obj(() => {
    const s = 0.28;
    const steel = { color: CRANE, kind: L_BAR, wobble: 0 };
    for (const [dx, dy] of [
      [-s, -s],
      [s, -s],
      [s, s],
      [-s, s],
    ]) {
      pen.stroke(
        [
          [CRANE_X + dx, CRANE_Y + dy, 0],
          [CRANE_X + dx, CRANE_Y + dy, CRANE_Z],
        ],
        { ...steel, w: 0.1 },
      );
    }
    for (let k = 0; k * 1.1 < CRANE_Z - 0.5; k++) {
      const z = k * 1.1;
      const e = k % 2 === 0 ? s : -s;
      pen.stroke(
        [
          [CRANE_X + s, CRANE_Y + e, z],
          [CRANE_X + s, CRANE_Y - e, z + 1.1],
        ],
        { ...steel, w: 0.055 },
      );
      pen.stroke(
        [
          [CRANE_X - e, CRANE_Y + s, z],
          [CRANE_X + e, CRANE_Y + s, z + 1.1],
        ],
        { ...steel, w: 0.055 },
      );
    }
    pen.box(CRANE_X - 0.9, CRANE_Y - 0.9, 0, 1.8, 1.8, 0.5, CONCRETE, { w: W_THIN });
  }, 0.3);
  // the builders, in hard hats
  const builder = (x: number, y: number, z: number, pose: Pose, flip: boolean, white = false) => {
    const lk: Look = { ...randomLook(rng), top: rng.pick([C.hivis, C.orange, C.hivis]), legs: C.navy, hat: null, long: false };
    pen.obj(() => {
      person(pen, x, y, z, lk, pose, flip);
      hat(pen, x, y, z, "hard", { pose, flip, color: white ? C.white : C.yellow });
    }, 0.4);
  };
  builder(fx + 3.6, fy + 5.2, 2.7, "stand", false);
  builder(fx + 4.0, fy + 3.0, 5.4, "wave", true);
  builder(fx + 2.6, fy + 5.4, 8.1, "stand", true);
  builder(fx + 3.9, fy + 5.0, 10.8, "cheer", false);
  builder(fx + 2.9, fy + 3.6, 10.8, "stand", true, true);
  builder(36.9, 11.6, 0, "stand", false, true);
  builder(37.5, 13.3, 0, "walkA", true);
  // a stack of steel waiting its turn
  pen.obj(() => {
    for (let k = 0; k < 3; k++) pen.box(36.5, 8.6 + k * 0.5, 0, 1.6 - k * 0.1, 0.4, 0.3, TILE, { w: W_FINE });
  });
}

/** The Monument to the Great Fire: a Doric column with a gilded urn of flames on top, and a staircase inside. */
function monument(c: LondonCtx): void {
  const { pen, rng } = c;
  // (it stands well back, so that its foot shows over the White Tower's roof)
  const mx = 5.9;
  const my = 16.3;
  pen.obj(() => {
    pen.box(mx - 1.3, my - 1.3, 0, 2.6, 2.6, 0.3, C.portlandDark, { w: W_THIN });
    pen.box(mx - 1.05, my - 1.05, 0.3, 2.1, 2.1, 2.9, C.portland);
    const f = pen.wall("y+", mx - 1.05, my - 1.05, 0.3, 2.1, 2.1);
    // the inscription says how far it is to the top
    f.rect(0.25, 0.4, 1.85, 2.4, C.portlandLight, { outline: true, w: W_FINE, grain: 0.6 });
    f.text("311", 1.05, 1.45, 0.44, { align: "c", layer: 1, w: 0.065, color: DARK, kind: L_MARK });
    f.text("STEPS", 1.05, 0.8, 0.3, { align: "c", layer: 1, w: 0.055, color: DARK, kind: L_MARK });
    pen.wall("x+", mx - 1.05, my - 1.05, 0.3, 2.1, 2.1).poly(roundArch(0.65, 0, 1.45, 1.9), DARK, { outline: true, w: W_FINE, grain: 0.5 });
    pen.box(mx - 1.2, my - 1.2, 3.2, 2.4, 2.4, 0.35, C.portlandLight, { w: W_THIN });
  });
  pen.obj(() => {
    pen.cyl(mx, my, 3.55, 0.88, 9.6, C.portland, { seg: 12, r2: 0.74 });
    for (let k = 0; k < 6; k++) {
      const a = -0.55 + k * 0.5;
      pen.stroke(
        [
          [mx + Math.cos(a) * 0.9, my + Math.sin(a) * 0.9, 3.8],
          [mx + Math.cos(a) * 0.76, my + Math.sin(a) * 0.76, 12.9],
        ],
        { w: 0.04, color: C.portlandDark, kind: L_MARK, wobble: 0.2 },
      );
    }
  }, 0.2);
  pen.obj(() => {
    // the viewing gallery in its cage, and the urn
    pen.box(mx - 1.15, my - 1.15, 13.15, 2.3, 2.3, 0.3, C.portlandLight, { w: W_THIN });
    railing(
      pen,
      [
        [mx - 1.1, my + 1.1, 13.45],
        [mx + 1.1, my + 1.1, 13.45],
        [mx + 1.1, my - 1.1, 13.45],
      ],
      0.8,
      C.iron,
      0.55,
    );
    pen.cyl(mx, my, 13.45, 0.5, 1.5, C.portland, { seg: 8 });
    pen.dome(mx, my, 14.95, 0.62, 0.55, C.gold, { seg: 8, rings: 3 });
    pen.card(mx, my, 15.4).poly(
      [
        [-0.5, 0],
        [-0.62, 0.5],
        [-0.3, 0.35],
        [-0.38, 0.95],
        [-0.08, 0.6],
        [0, 1.25],
        [0.12, 0.62],
        [0.4, 0.98],
        [0.32, 0.38],
        [0.62, 0.55],
        [0.5, 0],
      ],
      C.gold,
      { outline: true, w: W_FINE, grain: 0.2, glow: 0.7 },
    );
    person(pen, mx + 0.8, my + 0.75, 13.45, randomLook(rng), "wave", false, 0.8);
  }, 0.45);
  // and there is a queue all the same
  for (let k = 0; k < 4; k++) person(pen, mx + 1.55 + k * 0.82, my - 0.2 + (k % 2) * 0.25, 0, randomLook(rng), k === 2 ? "wave" : "stand", k % 2 === 0, k === 3 ? 0.72 : 1);
}

/** Tower Hill at one o'clock: the garden, the sandwich bar and its queue, the way down to the Tube. */
function plaza(c: LondonCtx): void {
  const { pen, rng } = c;
  for (const [x, y, kind] of [
    [14.4, 21.7, "elm"],
    [19.2, 22.4, "round"],
    [23.6, 21.3, "elm"],
    [28.2, 22.5, "blossom"],
    [32.4, 21.4, "elm"],
    [34.6, 22.7, "round"],
  ] as const) {
    tree(pen, rng, x, y, { kind });
  }
  for (const x of [16.6, 21.4, 26.0, 30.3]) {
    bench(pen, x, 20.5, 0);
    if (rng.chance(0.8)) person(pen, x - 0.4, 20.55, 0.42, suit(rng), "sit", rng.chance(0.5));
    if (rng.chance(0.6)) person(pen, x + 0.45, 20.55, 0.42, randomLook(rng), "sit", rng.chance(0.5));
  }
  for (const [x, y] of [
    [12.0, 19.6],
    [25.0, 19.5],
    [35.9, 19.4],
    [20.0, 15.4],
  ]) {
    lamp(pen, x, y);
  }
  phoneBox(pen, 35.2, 16.3, 0);
  bin(pen, 24.2, 19.5);
  tubeEntrance(pen, 37.2, 21.6, 0);
  person(pen, 36.5, 20.6, 0, suit(rng), "stand", true);
  // the sandwich bar, and the queue for it
  pen.push(30.4, 13.4, 0);
  stall(pen, rng, { w: 3.6, d: 1.9, a: C.green, sign: "SANDWICH", goods: [C.cream, C.ochre, C.grassLight, C.brickRose] });
  pen.pop();
  for (let k = 0; k < 8; k++) {
    const x = 32.3 - k * 0.92;
    const y = 16.45 + 0.1 * Math.sin(k * 1.7);
    const lk = suit(rng);
    const flip = k % 3 === 0;
    if (k === 4) snapper(pen, x, y, lk, false);
    else person(pen, x, y, 0, lk, k === 7 ? "wave" : "stand", flip);
    if (k === 2) umbrella(pen, x, y, 0, C.navy, flip);
    if (k === 5) hat(pen, x, y, 0, "bowler", { flip });
  }
  // round the Gherkin: coffee, a meeting that could have been an email, pigeons after crumbs
  person(pen, 13.9, 13.2, 0, suit(rng), "stand", false);
  person(pen, 14.7, 13.5, 0, suit(rng), "wave", true);
  person(pen, 5.6, 12.6, 0, randomLook(rng), "stand", true);
  for (const [x, y, flip, peck] of [
    [15.6, 15.2, false, true],
    [16.3, 15.6, true, false],
    [17.2, 15.1, false, false],
    [26.4, 16.2, true, true],
    [27.1, 15.7, false, true],
    [22.5, 19.3, true, false],
  ] as const) {
    pigeon(pen, x, y, 0, flip, peck);
  }
}

// ---------------------------------------------------------------- the fortress walls

/** A stretch of curtain wall. The side the camera sees gets stonework and, on request, arrow slits. */
function wallPiece(pen: Pen, x: number, y: number, w: number, d: number, slits: boolean): void {
  pen.obj(() => {
    pen.box(x, y, 0, w, d, WALL_H, STONE, { top: STONE_L });
    const along = w > d;
    const f = pen.wall(along ? "y+" : "x+", x, y, 0, w, d);
    const len = along ? w : d;
    const holes: Hole[] = [];
    if (slits) {
      for (let a = 1.5; a < len - 1; a += 2.7) {
        f.rect(a - 0.07, 0.95, a + 0.07, 1.85, C.charcoal, { grain: 0 });
        holes.push([a - 0.07, 0.95, a + 0.07, 1.85]);
      }
    }
    masonry(f, 0.2, 0.15, len - 0.2, WALL_H - 0.15, STONE_D, 0.4, holes);
  });
}

/** A round tower on the wall, with battlements round its top and two arrow slits. */
function roundTower(pen: Pen, cx: number, cy: number, r: number, h: number): void {
  pen.obj(() => {
    pen.cyl(cx, cy, 0, r, h, STONE, { seg: 12, top: STONE_L });
    pen.cyl(cx, cy, h, r + 0.12, 0.18, STONE_L, { seg: 12, top: STONE_D, w: W_THIN });
    const n = r > 1.1 ? 8 : 6;
    const size = r > 1.1 ? 0.5 : 0.4;
    for (let k = 0; k < n; k++) {
      const deg = (k + 0.5) * (360 / n);
      const a = (deg * Math.PI) / 180;
      pen.push(cx + Math.cos(a) * (r - 0.12), cy + Math.sin(a) * (r - 0.12), h + 0.18, deg);
      pen.box(-size / 2, -size / 2, 0, size, size, size * 0.9, STONE_L, { w: W_FINE });
      pen.pop();
    }
    for (const deg of [8, 82]) {
      const a = (deg * Math.PI) / 180;
      const x = cx + Math.cos(a) * (r + 0.02);
      const y = cy + Math.sin(a) * (r + 0.02);
      pen.stroke(
        [
          [x, y, h * 0.36],
          [x, y, h * 0.6],
        ],
        { w: 0.13, color: C.charcoal, kind: L_MARK, wobble: 0 },
      );
    }
  }, 0.1);
}

function fortress(c: LondonCtx): void {
  const { pen, rng } = c;
  const T = WALL_T;
  wallPiece(pen, WX0, WY1 - T, 14, T, true);
  wallPiece(pen, 27, WY1 - T, WX1 - 27, T, true);
  wallPiece(pen, WX1 - T, WY0, T, GATE_Y - 1.5 - WY0, true);
  wallPiece(pen, WX1 - T, GATE_Y + 1.5, T, WY1 - GATE_Y - 1.5, true);
  wallPiece(pen, WX0, WY0, WX1 - WX0, T, false);
  wallPiece(pen, WX0, WY0, T, WY1 - WY0, false);
  battlements(pen, WX0, WY0, WALL_H, WX1 - WX0, WY1 - WY0, STONE_L, 0.55, 0.55);
  // round towers at the corners and along the river front
  roundTower(pen, WX0 + 0.3, WY0 + 0.3, 1.6, 4.4);
  roundTower(pen, WX1 - 0.3, WY0 + 0.3, 1.6, 4.4);
  roundTower(pen, WX0 + 0.3, WY1 - 0.3, 1.6, 4.4);
  roundTower(pen, WX1 - 0.3, WY1 - 0.3, 1.6, 4.4);
  roundTower(pen, 14, WY1 - 0.45, 1.25, 3.9);
  roundTower(pen, 33.5, WY1 - 0.45, 1.25, 3.9);

  // St Thomas's Tower, which stands over Traitors' Gate
  const sx = 21;
  const sy = WY1 - 1.9;
  const sw = 6;
  const sd = 2.8;
  const sh = 5.0;
  pen.obj(() => {
    pen.box(sx, sy, 0, sw, sd, sh, STONE, { top: STONE_L });
    const f = pen.wall("y+", sx, sy, 0, sw, sd);
    f.poly(pointed(2.2, 0, 3.8, 2.3), DARK, { outline: true, w: W_THIN, grain: 0.6 });
    const holes: Hole[] = [[2.2, 0, 3.8, 2.3]];
    for (const a of [0.95, 2.55, 4.15]) {
      lancet(f, a, 2.9, a + 0.9, 4.5, rng.chance(0.75), STONE_L);
      holes.push([a, 2.9, a + 0.9, 4.5]);
    }
    masonry(f, 0.2, 0.15, sw - 0.2, sh - 0.2, STONE_D, 0.35, holes);
    lancet(pen.wall("x+", sx, sy, 0, sw, sd), 0.95, 2.9, 1.85, 4.5, true, STONE_L);
  }, 0.1);
  battlements(pen, sx, sy, sh, sw, sd, STONE_L, 0.5, 0.5);
  roundTower(pen, sx + 0.15, sy + sd - 0.1, 0.9, 6.0);
  roundTower(pen, sx + sw - 0.15, sy + sd - 0.1, 0.9, 6.0);

  // a square tower on the east wall; the poppies pour out of its window
  const tx = WX1 - 1.2;
  const ty = 34.6;
  pen.obj(() => {
    pen.box(tx, ty, 0, 2.4, 2.4, 4.2, STONE, { top: STONE_L });
    const f = pen.wall("x+", tx, ty, 0, 2.4, 2.4);
    f.poly(roundArch(0.8, 2.3, 1.6, 3.5), C.charcoal, { outline: true, w: W_FINE, grain: 0.4 });
    const fall: V2[] = [
      [0.86, 2.36],
      [1.54, 2.36],
      [1.9, 1.2],
      [2.34, 0],
      [0.06, 0],
      [0.5, 1.2],
    ];
    f.poly(fall, POPPY, { layer: 1, grain: 0.8 });
    f.ticks(0.1, 0.05, 2.3, 2.36, { n: 40, len: 0.26, ang: 1.3, jit: 0.8, color: POPPY_D, w: 0.08, layer: 2, inside: (a, b) => insidePoly(fall, a, b) });
    masonry(pen.wall("y+", tx, ty, 0, 2.4, 2.4), 0.2, 0.2, 2.2, 4.0, STONE_D, 0.4);
  }, 0.1);
  battlements(pen, tx, ty, 4.2, 2.4, 2.4, STONE_L, 0.5, 0.45);
  // two volunteers planting the last of them
  person(pen, 43.75, 34.5, -0.35, { ...randomLook(rng), top: C.hivis }, "sit", false);
  person(pen, 43.3, 29.2, -0.35, { ...randomLook(rng), top: C.hivis }, "sit", true);

  // the gatehouse in the east wall, and the causeway to it
  const gx = WX1 - 1.2;
  const gy = GATE_Y - 1.5;
  const gw = 2.9;
  const gd = 3.0;
  const gh = 4.8;
  pen.obj(() => {
    pen.box(gx, gy, 0, gw, gd, gh, STONE, { top: STONE_L });
    const f = pen.wall("x+", gx, gy, 0, gw, gd);
    f.poly(pointed(0.7, 0, 2.3, 2.9), DARK, { outline: true, w: W_THIN, grain: 0.6 });
    // the portcullis, drawn up
    for (const a of [1.05, 1.35, 1.65, 1.95]) f.seg(a, 2.0, a, 2.82 - Math.abs(a - 1.5) * 0.7, { w: 0.05, color: C.iron, kind: L_MARK, wobble: 0, layer: 1 });
    f.seg(0.85, 2.02, 2.15, 2.02, { w: 0.06, color: C.iron, kind: L_MARK, wobble: 0, layer: 1 });
    lancet(f, 1.05, 3.25, 1.95, 4.4, true, STONE_L);
    masonry(f, 0.15, 0.15, gd - 0.15, gh - 0.2, STONE_D, 0.35, [
      [0.7, 0, 2.3, 2.9],
      [1.05, 3.25, 1.95, 4.4],
    ]);
    masonry(pen.wall("y+", gx, gy, 0, gw, gd), 0.2, 0.2, gw - 0.2, gh - 0.2, STONE_D, 0.35);
  }, 0.1);
  battlements(pen, gx, gy, gh, gw, gd, STONE_L, 0.5, 0.5);
  roundTower(pen, gx + gw - 0.1, gy + 0.1, 0.8, 5.6);
  roundTower(pen, gx + gw - 0.1, gy + gd - 0.1, 0.8, 5.6);
  flag(pen, gx + 1.2, gy + 1.5, gh, 3.4, "uk", 0.9);
  for (const y of [GATE_Y - 1.0, GATE_Y + 0.78]) pen.box(gx + gw + 0.7, y, 0, 44 - gx - gw - 0.7, 0.22, 0.7, STONE_L, { w: W_THIN });
  beefeater(pen, 43.1, GATE_Y - 0.72, 0, "stand", true);
}

// ---------------------------------------------------------------- the White Tower

function keep(c: LondonCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.6);
  pen.obj(() => {
    pen.box(KX, KY, 0, KS, KS, KH, KEEP, { top: ROOF });
    for (const side of ["y+", "x+"] as const) {
      // (a skin over the face, a hair in front of it, that takes the floodlights after dark)
      pen.wall(side, KX, KY, 0, KS, KS, 0).rect(0, 0, KS, KH, KEEP, { bias: 0.018, glow: 0.24 });
      const f = pen.wall(side, KX, KY, 0, KS, KS);
      const south = side === "y+";
      f.rect(0, 0, KS, 0.55, KEEP_D, { grain: 0.7 });
      f.seg(0, 5.55, KS, 5.55, { w: 0.06, color: KEEP_D, kind: L_MARK, wobble: 0.3 });
      f.seg(0, KH - 0.45, KS, KH - 0.45, { w: W_FINE });
      for (const a of south ? [2.3, 4.1, 5.9, 7.7] : [5.0, 6.6, 8.05]) archWindow(f, a - 0.45, 6.4, a + 0.45, 8.5, lit(), KEEP_D);
      for (const a of south ? [5.9, 7.7] : [5.0, 6.6]) archWindow(f, a - 0.42, 2.9, a + 0.42, 4.8, lit(), KEEP_D);
      // flat buttresses up the face
      for (const a of south ? [5.0, 6.8] : [4.25, 5.8, 7.32]) f.block(a - 0.17, 0.55, a + 0.17, KH - 0.5, 0.15, KEEP, { w: W_FINE });
      if (south) {
        // the way in is a floor up, by a wooden stair
        f.poly(roundArch(3.0, 2.2, 4.5, 4.35), DARK, { outline: true, w: W_THIN, grain: 0.6 });
        f.rect(2.2, 3.3, 2.42, 4.3, C.charcoal, { grain: 0 });
      }
    }
  });
  steps(pen, KX + 3.0, KY + KS, 0, 1.5, 2.4, 2.2, 6, C.wood);
  pen.obj(() => {
    for (const x of [KX + 3.0, KX + 4.5]) {
      pen.stroke(
        [
          [x, KY + KS + 2.4, 0.95],
          [x, KY + KS + 0.1, 3.05],
        ],
        { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
      for (const k of [0.1, 1.2, 2.3]) {
        pen.stroke(
          [
            [x, KY + KS + k, 2.2 - (k / 2.4) * 2.2],
            [x, KY + KS + k, 3.05 - (k / 2.4) * 2.1],
          ],
          { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
        );
      }
    }
  }, 0.05);
  // the round end of the chapel, bulging out of the east face
  pen.obj(() => {
    const ax = KX + KS;
    const ay = KY + 7.6;
    pen.cyl(ax, ay, 0, 1.55, KH, KEEP, { seg: 14, top: ROOF });
    for (const deg of [-12, 30]) {
      const a = (deg * Math.PI) / 180;
      for (const z of [3.2, 6.9]) {
        pen.stroke(
          [
            [ax + Math.cos(a) * 1.57, ay + Math.sin(a) * 1.57, z],
            [ax + Math.cos(a) * 1.57, ay + Math.sin(a) * 1.57, z + 1.3],
          ],
          { w: 0.2, color: C.glass, kind: L_MARK, wobble: 0 },
        );
      }
    }
  }, 0.05);
  battlements(pen, KX, KY, KH, KS, KS, KEEP, 0.5, 0.5);
  // four turrets under lead caps and gilded vanes: three square, one round
  const corners: [number, number, boolean][] = [
    [KX, KY, false],
    [KX + KS, KY, true],
    [KX + KS, KY + KS, false],
    [KX, KY + KS, false],
  ];
  corners.forEach(([tx, ty, round], i) => {
    const top = KH + 3.3;
    pen.obj(() => {
      if (round) {
        pen.cyl(tx, ty, 0, 1.3, top, KEEP, { seg: 12 });
        pen.cyl(tx, ty, top, 1.42, 0.3, KEEP_D, { seg: 12, w: W_THIN });
      } else {
        pen.box(tx - 1.15, ty - 1.15, 0, 2.3, 2.3, top, KEEP);
        pen.box(tx - 1.28, ty - 1.28, top, 2.56, 2.56, 0.3, KEEP_D, { w: W_THIN });
        for (const side of ["y+", "x+"] as const) archWindow(pen.wall(side, tx - 1.15, ty - 1.15, 0, 2.3, 2.3), 0.75, KH + 1.1, 1.55, KH + 2.6, lit(), KEEP_D);
      }
      pen.dome(tx, ty, top + 0.3, round ? 1.3 : 1.22, 1.15, LEAD, { seg: 10, rings: 3 });
      pen.cone(tx, ty, top + 1.38, 0.3, 0.75, LEAD, { seg: 6, w: W_FINE });
      pen.pole([tx, ty, top + 2.05], [tx, ty, top + 3.0], 0.06, C.gold, { ink: false });
      pen.card(tx, ty, top + 2.55).poly(
        [
          [0, 0],
          [0.55, 0.14],
          [0, 0.3],
        ],
        C.gold,
        { outline: true, w: 0.03, grain: 0.2, sway: 0.1 },
      );
    }, 0.25 + i * 0.08);
  });
  flag(pen, KX + KS / 2, KY + KS / 2, KH, 5.2, "uk", 1.25);
  // floodlights against the walls, for the night
  pen.obj(() => {
    for (const a of [2, 5, 8]) {
      pen.stroke(
        [
          [KX + a, KY + KS + 0.35, 0.7],
          [KX + a + 0.02, KY + KS + 0.35, 0.7],
        ],
        { kind: L_LIGHT, w: 3.4, alpha: 0.34, wobble: 0 },
      );
      pen.stroke(
        [
          [KX + KS + 0.35, KY + a, 0.7],
          [KX + KS + 0.35, KY + a + 0.02, 0.7],
        ],
        { kind: L_LIGHT, w: 3.4, alpha: 0.34, wobble: 0 },
      );
    }
  });
}

// ---------------------------------------------------------------- the buildings against the north wall

/** One bay of a timber-framed Tudor house: white plaster, black beams, a tiled gable. It faces local +y. */
function tudorBay(pen: Pen, rng: Rng, w: number, d: number, h: number, door: boolean): void {
  const rh = w * 0.6;
  pen.begin();
  pen.box(0, 0, 0, w, d, h, C.white);
  pen.gable(-0.1, 0, h, w + 0.2, d + 0.2, rh, "y", TILE, { gable: C.white });
  const f = pen.wall("y+", 0, 0, 0, w, d);
  const beam = { w: 0.1, color: BEAM, kind: L_MARK, wobble: 0.3 };
  const stud = { w: 0.065, color: BEAM, kind: L_MARK, wobble: 0.3 };
  for (const b of [0.07, h * 0.5, h - 0.07]) f.seg(0.05, b, w - 0.05, b, beam);
  for (const a of [0.07, w - 0.07]) f.seg(a, 0.05, a, h - 0.05, beam);
  const n = Math.max(4, Math.round(w / 0.5));
  for (let k = 1; k < n; k++) {
    const a = (k * w) / n;
    if (Math.abs(a - w / 2) > 0.68) f.seg(a, h * 0.5, a, h - 0.1, stud);
  }
  // braces across the corners of the lower storey
  f.seg(0.1, h * 0.5 - 0.1, 0.62, 0.1, stud);
  f.seg(w - 0.1, h * 0.5 - 0.1, w - 0.62, 0.1, stud);
  if (door) f.rect(w / 2 - 0.4, 0, w / 2 + 0.4, 1.5, BEAM, { outline: true, w: W_FINE });
  else windowAt(f, w / 2 - 0.5, 0.42, w / 2 + 0.5, 1.25, rng.chance(0.7), BEAM);
  windowAt(f, w / 2 - 0.55, h * 0.5 + 0.32, w / 2 + 0.55, h - 0.32, rng.chance(0.7), BEAM);
  // the gable: rafters, a collar and a king post
  const g = pen.wall("y+", -0.1, 0, h, w + 0.2, d + 0.2);
  const m = (w + 0.2) / 2;
  g.line(
    [
      [0.14, 0.05],
      [m, rh - 0.12],
      [w + 0.06, 0.05],
    ],
    beam,
  );
  g.seg(m, 0.06, m, rh - 0.2, stud);
  g.seg(m * 0.5, rh * 0.5, m * 1.5, rh * 0.5, stud);
  pen.end();
}

function northRange(c: LondonCtx): void {
  const { pen, rng } = c;
  // the Jewel House
  const x0 = 24.3;
  const y0 = WY0 + WALL_T;
  const w = 6.2;
  const d = 3.4;
  const h = 5.4;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, STONE, { top: STONE_D });
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.poly(pointed(2.4, 0, 3.8, 2.5), hex("#5a4636"), { outline: true, w: W_THIN, grain: 0.6 });
    const holes: Hole[] = [
      [2.4, 0, 3.8, 2.5],
      [0.9, 2.75, 5.3, 3.5],
    ];
    for (const a of [0.5, 4.8]) {
      lancet(f, a, 0.9, a + 0.9, 2.45, true, STONE_L);
      holes.push([a, 0.9, a + 0.9, 2.45]);
    }
    f.rect(0.9, 2.75, 5.3, 3.5, hex("#5b3a82"), { outline: true, w: W_FINE, glow: 0.35, grain: 0.4 });
    f.text("CROWN JEWELS", w / 2, 2.95, 0.34, { align: "c", color: C.gold, kind: L_MARK, w: 0.065, wobble: 0.2, layer: 1 });
    for (let k = 0; k < 4; k++) {
      const a = 0.55 + k * 1.42;
      lancet(f, a, 3.8, a + 0.85, 5.0, rng.chance(0.7), STONE_L);
      holes.push([a, 3.8, a + 0.85, 5.0]);
    }
    masonry(f, 0.2, 0.2, w - 0.2, h - 0.2, STONE_D, 0.3, holes);
    const g = pen.wall("x+", x0, y0, 0, w, d);
    for (const a of [0.55, 1.95]) lancet(g, a, 3.8, a + 0.85, 5.0, rng.chance(0.7), STONE_L);
  }, 0.05);
  battlements(pen, x0, y0, h, w, d, STONE_L, 0.5, 0.5);
  flag(pen, x0 + 0.9, y0 + 1.2, h, 3.0, "england", 0.8);
  // the Tudor houses the Yeoman Warders live in
  for (let k = 0; k < 3; k++) {
    pen.push(31.2 + k * 2.7, y0, 0);
    tudorBay(pen, rng, 2.7, 3.4, 3.2, k === 1);
    pen.pop();
  }
  pen.box(33.6, y0 + 0.5, 3.4, 0.6, 0.6, 2.4, C.brick, { top: C.charcoal, w: W_THIN });
}

// ---------------------------------------------------------------- life inside the walls

function wardLife(c: LondonCtx): void {
  const { pen, rng } = c;
  // the queue for the Crown Jewels: three lanes of it, between ropes
  pen.obj(() => {
    const ys = [33.0, 34.9, 36.8, 38.7];
    for (const x of [25.3, 26.5, 27.7, 28.9]) {
      const rope: V3[] = [];
      ys.forEach((y, k) => {
        pen.pole([x, y, 0], [x, y, 0.95], 0.09, C.gold);
        rope.push([x, y, 0.92]);
        if (k + 1 < ys.length) rope.push([x, (y + ys[k + 1]) / 2, 0.64]);
      });
      pen.stroke(rope, { w: 0.07, color: C.redDark, kind: L_BAR, wobble: 0 });
    }
  });
  [25.9, 27.1, 28.3].forEach((x, i) => {
    for (let k = 0; k < 7; k++) {
      if (rng.chance(0.15)) continue;
      const y = 33.25 + k * 0.88 + rng.range(-0.1, 0.1);
      const lk = randomLook(rng);
      if (rng.chance(0.15)) snapper(pen, x, y, lk, i % 2 === 0);
      else person(pen, x + rng.range(-0.1, 0.1), y, 0, lk, rng.pick(["stand", "stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.14) ? 0.72 : 1);
    }
  });
  // a Yeoman Warder on the door, and a guardsman by his sentry box
  beefeater(pen, 28.0, 31.75, 0, "stand", true);
  pen.obj(() => {
    pen.box(24.45, 31.35, 0, 0.9, 0.8, 2.35, C.navy, { top: C.charcoal, w: W_THIN });
    pen.gable(24.4, 31.3, 2.35, 1.0, 0.9, 0.4, "y", C.charcoal, { gable: C.navy, w: W_FINE });
    pen.wall("y+", 24.45, 31.35, 0, 0.9, 0.8).rect(0.14, 0.05, 0.76, 2.1, C.black, { grain: 0.3 });
  });
  guardsman(pen, 24.9, 32.6, 0, "stand", false, rng);
  // the ravens: a perch, the Ravenmaster with his bucket, and a few birds that stay where they are
  pen.obj(() => {
    pen.pole([PERCHES[2][0], PERCHES[2][1], 0], [PERCHES[2][0], PERCHES[2][1], 1.3], 0.1, C.woodDark);
    pen.pole([PERCHES[2][0] - 0.6, PERCHES[2][1], 1.3], [PERCHES[2][0] + 0.6, PERCHES[2][1], 1.3], 0.09, C.woodDark);
  });
  pen.obj(() => {
    beefeater(pen, 31.5, 37.3, 0, "wave", false);
    pen.card(31.5, 37.3, 0).rect(-0.62, 0.62, -0.3, 0.95, C.metal, { outline: true, w: W_FINE, layer: 5, grain: 0.2 });
  });
  raven(pen, 32.6, 34.2, 0, true);
  raven(pen, 36.4, 35.1);
  raven(pen, 34.2, 39.0, 0, true);
  snapper(pen, 33.7, 33.7, randomLook(rng), true);
  person(pen, 31.0, 39.3, 0, randomLook(rng), "stand", false, 0.72);
  // trees in the corners of the ward, showing over the walls
  tree(pen, rng, 10.2, 40.2, { kind: "elm", h: 3.2 });
  tree(pen, rng, 38.2, 41.0, { kind: "blossom" });
}

// ---------------------------------------------------------------- the wharf and the river front

/** An old cannon on its carriage, muzzle towards local +y. */
function cannon(pen: Pen): void {
  pen.begin();
  // the carriage: oak cheeks on four small wheels
  pen.box(-0.4, -0.5, 0.2, 0.8, 1.2, 0.36, C.wood, { w: W_THIN, top: C.woodDark });
  for (const y of [-0.28, 0.44]) {
    for (const x of [-0.5, 0.5]) {
      pen.plane([x, y, 0], [0, 1, 0], [0, 0, 1], 0, true).circle(0, 0.33, 0.33, C.woodDark, { outline: true, w: 0.05, seg: 9, grain: 0.4 });
    }
  }
  // the barrel: fat at the breech, a knob behind it, a swell at the muzzle
  pen.pole([0, -0.7, 0.78], [0, 0.4, 0.95], 0.5, C.iron);
  pen.pole([0, 0.3, 0.94], [0, 1.5, 1.12], 0.38, C.iron);
  pen.pole([0, -0.9, 0.75], [0, -0.78, 0.77], 0.26, C.iron, { ink: false });
  pen.pole([0, 1.46, 1.11], [0, 1.56, 1.13], 0.5, C.iron, { ink: false });
  pen.end();
}

function wharf(c: LondonCtx): void {
  const { pen, rng } = c;
  // the rail along the river (with a gap for the pier), and its lamps
  for (const [a, b] of [
    [4.2, 12.2],
    [14.6, 43.8],
  ]) {
    railing(
      pen,
      [
        [a, 47.75, 0],
        [b, 47.75, 0],
      ],
      0.9,
      C.iron,
      1.3,
    );
  }
  for (const x of [4.7, 21.2, 29.8, 36.45, 43.7]) globeLamp(pen, x, 47.35, 0, 3.0);
  // a row of old cannon, and the children who cannot be kept off them
  for (const x of [9.2, 11.2, 15.8, 17.9, 20.0]) {
    pen.push(x, 46.75, 0);
    cannon(pen);
    pen.pop();
  }
  person(pen, 11.2, 46.75, 0.78, randomLook(rng), "sit", false, 0.72);
  person(pen, 17.9, 46.75, 0.78, randomLook(rng), "sit", true, 0.72);
  person(pen, 15.0, 46.3, 0, randomLook(rng), "cheer", false, 0.72);
  snapper(pen, 10.2, 46.1, randomLook(rng), false);
  // a school party in hi-vis, counted twice
  for (let k = 0; k < 6; k++) person(pen, 5.6 + (k % 3) * 0.85, 46.55 + Math.floor(k / 3) * 0.62, 0, { ...randomLook(rng), top: C.hivis, hat: null }, k === 4 ? "wave" : "stand", k % 2 === 0, 0.7);
  person(pen, 8.2, 46.2, 0, { ...randomLook(rng), top: C.hivis }, "wave", true);
  // benches against the wall
  for (const x of [10.5, 17.8, 36.6]) {
    bench(pen, x, 43.5, 0);
    person(pen, x - 0.4, 43.55, 0.42, randomLook(rng), "sit", rng.chance(0.5));
    if (rng.chance(0.7)) person(pen, x + 0.45, 43.55, 0.42, randomLook(rng), "sit", rng.chance(0.5));
  }
  bin(pen, 12.0, 43.35);
  // ices
  pen.push(28.4, 43.0, 0);
  stall(pen, rng, { w: 2.9, d: 1.5, a: C.pink, sign: "ICES", goods: [C.white, C.pink, hex("#c9a37f"), C.yellow] });
  pen.pop();
  person(pen, 28.9, 45.05, 0, randomLook(rng), "stand", false);
  person(pen, 29.8, 45.1, 0, randomLook(rng), "cheer", true, 0.72);
  person(pen, 30.7, 45.0, 0, randomLook(rng), "stand", true);
  // a Yeoman Warder having his photograph taken, again
  beefeater(pen, 33.9, 44.5, 0, "stand");
  person(pen, 33.1, 44.55, 0, randomLook(rng), "wave", true);
  person(pen, 34.7, 44.5, 0, randomLook(rng), "cheer", false, 0.72);
  snapper(pen, 35.4, 45.1, randomLook(rng), true);
}

/** Tower Pier: a ramp down from the wharf to a pontoon, and a river bus alongside. */
function pier(c: LondonCtx): void {
  const { pen, rng } = c;
  const deck = WATER + 0.55;
  pen.obj(() => {
    pen.box(12.2, 48, -0.26, 2.4, 1.3, 0.26, C.wood, { w: W_THIN, top: C.woodDark });
    pen.fill(
      [
        [12.2, 48.2, 0],
        [12.2, 49.2, 0],
        [6.6, 49.2, deck],
        [6.6, 48.2, deck],
      ],
      C.metal,
      { outline: true, w: W_THIN },
    );
    for (const y of [48.2, 49.2]) {
      pen.stroke(
        [
          [12.2, y, 0.85],
          [6.6, y, deck + 0.85],
        ],
        { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0 },
      );
      for (let k = 0; k <= 4; k++) {
        const x = 12.2 - 1.4 * k;
        const z = (deck * k) / 4;
        pen.stroke(
          [
            [x, y, z],
            [x, y, z + 0.85],
          ],
          { w: 0.06, color: C.iron, kind: L_BAR, wobble: 0 },
        );
      }
    }
  });
  pen.obj(() => {
    pen.box(0.8, 48.3, WATER - 0.15, 6.4, 2.0, 0.7, C.greyDark, { top: C.wood, w: 0.1 });
    for (const x of [1.2, 6.8]) pen.pole([x, 50.5, WATER - 0.2], [x, 50.5, WATER + 2.2], 0.22, C.woodDark);
    // a shelter, and the name of the place
    for (const [x, y] of [
      [1.5, 48.6],
      [5.9, 48.6],
      [1.5, 50.0],
      [5.9, 50.0],
    ]) {
      pen.pole([x, y, deck], [x, y, deck + 2.3], 0.08, C.white);
    }
    pen.box(1.3, 48.45, deck + 2.3, 4.8, 1.75, 0.14, C.royal, { w: W_THIN });
    const s = pen.plane([1.6, 50.22, deck + 1.55], [1, 0, 0], [0, 0, 1], 1, true);
    s.rect(0, 0, 4.2, 0.7, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    s.text("TOWER PIER", 2.1, 0.19, 0.32, { align: "c", layer: 1, w: 0.055, color: C.navy, kind: L_MARK });
  }, 0.1);
  for (const [x, y] of [
    [2.4, 49.4],
    [3.3, 49.65],
    [4.3, 49.3],
    [5.2, 49.7],
  ]) {
    person(pen, x, y, deck, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
  }
  pen.push(6.6, 52.15, WATER, 0);
  riverBus(pen, rng, false);
  pen.pop();
}

/** Traitors' Gate: a low water gate in the embankment, under St Thomas's Tower. */
function traitorsGate(c: LondonCtx): void {
  const { pen } = c;
  // (well clear of the wall, so the mooring rings behind it do not show through)
  const bias = 0.45;
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, WATER, 48, 48, 4);
    f.rect(20.5, 0, 27.5, 3.95, STONE, { outline: true, w: W_THIN, grain: 0.7, bias });
    f.poly(roundArch(21.7, 0, 26.3, 3.0, 8), hex("#2f3d52"), { outline: true, w: W_THIN, layer: 1, grain: 0.5, bias });
    // two leaves of timber lattice
    const top = (a: number) => 0.7 + Math.sqrt(Math.max(0, 2.3 * 2.3 - (a - 24) * (a - 24)));
    const timber = { w: 0.07, color: C.woodDark, kind: L_MARK, wobble: 0.2, layer: 2, bias };
    for (let a = 22.1; a < 26.0; a += 0.42) f.seg(a, 0.12, a, top(a) - 0.12, timber);
    for (const b of [0.75, 1.55, 2.3]) {
      const up = Math.max(0, b - 0.7);
      const half = Math.sqrt(Math.max(0, 2.3 * 2.3 - up * up)) - 0.1;
      f.seg(24 - half, b, 24 + half, b, timber);
    }
    f.text("TRAITORS' GATE", 24, 3.34, 0.3, { align: "c", w: 0.05, layer: 1, bias });
  }, 0.2);
}

// ---------------------------------------------------------------- everything that moves

/** A walker with something extra drawn on: an umbrella, a hat. */
function castWith(look: Look, seed: number, extra?: (pen: Pen, pose: Pose, flip: boolean) => void): WalkerKind {
  const mk = (pose: Pose, flip: boolean) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, look, pose, flip);
        extra?.(p, pose, flip);
      },
      0,
      seed,
    );
  return {
    frames: [
      [mk("walkA", false), mk("walkB", false)],
      [mk("walkA", true), mk("walkB", true)],
    ],
  };
}

/** A raven in the air, wings up or down. */
function ravenFlying(k: Plane, up: boolean): void {
  k.ellipse(0, 0, 0.4, 0.17, C.black, { outline: true, w: 0.045, seg: 9, grain: 0.4 });
  k.circle(0.4, 0.08, 0.14, C.black, { seg: 7, layer: 1, grain: 0.4 });
  k.poly(
    [
      [0.5, 0.12],
      [0.76, 0.04],
      [0.5, 0],
    ],
    C.charcoal,
    { layer: 2, grain: 0 },
  );
  const b = up ? 0.62 : -0.5;
  k.poly(
    [
      [-0.2, 0.05],
      [0.16, 0.05],
      [-0.1, b],
      [-0.52, b * 0.8],
    ],
    C.black,
    { outline: true, w: 0.04, layer: 2, grain: 0.4 },
  );
  k.poly(
    [
      [-0.34, 0.03],
      [-0.8, 0.12],
      [-0.78, -0.12],
    ],
    C.black,
    { layer: 1, grain: 0.4 },
  );
}

function motion(c: LondonCtx): void {
  const { pen, rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;
  const loop = (pts: [number, number][], r: number) =>
    new Route(
      rounded(
        pts.map(([x, y]) => W(x, y)),
        true,
        r,
      ),
      true,
    );

  // ---- the crane's jib, turning slowly: redrawn every frame
  const tCrane = pen.reveal(c.ox + CRANE_X, c.oy + CRANE_Y, 0) + 0.45;
  c.movers.push((m) => {
    if (m.t < tCrane || !m.sees(c.ox + CRANE_X, c.oy + CRANE_Y, CRANE_Z, 14)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => tCrane;
    dp.rng = new Rng(1666);
    craneTop(dp, c.ox + CRANE_X, c.oy + CRANE_Y, 12 + 86 * Math.sin(0.11 * m.t + 0.9), 17.5 + 3.2 * Math.sin(0.23 * m.t));
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- lift cars going up and down the Cheesegrater
  const car = makeSprite(
    (p) => {
      p.box(0, -0.17, 0, 0.16, 0.34, 1.05, C.yellow, { w: 0.045 });
      p.wall("x+", 0, -0.17, 0, 0.16, 0.34).rect(0.05, 0.3, 0.29, 0.9, C.glassLight, { glow: 1, grain: 0.2 });
    },
    0,
    41,
  );
  [6.38, 6.05, 5.72].forEach((y, i) => {
    const p = W(CG_X1, y);
    const period = 9 + i * 2.3;
    c.movers.push((m) => {
      // (the second easing makes it wait a moment at the top and the bottom)
      const e = ease.inOut(0.5 - 0.5 * Math.cos(((m.t + i * 3.1) / period) * Math.PI * 2));
      m.put(car, p[0], p[1], 1.2 + e * (CG_H - 4), born + i * 0.2);
    });
  });

  // ---- people on foot: along the wharf, in at the east gate and round the green, across Tower Hill
  const wharfWalk = loop(
    [
      [5.2, 45.45],
      [42.6, 45.45],
      [42.6, 45.95],
      [5.2, 45.95],
    ],
    0.2,
  );
  for (let i = 0; i < 9; i++) c.movers.push(walker(wharfWalk, rng, born + rng.range(0, 1)));
  const visitors = loop(
    [
      [44.3, GATE_Y - 0.3],
      [29.6, GATE_Y - 0.3],
      [29.6, 40.5],
      [38.3, 40.5],
      [38.3, GATE_Y + 0.35],
      [44.3, GATE_Y + 0.35],
    ],
    0.4,
  );
  for (let i = 0; i < 8; i++) c.movers.push(walker(visitors, rng, born + rng.range(0, 1)));
  // City workers: suits, one bowler, and umbrellas whatever the weather
  const hill = loop(
    [
      [13.6, 18.15],
      [42.4, 18.15],
      [42.4, 19.25],
      [13.6, 19.25],
    ],
    0.3,
  );
  const brollies = [C.navy, C.red, C.black, C.green];
  for (let i = 0; i < 11; i++) {
    let kind: WalkerKind | undefined;
    if (i < 4) kind = castWith(suit(rng), 300 + i, (p, _pose, flip) => umbrella(p, 0, 0, 0, brollies[i], flip));
    else if (i === 4) kind = castWith(suit(rng), 304, (p, pose, flip) => hat(p, 0, 0, 0, "bowler", { pose, flip }));
    else if (i < 8) kind = castWith(suit(rng), 300 + i);
    c.movers.push(walker(hill, rng, born + rng.range(0, 1), undefined, kind));
  }

  // ---- a Yeoman Warder and his tour, shuffling round the green: a few steps, a story, a few steps more
  const round = loop(
    [
      [30.0, 32.5],
      [37.9, 32.5],
      [37.9, 40.1],
      [30.0, 40.1],
    ],
    0.5,
  );
  const warder = (pose: Pose, flip: boolean) => makeSprite((p) => beefeater(p, 0, 0, 0, pose, flip), 0, 61);
  const lead = {
    walk: [
      [warder("walkA", false), warder("walkB", false)],
      [warder("walkA", true), warder("walkB", true)],
    ],
    talk: [warder("wave", false), warder("wave", true)],
  };
  const party = [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const lk = randomLook(rng);
    const s = k === 5 ? 0.72 : 1;
    const mk = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, lk, pose, flip, s), 0, 70 + k);
    return {
      walk: [
        [mk("walkA", false), mk("walkB", false)],
        [mk("walkA", true), mk("walkB", true)],
      ],
      stand: [mk("stand", false), mk("stand", true)],
      back: 1.0 + k * 0.6,
      side: ((k % 3) - 1) * 0.42,
      ph: k * 1.3,
    };
  });
  const Q: V3 = [0, 0, 0];
  const place = (d: number, side: number): [number, number, number] => {
    round.pos(d, Q);
    const h = round.heading(d, 0.8);
    return [Q[0] - Math.sin(h) * side, Q[1] + Math.cos(h) * side, h];
  };
  c.movers.push((m) => {
    if (m.t < born) return;
    const s = 6 + 0.5 * m.t + 0.55 * Math.sin(0.75 * m.t);
    const moving = 0.5 + 0.4125 * Math.cos(0.75 * m.t) > 0.24;
    const [lx, ly, lh] = place(s, 0);
    if (!m.sees(lx, ly, 0)) return;
    const lf = Math.cos(lh) - Math.sin(lh) >= 0 ? 0 : 1;
    // when he stops he turns round to talk to them
    m.put(moving ? lead.walk[lf][Math.floor(m.t * 2.6) & 1] : lead.talk[1 - lf], lx, ly, c.oz, born);
    for (const q of party) {
      const [x, y, h] = place(s - q.back, q.side);
      const f = Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1;
      m.put(moving ? q.walk[f][Math.floor(m.t * 2.6 + q.ph) & 1] : q.stand[f], x, y, c.oz, born);
    }
  });

  // ---- the ravens: three hopping about the green, and one that flaps from perch to perch
  const perched = [makeSprite((p) => raven(p, 0, 0, 0, false), 0, 71), makeSprite((p) => raven(p, 0, 0, 0, true), 0, 71)];
  const wing = (flip: boolean, up: boolean) => makeSprite((p) => ravenFlying(p.card(0, 0, 0, flip), up), 0, 72);
  const flying = [
    [wing(false, true), wing(false, false)],
    [wing(true, true), wing(true, false)],
  ];
  const hops: [number, number, number][] = [
    [33.0, 35.0, 0.3],
    [35.2, 36.5, 1.7],
    [32.0, 38.3, 2.9],
  ];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 34, c.oy + 36, 2, 12)) return;
    for (const [hx, hy, ph] of hops) {
      // two hops one way, a look round, two hops back
      const u = (m.t * 0.8 + ph) % 4;
      const k = u < 1 ? u : u < 2 ? 1 : u < 3 ? 3 - u : 0;
      const z = u % 2 < 1 ? 0.28 * Math.abs(Math.sin((u % 1) * Math.PI * 2)) : 0;
      m.put(perched[u < 2 ? 0 : 1], c.ox + hx + 0.7 * k, c.oy + hy - 0.3 * k, c.oz + z, born);
    }
    const leg = m.t / 4;
    const i = Math.floor(leg) % 3;
    const u = (leg - Math.floor(leg)) * 4;
    const a = PERCHES[i];
    const b = PERCHES[(i + 1) % 3];
    const right = b[0] - b[1] > a[0] - a[1] ? 0 : 1;
    if (u < 2.6) m.put(perched[right], c.ox + a[0], c.oy + a[1], c.oz + a[2], born);
    else {
      const e = ease.inOut((u - 2.6) / 1.4);
      m.put(flying[right][Math.floor(m.t * 9) & 1], c.ox + a[0] + (b[0] - a[0]) * e, c.oy + a[1] + (b[1] - a[1]) * e, c.oz + a[2] + (b[2] - a[2]) * e + 1.6 * Math.sin(Math.PI * e), born);
    }
  });

  // ---- everyone at the rail turns to watch the bridge go up, and points
  const watch = WATCHERS.map((x, i) => {
    const lk = randomLook(rng);
    const s = rng.chance(0.2) ? 0.72 : 1;
    const flip = rng.chance(0.5);
    const mk = (pose: Pose, f: boolean) => makeSprite((p) => person(p, 0, 0, 0, lk, pose, f, s), 0, 500 + i);
    return { p: W(x, 47.3), idle: mk("stand", flip), point: mk("wave", false), cheer: mk("cheer", false), lag: rng.range(0, 1.3) };
  });
  c.movers.push((m) => {
    if (m.t < born) return;
    // The leaves start up about three and a half seconds before the camera arrives, and the bridge
    // opens again every 40 seconds after that. With no tour, guess when the first opening is.
    const at = c.visit();
    const start = at == null ? born + 19 : at - 3.4;
    for (const q of watch) {
      const since = m.t - start - q.lag;
      const u = since < 0 ? 99 : since % 40;
      m.put(u > 13.5 ? q.idle : u > 4.4 && u < 9 ? q.cheer : q.point, q.p[0], q.p[1], q.p[2], born);
    }
  });
}

// ---------------------------------------------------------------- the block

export const tower: LondonBuilder = (c) => {
  c.early(() => ground(c));
  // pull back and look south-east: the tops of the towers behind, and all of the bridge opening in front
  c.focus(30, 34.5, 0.68);

  gherkin(c);
  cheesegrater(c);
  walkie(c);
  site(c);
  monument(c);
  plaza(c);
  fortress(c);
  northRange(c);
  keep(c);
  wardLife(c);
  wharf(c);
  pier(c);
  traitorsGate(c);
  motion(c);
};
