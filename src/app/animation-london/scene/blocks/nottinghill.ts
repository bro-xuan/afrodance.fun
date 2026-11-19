// Notting Hill on carnival day. Two rows of ice-cream-coloured terraces meet
// at the back of the islet, antiques, fruit and flowers are sold from stalls
// along the kerb, and the parade is coming round the corner and down
// Portobello Road: flag bearers, a steel band on the back of a lorry, dancers
// under great fans of feathers, stilt walkers, a troupe of butterflies,
// children, drummers. In the square jerk chicken smokes on an oil-drum grill,
// a sound system has everyone jumping, and a police officer has been asked
// for this dance.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, Turning, castWalker, makeSprite, rounded } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  bench,
  bobby,
  bulb,
  bunting,
  cafeTable,
  dogOn,
  hat,
  lamp,
  lightString,
  person,
  phoneBox,
  pigeon,
  railing,
  randomLook,
  snapper,
  speckle,
  stall,
  terrace,
  tree,
  tufts,
  windowAt,
} from "../props";

/** Height of the islet's top above the paper. */
const G = 1.4;
// The land: a square with its corners well rounded.
const CX = 20.2;
const CY = 20.4;
const RA = 19.2;
const RB = 18.8;
const ROUND = 6;

// Portobello Road runs along the far row of houses (local x) and the side
// street along the other row (local y); they meet at the back of the islet.
// Both carriageways lie between P0 and P1, measured across them.
const P0 = 12;
const P1 = 18;
const MIDDLE = 15;
/** Where Portobello Road runs off the islet, and where the side street does. */
const EAST = 38.7;
const SOUTH = 38.5;
/** The far row: five houses along x from here, fronts on +y. */
const AX = 9.6;
const AY = 3.2;
const AW = 5;
const AD = 6.2;
/** The side row: four houses along y up from here (drawn turned), fronts on +x. */
const BX = 3.0;
const BY = 33.2;
const BW = 4.6;
const BD = 6.2;
/** Poles along the two edges of the square, for bunting and lights. */
const POLE = 20.35;
const POLES_X = [POLE, 26.2, 32.0, 37.5];
const POLES_Y = [26.2, 32.0, 37.3];

const TURQ = hex("#19c3b1");
const GREEN = hex("#2f9e55");
const GOLD = hex("#f7c531");
const RED = hex("#e5443a");
const ULTRA = hex("#1f4fa8");
const PURPLE = hex("#6b3fa0");
const BRIGHT: RGB[] = [C.yellow, C.pink, C.orange, TURQ, C.green, C.red, C.purple, C.white];
const LITTER: RGB[] = [hex("#ff5fa2"), hex("#ffd23e"), TURQ, hex("#ff7a2e")];

type Scheme = [RGB, RGB, RGB];
/** Feathers come in threes. */
const FEATHERS: Scheme[] = [
  [hex("#ff5fa2"), hex("#ffb13d"), hex("#ffe14d")],
  [TURQ, hex("#8fe6cf"), hex("#f6f1a0")],
  [hex("#8a5cf0"), hex("#f25fa3"), hex("#59b6ee")],
  [hex("#ff7a2e"), RED, hex("#ffd23e")],
];

// ---------------------------------------------------------------- the land

/** How far the land reaches from its middle in a direction, drawn in by `pad`. */
function reach(th: number, pad: number): number {
  const co = Math.abs(Math.cos(th));
  const si = Math.abs(Math.sin(th));
  return 1 / Math.pow(Math.pow(co / (RA - pad), ROUND) + Math.pow(si / (RB - pad), ROUND), 1 / ROUND);
}

/** The islet's outline. The real edge wanders a little; anything laid inside it (pad > 0) keeps a clean line. */
function shore(pad = 0, n = 72): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const k = pad > 0 ? 1 : 1 + 0.012 * Math.sin(5 * th + 0.7) + 0.008 * Math.sin(9 * th);
    const r = reach(th, pad) * k;
    pts.push([CX + Math.cos(th) * r, CY + Math.sin(th) * r]);
  }
  return pts;
}

function onLand(x: number, y: number, pad = 0.6): boolean {
  return Math.pow(Math.abs(x - CX) / (RA - pad), ROUND) + Math.pow(Math.abs(y - CY) / (RB - pad), ROUND) < 1;
}

/** The part of a convex outline that lies inside a rectangle. */
function clip(poly: V2[], x0: number, y0: number, x1: number, y1: number): V2[] {
  const cut = (pts: V2[], inside: (p: V2) => boolean, cross: (a: V2, b: V2) => V2): V2[] => {
    const out: V2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const ia = inside(a);
      if (ia) out.push(a);
      if (ia !== inside(b)) out.push(cross(a, b));
    }
    return out;
  };
  const atX =
    (x: number) =>
    (a: V2, b: V2): V2 => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const atY =
    (y: number) =>
    (a: V2, b: V2): V2 => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  let p = cut(poly, (q) => q[0] >= x0, atX(x0));
  p = cut(p, (q) => q[0] <= x1, atX(x1));
  p = cut(p, (q) => q[1] >= y0, atY(y0));
  return cut(p, (q) => q[1] <= y1, atY(y1));
}

// ---------------------------------------------------------------- the ground

