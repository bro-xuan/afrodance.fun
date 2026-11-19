// Oosterdok: the harbour basin east of the station. NEMO's green copper hull
// rises out of the water with half the city sitting on its roof, an East
// Indiaman lies at the maritime museum's quay, and a pagoda floats where you
// would least expect one.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen } from "../../engine/pen";
import { hullShape, houseboat } from "../boats";
import { WATER } from "../city";
import { W_FINE, W_THIN, bench, bike, bikeRow, flag, lamp, person, railing, randomLook, speckle, stall, tree, windowAt, windowGrid } from "../kit";
import { Route, Turning, makeSprite, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";
import { peperbus } from "./centraal";

/** Land around the basin: the viaduct strip, the museum quay to the south and the canal-side strip to the east. */
export const nemoLand: V2[][] = [
  [
    [0, 0],
    [13, 0],
    [13, 24],
    [41, 24],
    [41, 0],
    [48, 0],
    [48, 48],
    [0, 48],
  ],
];

const COPPER = C.copper;
const COPPER_DARK = C.copperDark;
const HULL = hex("#4b3a31");
const HULL_LIGHT = hex("#6a5244");
const PALE = hex("#ebe4d2");

// ---------------------------------------------------------------- NEMO

// The hull, bow to the west. Its roof climbs from the entrance at the east end to the tip of the prow.
const NX0 = 14.5;
const NX1 = 34.5;
const NEMO: V2[] = [
  [34.5, 2.18],
  [34.5, 11.82],
  [30, 12.5],
  [22, 12.5],
  [18, 11.57],
  [15.6, 9.71],
  [14.5, 7.0],
  [15.6, 4.29],
  [18, 2.43],
  [22, 1.5],
  [30, 1.5],
];
const roofZ = (x: number) => 3.4 + ((NX1 - x) / (NX1 - NX0)) * 9.8;

/** The hull's extent in y at a given x. */
function span(x: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  const n = NEMO.length;
  for (let i = 0; i < n; i++) {
    const a = NEMO[i];
    const b = NEMO[(i + 1) % n];
    if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
    const y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  if (lo === Infinity) return [2.2, 11.8];
  return [lo, hi];
}

function nemoHull(pen: Pen, rng: Rng): void {
  const n = NEMO.length;
  const verts: V3[] = [];
  for (const p of NEMO) verts.push([p[0], p[1], WATER]);
  for (const p of NEMO) verts.push([p[0], p[1], roofZ(p[0])]);
  const faces: number[][] = [];
  const cols: RGB[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j, n + i]);
    cols.push(COPPER);
  }
  const top: number[] = [];
  for (let i = 0; i < n; i++) top.push(n + i);
  faces.push(top);
  cols.push(PALE);
  pen.begin();
  pen.solid(verts, faces, cols, { convex: false, crease: 28, w: 0.12 });

  // standing seams in the copper, on every flank that faces the camera
  for (let i = 0; i < n; i++) {
    const a = NEMO[i];
    const b = NEMO[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const f = pen.plane([a[0], a[1], WATER], [(b[0] - a[0]) / len, (b[1] - a[1]) / len, 0], [0, 0, 1], 1);
    if (!f.visible) continue;
    const k = Math.max(1, Math.round(len / 1.05));
    for (let q = 1; q < k; q++) {
      const t = q / k;
      const x = a[0] + (b[0] - a[0]) * t;
      f.seg(t * len, 0.15, t * len, roofZ(x) - WATER - 0.15, { w: 0.05, color: COPPER_DARK, kind: L_MARK, wobble: 0.5 });
    }
    f.seg(0, 0.03, len, 0.03, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
  }
  // the long south flank: portholes and the name
  const s = pen.wall("y+", 22, 1.5, WATER, 8, 11);
  for (let k = 0; k < 6; k++) {
    s.rect(0.7 + k * 1.2, 4.9, 1.25 + k * 1.2, 5.45, C.glass, { outline: true, w: W_FINE, glow: rng.chance(0.7) ? 1 : 0 });
  }
  s.text("NEMO", 2.05, 6.6, 1.2, { align: "c", w: 0.14, color: C.white, kind: L_MARK, wobble: 0.3 });
  // the entrance in the low east end
  const e = pen.wall("x+", NX0, 2.18, WATER, NX1 - NX0, 9.64);
  e.rect(3.4, 2.75, 6.24, 5.2, C.glassLight, { outline: true, w: W_THIN, glow: 0.9 });
  for (let k = 1; k < 4; k++) e.seg(3.4 + k * 0.71, 2.75, 3.4 + k * 0.71, 5.2, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  e.rect(3.0, 5.2, 6.64, 5.5, C.red, { grain: 0.5 });
  e.rect(0.7, 3.4, 2.3, 4.6, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
  e.rect(7.34, 3.4, 8.94, 4.6, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
  pen.end();

  // the roof: one long flight of steps, a rill of water down the middle, a rail round the edge
  pen.begin();
  for (let x = NX1 - 1; x > NX0 + 1.2; x -= 1) {
    const [lo, hi] = span(x);
    pen.stroke(
      [
        [x, lo + 0.2, roofZ(x) + 0.02],
        [x, hi - 0.2, roofZ(x) + 0.02],
      ],
      { w: 0.055, color: C.stoneDark, kind: L_MARK, wobble: 0.5 },
    );
  }
  pen.fill(
    [
      [33.6, 6.7, roofZ(33.6)],
      [33.6, 7.3, roofZ(33.6)],
      [19, 7.3, roofZ(19)],
      [19, 6.7, roofZ(19)],
    ],
    C.water,
    { layer: 1, kind: 1 },
  );
  const rail: V3[] = [];
  for (const i of [0, 1, 2, 3, 4, 5, 6]) rail.push([NEMO[i][0], NEMO[i][1], roofZ(NEMO[i][0])]);
  railing(pen, rail, 0.7, C.greyDark, 1.4);
  // vents at the top of the prow
  pen.box(17.2, 6.2, roofZ(17.8) - 0.3, 1.2, 1.6, 1.5, COPPER, { top: COPPER_DARK, w: W_THIN });
  pen.cyl(19.4, 4.6, roofZ(19.4) - 0.2, 0.42, 1.5, C.metal, { seg: 8, w: W_THIN });
  pen.end();

  // everyone who climbed up for the view
  for (let i = 0; i < 26; i++) {
    const x = rng.range(17.5, 33.6);
    const [lo, hi] = span(x);
    const y = rng.range(lo + 0.9, hi - 0.9);
    if (Math.abs(y - 7) < 0.55) continue;
    const pose = rng.pick(["sit", "sit", "stand", "stand", "wave", "cheer"] as const);
    person(pen, x, y, roofZ(x) + (pose === "sit" ? -0.12 : 0.02), randomLook(rng), pose, rng.chance(0.5), rng.chance(0.25) ? 0.72 : 1);
  }
  flag(pen, 15.4, 7, roofZ(15.4), 3.4, "amsterdam", 0.9);
  // a kite off the top of the roof, tugging in the wind
  pen.obj(() => {
    const kx = 20.6;
    const ky = 3.9;
    const kz = roofZ(kx);
    person(pen, kx, ky, kz, { ...randomLook(rng), top: C.yellow }, "cheer", false, 0.72);
    const kite: V3 = [kx - 2.4, ky - 3.6, kz + 8.4];
    pen.stroke([[kx + 0.42, ky, kz + 1.4], [kx - 0.6, ky - 1.6, kz + 4.6], kite], { w: 0.035, kind: L_BAR, wobble: 0, sway: 0, swayB: 1 });
    const k = pen.card(kite[0], kite[1], kite[2]);
    k.poly(
      [
        [0, -1.0],
        [0.62, 0],
        [0, 0.62],
        [-0.62, 0],
      ],
      C.red,
      { outline: true, w: W_FINE, sway: 1, grain: 0.4 },
    );
    k.seg(0, -1.0, 0, 0.62, { w: 0.04, wobble: 0, sway: 1, layer: 1 });
    k.seg(-0.62, 0, 0.62, 0, { w: 0.04, wobble: 0, sway: 1, layer: 1 });
    k.line(
      [
        [0, -1.0],
        [0.3, -1.6],
        [-0.15, -2.2],
        [0.25, -2.9],
      ],
      { w: 0.05, color: C.yellow, kind: L_MARK, wobble: 0, sway: 1, swayB: 0.5 },
    );
    for (const [a, b] of [
      [0.3, -1.6],
      [-0.15, -2.2],
    ]) {
      k.rect(a - 0.13, b - 0.08, a + 0.13, b + 0.08, C.yellow, { outline: true, w: 0.035, sway: 0.8, layer: 1 });
    }
  });

  // the footbridge from the quay
  pen.begin();
  pen.box(NX1, 6, 0.05, 6.8, 2, 0.26, C.wood, { top: C.stone, w: 0.1 });
  for (const x of [36.6, 39.2]) {
    pen.pole([x, 6.25, WATER], [x, 6.25, 0.05], 0.22, C.woodDark);
    pen.pole([x, 7.75, WATER], [x, 7.75, 0.05], 0.22, C.woodDark);
  }
  railing(
    pen,
    [
      [NX1 + 0.1, 6.1, 0.31],
      [41.2, 6.1, 0.31],
    ],
    0.85,
    C.white,
    1.2,
  );
  railing(
    pen,
    [
      [NX1 + 0.1, 7.9, 0.31],
      [41.2, 7.9, 0.31],
    ],
    0.85,
    C.white,
    1.2,
  );
  pen.end();
  person(pen, 36.2, 7.3, 0.31, randomLook(rng), "stand", true, 0.72);
  person(pen, 36.9, 7.2, 0.31, randomLook(rng), "stand");
  person(pen, 39.6, 6.7, 0.31, randomLook(rng), "wave");
}

// ---------------------------------------------------------------- the East Indiaman

/** The VOC ship, bow along local +x, z = 0 at the waterline. */
function indiaman(pen: Pen, rng: Rng): void {
  const L = 18.5;
  const B = 4.4;
  const deck = 1.9;
  const ochre = C.ochre;
  pen.begin();
  pen.extrude(hullShape(L, B, 0.22), -0.2, deck, HULL, { top: C.wood, crease: 28, w: 0.12 });
  pen.extrude(
    hullShape(L * 1.006, B * 1.02, 0.22),
    1.05,
    1.4,
    ochre,
    { crease: 28, w: W_THIN },
  );
  // gun ports along both sides
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, -6.2, -B / 2 - 0.02, 0, 11, B + 0.04);
    for (let k = 0; k < 7; k++) f.rect(0.5 + k * 1.5, 0.35, 1.05 + k * 1.5, 0.85, C.redDark, { outline: true, w: W_FINE });
  }
  pen.end();
  // the high stern, gilded, with the captain's windows
  pen.begin();
  pen.box(-L / 2 + 0.1, -1.95, deck, 4.3, 3.9, 1.6, HULL_LIGHT, { top: C.wood, w: 0.11 });
  pen.box(-L / 2 + 0.1, -1.7, deck + 1.6, 2.2, 3.4, 0.9, HULL_LIGHT, { top: C.wood, w: 0.11 });
  const tr = pen.wall("x-", -L / 2 + 0.1, -1.95, 0.6, 4.3, 3.9);
  tr.rect(0.15, 0.2, 3.75, 2.9, ochre, { outline: true, w: W_THIN, grain: 0.5 });
  for (let k = 0; k < 3; k++) windowAt(tr, 0.5 + k * 1.05, 1.55, 1.3 + k * 1.05, 2.5, true, C.gold);
  tr.rect(0.5, 0.5, 3.4, 1.2, C.redDark, { outline: true, w: W_FINE, layer: 1 });
  tr.circle(1.95, 0.85, 0.26, C.gold, { outline: true, w: W_FINE, layer: 2, seg: 8 });
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, -L / 2 + 0.1, -1.95, deck, 4.3, 3.9);
    f.rect(0.5, 0.45, 1.3, 1.15, C.glass, { outline: true, w: W_FINE, glow: 1 });
    f.rect(2.1, 0.45, 2.9, 1.15, C.glass, { outline: true, w: W_FINE, glow: 1 });
    f.seg(0, 1.5, 4.3, 1.5, { w: 0.12, color: C.gold, kind: L_MARK, wobble: 0.3 });
  }
  // stern lantern and the flag over it
  pen.pole([-L / 2 + 0.2, 0, deck + 2.5], [-L / 2 - 0.5, 0, deck + 3.2], 0.07, C.black, { ink: false });
  pen.card(-L / 2 - 0.5, 0, deck + 3.2).circle(0, 0.2, 0.26, C.lamp, { outline: true, w: W_FINE, glow: 1, seg: 8 });
  pen.end();
  flag(pen, -L / 2 + 0.5, 0, deck + 2.5, 3.6, "nl", 1.15);
  // forecastle and bowsprit
  pen.begin();
  pen.box(5.0, -1.55, deck, 2.6, 3.1, 0.8, HULL_LIGHT, { top: C.wood, w: 0.11 });
  pen.pole([7.4, 0, deck + 0.7], [11.6, 0, deck + 2.9], 0.24, C.woodDark);
  pen.end();

  // three masts: yards with the sails furled along them, tops, shrouds and stays
  const masts: [number, number, number][] = [
    [4.3, deck + 0.8, 11.5],
    [-0.7, deck, 14],
    [-5.9, deck + 1.6, 9.5],
  ];
  const rope = { w: 0.04, color: C.inkSoft, kind: L_BAR, wobble: 0 } as const;
  const heads: V3[] = [];
  for (let k = 0; k < masts.length; k++) {
    const [mx, base, h] = masts[k];
    pen.begin();
    pen.pole([mx, 0, base], [mx, 0, base + h], 0.26, C.woodDark);
    const levels = k === 2 ? [0.5, 0.8] : [0.42, 0.66, 0.87];
    levels.forEach((u, q) => {
      const z = base + h * u;
      const half = (k === 1 ? 3.3 : 2.7) * (1 - q * 0.24);
      pen.pole([mx, -half, z], [mx, half, z], 0.13, C.woodDark);
      pen.pole([mx + 0.1, -half * 0.86, z - 0.24], [mx + 0.1, half * 0.86, z - 0.24], 0.36, C.cream);
      for (const s of [-1, 1]) {
        pen.stroke(
          [
            [mx, s * half, z],
            [mx, 0, z + h * 0.1],
          ],
          rope,
        );
      }
    });
    // fighting top
    pen.cyl(mx, 0, base + h * 0.55, 0.55, 0.22, C.woodDark, { seg: 8, w: W_FINE });
    // shrouds down to the rails
    for (const s of [-1, 1]) {
      for (const dx of [-0.9, 0, 0.9]) {
        pen.stroke(
          [
            [mx, 0, base + h * 0.55],
            [mx + dx - 0.4, s * (B / 2 - 0.1), deck + (k === 2 ? 1.6 : 0.1)],
          ],
          rope,
        );
      }
    }
    pen.end();
    heads.push([mx, 0, base + h]);
  }
  pen.begin();
  pen.stroke([heads[0], [11.6, 0, deck + 2.9]], rope);
  pen.stroke([[4.3, 0, deck + 0.8 + 11.5 * 0.66], [9.6, 0, deck + 1.85]], rope);
  pen.stroke([heads[1], [4.3, 0, deck + 0.8 + 11.5 * 0.55]], rope);
  pen.stroke([heads[2], [-0.7, 0, deck + 14 * 0.55]], rope);
  pen.stroke([heads[2], [-L / 2 + 0.3, 0, deck + 2.5]], rope);
  pen.end();
  // colours at the mastheads
  flag(pen, -0.7, 0, deck + 14 - 0.3, 2.3, "amsterdam", 0.95);
  flag(pen, 4.3, 0, deck + 0.8 + 11.5 - 0.3, 1.9, "orange", 0.7);
  // visitors on deck
  for (let i = 0; i < 6; i++) {
    person(pen, rng.range(-4.6, 4.4), rng.range(-1.3, 1.3), deck, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5), rng.chance(0.3) ? 0.72 : 1);
  }
  person(pen, -7.2, 0.4, deck + 1.6, { ...randomLook(rng), top: C.blueDark, hat: C.black }, "wave");
}

