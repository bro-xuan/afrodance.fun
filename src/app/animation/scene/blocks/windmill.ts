// De Gooyer and Artis. The tallest windmill in town turns its sails over a
// brewery terrace; next door is the zoo, with giraffes at a hay basket,
// elephants in the mud, flamingos, a penguin parade and an aviary.
//
// The mill pieces (tower, sails) are exported: the polder island reuses them.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_LIGHT, Pen, Plane, SolidOpts } from "../../engine/pen";
import { Look, W_FINE, W_THIN, bench, bricks, lamp, person, railing, randomLook, speckle, stall, tree, tufts, windowAt } from "../kit";
import { Route, WalkerKind, castWalker, makeSprite, rounded, traveler } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import { BlockBuilder, BlockCtx, Mover } from "../types";

const THATCH = hex("#8a6f52");
const THATCH_D = hex("#6b553f");
const GIR = hex("#ecc06a");
const GIR_SPOT = hex("#b0703a");
const ELE = hex("#aeb0b6");
const ELE_D = hex("#96989f");
const FLAM = hex("#f7a1bd");
const FLAM_D = hex("#e9799f");
const IRON: RGB = [52, 78, 66];
const ROCK = hex("#e9eef2");

// ---------------------------------------------------------------- shared mill parts

/** An octagon with two sides square to the axes, so a tower shows three flat faces to the camera. */
export function octagon(cx: number, cy: number, r: number): V2[] {
  const pts: V2[] = [];
  for (let k = 0; k < 8; k++) {
    const a = ((22.5 + k * 45) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** An eight-sided tower section that tapers from r0 at z0 to r1 at z1. */
export function frustum(pen: Pen, cx: number, cy: number, z0: number, z1: number, r0: number, r1: number, rgb: RGB, o: SolidOpts & { top?: RGB | null } = {}): void {
  const a = octagon(cx, cy, r0);
  const b = octagon(cx, cy, r1);
  const verts: V3[] = [];
  for (const p of a) verts.push([p[0], p[1], z0]);
  for (const p of b) verts.push([p[0], p[1], z1]);
  const faces: number[][] = [];
  const cols: (RGB | null)[] = [];
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    faces.push([i, j, 8 + j, 8 + i]);
    cols.push(rgb);
  }
  faces.push([8, 9, 10, 11, 12, 13, 14, 15]);
  cols.push(o.top === undefined ? rgb : o.top);
  pen.solid(verts, faces, cols, o);
}

export interface OctFace {
  p: Plane;
  /** Width along the bottom edge and height up the slope. */
  w: number;
  h: number;
  /** How far the sloping sides have closed in at height b. */
  inset: (b: number) => number;
}

/**
 * A drawing plane on one of the three sides of an octagonal tower that face
 * the camera: 7 is the +x side, 0 the corner side, 1 the +y side.
 */
export function octFace(pen: Pen, cx: number, cy: number, z0: number, z1: number, r0: number, r1: number, k: 7 | 0 | 1): OctFace {
  const ang = (i: number) => ((22.5 + i * 45) * Math.PI) / 180;
  const aL = ang(k + 1);
  const aR = ang(k);
  const L0: V3 = [cx + Math.cos(aL) * r0, cy + Math.sin(aL) * r0, z0];
  const R0: V3 = [cx + Math.cos(aR) * r0, cy + Math.sin(aR) * r0, z0];
  const L1: V3 = [cx + Math.cos(aL) * r1, cy + Math.sin(aL) * r1, z1];
  const R1: V3 = [cx + Math.cos(aR) * r1, cy + Math.sin(aR) * r1, z1];
  const w = Math.hypot(R0[0] - L0[0], R0[1] - L0[1]);
  const u: V3 = [(R0[0] - L0[0]) / w, (R0[1] - L0[1]) / w, 0];
  const mb: V3 = [(L0[0] + R0[0]) / 2, (L0[1] + R0[1]) / 2, z0];
  const mt: V3 = [(L1[0] + R1[0]) / 2, (L1[1] + R1[1]) / 2, z1];
  const h = Math.hypot(mt[0] - mb[0], mt[1] - mb[1], mt[2] - mb[2]);
  const v: V3 = [(mt[0] - mb[0]) / h, (mt[1] - mb[1]) / h, (mt[2] - mb[2]) / h];
  const wt = Math.hypot(R1[0] - L1[0], R1[1] - L1[1]);
  return { p: pen.plane(L0, u, v, 1, true), w, h, inset: (b) => ((w - wt) / 2) * (b / h) };
}

export interface SailStyle {
  stock: RGB;
  lattice: RGB;
  cloth: RGB | null;
}

/**
 * The four sails of a windmill, turned to `angle` (radians), on a plane
 * through `hub` that faces +x or +y. Cheap enough to redraw every frame.
 */
export function drawSails(pen: Pen, hub: V3, facing: "x" | "y", angle: number, R: number, st: SailStyle): void {
  const p = facing === "x" ? pen.plane(hub, [0, 1, 0], [0, 0, 1], 0, true) : pen.plane(hub, [1, 0, 0], [0, 0, 1], 0, true);
  pen.begin();
  const w = R * 0.21;
  const r0 = R * 0.2;
  const r1 = R * 0.98;
  const lo = { w: 0.055, color: st.lattice, kind: L_BAR, wobble: 0, layer: 1 };
  for (let k = 0; k < 4; k++) {
    const ph = angle + (k * Math.PI) / 2;
    const dx = Math.cos(ph);
    const dy = Math.sin(ph);
    const nx = -dy;
    const ny = dx;
    const A: V2 = [dx * r0, dy * r0];
    const B: V2 = [dx * r1, dy * r1];
    const Cc: V2 = [B[0] + nx * w, B[1] + ny * w];
    const D: V2 = [A[0] + nx * w, A[1] + ny * w];
    if (st.cloth) p.poly([A, B, Cc, D], st.cloth, { grain: 0.6 });
    p.line([A, B, Cc, D], { ...lo, w: 0.075, closed: true });
    const nl = Math.max(4, Math.round((r1 - r0) / 0.72));
    for (let i = 1; i < nl; i++) {
      const r = r0 + ((r1 - r0) * i) / nl;
      p.seg(dx * r, dy * r, dx * r + nx * w, dy * r + ny * w, lo);
    }
    p.seg(A[0] + nx * w * 0.5, A[1] + ny * w * 0.5, B[0] + nx * w * 0.5, B[1] + ny * w * 0.5, lo);
    // the narrow wind board on the leading edge
    const lw = R * 0.05;
    p.poly(
      [
        [A[0] + dx * R * 0.12, A[1] + dy * R * 0.12],
        B,
        [B[0] - nx * lw, B[1] - ny * lw],
        [A[0] + dx * R * 0.12 - nx * lw, A[1] + dy * R * 0.12 - ny * lw],
      ],
      st.lattice,
      { grain: 0.5 },
    );
  }
  for (let k = 0; k < 2; k++) {
    const ph = angle + (k * Math.PI) / 2;
    p.bar(-Math.cos(ph) * R, -Math.sin(ph) * R, Math.cos(ph) * R, Math.sin(ph) * R, R * 0.028 + 0.06, st.stock, { layer: 2 });
  }
  p.circle(0, 0, 0.3, C.charcoal, { seg: 8, layer: 3, outline: true, w: W_FINE });
  pen.end();
}

/** A mover that keeps a set of sails turning. `t0` is when they sketch themselves in. */
export function turningSails(hub: V3, facing: "x" | "y", R: number, st: SailStyle, t0: number, rate: number, phase: number): Mover {
  return (m) => {
    if (m.t < t0 || !m.sees(hub[0], hub[1], hub[2], R + 5)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => t0;
    // the moving pen is shared: start its random stream at the same place every frame so the lines hold still
    dp.rng = new Rng(900 + Math.round(phase * 10));
    drawSails(dp, hub, facing, phase + m.t * rate, R, st);
    dp.reveal = keep;
    dp.rng = keepRng;
  };
}

export interface MillSpec {
  /** Radius and height of the brick base (0 height for a mill that stands on the ground). */
  baseR: number;
  baseH: number;
  bodyH: number;
  brick: RGB;
  body: RGB;
  cap: RGB;
  facing: "x" | "y";
  gallery: boolean;
  lit?: number;
}

/**
 * The tower of a windmill at the pen's origin: brick base, gallery, thatched
 * body, cap and tail. Returns where the sails' hub is (local).
 */
export function millTower(pen: Pen, rng: Rng, s: MillSpec): V3 {
  const rb = s.baseR;
  const zg = s.baseH;
  const lit = s.lit ?? 0.6;
  const fx = s.facing === "x";
  const rg = rb + 1.25;
  const door = (f: OctFace) => {
    const m = f.w / 2;
    const d: V2[] = [
      [m - 0.6, 0],
      [m + 0.6, 0],
      [m + 0.6, 1.45],
    ];
    for (let q = 1; q < 6; q++) d.push([m + Math.cos((q / 6) * Math.PI) * 0.6, 1.45 + Math.sin((q / 6) * Math.PI) * 0.6]);
    d.push([m - 0.6, 1.45]);
    f.p.poly(d, C.door, { outline: true, w: W_THIN });
    f.p.seg(m, 0, m, 2.0, { w: 0.05, wobble: 0 });
  };
  if (zg > 0) {
    pen.obj(() => {
      pen.extrude(octagon(0, 0, rb), 0, zg, s.brick);
      for (const k of [7, 0, 1] as const) {
        const f = octFace(pen, 0, 0, 0, zg, rb, rb, k);
        bricks(f.p, 0.15, 0.2, f.w - 0.15, zg - 0.5, scaleRGB(s.brick, 0.8), 0.7);
        f.p.rect(0, zg - 0.34, f.w, zg, C.quayCap, { grain: 0.5 });
        f.p.seg(0, zg - 0.34, f.w, zg - 0.34, { w: 0.06 });
        if ((k === 7 && !fx) || (k === 1 && fx)) door(f);
        else if (zg >= 3) windowAt(f.p, f.w / 2 - 0.42, zg * 0.42, f.w / 2 + 0.42, zg * 0.42 + 1.15, rng.chance(lit));
      }
    });
  }
  if (s.gallery) {
    pen.obj(() => {
      pen.extrude(octagon(0, 0, rg), zg - 0.24, zg, C.wood, { top: C.cream });
      for (const k of [7, 0, 1, 2]) {
        const a = ((22.5 + k * 45) * Math.PI) / 180;
        pen.pole([Math.cos(a) * rb * 0.98, Math.sin(a) * rb * 0.98, zg - 1.7], [Math.cos(a) * (rg - 0.25), Math.sin(a) * (rg - 0.25), zg - 0.24], 0.13, C.woodDark);
      }
      const ring: V3[] = octagon(0, 0, rg - 0.14).map((q) => [q[0], q[1], zg] as V3);
      ring.push(ring[0]);
      railing(pen, ring, 0.82, C.white, 1.2);
    });
  }
  const r0 = rb * 0.84;
  const r1 = rb * 0.5;
  const zt = zg + s.bodyH;
  pen.obj(() => {
    frustum(pen, 0, 0, zg, zt, r0, r1, s.body);
    for (const k of [7, 0, 1] as const) {
      const f = octFace(pen, 0, 0, zg, zt, r0, r1, k);
      f.p.ticks(0, 0.5, f.w, f.h - 0.2, {
        n: Math.round(f.w * f.h * 2.6),
        len: 0.55,
        ang: Math.PI / 2,
        jit: 0.12,
        color: THATCH_D,
        w: 0.055,
        inside: (a, b) => a > f.inset(b) + 0.12 && a < f.w - f.inset(b) - 0.12,
      });
      // white-trimmed skirt where the thatch starts
      const i0 = f.inset(0.42);
      f.p.poly(
        [
          [0, 0],
          [f.w, 0],
          [f.w - i0, 0.42],
          [i0, 0.42],
        ],
        C.white,
        { outline: true, w: W_FINE, grain: 0.4 },
      );
      if (zg === 0 && ((k === 7 && !fx) || (k === 1 && fx))) door(f);
      else if (k === 0 || zg > 0) {
        const b = f.h * (k === 0 ? 0.52 : 0.3);
        windowAt(f.p, f.w / 2 - 0.3, b, f.w / 2 + 0.3, b + 0.8, rng.chance(lit), C.white, false);
      }
    }
  }, 0.12);
  // cap, the nose the wind shaft comes out of, and the tail that turns it into the wind
  const rc = r1 * 1.22;
  const hub: V3 = fx ? [rc * 1.17 + 0.8, 0, zt + 0.9] : [0, rc * 1.17 + 0.8, zt + 0.9];
  pen.obj(() => {
    pen.cyl(0, 0, zt, r1 * 1.08, 0.34, C.green, { seg: 10 });
    pen.dome(0, 0, zt + 0.34, rc, rc * 0.92, s.cap, { seg: 10, rings: 3 });
    if (fx) pen.box(rc * 0.55, -0.42, zt + 0.5, rc * 0.62, 0.84, 0.8, C.white, { w: W_THIN });
    else pen.box(-0.42, rc * 0.55, zt + 0.5, 0.84, rc * 0.62, 0.8, C.white, { w: W_THIN });
    pen.pole(fx ? [rc * 1.1, 0, zt + 0.9] : [0, rc * 1.1, zt + 0.9], hub, 0.2, C.charcoal);
    const foot = s.gallery ? rg - 0.3 : rb + 2.4;
    const fz = s.gallery ? zg + 0.05 : 0.1;
    for (const o of [-0.55, 0.55]) {
      if (fx) pen.pole([-rc * 0.8, o, zt + 0.55], [-foot, o * 0.55, fz], 0.12, C.white);
      else pen.pole([o, -rc * 0.8, zt + 0.55], [o * 0.55, -foot, fz], 0.12, C.white);
    }
  }, 0.22);
  return hub;
}

// ---------------------------------------------------------------- zoo animals

export function lookOf(skin: RGB, hair: RGB, top: RGB, legs: RGB, long = false, hat: RGB | null = null): Look {
  return { skin, hair, top, legs, long, hat };
}

/** A giraffe seen side on, facing local +x. `neck` is how far the neck leans forward from upright (radians). */
function giraffe(pen: Pen, neck: number, small = false): void {
  const p = pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true);
  pen.begin();
  const legs: [number, number][] = [
    [-1.02, -0.06],
    [0.98, 0.05],
    [-0.8, -0.05],
    [0.74, 0.04],
  ];
  for (const [a, d] of legs) {
    p.bar(a, 2.6, a + d, 0.2, 0.21, GIR, { layer: 0 });
    p.bar(a + d, 0.2, a + d, 0.06, 0.2, C.charcoal, { layer: 0, ink: false });
  }
  p.bar(-1.22, 3.12, -1.5, 2.3, 0.08, GIR, { layer: 0, swayB: 0.25 });
  p.bar(-1.5, 2.3, -1.54, 2.02, 0.16, C.charcoal, { layer: 0, ink: false, sway: 0.25, swayB: 0.3 });
  p.ellipse(0, 2.98, 1.3, 0.72, GIR, { outline: true, w: W_THIN, layer: 1, seg: 14 });
  const sx = 0.95;
  const sy = 3.35;
  const L = small ? 2.2 : 2.75;
  const dx = Math.sin(neck);
  const dy = Math.cos(neck);
  const px = dy;
  const py = -dx;
  const ex = sx + dx * L;
  const ey = sy + dy * L;
  p.poly(
    [
      [sx - px * 0.36, sy - py * 0.36],
      [sx + px * 0.34, sy + py * 0.34],
      [ex + px * 0.17, ey + py * 0.17],
      [ex - px * 0.17, ey - py * 0.17],
    ],
    GIR,
    { outline: true, w: W_THIN, layer: 2 },
  );
  // head, along a snout that points forward and a little down from the neck
  const sn = neck + 1.25;
  const hx = Math.sin(sn);
  const hy = Math.cos(sn);
  const cxh = ex + hx * 0.34 + dx * 0.05;
  const cyh = ey + hy * 0.34 + dy * 0.05;
  const head: V2[] = [];
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2;
    const u = Math.cos(t) * 0.5;
    const v = Math.sin(t) * 0.23;
    head.push([cxh + hx * u + hy * v, cyh + hy * u - hx * v]);
  }
  for (const o of [-0.08, 0.1]) {
    const bx = ex + dx * 0.16 - hx * (0.08 - o);
    const by = ey + dy * 0.16 - hy * (0.08 - o);
    p.bar(bx, by, bx + dx * 0.34, by + dy * 0.34, 0.07, GIR_SPOT, { layer: 3 });
  }
  p.poly(head, GIR, { outline: true, w: W_THIN, layer: 4 });
  p.circle(cxh - hx * 0.1 + hy * 0.07, cyh - hy * 0.1 - hx * 0.07, 0.05, C.black, { seg: 5, layer: 5, grain: 0 });
  const spots: [number, number, number][] = [
    [-0.75, 3.1, 0.2],
    [-0.3, 2.75, 0.22],
    [0.15, 3.2, 0.2],
    [0.55, 2.8, 0.19],
    [-0.9, 2.72, 0.14],
    [-0.25, 3.3, 0.15],
    [0.75, 3.25, 0.15],
    [0.2, 2.6, 0.13],
  ];
  for (const [a, b, r] of spots) p.circle(a, b, r, GIR_SPOT, { seg: 6, layer: 3, grain: 0.3 });
  const ns = small ? 3 : 4;
  for (let i = 0; i < ns; i++) {
    const s = 0.5 + i * 0.6;
    const o = i % 2 === 0 ? 0.07 : -0.08;
    p.circle(sx + dx * s + px * o, sy + dy * s + py * o, 0.13 - i * 0.012, GIR_SPOT, { seg: 6, layer: 3, grain: 0.3 });
  }
  pen.end();
}

/** An elephant seen side on, facing local +x. */
function elephant(pen: Pen, trunkUp = false): void {
  const p = pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true);
  pen.begin();
  for (const a of [-1.15, 0.85]) p.bar(a, 1.25, a, 0.26, 0.58, ELE_D, { layer: 0 });
  p.bar(-1.72, 2.25, -1.98, 1.3, 0.09, ELE_D, { layer: 0, swayB: 0.3 });
  p.ellipse(0, 1.95, 1.75, 1.15, ELE, { outline: true, w: W_THIN, layer: 1, seg: 16 });
  for (const a of [-0.7, 1.25]) p.bar(a, 1.25, a, 0.26, 0.6, ELE, { layer: 2 });
  p.ellipse(1.75, 2.2, 0.85, 0.95, ELE, { outline: true, w: W_THIN, layer: 3, seg: 14 });
  if (trunkUp) {
    p.bar(2.45, 2.0, 2.95, 2.55, 0.42, ELE, { layer: 3 });
    p.bar(2.95, 2.55, 2.98, 3.3, 0.33, ELE, { layer: 3, swayB: 0.2 });
  } else {
    p.bar(2.4, 1.95, 2.72, 1.1, 0.44, ELE, { layer: 3, swayB: 0.15 });
    p.bar(2.72, 1.1, 2.84, 0.44, 0.34, ELE, { layer: 3, sway: 0.15, swayB: 0.4 });
  }
  p.ellipse(1.3, 2.25, 0.55, 0.8, ELE_D, { outline: true, w: W_THIN, layer: 4, seg: 12, sway: 0.06 });
  p.bar(2.2, 1.62, 2.62, 1.38, 0.11, C.white, { layer: 5 });
  p.circle(2.02, 2.47, 0.07, C.black, { seg: 6, layer: 5, grain: 0 });
  pen.end();
}