function ground(pen: Pen): void {
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const inner = shore(0.55);
  // the two streets as one L of tarmac, a pavement inside the L and another outside it
  g1.poly(
    [
      [P0, P0],
      [EAST, P0],
      [EAST, P1],
      [P1, P1],
      [P1, SOUTH],
      [P0, SOUTH],
    ],
    C.tarmac,
    { grain: 0.9 },
  );
  g1.poly(
    [
      [9.4, 9.4],
      [EAST, 9.4],
      [EAST, P0],
      [P0, P0],
      [P0, SOUTH],
      [9.4, SOUTH],
    ],
    C.flag,
    { grain: 0.6 },
  );
  g1.poly(
    [
      [P1, P1],
      [EAST, P1],
      [EAST, 20.6],
      [20.6, 20.6],
      [20.6, SOUTH],
      [P1, SOUTH],
    ],
    C.flag,
    { grain: 0.6 },
  );
  for (const k of [P0, P1]) {
    g2.line(
      [
        [EAST, k],
        [k, k],
        [k, SOUTH],
      ],
      { w: 0.06 },
    );
  }
  g2.line(
    [
      [EAST, 20.6],
      [20.6, 20.6],
      [20.6, SOUTH],
    ],
    { w: 0.05, color: C.flagDark, kind: L_MARK },
  );
  for (let a = P1 + 1.2; a < EAST - 1.5; a += 2.7) g2.seg(a, MIDDLE, a + 1.3, MIDDLE, { w: 0.1, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
  for (let a = P1 + 1.2; a < SOUTH - 1.5; a += 2.7) g2.seg(MIDDLE, a, MIDDLE, a + 1.3, { w: 0.1, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
  // confetti, already trodden into the road
  for (const col of LITTER) {
    g2.ticks(P0 + 0.2, P0 + 0.2, EAST - 0.3, P1 - 0.2, { n: 44, len: 0.24, ang: 0, jit: 3.2, color: col, w: 0.08 });
    g2.ticks(P0 + 0.2, P1, P1 - 0.2, SOUTH - 0.3, { n: 36, len: 0.24, ang: 0, jit: 3.2, color: col, w: 0.08 });
  }
  // the square in the angle of the two streets
  g1.poly(clip(inner, 20.6, 20.6, 99, 99), C.plaza, { grain: 0.7 });
  speckle(g2, 20.9, 20.9, 39.2, 39.2, C.streetDark, 0.3, (a, b) => onLand(a, b, 1));
  // gardens in the corners the houses leave
  for (const [x0, y0, x1, y1] of [
    [-9, -9, 9.3, 14.5],
    [34.9, -9, 99, 9.2],
    [-9, 33.6, 9.2, 99],
  ]) {
    g1.poly(clip(inner, x0, y0, x1, y1), C.grass, { outline: true, w: W_THIN });
    tufts(g2, Math.max(1, x0), Math.max(1, y0), Math.min(39.4, x1), Math.min(39.4, y1), 0.4, (a, b) => onLand(a, b, 1.1));
  }
}

// ---------------------------------------------------------------- the houses

function houses(c: LondonCtx): void {
  const { pen, rng } = c;
  const blue = hex("#3a7be0");
  // the far row, facing the camera across Portobello Road
  pen.push(AX, AY, 0);
  terrace(pen, rng, { n: 5, w: AW, d: AD, floors: 3, style: "pastel", shops: [null, "VINYL", null, "TRAVEL BOOKS", null], lit: 0.62 });
  // the two shops everyone asks the way to get signboards that can be read from across the road
  const board = (i: number, name: string, rgb: RGB, ink: RGB) =>
    pen.obj(() => {
      const f = pen.wall("y+", i * AW, 0, 0, AW, AD);
      f.rect(0.15, 2.25, AW - 0.15, 2.95, rgb, { outline: true, w: W_FINE, layer: 3, grain: 0.4 });
      const size = Math.min(0.44, ((AW - 0.7) / name.length) * 1.05);
      f.text(name, AW / 2, 2.6 - size / 2, size, { align: "c", color: ink, kind: L_MARK, w: 0.07, wobble: 0.3, layer: 4 });
    }, 0.3);
  board(1, "VINYL", C.black, hex("#ff7ab8"));
  pen.obj(() => {
    const f = pen.wall("y+", AW, 0, 0, AW, AD);
    for (const b of [2.3, 2.84]) f.rect(0.3, b, AW - 0.3, b + 0.06, C.neonPink, { layer: 4, grain: 0, glow: 1, kind: F_NEON });
  }, 0.32);
  board(3, "TRAVEL BOOKS", C.navy, C.cream);
  // the blue front door people cross the world to be photographed at
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, 0, AW, AD);
    f.rect(0.5, 0.3, 1.7, 2.2, blue, { outline: true, w: W_THIN, layer: 2, grain: 0.4 });
    for (const [b0, b1] of [
      [0.48, 1.05],
      [1.25, 2.02],
    ]) {
      f.rect(0.68, b0, 1.52, b1, scaleRGB(blue, 0.86), { outline: true, w: 0.035, layer: 3, grain: 0.3 });
    }
    f.circle(1.1, 1.15, 0.07, C.gold, { layer: 4, seg: 6, grain: 0 });
  }, 0.35);
  // the street's name, on the end of the row
  pen.obj(() => {
    const f = pen.wall("x+", 4 * AW, 0, 0, AW, AD);
    f.rect(0.7, 1.1, 4.5, 2.25, C.white, { outline: true, w: W_FINE, layer: 1, grain: 0.2 });
    f.text("PORTOBELLO", 2.6, 1.68, 0.36, { align: "c", w: 0.065, wobble: 0.2, layer: 2 });
    f.text("ROAD  W11", 2.6, 1.25, 0.25, { align: "c", color: C.redDark, kind: L_MARK, w: 0.05, wobble: 0.2, layer: 2 });
  }, 0.4);
  pen.pop();

  // the side street's row, lower, facing the other way
  pen.push(BX, BY, 0, 270);
  terrace(pen, rng, { n: 4, w: BW, d: BD, floors: 2, style: "pastel", shops: ["BAKERY", null, "TEA ROOM", null], lit: 0.62 });
  // the end of that row: a few windows, and wisteria all over it
  pen.obj(() => {
    const f = pen.wall("x-", 0, 0, 0, BW, BD);
    for (const b of [0.8, 3.4, 5.85]) {
      for (const a of [1.3, 3.8]) {
        if (b < 1 && a < 2) continue;
        windowAt(f, a, b, a + 1.2, b + 1.5, rng.chance(0.6));
      }
    }
    f.line(
      [
        [0.5, 0],
        [0.62, 2.4],
        [0.5, 4.7],
        [1.4, 5.3],
        [3.2, 5.5],
        [5.7, 5.35],
      ],
      { w: 0.1, color: C.trunk, kind: L_MARK, wobble: 0.8, layer: 2 },
    );
    f.ticks(0.3, 4.6, 5.9, 5.7, { n: 30, len: 0.3, ang: 0.4, jit: 1.2, color: C.leafDark, w: 0.1, layer: 2 });
    f.ticks(0.3, 4.0, 5.9, 5.3, { n: 46, len: 0.55, ang: Math.PI / 2, jit: 0.2, color: C.lilac, w: 0.14, layer: 3 });
    f.ticks(0.3, 3.9, 5.9, 5.1, { n: 30, len: 0.4, ang: Math.PI / 2, jit: 0.2, color: C.purple, w: 0.1, layer: 3 });
  }, 0.3);
  pen.pop();

  // gardens: the one in the back corner behind its railings, a tree at each end of the rows
  railing(
    pen,
    [
      [9.3, 9.6, 0],
      [9.3, 14.5, 0],
    ],
    0.9,
    C.iron,
    0.6,
  );
  tree(pen, rng, 5.4, 7.6, { kind: "round" });
  tree(pen, rng, 7.2, 11.9, { kind: "blossom" });
  tree(pen, rng, 4.1, 11.4, { kind: "tall" });
  tree(pen, rng, 37.0, 4.8, { kind: "blossom" });
  tree(pen, rng, 5.6, 36.1, { kind: "round" });
}

// ---------------------------------------------------------------- street dressing

/** Lamps, and the poles along the square that carry bunting across both streets and lights along the square. */
function dressing(c: LondonCtx): void {
  const { pen } = c;
  for (const [x, y] of [
    [17.0, 11.7],
    [25.6, 11.7],
    [33.6, 11.7],
    [11.7, 20.6],
    [11.7, 29.2],
  ]) {
    lamp(pen, x, y);
  }
  const pole = (x: number, y: number, rgb: RGB) =>
    pen.obj(() => {
      pen.pole([x, y, 0], [x, y, 5.9], 0.11, C.white);
      pen.card(x, y, 5.9).poly(
        [
          [0, 0],
          [0.95, -0.22],
          [0, -0.46],
        ],
        rgb,
        { outline: true, w: 0.035, sway: 0.3, grain: 0.3 },
      );
    });
  POLES_X.forEach((x, i) => pole(x, POLE, BRIGHT[i % 4]));
  POLES_Y.forEach((y, i) => pole(POLE, y, BRIGHT[(i + 1) % 4]));
  // across Portobello Road, from the house fronts to the poles
  for (const x of POLES_X) bunting(pen, [Math.min(x, AX + 5 * AW - 0.6), AY + AD + 0.08, 6.15], [x, POLE, 5.75], 0.5);
  // and across the side street
  for (const y of [POLE, POLES_Y[0], POLES_Y[1]]) bunting(pen, [BX + BD + 0.08, y, 5.8], [POLE, y, 5.75], 0.5);
  for (let i = 0; i + 1 < POLES_X.length; i++) lightString(pen, [POLES_X[i], POLE, 5.2], [POLES_X[i + 1], POLE, 5.2], 8, 0.5);
  const down = [POLE, ...POLES_Y];
  for (let i = 0; i + 1 < down.length; i++) lightString(pen, [POLE, down[i], 5.2], [POLE, down[i + 1], 5.2], 8, 0.5);
}

// ---------------------------------------------------------------- people

/** Someone dressed for carnival. */
function reveller(rng: Rng): Look {
  const lk = randomLook(rng);
  if (rng.chance(0.55)) lk.top = rng.pick(BRIGHT);
  if (rng.chance(0.12)) lk.hat = rng.pick(BRIGHT);
  return lk;
}

/** A pennant on a stick, held up by whoever stands at (x, y) with an arm raised. */
function pennant(pen: Pen, x: number, y: number, rgb: RGB, flip: boolean): void {
  const k = pen.card(x, y, 0, flip);
  pen.begin();
  k.seg(0.6, 1.8, 0.66, 2.78, { w: 0.05, color: C.white, kind: L_BAR, wobble: 0, layer: 4 });
  k.poly(
    [
      [0.68, 2.76],
      [1.32, 2.52],
      [0.68, 2.3],
    ],
    rgb,
    { outline: true, w: 0.035, sway: 0.25, layer: 5, grain: 0.3 },
  );
  pen.end();
}

/** A child on a grown-up's shoulders, arms in the air. */
function shoulders(pen: Pen, rng: Rng, x: number, y: number, dad: Look): void {
  const kid = reveller(rng);
  pen.obj(() => {
    person(pen, x, y, 0, dad, "stand");
    const k = pen.card(x, y, 0);
    k.bar(-0.2, 2.2, -0.31, 1.62, 0.13, kid.legs, { layer: 6 });
    k.bar(0.2, 2.2, 0.31, 1.62, 0.13, kid.legs, { layer: 6 });
    person(pen, x, y, 2.12, kid, "bust", false, 0.62);
    k.bar(-0.2, 2.5, -0.42, 2.95, 0.1, kid.top, { layer: 7 });
    k.bar(0.2, 2.5, 0.42, 2.95, 0.1, kid.top, { layer: 7 });
  });
}

/**
 * A line of people along a pavement, watching. Some hold up phones, some wave
 * pennants, some carry a child. A few cannot keep still: those are left out
 * and their places returned, to be drawn as they jump.
 */
function watchers(pen: Pen, rng: Rng, x0: number, y0: number, x1: number, y1: number, n: number, jumpers: V2[], skip?: (x: number, y: number) => boolean): void {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t + rng.range(-0.22, 0.22);
    const y = y0 + (y1 - y0) * t + rng.range(-0.22, 0.22);
    const roll = rng.next();
    const lk = reveller(rng);
    const flip = rng.chance(0.5);
    if (skip?.(x, y)) continue;
    if (roll < 0.09) jumpers.push([x, y]);
    else if (roll < 0.16) shoulders(pen, rng, x, y, lk);
    else if (roll < 0.28) snapper(pen, x, y, lk, flip);
    else if (roll < 0.4) {
      person(pen, x, y, 0, lk, "wave", flip);
      pennant(pen, x, y, rng.pick(BRIGHT), flip);
    } else person(pen, x, y, 0, lk, rng.pick(["stand", "wave", "cheer", "stand", "cheer"]), flip, rng.chance(0.14) ? 0.72 : 1);
  }
}