// ---------------------------------------------------------------- the floating pagoda

function pagoda(pen: Pen, rng: Rng, x: number, y: number): void {
  const green = hex("#4f9f7a");
  const red = hex("#cf4034");
  const tiers: [number, number, number, number][] = [
    [0.4, 0.4, 4.2, 6.8],
    [1.0, 1.4, 3.0, 4.8],
    [1.55, 2.4, 1.9, 2.8],
  ];
  pen.push(x, y, WATER);
  pen.begin();
  pen.box(0, 0, -0.12, 5, 7.6, 0.62, C.white, { top: C.stone, w: 0.11 });
  pen.end();
  let z = 0.5;
  for (let k = 0; k < tiers.length; k++) {
    const [tx, ty, w, d] = tiers[k];
    const h = k === 0 ? 1.9 : 1.5;
    pen.begin();
    pen.box(tx, ty, z, w, d, h, red, { w: 0.11 });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, tx, ty, z, w, d);
      const fw = side === "x+" ? d : w;
      const n = Math.max(2, Math.round(fw / 1.1));
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) * fw) / n;
        f.rect(a - 0.32, 0.4, a + 0.32, h - 0.3, C.lamp, { outline: true, w: W_FINE, glow: 1, grain: 0.3 });
      }
      f.rect(0, h - 0.24, fw, h, C.gold, { grain: 0.4 });
    }
    // tiled roof with the eaves kicked out
    pen.hip(tx - 0.6, ty - 0.6, z + h, w + 1.2, d + 1.2, k === 2 ? 1.3 : 0.85, green, { w: 0.11, inset: k === 2 ? (w + 1.2) / 2 : undefined });
    for (const [cx, cy] of [
      [tx - 0.6, ty - 0.6],
      [tx + w + 0.6, ty - 0.6],
      [tx + w + 0.6, ty + d + 0.6],
      [tx - 0.6, ty + d + 0.6],
    ]) {
      const ox = cx < tx ? -0.3 : 0.3;
      const oy = cy < ty ? -0.3 : 0.3;
      pen.stroke(
        [
          [cx, cy, z + h],
          [cx + ox, cy + oy, z + h + 0.34],
        ],
        { w: 0.13, color: C.gold, kind: L_BAR, wobble: 0 },
      );
    }
    // lanterns under the eaves
    for (let i = 0; i < 4; i++) {
      const lx = tx + w + 0.42;
      const ly = ty + 0.3 + (i * (d - 0.6)) / 3;
      pen.card(lx, ly, z + h - 0.55).ellipse(0, 0.12, 0.13, 0.17, red, { outline: true, w: 0.04, seg: 7, glow: 0.9 });
      pen.stroke(
        [
          [lx, ly - 0.02, z + h - 0.4],
          [lx, ly + 0.02, z + h - 0.4],
        ],
        { w: 0.26, kind: L_LIGHT, wobble: 0, alpha: 0.55 },
      );
    }
    pen.end();
    z += h + (k === 0 ? 0.6 : 0.55);
  }
  pen.obj(() => {
    pen.pole([2.5, 3.8, z + 0.55], [2.5, 3.8, z + 1.7], 0.09, C.gold);
    pen.card(2.5, 3.8, z + 1.7).circle(0, 0, 0.2, C.gold, { outline: true, w: W_FINE, seg: 8 });
  });
  person(pen, 4.5, 6.9, 0.5, randomLook(rng), "stand");
  person(pen, 3.6, 7.1, 0.5, randomLook(rng), "stand", true);
  pen.pop();
  // steps up to the quay
  pen.fill(
    [
      [x + 5, y + 2.4, WATER + 0.52],
      [x + 5, y + 3.6, WATER + 0.52],
      [x + 6.3, y + 3.6, 0.02],
      [x + 6.3, y + 2.4, 0.02],
    ],
    C.wood,
    { outline: true, w: W_THIN },
  );
}

