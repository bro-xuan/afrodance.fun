// The prop kit: the small things any city is made of. People, bicycles, trees,
// lamps, benches, flags, market stalls, windows. Each one draws itself at the
// pen's current origin, in its own local space, so the same prop can be turned
// to face any way and the pen works out what is visible. What only London has
// (phone boxes, terraces, buses) is in street.ts, houses.ts and vehicles.ts.

import { RGB, Rng, V2, V3, scaleRGB } from "../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../engine/pen";
import { AWNING, C, HAIR, SHIRT, SKIN, TROUSERS, UK_BLUE, UK_RED } from "./palette";

export const W_FINE = 0.055;
export const W_THIN = 0.08;

// ---------------------------------------------------------------- people

export interface Look {
  skin: RGB;
  hair: RGB;
  top: RGB;
  legs: RGB;
  long: boolean;
  hat: RGB | null;
}

export function randomLook(rng: Rng): Look {
  return {
    skin: rng.pick(SKIN),
    hair: rng.pick(HAIR),
    top: rng.pick(SHIRT),
    legs: rng.pick(TROUSERS),
    long: rng.chance(0.4),
    hat: rng.chance(0.1) ? rng.pick(SHIRT) : null,
  };
}

export type Pose = "stand" | "walkA" | "walkB" | "sit" | "bust" | "wave" | "cheer";

function head(c: Plane, a: number, b: number, lk: Look, r = 0.4): void {
  c.circle(a, b, r, lk.skin, { outline: true, w: W_FINE, layer: 3, seg: 10, grain: 0.4 });
  const pts: V2[] = [];
  const hr = r * 1.1;
  const a0 = -0.2;
  const a1 = Math.PI + 0.2;
  if (lk.long) pts.push([a + hr * 1.02, b - r * 0.75]);
  for (let i = 0; i <= 7; i++) {
    const t = a0 + ((a1 - a0) * i) / 7;
    pts.push([a + Math.cos(t) * hr, b + 0.03 + Math.sin(t) * hr]);
  }
  if (lk.long) pts.push([a - hr * 1.02, b - r * 0.75]);
  pts.push([a - r * 0.55, b + r * 0.28], [a + r * 0.5, b + r * 0.34]);
  c.poly(pts, lk.hat ?? lk.hair, { outline: true, w: W_FINE, layer: 4, grain: 0.4 });
  // two dots for eyes
  for (const e of [-0.34, 0.34]) {
    c.seg(a + e * r, b - r * 0.2, a + e * r, b - r * 0.06, { w: 0.075, wobble: 0, layer: 5 });
  }
}

/**
 * A small figure standing at the pen's (x, y, z). Figures are flat cards that
 * face the camera; `flip` mirrors them, `s` scales (children are about 0.75).
 */
export function person(pen: Pen, x: number, y: number, z: number, lk: Look, pose: Pose = "stand", flip = false, s = 1): void {
  pen.push(x, y, z, 0, s);
  const c = pen.card(0, 0, 0, flip);
  pen.begin();
  const lw = 0.25;
  const aw = 0.17;
  if (pose === "bust") {
    c.poly(
      [
        [-0.35, 0],
        [0.35, 0],
        [0.31, 0.72],
        [-0.31, 0.72],
      ],
      lk.top,
      { outline: true, w: W_FINE, layer: 1 },
    );
    head(c, 0, 1.12, lk);
  } else if (pose === "sit") {
    c.bar(-0.05, 0.52, 0.42, 0.52, lw, lk.legs);
    c.bar(0.42, 0.52, 0.44, 0.08, lw * 0.9, lk.legs);
    c.poly(
      [
        [-0.34, 0.42],
        [0.3, 0.42],
        [0.28, 1.14],
        [-0.3, 1.14],
      ],
      lk.top,
      { outline: true, w: W_FINE, layer: 1 },
    );
    c.bar(0.2, 1.02, 0.42, 0.66, aw, lk.top, { layer: 2 });
    head(c, 0, 1.55, lk);
  } else {
    if (pose === "walkA") {
      c.bar(-0.1, 0.76, -0.34, 0.12, lw, lk.legs);
      c.bar(0.1, 0.76, 0.32, 0.14, lw, lk.legs);
    } else if (pose === "walkB") {
      c.bar(-0.07, 0.76, -0.04, 0.1, lw, lk.legs);
      c.bar(0.09, 0.76, 0.14, 0.2, lw, lk.legs);
    } else {
      c.bar(-0.16, 0.76, -0.17, 0.1, lw, lk.legs);
      c.bar(0.16, 0.76, 0.17, 0.1, lw, lk.legs);
    }
    c.poly(
      [
        [-0.35, 0.7],
        [0.35, 0.7],
        [0.31, 1.42],
        [-0.31, 1.42],
      ],
      lk.top,
      { outline: true, w: W_FINE, layer: 1 },
    );
    if (pose === "cheer") {
      c.bar(-0.34, 1.34, -0.6, 1.9, aw, lk.top, { layer: 2 });
      c.bar(0.34, 1.34, 0.6, 1.9, aw, lk.top, { layer: 2 });
    } else if (pose === "wave") {
      c.bar(-0.36, 1.33, -0.45, 0.84, aw, lk.top, { layer: 2 });
      c.bar(0.34, 1.34, 0.64, 1.86, aw, lk.top, { layer: 2 });
    } else if (pose === "walkA") {
      c.bar(-0.36, 1.33, -0.54, 0.92, aw, lk.top, { layer: 2 });
      c.bar(0.36, 1.33, 0.52, 0.94, aw, lk.top, { layer: 2 });
    } else {
      c.bar(-0.37, 1.33, -0.43, 0.84, aw, lk.top, { layer: 2 });
      c.bar(0.37, 1.33, 0.43, 0.84, aw, lk.top, { layer: 2 });
    }
    head(c, 0, 1.84, lk);
  }
  pen.end();
  pen.pop();
}

