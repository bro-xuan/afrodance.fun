// The pen: everything in the city is drawn through this file.
//
// It turns "a box here, a gabled wall there, a person on that corner" into the
// two kinds of geometry the renderer knows (flat fills and ink strokes), and it
// is what makes the result look drawn rather than modelled: strokes wobble and
// overshoot their corners a little, line weight breathes, and every object
// remembers the order its strokes were made in so it can sketch itself in.
//
// Coordinates are world units (see math.ts). A pen carries a transform stack
// (translate, rotate about the vertical, scale), so a prop is written once in
// its own local space and placed anywhere, facing any way: faces that end up
// turned away from the camera are simply not drawn.

import { C30, RGB, V2, V3, Rng, clamp, noise1 } from "./math";
import { FC, FV, LC, LV, Mesh } from "./mesh";

export const INK: RGB = [44, 40, 38];
/** Depth step between coplanar decal layers (a window sits one layer above its wall). */
export const LAYER = 0.035;
const LINE_LIFT = 0.018;
const K = 1 / (2 * C30);

// Fill kinds (the last byte of a fill vertex).
export const F_PLAIN = 0;
export const F_WATER = 1;
export const F_NEON = 2; // glows in its own colour after dark: screens, signs, signals
// Line kinds.
export const L_INK = 0; // outline: pencil grey while sketching, ink once coloured
export const L_MARK = 1; // texture mark or coloured stroke: its own colour from the start
export const L_RIPPLE = 2; // water tick: drifts gently
export const L_LIGHT = 3; // only visible at night, glows
export const L_BAR = 4; // a free-standing bar (post, limb, mast): keeps its true depth
export const L_SPARK = 5; // night only, in its own colour: fireworks

export interface FillOpts {
  /** Decal layer above the surface it sits on. */
  layer?: number;
  /** Extra depth nudge towards the camera, world units. */
  bias?: number;
  /** Paper-grain strength, 0 to 1. */
  grain?: number;
  /** How much this lights up at night, 0 to 1. */
  glow?: number;
  /** How much the wind moves it, 0 to 1. */
  sway?: number;
  kind?: number;
  /** Also ink the outline. */
  outline?: boolean;
  ink?: RGB;
  w?: number;
  /** Set false to keep the exact colour whatever way the surface faces. */
  shade?: boolean;
  wobble?: number;
}

export interface LineOpts {
  w?: number;
  color?: RGB;
  alpha?: number;
  layer?: number;
  bias?: number;
  /** Hand wobble multiplier; 0 for a ruled line. */
  wobble?: number;
  /** Corner overshoot multiplier. */
  over?: number;
  closed?: boolean;
  kind?: number;
  sway?: number;
  swayB?: number;
}

export interface SolidOpts extends FillOpts {
  /** Edges between faces that meet at less than this angle (degrees) are not inked. */
  crease?: number;
  /** Convex solids get their faces oriented automatically. Default true. */
  convex?: boolean;
  /** Ink the edges. Default true. */
  edges?: boolean;
  over?: number;
}

function shadeF(nx: number, ny: number, nz: number): number {
  const l = clamp(0.5 * nx + 0.05 * ny + 0.75 * nz + 0.25, 0, 1);
  return 0.8 + 0.2 * l;
}

function applyShade(c: RGB, f: number): RGB {
  const cool = f < 0.92 ? 1 + (0.92 - f) * 0.4 : 1;
  return [c[0] * f, c[1] * f, Math.min(255, c[2] * f * cool)];
}

const b255 = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : v | 0);

// ---------------------------------------------------------------- triangulation

const TX: number[] = [];
const TY: number[] = [];

function inTri(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < -1e-9 || d2 < -1e-9 || d3 < -1e-9;
  const pos = d1 > 1e-9 || d2 > 1e-9 || d3 > 1e-9;
  return !(neg && pos) && (neg || pos);
}

function earclip(n: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(i);
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += TX[i] * TY[j] - TX[j] * TY[i];
  }
  const ccw = area > 0;
  const out: number[] = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 4000) {
    let clipped = false;
    const m = idx.length;
    for (let k = 0; k < m; k++) {
      const a = idx[(k + m - 1) % m];
      const b = idx[k];
      const c = idx[(k + 1) % m];
      const cr = (TX[b] - TX[a]) * (TY[c] - TY[b]) - (TY[b] - TY[a]) * (TX[c] - TX[b]);
      if (ccw ? cr <= 1e-10 : cr >= -1e-10) continue;
      let blocked = false;
      for (let q = 0; q < m; q++) {
        const p = idx[q];
        if (p === a || p === b || p === c) continue;
        if (inTri(TX[p], TY[p], TX[a], TY[a], TX[b], TY[b], TX[c], TY[c])) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      out.push(a, b, c);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) {
      out.push(idx[0], idx[1], idx[2]);
      idx.splice(1, 1);
    }
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}

/** Triangle indices for a planar polygon given in world space (triangulated as seen on paper). */
function triangulate(pts: V3[]): number[] {
  const n = pts.length;
  if (n === 3) return [0, 1, 2];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    TX[i] = (p[0] - p[1]) * C30;
    TY[i] = (p[0] + p[1]) * 0.5 - p[2];
  }
  let sign = 0;
  let convex = true;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = (i + 2) % n;
    const cr = (TX[j] - TX[i]) * (TY[k] - TY[j]) - (TY[j] - TY[i]) * (TX[k] - TX[j]);
    if (Math.abs(cr) < 1e-9) continue;
    const s = cr > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) {
      convex = false;
      break;
    }
  }
  if (convex) {
    const out: number[] = [];
    for (let i = 1; i < n - 1; i++) out.push(0, i, i + 1);
    return out;
  }
  return earclip(n);
}

// ---------------------------------------------------------------- stroke font