// ---------------------------------------------------------------- the maritime museum

function museum(pen: Pen, rng: Rng): void {
  const x0 = 9;
  const y0 = 28.4;
  const s = 12;
  const h = 6.6;
  const wing = 3.5;
  const stone = PALE;
  pen.begin();
  pen.box(x0, y0, 0, s, s, h, stone);
  for (const side of ["x+", "y+"] as const) {
    const f = pen.wall(side, x0, y0, 0, s, s);
    f.rect(0, 0, s, 0.55, C.stoneDark, { grain: 0.5 });
    f.seg(0, 0.55, s, 0.55, { w: W_FINE });
    f.rect(0, h - 0.5, s, h, C.white, { grain: 0.4 });
    f.seg(0, h - 0.5, s, h - 0.5, { w: W_FINE });
    windowGrid(f, rng, 0.5, 0.9, 4.6, h - 0.7, 3, 3, { lit: 0.6, fillA: 0.55, fillB: 0.66 });
    windowGrid(f, rng, 7.4, 0.9, 11.5, h - 0.7, 3, 3, { lit: 0.6, fillA: 0.55, fillB: 0.66 });
    // the centre bay: door, tall windows, pediment
    f.rect(4.75, 0, 7.25, h, C.white, { outline: true, w: W_FINE, grain: 0.4 });
    f.rect(5.45, 0, 6.55, 2.2, C.doorBlue, { outline: true, w: W_FINE, layer: 1 });
    windowAt(f, 5.4, 2.8, 6.6, 5.4, true);
    f.poly(
      [
        [4.6, h],
        [7.4, h],
        [6, h + 1.35],
      ],
      C.white,
      { outline: true, w: W_THIN, grain: 0.4 },
    );
    f.circle(6, h + 0.45, 0.28, C.gold, { outline: true, w: W_FINE, layer: 1, seg: 8 });
    if (side === "y+") f.text("MUSEUM", 6, h - 0.42, 0.3, { align: "c", w: 0.05, layer: 1 });
  }
  pen.end();
  // four slate roofs round a courtyard, and the glass net thrown over it
  pen.obj(() => {
    pen.gable(x0, y0, h, s, wing, 1.5, "x", C.slate);
    pen.gable(x0, y0 + s - wing, h, s, wing, 1.5, "x", C.slate);
    pen.gable(x0, y0, h, wing, s, 1.5, "y", C.slate);
    pen.gable(x0 + s - wing, y0, h, wing, s, 1.5, "y", C.slate);
  });
  pen.obj(() => {
    const gx = x0 + wing - 0.2;
    const gy = y0 + wing - 0.2;
    const gs = s - 2 * wing + 0.4;
    pen.pyramid(gx, gy, h + 0.5, gs, gs, 1.9, hex("#cfe3ee"), { glow: 0.6, grain: 0.5, w: 0.1 });
    const top: V3 = [gx + gs / 2, gy + gs / 2, h + 2.4];
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      pen.stroke([[gx + gs, gy + gs * t, h + 0.52], top], { w: 0.04, color: C.slate, kind: L_MARK, wobble: 0 });
      pen.stroke([[gx + gs * t, gy + gs, h + 0.52], top], { w: 0.04, color: C.slate, kind: L_MARK, wobble: 0 });
    }
  });
  flag(pen, x0 + s - 1.2, y0 + s - 1.2, h + 1.2, 3.6, "nl", 1.1);
}