// ---------------------------------------------------------------- bicycles

export interface BikeOpts {
  color?: RGB;
  rider?: Look | null;
  /** Pedal position, 0 or 1. */
  frame?: number;
  crate?: boolean;
  /** A box bike with children up front. */
  cargo?: boolean;
}

/**
 * A bicycle seen side on, standing at the origin and pointing along local +x.
 * With a rider it is a cyclist; without, a parked bike.
 */
export function bike(pen: Pen, o: BikeOpts = {}): void {
  const p = pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true);
  const col = o.color ?? C.black;
  const fw = 0.085;
  pen.begin();
  const front = o.cargo ? 1.55 : 0.78;
  p.circle(-0.78, 0.58, 0.56, null, { w: 0.075, seg: 10, wobble: 0 });
  p.circle(front, 0.58, o.cargo ? 0.46 : 0.56, null, { w: 0.075, seg: 10, wobble: 0 });
  const st: V2[][] = o.cargo
    ? [
        [
          [-0.78, 0.58],
          [-0.05, 0.5],
          [0.55, 0.5],
          [front, 0.58],
        ],
        [
          [-0.05, 0.5],
          [-0.28, 1.28],
          [-0.78, 0.58],
        ],
        [
          [-0.28, 1.28],
          [0.3, 1.25],
          [0.36, 1.6],
          [0.2, 1.62],
        ],
      ]
    : [
        [
          [-0.78, 0.58],
          [-0.05, 0.52],
          [0.5, 1.2],
          [-0.28, 1.25],
          [-0.78, 0.58],
        ],
        [
          [-0.05, 0.52],
          [-0.28, 1.25],
        ],
        [
          [0.78, 0.58],
          [0.5, 1.2],
          [0.42, 1.52],
          [0.62, 1.56],
        ],
      ];
  for (const s of st) p.line(s, { w: fw, color: col, kind: L_BAR, wobble: 0 });
  p.seg(-0.44, 1.31, -0.1, 1.31, { w: 0.15, color: C.black, kind: L_BAR, wobble: 0 });
  if (o.cargo) {
    p.poly(
      [
        [0.5, 0.62],
        [1.42, 0.62],
        [1.56, 1.22],
        [0.5, 1.22],
      ],
      C.wood,
      { outline: true, w: W_FINE, layer: 1 },
    );
    const kid = randomKid;
    head(p, 0.85, 1.42, kid[0], 0.27);
    head(p, 1.22, 1.4, kid[1], 0.27);
  } else if (o.crate) {
    p.rect(0.5, 1.18, 1.02, 1.5, C.woodDark, { outline: true, w: W_FINE, layer: 1 });
  }
  const lk = o.rider;
  if (lk) {
    const f = o.frame ?? 0;
    const pa: V2 = f === 0 ? [0.12, 0.42] : [-0.2, 0.66];
    const pb: V2 = f === 0 ? [-0.2, 0.66] : [0.12, 0.42];
    const ka: V2 = f === 0 ? [0.22, 1.02] : [0.1, 1.2];
    const kb: V2 = f === 0 ? [0.1, 1.2] : [0.22, 1.02];
    p.bar(-0.22, 1.36, kb[0], kb[1], 0.24, lk.legs, { layer: 1 });
    p.bar(kb[0], kb[1], pb[0], pb[1], 0.2, lk.legs, { layer: 1 });
    p.poly(
      [
        [-0.46, 1.32],
        [0.02, 1.3],
        [0.34, 2.02],
        [-0.14, 2.1],
      ],
      lk.top,
      { outline: true, w: W_FINE, layer: 2 },
    );
    p.bar(-0.2, 1.36, ka[0], ka[1], 0.24, lk.legs, { layer: 3 });
    p.bar(ka[0], ka[1], pa[0], pa[1], 0.2, lk.legs, { layer: 3 });
    p.bar(0.16, 1.94, o.cargo ? 0.3 : 0.5, 1.56, 0.16, lk.top, { layer: 4 });
    headSide(p, 0.2, 2.42, lk);
  }
  pen.end();
}

