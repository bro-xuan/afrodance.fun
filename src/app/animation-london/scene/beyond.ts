// What lies beyond the slab: the river's two reaches, and the sky. Upstream,
// houseboats along the bank, swans, and two rowing eights racing each other
// up the middle. Downstream, the steel hoods of the flood barrier. Overhead,
// an airliner every half minute on its way in to land.

import { RGB, Rng, V2, V3, hex } from "../engine/math";
import { F_NEON, L_BAR, L_RIPPLE, Pen } from "../engine/pen";
import { houseboat } from "./boats";
import { WATER } from "./bridges";
import { swan } from "./folk";
import { Look, person } from "./kit";
import { Route, Turning, makeSprite, rounded, traveler } from "./motion";
import { C, HAIR, SKIN } from "./palette";
import { Mover } from "./types";

/** A cross-section of the river beyond the slab (the city hands these over). */
export interface ReachPt {
  x: number;
  y: number;
  hw: number;
  nx: number;
  ny: number;
  u: number;
}

/** A point of a reach at distance u from the slab, `off` units across the stream from its middle. */
function across(pts: ReachPt[], u: number, off: number): V2 {
  const k = Math.max(0, Math.min(pts.length - 2, Math.floor(u / (pts[1].u - pts[0].u))));
  const a = pts[k];
  const b = pts[k + 1];
  const f = (u - a.u) / (b.u - a.u);
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  return [x + (a.nx + (b.nx - a.nx) * f) * off, y + (a.ny + (b.ny - a.ny) * f) * off];
}

/** Which way the river runs at distance u, in degrees (for turning a boat to lie along it). */
function bearing(pts: ReachPt[], u: number): number {
  const p = across(pts, u, 0);
  const q = across(pts, u + 3, 0);
  return (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
}

// ---------------------------------------------------------------- a rowing eight

/** A coxed eight, bow towards local +x. `f` is the phase of the stroke: catch, drive, finish, recovery. */
function eight(pen: Pen, crew: Look[], f: number, blade: RGB): void {
  const shell: V2[] = [
    [-4.6, 0],
    [-3.7, -0.42],
    [3.6, -0.42],
    [4.6, 0],
    [3.6, 0.42],
    [-3.7, 0.42],
  ];
  pen.extrude(shell, -0.05, 0.26, C.cream, { top: C.woodDark, crease: 25, w: 0.09 });
  const swing = [0.62, 0.0, -0.62, 0.0][f];
  const lift = f === 3 ? 0.42 : 0.03;
  const lean = [-0.16, 0.0, 0.18, 0.02][f];
  for (let i = 0; i < 8; i++) {
    const x = 2.8 - i * 0.8;
    const s = i % 2 === 0 ? 1 : -1;
    // the oar, from its lock out to the blade
    const lx = x - 0.12;
    const ex = lx + Math.sin(swing) * 1.2;
    const ey = s * (0.5 + Math.cos(swing) * 1.2);
    pen.stroke(
      [
        [lx, s * 0.5, 0.42],
        [ex, ey, lift],
      ],
      { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [lx + (ex - lx) * 0.76, s * 0.5 + (ey - s * 0.5) * 0.76, 0.42 + (lift - 0.42) * 0.76],
        [ex, ey, lift],
      ],
      { w: f === 3 ? 0.09 : 0.2, color: blade, kind: L_BAR, wobble: 0 },
    );
    person(pen, x + lean, 0, 0.14, crew[i], "bust", i % 2 === 0);
  }
  person(pen, -3.65, 0, 0.14, crew[8], "bust", false, 0.8);
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [-4.6, s * 0.1, 0.03],
        [-5.7, s * 0.5, 0.03],
      ],
      { w: 0.09, color: C.white, kind: L_RIPPLE, wobble: 0.5, alpha: 0.85 },
    );
  }
}

