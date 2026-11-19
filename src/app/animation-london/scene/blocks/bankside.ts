// Bankside: the south bank opposite St Paul's. Tate Modern lies across the
// middle of the block, an old power station whose chimney stands dead ahead
// of the footbridge. In front of it is a lawn of birches where a school party
// sits drawing, children roll down a hummock, an ice-cream van does good
// business and a man blows bubbles the size of dogs. Shakespeare's Globe is
// at the near corner with the camera's side cut away, so the play can be
// watched from here: today's ends in a sword fight. Three old houses and a
// pub keep the other corner, and at low tide the mudlarks are out on the
// shingle under the river wall.

import { RGB, Rng, V2, V3, hex } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SHIRT, SKIN } from "../palette";
import { Look, Pose, W_FINE, W_THIN, bench, bin, bricks, bulb, cafeTable, dogOn, flag, hat, lamp, lightString, person, pigeon, pigeonOn, pub, randomLook, snapper, speckle, stall, tufts, van, windowAt } from "../props";

// Tate Modern: the main block, and the chimney that stands proud of its front, on the footbridge's line.
const TX0 = 16;
const TX1 = 42;
const TY0 = 13;
const TY1 = 23;
const TH = 9;
const CW = 3.6;
const CX0 = 29 - CW / 2;
const CH = 27;
// The Globe: its centre, the radius of the yard and of the outer wall, the height of the galleries.
const GX = 37.0;
const GY = 37.3;
const R_IN = 3.9;
const R_OUT = 6.0;
const GH = 5.4;
const BAYS = 20;
// The stage, in the playhouse's own frame: half its width, and where its back and front edges are.
const STAGE_W = 2.45;
const STAGE_B = -Math.sqrt(R_IN * R_IN - STAGE_W * STAGE_W);
const STAGE_F = -0.3;
const STAGE_H = 1.15;
// The hummock on the lawn.
const MOUND: V2 = [21.3, 33.2];
const MOUND_R = 3.1;
const MOUND_H = 1.5;
/** Height of the shingle at low tide, a little above the water. */
const BEACH = WATER + 0.12;

const BRICK = hex("#84594a");
const BRICK_D = hex("#6a463a");
const CHIM = hex("#8e6252");
const CHIM_L = hex("#a87c69");
const MAGENTA = hex("#d83a7c");
const WHITE = C.stucco;
const TIMBER = hex("#5a4636");
const THATCH = hex("#cfae66");
const THATCH_D = hex("#a98845");
const YARD = hex("#e2cfa6");
const DECK = hex("#dcb98f");
const SHINGLE = hex("#d8c8a2");
const BUBBLE = hex("#8fc7e8");

const onLawn = (x: number, y: number) => x > 12.2 && x < 30.4 && y > 27.4 && y < 43.6 && !(x < 17.8 && y > 36.2);
/** Where the shingle meets the water, by x. */
const tideLine = (x: number) => -6.15 - 0.3 * Math.sin(x * 0.8 + 1);

function scatter(rng: Rng, x0: number, y0: number, x1: number, y1: number, n: number, gap: number, ok?: (x: number, y: number) => boolean): V2[] {
  const out: V2[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const x = rng.range(x0, x1);
    const y = rng.range(y0, y1);
    if (ok && !ok(x, y)) continue;
    if (out.some((p) => Math.hypot(p[0] - x, p[1] - y) < gap)) continue;
    out.push([x, y]);
  }
  return out;
}

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // the forecourt along the Tate's front, and the passage round its east end
  g1.rect(13.6, TY1, 43.8, 27.4, C.plaza, { grain: 0.7 });
  g1.rect(TX1, 5.6, 43.8, TY1, C.plaza, { grain: 0.7 });
  g3.seg(13.6, 27.4, 43.8, 27.4, { w: 0.05, color: C.streetDark, kind: L_MARK });
  speckle(g3, 13.8, TY1 + 0.2, 43.6, 27.2, C.streetDark, 0.3);
  // the lawn, and the hummock children roll down
  g1.poly(
    [
      [12.2, 27.4],
      [30.4, 27.4],
      [30.4, 43.6],
      [17.8, 43.6],
      [17.8, 36.2],
      [12.2, 36.2],
    ],
    C.grass,
    { outline: true, w: W_THIN },
  );
  tufts(g3, 12.4, 27.6, 30.2, 43.4, 0.32, (a, b) => onLawn(a, b) && Math.hypot(a - MOUND[0], b - MOUND[1]) > MOUND_R + 0.3);
  pen.dome(MOUND[0], MOUND[1], 0, MOUND_R, MOUND_H, C.grassLight, { seg: 16, rings: 3, w: W_THIN });
  for (const q of [0.45, 0.78]) {
    const line: V3[] = [];
    for (let i = 0; i <= 12; i++) {
      const th = -0.7 + (i / 12) * 3.0;
      line.push([MOUND[0] + Math.cos(th) * MOUND_R * q, MOUND[1] + Math.sin(th) * MOUND_R * q, MOUND_H * Math.sqrt(1 - q * q) + 0.04]);
    }
    pen.stroke(line, { w: 0.06, color: C.grassDark, kind: L_MARK, wobble: 0.6, alpha: 0.8 });
  }
  // the birch garden west of the Tate
  g1.rect(4.3, 5.8, 13.4, 25.9, C.gravel, { outline: true, w: 0.05, grain: 0.8 });
  speckle(g3, 4.5, 6, 13.2, 25.7, C.streetDark, 0.25);
  // decking outside the pub
  g1.rect(12.75, 36.45, 17.65, 43.7, DECK, { outline: true, w: W_THIN });
  for (let y = 37.1; y < 43.6; y += 0.7) g3.seg(12.9, y, 17.5, y, { w: 0.045, color: C.woodDark, kind: L_MARK, wobble: 0.4, alpha: 0.7 });
  // the Globe's cobbled apron, and its yard
  g1.circle(GX, GY, 6.55, C.plaza, { seg: 30, grain: 0.7 });
  speckle(g3, GX - 6.5, GY - 6.5, GX + 6.5, GY + 6.5, C.streetDark, 0.3, (a, b) => {
    const r = Math.hypot(a - GX, b - GY);
    return r < 6.4 && r > R_OUT + 0.4;
  });
  g2.circle(GX, GY, R_IN + 0.05, YARD, { seg: 20, grain: 0.8 });
  // low tide: two stretches of shingle at the foot of the river wall, either side of the footbridge
  for (const [x0, x1] of [
    [3.5, 24.5],
    [33.5, 45],
  ]) {
    const edge: V2[] = [];
    for (let x = x0; x <= x1 + 0.01; x += 1) edge.push([x, tideLine(x)]);
    pen.floor(BEACH, 0).poly([...edge, [x1, -0.05], [x0, -0.05]], SHINGLE, { grain: 0.9 });
    speckle(pen.floor(BEACH, 1), x0, -6.4, x1, -0.3, C.stoneDark, 0.6, (a, b) => b > tideLine(a) + 0.15);
    pen.stroke(
      edge.map((p) => [p[0], p[1], BEACH + 0.01] as V3),
      { w: 0.14, color: C.white, kind: L_MARK, wobble: 0.8, alpha: 0.9 },
    );
  }
}

// ---------------------------------------------------------------- Tate Modern

/** One of the power station's tall slot windows. */
function slot(f: Plane, a: number, b: number, w: number, h: number, lit: boolean): void {
  f.rect(a, b, a + w, b + h, C.glass, { outline: true, w: 0.045, glow: lit ? 1 : 0, grain: 0.5, layer: 1 });
}