/** Everyone lining the two streets, and what goes on outside the shops. Returns where the jumpers stand. */
function pavements(c: LondonCtx): V2[] {
  const { pen, rng } = c;
  const jumpers: V2[] = [];
  const lamps = [17.0, 25.6, 33.6];
  // in front of the far row (not across the shop displays, or into the lamps)
  watchers(pen, rng, 13.0, 11.2, 37.9, 11.2, 18, jumpers, (x) => lamps.some((l) => Math.abs(x - l) < 0.55) || (x > 14.9 && x < 17.9) || (x > 25.2 && x < 28.7));
  // the near side of Portobello Road, two deep
  watchers(pen, rng, 19.0, 18.75, 38.1, 18.75, 14, jumpers);
  watchers(pen, rng, 19.6, 19.75, 37.6, 19.75, 12, jumpers, (x) => POLES_X.some((p) => Math.abs(x - p) < 0.45));
  // both sides of the side street
  watchers(pen, rng, 11.1, 15.6, 11.1, 37.8, 14, jumpers, (_x, y) => Math.abs(y - 20.6) < 0.5 || Math.abs(y - 29.2) < 0.5);
  watchers(pen, rng, 18.75, 21.6, 18.75, 37.9, 10, jumpers);
  watchers(pen, rng, 19.75, 22.3, 19.75, 37.4, 9, jumpers, (_x, y) => POLES_Y.some((p) => Math.abs(y - p) < 0.45));

  // the blue door: one poses on the step, one takes the picture, one waits for a turn
  person(pen, 10.75, 10.75, 0, reveller(rng), "wave");
  snapper(pen, 11.55, 11.45, reveller(rng), true);
  person(pen, 10.1, 11.6, 0, reveller(rng), "stand", true);

  // crates of records outside the record shop, and someone going through them
  pen.obj(() => {
    for (const x of [15.25, 16.45]) {
      pen.box(x, 10.55, 0, 0.95, 0.55, 0.5, C.woodDark, { w: W_FINE });
      for (let q = 0; q < 5; q++) pen.box(x + 0.06 + q * 0.17, 10.6, 0.5, 0.13, 0.45, 0.34, rng.pick([C.black, C.red, C.yellow, C.blue, C.white, C.orange]), { w: 0.03, grain: 0.3 });
    }
  });
  person(pen, 16.35, 11.3, 0, reveller(rng), "stand", true);
  // a trolley of books outside the travel bookshop, and someone who has started reading one
  pen.obj(() => {
    pen.box(26.0, 10.5, 0.35, 1.5, 0.55, 0.12, C.wood, { w: W_FINE });
    for (const x of [26.1, 27.4]) pen.pole([x, 10.78, 0], [x, 10.78, 0.35], 0.07, C.iron, { ink: false });
    for (let q = 0; q < 8; q++) pen.box(26.05 + q * 0.18, 10.55, 0.47, 0.15, 0.42, 0.3 + (q % 3) * 0.05, rng.pick([C.red, C.blue, C.green, C.cream, C.orange, C.teal]), { w: 0.03, grain: 0.3 });
  });
  pen.obj(() => {
    const lk = reveller(rng);
    person(pen, 28.1, 11.25, 0, lk, "stand");
    const k = pen.card(28.1, 11.25, 0);
    k.bar(0.37, 1.33, 0.2, 1.05, 0.17, lk.top, { layer: 4 });
    k.rect(-0.12, 0.95, 0.32, 1.25, C.cream, { outline: true, w: 0.035, layer: 5, grain: 0.2 });
  });
  return jumpers;
}

// ---------------------------------------------------------------- the square

const DRUM = hex("#2f3033");

/** An oil drum on its side, cut in half along its length: coals in the lower half, the upper half hinged back as a lid. */
function grill(pen: Pen, x: number, y: number): void {
  const L = 1.9;
  const r = 0.55;
  const z0 = 0.75;
  pen.begin();
  for (const lx of [0.2, L - 0.2]) {
    for (const s of [-1, 1]) pen.pole([x + lx, y + s * 0.5, 0], [x + lx, y + s * 0.28, z0 + 0.1], 0.09, C.iron);
  }
  const f = pen.wall("x+", x, y - r, z0, 0, 2 * r);
  const lower: V2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = Math.PI + (Math.PI * i) / 8;
    lower.push([r + Math.cos(t) * r, r + Math.sin(t) * r]);
  }
  f.extrude(lower, L, DRUM, { crease: 30, w: 0.09 });
  const lid: V2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / 8;
    lid.push([2 * r + Math.cos(t) * r, 2 * r + Math.sin(t) * r]);
  }
  f.extrude(lid, L, DRUM, { crease: 30, w: 0.09 });
  // the coals, the bars over them, and what is cooking
  const top = pen.floor(z0 + r + 0.02, 1);
  top.rect(x + 0.1, y - r + 0.1, x + L - 0.1, y + r - 0.1, hex("#e2572b"), { glow: 1, kind: F_NEON, grain: 0.7 });
  for (let a = 0.25; a < L; a += 0.24) top.seg(x + a, y - r + 0.12, x + a, y + r - 0.12, { w: 0.04, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
  for (const [a, b] of [
    [0.45, -0.2],
    [0.95, 0.15],
    [1.4, -0.12],
    [0.7, 0.26],
    [1.5, 0.25],
  ]) {
    top.ellipse(x + a, y + b, 0.17, 0.11, hex("#8a5630"), { outline: true, w: 0.03, layer: 2, seg: 7, grain: 0.4 });
  }
  pen.end();
}

/** The jerk chicken pitch: the grill, the cook, the board, and the queue. */
function jerk(c: LondonCtx): void {
  const { pen, rng } = c;
  const gx = 26.6;
  const gy = 29.4;
  grill(pen, gx, gy);
  // the cook, in an apron, turning things with tongs
  pen.obj(() => {
    const lk: Look = { skin: SKIN[3], hair: HAIR[0], top: GREEN, legs: C.charcoal, long: false, hat: null };
    const cx = gx + 2.65;
    const cy = gy - 0.15;
    person(pen, cx, cy, 0, lk, "wave", true);
    hat(pen, cx, cy, 0, "chef", { flip: true });
    const k = pen.card(cx, cy, 0, true);
    k.poly(
      [
        [-0.26, 0.72],
        [0.26, 0.72],
        [0.22, 1.3],
        [-0.22, 1.3],
      ],
      C.white,
      { outline: true, w: 0.035, layer: 1.5, grain: 0.2 },
    );
    k.seg(0.64, 1.86, 1.2, 1.5, { w: 0.05, color: C.metal, kind: L_BAR, wobble: 0, layer: 4 });
  });
  // the board: red, gold and green
  pen.obj(() => {
    const x = gx - 2.5;
    const y = gy + 0.75;
    const b = pen.plane([x, y, 0.35], [1, 0, 0], [0, 0, 1], 1, true);
    [GREEN, GOLD, RED].forEach((col, i) => b.rect(0, i * 0.52, 1.9, (i + 1) * 0.52, col, { grain: 0.5 }));
    b.loop(
      [
        [0, 0],
        [1.9, 0],
        [1.9, 1.56],
        [0, 1.56],
      ],
      { w: W_THIN },
    );
    b.text("JERK", 0.95, 1.12, 0.34, { align: "c", color: C.white, kind: L_MARK, w: 0.075, wobble: 0.3, layer: 1 });
    b.text("CHICKEN", 0.95, 0.63, 0.27, { align: "c", color: C.black, kind: L_MARK, w: 0.06, wobble: 0.3, layer: 1 });
    for (const a of [0.15, 1.75]) pen.pole([x + a, y, 0], [x + a, y, 0.35], 0.08, C.woodDark, { ink: false });
  });
  // the queue, and a dog that has found the right place to sit
  [
    [gx + 3.9, gy + 0.3],
    [gx + 4.75, gy + 0.55],
    [gx + 5.55, gy + 0.35],
  ].forEach(([x, y], i) => person(pen, x, y, 0, reveller(rng), i === 1 ? "wave" : "stand", i % 2 === 0, i === 2 ? 0.72 : 1));
  pen.obj(() => dogOn(pen.card(gx + 1.0, gy + 1.35, 0), hex("#b98352"), { s: 0.9 }));
}

const PARTY: RGB[] = [C.neonPink, GOLD, C.neonBlue, hex("#5fe08a")];

/** A string of coloured party lights between two points: after dark each glows in its own colour. */
function festoon(pen: Pen, a: V3, b: V3, n: number, sag: number): void {
  pen.begin();
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * sag]);
  }
  pen.stroke(pts, { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 1; i < n; i++) {
    pen.card(pts[i][0], pts[i][1], pts[i][2] - 0.15).circle(0, 0, 0.12, PARTY[i % PARTY.length], { seg: 6, grain: 0, glow: 1, kind: F_NEON, outline: true, w: 0.03 });
  }
  pen.end();
}