/** Two crews, one in dark blue and one in light, racing up the reach and paddling back down along the banks. */
function boatRace(movers: Mover[], west: ReachPt[], born: number): void {
  const rng = new Rng(1829);
  const colours: RGB[] = [hex("#1f3a6e"), hex("#8fd0e6")];
  colours.forEach((col, q) => {
    const side = q === 0 ? 1 : -1;
    const pts: V3[] = [];
    // up the middle, side by side with the other crew
    for (let u = 20; u <= 104; u += 6) {
      const p = across(west, u, side * 2.6);
      pts.push([p[0], p[1], WATER]);
    }
    // round, and back down close to this crew's own bank
    for (let u = 104; u >= 20; u -= 6) {
      const p = across(west, u, side * 8.4);
      pts.push([p[0], p[1], WATER]);
    }
    const route = new Route(rounded(pts, true, 2.6), true);
    const crew: Look[] = [];
    for (let i = 0; i < 9; i++) crew.push({ skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: i === 8 ? C.white : col, legs: C.navy, long: rng.chance(0.5), hat: null });
    const strokes = [0, 1, 2, 3].map((f) => new Turning((p) => eight(p, crew, f, col), 32, 300 + q * 10 + f));
    movers.push(
      traveler(route, {
        speed: 4.4,
        at: 0.02 + q * 0.004,
        born: born + 0.5 + q * 0.3,
        span: 3.2,
        sprite: (h, t) => strokes[Math.floor(t * 2.6 + q * 0.5) & 3].at(h),
      }),
    );
  });
}

// ---------------------------------------------------------------- the flood barrier

/** The barrier: a row of piers across the river, each under a hood of bright steel. */
function barrier(pen: Pen, east: ReachPt[], u: number, t: number): void {
  const steel = hex("#c3ccd3");
  const steelD = hex("#96a2ab");
  const deg = bearing(east, u);
  const k = Math.floor(u / (east[1].u - east[0].u));
  const hw = east[k].hw;
  const n = Math.max(4, Math.round((hw * 2) / 7.4) - 1);
  for (let i = 0; i < n; i++) {
    const off = -hw + ((i + 1) * hw * 2) / (n + 1);
    const p = across(east, u, off);
    const small = i === 0 || i === n - 1;
    pen.reveal = () => t + i * 0.08;
    pen.push(p[0], p[1], WATER, deg, small ? 0.72 : 1);
    pen.begin();
    // a pier the shape of a boat, pointing up and down stream
    pen.extrude(
      [
        [-3.4, 0],
        [-2.2, -1.2],
        [2.2, -1.2],
        [3.4, 0],
        [2.2, 1.2],
        [-2.2, 1.2],
      ],
      -0.1,
      1.5,
      C.portlandDark,
      { top: C.portland, crease: 25, w: 0.1 },
    );
    // the hood: a stretched half-egg of steel plates
    const ribs = 5;
    const verts: V3[] = [];
    const seg = 8;
    for (let r = 0; r <= ribs; r++) {
      const fx = -2.4 + (4.8 * r) / ribs;
      const h = 3.6 * Math.sin((Math.PI * (r + 0.6)) / (ribs + 1.2));
      const w = 1.25 * Math.sin((Math.PI * (r + 0.5)) / (ribs + 1));
      for (let s = 0; s <= seg; s++) {
        const a = (Math.PI * s) / seg;
        verts.push([fx, Math.cos(a) * w, 1.5 + Math.sin(a) * h]);
      }
    }
    const faces: number[][] = [];
    const cols: RGB[] = [];
    for (let r = 0; r < ribs; r++) {
      for (let s = 0; s < seg; s++) {
        const a = r * (seg + 1) + s;
        faces.push([a, a + 1, a + seg + 2, a + seg + 1]);
        cols.push(s < seg / 2 ? steelD : steel);
      }
    }
    pen.solid(verts, faces, cols, { convex: true, crease: 50, w: 0.06, grain: 0.5 });
    pen.card(0, 0, 5.1).circle(0, 0.12, 0.14, C.red, { glow: 1, kind: F_NEON, seg: 6, grain: 0 });
    pen.end();
    pen.pop();
  }
}

// ---------------------------------------------------------------- the sky