function tate(c: LondonCtx): void {
  const { pen, rng } = c;
  const L = TX1 - TX0;
  const D = TY1 - TY0;
  const lit = () => rng.chance(0.62);
  pen.obj(() => {
    pen.box(TX0, TY0, 0, L, D, TH, BRICK, { top: C.charcoal });
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, TX0, TY0, 0, L, D);
      const len = side === "y+" ? L : D;
      f.rect(0, 0, len, 0.9, BRICK_D, { grain: 0.7 });
      f.seg(0, 0.9, len, 0.9, { w: W_FINE });
      f.rect(0, TH - 0.7, len, TH, BRICK_D, { grain: 0.7 });
      f.seg(0, TH - 0.7, len, TH - 0.7, { w: W_FINE });
      bricks(f, 0.3, 1.1, len - 0.3, TH - 0.9, BRICK_D, 0.45);
    }
    const f = pen.wall("y+", TX0, TY0, 0, L, D);
    for (let k = 0; k < 4; k++) slot(f, 0.9 + k * 1.2, 1.7, 0.55, 5.7, lit());
    for (let k = 0; k < 6; k++) slot(f, 17.3 + k * 1.45, 1.7, 0.55, 5.7, lit());
    // the doors either side of the chimney, each under a canopy (the west one clear of what the chimney hides)
    for (const a of [5.7, 15.1]) {
      f.rect(a, 0, a + 1.6, 2.5, C.glass, { outline: true, w: W_THIN, glow: 0.9, layer: 1, grain: 0.4 });
      f.seg(a + 0.8, 0.05, a + 0.8, 2.45, { w: 0.05, color: C.glassPale, kind: L_MARK, wobble: 0, layer: 2 });
      f.block(a - 0.25, 2.5, a + 1.85, 2.72, 1.0, C.charcoal, { w: W_FINE });
    }
    const e = pen.wall("x+", TX0, TY0, 0, L, D);
    for (const a of [1.3, 4.7, 8.1]) slot(e, a, 1.7, 0.6, 3.3, lit());
    // lettered at the south end of the wall: the Shard, across the street, stands in front of the rest
    e.text("TATE", 0.55, 6.55, 1.2, { align: "l", color: C.cream, kind: L_MARK, w: 0.14, wobble: 0.3, layer: 1 });
    e.text("MODERN", 0.6, 5.55, 0.66, { align: "l", color: C.cream, kind: L_MARK, w: 0.09, wobble: 0.3, layer: 1 });
  });
  // the glass box along the roof: two storeys of it, lit all evening
  pen.obj(() => {
    const gx = TX0 + 1.3;
    const gy = TY0 + 3.0;
    const gl = L - 2.6;
    const gd = D - 5.0;
    pen.box(gx, gy, TH, gl, gd, 2.5, C.glassPale, { top: null, glow: 0.85, grain: 0.4, w: W_THIN });
    pen.box(gx - 0.15, gy - 0.15, TH + 2.5, gl + 0.3, gd + 0.3, 0.16, C.stone, { w: W_FINE });
    const lid = pen.floor(TH + 2.66, 1);
    for (let a = 1.2; a < gl - 2; a += 3.1) lid.rect(gx + a, gy + 1.3, gx + a + 1.9, gy + gd - 1.3, C.glassLight, { outline: true, w: 0.04, glow: 0.7, grain: 0.3 });
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, gx, gy, TH, gl, gd);
      const len = side === "y+" ? gl : gd;
      for (let a = 1.17; a < len - 0.4; a += 1.17) f.seg(a, 0.06, a, 2.44, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0 });
      f.seg(0.05, 1.25, len - 0.05, 1.25, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0 });
      // members at the bar, looking out over the river
      for (let k = 0; k < (side === "y+" ? 9 : 2); k++) {
        const a = rng.range(0.6, len - 0.6);
        f.rect(a - 0.18, 1.32, a + 0.18, 1.74, rng.pick(SHIRT), { layer: 1, grain: 0.3 });
        f.circle(a, 1.9, 0.16, rng.pick(SKIN), { layer: 1, seg: 7, grain: 0 });
      }
    }
  }, 0.3);
  // the chimney
  pen.obj(() => {
    pen.box(CX0, TY1, 0, CW, CW, CH, CHIM, { top: C.charcoal });
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, CX0, TY1, 0, CW, CW);
      f.rect(0, 0, CW, 1.0, BRICK_D, { grain: 0.7 });
      f.rect(0, CH - 1.5, CW, CH, CHIM_L, { grain: 0.6 });
      f.seg(0, CH - 1.5, CW, CH - 1.5, { w: W_FINE });
      for (const a of [0.8, CW - 0.8]) f.seg(a, 1.2, a, CH - 1.8, { w: 0.07, color: BRICK_D, kind: L_MARK, wobble: 0.3 });
      bricks(f, 0.2, 1.2, CW - 0.2, CH - 1.7, BRICK_D, 0.3);
    }
  }, 0.45);
  // the light box on top of it, and lamps at its foot to pick it out after dark
  pen.obj(() => {
    pen.box(CX0 + 0.4, TY1 + 0.4, CH, CW - 0.8, CW - 0.8, 1.9, C.glassPale, { top: null, glow: 1, grain: 0.2, w: W_THIN });
    pen.box(CX0 + 0.3, TY1 + 0.3, CH + 1.9, CW - 0.6, CW - 0.6, 0.18, C.stone, { w: W_FINE });
    pen.stroke(
      [
        [CX0 + CW / 2, TY1 + CW / 2, CH + 1.0],
        [CX0 + CW / 2, TY1 + CW / 2 + 0.02, CH + 1.0],
      ],
      { kind: L_LIGHT, w: 5, alpha: 0.22, wobble: 0 },
    );
    for (const [x, y] of [
      [CX0 + CW / 2, TY1 + CW + 0.35],
      [CX0 + CW + 0.35, TY1 + CW / 2],
    ]) {
      pen.stroke(
        [
          [x, y, 1.3],
          [x, y + 0.02, 1.3],
        ],
        { kind: L_LIGHT, w: 3.2, alpha: 0.22, wobble: 0 },
      );
    }
  }, 0.7);
  // banners for the show that is on, hung over the doors
  const banner = (a: number, rgb: RGB, word: string) => {
    pen.obj(() => {
      const p = pen.plane([TX0 + a, TY1 + 0.14, 3.0], [1, 0, 0], [0, 0, 1], 0, true);
      p.rect(0, 0, 1.3, 5.2, rgb, { outline: true, w: W_FINE, sway: 0.07, grain: 0.5 });
      [...word].forEach((ch, i) => p.text(ch, 0.65, 3.9 - i * 1.2, 0.74, { align: "c", color: C.white, kind: L_MARK, w: 0.1, wobble: 0.2, sway: 0.07, layer: 1 }));
    }, 0.5);
  };
  banner(5.85, MAGENTA, "ART");
  banner(15.25, C.yellow, "NOW");
  // plant on the roof
  pen.obj(() => {
    pen.box(TX0 + 0.5, TY0 + 0.4, TH, 1.6, 1.0, 0.7, C.grey, { w: W_THIN, top: C.greyDark });
    pen.box(TX1 - 2.2, TY0 + 0.4, TH, 1.6, 1.0, 0.7, C.grey, { w: W_THIN, top: C.greyDark });
  }, 0.2);
}

// ---------------------------------------------------------------- greenery

/** A birch: a thin white trunk flecked with black, and a light, lumpy crown that moves in the wind. */
function birch(pen: Pen, rng: Rng, x: number, y: number): void {
  const h = rng.range(3.3, 4.2);
  pen.begin();
  pen.pole([x, y, 0], [x, y, h + 0.5], 0.17, C.white);
  const t = pen.card(x, y, 0);
  for (let k = 0; k < 4; k++) {
    const b = 0.5 + (k * (h - 0.4)) / 4 + rng.range(-0.15, 0.15);
    t.seg(-0.08, b, 0.07, b + 0.05, { w: 0.05, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 2 });
  }
  const k = pen.card(x, y, h);
  const sway = rng.range(0.25, 0.4);
  const col = rng.pick([C.leaf3, C.grassLight, C.leaf3, C.leaf]);
  const p1 = rng.range(0, 6.28);
  const p2 = rng.range(0, 6.28);
  const pts: V2[] = [];
  for (let i = 0; i < 20; i++) {
    const th = (i / 20) * Math.PI * 2;
    const r = 1 + 0.13 * Math.sin(3 * th + p1) + 0.08 * Math.sin(5 * th + p2);
    pts.push([Math.cos(th) * 0.95 * r, 1.25 + Math.sin(th) * 1.45 * r]);
  }
  k.poly(pts, col, { outline: true, w: 0.09, sway, layer: 1 });
  for (let i = 0; i < 4; i++) {
    const a = rng.range(-0.5, 0.5);
    const b = rng.range(0.5, 2.1);
    k.seg(a - 0.2, b, a + 0.18, b - 0.12, { w: 0.06, color: C.leaf2, kind: L_MARK, sway, layer: 2, wobble: 0 });
  }
  pen.end();
}

// ---------------------------------------------------------------- the old corner: three houses and a pub

