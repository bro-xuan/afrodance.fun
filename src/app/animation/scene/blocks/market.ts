// The markets: a street market in the Albert Cuyp manner (cheese, herring,
// stroopwafels, chips, a street organ, a giant clog to sit in) and, moored
// along the water, the glasshouse barges of the flower market.
//
// Shop-fronted canal houses stand at the back; two rows of stalls face each
// other across the market street; a small square holds the organ and the
// snack stands; the flower quay runs along the outer water in front.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { sloep } from "../boats";
import { WATER } from "../city";
import { Look, W_FINE, W_THIN, bench, bike, bikeRow, cafeTable, flag, houseRow, lamp, person, railing, randomLook, speckle, tree } from "../kit";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const CLOG = hex("#f4c531");
const WAFFLE = hex("#e0a94e");
const SILVER = hex("#b9c6d2");
const BUNTING: RGB[] = [C.red, C.yellow, C.blue, C.green, C.orange, C.white];

// ---------------------------------------------------------------- small things

/** Something held: drawn on a card in front of the figure standing at the same spot. */
function held(pen: Pen, x: number, y: number, z: number, draw: (c: Plane) => void, flip = false): void {
  const c = pen.card(x, y, z, flip);
  c.layer = 6;
  pen.begin();
  draw(c);
  pen.end();
}

/** A shopper, often with a bag or a bunch of tulips. */
function shopper(pen: Pen, rng: Rng, x: number, y: number): void {
  const flip = rng.chance(0.5);
  const s = rng.chance(0.14) ? 0.72 : 1;
  person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "walkA", "walkB", "wave"]), flip, s);
  const r = rng.next();
  if (s < 1 || r > 0.62) return;
  const side = rng.chance(0.5) ? 1 : -1;
  held(pen, x, y, 0, (cd) => {
    if (r < 0.34) {
      cd.rect(side * 0.3, 0.42, side * 0.66, 0.86, rng.pick([C.cream, C.white, C.sky, C.yellow, C.wood]), { outline: true, w: 0.04 });
      cd.seg(side * 0.4, 0.86, side * 0.48, 1.0, { w: 0.04, wobble: 0 });
    } else if (r < 0.5) {
      // tulips wrapped in paper
      cd.poly(
        [
          [side * 0.34, 0.7],
          [side * 0.52, 0.7],
          [side * 0.72, 1.3],
          [side * 0.2, 1.3],
        ],
        C.cream,
        { outline: true, w: 0.04 },
      );
      const col = rng.pick(TULIP);
      for (const [da, db] of [
        [0.28, 1.36],
        [0.46, 1.42],
        [0.64, 1.36],
      ]) {
        cd.circle(side * da, db, 0.11, col, { seg: 6, grain: 0, layer: 1, outline: true, w: 0.03 });
      }
    } else {
      cd.rect(side * 0.34, 0.5, side * 0.62, 0.8, rng.pick([C.red, C.blue, C.green]), { outline: true, w: 0.04 });
    }
  });
}

/** A string of little flags between two points, with bulbs for the evening. */
function bunting(pen: Pen, a: V3, b: V3, sag = 0.5): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const pl = pen.plane(a, [dx / len, dy / len, 0], [0, 0, 1], 0, true);
  const z = (s: number) => (b[2] - a[2]) * (s / len) - sag * 4 * (s / len) * (1 - s / len);
  const n = Math.max(3, Math.round(len / 0.62));
  pen.begin();
  const line: V2[] = [];
  for (let i = 0; i <= n; i++) line.push([(len * i) / n, z((len * i) / n)]);
  pl.line(line, { w: 0.045, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 0; i < n; i++) {
    const s = (len * (i + 0.5)) / n;
    const zz = z(s);
    pl.poly(
      [
        [s - 0.19, zz + 0.02],
        [s + 0.19, zz + 0.02],
        [s, zz - 0.42],
      ],
      BUNTING[i % BUNTING.length],
      { sway: 0.22, grain: 0.5, outline: true, w: 0.035 },
    );
    const sb = (len * i) / n;
    pl.seg(sb - 0.02, z(sb) - 0.1, sb + 0.02, z(sb) - 0.1, { kind: L_LIGHT, w: 0.2, wobble: 0 });
  }
  pen.end();
}

// ---------------------------------------------------------------- stalls

type Goods = (pen: Pen, rng: Rng, w: number, d: number) => void;

const cheese: Goods = (pen, rng, w) => {
  for (let x = 0.55; x < w - 0.4; x += 0.74) {
    const y = 1.05 + (Math.round(x * 10) % 2) * 0.62;
    const n = rng.int(2, 5);
    for (let j = 0; j < n; j++) pen.cyl(x, y, 0.85 + j * 0.17, 0.31, 0.17, j === n - 1 && rng.chance(0.3) ? C.orange : C.yellow, { seg: 8, w: W_FINE, grain: 0.5 });
    if (rng.chance(0.6)) pen.cyl(x + 0.1, y > 1.3 ? 0.95 : 1.85, 0.85, 0.17, 0.26, C.red, { seg: 7, w: W_FINE, grain: 0.4 });
  }
};

const crates = (tops: RGB[]): Goods => (pen, rng, w) => {
  const n = Math.max(3, Math.round((w - 0.4) / 0.78));
  const cw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      const x = 0.2 + i * cw;
      const y = 0.68 + j * 0.76;
      const col = rng.pick(tops);
      const h = 0.2 + j * 0.16;
      pen.box(x, y, 0.85, cw - 0.08, 0.68, h, C.wood, { top: col, w: W_FINE, grain: 0.6 });
      const g = pen.floor(0.85 + h, 1);
      for (let k = 0; k < 5; k++) g.circle(x + rng.range(0.12, cw - 0.2), y + rng.range(0.12, 0.56), 0.09, scaleRGB(col, rng.range(0.78, 1.12)), { seg: 6, grain: 0 });
    }
  }
};

const fish: Goods = (pen, rng, w) => {
  pen.box(0.2, 0.68, 0.85, w - 0.4, 1.45, 0.14, C.glassPale, { w: W_FINE, grain: 0.4 });
  const g = pen.floor(0.99, 1);
  for (let x = 0.5; x < w - 0.5; x += 0.5) {
    for (const y of [0.95, 1.4, 1.85]) {
      if (rng.chance(0.25)) continue;
      const col = rng.chance(0.2) ? hex("#f2a08a") : SILVER;
      g.ellipse(x + rng.range(-0.05, 0.05), y, 0.11, 0.3, col, { outline: true, w: 0.035, seg: 8, grain: 0.3 });
    }
  }
  pen.cyl(w - 0.55, 1.9, 0.99, 0.2, 0.12, C.yellow, { seg: 7, w: W_FINE });
};

const cloth: Goods = (pen, rng, w, d) => {
  const cols = [C.red, C.blue, C.yellow, C.green, C.purple, C.pink, C.teal, C.orange, C.white];
  let k = 0;
  for (let x = 0.4; x < w - 0.3; x += 0.36) {
    pen.pole([x, 0.72, 0.99], [x, d - 0.2, 0.99], 0.26, cols[k++ % cols.length]);
  }
  for (const x of [0.5, w - 0.5]) pen.pole([x, 0.75, 0.85], [x, 0.75, 2.0], 0.22, rng.pick(cols));
};

