// Things that float. Every boat is drawn at the origin with its bow towards
// local +x and z = 0 at the waterline, so the same drawing serves as a moored
// boat (drawn once into the city) or as a sprite that sails.

import { RGB, Rng, V2, scaleRGB } from "../engine/math";
import { L_BAR, L_RIPPLE, Pen } from "../engine/pen";
import { Look, W_FINE, W_THIN, person, randomLook, tree, windowAt } from "./kit";
import { C } from "./palette";

/** Outline of a hull seen from above: flat stern, pointed bow. */
export function hullShape(L: number, B: number, bow = 0.34): V2[] {
  const h = L / 2;
  const b = B / 2;
  return [
    [-h, -b * 0.78],
    [-h + L * 0.07, -b],
    [h - L * bow, -b],
    [h - L * bow * 0.45, -b * 0.7],
    [h, 0],
    [h - L * bow * 0.45, b * 0.7],
    [h - L * bow, b],
    [-h + L * 0.07, b],
    [-h, b * 0.78],
  ];
}

function wake(pen: Pen, stern: number, spread: number): void {
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [stern + 0.2, s * spread * 0.5, 0.03],
        [stern - 1.3, s * spread * 0.85, 0.03],
        [stern - 2.6, s * spread * 1.05, 0.03],
      ],
      { w: 0.11, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
    );
  }
  pen.stroke(
    [
      [stern - 0.4, 0, 0.03],
      [stern - 1.8, 0.1, 0.03],
    ],
    { w: 0.09, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.8 },
  );
}

export interface SloepOpts {
  color?: RGB;
  crew?: Look[];
  moving?: boolean;
  flag?: RGB | null;
}

/** An open launch: the boat a city takes out on its canals on a sunny evening. */
export function sloep(pen: Pen, rng: Rng, o: SloepOpts = {}): void {
  const col = o.color ?? C.white;
  pen.begin();
  pen.extrude(hullShape(5.6, 2.1), -0.12, 0.62, col, { top: C.wood, crease: 28, w: 0.11 });
  pen.floor(0.62, 1).poly(
    hullShape(4.5, 1.45).map((p) => [p[0] - 0.15, p[1]] as V2),
    C.woodDark,
    { outline: true, w: W_THIN },
  );
  const seats: V2[] = [
    [-1.5, 0.38],
    [-1.5, -0.38],
    [-0.3, 0.4],
    [-0.3, -0.4],
    [0.9, 0],
  ];
  const crew = o.crew ?? seats.filter(() => rng.chance(0.7)).map(() => randomLook(rng));
  for (let i = 0; i < Math.min(crew.length, seats.length); i++) {
    person(pen, seats[i][0], seats[i][1], 0.45, crew[i], "bust", rng.chance(0.5));
  }
  pen.box(-2.75, -0.3, 0.3, 0.5, 0.6, 0.55, C.charcoal, { w: W_THIN });
  if (o.flag !== null) {
    pen.pole([-2.55, 0.55, 0.6], [-2.55, 0.55, 1.75], 0.07, C.white, { ink: false });
    pen.card(-2.55, 0.55, 1.2).rect(0, 0, 0.75, 0.5, o.flag ?? C.red, { outline: true, w: W_FINE, sway: 0.25, layer: 1 });
  }
  if (o.moving) wake(pen, -2.8, 1.0);
  pen.end();
}

/** A glass-roofed canal cruise boat, low enough for the bridges. */
export function cruiseBoat(pen: Pen, rng: Rng, o: { stripe?: RGB; moving?: boolean } = {}): void {
  const stripe = o.stripe ?? C.blue;
  pen.begin();
  pen.extrude(hullShape(11.5, 2.8, 0.2), -0.12, 0.6, C.white, { top: C.cream, crease: 28, w: 0.11 });
  pen.extrude(
    hullShape(11.55, 2.86, 0.2),
    0.34,
    0.5,
    stripe,
    { crease: 28, w: W_THIN },
  );
  // glass cabin
  const x0 = -4.3;
  const len = 7.9;
  pen.box(x0, -1.12, 0.6, len, 2.24, 0.82, C.glassPale, { top: C.white, w: W_THIN, grain: 0.5, glow: 0.7 });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, x0, -1.12, 0.6, len, 2.24);
    const w = side.startsWith("y") ? len : 2.24;
    const n = Math.round(w / 0.95);
    for (let i = 1; i < n; i++) f.seg((i * w) / n, 0.04, (i * w) / n, 0.8, { w: 0.07, color: C.white, kind: 1, wobble: 0 });
    f.seg(0, 0.42, w, 0.42, { w: 0.05, color: C.white, kind: 1, wobble: 0 });
  }
  pen.box(x0 - 0.15, -1.22, 1.42, len + 0.3, 2.44, 0.12, C.white, { w: W_THIN });
  // passengers at the open stern, skipper's flag at the bow
  person(pen, -5.0, 0.45, 0.42, randomLook(rng), "bust", false);
  person(pen, -5.0, -0.45, 0.42, randomLook(rng), "bust", true);
  pen.pole([4.9, 0, 0.6], [4.9, 0, 1.5], 0.07, C.white, { ink: false });
  pen.card(4.9, 0, 1.05).rect(0, 0, 0.7, 0.45, C.red, { outline: true, w: W_FINE, sway: 0.25, layer: 1 });
  if (o.moving) wake(pen, -5.8, 1.35);
  pen.end();
}