/** A tall narrow house of the old riverside: sashes, a door up a step, tiles behind a parapet. Front on +y. */
function oldHouse(pen: Pen, rng: Rng, w: number, h: number, wall: RGB, trim: RGB, door: RGB, floors: number, plaque: boolean): void {
  const d = 6;
  const ground = 2.6;
  const fh = (h - ground - 0.55) / floors;
  pen.begin();
  pen.box(0, 0, 0, w, d, h, wall, { top: C.charcoal });
  pen.gable(0.15, 0.4, h, w - 0.3, d - 0.8, 1.45, "x", C.tile, { gable: wall, w: W_THIN });
  pen.box(w - 0.8, d * 0.3, h + 0.2, 0.55, 0.9, 1.7, C.brickDark, { w: W_THIN, top: C.charcoal });
  for (const q of [0.25, 0.65]) pen.cyl(w - 0.52, d * 0.3 + q, h + 1.9, 0.13, 0.32, C.tile, { seg: 6, w: 0.04 });
  const f = pen.wall("y+", 0, 0, 0, w, d);
  const cw = (w - 0.7) / 2;
  for (let k = 0; k < floors; k++) {
    for (let q = 0; q < 2; q++) {
      const a0 = 0.35 + q * cw + 0.14;
      windowAt(f, a0, ground + k * fh + 0.35, a0 + cw - 0.28, ground + k * fh + fh * 0.84, rng.chance(0.62), trim);
    }
  }
  f.block(0.25, 0, 1.55, 0.25, 0.5, C.stone, { w: W_FINE });
  f.rect(0.4, 0.25, 1.4, 2.2, door, { outline: true, w: W_THIN, layer: 1 });
  f.circle(1.22, 1.2, 0.06, C.gold, { layer: 2, seg: 6, grain: 0 });
  windowAt(f, 1.8, 0.8, w - 0.4, 2.2, rng.chance(0.62), trim);
  f.rect(0, h - 0.5, w, h - 0.22, trim, { grain: 0.3, layer: 1 });
  f.seg(0, h - 0.5, w, h - 0.5, { w: W_FINE, layer: 1 });
  // somebody famous is said to have lodged here
  if (plaque) f.circle(w - 0.75, 2.75, 0.24, C.royal, { outline: true, w: 0.04, layer: 2, seg: 10, grain: 0.2 });
  pen.end();
}

function oldCorner(c: LondonCtx): void {
  const { pen, rng } = c;
  // the houses run north from the pub along the west side, their fronts to the lawn
  pen.push(5, 36.2, 0, 270);
  const row: [number, number, RGB, RGB, RGB, number, boolean][] = [
    [3.2, 8.4, C.brick, C.cream, C.door, 3, false],
    [3.5, 10.6, C.stucco, C.white, C.doorRed, 4, true],
    [3.2, 9.1, C.soot, C.cream, C.doorBlue, 3, false],
  ];
  let x = 0;
  for (const [w, h, wall, trim, door, floors, plaque] of row) {
    pen.push(x, 0, 0);
    oldHouse(pen, rng, w, h, wall, trim, door, floors, plaque);
    pen.pop();
    x += w;
  }
  // a window cleaner up his ladder at the tall one
  pen.obj(() => {
    const foot = 7.35;
    const top = 6.12;
    const reach = 6.4;
    for (const lx of [5.55, 5.95]) {
      pen.stroke(
        [
          [lx, foot, 0],
          [lx, top, reach],
        ],
        { w: 0.07, color: C.wood, kind: L_BAR, wobble: 0 },
      );
    }
    for (let z = 0.6; z < reach; z += 0.55) {
      const ly = foot + ((top - foot) * z) / reach;
      pen.stroke(
        [
          [5.55, ly, z],
          [5.95, ly, z],
        ],
        { w: 0.05, color: C.wood, kind: L_BAR, wobble: 0 },
      );
    }
    const lk = randomLook(rng);
    lk.top = C.white;
    person(pen, 5.75, foot + ((top - foot) * 3.6) / reach + 0.12, 3.6, lk, "wave", true, 0.9);
    pen.box(5.2, 7.5, 0, 0.36, 0.36, 0.34, C.blue, { top: C.white, w: W_FINE });
  });
  pen.pop();

  // The Anchor, with its tables out on the deck
  pen.push(4.6, 36.6, 0);
  pub(pen, rng, "THE ANCHOR", { w: 8, d: 7, floors: 2, tiles: C.ironGreen });
  pen.pop();
  const tables: [number, number, RGB | null][] = [
    [14.2, 37.9, C.red],
    [16.4, 38.5, null],
    [14.2, 40.4, null],
    [16.4, 41.0, C.yellow],
    [15.0, 42.75, null],
  ];
  for (const [tx, ty, par] of tables) cafeTable(pen, rng, tx, ty, par, rng.int(2, 5));
  // someone bringing the drinks out
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.top = C.white;
    lk.legs = C.black;
    person(pen, 15.35, 39.45, 0, lk, "stand", true);
    const k = pen.card(15.35, 39.45, 0, true);
    k.rect(0.3, 1.28, 0.95, 1.36, C.metal, { outline: true, w: 0.035, layer: 5, grain: 0 });
    for (const a of [0.42, 0.62, 0.82]) k.rect(a - 0.07, 1.36, a + 0.07, 1.62, C.ochre, { layer: 6, grain: 0 });
  });
  // a busker has set up where the deck meets the grass
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.hat = C.black;
    person(pen, 19.4, 37.4, 0, lk, "stand", true);
    const k = pen.card(19.4, 37.4, 0, true);
    k.ellipse(0.1, 0.98, 0.36, 0.25, C.ochre, { outline: true, w: W_FINE, layer: 5, seg: 9 });
    k.circle(0.1, 0.98, 0.1, C.woodDark, { layer: 6, seg: 6, grain: 0 });
    k.bar(0.34, 1.08, 0.86, 1.4, 0.08, C.woodDark, { layer: 5 });
    pen.box(19.0, 38.2, 0, 0.9, 0.42, 0.14, C.charcoal, { top: C.red, w: W_FINE });
  });
  for (const [px, py] of [
    [20.6, 37.9],
    [20.3, 38.7],
    [21.0, 38.6],
  ]) {
    person(pen, px, py, 0, randomLook(rng), "bust", true, rng.chance(0.4) ? 0.72 : 1);
  }
  // fairy lights from the pub out over the tables
  lightString(pen, [12.7, 38.2, 3.3], [18.5, 36.0, 3.6], 9, 0.5);
  lightString(pen, [12.7, 42.4, 3.3], [18.6, 43.0, 3.7], 9, 0.5);
}

/** The gravel garden west of the Tate: a grove of birches, a coffee stall, somewhere to sit. */
function birchGarden(c: LondonCtx): void {
  const { pen, rng } = c;
  // (the old houses and the end of the Tate stand in front of much of this garden:
  // the stall, the bench and the people are put where they can be seen between the two)
  for (const [x, y] of [
    [6.3, 7.6],
    [9.6, 9.4],
    [12.0, 7.4],
    [8.2, 12.8],
    [11.6, 13.6],
    [5.5, 19.2],
    [10.4, 17.4],
    [5.8, 23.6],
  ]) {
    birch(pen, rng, x, y);
  }
  pen.push(9.0, 20.0, 0);
  stall(pen, rng, { w: 3.3, d: 2.0, a: C.teal, sign: "COFFEE", goods: [C.white, hex("#8b5a3c"), C.cream] });
  pen.pop();
  for (const [x, y] of [
    [9.8, 23.2],
    [10.9, 23.5],
    [12.0, 23.1],
  ]) {
    person(pen, x, y, 0, randomLook(rng), "stand", rng.chance(0.5));
  }
  bench(pen, 7.0, 16.6, 0);
  person(pen, 6.7, 16.65, 0.42, randomLook(rng), "sit");
  person(pen, 7.5, 16.65, 0.42, randomLook(rng), "sit", true);
  person(pen, 5.6, 13.7, 0, randomLook(rng), "stand", true);
  pen.obj(() => {
    person(pen, 7.3, 19.4, 0, randomLook(rng), "wave");
    dogOn(pen.card(8.2, 19.7, 0), hex("#3b3531"), { s: 0.8 });
  });
  lamp(pen, 13.0, 25.3);
  lamp(pen, 4.9, 12.0);
}

// ---------------------------------------------------------------- the lawn

/** Someone lying flat out, head to the left: sunbathers, and children on their way down the hummock. */
function lying(k: Plane, lk: Look, s = 1): void {
  k.bar(-0.42 * s, 0.2 * s, 0.14 * s, 0.2 * s, 0.3 * s, lk.top);
  k.bar(0.14 * s, 0.18 * s, 0.66 * s, 0.16 * s, 0.2 * s, lk.legs);
  k.circle(-0.64 * s, 0.25 * s, 0.2 * s, lk.skin, { outline: true, w: 0.04, seg: 8, layer: 2, grain: 0.4 });
  k.ellipse(-0.68 * s, 0.31 * s, 0.21 * s, 0.17 * s, lk.hair, { layer: 3, seg: 7, a0: 0.4, a1: Math.PI + 0.5, grain: 0.4 });
}

/** A painter's easel, with the picture so far: a brown block and its chimney. */
function easel(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    const k = pen.card(x, y, 0);
    for (const a of [-0.36, 0.36, 0.05]) k.seg(a, 0, 0, 1.95, { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 });
    k.rect(-0.44, 0.85, 0.44, 1.78, C.white, { outline: true, w: W_FINE, layer: 1, grain: 0.2 });
    k.rect(-0.32, 1.0, 0.32, 1.2, BRICK, { layer: 2, grain: 0 });
    k.rect(-0.05, 1.2, 0.06, 1.66, BRICK, { layer: 2, grain: 0 });
    k.rect(-0.32, 0.92, 0.32, 1.0, C.grass, { layer: 2, grain: 0 });
  });
}