const flowers: Goods = (pen, rng, w) => {
  for (let x = 0.45; x < w - 0.3; x += 0.55) {
    for (const y of [0.95, 1.6]) {
      const col = rng.pick(TULIP);
      pen.cyl(x, y, 0.85, 0.2, 0.28, C.metal, { seg: 6, w: W_FINE, grain: 0.4 });
      const cd = pen.card(x, y, 1.13);
      cd.poly(
        [
          [-0.16, 0],
          [0.16, 0],
          [0.2, 0.34],
          [-0.2, 0.34],
        ],
        C.leafDark,
        { grain: 0.4 },
      );
      for (const [da, db] of [
        [-0.17, 0.4],
        [0.02, 0.5],
        [0.19, 0.4],
      ]) {
        cd.circle(da, db, 0.12, col, { seg: 6, grain: 0, layer: 1, outline: true, w: 0.03 });
      }
    }
  }
};

const bread: Goods = (pen, rng, w) => {
  const cols = [hex("#c98a4a"), hex("#b0723a"), hex("#d9a868"), hex("#9a6034")];
  for (let x = 0.3; x < w - 0.8; x += 0.62) {
    for (const y of [0.75, 1.3]) pen.box(x, y, 0.85, 0.52, 0.34, 0.2 + rng.next() * 0.08, rng.pick(cols), { w: W_FINE, grain: 0.5 });
  }
  pen.cyl(w - 0.6, 1.75, 0.85, 0.3, 0.35, C.wood, { seg: 8, w: W_FINE });
  for (let i = 0; i < 4; i++) pen.pole([w - 0.72 + i * 0.08, 1.75, 1.1], [w - 0.85 + i * 0.16, 1.7, 1.85], 0.11, cols[2], { ink: C.woodDark });
};

const bowls = (tops: RGB[]): Goods => (pen, rng, w) => {
  for (let x = 0.5; x < w - 0.3; x += 0.62) {
    for (const y of [0.95, 1.6]) pen.cyl(x, y, 0.85, 0.26, 0.11, C.white, { seg: 8, top: rng.pick(tops), w: W_FINE, grain: 0.5 });
  }
};

const books: Goods = (pen, rng, w) => {
  const cols = [C.red, C.blue, C.green, C.ochre, C.purple, C.cream, C.teal];
  for (let x = 0.3; x < w - 0.5; x += 0.56) {
    for (const y of [0.75, 1.45]) {
      const n = rng.int(1, 4);
      for (let j = 0; j < n; j++) pen.box(x + rng.range(-0.03, 0.03), y, 0.85 + j * 0.09, 0.46, 0.6, 0.09, rng.pick(cols), { w: W_FINE, grain: 0.5 });
    }
  }
};

const clogs: Goods = (pen, rng, w) => {
  const cols = [CLOG, CLOG, C.red, C.blue, C.wood, C.white];
  for (let x = 0.35; x < w - 0.4; x += 0.52) {
    for (const y of [0.8, 1.35, 1.9]) {
      const col = rng.pick(cols);
      pen.box(x, y, 0.85, 0.42, 0.2, 0.15, col, { w: W_FINE, grain: 0.4 });
      pen.box(x + 0.3, y + 0.03, 1.0, 0.15, 0.14, 0.09, col, { w: W_FINE, grain: 0.4 });
    }
  }
};

interface StandOpts {
  w?: number;
  d?: number;
  a: RGB;
  b?: RGB;
  sign?: string;
  goods: Goods;
  keeper?: Look | false;
}