/** A rowing boat or dinghy with one or two people in it. */
export function dinghy(pen: Pen, rng: Rng, color: RGB = C.wood, crew = 1): void {
  pen.begin();
  pen.extrude(hullShape(3.4, 1.4, 0.4), -0.08, 0.4, color, { top: scaleRGB(color, 0.8), crease: 28, w: 0.1 });
  for (let i = 0; i < crew; i++) person(pen, -0.5 + i * 0.9, 0, 0.22, randomLook(rng), "bust", i === 1);
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [0, s * 0.6, 0.45],
        [0.3, s * 1.7, 0.02],
      ],
      { w: 0.08, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
}

export interface HouseboatOpts {
  L?: number;
  color?: RGB;
  roof?: RGB;
  lit?: number;
}

/** A houseboat: a barge with a small house on it and a garden on the roof. */
export function houseboat(pen: Pen, rng: Rng, o: HouseboatOpts = {}): void {
  const L = o.L ?? 12;
  const B = 3.3;
  const col = o.color ?? rng.pick([C.cream, C.sky, C.brickRose, C.ochre, C.copper, C.lilac]);
  const lit = o.lit ?? 0.6;
  pen.begin();
  pen.box(-L / 2, -B / 2, -0.15, L, B, 0.6, C.charcoal, { top: C.woodDark, w: 0.11 });
  const cx = -L / 2 + 1.6;
  const cl = L - 3.4;
  const cw = B - 0.7;
  pen.box(cx, -cw / 2, 0.45, cl, cw, 2.0, col, { top: o.roof ?? C.stone });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, cx, -cw / 2, 0.45, cl, cw);
    const w = side.startsWith("y") ? cl : cw;
    if (side.startsWith("y")) {
      const n = Math.max(2, Math.round(w / 2.3));
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) * w) / n;
        if (i === 1) f.rect(a - 0.45, 0, a + 0.45, 1.6, C.door, { outline: true, w: W_THIN });
        else windowAt(f, a - 0.6, 0.6, a + 0.6, 1.55, rng.chance(lit));
      }
    } else {
      windowAt(f, w / 2 - 0.55, 0.6, w / 2 + 0.55, 1.55, rng.chance(lit));
    }
  }
  // roof garden
  for (let i = 0; i < 3; i++) {
    tree(pen, rng, cx + rng.range(0.8, cl - 0.8), rng.range(-cw / 2 + 0.5, cw / 2 - 0.5), { kind: "bush", z: 2.45, r: rng.range(0.35, 0.55) });
  }
  if (rng.chance(0.6)) {
    const sx = cx + rng.range(1, cl - 2);
    pen.box(sx, -0.35, 2.45, 1.3, 0.7, 0.25, rng.pick([C.red, C.yellow, C.blue]), { w: W_THIN });
    if (rng.chance(0.6)) person(pen, sx + 0.5, 0, 2.6, randomLook(rng), "bust", rng.chance(0.5));
  }
  // flower pots on the fore deck
  for (let i = 0; i < 3; i++) {
    const c = pen.card(L / 2 - 0.5 - i * 0.45, rng.range(-0.9, 0.9), 0.45);
    c.rect(-0.16, 0, 0.16, 0.25, C.tile, { outline: true, w: W_FINE });
    c.circle(0, 0.42, 0.22, rng.pick([C.red, C.pink, C.yellow, C.leaf]), { outline: true, w: W_FINE, seg: 7, layer: 1 });
  }
  pen.end();
}

/**
 * A Spree excursion boat: long, white and low enough for the bridges, a
 * glazed saloon forward and an open sun deck aft, full of people looking up.
 */
