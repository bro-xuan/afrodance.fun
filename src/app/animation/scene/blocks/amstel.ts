// The Amstel. The river comes in from the ring as a wide inlet, ends at the
// old locks, and is crossed by the Magere Brug: a white wooden drawbridge
// whose two leaves lift whenever the brown-sailed barge wants through, while
// cyclists wait at the barriers. Carré glows on the north bank, a rowing
// eight laps the basin under both side spans, houseboats lie where the river meets the ring.

import { RGB, Rng, V2, V3, clamp, hex, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen } from "../../engine/pen";
import { hullShape, houseboat, sloep } from "../boats";
import { WATER } from "../city";
import { Look, W_FINE, W_THIN, archWindow, bench, bikeRow, cafeTable, flag, houseRow, lamp, person, railing, randomLook, speckle, stall, tree, tufts, windowAt, windowGrid } from "../kit";
import { Route, Turning, cyclists, drape, rounded, traveler, walkers } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import { BlockBuilder, BlockCtx, Mover } from "../types";
import { lookOf } from "./windmill";

// The river: banks at y = RY0 and RY1, open to the ring at x = 48, closed by the locks at x = 9.
const RY0 = 11.5;
const RY1 = 36;
export const amstelLand: V2[][] = [
  [
    [0, 0],
    [48, 0],
    [48, RY0],
    [9, RY0],
    [9, RY1],
    [48, RY1],
    [48, 48],
    [0, 48],
  ],
];

// The bridge: axis, deck edges, the two hinge lines and the middle, deck height and the balance pivots.
const BX = 28.5;
const X0 = 26.8;
const X1 = 30.2;
const YA = 20.25;
const YB = 27.25;
const ZD = 0.4;
const ZP = ZD + 4.6;
const LEAF = 3.5;
const RAMP = 1.9;

// The eight's lap: two lanes joined by a half circle at each end. In the turns the ends of a boat that long
// swing well outside the line it follows, so everything else on the water keeps clear of both.
const LANE_N = 16.6;
const LANE_S = 30.6;
const TURN_W = 23.2;
const TURN_E = 37.4;
// The barge waits in the middle of each turn, where the eight goes round it, and sails straight down the centre line.
const HOLD_W = 21.8;
const HOLD_E = 37.4;
const MIDY = 23.75;

/** One cycle of the bridge, in seconds: traffic, barriers down, leaves up, barge through, leaves down, barriers up. */
const CYCLE = 32;
const T_BAR = 19;
const T_UP = 20.2;
const T_GO = 23;
const T_DOWN = 28.3;
const T_OPEN = 31;

const SAIL = hex("#9a4f35");
const JIB = hex("#b56a45");
const HULL = hex("#3b3531");
const CARRE = hex("#efe3c8");

/** Height of the way over the bridge at local y: street, ramp, deck, ramp, street. */
function deckZ(y: number): number {
  if (y <= RY0 - RAMP || y >= RY1 + RAMP) return 0;
  if (y < RY0) return (ZD * (y - (RY0 - RAMP))) / RAMP;
  if (y <= RY1) return ZD;
  return ZD * (1 - (y - RY1) / RAMP);
}

/** A plank across x0..x1 whose top runs from (y0, z0) to (y1, z1). */
function plank(pen: Pen, x0: number, x1: number, y0: number, z0: number, y1: number, z1: number, th: number, top: RGB, side: RGB): void {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const L = Math.hypot(dy, dz) || 1;
  let ny = (dz / L) * th;
  let nz = (-dy / L) * th;
  if (nz > 0) {
    ny = -ny;
    nz = -nz;
  }
  pen.solid(
    [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z1],
      [x0, y1, z1],
      [x0, y0 + ny, z0 + nz],
      [x1, y0 + ny, z0 + nz],
      [x1, y1 + ny, z1 + nz],
      [x0, y1 + ny, z1 + nz],
    ],
    [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ],
    [top, side, side, side, side, side],
    { w: 0.09 },
  );
}

const bulb = (pen: Pen, x: number, y: number, z: number) =>
  pen.stroke(
    [
      [x, y, z],
      [x, y + 0.02, z],
    ],
    { w: 0.2, kind: L_LIGHT, wobble: 0 },
  );

// ---------------------------------------------------------------- boats