/** Two stacks of speakers either side of the decks. Returns where the dancers in front of it jump. */
function soundSystem(c: LondonCtx): V2[] {
  const { pen, rng } = c;
  const x = 31.0;
  const y = 21.3;
  const neon: RGB[] = [C.neonPink, C.neonBlue, GOLD];
  for (const sx of [x, x + 4.0]) {
    for (let k = 0; k < 3; k++) {
      pen.obj(() => {
        const z = k * 1.05;
        pen.box(sx, y, z, 1.25, 1.1, 1.05, DRUM, { w: W_THIN, top: C.charcoal });
        const f = pen.wall("y+", sx, y, z, 1.25, 1.1);
        const cones = k < 2 ? [[0.625, 0.38]] : [[0.34, 0.2], [0.91, 0.2]];
        for (const [a, r] of cones) {
          f.circle(a, 0.52, r, C.greyDark, { outline: true, w: 0.04, seg: 10, grain: 0.3 });
          f.circle(a, 0.52, r * 0.38, C.grey, { layer: 1, seg: 7, grain: 0 });
        }
        f.circle(0.14, 0.92, 0.07, neon[k], { layer: 1, seg: 6, grain: 0, glow: 1, kind: F_NEON });
      }, k * 0.12);
    }
  }
  // the decks on a trestle, the selector behind them, the name over the top
  pen.obj(() => {
    pen.box(x + 1.5, y + 0.25, 0.85, 2.25, 0.8, 0.1, C.woodDark, { w: W_FINE });
    for (const a of [1.6, 3.65]) pen.pole([x + a, y + 0.65, 0], [x + a, y + 0.65, 0.85], 0.08, C.iron, { ink: false });
    const t = pen.floor(0.96, 1);
    for (const a of [2.05, 3.2]) {
      t.circle(x + a, y + 0.65, 0.3, C.black, { outline: true, w: 0.035, seg: 10, grain: 0.3 });
      t.circle(x + a, y + 0.65, 0.09, RED, { layer: 1, seg: 6, grain: 0 });
    }
    const lk: Look = { skin: SKIN[4], hair: HAIR[6], top: GOLD, legs: C.black, long: false, hat: null };
    person(pen, x + 2.62, y - 0.1, 0, lk, "wave");
    const k = pen.card(x + 2.62, y - 0.1, 0);
    k.arc(0, 1.9, 0.46, 0.46, 0.25, Math.PI - 0.25, { w: 0.07, color: C.black, kind: L_BAR, wobble: 0, layer: 6, seg: 6 });
    for (const a of [-0.44, 0.44]) k.circle(a, 1.86, 0.13, C.black, { layer: 6, seg: 6, grain: 0 });
  }, 0.2);
  pen.obj(() => {
    for (const a of [x + 0.62, x + 4.62]) pen.pole([a, y + 0.55, 3.15], [a, y + 0.55, 4.4], 0.08, C.white);
    const b = pen.plane([x + 0.85, y + 0.55, 3.45], [1, 0, 0], [0, 0, 1], 1, true);
    b.rect(0, 0, 3.55, 0.85, PURPLE, { outline: true, w: W_FINE, grain: 0.4 });
    b.text("BIG BASS", 1.78, 0.22, 0.42, { align: "c", color: GOLD, kind: L_MARK, w: 0.08, wobble: 0.3, layer: 1 });
  }, 0.35);
  // party lights from the stacks out to two poles, and between the poles: the dance floor is under them
  const pa: V3 = [30.5, 28.2, 4.3];
  const pb: V3 = [37.4, 28.5, 4.3];
  for (const p of [pa, pb]) pen.pole([p[0], p[1], 0], p, 0.1, C.white);
  festoon(pen, [x + 0.62, y + 0.55, 4.4], pa, 10, 0.5);
  festoon(pen, [x + 4.62, y + 0.55, 4.4], pb, 10, 0.5);
  festoon(pen, pa, pb, 11, 0.7);
  festoon(pen, [x + 0.62, y + 0.55, 4.4], [x + 4.62, y + 0.55, 4.4], 7, 0.12);

  // the dance floor in front: some standing about, most not
  const jumpers: V2[] = [];
  const spots: V2[] = [
    [31.0, 24.4],
    [32.3, 25.3],
    [33.5, 24.3],
    [34.7, 25.4],
    [35.9, 24.5],
    [36.9, 25.6],
    [31.6, 26.6],
    [35.6, 26.9],
    [36.8, 27.4],
    [33.0, 26.3],
  ];
  spots.forEach(([sx, sy], i) => {
    if (i % 2 === 0) jumpers.push([sx, sy]);
    else person(pen, sx, sy, 0, reveller(rng), rng.pick(["cheer", "wave", "cheer"]), rng.chance(0.5), i === 9 ? 0.72 : 1);
  });
  return jumpers;
}

