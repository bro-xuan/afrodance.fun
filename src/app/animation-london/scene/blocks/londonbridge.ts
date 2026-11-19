// London Bridge: the south bank opposite the Tower. The Shard stands in the
// front corner with a station entrance at its foot. A brick railway viaduct
// crosses the block, and Borough Market fills its arches and the green iron
// shed beside it: cheese, bread, oysters, pies, and a crowd eating on its
// feet. Behind the tracks, by the river, are Southwark Cathedral's tower, a
// sunken amphitheatre with a busker in it, fountains that children run
// through, the leaning glass egg of the old City Hall, and HMS Belfast moored
// alongside, dressed in signal flags. A train pulls in as the camera arrives.

import { RGB, Rng, V2, V3, clamp, hex } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, Pen } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, WalkerKind, makeSprite, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  battlements,
  bin,
  bulb,
  dog,
  flag,
  hat,
  lamp,
  lancet,
  lightString,
  person,
  pigeon,
  pointed,
  pub,
  randomLook,
  snapper,
  speckle,
  stall,
  suit,
  tree,
  tubeSign,
  tufts,
  unionJack,
} from "../props";

const BRICK = hex("#c4a06d");
const BRICK_D = hex("#a3804f");
const GREEN = hex("#3f7a5c");
const GREEN_D = hex("#2e5a45");
const ROOF_GLASS = hex("#d5e7e1");
const GLASS = hex("#b5d0e1");
const GLASS_D = hex("#8dafc8");
const GLASS_L = hex("#dceaf2");
const EGG = hex("#a8c8d9");
const GREY = hex("#b6bec5");
const GREY_D = hex("#8494a6");
const GREY_L = hex("#d6dbdf");
const TEAK = hex("#c2a67e");
const STONE = hex("#d9cdb3");
const STONE_D = hex("#bdb094");
const STONE_L = hex("#eee6d2");
const PAVE = hex("#e8e3d8");
const WET = hex("#c3d1d8");
const TREAD = hex("#ded9ce");
const RISER = hex("#b7b1a5");
const PIT = hex("#cdc7bb");
const COFFEE = hex("#8b5a3c");

// The railway viaduct crosses the block from west to east.
const VX0 = 4.3;
const VX1 = 43.7;
const VY0 = 18.2;
const VY1 = 24.4;
const VZ = 3.2;
const BAYS = 10;
const BAY = (VX1 - VX0) / BAYS;
/** The track the train uses (the one nearest the camera), the far track, and the island platform between them. */
const TRACK = 23.1;
const TRACK_FAR = 19.5;
const PLAT_Y0 = 20.6;
const PLAT_Y1 = 22.0;
const PLAT_X0 = 16.5;
const PLAT_X1 = 41.8;
const PLAT_Z = VZ + 0.34;

// The fountain square, and where its sixteen jets come up.
const FX0 = 25.4;
const FY0 = 7.3;
const FX1 = 30.8;
const FY1 = 13.7;
const JETS: V2[] = [];
for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) JETS.push([26.2 + i * 1.27, 8.1 + j * 1.6]);

// The amphitheatre: its centre at street level, the radius of the hole at each step down, and the height of a step.
const SC: V2 = [20.0, 10.7];
const SC_R = [4.2, 3.35, 2.5, 1.65];
const SC_H = 0.5;

const EGG_AT: V2 = [36.6, 10.2];

// HMS Belfast: her centre line, bow and stern (she points up river), and the height of her deck.
const SHIP_Y = -4.8;
const BOW = 9.4;
const STERN = 36.0;
const DECK = WATER + 2.6;

// The Shard: its plan is a square with the corners cut off, shrinking as it climbs.
const SH_X = 4.5;
const SH_Y = 35.1;
const SH_W = 8.4;
const SH_CX = SH_X + SH_W / 2;
const SH_CY = SH_Y + SH_W / 2;
const SH_Z0 = 1.2;
const SH_Z1 = 40;
const shHalf = (z: number) => 4.2 - (3.45 * (z - SH_Z0)) / (SH_Z1 - SH_Z0);

/** The eight corners of the Shard's plan at height z, anticlockwise, starting at the east face. */
function shRing(z: number): V3[] {
  const h = shHalf(z);
  const q = h * 0.76;
  const plan: V2[] = [
    [h, -q],
    [h, q],
    [q, h],
    [-q, h],
    [-h, q],
    [-h, -q],
    [-q, -h],
    [q, -h],
  ];
  return plan.map(([x, y]) => [SH_CX + x, SH_CY + y, z] as V3);
}

function disc(cx: number, cy: number, r: number, n = 30): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

/**
 * What shows of a round floor that lies d below a round hole of the same
 * size: on the page the floor is the hole's circle slid d towards the camera,
 * and the near wall of the hole hides the part of it that slides out.
 */
function lens(cx: number, cy: number, r: number, d: number): V2[] {
  const phi = Math.acos(d / (Math.SQRT2 * r));
  const pts: V2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = (5 * Math.PI) / 4 - phi + (2 * phi * i) / n;
    pts.push([cx + d + Math.cos(t) * r, cy + d + Math.sin(t) * r]);
  }
  for (let i = 1; i < n; i++) {
    const t = Math.PI / 4 - phi + (2 * phi * i) / n;
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

/** Someone with something to eat in their hand. */
function eater(pen: Pen, rng: Rng, x: number, y: number, flip: boolean, s = 1): void {
  pen.obj(() => {
    person(pen, x, y, 0, randomLook(rng), "stand", flip, s);
    const k = pen.card(x, y, 0, flip);
    k.rect(0.34 * s, 0.84 * s, 0.62 * s, 1.0 * s, rng.pick([C.white, C.ochre, C.cream, C.yellow]), { outline: true, w: 0.035, layer: 5, grain: 0 });
  });
}

/** An upturned barrel to stand a drink on. */
function barrel(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.cyl(x, y, 0, 0.42, 1.0, C.wood, { seg: 9, w: W_THIN, top: C.woodDark, r2: 0.38 });
    const k = pen.card(x, y, 0);
    for (const b of [0.26, 0.76]) k.seg(-0.4, b, 0.4, b, { w: 0.05, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 1 });
  });
}

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // granite paving by the river, cobbles under the market
  g1.rect(4.05, 5.45, 43.95, VY0, PAVE, { grain: 0.7 });
  g1.rect(4.05, VY1, 43.95, 35.6, C.street, { grain: 0.8 });
  g2.seg(4.2, 35.6, 43.8, 35.6, { w: 0.06, color: C.streetDark, kind: L_MARK });
  speckle(g2, 4.4, VY1 + 0.4, 43.6, 35.3, C.streetDark, 0.3);
  // the churchyard, and a strip of park by Tower Bridge
  g2.rect(4.2, 5.7, 15.0, 16.0, C.grass, { outline: true, w: W_THIN });
  tufts(g3, 4.5, 13.3, 14.7, 15.8, 0.5);
  tufts(g3, 4.5, 5.9, 14.7, 7.7, 0.4);
  g2.rect(41.3, 5.7, 43.85, 16.2, C.grass, { outline: true, w: W_THIN });
  tufts(g3, 41.5, 5.9, 43.7, 16.0, 0.45);
  // wet granite where the fountains play
  g2.rect(FX0, FY0, FX1, FY1, WET, { outline: true, w: W_FINE, grain: 0.5 });
  for (const [x, y] of JETS) g3.circle(x, y, 0.1, C.greyDark, { seg: 6, grain: 0 });
  // The amphitheatre is sunk into the square. Nothing can be dug out of the
  // ground here, so it is painted the way it would look: each step down is
  // the hole's circle again, slid a little towards the camera.
  for (let k = 0; k < SC_R.length; k++) {
    const cx = SC[0] + k * SC_H;
    const cy = SC[1] + k * SC_H;
    const rim = pen.floor(0, 2 + 2 * k);
    rim.poly(disc(cx, cy, SC_R[k]), RISER, { grain: 0.6 });
    rim.loop(disc(cx, cy, SC_R[k]), { w: k === 0 ? 0.08 : 0.05 });
    pen.floor(0, 3 + 2 * k).poly(lens(cx, cy, SC_R[k], SC_H), k === SC_R.length - 1 ? PIT : TREAD, { grain: 0.6 });
  }
}

// ---------------------------------------------------------------- Southwark Cathedral