const randomKid: Look[] = [
  { skin: SKIN[0], hair: HAIR[3], top: SHIRT[2], legs: TROUSERS[0], long: false, hat: null },
  { skin: SKIN[2], hair: HAIR[0], top: SHIRT[0], legs: TROUSERS[0], long: true, hat: null },
];

function headSide(p: Plane, a: number, b: number, lk: Look): void {
  const r = 0.36;
  p.circle(a, b, r, lk.skin, { outline: true, w: W_FINE, layer: 5, seg: 10, grain: 0.4 });
  const pts: V2[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = 0.25 + ((Math.PI + 0.55) * i) / 7;
    pts.push([a + Math.cos(t) * r * 1.1, b + 0.03 + Math.sin(t) * r * 1.1]);
  }
  if (lk.long) pts.push([a - r * 1.25, b - r * 1.2], [a - r * 0.5, b - r * 0.5]);
  else pts.push([a - r * 0.4, b + r * 0.1]);
  p.poly(pts, lk.hat ?? lk.hair, { outline: true, w: W_FINE, layer: 6, grain: 0.4 });
}

/** A row of parked bikes along local +x, leaning this way and that. */
export function bikeRow(pen: Pen, rng: Rng, x: number, y: number, n: number, rot = 0, gap = 0.62): void {
  const cols = [C.black, C.black, C.blueDark, C.redDark, C.green, C.greyDark, C.orange];
  pen.push(x, y, 0, rot);
  for (let i = 0; i < n; i++) {
    if (rng.chance(0.12)) continue;
    pen.push(rng.range(-0.12, 0.12), i * gap, 0, rng.range(-9, 9));
    bike(pen, { color: rng.pick(cols), crate: rng.chance(0.25) });
    pen.pop();
  }
  pen.pop();
}

// ---------------------------------------------------------------- greenery

export type TreeKind = "round" | "tall" | "blossom" | "bush" | "elm";

export interface TreeOpts {
  kind?: TreeKind;
  h?: number;
  r?: number;
  color?: RGB;
  z?: number;
}

const LEAVES = [C.leaf, C.leaf2, C.leaf3, C.grassDark];

function blob(c: Plane, rng: Rng, ca: number, cb: number, ra: number, rb: number, rgb: RGB, sway: number, ink: RGB): void {
  const pts: V2[] = [];
  const n = 18;
  const p1 = rng.range(0, 6.28);
  const p2 = rng.range(0, 6.28);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + 0.06 * Math.sin(3 * t + p1) + 0.04 * Math.sin(5 * t + p2);
    pts.push([ca + Math.cos(t) * ra * k, cb + Math.sin(t) * rb * k]);
  }
  c.poly(pts, rgb, { outline: true, w: 0.1, ink, sway, layer: 1 });
  // a few leaf strokes
  const dark = scaleRGB(rgb, 0.8);
  for (let i = 0; i < 3; i++) {
    const a = ca + rng.range(-0.5, 0.5) * ra;
    const b = cb + rng.range(-0.5, 0.45) * rb;
    const l = Math.min(ra, rb) * 0.28;
    c.line(
      [
        [a - l, b],
        [a - l * 0.2, b - l * 0.55],
        [a + l * 0.8, b - l * 0.1],
      ],
      { w: 0.07, color: dark, kind: L_MARK, sway, layer: 2, wobble: 0 },
    );
  }
}