/** A tjalk: a flat-bottomed sailing barge with leeboards and a tan gaff sail, bow towards local +x. */
function barge(pen: Pen): void {
  pen.extrude(hullShape(7.6, 2.6, 0.3), -0.15, 0.7, HULL, { top: C.wood, crease: 28, w: 0.11 });
  for (const s of [-1, 1]) {
    const lb = pen.plane([0.3, s * 1.36, 0.05], [1, 0, 0], [0, 0, 1], 0, true);
    lb.ellipse(0, 0.35, 1.0, 0.55, hex("#7a4a2c"), { outline: true, w: W_THIN, seg: 12 });
  }
  pen.box(-1.0, -0.75, 0.7, 2.7, 1.5, 0.26, C.green, { top: hex("#58a372"), w: W_THIN });
  pen.box(-3.05, -0.8, 0.7, 1.6, 1.6, 0.62, C.white, { top: C.green, w: W_THIN });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -3.05, -0.8, 0.7, 1.6, 1.6);
    f.rect(0.45, 0.16, 1.15, 0.48, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
  }
  person(pen, -3.42, 0.1, 0.55, lookOf(SKIN[1], HAIR[7], hex("#27456b"), hex("#2f3b55"), false, hex("#27456b")), "bust", false);
  pen.pole([-3.75, 0, 0.9], [-2.95, 0.25, 1.05], 0.08, C.woodDark, { ink: false });
  // the ship's dog keeps a lookout at the bow
  const dg = pen.card(2.9, 0, 0.7);
  dg.ellipse(0, 0.22, 0.3, 0.17, hex("#b98352"), { outline: true, w: W_FINE, seg: 8 });
  dg.circle(0.27, 0.42, 0.14, hex("#b98352"), { outline: true, w: W_FINE, layer: 1, seg: 7 });
  dg.bar(-0.28, 0.28, -0.42, 0.5, 0.06, hex("#b98352"), { swayB: 0.3 });
  // mast, gaff sail, jib and a long red pennant
  const mx = 1.0;
  pen.pole([mx, 0, 0.7], [mx, 0, 8.2], 0.15, C.wood);
  const sp = pen.plane([0, 0.03, 0], [1, 0, 0], [0, 0, 1], 0, true);
  sp.poly(
    [
      [mx - 0.12, 1.5],
      [-2.8, 1.75],
      [-1.9, 7.2],
      [mx - 0.12, 6.3],
    ],
    SAIL,
    { outline: true, w: W_THIN },
  );
  for (const k of [0.3, 0.55, 0.8]) {
    sp.seg(mx - 0.12 - k * 2.68, 1.5 + k * 0.25, mx - 0.12 - k * 1.78, 6.3 + k * 0.9, { w: 0.045, color: hex("#7c3d28"), kind: L_MARK, wobble: 0.4, layer: 1 });
  }
  sp.bar(mx, 1.45, -2.9, 1.72, 0.1, C.woodDark, { layer: 1 });
  sp.bar(mx, 6.3, -2.0, 7.32, 0.09, C.woodDark, { layer: 1 });
  sp.poly(
    [
      [mx + 0.12, 6.9],
      [3.72, 0.85],
      [mx + 0.25, 1.35],
    ],
    JIB,
    { outline: true, w: W_THIN },
  );
  const fl = pen.card(mx, 0, 8.2);
  fl.poly(
    [
      [0, 0],
      [1.25, -0.14],
      [0, -0.32],
    ],
    C.red,
    { outline: true, w: W_FINE, sway: 0.3 },
  );
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [-3.6, s * 0.7, 0.03],
        [-4.9, s * 1.15, 0.03],
        [-6.0, s * 1.35, 0.03],
      ],
      { w: 0.11, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
    );
  }
}

/** A coxed eight, bow towards local +x. `f` is the phase of the stroke: catch, drive, finish, recovery. */
function eight(pen: Pen, crew: Look[], f: number): void {
  const shell: V2[] = [
    [-4.6, 0],
    [-3.7, -0.42],
    [3.6, -0.42],
    [4.6, 0],
    [3.6, 0.42],
    [-3.7, 0.42],
  ];
  pen.extrude(shell, -0.05, 0.26, C.yellow, { top: C.woodDark, crease: 25, w: 0.09 });
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
      { w: f === 3 ? 0.09 : 0.2, color: C.orange, kind: L_BAR, wobble: 0 },
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

function pedalo(pen: Pen, rng: Rng, color: RGB, crew: boolean): void {
  pen.extrude(hullShape(2.4, 1.2, 0.3), -0.08, 0.42, color, { top: C.white, crease: 28, w: 0.09 });
  pen.box(-1.1, -0.42, 0.42, 0.45, 0.84, 0.3, color, { w: W_FINE });
  if (crew) {
    person(pen, -0.2, 0.28, 0.3, randomLook(rng), "bust", false);
    person(pen, -0.2, -0.28, 0.3, randomLook(rng), "bust", true, 0.78);
  }
}

// ---------------------------------------------------------------- the north bank

function carre(c: BlockCtx): void {
  const { pen, rng } = c;
  const x0 = 31;
  const y0 = 1.0;
  const w = 15.6;
  const d = 6.8;
  const h = 8.2;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, CARRE);
    const f = pen.wall("y+", x0, y0, 0, w, d);
    const bay = w / 5;
    for (let i = 0; i <= 5; i++) {
      const a = i === 0 ? 0.12 : i === 5 ? w - 0.5 : i * bay - 0.19;
      f.rect(a, 0, a + 0.38, h - 1.5, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    }
    for (let i = 0; i < 5; i++) {
      const m = (i + 0.5) * bay;
      archWindow(f, m - 0.72, 0, m + 0.72, 2.75, true, C.white);
      archWindow(f, m - 0.66, 3.55, m + 0.66, 6.25, true, C.white);
    }
    f.rect(0, 2.95, w, 3.3, C.white, { grain: 0.3 });
    f.seg(0, 2.95, w, 2.95, { w: 0.06 });
    f.rect(0, h - 1.5, w, h, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    f.text("CARRE", w / 2, h - 1.25, 0.95, { align: "c", color: C.redDark, w: 0.11, layer: 1, wobble: 0 });
    f.text("CARRE", w / 2, h - 1.25, 0.95, { align: "c", kind: L_LIGHT, w: 0.15, layer: 2, wobble: 0 });
    const g = pen.wall("x+", x0, y0, 0, w, d);
    windowGrid(g, rng, 0.6, 0.6, d - 0.6, h - 1.6, 2, 2, { lit: 1, arched: true, fillA: 0.5, fillB: 0.75 });
    g.rect(0, h - 1.5, d, h, C.white, { outline: true, w: W_FINE, grain: 0.3 });
  });
  pen.obj(() => {
    // cornice, the crowning pediment with its lyre window, and a zinc roof
    pen.box(x0 - 0.2, y0 - 0.1, h, w + 0.4, d + 0.3, 0.36, C.white, { w: W_THIN });
    pen.hip(x0 + 0.5, y0 + 0.5, h + 0.36, w - 1.0, d - 1.0, 1.5, C.slateLight);
    const f = pen.wall("y+", x0, y0, h + 0.36, w, d);
    const m = w / 2;
    const ped: V2[] = [
      [m - 3.4, 0],
      [m + 3.4, 0],
    ];
    for (let i = 1; i < 8; i++) {
      const t = (i / 8) * Math.PI;
      ped.push([m + Math.cos(t) * 3.4, Math.sin(t) * 2.0]);
    }
    f.extrude(ped, 0.3, CARRE, { front: C.white });
    const ff = pen.wall("y+", x0, y0, h + 0.36, w, d + 0.3);
    ff.circle(m, 0.85, 0.55, C.glass, { outline: true, w: W_FINE, glow: 1, seg: 12 });
    for (const a of [0.5, w - 0.5]) pen.cone(x0 + a, y0 + d - 0.3, h + 0.36, 0.3, 0.9, C.white, { seg: 6, w: W_FINE });
    // a row of bulbs along the cornice
    for (let a = 0.4; a < w; a += 0.62) bulb(pen, x0 + a, y0 + d + 0.24, h + 0.18);
  }, 0.15);
  flag(pen, x0 + 2.2, y0 + 3.0, h + 1.2, 3.2, "amsterdam");
  flag(pen, x0 + w - 2.2, y0 + 3.0, h + 1.2, 3.2, "nl");
  // the canopy, the red carpet and tonight's queue
  pen.obj(() => {
    pen.box(x0 + w / 2 - 2.1, y0 + d, 2.95, 4.2, 1.5, 0.22, C.red, { top: C.redDark, w: W_THIN });
    for (const a of [-1.95, 1.95]) pen.pole([x0 + w / 2 + a, y0 + d + 1.4, 0], [x0 + w / 2 + a, y0 + d + 1.4, 2.95], 0.09, C.gold);
    for (let a = -1.9; a <= 1.91; a += 0.63) bulb(pen, x0 + w / 2 + a, y0 + d + 1.52, 2.98);
  });
  const dress: RGB[] = [C.black, C.red, hex("#27456b"), C.purple, C.black, C.teal, C.white, C.black, C.pink];
  for (let i = 0; i < 7; i++) {
    const lk = lookOf(rng.pick(SKIN), rng.pick(HAIR), dress[i], i % 2 === 0 ? C.black : dress[i], i % 2 === 1);
    person(pen, x0 + w / 2 + 1.5 + i * 0.84, y0 + d + 1.15 + (i % 2) * 0.28, 0, lk, i === 4 ? "wave" : "stand", i % 3 === 0);
  }
  person(pen, x0 + w / 2 - 1.3, y0 + d + 1.2, 0, lookOf(SKIN[2], HAIR[0], C.redDark, C.black, false, C.redDark), "stand");
}