export function tourBoat(pen: Pen, rng: Rng, o: { stripe?: RGB; moving?: boolean } = {}): void {
  const stripe = o.stripe ?? C.blue;
  const L = 13;
  const B = 3.2;
  pen.begin();
  pen.extrude(hullShape(L, B, 0.18), -0.12, 0.6, C.white, { top: C.cream, crease: 28, w: 0.11 });
  pen.extrude(hullShape(L + 0.05, B + 0.06, 0.18), 0.32, 0.48, stripe, { crease: 28, w: W_THIN });
  // the saloon
  const x0 = 0.2;
  const len = 4.6;
  const hw = 1.25;
  pen.box(x0, -hw, 0.6, len, hw * 2, 0.86, C.glassPale, { top: C.white, w: W_THIN, grain: 0.5, glow: 0.7 });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, x0, -hw, 0.6, len, hw * 2);
    const w = side.startsWith("y") ? len : hw * 2;
    const n = Math.round(w / 0.95);
    for (let i = 1; i < n; i++) f.seg((i * w) / n, 0.04, (i * w) / n, 0.84, { w: 0.07, color: C.white, kind: 1, wobble: 0 });
    f.seg(0, 0.3, w, 0.3, { w: 0.09, color: stripe, kind: 1, wobble: 0 });
  }
  pen.box(x0 - 0.15, -hw - 0.1, 1.46, len + 0.3, hw * 2 + 0.2, 0.1, C.white, { w: W_THIN });
  // the sun deck: benches, and everyone on them
  for (let k = 0; k < 5; k++) {
    const x = -5.3 + k * 1.05;
    pen.box(x - 0.2, -1.15, 0.6, 0.4, 2.3, 0.22, C.wood, { w: W_FINE });
    for (const y of [-0.8, 0, 0.8]) {
      if (rng.chance(0.82)) person(pen, x, y + rng.range(-0.1, 0.1), 0.5, randomLook(rng), "bust", rng.chance(0.5));
    }
  }
  // a rail round the deck, and the flag at the stern
  const rail: [number, number, number][] = [
    [0.1, -1.4, 1.2],
    [-5.9, -1.4, 1.2],
    [-6.2, 0, 1.2],
    [-5.9, 1.4, 1.2],
    [0.1, 1.4, 1.2],
  ];
  pen.stroke(rail, { w: 0.06, color: C.white, kind: L_BAR, wobble: 0 });
  for (const p of rail) pen.stroke([[p[0], p[1], 0.6], p], { w: 0.06, color: C.white, kind: L_BAR, wobble: 0 });
  pen.pole([-6.15, 0, 0.6], [-6.15, 0, 1.75], 0.06, C.white, { ink: false });
  const fl = pen.card(-6.15, 0, 1.2);
  fl.rect(0, 0.34, 0.75, 0.5, [38, 34, 35], { sway: 0.25, layer: 1, grain: 0.4 });
  fl.rect(0, 0.17, 0.75, 0.34, [214, 42, 35], { sway: 0.25, layer: 1, grain: 0.4 });
  fl.rect(0, 0, 0.75, 0.17, [242, 193, 28], { sway: 0.25, layer: 1, grain: 0.4 });
  if (o.moving) wake(pen, -6.5, 1.5);
  pen.end();
}

/** A hired raft: a plank deck on blue barrels, a hut with a tin roof, a crate of beer and a slow outboard. */
export function raft(pen: Pen, rng: Rng, moving = false): void {
  pen.begin();
  for (const y of [-1.1, 1.1]) pen.box(-2.5, y - 0.35, -0.1, 5.0, 0.7, 0.4, C.blue, { w: W_THIN });
  pen.box(-2.7, -1.5, 0.3, 5.4, 3.0, 0.14, C.wood, { top: C.wood, w: 0.1 });
  pen.floor(0.44, 1).ticks(-2.6, -1.4, 2.6, 1.4, { n: 14, len: 2.2, ang: 0, jit: 0.02, color: C.woodDark, w: 0.05 });
  // the hut
  pen.box(-2.2, -1.0, 0.44, 2.0, 2.0, 1.3, C.cream, { w: W_THIN });
  pen.gable(-2.3, -1.1, 1.74, 2.2, 2.2, 0.3, "x", C.zinc, { gable: C.cream });
  const f = pen.wall("y+", -2.2, -1.0, 0.44, 2.0, 2.0);
  windowAt(f, 0.5, 0.45, 1.5, 1.05, true);
  const g = pen.wall("x+", -2.2, -1.0, 0.44, 2.0, 2.0);
  g.rect(0.6, 0, 1.4, 1.15, C.doorBlue, { outline: true, w: W_FINE });
  // the crew, sitting about on the foredeck
  person(pen, 0.6, -0.6, 0.3, randomLook(rng), "bust", false);
  person(pen, 1.4, 0.5, 0.3, randomLook(rng), "bust", true);
  if (rng.chance(0.7)) person(pen, 2.1, -0.3, 0.3, randomLook(rng), "bust", true);
  pen.box(0.9, -0.2, 0.44, 0.55, 0.4, 0.3, C.yellow, { w: W_FINE });
  pen.box(-2.95, -0.2, 0.2, 0.35, 0.4, 0.5, C.charcoal, { w: W_FINE });
  if (moving) wake(pen, -3.0, 1.2);
  pen.end();
}