/** A tree at local (x, y). */
export function tree(pen: Pen, rng: Rng, x: number, y: number, o: TreeOpts = {}): void {
  const kind = o.kind ?? "round";
  const z = o.z ?? 0;
  const ink = C.ink;
  pen.begin();
  if (kind === "bush") {
    const r = o.r ?? rng.range(0.6, 0.9);
    const c = pen.card(x, y, z);
    blob(c, rng, 0, r * 0.75, r * 1.15, r * 0.85, o.color ?? rng.pick(LEAVES), 0.12, ink);
    pen.end();
    return;
  }
  const h = o.h ?? (kind === "tall" ? rng.range(1.2, 1.6) : kind === "elm" ? rng.range(2.3, 2.8) : rng.range(1.5, 2.1));
  const r = o.r ?? (kind === "elm" ? rng.range(1.5, 1.8) : rng.range(1.25, 1.65));
  pen.pole([x, y, z], [x, y, z + h + 0.3], kind === "elm" ? 0.26 : 0.3, C.trunk);
  const c = pen.card(x, y, z + h);
  const sway = rng.range(0.28, 0.42);
  if (kind === "tall") {
    blob(c, rng, 0, r * 1.45, r * 0.62, r * 1.6, o.color ?? C.leafDark, sway, ink);
  } else if (kind === "blossom") {
    blob(c, rng, 0, r * 0.75, r, r * 0.9, o.color ?? C.blossom, sway, ink);
  } else {
    blob(c, rng, 0, r * 0.78, r, r * 0.92, o.color ?? rng.pick(LEAVES), sway, ink);
  }
  pen.end();
}

/** A clipped hedge: a low green box. */
export function hedge(pen: Pen, x: number, y: number, w: number, d: number, h = 0.7): void {
  pen.box(x, y, 0, w, d, h, C.hedge);
}

/** A bed of flowers: a soil patch with dots of colour. */
export function flowerBed(pen: Pen, rng: Rng, x: number, y: number, w: number, d: number, cols: RGB[], density = 2.2): void {
  const g = pen.floor(0, 2);
  pen.begin();
  g.rect(x, y, x + w, y + d, C.grassDark, { outline: true, w: W_THIN });
  const n = Math.round(w * d * density);
  for (let i = 0; i < n; i++) {
    const a = rng.range(x + 0.15, x + w - 0.15);
    const b = rng.range(y + 0.15, y + d - 0.15);
    const c = pen.card(a, b, 0);
    c.circle(0, 0.28, 0.16, rng.pick(cols), { seg: 6, grain: 0, sway: 0.1 });
  }
  pen.end();
}

// ---------------------------------------------------------------- street furniture

const LAMP_GREEN: RGB = [52, 78, 66];

/** A cast-iron street lantern, black with a little crown on top. It lights up at night. */
export function lamp(pen: Pen, x: number, y: number, z = 0, h = 3.3): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + 0.5], 0.24, C.iron);
  pen.pole([x, y, z + 0.5], [x, y, z + h], 0.13, C.iron);
  const c = pen.card(x, y, z + h);
  c.seg(-0.3, -0.42, 0.3, -0.42, { w: 0.06, color: C.iron, kind: L_BAR, wobble: 0 });
  c.poly(
    [
      [-0.19, 0],
      [0.19, 0],
      [0.3, 0.56],
      [-0.3, 0.56],
    ],
    C.lamp,
    { outline: true, w: W_FINE, glow: 1, grain: 0.2, layer: 1 },
  );
  c.poly(
    [
      [-0.35, 0.56],
      [0.35, 0.56],
      [0.1, 0.8],
      [0, 0.98],
      [-0.1, 0.8],
    ],
    C.iron,
    { outline: true, w: W_FINE, layer: 2 },
  );
  // a soft pool of light, night only
  c.seg(-0.01, 0.28, 0.01, 0.28, { kind: L_LIGHT, w: 2.3, alpha: 0.2, wobble: 0 });
  pen.end();
}

/** A black street bollard with a white band. */
export function bollard(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.pole([x, y, 0], [x, y, 0.62], 0.22, C.iron);
  pen.card(x, y, 0).rect(-0.11, 0.38, 0.11, 0.48, C.white, { grain: 0 });
  pen.end();
}

export function bench(pen: Pen, x: number, y: number, rot = 0): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.box(-0.9, -0.25, 0.38, 1.8, 0.5, 0.12, C.wood);
  pen.box(-0.9, -0.32, 0.5, 1.8, 0.1, 0.55, C.wood);
  pen.pole([-0.75, 0, 0], [-0.75, 0, 0.38], 0.1, C.black, { ink: false });
  pen.pole([0.75, 0, 0], [0.75, 0, 0.38], 0.1, C.black, { ink: false });
  pen.end();
  pen.pop();
}

/** An iron railing through a run of points: posts and two rails. */
export function railing(pen: Pen, pts: V3[], h = 0.85, color: RGB = C.black, step = 1.3): void {
  pen.begin();
  const top: V3[] = [];
  const mid: V3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      pen.stroke([p, [p[0], p[1], p[2] + h]], { w: 0.09, color, kind: L_BAR, wobble: 0 });
      top.push([p[0], p[1], p[2] + h]);
      mid.push([p[0], p[1], p[2] + h * 0.5]);
    }
  }
  pen.stroke(top, { w: 0.1, color, kind: L_BAR, wobble: 0 });
  pen.stroke(mid, { w: 0.06, color, kind: L_BAR, wobble: 0 });
  pen.end();
}