function flamingo(pen: Pen, rng: Rng, x: number, y: number): void {
  const c = pen.card(x, y, 0, rng.chance(0.5));
  pen.begin();
  const feeding = rng.chance(0.28);
  c.bar(0.02, 1.0, 0.02, 0.0, 0.07, FLAM_D, { ink: false });
  if (rng.chance(0.55)) {
    c.bar(0.12, 1.0, 0.3, 0.62, 0.07, FLAM_D, { ink: false });
    c.bar(0.3, 0.62, 0.1, 0.5, 0.07, FLAM_D, { ink: false });
  } else c.bar(0.16, 1.0, 0.2, 0.0, 0.07, FLAM_D, { ink: false });
  c.ellipse(0, 1.22, 0.44, 0.3, FLAM, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  const neck: V2[] = feeding
    ? [
        [0.32, 1.3],
        [0.62, 1.42],
        [0.74, 1.0],
        [0.66, 0.42],
      ]
    : [
        [0.32, 1.32],
        [0.52, 1.62],
        [0.36, 1.92],
        [0.42, 2.18],
      ];
  c.line(neck, { w: 0.2, color: C.ink, kind: L_BAR, wobble: 0, layer: 1 });
  c.line(neck, { w: 0.12, color: FLAM, kind: L_BAR, wobble: 0, layer: 1, bias: 0.012 });
  const hx = feeding ? 0.66 : 0.46;
  const hy = feeding ? 0.34 : 2.24;
  c.circle(hx, hy, 0.14, FLAM, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  c.poly(
    feeding
      ? [
          [hx - 0.05, hy - 0.1],
          [hx + 0.1, hy - 0.3],
          [hx + 0.08, hy - 0.08],
        ]
      : [
          [hx + 0.1, hy + 0.02],
          [hx + 0.3, hy - 0.12],
          [hx + 0.1, hy - 0.1],
        ],
    C.black,
    { layer: 3, grain: 0 },
  );
  pen.end();
}

function penguin(pen: Pen, lean = 0, flip = false): void {
  const c = pen.card(0, 0, 0, flip);
  pen.begin();
  c.seg(-0.14, 0.03, -0.3, 0.03, { w: 0.11, color: C.orange, kind: L_BAR, wobble: 0 });
  c.seg(0.14, 0.03, 0.3, 0.03, { w: 0.11, color: C.orange, kind: L_BAR, wobble: 0 });
  const body: V2[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const b = 0.6 + Math.sin(t) * 0.55;
    body.push([Math.cos(t) * 0.32 + lean * b, b]);
  }
  c.poly(body, C.black, { outline: true, w: W_FINE, layer: 1 });
  const belly: V2[] = [];
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2;
    const b = 0.52 + Math.sin(t) * 0.42;
    belly.push([0.03 + Math.cos(t) * 0.2 + lean * b, b]);
  }
  c.poly(belly, C.white, { layer: 2, grain: 0.3 });
  c.circle(lean * 1.2, 1.18, 0.23, C.black, { outline: true, w: W_FINE, layer: 3, seg: 9 });
  c.poly(
    [
      [lean * 1.2 + 0.16, 1.2],
      [lean * 1.2 + 0.42, 1.12],
      [lean * 1.2 + 0.16, 1.08],
    ],
    C.orange,
    { layer: 4, grain: 0 },
  );
  c.circle(lean * 1.2 + 0.07, 1.24, 0.045, C.white, { seg: 5, layer: 4, grain: 0 });
  pen.end();
}

/** A parrot on the wing (or on a perch when `up` is null), as a camera-facing card. */
function parrot(pen: Pen, body: RGB, wing: RGB, up: boolean | null, flip: boolean): void {
  const c = pen.card(0, 0, 0, flip);
  pen.begin();
  c.poly(
    [
      [-0.26, 0.03],
      [-0.95, -0.14],
      [-0.26, -0.1],
    ],
    wing,
    { outline: true, w: W_FINE },
  );
  c.ellipse(0, 0, 0.36, 0.18, body, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  c.circle(0.36, 0.08, 0.15, body, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  c.poly(
    [
      [0.47, 0.12],
      [0.64, 0.02],
      [0.46, -0.02],
    ],
    C.yellow,
    { layer: 3, grain: 0 },
  );
  if (up === null) {
    c.poly(
      [
        [-0.22, 0.1],
        [0.14, 0.12],
        [-0.3, -0.16],
      ],
      wing,
      { outline: true, w: W_FINE, layer: 3 },
    );
  } else {
    const tip = up ? 0.62 : -0.5;
    c.poly(
      [
        [-0.18, 0.05],
        [0.2, 0.05],
        [-0.12, tip],
      ],
      wing,
      { outline: true, w: W_FINE, layer: 3 },
    );
  }
  pen.end();
}

/** A bunch of balloons on strings, held at (x, y, z). */
function balloons(pen: Pen, rng: Rng, x: number, y: number, z: number, n: number): void {
  const c = pen.card(x, y, z);
  const cols = [C.red, C.yellow, C.blue, C.pink, C.orange, C.purple, C.green, C.teal];
  pen.begin();
  for (let i = 0; i < n; i++) {
    const a = rng.range(-0.9, 0.9);
    const b = rng.range(1.5, 2.9);
    c.seg(0, 0, a, b - 0.3, { w: 0.035, kind: L_BAR, wobble: 0, sway: 0.02, swayB: 0.3 });
    c.ellipse(a, b, 0.3, 0.36, cols[i % cols.length], { outline: true, w: W_FINE, sway: 0.3, layer: 1 + (i % 3), seg: 10, grain: 0.4 });
  }
  pen.end();
}

/** A dome of wire: only the mesh is drawn, so you can see the birds inside. */
function wireDome(pen: Pen, cx: number, cy: number, z: number, r: number, h: number): void {
  const n = 12;
  const rings = 4;
  const verts: V3[] = [];
  for (let k = 0; k < rings; k++) {
    const ph = (k / rings) * Math.PI * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([cx + Math.cos(a) * Math.cos(ph) * r, cy + Math.sin(a) * Math.cos(ph) * r, z + Math.sin(ph) * h]);
    }
  }
  verts.push([cx, cy, z + h]);
  const faces: number[][] = [];
  for (let k = 0; k < rings - 1; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i]);
    }
  }
  for (let i = 0; i < n; i++) faces.push([(rings - 1) * n + i, (rings - 1) * n + ((i + 1) % n), rings * n]);
  pen.solid(
    verts,
    faces,
    faces.map(() => null),
    { w: 0.06, ink: IRON, over: 0, wobble: 0.5 },
  );
}

