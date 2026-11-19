// London's street furniture: the red phone box and pillar box, zebra
// crossings with their orange beacons, bus stops, Underground signs, hire
// bikes, bunting. Like everything in the kit, each prop draws itself in its
// own local space at the pen's origin.

import { RGB, Rng, V2, V3 } from "../engine/math";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../engine/pen";
import { W_FINE, W_THIN, bike, person, randomLook } from "./kit";
import { C, UK_BLUE, UK_RED } from "./palette";

// ---------------------------------------------------------------- lamps

/** A riverside lamp: a black standard with a white globe. `arms` hangs more globes off it (bridges have three). */
export function globeLamp(pen: Pen, x: number, y: number, z = 0, h = 3.1, arms = 0): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + 0.45], 0.26, C.iron);
  pen.pole([x, y, z + 0.45], [x, y, z + h], 0.12, C.iron);
  const c = pen.card(x, y, z + h);
  const globe = (a: number, b: number, r: number) => c.circle(a, b, r, C.lamp, { outline: true, w: W_FINE, glow: 1, grain: 0.2, layer: 1, seg: 10 });
  if (arms > 0) {
    c.line(
      [
        [-0.62, -0.3],
        [-0.62, -0.5],
        [0.62, -0.5],
        [0.62, -0.3],
      ],
      { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0 },
    );
    globe(-0.62, -0.08, 0.24);
    globe(0.62, -0.08, 0.24);
  }
  globe(0, 0.3, 0.32);
  c.seg(-0.01, 0.3, 0.01, 0.3, { kind: L_LIGHT, w: 2.3, alpha: 0.2, wobble: 0 });
  pen.end();
}

/** One bulb of a string of lights: only shows after dark. */
export function bulb(pen: Pen, x: number, y: number, z: number, w = 0.2): void {
  pen.stroke(
    [
      [x, y, z],
      [x, y + 0.02, z],
    ],
    { w, kind: L_LIGHT, wobble: 0 },
  );
}

/** A sagging string of bulbs between two points. */
export function lightString(pen: Pen, a: V3, b: V3, n = 8, sag = 0.5): void {
  pen.begin();
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * sag]);
  }
  pen.stroke(pts, { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 1; i < n; i++) bulb(pen, pts[i][0], pts[i][1], pts[i][2] - 0.1);
  pen.end();
}

// ---------------------------------------------------------------- red things

/** A red telephone kiosk. The door faces local +y. */
export function phoneBox(pen: Pen, x: number, y: number, rot = 0): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.box(-0.5, -0.5, 0, 1, 1, 2.32, C.red, { w: 0.1 });
  pen.box(-0.55, -0.55, 2.32, 1.1, 1.1, 0.16, C.red, { w: W_THIN });
  pen.dome(0, 0, 2.48, 0.52, 0.2, C.red, { seg: 8, rings: 2, w: W_FINE });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -0.5, -0.5, 0, 1, 1);
    f.rect(0.15, 0.3, 0.85, 1.92, C.glassPale, { outline: true, w: 0.045, glow: 0.75, grain: 0.3 });
    for (let k = 1; k < 6; k++) f.seg(0.15, 0.3 + k * 0.27, 0.85, 0.3 + k * 0.27, { w: 0.04, color: C.red, kind: L_MARK, wobble: 0, layer: 1 });
    for (const a of [0.33, 0.67]) f.seg(a, 0.3, a, 1.92, { w: 0.04, color: C.red, kind: L_MARK, wobble: 0, layer: 1 });
    f.rect(0.14, 2.0, 0.86, 2.22, C.white, { outline: true, w: 0.035, glow: 0.6, grain: 0.2, layer: 1 });
  }
  pen.end();
  pen.pop();
}

/** A red pillar box. */
export function pillarBox(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.cyl(x, y, 0, 0.36, 0.22, C.black, { seg: 9, w: W_FINE });
  pen.cyl(x, y, 0.22, 0.32, 1.05, C.red, { seg: 9, w: W_THIN });
  pen.cyl(x, y, 1.27, 0.38, 0.1, C.red, { seg: 9, w: W_FINE });
  pen.dome(x, y, 1.37, 0.36, 0.16, C.red, { seg: 9, rings: 2, w: W_FINE });
  const c = pen.card(x, y, 0);
  c.seg(-0.16, 1.05, 0.16, 1.05, { w: 0.07, color: C.black, kind: L_MARK, wobble: 0, layer: 3 });
  c.rect(-0.1, 0.62, 0.1, 0.86, C.white, { layer: 3, grain: 0.2 });
  pen.end();
}

