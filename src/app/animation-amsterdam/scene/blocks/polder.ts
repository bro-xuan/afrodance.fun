// The polder: a scrap of countryside floating off the north-east corner of
// the page. Tulips in long stripes, two small mills keeping the land dry, a
// ditch with a toy drawbridge, cows, a thatched farm, and two cheese carriers
// who never put their barrow down.

import { Rng, V2, V3, hex, mixRGB, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_MARK, L_RIPPLE, Pen } from "../../engine/pen";
import { Look, W_FINE, W_THIN, bike, person, randomLook, tree, tufts, windowAt } from "../kit";
import { Route, Turning, cyclist, makeSprite, rounded, traveler } from "../motion";
import { C, HAIR, SKIN, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";
import { SailStyle, lookOf, millTower, octagon, turningSails } from "./windmill";

const STRAW = hex("#c9a45c");
const STRAW_D = hex("#a8843f");
const THATCH = hex("#8a6f52");
const COW = hex("#fbf8f0");

/** How far the island reaches from its middle, by direction: a soft square with a wobbly edge. */
function reach(th: number): number {
  const c = Math.abs(Math.cos(th));
  const s = Math.abs(Math.sin(th));
  const r = 17.4 / Math.pow(Math.pow(c, 4) + Math.pow(s, 4), 0.25);
  return r * (1 + 0.035 * Math.sin(3 * th + 0.7) + 0.025 * Math.sin(5 * th + 2.1) + 0.012 * Math.sin(11 * th));
}

function onIsland(x: number, y: number, pad = 0): boolean {
  const dx = x - 20;
  const dy = y - 20;
  return Math.hypot(dx, dy) < reach(Math.atan2(dy, dx)) - pad;
}

// the fields, the ditch and the dyke, in island coordinates
const FIELD_Y0 = 13.4;
const STRIPE = 1.3;
const FIELD_Y1 = FIELD_Y0 + 6 * STRIPE;
const FIELDS: [number, number][] = [
  [5.2, 18.2],
  [20.8, 34.6],
];
const DITCH_Y0 = 21.95;
const DITCH_Y1 = 23.75;
const DYKE_Y0 = 10.6;
const DYKE_Y1 = 12.4;
const DYKE_Z = 0.45;

const inField = (x: number, y: number) => y > FIELD_Y0 - 0.2 && y < FIELD_Y1 + 0.2 && ((x > FIELDS[0][0] - 0.2 && x < FIELDS[0][1] + 0.2) || (x > FIELDS[1][0] - 0.2 && x < FIELDS[1][1] + 0.2));

function ground(c: BlockCtx): void {
  const { pen, rng } = c;
  const g0 = pen.floor(0.02, 0);
  const g1 = pen.floor(0.02, 1);
  const g2 = pen.floor(0.02, 2);
  const g3 = pen.floor(0.02, 3);
  // the island itself
  const edge: V2[] = [];
  for (let i = 0; i < 84; i++) {
    const th = (i / 84) * Math.PI * 2;
    const r = reach(th);
    edge.push([20 + Math.cos(th) * r, 20 + Math.sin(th) * r]);
  }
  g0.poly(edge, C.grass);
  for (let k = 0; k < 84; k += 12) {
    const run = edge.slice(k, k + 13);
    if (k + 13 > 84) run.push(edge[0]);
    g1.line(run, { w: 0.14, color: C.grassDark, kind: L_MARK, wobble: 1.6, alpha: 0.8 });
  }
  tufts(g3, 2, 2, 38, 38, 0.22, (a, b) => onIsland(a, b, 0.6) && !inField(a, b) && !(b > DITCH_Y0 - 0.2 && b < DITCH_Y1 + 0.2) && !(b > DYKE_Y0 - 0.2 && b < DYKE_Y1 + 0.2) && !(a > 18.1 && a < 20.9 && b > 12 && b < 25));
  // tulips: six colours to a field, a furrow between each
  for (const [x0, x1] of FIELDS) {
    for (let k = 0; k < 6; k++) {
      const y0 = FIELD_Y0 + k * STRIPE;
      g1.rect(x0, y0 + 0.07, x1, y0 + STRIPE - 0.07, TULIP[k], { grain: 0.9 });
      g2.ticks(x0 + 0.1, y0 + 0.15, x1 - 0.1, y0 + STRIPE - 0.15, { n: 34, len: 0.34, ang: 0.9, jit: 0.6, color: C.leafDark, w: 0.055, alpha: 0.75 });
      g2.seg(x0, y0, x1, y0, { w: 0.11, color: C.grassDark, kind: L_MARK, wobble: 0.7 });
    }
    g2.seg(x0, FIELD_Y1, x1, FIELD_Y1, { w: 0.11, color: C.grassDark, kind: L_MARK, wobble: 0.7 });
    g2.loop(
      [
        [x0, FIELD_Y0],
        [x1, FIELD_Y0],
        [x1, FIELD_Y1],
        [x0, FIELD_Y1],
      ],
      { w: W_THIN },
    );
  }
  // the farm track down the middle, and the lane round the meadow
  g1.rect(18.3, DYKE_Y1, 20.7, DITCH_Y0, C.path);
  g1.rect(18.3, DITCH_Y1, 20.7, 26.1, C.path);
  const lane: V2[] = [];
  const hole: V2[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    lane.push([19.5 + Math.cos(t) * 6.0, 29.2 + Math.sin(t) * 4.1]);
    hole.push([19.5 + Math.cos(t) * 4.5, 29.2 + Math.sin(t) * 2.6]);
  }
  g1.poly(lane, C.path);
  g2.poly(hole, C.grass);
  // the ditch
  const north: V2[] = [];
  const south: V2[] = [];
  for (let x = 2.6; x <= 37.5; x += 1.4) {
    if (!onIsland(x, 22.8, -0.3)) continue;
    north.push([x, DITCH_Y0 + 0.12 * Math.sin(x * 0.9)]);
    south.push([x, DITCH_Y1 + 0.12 * Math.sin(x * 0.7 + 1)]);
  }
  g1.poly([...north, ...south.slice().reverse()], C.water, { kind: F_WATER });
  g2.line(north, { w: 0.09, color: C.waterInk, kind: L_MARK, wobble: 0.8 });
  g2.line(south, { w: 0.09, color: C.waterInk, kind: L_MARK, wobble: 0.8 });
  g2.ticks(4, DITCH_Y0 + 0.3, 36, DITCH_Y1 - 0.3, { n: 26, len: 1.1, ang: -Math.PI / 4, jit: 0.08, bend: 0.2, color: C.waterInk, w: 0.07, kind: L_RIPPLE, alpha: 0.8 });
  // reeds along both banks
  pen.obj(() => {
    for (let i = 0; i < 70; i++) {
      const x = rng.range(3.4, 36.6);
      if (x > 18 && x < 21) continue;
      const y = rng.chance(0.5) ? DITCH_Y0 + rng.range(-0.1, 0.12) : DITCH_Y1 + rng.range(-0.12, 0.1);
      pen.stroke(
        [
          [x, y, 0.02],
          [x + rng.range(-0.12, 0.12), y, rng.range(0.55, 1.05)],
        ],
        { w: 0.07, color: C.leafDark, kind: L_BAR, wobble: 0, swayB: 0.3 },
      );
    }
  });
}

/** The dyke: a low bank with the cycle path along the top. */
function dyke(c: BlockCtx): void {
  const { pen } = c;
  pen.obj(() => {
    pen.extrude(
      [
        [4.6, DYKE_Y0],
        [35.4, DYKE_Y0],
        [35.9, 11.5],
        [35.4, DYKE_Y1],
        [4.6, DYKE_Y1],
        [4.1, 11.5],
      ],
      0,
      DYKE_Z,
      C.grassDark,
      { top: C.path, w: 0.1 },
    );
    const g = pen.floor(DYKE_Z, 1);
    for (let x = 5.2; x < 35; x += 1.6) g.seg(x, 11.5, x + 0.8, 11.5, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.3 });
  });
}