/** Someone on foot at a chosen place in the line (the stock walker picks its own). */
export function walkAt(route: Route, kind: WalkerKind, at: number, speed: number, born: number, phase: number): Mover {
  return traveler(route, {
    speed,
    at: ((at % 1) + 1) % 1,
    born,
    span: 0.8,
    sprite: (h, t) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6 + phase * 7) & 1],
  });
}

// ---------------------------------------------------------------- the block

const MX = 12.6;
const MY = 8.4;

function ground(c: BlockCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  g1.rect(6.5, 0.9, 41.6, 41.6, C.grass);
  const inEll = (a: number, b: number, cx: number, cy: number, rx: number, ry: number) => ((a - cx) / rx) ** 2 + ((b - cy) / ry) ** 2 < 1;
  const lawn = (a: number, b: number) => {
    if (a > 16.4 && a < 32.4 && b > 8.4 && b < 19.8) return false; // terrace
    if (inEll(a, b, MX, MY, 5.6, 5.6)) return false;
    if (b > 20.5 && b < 22.1 && a > 19.4 && a < 35.4) return false;
    if (b > 33.2 && b < 35.1) return false;
    if (a > 19.4 && a < 21.1 && b > 21 && b < 34) return false;
    if (a > 33.7 && a < 35.4 && b > 11.4 && b < 34) return false;
    if (a > 28.4 && a < 31.6 && b > 34) return false;
    if (a > 7.1 && a < 19.2 && b > 20.8 && b < 33.2) return false;
    if (a > 21.3 && a < 33.5 && b > 22.3 && b < 33) return false;
    if (inEll(a, b, 38.3, 27.4, 3.1, 5.4) || inEll(a, b, 12, 39, 4.1, 1.95) || inEll(a, b, 37.3, 7.4, 4.6, 4.6)) return false;
    if (b > 14.2 && b < 16.4 && a < 16.6) return false;
    return true;
  };
  tufts(g3, 6.6, 1, 41.5, 41.5, 0.16, lawn);
  // brewery terrace, the mill's apron and the way in from the quay
  g2.rect(16.6, 8.6, 32.2, 19.6, C.plaza, { outline: true, w: W_THIN });
  speckle(g3, 16.8, 8.8, 32, 19.4, C.stoneDark, 0.22);
  g2.poly(octagon(MX, MY, 5.4), C.plaza, { outline: true, w: W_THIN });
  g2.rect(6.5, 14.4, 16.6, 16.2, C.path);
  // zoo paths
  const path = (x0: number, y0: number, x1: number, y1: number) => g2.rect(x0, y0, x1, y1, C.path);
  path(19.6, 20.7, 35.2, 21.9);
  path(19.6, 21.9, 20.9, 33.4);
  path(33.9, 21.9, 35.2, 33.4);
  path(7.4, 33.4, 41.2, 34.9);
  path(28.6, 34.9, 31.4, 41.6);
  path(33.9, 11.6, 35.2, 20.7);
  speckle(g3, 7.6, 33.5, 41, 34.8, C.streetDark, 0.3);
  speckle(g3, 19.7, 20.8, 35.1, 21.8, C.streetDark, 0.3);
  // paddocks and pools
  g2.rect(7.3, 21, 19, 33, C.sand, { outline: true, w: W_THIN });
  speckle(g3, 7.5, 21.2, 18.8, 32.8, C.streetDark, 0.25);
  g2.rect(21.5, 22.5, 33.3, 32.8, hex("#dccba4"), { outline: true, w: W_THIN });
  speckle(g3, 21.7, 22.7, 33.1, 32.6, C.woodDark, 0.22);
  g3.ellipse(24.2, 25.2, 2.3, 1.7, C.water, { kind: F_WATER, outline: true, w: W_THIN, ink: C.waterInk });
  g2.ellipse(38.3, 27.4, 2.9, 5.2, C.water, { kind: F_WATER, outline: true, w: W_THIN, ink: C.waterInk, seg: 22 });
  g3.ellipse(38.6, 28.6, 0.9, 1.3, C.grassLight, { outline: true, w: W_FINE });
  g2.ellipse(12, 39, 3.9, 1.75, C.water, { kind: F_WATER, outline: true, w: W_THIN, ink: C.waterInk, seg: 20 });
  g2.ellipse(37.3, 7.4, 4.4, 4.4, C.sand, { outline: true, w: W_FINE, seg: 20 });
}