/** A litter bin, black with a gold band. */
export function bin(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.cyl(x, y, 0, 0.3, 0.85, C.iron, { seg: 8, w: W_FINE, top: C.black });
  pen.card(x, y, 0).rect(-0.3, 0.58, 0.3, 0.68, C.gold, { grain: 0.2 });
  pen.end();
}

// ---------------------------------------------------------------- signs and signals

/** The Underground's sign: a red ring with a blue bar across it. It glows after dark. */
export function roundel(p: Plane, a: number, b: number, r: number, layer = 1): void {
  p.circle(a, b, r, UK_RED, { outline: true, w: W_FINE, layer, seg: 14, grain: 0.2, glow: 0.9, kind: F_NEON, shade: false });
  p.circle(a, b, r * 0.6, C.white, { layer: layer + 1, seg: 12, grain: 0.1, glow: 0.9, shade: false });
  p.rect(a - r * 1.28, b - r * 0.2, a + r * 1.28, b + r * 0.2, UK_BLUE, { outline: true, w: 0.04, layer: layer + 2, grain: 0.2, glow: 0.9, kind: F_NEON, shade: false });
}

/** An Underground sign on a pole, where a station comes up to the street. */
export function tubeSign(pen: Pen, x: number, y: number, z = 0, h = 3.3): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.11, C.iron);
  roundel(pen.card(x, y, z + h), 0, 0.5, 0.52);
  pen.end();
}

/** The way down to the Tube: a railed stairwell under a roundel. The steps go down towards local +x. */
export function tubeEntrance(pen: Pen, x: number, y: number, rot = 0): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  const g = pen.floor(0, 2);
  g.rect(0, -0.7, 3.0, 0.7, C.charcoal, { outline: true, w: W_FINE });
  for (let k = 1; k < 6; k++) g.seg(k * 0.5, -0.66, k * 0.5, 0.66, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 1 });
  for (const s of [-0.78, 0.78]) {
    pen.stroke(
      [
        [-0.1, s, 0.85],
        [3.05, s, 0.85],
      ],
      { w: 0.08, color: C.iron, kind: L_BAR, wobble: 0 },
    );
    for (let k = 0; k <= 4; k++) {
      pen.stroke(
        [
          [-0.1 + k * 0.79, s, 0],
          [-0.1 + k * 0.79, s, 0.85],
        ],
        { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0 },
      );
    }
  }
  pen.stroke(
    [
      [3.05, -0.78, 0.85],
      [3.05, 0.78, 0.85],
    ],
    { w: 0.08, color: C.iron, kind: L_BAR, wobble: 0 },
  );
  pen.pole([-0.25, 0, 0], [-0.25, 0, 3.2], 0.11, C.iron);
  roundel(pen.card(-0.25, 0, 3.2), 0, 0.48, 0.5);
  pen.end();
  pen.pop();
}

/** A zebra crossing's beacon: a striped pole with an orange globe that blinks on after dark. */
export function belisha(pen: Pen, x: number, y: number): void {
  pen.begin();
  for (let k = 0; k < 5; k++) pen.pole([x, y, k * 0.5], [x, y, k * 0.5 + 0.5], 0.13, k % 2 === 0 ? C.black : C.white, { ink: k === 0 ? undefined : false });
  pen.card(x, y, 2.5).circle(0, 0.26, 0.27, C.orange, { outline: true, w: W_FINE, glow: 1, kind: F_NEON, seg: 9, grain: 0.2, layer: 1 });
  pen.end();
}

/**
 * A zebra crossing across a street. In its frame the stripes start at the
 * origin and run `across` units along local +y (kerb to kerb); the crossing is
 * `w` wide along local +x. Beacons stand at both kerbs.
 */
export function zebra(pen: Pen, across: number, w = 3): void {
  pen.begin();
  const g = pen.floor(0, 2);
  const n = Math.max(3, Math.round(across / 1.1));
  const step = across / n;
  for (let k = 0; k < n; k++) {
    if (k % 2 === 1) continue;
    g.rect(0, k * step + 0.08, w, (k + 1) * step - 0.08, C.roadLine, { grain: 0.5, layer: 1 });
  }
  // the zig-zags that warn drivers on the way in
  for (const s of [-1, 1]) {
    for (const y of [0.35, across - 0.35]) {
      const pts: V2[] = [];
      for (let k = 0; k <= 6; k++) pts.push([(s < 0 ? -0.3 : w + 0.3) + s * k * 0.75, y + (k % 2 === 0 ? -0.16 : 0.16)]);
      g.line(pts, { w: 0.06, color: C.roadLine, kind: L_MARK, wobble: 0.2, layer: 1 });
    }
  }
  pen.end();
  belisha(pen, -0.25, -0.35);
  belisha(pen, w + 0.25, across + 0.35);
}