// Single-stroke capitals and figures on a 4 x 6 grid, for shop signs.
const GLYPHS: Record<string, number[][]> = {
  A: [[0, 0, 2, 6, 4, 0], [0.8, 2.3, 3.2, 2.3]],
  B: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [3, 3, 4, 2, 4, 1, 3, 0, 0, 0]],
  C: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0, 3, 0, 4, 1]],
  D: [[0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0]],
  E: [[4, 6, 0, 6, 0, 0, 4, 0], [0, 3, 3, 3]],
  F: [[4, 6, 0, 6, 0, 0], [0, 3, 3, 3]],
  G: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0, 3, 0, 4, 1, 4, 3, 2.2, 3]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[2, 0, 2, 6], [1, 0, 3, 0], [1, 6, 3, 6]],
  J: [[3, 6, 3, 1, 2, 0, 1, 0, 0, 1]],
  K: [[0, 0, 0, 6], [4, 6, 0, 2.5], [1.5, 3.6, 4, 0]],
  L: [[0, 6, 0, 0, 4, 0]],
  M: [[0, 0, 0, 6, 2, 2.5, 4, 6, 4, 0]],
  N: [[0, 0, 0, 6, 4, 0, 4, 6]],
  O: [[1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 1, 3, 0, 1, 0]],
  P: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3]],
  Q: [[1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 1, 3, 0, 1, 0], [2.5, 1.5, 4, 0]],
  R: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [2, 3, 4, 0]],
  S: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3, 4, 2, 4, 1, 3, 0, 1, 0, 0, 1]],
  T: [[0, 6, 4, 6], [2, 6, 2, 0]],
  U: [[0, 6, 0, 1, 1, 0, 3, 0, 4, 1, 4, 6]],
  V: [[0, 6, 2, 0, 4, 6]],
  W: [[0, 6, 1, 0, 2, 3.5, 3, 0, 4, 6]],
  X: [[0, 0, 4, 6], [0, 6, 4, 0]],
  Y: [[0, 6, 2, 3, 4, 6], [2, 3, 2, 0]],
  Z: [[0, 6, 4, 6, 0, 0, 4, 0]],
  "-": [[1, 3, 3, 3]],
  "'": [[2, 6, 2, 4.6]],
  "0": [[1.2, 0, 0.4, 1, 0.4, 5, 1.2, 6, 2.8, 6, 3.6, 5, 3.6, 1, 2.8, 0, 1.2, 0]],
  "1": [[1, 4.8, 2.2, 6, 2.2, 0], [1, 0, 3.4, 0]],
  "2": [[0.3, 4.8, 1.2, 6, 2.9, 6, 3.8, 5, 3.8, 3.9, 0.2, 0, 3.9, 0]],
  "3": [[0.3, 5.2, 1.2, 6, 2.9, 6, 3.8, 5, 3.8, 4, 2.8, 3.1, 1.6, 3.1], [2.8, 3.1, 3.9, 2.1, 3.9, 1, 2.9, 0, 1.2, 0, 0.2, 0.9]],
  "4": [[3, 0, 3, 6, 0.1, 1.9, 4, 1.9]],
  "5": [[3.7, 6, 0.6, 6, 0.4, 3.4, 2.6, 3.6, 3.8, 2.7, 3.8, 1, 2.8, 0, 1.1, 0, 0.2, 0.8]],
  "6": [[3.6, 5.3, 2.8, 6, 1.3, 6, 0.3, 4.8, 0.3, 1.1, 1.2, 0, 2.8, 0, 3.7, 1, 3.7, 2.4, 2.8, 3.3, 1.3, 3.3, 0.3, 2.3]],
  "7": [[0.2, 6, 3.9, 6, 1.5, 0]],
  "8": [[1.3, 3.2, 0.5, 4, 0.5, 5.1, 1.3, 6, 2.7, 6, 3.5, 5.1, 3.5, 4, 2.7, 3.2, 1.3, 3.2, 0.3, 2.2, 0.3, 1, 1.2, 0, 2.8, 0, 3.7, 1, 3.7, 2.2, 2.7, 3.2]],
  "9": [[3.7, 3.7, 2.7, 2.7, 1.2, 2.7, 0.3, 3.6, 0.3, 5, 1.2, 6, 2.8, 6, 3.7, 5, 3.7, 1.2, 2.7, 0, 1.2, 0, 0.4, 0.7]],
  "&": [[4, 0, 0.8, 4.6, 0.8, 5.3, 1.5, 6, 2.3, 6, 2.9, 5.3, 2.9, 4.6, 0.3, 2.1, 0.3, 1, 1.2, 0, 2.2, 0, 4, 2.4]],
  ".": [[1.8, 0, 2.2, 0, 2.2, 0.4, 1.8, 0.4, 1.8, 0]],
  "!": [[2, 6, 2, 1.8], [2, 0.5, 2, 0]],
  ":": [[2, 4.2, 2, 3.8], [2, 1.6, 2, 1.2]],
  "+": [[0.6, 3, 3.4, 3], [2, 1.4, 2, 4.6]],
  "/": [[0.5, 0, 3.5, 6]],
};

// ---------------------------------------------------------------- planes

/**
 * A flat drawing surface somewhere in the world: a wall, the ground, or a
 * camera-facing "card" (people, tree crowns, bicycles seen side on). You draw
 * on it in 2D (a to the side, b up) and it lands in 3D. A plane that faces
 * away from the camera swallows everything drawn on it.
 */
export class Plane {
  /** Extra decal layers added to everything drawn here. */
  layer: number;
  constructor(
    readonly pen: Pen,
    readonly o: V3,
    readonly u: V3,
    readonly v: V3,
    readonly n: V3,
    readonly visible: boolean,
    layer: number,
    readonly bias: number,
    readonly sf: number,
  ) {
    this.layer = layer;
  }

  /** World position of a point on the plane, optionally lifted off it. */
  at(a: number, b: number, lift = 0): V3 {
    const { o, u, v, n } = this;
    return [
      o[0] + a * u[0] + b * v[0] + lift * n[0],
      o[1] + a * u[1] + b * v[1] + lift * n[1],
      o[2] + a * u[2] + b * v[2] + lift * n[2],
    ];
  }

  private world(pts: V2[]): V3[] {
    const out: V3[] = [];
    for (const p of pts) out.push(this.at(p[0], p[1]));
    return out;
  }

  poly(pts: V2[], rgb: RGB, o?: FillOpts): void {
    if (!this.visible) return;
    const pen = this.pen;
    pen.begin();
    pen.fillW(this.world(pts), o?.shade === false ? rgb : applyShade(rgb, this.sf), o, this.layer, this.bias);
    pen.end();
  }