/**
 * The Union flag, drawn on any plane in the rectangle from (a, b), w wide and
 * h high. `sway` lets the cloth move in the wind; `layer` is where its field
 * sits (the crosses take the four layers above). Small flags can skip the
 * thin red diagonals.
 */
export function unionJack(c: Plane, a: number, b: number, w: number, h: number, o: { sway?: number; layer?: number; fine?: boolean; outline?: boolean } = {}): void {
  const sway = o.sway ?? 0;
  const L = o.layer ?? 1;
  const fill = (pts: V2[], rgb: RGB, layer: number) => c.poly(pts, rgb, { sway, grain: 0.35, layer, shade: false });
  fill(
    [
      [a, b],
      [a + w, b],
      [a + w, b + h],
      [a, b + h],
    ],
    UK_BLUE,
    L,
  );
  // a diagonal band corner to corner, cut off square by the edges of the flag
  const diag = (t: number, rgb: RGB, layer: number) => {
    const len = Math.hypot(w, h);
    const dx = Math.min(w, (t * len) / h);
    const dy = Math.min(h, (t * len) / w);
    fill(
      [
        [a, b],
        [a + dx, b],
        [a + w, b + h - dy],
        [a + w, b + h],
        [a + w - dx, b + h],
        [a, b + dy],
      ],
      rgb,
      layer,
    );
    fill(
      [
        [a + w, b],
        [a + w, b + dy],
        [a + dx, b + h],
        [a, b + h],
        [a, b + h - dy],
        [a + w - dx, b],
      ],
      rgb,
      layer,
    );
  };
  diag(h * 0.1, C.white, L + 1);
  if (o.fine !== false) diag(h * 0.035, UK_RED, L + 2);
  const cross = (t: number, rgb: RGB, layer: number) => {
    fill(
      [
        [a + w / 2 - t, b],
        [a + w / 2 + t, b],
        [a + w / 2 + t, b + h],
        [a + w / 2 - t, b + h],
      ],
      rgb,
      layer,
    );
    fill(
      [
        [a, b + h / 2 - t],
        [a + w, b + h / 2 - t],
        [a + w, b + h / 2 + t],
        [a, b + h / 2 + t],
      ],
      rgb,
      layer,
    );
  };
  cross(h * 0.17, C.white, L + 3);
  cross(h * 0.1, UK_RED, L + 4);
  if (o.outline !== false) {
    c.loop(
      [
        [a, b],
        [a + w, b],
        [a + w, b + h],
        [a, b + h],
      ],
      { w: W_FINE, sway, layer: L + 5 },
    );
  }
}

export type FlagKind = "uk" | "england" | "red" | "white" | "blue";

/** A flag on a pole. The cloth sways in the wind. */
export function flag(pen: Pen, x: number, y: number, z: number, h: number, kind: FlagKind = "uk", size = 1): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.1, C.white);
  const c = pen.card(x, y, z + h - 1.15 * size);
  const w = 1.9 * size;
  const hh = 1.1 * size;
  if (kind === "uk") unionJack(c, 0.05, 0, w, hh, { sway: 0.5 });
  else {
    c.rect(0.05, 0, 0.05 + w, hh, kind === "red" ? C.red : kind === "blue" ? C.royal : C.white, { sway: 0.5, grain: 0.5, layer: 1 });
    if (kind === "england") {
      // St George's cross
      c.rect(0.05 + w / 2 - hh * 0.1, 0, 0.05 + w / 2 + hh * 0.1, hh, UK_RED, { sway: 0.5, grain: 0.35, layer: 2, shade: false });
      c.rect(0.05, hh * 0.4, 0.05 + w, hh * 0.6, UK_RED, { sway: 0.5, grain: 0.35, layer: 2, shade: false });
    }
    c.loop(
      [
        [0.05, 0],
        [0.05 + w, 0],
        [0.05 + w, hh],
        [0.05, hh],
      ],
      { w: W_FINE, sway: 0.5, layer: 3 },
    );
  }
  pen.end();
}

/** A café table with chairs and, sometimes, a parasol. */
export function cafeTable(pen: Pen, rng: Rng, x: number, y: number, parasol: RGB | null = null, seated = 2): void {
  pen.begin();
  pen.cyl(x, y, 0.62, 0.5, 0.08, C.white, { seg: 9 });
  pen.pole([x, y, 0], [x, y, 0.62], 0.09, C.greyDark, { ink: false });
  const spots: V2[] = [
    [0.85, 0],
    [-0.85, 0],
    [0, 0.85],
    [0, -0.85],
  ];
  for (let i = 0; i < spots.length; i++) {
    const sx = x + spots[i][0];
    const sy = y + spots[i][1];
    pen.box(sx - 0.2, sy - 0.2, 0, 0.4, 0.4, 0.42, C.wood);
    if (i < seated) person(pen, sx, sy, 0.3, randomLook(rng), "bust", rng.chance(0.5));
  }
  if (parasol) {
    pen.pole([x, y, 0.7], [x, y, 2.5], 0.08, C.white, { ink: false });
    pen.cone(x, y, 2.2, 1.55, 0.55, parasol, { seg: 8, crease: 0.5 });
  }
  pen.end();
}