function cathedral(c: LondonCtx): void {
  const { pen, rng } = c;
  const tx = 4.8;
  const ty = 8.0;
  const tw = 5.0;
  const th = 12.2;
  // the nave runs east from the tower
  pen.obj(() => {
    pen.box(tx + tw, ty + 0.5, 0, 4.6, 4.0, 5.0, STONE);
    const f = pen.wall("y+", tx + tw, ty + 0.5, 0, 4.6, 4.0);
    for (const a of [0.55, 2.7]) lancet(f, a, 1.2, a + 1.35, 4.4, rng.chance(0.7), STONE_L);
    f.ticks(0.2, 0.15, 4.4, 1.0, { n: 9, len: 0.45, ang: 0, jit: 0.02, color: STONE_D, w: 0.055 });
    lancet(pen.wall("x+", tx + tw, ty + 0.5, 0, 4.6, 4.0), 1.0, 1.0, 3.0, 4.8, true, STONE_L);
    for (const a of [0.0, 2.1, 4.2]) pen.box(tx + tw + a, ty + 4.5, 0, 0.4, 0.42, 3.9, STONE_L, { w: W_THIN });
  });
  pen.obj(() => pen.gable(tx + tw, ty + 0.5, 5.0, 4.6, 4.0, 2.4, "x", C.slate, { gable: STONE }), 0.1);
  pen.obj(() => {
    pen.box(tx, ty, 0, tw, tw, th, STONE);
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, tx, ty, 0, tw, tw);
      f.rect(0, 7.6, tw, 7.86, STONE_L, { grain: 0.4 });
      f.seg(0, 7.6, tw, 7.6, { w: W_FINE });
      for (const a of [0.75, 2.95]) lancet(f, a, 8.3, a + 1.3, 11.3, false, STONE_L);
      if (side === "x+") continue;
      f.rect(0, 3.5, tw, 3.76, STONE_L, { grain: 0.4 });
      f.seg(0, 3.5, tw, 3.5, { w: W_FINE });
      for (const a of [0.75, 2.95]) lancet(f, a, 4.3, a + 1.3, 7.0, rng.chance(0.6), STONE_L);
      f.poly(pointed(1.7, 0, 3.3, 2.7), hex("#5a4636"), { outline: true, w: W_FINE, grain: 0.6 });
      f.ticks(0.2, 0.15, tw - 0.2, 3.3, { n: 12, len: 0.45, ang: 0, jit: 0.02, color: STONE_D, w: 0.055, inside: (a) => a < 1.5 || a > 3.5 });
    }
  }, 0.08);
  pen.obj(() => {
    battlements(pen, tx, ty, th, tw, tw, STONE_L, 0.5, 0.45);
    const corners: V2[] = [
      [tx, ty],
      [tx + tw, ty],
      [tx + tw, ty + tw],
      [tx, ty + tw],
    ];
    for (const [px, py] of corners) {
      pen.box(px - 0.38, py - 0.38, th - 0.2, 0.76, 0.76, 1.5, STONE_L, { w: W_FINE });
      pen.cone(px, py, th + 1.3, 0.5, 1.5, STONE_D, { seg: 6, w: W_FINE });
    }
  }, 0.3);
  flag(pen, tx + tw / 2, ty + tw / 2, th, 3.6, "england", 0.9);

  // lunch in the churchyard, and the vicar at the door
  for (const [x, y] of [
    [5.6, 13.9],
    [8.9, 14.2],
    [10.6, 13.6],
    [12.0, 14.1],
    [13.4, 13.6],
  ]) {
    person(pen, x, y, -0.05, randomLook(rng), "bust", rng.chance(0.5));
  }
  pen.obj(() => {
    const vicar: Look = { skin: SKIN[0], hair: HAIR[7], top: C.black, legs: C.black, long: false, hat: null };
    person(pen, 7.3, 13.4, 0, vicar, "wave");
    pen.card(7.3, 13.4, 0).rect(-0.12, 1.34, 0.12, 1.43, C.white, { layer: 3, grain: 0 });
  });
}

// ---------------------------------------------------------------- the riverside

/** The old City Hall: a glass egg that leans back from the river. */
function cityHall(c: LondonCtx): void {
  const { pen, rng } = c;
  const [cx, cy] = EGG_AT;
  // height and radius of each ring of the egg; it leans 0.2 south for every unit it rises
  const prof: V2[] = [
    [0, 3.2],
    [1.2, 3.8],
    [2.6, 4.15],
    [4.1, 4.2],
    [5.6, 3.9],
    [7.1, 3.35],
    [8.5, 2.6],
    [9.6, 1.8],
  ];
  const lean = 0.2;
  const n = 18;
  const at = (k: number, a: number, out = 0): V3 => [cx + Math.cos(a) * (prof[k][1] + out), cy + prof[k][0] * lean + Math.sin(a) * (prof[k][1] + out), prof[k][0]];
  const verts: V3[] = [];
  for (let k = 0; k < prof.length; k++) for (let i = 0; i < n; i++) verts.push(at(k, (i / n) * Math.PI * 2));
  const faces: number[][] = [];
  const cols: RGB[] = [];
  for (let k = 0; k + 1 < prof.length; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i]);
      cols.push(EGG);
    }
  }
  const lid: number[] = [];
  for (let i = 0; i < n; i++) lid.push((prof.length - 1) * n + i);
  faces.push(lid);
  cols.push(C.slateLight);
  pen.obj(() => {
    pen.solid(verts, faces, cols, { crease: 60, over: 0, w: 0.1, glow: 0.5, grain: 0.5 });
    // a white band at every floor, round the half of it that shows
    for (let k = 1; k < prof.length; k++) {
      const pts: V3[] = [];
      for (let q = 0; q <= 12; q++) pts.push(at(k, ((-42 + (176 * q) / 12) * Math.PI) / 180, 0.02));
      pen.stroke(pts, { w: 0.075, color: C.white, kind: L_MARK, wobble: 0.15, alpha: 0.9 });
    }
    for (const deg of [-10, 20, 45, 70, 100]) {
      const pts: V3[] = [];
      for (let k = 0; k < prof.length; k++) pts.push(at(k, (deg * Math.PI) / 180, 0.02));
      pen.stroke(pts, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0.15, alpha: 0.7 });
    }
  }, 0.1);
  flag(pen, 40.6, 14.2, 0, 5.2, "uk", 0.95);
  person(pen, 35.4, 13.9, 0, suit(rng), "stand");
  person(pen, 40.7, 8.3, 0, suit(rng), "walkA", true);
  snapper(pen, 40.3, 12.4, randomLook(rng), true);
}

function riverside(c: LondonCtx): void {
  const { pen, rng } = c;
  // a plane tree behind the viaduct, two more trees in the park
  tree(pen, rng, 5.6, 16.9, { kind: "elm" });
  tree(pen, rng, 42.6, 7.6, { kind: "round" });
  tree(pen, rng, 42.5, 14.6, { kind: "blossom" });
  person(pen, 42.3, 10.0, -0.05, randomLook(rng), "bust");
  person(pen, 43.0, 10.8, -0.05, randomLook(rng), "bust", true);
  dog(pen, 42.4, 12.0, hex("#e0994d"), true, 0.9, true);
  lamp(pen, 32.0, 14.6);
  lamp(pen, 24.8, 15.4);

  // the way to the ship
  pen.obj(() => {
    pen.pole([23.6, 5.62, 0], [23.6, 5.62, 2.45], 0.09, C.iron);
    pen.pole([27.2, 5.62, 0], [27.2, 5.62, 2.45], 0.09, C.iron);
    const sg = pen.plane([23.5, 5.64, 1.6], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 3.8, 0.85, C.navy, { outline: true, w: W_FINE, grain: 0.3 });
    sg.text("HMS BELFAST", 1.9, 0.26, 0.34, { align: "c", color: C.white, kind: L_MARK, w: 0.065, layer: 1 });
  });

  // the amphitheatre's audience: on the steps of the far side, feet on the step below
  for (let k = 0; k < SC_R.length - 1; k++) {
    const cx = SC[0] + (k + 1) * SC_H;
    const cy = SC[1] + (k + 1) * SC_H;
    const r = SC_R[k] - 0.14;
    const n = 7 - 2 * k;
    for (let i = 0; i < n; i++) {
      if (rng.chance(0.14)) continue;
      const deg = 152 + (146 * (i + rng.range(0.2, 0.8))) / n;
      const t = (deg * Math.PI) / 180;
      person(pen, cx + Math.cos(t) * r, cy + Math.sin(t) * r, 0.07, randomLook(rng), "sit", deg > 225, rng.chance(0.15) ? 0.74 : 1);
    }
  }
  // and what they are watching: a busker, and two children who cannot keep still
  const fx = SC[0] + SC_R.length * SC_H;
  const fy = SC[1] + SC_R.length * SC_H;
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.hat = C.black;
    person(pen, fx - 0.2, fy - 0.5, 0.07, lk, "stand");
    const gt = pen.card(fx - 0.2, fy - 0.5, 0.07);
    gt.ellipse(0.12, 1.0, 0.3, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 8 });
    gt.bar(0.3, 1.08, 0.78, 1.36, 0.07, C.woodDark, { layer: 5 });
    pen.cyl(fx + 0.6, fy + 0.3, 0.07, 0.24, 0.16, C.black, { seg: 7, w: W_FINE });
  });
  person(pen, SC[0] - 4.7, SC[1] + 1.4, 0, randomLook(rng), "stand");
  person(pen, SC[0] + 2.2, SC[1] - 4.6, 0, randomLook(rng), "wave", true);

  // parents at the edge of the fountains, one of them filming
  person(pen, 31.5, 9.3, 0, randomLook(rng), "wave", true);
  person(pen, 31.6, 11.2, 0, randomLook(rng), "stand", true);
  snapper(pen, 24.9, 13.0, randomLook(rng), false);
}