/** A picnic rug with people sitting on it. */
function picnic(pen: Pen, rng: Rng, x: number, y: number, rug: RGB, n: number): void {
  pen.obj(() => {
    const g = pen.floor(0, 2);
    g.rect(x, y, x + 2.3, y + 1.7, rug, { outline: true, w: W_FINE, grain: 0.6 });
    g.seg(x + 0.2, y + 0.85, x + 2.1, y + 0.85, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.3, layer: 1 });
    g.seg(x + 1.15, y + 0.15, x + 1.15, y + 1.55, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.3, layer: 1 });
    pen.box(x + 1.0, y + 0.7, 0, 0.45, 0.32, 0.3, C.wood, { w: W_FINE, top: C.woodDark });
  });
  const seats: V2[] = [
    [0.45, 0.5],
    [1.85, 0.55],
    [0.5, 1.3],
    [1.8, 1.35],
  ];
  for (let i = 0; i < n; i++) person(pen, x + seats[i][0], y + seats[i][1], 0, randomLook(rng), "bust", i % 2 === 1, rng.chance(0.25) ? 0.72 : 1);
}

function lawnLife(c: LondonCtx): void {
  const { pen, rng } = c;
  // (the corner of the lawn behind the Globe is hidden by it, so only birches stand there)
  for (const [x, y] of [
    [13.0, 29.6],
    [18.7, 35.3],
    [29.4, 38.9],
    [23.7, 40.7],
    [28.7, 43.0],
    [20.4, 43.1],
    [29.5, 30.7],
    [31.9, 29.3],
    [28.6, 33.6],
  ]) {
    birch(pen, rng, x, y);
  }
  // three painters at work on the same view
  for (const [x, y] of [
    [14.6, 28.6],
    [17.2, 28.8],
    [19.9, 28.5],
  ]) {
    const lk = randomLook(rng);
    person(pen, x, y, 0, lk, "wave", false);
    if (rng.chance(0.6)) hat(pen, x, y, 0, "cap", { color: C.black });
    easel(pen, x + 0.62, y - 0.62);
  }
  // the school party: clipboards out, drawing the chimney
  pen.obj(() => {
    const teacher = randomLook(rng);
    person(pen, 25.0, 28.9, 0, teacher, "wave");
  });
  const kids: V2[] = [];
  for (const y of [29.9, 30.7, 31.5]) for (const x of [24.2, 25.0, 25.8]) kids.push([x + rng.range(-0.06, 0.06), y + rng.range(-0.06, 0.06)]);
  for (const [x, y] of kids) {
    pen.obj(() => {
      const lk = randomLook(rng);
      lk.top = C.hivis;
      const flip = rng.chance(0.5);
      person(pen, x, y, 0, lk, "bust", flip, 0.75);
      pen.card(x, y, 0, flip).rect(0.1, 0.18, 0.4, 0.5, C.white, { outline: true, w: 0.035, layer: 5, grain: 0 });
    });
  }
  person(pen, 26.6, 28.4, 0, randomLook(rng), "stand", true);
  // picnics, and people asleep in the sun
  picnic(pen, rng, 13.1, 31.0, C.red, 2);
  picnic(pen, rng, 14.0, 33.9, C.blue, 3);
  picnic(pen, rng, 25.2, 35.8, C.yellow, 3);
  picnic(pen, rng, 19.3, 39.6, C.pink, 2);
  picnic(pen, rng, 26.3, 40.7, C.teal, 4);
  for (const [x, y, flip] of [
    [27.4, 38.6, false],
    [22.5, 42.6, true],
    [16.3, 31.0, true],
  ] as const) {
    pen.obj(() => lying(pen.card(x, y, 0, flip), randomLook(rng)));
  }
  // the dog's owner, waiting for it to tire
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 26.5, 39.4, 0, lk, "stand", true);
    pen.card(26.5, 39.4, 0, true).seg(0.42, 0.86, 0.5, 0.35, { w: 0.04, color: C.red, kind: L_BAR, wobble: 0, layer: 4 });
  });
  // children waiting their turn at the foot of the hummock
  person(pen, 17.6, 33.9, 0, randomLook(rng), "cheer", false, 0.68);
  person(pen, 17.2, 32.7, 0, randomLook(rng), "stand", false, 0.72);
  person(pen, 16.6, 33.3, 0, randomLook(rng), "stand", true);
  // lights strung through the birches for the evening
  lightString(pen, [23.7, 40.7, 3.9], [28.7, 43.0, 3.9], 8, 0.6);
  lightString(pen, [23.7, 40.7, 3.9], [20.4, 43.1, 3.9], 6, 0.5);
}

// ---------------------------------------------------------------- the forecourt

/** The ice-cream van: white and pink, a hatch in its side and a cone on its roof. Nose towards local +x. */
function iceCreamVan(pen: Pen): void {
  pen.begin();
  van(pen, C.white, C.pink);
  const f = pen.wall("y+", -2.4, -0.975, 0.3, 4.8, 1.95, 2);
  f.rect(0.6, 0.95, 2.9, 1.72, C.glassLight, { outline: true, w: W_FINE, glow: 1, grain: 0.3 });
  f.text("ICES", 1.75, 0.16, 0.3, { align: "c", color: C.red, kind: L_MARK, w: 0.06, wobble: 0.3 });
  const aw = pen.plane([-1.8, 0.975, 2.12], [1, 0, 0], [0, 0.8, -0.35], 0, true);
  for (let i = 0; i < 5; i++) aw.rect(i * 0.46, 0, (i + 1) * 0.46, 1, i % 2 === 0 ? C.pink : C.white, { grain: 0.5 });
  aw.loop(
    [
      [0, 0],
      [2.3, 0],
      [2.3, 1],
      [0, 1],
    ],
    { w: W_FINE },
  );
  const k = pen.card(-0.9, 0, 2.15);
  k.poly(
    [
      [-0.24, 0.62],
      [0.24, 0.62],
      [0, 0],
    ],
    C.ochre,
    { outline: true, w: W_FINE },
  );
  k.circle(0, 0.82, 0.3, C.pink, { outline: true, w: W_FINE, layer: 1, seg: 9 });
  k.seg(0.06, 0.88, 0.3, 1.28, { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 2 });
  pen.end();
}

/** This season's sculpture on the river side: a red hoop, a blue ball, and nobody quite sure. */
function sculpture(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    // (it stands clear of the Tate's corner, which would otherwise hide half of it)
    pen.box(40.4, 7.9, 0, 1.8, 1.6, 0.45, C.portland, { w: W_THIN });
    const k = pen.card(41.3, 8.7, 0.45);
    k.circle(0, 1.75, 1.55, null, { ink: C.red, w: 0.42, seg: 22 });
    k.bar(-0.8, 0, -0.5, 0.42, 0.3, C.red);
    k.bar(0.8, 0, 0.5, 0.42, 0.3, C.red);
    k.circle(0.3, 1.45, 0.5, C.royal, { outline: true, w: W_FINE, layer: 1, seg: 12 });
  });
  person(pen, 41.1, 10.7, 0, randomLook(rng), "stand");
  person(pen, 42.1, 11.5, 0, randomLook(rng), "wave", true);
  person(pen, 42.5, 10.3, 0, randomLook(rng), "stand", true, 0.72);
  snapper(pen, 41.4, 12.3, randomLook(rng), true);
}

