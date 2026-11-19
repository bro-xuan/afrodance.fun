// Things with engines (and one with sails): the double-decker bus, the black
// cab, ordinary cars and vans, and the boats that work the Thames. Each is
// drawn at the origin pointing along local +x, wheels on z = 0 or waterline at
// z = 0, so the same drawing serves parked, moored or moving. London drives on
// the left: the kerb, and so the doors of a bus, is on the local -y side.

import { RGB, Rng, hex, scaleRGB } from "../engine/math";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../engine/pen";
import { hullShape, wake } from "./boats";
import { W_FINE, W_THIN, person, randomLook, unionJack } from "./kit";
import { Turning, lazy } from "./motion";
import { C, CAR, SKIN } from "./palette";

type Side = "x+" | "x-" | "y+" | "y-";
const SIDES: Side[] = ["x+", "x-", "y+", "y-"];

/** Two wheels' worth of tyres on both flanks of a vehicle. */
function wheels(pen: Pen, xs: number[], halfW: number, r: number): void {
  for (const y of [-halfW - 0.02, halfW + 0.02]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    for (const a of xs) {
      q.circle(a, r, r, C.black, { outline: true, w: W_FINE, seg: 10, grain: 0.3 });
      q.circle(a, r, r * 0.42, C.grey, { layer: 1, seg: 7, grain: 0 });
    }
  }
}

/** Headlamps at the front and red lamps at the back, with a little glow on the road after dark. */
function lamps(pen: Pen, front: Plane, back: Plane, w: number, b: number, nose: number): void {
  for (const a of [0.2, w - 0.52]) {
    front.rect(a, b, a + 0.32, b + 0.22, C.lamp, { outline: true, w: 0.035, glow: 1, layer: 1, grain: 0.2 });
    back.rect(a, b, a + 0.32, b + 0.2, C.red, { outline: true, w: 0.035, glow: 1, kind: F_NEON, layer: 1, grain: 0.2 });
  }
  for (const y of [-w / 2 + 0.4, w / 2 - 0.4]) {
    pen.stroke(
      [
        [nose + 0.5, y, 0.25],
        [nose + 0.55, y, 0.25],
      ],
      { w: 0.9, kind: L_LIGHT, wobble: 0, alpha: 0.35 },
    );
  }
}

// ---------------------------------------------------------------- the bus

export interface BusOpts {
  /** What the blind on the front says. */
  route?: string;
  /** Colour of the advert between the decks, or null for none. */
  ad?: RGB | null;
  seed?: number;
}