// ---------------------------------------------------------------- the quay

function anchor(pen: Pen, x: number, y: number): void {
  const iron = hex("#3d4148");
  pen.begin();
  pen.cyl(x, y, 0, 1.35, 0.45, C.stone, { seg: 12 });
  const a = pen.card(x, y, 0.45);
  a.bar(0, 0.3, 0, 2.55, 0.22, iron);
  a.bar(-0.8, 2.2, 0.8, 2.2, 0.17, C.woodDark, { layer: 1 });
  a.circle(0, 2.82, 0.25, null, { w: 0.11, ink: iron, seg: 9 });
  a.arc(0, 1.05, 1.0, 0.8, Math.PI, Math.PI * 2, { w: 0.24, color: iron, kind: L_BAR, wobble: 0 });
  for (const s of [-1, 1]) {
    a.poly(
      [
        [s * 1.0, 1.05],
        [s * 1.28, 1.45],
        [s * 0.72, 1.4],
      ],
      iron,
      { outline: true, w: W_FINE, layer: 1 },
    );
  }
  pen.end();
}

function cannon(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.box(x - 0.36, y - 0.5, 0, 0.72, 1.0, 0.36, C.woodDark, { w: W_THIN });
  pen.pole([x, y + 0.4, 0.56], [x, y - 1.2, 0.72], 0.34, hex("#3d4148"));
  pen.end();
}