function forecourtLife(c: LondonCtx): void {
  const { pen, rng } = c;
  for (const x of [17.4, 22.8, 33.6, 40.6]) lamp(pen, x, 27.05);
  bench(pen, 20.1, 26.7, 0);
  person(pen, 19.8, 26.75, 0.42, randomLook(rng), "sit");
  bin(pen, 24.6, 26.9);
  // a guide, flag up, and the party that follows her
  pen.obj(() => {
    const guide = randomLook(rng);
    guide.top = C.red;
    person(pen, 22.3, 25.3, 0, guide, "wave");
    const k = pen.card(22.3, 25.3, 0);
    k.seg(0.64, 1.86, 0.7, 3.0, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
    k.poly(
      [
        [0.7, 3.0],
        [1.3, 2.8],
        [0.7, 2.6],
      ],
      C.yellow,
      { outline: true, w: W_FINE, layer: 5, sway: 0.2 },
    );
  });
  for (const [x, y] of scatter(rng, 20.6, 25.7, 23.9, 26.7, 6, 0.75)) {
    const lk = randomLook(rng);
    if (rng.chance(0.4)) snapper(pen, x, y, lk, false);
    else person(pen, x, y, 0, lk, "stand", rng.chance(0.5));
  }
  // people going in and coming out
  person(pen, 25.0, 25.6, 0, randomLook(rng), "stand");
  person(pen, 32.6, 25.9, 0, randomLook(rng), "wave", true);
  person(pen, 33.4, 26.2, 0, randomLook(rng), "stand", true, 0.72);
  // the ice-cream van and its queue
  pen.push(37.5, 25.6, 0);
  iceCreamVan(pen);
  pen.pop();
  for (let i = 0; i < 6; i++) {
    const small = i % 2 === 0;
    person(pen, 35.5 + i * 0.72, 27.3 + (i % 2) * 0.22, 0, randomLook(rng), i === 3 ? "wave" : "stand", i > 2, small ? 0.7 : 1);
  }
  pen.obj(() => {
    // one who has been served
    const lk = randomLook(rng);
    person(pen, 40.3, 28.4, 0, lk, "wave", false, 0.72);
    const k = pen.card(40.3, 28.4, 0);
    k.poly(
      [
        [0.4, 1.36],
        [0.52, 1.36],
        [0.46, 1.16],
      ],
      C.ochre,
      { layer: 5, grain: 0 },
    );
    k.circle(0.46, 1.42, 0.09, C.pink, { layer: 6, seg: 6, grain: 0 });
  });
  // a family with a pram
  pen.obj(() => {
    person(pen, 41.6, 29.3, 0, randomLook(rng), "stand");
    person(pen, 42.4, 29.0, 0, randomLook(rng), "stand", true);
    const k = pen.card(41.0, 29.75, 0);
    k.rect(-0.35, 0.35, 0.3, 0.75, C.navy, { outline: true, w: W_FINE, grain: 0.4 });
    k.ellipse(-0.1, 0.75, 0.3, 0.26, C.navy, { outline: true, w: W_FINE, a0: 0, a1: Math.PI, seg: 7, layer: 1 });
    for (const a of [-0.25, 0.2]) k.circle(a, 0.16, 0.15, null, { w: 0.05, seg: 7 });
  });
  // people photographing the chimney from where it fits in the frame
  snapper(pen, 38.4, 29.5, randomLook(rng), true);
  snapper(pen, 39.4, 30.3, randomLook(rng), true);
  // the bubble man, his two sticks and a loop of rope, and the children who follow him about
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.hat = C.purple;
    person(pen, 22.0, 28.4, 0, lk, "cheer");
    const k = pen.card(22.0, 28.4, 0);
    k.seg(-0.6, 1.9, -0.85, 2.8, { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
    k.seg(0.6, 1.9, 0.85, 2.8, { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
    k.line(
      [
        [-0.85, 2.8],
        [-0.3, 2.45],
        [0.3, 2.45],
        [0.85, 2.8],
      ],
      { w: 0.035, color: C.white, kind: L_MARK, wobble: 0, layer: 5 },
    );
    pen.cyl(22.75, 28.75, 0, 0.22, 0.34, C.blue, { seg: 7, w: W_FINE, top: C.glassPale });
  });
  person(pen, 20.9, 29.5, 0, randomLook(rng), "cheer", false, 0.68);
  person(pen, 23.2, 29.4, 0, randomLook(rng), "wave", true, 0.66);
  person(pen, 21.9, 30.0, 0, randomLook(rng), "cheer", true, 0.7);
  // pigeons after the crumbs
  for (const [x, y, peck] of [
    [18.2, 25.2, true],
    [18.9, 25.9, false],
    [17.6, 26.3, true],
    [26.4, 26.0, false],
    [34.4, 24.2, true],
    [41.2, 26.2, false],
    [41.9, 25.4, true],
  ] as const) {
    pigeon(pen, x, y, 0, rng.chance(0.5), peck);
  }
}

// ---------------------------------------------------------------- the Globe

const bayAngle = (k: number) => (k / BAYS) * Math.PI * 2;
const ring = (r: number, k: number, z = 0): V3 => [GX + Math.cos(bayAngle(k)) * r, GY + Math.sin(bayAngle(k)) * r, z];
/** The bays on the camera's side are left out, so the yard and the stage can be seen. */
const cutAway = (k: number) => k <= 5 || k === 19;
const S = Math.SQRT1_2;
/** From the playhouse's own frame (x towards the camera, y along the front of the stage) to the block's. */
const fromStage = (xf: number, yf: number): V2 => [GX + (xf - yf) * S, GY + (xf + yf) * S];

/** The inside of one bay: three galleries, a rail along each, and the people in them. */
/** How high each of the three galleries' floors is. */
const TIERS = [0.55, 2.1, 3.65];

function gallery(f: Plane, rng: Rng, w: number): void {
  for (const b0 of TIERS) {
    f.rect(0.1, b0, w - 0.1, b0 + 1.3, TIMBER, { glow: 0.7, grain: 0.6 });
    for (const a of [w * 0.3, w * 0.7]) {
      if (rng.chance(0.15)) continue;
      f.rect(a - 0.17, b0 + 0.22, a + 0.17, b0 + 0.64, rng.pick(SHIRT), { layer: 1, grain: 0.3 });
      f.circle(a, b0 + 0.8, 0.15, rng.pick(SKIN), { layer: 2, seg: 7, grain: 0 });
    }
    f.rect(0.04, b0 - 0.04, w - 0.04, b0 + 0.3, C.wood, { layer: 3, grain: 0.5 });
    f.seg(0.04, b0 + 0.3, w - 0.04, b0 + 0.3, { w: 0.05, layer: 3 });
  }
}

/** The outside of one bay: plaster between oak timbers. */
function timbers(f: Plane, rng: Rng, w: number): void {
  const o = { w: 0.1, color: TIMBER, kind: L_MARK, wobble: 0.2 };
  for (const b of [0.35, 1.9, 3.55, GH - 0.25]) f.seg(0, b, w, b, o);
  f.seg(w / 2, 0.35, w / 2, GH - 0.25, o);
  f.seg(0.05, 0.35, w / 2, 1.9, o);
  f.seg(w - 0.05, 0.35, w / 2, 1.9, o);
  windowAt(f, w * 0.14, 2.3, w * 0.42, 3.2, rng.chance(0.7), TIMBER, false);
  windowAt(f, w * 0.58, 3.9, w * 0.86, 4.8, rng.chance(0.7), TIMBER, false);
}

/** One bay of the ring, with its strip of thatch. */
function bay(pen: Pen, rng: Rng, k: number): void {
  const A0 = ring(R_IN, k);
  const A1 = ring(R_IN, k + 1);
  const B0 = ring(R_OUT, k);
  const B1 = ring(R_OUT, k + 1);
  const up = (p: V3): V3 => [p[0], p[1], GH];
  const unit = (p: V3, q: V3): V3 => {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [(q[0] - p[0]) / l, (q[1] - p[1]) / l, 0];
  };
  const Z: V3 = [0, 0, 1];
  pen.begin();
  pen.solid(
    [A0, A1, B1, B0, up(A0), up(A1), up(B1), up(B0)],
    [
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
      [4, 5, 6, 7],
    ],
    WHITE,
    { w: 0.09 },
  );
  // the galleries face the yard; the outside is timber and plaster (a plane that faces away draws nothing)
  gallery(pen.plane(A1, unit(A1, A0), Z), rng, Math.hypot(A1[0] - A0[0], A1[1] - A0[1]));
  timbers(pen.plane(B0, unit(B0, B1), Z), rng, Math.hypot(B1[0] - B0[0], B1[1] - B0[1]));
  // where the ring has been cut through, the frame shows in section
  const section = (f: Plane) => {
    const w = R_OUT - R_IN;
    for (const b of TIERS) f.seg(0, b, w, b, { w: 0.12, color: TIMBER, kind: L_MARK, wobble: 0.2 });
    f.seg(w / 2, 0, w / 2, GH, { w: 0.08, color: TIMBER, kind: L_MARK, wobble: 0.2 });
  };
  if (cutAway((k + BAYS - 1) % BAYS)) section(pen.plane(A0, unit(A0, B0), Z));
  if (cutAway((k + 1) % BAYS)) section(pen.plane(B1, unit(B1, A1), Z));
  // thatch: up from the outer eave to a ridge, and down again to the yard
  const m = (R_IN + R_OUT) / 2;
  pen.solid(
    [ring(R_OUT + 0.3, k, GH - 0.15), ring(m, k, GH + 1.3), ring(R_IN - 0.25, k, GH), ring(R_OUT + 0.3, k + 1, GH - 0.15), ring(m, k + 1, GH + 1.3), ring(R_IN - 0.25, k + 1, GH)],
    [
      [0, 3, 4, 1],
      [1, 4, 5, 2],
      [0, 1, 2],
      [3, 5, 4],
      [0, 2, 5, 3],
    ],
    THATCH,
    { w: 0.08 },
  );
  pen.stroke([ring(m, k, GH + 1.32), ring(m, k + 1, GH + 1.32)], { w: 0.14, color: THATCH_D, kind: L_MARK, wobble: 0.3 });
  pen.end();
}

/** A round-headed doorway. */
function archShape(a0: number, b0: number, a1: number, b1: number): V2[] {
  const r = (a1 - a0) / 2;
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, b1 - r],
  ];
  for (let k = 1; k < 6; k++) {
    const t = (k / 6) * Math.PI;
    pts.push([a0 + r + Math.cos(t) * r, b1 - r + Math.sin(t) * r]);
  }
  pts.push([a0, b1 - r]);
  return pts;
}

/** The stage: a platform thrust into the yard, the tiring-house wall behind it, and the roof they call the heavens. */
function stage(pen: Pen): void {
  pen.push(GX, GY, 0, 45);
  pen.obj(() => {
    // the wall the players come and go through
    const w = STAGE_W * 2;
    pen.box(STAGE_B - 0.55, -STAGE_W, 0, 0.55, w, GH - 0.3, WHITE, { w: W_THIN });
    const f = pen.wall("x+", STAGE_B - 0.55, -STAGE_W, 0, 0.55, w);
    f.rect(0.05, STAGE_H, w - 0.05, STAGE_H + 2.2, WHITE, { glow: 0.5, grain: 0.4 });
    for (const a of [0.5, w - 1.45]) f.poly(archShape(a, STAGE_H, a + 0.95, STAGE_H + 1.9), TIMBER, { outline: true, w: W_FINE, grain: 0.5, layer: 1 });
    f.rect(w / 2 - 0.6, STAGE_H, w / 2 + 0.6, STAGE_H + 2.05, C.doorRed, { outline: true, w: W_FINE, grain: 0.5, layer: 1, glow: 0.3 });
    f.seg(w / 2, STAGE_H + 0.05, w / 2, STAGE_H + 2.0, { w: 0.04, color: C.gold, kind: L_MARK, wobble: 0.3, layer: 2 });
    f.seg(0, STAGE_H + 2.25, w, STAGE_H + 2.25, { w: 0.1, color: TIMBER, kind: L_MARK, wobble: 0.2 });
    // the stage itself, its skirt hung with green cloth
    pen.box(STAGE_B, -STAGE_W, 0, STAGE_F - STAGE_B, w, STAGE_H, TIMBER, { top: C.wood, w: 0.09 });
    pen.floor(STAGE_H, 1).rect(STAGE_B + 0.06, -STAGE_W + 0.06, STAGE_F - 0.06, STAGE_W - 0.06, C.wood, { glow: 0.6, grain: 0.6 });
    const s = pen.wall("x+", STAGE_B, -STAGE_W, 0, STAGE_F - STAGE_B, w);
    s.rect(0.06, 0.06, w - 0.06, STAGE_H - 0.1, C.door, { grain: 0.6 });
    const swag: V2[] = [];
    for (let i = 0; i <= 16; i++) swag.push([0.1 + (i * (w - 0.2)) / 16, STAGE_H - 0.2 - Math.abs(Math.sin((i / 4) * Math.PI)) * 0.3]);
    s.line(swag, { w: 0.05, color: C.gold, kind: L_MARK, wobble: 0.2, layer: 1 });
  });
  pen.obj(() => {
    // two painted pillars hold up the heavens
    const hw = STAGE_W + 0.15;
    const hz = GH - 0.3;
    const hx = STAGE_B - 0.55;
    for (const y of [-STAGE_W + 0.75, STAGE_W - 0.75]) {
      pen.cyl(hx + 2.0, y, STAGE_H, 0.17, hz - STAGE_H, hex("#a8523c"), { seg: 8, w: W_FINE });
      pen.box(hx + 1.78, y - 0.22, hz - 0.2, 0.44, 0.44, 0.2, C.gold, { w: 0.04 });
    }
    pen.box(hx, -hw, hz, 2.3, hw * 2, 0.32, C.woodDark, { top: THATCH_D, w: W_THIN });
    const h = pen.wall("x+", hx, -hw, hz, 2.3, hw * 2);
    h.rect(0, 0, hw * 2, 0.32, C.royal, { grain: 0.4 });
    h.ticks(0.15, 0.06, hw * 2 - 0.15, 0.26, { n: 16, len: 0.12, ang: 0.8, jit: 1.5, color: C.gold, w: 0.06, layer: 1 });
    pen.gable(hx, -hw, hz + 0.32, 2.3, hw * 2, 1.5, "x", THATCH, { gable: WHITE, w: 0.08 });
    const g = pen.wall("x+", hx, -hw, hz + 0.32, 2.3, hw * 2);
    g.line(
      [
        [0.25, 0.06],
        [hw, 1.34],
        [hw * 2 - 0.25, 0.06],
      ],
      { w: 0.1, color: TIMBER, kind: L_MARK, wobble: 0.2 },
    );
    g.seg(hw, 0.06, hw, 1.34, { w: 0.1, color: TIMBER, kind: L_MARK, wobble: 0.2 });
    // candles along the front of the stage for the evening house
    for (let y = -STAGE_W + 0.2; y <= STAGE_W - 0.19; y += 0.5) bulb(pen, STAGE_F + 0.05, y, STAGE_H + 0.07, 0.18);
  }, 0.2);
  // a flag over the playhouse means a play today (red for a history)
  flag(pen, STAGE_B + 0.6, 0, GH + 1.5, 3.0, "red", 0.85);
  pen.pop();
}

/** Draws the playhouse and its audience. Returns where the ones who will jump about are standing. */
function globe(c: LondonCtx): V2[] {
  const { pen, rng } = c;
  // the footing of the bays that have been taken away
  c.early(() => {
    const foot: V2[] = [];
    for (let k = 19; k <= 26; k++) foot.push([GX + Math.cos(bayAngle(k)) * (R_OUT + 0.05), GY + Math.sin(bayAngle(k)) * (R_OUT + 0.05)]);
    for (let k = 26; k >= 19; k--) foot.push([GX + Math.cos(bayAngle(k)) * (R_IN - 0.05), GY + Math.sin(bayAngle(k)) * (R_IN - 0.05)]);
    pen.extrude(foot, 0, 0.42, C.stoneDark, { top: C.wood, crease: 30, w: W_THIN });
  });
  // the ring, far side first
  const order: number[] = [];
  for (let k = 0; k < BAYS; k++) if (!cutAway(k)) order.push(k);
  order.sort((a, b) => Math.cos(bayAngle(a + 0.5) - Math.PI / 4) - Math.cos(bayAngle(b + 0.5) - Math.PI / 4));
  order.forEach((k, i) => pen.obj(() => bay(pen, rng, k), i * 0.03));
  // lanterns under the eaves, all round the yard
  pen.obj(() => {
    for (let k = 7; k <= 16; k++) {
      const p = ring(R_IN - 0.14, k + 0.5, GH - 0.25);
      bulb(pen, p[0], p[1], p[2], 0.2);
    }
  }, 0.4);
  stage(pen);

  // the groundlings: a penny to stand in the yard
  const jumpers: V2[] = [];
  const spots = scatter(rng, -3.0, -3.6, 3.6, 3.6, 38, 0.62, (xf, yf) => Math.hypot(xf, yf) < R_IN - 0.35 && (xf > STAGE_F + 0.55 || Math.abs(yf) > STAGE_W + 0.45));
  spots.forEach(([xf, yf], i) => {
    const [x, y] = fromStage(xf, yf);
    if (i % 3 === 0) {
      jumpers.push([x, y]);
      return;
    }
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.14) ? 0.72 : 1);
  });

  // the queue for returns, round the outside, and what is on
  for (let i = 0; i < 6; i++) {
    const th = ((125 + i * 7.5) * Math.PI) / 180;
    person(pen, GX + Math.cos(th) * (R_OUT + 1.2), GY + Math.sin(th) * (R_OUT + 1.2), 0, randomLook(rng), i === 2 ? "wave" : "stand", i % 2 === 0, rng.chance(0.15) ? 0.72 : 1);
  }
  pen.obj(() => {
    const k = pen.card(34.5, 43.7, 0);
    k.seg(-0.5, 0, -0.5, 1.0, { w: 0.07, color: TIMBER, kind: L_BAR, wobble: 0 });
    k.seg(0.5, 0, 0.5, 1.0, { w: 0.07, color: TIMBER, kind: L_BAR, wobble: 0 });
    k.rect(-0.85, 0.75, 0.85, 1.75, C.white, { outline: true, w: W_FINE, layer: 1, grain: 0.2 });
    k.text("TODAY", 0, 1.38, 0.2, { align: "c", w: 0.045, layer: 2, color: C.redDark, kind: L_MARK });
    k.text("HENRY V", 0, 0.9, 0.24, { align: "c", w: 0.055, layer: 2 });
  });
  for (const [x, y] of [
    [42.6, 42.4],
    [41.6, 43.5],
    [43.3, 41.2],
  ]) {
    pigeon(pen, x, y, 0, rng.chance(0.5), rng.chance(0.5));
  }
  return jumpers;
}