/** Tulip heads: dots of lighter and darker colour standing a little off the ground, nodding in the wind. */
function tulips(c: BlockCtx): void {
  const { pen, rng } = c;
  for (const [x0, x1] of FIELDS) {
    for (let k = 0; k < 6; k++) {
      const y0 = FIELD_Y0 + k * STRIPE;
      const light = mixRGB(TULIP[k], C.white, k === 4 ? 0 : 0.42);
      const dark = scaleRGB(TULIP[k], k === 4 ? 0.86 : 0.8);
      const n = Math.round((x1 - x0) * 6.5);
      pen.begin();
      for (let i = 0; i < n; i++) {
        const cd = pen.card(rng.range(x0 + 0.15, x1 - 0.15), rng.range(y0 + 0.22, y0 + STRIPE - 0.22), 0.02);
        cd.ellipse(0, 0.3, 0.11, 0.15, i % 2 === 0 ? light : dark, { seg: 6, grain: 0, sway: 0.1 });
      }
      pen.end();
    }
  }
}

function cow(pen: Pen, rng: Rng, grazing: boolean, lying = false): void {
  const p = pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true);
  const dz = lying ? -0.62 : 0;
  pen.begin();
  if (!lying) for (const a of [-0.78, 0.62]) p.bar(a, 0.95, a, 0.1, 0.2, scaleRGB(COW, 0.9), { layer: 0 });
  p.bar(-1.05, 1.5 + dz, -1.3, 0.8 + dz * 0.4, 0.07, C.black, { layer: 0, swayB: 0.35 });
  p.poly(
    [
      [-1.06, 0.88 + dz],
      [-0.98, 1.6 + dz],
      [0.86, 1.66 + dz],
      [1.08, 1.32 + dz],
      [1.0, 0.86 + dz],
      [0.1, 0.78 + dz],
    ],
    COW,
    { outline: true, w: W_THIN, layer: 1 },
  );
  const patches: V2[][] = [
    [
      [-0.9, 1.0],
      [-0.5, 0.92],
      [-0.3, 1.3],
      [-0.6, 1.58],
      [-0.95, 1.5],
    ],
    [
      [0.2, 1.62],
      [0.75, 1.62],
      [0.9, 1.3],
      [0.55, 1.12],
      [0.15, 1.3],
    ],
  ];
  for (const q of patches) {
    if (rng.chance(0.85))
      p.poly(
        q.map((v) => [v[0] + rng.range(-0.06, 0.06), v[1] + dz + rng.range(-0.04, 0.04)] as V2),
        C.black,
        { layer: 2, grain: 0.4 },
      );
  }
  if (!lying) {
    p.ellipse(-0.42, 0.78, 0.2, 0.13, C.pink, { outline: true, w: W_FINE, layer: 2, seg: 7 });
    for (const a of [-0.58, 0.82]) p.bar(a, 0.95, a, 0.1, 0.2, COW, { layer: 3 });
  }
  // head: down in the grass, or up and chewing
  const hx = grazing ? 1.42 : 1.5;
  const hy = (grazing ? 0.5 : 1.72) + (grazing ? 0 : dz);
  p.poly(
    [
      [0.82, 1.6 + dz],
      [1.06, 1.3 + dz],
      [hx + 0.05, hy - 0.05],
      [hx - 0.25, hy + 0.12],
    ],
    COW,
    { outline: true, w: W_THIN, layer: 3 },
  );
  const tilt = grazing ? -1.05 : -0.2;
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const head: V2[] = [];
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2;
    const u = Math.cos(t) * 0.4;
    const v = Math.sin(t) * 0.22;
    head.push([hx + u * cs - v * sn, hy + u * sn + v * cs]);
  }
  p.poly(head, C.black, { outline: true, w: W_THIN, layer: 4 });
  p.circle(hx + 0.3 * cs, hy + 0.3 * sn, 0.13, C.pink, { seg: 6, layer: 5, grain: 0 });
  p.bar(hx - 0.3 * cs - 0.1 * sn, hy - 0.3 * sn + 0.1 * cs, hx - 0.42 * cs - 0.28 * sn, hy - 0.42 * sn + 0.28 * cs, 0.07, C.cream, { layer: 5 });
  pen.end();
}