// ---------------------------------------------------------------- HMS Belfast

/** A triple gun turret on its ring, the barrels pointing fore (-1) or aft (1). `raise` lifts it to fire over the one in front. */
function turret(pen: Pen, x: number, raise: number, dir: 1 | -1): void {
  const z = DECK + raise;
  pen.cyl(x, SHIP_Y, DECK, 1.0, raise + 0.28, GREY_D, { seg: 10, w: W_FINE });
  pen.box(x - 0.95, SHIP_Y - 0.85, z + 0.28, 1.9, 1.7, 0.75, GREY, { w: W_THIN, top: GREY_L });
  for (const dy of [-0.45, 0, 0.45]) pen.pole([x + dir * 0.9, SHIP_Y + dy, z + 0.7], [x + dir * 2.4, SHIP_Y + dy, z + 0.98], 0.13, GREY_D);
}

/** A line of signal flags between two points. */
function signalFlags(pen: Pen, rng: Rng, a: V3, b: V3): void {
  const cloth: [RGB, RGB][] = [
    [C.red, C.white],
    [C.yellow, C.blue],
    [C.blue, C.white],
    [C.yellow, C.red],
    [C.white, C.red],
    [C.black, C.yellow],
    [C.blue, C.yellow],
  ];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(2, Math.round(len / 0.64));
  pen.stroke([a, b], { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const k = pen.card(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    const [p, q] = rng.pick(cloth);
    k.rect(-0.17, -0.34, 0.17, -0.17, p, { sway: 0.12, grain: 0.2, shade: false });
    k.rect(-0.17, -0.17, 0.17, 0, q, { sway: 0.12, grain: 0.2, shade: false });
    k.loop(
      [
        [-0.17, -0.34],
        [0.17, -0.34],
        [0.17, 0],
        [-0.17, 0],
      ],
      { w: 0.03, sway: 0.12 },
    );
    // (after dark the line is lit: a bulb under every other flag)
    if (i % 2 === 0) bulb(pen, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - 0.42, 0.15);
  }
}

function belfast(c: LondonCtx): void {
  const { pen, rng } = c;
  const y = SHIP_Y;
  const D = DECK;
  pen.obj(() => {
    const hull: V2[] = [
      [BOW, y],
      [BOW + 3.4, y - 1.45],
      [BOW + 7.2, y - 1.7],
      [STERN - 2.6, y - 1.7],
      [STERN, y - 1.1],
      [STERN, y + 1.1],
      [STERN - 2.6, y + 1.7],
      [BOW + 7.2, y + 1.7],
      [BOW + 3.4, y + 1.45],
    ];
    pen.extrude(hull, WATER - 0.1, D, GREY, { top: TEAK, crease: 25, w: 0.11 });
    const d = pen.floor(D, 1);
    for (const dy of [-0.95, -0.32, 0.32, 0.95]) d.seg(BOW + 4.2, y + dy, STERN - 0.5, y + dy, { w: 0.035, color: C.woodDark, kind: L_MARK, wobble: 0.3, alpha: 0.6 });
    // her wartime paint along the side, and a row of scuttles
    const len = STERN - 2.6 - (BOW + 7.2);
    const side = pen.wall("y+", BOW + 7.2, y - 1.7, WATER, len, 3.4);
    for (const [a0, a1, a2, a3] of [
      [0.6, 3.6, 2.6, 1.2],
      [6.0, 9.4, 10.6, 7.4],
      [12.6, 15.6, 14.4, 13.4],
    ]) {
      side.poly(
        [
          [a0, 0.9],
          [a1, 0.9],
          [a2, D - WATER],
          [a3, D - WATER],
        ],
        GREY_D,
        { grain: 0.5 },
      );
    }
    for (let a = 0.8; a < len; a += 1.25) side.circle(a, D - WATER - 0.55, 0.11, C.charcoal, { layer: 1, seg: 6, grain: 0 });
  });
  // guns: two turrets forward, two aft
  pen.obj(() => {
    turret(pen, BOW + 4.6, 0, -1);
    turret(pen, BOW + 7.1, 0.55, -1);
  }, 0.12);
  pen.obj(() => {
    turret(pen, STERN - 5.4, 0.55, 1);
    turret(pen, STERN - 3.0, 0, 1);
  }, 0.12);
  // the bridge, with a patch or two of her wartime paint
  pen.obj(() => {
    pen.box(BOW + 8.6, y - 1.3, D, 3.6, 2.6, 1.3, GREY, { top: GREY_L });
    pen.box(BOW + 8.9, y - 1.05, D + 1.3, 2.6, 2.1, 1.0, GREY, { top: GREY_L });
    pen.box(BOW + 9.2, y - 0.7, D + 2.3, 1.5, 1.4, 0.6, GREY_L, { top: GREY });
    const low = pen.wall("y+", BOW + 8.6, y - 1.3, D, 3.6, 2.6);
    low.poly(
      [
        [0.2, 0],
        [1.5, 0],
        [0.9, 1.3],
        [0.2, 1.3],
      ],
      GREY_D,
      { grain: 0.5 },
    );
    low.poly(
      [
        [2.3, 0],
        [3.6, 0],
        [3.6, 0.8],
      ],
      GREY_D,
      { grain: 0.5 },
    );
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, BOW + 8.9, y - 1.05, D + 1.3, 2.6, 2.1);
      f.rect(0.15, 0.45, (side === "y+" ? 2.6 : 2.1) - 0.15, 0.82, C.glass, { outline: true, w: 0.04, glow: 0.8, grain: 0.3 });
    }
  }, 0.2);
  // the deck house amidships, two funnels on it, and the ship's boats between them
  pen.obj(() => {
    pen.box(BOW + 12.2, y - 1.0, D, 9.0, 2.0, 0.9, GREY, { top: GREY_L });
    const f = pen.wall("y+", BOW + 12.2, y - 1.0, D, 9.0, 2.0);
    f.poly(
      [
        [1.2, 0],
        [3.4, 0],
        [2.6, 0.9],
        [1.8, 0.9],
      ],
      GREY_D,
      { grain: 0.5 },
    );
    f.poly(
      [
        [6.0, 0],
        [8.2, 0],
        [7.2, 0.9],
      ],
      GREY_D,
      { grain: 0.5 },
    );
    for (let a = 0.6; a < 9; a += 1.3) f.circle(a, 0.5, 0.12, C.glass, { layer: 1, seg: 6, glow: 0.9, grain: 0.2 });
    for (const x of [BOW + 13.6, BOW + 17.6]) {
      pen.cyl(x, y, D + 0.9, 0.62, 2.6, GREY, { seg: 10, w: W_THIN, top: C.black });
      pen.cyl(x, y, D + 3.2, 0.67, 0.34, C.charcoal, { seg: 10, w: W_FINE, top: C.black });
    }
    for (const dy of [-0.72, 0.28]) pen.box(BOW + 14.8, y + dy, D + 0.9, 1.6, 0.44, 0.32, C.white, { w: W_FINE, top: C.wood });
    pen.box(BOW + 19.0, y - 1.0, D + 0.9, 2.0, 2.0, 0.8, GREY, { top: GREY_L, w: W_THIN });
  }, 0.25);
  // two tripod masts
  const mast = (x: number, h: number) => {
    pen.pole([x, y, D + 0.9], [x, y, D + h], 0.16, GREY_D);
    for (const dy of [-0.5, 0.5]) pen.pole([x + 0.9, y + dy, D + 0.9], [x, y, D + h * 0.72], 0.09, GREY_D, { ink: false });
    pen.pole([x, y - 1.0, D + h * 0.8], [x, y + 1.0, D + h * 0.8], 0.07, GREY_D, { ink: false });
    pen.box(x - 0.32, y - 0.32, D + h * 0.58, 0.64, 0.64, 0.36, GREY_L, { w: W_FINE });
  };
  const foreX = BOW + 11.6;
  const mainX = BOW + 19.6;
  pen.obj(() => {
    mast(foreX, 7.4);
    mast(mainX, 6.6);
  }, 0.4);
  // the jack at the bow, the White Ensign at the stern, and signal flags from end to end
  pen.obj(() => {
    pen.pole([BOW + 0.5, y, D], [BOW + 0.5, y, D + 1.9], 0.06, GREY_L);
    unionJack(pen.card(BOW + 0.5, y, D + 1.3), 0.03, 0, 0.8, 0.5, { sway: 0.25, fine: false });
    pen.pole([STERN - 0.3, y, D], [STERN - 0.3, y, D + 2.7], 0.07, GREY_L);
    const k = pen.card(STERN - 0.3, y, D + 1.75);
    k.rect(0.04, 0, 1.44, 0.9, C.white, { sway: 0.3, grain: 0.3, layer: 1, shade: false });
    k.rect(0.04, 0.39, 1.44, 0.51, C.red, { sway: 0.3, grain: 0.2, layer: 2, shade: false });
    k.rect(0.68, 0, 0.8, 0.9, C.red, { sway: 0.3, grain: 0.2, layer: 2, shade: false });
    unionJack(k, 0.04, 0.51, 0.64, 0.39, { sway: 0.3, layer: 3, fine: false, outline: false });
    k.loop(
      [
        [0.04, 0],
        [1.44, 0],
        [1.44, 0.9],
        [0.04, 0.9],
      ],
      { w: W_FINE, sway: 0.3, layer: 9 },
    );
  }, 0.45);
  pen.obj(() => {
    signalFlags(pen, rng, [BOW + 0.5, y, D + 1.9], [foreX, y, D + 7.4]);
    signalFlags(pen, rng, [foreX, y, D + 7.4], [mainX, y, D + 6.6]);
    signalFlags(pen, rng, [mainX, y, D + 6.6], [STERN - 0.3, y, D + 2.7]);
  }, 0.55);
  // the gangway down from the riverside walk
  const gx = 25.4;
  pen.obj(() => {
    pen.fill(
      [
        [gx - 0.55, 0.12, 0.02],
        [gx + 0.55, 0.12, 0.02],
        [gx + 0.55, y + 1.7, D + 0.02],
        [gx - 0.55, y + 1.7, D + 0.02],
      ],
      C.metal,
      { outline: true, w: W_THIN, grain: 0.5 },
    );
    for (const s of [-0.55, 0.55]) {
      pen.stroke(
        [
          [gx + s, 0.12, 0.85],
          [gx + s, y + 1.7, D + 0.85],
        ],
        { w: 0.07, color: C.white, kind: L_BAR, wobble: 0 },
      );
      for (let q = 0; q <= 3; q++) {
        const py = 0.12 + ((y + 1.58) * q) / 3;
        const pz = 0.02 + (D * q) / 3;
        pen.stroke(
          [
            [gx + s, py, pz],
            [gx + s, py, pz + 0.85],
          ],
          { w: 0.05, color: C.white, kind: L_BAR, wobble: 0 },
        );
      }
    }
  }, 0.3);
  // visitors: on the gangway, at the bow, on the quarterdeck, up on the bridge
  person(pen, gx, y + 1.7 + 0.9, D + 0.75, randomLook(rng), "stand", true);
  person(pen, gx + 0.1, y + 1.7 + 2.1, D + 1.75, randomLook(rng), "stand", false, 0.74);
  person(pen, BOW + 2.2, y - 0.3, D, randomLook(rng), "wave");
  person(pen, BOW + 3.0, y + 0.4, D, randomLook(rng), "stand", true, 0.74);
  person(pen, STERN - 1.3, y - 0.5, D, randomLook(rng), "stand", true);
  snapper(pen, STERN - 0.9, y + 0.5, randomLook(rng), true);
  person(pen, BOW + 11.85, y - 0.3, D + 1.3, randomLook(rng), "stand");
  person(pen, BOW + 16.0, y + 1.3, D, randomLook(rng), "wave", true);
}