/** A market stall, front on local +y: table, goods, striped awning, a sign and a keeper. */
function stand(pen: Pen, rng: Rng, o: StandOpts): void {
  const w = o.w ?? 3.4;
  const d = o.d ?? 2.4;
  const a = o.a;
  const b = o.b ?? C.white;
  pen.begin();
  pen.box(0.1, 0.58, 0, w - 0.2, d - 0.68, 0.85, C.wood, { w: W_THIN });
  pen.wall("y+", 0.1, 0.58, 0, w - 0.2, d - 0.68).rect(0, 0.06, w - 0.2, 0.8, a, { grain: 0.6 });
  o.goods(pen, rng, w, d);
  for (const [px, py] of [
    [0.05, 0.05],
    [w - 0.05, 0.05],
    [0.05, d],
    [w - 0.05, d],
  ]) {
    pen.pole([px, py, 0], [px, py, py > 1 ? 2.25 : 2.75], 0.1, C.white);
  }
  const cloth = pen.plane([0, -0.1, 2.8], [1, 0, 0], [0, d + 0.5, -0.55], 0, true);
  const n = Math.max(4, Math.round(w / 0.55));
  for (let i = 0; i < n; i++) cloth.rect((i * w) / n, 0, ((i + 1) * w) / n, 1, i % 2 === 0 ? a : b, { grain: 0.6 });
  cloth.loop(
    [
      [0, 0],
      [w, 0],
      [w, 1],
      [0, 1],
    ],
    { w: W_THIN },
  );
  const val = pen.plane([0, d + 0.4, 1.9], [1, 0, 0], [0, 0, 1], 0, true);
  for (let i = 0; i < n; i++) val.rect((i * w) / n, 0, ((i + 1) * w) / n, 0.36, i % 2 === 0 ? a : b, { grain: 0.6 });
  val.loop(
    [
      [0, 0],
      [w, 0],
      [w, 0.36],
      [0, 0.36],
    ],
    { w: W_THIN },
  );
  for (let x = 0.3; x < w; x += 0.56) val.seg(x - 0.02, -0.1, x + 0.02, -0.1, { kind: L_LIGHT, w: 0.2, wobble: 0 });
  if (o.sign) {
    const sg = pen.plane([0, d + 0.42, 2.3], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(w * 0.1, 0, w * 0.9, 0.62, C.white, { outline: true, w: W_FINE });
    sg.text(o.sign, w / 2, 0.15, Math.min(0.34, (w * 0.72) / (o.sign.length * 0.92)), { align: "c", layer: 1 });
  }
  if (o.keeper !== false) person(pen, w * rng.range(0.3, 0.7), 0.28, 0, o.keeper ?? randomLook(rng), rng.pick(["stand", "wave", "stand"]), rng.chance(0.5));
  pen.end();
}

// ---------------------------------------------------------------- sprites

function pair(draw: (pen: Pen, flip: boolean) => void, seed: number): [Sprite, Sprite] {
  return [makeSprite((pen) => draw(pen, false), 0, seed), makeSprite((pen) => draw(pen, true), 0, seed)];
}

/** A gull: standing side on (wings 0), or flying towards you with its wings up (1) or down (-1). */
function gullShape(pen: Pen, flip: boolean, wings: -1 | 0 | 1): void {
  const c = pen.card(0, 0, 0, flip);
  if (wings === 0) {
    c.poly(
      [
        [-0.3, 0.16],
        [-0.64, 0.24],
        [-0.6, 0.08],
      ],
      C.slateLight,
      { outline: true, w: 0.04 },
    );
    c.ellipse(0, 0.14, 0.38, 0.18, C.white, { outline: true, w: 0.045, seg: 10, layer: 1, grain: 0.2 });
    c.circle(0.36, 0.28, 0.15, C.white, { outline: true, w: 0.045, seg: 8, layer: 2, grain: 0.2 });
    c.poly(
      [
        [0.48, 0.33],
        [0.74, 0.26],
        [0.49, 0.22],
      ],
      C.yellow,
      { outline: true, w: 0.035, layer: 3 },
    );
    c.ellipse(-0.06, 0.16, 0.28, 0.1, C.slateLight, { outline: true, w: 0.04, seg: 8, layer: 2 });
    c.bar(-0.05, 0.0, -0.05, -0.16, 0.05, C.orange, { ink: false });
    c.bar(0.1, 0.0, 0.1, -0.16, 0.05, C.orange, { ink: false });
    return;
  }
  const lift = wings === 1 ? 0.5 : -0.22;
  for (const m of [-1, 1]) {
    c.poly(
      [
        [m * 0.1, 0.3],
        [m * 0.55, 0.34 + lift * 0.75],
        [m * 1.08, 0.24 + lift],
        [m * 0.56, 0.18 + lift * 0.55],
        [m * 0.1, 0.12],
      ],
      C.white,
      { outline: true, w: 0.045, grain: 0.2 },
    );
    c.poly(
      [
        [m * 1.08, 0.24 + lift],
        [m * 0.8, 0.31 + lift * 0.88],
        [m * 0.8, 0.2 + lift * 0.8],
      ],
      C.charcoal,
      { layer: 1 },
    );
  }
  c.ellipse(0, 0.2, 0.2, 0.17, C.white, { outline: true, w: 0.045, seg: 9, layer: 2, grain: 0.2 });
  c.circle(0.1, 0.36, 0.12, C.white, { outline: true, w: 0.04, seg: 8, layer: 3, grain: 0.2 });
  c.poly(
    [
      [0.2, 0.4],
      [0.4, 0.34],
      [0.2, 0.31],
    ],
    C.yellow,
    { outline: true, w: 0.03, layer: 4 },
  );
}

function noteShape(pen: Pen, two: boolean): void {
  const c = pen.card(0, 0, 0);
  c.ellipse(0, 0.12, 0.17, 0.12, C.ink, { seg: 8, grain: 0 });
  c.seg(0.15, 0.14, 0.15, 0.8, { w: 0.06, wobble: 0 });
  if (two) {
    c.ellipse(0.5, 0.2, 0.17, 0.12, C.ink, { seg: 8, grain: 0 });
    c.seg(0.65, 0.22, 0.65, 0.88, { w: 0.06, wobble: 0 });
    c.seg(0.15, 0.8, 0.65, 0.88, { w: 0.12, wobble: 0 });
  } else {
    c.line(
      [
        [0.15, 0.8],
        [0.4, 0.66],
        [0.42, 0.5],
      ],
      { w: 0.07, wobble: 0 },
    );
  }
}

function puffShape(pen: Pen): void {
  const c = pen.card(0, 0, 0);
  const o = { outline: true, ink: C.grey, w: 0.045, seg: 9, grain: 0.2 } as const;
  c.circle(-0.2, 0.2, 0.2, C.white, o);
  c.circle(0.16, 0.24, 0.24, C.white, { ...o, layer: 1 });
  c.circle(-0.02, 0.42, 0.2, C.white, { ...o, layer: 2 });
}

// ---------------------------------------------------------------- set pieces

/** The street organ: front on local +y, 3.4 wide. */
function organ(pen: Pen): void {
  const W = 3.4;
  const D = 1.5;
  pen.begin();
  pen.box(0, 0, 0.45, W, D, 2.2, C.cream, { top: C.red });
  pen.box(0.3, 0.2, 0.2, W - 0.6, D - 0.4, 0.25, C.charcoal, { edges: false });
  const f = pen.wall("y+", 0, 0, 0.45, W, D);
  f.rect(0, 0, W, 0.5, C.red, { grain: 0.6 });
  f.seg(0, 0.5, W, 0.5, { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0 });
  f.text("DRAAIORGEL", W / 2, 0.14, 0.2, { align: "c", color: C.gold, kind: L_MARK, w: 0.06, layer: 1 });
  const niche = (a0: number, a1: number, rgb: RGB) => {
    const r = (a1 - a0) / 2;
    const pts: V2[] = [
      [a0, 0.62],
      [a1, 0.62],
      [a1, 1.85 - r],
    ];
    for (let k = 1; k < 7; k++) {
      const t = (k / 7) * Math.PI;
      pts.push([a0 + r + Math.cos(t) * r, 1.85 - r + Math.sin(t) * r]);
    }
    pts.push([a0, 1.85 - r]);
    f.poly(pts, rgb, { outline: true, ink: C.gold, w: 0.08, grain: 0.5 });
  };
  niche(0.22, 1.0, C.sky);
  niche(1.14, 2.26, C.charcoal);
  niche(2.4, 3.18, C.sky);
  // gilded pipes in the middle, a little painted figure either side
  for (let i = 0; i < 7; i++) {
    const a = 1.26 + i * 0.148;
    const h = 0.55 + 0.42 * Math.sin((Math.PI * (i + 0.5)) / 7);
    f.seg(a, 0.7, a, 0.7 + h, { w: 0.11, color: C.gold, kind: L_MARK, wobble: 0, layer: 1 });
  }
  for (const a of [0.61, 2.79]) {
    f.poly(
      [
        [a - 0.18, 0.66],
        [a + 0.18, 0.66],
        [a + 0.1, 1.2],
        [a - 0.1, 1.2],
      ],
      a < 1 ? C.pink : C.yellow,
      { outline: true, w: 0.035, layer: 1 },
    );
    f.circle(a, 1.33, 0.12, C.cream, { outline: true, w: 0.035, seg: 7, layer: 1 });
  }
  // the crest above the roof line
  const crest: V2[] = [[0, 2.2]];
  for (let k = 0; k < 3; k++) {
    const c0 = (W * (k + 0.5)) / 3;
    const hh = k === 1 ? 0.95 : 0.6;
    for (let q = 0; q <= 6; q++) {
      const t = Math.PI - (q / 6) * Math.PI;
      crest.push([c0 + Math.cos(t) * (W / 6), 2.2 + Math.sin(t) * hh]);
    }
  }
  crest.push([W, 2.2]);
  f.poly(crest, C.cream, { outline: true, ink: C.redDark, w: 0.09, grain: 0.5 });
  f.circle(W / 2, 2.62, 0.2, C.gold, { outline: true, w: 0.04, seg: 8, layer: 1 });
  f.circle(W / 6, 2.48, 0.13, C.red, { seg: 7, layer: 1 });
  f.circle((W * 5) / 6, 2.48, 0.13, C.blue, { seg: 7, layer: 1 });
  // wheels
  const wh = pen.wall("y+", 0, 0, 0, W, D + 0.04);
  for (const a of [0.62, W - 0.62]) {
    wh.circle(a, 0.36, 0.36, C.charcoal, { outline: true, w: 0.06, seg: 12 });
    wh.circle(a, 0.36, 0.13, C.gold, { seg: 7, layer: 1 });
  }
  // the hand wheel on the end (its spokes turn: see the mover)
  pen.wall("x+", 0, 0, 0.45, W, D).circle(D / 2, 1.05, 0.48, null, { ink: C.black, w: 0.08, seg: 12 });
  pen.end();
}

/** A clog the size of a rowing boat, toe towards local +x, for sitting in. */
function giantClog(pen: Pen): void {
  const prof: V2[] = [
    [0.25, 0],
    [2.6, 0],
    [3.1, 0.22],
    [3.5, 0.7],
    [3.62, 1.25],
    [3.4, 1.08],
    [2.95, 1.02],
    [2.4, 1.24],
    [1.8, 1.32],
    [1.55, 1.12],
    [0.3, 1.12],
    [0, 0.95],
    [0, 0.25],
  ];
  pen.begin();
  pen.wall("y+", 0, 0, 0, 3.7, 0).extrude(prof, 1.5, CLOG, { crease: 30, w: 0.12 });
  pen.floor(1.12, 1).ellipse(0.93, 0.75, 0.56, 0.52, hex("#8a5a2c"), { outline: true, w: W_THIN, seg: 12 });
  const f = pen.wall("y+", 0, 0, 0, 3.7, 1.5);
  f.poly(
    [
      [0.05, 0.86],
      [0.32, 1.02],
      [1.55, 1.02],
      [1.78, 1.2],
      [1.78, 1.02],
      [1.55, 0.84],
      [0.3, 0.84],
      [0.05, 0.7],
    ],
    C.red,
    { grain: 0.5 },
  );
  // a painted tulip
  f.seg(2.45, 0.2, 2.45, 0.66, { w: 0.07, color: C.green, kind: L_MARK, wobble: 0 });
  f.poly(
    [
      [2.28, 0.62],
      [2.62, 0.62],
      [2.66, 0.94],
      [2.45, 0.8],
      [2.24, 0.94],
    ],
    C.red,
    { outline: true, w: 0.04 },
  );
  for (const a of [0.5, 1.0, 1.5]) f.circle(a, 0.42, 0.08, C.white, { seg: 6 });
  pen.end();
}

/** One flower barge: a hull with a glasshouse on it, seen from the water side. */
function flowerBarge(pen: Pen, rng: Rng, sign: string): void {
  const L = 8.6;
  const B = 3.4;
  pen.begin();
  pen.box(0, 0, -0.15, L, B, 0.65, C.charcoal, { top: C.woodDark, w: 0.11 });
  const x0 = 0.3;
  const y0 = 0.2;
  const gw = L - 0.6;
  const gd = B - 0.4;
  const z0 = 0.5;
  const h = 2.5;
  pen.box(x0, y0, z0, gw, gd, h, C.glassPale, { top: null, glow: 0.9, grain: 0.35, w: 0.1 });
  pen.gable(x0, y0, z0 + h, gw, gd, 0.85, "x", C.glassLight, { gable: C.glassPale, glow: 0.55, grain: 0.35, w: 0.1 });
  for (let x = x0 + 1; x < x0 + gw - 0.2; x += 1) {
    pen.stroke(
      [
        [x, y0 + gd, z0 + h],
        [x, y0 + gd / 2, z0 + h + 0.85],
      ],
      { w: 0.06, color: C.white, kind: L_MARK, wobble: 0 },
    );
  }
  for (const [side, w] of [
    ["y+", gw],
    ["x+", gd],
  ] as const) {
    const f = pen.wall(side, x0, y0, z0, gw, gd);
    for (let a = 1; a < w - 0.2; a += 1) f.seg(a, 0.05, a, h, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    // shelves of flowers behind the glass, a different colour every pane
    for (let r = 0; r < 3; r++) {
      const b = 0.42 + r * 0.56;
      f.rect(0.1, b - 0.24, w - 0.1, b - 0.02, C.leafDark, { grain: 0.5 });
      for (let a = 0.26; a < w - 0.15; a += 0.31) {
        const col = TULIP[(Math.floor(a) + r * 2 + (side === "x+" ? 3 : 0)) % TULIP.length];
        f.circle(a + rng.range(-0.04, 0.04), b + rng.range(-0.02, 0.06), 0.13, col, { seg: 6, grain: 0, layer: 1 });
      }
    }
    if (side === "y+") {
      f.rect(w / 2 - 1.7, h - 0.62, w / 2 + 1.7, h - 0.06, C.white, { outline: true, w: W_FINE, layer: 2 });
      f.text(sign, w / 2, h - 0.5, 0.32, { align: "c", color: C.green, kind: L_MARK, w: 0.07, layer: 3 });
    } else {
      f.circle(w / 2, h - 0.42, 0.3, C.red, { outline: true, w: 0.045, seg: 10, layer: 2 });
      f.circle(w / 2, h - 0.42, 0.14, C.white, { seg: 8, layer: 3 });
    }
  }
  pen.end();
}

// ---------------------------------------------------------------- the block

export const market: BlockBuilder = (c: BlockCtx) => {
  const { pen, rng } = c;
  const w3 = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  c.focus(24.5, 26.5);

  // ---- paving
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(6.2, 14.4, 47.38, 30.2, C.street);
    g.rect(6.2, 30.2, 41.9, 42.2, C.plaza);
    g.seg(6.2, 30.2, 47.38, 30.2, { w: 0.07, color: C.streetDark, kind: L_MARK });
    g.seg(6.2, 42.2, 41.9, 42.2, { w: 0.07, color: C.streetDark, kind: L_MARK });
    g.seg(41.9, 30.2, 41.9, 47.38, { w: 0.07, color: C.streetDark, kind: L_MARK });
    const t = pen.floor(0, 2);
    speckle(t, 6.6, 14.8, 47, 30, C.streetDark, 0.42);
    speckle(t, 6.6, 30.6, 41.6, 42, scaleRGB(C.plaza, 0.84), 0.3);
    // a ring of setts where the organ plays
    t.circle(11.1, 36.3, 2.7, null, { ink: scaleRGB(C.plaza, 0.82), w: 0.07, seg: 22 });
    t.circle(11.1, 36.3, 1.7, null, { ink: scaleRGB(C.plaza, 0.82), w: 0.07, seg: 18 });
  });

  // ---- shop houses along the back
  pen.push(7.4, 7.2, 0);
  houseRow(pen, rng, 7, { d: 7.2, shopEvery: 1, widths: [4.6, 5, 5.4, 4.2, 5, 4.6, 5] });
  pen.pop();
  tree(pen, rng, 44.3, 8.6);
  tree(pen, rng, 45.2, 19.6, { kind: "blossom" });
  cafeTable(pen, rng, 43.9, 11.6, C.orange, 3);
  cafeTable(pen, rng, 44.3, 14.8, C.white, 2);
  cafeTable(pen, rng, 43.8, 17.4, C.orange, 4);
  bikeRow(pen, rng, 45.9, 21.4, 6, 0);

  // ---- the far row of stalls, fronts to the camera
  const far: StandOpts[] = [
    { a: C.yellow, sign: "KAAS", goods: cheese },
    { a: C.green, sign: "FRUIT", goods: crates([C.red, C.orange, C.yellow, C.grass, C.purple]) },
    { a: C.blue, sign: "VIS", goods: fish },
    { a: C.purple, sign: "STOFFEN", goods: cloth },
    { a: C.pink, sign: "BLOEMEN", goods: flowers },
    { a: C.orange, sign: "BROOD", goods: bread },
    { a: C.red, sign: "DROP", goods: bowls([C.black, C.red, C.yellow, C.pink, C.black]) },
    { a: C.teal, sign: "GROENTE", goods: crates([C.grass, C.leafDark, C.orange, C.tile, C.cream]) },
    { a: C.blueDark, sign: "BOEKEN", goods: books },
  ];
  far.forEach((o, i) => {
    pen.push(7.2 + i * 3.78, 16.5, 0);
    stand(pen, rng, o);
    pen.pop();
  });

  // ---- the near row, backs to the camera
  const near: StandOpts[] = [
    { a: C.red, goods: crates([C.red, C.yellow, C.grass]) },
    { a: C.blue, goods: bowls([C.ochre, C.woodDark, C.cream, C.green]) },
    { a: C.yellow, goods: cloth },
    { a: C.green, goods: bread },
    { a: C.orange, goods: cheese },
    { a: C.purple, goods: books },
    { a: C.red, goods: fish },
    { a: C.teal, goods: flowers },
  ];
  const nearX = [7.8, 11.7, 15.6, 19.5, 26.6, 30.5, 34.4, 38.3];
  near.forEach((o, i) => {
    pen.push(nearX[i] + 3.4, 29.1, 0, 180);
    stand(pen, rng, o);
    pen.pop();
  });

  // ---- bunting over the street, on tall poles
  {
    const far0: V3[] = [];
    const near0: V3[] = [];
    for (let i = 0; i < 5; i++) {
      far0.push([8.9 + i * 7.56, 19.25, 4.3]);
      near0.push([13.4 + i * 6.6, 26.45, 4.3]);
    }
    for (const p of [...far0, ...near0]) pen.pole([p[0], p[1], 0], p, 0.1, C.white);
    for (let i = 0; i < 5; i++) {
      bunting(pen, far0[i], near0[i]);
      if (i < 4) bunting(pen, near0[i], far0[i + 1]);
    }
  }

  // ---- shoppers in the street
  for (let i = 0; i < 46; i++) {
    const x = rng.range(7.6, 41);
    const y = rng.chance(0.55) ? rng.range(19.5, 20.6) : rng.range(21.2, 26.3);
    shopper(pen, rng, x, y);
  }
  for (let i = 0; i < 8; i++) shopper(pen, rng, rng.range(8, 41), rng.range(15, 16.1));

  // ---- the street organ, its grinder, a collector with a tin, dancing children
  {
    pen.push(9.4, 33.0, 0);
    organ(pen);
    pen.pop();
    const grinder: Look = { skin: hex("#eebb96"), hair: hex("#d9d5cf"), top: hex("#4a454b"), legs: hex("#3c3a3d"), long: false, hat: hex("#4a454b") };
    person(pen, 13.75, 33.9, 0, grinder, "stand", true);
    person(pen, 14.2, 35.6, 0, { ...grinder, top: C.redDark, hat: null, hair: hex("#7c5230") }, "wave", false);
    held(pen, 14.2, 35.6, 0, (cd) => cd.rect(0.5, 1.8, 0.78, 2.08, C.gold, { outline: true, w: 0.04 }));
    for (const [dx, dy, pose] of [
      [10.2, 36.0, "cheer"],
      [11.4, 36.8, "wave"],
      [12.3, 35.9, "cheer"],
    ] as const) {
      person(pen, dx, dy, 0, randomLook(rng), pose, rng.chance(0.5), 0.72);
    }
    for (const [dx, dy] of [
      [8.9, 37.4],
      [10.1, 38.2],
      [12.6, 37.9],
      [13.4, 37.0],
    ]) {
      shopper(pen, rng, dx, dy);
    }
  }

  // ---- clogs: a stall, and the giant one for photographs
  {
    pen.push(15.2, 31.0, 0);
    stand(pen, rng, { a: CLOG, b: C.red, sign: "KLOMPEN", goods: clogs });
    // a string of clogs under the awning
    const hang = pen.plane([0.2, 2.82, 1.9], [1, 0, 0], [0, 0, 1], 0, true);
    for (let i = 0; i < 7; i++) {
      hang.ellipse(0.25 + i * 0.44, -0.3, 0.17, 0.1, i % 3 === 1 ? C.red : CLOG, { outline: true, w: 0.035, seg: 8, sway: 0.15 });
      hang.seg(0.25 + i * 0.44, 0, 0.25 + i * 0.44, -0.2, { w: 0.03, kind: L_BAR, wobble: 0 });
    }
    pen.pop();
    pen.push(19.4, 34.4, 0);
    giantClog(pen);
    person(pen, 0.93, 0.75, 0.62, randomLook(rng), "cheer", false);
    pen.pop();
    // the photographer and the queue for a turn
    person(pen, 21.3, 38.6, 0, randomLook(rng), "stand", true);
    held(pen, 21.3, 38.6, 0, (cd) => {
      cd.rect(-0.26, 1.58, 0.26, 1.9, C.black, { outline: true, w: 0.04 });
      cd.circle(0, 1.74, 0.1, C.glassLight, { seg: 7, layer: 1, outline: true, w: 0.03 });
    });
    person(pen, 24.0, 35.6, 0, randomLook(rng), "stand", true);
    person(pen, 24.7, 36.2, 0, randomLook(rng), "stand", false, 0.72);
    person(pen, 25.3, 36.9, 0, randomLook(rng), "wave", true);
  }

  // ---- the balloon seller, and a child who has just let go of one
  {
    const bx = 16.4;
    const by = 36.3;
    person(pen, bx, by, 0, { skin: hex("#eebb96"), hair: hex("#4a3020"), top: hex("#f4862a"), legs: hex("#2f3b55"), long: false, hat: hex("#dc3d2f") }, "wave", false);
    held(pen, bx, by, 0, (cd) => {
      const cols = [C.red, C.yellow, C.blue, C.pink, C.green, C.orange, C.purple];
      const spots: V2[] = [
        [0.0, 3.2],
        [0.62, 3.0],
        [1.2, 3.25],
        [0.3, 3.85],
        [0.95, 3.9],
        [1.55, 3.75],
        [0.65, 4.5],
      ];
      spots.forEach(([a, b], i) => {
        cd.seg(0.64, 1.9, a, b - 0.34, { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0, sway: 0, swayB: 0.3 });
        cd.ellipse(a, b, 0.3, 0.36, cols[i], { outline: true, w: 0.04, seg: 10, sway: 0.3, grain: 0.3, layer: 1 + i * 0.1 });
      });
    });
    person(pen, bx + 1.3, by + 0.6, 0, randomLook(rng), "cheer", true, 0.72);
    person(pen, bx + 1.9, by + 0.2, 0, randomLook(rng), "stand", true);
  }

  // ---- stroopwafels, made while you wait
  {
    pen.push(25.6, 31.2, 0);
    pen.obj(() => {
      pen.box(0, 0.5, 0, 2.8, 1.3, 0.95, C.red, { top: C.stone });
      const f = pen.wall("y+", 0, 0.5, 0, 2.8, 1.3);
      f.rect(0.15, 0.3, 2.65, 0.72, C.cream, { outline: true, w: W_FINE });
      f.text("STROOPWAFELS", 1.4, 0.4, 0.2, { align: "c", w: 0.055, layer: 1 });
      // the iron, a waffle on it, and a stack ready to go
      pen.cyl(0.75, 1.15, 0.95, 0.42, 0.08, C.charcoal, { seg: 10, w: W_FINE });
      pen.cyl(0.75, 1.15, 1.03, 0.34, 0.04, WAFFLE, { seg: 10, w: W_FINE });
      const top = pen.floor(1.08, 1);
      for (const k of [-0.15, 0, 0.15]) {
        top.seg(0.75 + k, 0.9, 0.75 + k, 1.4, { w: 0.03, color: scaleRGB(WAFFLE, 0.7), kind: L_MARK, wobble: 0 });
        top.seg(0.5, 1.15 + k, 1.0, 1.15 + k, { w: 0.03, color: scaleRGB(WAFFLE, 0.7), kind: L_MARK, wobble: 0 });
      }
      for (let j = 0; j < 5; j++) pen.cyl(1.9, 1.1, 0.95 + j * 0.09, 0.33, 0.09, WAFFLE, { seg: 9, w: W_FINE, grain: 0.5 });
      pen.cyl(2.45, 1.4, 0.95, 0.14, 0.3, C.gold, { seg: 7, w: W_FINE });
      // a small striped roof
      for (const [px, py] of [
        [0.05, 0.4],
        [2.75, 0.4],
        [0.05, 1.9],
        [2.75, 1.9],
      ]) {
        pen.pole([px, py, 0], [px, py, 2.6], 0.09, C.white);
      }
      const roof = pen.plane([-0.15, 0.2, 2.75], [1, 0, 0], [0, 1.9, -0.3], 0, true);
      for (let i = 0; i < 6; i++) roof.rect((i * 3.1) / 6, 0, ((i + 1) * 3.1) / 6, 1, i % 2 === 0 ? C.red : C.white, { grain: 0.6 });
      roof.loop(
        [
          [0, 0],
          [3.1, 0],
          [3.1, 1],
          [0, 1],
        ],
        { w: W_THIN },
      );
      // a stovepipe through the awning for the steam
      pen.cyl(0.75, 1.15, 2.45, 0.17, 0.95, C.metal, { seg: 7, w: W_FINE });
      pen.cone(0.75, 1.15, 3.5, 0.3, 0.2, C.greyDark, { seg: 7, w: W_FINE });
    });
    person(pen, 1.4, 0.2, 0, { skin: hex("#eebb96"), hair: hex("#b24e30"), top: C.white, legs: C.blueDark, long: true, hat: C.white }, "stand", false);
    pen.pop();
    const q: [number, number][] = [
      [26.6, 33.9],
      [27.2, 34.8],
      [26.7, 35.7],
      [27.4, 36.6],
    ];
    q.forEach(([x, y], i) => person(pen, x, y, 0, randomLook(rng), "stand", i % 2 === 0, i === 2 ? 0.72 : 1));
    // someone already eating one
    person(pen, 28.9, 34.4, 0, randomLook(rng), "stand", false);
    held(pen, 28.9, 34.4, 0, (cd) => cd.circle(0.45, 1.15, 0.2, WAFFLE, { outline: true, w: 0.04, seg: 9 }));
  }

  // ---- the chip kiosk
  {
    pen.obj(() => {
      pen.box(31.4, 30.9, 0, 2.6, 2.2, 2.75, C.cream);
      const f = pen.wall("y+", 31.4, 30.9, 0, 2.6, 2.2);
      f.rect(0, 0, 2.6, 0.55, C.red, { grain: 0.6 });
      f.rect(0.3, 1.0, 2.3, 1.85, C.glass, { outline: true, w: W_THIN, glow: 1 });
      f.block(0.2, 0.9, 2.4, 1.0, 0.35, C.stone, { w: W_FINE });
      f.rect(0.4, 2.0, 2.2, 2.5, C.yellow, { outline: true, w: W_FINE, layer: 1 });
      f.text("PATAT", 1.3, 2.1, 0.28, { align: "c", w: 0.07, layer: 2 });
      // the cook, seen through the hatch
      f.circle(1.3, 1.42, 0.26, hex("#d39a6c"), { outline: true, w: 0.04, seg: 9, layer: 1 });
      f.rect(1.02, 1.6, 1.58, 1.76, C.white, { outline: true, w: 0.035, layer: 2 });
      const g = pen.wall("x+", 31.4, 30.9, 0, 2.6, 2.2);
      g.rect(0, 0, 2.2, 0.55, C.red, { grain: 0.6 });
      g.rect(0.5, 0.75, 1.4, 2.1, C.doorRed, { outline: true, w: W_THIN });
      pen.hip(31.25, 30.75, 2.75, 2.9, 2.5, 0.75, C.red);
    });
    // a cone of chips the size of a child, on the roof
    pen.obj(() => {
      const cd = pen.card(32.7, 32.0, 3.5);
      cd.poly(
        [
          [-0.5, 1.0],
          [0.5, 1.0],
          [0.12, 0],
          [-0.12, 0],
        ],
        C.white,
        { outline: true, w: W_THIN },
      );
      cd.seg(-0.38, 0.72, 0.38, 0.72, { w: 0.1, color: C.red, kind: L_MARK, wobble: 0, layer: 1 });
      cd.seg(-0.26, 0.4, 0.26, 0.4, { w: 0.1, color: C.red, kind: L_MARK, wobble: 0, layer: 1 });
      for (let i = 0; i < 6; i++) cd.bar(-0.38 + i * 0.15, 1.0, -0.46 + i * 0.185, 1.5 + (i % 2) * 0.16, 0.11, C.yellow, { layer: 1, ink: C.ochre });
      cd.circle(0.1, 1.42, 0.2, C.white, { outline: true, w: 0.04, seg: 8, layer: 2 });
    });
    pen.obj(() => {
      pen.cyl(33.5, 34.5, 1.05, 0.5, 0.07, C.white, { seg: 9 });
      pen.pole([33.5, 34.5, 0], [33.5, 34.5, 1.05], 0.09, C.greyDark, { ink: false });
    });
    const eater = (x: number, y: number, flip: boolean) => {
      person(pen, x, y, 0, randomLook(rng), "stand", flip);
      held(pen, x, y, 0, (cd) => {
        const s = flip ? -1 : 1;
        cd.poly(
          [
            [s * 0.3, 1.25],
            [s * 0.62, 1.25],
            [s * 0.5, 0.9],
            [s * 0.42, 0.9],
          ],
          C.white,
          { outline: true, w: 0.035 },
        );
        for (let i = 0; i < 3; i++) cd.bar(s * (0.36 + i * 0.1), 1.25, s * (0.34 + i * 0.12), 1.45, 0.07, C.yellow, { ink: false, layer: 1 });
      });
    };
    eater(32.7, 34.6, false);
    eater(34.3, 34.4, true);
    eater(33.6, 35.5, false);
    person(pen, 32.3, 33.7, 0, randomLook(rng), "stand", true);
  }

  // ---- herring: cart, flags, a customer doing it properly, an audience of gulls
  {
    pen.push(37.0, 33.2, 0);
    pen.obj(() => {
      pen.box(0, 0.4, 0.3, 3.0, 1.3, 0.75, C.white);
      const f = pen.wall("y+", 0, 0.4, 0.3, 3.0, 1.3);
      f.rect(0, 0, 3.0, 0.3, C.blue, { grain: 0.6 });
      f.rect(0.5, 0.36, 2.5, 0.7, C.blue, { outline: true, w: W_FINE });
      f.text("HARING", 1.5, 0.42, 0.2, { align: "c", color: C.white, kind: L_MARK, w: 0.06, layer: 1 });
      const wh = pen.wall("y+", 0, 0.4, 0, 3.0, 1.34);
      for (const a of [0.55, 2.45]) wh.circle(a, 0.34, 0.34, C.charcoal, { outline: true, w: 0.06, seg: 11 });
      // the glass counter and what is in it
      pen.box(0.2, 0.6, 1.05, 2.3, 0.9, 0.32, C.glassPale, { w: W_FINE, grain: 0.3, glow: 0.6 });
      const g = pen.floor(1.38, 1);
      for (let x = 0.5; x < 2.4; x += 0.36) g.ellipse(x, 1.05, 0.09, 0.3, SILVER, { outline: true, w: 0.03, seg: 8 });
      pen.cyl(2.72, 0.8, 1.05, 0.16, 0.14, C.white, { seg: 7, top: C.cream, w: W_FINE });
      pen.cyl(2.72, 1.25, 1.05, 0.16, 0.14, C.white, { seg: 7, top: C.leaf, w: W_FINE });
      for (const [px, py] of [
        [0.05, 0.3],
        [2.95, 0.3],
        [0.05, 1.8],
        [2.95, 1.8],
      ]) {
        pen.pole([px, py, 0.3], [px, py, 2.7], 0.09, C.white);
      }
      const roof = pen.plane([-0.15, 0.1, 2.85], [1, 0, 0], [0, 1.95, -0.35], 0, true);
      for (let i = 0; i < 6; i++) roof.rect((i * 3.3) / 6, 0, ((i + 1) * 3.3) / 6, 1, i % 2 === 0 ? C.blue : C.white, { grain: 0.6 });
      roof.loop(
        [
          [0, 0],
          [3.3, 0],
          [3.3, 1],
          [0, 1],
        ],
        { w: W_THIN },
      );
    });
    flag(pen, 3.05, 1.8, 2.6, 1.7, "nl", 0.62);
    flag(pen, -0.05, 1.8, 2.6, 1.7, "nl", 0.62);
    person(pen, 1.4, 0.15, 0, { skin: hex("#f6d3b8"), hair: hex("#c99a55"), top: C.white, legs: C.blueDark, long: false, hat: C.blue }, "stand", false);
    pen.pop();
    // head back, herring by the tail
    person(pen, 38.5, 36.1, 0, randomLook(rng), "wave", false);
    held(pen, 38.5, 36.1, 0, (cd) => {
      cd.poly(
        [
          [0.5, 2.34],
          [0.78, 2.34],
          [0.72, 2.16],
          [0.82, 1.62],
          [0.64, 1.22],
          [0.46, 1.62],
          [0.56, 2.16],
        ],
        SILVER,
        { outline: true, w: 0.045 },
      );
      cd.circle(0.64, 1.42, 0.035, C.ink, { seg: 5, layer: 1 });
    });
    person(pen, 40.0, 35.6, 0, randomLook(rng), "stand", true);
    person(pen, 37.0, 36.6, 0, randomLook(rng), "cheer", false, 0.72);
    // the cat that lives under the cart
    pen.obj(() => {
      const cat = pen.card(36.4, 35.0, 0);
      const col = hex("#e2893a");
      cat.ellipse(0, 0.26, 0.3, 0.24, col, { outline: true, w: 0.04, seg: 9 });
      cat.circle(0.2, 0.56, 0.18, col, { outline: true, w: 0.04, seg: 8, layer: 1 });
      cat.poly(
        [
          [0.08, 0.68],
          [0.12, 0.84],
          [0.2, 0.7],
        ],
        col,
        { outline: true, w: 0.03, layer: 2 },
      );
      cat.poly(
        [
          [0.24, 0.7],
          [0.32, 0.84],
          [0.36, 0.66],
        ],
        col,
        { outline: true, w: 0.03, layer: 2 },
      );
      cat.bar(-0.28, 0.14, -0.52, 0.42, 0.08, col, { layer: 1 });
    });
  }

  // ---- a café corner on the square, benches, lamps
  cafeTable(pen, rng, 10.8, 40.0, C.red, 3);
  cafeTable(pen, rng, 14.2, 40.3, C.white, 2);
  cafeTable(pen, rng, 17.4, 39.9, C.red, 4);
  bench(pen, 29.6, 39.8, 0);
  person(pen, 29.2, 39.85, 0, randomLook(rng), "sit", false);
  person(pen, 30.0, 39.85, 0, randomLook(rng), "sit", true);
  bench(pen, 35.6, 39.9, 0);
  person(pen, 35.4, 39.95, 0, randomLook(rng), "sit", false, 0.72);
  for (const [lx, ly] of [
    [24.9, 30.9],
    [8.4, 42.6],
    [41.4, 42.5],
    [41.4, 31.2],
    [18.8, 37.4],
    [31.6, 37.6],
  ]) {
    lamp(pen, lx, ly);
  }
  for (let i = 0; i < 10; i++) shopper(pen, rng, rng.range(19, 40), rng.range(37.6, 41));

  // ---- the flower quay: banner, bucket displays, customers
  {
    const bx0 = 20.4;
    const bx1 = 27.6;
    pen.obj(() => {
      pen.pole([bx0, 42.7, 0], [bx0, 42.7, 4.2], 0.11, C.white);
      pen.pole([bx1, 42.7, 0], [bx1, 42.7, 4.2], 0.11, C.white);
      const f = pen.wall("y+", bx0, 42.6, 3.1, bx1 - bx0, 0.1);
      f.rect(0.1, 0, bx1 - bx0 - 0.1, 0.95, C.white, { outline: true, w: W_THIN });
      f.text("BLOEMENMARKT", (bx1 - bx0) / 2, 0.25, 0.46, { align: "c", color: C.green, kind: L_MARK, w: 0.08, layer: 1 });
    });
    bunting(pen, [8.4, 42.7, 3.6], [bx0, 42.7, 4.1], 0.7);
    bunting(pen, [bx1, 42.7, 4.1], [41.4, 42.6, 3.6], 0.7);
    // buckets in rows, grouped by colour so the quay reads as stripes
    let k = 0;
    for (let x = 7.4; x < 41.4; x += 0.58) {
      if (Math.abs(((x - 7.4) % 10) - 9.3) < 0.75) continue;
      const col = TULIP[Math.floor(k / 4) % TULIP.length];
      k++;
      for (const [y, z] of [
        [46.25, 0.35],
        [46.95, 0],
      ] as const) {
        pen.begin();
        if (z > 0) pen.box(x - 0.27, y - 0.27, 0, 0.54, 0.54, z, C.wood, { edges: false, grain: 0.5 });
        pen.cyl(x, y, z, 0.2, 0.3, C.metal, { seg: 6, w: W_FINE, grain: 0.4 });
        const cd = pen.card(x, y, z + 0.3);
        cd.poly(
          [
            [-0.16, 0],
            [0.16, 0],
            [0.22, 0.36],
            [-0.22, 0.36],
          ],
          C.leafDark,
          { grain: 0.4 },
        );
        for (const [da, db] of [
          [-0.18, 0.42],
          [0.01, 0.54],
          [0.19, 0.42],
        ]) {
          cd.circle(da, db, 0.125, col, { seg: 6, grain: 0, layer: 1, outline: true, w: 0.03, sway: 0.08 });
        }
        pen.end();
      }
    }
    for (let i = 0; i < 17; i++) shopper(pen, rng, rng.range(8, 41), rng.range(43.5, 45.4));
    // a box bike being loaded with tulips
    pen.push(31.5, 44.2, 0, 200);
    bike(pen, { cargo: true, color: C.green });
    pen.pop();
  }

  // ---- the barges themselves, moored along the outer water
  const signs = ["TULPEN", "BLOEMEN", "BOLLEN", "TULIPS"];
  signs.forEach((s, i) => {
    pen.push(7.6 + i * 10, 48.35, WATER);
    flowerBarge(pen, rng, s);
    pen.pop();
    // a gull on the ridge of every other roof
    if (i % 2 === 0) {
      pen.push(7.6 + i * 10 + 5.2, 48.35 + 1.7, WATER + 3.92);
      pen.obj(() => gullShape(pen, i === 0, 0));
      pen.pop();
    }
  });

  // ---- the east side, along the outer water: railing, anglers, bikes, a boat of flowers
  railing(
    pen,
    [
      [47.38, 6.6, 0],
      [47.38, 47.2, 0],
    ],
    0.85,
    [52, 78, 66],
    1.7,
  );
  bikeRow(pen, rng, 44.2, 36.6, 9, 0);
  for (const y of [25.6, 30.4]) {
    person(pen, 46.75, y, -0.32, randomLook(rng), "sit", false);
    pen.obj(() => {
      pen.stroke(
        [
          [46.9, y, 0.8],
          [49.9, y, 1.9],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [49.9, y, 1.9],
          [49.9, y, WATER + 0.05],
        ],
        { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
      pen.card(49.9, y, WATER).circle(0, 0.1, 0.12, C.red, { outline: true, w: 0.035, seg: 7 });
      pen.cyl(46.2, y + 0.7, 0, 0.2, 0.3, C.blue, { seg: 7, w: W_FINE });
    });
  }
  pen.push(46.4, 28.0, 0);
  pen.obj(() => gullShape(pen, false, 0));
  pen.pop();
  pen.push(49.9, 15.5, WATER, 90);
  sloep(pen, rng, { color: C.green, crew: [], flag: null });
  pen.obj(() => {
    for (let i = 0; i < 4; i++) {
      const col = TULIP[i % TULIP.length];
      pen.box(-1.7 + i * 0.85, -0.5, 0.62, 0.75, 1.0, 0.22, C.wood, { top: C.leafDark, w: W_FINE });
      const g = pen.floor(0.85, 1);
      for (let q = 0; q < 6; q++) g.circle(-1.55 + i * 0.85 + (q % 3) * 0.22, -0.3 + Math.floor(q / 3) * 0.5, 0.1, col, { seg: 6, grain: 0 });
    }
  });
  pen.pop();

  // ================================================================ movers
  const born = c.done;

  // ---- shoppers drifting up one side of the street and down the other
  {
    const loop = (x0: number, y0: number, x1: number, y1: number, rev: boolean): Route => {
      let pts: V3[] = [w3(x0, y0), w3(x1, y0), w3(x1, y1), w3(x0, y1)];
      if (rev) pts = pts.reverse();
      return new Route(rounded(pts, true, 1.2), true);
    };
    const a = loop(8.2, 20.9, 40.8, 25.9, false);
    const b = loop(8.8, 21.5, 40.2, 25.3, true);
    for (let i = 0; i < 6; i++) c.movers.push(walker(a, rng, born + rng.range(0, 1.5), rng.range(0.9, 1.4)));
    for (let i = 0; i < 6; i++) c.movers.push(walker(b, rng, born + rng.range(0, 1.5), rng.range(0.9, 1.4)));
    // through the gap between the stalls, round the square and back
    const sq = new Route(rounded([w3(24.6, 25.6), w3(24.6, 30.1), w3(41.2, 30.1), w3(41.2, 41.7), w3(7.6, 41.7), w3(7.6, 30.1), w3(23.6, 30.1), w3(23.6, 25.6)], true, 1.0), true);
    for (let i = 0; i < 5; i++) c.movers.push(walker(sq, rng, born + rng.range(0, 1.5), rng.range(1.0, 1.5)));
  }

  // ---- a box bike doing the deliveries
  {
    const rider = randomLook(new Rng(613));
    const frames = [0, 1].map((f) => new Turning((p) => bike(p, { cargo: true, rider, frame: f, color: C.redDark }), 24, 610 + f));
    const circuit = new Route(rounded([w3(7.9, 30.1), w3(41.5, 30.1), w3(41.5, 41.9), w3(7.9, 41.9)], true, 1.6), true);
    c.movers.push(
      traveler(circuit, {
        speed: 3.4,
        at: 0.3,
        born: born + 0.4,
        span: 1.6,
        sprite: (h, t) => frames[Math.floor(t * 3) & 1].at(h),
      }),
    );
  }

  // ---- steam off the waffle iron, music off the organ
  {
    const puff = makeSprite(puffShape, 0, 620);
    const o = w3(26.35, 32.35, 3.55);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(o[0], o[1], o[2], 6)) return;
      for (let i = 0; i < 4; i++) {
        const u = ((((m.t - born) * 0.42 + i / 4) % 1) + 1) % 1;
        const p = 1.05 * Math.min(1, u * 5, (1 - u) * 2.5);
        const sx = 0.35 * Math.sin(i * 1.9 + u * 4);
        m.put(puff, o[0] + sx * 0.5 - u * 0.3, o[1] - sx * 0.5 - u * 0.3, o[2] + u * 2.2, m.t - p, 0.6 + u * 0.7);
      }
    });
    const notes = [makeSprite((p) => noteShape(p, false), 0, 631), makeSprite((p) => noteShape(p, true), 0, 632)];
    const q = w3(11.1, 33.8, 3.5);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(q[0], q[1], q[2], 8)) return;
      for (let i = 0; i < 5; i++) {
        const u = ((((m.t - born) * 0.3 + i / 5) % 1) + 1) % 1;
        const p = 1.05 * Math.min(1, u * 6, (1 - u) * 3);
        const sx = 0.9 * Math.sin(i * 2.3 + u * 5) + (i - 2) * 0.4;
        m.put(notes[i % 2], q[0] + sx * 0.5, q[1] - sx * 0.5, q[2] + u * 3.4, m.t - p);
      }
      // the grinder's wheel goes round
      const hub = w3(9.4 + 3.4, 33.0 + 0.75, 1.5);
      const pen2 = m.pen;
      pen2.begin();
      for (let k = 0; k < 3; k++) {
        const a = m.t * 2.2 + (k * Math.PI) / 3;
        pen2.strokeW(
          [
            [hub[0] + 0.02, hub[1] + Math.cos(a) * 0.46, hub[2] + Math.sin(a) * 0.46],
            [hub[0] + 0.02, hub[1] - Math.cos(a) * 0.46, hub[2] - Math.sin(a) * 0.46],
          ],
          { w: 0.06, kind: L_BAR, wobble: 0 },
        );
      }
      pen2.end();
    });
  }

  // ---- the balloon that got away
  {
    const loose = makeSprite(
      (p) => {
        const cd = p.card(0, 0, 0);
        cd.line(
          [
            [0, 0],
            [0.08, -0.4],
            [-0.06, -0.8],
            [0.04, -1.15],
          ],
          { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 },
        );
        cd.ellipse(0, 0.36, 0.3, 0.36, C.red, { outline: true, w: 0.04, seg: 10, grain: 0.3, layer: 1 });
        cd.line(
          [
            [-0.14, 0.5],
            [-0.08, 0.6],
          ],
          { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 },
        );
      },
      0,
      650,
    );
    const o = w3(17.7, 36.9, 3.0);
    const T = 9.5;
    c.movers.push((m) => {
      if (m.t < born + 1) return;
      const u = (m.t - born - 1) % T;
      if (u > 7.2) return;
      const p = u > 6.1 ? 1.05 * (1 - (u - 6.1) / 1.1) : 1.05;
      const drift = 0.5 * Math.sin(u * 1.3) + u * 0.22;
      m.put(loose, o[0] + drift * 0.5, o[1] - drift * 0.5, o[2] + 0.4 * u + 0.16 * u * u, m.t - p);
    });
  }

  // ---- gulls: three wheeling over the herring, one that keeps trying its luck
  {
    const fly = [pair((p, f) => gullShape(p, f, 1), 641), pair((p, f) => gullShape(p, f, -1), 642)];
    const sit = pair((p, f) => gullShape(p, f, 0), 643);
    const centre = w3(38.6, 34.6, 6.2);
    c.movers.push((m) => {
      if (m.t < born + 0.5) return;
      for (let i = 0; i < 3; i++) {
        const a = (m.t - born) * (0.55 + i * 0.07) + i * 2.2;
        const r = 3.4 + i * 0.9;
        const x = centre[0] + Math.cos(a) * r * 0.5 - Math.sin(a) * r * 0.32;
        const y = centre[1] - Math.cos(a) * r * 0.5 - Math.sin(a) * r * 0.32;
        const z = centre[2] + i * 0.8 + 0.5 * Math.sin(a * 1.7);
        // glide for a beat, then flap
        const beat = Math.floor(m.t * 5 + i * 1.3) % 6;
        m.put(fly[beat < 3 ? 0 : beat & 1][-Math.sin(a) >= 0 ? 0 : 1], x, y, z, born + 0.5);
      }
      // the chancer: lamp post, swoop at the herring, back to the lamp post
      const T = 8.5;
      const u = (m.t - born) % T;
      const perch = w3(41.4, 31.2, 3.95);
      const prize = w3(38.95, 35.2, 2.35);
      if (u < 5.2) {
        m.put(sit[1], perch[0], perch[1], perch[2] + 0.02 * Math.sin(m.clock * 4), born + 0.5);
      } else {
        const e0 = (u - 5.2) / (T - 5.2);
        const out = e0 < 0.5;
        const e1 = out ? e0 * 2 : (1 - e0) * 2;
        const e = e1 * e1 * (3 - 2 * e1);
        const x = perch[0] + (prize[0] - perch[0]) * e;
        const y = perch[1] + (prize[1] - perch[1]) * e;
        const z = perch[2] + (prize[2] - perch[2]) * e + Math.sin(Math.PI * e) * 0.9;
        m.put(fly[Math.floor(m.t * 9) & 1][out ? 1 : 0], x, y, z, born + 0.5);
      }
    });
  }
};