function northBank(c: BlockCtx): void {
  const { pen, rng } = c;
  pen.push(10.6, 1.0, 0);
  houseRow(pen, rng, 3, { d: 6.6, widths: [5, 5.4, 4.8], lit: 0.65 });
  pen.pop();
  carre(c);
  // quay life
  tree(pen, rng, 8.3, 4.2, { kind: "round" });
  tree(pen, rng, 8.6, 9.6, { kind: "blossom" });
  tree(pen, rng, 13.2, 10.5, { kind: "elm" });
  tree(pen, rng, 23.6, 10.5, { kind: "elm" });
  lamp(pen, 17.4, 11.0);
  lamp(pen, 32.4, 11.0);
  lamp(pen, 42.6, 11.0);
  bikeRow(pen, rng, 22.2, 10.0, 5, 90);
  bench(pen, 16.0, 9.9, 0);
  person(pen, 15.6, 9.95, 0.42, randomLook(rng), "sit");
  person(pen, 16.5, 9.95, 0.42, randomLook(rng), "sit", true);
  // a busker at the bridge, and the half circle that always forms
  person(pen, 31.7, 9.4, 0, lookOf(SKIN[1], HAIR[5], C.orange, hex("#3c3a3d"), true, C.black), "stand");
  pen.obj(() => {
    const gt = pen.card(31.7, 9.4, 0);
    gt.ellipse(0.12, 1.0, 0.3, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 8 });
    gt.bar(0.3, 1.08, 0.78, 1.36, 0.07, C.woodDark, { layer: 5 });
    pen.box(31.3, 10.2, 0, 0.9, 0.42, 0.14, C.charcoal, { top: C.red, w: W_FINE });
  });
  const ring: [number, number][] = [
    [33.3, 9.0],
    [33.5, 10.1],
    [32.8, 10.9],
    [31.6, 11.1],
    [30.6, 10.7],
    [33.9, 9.6],
  ];
  for (const [x, y] of ring) person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "cheer"]), x > 32.5, rng.chance(0.2) ? 0.72 : 1);
  // a fisherman with all the time in the world
  person(pen, 18.8, 11.32, -0.36, lookOf(SKIN[0], HAIR[7], hex("#6f8f4e"), hex("#6f5d4d"), false, hex("#8a6f52")), "sit");
  pen.obj(() => {
    pen.stroke(
      [
        [19.1, 11.4, 0.55],
        [19.7, 13.5, 1.7],
      ],
      { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [19.7, 13.5, 1.7],
        [19.7, 13.5, WATER + 0.05],
      ],
      { w: 0.03, kind: L_BAR, wobble: 0, sway: 0.0, swayB: 0.12 },
    );
    pen.card(19.7, 13.5, WATER).circle(0, 0.08, 0.1, C.red, { seg: 6, grain: 0, sway: 0.12 });
  });
  pen.box(18.0, 11.0, 0, 0.4, 0.4, 0.36, C.blue, { top: C.white, w: W_FINE });
  // children waving at the barge
  person(pen, 35.8, 11.1, 0, randomLook(rng), "wave", false, 0.72);
  person(pen, 36.6, 11.05, 0, randomLook(rng), "cheer", true, 0.72);
  person(pen, 37.4, 10.9, 0, randomLook(rng), "stand");
  // pedal boats for hire, from a little booth on the quay
  pen.push(45.3, 11.2, 0, 270);
  stall(pen, rng, { w: 3.0, d: 1.8, sign: "BOTEN", a: C.blue, goods: [C.yellow, C.red, C.white] });
  pen.pop();
  person(pen, 8.4, 6.9, 0, randomLook(rng), "stand");
  // lock watchers at the head of the basin
  person(pen, 7.7, 16.9, 0, randomLook(rng), "stand");
  person(pen, 7.8, 18.0, 0, randomLook(rng), "wave", false, 0.72);
  person(pen, 7.6, 29.4, 0, randomLook(rng), "stand", true);
}