// ---------------------------------------------------------------- the railway viaduct

/** Is a point of a bay's wall inside its arch? */
function inArch(a: number, b: number): boolean {
  const u = (a - BAY / 2) / (BAY / 2 - 0.3);
  return Math.abs(u) < 1 && b < 1.2 + Math.sqrt(Math.max(0, 1 - u * u)) * 1.25;
}

function viaduct(c: LondonCtx): void {
  const { pen, rng } = c;
  const d = VY1 - VY0;
  const shops: Record<number, string> = { 7: "WINE", 8: "FISH", 9: "BEER" };
  // the arcade, a bay at a time so that it draws itself along its length
  for (let k = 0; k < BAYS; k++) {
    const x0 = VX0 + k * BAY;
    const station = k >= 4 && k <= 6;
    const shop = shops[k];
    pen.begin();
    pen.box(x0, VY0, 0, BAY, d, VZ, BRICK, { top: C.ballast, edges: false });
    const f = pen.wall("y+", x0, VY0, 0, BAY, d);
    const arch: V2[] = [
      [0.45, 0],
      [BAY - 0.45, 0],
      [BAY - 0.45, 1.05],
    ];
    for (let q = 1; q <= 7; q++) {
      const th = (q / 8) * Math.PI;
      arch.push([BAY / 2 + Math.cos(th) * (BAY / 2 - 0.45), 1.05 + Math.sin(th) * 1.25]);
    }
    arch.push([0.45, 1.05]);
    f.poly(arch, station || shop ? C.glassLight : C.brickBrown, { outline: true, w: 0.08, glow: station || shop ? 0.9 : 0, grain: 0.6 });
    if (station) {
      // glass doors, standing open in the middle
      f.rect(BAY / 2 - 0.75, 0, BAY / 2 + 0.75, 1.8, C.glass, { layer: 1, glow: 0.5, grain: 0.4 });
      for (const a of [1.05, BAY - 1.05]) f.seg(a, 0.05, a, 1.55, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
      f.seg(0.5, 1.05, BAY - 0.5, 1.05, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    } else if (shop) {
      // the shop's name over the arch, its wares in the window
      f.rect(0.55, 2.42, BAY - 0.55, 2.86, C.black, { outline: true, w: W_FINE, grain: 0.3, layer: 1 });
      f.text(shop, BAY / 2, 2.5, 0.28, { align: "c", color: C.gold, kind: L_MARK, w: 0.06, layer: 2 });
      for (let q = 0; q < 4; q++) f.rect(0.7 + q * 0.66, 0.1, 1.24 + q * 0.66, 0.5 + rng.next() * 0.5, rng.pick([C.wood, C.redDark, C.green, C.ochre, C.blueDark]), { layer: 1, grain: 0.4, outline: true, w: 0.035 });
      f.seg(BAY / 2, 1.1, BAY / 2, 2.25, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    }
    f.rect(0, VZ - 0.3, BAY, VZ, C.graniteCap, { grain: 0.5 });
    f.seg(0, VZ - 0.3, BAY, VZ - 0.3, { w: 0.06 });
    f.seg(0, VZ, BAY, VZ, { w: 0.1 });
    f.seg(0, 0, BAY, 0, { w: 0.09 });
    if (k > 0) f.seg(0, 0, 0, VZ - 0.3, { w: 0.06, color: BRICK_D, kind: L_MARK });
    f.ticks(0.1, 0.1, BAY - 0.1, VZ - 0.4, { n: 16, len: 0.5, ang: 0, jit: 0.02, color: BRICK_D, w: 0.055, inside: (a, b) => !inArch(a, b) && !(shop && b > 2.3) });
    pen.end();
  }
  // the station's name across its three arches
  pen.obj(() => {
    const f = pen.wall("y+", VX0 + 4 * BAY, VY0, 0, 3 * BAY, d, 2);
    const m = (3 * BAY) / 2;
    f.rect(m - 3.3, 2.4, m + 3.3, 2.88, C.navy, { outline: true, w: W_FINE, grain: 0.3 });
    f.text("LONDON BRIDGE", m, 2.5, 0.28, { align: "c", color: C.white, kind: L_MARK, w: 0.06, layer: 1 });
  }, 0.2);
  // the cut end of the viaduct, with some good advice painted on it
  pen.obj(() => {
    const e = pen.wall("x+", VX1 - 1, VY0, 0, 1, d);
    e.loop(
      [
        [0, 0],
        [d, 0],
        [d, VZ],
        [0, VZ],
      ],
      { w: 0.1 },
    );
    e.rect(0.6, 1.2, d - 0.6, 2.1, C.navy, { outline: true, w: W_FINE, grain: 0.3 });
    e.text("MIND THE GAP", d / 2, 1.47, 0.36, { align: "c", color: C.white, kind: L_MARK, w: 0.07, layer: 1 });
    e.ticks(0.2, 0.15, d - 0.2, 1.05, { n: 10, len: 0.5, ang: 0, jit: 0.02, color: BRICK_D, w: 0.055 });
  }, 0.1);
  // two tracks with a live rail beside each: no wires on this side of the river
  pen.obj(() => {
    for (const ty of [TRACK_FAR, TRACK]) {
      for (let x = VX0 + 0.5; x < VX1; x += 1.0) {
        pen.stroke(
          [
            [x, ty - 0.8, VZ + 0.02],
            [x, ty + 0.8, VZ + 0.02],
          ],
          { w: 0.11, color: C.woodDark, kind: L_MARK, wobble: 0, alpha: 0.8 },
        );
      }
      for (const s of [-0.5, 0.5]) {
        pen.stroke(
          [
            [VX0 + 0.1, ty + s, VZ + 0.04],
            [VX1 - 0.1, ty + s, VZ + 0.04],
          ],
          { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2 },
        );
      }
      pen.stroke(
        [
          [VX0 + 0.1, ty - 0.95, VZ + 0.05],
          [VX1 - 0.1, ty - 0.95, VZ + 0.05],
        ],
        { w: 0.05, color: C.charcoal, kind: L_MARK, wobble: 0.2, alpha: 0.8 },
      );
    }
  }, 0.25);
  pen.obj(() => {
    pen.box(VX0, VY1 - 0.22, VZ, VX1 - VX0, 0.22, 0.6, BRICK_D, { w: W_THIN, top: C.graniteCap });
    pen.box(VX0, VY0, VZ, VX1 - VX0, 0.22, 0.6, BRICK_D, { w: W_THIN, top: C.graniteCap });
  }, 0.3);
  // the island platform: a yellow line to stand behind, lamps, the name, a shelter
  pen.obj(() => {
    pen.box(PLAT_X0, PLAT_Y0, VZ, PLAT_X1 - PLAT_X0, PLAT_Y1 - PLAT_Y0, 0.34, C.stone, { w: W_THIN, top: C.flag });
    const g = pen.floor(PLAT_Z, 1);
    for (const y of [PLAT_Y0 + 0.2, PLAT_Y1 - 0.2]) g.seg(PLAT_X0 + 0.2, y, PLAT_X1 - 0.2, y, { w: 0.07, color: C.yellowLine, kind: L_MARK, wobble: 0.1 });
  }, 0.3);
  const my = (PLAT_Y0 + PLAT_Y1) / 2;
  for (const x of [19.0, 26.5, 39.6]) lamp(pen, x, my, PLAT_Z, 2.5);
  pen.obj(() => {
    for (const x of [29.2, 32.8]) pen.pole([x, my, PLAT_Z], [x, my, PLAT_Z + 1.9], 0.08, C.iron);
    const sg = pen.plane([29.1, my + 0.02, PLAT_Z + 1.25], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 3.8, 0.66, C.white, { outline: true, w: W_FINE, grain: 0.2 });
    sg.rect(0, 0, 3.8, 0.12, C.navy, { layer: 1, grain: 0.2 });
    sg.text("LONDON BRIDGE", 1.9, 0.26, 0.24, { align: "c", color: C.navy, kind: L_MARK, w: 0.05, layer: 1 });
  }, 0.4);
  pen.obj(() => {
    for (const x of [34.4, 37.6]) pen.pole([x, my, PLAT_Z], [x, my, PLAT_Z + 2.35], 0.1, C.white);
    pen.box(33.8, PLAT_Y0 + 0.1, PLAT_Z + 2.35, 4.4, PLAT_Y1 - PLAT_Y0 - 0.2, 0.14, C.white, { w: W_THIN, top: C.slateLight });
    pen.box(35.0, my - 0.12, PLAT_Z + 0.42, 2.0, 0.24, 0.1, C.busRed, { w: W_FINE });
    pen.stroke(
      [
        [34.2, my, PLAT_Z + 2.3],
        [37.8, my, PLAT_Z + 2.3],
      ],
      { w: 0.16, kind: L_LIGHT, wobble: 0 },
    );
  }, 0.4);
  for (const x of [17.8, 20.4, 22.9, 24.3, 27.6, 31.0, 35.6, 36.4, 40.6]) {
    person(pen, x, my + rng.range(-0.3, 0.3), PLAT_Z, rng.chance(0.4) ? suit(rng) : randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
}

// ---------------------------------------------------------------- Borough Market

function market(c: LondonCtx): void {
  const { pen, rng } = c;
  const x0 = 6.6;
  const x1 = 20.0;
  const y0 = VY1;
  const y1 = 30.4;
  const ze = 3.5;
  // the shed: green iron columns along its open front, a glass roof on top
  pen.obj(() => {
    for (let k = 0; k <= 6; k++) {
      const x = x0 + 0.2 + (k * (x1 - x0 - 0.4)) / 6;
      pen.pole([x, y1 - 0.15, 0], [x, y1 - 0.15, ze], 0.18, GREEN);
      for (const s of [-1, 1]) {
        if ((k === 0 && s < 0) || (k === 6 && s > 0)) continue;
        pen.stroke(
          [
            [x, y1 - 0.15, ze - 0.9],
            [x + s * 0.45, y1 - 0.15, ze - 0.3],
            [x + s * 1.1, y1 - 0.15, ze - 0.02],
          ],
          { w: 0.08, color: GREEN, kind: L_BAR, wobble: 0 },
        );
      }
    }
    pen.pole([x1 - 0.2, y0 + 3.0, 0], [x1 - 0.2, y0 + 3.0, ze], 0.18, GREEN);
  });
  pen.obj(() => {
    pen.box(x0, y1 - 0.3, ze, x1 - x0, 0.3, 0.42, GREEN, { w: W_THIN });
    pen.box(x1 - 0.3, y0, ze, 0.3, y1 - y0 - 0.3, 0.42, GREEN, { w: W_THIN });
    pen.gable(x0 - 0.2, y0, ze + 0.42, x1 - x0 + 0.4, y1 - y0 + 0.25, 1.5, "x", ROOF_GLASS, { gable: hex("#bcd6cc"), w: 0.1, glow: 0.25 });
    const ridge = y0 + (y1 - y0 + 0.25) / 2;
    for (let x = x0 + 0.6; x < x1; x += 1.12) {
      pen.stroke(
        [
          [x, y1 + 0.25, ze + 0.44],
          [x, ridge, ze + 0.42 + 1.5],
        ],
        { w: 0.06, color: GREEN, kind: L_MARK, wobble: 0 },
      );
    }
    for (let x = x0 + 0.8; x < x1; x += 1.5) bulb(pen, x, y1 - 0.05, ze - 0.12, 0.26);
  }, 0.15);
  pen.obj(() => {
    const sx = (x0 + x1) / 2 - 3.6;
    pen.box(sx, y1 - 0.12, ze + 0.42, 7.2, 0.18, 0.95, GREEN_D, { w: W_THIN });
    pen.wall("y+", sx, y1 - 0.12, ze + 0.42, 7.2, 0.18).text("BOROUGH MARKET", 3.6, 0.23, 0.5, { align: "c", color: C.white, kind: L_MARK, w: 0.085, wobble: 0.25 });
  }, 0.3);
  // under it: bread, cheese and greens
  const inside: [number, string, RGB, RGB[]][] = [
    [8.7, "BREAD", C.orange, [hex("#c98b4a"), hex("#b0703a"), hex("#e0b070"), C.cream]],
    [12.5, "CHEESE", C.yellow, [C.yellow, C.cream, hex("#e9c46a"), C.orange]],
    [16.3, "GREENS", C.green, [C.grass, C.leafDark, C.red, C.grassLight]],
  ];
  for (const [x, sign, a, goods] of inside) {
    pen.push(x, 27.7, 0);
    stall(pen, rng, { w: 3.4, sign, a, goods });
    pen.pop();
  }
  // out in the open, in front of the arches: oysters, pies and fruit
  const outside: [number, string, RGB, RGB[]][] = [
    [32.2, "OYSTERS", C.blue, [C.grey, C.white, C.stone, C.yellow]],
    [36.0, "PIES", C.red, [hex("#c98b4a"), hex("#b0703a"), hex("#e0a860")]],
    [39.8, "FRUIT", C.green, [C.red, C.orange, C.yellow, C.grass]],
  ];
  for (const [x, sign, a, goods] of outside) {
    pen.push(x, 27.9, 0);
    stall(pen, rng, { w: 3.4, sign, a, goods });
    pen.pop();
  }
  // a chef out in front of the pie stall, with a tray of them to try
  pen.obj(() => {
    const chef: Look = { skin: SKIN[2], hair: HAIR[0], top: C.white, legs: C.charcoal, long: false, hat: null };
    person(pen, 35.4, 31.7, 0, chef, "stand");
    hat(pen, 35.4, 31.7, 0, "chef");
    const k = pen.card(35.4, 31.7, 0);
    k.rect(0.3, 0.86, 0.95, 0.96, C.metal, { outline: true, w: 0.035, layer: 5, grain: 0 });
    for (const a of [0.42, 0.62, 0.82]) k.circle(a, 1.02, 0.08, hex("#c98b4a"), { layer: 6, seg: 6, grain: 0 });
  });
  lightString(pen, [32.2, 30.55, 3.0], [43.2, 30.55, 3.0], 14, 0.4);
  for (const [x, y] of [
    [21.3, 31.4],
    [31.2, 33.6],
    [24.2, 35.2],
    [43.3, 35.0],
  ]) {
    lamp(pen, x, y);
  }

  // customers at every counter
  for (const x of [9.6, 10.9, 13.3, 14.7, 17.1, 18.6, 33.0, 34.5, 36.9, 38.3, 40.5, 42.1]) {
    const y = 31.0 + rng.range(-0.15, 0.3);
    if (rng.chance(0.45)) eater(pen, rng, x, y, rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
    else person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
  // and the rest of the crowd, eating on its feet round upturned barrels
  for (const [bx, by] of [
    [15.0, 34.0],
    [19.2, 33.9],
    [28.7, 34.0],
    [30.6, 35.4],
    [41.9, 33.9],
  ]) {
    barrel(pen, bx, by);
    eater(pen, rng, bx - 0.85, by + 0.1, false);
    eater(pen, rng, bx + 0.85, by - 0.2, true);
    if (rng.chance(0.7)) person(pen, bx + 0.1, by + 0.9, 0, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5));
    pen.card(bx, by, 1.0).rect(-0.2, 0, -0.04, 0.26, C.ochre, { outline: true, w: 0.03, grain: 0, layer: 2 });
    pen.card(bx, by, 1.0).rect(0.08, 0, 0.24, 0.26, C.ochre, { outline: true, w: 0.03, grain: 0, layer: 2 });
  }
  dog(pen, 27.4, 35.0, hex("#b98352"), false, 0.85);
  for (const [x, y, peck] of [
    [21.4, 34.6, true],
    [22.0, 35.1, false],
    [32.4, 32.9, true],
    [27.0, 33.3, false],
    [42.7, 35.3, true],
    [16.9, 35.2, false],
  ] as const) {
    pigeon(pen, x, y, 0, x > 30, peck);
  }
  // crates waiting to be unpacked
  pen.obj(() => {
    const cols = [C.wood, C.woodDark, C.green, C.wood];
    pen.box(22.0, 33.4, 0, 1.0, 0.7, 0.5, cols[0], { w: W_FINE });
    pen.box(22.1, 33.45, 0.5, 0.9, 0.65, 0.45, cols[2], { w: W_FINE });
    pen.box(23.1, 33.7, 0, 0.9, 0.7, 0.5, cols[1], { w: W_FINE });
    pen.box(30.6, 28.4, 0, 0.9, 0.7, 0.5, cols[3], { w: W_FINE });
    pen.box(30.7, 28.45, 0.5, 0.8, 0.6, 0.45, cols[1], { w: W_FINE });
    for (const [x, y, z] of [
      [22.35, 33.75, 0.95],
      [23.45, 34.0, 0.5],
      [31.0, 28.7, 0.95],
    ]) {
      pen.card(x, y, z).circle(0, 0.12, 0.16, rng.pick([C.red, C.orange, C.grass]), { seg: 6, grain: 0, outline: true, w: 0.03 });
    }
  });
  // people at the station's doors
  person(pen, 22.2, 25.2, 0, suit(rng), "stand");
  person(pen, 29.7, 25.1, 0, randomLook(rng), "wave", true);
  person(pen, 30.7, 25.5, 0, randomLook(rng), "stand", true, 0.72);
  tubeSign(pen, 21.0, 25.0, 0, 3.4);
  bin(pen, 31.3, 26.2);
}

// ---------------------------------------------------------------- the Shard

function shard(c: LondonCtx): void {
  const { pen, rng } = c;
  // the lobby it stands on, with the station's doors in its east side
  pen.obj(() => {
    pen.box(SH_X - 0.35, SH_Y - 0.35, 0, SH_W + 0.7, SH_W + 0.7, SH_Z0, C.portlandDark, { top: C.portland });
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, SH_X - 0.35, SH_Y - 0.35, 0, SH_W + 0.7, SH_W + 0.7);
      f.rect(0.4, 0.14, SH_W + 0.3, 1.0, C.glassLight, { outline: true, w: W_FINE, glow: 0.9, grain: 0.3 });
      for (let a = 1.3; a < SH_W; a += 0.9) f.seg(a, 0.14, a, 1.0, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    }
  });
  // the spire, in five lifts so that it grows as it is drawn
  const cuts = [SH_Z0, 9, 17, 25, 33, SH_Z1];
  const onFace = (face: 0 | 2, u: number, z: number): V3 => {
    const r = shRing(z);
    const a = r[face];
    const b = r[face + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, z];
  };
  for (let k = 0; k + 1 < cuts.length; k++) {
    const za = cuts[k];
    const zb = cuts[k + 1];
    const lo = shRing(za);
    const hi = shRing(zb);
    const last = k === cuts.length - 2;
    pen.begin();
    const faces: number[][] = [];
    const cols: RGB[] = [];
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      faces.push([i, j, 8 + j, 8 + i]);
      cols.push(i % 2 === 0 ? GLASS : GLASS_D);
    }
    if (last) {
      faces.push([8, 9, 10, 11, 12, 13, 14, 15]);
      cols.push(GLASS_L);
    }
    // (the top storeys are the ones lit at night)
    pen.solid([...lo, ...hi], faces, cols, { edges: false, grain: 0.6, glow: last ? 0.8 : 0.06 });
    // its edges: the two outer corners, and the cut corner that leads
    for (const i of [0, 1, 2, 3]) pen.stroke([lo[i], hi[i]], { w: i === 1 || i === 2 ? 0.07 : 0.11 });
    if (k === 0) pen.stroke([lo[3], lo[2], lo[1], lo[0]], { w: 0.1 });
    if (last) pen.stroke([hi[3], hi[2], hi[1], hi[0]], { w: 0.08 });
    // a fine line at every floor
    for (let z = za + 0.9; z < zb - 0.1; z += 1) {
      const r = shRing(z);
      for (const i of [0, 2]) pen.stroke([r[i], r[i + 1]], { w: 0.04, color: C.white, kind: L_MARK, wobble: 0, alpha: 0.75 });
    }
    // and a few floors where somebody is working late
    for (let q = 0; q < (last ? 0 : 9); q++) {
      const face = rng.chance(0.5) ? 0 : 2;
      const z = za + 0.95 + rng.int(0, Math.max(1, Math.floor(zb - za - 2)));
      const u0 = rng.range(0.06, 0.66);
      const u1 = u0 + rng.range(0.14, 0.3);
      pen.fill([onFace(face, u0, z), onFace(face, u1, z), onFace(face, u1, z + 0.86), onFace(face, u0, z + 0.86)], GLASS_L, { glow: 1, bias: 0.03, grain: 0.3 });
    }
    pen.end(0.1 + k * 0.22);
  }
  // the shards themselves: four blades that carry the faces on up, and stop short of meeting
  pen.obj(() => {
    const base = shRing(SH_Z1);
    const blades: [number, number, RGB][] = [
      [4, 43.6, GLASS_L],
      [6, 43.0, GLASS_L],
      [0, 44.6, GLASS],
      [2, 46, GLASS_D],
    ];
    for (const [i, top, rgb] of blades) {
      const up = shRing(top);
      const a = up[i];
      const b = up[i + 1];
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      pen.fill([base[i], base[i + 1], [mx + (b[0] - mx) * 0.85, my + (b[1] - my) * 0.85, top], [mx + (a[0] - mx) * 0.85, my + (a[1] - my) * 0.85, top]], rgb, { outline: true, w: 0.07, glow: 0.7, grain: 0.5 });
    }
    const tip = shRing(46);
    pen.card((tip[2][0] + tip[3][0]) / 2, (tip[2][1] + tip[3][1]) / 2, 46).circle(0, 0.12, 0.16, C.red, { glow: 1, kind: F_NEON, seg: 6, grain: 0 });
  }, 1.25);
}

// ---------------------------------------------------------------- the station forecourt

/** Buckets of flowers on a stepped stand, under a pink and white awning. */
function flowerStall(pen: Pen, rng: Rng): void {
  const blooms = [C.red, C.pink, C.yellow, C.purple, C.white, C.orange];
  const w = 3.4;
  pen.begin();
  for (let k = 0; k < 3; k++) pen.box(0.1, 0.35 + k * 0.6, 0, w - 0.2, 0.6, 0.9 - k * 0.3, C.woodDark, { w: W_FINE, top: C.wood });
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 6; i++) {
      const x = 0.42 + i * 0.52;
      const y = 0.65 + k * 0.6;
      const z = 0.9 - k * 0.3;
      pen.cyl(x, y, z, 0.17, 0.28, rng.pick([C.metal, C.charcoal, C.grey]), { seg: 6, w: 0.035 });
      const q = pen.card(x, y, z + 0.28);
      const col = rng.pick(blooms);
      q.seg(0, 0, 0, 0.3, { w: 0.05, color: C.leafDark, kind: L_MARK, wobble: 0 });
      for (const [a, b] of [
        [-0.13, 0.22],
        [0.12, 0.26],
        [0, 0.42],
      ]) {
        q.circle(a, b, 0.13, col, { seg: 6, grain: 0, sway: 0.08, layer: 1 });
      }
    }
  }
  for (const [px, py] of [
    [0.05, 0.05],
    [w - 0.05, 0.05],
    [0.05, 2.2],
    [w - 0.05, 2.2],
  ]) {
    pen.pole([px, py, 0], [px, py, py > 1 ? 2.25 : 2.75], 0.1, C.white);
  }
  const cloth = pen.plane([0, -0.1, 2.8], [1, 0, 0], [0, 2.7, -0.55], 0, true);
  const n = 6;
  for (let i = 0; i < n; i++) cloth.rect((i * w) / n, 0, ((i + 1) * w) / n, 1, i % 2 === 0 ? C.pink : C.white, { grain: 0.6 });
  cloth.loop(
    [
      [0, 0],
      [w, 0],
      [w, 1],
      [0, 1],
    ],
    { w: W_THIN },
  );
  const sg = pen.plane([0, 2.62, 2.28], [1, 0, 0], [0, 0, 1], 1, true);
  sg.rect(w * 0.1, 0, w * 0.9, 0.62, C.white, { outline: true, w: W_FINE });
  sg.text("FLOWERS", w / 2, 0.15, 0.32, { align: "c", layer: 1 });
  person(pen, 1.7, 0.1, 0, randomLook(rng), "stand", rng.chance(0.5));
  pen.end();
}

function forecourt(c: LondonCtx): void {
  const { pen, rng } = c;
  // the station canopy at the Shard's foot: white steel on three branching columns, glass at the back
  const x0 = 13.4;
  const x1 = 21.6;
  const y0 = 37.3;
  const y1 = 43.4;
  const z = 3.6;
  pen.obj(() => {
    const cols: V2[] = [
      [x1 - 0.5, y0 + 0.6],
      [x1 - 0.5, y1 - 0.6],
      [17.3, y1 - 0.6],
    ];
    for (const [x, y] of cols) {
      pen.pole([x, y, 0], [x, y, z - 1.0], 0.2, C.white);
      for (const [dx, dy] of [
        [-1.3, -1.3],
        [1.3, -1.3],
        [1.3, 1.3],
        [-1.3, 1.3],
      ]) {
        pen.pole([x, y, z - 1.0], [clamp(x + dx, x0, x1), clamp(y + dy, y0, y1), z], 0.1, C.white, { ink: false });
      }
    }
    pen.fill(
      [
        [x0, y0, z],
        [x1, y0, z],
        [x1, y0 + 2.0, z],
        [x0, y0 + 2.0, z],
      ],
      GLASS_L,
      { grain: 0.4, glow: 0.3 },
    );
    for (let k = 0; k <= 4; k++) {
      const x = x0 + ((x1 - x0) * k) / 4;
      if (k === 0 || k === 4) pen.pole([x, y0, z], [x, y1, z], 0.13, C.white);
      else pen.stroke([[x, y0, z], [x, y1, z]], { w: 0.07, color: C.metal, kind: L_BAR, wobble: 0 });
    }
    for (let k = 0; k <= 3; k++) {
      const y = y0 + ((y1 - y0) * k) / 3;
      if (k === 0 || k === 3) pen.pole([x0, y, z], [x1, y, z], 0.13, C.white);
      else pen.stroke([[x0, y, z], [x1, y, z]], { w: 0.07, color: C.metal, kind: L_BAR, wobble: 0 });
    }
    for (const x of [15.4, 17.5, 19.6]) for (const y of [39.6, 41.9]) bulb(pen, x, y, z - 0.1, 0.3);
  }, 0.2);
  // the doors under it
  pen.obj(() => {
    const f = pen.wall("x+", SH_X - 0.35, SH_Y - 0.35, 0, SH_W + 0.7, SH_W + 0.7, 2);
    f.rect(1.2, 0, 4.6, 1.1, C.glass, { outline: true, w: W_THIN, glow: 0.7, grain: 0.4 });
    for (const a of [2.05, 2.9, 3.75]) f.seg(a, 0, a, 1.1, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }, 0.1);
  // the evening paper
  pen.obj(() => {
    pen.box(19.3, 43.25, 0, 1.1, 0.55, 1.0, C.red, { w: W_FINE, top: C.white });
    pen.wall("y+", 19.3, 43.25, 0, 1.1, 0.55).text("NEWS", 0.55, 0.36, 0.26, { align: "c", color: C.white, kind: L_MARK, w: 0.055 });
    const lk = randomLook(rng);
    lk.hat = C.red;
    person(pen, 20.8, 43.45, 0, lk, "wave");
  });
  person(pen, 16.6, 40.4, 0, suit(rng), "stand");
  person(pen, 19.0, 39.7, 0, randomLook(rng), "stand", true);
  person(pen, 20.3, 40.7, 0, suit(rng), "wave", true);
  tubeSign(pen, 23.1, 43.5, 0, 3.4);

  // coffee, and the queue for it
  pen.push(27.2, 36.6, 0);
  stall(pen, rng, { w: 3.4, sign: "COFFEE", a: COFFEE, goods: [C.white, COFFEE, C.cream] });
  pen.pop();
  for (let i = 0; i < 7; i++) {
    person(pen, 29.2 + i * 0.8, 39.5 + rng.range(-0.12, 0.12), 0, rng.chance(0.5) ? suit(rng) : randomLook(rng), i === 3 ? "wave" : "stand", i % 3 !== 0, rng.chance(0.1) ? 0.72 : 1);
  }
  pen.push(30.5, 41.1, 0);
  flowerStall(pen, rng);
  pen.pop();
  person(pen, 31.4, 43.75, 0, randomLook(rng), "stand", true);
  person(pen, 33.2, 43.7, 0, randomLook(rng), "wave");

  // the pub on the corner, and its regulars out on the pavement
  pen.push(37.2, 37.8, 0);
  pub(pen, rng, "THE GEORGE", { w: 6.4, d: 5.6, floors: 1, tiles: C.ironGreen });
  pen.pop();
  for (const [x, y] of [
    [37.9, 43.75],
    [39.1, 43.8],
    [41.6, 43.75],
    [42.8, 43.7],
    [36.5, 39.4],
    [36.4, 41.0],
  ]) {
    pen.obj(() => {
      const flip = rng.chance(0.5);
      person(pen, x, y, 0, randomLook(rng), "stand", flip);
      pen.card(x, y, 0, flip).rect(0.38, 0.86, 0.54, 1.16, C.ochre, { outline: true, w: 0.03, layer: 5, grain: 0 });
    });
  }
  barrel(pen, 36.3, 42.5);
}

// ---------------------------------------------------------------- everything that moves

/** One coach of the train, at the origin, running along local x. The leading coach has a yellow nose. */
function coach(pen: Pen, lead: boolean, rng: Rng): void {
  const L = 5.6;
  const W = 1.9;
  const H = 2.45;
  const z0 = 0.3;
  for (const x of [-1.8, 1.8]) pen.box(x - 0.7, -W / 2 + 0.12, 0, 1.4, W - 0.24, z0, C.charcoal, { edges: false });
  pen.box(-L / 2, -W / 2, z0, L, W, H, C.white, { top: C.slateLight, w: 0.1 });
  const f = pen.wall("y+", -L / 2, -W / 2, z0, L, W);
  f.rect(0, 0, L, 0.5, C.royal, { grain: 0.5 });
  f.rect(0.3, 1.05, L - 0.3, 1.95, C.glass, { outline: true, w: W_FINE, glow: 0.85, grain: 0.4 });
  for (let a = 0.6; a < L - 0.5; a += 0.62) {
    if (rng.chance(0.45)) continue;
    f.circle(a, 1.36, 0.17, rng.pick(SKIN), { layer: 1, seg: 7, grain: 0 });
    f.ellipse(a, 1.45, 0.18, 0.18, rng.pick(HAIR), { layer: 2, seg: 7, grain: 0, a0: 0, a1: Math.PI });
  }
  for (const a of [1.1, L - 1.9]) {
    f.rect(a, 0.12, a + 0.8, 2.1, C.yellow, { outline: true, w: W_FINE, layer: 3 });
    f.rect(a + 0.12, 1.1, a + 0.68, 1.9, C.glass, { layer: 4, glow: 0.85, grain: 0.3 });
    f.seg(a + 0.4, 0.12, a + 0.4, 2.1, { w: 0.04, wobble: 0, layer: 4 });
  }
  const e = pen.wall("x+", -L / 2, -W / 2, z0, L, W);
  if (lead) {
    e.rect(0, 0, W, 1.25, C.yellow, { grain: 0.4 });
    e.seg(0, 1.25, W, 1.25, { w: W_FINE });
    e.rect(0.15, 1.32, W - 0.15, 2.1, C.glass, { outline: true, w: W_FINE, glow: 0.7, grain: 0.3 });
    e.circle(0.55, 1.62, 0.17, SKIN[1], { layer: 1, seg: 7, grain: 0 });
    for (const a of [0.2, W - 0.5]) e.rect(a, 0.36, a + 0.3, 0.58, C.lamp, { outline: true, w: 0.035, glow: 1, layer: 1, grain: 0.2 });
  } else {
    e.rect(W / 2 - 0.4, 0.15, W / 2 + 0.4, 2.1, C.slateLight, { outline: true, w: W_FINE });
  }
}

/** Someone walking with a paper cup in one hand. */
function cupWalker(seed: number): WalkerKind {
  const rng = new Rng(seed);
  const lk = rng.chance(0.55) ? suit(rng) : randomLook(rng);
  const mk = (pose: Pose, flip: boolean) =>
    makeSprite(
      (pen) => {
        person(pen, 0, 0, 0, lk, pose, flip);
        const k = pen.card(0, 0, 0, flip);
        const [a, b] = pose === "walkA" ? [0.52, 0.92] : [0.43, 0.84];
        k.rect(a - 0.09, b - 0.02, a + 0.1, b + 0.25, C.white, { outline: true, w: 0.035, layer: 5, grain: 0 });
        k.rect(a - 0.1, b + 0.19, a + 0.11, b + 0.26, COFFEE, { layer: 6, grain: 0 });
      },
      0,
      seed,
    );
  return {
    frames: [
      [mk("walkA", false), mk("walkB", false)],
      [mk("walkA", true), mk("walkB", true)],
    ],
  };
}

function motion(c: LondonCtx): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done + 0.2;

  // ---- the train: in from the west, a stop at the platform, out to the east
  const coaches: Sprite[] = [0, 1, 2, 3].map((i) => makeSprite((p) => coach(p, i === 0, new Rng(71 + i)), 0, 71 + i));
  const CAR = 5.75;
  /** Where the nose comes to rest, and how far it travels to get there. */
  const X_STOP = 40.5;
  const D_IN = X_STOP - (VX0 - 0.5);
  const T_IN = 6.4;
  const T_WAIT = 6.2;
  const T_OUT = 5.2;
  const CYCLE = 27;
  // On the tour the train is timed to come to a stand two seconds after the camera arrives.
  const start = (): number => {
    const at = c.visit();
    return at == null ? born + 1.2 : at + 2.0 - T_IN;
  };
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 24, c.oy + TRACK, VZ + 1.5, 40)) return;
    const p = (((m.t - start()) % CYCLE) + CYCLE) % CYCLE;
    let nose: number;
    if (p < T_IN) {
      const u = 1 - p / T_IN;
      nose = X_STOP - D_IN * u * u;
    } else if (p < T_IN + T_WAIT) nose = X_STOP;
    else if (p < T_IN + T_WAIT + T_OUT) {
      const u = (p - T_IN - T_WAIT) / T_OUT;
      nose = X_STOP + 26.5 * u * u;
    } else return;
    for (let i = 0; i < 4; i++) {
      const x = nose - CAR * (i + 0.5);
      // a coach sketches itself in as it comes onto the viaduct, and back out as it leaves the far end
      const edge = Math.min(x - (VX0 + 2.9), VX1 - 2.9 - x);
      if (edge <= 0) continue;
      m.put(coaches[i], c.ox + x, c.oy + TRACK, VZ, Math.max(born, m.t - Math.min(1.4, (edge / 3.2) * 1.2)));
    }
  });

  // ---- the fountains: sixteen jets rising and falling in a wave across the square
  const jets: Sprite[] = [];
  for (let k = 0; k < 6; k++) {
    const h = 0.25 + k * 0.38;
    jets.push(
      makeSprite(
        (p) => {
          const q = p.card(0, 0, 0);
          q.arc(0, 0.03, 0.26, 0.1, 0, Math.PI * 2, { w: 0.05, color: C.waterInk, kind: L_MARK, wobble: 0, seg: 8 });
          q.bar(0, 0, 0, h, 0.12, C.white, { ink: C.waterInk });
          for (const [a, b, r] of [
            [-0.2, h - 0.14, 0.07],
            [0.2, h - 0.06, 0.07],
            [0.03, h + 0.2, 0.08],
            [-0.1, h + 0.07, 0.05],
          ]) {
            q.circle(a, b, r, C.white, { outline: true, w: 0.03, ink: C.waterInk, seg: 6, grain: 0, layer: 1 });
          }
        },
        0,
        50 + k,
      ),
    );
  }
  c.movers.push((m) => {
    if (m.t < born) return;
    for (let i = 0; i < JETS.length; i++) {
      const wave = 0.5 + 0.5 * Math.sin(m.t * 2.3 - (i % 4) * 0.9 - Math.floor(i / 4) * 0.6);
      m.put(jets[Math.min(5, Math.floor(wave * 6))], c.ox + JETS[i][0], c.oy + JETS[i][1], c.oz, born);
    }
  });
  // ---- and the children running through them
  const through = new Route([W(26.0, 8.0), W(30.4, 9.2), W(26.3, 10.5), W(30.5, 11.8), W(26.4, 13.1), W(28.4, 10.9)], true, 0.5);
  const kr = new Rng(313);
  for (let i = 0; i < 4; i++) {
    const lk = randomLook(kr);
    const mk = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, lk, pose, flip, 0.66), 0, 320 + i);
    const fr = [
      [mk("walkA", false), mk("cheer", false)],
      [mk("walkA", true), mk("cheer", true)],
    ];
    c.movers.push(
      traveler(through, {
        speed: 2.4,
        at: i / 4 + 0.03 * i,
        born: born + i * 0.15,
        span: 0.8,
        sprite: (h, t) => fr[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 4 + i) & 1],
      }),
    );
  }

  // ---- window cleaners in a cradle, working their way down the east face of the Shard and back up
  const wr = new Rng(909);
  const crew = [randomLook(wr), randomLook(wr)];
  for (const lk of crew) {
    lk.top = C.hivis;
    lk.hat = C.yellow;
  }
  const cradle = makeSprite(
    (p) => {
      p.box(0.03, -0.75, 0, 0.5, 1.5, 0.55, C.yellow, { w: W_FINE });
      person(p, 0.28, -0.35, 0.2, crew[0], "bust", false, 0.85);
      person(p, 0.28, 0.35, 0.2, crew[1], "bust", true, 0.85);
    },
    0,
    91,
  );
  const topX = c.ox + SH_CX + shHalf(SH_Z1) + 0.05;
  c.movers.push((m) => {
    if (m.t < born) return;
    const z = 20 + 9 * Math.sin(m.t * 0.22);
    const x = c.ox + SH_CX + shHalf(z);
    const y = c.oy + SH_CY;
    if (!m.sees(x, y, z, 12)) return;
    m.put(cradle, x, y, z, born);
    // the two ropes it hangs from, drawn afresh as they pay out
    const dp = m.pen;
    const keep = dp.reveal;
    dp.reveal = () => born;
    for (const dy of [-0.6, 0.6]) {
      dp.stroke(
        [
          [topX, y + dy, SH_Z1],
          [x + 0.28, y + dy, z + 0.55],
        ],
        { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
    }
    dp.reveal = keep;
  });

  // ---- steam off the pies and the coffee
  const puff = makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.3, C.white, { outline: true, w: 0.04, ink: C.inkSoft, seg: 9, grain: 0 }), 0, 61);
  const stoves: V3[] = [W(36.9, 28.9, 1.25), W(28.3, 37.8, 1.3)];
  c.movers.push((m) => {
    if (m.t < born) return;
    for (let j = 0; j < stoves.length; j++) {
      const s = stoves[j];
      for (let i = 0; i < 3; i++) {
        const u = (((m.t / 2.9 + i / 3 + j * 0.41) % 1) + 1) % 1;
        const dx = Math.sin(u * 6 + i * 2 + j) * 0.3;
        // each puff sketches itself in, then runs its reveal backwards to fade as it rises
        const p = Math.min(u * 2.9, ((1 - u) / 0.3) * 1.1);
        m.put(puff, s[0] + dx * 0.5, s[1] - dx * 0.5, s[2] + u * 2.6, m.t - p, 0.6 + u * 0.9);
      }
    }
  });

  // ---- people: out of the station with their coffee and back in, up and down the market, along the river
  const commute = new Route([W(14.5, 42.9), W(23.2, 42.9), W(25.0, 35.8), W(25.0, 25.4), W(26.4, 25.4), W(26.4, 35.2), W(24.0, 41.9), W(14.5, 41.9)], true, 0.5);
  for (let i = 0; i < 9; i++) c.movers.push(walker(commute, rng, born + rng.range(0, 1), rng.range(1.5, 2.0), cupWalker(700 + i * 7)));
  for (let i = 0; i < 4; i++) c.movers.push(walker(commute, rng, born + rng.range(0, 1)));
  const aisle = new Route([W(9.6, 32.2), W(43.0, 32.2), W(43.0, 32.85), W(9.6, 32.85)], true, 0.3);
  for (let i = 0; i < 9; i++) c.movers.push(walker(aisle, rng, born + rng.range(0, 1)));
  const strand = new Route([W(15.6, 5.85), W(43.3, 5.85), W(43.3, 6.35), W(15.6, 6.35)], true, 0.2);
  for (let i = 0; i < 6; i++) c.movers.push(walker(strand, rng, born + rng.range(0, 1)));
}

// ---------------------------------------------------------------- the block

export const londonbridge: LondonBuilder = (c) => {
  c.early(() => ground(c));
  // the Shard is the tallest thing in the city: stand back, and look up
  c.focus(16.2, 19.7, 0.78);
  belfast(c);
  cathedral(c);
  cityHall(c);
  riverside(c);
  viaduct(c);
  market(c);
  shard(c);
  forecourt(c);
  motion(c);
};