// ---------------------------------------------------------------- the foreshore

/** Low tide: mudlarks on the shingle, and a sofa somebody has built out of sand. */
function foreshore(c: LondonCtx): void {
  const { pen, rng } = c;
  const larks: [number, number, Pose, boolean][] = [
    [6.6, -5.5, "stand", false],
    [9.4, -5.8, "sit", true],
    [12.8, -5.4, "stand", true],
    [16.3, -5.7, "wave", false],
    [19.6, -5.4, "stand", true],
    [22.4, -5.7, "sit", false],
  ];
  for (const [x, y, pose, flip] of larks) {
    pen.obj(() => {
      const lk = randomLook(rng);
      lk.legs = C.green;
      person(pen, x, y, pose === "sit" ? BEACH - 0.3 : BEACH, lk, pose, flip);
      pen.cyl(x + (flip ? -0.7 : 0.7), y + 0.2, BEACH, 0.17, 0.3, rng.pick([C.red, C.blue, C.yellow]), { seg: 6, w: 0.04 });
    });
  }
  // the one with the metal detector
  pen.card(12.8, -5.4, BEACH, true).line(
    [
      [0.42, 0.9],
      [0.95, 0.16],
      [1.2, 0.12],
    ],
    { w: 0.05, kind: L_BAR, wobble: 0, layer: 4 },
  );
  // the sand sofa, and the man who made it sitting on his work
  pen.obj(() => {
    pen.box(36.4, -5.75, BEACH, 2.2, 0.8, 0.42, C.sand, { w: W_FINE });
    pen.box(36.4, -6.0, BEACH, 2.2, 0.3, 0.95, C.sand, { w: W_FINE });
    for (const x of [36.25, 38.45]) pen.box(x, -5.95, BEACH, 0.3, 1.0, 0.7, C.sand, { w: W_FINE });
    person(pen, 37.5, -5.3, BEACH + 0.1, randomLook(rng), "sit");
    pen.cyl(39.4, -5.2, BEACH, 0.2, 0.26, C.black, { seg: 7, w: 0.04 });
  });
  person(pen, 41.2, -5.4, BEACH, randomLook(rng), "stand", true);
  person(pen, 42.1, -5.6, BEACH, randomLook(rng), "wave", true, 0.72);
}