// ---------------------------------------------------------------- the locks

function locks(c: BlockCtx): void {
  const { pen, rng } = c;
  const x0 = 9.6;
  const x1 = 12.4;
  const piers: [number, number, boolean][] = [
    [RY0 - 0.2, 13.0, false],
    [17.4, 20.6, true],
    [26.9, 30.1, true],
    [34.5, RY1 + 0.2, false],
  ];
  for (const [ya, yb, house] of piers) {
    pen.obj(() => {
      pen.box(x0, ya, WATER, x1 - x0, yb - ya, -WATER + 0.06, C.quay, { top: C.quayCap });
      if (!house) return;
      const hx = x0 + 0.3;
      const hy = ya + 0.45;
      const hw = 2.2;
      pen.box(hx, hy, 0.06, hw, hw, 2.15, C.white);
      pen.hip(hx - 0.2, hy - 0.2, 2.21, hw + 0.4, hw + 0.4, 1.05, C.tile);
      const f = pen.wall("x+", hx, hy, 0.06, hw, hw);
      f.rect(0.7, 0, 1.5, 1.6, C.door, { outline: true, w: W_FINE });
      const g = pen.wall("y+", hx, hy, 0.06, hw, hw);
      windowAt(g, 0.75, 0.75, 1.45, 1.6, rng.chance(0.7));
      // the red and white shutters every lock-keeper's house has
      for (const a of [0.32, 1.5]) {
        g.rect(a, 0.75, a + 0.38, 1.6, C.red, { outline: true, w: W_FINE, layer: 1 });
        g.poly(
          [
            [a, 0.75],
            [a + 0.38, 0.75],
            [a + 0.19, 1.17],
          ],
          C.white,
          { layer: 2, grain: 0 },
        );
        g.poly(
          [
            [a, 1.6],
            [a + 0.38, 1.6],
            [a + 0.19, 1.17],
          ],
          C.white,
          { layer: 2, grain: 0 },
        );
      }
    });
  }
  const gates: [number, number][] = [
    [13.0, 17.4],
    [20.6, 26.9],
    [30.1, 34.5],
  ];
  for (const [ya, yb] of gates) {
    pen.obj(() => {
      pen.box(10.75, ya, WATER, 0.42, yb - ya, -WATER - 0.3, C.door, { top: C.woodDark });
      const f = pen.wall("x+", 10.75, ya, WATER, 0.42, yb - ya);
      for (let a = 0.4; a < yb - ya; a += 0.45) f.seg(a, 0.25, a, -WATER - 0.35, { w: 0.045, color: hex("#1f4238"), kind: L_MARK, wobble: 0.3 });
      // the walkway over the gate
      pen.box(10.55, ya, -0.3, 0.82, yb - ya, 0.12, C.white, { w: W_THIN });
      railing(
        pen,
        [
          [10.62, ya + 0.1, -0.18],
          [10.62, yb - 0.1, -0.18],
        ],
        0.75,
        C.white,
        1.1,
      );
      // water finding its way through
      const g = pen.floor(WATER, 2);
      for (let k = 0; k < 5; k++) {
        const y = ya + 0.5 + rng.next() * (yb - ya - 1);
        g.line(
          [
            [11.3, y],
            [12.0, y + 0.25],
            [12.7, y - 0.1],
          ],
          { w: 0.1, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
        );
      }
    });
  }
  // the lock keeper, and a rail along the head of the basin
  person(pen, 10.9, 22.4, -0.18, lookOf(SKIN[1], HAIR[1], hex("#27456b"), hex("#2f3b55"), false, hex("#27456b")), "wave");
  railing(
    pen,
    [
      [8.85, RY0 + 0.2, 0],
      [8.85, RY1 - 0.2, 0],
    ],
    0.8,
    C.black,
    1.4,
  );
}

// ---------------------------------------------------------------- the bridge, the parts that stay put

function bridgeStatic(c: BlockCtx): void {
  const { pen } = c;
  const white = C.white;
  // approach spans, with their planking
  const span = (ya: number, yb: number) => {
    pen.obj(() => {
      pen.box(X0, ya, ZD - 0.3, X1 - X0, yb - ya, 0.3, white, { top: C.wood });
      const g = pen.floor(ZD, 1);
      for (let y = ya + 0.3; y < yb; y += 0.55) g.seg(X0 + 0.12, y, X1 - 0.12, y, { w: 0.04, color: C.woodDark, kind: L_MARK, wobble: 0.3, alpha: 0.8 });
      for (const x of [X0 + 0.06, X1 - 0.06]) {
        railing(
          pen,
          [
            [x, ya + 0.05, ZD],
            [x, yb - 0.12, ZD],
          ],
          0.85,
          white,
          1.1,
        );
        for (let y = ya + 0.3; y < yb - 0.1; y += 0.6) bulb(pen, x, y, ZD + 0.9);
      }
    });
  };
  span(RY0, YA);
  span(YB, RY1);
  // ramps up from the street
  const ramp = (ya: number, yb: number, up: boolean) => {
    pen.obj(() => {
      const za = up ? 0 : ZD;
      const zb = up ? ZD : 0;
      pen.solid(
        [
          [X0, ya, 0],
          [X1, ya, 0],
          [X1, yb, 0],
          [X0, yb, 0],
          [X0, ya, za],
          [X1, ya, za],
          [X1, yb, zb],
          [X0, yb, zb],
        ],
        [
          [4, 5, 6, 7],
          [1, 2, 6, 5],
          [0, 3, 7, 4],
          [2, 3, 7, 6],
          [0, 1, 5, 4],
        ],
        [C.wood, white, white, white, white],
        { w: 0.09 },
      );
      for (const x of [X0 + 0.06, X1 - 0.06]) {
        railing(
          pen,
          [
            [x, ya + 0.05, za],
            [x, yb - 0.05, zb],
          ],
          0.85,
          white,
          1.1,
        );
      }
    });
  };
  ramp(RY0 - RAMP, RY0, true);
  ramp(RY1, RY1 + RAMP, false);
  // the two timber piers the leaves hinge on, and the tall frames that carry the balances
  for (const [y, back] of [
    [YA, -1],
    [YB, 1],
  ] as const) {
    pen.obj(() => {
      const py = y + back * 0.38;
      for (const x of [X0 + 0.25, X0 + 1.25, X1 - 1.25, X1 - 0.25]) pen.pole([x, py, WATER - 0.1], [x, py, ZD - 0.3], 0.26, white);
      pen.pole([X0 + 0.25, py, WATER + 0.35], [X1 - 0.25, py, ZD - 0.75], 0.1, white);
      pen.pole([X1 - 0.25, py, WATER + 0.35], [X0 + 0.25, py, ZD - 0.75], 0.1, white);
      pen.box(X0 - 0.22, py - 0.27, ZD - 0.62, X1 - X0 + 0.44, 0.54, 0.32, white, { w: W_THIN });
      // struts from the bank and the pier, so the long spans do not look unsupported
      const bank = back < 0 ? RY0 : RY1;
      for (const x of [X0 + 0.3, X1 - 0.3]) {
        pen.pole([x, bank, -1.5], [x, bank - back * 2.3, ZD - 0.3], 0.13, white);
        pen.pole([x, py, -1.5], [x, py + back * 2.3, ZD - 0.3], 0.13, white);
      }
    });
    pen.obj(() => {
      for (const x of [X0 - 0.14, X1 + 0.14]) {
        pen.pole([x, y, ZD - 0.3], [x, y, ZP + 0.1], 0.28, white);
        pen.pole([x, y, ZP - 0.1], [x, y + back * 2.5, ZD + 0.05], 0.13, white);
        for (let z = ZD + 0.5; z < ZP; z += 0.62) bulb(pen, x, y, z);
      }
      pen.pole([X0 - 0.14, y, ZP + 0.12], [X1 + 0.14, y, ZP + 0.12], 0.24, white);
      pen.pole([X0 - 0.14, y, ZP - 1.1], [X0 + 0.9, y, ZP + 0.05], 0.1, white);
      pen.pole([X1 + 0.14, y, ZP - 1.1], [X1 - 0.9, y, ZP + 0.05], 0.1, white);
      for (let x = X0 + 0.3; x < X1; x += 0.6) bulb(pen, x, y, ZP + 0.3);
    }, 0.12);
  }
  // barrier posts and lanterns at both ends
  for (const y of [RY0 - 0.9, RY1 + 0.9]) {
    pen.box(X0 - 0.62, y - 0.18, deckZ(y), 0.36, 0.36, 1.05, C.red, { top: C.white, w: W_FINE });
    lamp(pen, X1 + 0.55, y, 0, 2.7);
  }
  lamp(pen, X0 - 0.6, RY0 - 2.4, 0, 2.7);
  lamp(pen, X0 - 0.6, RY1 + 2.4, 0, 2.7);
}

/** How far the leaves are up (radians) and how far the barriers are down (0 to 1) at a moment of the cycle. */
function bridgeState(p: number): { lift: number; bar: number } {
  const lift = 1.2 * (smooth(T_UP, T_GO, p) - smooth(T_DOWN, T_OPEN, p));
  const bar = smooth(T_BAR, T_UP, p) - smooth(T_OPEN, CYCLE, p);
  return { lift, bar };
}

/** The moving parts: two leaves, their balances and chains, and the barriers. World coordinates. */
function bridgeMoving(pen: Pen, ox: number, oy: number, lift: number, bar: number): void {
  const cs = Math.cos(lift);
  const sn = Math.sin(lift);
  const white = C.white;
  pen.begin();
  for (const [h, s] of [
    [YA, 1],
    [YB, -1],
  ] as const) {
    const hy = oy + h;
    const tipY = hy + s * LEAF * cs;
    const tipZ = ZD + LEAF * sn;
    plank(pen, ox + X0, ox + X1, hy, ZD, tipY, tipZ, 0.24, C.wood, white);
    const uy = -s * sn;
    const uz = cs;
    for (const x of [ox + X0 + 0.07, ox + X1 - 0.07]) {
      pen.pole([x, hy + s * 0.15 * cs + uy * 0.85, ZD + 0.15 * sn + uz * 0.85], [x, hy + s * (LEAF - 0.05) * cs + uy * 0.85, ZD + (LEAF - 0.05) * sn + uz * 0.85], 0.09, white);
      for (const d of [0.2, 1.25, 2.3, 3.4]) {
        pen.pole([x, hy + s * d * cs, ZD + d * sn], [x, hy + s * d * cs + uy * 0.85, ZD + d * sn + uz * 0.85], 0.07, white);
        bulb(pen, x, hy + s * d * cs + uy * 0.9, ZD + d * sn + uz * 0.9);
      }
    }
    // the balance: front arm over the leaf, rear arm with the counterweight, chains down to the leaf's tip
    const fy = hy + s * 3.5 * cs;
    const fz = ZP + 3.5 * sn;
    const ry = hy - s * 2.7 * cs;
    const rz = ZP - 2.7 * sn;
    for (const x of [ox + X0 - 0.14, ox + X1 + 0.14]) {
      pen.pole([x, ry, rz], [x, fy, fz], 0.2, white);
      pen.stroke(
        [
          [x, fy, fz],
          [x, tipY, tipZ + 0.12],
        ],
        { w: 0.05, kind: L_BAR, wobble: 0 },
      );
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        bulb(pen, x, ry + (fy - ry) * t, rz + (fz - rz) * t + 0.2);
      }
    }
    pen.pole([ox + X0 - 0.14, ry, rz], [ox + X1 + 0.14, ry, rz], 0.5, C.greyDark);
    pen.pole([ox + X0 - 0.14, fy, fz], [ox + X1 + 0.14, fy, fz], 0.12, white);
  }
  // barriers: red and white booms that come down across the way
  const ang = (1 - bar) * 1.35;
  for (const y of [RY0 - 0.9, RY1 + 0.9]) {
    const bx = ox + X0 - 0.44;
    const bz = deckZ(y) + 1.0;
    const len = X1 - X0 + 0.5;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * len;
      const b = ((k + 1) / 4) * len;
      pen.pole([bx + Math.cos(ang) * a, oy + y, bz + Math.sin(ang) * a], [bx + Math.cos(ang) * b, oy + y, bz + Math.sin(ang) * b], 0.14, k % 2 === 0 ? C.red : white);
    }
  }
  pen.end();
}