function stork(pen: Pen, x: number, y: number, z: number): void {
  const cd = pen.card(x, y, z);
  pen.begin();
  cd.bar(-0.05, 0.75, -0.05, 0, 0.05, C.red, { ink: false });
  cd.bar(0.1, 0.75, 0.12, 0, 0.05, C.red, { ink: false });
  cd.ellipse(0, 0.95, 0.42, 0.26, C.white, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  cd.poly(
    [
      [-0.45, 0.98],
      [-0.12, 0.84],
      [-0.1, 1.06],
    ],
    C.black,
    { layer: 2, grain: 0.3 },
  );
  cd.bar(0.3, 1.05, 0.42, 1.55, 0.11, C.white, { layer: 1 });
  cd.circle(0.44, 1.62, 0.13, C.white, { outline: true, w: W_FINE, layer: 2, seg: 7 });
  cd.bar(0.54, 1.62, 0.95, 1.5, 0.06, C.red, { layer: 3, ink: false });
  pen.end();
}

function duck(pen: Pen, small: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const k = small ? 0.5 : 1;
  pen.begin();
  cd.ellipse(0, 0.18 * k, 0.36 * k, 0.2 * k, small ? C.yellow : hex("#b99772"), { outline: true, w: W_FINE, seg: 9 });
  cd.circle(0.3 * k, 0.42 * k, 0.15 * k, small ? C.yellow : C.green, { outline: true, w: W_FINE, layer: 1, seg: 7 });
  cd.poly(
    [
      [0.42 * k, 0.45 * k],
      [0.62 * k, 0.4 * k],
      [0.42 * k, 0.35 * k],
    ],
    C.orange,
    { layer: 2, grain: 0 },
  );
  cd.seg(-0.5 * k, 0.03, -0.9 * k, 0.03, { w: 0.06, color: C.white, kind: L_RIPPLE, wobble: 0, alpha: 0.9 });
  pen.end();
}

/** Two carriers in white with a barrow of cheeses slung between them, walking along local +x. */
function carriers(pen: Pen, looks: [Look, Look], frame: number): void {
  person(pen, 1.35, 0, 0, looks[0], frame === 0 ? "walkA" : "walkB");
  person(pen, -1.35, 0, 0, looks[1], frame === 0 ? "walkB" : "walkA");
  pen.box(-0.95, -0.44, 0.62, 1.9, 0.88, 0.12, C.red, { top: C.wood, w: W_THIN });
  for (const s of [-1, 1]) {
    pen.pole([-1.3, s * 0.4, 0.86], [1.3, s * 0.4, 0.86], 0.08, C.red);
  }
  const wheels: [number, number][] = [
    [-0.6, -0.2],
    [0, -0.2],
    [0.6, -0.2],
    [-0.6, 0.22],
    [0, 0.22],
    [0.6, 0.22],
  ];
  for (const [x, y] of wheels) pen.cyl(x, y, 0.74, 0.27, 0.2, C.gold, { seg: 8, top: C.yellow, w: W_FINE });
}

function farm(c: BlockCtx): void {
  const { pen, rng } = c;
  const x0 = 16.2;
  const y0 = 4.4;
  const w = 7.8;
  const d = 4.9;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, 2.5, C.white);
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.rect(1.0, 0, 2.0, 1.9, C.door, { outline: true, w: W_THIN });
    for (const a of [3.0, 5.4]) {
      windowAt(f, a, 0.8, a + 1.1, 1.9, rng.chance(0.7));
      f.rect(a - 0.42, 0.8, a - 0.05, 1.9, C.green, { outline: true, w: W_FINE, layer: 1 });
      f.rect(a + 1.15, 0.8, a + 1.52, 1.9, C.green, { outline: true, w: W_FINE, layer: 1 });
    }
    const g = pen.wall("x+", x0, y0, 0, w, d);
    g.rect(1.2, 0, 3.7, 2.2, C.woodDark, { outline: true, w: W_THIN });
    g.seg(2.45, 0, 2.45, 2.2, { w: 0.05, wobble: 0 });
    g.line(
      [
        [1.2, 0],
        [2.45, 2.2],
        [3.7, 0],
      ],
      { w: 0.05, wobble: 0.3 },
    );
  });
  pen.obj(() => {
    // a deep thatched roof, combed
    pen.hip(x0 - 0.4, y0 - 0.4, 2.5, w + 0.8, d + 0.8, 3.3, STRAW);
    const slope = pen.plane([x0 - 0.4, y0 + d + 0.4, 2.5], [1, 0, 0], [0, -(d + 0.8) / 2 / 4.36, 3.3 / 4.36], 1, true);
    slope.ticks(0.6, 0.3, w + 0.2, 3.9, {
      n: 70,
      len: 0.6,
      ang: Math.PI / 2,
      jit: 0.1,
      color: STRAW_D,
      w: 0.055,
      inside: (a, b) => a > 0.2 + b * 0.62 && a < w + 0.6 - b * 0.62,
    });
    pen.box(x0 + 1.4, y0 + 1.6, 4.4, 0.8, 0.8, 1.9, C.brick, { top: C.charcoal, w: W_THIN });
  }, 0.1);
  // haystacks, a hand cart of cheese, the farmer with his barrow
  pen.dome(25.9, 8.4, 0, 1.15, 1.5, STRAW, { seg: 10, rings: 3 });
  pen.dome(27.0, 6.0, 0, 1.0, 1.3, STRAW, { seg: 10, rings: 3 });
  pen.obj(() => {
    pen.box(11.6, 9.0, 0.42, 2.0, 1.0, 0.14, C.wood, { w: W_THIN });
    for (const s of [9.0, 10.0]) pen.plane([12.6, s, 0], [1, 0, 0], [0, 0, 1], 0, true).circle(0, 0.38, 0.38, null, { w: 0.08, seg: 10, wobble: 0 });
    pen.pole([13.6, 9.5, 0.5], [14.4, 9.5, 0.75], 0.07, C.woodDark, { ink: false });
    const cheeses: [number, number, number][] = [
      [12.0, 9.28, 0.56],
      [12.62, 9.28, 0.56],
      [13.24, 9.28, 0.56],
      [12.0, 9.74, 0.56],
      [12.62, 9.74, 0.56],
      [13.24, 9.74, 0.56],
      [12.31, 9.5, 0.78],
      [12.93, 9.5, 0.78],
    ];
    for (const [x, y, z] of cheeses) pen.cyl(x, y, z, 0.29, 0.22, z > 0.6 ? C.orange : C.gold, { seg: 8, top: C.yellow, w: W_FINE });
  });
  person(pen, 14.9, 9.7, 0, lookOf(SKIN[0], HAIR[4], C.white, C.white, false, STRAW), "stand", true);
  person(pen, 24.2, 9.8, 0, lookOf(SKIN[1], HAIR[1], hex("#27456b"), hex("#6f5d4d"), false, hex("#3f6f5c")), "stand");
  pen.box(24.7, 9.5, 0.2, 0.9, 0.55, 0.32, C.green, { top: STRAW, w: W_FINE });
  // a stork on a pole, as there should be
  pen.obj(() => {
    pen.pole([14.2, 5.2, 0], [14.2, 5.2, 5.6], 0.16, C.woodDark);
    pen.cyl(14.2, 5.2, 5.6, 0.7, 0.22, hex("#7c5a3a"), { seg: 9, w: W_THIN });
  });
  stork(pen, 14.2, 5.2, 5.82);
  tree(pen, rng, 24.6, 4.0, { kind: "round" });
  tree(pen, rng, 12.2, 3.6, { kind: "tall" });
}

