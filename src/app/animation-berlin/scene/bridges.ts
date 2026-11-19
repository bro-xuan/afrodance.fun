// What crosses the Spree, and what runs along the city's southern edge:
// three stone road bridges, the two footbridges that carry the great axis
// over the arms of the river round Museum Island, the Oberbaumbrücke with its
// two towers and its cloister, and the U1 on its iron viaduct, whose little
// yellow train shuttles over that bridge all day.
//
// Road bridges are drawn in a frame where the deck runs along local +x from
// the west bank (0) to the east (L) and from y = 0 to y = wd, road at z = 0.

import { RGB, Rng, V2, V3, hex, scaleRGB, smooth } from "../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../engine/pen";
import { AXIS_W, AXIS_Y, COL_X, CURB, ISLAND, RX0, RX1, WATER, Y1 } from "./grid";
import { W_FINE, W_THIN, archWindow, lamp, person, railing, randomLook } from "./kit";
import { makeSprite } from "./motion";
import { C } from "./palette";
import { Mover } from "./types";

interface Arch {
  a0: number;
  a1: number;
  /** Height of the crown above the foot of the arch. */
  rise: number;
  /** Straight legs below the curve. */
  legs?: number;
  /** Two arcs meeting in a point (the cloister), rather than a round arch. */
  pointed?: boolean;
}

/** Points along one arch, from its left foot over the crown to its right foot. */
function archPts(a: Arch, b0: number, seg: number): V2[] {
  const pts: V2[] = [[a.a0, b0]];
  const base = b0 + (a.legs ?? 0);
  if (a.legs) pts.push([a.a0, base]);
  const s = a.a1 - a.a0;
  if (a.pointed) {
    const h = seg >> 1;
    for (let k = 1; k <= h; k++) {
      const th = Math.PI - (k / h) * (Math.PI / 3);
      pts.push([a.a1 + s * Math.cos(th), base + (a.rise * Math.sin(th)) / 0.8660254]);
    }
    for (let k = 1; k < h; k++) {
      const th = Math.PI / 3 - (k / h) * (Math.PI / 3);
      pts.push([a.a0 + s * Math.cos(th), base + (a.rise * Math.sin(th)) / 0.8660254]);
    }
  } else {
    for (let k = 1; k < seg; k++) {
      const t = Math.PI - (k / seg) * Math.PI;
      pts.push([a.a0 + s / 2 + (Math.cos(t) * s) / 2, base + Math.sin(t) * a.rise]);
    }
  }
  if (a.legs) pts.push([a.a1, base]);
  pts.push([a.a1, b0]);
  return pts;
}

/** The outline of a wall from b0 up to `top` with arched openings along its foot. */
function arched(L: number, b0: number, top: number, arches: Arch[], seg = 10): V2[] {
  const pts: V2[] = [];
  if (arches.length === 0 || arches[0].a0 > 1e-6) pts.push([0, b0]);
  for (const a of arches) pts.push(...archPts(a, b0, seg));
  if (arches.length === 0 || arches[arches.length - 1].a1 < L - 1e-6) pts.push([L, b0]);
  pts.push([L, top], [0, top]);
  return pts;
}