// ---------------------------------------------------------------- the south bank

function southBank(c: BlockCtx): void {
  const { pen, rng } = c;
  // the rowing club: boathouse, a rack of shells, and a crew walking one down to the water
  pen.obj(() => {
    const wall = hex("#d7e2e6");
    pen.box(8.6, 37.5, 0, 8.4, 3.6, 2.7, wall);
    pen.gable(8.4, 37.3, 2.7, 8.8, 4.0, 1.15, "x", C.blueDark, { gable: wall });
    const f = pen.wall("y+", 8.6, 37.5, 0, 8.4, 3.6);
    f.rect(0.5, 0, 3.7, 2.3, C.charcoal, { outline: true, w: W_THIN });
    for (const [b, col] of [
      [0.5, C.red],
      [1.0, C.yellow],
      [1.5, C.white],
    ] as const) {
      f.rect(0.7, b, 3.5, b + 0.22, col, { layer: 1, grain: 0.3 });
    }
    f.rect(4.4, 0, 7.6, 2.3, C.blueDark, { outline: true, w: W_THIN });
    f.seg(6.0, 0, 6.0, 2.3, { w: 0.05, wobble: 0 });
    f.rect(1.6, 2.36, 6.8, 3.0, C.white, { outline: true, w: W_FINE, layer: 1 });
    f.text("DE AMSTEL", 4.2, 2.48, 0.38, { align: "c", layer: 2 });
    const g = pen.wall("x+", 8.6, 37.5, 0, 8.4, 3.6);
    windowAt(g, 1.2, 0.9, 2.4, 2.0, rng.chance(0.6));
  });
  pen.obj(() => {
    for (const x of [18.4, 23.4]) {
      pen.pole([x, 38.6, 0], [x, 38.6, 2.1], 0.11, C.metal);
      pen.pole([x, 40.4, 0], [x, 40.4, 2.1], 0.11, C.metal);
      for (const z of [0.7, 1.4, 2.1]) pen.pole([x, 38.4, z], [x, 40.6, z], 0.08, C.metal, { ink: false });
    }
    const cols = [C.red, C.white, C.yellow, C.blue, C.white, C.orange];
    let k = 0;
    for (const z of [0.74, 1.44, 2.14]) {
      for (const y of [38.9, 40.0]) pen.box(16.6, y, z, 8.8, 0.44, 0.26, cols[k++ % 6], { w: W_FINE, grain: 0.4 });
    }
  });
  const crewLook = (i: number) => lookOf(SKIN[i % 5], HAIR[(i * 3) % 8], C.orange, hex("#2f3b55"), i % 2 === 0);
  pen.obj(() => {
    pen.box(17.4, 36.86, 2.28, 8.4, 0.5, 0.26, C.yellow, { w: W_FINE, grain: 0.4 });
    for (let i = 0; i < 4; i++) person(pen, 18.6 + i * 2.0, 37.1, 0, crewLook(i), "cheer", i % 2 === 0);
  });
  // the club's landing stage, far enough out to be seen over the quay
  pen.obj(() => {
    pen.box(12.9, 30.4, WATER - 0.1, 2.0, 5.6, 0.42, C.wood, { top: hex("#d9b184"), w: W_THIN });
    for (const y of [30.55, 33.2]) for (const x of [12.9, 14.9]) pen.pole([x, y, WATER - 0.2], [x, y, WATER + 0.8], 0.15, C.woodDark);
    person(pen, 13.5, 31.0, WATER + 0.32, crewLook(5), "stand");
    person(pen, 14.3, 32.1, WATER + 0.32, crewLook(6), "wave", true);
    for (const x of [13.2, 13.45]) {
      pen.stroke(
        [
          [x, 32.6, WATER + 0.36],
          [x + 0.2, 35.2, WATER + 0.36],
        ],
        { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
  });
  // trees and a bench facing the river
  tree(pen, rng, 7.7, 39.6, { kind: "round" });
  tree(pen, rng, 25.6, 40.6, { kind: "blossom" });
  bench(pen, 22.4, 36.9, 180);
  // the waterside terrace
  pen.push(42.8, 38.7, 0, 0);
  stall(pen, rng, { w: 3.4, sign: "KOFFIE", a: C.orange, goods: [C.white, hex("#8b5a3c"), C.yellow] });
  pen.pop();
  const tables: [number, number, RGB | null][] = [
    [32.9, 37.7, C.red],
    [36.0, 37.6, null],
    [39.2, 37.8, C.yellow],
    [34.4, 40.2, C.blue],
    [37.8, 40.3, null],
    [40.9, 40.5, C.red],
  ];
  for (const [x, y, par] of tables) cafeTable(pen, rng, x, y, par, rng.int(2, 5));
  railing(
    pen,
    [
      [31.2, 36.25, 0],
      [47.2, 36.25, 0],
    ],
    0.75,
    C.white,
    1.3,
  );
  railing(
    pen,
    [
      [9.2, 36.25, 0],
      [26.4, 36.25, 0],
    ],
    0.75,
    C.white,
    1.3,
  );
  tree(pen, rng, 46.4, 40.9, { kind: "round" });
  person(pen, 31.9, 39.6, 0, randomLook(rng), "stand");
  person(pen, 45.6, 37.3, 0, randomLook(rng), "wave", true);
  lamp(pen, 31.2, 41.2);
  lamp(pen, 20.6, 41.2);
}

// ---------------------------------------------------------------- moored things

function moorings(c: BlockCtx): void {
  const { pen, rng } = c;
  pen.push(14.2, 12.75, WATER, 0);
  sloep(pen, rng, { color: C.white, crew: [], flag: null });
  pen.pop();
  // the pedal boat pontoon (kept west of the line the ring boats take across this corner)
  pen.obj(() => {
    pen.box(32.9, RY0 + 0.05, WATER - 0.1, 9.2, 0.85, 0.4, C.wood, { top: hex("#d9b184"), w: W_THIN });
  });
  const cols = [C.yellow, C.red, C.teal, C.orange];
  for (let i = 0; i < 4; i++) {
    pen.push(34.1 + i * 2.4, 12.98, WATER, i % 2 === 0 ? 0 : 180);
    pedalo(pen, rng, cols[i], false);
    pen.pop();
  }
  person(pen, 33.3, 11.95, WATER + 0.3, randomLook(rng), "stand");
  // houseboats along the outer quay, where the river meets the ring
  pen.push(49.75, 4.4, WATER, 90);
  houseboat(pen, rng, { L: 8, lit: 0.8 });
  pen.pop();
  pen.push(49.75, 42.0, WATER, 270);
  houseboat(pen, rng, { L: 8, lit: 0.8 });
  pen.pop();
}

function ground(c: BlockCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // the north quay and the street down to the bridge
  g1.rect(6.4, 7.9, 47.3, RY0 - 0.25, C.street);
  g1.rect(26.4, 0.9, 30.6, 7.9, C.street);
  speckle(g3, 6.6, 8.5, 47.1, RY0 - 0.4, C.streetDark, 0.4);
  g1.rect(6.4, 0.9, 10.4, 7.9, C.grass, { outline: true, w: W_THIN });
  tufts(g3, 6.6, 1.1, 10.2, 7.7, 0.4);
  g2.rect(37.9, 7.8, 39.7, 10.6, C.red, { outline: true, w: W_FINE });
  // the south bank: lawn, the way off the bridge, the terrace decking
  g1.rect(6.4, RY1 + 0.25, 26.4, 41.6, C.grass);
  tufts(g3, 6.6, RY1 + 0.5, 26.2, 41.4, 0.3, (a, b) => !(a > 8.2 && a < 17.4 && b > 37.1) && !(a > 16.2 && a < 25.8 && b > 38.2 && b < 40.9));
  g1.rect(26.4, RY1 + 0.25, 30.6, 41.6, C.street);
  g1.rect(30.6, RY1 + 0.25, 47.3, 41.6, hex("#dcb98f"), { outline: true, w: W_THIN });
  for (let y = RY1 + 0.9; y < 41.5; y += 0.7) g3.seg(30.8, y, 47.1, y, { w: 0.045, color: C.woodDark, kind: L_MARK, wobble: 0.4, alpha: 0.7 });
  // under the bridge the water is in shade
  pen.floor(WATER, 2).rect(X0, RY0, X1, RY1, C.waterDeep, { grain: 0.6, kind: F_WATER });
}

// ---------------------------------------------------------------- the block

export const amstel: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.early(() => ground(c));
  c.focus(27, 23);

  northBank(c);
  locks(c);
  bridgeStatic(c);
  southBank(c);
  moorings(c);

  const ox = c.ox;
  const oy = c.oy;
  const born = c.done;
  /**
   * When the first cycle starts. On the tour it is set so the leaves go up as
   * the camera comes in and the barge sets off just as it arrives.
   */
  const start = (): number => {
    const at = c.visit();
    return at == null ? born + 1.2 : at + 0.1 - T_GO;
  };
  /** Which cycle we are in and how far into it. Before the first cycle the bridge simply stands closed. */
  const cycle = (t: number): [number, number] => {
    const tt = Math.max(0, t - start());
    const n = Math.floor(tt / CYCLE);
    return [n, tt - n * CYCLE];
  };

  // the leaves, balances and barriers, redrawn every frame
  const tBridge = pen.reveal(ox + BX, oy + 23.75, 0) + 0.35;
  c.movers.push((m) => {
    if (m.t < tBridge || !m.sees(ox + BX, oy + 23.75, 2, 12)) return;
    const { lift, bar } = bridgeState(cycle(m.t)[1]);
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => tBridge;
    dp.rng = new Rng(1207);
    bridgeMoving(dp, ox, oy, lift, bar);
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // the barge: one passage per opening, east then west, swinging round at each end to wait for the next
  const wz = c.oz + WATER;
  const bargeSet = new Turning(
    (p) => {
      p.push(0, 0, 0, 0, 0.86);
      barge(p);
      p.pop();
    },
    32,
    77,
  );
  const P: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born) return;
    const [n, p] = cycle(m.t);
    const east = n % 2 === 0;
    const k = 0.5 - 0.5 * Math.cos(Math.PI * clamp((p - T_GO) / 5.5, 0, 1));
    const x = east ? HOLD_W + (HOLD_E - HOLD_W) * k : HOLD_E - (HOLD_E - HOLD_W) * k;
    const turn = Math.PI * smooth(T_GO + 5.5, T_GO + 8.2, p);
    m.put(bargeSet.at((east ? 0 : Math.PI) + turn), ox + x, oy + MIDY, wz, born);
  });

  // cyclists and walkers who cross while the bridge is down and wait at the barrier while it is up
  const zAt = (_x: number, y: number) => deckZ(y - oy);
  /** Ride from yFrom to yTurn on one side of the road, swing round, and come back on the other side as far as yTo. */
  const there = (x: number, yFrom: number, yTo: number, yTurn: number): Route => {
    const xb = 2 * BX - x;
    return new Route(
      drape(
        rounded(
          [
            [ox + x, oy + yFrom, 0],
            [ox + x, oy + yTurn, 0],
            [ox + xb, oy + yTurn, 0],
            [ox + xb, oy + yTo, 0],
          ],
          false,
          0.65,
        ),
        false,
        zAt,
        0.6,
      ),
      false,
    );
  };
  const shuttle = (south: Route, north: Route, dep: number, speed: number, parity: number, at: number, sprite: (h: number, t: number, moving: boolean) => Sprite): Mover => {
    return (m) => {
      if (m.t < at) return;
      const [n, p] = cycle(m.t);
      const r = (n + parity) % 2 === 0 ? south : north;
      const s = clamp((p - dep) * speed, 0, r.length);
      r.pos(s, P);
      m.put(sprite(r.heading(s, 0.9), m.t, s > 0 && s < r.length), P[0], P[1], P[2], at);
    };
  };
  const kinds = cyclists();
  const riders: [number, number, number, number][] = [
    // [queue place, departure, parity, which cyclist]
    [0, 0.8, 0, 3],
    [1, 2.6, 0, 9],
    [0, 4.6, 1, 14],
    [1, 6.6, 1, 20],
  ];
  for (const [q, dep, parity, k] of riders) {
    const kind = kinds[k % kinds.length];
    const south = there(BX + 0.7, 8.4 - q * 2.1, 38.4 + q * 1.5, 40.9);
    const north = there(BX - 0.7, 38.4 + q * 1.5, 8.4 - q * 2.1, 2.6);
    c.movers.push(shuttle(south, north, dep, 5, parity, born + 0.3 + q * 0.2, (h, t, moving) => kind.frames[moving ? Math.floor(t * 3.2 + k) & 1 : 0].at(h)));
  }
  const feet = walkers();
  const strollers: [number, number, number, number][] = [
    [BX - 1.25, 0.5, 0, 4],
    [BX + 1.25, 1.6, 1, 11],
    [BX - 1.3, 2.4, 1, 17],
  ];
  for (const [x, dep, parity, k] of strollers) {
    const kind = feet[k % feet.length];
    const line = (ya: number, yb: number) =>
      new Route(
        drape(
          [
            [ox + x, oy + ya, 0],
            [ox + x, oy + yb, 0],
          ],
          false,
          zAt,
          0.6,
        ),
        false,
      );
    const south = line(8.9 - (k % 3) * 0.5, 38.6 + (k % 3) * 0.4);
    const north = line(38.6 + (k % 3) * 0.4, 8.9 - (k % 3) * 0.5);
    c.movers.push(shuttle(south, north, dep, 2.3, parity, born + 0.4, (h, t, moving) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][moving ? Math.floor(t * 2.6 + k) & 1 : 1]));
  }

  // the eight, lap after lap, under both spans of the bridge
  const lap: V3[] = [[ox + TURN_E, oy + LANE_N, wz]];
  const rT = (LANE_S - LANE_N) / 2;
  const mid = (LANE_S + LANE_N) / 2;
  for (let i = 0; i <= 14; i++) {
    const t = -Math.PI / 2 - (Math.PI * i) / 14;
    lap.push([ox + TURN_W + Math.cos(t) * rT, oy + mid + Math.sin(t) * rT, wz]);
  }
  for (let i = 0; i <= 14; i++) {
    const t = Math.PI / 2 - (Math.PI * i) / 14;
    lap.push([ox + TURN_E + Math.cos(t) * rT, oy + mid + Math.sin(t) * rT, wz]);
  }
  lap.pop();
  const course = new Route(lap, true);
  const crew: Look[] = [];
  for (let i = 0; i < 9; i++) crew.push(lookOf(rng.pick(SKIN), rng.pick(HAIR), i === 8 ? C.white : C.orange, hex("#2f3b55"), rng.chance(0.5), i === 8 ? C.orange : null));
  const strokes = [0, 1, 2, 3].map((f) => new Turning((p) => eight(p, crew, f), 32, 131 + f));
  c.movers.push(
    traveler(course, {
      speed: 4.3,
      at: 0.1,
      born: born + 0.4,
      span: 3.2,
      sprite: (h, t) => strokes[Math.floor(t * 2.6) & 3].at(h),
    }),
  );

  // a pedal boat pottering about where nobody else goes
  const potter = new Route(
    rounded(
      [
        [ox + 31.6, oy + 19.6, wz],
        [ox + 34.6, oy + 19.6, wz],
        [ox + 34.6, oy + 20.2, wz],
        [ox + 31.6, oy + 20.2, wz],
      ],
      true,
      0.29,
    ),
    true,
  );
  const pedal = new Turning((p) => pedalo(p, new Rng(5), C.pink, true), 24, 5);
  c.movers.push(traveler(potter, { speed: 0.55, at: 0.2, born: born + 0.6, span: 1.0, sprite: (h) => pedal.at(h) }));
};