function brewery(c: BlockCtx): void {
  const { pen, rng } = c;
  const wall = hex("#c8876a");
  const x0 = 19;
  const y0 = 1.6;
  const w = 12.6;
  const d = 5.6;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, 4.0, wall);
    pen.gable(x0, y0, 4.0, w, d, 2.1, "x", C.tile, { gable: wall });
    const f = pen.wall("y+", x0, y0, 0, w, d);
    for (let i = 0; i < 4; i++) {
      const a = 0.9 + i * 3.0;
      if (i === 2) {
        f.rect(a - 0.1, 0, a + 1.6, 2.5, C.door, { outline: true, w: W_THIN });
        f.seg(a + 0.75, 0, a + 0.75, 2.5, { w: 0.05, wobble: 0 });
      } else windowAt(f, a, 0.9, a + 1.5, 2.5, rng.chance(0.8));
    }
    f.rect(2.3, 2.85, w - 2.3, 3.85, C.white, { outline: true, w: W_FINE, layer: 1 });
    f.text("BROUWERIJ", w / 2, 3.05, 0.6, { align: "c", layer: 2 });
    const g = pen.wall("x+", x0, y0, 0, w, d);
    windowAt(g, 1.2, 0.9, 2.6, 2.5, rng.chance(0.8));
    windowAt(g, 3.2, 0.9, 4.6, 2.5, rng.chance(0.8));
    windowAt(g, d / 2 - 0.5, 4.1, d / 2 + 0.5, 5.2, false, C.white, false);
  });
  // the old boiler chimney
  pen.obj(() => {
    pen.box(x0 + 1.2, y0 + 0.6, 0, 1.0, 1.0, 8.6, C.brickDark, { top: C.charcoal });
    const f = pen.wall("y+", x0 + 1.2, y0 + 0.6, 0, 1.0, 1.0);
    f.rect(0, 7.6, 1.0, 8.0, C.white, { grain: 0.4 });
    const g = pen.wall("x+", x0 + 1.2, y0 + 0.6, 0, 1.0, 1.0);
    g.rect(0, 7.6, 1.0, 8.0, C.white, { grain: 0.4 });
  }, 0.1);
  // kegs by the door
  pen.obj(() => {
    const kegs: [number, number, number][] = [
      [25.4, 8.0, 0],
      [26.3, 8.05, 0],
      [25.85, 8.0, 0.72],
      [29.4, 8.1, 0],
    ];
    for (const [kx, ky, kz] of kegs) pen.cyl(kx, ky, kz, 0.4, 0.72, C.metal, { seg: 9, top: C.grey, w: W_THIN });
  });
}