/** Is a point of the wall plane clear of the arches (and a little clear of their edges)? */
function solidAt(arches: Arch[], b0: number, a: number, b: number, pad = 0.3): boolean {
  for (const ar of arches) {
    if (a < ar.a0 - pad || a > ar.a1 + pad) continue;
    const u = clampUnit((a - (ar.a0 + ar.a1) / 2) / ((ar.a1 - ar.a0) / 2 + pad));
    if (b < b0 + (ar.legs ?? 0) + (ar.rise + pad) * Math.sqrt(1 - u * u)) return false;
  }
  return true;
}
const clampUnit = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** The ring of stone round each arch, the lights strung along it for the night, and the courses of the masonry. */
function dressFace(f: Plane, L: number, b0: number, top: number, arches: Arch[], col: RGB, lights = true): void {
  for (const ar of arches) {
    const ring = archPts(ar, b0, 12).slice(ar.legs ? 2 : 1, ar.legs ? -2 : -1);
    const cx = (ar.a0 + ar.a1) / 2;
    const out = ring.map((p) => [cx + (p[0] - cx) * 1.05, b0 + (p[1] - b0) * 1.07] as V2);
    f.line(out, { w: 0.3, color: C.quayCap, kind: L_MARK, wobble: 0.3 });
    if (lights) for (let i = 1; i < out.length - 1; i += 2) f.seg(out[i][0] - 0.03, out[i][1] + 0.2, out[i][0] + 0.03, out[i][1] + 0.2, { w: 0.22, kind: L_LIGHT, wobble: 0, layer: 2 });
  }
  f.ticks(0.2, b0 + 0.2, L - 0.2, top - 0.15, {
    n: Math.round(L * (top - b0) * 0.42),
    len: 0.5,
    ang: 0,
    jit: 0.02,
    color: scaleRGB(col, 0.8),
    w: 0.06,
    inside: (a, b) => solidAt(arches, b0, a, b),
  });
  f.seg(0, b0 + 0.02, L, b0 + 0.02, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
}

/** A road painted on a deck: tarmac between two strips of stone, and a dashed line down the middle. */
function roadOn(pen: Pen, L: number, y0: number, y1: number, z = 0): void {
  const g = pen.floor(z, 1);
  g.rect(-0.15, y0, L + 0.15, y1, C.road, { grain: 0.8 });
  const mid = (y0 + y1) / 2;
  for (let s = 1.2; s + 1.6 < L - 1; s += 3.4) pen.floor(z, 2).rect(s, mid - 0.09, s + 1.6, mid + 0.09, C.roadLine, { grain: 0.3 });
}

const STYLES: { stone: RGB; rail: "stone" | "iron"; cap: RGB }[] = [
  // the northern one in red sandstone, like the Moltkebrücke
  { stone: hex("#c9917a"), rail: "stone", cap: hex("#e2bfae") },
  // the one by the island's tip with iron railings and tall lanterns, like the Weidendammer Brücke
  { stone: C.sandstone, rail: "iron", cap: C.sandstoneLight },
  { stone: C.quay, rail: "stone", cap: C.quayCap },
];

/** A stone bridge of three low arches carrying a street over the river. The boats take the two side arches. */
export function roadBridge(pen: Pen, rng: Rng, L: number, wd: number, style: number): void {
  const st = STYLES[style % STYLES.length];
  const wz = WATER;
  const arches: Arch[] = [
    { a0: 1.0, a1: 8.5, rise: 2.25 },
    { a0: 10.1, a1: L - 10.1, rise: 2.4 },
    { a0: L - 8.5, a1: L - 1.0, rise: 2.25 },
  ];
  pen.begin();
  pen.wall("y+", 0, 0, 0, L, 0).extrude(arched(L, wz, 0, arches), wd, st.stone, { crease: 25 });
  roadOn(pen, L, 0.95, wd - 0.95);
  const f = pen.wall("y+", 0, 0, 0, L, wd);
  dressFace(f, L, wz, 0, arches, st.stone);
  f.rect(0, -0.34, L, 0, st.cap, { grain: 0.5 });
  f.seg(0, -0.34, L, -0.34, { w: 0.07 });
  // shade on the water underneath
  pen.floor(wz, 2).rect(1, 0.3, L - 1, wd - 0.2, C.waterDeep, { grain: 0.6 });
  pen.end();

  // parapets or railings, and lamps over the piers
  for (const y of [0.14, wd - 0.44]) {
    if (st.rail === "stone") {
      pen.obj(() => {
        pen.box(0, y, 0, L, 0.3, 0.72, st.stone, { top: st.cap });
        const pf = pen.wall("y+", 0, y, 0, L, 0.3);
        pf.ticks(0.3, 0.12, L - 0.3, 0.6, { n: Math.round(L * 1.8), len: 0.7, ang: Math.PI / 2, jit: 0.02, color: scaleRGB(st.stone, 0.78), w: 0.07 });
      }, 0.2);
    } else {
      const pts: V3[] = [];
      for (let a = 0; a <= L + 1e-6; a += L / 16) pts.push([a, y + 0.15, 0]);
      railing(pen, pts, 0.9, C.steelDark, 1.1);
    }
  }
  for (const x of [9.3, L - 9.3]) {
    for (const y of [0.29, wd - 0.29]) lamp(pen, x, y, st.rail === "stone" ? 0.72 : 0, st.rail === "stone" ? 2.3 : 3.4);
  }
  // people who have stopped to watch the boats
  for (let k = 0; k < 5; k++) {
    const x = rng.range(2, L - 2);
    if (Math.abs(x - 9.3) < 0.8 || Math.abs(x - (L - 9.3)) < 0.8) continue;
    person(pen, x, wd - 0.78, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
}

// ---------------------------------------------------------------- the Oberbaumbrücke

/** How far the cloister and the railway stand out beyond the road, on the bridge's south side. */
const CLOISTER = 3.4;
/** Top of the track bed on the bridge and on the viaduct. */
export const TRACK_Z = 4.3;
/** World y of the middle of the track: just outside the southern edge of the base. */
export const TRACK_Y = Y1 + 1.5;

/** The outline of a battlemented parapet: a low wall L long with merlons along its top. */
function crenels(L: number, h: number, step = 1.1, gap = 0.45): V2[] {
  const pts: V2[] = [
    [0, 0],
    [L, 0],
  ];
  // back along the top, notched
  let a = L;
  for (;;) {
    const a1 = a - (step - gap);
    if (a1 - gap < 0.25) {
      pts.push([a, h], [0, h]);
      break;
    }
    pts.push([a, h], [a1, h], [a1, h * 0.45], [a1 - gap, h * 0.45]);
    a = a1 - gap;
  }
  return pts;
}

/**
 * The Oberbaumbrücke: red brick on five arches, the road on its north side,
 * and on its south a cloister of pointed arches that carries the underground
 * railway on its roof, between two towers. The boats go through the middle.
 */
export function oberbaum(pen: Pen, rng: Rng, L: number, wd: number): void {
  const wz = WATER;
  const D = wd + CLOISTER;
  const side = (L - 11 - 6 * 1.2) / 4;
  const arches: Arch[] = [];
  {
    let a = 1.2;
    for (let k = 0; k < 5; k++) {
      const w = k === 2 ? 11 : side;
      arches.push({ a0: a, a1: a + w, rise: k === 2 ? 2.4 : 2.15 });
      a += w + 1.2;
    }
  }
  const brick = C.brick;
  pen.begin();
  pen.wall("y+", 0, 0, 0, L, 0).extrude(arched(L, wz, 0, arches), D, brick, { crease: 25 });
  roadOn(pen, L, 0.95, wd - 0.8);
  pen.floor(0, 1).rect(0, wd + 0.25, L, D - 0.4, C.cobble, { grain: 0.7 });
  const f = pen.wall("y+", 0, 0, 0, L, D);
  dressFace(f, L, wz, 0, arches, brick);
  f.rect(0, -0.3, L, 0, C.quayCap, { grain: 0.5 });
  f.seg(0, -0.3, L, -0.3, { w: 0.07 });
  pen.floor(wz, 2).rect(1, 0.3, L - 1, D - 0.2, C.waterDeep, { grain: 0.6 });
  pen.end();

  // the road's north parapet
  pen.obj(() => pen.wall("y+", 0, 0.12, 0, L, 0).extrude(crenels(L, 0.8), 0.3, brick, { crease: 25 }), 0.2);
  for (const x of [arches[1].a1 + 0.6, arches[3].a0 - 0.6]) lamp(pen, x, 0.6, 0, 3.2);

  // the cloister: a back wall, the walk, and the arcade of pointed arches the camera looks through
  const n = 15;
  const bay = L / n;
  const open: Arch[] = [];
  const towers = [arches[1].a1 + 0.6, arches[3].a0 - 0.6];
  for (let k = 0; k < n; k++) {
    const c = (k + 0.5) * bay;
    if (towers.some((t) => Math.abs(c - t) < 1.5)) continue;
    open.push({ a0: c - 0.78, a1: c + 0.78, rise: 1.25, legs: 1.45, pointed: true });
  }
  pen.obj(() => {
    pen.box(0, wd - 0.35, 0, L, 0.35, 3.6, brick);
    const back = pen.wall("y+", 0, wd - 0.35, 0, L, 0.35);
    for (const o of open) back.poly(archPts(o, 0.05, 8), scaleRGB(brick, 0.62), { grain: 0.6 });
  }, 0.15);
  for (let k = 0; k < 6; k++) person(pen, rng.range(1.5, L - 1.5), wd + 1.2 + rng.range(-0.3, 0.5), 0, randomLook(rng), rng.pick(["stand", "walkA", "walkB"]), rng.chance(0.5));
  pen.obj(() => {
    pen.wall("y+", 0, D - 0.4, 0, L, 0).extrude(arched(L, 0, 3.6, open, 8), 0.4, brick, { crease: 25 });
    const face = pen.wall("y+", 0, D - 0.4, 0, L, 0.4);
    for (const o of open) {
      const ring = archPts(o, 0, 8).slice(2, -2);
      face.line(ring, { w: 0.16, color: C.quayCap, kind: L_MARK, wobble: 0.2 });
      // a lantern hangs in every arch
      face.seg((o.a0 + o.a1) / 2 - 0.02, 2.05, (o.a0 + o.a1) / 2 + 0.02, 2.05, { w: 0.5, kind: L_LIGHT, wobble: 0, alpha: 0.85 });
    }
    face.ticks(0.2, 2.9, L - 0.2, 3.5, { n: Math.round(L * 1.3), len: 0.5, ang: 0, jit: 0.02, color: scaleRGB(brick, 0.8), w: 0.06 });
  }, 0.25);

  // its roof is the track bed, between two battlemented parapets
  pen.obj(() => {
    pen.box(0, wd - 0.35, 3.6, L, CLOISTER + 0.35, TRACK_Z - 3.6, brick, { top: C.ballast });
    const band = pen.wall("y+", 0, wd - 0.35, 3.6, L, CLOISTER + 0.35);
    band.rect(0, 0, L, 0.22, C.quayCap, { grain: 0.5 });
    for (const o of [-0.55, 0.55]) {
      pen.stroke(
        [
          [0, TRACK_Y - Y1 + wd + o, TRACK_Z + 0.03],
          [L, TRACK_Y - Y1 + wd + o, TRACK_Z + 0.03],
        ],
        { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.15, layer: 2 },
      );
    }
  }, 0.35);
  for (const y of [wd - 0.3, D - 0.32]) pen.obj(() => pen.wall("y+", 0, y, TRACK_Z, L, 0).extrude(crenels(L, 0.7, 1.0, 0.4), 0.28, brick, { crease: 25 }), 0.42);

  // the two towers, on the piers either side of the middle arch
  for (const tx of towers) {
    const x0 = tx - 1.3;
    const y0 = D - 0.5;
    const w = 2.6;
    pen.obj(() => {
      pen.box(x0, y0, wz, w, w, 9.6 - wz, brick);
      for (const sd of ["x+", "y+"] as const) {
        const tf = pen.wall(sd, x0, y0, wz, w, w);
        const up = -wz;
        tf.rect(0, up - 0.3, w, up, C.quayCap, { grain: 0.5 });
        tf.rect(0, up + 3.5, w, up + 3.8, C.quayCap, { grain: 0.5 });
        archWindow(tf, w / 2 - 0.32, up + 5.2, w / 2 + 0.32, up + 7.2, true, C.quayCap);
        archWindow(tf, w / 2 - 0.26, up + 1.2, w / 2 + 0.26, up + 2.6, false, C.quayCap);
        tf.ticks(0.2, 0.3, w - 0.2, up + 9.3, { n: 46, len: 0.5, ang: 0, jit: 0.02, color: scaleRGB(brick, 0.8), w: 0.06 });
        tf.seg(0, 0.02, w, 0.02, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
      }
    }, 0.3);
    // the gallery, wider than the shaft, with its battlements; then the lantern and the spire
    pen.obj(() => {
      pen.box(x0 - 0.3, y0 - 0.3, 9.6, w + 0.6, w + 0.6, 0.55, brick, { top: C.stone });
      for (const sd of ["x+", "y+"] as const) {
        // (the parapet stands on the gallery's outer edge, a quarter of a unit thick)
        const wl = sd === "x+" ? pen.wall("x+", x0 - 0.3, y0 - 0.3, 10.15, w + 0.35, w + 0.6) : pen.wall("y+", x0 - 0.3, y0 - 0.3, 10.15, w + 0.6, w + 0.35);
        wl.extrude(crenels(w + 0.6, 0.6, 0.8, 0.32), 0.25, brick, { crease: 25 });
      }
    }, 0.48);
    pen.obj(() => {
      pen.box(x0 + 0.35, y0 + 0.35, 10.15, w - 0.7, w - 0.7, 1.9, brick);
      for (const sd of ["x+", "y+"] as const) archWindow(pen.wall(sd, x0 + 0.35, y0 + 0.35, 10.15, w - 0.7, w - 0.7), 0.5, 0.3, w - 1.2, 1.6, true, C.quayCap);
    }, 0.58);
    pen.obj(() => {
      pen.pyramid(x0 + 0.1, y0 + 0.1, 12.05, w - 0.2, w - 0.2, 3.4, C.tile);
      pen.pole([tx, y0 + w / 2, 15.4], [tx, y0 + w / 2, 16.5], 0.07, C.gold, { ink: false });
    }, 0.7);
  }
}

// ---------------------------------------------------------------- the two footbridges of the axis

/** A white marble figure on a tall pedestal: the Schlossbrücke has eight; four are drawn. */
function statue(pen: Pen, x: number, y: number, z: number, flip: boolean): void {
  pen.begin();
  pen.box(x - 0.32, y - 0.32, z, 0.64, 0.64, 1.5, C.sandstoneLight, { w: W_THIN });
  const c = pen.card(x, y, z + 1.5, flip);
  const marble = C.white;
  // a goddess with a wing and a warrior at her knee, as far as a few strokes can say it
  c.poly(
    [
      [-0.3, 0],
      [0.32, 0],
      [0.22, 0.95],
      [-0.2, 0.95],
    ],
    marble,
    { outline: true, w: W_FINE, layer: 1 },
  );
  c.circle(0.02, 1.2, 0.24, marble, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  c.poly(
    [
      [-0.2, 0.85],
      [-0.85, 1.45],
      [-0.72, 0.7],
      [-0.3, 0.5],
    ],
    marble,
    { outline: true, w: W_FINE, layer: 1 },
  );
  c.bar(0.22, 0.85, 0.6, 1.4, 0.13, marble, { layer: 2 });
  c.circle(0.42, 0.42, 0.2, marble, { outline: true, w: W_FINE, layer: 3, seg: 8 });
  pen.end();
}

/** One low arch from bank to island: the body, a paved deck level with the sidewalks, and something to lean on. */
function footbridge(pen: Pen, rng: Rng, L: number, wd: number, stone: RGB, statues: boolean): void {
  const wz = WATER;
  const top = CURB;
  const arches: Arch[] = [{ a0: 0.9, a1: L - 0.9, rise: top - wz - 0.75 }];
  pen.begin();
  pen.wall("y+", 0, 0, 0, L, 0).extrude(arched(L, wz, top, arches), wd, stone, { crease: 25 });
  pen.floor(top, 1).rect(-0.2, 0.5, L + 0.2, wd - 0.5, C.plaza, { grain: 0.7 });
  const f = pen.wall("y+", 0, 0, 0, L, wd);
  dressFace(f, L, wz, top, arches, stone);
  pen.floor(wz, 2).rect(0.9, 0.2, L - 0.9, wd - 0.2, C.waterDeep, { grain: 0.6 });
  pen.end();
  for (const y of [0.22, wd - 0.22]) {
    railing(
      pen,
      [
        [0.2, y, top],
        [L - 0.2, y, top],
      ],
      0.85,
      statues ? hex("#3d4a44") : C.steelDark,
      1.1,
    );
    if (statues) {
      statue(pen, 0.75, y, top, y < 1);
      statue(pen, L - 0.75, y, top, y > 1);
    } else lamp(pen, L / 2, y, top, 2.9);
  }
  if (rng.chance(0.9)) person(pen, L * 0.4, wd - 0.7, top, randomLook(rng), "stand", false);
}

/** The Schlossbrücke (with Schinkel's statues) from the Linden to the island, and a plainer bridge on to Alexanderplatz. */
export function axisBridges(pen: Pen, rng: Rng): void {
  pen.push(RX0, AXIS_Y - AXIS_W / 2, 0);
  footbridge(pen, rng, ISLAND.x0 - RX0, AXIS_W, C.sandstoneLight, true);
  pen.pop();
  pen.push(ISLAND.x1, AXIS_Y - AXIS_W / 2, 0);
  footbridge(pen, rng, RX1 - ISLAND.x1, AXIS_W, C.sandstone, false);
  pen.pop();
}

// ---------------------------------------------------------------- the U1

/** The ends of the line: a station in Kreuzberg and the terminus in Friedrichshain. */
const U_WEST = COL_X[1] + 8;
const U_EAST = COL_X[2] + 34;
const U_HALF = 1.45;

/** The blue sign with a white U that marks an underground station. */
export function uSign(pen: Pen, x: number, y: number, z: number, h = 3.2): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.12, C.greyDark);
  const c = pen.card(x, y, z + h);
  c.rect(-0.5, 0, 0.5, 1.0, C.blue, { outline: true, w: W_FINE, layer: 1, glow: 0.25 });
  c.line(
    [
      [-0.24, 0.8],
      [-0.24, 0.36],
      [-0.1, 0.2],
      [0.1, 0.2],
      [0.24, 0.36],
      [0.24, 0.8],
    ],
    { w: 0.13, color: C.white, kind: L_MARK, wobble: 0, layer: 2 },
  );
  pen.end();
}

function uCar(pen: Pen, end: -1 | 0 | 1): void {
  const L = 4.9;
  const W = 2.4;
  pen.box(-L / 2 + 0.4, -W / 2 + 0.15, 0, L - 0.8, W - 0.3, 0.4, C.charcoal, { edges: false });
  pen.box(-L / 2, -W / 2, 0.4, L, W, 2.15, C.bvg, { top: C.slateLight, w: 0.11 });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -L / 2, -W / 2, 0.4, L, W);
    if (!f.visible) continue;
    const w = side.startsWith("y") ? L : W;
    if (side.startsWith("y")) {
      // two pairs of doors and three windows
      const slots: [number, number, boolean][] = [
        [0.25, 1.05, false],
        [1.15, 1.85, true],
        [1.95, 2.95, false],
        [3.05, 3.75, true],
        [3.85, 4.65, false],
      ];
      for (const [a0, a1, door] of slots) {
        if (door) {
          f.rect(a0, 0.12, a1, 1.9, C.bvgDark, { outline: true, w: W_FINE, layer: 1 });
          f.rect(a0 + 0.08, 0.95, a1 - 0.08, 1.75, C.glass, { layer: 2, glow: 0.8 });
          f.seg((a0 + a1) / 2, 0.12, (a0 + a1) / 2, 1.9, { w: 0.05, wobble: 0, layer: 3 });
        } else f.rect(a0, 0.95, a1, 1.8, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.8 });
      }
    } else if ((side === "x+" && end === 1) || (side === "x-" && end === -1)) {
      f.rect(0.25, 0.95, w - 0.25, 1.85, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.8 });
      f.rect(0.3, 0.3, 0.6, 0.55, C.lamp, { layer: 1, glow: 1 });
      f.rect(w - 0.6, 0.3, w - 0.3, 0.55, C.lamp, { layer: 1, glow: 1 });
    }
  }
}