  rect(a0: number, b0: number, a1: number, b1: number, rgb: RGB, o?: FillOpts): void {
    this.poly(
      [
        [a0, b0],
        [a1, b0],
        [a1, b1],
        [a0, b1],
      ],
      rgb,
      o,
    );
  }

  line(pts: V2[], o?: LineOpts): void {
    if (!this.visible) return;
    const pen = this.pen;
    pen.begin();
    pen.strokeW(this.world(pts), o, this.layer, this.bias);
    pen.end();
  }

  /** A round bar drawn in the plane, with an ink edge: arms, legs, frames, stems. */
  bar(a0: number, b0: number, a1: number, b1: number, w: number, rgb: RGB, o?: { layer?: number; ink?: RGB | false; sway?: number; swayB?: number }): void {
    if (!this.visible) return;
    const pen = this.pen;
    const A = this.at(a0, b0);
    const B = this.at(a1, b1);
    pen.begin();
    if (o?.ink !== false) {
      pen.strokeW([A, B], { w: w + 0.09, color: o?.ink ?? pen.ink, wobble: 0, kind: L_BAR, layer: o?.layer, sway: o?.sway, swayB: o?.swayB }, this.layer, this.bias);
    }
    pen.strokeW([A, B], { w, color: rgb, wobble: 0, kind: L_BAR, layer: o?.layer, bias: 0.012, sway: o?.sway, swayB: o?.swayB }, this.layer, this.bias);
    pen.end();
  }

  /** One straight stroke. */
  seg(a0: number, b0: number, a1: number, b1: number, o?: LineOpts): void {
    this.line(
      [
        [a0, b0],
        [a1, b1],
      ],
      o,
    );
  }

  loop(pts: V2[], o?: LineOpts): void {
    this.line(pts, { ...o, closed: true });
  }

  private ring(ca: number, cb: number, ra: number, rb: number, a0: number, a1: number, seg?: number): V2[] {
    const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
    const frac = Math.abs(a1 - a0) / (Math.PI * 2);
    const n = seg ?? Math.max(5, Math.round(clamp(8 + Math.max(ra, rb) * 5, 8, 30) * frac));
    const pts: V2[] = [];
    const m = full ? n : n + 1;
    for (let i = 0; i < m; i++) {
      const t = a0 + ((a1 - a0) * i) / n;
      pts.push([ca + Math.cos(t) * ra, cb + Math.sin(t) * rb]);
    }
    return pts;
  }

  /** Filled ellipse (pass null for outline only). Angles in radians, anticlockwise from +a. */
  ellipse(
    ca: number,
    cb: number,
    ra: number,
    rb: number,
    rgb: RGB | null,
    o?: FillOpts & { seg?: number; a0?: number; a1?: number },
  ): void {
    if (!this.visible) return;
    const a0 = o?.a0 ?? 0;
    const a1 = o?.a1 ?? Math.PI * 2;
    const pts = this.ring(ca, cb, ra, rb, a0, a1, o?.seg);
    if (rgb) this.poly(pts, rgb, o);
    else this.line(pts, { closed: true, color: o?.ink, w: o?.w, layer: o?.layer, wobble: o?.wobble });
  }

  circle(ca: number, cb: number, r: number, rgb: RGB | null, o?: FillOpts & { seg?: number }): void {
    this.ellipse(ca, cb, r, r, rgb, o);
  }

  arc(
    ca: number,
    cb: number,
    ra: number,
    rb: number,
    a0: number,
    a1: number,
    o?: LineOpts & { seg?: number },
  ): void {
    if (!this.visible) return;
    this.line(this.ring(ca, cb, ra, rb, a0, a1, o?.seg), o);
  }

  /** A slab pushed out of the plane: the outline in 2D, how far it sticks out. */
  extrude(pts: V2[], depth: number, rgb: RGB, o?: SolidOpts & { front?: RGB }): void {
    if (!this.visible && depth <= 0) return;
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    // Faces are wound by hand here, so the outline has to run anticlockwise
    // around the plane's normal (cards carry a normal that opposes u x v).
    const { u, v, n: nn } = this;
    const handed =
      (u[1] * v[2] - u[2] * v[1]) * nn[0] + (u[2] * v[0] - u[0] * v[2]) * nn[1] + (u[0] * v[1] - u[1] * v[0]) * nn[2];
    const P = area < 0 !== handed < 0 ? pts.slice().reverse() : pts;
    const verts: V3[] = [];
    for (const p of P) verts.push(this.at(p[0], p[1], 0));
    for (const p of P) verts.push(this.at(p[0], p[1], depth));
    const faces: number[][] = [];
    const cols: (RGB | null)[] = [];
    const front: number[] = [];
    const back: number[] = [];
    for (let i = 0; i < n; i++) {
      front.push(n + i);
      back.push(n - 1 - i);
    }
    faces.push(front);
    cols.push(o?.front ?? rgb);
    faces.push(back);
    cols.push(rgb);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, n + j, n + i]);
      cols.push(rgb);
    }
    // a solid keeps its true depth: only flat decals ride above their surface
    this.pen.solidW(verts, faces, cols, { ...o, convex: false }, 0, this.bias);
  }

  /** A rectangular block standing off the plane. */
  block(a0: number, b0: number, a1: number, b1: number, depth: number, rgb: RGB, o?: SolidOpts & { front?: RGB }): void {
    this.extrude(
      [
        [a0, b0],
        [a1, b0],
        [a1, b1],
        [a0, b1],
      ],
      depth,
      rgb,
      o,
    );
  }

  /**
   * Scatter short texture strokes inside a rectangle of the plane (grass,
   * ripples, brick). `inside` rejects positions; `bend` bows each stroke.
   */
  ticks(
    a0: number,
    b0: number,
    a1: number,
    b1: number,
    o: {
      n: number;
      len?: number;
      ang?: number;
      jit?: number;
      color?: RGB;
      w?: number;
      kind?: number;
      alpha?: number;
      bend?: number;
      layer?: number;
      inside?: (a: number, b: number) => boolean;
    },
  ): void {
    if (!this.visible) return;
    const pen = this.pen;
    const rng = pen.rng;
    const len = o.len ?? 0.5;
    const ang = o.ang ?? 0;
    const jit = o.jit ?? 0.3;
    pen.begin();
    for (let i = 0; i < o.n; i++) {
      const a = rng.range(a0, a1);
      const b = rng.range(b0, b1);
      if (o.inside && !o.inside(a, b)) continue;
      const t = ang + rng.range(-jit, jit);
      const h = len * rng.range(0.3, 0.6);
      const ca = Math.cos(t) * h;
      const sa = Math.sin(t) * h;
      const pts: V3[] = o.bend
        ? [this.at(a - ca, b - sa), this.at(a + sa * o.bend, b - ca * o.bend), this.at(a + ca, b + sa)]
        : [this.at(a - ca, b - sa), this.at(a + ca, b + sa)];
      pen.strokeW(
        pts,
        {
          w: o.w ?? 0.06,
          color: o.color,
          kind: o.kind ?? L_MARK,
          alpha: o.alpha,
          wobble: 0,
          layer: o.layer,
        },
        this.layer,
        this.bias,
      );
    }
    pen.end();
  }

  /** Hand-lettered capitals. `size` is the cap height; align is l, c or r. */
  text(str: string, a: number, b: number, size: number, o?: LineOpts & { align?: "l" | "c" | "r" }): void {
    if (!this.visible) return;
    const k = size / 6;
    const adv = 5.5 * k;
    const total = str.length * adv - 1.5 * k;
    let x = a;
    if (o?.align === "c") x -= total / 2;
    else if (o?.align === "r") x -= total;
    const pen = this.pen;
    pen.begin();
    for (const ch of str.toUpperCase()) {
      const g = GLYPHS[ch];
      if (g) {
        for (const st of g) {
          const pts: V3[] = [];
          for (let i = 0; i < st.length; i += 2) pts.push(this.at(x + st[i] * k, b + st[i + 1] * k));
          pen.strokeW(pts, { w: 0.07, wobble: 0.4, ...o }, this.layer, this.bias);
        }
      }
      x += adv;
    }
    pen.end();
  }
}