/** The square: the market stalls and their customers, the grill, the sound system, and somewhere to sit down. */
function square(c: LondonCtx): V2[] {
  const { pen, rng } = c;
  // stalls along both edges of the square, facing into it
  pen.push(22.4, 21.0, 0);
  stall(pen, rng, { w: 3.4, sign: "FRUIT", a: C.green, goods: [C.red, C.yellow, C.orange, C.grass] });
  pen.pop();
  pen.push(26.6, 21.0, 0);
  stall(pen, rng, { w: 3.4, sign: "FLOWERS", a: C.pink, goods: [C.pink, C.purple, C.yellow, C.red] });
  pen.pop();
  pen.push(20.9, 28.4, 0, 270);
  stall(pen, rng, { w: 3.4, sign: "ANTIQUES", a: C.blue, goods: [C.gold, C.metal, C.woodDark, C.white] });
  pen.pop();
  pen.push(20.9, 33.6, 0, 270);
  stall(pen, rng, { w: 3.4, sign: "VINTAGE", a: C.orange, goods: [C.lilac, C.teal, C.cream, C.redDark] });
  pen.pop();
  for (const [x, y] of [
    [23.3, 24.5],
    [24.7, 24.7],
    [29.2, 24.6],
    [24.4, 26.1],
    [24.5, 31.3],
    [24.6, 32.7],
  ]) {
    person(pen, x, y, 0, reveller(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
  }
  // one of them has bought flowers
  pen.obj(() => {
    const lk = reveller(rng);
    person(pen, 27.8, 24.6, 0, lk, "stand");
    const k = pen.card(27.8, 24.6, 0);
    k.bar(0.36, 1.33, 0.52, 1.05, 0.16, lk.top, { layer: 4 });
    for (const [a, b, col] of [
      [0.42, 1.38, C.pink],
      [0.62, 1.42, C.yellow],
      [0.52, 1.56, C.purple],
      [0.7, 1.26, C.red],
    ] as [number, number, RGB][]) {
      k.circle(a, b, 0.11, col, { layer: 5, seg: 6, grain: 0, outline: true, w: 0.03 });
    }
  });
  // and one is holding a brass jug up to the light
  pen.obj(() => {
    person(pen, 24.5, 27.5, 0, reveller(rng), "wave");
    pen.card(24.5, 27.5, 0).ellipse(0.66, 2.0, 0.14, 0.19, C.gold, { outline: true, w: 0.035, layer: 5, seg: 7, grain: 0.2 });
  });

  jerk(c);
  const jumpers = soundSystem(c);

  // a table under a parasol, a bench under a blossom tree, a phone box nobody is phoning from
  cafeTable(pen, rng, 26.6, 33.4, GOLD, 3);
  tree(pen, rng, 33.6, 33.4, { kind: "blossom" });
  bench(pen, 30.2, 35.7, 0);
  person(pen, 29.75, 35.72, 0.42, reveller(rng), "sit");
  person(pen, 30.65, 35.72, 0.42, reveller(rng), "sit", true);
  pigeon(pen, 31.9, 36.4, 0, false, true);
  pigeon(pen, 28.6, 36.6, 0, true);
  phoneBox(pen, 37.1, 32.4, 0);
  snapper(pen, 36.45, 33.95, reveller(rng), false);
  person(pen, 37.6, 33.55, 0, reveller(rng), "wave", true);

  // the balloon seller
  pen.obj(() => {
    const lk = reveller(rng);
    person(pen, 23.9, 35.6, 0, lk, "wave");
    const k = pen.card(23.9, 35.6, 0);
    const cols = [C.red, C.yellow, C.blue, C.orange, C.pink, C.green, C.purple, C.orange, C.red];
    cols.forEach((col, i) => {
      const a = 0.64 + ((i % 3) - 1) * 0.42 + (i > 5 ? 0.2 : 0);
      const b = 2.75 + Math.floor(i / 3) * 0.46 + (i % 2) * 0.12;
      k.line(
        [
          [0.64, 1.86],
          [a, b - 0.26],
        ],
        { w: 0.03, color: C.inkSoft, kind: L_MARK, wobble: 0, sway: 0, swayB: 0.5, layer: 5 },
      );
      k.ellipse(a, b, 0.25, 0.3, col, { outline: true, w: 0.04, sway: 0.5, layer: 6 + i * 0.1, seg: 9, grain: 0.2 });
    });
  });
  person(pen, 22.9, 36.2, 0, reveller(rng), "cheer", true, 0.68);
  return jumpers;
}

// ---------------------------------------------------------------- costumes

/**
 * A fan of feathers on a card: `n` of them spread either side of a direction
 * (0 is straight up, in radians), the middle ones longest and on top.
 */
function fan(k: Plane, a: number, b: number, len: number, n: number, dir: number, spread: number, cols: RGB[], layer: number, wide: number): void {
  const mid = (n - 1) / 2;
  const order: number[] = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((p, q) => Math.abs(q - mid) - Math.abs(p - mid));
  order.forEach((i, rank) => {
    const th = dir + (n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1));
    const dx = Math.sin(th);
    const dy = Math.cos(th);
    const l = len * (1 - (0.24 * Math.abs(i - mid)) / Math.max(1, mid));
    const mx = a + dx * l * 0.62;
    const my = b + dy * l * 0.62;
    k.poly(
      [
        [a, b],
        [mx - dy * wide * 0.5, my + dx * wide * 0.5],
        [a + dx * l, b + dy * l],
        [mx + dy * wide * 0.5, my - dx * wide * 0.5],
      ],
      cols[i % cols.length],
      { outline: true, w: 0.035, layer: layer + rank * 0.08, grain: 0.3 },
    );
  });
}

/** A carnival dancer: a great fan of feathers on her back, a headdress, a feather skirt. */
function dancer(pen: Pen, lk: Look, cols: Scheme, pose: Pose, flip = false, s = 1): void {
  const k = pen.card(0, 0, 0, flip);
  fan(k, 0, 1.2 * s, 2.05 * s, 9, 0, 1.3, cols, -4, 0.54 * s);
  person(pen, 0, 0, 0, lk, pose, flip, s);
  fan(k, 0, 0.95 * s, 0.62 * s, 5, Math.PI, 1.05, [cols[1], cols[0], cols[2]], 1.3, 0.3 * s);
  fan(k, 0, 2.16 * s, 0.95 * s, 5, 0, 0.85, [cols[2], cols[0], cols[1]], 6, 0.3 * s);
  k.seg(-0.31 * s, 2.13 * s, 0.31 * s, 2.13 * s, { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0, layer: 7.5 });
}

/** Someone in a butterfly's wings. `open` is how far they are spread, 0 to 1. */
function butterfly(pen: Pen, lk: Look, wing: RGB, spot: RGB, open: number): void {
  const k = pen.card(0, 0, 0);
  const upper: V2[] = [
    [0.1, 1.32],
    [0.4, 2.3],
    [1.5, 2.85],
    [2.05, 2.15],
    [1.25, 1.3],
  ];
  const lower: V2[] = [
    [0.1, 1.24],
    [1.15, 1.22],
    [1.55, 0.62],
    [0.95, 0.3],
    [0.32, 0.72],
  ];
  for (const sx of [-1, 1]) {
    const q = (pts: V2[]): V2[] => pts.map((p) => [p[0] * sx * open, p[1]]);
    k.poly(q(upper), wing, { outline: true, w: 0.05, layer: -3, grain: 0.3 });
    k.poly(q(lower), scaleRGB(wing, 0.9), { outline: true, w: 0.05, layer: -3.3, grain: 0.3 });
    k.circle(1.32 * sx * open, 2.25, 0.2 * (0.5 + open * 0.5), spot, { layer: -2.6, seg: 7, grain: 0 });
    k.circle(0.78 * sx * open, 1.88, 0.12, spot, { layer: -2.6, seg: 6, grain: 0 });
    k.circle(0.95 * sx * open, 0.78, 0.15, spot, { layer: -2.9, seg: 6, grain: 0 });
    k.seg(0.1 * sx, 2.2, 0.36 * sx, 2.82, { w: 0.04, wobble: 0, kind: L_BAR, layer: 6 });
    k.circle(0.36 * sx, 2.84, 0.06, C.black, { layer: 6, seg: 5, grain: 0 });
  }
  person(pen, 0, 0, 0, lk, open > 0.8 ? "cheer" : "wave");
}

/** A stilt walker: striped trousers all the way down. */
function stilts(pen: Pen, lk: Look, cols: Scheme, frame: number): void {
  const up = 1.75;
  const k = pen.card(0, 0, 0);
  const feet = frame === 0 ? [-0.44, 0.42] : [-0.14, 0.18];
  [-0.15, 0.15].forEach((hip, i) => {
    for (let q = 0; q < 5; q++) {
      const t0 = q / 5;
      const t1 = (q + 1) / 5;
      k.bar(hip + (feet[i] - hip) * t0, up + 0.7 - (up + 0.64) * t0, hip + (feet[i] - hip) * t1, up + 0.7 - (up + 0.64) * t1, 0.24, cols[q % 2 === 0 ? 0 : 2]);
    }
  });
  person(pen, 0, 0, up, lk, frame === 0 ? "cheer" : "wave");
  fan(k, 0, up + 2.16, 0.9, 3, 0, 0.5, cols, 6, 0.3);
}

/** Someone carrying a big flag on a pole, swung to one side or the other. */
function bearer(pen: Pen, lk: Look, design: number, frame: number): void {
  person(pen, 0, 0, 0, lk, "cheer");
  const k = pen.card(0, 0, 0);
  const hand: V2 = [0.6, 1.9];
  const tip: V2 = frame === 0 ? [1.2, 4.0] : [0.2, 4.15];
  const ux = tip[0] - hand[0];
  const uy = tip[1] - hand[1];
  const len = Math.hypot(ux, uy);
  k.seg(hand[0] - (ux / len) * 0.5, hand[1] - (uy / len) * 0.5, tip[0], tip[1], { w: 0.06, color: C.white, kind: L_BAR, wobble: 0, layer: 4 });
  // the cloth hangs from the top of the pole, out to whichever side it is being swung
  const fly: V2 = [frame === 0 ? 1.75 : -1.75, -0.12];
  const drop: V2 = [(-ux / len) * 1.15, (-uy / len) * 1.15];
  const at = (u: number, v: number): V2 => [tip[0] + fly[0] * u + drop[0] * v, tip[1] + fly[1] * u + drop[1] * v];
  const fill = (pts: V2[], rgb: RGB, layer: number) =>
    k.poly(
      pts.map((p) => at(p[0], p[1])),
      rgb,
      { layer, grain: 0.3, shade: false },
    );
  const all: V2[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  if (design === 0) {
    // a gold cross from corner to corner, green above and below, black at the sides
    fill(all, GREEN, 5);
    fill(
      [
        [0, 0],
        [0.5, 0.5],
        [0, 1],
      ],
      C.black,
      5.1,
    );
    fill(
      [
        [1, 0],
        [0.5, 0.5],
        [1, 1],
      ],
      C.black,
      5.1,
    );
    fill(
      [
        [0, 0],
        [0.12, 0],
        [1, 0.86],
        [1, 1],
        [0.88, 1],
        [0, 0.14],
      ],
      GOLD,
      5.2,
    );
    fill(
      [
        [1, 0],
        [1, 0.14],
        [0.12, 1],
        [0, 1],
        [0, 0.86],
        [0.88, 0],
      ],
      GOLD,
      5.2,
    );
  } else if (design === 1) {
    // red, with a black band edged in white from corner to corner
    fill(all, RED, 5);
    fill(
      [
        [0, 0],
        [0.3, 0],
        [1, 1],
        [0.7, 1],
      ],
      C.white,
      5.1,
    );
    fill(
      [
        [0.07, 0],
        [0.23, 0],
        [0.93, 1],
        [0.77, 1],
      ],
      C.black,
      5.2,
    );
  } else {
    // blue, gold, blue
    fill(all, ULTRA, 5);
    fill(
      [
        [1 / 3, 0],
        [2 / 3, 0],
        [2 / 3, 1],
        [1 / 3, 1],
      ],
      GOLD,
      5.1,
    );
  }
  k.loop([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], { w: 0.04, layer: 5.5 });
}

/** A body with no arms drawn: legs to the ground, a torso and a head. The arms are added by whoever is playing. */
function torso(pen: Pen, k: Plane, x: number, y: number, z: number, lk: Look, stride: number): void {
  if (stride === 0) {
    k.bar(-0.1, 0.76, -0.3, 0.1, 0.25, lk.legs);
    k.bar(0.1, 0.76, 0.28, 0.12, 0.25, lk.legs);
  } else {
    k.bar(-0.14, 0.76, -0.15, 0.08, 0.25, lk.legs);
    k.bar(0.14, 0.76, 0.15, 0.08, 0.25, lk.legs);
  }
  person(pen, x, y, z + 0.7, lk, "bust");
}

/** Two arms holding sticks: one up, one down, swapping every beat. */
function sticks(k: Plane, lk: Look, frame: number, low: number, layer: number): void {
  const up = frame === 0 ? -1 : 1;
  for (const s of [-1, 1]) {
    const hi = s === up;
    const hx = s * (hi ? 0.56 : 0.4);
    const hy = hi ? 1.76 : low;
    k.bar(s * 0.31, 1.3, hx, hy, 0.17, lk.top, { layer });
    k.seg(hx, hy, hx - s * (hi ? 0.1 : 0.16), hy + (hi ? 0.36 : -0.26), { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0, layer: layer + 0.5 });
  }
}

/** A drummer on the march, the drum slung at the waist. */
function drummer(pen: Pen, lk: Look, drum: RGB, frame: number): void {
  const k = pen.card(0, 0, 0);
  torso(pen, k, 0, 0, 0, lk, frame);
  k.rect(-0.5, 0.56, 0.5, 1.16, drum, { outline: true, w: W_FINE, layer: 3, grain: 0.3 });
  k.ellipse(0, 1.16, 0.5, 0.13, C.white, { outline: true, w: 0.04, layer: 3.5, seg: 10, grain: 0.2 });
  for (const b of [0.64, 1.02]) k.seg(-0.5, b, 0.5, b, { w: 0.05, color: C.gold, kind: L_MARK, wobble: 0, layer: 4 });
  sticks(k, lk, frame, 1.3, 4.5);
}

// ---------------------------------------------------------------- the float

/**
 * The float: a flatbed lorry, nose towards local +x. A steel band plays under
 * an awning on the back, there are speakers stacked behind them and someone
 * with a microphone in front. `frame` is the beat: the sticks swap over.
 */
function float(pen: Pen, frame: number, band: Look[], mc: Look): void {
  const W = 2.6;
  const deck = 1.1;
  const x0 = -4.75;
  const x1 = 2.8;
  const len = x1 - x0;
  for (const y of [-W / 2 - 0.02, W / 2 + 0.02]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    for (const a of [-3.1, -1.7, 3.7]) {
      q.circle(a, 0.5, 0.5, C.black, { outline: true, w: W_FINE, seg: 10, grain: 0.3 });
      q.circle(a, 0.5, 0.2, C.grey, { layer: 1, seg: 7, grain: 0 });
    }
  }
  // the bed, with a banner down each side
  pen.box(x0, -W / 2, 0.42, len, W, deck - 0.42, PURPLE, { top: C.wood, w: 0.1 });
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, x0, -W / 2, 0.42, len, W);
    f.text("CARNIVAL", len / 2, 0.14, 0.4, { align: "c", color: GOLD, kind: L_MARK, w: 0.085, wobble: 0.3, layer: 1 });
    for (const a of [0.55, len - 0.55]) f.circle(a, 0.34, 0.17, GOLD, { layer: 1, seg: 7, grain: 0.2 });
  }
  // the cab
  pen.box(x1 + 0.1, -1.2, 0.42, 1.85, 2.4, 2.1, TURQ, { top: scaleRGB(TURQ, 0.9), w: 0.1 });
  const nose = pen.wall("x+", x1 + 0.1, -1.2, 0.42, 1.85, 2.4);
  nose.rect(0.2, 1.0, 2.2, 1.9, C.glass, { outline: true, w: W_FINE, glow: 0.7, grain: 0.4 });
  nose.rect(0.55, 0.25, 1.85, 0.75, C.greyDark, { outline: true, w: 0.035, layer: 1, grain: 0.3 });
  for (const a of [0.12, 1.96]) nose.rect(a, 0.3, a + 0.32, 0.55, C.lamp, { outline: true, w: 0.035, glow: 1, layer: 2, grain: 0.2 });
  nose.circle(0.72, 1.42, 0.2, band[0].skin, { layer: 1, seg: 7, grain: 0 });
  for (const side of ["y+", "y-"] as const) pen.wall(side, x1 + 0.1, -1.2, 0.42, 1.85, 2.4).rect(0.3, 1.0, 1.55, 1.85, C.glass, { outline: true, w: W_FINE, glow: 0.7, grain: 0.4 });
  for (const y of [-0.8, 0.8]) {
    pen.stroke(
      [
        [x1 + 2.5, y, 0.3],
        [x1 + 2.55, y, 0.3],
      ],
      { w: 0.9, kind: L_LIGHT, wobble: 0, alpha: 0.35 },
    );
  }
  // speakers stacked at the back
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < 2; j++) {
      const bx = x0 + 0.1;
      const by = -1.2 + j * 1.2;
      const bz = deck + k * 1.05;
      pen.box(bx, by, bz, 1.0, 1.2, 1.05, DRUM, { w: W_THIN, top: C.charcoal });
      const sides = j === 0 ? (["x-", "y-"] as const) : (["x-", "y+"] as const);
      for (const side of sides) {
        const f = pen.wall(side, bx, by, bz, 1.0, 1.2);
        const w = side === "x-" ? 1.2 : 1.0;
        f.circle(w / 2, 0.52, 0.34, C.greyDark, { outline: true, w: 0.04, seg: 9, grain: 0.3 });
        f.circle(w / 2, 0.52, 0.13, C.grey, { layer: 1, seg: 6, grain: 0 });
        f.circle(0.13, 0.92, 0.06, k === 0 ? C.neonPink : C.neonBlue, { layer: 1, seg: 5, grain: 0, glow: 1, kind: F_NEON });
      }
    }
  }
  // the awning: a striped cloth over the far half of the bed only, so the band can be seen under it,
  // with a valance and a row of bulbs along its front edge
  const ax = x0 + 1.25;
  const al = x1 - 0.15 - ax;
  for (const [px, py, pz] of [
    [ax, -1.25, 4.3],
    [ax + al, -1.25, 4.3],
    [ax, -0.14, 3.84],
    [ax + al, -0.14, 3.84],
  ]) {
    pen.pole([px, py, deck], [px, py, pz], 0.09, C.white);
  }
  const stripes = 9;
  const aw = al + 0.4;
  const cloth = pen.plane([ax - 0.2, -1.42, 4.4], [1, 0, 0], [0, 1.3, -0.56], 0, true);
  for (let i = 0; i < stripes; i++) cloth.rect((i * aw) / stripes, 0, ((i + 1) * aw) / stripes, 1, [RED, GOLD, GREEN][i % 3], { grain: 0.6 });
  cloth.loop(
    [
      [0, 0],
      [aw, 0],
      [aw, 1],
      [0, 1],
    ],
    { w: W_THIN },
  );
  const valance = pen.plane([ax - 0.2, -0.1, 3.52], [1, 0, 0], [0, 0, 1], 0, true);
  for (let i = 0; i < stripes; i++) valance.rect((i * aw) / stripes, 0, ((i + 1) * aw) / stripes, 0.32, [GOLD, GREEN, RED][i % 3], { grain: 0.5 });
  valance.loop(
    [
      [0, 0],
      [aw, 0],
      [aw, 0.32],
      [0, 0.32],
    ],
    { w: 0.05 },
  );
  for (let a = 0.3; a < aw; a += 0.7) bulb(pen, ax - 0.2 + a, -0.08, 3.48, 0.17);
  // the band: four players behind their pans
  band.forEach((lk, i) => {
    const x = -2.65 + i * 1.42;
    // the pan, on its stand, nearer the camera than whoever is playing it
    pen.pole([x - 0.3, 0.55, deck], [x + 0.3, 0.55, deck + 0.72], 0.06, C.metal, { ink: false });
    pen.pole([x + 0.3, 0.55, deck], [x - 0.3, 0.55, deck + 0.72], 0.06, C.metal, { ink: false });
    pen.cyl(x, 0.55, deck + 0.72, 0.42, 0.28, C.metal, { seg: 9, w: W_FINE, top: hex("#dfe4e7") });
    pen.floor(deck + 1.0, 1).circle(x, 0.55, 0.22, null, { ink: C.greyDark, w: 0.04, seg: 8 });
    const k = pen.card(x, -0.35, deck);
    torso(pen, k, x, -0.35, deck, lk, 1);
    sticks(k, lk, (frame + i) % 2, 1.04, 2);
  });
  // and the one with the microphone
  person(pen, 2.25, 0.2, deck, mc, frame === 0 ? "cheer" : "wave");
  pen.card(2.25, 0.2, deck).circle(0.62, 1.94, 0.09, C.black, { layer: 5, seg: 6, grain: 0 });
}