/** An airliner seen side on, nose to the left. */
function airliner(pen: Pen, tail: RGB): void {
  const k = pen.card(0, 0, 0);
  const body = C.white;
  k.poly(
    [
      [-3.6, 0.12],
      [-3.0, 0.5],
      [2.6, 0.5],
      [3.5, 0.2],
      [3.4, -0.02],
      [-2.9, -0.3],
      [-3.4, -0.14],
    ],
    body,
    { outline: true, w: 0.07, grain: 0.2 },
  );
  // the fin, the wing, the far tailplane, an engine under the wing
  k.poly(
    [
      [2.2, 0.5],
      [3.5, 1.7],
      [3.9, 1.7],
      [3.3, 0.36],
    ],
    tail,
    { outline: true, w: 0.06, layer: 1, grain: 0.2 },
  );
  k.poly(
    [
      [-0.9, -0.05],
      [0.9, -0.05],
      [2.0, -0.95],
      [1.3, -0.95],
    ],
    hex("#dfe4e8"),
    { outline: true, w: 0.06, layer: 2, grain: 0.2 },
  );
  k.ellipse(0.25, -0.5, 0.5, 0.2, hex("#c9ced3"), { outline: true, w: 0.05, layer: 3, seg: 8 });
  for (let a = -2.5; a < 2.2; a += 0.42) k.seg(a, 0.24, a + 0.16, 0.24, { w: 0.09, color: C.glass, kind: L_BAR, wobble: 0, layer: 1 });
  k.seg(-3.2, 0.3, -2.95, 0.3, { w: 0.1, color: C.glass, kind: L_BAR, wobble: 0, layer: 1 });
  k.circle(3.5, 1.72, 0.1, C.red, { glow: 1, kind: F_NEON, seg: 6, grain: 0, layer: 2 });
  k.circle(-0.2, -0.36, 0.09, C.lamp, { glow: 1, seg: 6, grain: 0, layer: 4 });
}

/** An airliner crosses above the city every so often, right to left, losing height: on its way in to land. */
function planes(movers: Mover[], born: number): void {
  const tails: RGB[] = [C.royal, C.red, C.teal, C.orange];
  const sprites = tails.map((col, i) => makeSprite((pen) => airliner(pen, col), 0, 60 + i));
  const from: V3 = [250, -150, 66];
  const to: V3 = [-230, 330, 54];
  const period = 24.5;
  const flight = 10.5;
  movers.push((m) => {
    if (m.t < born) return;
    const n = Math.floor((m.t - 19) / period);
    const u = (m.t - 19 - n * period) / flight;
    if (u < 0 || u > 1) return;
    const x = from[0] + (to[0] - from[0]) * u;
    const y = from[1] + (to[1] - from[1]) * u;
    const z = from[2] + (to[2] - from[2]) * u;
    m.put(sprites[((n % sprites.length) + sprites.length) % sprites.length], x, y, z, born);
  });
}

/** Everything beyond the slab. `west` and `east` are the river's two reaches; `t` is when the river has arrived. */
export function beyond(pen: Pen, movers: Mover[], west: ReachPt[], east: ReachPt[], t: number, born: number): void {
  const rng = new Rng(1666);
  pen.rng = rng.fork();
  // houseboats along the north bank just above the first bridge
  for (const [u, len] of [
    [7, 9],
    [19, 11],
    [32, 8],
  ]) {
    const k = Math.floor(u / (west[1].u - west[0].u));
    const p = across(west, u, west[k].hw - 2.3);
    pen.reveal = () => t + 0.4 + u * 0.01;
    pen.push(p[0], p[1], WATER, bearing(west, u) + 180 + rng.range(-3, 3));
    houseboat(pen, rng, { L: len, lit: 0.8 });
    pen.pop();
  }
  // swans, who all belong to the Crown
  pen.reveal = () => t + 0.8;
  for (const [u, off] of [
    [12, -9],
    [14.5, -10.4],
    [16, -8.2],
    [48, 7.5],
    [51, 6.2],
    [78, -1],
  ]) {
    const p = across(west, u, off);
    swan(pen, p[0], p[1], WATER, rng.chance(0.5));
  }
  barrier(pen, east, 84, t + 0.9);
  boatRace(movers, west, born);
  planes(movers, born);
}