function terrace(c: BlockCtx): void {
  const { pen, rng } = c;
  const glass = (x: number, y: number) => pen.box(x, y, 0.72, 0.17, 0.17, 0.27, C.gold, { top: C.white, w: W_FINE, grain: 0.3 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 17.6 + col * 4.9;
      const y = 10.6 + row * 4.4;
      if (row === 1 && col === 2) continue; // the bar stands here
      pen.obj(() => {
        pen.box(x, y, 0.62, 3.4, 0.8, 0.1, C.wood, { w: W_THIN });
        pen.box(x, y - 0.62, 0.36, 3.4, 0.34, 0.08, C.wood, { w: W_THIN });
        pen.box(x, y + 1.08, 0.36, 3.4, 0.34, 0.08, C.wood, { w: W_THIN });
        for (const lx of [x + 0.3, x + 3.1]) pen.pole([lx, y + 0.4, 0], [lx, y + 0.4, 0.62], 0.1, C.woodDark, { ink: false });
        for (let k = 0; k < 4; k++) {
          const px = x + 0.45 + k * 0.84;
          if (rng.chance(0.78)) person(pen, px, y - 0.45, 0.42, randomLook(rng), "bust", rng.chance(0.5));
          if (rng.chance(0.78)) person(pen, px + 0.1, y + 1.25, 0.42, randomLook(rng), "bust", rng.chance(0.5));
          if (rng.chance(0.75)) glass(px - 0.05, y + 0.12 + rng.range(0, 0.4));
        }
        if ((row + col) % 2 === 0) {
          pen.pole([x + 1.7, y + 0.4, 0.72], [x + 1.7, y + 0.4, 2.7], 0.08, C.white, { ink: false });
          pen.cone(x + 1.7, y + 0.4, 2.35, 1.9, 0.6, col === 1 ? C.yellow : C.green, { seg: 8, crease: 0.5 });
        }
      });
    }
  }
  // a toast standing up, and the bar under its own awning
  person(pen, 24.6, 18.5, 0, randomLook(rng), "cheer");
  person(pen, 25.5, 18.9, 0, randomLook(rng), "cheer", true);
  person(pen, 23.8, 19.1, 0, randomLook(rng), "wave");
  pen.push(27.6, 15.4, 0, 0);
  stall(pen, rng, { w: 3.8, sign: "BIER", a: C.green, goods: [C.gold, C.yellow, C.woodDark] });
  pen.pop();
  person(pen, 28.4, 18.7, 0, randomLook(rng), "stand", true);
  person(pen, 30.2, 18.9, 0, randomLook(rng), "wave");
  // a string of lights over the tables
  pen.obj(() => {
    const posts: V2[] = [
      [17, 9.2],
      [31.8, 9.2],
      [31.8, 19.3],
      [17, 19.3],
    ];
    for (const [px, py] of posts) pen.pole([px, py, 0], [px, py, 3.5], 0.1, IRON);
    for (let k = 0; k < 4; k++) {
      const a = posts[k];
      const b = posts[(k + 1) % 4];
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 3.5 - Math.sin(t * Math.PI) * 0.6]);
      }
      pen.stroke(pts, { w: 0.04, kind: L_BAR, wobble: 0 });
      for (let i = 1; i < 8; i++) {
        const q = pts[i];
        pen.stroke(
          [
            [q[0], q[1], q[2] - 0.02],
            [q[0], q[1], q[2] - 0.17],
          ],
          { w: 0.1, color: C.lamp, kind: L_BAR, wobble: 0 },
        );
        pen.stroke(
          [
            [q[0], q[1], q[2] - 0.1],
            [q[0], q[1] + 0.02, q[2] - 0.1],
          ],
          { w: 0.24, kind: L_LIGHT, wobble: 0 },
        );
      }
    }
  });
  bench(pen, 9.2, 17.2, 0);
  person(pen, 8.8, 17.25, 0.42, randomLook(rng), "sit");
  // two tourists and their photo of the mill
  person(pen, 18.0, 3.4, 0, randomLook(rng), "wave", true);
  person(pen, 17.3, 4.5, 0, randomLook(rng), "stand");
  tree(pen, rng, 8.4, 3.2, { kind: "round" });
  tree(pen, rng, 8.2, 19.0, { kind: "blossom" });
  tree(pen, rng, 15.4, 18.4, { kind: "bush" });
  lamp(pen, 16.9, 14.0);
}

function fences(c: BlockCtx): void {
  const { pen } = c;
  // the zoo's railings
  railing(
    pen,
    [
      [27.4, 41.45, 0],
      [6.75, 41.45, 0],
      [6.75, 20.25, 0],
      [32.75, 20.25, 0],
      [32.75, 1.2, 0],
    ],
    1.05,
    IRON,
    1.5,
  );
  railing(
    pen,
    [
      [32.75, 1.2, 0],
      [41.5, 1.2, 0],
      [41.5, 41.45, 0],
      [32.6, 41.45, 0],
    ],
    1.05,
    IRON,
    1.5,
  );
  // paddock fences: timber for the giraffes, steel for the elephants, a low rail round the flamingos
  railing(
    pen,
    [
      [7.3, 21, 0],
      [19, 21, 0],
      [19, 33, 0],
      [7.3, 33, 0],
      [7.3, 21, 0],
    ],
    1.25,
    C.woodDark,
    1.7,
  );
  railing(
    pen,
    [
      [21.5, 22.5, 0],
      [33.3, 22.5, 0],
      [33.3, 32.8, 0],
      [21.5, 32.8, 0],
      [21.5, 22.5, 0],
    ],
    1.0,
    C.greyDark,
    1.35,
  );
  const pond: V3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    pond.push([38.3 + Math.cos(t) * 3.2, 27.4 + Math.sin(t) * 5.55, 0]);
  }
  railing(pen, pond, 0.6, C.white, 1.4);
}