function propeller(pen: Pen, x: number, y: number): void {
  const bronze = hex("#b8893f");
  pen.begin();
  pen.box(x - 0.6, y - 0.6, 0, 1.2, 1.2, 0.7, C.stone, { w: W_THIN });
  const p = pen.card(x, y, 0.7);
  for (let k = 0; k < 3; k++) {
    const t = Math.PI / 2 + (k * Math.PI * 2) / 3;
    const pts: V2[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = (i / 8) * Math.PI * 2;
      const lx = 0.72 + Math.cos(u) * 0.62;
      const ly = Math.sin(u) * 0.34;
      pts.push([Math.cos(t) * lx - Math.sin(t) * ly, 1.3 + Math.sin(t) * lx + Math.cos(t) * ly]);
    }
    p.poly(pts, bronze, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
  }
  p.circle(0, 1.3, 0.26, scaleRGB(bronze, 0.8), { outline: true, w: W_FINE, layer: 2, seg: 8 });
  pen.end();
}

function quay(c: BlockCtx): void {
  const { pen, rng } = c;
  anchor(pen, 30.4, 32.6);
  cannon(pen, 26.2, 26.4);
  cannon(pen, 28.4, 26.4);
  propeller(pen, 37.2, 31.2);

  // a jetty out to the ship, and a school class about to go aboard
  pen.obj(() => {
    for (const y of [19.2, 21.4, 23.4]) {
      pen.pole([20.2, y, WATER], [20.2, y, -0.6], 0.22, C.woodDark);
      pen.pole([21.6, y, WATER], [21.6, y, -0.6], 0.22, C.woodDark);
    }
    pen.box(20.0, 18.6, -0.62, 1.8, 5.5, 0.22, C.wood, { w: 0.1 });
    pen.box(20.0, 23.3, -0.4, 1.8, 0.4, 0.2, C.wood, { w: W_THIN });
    pen.box(20.0, 23.65, -0.2, 1.8, 0.4, 0.2, C.wood, { w: W_THIN });
    railing(
      pen,
      [
        [21.75, 18.8, -0.4],
        [21.75, 23.2, -0.4],
      ],
      0.8,
      C.white,
      1.1,
    );
  });
  pen.obj(() => {
    person(pen, 20.9, 19.2, -0.4, { ...randomLook(rng), top: C.orange }, "wave");
    for (let i = 0; i < 6; i++) person(pen, 20.5 + (i % 2) * 0.75, 20.0 + Math.floor(i / 2) * 0.95, -0.4, randomLook(rng), rng.pick(["stand", "walkA", "wave", "cheer"]), rng.chance(0.5), 0.7);
    for (let i = 0; i < 5; i++) person(pen, 20.2 + (i % 3) * 0.8, 24.8 + Math.floor(i / 3) * 0.8, 0, randomLook(rng), rng.pick(["stand", "walkA", "cheer"]), rng.chance(0.5), 0.7);
  });

  // ticket hut and an ice-cream cart ("ijs", which is also how you pronounce the IJ)
  pen.obj(() => {
    pen.box(33.2, 25.4, 0, 2.6, 2.2, 2.5, C.white);
    pen.hip(32.9, 25.1, 2.5, 3.2, 2.8, 0.8, C.blue);
    const f = pen.wall("y+", 33.2, 25.4, 0, 2.6, 2.2);
    f.rect(0.4, 1.0, 2.2, 1.9, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
    f.text("TICKETS", 1.3, 2.06, 0.24, { align: "c", w: 0.05 });
  });
  for (let i = 0; i < 4; i++) person(pen, 34.2 + rng.range(-0.2, 0.2), 28.4 + i * 0.75, 0, randomLook(rng), "stand", rng.chance(0.5));
  pen.push(24.2, 33.6, 0);
  stall(pen, rng, { w: 2.5, d: 1.7, a: C.pink, sign: "IJS", goods: [C.pink, C.cream, C.yellow, hex("#8fd3c1")] });
  pen.pop();
  person(pen, 25.0, 36.1, 0, randomLook(rng), "stand", false, 0.72);
  person(pen, 25.9, 36.3, 0, randomLook(rng), "stand", true);
  person(pen, 26.8, 36.0, 0, randomLook(rng), "cheer", false, 0.72);

  peperbus(pen, rng, 36.6, 38.2);

  // trees, light, benches, bikes, flags
  for (const [x, y] of [
    [23.6, 30.2],
    [34.4, 36.6],
    [39.2, 38.6],
    [29.6, 39.8],
    [10.6, 26.4],
  ] as V2[]) {
    tree(pen, rng, x, y, { kind: "round" });
  }
  for (const [x, y] of [
    [24.4, 25.6],
    [31.4, 25.6],
    [38.8, 25.6],
    [27.2, 38.6],
    [37.4, 35.4],
  ] as V2[]) {
    lamp(pen, x, y);
  }
  bench(pen, 30.4, 36.2, 0);
  bench(pen, 35.6, 39.6, 0);
  bench(pen, 39.6, 30.4, 90);
  person(pen, 30.2, 36.3, 0.3, randomLook(rng), "sit");
  person(pen, 30.9, 36.3, 0.3, randomLook(rng), "sit", true);
  person(pen, 39.6, 30.1, 0.3, randomLook(rng), "sit", true);
  bikeRow(pen, rng, 22.4, 39.4, 9, 270, 0.6);
  flag(pen, 38.2, 27.0, 0, 5.6, "nl", 1.1);
  flag(pen, 39.5, 27.0, 0, 5.6, "amsterdam", 1.1);
  flag(pen, 40.8, 27.0, 0, 5.6, "orange", 1.1);

  // people looking at the ship, the anchor, each other
  for (let i = 0; i < 9; i++) {
    person(pen, rng.range(23, 40), rng.range(24.9, 25.6), 0, randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2;
    person(pen, 30.4 + Math.cos(t) * 2.4, 32.6 + Math.sin(t) * 2.2, 0, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), Math.cos(t) > 0);
  }
  for (let i = 0; i < 8; i++) {
    person(pen, rng.range(32, 40.5), rng.range(32.5, 40.5), 0, randomLook(rng), rng.pick(["stand", "walkA", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  // an angler on the basin wall, landing the usual Amsterdam catch
  person(pen, 39.4, 24.25, -0.35, randomLook(rng), "sit");
  pen.obj(() => {
    pen.stroke(
      [
        [39.8, 24.2, 0.9],
        [40.4, 22.6, 2.6],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [40.4, 22.6, 2.6],
        [40.4, 22.6, WATER + 1.9],
      ],
      { w: 0.035, kind: L_BAR, wobble: 0 },
    );
    pen.push(40.4, 22.6, WATER + 0.55, 20, 0.72);
    bike(pen, { color: C.greyDark });
    pen.pop();
    pen.floor(WATER, 2).circle(40.4, 22.6, 0.7, null, { ink: C.white, w: 0.07, seg: 10 });
  });
  // mooring posts along the basin, a line from the ship to two of them
  pen.obj(() => {
    for (const x of [15.4, 18.6, 23.6, 27.2, 30.8, 34.4, 37.6]) pen.pole([x, 24.35, 0], [x, 24.35, 0.5], 0.3, hex("#3d4148"));
    for (const [sx, bx] of [
      [16.4, 15.4],
      [32.6, 34.4],
    ]) {
      pen.stroke(
        [
          [sx, 18.6, WATER + 2.0],
          [(sx + bx) / 2, 21.6, WATER + 1.3],
          [bx, 24.35, 0.4],
        ],
        { w: 0.045, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
    }
  });
  // the strip by the viaduct: bikes, a bench with a view of the masts
  bikeRow(pen, rng, 9.6, 8.6, 10, 0, 0.6);
  bench(pen, 11.6, 17.0, 270);
  person(pen, 11.5, 16.8, 0.3, randomLook(rng), "sit");
  person(pen, 11.5, 17.5, 0.3, randomLook(rng), "sit", true);
  lamp(pen, 11.8, 12.4);
  person(pen, 11.4, 21.6, 0, randomLook(rng), "wave");
  tree(pen, rng, 10.8, 5.4, { kind: "elm" });
  tree(pen, rng, 10.8, 19.4, { kind: "elm" });
}

/** A swan on the water. Cygnets are the same drawing, smaller and grey. */
function swan(pen: Pen, x: number, y: number, s: number, rgb: RGB): void {
  pen.push(x, y, WATER, 0, s);
  const c = pen.card(0, 0, 0);
  pen.begin();
  c.poly(
    [
      [-0.45, 0.3],
      [-0.86, 0.62],
      [-0.4, 0.5],
    ],
    rgb,
    { outline: true, w: 0.045 },
  );
  c.ellipse(0, 0.22, 0.55, 0.3, rgb, { outline: true, w: 0.05, seg: 10, layer: 1, grain: 0.3 });
  c.bar(0.36, 0.36, 0.54, 0.74, 0.15, rgb, { layer: 2 });
  c.bar(0.54, 0.74, 0.4, 1.04, 0.15, rgb, { layer: 2 });
  c.bar(0.4, 1.04, 0.56, 1.2, 0.15, rgb, { layer: 2 });
  c.seg(0.62, 1.2, 0.84, 1.1, { w: 0.08, color: C.orange, kind: L_BAR, wobble: 0, layer: 3 });
  pen.stroke(
    [
      [-0.9, 0.45, 0.02],
      [-0.2, 0.75, 0.02],
      [0.6, 0.5, 0.02],
    ],
    { w: 0.07, color: C.white, kind: 2, wobble: 0.5, alpha: 0.85 },
  );
  pen.end();
  pen.pop();
}

// ---------------------------------------------------------------- movers

function kayak(pen: Pen, rgb: RGB, look: number, frame: number): void {
  const r = new Rng(look);
  pen.begin();
  pen.extrude(hullShape(3.3, 0.84, 0.42), -0.05, 0.3, rgb, { top: scaleRGB(rgb, 0.8), crease: 28, w: 0.09 });
  person(pen, -0.2, 0, 0.16, randomLook(r), "bust");
  const dip = frame === 0 ? 1 : -1;
  pen.stroke(
    [
      [0.25, -1.15, 0.72 - dip * 0.5],
      [0.25, 1.15, 0.72 + dip * 0.5],
    ],
    { w: 0.07, color: C.black, kind: L_BAR, wobble: 0 },
  );
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [0.25, s * 1.0, 0.72 + s * dip * 0.43],
        [0.25, s * 1.3, 0.72 + s * dip * 0.57],
      ],
      { w: 0.2, color: C.white, kind: L_BAR, wobble: 0 },
    );
  }
  pen.stroke(
    [
      [-1.9, 0.25, 0.02],
      [-2.9, 0.5, 0.02],
    ],
    { w: 0.08, color: C.white, kind: 2, wobble: 0.5, alpha: 0.85 },
  );
  pen.stroke(
    [
      [-1.9, -0.25, 0.02],
      [-2.9, -0.5, 0.02],
    ],
    { w: 0.08, color: C.white, kind: 2, wobble: 0.5, alpha: 0.85 },
  );
  pen.end();
}

function gull(pen: Pen, up: boolean, flip: boolean): void {
  const g = pen.card(0, 0, 0, flip);
  pen.begin();
  g.ellipse(0, 0, 0.3, 0.13, C.white, { outline: true, w: 0.045, seg: 8 });
  g.seg(0.28, 0.02, 0.42, 0, { w: 0.05, color: C.orange, kind: L_BAR, wobble: 0 });
  const k = up ? 1 : -0.45;
  g.poly(
    [
      [-0.1, 0.05],
      [0.14, 0.05],
      [-0.5, 0.05 + k * 0.55],
      [-0.72, 0.05 + k * 0.42],
    ],
    C.white,
    { outline: true, w: 0.045, layer: 1 },
  );
  g.poly(
    [
      [-0.05, 0.02],
      [0.16, 0.02],
      [0.52, 0.02 + k * 0.5],
      [0.34, 0.02 + k * 0.2],
    ],
    hex("#d9dde2"),
    { outline: true, w: 0.045, layer: 2 },
  );
  pen.end();
}

function movers(c: BlockCtx): void {
  const born = c.done + 0.3;
  const rng = new Rng(733);
  const w = (pts: V2[], z: number, r: number) => new Route(pts.map((p) => [c.ox + p[0], c.oy + p[1], z] as V3), true, r);

  // kayaks: round and round the open water in front of the ship, ducking under the jetty
  const water = w(
    [
      [16.4, 19.9],
      [33.6, 19.9],
      [33.6, 22.9],
      [16.4, 22.9],
    ],
    WATER,
    1.4,
  );
  const colours = [C.yellow, C.red, C.orange, hex("#58b7a3")];
  for (let i = 0; i < 4; i++) {
    const col = colours[i];
    const frames = [new Turning((pen) => kayak(pen, col, 70 + i, 0), 24, 170 + i), new Turning((pen) => kayak(pen, col, 70 + i, 1), 24, 170 + i)];
    const P: V3 = [0, 0, 0];
    const at = i / 4 + rng.range(-0.04, 0.04);
    const speed = rng.range(2.0, 2.4);
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = at * water.length + speed * m.t;
      water.pos(s, P);
      m.put(frames[Math.floor(m.t * 1.6 + i * 0.4) & 1].at(water.heading(s, 1.6)), P[0], P[1], P[2], born + i * 0.2);
    });
  }

  // people over the footbridge and round the quay
  const bridge = w(
    [
      [34.9, 6.7],
      [45.0, 6.7],
      [45.0, 7.4],
      [34.9, 7.4],
    ],
    0.31,
    0.3,
  );
  for (let i = 0; i < 3; i++) {
    const inner = walker(bridge, rng, born + rng.next());
    // on the quay the bridge deck gives way to the street: only show them while they are on the deck
    c.movers.push((m) => inner(m));
  }
  const stroll = w(
    [
      [22.6, 26.6],
      [39.6, 26.4],
      [40.4, 39.4],
      [31.4, 40.6],
      [28.2, 34.6],
      [22.8, 37.6],
    ],
    0,
    1.2,
  );
  for (let i = 0; i < 6; i++) c.movers.push(walker(stroll, rng, born + rng.next()));

  // gulls wheeling round the masts
  const frames = [
    [makeSprite((pen) => gull(pen, true, false), 0, 51), makeSprite((pen) => gull(pen, false, false), 0, 52)],
    [makeSprite((pen) => gull(pen, true, true), 0, 53), makeSprite((pen) => gull(pen, false, true), 0, 54)],
  ];
  const ring: V3[] = [];
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2;
    ring.push([c.ox + 25 + Math.cos(t) * 10.5, c.oy + 15 + Math.sin(t) * 6.5, 14.5 + 2.5 * Math.sin(t * 2)]);
  }
  const sky = new Route(ring, true);
  const Q: V3 = [0, 0, 0];
  for (let i = 0; i < 5; i++) {
    const off = i * 9.5 + (i % 2) * 3;
    const lift = (i % 3) * 1.1;
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = m.t * 4.4 + off;
      sky.pos(s, Q);
      const h = sky.heading(s, 2);
      const side = Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1;
      m.put(frames[side][Math.floor(m.t * 3.2 + i * 0.6) & 1], Q[0], Q[1], Q[2] + lift, born + i * 0.15);
    });
  }
}