// ---------------------------------------------------------------- everything that moves

type Sword = "out" | "up" | "down" | null;

/** A player in doublet, ruff and feathered cap, with a rapier out, raised, or hanging at the hip. */
function player(pen: Pen, lk: Look, pose: Pose, flip: boolean, sword: Sword, plume: RGB): void {
  person(pen, 0, 0, 0, lk, pose, flip);
  const k = pen.card(0, 0, 0, flip);
  const top = pose === "sit" ? 1.93 : 2.22;
  const neck = pose === "sit" ? 1.2 : 1.47;
  k.ellipse(0, neck, 0.3, 0.1, C.white, { outline: true, w: 0.035, layer: 4, seg: 8, grain: 0 });
  k.poly(
    [
      [-0.44, top - 0.12],
      [0.44, top - 0.12],
      [0.3, top + 0.12],
      [-0.3, top + 0.12],
    ],
    lk.legs,
    { outline: true, w: W_FINE, layer: 6 },
  );
  k.line(
    [
      [0.2, top + 0.08],
      [0.48, top + 0.52],
      [0.74, top + 0.46],
    ],
    { w: 0.07, color: plume, kind: L_MARK, wobble: 0, layer: 7 },
  );
  const steel = { w: 0.085, color: C.white, kind: L_BAR, wobble: 0, layer: 5 };
  if (sword === "out") {
    k.bar(0.34, 1.3, 0.8, 1.38, 0.17, lk.top, { layer: 4 });
    k.seg(0.8, 1.38, 1.8, 1.52, steel);
  } else if (sword === "up") k.seg(0.64, 1.86, 1.22, 2.78, steel);
  else if (sword === "down") k.seg(0.4, 0.9, 0.95, 0.22, steel);
}

