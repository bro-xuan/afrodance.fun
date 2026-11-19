// The South Bank: the London Eye turning slowly over the river, County Hall's
// stone crescent beside it, a concrete concert hall with skaters under its
// beams, second-hand books on trestle tables, a merry-go-round, a lawn of
// deckchairs, and a man making soap bubbles as big as the children who chase
// them. When the camera arrives he lets a whole cloud of them go at once.

import { RGB, Rng, V2, V3, hex, mixRGB } from "../../engine/math";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, makeSprite, rounded, walker } from "../motion";
import { C, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  archWindow,
  bin,
  bulb,
  bunting,
  cafeTable,
  dog,
  flag,
  hat,
  lamp,
  lightString,
  neonSign,
  person,
  pigeon,
  railing,
  randomLook,
  riverBus,
  snapper,
  speckle,
  stall,
  tree,
  tufts,
  umbrella,
  van,
  windowAt,
  windowGrid,
} from "../props";
import { MoveCtx } from "../types";

/** One unit across a camera-facing card is this far along world x (and minus this along y). */
const K = 1 / (2 * 0.8660254);

// The Eye. The wheel stands in a plane parallel to the river, a little way out over the water.
const EX = 30;
const EY = -2.6;
const EZ = 19.2;
const ER = 15.6;
const PODS = 24;
/** Seconds the wheel takes to go round (the real one takes half an hour). */
const TURN = 40;

// County Hall: the block it stands on, and how high its walls are.
const CH_X = 5.5;
const CH_Y = 6.6;
const CH_W = 17;
const CH_D = 8;
const CH_H = 8.4;

// The concert hall along the west side, and where the skaters' end of it starts.
const AC_X = 5;
const AC_Y = 18.4;
const AC_W = 9;
const AC_D = 25.1;
const SK0 = 27.2;
const CONC = hex("#d5cdbd");
const CONC_L = hex("#e7e1d4");

// The merry-go-round.
const CAR_X = 39;
const CAR_Y = 20.6;
const CAR_R = 3.1;

// Where the performers stand.
const JUGGLER: V2 = [37.4, 28.3];
const STATUE: V2 = [42.2, 28.7];
const BUBBLES: V2 = [26.6, 32.6];

// The lawn of the gardens.
const LAWN: [number, number, number, number] = [20.2, 19.6, 33.6, 29.4];

function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): V2[] {
  const pts: V2[] = [];
  const corners: [number, number, number][] = [
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= 4; k++) {
      const t = a0 + (k / 4) * (Math.PI / 2);
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
  }
  return pts;
}

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g3 = pen.floor(0, 3);
  // the square under the Eye
  g1.rect(4.05, 5.45, 43.95, 16.0, C.plaza, { grain: 0.7 });
  speckle(g3, 23, 6, 43.5, 15.8, C.streetDark, 0.3);
  // the lawn
  g1.poly(roundRect(LAWN[0], LAWN[1], LAWN[2], LAWN[3], 1.6), C.grass, { outline: true, w: W_THIN });
  tufts(g3, LAWN[0] + 0.4, LAWN[1] + 0.4, LAWN[2] - 0.4, LAWN[3] - 0.4, 0.4, (a, b) => {
    // keep the tufts off the rounded corners
    const dx = Math.max(LAWN[0] + 1.6 - a, a - (LAWN[2] - 1.6), 0);
    const dy = Math.max(LAWN[1] + 1.6 - b, b - (LAWN[3] - 1.6), 0);
    return dx * dx + dy * dy < 1.4 * 1.4;
  });
  // smooth concrete where the skaters ride, with what they have painted on it
  g1.rect(14.05, SK0, 18.95, 43.7, hex("#cbc4b6"), { grain: 0.4 });
  const g2 = pen.floor(0, 2);
  g2.line(
    [
      [14.6, 31],
      [16.4, 32.2],
      [15.2, 34.4],
      [17.6, 36.2],
      [16, 38.6],
      [17.8, 41],
    ],
    { w: 0.16, color: C.neonPink, kind: L_MARK, wobble: 1.2, alpha: 0.8 },
  );
  g2.circle(16.9, 30.6, 0.7, C.yellow, { grain: 0.6, seg: 10 });
  g2.circle(15.1, 41.9, 0.55, C.teal, { grain: 0.6, seg: 10 });
  // gravel under the book market and the food vans
  g1.rect(19.6, 31.9, 43.95, 43.95, C.gravel, { grain: 0.9 });
  speckle(g3, 19.8, 32.1, 43.8, 43.8, C.stoneDark, 0.3);
}

// ---------------------------------------------------------------- the London Eye

/** One of the Eye's capsules: a glass egg in a white ring, a few sightseers inside. Drawn on a card, round the origin. */
function pod(p: Pen, seed: number): void {
  const r = new Rng(seed);
  const k = p.card(0, 0, 0);
  k.ellipse(0, 0, 1.26, 0.98, C.white, { outline: true, w: W_FINE, seg: 16, grain: 0.2, layer: -1 });
  k.ellipse(0, 0, 1.1, 0.82, hex("#c3e0f0"), { seg: 16, grain: 0.2, glow: 0.9, kind: F_NEON, layer: 0 });
  k.seg(-0.98, -0.42, 0.98, -0.42, { w: 0.05, color: C.metal, kind: L_MARK, wobble: 0, layer: 0.5 });
  for (const a of [-0.55, 0, 0.55]) {
    if (r.chance(0.22)) continue;
    person(p, a * K, -a * K, -0.42, randomLook(r), "bust", r.chance(0.5), 0.5);
  }
}