// ---------------------------------------------------------------- market stalls

export interface StallOpts {
  w?: number;
  d?: number;
  a?: RGB;
  b?: RGB;
  goods?: RGB[];
  sign?: string;
  keeper?: boolean;
}

/** A market stall with a striped awning, facing local +y. */
export function stall(pen: Pen, rng: Rng, o: StallOpts = {}): void {
  const w = o.w ?? 3.4;
  const d = o.d ?? 2.2;
  const a = o.a ?? rng.pick(AWNING);
  const b = o.b ?? C.white;
  pen.begin();
  // table and goods
  pen.box(0.1, 0.5, 0, w - 0.2, d - 0.6, 0.85, C.wood);
  const goods = o.goods ?? [C.red, C.yellow, C.orange, C.grass];
  const nx = Math.max(3, Math.round(w / 0.7));
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < 2; j++) {
      const gx = 0.2 + (i * (w - 0.4)) / nx;
      const gy = 0.65 + j * 0.72;
      pen.box(gx, gy, 0.85, (w - 0.4) / nx - 0.1, 0.6, 0.22 + rng.next() * 0.16, rng.pick(goods), { grain: 0.5, w: W_FINE });
    }
  }
  // posts
  for (const [px, py] of [
    [0.05, 0.05],
    [w - 0.05, 0.05],
    [0.05, d],
    [w - 0.05, d],
  ]) {
    pen.pole([px, py, 0], [px, py, py > 1 ? 2.25 : 2.75], 0.1, C.white);
  }
  // awning: striped cloth sloping down to the front
  const cloth = pen.plane([0, -0.1, 2.8], [1, 0, 0], [0, (d + 0.5) / 1, -0.55 / 1], 0, true);
  const n = Math.max(4, Math.round(w / 0.55));
  for (let i = 0; i < n; i++) {
    cloth.rect((i * w) / n, 0, ((i + 1) * w) / n, 1, i % 2 === 0 ? a : b, { grain: 0.6 });
  }
  cloth.loop(
    [
      [0, 0],
      [w, 0],
      [w, 1],
      [0, 1],
    ],
    { w: W_THIN },
  );
  // front valance
  const val = pen.plane([0, d + 0.4, 1.9], [1, 0, 0], [0, 0, 1], 0, true);
  for (let i = 0; i < n; i++) {
    val.rect((i * w) / n, 0, ((i + 1) * w) / n, 0.36, i % 2 === 0 ? a : b, { grain: 0.6 });
  }
  val.loop(
    [
      [0, 0],
      [w, 0],
      [w, 0.36],
      [0, 0.36],
    ],
    { w: W_THIN },
  );
  if (o.sign) {
    const sg = pen.plane([0, d + 0.42, 2.3], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(w * 0.12, 0, w * 0.88, 0.62, C.white, { outline: true, w: W_FINE });
    sg.text(o.sign, w / 2, 0.14, 0.34, { align: "c", layer: 1 });
  }
  if (o.keeper !== false) person(pen, w * rng.range(0.3, 0.7), 0.25, 0, randomLook(rng), "stand", rng.chance(0.5));
  pen.end();
}

// ---------------------------------------------------------------- windows

/** One window with a pale frame, glass, and a cross bar. */
export function windowAt(f: Plane, a0: number, b0: number, a1: number, b1: number, lit: boolean, trim: RGB = C.white, bars = true): void {
  f.rect(a0, b0, a1, b1, trim, { outline: true, w: W_FINE, grain: 0.3 });
  const i = Math.min(0.11, (a1 - a0) * 0.16);
  f.rect(a0 + i, b0 + i, a1 - i, b1 - i, C.glass, { layer: 1, glow: lit ? 1 : 0, grain: 0.5 });
  if (bars) {
    const mb = b0 + (b1 - b0) * 0.56;
    f.seg(a0 + i, mb, a1 - i, mb, { w: 0.05, color: trim, kind: L_MARK, wobble: 0, layer: 2 });
    f.seg((a0 + a1) / 2, b0 + i, (a0 + a1) / 2, b1 - i, { w: 0.05, color: trim, kind: L_MARK, wobble: 0, layer: 2 });
  }
}