function motion(c: LondonCtx, cheerAt: V2[]): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;

  // ---- the play. Most of the time they declaim; every so often it comes to swords. On the tour, as the camera arrives.
  const ROUND = 21;
  const FIGHT = 5.6;
  const playAt = (t: number): number => {
    const at = c.visit();
    const t0 = at == null ? born + 3 : at - 0.9;
    return (((t - t0) % ROUND) + ROUND) % ROUND;
  };
  const hero: Look = { skin: SKIN[1], hair: HAIR[1], top: C.doorRed, legs: C.charcoal, long: false, hat: null };
  const rival: Look = { skin: SKIN[3], hair: HAIR[0], top: C.royal, legs: C.brickBrown, long: false, hat: null };
  const lady: Look = { skin: SKIN[0], hair: HAIR[5], top: C.purple, legs: C.purple, long: true, hat: null };
  const act = (lk: Look, pose: Pose, flip: boolean, sword: Sword, plume: RGB, seed: number) => makeSprite((p) => player(p, lk, pose, flip, sword, plume), 0, seed);
  const heroIdle = [act(hero, "stand", false, "down", C.white, 61), act(hero, "wave", false, "down", C.white, 61)];
  const heroFight = [act(hero, "walkA", false, "out", C.white, 61), act(hero, "wave", false, "up", C.white, 61)];
  const heroWins = act(hero, "cheer", false, "down", C.white, 61);
  const rivalIdle = [act(rival, "stand", true, "down", C.yellow, 62), act(rival, "wave", true, "down", C.yellow, 62)];
  const rivalFight = [act(rival, "wave", true, "up", C.yellow, 62), act(rival, "walkA", true, "out", C.yellow, 62)];
  const rivalFalls = act(rival, "sit", true, null, C.yellow, 62);
  const dame = (pose: Pose) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, lady, pose);
        p.card(0, 0, 0).poly(
          [
            [-0.56, 0.02],
            [0.56, 0.02],
            [0.34, 0.95],
            [-0.34, 0.95],
          ],
          lady.top,
          { outline: true, w: W_FINE, layer: 1.6, grain: 0.3 },
        );
      },
      0,
      63,
    );
  const ladyF = [dame("stand"), dame("wave"), dame("cheer")];
  const onStage = (xf: number, yf: number): V3 => {
    const [x, y] = fromStage(xf, yf);
    return W(x, y, STAGE_H);
  };
  const ladyAt = onStage(STAGE_B + 1.15, 0.1);
  const mark = STAGE_F - 0.55;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + GX, c.oy + GY, 3, 12)) return;
    const tt = playAt(m.t);
    const beat = Math.floor(m.t * 3.3) & 1;
    if (tt < FIGHT) {
      // one lunges as the other parries, turn and turn about, and they sway up and down the stage
      const drift = Math.sin(m.t * 1.9) * 0.22;
      const a = onStage(mark, 1.0 + drift);
      const b = onStage(mark, -1.0 + drift);
      m.put(heroFight[beat], a[0], a[1], a[2], born);
      m.put(rivalFight[beat], b[0], b[1], b[2], born);
      m.put(ladyF[2], ladyAt[0], ladyAt[1], ladyAt[2], born);
      return;
    }
    const a = onStage(mark, 1.0);
    const b = onStage(mark, -1.0);
    if (tt < FIGHT + 3.4) {
      // the loser is down; the winner takes the applause
      m.put(heroWins, a[0], a[1], a[2], born);
      m.put(rivalFalls, b[0], b[1], b[2] - 0.3, born);
      m.put(ladyF[1], ladyAt[0], ladyAt[1], ladyAt[2], born);
      return;
    }
    m.put(heroIdle[Math.floor(m.t / 1.3) & 1], a[0], a[1], a[2], born);
    m.put(rivalIdle[Math.floor(m.t / 1.3 + 0.5) & 1], b[0], b[1], b[2], born);
    m.put(ladyF[Math.floor(m.t / 2.1) & 1], ladyAt[0], ladyAt[1], ladyAt[2], born);
  });

  // ---- the groundlings who cannot keep still once the swords are out
  const jr = new Rng(55);
  const fans = cheerAt.map(([x, y], i) => {
    const lk = randomLook(jr);
    const flip = jr.chance(0.5);
    return {
      p: W(x, y),
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "cheer"), 0, 31 + i),
      down: makeSprite((p) => person(p, 0, 0, 0, lk, "stand", flip), 0, 31 + i),
      ph: jr.range(0, 6.28),
      w: jr.range(5.5, 7.5),
    };
  });
  c.movers.push((m) => {
    if (m.t < born) return;
    const tt = playAt(m.t);
    const loud = tt > 0.4 && tt < FIGHT + 2.8;
    for (const f of fans) {
      const s = loud ? Math.sin(m.t * f.w + f.ph) : -1;
      m.put(s > 0 ? f.up : f.down, f.p[0], f.p[1], f.p[2] + (s > 0 ? s * 0.5 : 0), born);
    }
  });

  // ---- bubbles off the bubble man's rope, away over the lawn
  const bubble = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      const pts: V2[] = [];
      for (let i = 0; i < 14; i++) pts.push([Math.cos((i / 14) * Math.PI * 2) * 0.5, Math.sin((i / 14) * Math.PI * 2) * 0.5]);
      k.line(pts, { closed: true, w: 0.07, color: BUBBLE, kind: L_MARK, wobble: 0, alpha: 0.9 });
      k.arc(0, 0, 0.32, 0.32, 0.5, 1.5, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0 });
    },
    0,
    301,
  );
  const br = new Rng(5);
  const bubbles: { ph: number; s: number; wob: number; side: number; life: number }[] = [];
  for (let i = 0; i < 13; i++) bubbles.push({ ph: i / 13 + br.range(-0.02, 0.02), s: br.range(0.45, 1.25), wob: br.range(0, 6.28), side: br.range(-1, 1), life: br.range(5.2, 7.2) });
  const hoop = W(22.3, 28.1, 2.6);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(hoop[0] - 2, hoop[1] + 2.5, 4, 14)) return;
    for (const b of bubbles) {
      const u = (((m.t / b.life + b.ph) % 1) + 1) % 1;
      const drift = u * (1.6 - 0.6 * u);
      const x = hoop[0] - 3.6 * drift + Math.sin(u * 7 + b.wob) * 0.45 + b.side * u * 1.2;
      const y = hoop[1] + 5.0 * drift + Math.cos(u * 6 + b.wob) * 0.45 - b.side * u * 0.8;
      const z = hoop[2] + 2.8 * u + Math.sin(u * 9 + b.wob) * 0.25;
      // each one sketches itself in as it leaves the rope, and unsketches when it bursts
      const p = Math.min(u * b.life, ((1 - u) / 0.05) * 0.6);
      m.put(bubble, x, y, z, m.t - p, b.s * Math.min(1, 0.35 + u * 4));
    }
  });

  // ---- children rolling down the hummock, and climbing back up for another go
  const kr = new Rng(77);
  const TURN = 8.4;
  for (let i = 0; i < 3; i++) {
    const lk = randomLook(kr);
    const s = 0.68;
    const roll = [makeSprite((p) => lying(p.card(0, 0, 0), lk, s), 0, 200 + i), makeSprite((p) => lying(p.card(0, 0, 0, true), lk, s), 0, 200 + i)];
    const climb = [makeSprite((p) => person(p, 0, 0, 0, lk, "walkA", true, s), 0, 210 + i), makeSprite((p) => person(p, 0, 0, 0, lk, "walkB", true, s), 0, 210 + i)];
    const ready = makeSprite((p) => person(p, 0, 0, 0, lk, "cheer", false, s), 0, 220 + i);
    const ang = ((18 + i * 34) * Math.PI) / 180;
    const at = (rho: number): V3 => W(MOUND[0] + Math.cos(ang) * rho, MOUND[1] + Math.sin(ang) * rho, rho < MOUND_R ? MOUND_H * Math.sqrt(1 - (rho / MOUND_R) ** 2) : 0);
    const foot = MOUND_R + 0.5;
    c.movers.push((m) => {
      if (m.t < born) return;
      const u = (((m.t + i * 2.8) % TURN) + TURN) % TURN;
      let rho: number;
      let sp: Sprite;
      if (u < 2.0) {
        const e = u / 2.0;
        rho = 0.3 + (foot - 0.3) * e * e;
        sp = roll[Math.floor(u * 5.5) & 1];
      } else if (u < 2.9) {
        rho = foot;
        sp = roll[0];
      } else if (u < 6.0) {
        rho = foot - (foot - 0.3) * ((u - 2.9) / 3.1);
        sp = climb[Math.floor(u * 2.6) & 1];
      } else {
        rho = 0.3;
        sp = ready;
      }
      const p = at(rho);
      m.put(sp, p[0], p[1], p[2] + 0.03, born);
    });
  }

  // ---- a dog doing laps of the lawn
  const coat = hex("#b98352");
  const dogF = [false, true].map((flip) => [0, 1].map((step) => makeSprite((p) => dogOn(p.card(0, 0, 0, flip), coat, { s: 0.85, step }), 0, 400)));
  const oval: V3[] = [];
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2;
    oval.push(W(23.4 + Math.cos(t) * 2.3, 38.6 + Math.sin(t) * 0.9));
  }
  c.movers.push(
    traveler(new Route(oval, true), {
      speed: 3.6,
      at: 0.2,
      born: born + 0.3,
      span: 0.7,
      sprite: (h, t) => dogF[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 9) & 1],
    }),
  );

  // ---- people between the footbridge and the Tate: in at the back, out at the front, and round again
  const way: V2[] = [
    [29.7, 1.3],
    [29.7, 7.3],
    [43.0, 7.3],
    [43.0, 24.1],
    [31.7, 24.1],
    [31.7, 27.5],
    [26.3, 27.5],
    [26.3, 24.1],
    [14.6, 24.1],
    [14.6, 6.5],
    [28.3, 6.5],
    [28.3, 1.3],
  ];
  const there = new Route(rounded(way.map(([x, y]) => W(x, y)), true, 0.5), true);
  const back = new Route(
    rounded(
      way
        .slice()
        .reverse()
        .map(([x, y]) => W(x - 0.45, y - 0.45)),
      true,
      0.5,
    ),
    true,
  );
  for (let i = 0; i < 7; i++) c.movers.push(walker(there, rng, born + rng.range(0, 1.2)));
  for (let i = 0; i < 6; i++) c.movers.push(walker(back, rng, born + rng.range(0, 1.2)));

  // ---- pigeons wheeling round the chimney
  const fly = [false, true].map((flip) => (["up", "down"] as const).map((how) => makeSprite((p) => pigeonOn(p.card(0, 0, 0, flip), how), 0, 4)));
  const pr = new Rng(21);
  const flock: { ph: number; ox: number; oy: number; oz: number }[] = [];
  for (let i = 0; i < 9; i++) flock.push({ ph: pr.range(0, 0.07), ox: pr.range(-1.3, 1.3), oy: pr.range(-1.3, 1.3), oz: pr.range(-0.9, 0.9) });
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 29, c.oy + 25, 16, 16)) return;
    for (const b of flock) {
      const th = (m.t / 9.5 + b.ph) * Math.PI * 2;
      const x = 29 + Math.cos(th) * 5.8 + b.ox;
      const y = 25 + Math.sin(th) * 4.4 + b.oy;
      const z = 16 + Math.sin(th * 2 + 1) * 2.4 + b.oz;
      // which way it is heading across the page
      const right = -Math.sin(th) * 5.8 - Math.cos(th) * 4.4 > 0;
      m.put(fly[right ? 0 : 1][Math.floor(m.t * 9 + b.ph * 90) & 1], c.ox + x, c.oy + y, z, born);
    }
  });

  // ---- notes drifting up from the busker's guitar
  const note = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.ellipse(0, 0, 0.17, 0.12, C.black, { grain: 0, seg: 8 });
      k.seg(0.15, 0.02, 0.15, 0.62, { w: 0.05, kind: L_BAR, wobble: 0 });
      k.seg(0.15, 0.62, 0.4, 0.5, { w: 0.07, kind: L_BAR, wobble: 0 });
    },
    0,
    71,
  );
  const np = W(19.1, 37.6, 2.5);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(np[0], np[1], np[2], 8)) return;
    for (let i = 0; i < 3; i++) {
      const u = (m.t / 3.4 + i / 3) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      const p = Math.min(u * 3.4, ((1 - u) / 0.3) * 1.05);
      m.put(note, np[0] + sx - i * 0.25, np[1] - sx + i * 0.2, np[2] + u * 3.0, m.t - p);
    }
  });
}

// ---------------------------------------------------------------- the block

export const bankside: LondonBuilder = (c) => {
  // a little closer than usual: the chimney's top and the playhouse's foot both still fit
  c.focus(24, 24, 1.06);
  c.early(() => ground(c));
  tate(c);
  birchGarden(c);
  oldCorner(c);
  lawnLife(c);
  forecourtLife(c);
  sculpture(c);
  const jumpers = globe(c);
  foreshore(c);
  motion(c, jumpers);
};