function eye(c: LondonCtx): void {
  const { pen, rng } = c;
  const white = C.white;
  const ring = (r: number, dy = 0): V3[] => {
    const pts: V3[] = [];
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      pts.push([EX + Math.cos(a) * r, EY + dy, EZ + Math.sin(a) * r]);
    }
    return pts;
  };

  // the boarding deck, built out over the river
  pen.obj(() => {
    pen.box(20.5, -5.7, -0.5, 19, 5.72, 0.7, hex("#c6ccd0"), { top: hex("#e4ddce") });
    const g = pen.floor(0.2, 1);
    for (let x = 21.3; x < 39.4; x += 0.9) g.seg(x, -5.6, x, -0.05, { w: 0.035, color: C.stoneDark, kind: L_MARK, wobble: 0.3, alpha: 0.7 });
    g.seg(21.5, EY + 1.0, 38.5, EY + 1.0, { w: 0.1, color: C.yellow, kind: L_MARK, wobble: 0.2 });
  });
  railing(
    pen,
    [
      [20.6, -0.25, 0.2],
      [20.6, -5.6, 0.2],
      [39.4, -5.6, 0.2],
      [39.4, -0.25, 0.2],
    ],
    0.9,
    C.metal,
    1.5,
  );
  // the way on and the way off
  for (const [gx, word] of [
    [23, "IN"],
    [37, "OUT"],
  ] as const) {
    pen.obj(() => {
      for (const s of [-0.85, 0.85]) pen.pole([gx + s, -0.2, 0.2], [gx + s, -0.2, 2.7], 0.13, white);
      pen.box(gx - 1.05, -0.45, 2.7, 2.1, 0.5, 0.6, C.navy, { w: W_THIN });
      pen.wall("y+", gx - 1.05, -0.45, 2.7, 2.1, 0.5).text(word, 1.05, 0.13, 0.34, { align: "c", color: C.white, kind: L_MARK, w: 0.06, wobble: 0.2 });
    }, 0.2);
  }
  // stewards in yellow, and the next capsule-load waiting their turn
  person(pen, 24.4, -1.1, 0.2, { ...randomLook(rng), top: C.hivis, hat: null }, "wave");
  person(pen, 36, -1.2, 0.2, { ...randomLook(rng), top: C.hivis, hat: null }, "stand", true);
  for (let i = 0; i < 8; i++) {
    person(pen, 26 + i * 1.1 + rng.range(-0.2, 0.2), rng.range(-1.7, -0.7), 0.2, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }

  // the A-frame that leans back from the hub, and the cables that hold it, down to their anchor in the gardens
  pen.obj(() => {
    for (const s of [-1, 1]) {
      const fx = EX + s * 5.2;
      pen.box(fx - 0.9, 12.4, 0, 1.8, 1.8, 0.6, C.stone, { w: W_THIN });
      pen.pole([fx, 13.3, 0.6], [EX, EY + 2.3, EZ], 0.55, white);
    }
    pen.box(28.6, 16.4, 0, 2.8, 1.2, 0.7, C.stone, { w: W_THIN });
    for (const dx of [-0.9, -0.3, 0.3, 0.9]) {
      pen.stroke(
        [
          [EX + dx * 0.3, EY + 2.3, EZ],
          [EX + dx * 1.2, 17, 0.7],
        ],
        { w: 0.05, color: C.metal, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.1);

  // the spokes: cables as fine as hairs
  pen.obj(() => {
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      pen.stroke(
        [
          [EX + Math.cos(a) * 1.2, EY, EZ + Math.sin(a) * 1.2],
          [EX + Math.cos(a) * (ER - 0.9), EY, EZ + Math.sin(a) * (ER - 0.9)],
        ],
        { w: 0.045, color: C.metal, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.3);
  // the hub and its spindle
  pen.obj(() => {
    pen.pole([EX, EY + 0.1, EZ], [EX, EY + 2.4, EZ], 1.0, white);
    const f = pen.plane([EX, EY + 0.12, EZ], [1, 0, 0], [0, 0, 1], 0, true);
    f.circle(0, 0, 1.3, white, { outline: true, w: W_THIN, seg: 14, grain: 0.3 });
    f.circle(0, 0, 0.5, C.metal, { layer: 1, seg: 10, grain: 0.2 });
  }, 0.35);
  // the rim: two white hoops laced together
  pen.obj(() => {
    for (const r of [ER, ER - 0.9]) {
      pen.stroke(ring(r), { closed: true, w: 0.3, color: C.ink, kind: L_BAR, wobble: 0 });
      pen.stroke(ring(r), { closed: true, w: 0.19, color: white, kind: L_BAR, wobble: 0, bias: 0.012 });
    }
    for (let k = 0; k < 72; k++) {
      const a0 = (k / 72) * Math.PI * 2;
      const a1 = ((k + 0.5) / 72) * Math.PI * 2;
      pen.stroke(
        [
          [EX + Math.cos(a0) * (ER - 0.9), EY, EZ + Math.sin(a0) * (ER - 0.9)],
          [EX + Math.cos(a1) * ER, EY, EZ + Math.sin(a1) * ER],
        ],
        { w: 0.05, color: C.inkSoft, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.45);
  // after dark the rim is lit: pink round one side, blue round the other
  pen.obj(() => {
    const n = 90;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 0.72) / n) * Math.PI * 2;
      pen.stroke(
        [
          [EX + Math.cos(a0) * (ER + 0.1), EY + 0.05, EZ + Math.sin(a0) * (ER + 0.1)],
          [EX + Math.cos(a1) * (ER + 0.1), EY + 0.05, EZ + Math.sin(a1) * (ER + 0.1)],
        ],
        { w: 0.36, color: mixRGB(C.neonPink, C.neonBlue, 0.5 + 0.5 * Math.cos(a0)), kind: L_SPARK, wobble: 0 },
      );
    }
  }, 0.5);

  // a river bus tied up at the end of the deck, and the brow down to it
  pen.push(13.2, -4.9, WATER, 0);
  riverBus(pen, rng, false);
  pen.pop();
  pen.obj(() => {
    pen.fill(
      [
        [20.5, -3.95, 0.2],
        [20.5, -3.25, 0.2],
        [18.5, -4.1, WATER + 0.66],
        [18.5, -4.8, WATER + 0.66],
      ],
      C.metal,
      { outline: true, w: W_FINE },
    );
    for (const dy of [0, 0.7]) {
      pen.stroke(
        [
          [20.5, -3.95 + dy, 1.0],
          [18.5, -4.8 + dy, WATER + 1.46],
        ],
        { w: 0.07, color: C.metal, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.3);
}

/** The ticket hut, and the queue that folds back and forth between ropes in front of it. */
function queue(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.box(38.6, 6.6, 0, 4.2, 2.6, 2.7, C.glassPale, { top: C.navy, w: W_THIN, glow: 0.5, grain: 0.4 });
    const f = pen.wall("y+", 38.6, 6.6, 0, 4.2, 2.6);
    f.rect(0, 2.0, 4.2, 2.7, C.navy, { grain: 0.4 });
    f.text("TICKETS", 2.1, 2.16, 0.36, { align: "c", color: C.white, kind: L_MARK, w: 0.065, wobble: 0.2, layer: 1 });
    for (const a of [0.4, 2.3]) {
      f.rect(a, 0.85, a + 1.5, 1.8, C.glass, { outline: true, w: W_FINE, glow: 1, grain: 0.3 });
      f.circle(a + 0.75, 1.42, 0.2, rng.pick(SKIN), { layer: 1, seg: 8, grain: 0 });
      f.rect(a + 0.45, 0.9, a + 1.05, 1.24, C.navy, { layer: 1, grain: 0 });
    }
    const g = pen.wall("x+", 38.6, 6.6, 0, 4.2, 2.6);
    g.rect(0, 2.0, 2.6, 2.7, C.navy, { grain: 0.4 });
  });
  // posts and ropes
  const ropes = [7.4, 8.8, 10.2, 11.6];
  pen.obj(() => {
    for (const y of ropes) {
      for (let x = 26; x < 37.3; x += 2.2) {
        pen.pole([x, y, 0], [x, y, 0.95], 0.09, C.gold);
        if (x + 2.2 < 37.3) {
          pen.stroke(
            [
              [x, y, 0.9],
              [x + 1.1, y, 0.66],
              [x + 2.2, y, 0.9],
            ],
            { w: 0.06, color: C.red, kind: L_BAR, wobble: 0 },
          );
        }
      }
    }
  }, 0.1);
  // three lanes of people
  const lanes: [number, number][] = [
    [8.1, 8],
    [9.5, 7],
    [10.9, 6],
  ];
  let n = 0;
  for (const [y, count] of lanes) {
    for (let i = 0; i < count; i++) {
      const x = 26.7 + i * 1.28 + rng.range(-0.2, 0.2);
      const lk = randomLook(rng);
      const small = rng.chance(0.2);
      n++;
      if (n === 5) {
        snapper(pen, x, y, lk, false);
        continue;
      }
      person(pen, x, y + rng.range(-0.12, 0.12), 0, lk, rng.pick(["stand", "stand", "stand", "wave"]), rng.chance(0.5), small ? 0.72 : 1);
      if (n === 11 || n === 17) umbrella(pen, x, y, 0, n === 11 ? C.red : C.navy, false, small ? 0.72 : 1);
      if (n === 14 && !small) hat(pen, x, y, 0, "cap", { color: C.red });
    }
  }
}

// ---------------------------------------------------------------- County Hall

function countyHall(c: LondonCtx): void {
  const { pen, rng } = c;
  const stone = C.portland;
  const light = C.portlandLight;
  // the front is bitten out in a shallow crescent
  const hw = 4.3;
  const sag = 2.4;
  const R = (hw * hw + sag * sag) / (2 * sag);
  const cx = CH_X + CH_W / 2;
  const cy = CH_Y + CH_D + R - sag;
  const phi0 = Math.asin(hw / R);
  const N = 8;
  const arc: V2[] = [];
  for (let k = 0; k <= N; k++) {
    const p = -phi0 + (2 * phi0 * k) / N;
    arc.push([cx + R * Math.sin(p), cy - R * Math.cos(p)]);
  }
  const wing = CH_W / 2 - hw;
  const lit = () => rng.chance(0.65);

  pen.obj(() => {
    pen.extrude([[CH_X, CH_Y], [CH_X + CH_W, CH_Y], [CH_X + CH_W, CH_Y + CH_D], ...arc.slice().reverse(), [CH_X, CH_Y + CH_D]], 0, CH_H, stone, { top: C.portlandDark });
    // the two wings
    const f = pen.wall("y+", CH_X, CH_Y, 0, CH_W, CH_D);
    for (const a0 of [0, CH_W - wing]) {
      f.rect(a0, 0, a0 + wing, 2.1, C.portlandDark, { grain: 0.7, layer: -0.5 });
      f.seg(a0, 2.1, a0 + wing, 2.1, { w: W_FINE });
      windowGrid(f, rng, a0 + 0.3, 0.35, a0 + wing - 0.3, 1.95, 2, 1, { lit: 0.8, arched: true, trim: light, fillA: 0.6, fillB: 0.9 });
      windowGrid(f, rng, a0 + 0.3, 2.4, a0 + wing - 0.3, 7.7, 2, 3, { lit: 0.65, trim: light, fillA: 0.52, fillB: 0.66 });
      f.rect(a0, CH_H - 0.5, a0 + wing, CH_H, light, { grain: 0.4, layer: 0.5 });
      f.seg(a0, CH_H - 0.5, a0 + wing, CH_H - 0.5, { w: W_FINE, layer: 1 });
    }
    // banners down the east wing: there is an aquarium in the basement
    for (const a of [CH_W - wing + 0.05, CH_W - 0.5]) {
      f.rect(a, 2.6, a + 0.45, 7.3, C.royal, { outline: true, w: 0.04, layer: 2, grain: 0.3 });
      for (const b of [3.4, 4.9, 6.4]) {
        f.poly(
          [
            [a + 0.08, b],
            [a + 0.28, b + 0.14],
            [a + 0.38, b + 0.02],
            [a + 0.38, b + 0.26],
            [a + 0.28, b + 0.14],
            [a + 0.08, b + 0.28],
          ],
          C.white,
          { layer: 3, grain: 0 },
        );
      }
    }
    neonSign(f, "AQUARIUM", CH_W - wing / 2, 2.18, 0.3, C.royal, 2);
    // the east end
    const e = pen.wall("x+", CH_X, CH_Y, 0, CH_W, CH_D);
    e.rect(0, 0, CH_D, 2.1, C.portlandDark, { grain: 0.7, layer: -0.5 });
    e.seg(0, 2.1, CH_D, 2.1, { w: W_FINE });
    windowGrid(e, rng, 0.4, 0.35, CH_D - 0.4, 1.95, 4, 1, { lit: 0.8, arched: true, trim: light, fillA: 0.6, fillB: 0.9 });
    windowGrid(e, rng, 0.4, 2.4, CH_D - 0.4, 7.7, 4, 3, { lit: 0.65, trim: light, fillA: 0.52, fillB: 0.66 });
    e.rect(0, CH_H - 0.5, CH_D, CH_H, light, { grain: 0.4, layer: 0.5 });
    e.seg(0, CH_H - 0.5, CH_D, CH_H - 0.5, { w: W_FINE, layer: 1 });
  });

  // the crescent itself: a window to each bay, a column between each pair
  pen.obj(() => {
    for (let k = 0; k < N; k++) {
      const p0 = arc[k];
      const p1 = arc[k + 1];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      // a bay faces the middle of the crescent: leave out the one that has turned its back on us
      if ((cx - mx) / R + (cy - my) / R < 0.1) continue;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const f = pen.plane([p0[0], p0[1], 0], [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len, 0], [0, 0, 1], 1, true);
      f.rect(0, 0, len, 2.1, C.portlandDark, { grain: 0.7, layer: -0.5 });
      if (k === 3 || k === 4) f.rect(len / 2 - 0.45, 0, len / 2 + 0.45, 1.85, C.doorBlue, { outline: true, w: W_FINE });
      else archWindow(f, len / 2 - 0.42, 0.35, len / 2 + 0.42, 1.9, true, light);
      archWindow(f, len / 2 - 0.45, 2.5, len / 2 + 0.45, 5.5, lit(), light);
      windowAt(f, len / 2 - 0.4, 6.3, len / 2 + 0.4, 7.5, lit(), light, false);
      f.block(0, 5.72, len, 6.02, 0.6, light, { w: W_FINE });
      f.rect(0, CH_H - 0.5, len, CH_H, light, { grain: 0.4, layer: 0.5 });
    }
    for (let k = 0; k <= N; k++) {
      const [x, y] = arc[k];
      const nx = (cx - x) / R;
      const ny = (cy - y) / R;
      if (nx + ny < -0.05) continue;
      pen.box(x + nx * 0.5 - 0.3, y + ny * 0.5 - 0.3, 0, 0.6, 0.6, 0.5, light, { w: W_FINE });
      pen.cyl(x + nx * 0.5, y + ny * 0.5, 0.5, 0.21, 5.22, light, { seg: 6, w: W_FINE });
    }
  }, 0.1);

  // steep slate roofs, a pavilion over each wing, and the little spire in the middle
  pen.obj(() => {
    pen.hip(CH_X - 0.2, CH_Y - 0.2, CH_H, CH_W + 0.4, CH_D - sag, 2.7, C.slate, { inset: 2.4 });
    for (const x of [CH_X - 0.2, CH_X + CH_W - wing - 0.1]) pen.hip(x, CH_Y + CH_D - sag - 0.6, CH_H, wing + 0.3, sag + 0.75, 2.3, C.slate, { inset: 1.5 });
    for (const x of [CH_X + 3.2, CH_X + CH_W - 3.8]) pen.box(x, CH_Y + 1.6, CH_H + 1.2, 0.6, 1.0, 2.3, stone, { top: C.charcoal, w: W_THIN });
  }, 0.25);
  pen.obj(() => {
    const sy = CH_Y + 2.7;
    pen.cyl(cx, sy, CH_H + 2.2, 0.62, 1.5, light, { seg: 8, w: W_THIN });
    pen.cone(cx, sy, CH_H + 3.7, 0.78, 2.6, C.copper, { seg: 8, w: W_THIN });
    pen.card(cx, sy, CH_H + 6.3).circle(0, 0.12, 0.14, C.gold, { outline: true, w: 0.035, seg: 7, grain: 0.2 });
  }, 0.45);
  flag(pen, CH_X + 1.4, CH_Y + CH_D - 1.2, CH_H + 1.5, 3.2, "uk", 0.9);

  // a school party two by two, the teacher counting heads
  const teacher = randomLook(rng);
  person(pen, 21.9, 15.5, 0, teacher, "wave", true);
  pen.card(21.9, 15.5, 0, true).rect(0.56, 1.74, 0.9, 2.02, C.white, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  for (let i = 0; i < 8; i++) {
    const kid = randomLook(rng);
    kid.top = C.hivis;
    person(pen, 20.9 - Math.floor(i / 2) * 0.85, 15.35 + (i % 2) * 0.62, 0, kid, i === 5 ? "wave" : "stand", i % 2 === 0, 0.68);
  }
  // people on the steps of the crescent
  for (const [x, y] of [
    [12.4, 13.6],
    [13.6, 13.9],
    [15.4, 13.5],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave"]), rng.chance(0.5));
  }
}

// ---------------------------------------------------------------- the concert hall, and the skaters under its beams

const WORDS = ["SKATE", "LOVE", "YES", "LDN", "ZAP", "WOW", "SE1", "OI!"];
const PAINT: RGB[] = [C.neonPink, C.yellow, C.teal, C.orange, C.purple, C.neonBlue, C.green, C.red];

/** Cover a stretch of wall with tags, blobs and one-word slogans. */
function graffiti(f: Plane, rng: Rng, a0: number, a1: number, b0: number, b1: number): void {
  const h = b1 - b0;
  let a = a0 + 0.15;
  let turn = rng.int(0, 3);
  while (a < a1 - 1.4) {
    const w = Math.min(a1 - a - 0.1, rng.range(1.5, 2.8));
    const c1 = rng.pick(PAINT);
    let c2 = rng.pick(PAINT);
    if (c2 === c1) c2 = C.white;
    const kind = turn++ % 3;
    if (kind === 0) {
      // fat round letters, one overlapping the next
      const n = Math.max(3, Math.round(w / 0.55));
      for (let i = 0; i < n; i++) {
        f.circle(a + 0.38 + (i * (w - 0.76)) / (n - 1), b0 + h * (0.46 + 0.1 * (i % 2)), 0.4, i % 2 ? c1 : c2, { layer: 1 + i * 0.05, seg: 9, grain: 0.4, outline: true, w: 0.05 });
      }
    } else if (kind === 1) {
      // a tag: one wild line and its highlight
      const pts: V2[] = [];
      for (let i = 0; i <= 6; i++) pts.push([a + (i * w) / 6, b0 + h * (i % 2 ? 0.76 : 0.24) + rng.range(-0.12, 0.12)]);
      f.line(pts, { w: 0.16, color: c1, kind: L_MARK, wobble: 0.8, layer: 1 });
      f.line(
        pts.map((p) => [p[0] + 0.08, p[1] - 0.08] as V2),
        { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.8, layer: 2 },
      );
    } else {
      // a slab of colour with a word on it
      const word = rng.pick(WORDS);
      f.poly(
        [
          [a, b0 + 0.28],
          [a + w, b0 + 0.14],
          [a + w - 0.1, b1 - 0.3],
          [a + 0.14, b1 - 0.14],
        ],
        c1,
        { layer: 1, grain: 0.5, outline: true, w: 0.05 },
      );
      const size = Math.min(0.62, (w - 0.4) / (word.length * 0.92));
      f.text(word, a + w / 2, b0 + h / 2 - size / 2, size, { align: "c", color: C.white, kind: L_MARK, w: 0.1, wobble: 0.5, layer: 2 });
    }
    a += w + rng.range(0.05, 0.25);
  }
}

/** Height of the skaters' quarter pipe at local y: it climbs to the north. */
function pipeZ(y: number): number {
  const a = SK0 + 2.6 - y;
  if (a <= 0.9) return 0;
  if (a >= 2.4) return 1.5;
  return 1.5 - Math.sqrt(Math.max(0, 1.5 * 1.5 - (a - 0.9) * (a - 0.9)));
}

function artsCentre(c: LondonCtx): void {
  const { pen, rng } = c;
  const yEnd = AC_Y + AC_D;
  // the podium: foyer at the north end, a blank wall to the south that did not stay blank
  pen.obj(() => {
    pen.box(AC_X, AC_Y, 0, AC_W, AC_D, 3.4, CONC, { top: CONC_L });
    const e = pen.wall("x+", AC_X, AC_Y, 0, AC_W, AC_D);
    const foyer = yEnd - SK0;
    e.rect(foyer + 0.5, 0.25, AC_D - 0.5, 2.9, C.glassLight, { outline: true, w: W_THIN, glow: 0.9, grain: 0.3 });
    for (let a = foyer + 1.4; a < AC_D - 0.6; a += 0.95) e.seg(a, 0.25, a, 2.9, { w: 0.06, color: CONC_L, kind: L_MARK, wobble: 0, layer: 1 });
    for (const a of [foyer + 2.4, foyer + 5.2]) e.rect(a, 0.25, a + 0.9, 2.2, C.charcoal, { outline: true, w: W_FINE, layer: 1 });
    graffiti(e, rng, 0.2, foyer - 0.2, 0.1, 2.75);
    // the end on the street: doors, and what is on this week
    const s = pen.wall("y+", AC_X, AC_Y, 0, AC_W, AC_D);
    s.rect(3.2, 0, 5.8, 2.4, C.glass, { outline: true, w: W_THIN, glow: 0.9, grain: 0.3 });
    s.seg(4.5, 0, 4.5, 2.4, { w: 0.05, color: CONC_L, kind: L_MARK, wobble: 0, layer: 1 });
    const posters = [C.red, C.yellow, C.teal, C.purple];
    posters.forEach((col, i) => {
      const a = i < 2 ? 0.5 + i * 1.3 : 6.3 + (i - 2) * 1.3;
      s.rect(a, 0.5, a + 1.0, 2.2, col, { outline: true, w: W_FINE, grain: 0.4 });
      s.circle(a + 0.5, 1.6, 0.28, C.white, { layer: 1, seg: 8, grain: 0 });
      s.seg(a + 0.2, 0.85, a + 0.8, 0.85, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    });
    neonSign(s, "LIVE MUSIC", 4.5, 2.62, 0.3, C.neonPink, 1);
  });
  // the hall itself, set back on the podium, under its curved green roof
  pen.obj(() => {
    pen.box(5.6, 20, 3.4, 5.8, 21.5, 5.0, CONC_L, { top: null });
    const h = pen.wall("x+", 5.6, 20, 3.4, 5.8, 21.5);
    h.rect(0.6, 0.7, 20.9, 2.5, C.glass, { outline: true, w: W_THIN, glow: 0.85, grain: 0.4 });
    for (let a = 1.6; a < 20.8; a += 1.0) h.seg(a, 0.7, a, 2.5, { w: 0.12, color: CONC_L, kind: L_MARK, wobble: 0, layer: 1 });
    h.text("FESTIVAL HALL", 10.75, 3.3, 0.85, { align: "c", color: C.charcoal, w: 0.11, wobble: 0.2 });
    const s = pen.wall("y+", 5.6, 20, 3.4, 5.8, 21.5);
    s.rect(0.6, 0.7, 5.2, 4.2, C.glass, { outline: true, w: W_THIN, glow: 0.85, grain: 0.4 });
    for (const a of [1.75, 2.9, 4.05]) s.seg(a, 0.7, a, 4.2, { w: 0.1, color: CONC_L, kind: L_MARK, wobble: 0, layer: 1 });
    s.seg(0.6, 2.45, 5.2, 2.45, { w: 0.1, color: CONC_L, kind: L_MARK, wobble: 0, layer: 1 });
  }, 0.15);
  pen.obj(() => {
    const prof: V2[] = [
      [0, 0],
      [5.8, 0],
    ];
    for (let i = 1; i < 8; i++) {
      const t = (i / 8) * Math.PI;
      prof.push([2.9 + Math.cos(t) * 2.9, Math.sin(t) * 1.25]);
    }
    pen.wall("y+", 5.6, 20, 8.4, 5.8, 0).extrude(prof, 21.5, C.copper, { crease: 30, w: 0.1 });
  }, 0.3);
  // the terrace on top of the podium: a parapet, tables, people looking down at the skaters
  pen.obj(() => {
    pen.box(13.65, AC_Y, 3.4, 0.35, AC_D, 0.75, CONC, { w: W_THIN });
    pen.box(AC_X, yEnd - 0.35, 3.4, AC_W - 0.35, 0.35, 0.75, CONC, { w: W_THIN });
  }, 0.2);
  pen.push(0, 0, 3.4);
  cafeTable(pen, rng, 12.45, 22.6, C.orange, 2);
  cafeTable(pen, rng, 12.45, 26.4, null, 3);
  cafeTable(pen, rng, 12.45, 42.2, C.red, 2);
  pen.pop();
  for (const y of [30.8, 33.4, 36.9, 39.2]) person(pen, 13.05, y, 3.4, randomLook(rng), rng.pick(["stand", "stand", "wave"]), true);

  // the skaters' end: mushroom-headed columns carrying open beams
  const edge = 17.25;
  for (const y of [28.7, 32.4, 36.1, 39.8, 43.2]) {
    pen.obj(() => {
      pen.cyl(edge, y, 0, 0.3, 2.25, CONC_L, { seg: 8, w: W_THIN });
      pen.cyl(edge, y, 2.25, 0.3, 0.75, CONC_L, { seg: 8, r2: 0.85, w: W_THIN });
      pen.box(14, y - 0.25, 3.0, edge - 14 + 0.3, 0.5, 0.4, CONC, { w: W_THIN });
      // everything within reach has been painted
      const band = pen.card(edge, y, 0.35);
      band.rect(-0.31, 0, 0.31, 0.55, rng.pick(PAINT), { grain: 0.4 });
      band.rect(-0.31, 0.62, 0.31, 1.25, rng.pick(PAINT), { grain: 0.4 });
    }, 0.25);
  }
  pen.obj(() => {
    pen.box(edge - 0.25, 28.7, 3.0, 0.5, 14.75, 0.4, CONC, { w: W_THIN });
    for (const y of [30.5, 34.2, 37.9, 41.5]) {
      pen.stroke(
        [
          [15.7, y, 2.9],
          [15.72, y, 2.9],
        ],
        { w: 2.6, kind: L_LIGHT, wobble: 0, alpha: 0.3 },
      );
    }
  }, 0.3);
  // what there is to ride: a quarter pipe at the far end, a ledge, a rail, a kicker
  pen.obj(() => {
    const prof: V2[] = [
      [2.4, 0],
      [2.4, 1.5],
    ];
    for (let i = 1; i < 6; i++) {
      const t = ((6 - i) / 6) * (Math.PI / 2);
      prof.push([0.9 + Math.sin(t) * 1.5, 1.5 - Math.cos(t) * 1.5]);
    }
    prof.push([0.9, 0]);
    pen.wall("x+", 14.35, SK0 + 0.2, 0, 0, 2.4).extrude(prof, 2.55, hex("#c2a47c"), { crease: 30, w: 0.1 });
  }, 0.1);
  pen.obj(() => {
    pen.box(14.5, 32.5, 0, 0.55, 3.8, 0.48, CONC_L, { w: W_THIN });
    pen.stroke(
      [
        [15.05, 32.5, 0.5],
        [15.05, 36.3, 0.5],
      ],
      { w: 0.07, color: C.yellow, kind: L_MARK, wobble: 0.2 },
    );
    pen.pole([14.78, 37.6, 0.42], [14.78, 40.6, 0.42], 0.09, C.metal);
    for (const y of [37.7, 40.5]) pen.pole([14.78, y, 0], [14.78, y, 0.42], 0.07, C.metal, { ink: false });
    pen.solid(
      [
        [15.4, 42.9, 0],
        [16.9, 42.9, 0],
        [16.9, 41.7, 0],
        [15.4, 41.7, 0],
        [15.4, 41.7, 0.5],
        [16.9, 41.7, 0.5],
      ],
      [
        [0, 1, 5, 4],
        [3, 2, 5, 4],
        [0, 3, 4],
        [1, 2, 5],
      ],
      hex("#c2a47c"),
      { w: 0.09 },
    );
  }, 0.2);
  // a low wall to sit on and watch from
  pen.obj(() => {
    pen.box(18.3, 30.6, 0, 0.45, 9.4, 0.5, CONC_L, { w: W_THIN });
  }, 0.15);
  for (const y of [31.4, 32.6, 35.1, 36.2, 38.9]) person(pen, 18.52, y, 0.14, randomLook(rng), "sit", true);
  snapper(pen, 18.6, 41.6, randomLook(rng), true);
  // outside the foyer doors
  person(pen, 14.9, 20.6, 0, randomLook(rng), "stand");
  person(pen, 15.3, 23.1, 0, randomLook(rng), "wave", true);
  tree(pen, rng, 16.9, 25.2, { kind: "round" });
  // a board left against the wall, a helmet on the ledge
  pen.obj(() => {
    pen.stroke(
      [
        [14.25, 30.3, 0.05],
        [14.12, 30.3, 0.95],
      ],
      { w: 0.12, color: C.green, kind: L_BAR, wobble: 0 },
    );
    pen.card(14.78, 36, 0.48).ellipse(0, 0.13, 0.2, 0.15, C.red, { outline: true, w: 0.035, seg: 8, a0: 0, a1: Math.PI });
  }, 0.3);
}

// ---------------------------------------------------------------- the lawn

/** A deckchair facing local +x, in stripes, with or without someone in it. */
function deckchair(pen: Pen, x: number, y: number, rot: number, stripe: RGB, sitter: Look | null): void {
  const rad = (rot * Math.PI) / 180;
  pen.push(x, y, 0, rot);
  pen.begin();
  for (let i = 0; i < 3; i++) {
    const y0 = -0.36 + i * 0.24;
    const y1 = y0 + 0.24;
    const col = i === 1 ? C.white : stripe;
    pen.fill(
      [
        [-0.25, y0, 0.3],
        [0.62, y0, 0.16],
        [0.62, y1, 0.16],
        [-0.25, y1, 0.3],
      ],
      col,
      { grain: 0.5 },
    );
    pen.fill(
      [
        [-0.25, y0, 0.3],
        [-0.25, y1, 0.3],
        [-0.78, y1, 1.02],
        [-0.78, y0, 1.02],
      ],
      col,
      { grain: 0.5 },
    );
  }
  pen.stroke(
    [
      [0.62, -0.36, 0.16],
      [-0.25, -0.36, 0.3],
      [-0.78, -0.36, 1.02],
      [-0.78, 0.36, 1.02],
      [-0.25, 0.36, 0.3],
      [0.62, 0.36, 0.16],
    ],
    { closed: true, w: W_FINE },
  );
  for (const s of [-0.4, 0.4]) {
    pen.stroke(
      [
        [-0.82, s, 1.06],
        [0.28, s, 0],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [0.7, s, 0.16],
        [-0.48, s, 0],
      ],
      { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
  }
  if (sitter) person(pen, 0.05, 0, 0.02, sitter, "sit", Math.cos(rad) - Math.sin(rad) < 0);
  pen.end();
  pen.pop();
}

function lawn(c: LondonCtx): void {
  const { pen, rng } = c;
  const stripes = [C.green, C.blue, C.red, C.orange, C.teal];
  // deckchairs in ones and twos, most of them taken, all turned towards the river and the wheel
  const chairs: [number, number, number, boolean][] = [
    [22.0, 21.6, 300, true],
    [23.2, 21.2, 285, true],
    [25.6, 22.6, 270, false],
    [27.2, 21.4, 315, true],
    [28.4, 21.8, 300, true],
    [31.4, 21.6, 270, true],
    [32.2, 23.4, 330, false],
    [22.4, 25.0, 0, true],
    [24.4, 26.6, 315, true],
    [25.6, 27.2, 330, true],
    [29.6, 26.2, 285, true],
    [31.6, 27.4, 0, true],
  ];
  chairs.forEach(([x, y, rot, taken], i) => deckchair(pen, x, y, rot, stripes[i % stripes.length], taken ? randomLook(rng) : null));
  // a picnic: a checked rug, three people, and a dog with its eye on the sandwiches
  pen.obj(() => {
    const g = pen.floor(0, 4);
    g.rect(26.6, 23.8, 28.6, 25.6, C.red, { outline: true, w: W_FINE, grain: 0.5 });
    for (const a of [27.1, 27.6, 28.1]) g.seg(a, 23.8, a, 25.6, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    for (const b of [24.25, 24.7, 25.15]) g.seg(26.6, b, 28.6, b, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    pen.box(27.4, 24.5, 0, 0.45, 0.35, 0.3, C.wood, { w: W_FINE });
  });
  person(pen, 26.9, 24.3, -0.3, randomLook(rng), "sit");
  person(pen, 28.3, 24.2, -0.3, randomLook(rng), "sit", true);
  person(pen, 27.7, 25.3, -0.3, randomLook(rng), "sit", true, 0.72);
  dog(pen, 29.3, 25.0, hex("#b98352"), true);
  // a game of catch, somebody reading under a tree, a toddler making for the pigeons
  person(pen, 30.2, 23.6, 0, randomLook(rng), "cheer", true);
  person(pen, 23.6, 23.4, 0, randomLook(rng), "wave", false, 0.72);
  pen.card(27.0, 23.2, 2.4).circle(0, 0, 0.16, C.yellow, { outline: true, w: 0.035, seg: 7, grain: 0 });
  person(pen, 21.3, 27.9, -0.3, randomLook(rng), "sit");
  pen.card(21.3, 27.9, 0).rect(0.3, 0.62, 0.62, 0.86, C.white, { outline: true, w: 0.035, layer: 5, grain: 0 });
  person(pen, 30.6, 28.6, 0, randomLook(rng), "walkA", false, 0.6);
  for (const [x, y, peck] of [
    [31.9, 28.5, true],
    [32.5, 28.9, false],
    [32.3, 28.1, true],
    [23.9, 20.4, false],
  ] as const) {
    pigeon(pen, x, y, 0, x > 32.2, peck);
  }
  tree(pen, rng, 21.2, 20.6, { kind: "round" });
  tree(pen, rng, 32.9, 20.5, { kind: "blossom" });
  tree(pen, rng, 20.9, 28.9, { kind: "round" });
  for (const [x, y] of [
    [26.9, 19.95],
    [26.9, 29.05],
  ]) {
    lamp(pen, x, y);
  }
}

// ---------------------------------------------------------------- the merry-go-round

/** A galloper: a painted horse on a card, with or without a child on it. */
function galloper(p: Pen, flip: boolean, coat: RGB, saddle: RGB, rider: Look | null): void {
  const k = p.card(0, 0, 0, flip);
  k.bar(0.36, 0.55, 0.8, 0.3, 0.09, coat);
  k.bar(0.3, 0.52, 0.56, 0.12, 0.09, coat);
  k.bar(-0.36, 0.55, -0.82, 0.32, 0.09, coat);
  k.bar(-0.3, 0.52, -0.52, 0.14, 0.09, coat);
  k.bar(-0.5, 0.72, -0.82, 0.52, 0.08, C.gold, { layer: 1 });
  k.ellipse(0, 0.66, 0.52, 0.24, coat, { outline: true, w: 0.04, seg: 9, grain: 0.2, layer: 1 });
  k.bar(0.42, 0.78, 0.66, 1.14, 0.2, coat, { layer: 2 });
  k.ellipse(0.8, 1.2, 0.21, 0.13, coat, { outline: true, w: 0.035, seg: 7, layer: 3 });
  k.rect(-0.22, 0.8, 0.24, 0.96, saddle, { layer: 2, outline: true, w: 0.03, grain: 0.2 });
  if (rider) person(p, 0, 0, 0.84, rider, "bust", flip, 0.62);
}

function carousel(c: LondonCtx): void {
  const { pen, rng } = c;
  const cream = hex("#fbeecb");
  pen.obj(() => {
    pen.cyl(CAR_X, CAR_Y, 0, CAR_R, 0.35, C.red, { seg: 20, top: C.wood, w: W_THIN });
    pen.cyl(CAR_X, CAR_Y, 0.35, 0.62, 2.9, cream, { seg: 10, w: W_THIN });
    // mirrors round the middle
    const m = pen.card(CAR_X, CAR_Y, 0.35);
    for (const b of [0.5, 1.4, 2.3]) m.rect(-0.3, b, 0.3, b + 0.55, C.gold, { outline: true, w: 0.035, grain: 0.2, glow: 0.7 });
  });
  pen.obj(() => {
    // the canopy: a striped cone over a gilded rim, a bulb at every rib
    const n = 16;
    const rr = CAR_R + 0.45;
    const verts: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([CAR_X + Math.cos(a) * rr, CAR_Y + Math.sin(a) * rr, 3.6]);
    }
    verts.push([CAR_X, CAR_Y, 5.3]);
    const faces: number[][] = [];
    const cols: RGB[] = [];
    for (let i = 0; i < n; i++) {
      faces.push([i, (i + 1) % n, n]);
      cols.push(i % 2 === 0 ? C.red : cream);
    }
    pen.solid(verts, faces, cols, { crease: 40, over: 0, w: W_THIN });
    pen.cyl(CAR_X, CAR_Y, 3.22, rr, 0.38, C.gold, { seg: n, top: null, w: W_THIN });
    for (let i = 0; i < n * 2; i++) {
      const a = ((i + 0.5) / (n * 2)) * Math.PI * 2;
      bulb(pen, CAR_X + Math.cos(a) * (rr + 0.05), CAR_Y + Math.sin(a) * (rr + 0.05), i % 2 ? 3.3 : 3.52, 0.22);
    }
    pen.stroke(
      [
        [CAR_X + 1.2, CAR_Y + 1.2, 1.9],
        [CAR_X + 1.22, CAR_Y + 1.2, 1.9],
      ],
      { w: 4.2, kind: L_LIGHT, wobble: 0, alpha: 0.28 },
    );
    pen.pole([CAR_X, CAR_Y, 5.3], [CAR_X, CAR_Y, 6.3], 0.07, C.gold, { ink: false });
    pen.card(CAR_X, CAR_Y, 5.75).poly(
      [
        [0, 0.5],
        [0.8, 0.34],
        [0, 0.18],
      ],
      C.red,
      { outline: true, w: W_FINE, sway: 0.3 },
    );
  }, 0.3);
  // the pay box, and the grown-ups who wave every time round
  pen.obj(() => {
    pen.box(41.85, 16.95, 0, 1.2, 1.2, 2.3, C.red, { top: C.gold, w: W_THIN });
    const f = pen.wall("y+", 41.85, 16.95, 0, 1.2, 1.2);
    f.rect(0.18, 0.95, 1.02, 1.7, C.glass, { outline: true, w: W_FINE, glow: 1 });
    f.text("RIDES", 0.6, 1.86, 0.22, { align: "c", color: C.gold, kind: L_MARK, w: 0.05, wobble: 0.2, layer: 1 });
  }, 0.15);
  for (const [x, y, pose, flip] of [
    [36.3, 24.4, "wave", false],
    [37.4, 24.6, "stand", true],
    [41.6, 24.3, "wave", true],
    [42.6, 22.6, "stand", true],
    [35.9, 17.6, "wave", false],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), pose, flip);
  }
  person(pen, 38.2, 24.75, 0, randomLook(rng), "cheer", false, 0.66);
  // balloons for sale
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 43.3, 26.5, 0, lk, "wave");
    const k = pen.card(43.3, 26.5, 0);
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
}

// ---------------------------------------------------------------- performers

function performers(c: LondonCtx): void {
  const { pen, rng } = c;
  // the juggler on his box, inside the ring that forms round anything worth watching
  const [jx, jy] = JUGGLER;
  pen.box(jx - 0.4, jy - 0.4, 0, 0.8, 0.8, 0.45, C.woodDark, { w: W_THIN });
  const juggler = randomLook(rng);
  juggler.top = C.purple;
  juggler.hat = C.yellow;
  person(pen, jx, jy, 0.45, juggler, "cheer");
  for (let i = 0; i < 8; i++) {
    // (nobody stands between him and the camera)
    const t = 1.75 + (i / 7) * 4.4;
    const r = 2.0 + rng.range(-0.15, 0.2);
    const small = rng.chance(0.25);
    person(pen, jx + Math.cos(t) * r, jy + Math.sin(t) * r, 0, randomLook(rng), rng.pick(["stand", "stand", "cheer", "wave"]), Math.cos(t) > Math.sin(t), small ? 0.72 : 1);
  }
  pen.cyl(jx + 0.9, jy + 1.0, 0, 0.24, 0.18, C.black, { seg: 8, w: W_FINE });

  // the living statue: gold from top hat to toe, on a gold box
  const [sx, sy] = STATUE;
  pen.box(sx - 0.45, sy - 0.45, 0, 0.9, 0.9, 0.6, hex("#d9b441"), { w: W_THIN });
  for (const [dx, dy, flip, small] of [
    [-1.5, 0.3, false, false],
    [-1.2, 1.2, false, true],
    [-0.2, 1.6, true, false],
    [0.8, 1.4, true, false],
  ] as const) {
    person(pen, sx + dx, sy + dy, 0, randomLook(rng), "stand", flip, small ? 0.7 : 1);
  }
  snapper(pen, sx - 1.9, sy + 1.3, randomLook(rng), false);

  // the bubble man: two sticks, a loop of string, a bucket of suds
  const [bx, by] = BUBBLES;
  pen.obj(() => {
    const lk = randomLook(rng);
    lk.top = C.teal;
    person(pen, bx, by, 0, lk, "cheer");
    const k = pen.card(bx, by, 0);
    k.seg(-0.6, 1.9, -0.95, 3.0, { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
    k.seg(0.6, 1.9, 0.95, 3.0, { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
    k.line(
      [
        [-0.95, 3.0],
        [-0.4, 2.5],
        [0.4, 2.5],
        [0.95, 3.0],
        [-0.95, 3.0],
      ],
      { w: 0.035, color: C.inkSoft, kind: L_MARK, wobble: 0.4, layer: 5 },
    );
    pen.cyl(bx + 0.9, by + 0.5, 0, 0.3, 0.45, C.blue, { seg: 8, w: W_FINE, top: C.glassPale });
  });
  for (const [dx, dy, pose, s] of [
    [-1.6, -0.5, "cheer", 0.62],
    [-2.3, 0.4, "cheer", 0.7],
    [-1.1, 0.9, "wave", 0.62],
    [1.9, 0.6, "stand", 1],
    [2.6, 0.2, "stand", 1],
  ] as const) {
    person(pen, bx + dx, by + dy, 0, randomLook(rng), pose, dx > 0, s);
  }
}

// ---------------------------------------------------------------- the book market

function bookMarket(c: LondonCtx): void {
  const { pen, rng } = c;
  const spines: RGB[] = [C.red, C.cream, C.blueDark, C.green, C.ochre, C.white, C.brickBrown, C.teal, C.yellow, C.navy];
  // long trestle tables, the books laid out spine up
  const tables: [number, number][] = [
    [20.4, 34.2],
    [25.6, 34.2],
    [20.4, 37.4],
    [25.6, 37.4],
    [20.4, 40.6],
    [25.6, 40.6],
  ];
  for (const [x, y] of tables) {
    pen.obj(() => {
      pen.box(x, y, 0.62, 4.4, 1.3, 0.12, C.wood, { w: W_THIN });
      for (const dx of [0.3, 4.1]) {
        pen.stroke(
          [
            [x + dx - 0.25, y + 0.65, 0],
            [x + dx, y + 0.65, 0.62],
            [x + dx + 0.25, y + 0.65, 0],
          ],
          { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
        );
      }
      const g = pen.floor(0.74, 1);
      for (let r = 0; r < 2; r++) {
        let a = x + 0.12;
        while (a < x + 4.2) {
          const w = rng.range(0.22, 0.42);
          g.rect(a, y + 0.1 + r * 0.58, Math.min(x + 4.28, a + w), y + 0.6 + r * 0.58, rng.pick(spines), { grain: 0.3 });
          a += w + 0.03;
        }
        g.loop(
          [
            [x + 0.12, y + 0.1 + r * 0.58],
            [x + 4.28, y + 0.1 + r * 0.58],
            [x + 4.28, y + 0.6 + r * 0.58],
            [x + 0.12, y + 0.6 + r * 0.58],
          ],
          { w: 0.04, layer: 1 },
        );
      }
    });
  }
  // browsers, heads down
  const browsers: [number, number, boolean][] = [
    [21.4, 35.9, false],
    [23.2, 36.0, true],
    [26.8, 35.9, false],
    [28.9, 36.1, true],
    [22.2, 39.2, true],
    [27.6, 39.1, false],
    [24.0, 42.4, false],
    [29.2, 42.3, true],
    [21.0, 42.4, true],
  ];
  browsers.forEach(([x, y, flip], i) => {
    const lk = randomLook(rng);
    pen.obj(() => {
      person(pen, x, y, 0, lk, "stand", flip, i === 6 ? 0.72 : 1);
      // every third one has found something
      if (i % 3 === 0) pen.card(x, y, 0, flip).rect(0.34, 0.95, 0.66, 1.32, rng.pick(spines), { outline: true, w: 0.035, layer: 5, grain: 0.2 });
    });
  });
  // the bookseller on a folding chair with the cash tin, and the board that says what it is
  person(pen, 30.4, 34.9, 0.02, { ...randomLook(rng), hat: C.charcoal }, "sit", true);
  pen.box(30.2, 35.6, 0, 0.45, 0.35, 0.3, C.green, { w: W_FINE });
  pen.obj(() => {
    const b = pen.plane([30.0, 33.2, 0], [1, 0, 0], [0, -0.28, 1], 0, true);
    b.rect(0, 0, 1.5, 1.25, C.charcoal, { outline: true, w: W_FINE, grain: 0.4 });
    b.text("BOOKS", 0.75, 0.74, 0.24, { align: "c", color: C.white, kind: L_MARK, w: 0.05, wobble: 0.3, layer: 1 });
    b.text("2 EACH", 0.75, 0.26, 0.2, { align: "c", color: C.yellow, kind: L_MARK, w: 0.045, wobble: 0.3, layer: 1 });
  });
  lamp(pen, 31.0, 43.3);
  for (const x of [19.9, 30.9]) pen.pole([x, 33.4, 0], [x, 33.4, 3.3], 0.09, C.iron);
  lightString(pen, [19.9, 33.4, 3.3], [30.9, 33.4, 3.3], 12, 0.5);
}

// ---------------------------------------------------------------- food vans

/** A van with a hatch in its side, an awning over it, and its menu in one word on the roof. It points along local +x and serves on the +y side. */
function foodVan(pen: Pen, rng: Rng, color: RGB, awning: RGB, word: string): void {
  van(pen, color);
  pen.begin();
  const f = pen.wall("y+", -2.4, -0.975, 0.3, 4.8, 1.95);
  f.rect(0.5, 0.8, 3.2, 1.72, C.charcoal, { outline: true, w: W_FINE, layer: 2, grain: 0.4, glow: 0.5 });
  f.circle(1.5, 1.38, 0.2, rng.pick(SKIN), { layer: 3, seg: 8, grain: 0 });
  f.rect(1.2, 0.84, 1.8, 1.18, C.white, { layer: 3, grain: 0 });
  f.block(0.4, 0.66, 3.3, 0.8, 0.45, C.metal, { w: W_FINE });
  // the awning: striped cloth propped out over the customers
  const cloth = pen.plane([-2.0, 0.975, 2.12], [1, 0, 0], [0, 1.25, -0.42], 0, true);
  const n = 6;
  for (let i = 0; i < n; i++) cloth.rect((i * 3.0) / n, 0, ((i + 1) * 3.0) / n, 1, i % 2 === 0 ? awning : C.white, { grain: 0.6 });
  cloth.loop(
    [
      [0, 0],
      [3.0, 0],
      [3.0, 1],
      [0, 1],
    ],
    { w: W_THIN },
  );
  for (const x of [-1.95, 0.95]) pen.pole([x, 2.2, 0], [x, 2.2, 1.72], 0.07, C.white, { ink: false });
  // the sign on the roof
  pen.box(-1.9, -0.2, 2.15, 3.2, 0.3, 0.8, awning, { w: W_THIN });
  pen.wall("y+", -1.9, -0.2, 2.15, 3.2, 0.3).text(word, 1.6, 0.2, Math.min(0.42, 2.7 / (word.length * 0.92)), { align: "c", color: C.white, kind: L_MARK, w: 0.07, wobble: 0.3 });
  pen.end();
}

function foodCourt(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(37.3, 34.2, 0, 0);
  foodVan(pen, rng, hex("#f4efe2"), C.blue, "CHIPS");
  pen.pop();
  pen.push(40.7, 39.5, 0, 0);
  foodVan(pen, rng, hex("#f6c744"), C.red, "CURRY");
  pen.pop();
  pen.push(33.3, 38.9, 0, 0);
  stall(pen, rng, { w: 2.8, d: 1.9, a: C.charcoal, sign: "COFFEE", goods: [C.white, hex("#8b5a3c"), C.cream] });
  pen.pop();
  // the queues
  for (const [x, y, flip, pose] of [
    [36.2, 36.4, false, "stand"],
    [37.1, 36.7, true, "stand"],
    [38.0, 36.5, false, "wave"],
    [39.0, 36.9, true, "stand"],
    [39.8, 41.9, false, "stand"],
    [40.8, 42.2, true, "stand"],
    [41.8, 41.9, false, "stand"],
    [34.6, 41.9, true, "stand"],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), pose, flip, rng.chance(0.15) ? 0.72 : 1);
  }
  // somebody already eating theirs out of the paper, and the pigeon that has noticed
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 42.9, 36.3, 0, lk, "stand", true);
    pen.card(42.9, 36.3, 0, true).poly(
      [
        [0.3, 1.0],
        [0.62, 1.0],
        [0.46, 0.66],
      ],
      C.white,
      { outline: true, w: 0.035, layer: 5, grain: 0 },
    );
  });
  pigeon(pen, 42.3, 37.2, 0, false, true);
  pigeon(pen, 41.7, 36.9, 0, true);
  cafeTable(pen, rng, 33.95, 36.6, C.yellow, 3);
  cafeTable(pen, rng, 37.2, 42.6, null, 2);
  cafeTable(pen, rng, 42.6, 33.4, C.red, 2);
  bin(pen, 33.9, 43.3);
  bin(pen, 43.3, 43.2);
  // lights and bunting strung over it all
  const posts: V2[] = [
    [33.1, 32.4],
    [43.5, 32.4],
    [43.5, 43.5],
    [33.1, 43.5],
  ];
  for (const [x, y] of posts) pen.pole([x, y, 0], [x, y, 3.7], 0.1, C.iron);
  lightString(pen, [33.1, 32.4, 3.7], [43.5, 32.4, 3.7], 11, 0.6);
  lightString(pen, [43.5, 32.4, 3.7], [43.5, 43.5, 3.7], 11, 0.6);
  bunting(pen, [33.1, 32.4, 3.6], [33.1, 43.5, 3.6], 0.7, 0.5);
  bunting(pen, [33.1, 43.5, 3.6], [43.5, 43.5, 3.6], 0.7, 0.5);
}

// ---------------------------------------------------------------- everything that moves

function life(c: LondonCtx): void {
  const { rng } = c;
  const born = c.done;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];

  // ---- the Eye's capsules, going round
  const pods = [0, 1, 2].map((k) => makeSprite((p) => pod(p, 30 + k), 0, 60 + k));
  const hub = W(EX, EY, EZ);
  const turn = (Math.PI * 2) / TURN;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(hub[0], hub[1], hub[2], 24)) return;
    for (let i = 0; i < PODS; i++) {
      const a = (i / PODS) * Math.PI * 2 + m.t * turn;
      m.put(pods[i % 3], hub[0] + Math.cos(a) * (ER + 1.15), hub[1], hub[2] + Math.sin(a) * (ER + 1.15), born + (i % 6) * 0.07);
    }
  });

  // ---- the merry-go-round: eight gallopers rising and falling on their poles
  const coats: RGB[] = [C.white, hex("#f3e3c0"), hex("#dcd7cf")];
  const saddles: RGB[] = [C.red, C.blue, C.green, C.purple, C.orange, C.teal, C.pink, C.yellow];
  const kr = new Rng(606);
  const horses = saddles.map((saddle, i) => {
    const rider = kr.chance(0.75) ? randomLook(kr) : null;
    const coat = coats[i % coats.length];
    return [makeSprite((p) => galloper(p, false, coat, saddle, rider), 0, 200 + i), makeSprite((p) => galloper(p, true, coat, saddle, rider), 0, 200 + i)];
  });
  const cw = W(CAR_X, CAR_Y);
  const spin = (Math.PI * 2) / 9;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(cw[0], cw[1], cw[2] + 2, 10)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => born;
    dp.rng = new Rng(808);
    dp.begin();
    for (let i = 0; i < horses.length; i++) {
      const a = (i / horses.length) * Math.PI * 2 + m.t * spin;
      dp.stroke(
        [
          [cw[0] + Math.cos(a) * 2.25, cw[1] + Math.sin(a) * 2.25, cw[2] + 0.35],
          [cw[0] + Math.cos(a) * 2.25, cw[1] + Math.sin(a) * 2.25, cw[2] + 3.3],
        ],
        { w: 0.07, color: C.gold, kind: L_BAR, wobble: 0 },
      );
    }
    dp.end();
    dp.reveal = keep;
    dp.rng = keepRng;
    for (let i = 0; i < horses.length; i++) {
      const a = (i / horses.length) * Math.PI * 2 + m.t * spin;
      // as they come round the front they are heading to the right, round the back to the left
      const right = -Math.sin(a) - Math.cos(a) > 0;
      m.put(horses[i][right ? 0 : 1], cw[0] + Math.cos(a) * 2.25, cw[1] + Math.sin(a) * 2.25, cw[2] + 0.72 + 0.3 * Math.sin(m.t * 2.4 + i * 2.2), born + i * 0.05);
    }
  });

  // ---- skaters under the beams
  const sr = new Rng(303);
  const skater = (seed: number) => {
    const lk = randomLook(sr);
    const mk = (flip: boolean) =>
      makeSprite(
        (p) => {
          person(p, 0, 0, 0.1, lk, "walkA", flip, 0.9);
          p.card(0, 0, 0, flip).bar(-0.5, 0.06, 0.5, 0.06, 0.1, C.black, { layer: 5 });
        },
        0,
        seed,
      );
    // heading south is down and to the left of the page, heading north up and to the right
    return { south: mk(true), north: mk(false) };
  };
  // one drops in off the quarter pipe and rides the length of the place and back
  const s0 = skater(41);
  c.movers.push((m) => {
    if (m.t < born) return;
    const ph = m.t * 0.74;
    const y = 35.4 + 7.4 * Math.sin(ph);
    const p = W(16.35, y, pipeZ(y));
    m.put(Math.cos(ph) > 0 ? s0.south : s0.north, p[0], p[1], p[2], born);
  });
  // one grinds the ledge and then the rail, every time
  const s1 = skater(42);
  const grind = (y: number): number => {
    const up = (a: number, b: number, h: number) => (y > a - 0.4 && y < b + 0.4 ? h * Math.min(1, (y - (a - 0.4)) / 0.4, (b + 0.4 - y) / 0.4) : 0);
    return Math.max(up(32.5, 36.3, 0.5), up(37.6, 40.6, 0.44));
  };
  c.movers.push((m) => {
    if (m.t < born + 0.3) return;
    const ph = m.t * 0.58 + 1.7;
    const y = 36.6 + 5.9 * Math.sin(ph);
    const p = W(14.8, y, grind(y));
    m.put(Math.cos(ph) > 0 ? s1.south : s1.north, p[0], p[1], p[2], born + 0.3);
  });
  // and one is still learning to ollie
  const s2 = skater(43);
  c.movers.push((m) => {
    if (m.t < born + 0.5) return;
    const ph = m.t * 1.1;
    const y = 39.6 + 1.5 * Math.sin(ph * 0.5);
    const hop = Math.max(0, Math.sin(ph * 2.2)) * 0.55;
    const p = W(15.95, y, hop);
    m.put(Math.cos(ph * 0.5) > 0 ? s2.south : s2.north, p[0], p[1], p[2], born + 0.5);
  });

  // ---- five balls in the air
  const balls = [C.red, C.yellow, C.blue, C.green, C.orange].map((col, i) => makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.16, col, { outline: true, w: 0.035, seg: 8, grain: 0 }), 0, 90 + i));
  c.movers.push((m) => {
    if (m.t < born) return;
    for (let i = 0; i < balls.length; i++) {
      // each ball crosses from one hand to the other in an arc, and back again
      const ph = m.t * 1.15 + i / balls.length;
      const n = Math.floor(ph);
      const u = ph - n;
      const a = (n % 2 === 0 ? 1 : -1) * (u - 0.5) * 0.95;
      const p = W(JUGGLER[0] + a * K, JUGGLER[1] - a * K, 2.6 + 5.2 * u * (1 - u));
      m.put(balls[i], p[0], p[1], p[2], born);
    }
  });

  // ---- the living statue moves only when paid
  const GOLD = hex("#d9b441");
  const gilt: Look = { skin: GOLD, hair: GOLD, top: GOLD, legs: GOLD, long: false, hat: null };
  const pose = (how: Pose) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, gilt, how);
        hat(p, 0, 0, 0, "top", { pose: how, color: GOLD });
      },
      0,
      81,
    );
  const still = [pose("stand"), pose("wave"), pose("cheer")];
  const sp = W(STATUE[0], STATUE[1], 0.6);
  c.movers.push((m) => {
    const u = m.t % 6.5;
    m.put(u < 4.6 ? still[0] : u < 5.6 ? still[1] : still[2], sp[0], sp[1], sp[2], born);
  });

  // ---- soap bubbles: a steady few, and a whole cloud let go as the camera arrives
  const bubble = makeSprite(
    (p) => {
      const k = p.card(0, 0, 0);
      k.circle(0, 0, 0.5, null, { ink: hex("#7fb9dc"), w: 0.055, seg: 14 });
      k.arc(0, 0, 0.36, 0.36, 0.5, 1.5, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, seg: 5 });
      k.arc(0, 0, 0.4, 0.4, 3.6, 4.5, { w: 0.045, color: C.pink, kind: L_MARK, wobble: 0, seg: 5, alpha: 0.85 });
    },
    0,
    51,
  );
  const br = new Rng(515);
  const drift = (wide: number) => ({
    per: br.range(5, 8),
    ph: br.next(),
    dx: br.range(-5.5 * wide, -1 + 2.5 * (wide - 1)),
    dy: br.range(-7 * wide, -2.5),
    top: br.range(4.5, 8.5),
    s: br.range(0.7, 1.5),
    wob: br.range(1.2, 2.4),
    late: br.range(0, 0.5),
  });
  const stream = Array.from({ length: 9 }, () => drift(1));
  const cloud = Array.from({ length: 16 }, () => drift(1.5));
  const wand = W(BUBBLES[0], BUBBLES[1], 2.7);
  const blow = (m: MoveCtx, b: (typeof stream)[number], u: number, life: number) => {
    const e = 1 - (1 - u) * (1 - u);
    const sw = Math.sin(m.t * b.wob + b.ph * 40) * 0.4 * u;
    // sketched in as it leaves the wand; at the end of its life it un-draws itself, which is as near as ink comes to a pop
    const shown = Math.min(u * life, ((1 - u) / 0.1) * 0.5);
    m.put(bubble, wand[0] + b.dx * e + sw, wand[1] + b.dy * e - sw, wand[2] + b.top * u, m.t - Math.max(0, shown), b.s * (0.45 + 0.7 * u));
  };
  c.movers.push((m) => {
    if (m.t < born || !m.sees(wand[0] - 3, wand[1] - 3, wand[2] + 3, 18)) return;
    for (const b of stream) blow(m, b, (m.t / b.per + b.ph) % 1, b.per);
    const at = c.visit();
    const go = at == null ? born + 3 + 16 * Math.floor(Math.max(0, m.t - born - 3) / 16) : at + 0.2;
    for (const b of cloud) {
      const u = (m.t - go - b.late) / 4.4;
      if (u > 0 && u < 1) blow(m, b, u, 4.4);
    }
  });

  // ---- people strolling: round the lawn both ways, round the merry-go-round, up and down between the books and the vans
  const loop = (pts: V2[], r: number) =>
    new Route(
      rounded(
        pts.map(([x, y]) => W(x, y)),
        true,
        r,
      ),
      true,
    );
  const round = loop(
    [
      [19.3, 18.5],
      [34.4, 18.5],
      [34.4, 30.5],
      [19.3, 30.5],
    ],
    1.2,
  );
  const back = loop(
    [
      [19.0, 30.9],
      [34.75, 30.9],
      [34.75, 18.1],
      [19.0, 18.1],
    ],
    1.2,
  );
  const fair = loop(
    [
      [34.95, 16.4],
      [43.45, 16.4],
      [43.45, 25.6],
      [34.95, 25.6],
    ],
    1.0,
  );
  const aisle = loop(
    [
      [31.75, 32.6],
      [32.35, 32.6],
      [32.35, 43.4],
      [31.75, 43.4],
    ],
    0.25,
  );
  for (let i = 0; i < 4; i++) c.movers.push(walker(round, rng, born + rng.range(0, 1)));
  for (let i = 0; i < 4; i++) c.movers.push(walker(back, rng, born + rng.range(0, 1)));
  for (let i = 0; i < 3; i++) c.movers.push(walker(fair, rng, born + rng.range(0, 1)));
  for (let i = 0; i < 3; i++) c.movers.push(walker(aisle, rng, born + rng.range(0, 1)));
}

// ---------------------------------------------------------------- the block

export const southbank: LondonBuilder = (c) => {
  c.early(() => ground(c));
  // the wheel is tall: look up the page from the middle of the block, and step back a little
  c.focus(19, 14, 0.8);

  countyHall(c);
  eye(c);
  queue(c);
  artsCentre(c);
  lawn(c);
  carousel(c);
  performers(c);
  bookMarket(c);
  foodCourt(c);
  life(c);
};