/** A window with a round top, for churches, stations and palaces. */
export function archWindow(f: Plane, a0: number, b0: number, a1: number, b1: number, lit: boolean, trim: RGB = C.white): void {
  const r = (a1 - a0) / 2;
  const shape = (i: number): V2[] => {
    const pts: V2[] = [
      [a0 + i, b0 + i],
      [a1 - i, b0 + i],
      [a1 - i, b1 - r],
    ];
    for (let k = 1; k < 7; k++) {
      const t = (k / 7) * Math.PI;
      pts.push([a0 + r + Math.cos(t) * (r - i), b1 - r + Math.sin(t) * (r - i)]);
    }
    pts.push([a0 + i, b1 - r]);
    return pts;
  };
  f.poly(shape(0), trim, { outline: true, w: W_FINE, grain: 0.3 });
  f.poly(shape(Math.min(0.12, r * 0.3)), C.glass, { layer: 1, glow: lit ? 1 : 0, grain: 0.5 });
}

/**
 * Rows and columns of windows filling a rectangle of a wall. `lit` is the
 * chance each one is lit at night.
 */
export function windowGrid(
  f: Plane,
  rng: Rng,
  a0: number,
  b0: number,
  a1: number,
  b1: number,
  cols: number,
  rows: number,
  o: { lit?: number; trim?: RGB; fillA?: number; fillB?: number; arched?: boolean; bars?: boolean } = {},
): void {
  const ca = (a1 - a0) / cols;
  const cb = (b1 - b0) / rows;
  const wa = ca * (o.fillA ?? 0.62);
  const wb = cb * (o.fillB ?? 0.68);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = a0 + k * ca + (ca - wa) / 2;
      const y = b0 + r * cb + (cb - wb) / 2;
      const lit = rng.chance(o.lit ?? 0.5);
      if (o.arched) archWindow(f, x, y, x + wa, y + wb, lit, o.trim);
      else windowAt(f, x, y, x + wa, y + wb, lit, o.trim, o.bars !== false);
    }
  }
}

// ---------------------------------------------------------------- bridges

export interface BridgeOpts {
  /** How far below street level the water is. */
  water: number;
  hump?: number;
  rail?: "iron" | "brick";
  bikes?: boolean;
  lamps?: boolean;
  color?: RGB;
}

/** Height of a humped bridge deck at distance a along a span of length L. */
export function humpZ(a: number, L: number, hump: number): number {
  const t = (a - L / 2) / (L / 2);
  return hump * Math.max(0, 1 - t * t);
}

/**
 * An arched canal bridge spanning local x from 0 to L, deck from y = 0 to
 * y = wd. Boats go under, bicycles go over, and at night the arch is strung
 * with lights.
 */