// ---------------------------------------------------------------- the pen

interface EdgeRec {
  a: number;
  b: number;
  nx: number;
  ny: number;
  nz: number;
  cnt: number;
  crease: boolean;
  used: boolean;
}

export class Pen {
  readonly m: Mesh;
  rng: Rng;
  ink: RGB = INK;
  lineW = 0.13;
  /** Global hand-wobble multiplier. */
  wobble = 1;
  /**
   * When each finished object starts to draw itself, from where it stands.
   * Blocks swap this in so their contents sweep in from the back corner.
   */
  reveal: (x: number, y: number, z: number) => number = () => -1000;

  private tx = 0;
  private ty = 0;
  private tz = 0;
  private c = 1;
  private s = 0;
  private sc = 1;
  private stack: number[] = [];

  private depth = 0;
  private f0 = 0;
  private l0 = 0;
  private strokeN = 0;
  private phase = 0;

  constructor(mesh: Mesh, seed = 1) {
    this.m = mesh;
    this.rng = new Rng(seed);
  }

  // ------------------------------------------------------------ transform

  /** Enter a local frame: move, turn (degrees, anticlockwise seen from above in world axes), scale. */
  push(x = 0, y = 0, z = 0, rotDeg = 0, scale = 1): this {
    this.stack.push(this.tx, this.ty, this.tz, this.c, this.s, this.sc);
    const p = this.w(x, y, z);
    const q = ((rotDeg % 360) + 360) % 360;
    let cc: number;
    let ss: number;
    if (q === 0) {
      cc = 1;
      ss = 0;
    } else if (q === 90) {
      cc = 0;
      ss = 1;
    } else if (q === 180) {
      cc = -1;
      ss = 0;
    } else if (q === 270) {
      cc = 0;
      ss = -1;
    } else {
      const r = (q * Math.PI) / 180;
      cc = Math.cos(r);
      ss = Math.sin(r);
    }
    const nc = this.c * cc - this.s * ss;
    const ns = this.s * cc + this.c * ss;
    this.tx = p[0];
    this.ty = p[1];
    this.tz = p[2];
    this.c = nc;
    this.s = ns;
    this.sc *= scale;
    return this;
  }

  pop(): this {
    const st = this.stack;
    this.sc = st.pop() as number;
    this.s = st.pop() as number;
    this.c = st.pop() as number;
    this.tz = st.pop() as number;
    this.ty = st.pop() as number;
    this.tx = st.pop() as number;
    return this;
  }

  /** Local point to world. */
  w(x: number, y: number, z: number): V3 {
    const k = this.sc;
    return [this.tx + k * (x * this.c - y * this.s), this.ty + k * (x * this.s + y * this.c), this.tz + k * z];
  }

  private wd(x: number, y: number, z: number): V3 {
    const k = this.sc;
    return [k * (x * this.c - y * this.s), k * (x * this.s + y * this.c), k * z];
  }

  // ------------------------------------------------------------ objects

  /**
   * Everything drawn between begin() and the matching end() is one object: it
   * sketches in as a unit, stroke by stroke, then takes its colour. Scopes
   * nest; only the outermost counts.
   */
  begin(): void {
    if (this.depth++ === 0) {
      this.f0 = this.m.fn;
      this.l0 = this.m.ln;
      this.strokeN = 0;
      this.phase = (this.rng.next() * 256) | 0;
    }
  }