/**
 * The U1 on its viaduct: riveted iron on legs that stand on the paper just
 * outside the city's southern edge, a station at each end, and the train
 * that shuttles between them over the Oberbaumbrücke. `cue` is when the
 * camera reaches the far side of the river (or null): the train sets off so
 * as to be on the bridge just then.
 */
export function elevated(pen: Pen, movers: Mover[], born: number, cue: () => number | null): void {
  const y = TRACK_Y;
  const z0 = WATER;
  const gz = TRACK_Z - 0.75;
  const stretch = (x0: number, x1: number) => {
    const len = x1 - x0;
    pen.obj(() => {
      pen.box(x0, y - U_HALF, gz, len, U_HALF * 2, 0.75, C.steel, { top: C.ballast });
      const f = pen.wall("y+", x0, y - U_HALF, gz, len, U_HALF * 2);
      const bays = Math.round(len / 2.2);
      const bw = len / bays;
      for (let k = 0; k < bays; k++) {
        f.seg(k * bw, 0.08, (k + 1) * bw, 0.67, { w: 0.07, color: C.steelDark, kind: L_MARK, wobble: 0 });
        f.seg(k * bw, 0.67, (k + 1) * bw, 0.08, { w: 0.07, color: C.steelDark, kind: L_MARK, wobble: 0 });
      }
      for (const o of [-0.55, 0.55]) {
        pen.stroke(
          [
            [x0, y + o, TRACK_Z + 0.03],
            [x1, y + o, TRACK_Z + 0.03],
          ],
          { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.15, layer: 2 },
        );
      }
    });
    // legs in pairs, braced
    const n = Math.max(2, Math.round(len / 6.6));
    for (let k = 0; k <= n; k++) {
      const x = x0 + 0.6 + (k * (len - 1.2)) / n;
      pen.obj(() => {
        for (const o of [-1.05, 1.05]) {
          pen.box(x - 0.35, y + o - 0.35, z0, 0.7, 0.7, 0.35, C.stoneDark, { w: W_THIN });
          pen.pole([x, y + o, z0 + 0.35], [x, y + o, gz], 0.26, C.steel);
        }
        pen.stroke(
          [
            [x, y - 1.05, gz - 0.25],
            [x, y + 1.05, gz - 0.25],
          ],
          { w: 0.16, color: C.steelDark, kind: L_BAR, wobble: 0 },
        );
        pen.stroke(
          [
            [x, y - 1.05, gz - 2.2],
            [x, y, gz - 0.3],
            [x, y + 1.05, gz - 2.2],
          ],
          { w: 0.1, color: C.steelDark, kind: L_BAR, wobble: 0 },
        );
      });
    }
  };
  stretch(U_WEST, RX0);
  stretch(RX1, U_EAST);

  // a station at each end: a platform on the camera's side, a roof on posts, a brick stair tower, a sign
  const station = (x0: number, x1: number, towerAt: number, rng: Rng) => {
    const len = x1 - x0;
    const py = y + U_HALF;
    pen.obj(() => {
      pen.box(x0, py, TRACK_Z - 0.45, len, 1.9, 0.85, C.steel, { top: C.cobble });
      const f = pen.wall("y+", x0, py, TRACK_Z - 0.45, len, 1.9);
      f.rect(0, 0.62, len, 0.85, C.bvg, { grain: 0.4, layer: 1 });
    }, 0.1);
    const pz = TRACK_Z + 0.4;
    pen.obj(() => {
      for (let a = 0.8; a < len; a += 3.4) {
        pen.pole([x0 + a, py + 1.55, pz], [x0 + a, py + 1.55, pz + 3.1], 0.14, C.steelDark);
        pen.pole([x0 + a, y - U_HALF + 0.1, TRACK_Z], [x0 + a, y - U_HALF + 0.1, pz + 3.5], 0.14, C.steelDark);
      }
      // a shallow roof of glass and zinc over track and platform, higher at the back
      pen.fill(
        [
          [x0 - 0.4, y - U_HALF - 0.2, pz + 3.6],
          [x1 + 0.4, y - U_HALF - 0.2, pz + 3.6],
          [x1 + 0.4, py + 2.0, pz + 3.05],
          [x0 - 0.4, py + 2.0, pz + 3.05],
        ],
        C.glassPale,
        { outline: true, w: W_THIN, grain: 0.5, glow: 0.35 },
      );
      for (let a = 0.6; a < len; a += 1.7) {
        pen.stroke(
          [
            [x0 + a, y - U_HALF - 0.2, pz + 3.62],
            [x0 + a, py + 2.0, pz + 3.07],
          ],
          { w: 0.06, color: C.zinc, kind: L_MARK, wobble: 0 },
        );
      }
    }, 0.3);
    for (let k = 0; k < 6; k++) person(pen, x0 + rng.range(1, len - 1), py + rng.range(0.7, 1.3), pz, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
    // the stair tower down to the street, in the railway's own brick
    const tx = towerAt;
    pen.obj(() => {
      pen.box(tx, y - 1.7, z0, 3.4, 4.4, TRACK_Z + 3.6 - z0, C.brickRose);
      for (const sd of ["x+", "y+"] as const) {
        const tf = pen.wall(sd, tx, y - 1.7, z0, 3.4, 4.4);
        const w = sd === "x+" ? 4.4 : 3.4;
        archWindow(tf, w / 2 - 0.5, -z0 + 4.9, w / 2 + 0.5, -z0 + 6.9, true, C.quayCap);
        archWindow(tf, w / 2 - 0.5, -z0 + 1.6, w / 2 + 0.5, -z0 + 3.4, true, C.quayCap);
        if (sd === "y+") tf.rect(w / 2 - 0.6, 0, w / 2 + 0.6, 2.2, C.door, { outline: true, w: W_FINE, layer: 1 });
        tf.rect(0, -z0 + 4.1, w, -z0 + 4.4, C.quayCap, { grain: 0.5 });
      }
    }, 0.2);
    pen.obj(() => pen.pyramid(tx - 0.2, y - 1.9, TRACK_Z + 3.6, 3.8, 4.8, 2.6, C.tile), 0.36);
    uSign(pen, tx + 1.7, y + 3.4, z0, 3.4);
  };
  station(U_WEST, U_WEST + 17, U_WEST - 3.6, new Rng(611));
  station(U_EAST - 17, U_EAST, U_EAST + 0.2, new Rng(612));

  // the train: four short yellow cars
  const cars = [makeSprite((p) => uCar(p, -1), 0, 81), makeSprite((p) => uCar(p, 0), 0, 82), makeSprite((p) => uCar(p, 0), 0, 83), makeSprite((p) => uCar(p, 1), 0, 84)];
  const xa = U_WEST + 9;
  const xb = U_EAST - 9;
  const RUN = 11;
  const DWELL = 4.2;
  const T = 2 * (RUN + DWELL);
  movers.push((m) => {
    if (m.t < born) return;
    const at = cue();
    // without a tour it simply runs to its own timetable
    const t0 = at != null ? at - (DWELL + RUN * 0.42) : born;
    const ph = (((m.t - t0) % T) + T) % T;
    const u = ph < DWELL ? 0 : ph < DWELL + RUN ? smooth(0, 1, (ph - DWELL) / RUN) : ph < 2 * DWELL + RUN ? 1 : 1 - smooth(0, 1, (ph - 2 * DWELL - RUN) / RUN);
    const xc = xa + (xb - xa) * u;
    for (let k = 0; k < 4; k++) m.put(cars[k], xc + (k - 1.5) * 5.1, y, TRACK_Z, born);
  });
}