function giraffes(c: BlockCtx): void {
  const { pen, rng } = c;
  // the giraffe house: tall doors for tall residents
  pen.obj(() => {
    const wall = hex("#d9c39a");
    pen.box(7.7, 21.4, 0, 4.2, 3.6, 6.2, wall);
    pen.gable(7.7, 21.4, 6.2, 4.2, 3.6, 1.5, "y", C.tile, { gable: wall });
    const f = pen.wall("x+", 7.7, 21.4, 0, 4.2, 3.6);
    f.rect(0.9, 0, 2.7, 5.3, C.woodDark, { outline: true, w: W_THIN });
    f.seg(1.8, 0, 1.8, 5.3, { w: 0.05, wobble: 0 });
    const g = pen.wall("y+", 7.7, 21.4, 0, 4.2, 3.6);
    windowAt(g, 1.5, 3.6, 2.7, 4.8, false);
  });
  // the hay basket, up where a giraffe likes it
  pen.obj(() => {
    pen.pole([16.2, 24.6, 0], [16.2, 24.6, 5.0], 0.16, C.woodDark);
    pen.box(15.75, 24.15, 5.0, 0.9, 0.9, 0.65, C.wood, { top: C.yellow, w: W_THIN });
    const cd = pen.card(16.2, 24.6, 5.65);
    cd.ticks(-0.45, 0, 0.45, 0.5, { n: 14, len: 0.5, ang: Math.PI / 2, jit: 0.5, color: C.gold, w: 0.06 });
  });
  // one calf, standing still by its mother
  pen.push(15.6, 29.6, 0, 180, 0.62);
  giraffe(pen, 0.3, true);
  pen.pop();
  tree(pen, rng, 9.0, 27.6, { kind: "round", h: 3.0, r: 2.0, color: C.leaf2 });
  tree(pen, rng, 8.6, 31.6, { kind: "bush" });
}

function elephants(c: BlockCtx): void {
  const { pen, rng } = c;
  pen.push(26.2, 27.6, 0, 0, 1.22);
  elephant(pen);
  pen.pop();
  pen.push(30.6, 30.6, 0, 180, 1.08);
  elephant(pen, true);
  pen.pop();
  pen.push(29.6, 24.9, 0, 0, 0.6);
  elephant(pen);
  pen.pop();
  // a shower from the raised trunk
  pen.obj(() => {
    const cd = pen.card(27.3, 30.6, 3.4);
    for (let i = 0; i < 7; i++) {
      const a = -0.2 - i * 0.2;
      const b = 0.25 - (i - 2.2) * (i - 2.2) * 0.07;
      cd.seg(a, b, a - 0.12, b - 0.1, { w: 0.09, color: C.waterInk, kind: L_BAR, wobble: 0, sway: 0.2 });
    }
  });
  // a big red ball, a log, and the keeper with a bucket of apples
  pen.cyl(23.4, 29.9, 0, 0.55, 0.9, C.red, { seg: 10, w: W_THIN });
  pen.box(31.2, 26.9, 0, 1.6, 0.45, 0.42, C.woodDark, { w: W_THIN });
  person(pen, 32.3, 28.9, 0, lookOf(SKIN[2], HAIR[0], hex("#6f8f4e"), hex("#5c6b3f"), false, hex("#6f8f4e")), "stand", true);
  pen.box(31.6, 29.0, 0, 0.42, 0.42, 0.42, C.metal, { top: C.red, w: W_FINE });
  tree(pen, rng, 22.6, 23.5, { kind: "round", h: 2.6, r: 1.7 });
}

function flamingos(c: BlockCtx): void {
  const { pen, rng } = c;
  for (let i = 0; i < 11; i++) {
    const t = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next());
    flamingo(pen, rng, 38.3 + Math.cos(t) * r * 2.2, 27.4 + Math.sin(t) * r * 4.3);
  }
  // reeds at the water's edge
  pen.obj(() => {
    for (let i = 0; i < 16; i++) {
      const t = rng.range(0, Math.PI * 2);
      const x = 38.3 + Math.cos(t) * 2.85;
      const y = 27.4 + Math.sin(t) * 5.1;
      pen.stroke(
        [
          [x, y, 0],
          [x + rng.range(-0.1, 0.1), y, rng.range(0.7, 1.2)],
        ],
        { w: 0.07, color: C.leafDark, kind: L_BAR, wobble: 0, swayB: 0.3 },
      );
    }
  });
}

function penguins(c: BlockCtx): void {
  const { pen, rng } = c;
  // the ice rock
  pen.obj(() => {
    pen.extrude(
      [
        [8.2, 36.0],
        [11.4, 35.6],
        [15.2, 36.1],
        [16.0, 37.2],
        [13.2, 37.7],
        [9.4, 37.6],
        [7.9, 37.0],
      ],
      0,
      0.9,
      ROCK,
      { top: C.white },
    );
    pen.extrude(
      [
        [9.6, 36.0],
        [12.6, 35.8],
        [13.4, 36.9],
        [10.4, 37.1],
      ],
      0.9,
      1.9,
      ROCK,
      { top: C.white },
    );
  });
  const spots: [number, number, number][] = [
    [10.6, 36.5, 1.9],
    [12.2, 36.3, 1.9],
    [14.4, 36.7, 0.9],
    [8.9, 36.8, 0.9],
    [16.2, 39.4, 0],
  ];
  for (const [x, y, z] of spots) {
    pen.push(x, y, z);
    penguin(pen, rng.range(-0.05, 0.05), rng.chance(0.5));
    pen.pop();
  }
  railing(
    pen,
    [
      [7.3, 35.3, 0],
      [16.9, 35.3, 0],
      [16.9, 41.2, 0],
    ],
    0.6,
    C.white,
    1.4,
  );
}