  end(delay = 0): void {
    if (--this.depth > 0) return;
    const m = this.m;
    const f0 = this.f0;
    const l0 = this.l0;
    if (m.fn === f0 && m.ln === l0) return;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let z0 = Infinity;
    let k0 = Infinity;
    let k1 = -Infinity;
    const fv = m.fv;
    for (let i = f0 * FV, e = m.fn * FV; i < e; i += FV) {
      const x = fv[i];
      const y = fv[i + 1];
      const z = fv[i + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      const k = (x - y) * C30 * 0.35 - ((x + y) * 0.5 - z);
      if (k < k0) k0 = k;
      if (k > k1) k1 = k;
    }
    const lv = m.lv;
    for (let i = l0 * LV, e = m.ln * LV; i < e; i += LV) {
      for (let j = 0; j < 6; j += 3) {
        const x = lv[i + j];
        const y = lv[i + j + 1];
        const z = lv[i + j + 2];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (z < z0) z0 = z;
      }
    }
    const t0 = this.reveal((x0 + x1) * 0.5, (y0 + y1) * 0.5, z0) + delay;
    const kr = k1 - k0 > 1e-6 ? 1 / (k1 - k0) : 0;
    for (let i = f0 * FV, e = m.fn * FV; i < e; i += FV) {
      const x = fv[i];
      const y = fv[i + 1];
      const z = fv[i + 2];
      const k = (x - y) * C30 * 0.35 - ((x + y) * 0.5 - z);
      fv[i + 3] = t0;
      fv[i + 4] = (k - k0) * kr;
    }
    const sn = this.strokeN > 0 ? 1 / this.strokeN : 1;
    for (let i = l0 * LV, e = m.ln * LV; i < e; i += LV) {
      lv[i + 6] = t0;
      lv[i + 7] *= sn;
      lv[i + 8] *= sn;
    }
  }

  /** Run a drawing function as one object. */
  obj(fn: () => void, delay = 0): void {
    this.begin();
    fn();
    this.end(delay);
  }

  // ------------------------------------------------------------ raw emitters (world space)

  fillW(pts: V3[], rgb: RGB, o?: FillOpts, baseLayer = 0, baseBias = 0): void {
    const n = pts.length;
    if (n < 3) return;
    const tris = triangulate(pts);
    const m = this.m;
    m.needFill(tris.length);
    const bias = ((o?.layer ?? 0) + baseLayer) * LAYER + (o?.bias ?? 0) + baseBias;
    const r = b255(rgb[0]);
    const g = b255(rgb[1]);
    const b = b255(rgb[2]);
    const grain = b255((o?.grain ?? 1) * 255);
    const sway = b255((o?.sway ?? 0) * 255);
    const glow = b255((o?.glow ?? 0) * 255);
    const kind = o?.kind ?? F_PLAIN;
    const phase = this.phase;
    const fv = m.fv;
    const fc = m.fc;
    let fo = m.fn * FV;
    let co = m.fn * FC;
    for (let t = 0; t < tris.length; t++) {
      const p = pts[tris[t]];
      fv[fo] = p[0];
      fv[fo + 1] = p[1];
      fv[fo + 2] = p[2];
      fv[fo + 3] = 0;
      fv[fo + 4] = 0;
      fv[fo + 5] = bias;
      fo += FV;
      fc[co] = r;
      fc[co + 1] = g;
      fc[co + 2] = b;
      fc[co + 3] = grain;
      fc[co + 4] = sway;
      fc[co + 5] = glow;
      fc[co + 6] = phase;
      fc[co + 7] = kind;
      co += FC;
    }
    m.fn += tris.length;
    if (o?.outline) {
      this.strokeW(pts, { closed: true, color: o.ink, w: o.w, layer: o.layer, bias: o.bias, wobble: o.wobble, sway: o.sway }, baseLayer, baseBias);
    }
  }

  strokeW(pts: V3[], o?: LineOpts, baseLayer = 0, baseBias = 0): void {
    if (pts.length < 2) return;
    const closed = !!o?.closed;
    const P: V3[] = closed ? [...pts, pts[0]] : pts;
    const n = P.length;
    const segLen: number[] = [];
    let L = 0;
    for (let i = 0; i < n - 1; i++) {
      const a = P[i];
      const b = P[i + 1];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      segLen.push(l);
      L += l;
    }
    if (L < 1e-6) return;
    const rng = this.rng;
    const kind = o?.kind ?? L_INK;
    const w = o?.w ?? this.lineW;
    const col = o?.color ?? this.ink;
    const alpha = b255((o?.alpha ?? 1) * 255);
    const bias = ((o?.layer ?? 0) + baseLayer) * LAYER + LINE_LIFT + (o?.bias ?? 0) + baseBias;
    const wob = (o?.wobble ?? 1) * this.wobble;
    let amp = 0.03 * wob;
    if (L < 0.7) amp *= L / 0.7;
    const sA = rng.next() * 900;
    const sB = rng.next() * 900;
    const sC = rng.next() * 900;
    const over = closed ? 0 : (o?.over ?? 0);

    // resample with wobble
    const qx: number[] = [];
    const qy: number[] = [];
    const qz: number[] = [];
    const qs: number[] = [];
    let acc = 0;
    for (let i = 0; i < n - 1; i++) {
      const a = P[i];
      const b = P[i + 1];
      const l = segLen[i];
      const k = l > 1.4 ? Math.min(48, Math.ceil(l / 0.95)) : 1;
      for (let j = i === 0 ? 0 : 1; j <= k; j++) {
        const t = j / k;
        const s = acc + l * t;
        let x = a[0] + (b[0] - a[0]) * t;
        let y = a[1] + (b[1] - a[1]) * t;
        const z = a[2] + (b[2] - a[2]) * t;
        if (amp > 0) {
          const f = j === 0 || j === k ? 0.45 : 1;
          const dx = amp * f * noise1(s * 0.5 + sA, 1);
          const dy = amp * f * noise1(s * 0.5 + sB, 2);
          x += dx * K + dy;
          y += dy - dx * K;
        }
        qx.push(x);
        qy.push(y);
        qz.push(z);
        qs.push(s);
      }
      acc += l;
    }
    const m2 = qx.length;
    if (closed) {
      qx[m2 - 1] = qx[0];
      qy[m2 - 1] = qy[0];
      qz[m2 - 1] = qz[0];
    } else if (over > 0 && L > 0.9) {
      const e0 = over * rng.range(0.02, 0.1);
      const e1 = over * rng.range(0.02, 0.1);
      let dx = qx[0] - qx[1];
      let dy = qy[0] - qy[1];
      let dz = qz[0] - qz[1];
      let d = Math.hypot(dx, dy, dz) || 1;
      qx[0] += (dx / d) * e0;
      qy[0] += (dy / d) * e0;
      qz[0] += (dz / d) * e0;
      dx = qx[m2 - 1] - qx[m2 - 2];
      dy = qy[m2 - 1] - qy[m2 - 2];
      dz = qz[m2 - 1] - qz[m2 - 2];
      d = Math.hypot(dx, dy, dz) || 1;
      qx[m2 - 1] += (dx / d) * e1;
      qy[m2 - 1] += (dy / d) * e1;
      qz[m2 - 1] += (dz / d) * e1;
    }

    const m = this.m;
    m.needLine(m2 - 1);
    const lv = m.lv;
    const lc = m.lc;
    let lo = m.ln * LV;
    let co = m.ln * LC;
    const r = b255(col[0]);
    const g = b255(col[1]);
    const b = b255(col[2]);
    const sw0 = o?.sway ?? 0;
    const sw1 = o?.swayB ?? sw0;
    const phase = this.phase;
    const si = this.strokeN++;
    const breathe = kind === L_INK ? 0.16 : 0;
    let wPrev = w * (1 + breathe * noise1(qs[0] * 0.9 + sC, 3));
    for (let i = 0; i < m2 - 1; i++) {
      const u0 = qs[i] / L;
      const u1 = qs[i + 1] / L;
      const wNext = w * (1 + breathe * noise1(qs[i + 1] * 0.9 + sC, 3));
      lv[lo] = qx[i];
      lv[lo + 1] = qy[i];
      lv[lo + 2] = qz[i];
      lv[lo + 3] = qx[i + 1];
      lv[lo + 4] = qy[i + 1];
      lv[lo + 5] = qz[i + 1];
      lv[lo + 6] = 0;
      lv[lo + 7] = si + u0;
      lv[lo + 8] = si + u1;
      lv[lo + 9] = bias;
      lv[lo + 10] = wPrev;
      lv[lo + 11] = wNext;
      lo += LV;
      lc[co] = r;
      lc[co + 1] = g;
      lc[co + 2] = b;
      lc[co + 3] = alpha;
      lc[co + 4] = b255((sw0 + (sw1 - sw0) * u0) * 255);
      lc[co + 5] = b255((sw0 + (sw1 - sw0) * u1) * 255);
      lc[co + 6] = phase;
      lc[co + 7] = kind;
      co += LC;
      wPrev = wNext;
    }
    m.ln += m2 - 1;
  }

  /** A closed solid given as world-space vertices and faces (lists of vertex indices). */
  solidW(
    W: V3[],
    faces: number[][],
    color: RGB | (RGB | null)[],
    o: SolidOpts = {},
    baseLayer = 0,
    baseBias = 0,
  ): void {
    this.begin();
    const convex = o.convex !== false;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    if (convex) {
      for (const p of W) {
        cx += p[0];
        cy += p[1];
        cz += p[2];
      }
      cx /= W.length;
      cy /= W.length;
      cz /= W.length;
    }
    const perFace = Array.isArray(color[0]) || color[0] === null;
    const creaseCos = Math.cos(((o.crease ?? 0.5) * Math.PI) / 180);
    const edges = new Map<number, EdgeRec>();
    const wantEdges = o.edges !== false;
    for (let fi = 0; fi < faces.length; fi++) {
      const f = faces[fi];
      const fn = f.length;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let k = 0; k < fn; k++) {
        const p = W[f[k]];
        const q = W[f[(k + 1) % fn]];
        nx += (p[1] - q[1]) * (p[2] + q[2]);
        ny += (p[2] - q[2]) * (p[0] + q[0]);
        nz += (p[0] - q[0]) * (p[1] + q[1]);
      }
      const len = Math.hypot(nx, ny, nz);
      if (len < 1e-9) continue;
      nx /= len;
      ny /= len;
      nz /= len;
      if (convex) {
        const p = W[f[0]];
        if ((p[0] - cx) * nx + (p[1] - cy) * ny + (p[2] - cz) * nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
      }
      if (nx + ny + nz <= 1e-6) continue;
      const col = perFace ? (color as (RGB | null)[])[fi] : (color as RGB);
      if (col) {
        const pts: V3[] = [];
        for (let k = 0; k < fn; k++) pts.push(W[f[k]]);
        this.fillW(pts, o.shade === false ? col : applyShade(col, shadeF(nx, ny, nz)), { ...o, outline: false }, baseLayer, baseBias);
      }
      if (!wantEdges) continue;
      for (let k = 0; k < fn; k++) {
        const a = f[k];
        const b = f[(k + 1) % fn];
        if (a === b) continue;
        const key = a < b ? a * 65536 + b : b * 65536 + a;
        const rec = edges.get(key);
        if (!rec) edges.set(key, { a, b, nx, ny, nz, cnt: 1, crease: true, used: false });
        else {
          rec.cnt++;
          rec.crease = rec.nx * nx + rec.ny * ny + rec.nz * nz < creaseCos;
        }
      }
    }
    if (wantEdges && edges.size > 0) {
      const E: EdgeRec[] = [];
      const adj = new Map<number, number[]>();
      for (const rec of edges.values()) {
        if (rec.cnt > 1 && !rec.crease) continue;
        const i = E.length;
        E.push(rec);
        let la = adj.get(rec.a);
        if (!la) adj.set(rec.a, (la = []));
        la.push(i);
        let lb = adj.get(rec.b);
        if (!lb) adj.set(rec.b, (lb = []));
        lb.push(i);
      }
      const passes = (v: number): boolean => {
        const l = adj.get(v) as number[];
        if (l.length !== 2) return false;
        const e1 = E[l[0]];
        const e2 = E[l[1]];
        const p = W[v];
        const q1 = W[e1.a === v ? e1.b : e1.a];
        const q2 = W[e2.a === v ? e2.b : e2.a];
        const ax = p[0] - q1[0];
        const ay = p[1] - q1[1];
        const az = p[2] - q1[2];
        const bx = q2[0] - p[0];
        const by = q2[1] - p[1];
        const bz = q2[2] - p[2];
        const d = Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz);
        return d > 1e-12 && (ax * bx + ay * by + az * bz) / d > 0.66;
      };
      const lo: LineOpts = { color: o.ink, w: o.w, layer: o.layer, bias: o.bias, over: o.over ?? 1, wobble: o.wobble, sway: o.sway };
      const walk = (startV: number, startE: number): void => {
        const pts: V3[] = [W[startV]];
        let v = startV;
        let ei = startE;
        let closed = false;
        for (;;) {
          const e = E[ei];
          e.used = true;
          v = e.a === v ? e.b : e.a;
          if (v === startV) {
            closed = true;
            break;
          }
          pts.push(W[v]);
          if (!passes(v)) break;
          const l = adj.get(v) as number[];
          const next = l[0] === ei ? l[1] : l[0];
          if (E[next].used) break;
          ei = next;
        }
        this.strokeW(pts, closed ? { ...lo, closed: true } : lo, baseLayer, baseBias);
      };
      for (let i = 0; i < E.length; i++) {
        const e = E[i];
        if (e.used) continue;
        if (!passes(e.a)) walk(e.a, i);
        else if (!passes(e.b)) walk(e.b, i);
      }
      for (let i = 0; i < E.length; i++) {
        if (!E[i].used) walk(E[i].a, i);
      }
    }
    this.end();
  }