function bridgeAndDitch(c: BlockCtx): void {
  const { pen } = c;
  // the toy drawbridge every polder ditch deserves
  pen.obj(() => {
    pen.box(18.5, DITCH_Y0 - 0.25, 0.1, 2.0, DITCH_Y1 - DITCH_Y0 + 0.5, 0.12, C.wood, { w: W_THIN });
    for (const x of [18.45, 20.55]) {
      pen.pole([x, DITCH_Y0 - 0.15, 0], [x, DITCH_Y0 - 0.15, 3.1], 0.13, C.white);
      pen.pole([x, DITCH_Y0 - 1.3, 2.85], [x, DITCH_Y1 - 0.1, 3.45], 0.11, C.white);
      pen.stroke(
        [
          [x, DITCH_Y1 - 0.1, 3.45],
          [x, DITCH_Y1 - 0.1, 0.24],
        ],
        { w: 0.04, kind: L_BAR, wobble: 0 },
      );
    }
    pen.pole([18.45, DITCH_Y0 - 0.15, 3.1], [20.55, DITCH_Y0 - 0.15, 3.1], 0.11, C.white);
    pen.pole([18.45, DITCH_Y0 - 1.3, 2.85], [20.55, DITCH_Y0 - 1.3, 2.85], 0.3, C.greyDark);
  });
  // a heron, waiting
  const cd = pen.card(31.6, DITCH_Y0 + 0.35, 0.02);
  pen.begin();
  cd.bar(0, 0.7, 0, 0, 0.05, C.greyDark, { ink: false });
  cd.ellipse(0, 0.9, 0.4, 0.24, C.slateLight, { outline: true, w: W_FINE, layer: 1, seg: 9 });
  cd.line(
    [
      [0.28, 1.0],
      [0.45, 1.3],
      [0.3, 1.58],
      [0.4, 1.8],
    ],
    { w: 0.1, color: C.slateLight, kind: L_BAR, wobble: 0, layer: 1 },
  );
  cd.circle(0.42, 1.86, 0.12, C.white, { outline: true, w: W_FINE, layer: 2, seg: 7 });
  cd.bar(0.5, 1.86, 0.92, 1.76, 0.05, C.gold, { layer: 3, ink: false });
  pen.end();
  // pollard willows along the south bank
  for (const x of [5.6, 10.2, 14.8, 24.6, 29.2, 33.6]) tree(pen, c.rng, x, DITCH_Y1 + 0.75, { kind: "round", h: 1.25, r: 1.1, color: C.leaf3 });
}