function aviary(c: BlockCtx): void {
  const { pen, rng } = c;
  const cx = 37.3;
  const cy = 7.4;
  pen.cyl(cx, cy, 0, 4.0, 0.36, C.stone, { seg: 16, top: C.sand, w: W_THIN });
  // what lives inside goes in first, the mesh over it
  tree(pen, rng, cx - 0.6, cy - 0.5, { kind: "tall", z: 0.36, h: 1.3, r: 1.25 });
  tree(pen, rng, cx + 1.6, cy + 0.8, { kind: "bush", z: 0.36 });
  pen.obj(() => {
    pen.pole([cx + 0.9, cy + 1.6, 0.36], [cx + 0.9, cy + 1.6, 2.4], 0.1, C.woodDark);
    pen.pole([cx + 0.1, cy + 1.6, 2.2], [cx + 1.7, cy + 1.6, 2.2], 0.09, C.woodDark);
  });
  const birds: [number, number, number, RGB, RGB][] = [
    [cx + 0.3, cy + 1.6, 2.42, C.red, C.blue],
    [cx + 1.4, cy + 1.6, 2.42, C.yellow, C.teal],
    [cx - 1.5, cy + 0.6, 3.2, C.green, C.red],
  ];
  for (const [x, y, z, b, w] of birds) {
    pen.push(x, y, z);
    parrot(pen, b, w, null, rng.chance(0.5));
    pen.pop();
  }
  pen.obj(() => wireDome(pen, cx, cy, 0.36, 3.9, 4.6), 0.15);
  // the T-perch outside, with the two loud ones
  pen.obj(() => {
    pen.pole([34.4, 14.4, 0], [34.4, 14.4, 2.2], 0.11, C.woodDark);
    pen.pole([33.6, 14.4, 2.2], [35.2, 14.4, 2.2], 0.1, C.woodDark);
  });
  pen.push(33.85, 14.4, 2.42);
  parrot(pen, C.blue, C.yellow, null, false);
  pen.pop();
  pen.push(34.95, 14.4, 2.42);
  parrot(pen, C.red, C.green, null, true);
  pen.pop();
  // the monkey rock
  const stone = hex("#c9c1b1");
  const stoneTop = hex("#ddd6c7");
  pen.obj(() => {
    pen.extrude(
      [
        [36, 15.2],
        [39.6, 15],
        [40.4, 17.4],
        [38.2, 18.8],
        [35.8, 17.6],
      ],
      0,
      1.2,
      stone,
      { top: stoneTop },
    );
    pen.extrude(
      [
        [37, 15.6],
        [39.2, 15.6],
        [39.4, 17.2],
        [37.4, 17.4],
      ],
      1.2,
      2.5,
      stone,
      { top: stoneTop },
    );
  });
  const fur = hex("#9a6a44");
  const monkey = (x: number, y: number, z: number, flip: boolean) => {
    const cd = pen.card(x, y, z, flip);
    pen.begin();
    cd.bar(-0.2, 0.25, -0.5, 0.75, 0.08, C.woodDark, { swayB: 0.25 });
    cd.ellipse(0, 0.32, 0.26, 0.3, fur, { outline: true, w: W_FINE, layer: 1, seg: 9 });
    cd.circle(0.08, 0.76, 0.2, fur, { outline: true, w: W_FINE, layer: 2, seg: 8 });
    cd.circle(0.13, 0.73, 0.11, hex("#e3c29c"), { layer: 3, seg: 6, grain: 0 });
    pen.end();
  };
  monkey(38.2, 16.4, 2.5, false);
  monkey(36.6, 17.2, 1.2, true);
  monkey(39.7, 17.0, 1.2, false);
  tree(pen, rng, 39.6, 12.6, { kind: "tall" });
  tree(pen, rng, 35.4, 2.9, { kind: "bush" });
  tree(pen, rng, 40.2, 3.4, { kind: "round" });
}