  // ------------------------------------------------------------ local-space drawing

  /** A flat polygon anywhere in space (local coordinates). */
  fill(pts: V3[], rgb: RGB, o?: FillOpts): void {
    this.begin();
    const W: V3[] = [];
    for (const p of pts) W.push(this.w(p[0], p[1], p[2]));
    this.fillW(W, rgb, o);
    this.end();
  }

  /** A hand-drawn stroke through local points. */
  stroke(pts: V3[], o?: LineOpts): void {
    this.begin();
    const W: V3[] = [];
    for (const p of pts) W.push(this.w(p[0], p[1], p[2]));
    this.strokeW(W, o);
    this.end();
  }

  /** A thin round bar between two points: lamp posts, masts, railings, legs. */
  pole(a: V3, b: V3, w: number, rgb: RGB, o?: { ink?: RGB | false; sway?: number; swayB?: number; bias?: number }): void {
    this.begin();
    const A = this.w(a[0], a[1], a[2]);
    const B = this.w(b[0], b[1], b[2]);
    const bias = o?.bias ?? 0;
    if (o?.ink !== false) {
      this.strokeW([A, B], { w: w + 0.1, color: o?.ink ?? this.ink, wobble: 0, kind: L_BAR, sway: o?.sway, swayB: o?.swayB, bias });
    }
    this.strokeW([A, B], { w, color: rgb, wobble: 0, kind: L_BAR, bias: bias + 0.012, sway: o?.sway, swayB: o?.swayB });
    this.end();
  }