function meadow(c: BlockCtx): void {
  const { pen, rng } = c;
  const herd: [number, number, number, boolean, boolean][] = [
    [8.4, 27.0, 0, true, false],
    [11.6, 30.6, 180, false, false],
    [13.6, 26.4, 90, true, false],
    [26.6, 27.2, 180, true, false],
    [29.6, 25.6, 0, false, false],
    [30.6, 30.2, 270, true, false],
    [24.4, 32.2, 0, false, false],
  ];
  for (const [x, y, rot, grazing, lying] of herd) {
    pen.push(x, y, 0.02, rot);
    cow(pen, rng, grazing, lying);
    pen.pop();
  }
  // milk churns waiting for the lorry
  for (const [x, y] of [
    [21.6, 25.0],
    [22.3, 25.2],
    [21.9, 25.7],
  ] as const) {
    pen.cyl(x, y, 0, 0.27, 0.75, C.metal, { seg: 8, top: C.grey, w: W_FINE, r2: 0.2 });
  }
  // the painter, with the whole view on a small canvas
  person(pen, 27.2, 25.0, 0, lookOf(SKIN[0], HAIR[7], hex("#3f6f8f"), hex("#6f5d4d"), false, C.black), "stand", true);
  pen.obj(() => {
    for (const [dx, dy] of [
      [-0.5, 0.0],
      [0.5, 0.0],
      [0, -0.55],
    ] as const) {
      pen.pole([26.35 + dx, 24.55 + dy, 0], [26.35, 24.4, 1.75], 0.07, C.woodDark, { ink: false });
    }
    const cv = pen.plane([25.85, 24.52, 0.85], [1, 0, 0], [0, 0, 1], 1, true);
    cv.rect(0, 0, 1.0, 0.78, C.white, { outline: true, w: W_FINE });
    for (let k = 0; k < 6; k++) cv.rect(0.06, 0.08 + k * 0.105, 0.94, 0.17 + k * 0.105, TULIP[5 - k], { layer: 1, grain: 0 });
  });
  // visitors on the farm track: photographs, a child loose among the flowers
  const snaps: [number, number, boolean, number, "stand" | "wave" | "cheer"][] = [
    [19.0, 14.6, true, 1, "stand"],
    [20.0, 15.4, false, 1, "wave"],
    [19.2, 17.6, false, 1, "stand"],
    [19.9, 18.6, true, 0.72, "cheer"],
    [20.2, 19.6, true, 1, "wave"],
    [16.6, 17.4, false, 0.72, "cheer"],
    [22.6, 15.8, true, 1, "wave"],
  ];
  for (const [x, y, flip, s, pose] of snaps) person(pen, x, y, 0.02, randomLook(rng), pose, flip, s);
  // a sign, in case anyone was unsure
  pen.obj(() => {
    pen.pole([21.2, 12.9, 0], [21.2, 12.9, 1.6], 0.09, C.woodDark);
    pen.pole([23.5, 12.9, 0], [23.5, 12.9, 1.6], 0.09, C.woodDark);
    const sg = pen.plane([21.2, 12.92, 0.9], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, 2.3, 0.72, C.cream, { outline: true, w: W_FINE });
    sg.text("TULPEN", 1.15, 0.17, 0.38, { align: "c", layer: 1 });
  });
  // two more on the dyke, bikes leant together
  person(pen, 9.6, 11.9, DYKE_Z, randomLook(rng), "wave");
  person(pen, 10.5, 12.0, DYKE_Z, randomLook(rng), "stand", true);
  pen.push(8.2, 12.05, DYKE_Z, 8);
  bike(pen, { color: C.blueDark, crate: true });
  pen.pop();
  pen.push(8.0, 11.8, DYKE_Z, -6);
  bike(pen, { color: C.redDark });
  pen.pop();
  tree(pen, rng, 4.6, 14.6, { kind: "tall" });
  tree(pen, rng, 35.2, 14.2, { kind: "tall" });
  tree(pen, rng, 34.6, 31.0, { kind: "round" });
  tree(pen, rng, 6.4, 32.2, { kind: "bush" });
}