/** A red double-decker. */
export function bus(pen: Pen, o: BusOpts = {}): void {
  const rng = new Rng(o.seed ?? 3);
  const L = 8.6;
  const W = 2.5;
  const z0 = 0.4;
  const H = 4.1;
  const x0 = -L / 2;
  const y0 = -W / 2;
  const red = C.busRed;
  pen.begin();
  wheels(pen, [-2.7, 2.75], W / 2, 0.52);
  pen.box(x0, y0, z0, L, W, H, red, { w: 0.11 });
  // a pale panel along the roof
  pen.floor(z0 + H, 1).rect(x0 + 0.5, y0 + 0.4, x0 + L - 0.5, y0 + W - 0.4, hex("#e56a5f"), { outline: true, w: 0.04, grain: 0.5 });
  const heads = (f: Plane, a0: number, a1: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5 + rng.range(-0.25, 0.25)) * (a1 - a0)) / n;
      if (rng.chance(0.3)) continue;
      f.circle(a, b, 0.19, rng.pick(SKIN), { layer: 2, seg: 7, grain: 0 });
      f.ellipse(a, b + 0.1, 0.2, 0.2, rng.pick([C.black, C.woodDark, C.gold, C.greyDark, C.brick]), { layer: 3, seg: 7, grain: 0, a0: 0, a1: Math.PI });
    }
  };
  for (const side of SIDES) {
    const f = pen.wall(side, x0, y0, z0, L, W);
    const w = side.startsWith("y") ? L : W;
    if (side.startsWith("y")) {
      // a: distance along the wall as the camera sees it; xv: where that is on the bus
      const at = (xv: number) => (side === "y+" ? xv + L / 2 : L / 2 - xv);
      const kerb = side === "y-";
      for (const [b0, b1, n] of [
        [0.95, 1.85, 5],
        [2.72, 3.62, 6],
      ]) {
        f.rect(0.35, b0, w - 0.35, b1, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
        for (let a = 0.35 + 1.13; a < w - 0.5; a += 1.13) f.seg(a, b0, a, b1, { w: 0.07, color: red, kind: L_MARK, wobble: 0, layer: 1 });
        heads(f, 0.6, w - 0.6, b0 + 0.3, n);
      }
      // the band between the decks, and the advert it carries
      f.seg(0, 2.05, w, 2.05, { w: 0.05, color: C.busRedDark, kind: L_MARK, wobble: 0 });
      if (o.ad) {
        f.rect(1.3, 2.08, w - 1.3, 2.6, o.ad, { outline: true, w: 0.04, grain: 0.4, layer: 1 });
        f.seg(1.7, 2.34, w - 1.7, 2.34, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.3, layer: 2 });
      }
      // wheel arches
      for (const xv of [-2.7, 2.75]) f.ellipse(at(xv), -0.02, 0.66, 0.42, C.busRedDark, { a0: 0, a1: Math.PI, layer: 1, grain: 0.3, seg: 8 });
      if (kerb) {
        // doors, on the kerb side
        for (const xv of [3.25, -0.4]) {
          const a = at(xv);
          f.rect(a - 0.55, 0.12, a + 0.55, 1.9, C.glassLight, { outline: true, w: W_FINE, glow: 0.85, layer: 1, grain: 0.3 });
          f.seg(a, 0.12, a, 1.9, { w: 0.05, wobble: 0, layer: 2 });
        }
      }
    } else if (side === "x+") {
      // the front: two windscreens with the blind between them, and the driver on the right
      f.rect(0.18, 0.85, w - 0.18, 1.92, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
      f.rect(0.18, 2.72, w - 0.18, 3.66, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
      f.rect(0.3, 2.04, w - 0.3, 2.58, C.black, { outline: true, w: 0.04, grain: 0.2, layer: 1 });
      f.text(o.route ?? "24", w / 2, 2.14, 0.34, { align: "c", color: C.yellow, kind: L_MARK, w: 0.07, wobble: 0.2, layer: 2 });
      f.circle(0.62, 1.42, 0.2, SKIN[1], { layer: 2, seg: 7, grain: 0 });
      f.rect(0.4, 0.85, 0.84, 1.2, C.navy, { layer: 2, grain: 0 });
      heads(f, 0.3, w - 0.3, 3.05, 2);
    } else {
      f.rect(0.2, 2.72, w - 0.2, 3.62, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
      f.rect(0.35, 0.75, w - 0.35, 1.85, C.busRedDark, { outline: true, w: 0.04, grain: 0.4 });
      for (let b = 0.95; b < 1.8; b += 0.2) f.seg(0.5, b, w - 0.5, b, { w: 0.04, color: C.black, kind: L_MARK, wobble: 0, layer: 1, alpha: 0.6 });
      f.rect(0.5, 2.08, w - 0.5, 2.56, C.white, { outline: true, w: 0.035, grain: 0.3, layer: 1 });
      f.text(o.route ?? "24", w / 2, 2.17, 0.28, { align: "c", w: 0.055, wobble: 0.2, layer: 2 });
    }
  }
  lamps(pen, pen.wall("x+", x0, y0, z0, L, W), pen.wall("x-", x0, y0, z0, L, W), W, 0.22, L / 2);
  pen.end();
}

// ---------------------------------------------------------------- cab, car, van

/** A black cab, its light on. */
export function cab(pen: Pen, color: RGB = C.cab): void {
  const L = 4.5;
  const W = 1.9;
  const dark = scaleRGB(color, 0.8);
  pen.begin();
  wheels(pen, [-1.4, 1.45], W / 2, 0.42);
  pen.box(-L / 2, -W / 2, 0.3, L, W, 0.92, color, { w: 0.1 });
  pen.box(-L / 2 + 0.12, -W / 2 + 0.08, 1.22, 3.05, W - 0.16, 0.82, color, { w: 0.1, top: dark });
  for (const side of SIDES) {
    const f = pen.wall(side, -L / 2 + 0.12, -W / 2 + 0.08, 1.22, 3.05, W - 0.16);
    const w = side.startsWith("y") ? 3.05 : W - 0.16;
    f.rect(0.16, 0.1, w - 0.16, 0.68, C.glass, { outline: true, w: 0.045, glow: 0.7, grain: 0.4 });
    if (side.startsWith("y")) {
      f.seg(w * 0.36, 0.1, w * 0.36, 0.68, { w: 0.06, color, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(w * 0.68, 0.1, w * 0.68, 0.68, { w: 0.06, color, kind: L_MARK, wobble: 0, layer: 1 });
    }
  }
  // the FOR HIRE light
  pen.box(0.35, -0.3, 2.04, 0.3, 0.6, 0.17, C.orange, { w: 0.04, glow: 1, kind: F_NEON });
  const fr = pen.wall("x+", -L / 2, -W / 2, 0.3, L, W);
  fr.rect(0.55, 0.3, W - 0.55, 0.72, C.greyDark, { outline: true, w: 0.035, layer: 1, grain: 0.3 });
  lamps(pen, fr, pen.wall("x-", -L / 2, -W / 2, 0.3, L, W), W, 0.42, L / 2);
  pen.end();
}

/** A small car. */
export function car(pen: Pen, color: RGB = CAR[0], s = 1): void {
  const L = 3.9;
  const W = 1.76;
  pen.push(0, 0, 0, 0, s);
  pen.begin();
  wheels(pen, [-1.2, 1.25], W / 2, 0.38);
  pen.box(-L / 2, -W / 2, 0.26, L, W, 0.74, color, { w: 0.1 });
  pen.box(-L / 2 + 0.5, -W / 2 + 0.1, 1.0, 2.3, W - 0.2, 0.62, color, { w: 0.1, top: scaleRGB(color, 0.9) });
  for (const side of SIDES) {
    const f = pen.wall(side, -L / 2 + 0.5, -W / 2 + 0.1, 1.0, 2.3, W - 0.2);
    const w = side.startsWith("y") ? 2.3 : W - 0.2;
    f.rect(0.14, 0.08, w - 0.14, 0.52, C.glass, { outline: true, w: 0.045, glow: 0.6, grain: 0.4 });
    if (side.startsWith("y")) f.seg(w * 0.5, 0.08, w * 0.5, 0.52, { w: 0.06, color, kind: L_MARK, wobble: 0, layer: 1 });
  }
  lamps(pen, pen.wall("x+", -L / 2, -W / 2, 0.26, L, W), pen.wall("x-", -L / 2, -W / 2, 0.26, L, W), W, 0.36, L / 2);
  pen.end();
  pen.pop();
}

/** A van: white for trades, red for the post. */
export function van(pen: Pen, color: RGB = C.white, stripe: RGB | null = null): void {
  const L = 4.8;
  const W = 1.95;
  pen.begin();
  wheels(pen, [-1.5, 1.55], W / 2, 0.42);
  pen.box(-L / 2, -W / 2, 0.3, L, W, 1.85, color, { w: 0.1 });
  pen.box(L / 2, -W / 2 + 0.05, 0.3, 0.5, W - 0.1, 0.85, color, { w: 0.1 });
  for (const side of SIDES) {
    const f = pen.wall(side, -L / 2, -W / 2, 0.3, L, W);
    const w = side.startsWith("y") ? L : W;
    if (side === "x+") f.rect(0.18, 0.95, w - 0.18, 1.7, C.glass, { outline: true, w: 0.045, glow: 0.6, grain: 0.4 });
    else if (side === "x-") {
      f.seg(w / 2, 0.1, w / 2, 1.75, { w: 0.05, wobble: 0 });
      f.rect(0.2, 1.0, w - 0.2, 1.6, C.glass, { outline: true, w: 0.045, grain: 0.4 });
    } else {
      const front = side === "y+" ? w - 1.25 : 0.2;
      f.rect(front, 0.95, front + 1.05, 1.68, C.glass, { outline: true, w: 0.045, glow: 0.6, grain: 0.4 });
      if (stripe) f.rect(side === "y+" ? 0.3 : 1.6, 0.55, side === "y+" ? w - 1.6 : w - 0.3, 0.85, stripe, { grain: 0.3, layer: 1 });
    }
  }
  lamps(pen, pen.wall("x+", L / 2, -W / 2 + 0.05, 0.3, 0.5, W - 0.1), pen.wall("x-", -L / 2, -W / 2, 0.3, L, W), W - 0.1, 0.38, L / 2 + 0.5);
  pen.end();
}

// ---------------------------------------------------------------- on the river

/** A river bus: a fast catamaran with a glass saloon, commuters inside. */
export function riverBus(pen: Pen, rng: Rng, moving = true): void {
  const navy = C.navy;
  pen.begin();
  pen.extrude(hullShape(10.4, 3.1, 0.24), -0.1, 0.62, navy, { top: C.white, crease: 28, w: 0.11 });
  pen.extrude(hullShape(10.45, 3.16, 0.24), 0.36, 0.5, C.orange, { crease: 28, w: W_FINE });
  const x0 = -4.4;
  const len = 7.2;
  pen.box(x0, -1.3, 0.62, len, 2.6, 1.0, C.white, { top: C.glassPale, w: W_THIN });
  for (const side of SIDES) {
    const f = pen.wall(side, x0, -1.3, 0.62, len, 2.6);
    const w = side.startsWith("y") ? len : 2.6;
    f.rect(0.2, 0.25, w - 0.2, 0.85, C.glass, { outline: true, w: W_FINE, glow: 0.9, grain: 0.4 });
    const n = Math.round(w / 0.9);
    for (let i = 1; i < n; i++) f.seg((i * w) / n, 0.25, (i * w) / n, 0.85, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  // the raised wheelhouse and the open deck at the stern
  pen.box(1.2, -0.9, 1.62, 1.6, 1.8, 0.7, C.white, { top: navy, w: W_THIN });
  for (const side of SIDES) pen.wall(side, 1.2, -0.9, 1.62, 1.6, 1.8).rect(0.12, 0.15, side.startsWith("y") ? 1.48 : 1.68, 0.58, C.glass, { outline: true, w: 0.045, glow: 0.9 });
  person(pen, -4.75, 0.5, 0.5, randomLook(rng), "bust", false);
  person(pen, -4.75, -0.5, 0.5, randomLook(rng), "bust", true);
  pen.pole([-5.0, 0, 0.62], [-5.0, 0, 1.75], 0.07, C.white, { ink: false });
  unionJack(pen.card(-5.0, 0, 1.2), 0, 0, 0.8, 0.48, { sway: 0.25, fine: false });
  if (moving) wake(pen, -5.3, 1.5);
  pen.end();
}

/** A sightseeing boat: saloon below, sun deck above, everyone on the sun deck. */
export function tourBoat(pen: Pen, rng: Rng, stripe: RGB = C.red, moving = true): void {
  pen.begin();
  pen.extrude(hullShape(11.2, 2.9, 0.2), -0.12, 0.6, C.white, { top: C.cream, crease: 28, w: 0.11 });
  pen.extrude(hullShape(11.25, 2.96, 0.2), 0.34, 0.5, stripe, { crease: 28, w: W_THIN });
  const x0 = -4.2;
  const len = 7.4;
  pen.box(x0, -1.15, 0.6, len, 2.3, 0.86, C.white, { top: C.wood, w: W_THIN });
  for (const side of SIDES) {
    const f = pen.wall(side, x0, -1.15, 0.6, len, 2.3);
    const w = side.startsWith("y") ? len : 2.3;
    f.rect(0.2, 0.2, w - 0.2, 0.7, C.glass, { outline: true, w: W_FINE, glow: 0.8, grain: 0.4 });
    const n = Math.round(w / 0.95);
    for (let i = 1; i < n; i++) f.seg((i * w) / n, 0.2, (i * w) / n, 0.7, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  // rails round the sun deck, and the passengers
  for (const y of [-1.12, 1.12]) {
    pen.stroke(
      [
        [x0, y, 1.96],
        [x0 + len, y, 1.96],
      ],
      { w: 0.06, color: C.white, kind: L_BAR, wobble: 0 },
    );
    for (let a = 0; a <= len + 0.01; a += len / 6) {
      pen.stroke(
        [
          [x0 + a, y, 1.46],
          [x0 + a, y, 1.96],
        ],
        { w: 0.05, color: C.white, kind: L_BAR, wobble: 0 },
      );
    }
  }
  for (let i = 0; i < 9; i++) {
    if (rng.chance(0.2)) continue;
    person(pen, x0 + 0.6 + (i % 5) * 1.45 + rng.range(-0.2, 0.2), i < 5 ? 0.45 : -0.45, 1.32, randomLook(rng), rng.chance(0.25) ? "wave" : "bust", rng.chance(0.5), 0.9);
  }
  pen.box(3.35, -0.7, 0.6, 1.0, 1.4, 1.2, C.white, { top: stripe, w: W_THIN });
  pen.wall("x+", 3.35, -0.7, 0.6, 1.0, 1.4).rect(0.12, 0.55, 1.28, 1.05, C.glass, { outline: true, w: 0.045, glow: 0.8 });
  pen.pole([-5.3, 0, 0.6], [-5.3, 0, 1.8], 0.07, C.white, { ink: false });
  unionJack(pen.card(-5.3, 0, 1.25), 0, 0, 0.82, 0.5, { sway: 0.25, fine: false });
  if (moving) wake(pen, -5.6, 1.35);
  pen.end();
}

/** An orange speedboat full of people holding on. */
export function rib(pen: Pen, rng: Rng): void {
  pen.begin();
  pen.extrude(hullShape(5.4, 2.0, 0.42), -0.05, 0.5, C.orange, { top: C.charcoal, crease: 28, w: 0.1 });
  for (let i = 0; i < 6; i++) person(pen, -1.5 + Math.floor(i / 2) * 0.95, i % 2 === 0 ? 0.36 : -0.36, 0.28, randomLook(rng), i === 4 ? "cheer" : "bust", i % 2 === 0, 0.85);
  pen.box(-2.6, -0.4, 0.3, 0.45, 0.8, 0.6, C.black, { w: W_FINE });
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [-2.3, s * 0.7, 0.03],
        [-4.2, s * 1.5, 0.03],
        [-6.2, s * 1.9, 0.03],
      ],
      { w: 0.14, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
    );
  }
  pen.stroke(
    [
      [-2.7, 0, 0.03],
      [-5.0, 0.1, 0.03],
    ],
    { w: 0.2, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.85 },
  );
  pen.end();
}

/** A stubby tug. */
export function tug(pen: Pen, rng: Rng): void {
  pen.begin();
  pen.extrude(hullShape(5.2, 2.4, 0.36), -0.12, 0.75, C.charcoal, { top: C.woodDark, crease: 28, w: 0.11 });
  pen.box(-0.9, -0.75, 0.75, 2.2, 1.5, 1.15, C.white, { top: C.redDark, w: W_THIN });
  for (const side of SIDES) pen.wall(side, -0.9, -0.75, 0.75, 2.2, 1.5).rect(0.15, 0.5, side.startsWith("y") ? 2.05 : 1.35, 1.0, C.glass, { outline: true, w: 0.045, glow: 0.8 });
  pen.cyl(-1.35, 0, 0.75, 0.3, 1.5, C.red, { seg: 8, w: W_FINE, top: C.black });
  // old tyres along the side, for fenders
  for (const y of [-1.22, 1.22]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    for (const a of [-1.6, -0.5, 0.6]) q.circle(a, 0.5, 0.26, null, { w: 0.1, seg: 8, wobble: 0 });
  }
  person(pen, 0.9, 0, 0.6, randomLook(rng), "bust", false, 0.9);
  wake(pen, -2.6, 1.1);
  pen.end();
}

/** One of the yellow barges a tug tows down river, full of containers. */
export function lighter(pen: Pen): void {
  pen.begin();
  pen.extrude(
    [
      [-3.6, -1.25],
      [3.2, -1.25],
      [3.8, -0.7],
      [3.8, 0.7],
      [3.2, 1.25],
      [-3.6, 1.25],
    ],
    -0.1,
    0.55,
    C.charcoal,
    { top: C.greyDark, crease: 28, w: 0.11 },
  );
  for (let i = 0; i < 3; i++) pen.box(-3.3 + i * 2.25, -0.95, 0.55, 2.1, 1.9, 1.05, C.yellow, { w: 0.09, top: hex("#e0b030") });
  pen.end();
}

const SAIL = hex("#9a4a32");
const SAIL_D = hex("#7c3a27");

/** A Thames sailing barge under her rust-red sails. Bow towards local +x. */
export function sailingBarge(pen: Pen, rng: Rng): void {
  pen.begin();
  pen.extrude(hullShape(8.4, 2.5, 0.26), -0.15, 0.72, C.black, { top: C.wood, crease: 28, w: 0.11 });
  pen.extrude(hullShape(8.45, 2.56, 0.26), 0.5, 0.66, C.green, { crease: 28, w: W_FINE });
  // leeboards, hatch, the little cabin aft
  for (const s of [-1, 1]) {
    const lb = pen.plane([0.4, s * 1.32, 0.05], [1, 0, 0], [0, 0, 1], 0, true);
    lb.ellipse(0, 0.32, 1.05, 0.5, hex("#7a4a2c"), { outline: true, w: W_THIN, seg: 12 });
  }
  pen.box(-1.3, -0.72, 0.72, 3.0, 1.44, 0.24, C.woodDark, { top: C.greyDark, w: W_THIN });
  pen.box(-3.5, -0.7, 0.72, 1.3, 1.4, 0.5, C.white, { top: C.green, w: W_THIN });
  person(pen, -3.85, 0.15, 0.56, randomLook(rng), "bust", false);
  // main mast with the spritsail and topsail, a foresail, and a mizzen right aft
  const mx = 1.3;
  pen.pole([mx, 0, 0.72], [mx, 0, 9.4], 0.16, C.wood);
  const sp = pen.plane([0, 0.03, 0], [1, 0, 0], [0, 0, 1], 0, true);
  sp.poly(
    [
      [mx - 0.12, 1.5],
      [-2.9, 1.9],
      [-3.4, 6.9],
      [mx - 0.12, 6.2],
    ],
    SAIL,
    { outline: true, w: W_THIN, grain: 0.7 },
  );
  for (const k of [0.3, 0.6]) sp.seg(mx - 0.12 - k * 2.8, 1.5 + k * 0.4, mx - 0.12 - k * 3.3, 6.2 + k * 0.7, { w: 0.045, color: SAIL_D, kind: L_MARK, wobble: 0.4, layer: 1 });
  // the sprit: the long spar that holds the sail's peak up
  sp.bar(mx, 1.2, -3.5, 7.0, 0.1, C.woodDark, { layer: 1 });
  sp.poly(
    [
      [mx - 0.1, 6.5],
      [-2.6, 7.0],
      [mx - 0.1, 9.2],
    ],
    SAIL,
    { outline: true, w: W_THIN, grain: 0.7 },
  );
  sp.poly(
    [
      [mx + 0.14, 7.4],
      [4.1, 0.9],
      [mx + 0.3, 1.4],
    ],
    SAIL,
    { outline: true, w: W_THIN, grain: 0.7 },
  );
  pen.pole([-3.75, 0, 0.72], [-3.75, 0, 4.0], 0.09, C.wood);
  sp.poly(
    [
      [-3.85, 1.5],
      [-4.9, 1.7],
      [-3.85, 3.8],
    ],
    SAIL,
    { outline: true, w: W_FINE, grain: 0.7 },
  );
  const fl = pen.card(mx, 0, 9.4);
  fl.poly(
    [
      [0, 0],
      [1.1, -0.14],
      [0, -0.3],
    ],
    C.red,
    { outline: true, w: W_FINE, sway: 0.3 },
  );
  wake(pen, -4.2, 1.0);
  pen.end();
}

// ---------------------------------------------------------------- the fleets, drawn when first needed

const ADS: (RGB | null)[] = [hex("#f6c744"), hex("#7fb6e0"), null, hex("#f4efe2"), hex("#a57ad4"), hex("#3f9c97"), null, hex("#f08fb0")];
const ROUTES = ["24", "11", "9", "15", "73", "88", "159", "12"];

/** Eight buses on eight routes. */
export const buses = lazy(() => ROUTES.map((route, i) => new Turning((pen) => bus(pen, { route, ad: ADS[i], seed: 40 + i }), 32, 600 + i)));

/** Cabs: nearly all black. */
export const cabs = lazy(() => [C.cab, C.cab, C.cab, hex("#3b3f55"), C.cab].map((col, i) => new Turning((pen) => cab(pen, col), 32, 700 + i)));

/** Cars and vans. */
export const cars = lazy(() => {
  const list: Turning[] = [];
  CAR.forEach((col, i) => list.push(new Turning((pen) => car(pen, col, i % 4 === 3 ? 0.86 : 1), 32, 800 + i)));
  list.push(new Turning((pen) => van(pen, C.white), 32, 820));
  list.push(new Turning((pen) => van(pen, C.red, C.gold), 32, 821));
  list.push(new Turning((pen) => van(pen, hex("#e9e3d0"), C.green), 32, 822));
  return list;
});

export type BoatKind = "bus" | "tour" | "rib" | "tug" | "lighter";

/** The boats that go up and down the river all day. */
export const riverFleet = lazy(() => ({
  bus: [new Turning((pen) => riverBus(pen, new Rng(21)), 32, 901), new Turning((pen) => riverBus(pen, new Rng(22)), 32, 902)],
  tour: [C.red, C.blue, C.green].map((col, i) => new Turning((pen) => tourBoat(pen, new Rng(31 + i), col), 32, 910 + i)),
  rib: [new Turning((pen) => rib(pen, new Rng(41)), 32, 920)],
  tug: [new Turning((pen) => tug(pen, new Rng(51)), 32, 930)],
  lighter: [new Turning((pen) => lighter(pen), 32, 940)],
}));

/** How long each kind of boat is, for keeping them apart. */
export const BOAT_LEN: Record<BoatKind, number> = { bus: 10.4, tour: 11.2, rib: 5.4, tug: 5.2, lighter: 7.4 };