function gate(c: BlockCtx): void {
  const { pen, rng } = c;
  const eagle = (x: number, y: number, flip: boolean) => {
    const cd = pen.card(x, y, 3.75, flip);
    pen.begin();
    cd.poly(
      [
        [-0.75, 0.75],
        [-0.2, 0.42],
        [0, 0.6],
        [0.2, 0.42],
        [0.75, 0.75],
        [0.28, 0.12],
        [0, 0],
        [-0.28, 0.12],
      ],
      C.gold,
      { outline: true, w: W_FINE, grain: 0.4 },
    );
    cd.circle(0.02, 0.66, 0.15, C.gold, { outline: true, w: W_FINE, layer: 1, seg: 7 });
    pen.end();
  };
  for (const x of [27.5, 31.6]) {
    pen.obj(() => {
      pen.box(x, 40.6, 0, 0.95, 0.95, 3.4, C.brick, { top: C.quayCap });
      pen.pyramid(x - 0.1, 40.5, 3.4, 1.15, 1.15, 0.35, C.quayCap, { w: W_THIN });
      eagle(x + 0.48, 41.08, x > 29);
    });
  }
  pen.obj(() => {
    const sg = pen.plane([28.45, 41.1, 2.75], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 3.15, 0.85, C.white, { outline: true, w: W_FINE });
    sg.text("ARTIS", 1.58, 0.17, 0.5, { align: "c", layer: 1 });
  });
  // ticket booth and its queue
  pen.obj(() => {
    pen.box(24.6, 39.2, 0, 1.9, 1.7, 2.3, hex("#e7dcc0"));
    pen.hip(24.4, 39.0, 2.3, 2.3, 2.1, 0.8, C.green);
    const f = pen.wall("x+", 24.6, 39.2, 0, 1.9, 1.7);
    f.rect(0.3, 1.0, 1.4, 1.9, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
  });
  for (let i = 0; i < 5; i++) person(pen, 27.15, 40.2 - i * 0.95, 0, randomLook(rng), i === 3 ? "wave" : "stand", i % 2 === 0, i === 2 ? 0.72 : 1);
}

function southLawn(c: BlockCtx): void {
  const { pen, rng } = c;
  // ice cream, under a striped awning
  pen.push(18.4, 36.4, 0, 0);
  stall(pen, rng, { w: 3.2, sign: "IJS", a: C.pink, goods: [C.pink, C.yellow, C.white, hex("#8b5a3c")] });
  pen.pop();
  person(pen, 19.4, 39.4, 0, randomLook(rng), "stand");
  person(pen, 20.3, 39.6, 0, randomLook(rng), "wave", false, 0.72);
  // the balloon seller
  person(pen, 24.2, 36.6, 0, lookOf(SKIN[1], HAIR[5], C.red, hex("#2f3b55"), false, C.yellow), "wave");
  balloons(pen, rng, 24.82, 36.6, 1.9, 9);
  person(pen, 25.6, 37.4, 0, randomLook(rng), "cheer", false, 0.72);
  // a map of the zoo
  pen.obj(() => {
    pen.pole([33.1, 36.4, 0], [33.1, 36.4, 1.9], 0.1, C.woodDark);
    pen.pole([35.0, 36.4, 0], [35.0, 36.4, 1.9], 0.1, C.woodDark);
    const b = pen.plane([33.1, 36.42, 0.8], [1, 0, 0], [0, 0, 1], 1, true);
    b.rect(0, 0, 1.9, 1.15, C.cream, { outline: true, w: W_FINE });
    b.rect(0.2, 0.2, 0.8, 0.6, C.grass, { layer: 1, grain: 0 });
    b.rect(1.0, 0.5, 1.6, 0.95, C.water, { layer: 1, grain: 0 });
    b.rect(0.9, 0.15, 1.3, 0.4, C.sand, { layer: 1, grain: 0 });
  });
  person(pen, 34.1, 37.5, 0, randomLook(rng), "stand", true);
  bench(pen, 37.6, 36.2, 0);
  person(pen, 37.2, 36.25, 0.42, randomLook(rng), "sit");
  person(pen, 38.1, 36.25, 0.42, randomLook(rng), "sit", true);
  bench(pen, 22.6, 35.75, 0);
  // watchers at every fence
  const watch: [number, number, boolean, number][] = [
    [9.4, 33.65, false, 1],
    [10.3, 33.7, true, 0.72],
    [13.2, 33.65, true, 1],
    [16.4, 33.7, false, 1],
    [17.1, 33.75, false, 0.72],
    [19.85, 26.2, true, 1],
    [19.9, 29.4, false, 1],
    [24.2, 21.75, false, 1],
    [25.0, 21.8, true, 0.72],
    [28.4, 21.75, true, 1],
    [31.6, 21.8, false, 1],
    [34.95, 24.6, true, 1],
    [34.95, 29.2, false, 1],
    [35.0, 30.1, false, 0.72],
    [36.6, 33.7, true, 1],
    [39.6, 33.65, false, 1],
    [17.6, 37.9, true, 1],
    [17.7, 40.0, false, 0.72],
    [34.4, 17.2, false, 1],
    [34.6, 12.4, true, 1],
  ];
  for (const [x, y, flip, s] of watch) person(pen, x, y, 0, randomLook(rng), s < 1 ? rng.pick(["wave", "cheer"]) : rng.pick(["stand", "stand", "wave"]), flip, s);
  // shade
  const shade: [number, number, "round" | "blossom" | "tall" | "bush"][] = [
    [27.2, 36.4, "round"],
    [39.4, 39.2, "round"],
    [36.2, 39.9, "blossom"],
    [40.2, 21.6, "tall"],
    [36.6, 21.2, "bush"],
    [22.4, 40.3, "blossom"],
    [7.7, 35.0, "bush"],
  ];
  for (const [x, y, k] of shade) tree(pen, rng, x, y, { kind: k });
  lamp(pen, 28.2, 35.3);
  lamp(pen, 21.2, 22.2);
}

export const windmill: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.early(() => ground(c));
  c.focus(23, 23);

  // De Gooyer
  pen.push(MX, MY, 0);
  const hub = millTower(pen, rng, { baseR: 3.3, baseH: 5.0, bodyH: 7.6, brick: C.brick, body: THATCH, cap: C.white, facing: "x", gallery: true });
  // the miller, on the gallery
  person(pen, 3.25, 2.5, 5.0, lookOf(SKIN[0], HAIR[7], C.white, hex("#4a454b"), false, hex("#3f6f5c")), "wave");
  pen.pop();
  const sailStyle: SailStyle = { stock: C.white, lattice: hex("#7a4a33"), cloth: hex("#f1e6cf") };
  const hubW: V3 = [c.ox + MX + hub[0], c.oy + MY + hub[1], c.oz + hub[2]];
  c.movers.push(turningSails(hubW, "x", 7.3, sailStyle, pen.reveal(c.ox + MX, c.oy + MY, 0) + 0.9, 0.62, 0.4));

  brewery(c);
  terrace(c);
  fences(c);
  giraffes(c);
  elephants(c);
  flamingos(c);
  penguins(c);
  aviary(c);
  gate(c);
  southLawn(c);

  const born = c.done;

  // two giraffes that never stop browsing
  const herd: { x: number; y: number; rot: number; base: number; amp: number; rate: number; ph: number }[] = [
    { x: 13.9, y: 24.6, rot: 0, base: 0.5, amp: 0.13, rate: 0.9, ph: 0 },
    { x: 12.4, y: 29.0, rot: 90, base: 0.55, amp: 0.4, rate: 0.42, ph: 1.7 },
  ];
  for (const g of herd) {
    const wx = c.ox + g.x;
    const wy = c.oy + g.y;
    const tG = pen.reveal(wx, wy, 0);
    c.movers.push((m) => {
      if (m.t < tG || !m.sees(wx, wy, 3, 8)) return;
      const dp = m.pen;
      const keep = dp.reveal;
      const keepRng = dp.rng;
      dp.reveal = () => tG;
      dp.rng = new Rng(300 + g.rot);
      dp.push(wx, wy, c.oz, g.rot);
      giraffe(dp, g.base + g.amp * Math.sin(m.clock * g.rate + g.ph) + 0.04 * Math.sin(m.clock * 2.3 + g.ph));
      dp.pop();
      dp.reveal = keep;
      dp.rng = keepRng;
    });
  }

  // a waiter doing the rounds of the terrace
  const waiter = castWalker(lookOf(SKIN[1], HAIR[1], C.white, C.black), 41);
  const rounds = new Route(
    rounded(
      [
        [c.ox + 17.15, c.oy + 13.15, 0],
        [c.ox + 31.5, c.oy + 13.15, 0],
        [c.ox + 31.5, c.oy + 14.2, 0],
        [c.ox + 26.9, c.oy + 14.2, 0],
        [c.ox + 26.9, c.oy + 9.4, 0],
        [c.ox + 17.15, c.oy + 9.4, 0],
      ],
      true,
      0.5,
    ),
    true,
  );
  c.movers.push(walkAt(rounds, waiter, 0.1, 1.9, born + 0.2, 0));

  // a school class walking round the elephants behind its teacher, with one straggler
  const loop = new Route(
    rounded(
      [
        [c.ox + 20.55, c.oy + 21.05, 0],
        [c.ox + 34.55, c.oy + 21.05, 0],
        [c.ox + 34.55, c.oy + 34.45, 0],
        [c.ox + 20.55, c.oy + 34.45, 0],
      ],
      true,
      0.9,
    ),
    true,
  );
  const teacher = castWalker(lookOf(SKIN[0], HAIR[2], C.teal, hex("#3c3a3d"), true), 51);
  c.movers.push(walkAt(loop, teacher, 0.5, 1.25, born + 0.3, 0.3));
  for (let i = 0; i < 6; i++) {
    const kid = castWalker(lookOf(rng.pick(SKIN), rng.pick(HAIR), C.yellow, rng.pick([hex("#2f3b55"), hex("#264d6b")]), rng.chance(0.5)), 60 + i, 0.72);
    const gap = i === 5 ? 3.4 : 0;
    c.movers.push(walkAt(loop, kid, 0.5 - (1.2 + i * 1.05 + gap) / loop.length, 1.25, born + 0.4 + i * 0.12, i * 0.37));
  }

  // the penguin parade, up and down in front of the pool
  const pFrames: Sprite[][] = [
    [makeSprite((p) => penguin(p, 0.07, false), 0, 21), makeSprite((p) => penguin(p, -0.07, false), 0, 22)],
    [makeSprite((p) => penguin(p, 0.07, true), 0, 23), makeSprite((p) => penguin(p, -0.07, true), 0, 24)],
  ];
  const pool = new Route(
    rounded(
      [
        [c.ox + 8.2, c.oy + 41.0, 0],
        [c.ox + 15.9, c.oy + 41.0, 0],
        [c.ox + 15.9, c.oy + 41.22, 0],
        [c.ox + 8.2, c.oy + 41.22, 0],
      ],
      true,
      0.1,
    ),
    true,
  );
  for (let i = 0; i < 4; i++) {
    c.movers.push(
      traveler(pool, {
        speed: 0.85,
        at: 0.3 - i * 0.055,
        born: born + 0.5 + i * 0.15,
        span: 0.3,
        sprite: (h, t) => pFrames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 4.2 + i * 0.5) & 1],
      }),
    );
  }

  // two macaws out for a fly round the dome
  const fly: V3[] = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    fly.push([c.ox + 31 + Math.cos(t) * 10.5, c.oy + 15 + Math.sin(t) * 13, 6.8 + Math.sin(t * 2 + 0.6) * 1.6]);
  }
  const sky = new Route(fly, true);
  const macaws: [RGB, RGB, number][] = [
    [C.red, C.blue, 0],
    [C.blue, C.yellow, 0.07],
  ];
  for (const [body, wing, at] of macaws) {
    const fr: Sprite[][] = [
      [makeSprite((p) => parrot(p, body, wing, true, false)), makeSprite((p) => parrot(p, body, wing, false, false))],
      [makeSprite((p) => parrot(p, body, wing, true, true)), makeSprite((p) => parrot(p, body, wing, false, true))],
    ];
    c.movers.push(
      traveler(sky, {
        speed: 6.5,
        at,
        born: born + 0.8,
        span: 2,
        sprite: (h, t) => fr[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 7 + at * 30) & 1],
      }),
    );
  }

  // one balloon always gets away
  const loose = makeSprite((p) => {
    const cd = p.card(0, 0, 0);
    cd.seg(0, -1.0, 0.05, -0.34, { w: 0.035, kind: L_BAR, wobble: 0 });
    cd.ellipse(0, 0, 0.3, 0.36, C.red, { outline: true, w: W_FINE, layer: 1, seg: 10, grain: 0.4 });
  });
  const bx = c.ox + 24.9;
  const by = c.oy + 36.6;
  c.movers.push((m) => {
    if (m.t < born + 1.5) return;
    const p = (m.t - born - 1.5) % 15;
    if (p > 12.5) return;
    const q = Math.min(p, 12.5 - p);
    m.put(loose, bx + p * 0.42 + Math.sin(p * 1.3) * 0.3, by - p * 0.3, 4.6 + p * 1.25, m.t - Math.min(q, 2));
  });
};