// ---------------------------------------------------------------- everything that moves

interface Marcher {
  /** How far behind the head of the parade, and how far to one side of the middle of the road. */
  off: number;
  lat: number;
  /** Half its length: it only appears once all of it is on the street. */
  half: number;
  /** How high it hops on each beat, and where in the beat it is. */
  hop: number;
  ph: number;
  /** How far along the road its heading is averaged (long things swing round corners slowly). */
  span: number;
  sprite: (beat: number, heading: number) => Sprite;
}

const BEAT = 2.0;
const SPEED = 1.45;

function life(c: LondonCtx, jumpAt: V2[]): void {
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + G + z];
  const born = c.done + 0.15;
  const r = new Rng(808);
  const P: V3 = [0, 0, 0];

  // ---- the parade: up the side street, round the corner, and down Portobello Road
  const route = new Route(rounded([W(MIDDLE, SOUTH - 0.4), W(MIDDLE, MIDDLE), W(EAST - 0.4, MIDDLE)], false, 2.8), false);
  const R = route.length;
  const LOOP = R + 4.5;
  /** Where the float is as the camera arrives: half way down Portobello Road. */
  const sMid = R - (EAST - 0.4 - 26.5);
  /** How far behind the leading flag the middle of the float is. */
  const FLOAT_AT = 9.45;
  const cue = (): number => c.visit() ?? born + 6;
  const cast: Marcher[] = [];
  const add = (off: number, lat: number, sprite: (beat: number, h: number) => Sprite, hop = 0.3, half = 0.7, span = 1.2) =>
    cast.push({ off, lat, half, hop, ph: r.next(), span, sprite });

  // flag bearers lead
  [0, 1, 2].forEach((d, i) => {
    const lk: Look = { ...randomLook(r), top: BRIGHT[(i * 2) % BRIGHT.length] };
    const fr = [makeSprite((p) => bearer(p, lk, d, 0), 0, 210 + i), makeSprite((p) => bearer(p, lk, d, 1), 0, 210 + i)];
    add(i * 1.15, [-1.5, 1.5, 0][i], (beat) => fr[(beat >> 1) & 1], 0.14);
  });
  // then the float
  const band: Look[] = [0, 1, 2, 3].map((i) => ({ skin: SKIN[(i * 2 + 1) % 5], hair: HAIR[(i * 3) % 7], top: [GOLD, RED, TURQ, C.white][i], legs: C.navy, long: i % 2 === 1, hat: null }));
  const mc: Look = { skin: SKIN[3], hair: HAIR[0], top: C.pink, legs: C.white, long: true, hat: null };
  const lorry = [new Turning((p) => float(p, 0, band, mc), 32, 501), new Turning((p) => float(p, 1, band, mc), 32, 501)];
  add(FLOAT_AT, 0, (beat, h) => lorry[beat & 1].at(h), 0, 5.2, 5);
  // the feathers, two by two
  const feathered = FEATHERS.map((cols, i) => {
    const lk: Look = { skin: SKIN[(i + 1) % 5], hair: HAIR[i % 3 === 0 ? 0 : 6], top: cols[0], legs: SKIN[(i + 1) % 5], long: true, hat: null };
    const mk = (pose: Pose, flip: boolean) => makeSprite((p) => dancer(p, lk, cols, pose, flip), 0, 230 + i);
    return [mk("cheer", false), mk("wave", false), mk("cheer", false), mk("wave", true)];
  });
  for (let i = 0; i < 8; i++) {
    const fr = feathered[(i * 3 + (i >> 1)) % feathered.length];
    add(16.2 + Math.floor(i / 2) * 1.75 + (i % 2) * 0.35, i % 2 === 0 ? -1.3 : 1.3, (beat) => fr[beat & 3], 0.32);
  }
  // two on stilts
  [0, 1].forEach((i) => {
    const cols = FEATHERS[i === 0 ? 3 : 1];
    const lk: Look = { skin: SKIN[i === 0 ? 4 : 2], hair: HAIR[0], top: cols[1], legs: cols[0], long: false, hat: null };
    const fr = [makeSprite((p) => stilts(p, lk, cols, 0), 0, 250 + i), makeSprite((p) => stilts(p, lk, cols, 1), 0, 250 + i)];
    add(23.9 + i * 0.5, i === 0 ? -1.1 : 1.1, (beat) => fr[beat & 1], 0.1);
  });
  // the butterflies
  const wings: [RGB, RGB][] = [
    [hex("#ff9a2e"), C.white],
    [C.neonBlue, C.white],
    [hex("#ff5fa2"), GOLD],
  ];
  for (let i = 0; i < 5; i++) {
    const [wing, spot] = wings[i % wings.length];
    const lk: Look = { skin: SKIN[(i * 2) % 5], hair: HAIR[i % 2 === 0 ? 6 : 1], top: C.black, legs: C.black, long: i % 2 === 0, hat: null };
    const fr = [makeSprite((p) => butterfly(p, lk, wing, spot, 1), 0, 260 + i), makeSprite((p) => butterfly(p, lk, wing, spot, 0.62), 0, 260 + i)];
    add(26.6 + [0, 1.5, 1.5, 3.0, 3.0][i], [0, -1.4, 1.4, -1.4, 1.4][i], (beat) => fr[beat & 1], 0.26);
  }
  // the children's troupe, in feathers of their own
  for (let i = 0; i < 4; i++) {
    const cols = FEATHERS[(i + 1) % FEATHERS.length];
    const lk: Look = { skin: SKIN[(i + 2) % 5], hair: HAIR[i % 2 === 0 ? 0 : 2], top: cols[0], legs: cols[1], long: i % 2 === 0, hat: null };
    const fr = [makeSprite((p) => dancer(p, lk, cols, "cheer", false, 0.66), 0, 270 + i), makeSprite((p) => dancer(p, lk, cols, "wave", i % 2 === 0, 0.66), 0, 270 + i)];
    add(32.0 + Math.floor(i / 2) * 1.3, i % 2 === 0 ? -0.9 : 0.9, (beat) => fr[beat & 1], 0.3, 0.5);
  }
  // drummers bring up the rear, with two stewards behind them
  for (let i = 0; i < 4; i++) {
    const lk: Look = { skin: SKIN[(i + 3) % 5], hair: HAIR[i % 4], top: i % 2 === 0 ? GOLD : GREEN, legs: C.white, long: false, hat: null };
    const drum = [RED, ULTRA, GREEN, PURPLE][i];
    const fr = [makeSprite((p) => drummer(p, lk, drum, 0), 0, 280 + i), makeSprite((p) => drummer(p, lk, drum, 1), 0, 280 + i)];
    add(35.2 + Math.floor(i / 2) * 1.35, i % 2 === 0 ? -1.1 : 1.1, (beat) => fr[beat & 1], 0.08);
  }
  [0, 1].forEach((i) => {
    const kind = castWalker({ skin: SKIN[i * 2], hair: HAIR[i + 1], top: C.hivis, legs: C.navy, long: false, hat: null }, 290 + i);
    add(38.0, i === 0 ? -1.7 : 1.7, (beat, h) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][beat & 1], 0);
  });

  c.movers.push((m) => {
    if (m.t < born) return;
    const head = sMid + FLOAT_AT + SPEED * (m.t - cue());
    for (const q of cast) {
      const s = (((head - q.off) % LOOP) + LOOP) % LOOP;
      if (s < q.half || s > R - q.half) continue;
      route.pos(s, P);
      const h = route.heading(s, q.span);
      const beat = m.t * BEAT + q.ph;
      const x = P[0] - Math.sin(h) * q.lat;
      const y = P[1] + Math.cos(h) * q.lat;
      const z = P[2] + q.hop * Math.abs(Math.sin(Math.PI * beat));
      // each one is sketched in as it comes on to the street and rubbed out again as it leaves
      const t0 = Math.max(born, m.t - Math.min(s - q.half, R - q.half - s) / SPEED);
      m.put(q.sprite(Math.floor(beat), h), x, y, z, t0);
    }
  });

  // ---- the ones in the crowd who cannot keep their feet on the ground
  const jr = new Rng(55);
  const jumpers = jumpAt.map(([x, y]) => {
    const lk = reveller(jr);
    const flip = jr.chance(0.5);
    return {
      p: W(x, y),
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "cheer"), 0, 31),
      down: makeSprite((p) => person(p, 0, 0, 0, lk, "wave", flip), 0, 31),
      ph: jr.range(0, 6.28),
      b: born + jr.range(0, 0.8),
    };
  });
  c.movers.push((m) => {
    for (const j of jumpers) {
      const s = Math.sin(m.t * Math.PI * BEAT + j.ph);
      m.put(s > 0 ? j.up : j.down, j.p[0], j.p[1], j.p[2] + (s > 0 ? s * 0.5 : 0), j.b);
    }
  });

  // ---- the police officer, and the dancer who will not take no for an answer
  const pc = [makeSprite((p) => bobby(p, 0, 0, 0, "cheer"), 0, 41), makeSprite((p) => bobby(p, 0, 0, 0, "wave", true), 0, 41)];
  const partnerLook: Look = { skin: SKIN[3], hair: HAIR[0], top: FEATHERS[0][0], legs: SKIN[3], long: true, hat: null };
  const partner = [makeSprite((p) => dancer(p, partnerLook, FEATHERS[0], "cheer"), 0, 42), makeSprite((p) => dancer(p, partnerLook, FEATHERS[0], "wave", true), 0, 42)];
  const pcAt = W(33.75, 29.6);
  const partnerAt = W(35.1, 29.9);
  c.movers.push((m) => {
    const beat = m.t * BEAT;
    const k = Math.floor(beat) & 1;
    const hop = Math.abs(Math.sin(Math.PI * beat));
    m.put(pc[k], pcAt[0], pcAt[1], pcAt[2] + hop * 0.16, born);
    m.put(partner[k], partnerAt[0], partnerAt[1], partnerAt[2] + hop * 0.34, born + 0.2);
  });

  // ---- confetti over the road
  const bits: Sprite[] = [...LITTER, C.white, GREEN, hex("#8a5cf0")].map((col, i) =>
    makeSprite(
      (p) => {
        p.card(0, 0, 0).poly(
          [
            [-0.13, -0.07],
            [0.13, -0.04],
            [0.11, 0.09],
            [-0.12, 0.06],
          ],
          col,
          { grain: 0, outline: true, w: 0.035 },
        );
      },
      0,
      60 + i,
    ),
  );
  const cr = new Rng(77);
  const confetti: { x: number; y: number; top: number; period: number; ph: number; sw: number; f: number; s: Sprite }[] = [];
  for (let i = 0; i < 110; i++) {
    // most of it over Portobello Road, the rest over the corner
    const main = i % 4 !== 0;
    confetti.push({
      x: main ? cr.range(16, 37.5) : cr.range(12.5, 17.5),
      y: main ? cr.range(12.4, 17.6) : cr.range(16, 30),
      top: cr.range(5.5, 9),
      period: cr.range(3.2, 5.6),
      ph: cr.next(),
      sw: cr.range(0.25, 0.7),
      f: cr.range(1.2, 2.6),
      s: bits[i % bits.length],
    });
  }
  const over = W(24, 15, 4);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(over[0], over[1], over[2], 26)) return;
    for (const b of confetti) {
      const u = (m.t / b.period + b.ph) % 1;
      const dx = Math.sin(m.t * b.f + b.ph * 30) * b.sw;
      m.put(b.s, c.ox + b.x + dx * 0.5, c.oy + b.y - dx * 0.5, c.oz + G + b.top * (1 - u) + 0.15, born);
    }
  });

  // ---- smoke off the grill: each puff rises, spreads and thins away
  const puffs = [0.5, 0.42, 0.56].map((w, i) =>
    makeSprite(
      (p) => {
        const k = p.card(0, 0, 0);
        k.ellipse(0, 0, w, w * 0.74, hex("#ebe8e1"), { outline: true, w: 0.04, ink: hex("#b5b0a8"), grain: 0.5, seg: 9 });
        k.ellipse(w * 0.45, w * 0.3, w * 0.5, w * 0.42, hex("#f3f1ec"), { layer: 1, grain: 0.5, seg: 8 });
      },
      0,
      80 + i,
    ),
  );
  const fire = W(27.55, 29.4, 1.5);
  const PUFF = 4.2;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(fire[0], fire[1], fire[2], 10)) return;
    for (let i = 0; i < 7; i++) {
      const u = (m.t / PUFF + i / 7) % 1;
      const drift = Math.sin(u * 5 + i * 1.7) * 0.4 + u * 0.9;
      // drawn in as it leaves the coals, rubbed out as it climbs
      const p = Math.min(u * PUFF, (1 - u) * PUFF * 0.55);
      m.put(puffs[i % 3], fire[0] + drift * 0.6, fire[1] - drift * 0.6, fire[2] + u * 4.6, Math.max(born, m.t - p), 0.55 + u * 1.3);
    }
  });

  // ---- balloons that got away
  const loose = [C.red, C.yellow, C.neonBlue].map((col, i) =>
    makeSprite(
      (p) => {
        const k = p.card(0, 0, 0);
        k.line(
          [
            [0, -0.95],
            [0.06, -0.5],
            [0, -0.28],
          ],
          { w: 0.03, color: C.inkSoft, kind: L_MARK, wobble: 0 },
        );
        k.ellipse(0, 0, 0.25, 0.3, col, { outline: true, w: 0.04, seg: 9, grain: 0.2, layer: 1 });
      },
      0,
      90 + i,
    ),
  );
  const seller = W(24.6, 35.6, 3.2);
  const RISE = 9;
  c.movers.push((m) => {
    if (m.t < born) return;
    loose.forEach((s, i) => {
      const u = (m.t / RISE + i / 3) % 1;
      const drift = Math.sin(u * 4 + i * 2.1) * 0.7 + u * (1.5 + i);
      const p = Math.min(u * RISE, (1 - u) * RISE * 0.4);
      m.put(s, seller[0] + drift * 0.6, seller[1] - drift * 0.6, seller[2] + u * 9, Math.max(born, m.t - p));
    });
  });

  // ---- a child running rings round the blossom tree with a balloon, and the dog that wants it
  const kidLook: Look = { skin: SKIN[2], hair: HAIR[0], top: C.yellow, legs: C.blue, long: true, hat: null };
  const kid = [false, true].map((flip) =>
    (["walkA", "walkB"] as const).map((pose) =>
      makeSprite(
        (p) => {
          person(p, 0, 0, 0, kidLook, pose, flip, 0.66);
          const k = p.card(0, 0, 0, flip);
          k.line(
            [
              [-0.3, 0.62],
              [-0.5, 1.6],
              [-0.75, 2.3],
            ],
            { w: 0.03, color: C.inkSoft, kind: L_MARK, wobble: 0, layer: 4 },
          );
          k.ellipse(-0.78, 2.58, 0.25, 0.3, RED, { outline: true, w: 0.04, seg: 9, grain: 0.2, layer: 5 });
        },
        0,
        95,
      ),
    ),
  );
  const mutt = [false, true].map((flip) => [0, 1].map((step) => makeSprite((p) => dogOn(p.card(0, 0, 0, flip), hex("#e0994d"), { s: 0.85, step, corgi: true }), 0, 96)));
  const ring: V3[] = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    ring.push(W(33.6 + Math.cos(t) * 2.1, 33.4 + Math.sin(t) * 1.9));
  }
  const lap = new Route(ring, true);
  c.movers.push((m) => {
    if (m.t < born) return;
    const s = m.t * 2.5;
    [0, 1].forEach((who) => {
      const at = s - who * 1.5;
      lap.pos(at, P);
      const h = lap.heading(at, 0.8);
      const right = Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1;
      const step = Math.floor(m.t * (who === 0 ? 4 : 6)) & 1;
      m.put(who === 0 ? kid[right][step] : mutt[right][step], P[0], P[1], P[2], born + 0.3 * who);
    });
  });
}

// ---------------------------------------------------------------- the islet

export const nottinghill: LondonBuilder = (c) => {
  const { pen } = c;
  c.early(() => {
    pen.obj(() => pen.extrude(shore(), 0, G, C.clay, { top: C.paving, crease: 30 }));
    pen.push(0, 0, G);
    ground(pen);
    pen.pop();
  });
  pen.push(0, 0, G);
  houses(c);
  dressing(c);
  const jumpers = [...pavements(c), ...square(c)];
  pen.pop();
  life(c, jumpers);
  // the whole islet in view, the corner where the two streets meet at the top
  c.focus(23.4, 23.4, 1.25);
};