  solid(verts: V3[], faces: number[][], color: RGB | (RGB | null)[], o?: SolidOpts): void {
    const W: V3[] = [];
    for (const p of verts) W.push(this.w(p[0], p[1], p[2]));
    this.solidW(W, faces, color, o);
  }

  /** A box. `top` gives the lid its own colour (a roof, a lawn on a slab). */
  box(x: number, y: number, z: number, w: number, d: number, h: number, rgb: RGB, o?: SolidOpts & { top?: RGB | null }): void {
    const x1 = x + w;
    const y1 = y + d;
    const z1 = z + h;
    const top = o?.top === undefined ? rgb : o.top;
    this.solid(
      [
        [x, y, z],
        [x1, y, z],
        [x1, y1, z],
        [x, y1, z],
        [x, y, z1],
        [x1, y, z1],
        [x1, y1, z1],
        [x, y1, z1],
      ],
      [
        [1, 2, 6, 5],
        [3, 0, 4, 7],
        [2, 3, 7, 6],
        [0, 1, 5, 4],
        [4, 5, 6, 7],
      ],
      [rgb, rgb, rgb, rgb, top],
      o,
    );
  }

  /** A pitched roof. `axis` is the way the ridge runs; `gable` colours the two end triangles. */
  gable(x: number, y: number, z: number, w: number, d: number, h: number, axis: "x" | "y", rgb: RGB, o?: SolidOpts & { gable?: RGB }): void {
    const x1 = x + w;
    const y1 = y + d;
    const g = o?.gable ?? rgb;
    if (axis === "y") {
      const xm = x + w / 2;
      this.solid(
        [
          [x, y, z],
          [x1, y, z],
          [x1, y1, z],
          [x, y1, z],
          [xm, y, z + h],
          [xm, y1, z + h],
        ],
        [
          [1, 2, 5, 4],
          [3, 0, 4, 5],
          [2, 3, 5],
          [0, 1, 4],
        ],
        [rgb, rgb, g, g],
        o,
      );
    } else {
      const ym = y + d / 2;
      this.solid(
        [
          [x, y, z],
          [x1, y, z],
          [x1, y1, z],
          [x, y1, z],
          [x, ym, z + h],
          [x1, ym, z + h],
        ],
        [
          [2, 3, 4, 5],
          [0, 1, 5, 4],
          [1, 2, 5],
          [3, 0, 4],
        ],
        [rgb, rgb, g, g],
        o,
      );
    }
  }

  /** A hipped roof: four slopes meeting a short ridge along the longer side. */
  hip(x: number, y: number, z: number, w: number, d: number, h: number, rgb: RGB, o?: SolidOpts & { inset?: number }): void {
    const x1 = x + w;
    const y1 = y + d;
    const along = w >= d;
    const ins = o?.inset ?? Math.min(w, d) / 2;
    const a: V3 = along ? [x + ins, y + d / 2, z + h] : [x + w / 2, y + ins, z + h];
    const b: V3 = along ? [x1 - ins, y + d / 2, z + h] : [x + w / 2, y1 - ins, z + h];
    const faces = along
      ? [
          [0, 1, 5, 4],
          [1, 2, 5],
          [2, 3, 4, 5],
          [3, 0, 4],
        ]
      : [
          [0, 1, 4],
          [1, 2, 5, 4],
          [2, 3, 5],
          [3, 0, 4, 5],
        ];
    this.solid(
      [
        [x, y, z],
        [x1, y, z],
        [x1, y1, z],
        [x, y1, z],
        a,
        b,
      ],
      faces,
      rgb,
      o,
    );
  }