export const polder: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.early(() => ground(c));
  c.focus(20, 19, 1.15);
  dyke(c);
  tulips(c);

  // two polder mills: thatch down to a low brick plinth, tails to the ground
  const style: SailStyle = { stock: C.white, lattice: hex("#7a4a33"), cloth: hex("#f1e6cf") };
  const mills: [number, number, "x" | "y", number, number][] = [
    [9.2, 6.4, "y", 0.74, 0.2],
    [30.4, 6.0, "x", 0.58, 1.1],
  ];
  for (const [mx, my, facing, rate, phase] of mills) {
    pen.push(mx, my, 0);
    pen.extrude(octagon(0, 0, 2.3), 0, 0.5, C.brick, { top: C.quayCap, w: 0.1 });
    const hub = millTower(pen, rng, { baseR: 2.4, baseH: 0, bodyH: 6.6, brick: C.brick, body: THATCH, cap: C.white, facing, gallery: false, lit: 0.8 });
    pen.pop();
    const hubW: V3 = [c.ox + mx + hub[0], c.oy + my + hub[1], c.oz + hub[2]];
    c.movers.push(turningSails(hubW, facing, 4.7, style, pen.reveal(c.ox + mx, c.oy + my, 0) + 0.9, rate, phase));
  }

  farm(c);
  bridgeAndDitch(c);
  meadow(c);

  const born = c.done;
  // cyclists up and down the dyke
  const top = c.oz + DYKE_Z;
  const path = new Route(
    rounded(
      [
        [c.ox + 5.4, c.oy + 11.12, top],
        [c.ox + 34.6, c.oy + 11.12, top],
        [c.ox + 34.6, c.oy + 11.88, top],
        [c.ox + 5.4, c.oy + 11.88, top],
      ],
      true,
      0.36,
    ),
    true,
  );
  for (let i = 0; i < 3; i++) c.movers.push(cyclist(path, rng, born + i * 0.3, 3.6 + i * 0.5, 0.15 + i * 0.31));

  // the cheese carriers, round and round the meadow at a trot
  const looks: [Look, Look] = [lookOf(SKIN[0], HAIR[3], C.white, C.white, false, C.orange), lookOf(SKIN[2], HAIR[0], C.white, C.white, false, C.green)];
  const trot = [0, 1].map((f) => new Turning((p) => carriers(p, looks, f), 24, 33 + f));
  const round: V3[] = [];
  for (let i = 0; i < 32; i++) {
    const t = (i / 32) * Math.PI * 2;
    round.push([c.ox + 19.5 + Math.cos(t) * 5.25, c.oy + 29.2 + Math.sin(t) * 3.35, c.oz + 0.02]);
  }
  const lane = new Route(round, true);
  c.movers.push(traveler(lane, { speed: 1.9, at: 0.1, born: born + 0.4, span: 1.6, sprite: (h, t) => trot[Math.floor(t * 3.4) & 1].at(h) }));

  // a duck and her brood on the ditch
  const fowl: Sprite[][] = [
    [makeSprite((p) => duck(p, false, false)), makeSprite((p) => duck(p, false, true))],
    [makeSprite((p) => duck(p, true, false)), makeSprite((p) => duck(p, true, true))],
  ];
  const swim = new Route(
    rounded(
      [
        [c.ox + 6, c.oy + 22.6, c.oz + 0.03],
        [c.ox + 16.6, c.oy + 22.6, c.oz + 0.03],
        [c.ox + 16.6, c.oy + 23.15, c.oz + 0.03],
        [c.ox + 6, c.oy + 23.15, c.oz + 0.03],
      ],
      true,
      0.27,
    ),
    true,
  );
  for (let i = 0; i < 5; i++) {
    c.movers.push(
      traveler(swim, {
        speed: 0.75,
        at: 0.3 - (i === 0 ? 0 : 0.03 + i * 0.022),
        born: born + 0.5 + i * 0.1,
        span: 0.4,
        sprite: (h) => fowl[i === 0 ? 0 : 1][Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1],
      }),
    );
  }
};
