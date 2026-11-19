// Things that float. Every boat is drawn at the origin with its bow towards
// local +x and z = 0 at the waterline, so the same drawing serves as a moored
// boat (drawn once into the city) or as a sprite that sails.

import { RGB, Rng, V2, scaleRGB } from "../engine/math";
import { L_BAR, L_RIPPLE, Pen } from "../engine/pen";
import { W_FINE, W_THIN, person, randomLook, tree, windowAt } from "./kit";
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

export function wake(pen: Pen, stern: number, spread: number): void {
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