  pyramid(x: number, y: number, z: number, w: number, d: number, h: number, rgb: RGB, o?: SolidOpts): void {
    this.solid(
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
        [x + w / 2, y + d / 2, z + h],
      ],
      [
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4],
      ],
      rgb,
      o,
    );
  }

  /** A round column or drum; `r2` tapers the top, `top` colours the lid. */
  cyl(cx: number, cy: number, z: number, r: number, h: number, rgb: RGB, o?: SolidOpts & { seg?: number; r2?: number; top?: RGB | null }): void {
    const n = o?.seg ?? Math.round(clamp(8 + r * 3, 8, 22));
    const r2 = o?.r2 ?? r;
    const verts: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, z + h]);
    }
    const faces: number[][] = [];
    const cols: (RGB | null)[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, n + j, n + i]);
      cols.push(rgb);
    }
    const lid: number[] = [];
    for (let i = 0; i < n; i++) lid.push(n + i);
    faces.push(lid);
    cols.push(o?.top === undefined ? rgb : o.top);
    this.solid(verts, faces, cols, { crease: 40, over: 0, ...o });
  }

  cone(cx: number, cy: number, z: number, r: number, h: number, rgb: RGB, o?: SolidOpts & { seg?: number }): void {
    const n = o?.seg ?? Math.round(clamp(8 + r * 3, 8, 20));
    const verts: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
    }
    verts.push([cx, cy, z + h]);
    const faces: number[][] = [];
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n]);
    this.solid(verts, faces, rgb, { crease: 40, over: 0, ...o });
  }

  /** Half an egg: `r` wide, `h` tall. */
  dome(cx: number, cy: number, z: number, r: number, h: number, rgb: RGB, o?: SolidOpts & { seg?: number; rings?: number }): void {
    const n = o?.seg ?? 14;
    const rings = o?.rings ?? 4;
    const verts: V3[] = [];
    for (let k = 0; k < rings; k++) {
      const ph = (k / rings) * Math.PI * 0.5;
      const rr = Math.cos(ph) * r;
      const zz = z + Math.sin(ph) * h;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        verts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, zz]);
      }
    }
    verts.push([cx, cy, z + h]);
    const apex = rings * n;
    const faces: number[][] = [];
    for (let k = 0; k < rings - 1; k++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i]);
      }
    }
    for (let i = 0; i < n; i++) faces.push([(rings - 1) * n + i, (rings - 1) * n + ((i + 1) % n), apex]);
    this.solid(verts, faces, rgb, { crease: 40, over: 0, ...o });
  }

  /** A footprint (local x, y) pulled straight up from z0 to z1. Any simple outline works. */
  extrude(foot: V2[], z0: number, z1: number, rgb: RGB, o?: SolidOpts & { top?: RGB }): void {
    this.floor(z0, 0).extrude(foot, z1 - z0, rgb, { ...o, front: o?.top });
  }

  // ------------------------------------------------------------ planes

  /**
   * A drawing plane from a local origin and two local axes. A two-sided plane
   * shows whichever way it faces: flat cut-outs such as bicycles and fences.
   */
  plane(o: V3, u: V3, v: V3, layer = 1, twoSided = false): Plane {
    const O = this.w(o[0], o[1], o[2]);
    const U = this.wd(u[0], u[1], u[2]);
    const V = this.wd(v[0], v[1], v[2]);
    let nx = U[1] * V[2] - U[2] * V[1];
    let ny = U[2] * V[0] - U[0] * V[2];
    let nz = U[0] * V[1] - U[1] * V[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    if (twoSided) {
      if (nx + ny + nz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      return new Plane(this, O, U, V, [nx, ny, nz], true, layer, 0, 1);
    }
    return new Plane(this, O, U, V, [nx, ny, nz], nx + ny + nz > 1e-6, layer, 0, shadeF(nx, ny, nz));
  }

  /**
   * One wall of a footprint, seen from outside. side is "x+", "x-", "y+" or
   * "y-"; a runs along the wall from 0 to its width (left to right as the
   * camera sees it, so lettering reads the right way round) and b runs up
   * from z.
   */
  wall(side: "x+" | "x-" | "y+" | "y-", x: number, y: number, z: number, w: number, d: number, layer = 1): Plane {
    let o: V3;
    let u: V3;
    let n: V3;
    if (side === "x+") {
      o = [x + w, y + d, z];
      u = [0, -1, 0];
      n = [1, 0, 0];
    } else if (side === "x-") {
      o = [x, y, z];
      u = [0, 1, 0];
      n = [-1, 0, 0];
    } else if (side === "y+") {
      o = [x, y + d, z];
      u = [1, 0, 0];
      n = [0, 1, 0];
    } else {
      o = [x + w, y, z];
      u = [-1, 0, 0];
      n = [0, -1, 0];
    }
    const O = this.w(o[0], o[1], o[2]);
    const U = this.wd(u[0], u[1], u[2]);
    const V = this.wd(0, 0, 1);
    const N = this.wd(n[0], n[1], n[2]);
    const l = Math.hypot(N[0], N[1], N[2]) || 1;
    const nx = N[0] / l;
    const ny = N[1] / l;
    const nz = N[2] / l;
    return new Plane(this, O, U, V, [nx, ny, nz], nx + ny + nz > 1e-6, layer, 0, shadeF(nx, ny, nz));
  }

  /** The ground (or any level surface): a is local x, b is local y. */
  floor(z = 0, layer = 1): Plane {
    return this.plane([0, 0, z], [1, 0, 0], [0, 1, 0], layer);
  }

  /**
   * An upright card that always faces the camera, standing at a local point.
   * One unit of a is one unit across the page, b is height. Shapes drawn on a
   * card are not foreshortened: a circle stays a circle.
   */
  card(x: number, y: number, z = 0, flip = false): Plane {
    const O = this.w(x, y, z);
    const k = K * this.sc * (flip ? -1 : 1);
    const inv = Math.SQRT1_2;
    return new Plane(this, O, [k, -k, 0], [0, 0, this.sc], [inv, inv, 0], true, 0, 0.3, 1);
  }
}