// ---------------------------------------------------------------- the block

export const nemo: BlockBuilder = (c) => {
  const { pen, rng } = c;

  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(8.6, 24.6, 41.8, 41.8, C.plaza);
    g.rect(8.6, 0.62, 12.4, 24.6, C.plaza);
    speckle(pen.floor(0, 2), 9, 25, 41.5, 41.5, C.stoneDark, 0.2);
  });

  nemoHull(pen, rng);

  // the East Indiaman alongside the museum quay, stern to the east
  pen.push(24.6, 16.4, WATER, 180);
  indiaman(pen, rng);
  pen.pop();

  pagoda(pen, rng, 35.4, -2.2);
  museum(pen, rng);
  quay(c);

  // houseboats: one in the basin, two on the canal towards the station
  pen.push(38.7, 15.4, WATER, 90);
  houseboat(pen, rng, { L: 8.4 });
  pen.pop();
  pen.push(16, 49.75, WATER, 0);
  houseboat(pen, rng, { L: 10.5 });
  pen.pop();
  pen.push(34.4, 49.75, WATER, 180);
  houseboat(pen, rng, { L: 10.5 });
  pen.pop();

  // a swan family between the houseboats
  swan(pen, 41.4, 49.4, 1, C.white);
  swan(pen, 43.1, 49.9, 1, C.white);
  swan(pen, 44.3, 49.4, 0.5, C.grey);
  swan(pen, 44.9, 49.9, 0.5, C.grey);
  swan(pen, 45.5, 49.5, 0.5, C.grey);

  movers(c);
  c.focus(25, 21, 1.05);
};