/**
 * A bus stop. In its frame the kerb runs along local +x through the origin and
 * the pavement is on the +y side: a flag on a pole, a glass shelter with a red
 * perch, and a few people waiting.
 */
export function busStop(pen: Pen, rng: Rng, waiting = 3): void {
  pen.begin();
  // the flag
  pen.pole([0, 0.55, 0], [0, 0.55, 3.0], 0.1, C.iron);
  const fl = pen.card(0, 0.55, 2.2);
  fl.rect(-0.4, 0, 0.4, 0.95, C.white, { outline: true, w: W_FINE, grain: 0.2, glow: 0.5 });
  fl.circle(0, 0.62, 0.22, UK_RED, { layer: 1, seg: 10, grain: 0.2 });
  fl.rect(-0.3, 0.57, 0.3, 0.67, C.white, { layer: 2, grain: 0 });
  fl.seg(-0.24, 0.2, 0.24, 0.2, { w: 0.05, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
  // the shelter
  const x0 = 1.1;
  const len = 3.4;
  pen.box(x0, 1.75, 0.1, len, 0.08, 2.1, C.glassPale, { w: W_THIN, grain: 0.4 });
  pen.box(x0 - 0.15, 0.75, 2.25, len + 0.3, 1.2, 0.12, C.busRed, { w: W_THIN, top: C.busRedDark });
  pen.pole([x0, 0.85, 0], [x0, 0.85, 2.25], 0.08, C.iron);
  pen.pole([x0 + len, 0.85, 0], [x0 + len, 0.85, 2.25], 0.08, C.iron);
  pen.box(x0 + 0.4, 1.5, 0.55, len - 0.8, 0.22, 0.1, C.busRed, { w: W_FINE });
  pen.stroke(
    [
      [x0 + 0.3, 1.2, 2.24],
      [x0 + len - 0.3, 1.2, 2.24],
    ],
    { w: 0.16, kind: L_LIGHT, wobble: 0 },
  );
  for (let i = 0; i < waiting; i++) {
    person(pen, x0 + 0.5 + i * 0.85 + rng.range(-0.15, 0.15), 1.15 + rng.range(-0.15, 0.2), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
  pen.end();
}

/** A row of red hire bikes in their docks, along local +x. */
export function cycleDock(pen: Pen, rng: Rng, x: number, y: number, n: number, rot = 0): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  for (let i = 0; i < n; i++) {
    const a = i * 0.72;
    pen.box(a - 0.1, -0.12, 0, 0.2, 0.24, 0.7, C.greyDark, { w: W_FINE, top: C.metal });
    if (rng.chance(0.25)) continue;
    pen.push(a, 0.95, 0, 270 + rng.range(-4, 4));
    bike(pen, { color: C.red });
    pen.pop();
  }
  // the terminal
  pen.box(-0.95, -0.2, 0, 0.36, 0.4, 1.9, C.navy, { w: W_FINE, top: C.metal });
  pen.wall("y+", -0.95, -0.2, 0, 0.36, 0.4).rect(0.06, 1.15, 0.3, 1.6, C.glassLight, { glow: 0.9, layer: 1, grain: 0.2 });
  pen.end();
  pen.pop();
}

// ---------------------------------------------------------------- bunting

const BUNTING: RGB[] = [UK_RED, C.white, UK_BLUE];

/** Little triangular flags on a line between two points, red, white and blue. */
export function bunting(pen: Pen, a: V3, b: V3, sag = 0.45, gap = 0.42): void {
  pen.begin();
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(3, Math.round(len / gap));
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * sag]);
  }
  pen.stroke(pts, { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const c = pen.card((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    c.poly(
      [
        [-0.15, 0],
        [0.15, 0],
        [0, -0.36],
      ],
      BUNTING[i % 3],
      { sway: 0.14, grain: 0.3, outline: true, w: 0.03, shade: false },
    );
  }
  pen.end();
}