export function bridge(pen: Pen, rng: Rng, L: number, wd: number, o: BridgeOpts): void {
  const hump = o.hump ?? 0.9;
  const wz = -o.water;
  const col = o.color ?? C.brickRose;
  const abut = 1.2;
  const ra = (L - 2 * abut) / 2;
  const rb = o.water + hump - 1.15;
  pen.begin();
  const side = pen.wall("y+", 0, 0, 0, L, 0);
  const prof: V2[] = [
    [0, wz],
    [abut, wz],
  ];
  const arch: V2[] = [];
  const na = 12;
  for (let i = 0; i <= na; i++) {
    const t = Math.PI - (Math.PI * i) / na;
    arch.push([L / 2 + Math.cos(t) * ra, wz + Math.sin(t) * rb]);
  }
  for (let i = 1; i < na; i++) prof.push(arch[i]);
  prof.push([L - abut, wz], [L, wz], [L, 0]);
  const nd = 8;
  const deck: V2[] = [];
  for (let i = 0; i <= nd; i++) {
    const a = L - (L * i) / nd;
    deck.push([a, humpZ(a, L, hump)]);
  }
  for (let i = 1; i < nd; i++) prof.push(deck[i]);
  prof.push([0, 0]);
  side.extrude(prof, wd, col, { crease: 25 });

  // paved deck
  for (let i = 0; i < nd; i++) {
    const a0 = (L * i) / nd;
    const a1 = (L * (i + 1)) / nd;
    const z0 = humpZ(a0, L, hump);
    const z1 = humpZ(a1, L, hump);
    pen.fill(
      [
        [a0, 0.45, z0],
        [a1, 0.45, z1],
        [a1, wd - 0.45, z1],
        [a0, wd - 0.45, z0],
      ],
      C.street,
      { layer: 1 },
    );
  }
  // stone ring round the arch and a string of lights for the night, on both faces
  const ring: V2[] = arch.map((p) => [L / 2 + (p[0] - L / 2) * 1.07, wz + (p[1] - wz) * 1.09] as V2);
  for (const face of [pen.wall("y+", 0, 0, 0, L, wd), pen.wall("y-", 0, 0, 0, L, wd)]) {
    face.line(ring, { w: 0.3, color: C.graniteCap, kind: L_MARK, wobble: 0.3 });
    for (let i = 1; i < na; i++) {
      const p = ring[i];
      face.seg(p[0] - 0.03, p[1] + 0.2, p[0] + 0.03, p[1] + 0.2, { w: 0.22, kind: L_LIGHT, wobble: 0, layer: 2 });
    }
    face.ticks(0.2, wz + 0.2, L - 0.2, -0.1, {
      n: 26,
      len: 0.5,
      ang: 0,
      jit: 0.02,
      color: scaleRGB(col, 0.8),
      w: 0.06,
      inside: (a, b) => {
        const dx = (a - L / 2) / (ra * 1.15);
        const dy = (b - wz) / (rb * 1.2);
        return dx * dx + dy * dy > 1 && b < humpZ(a, L, hump) - 0.25;
      },
    });
  }
  // shade on the water underneath, and the lights' reflections either side
  pen.floor(wz, 2).rect(abut, 0, L - abut, wd, C.waterDeep, { grain: 0.6 });
  const refl = pen.floor(wz, 3);
  for (let i = 1; i < na; i += 2) {
    const a = ring[i][0];
    for (const y of [wd + 0.7 + rng.next() * 1.6, -0.7 - rng.next() * 1.6]) {
      refl.seg(a - 0.32, y + 0.32, a + 0.32, y - 0.32, { w: 0.14, kind: L_LIGHT, wobble: 0, alpha: 0.75 });
    }
  }

  // railings or parapets
  for (const y of [0.12, wd - 0.12]) {
    const pts: V3[] = [];
    for (let i = 0; i <= nd; i++) {
      const a = (L * i) / nd;
      pts.push([a, y, humpZ(a, L, hump)]);
    }
    if (o.rail === "brick") {
      const wl = pen.wall("y+", 0, 0, 0, L, y - 0.12);
      const band: V2[] = [];
      for (let i = 0; i <= nd; i++) band.push([(L * i) / nd, humpZ((L * i) / nd, L, hump)]);
      for (let i = nd; i >= 0; i--) band.push([(L * i) / nd, humpZ((L * i) / nd, L, hump) + 0.8]);
      wl.extrude(band, 0.3, col, { crease: 25, front: col });
    } else {
      railing(pen, pts, 0.9, LAMP_GREEN, 1.3);
    }
  }
  if (o.lamps !== false) {
    lamp(pen, L / 2, 0.14, hump, 2.6);
    lamp(pen, L / 2, wd - 0.14, hump, 2.6);
  }
  if (o.bikes !== false) {
    // bikes chained to the railings
    for (const y of [0.42, wd - 0.42]) {
      const n = 1 + Math.floor(rng.next() * 3);
      let a = rng.range(1.2, 4);
      for (let i = 0; i < n; i++) {
        pen.push(a, y, humpZ(a, L, hump), rng.range(-6, 6));
        bike(pen, { color: rng.pick([C.black, C.blueDark, C.redDark, C.green, C.greyDark]), crate: rng.chance(0.3) });
        pen.pop();
        a += rng.range(1.9, 3.2);
        if (a > L - 1.2) break;
      }
    }
  }
  pen.end();
}

// ---------------------------------------------------------------- textures

/** Brick courses on a wall plane: rows of short dashes. */
export function bricks(f: Plane, a0: number, b0: number, a1: number, b1: number, rgb: RGB, density = 1): void {
  const n = Math.round((a1 - a0) * (b1 - b0) * 0.55 * density);
  f.ticks(a0, b0, a1, b1, { n, len: 0.55, ang: 0, jit: 0.015, color: rgb, w: 0.055 });
}

/** Grass tufts on a patch of the ground plane. */
export function tufts(g: Plane, a0: number, b0: number, a1: number, b1: number, density = 0.5, inside?: (a: number, b: number) => boolean): void {
  g.ticks(a0, b0, a1, b1, {
    n: Math.round((a1 - a0) * (b1 - b0) * density),
    len: 0.42,
    ang: 0.9,
    jit: 0.5,
    color: C.grassDark,
    w: 0.06,
    inside,
  });
}

/** Speckle for paving. */
export function speckle(g: Plane, a0: number, b0: number, a1: number, b1: number, rgb: RGB, density = 0.12, inside?: (a: number, b: number) => boolean): void {
  g.ticks(a0, b0, a1, b1, {
    n: Math.round((a1 - a0) * (b1 - b0) * density),
    len: 0.3,
    ang: -0.78,
    jit: 0.2,
    color: rgb,
    w: 0.06,
    inside,
  });
}
