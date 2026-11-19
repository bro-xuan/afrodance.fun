// The West End. In front, Trafalgar Square: Nelson on his column between two
// fountains, four bronze lions that children are always being told to get
// down from, a big blue cockerel on the fourth plinth, and the National
// Gallery up a flight of steps. Behind it the lights of Piccadilly wrap a
// round corner, a theatre has HAMLET! up in bulbs and a queue under its
// canopy, Eros balances on one foot over his fountain while pedicabs circle
// him, and a red and gold gate leads into Chinatown under the steeple of St
// Martin's. When the camera arrives every sign changes at once and the
// fountains jump.

import { RGB, Rng, V2, V3, ease, hex, scaleRGB, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, Turning, WalkerKind, castWalker, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  archWindow,
  bike,
  bobby,
  bricks,
  bulb,
  clock,
  dogOn,
  flag,
  fountain,
  globeLamp,
  hat,
  horse,
  neonSign,
  person,
  pigeon,
  pigeonOn,
  portico,
  railing,
  randomLook,
  snapper,
  speckle,
  stall,
  steps,
  suit,
  tree,
  tubeEntrance,
  umbrella,
  windowAt,
  windowGrid,
} from "../props";
import { Mover } from "../types";

const STONE = C.portland;
const STONE_D = C.portlandDark;
const STONE_L = C.portlandLight;
const BRONZE = hex("#56655d");
const JADE = hex("#2f8f6f");
const ULTRA = hex("#2456d8");

// The National Gallery: its footprint, the height of its walls, and of the terrace along its front.
const GX0 = 5;
const GX1 = 26;
const GY0 = 15;
const GY1 = 21;
const GH = 5.8;
const TER = 0.9;
// The building that carries the lights: footprint, height, and the round corner the screens wrap.
const SX0 = 4.5;
const SX1 = 17.5;
const SY0 = 4.5;
const SY1 = 10.5;
const SH = 12;
const CR = 2.5;
const CCX = SX1 - CR;
const CCY = SY1 - CR;
const FACETS = 5;
const FACET_W = 2 * CR * Math.sin(Math.PI / (4 * FACETS));
// The theatre, and the canopy over its doors.
const TX0 = 19;
const TX1 = 27.8;
const TY0 = 4.5;
const TY1 = 10;
const TH = 8.5;
const CAN_X0 = TX0 + 0.2;
const CAN_W = TX1 - TX0 - 0.4;
const CAN_D = 2.3;
const CAN_Z = 3.0;
// St Martin's.
const MX0 = 30.8;
const MX1 = 37.2;
const MY0 = 4.5;
const MY1 = 10.5;
const MH = 6.5;
// The gate into Chinatown: where its two pillars stand, and the line they stand on.
const GATE_A = 38.2;
const GATE_B = 43.0;
const GATE_Y = 9.7;
/** Where things stand: Eros, Nelson, the two fountains, and the patch the pigeons like. */
const EROS: V2 = [31.7, 19.3];
const NELSON: V2 = [24, 37.5];
const FOUNT: V2[] = [
  [13.5, 31.9],
  [34.5, 31.9],
];
const FOUNT_R = 2.8;
const PIGEONS: V2 = [24, 29.4];
/** The living statue's box, the busker, and the man asleep on the terrace. */
const STATUE: V2 = [8.2, 39.4];
const BUSKER: V2 = [16.6, 40.3];
const SLEEPER: V2 = [17.6, 24.55];

/** The biggest lettering (cap height) at which a word fits a width. */
const fit = (str: string, width: number, max: number) => Math.min(max, (6 * width) / (str.length * 5.5 - 1.5));

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
  // Trafalgar Square: pale stone with a border and a grid of joints
  g1.rect(4.15, 24.6, 43.85, 43.85, C.plaza, { grain: 0.7 });
  g2.loop(
    [
      [4.7, 25.1],
      [43.3, 25.1],
      [43.3, 43.4],
      [4.7, 43.4],
    ],
    { w: 0.06, color: C.streetDark, kind: L_MARK },
  );
  for (let y = 28.7; y < 43; y += 3.6) g2.seg(4.9, y, 43.1, y, { w: 0.04, color: C.streetDark, kind: L_MARK, alpha: 0.6, wobble: 0.6 });
  for (let x = 9.5; x < 43; x += 4.8) g2.seg(x, 25.3, x, 43.2, { w: 0.04, color: C.streetDark, kind: L_MARK, alpha: 0.6, wobble: 0.6 });
  speckle(g2, 4.4, 25.2, 43.6, 43.6, C.streetDark, 0.2);
  // rings in the paving round Eros, and warmer stone down the lane into Chinatown
  for (const r of [3.2, 3.9]) g2.arc(EROS[0], EROS[1], r, r, 0, Math.PI * 2, { w: 0.06, color: C.flagDark, kind: L_MARK, wobble: 0.6, seg: 40, alpha: 0.9 });
  g1.rect(37.65, 4.15, 43.85, 9.3, hex("#ecd3bf"), { grain: 0.7 });
  speckle(g2, 26.8, 10.6, 43.6, 24.4, C.flagDark, 0.18, (a, b) => !(a > MX0 - 0.2 && a < MX1 + 0.2 && b < 14.3) && Math.hypot(a - EROS[0], b - EROS[1]) > 2.7);
}

// ---------------------------------------------------------------- the National Gallery

function gallery(c: LondonCtx): void {
  const { pen, rng } = c;
  const W = GX1 - GX0;
  const D = GY1 - GY0;
  const lit = () => rng.chance(0.75);
  // the terrace along its front, and the steps down into the square
  pen.obj(() => {
    pen.box(GX0, GY1, 0, W + 0.5, 3.2, TER, STONE_D, { top: C.plaza });
    bricks(pen.wall("y+", GX0, GY1, 0, W + 0.5, 3.2), 0.2, 0.1, W + 0.3, TER - 0.1, scaleRGB(STONE_D, 0.86), 0.5);
  });
  steps(pen, 11, GY1 + 3.2, 0, 9, 2.0, TER, 3, STONE);
  for (const [xa, xb] of [
    [GX0 + 0.15, 10.9],
    [20.1, GX1 + 0.35],
  ]) {
    railing(
      pen,
      [
        [xa, GY1 + 3.05, TER],
        [xb, GY1 + 3.05, TER],
      ],
      0.65,
      STONE_D,
      0.7,
    );
  }
  pen.obj(() => {
    pen.box(GX0, GY0, 0, W, D, GH, STONE, { top: STONE_D });
    const f = pen.wall("y+", GX0, GY0, 0, W, D);
    f.rect(0, TER, W, 1.55, STONE_D, { grain: 0.6 });
    f.seg(0, 1.55, W, 1.55, { w: W_FINE });
    f.rect(0, GH - 0.72, W, GH - 0.4, STONE_L, { grain: 0.4, layer: 1 });
    f.seg(0, GH - 0.72, W, GH - 0.72, { w: W_FINE, layer: 1 });
    // each wing: three tall round-headed windows between flat pilasters
    for (const a0 of [0, 14.5]) {
      for (let k = 0; k <= 3; k++) {
        const a = a0 + 0.3 + k * 1.97;
        f.rect(a - 0.14, 1.55, a + 0.14, GH - 0.72, STONE_L, { grain: 0.4, outline: true, w: 0.04, ink: STONE_D });
      }
      for (let k = 0; k < 3; k++) {
        const a = a0 + 1.285 + k * 1.97;
        archWindow(f, a - 0.52, 2.0, a + 0.52, 4.55, lit(), STONE_L);
      }
    }
    // the door behind the columns
    f.rect(9.7, TER, 11.3, 3.7, C.woodDark, { outline: true, w: W_THIN, layer: 1 });
    f.rect(9.7, 3.8, 11.3, 4.4, C.glass, { outline: true, w: W_FINE, glow: 1, layer: 1 });
    // two long banners for the exhibition
    for (const [a, col] of [
      [2.27, C.red],
      [18.74, C.royal],
    ] as const) {
      f.rect(a - 0.42, 1.75, a + 0.42, 4.95, col, { outline: true, w: W_FINE, layer: 2, grain: 0.4, sway: 0.04 });
      f.seg(a, 2.1, a, 4.6, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.2, layer: 3, sway: 0.04 });
    }
    const e = pen.wall("x+", GX0, GY0, 0, W, D);
    e.rect(0, 0, D, 1.55, STONE_D, { grain: 0.6 });
    e.rect(0, GH - 0.72, D, GH - 0.4, STONE_L, { grain: 0.4, layer: 1 });
    e.seg(0, GH - 0.72, D, GH - 0.72, { w: W_FINE, layer: 1 });
    for (const a of [1.6, 4.4]) archWindow(e, a - 0.55, 2.0, a + 0.55, 4.55, lit(), STONE_L);
  });
  // the parapet, and a little domed turret over each wing
  pen.obj(() => {
    pen.box(GX0 + 0.2, GY0 + 0.2, GH, W - 0.4, D - 0.4, 0.42, STONE_L, { top: C.lead, w: W_THIN });
    for (const x of [7.5, 23.5]) {
      pen.cyl(x, 18, GH + 0.42, 0.85, 1.05, STONE_L, { seg: 8, w: W_THIN });
      pen.dome(x, 18, GH + 1.47, 0.9, 0.95, C.lead, { seg: 8, rings: 3, w: W_THIN });
    }
  }, 0.12);
  portico(pen, 11.5, GY1, TER, 8, 2.3, GH - TER - 0.7, 6, { stone: STONE, roof: C.lead, pediment: 1.5 });
  pen.obj(() => {
    const f = pen.wall("y+", 11.35, GY1, GH - 0.7, 8.3, 2.45);
    f.text("NATIONAL GALLERY", 4.15, 0.17, fit("NATIONAL GALLERY", 7.3, 0.4), { align: "c", w: 0.06, wobble: 0.25, layer: 1 });
  }, 0.2);
  // the dome over the middle: small for so long a building, as everyone has always said
  pen.obj(() => {
    const z0 = GH + 0.42;
    pen.cyl(15.5, 18, z0, 2.0, 1.5, STONE_L, { seg: 14, w: W_THIN, top: STONE_D });
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2 + 0.2;
      if (Math.cos(t - Math.PI / 4) < 0.1) continue;
      const x = 15.5 + Math.cos(t) * 2.04;
      const y = 18 + Math.sin(t) * 2.04;
      pen.stroke(
        [
          [x, y, z0 + 0.35],
          [x, y, z0 + 1.15],
        ],
        { w: 0.3, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.dome(15.5, 18, z0 + 1.5, 2.1, 2.2, C.lead, { seg: 14, rings: 4 });
    pen.cyl(15.5, 18, z0 + 3.65, 0.5, 0.75, STONE_L, { seg: 8, w: W_FINE });
    pen.dome(15.5, 18, z0 + 4.4, 0.55, 0.5, C.lead, { seg: 8, rings: 2, w: W_FINE });
    pen.card(15.5, 18, z0 + 4.88).circle(0, 0.16, 0.15, C.gold, { seg: 7, outline: true, w: 0.03, grain: 0.2 });
  }, 0.3);
  flag(pen, 15.5, GY1 + 2.3, GH + 1.5, 2.6, "uk", 0.8);
  pen.obj(() => {
    for (const x of [13, 15.5, 18]) {
      pen.stroke(
        [
          [x, GY1 + 2.5, TER + 1.8],
          [x, GY1 + 2.52, TER + 1.8],
        ],
        { w: 2.8, kind: L_LIGHT, wobble: 0, alpha: 0.32 },
      );
    }
  }, 0.3);
  globeLamp(pen, GX0 + 0.5, GY1 + 2.7, TER, 2.7, 1);
  globeLamp(pen, GX1 - 0.1, GY1 + 2.7, TER, 2.7, 1);
}

// ---------------------------------------------------------------- the lights of Piccadilly

interface Panel {
  /** Which wall it is on: 0 faces the Gallery, 1 faces the theatre. */
  face: number;
  a0: number;
  b0: number;
  a1: number;
  b1: number;
  /** What it says in turn; null is a picture instead. */
  words: (string | null)[];
  hue: number;
  /** Seconds between changes, and where in that it starts. */
  period: number;
  phase: number;
}

const PANELS: Panel[] = [
  { face: 0, a0: 0.35, b0: 7.55, a1: 6.3, b1: 11.35, words: ["LONDON", "HELLO", "TEA"], hue: 0, period: 2.9, phase: 0.3 },
  { face: 0, a0: 6.65, b0: 7.55, a1: 10.2, b1: 11.35, words: [null, null, "WOW"], hue: 2, period: 2.2, phase: 1.1 },
  { face: 0, a0: 0.35, b0: 3.45, a1: 4.3, b1: 7.2, words: ["TEA", "YES", null], hue: 4, period: 3.4, phase: 0.8 },
  { face: 0, a0: 4.65, b0: 3.45, a1: 10.2, b1: 7.2, words: ["HELLO", "LONDON", "OPEN"], hue: 1, period: 2.6, phase: 1.9 },
  { face: 1, a0: 0.25, b0: 7.55, a1: 3.25, b1: 11.35, words: ["TEA", null, "GO"], hue: 5, period: 2.4, phase: 0.2 },
];
/** The curved screen on the corner runs from here to here up the wall. */
const SCREEN_B0 = 3.45;
const SCREEN_B1 = 11.35;
const NEON: RGB[] = [C.neonPink, C.neonBlue, C.yellow, hex("#74dd8a"), C.orange, hex("#b58df0"), C.red, C.white];

/** The walls the screens hang on: the long one, the short one, then the facets of the round corner between them, left to right. */
function signFaces(pen: Pen, layer: number): Plane[] {
  const out: Plane[] = [pen.wall("y+", SX0, SY0, 0, CCX - SX0, SY1 - SY0, layer), pen.wall("x+", SX0, SY0, 0, SX1 - SX0, CCY - SY0, layer)];
  for (let k = 0; k < FACETS; k++) {
    const t0 = Math.PI / 2 - (k * Math.PI) / (2 * FACETS);
    const t1 = Math.PI / 2 - ((k + 1) * Math.PI) / (2 * FACETS);
    const x0 = CCX + Math.cos(t0) * CR;
    const y0 = CCY + Math.sin(t0) * CR;
    const x1 = CCX + Math.cos(t1) * CR;
    const y1 = CCY + Math.sin(t1) * CR;
    const len = Math.hypot(x1 - x0, y1 - y0);
    out.push(pen.plane([x0, y0, 0], [(x1 - x0) / len, (y1 - y0) / len, 0], [0, 0, 1], layer, true));
  }
  return out;
}

/** The building itself, with the dark frames the screens sit in. The screens are lit by a mover. */
function lights(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    const foot: V2[] = [
      [SX0, SY0],
      [SX1, SY0],
    ];
    for (let k = 0; k <= FACETS; k++) {
      const t = (k * Math.PI) / (2 * FACETS);
      foot.push([CCX + Math.cos(t) * CR, CCY + Math.sin(t) * CR]);
    }
    foot.push([SX0, SY1]);
    pen.extrude(foot, 0, SH, STONE, { top: C.charcoal, crease: 25 });
    const faces = signFaces(pen, 1);
    // shop windows at street level, round the corner
    faces[0].rect(0.4, 0.4, CCX - SX0 - 0.3, 2.7, C.glassLight, { outline: true, w: W_FINE, glow: 0.8, grain: 0.3 });
    for (let k = 0; k < FACETS; k++) faces[2 + k].rect(0.04, 0.4, FACET_W - 0.04, 2.7, C.glassLight, { glow: 0.8, grain: 0.3 });
    for (const p of PANELS) faces[p.face].rect(p.a0 - 0.13, p.b0 - 0.13, p.a1 + 0.13, p.b1 + 0.13, C.black, { grain: 0.3 });
    for (let k = 0; k < FACETS; k++) faces[2 + k].rect(0, SCREEN_B0 - 0.13, FACET_W, SCREEN_B1 + 0.13, C.black, { grain: 0.3 });
    windowGrid(faces[1], rng, 0.3, 3.5, 3.2, 7.2, 2, 2, { lit: 0.6 });
  });
  // a sign on the roof, on its scaffold
  pen.obj(() => {
    for (const x of [6, 9.5, 13]) pen.pole([x, SY1 - 0.55, SH], [x, SY1 - 0.55, SH + 2.0], 0.1, C.iron);
    neonSign(pen.plane([SX0 + 0.6, SY1 - 0.45, SH + 0.35], [1, 0, 0], [0, 0, 1], 1, true), "WEST END", 4.5, 0.45, 0.9, C.red);
  }, 0.35);
}

/** One screen showing one thing: a word, or a sun, a heart or stripes. */
function screen(f: Plane, p: Panel, hue: number, word: string | null, n: number): void {
  const bg = NEON[hue];
  const ink = hue === 2 || hue === 3 || hue === 7 ? C.black : C.white;
  const w = p.a1 - p.a0;
  const h = p.b1 - p.b0;
  const ma = (p.a0 + p.a1) / 2;
  const mb = (p.b0 + p.b1) / 2;
  f.rect(p.a0, p.b0, p.a1, p.b1, bg, { glow: 1, kind: F_NEON, grain: 0.15, shade: false });
  if (word) {
    const size = fit(word, w * 0.82, h * 0.42);
    f.text(word, ma, mb - size / 2, size, { align: "c", color: ink, kind: L_MARK, w: Math.max(0.09, size * 0.17), wobble: 0.25, layer: 1 });
    return;
  }
  const other = NEON[(hue + 3) % NEON.length];
  const o = { glow: 1, kind: F_NEON, grain: 0.15, shade: false, layer: 1 };
  const r = Math.min(w, h);
  const k = ((n % 3) + 3) % 3;
  if (k === 0) {
    f.circle(ma, mb, r * 0.26, other, { ...o, seg: 12 });
    for (let q = 0; q < 8; q++) {
      const a = (q / 8) * Math.PI * 2;
      f.seg(ma + Math.cos(a) * r * 0.32, mb + Math.sin(a) * r * 0.32, ma + Math.cos(a) * r * 0.42, mb + Math.sin(a) * r * 0.42, { w: 0.13, color: other, kind: L_MARK, wobble: 0, layer: 1 });
    }
  } else if (k === 1) {
    const s = r * 0.022;
    const pts: V2[] = [];
    for (let q = 0; q < 16; q++) {
      const a = (q / 16) * Math.PI * 2;
      pts.push([ma + 16 * Math.pow(Math.sin(a), 3) * s, mb + (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s]);
    }
    f.poly(pts, other, o);
  } else {
    for (const q of [1, 3]) f.rect(p.a0, p.b0 + (h * q) / 5, p.a1, p.b0 + (h * (q + 1)) / 5, other, o);
  }
}

/**
 * Light every screen for second t. `tau` is how long ago the camera arrived:
 * for a couple of seconds after it does, they all change together.
 */
function drawSigns(pen: Pen, t: number, tau: number): void {
  const faces = signFaces(pen, 2);
  const all = tau > -0.15 && tau < 2.7;
  const beat = Math.floor((tau + 0.15) / 0.45);
  PANELS.forEach((p, i) => {
    const n = all ? beat : Math.floor((t + p.phase) / p.period);
    const hue = all ? beat % 3 : (p.hue + n * 3) % NEON.length;
    const word = all ? (i === 0 ? "HELLO" : i === 3 ? "LONDON" : p.words[0]) : p.words[n % p.words.length];
    screen(faces[p.face], p, hue, word, n);
  });
  // the curved screen: bands of colour chasing round the corner
  const step = Math.floor(t * 2.4);
  for (let k = 0; k < FACETS; k++) {
    faces[2 + k].rect(0, SCREEN_B0, FACET_W, SCREEN_B1, NEON[all ? beat % 3 : (k + step) % 6], { glow: 1, kind: F_NEON, grain: 0.15, shade: false });
  }
}

// ---------------------------------------------------------------- the theatre

interface Bulb {
  /** On the canopy's end rather than its front. */
  side: boolean;
  a: number;
  x: number;
  y: number;
}

/** The bulbs round the canopy, in the order the light runs along them. */
function canopyBulbs(): Bulb[] {
  const out: Bulb[] = [];
  for (let a = 0.3; a < CAN_W - 0.1; a += 0.5) out.push({ side: false, a, x: CAN_X0 + a, y: TY1 + CAN_D + 0.04 });
  for (let a = 0.3; a < CAN_D - 0.1; a += 0.5) out.push({ side: true, a, x: CAN_X0 + CAN_W + 0.04, y: TY1 + CAN_D - a });
  return out;
}

function theatre(c: LondonCtx): void {
  const { pen, rng } = c;
  const W = TX1 - TX0;
  const D = TY1 - TY0;
  pen.obj(() => {
    pen.box(TX0, TY0, 0, W, D, TH, C.brick, { top: C.charcoal });
    const f = pen.wall("y+", TX0, TY0, 0, W, D);
    f.rect(0, 0, W, 3.0, C.stucco, { grain: 0.4 });
    // three pairs of doors, with posters between them
    for (const a of [1.7, 4.4, 7.1]) {
      f.rect(a - 0.85, 0, a + 0.85, 2.3, C.woodDark, { outline: true, w: W_THIN, layer: 1 });
      f.rect(a - 0.7, 0.9, a - 0.1, 2.05, C.glassLight, { layer: 2, glow: 0.9, grain: 0.3 });
      f.rect(a + 0.1, 0.9, a + 0.7, 2.05, C.glassLight, { layer: 2, glow: 0.9, grain: 0.3 });
    }
    for (const [a, col] of [
      [3.05, C.yellow],
      [5.75, C.red],
    ] as const) {
      f.rect(a - 0.4, 0.7, a + 0.4, 2.0, col, { outline: true, w: W_FINE, layer: 1, glow: 0.4 });
    }
    // the board over the canopy, tonight's play picked out in lights
    f.rect(0.8, 3.75, W - 0.8, 5.6, C.black, { outline: true, w: W_THIN, layer: 1, grain: 0.3 });
    f.text("HAMLET!", W / 2, 4.2, 1.0, { align: "c", color: C.yellow, kind: L_MARK, w: 0.15, wobble: 0.25, layer: 2 });
    f.text("HAMLET!", W / 2, 4.2, 1.0, { align: "c", kind: L_LIGHT, w: 0.17, wobble: 0.25, layer: 3 });
    for (let a = 1.1; a < W - 0.8; a += 0.6) {
      for (const b of [3.92, 5.43]) f.circle(a, b, 0.07, C.cream, { layer: 2, seg: 5, grain: 0, glow: 1 });
    }
    for (let k = 0; k < 4; k++) archWindow(f, 0.65 + k * 2.05, 6.0, 1.75 + k * 2.05, 7.7, true, C.cream);
    bricks(f, 0.2, 5.7, W - 0.2, TH - 0.6, C.brickDark, 0.3);
    f.rect(0, TH - 0.5, W, TH, C.cream, { grain: 0.3, layer: 1 });
    f.seg(0, TH - 0.5, W, TH - 0.5, { w: W_FINE, layer: 1 });
    // down the alley at the side: the stage door, under its lamp
    const g = pen.wall("x+", TX0, TY0, 0, W, D);
    g.rect(0.5, 0, 1.5, 2.2, C.door, { outline: true, w: W_THIN });
    g.rect(0.2, 2.35, 1.8, 2.85, C.white, { outline: true, w: W_FINE, glow: 0.8 });
    g.text("STAGE", 1.0, 2.47, 0.26, { align: "c", w: 0.045, wobble: 0.2, layer: 1 });
    windowGrid(g, rng, 0.5, 3.7, 5.0, TH - 0.8, 3, 2, { lit: 0.6, trim: C.cream });
    g.rect(0, TH - 0.5, D, TH, C.cream, { grain: 0.3, layer: 1 });
  });
  // the canopy: every bulb is drawn unlit here, and a mover runs the light along them
  pen.obj(() => {
    pen.box(CAN_X0, TY1, CAN_Z, CAN_W, CAN_D, 0.42, C.red, { w: W_THIN, top: C.redDark });
    const f = pen.wall("y+", CAN_X0, TY1, CAN_Z, CAN_W, CAN_D);
    const s = pen.wall("x+", CAN_X0, TY1, CAN_Z, CAN_W, CAN_D);
    for (const b of canopyBulbs()) (b.side ? s : f).circle(b.a, 0.21, 0.085, C.cream, { layer: 1, seg: 6, grain: 0 });
    pen.stroke(
      [
        [TX0 + 0.8, TY1 + 1.3, CAN_Z - 0.04],
        [TX1 - 0.8, TY1 + 1.3, CAN_Z - 0.04],
      ],
      { w: 0.6, kind: L_LIGHT, wobble: 0, alpha: 0.45 },
    );
  }, 0.1);
  // a sign that sticks out over the pavement, to be read from down the street
  pen.obj(() => {
    const b = pen.plane([TX1 - 0.7, TY1 + 1.3, 3.7], [0, -1, 0], [0, 0, 1], 0, true);
    b.rect(0, 0, 1.3, 4.6, C.red, { outline: true, w: W_FINE, glow: 1, kind: F_NEON, grain: 0.2, shade: false });
    "SHOW".split("").forEach((ch, i) => b.text(ch, 0.65, 3.55 - i * 1.07, 0.7, { align: "c", color: C.white, kind: L_MARK, w: 0.12, wobble: 0.2, layer: 1 }));
  }, 0.25);
  // a pediment over the cornice, and the house flag
  pen.obj(() => {
    pen.gable(TX0 + 2.4, TY1 - 1.1, TH, 4, 1.1, 1.1, "y", C.lead, { gable: C.cream });
    pen.wall("y+", TX0 + 2.4, TY1 - 1.1, TH, 4, 1.1).circle(2, 0.42, 0.26, C.gold, { outline: true, w: 0.035, seg: 8, grain: 0.3 });
  }, 0.2);
  flag(pen, TX0 + 4.4, TY1 - 0.55, TH + 1.1, 2.4, "red", 0.7);
}

// ---------------------------------------------------------------- Chinatown's gate

/** A string of red paper lanterns between two points. */
function lanterns(pen: Pen, a: V3, b: V3, n: number): void {
  pen.begin();
  const pts: V3[] = [];
  for (let i = 0; i <= n + 1; i++) {
    const t = i / (n + 1);
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * 0.45]);
  }
  pen.stroke(pts, { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
  for (let i = 1; i <= n; i++) {
    const p = pts[i];
    const k = pen.card(p[0], p[1], p[2] - 0.62);
    k.ellipse(0, 0.3, 0.24, 0.27, C.red, { outline: true, w: 0.035, glow: 1, kind: F_NEON, seg: 9, grain: 0.2, sway: 0.1 });
    k.seg(-0.1, 0.58, 0.1, 0.58, { w: 0.06, color: C.gold, kind: L_MARK, wobble: 0, sway: 0.1, layer: 1 });
    k.seg(0, 0.03, 0, -0.16, { w: 0.04, color: C.gold, kind: L_MARK, wobble: 0, sway: 0.1, swayB: 0.2 });
    bulb(pen, p[0], p[1], p[2] - 0.32, 0.3);
  }
  pen.end();
}

function gate(c: LondonCtx): void {
  const { pen, rng } = c;
  const y = GATE_Y;
  const xa = GATE_A;
  const xb = GATE_B;
  // at the far end of the lane, a noodle bar with ducks hanging in the window
  pen.obj(() => {
    pen.box(38, 4.5, 0, 5.5, 3.1, 5.4, C.brickRose, { top: C.charcoal });
    const f = pen.wall("y+", 38, 4.5, 0, 5.5, 3.1);
    f.rect(0, 0, 5.5, 3.0, C.red, { grain: 0.4 });
    f.rect(0.35, 0.55, 2.7, 2.05, C.glassLight, { outline: true, w: W_FINE, glow: 0.9, layer: 1, grain: 0.3 });
    for (let k = 0; k < 6; k++) f.ellipse(0.65 + k * 0.36, 1.6, 0.12, 0.25, hex("#b5682e"), { layer: 2, seg: 7, grain: 0.3, outline: true, w: 0.03 });
    f.rect(3.05, 0, 3.95, 2.1, C.woodDark, { outline: true, w: W_FINE, layer: 1 });
    f.rect(4.25, 0.7, 5.15, 1.9, C.white, { outline: true, w: W_FINE, layer: 1, glow: 0.5 });
    for (const b of [1.0, 1.25, 1.5]) f.seg(4.4, b, 5.0, b, { w: 0.04, color: C.red, kind: L_MARK, wobble: 0.3, layer: 2 });
    f.rect(0.2, 2.25, 5.3, 2.92, C.black, { outline: true, w: W_FINE, layer: 1 });
    f.text("NOODLES", 2.75, 2.4, 0.36, { align: "c", color: C.gold, kind: L_MARK, w: 0.065, wobble: 0.25, layer: 2 });
    windowGrid(f, rng, 0.4, 3.3, 5.1, 5.0, 3, 1, { lit: 0.8, trim: C.cream });
    windowGrid(pen.wall("x+", 38, 4.5, 0, 5.5, 3.1), rng, 0.3, 0.8, 2.8, 5.0, 1, 2, { lit: 0.7, trim: C.cream });
    pen.hip(37.8, 4.3, 5.4, 5.9, 3.5, 0.9, C.slate, { w: W_THIN });
  });
  pen.obj(() => {
    for (const x of [xa, xb]) {
      pen.box(x - 0.4, y - 0.4, 0, 0.8, 0.8, 0.5, STONE, { w: W_FINE });
      pen.cyl(x, y, 0.5, 0.3, 4.6, C.red, { seg: 8, w: W_THIN });
    }
    // the beam with the name on it
    pen.box(xa - 0.5, y - 0.18, 3.9, xb - xa + 1.0, 0.36, 0.85, C.royal, { w: W_THIN });
    const f = pen.wall("y+", xa - 0.5, y - 0.18, 3.9, xb - xa + 1.0, 0.36);
    f.text("CHINATOWN", 3.0, 0.2, 0.46, { align: "c", color: C.gold, kind: L_MARK, w: 0.085, wobble: 0.25, layer: 1 });
    pen.box(xa - 0.6, y - 0.22, 4.75, xb - xa + 1.2, 0.44, 0.35, C.red, { w: W_THIN });
    for (let x = xa - 0.3; x <= xb + 0.31; x += 0.6) bulb(pen, x, y + 0.26, 4.92, 0.2);
  });
  // green tiled roofs, one above the other, their corners turned up
  const roof = (x0: number, x1: number, z: number, h: number) => {
    pen.hip(x0, y - 0.6, z, x1 - x0, 1.2, h, JADE, { w: W_THIN });
    pen.stroke(
      [
        [x0 + 0.6, y, z + h + 0.03],
        [x1 - 0.6, y, z + h + 0.03],
      ],
      { w: 0.13, color: C.gold, kind: L_MARK, wobble: 0.2 },
    );
    for (const [x, s] of [
      [x0, -1],
      [x1, 1],
    ]) {
      pen.card(x, y, z).poly(
        [
          [-s * 0.15, 0.02],
          [s * 0.42, 0.5],
          [s * 0.12, 0.26],
        ],
        JADE,
        { outline: true, w: 0.04, grain: 0.3 },
      );
    }
  };
  pen.obj(() => {
    roof(xa - 1.0, xb + 0.7, 5.1, 0.95);
    pen.box(xa + 1.1, y - 0.15, 6.05, xb - xa - 2.2, 0.3, 0.35, C.red, { w: W_THIN });
    roof(xa + 0.5, xb - 0.5, 6.4, 0.8);
  }, 0.2);
  // a stone lion in front of each pillar
  for (const [x, flip] of [
    [xa, true],
    [xb, false],
  ] as const) {
    pen.obj(() => {
      pen.box(x - 0.35, y + 0.6, 0, 0.7, 0.7, 0.45, STONE, { w: W_FINE });
      const k = pen.card(x, y + 0.95, 0.45, flip);
      k.ellipse(-0.05, 0.3, 0.26, 0.3, C.stone, { outline: true, w: 0.04, seg: 8, grain: 0.4 });
      k.circle(0.1, 0.66, 0.24, C.stoneDark, { outline: true, w: 0.04, seg: 8, layer: 1 });
      k.circle(0.14, 0.64, 0.15, C.stone, { outline: true, w: 0.035, seg: 7, layer: 2 });
    });
  }
  // lanterns strung from the gate out over the square
  for (const px of [xa, xb]) {
    pen.obj(() => pen.pole([px, 12.9, 0], [px, 12.9, 4.0], 0.1, C.red));
    lanterns(pen, [px, y + 0.3, 4.5], [px, 12.9, 4.0], 3);
  }
  lanterns(pen, [xa, 12.9, 4.0], [xb, 12.9, 4.0], 6);
}

// ---------------------------------------------------------------- St Martin's

function church(c: LondonCtx): void {
  const { pen, rng } = c;
  const W = MX1 - MX0;
  const D = MY1 - MY0;
  pen.obj(() => {
    pen.box(MX0, MY0, 0, W, D, MH, STONE);
    const e = pen.wall("x+", MX0, MY0, 0, W, D);
    e.rect(0, 0, D, 0.6, STONE_D, { grain: 0.6 });
    for (let k = 0; k < 3; k++) {
      const a = 1.0 + k * 2.0;
      archWindow(e, a - 0.5, 3.3, a + 0.5, 5.6, rng.chance(0.7), STONE_L);
      windowAt(e, a - 0.45, 1.2, a + 0.45, 2.6, rng.chance(0.6), STONE_L);
    }
    e.rect(0, MH - 0.45, D, MH, STONE_L, { grain: 0.4, layer: 1 });
    e.seg(0, MH - 0.45, D, MH - 0.45, { w: W_FINE, layer: 1 });
    const f = pen.wall("y+", MX0, MY0, 0, W, D);
    f.rect(W / 2 - 0.7, 0.6, W / 2 + 0.7, 3.4, C.woodDark, { outline: true, w: W_THIN, layer: 1 });
  });
  pen.obj(() => pen.gable(MX0, MY0, MH, W, D, 1.5, "y", C.lead, { gable: STONE }), 0.1);
  // the porch on its podium
  pen.obj(() => pen.box(MX0, MY1, 0, W, 2.3, 0.6, STONE_D, { top: STONE_L, w: W_THIN }));
  steps(pen, MX0, MY1 + 2.3, 0, W, 1.3, 0.6, 3, STONE);
  portico(pen, MX0, MY1, 0.6, W, 2.3, MH - 1.3, 6, { stone: STONE, roof: C.lead, pediment: 1.25 });
  // the steeple: a clock stage, a belfry, a ring of columns, then the spire
  const sx = MX0 + W / 2;
  const sy = MY1 - 1.5;
  pen.obj(() => {
    pen.box(sx - 1.5, sy - 1.5, MH, 3, 3, 3.2, STONE);
    for (const side of ["y+", "x+"] as const) clock(pen.wall(side, sx - 1.5, sy - 1.5, MH, 3, 3), 1.5, 1.95, 0.85, 11, 5);
    pen.box(sx - 1.65, sy - 1.65, MH + 3.2, 3.3, 3.3, 0.25, STONE_L, { w: W_FINE });
  }, 0.2);
  pen.obj(() => {
    pen.box(sx - 1.2, sy - 1.2, MH + 3.45, 2.4, 2.4, 2.3, STONE);
    for (const side of ["y+", "x+"] as const) archWindow(pen.wall(side, sx - 1.2, sy - 1.2, MH + 3.45, 2.4, 2.4), 0.7, 0.35, 1.7, 1.95, false, STONE_L);
  }, 0.32);
  pen.obj(() => {
    const z0 = MH + 5.75;
    pen.cyl(sx, sy, z0, 1.05, 1.7, STONE_L, { seg: 8, w: W_THIN, top: STONE_D });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + 0.39;
      if (Math.cos(t - Math.PI / 4) < 0) continue;
      pen.stroke(
        [
          [sx + Math.cos(t) * 1.07, sy + Math.sin(t) * 1.07, z0 + 0.25],
          [sx + Math.cos(t) * 1.07, sy + Math.sin(t) * 1.07, z0 + 1.4],
        ],
        { w: 0.22, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
  }, 0.44);
  pen.obj(() => {
    const z0 = MH + 7.45;
    pen.cone(sx, sy, z0, 0.95, 5.0, STONE_D, { seg: 8, w: W_THIN });
    pen.pole([sx, sy, z0 + 4.9], [sx, sy, z0 + 5.8], 0.06, C.gold, { ink: false });
    pen.card(sx, sy, z0 + 5.6).circle(0, 0.16, 0.16, C.gold, { outline: true, w: 0.03, seg: 7, grain: 0.2 });
  }, 0.56);
}

// ---------------------------------------------------------------- Eros

/** The winged archer, balanced on one foot, leaning into the shot he has just loosed. Draw on a card. */
function archer(k: Plane): void {
  const m = hex("#cdd3d7");
  k.poly(
    [
      [0.2, 1.1],
      [-0.6, 1.72],
      [-0.2, 1.12],
    ],
    m,
    { outline: true, w: 0.04, grain: 0.3 },
  );
  k.poly(
    [
      [0.24, 1.2],
      [-0.28, 1.98],
      [0.04, 1.3],
    ],
    m,
    { outline: true, w: 0.04, grain: 0.3, layer: 1 },
  );
  k.bar(0.02, 0, 0.1, 0.62, 0.1, m, { layer: 2 });
  k.bar(0.1, 0.62, -0.5, 0.9, 0.09, m, { layer: 2 });
  k.bar(0.1, 0.62, 0.42, 1.25, 0.2, m, { layer: 3 });
  k.circle(0.52, 1.42, 0.15, m, { outline: true, w: 0.04, layer: 4, seg: 8 });
  k.bar(0.42, 1.2, 0.95, 1.28, 0.07, m, { layer: 4 });
  k.arc(0.9, 1.26, 0.22, 0.46, -1.25, 1.25, { w: 0.05, color: C.inkSoft, kind: L_BAR, wobble: 0, layer: 5 });
}

function erosFountain(c: LondonCtx): void {
  const { pen, rng } = c;
  const [ex, ey] = EROS;
  pen.obj(() => {
    pen.cyl(ex, ey, 0, 2.5, 0.25, STONE, { seg: 8, w: W_THIN });
    pen.cyl(ex, ey, 0.25, 1.95, 0.25, STONE, { seg: 8, w: W_THIN });
    pen.cyl(ex, ey, 0.5, 1.4, 0.25, STONE_L, { seg: 8, w: W_THIN });
  });
  pen.obj(() => {
    pen.cyl(ex, ey, 0.75, 0.95, 1.0, BRONZE, { seg: 8, r2: 0.72, w: W_THIN });
    pen.cyl(ex, ey, 1.75, 1.25, 0.16, BRONZE, { seg: 10, w: W_THIN });
    pen.cyl(ex, ey, 1.91, 0.42, 0.95, BRONZE, { seg: 8, r2: 0.3, w: W_THIN });
    pen.cyl(ex, ey, 2.86, 0.7, 0.12, BRONZE, { seg: 8, w: W_FINE });
    pen.cyl(ex, ey, 2.98, 0.2, 0.5, BRONZE, { seg: 6, w: W_FINE });
  }, 0.15);
  pen.obj(() => archer(pen.card(ex, ey, 3.48)), 0.35);
  // the steps are where you arrange to meet
  const seats: [number, number, number][] = [
    [-25, 2.12, 0.1],
    [2, 1.56, 0.35],
    [26, 2.14, 0.1],
    [50, 1.56, 0.35],
    [74, 2.12, 0.1],
    [100, 1.56, 0.35],
    [126, 2.14, 0.1],
  ];
  for (const [deg, r, z] of seats) {
    const t = (deg * Math.PI) / 180;
    person(pen, ex + Math.cos(t) * r, ey + Math.sin(t) * r, z, randomLook(rng), "sit", Math.cos(t) < Math.sin(t));
  }
  pen.obj(() => {
    pen.stroke(
      [
        [ex + 0.9, ey + 0.9, 2.3],
        [ex + 0.9, ey + 0.92, 2.3],
      ],
      { w: 3.2, kind: L_LIGHT, wobble: 0, alpha: 0.3 },
    );
  }, 0.3);
  pigeon(pen, ex + 2.3, ey - 0.6, 0.25, false, true);
  pigeon(pen, ex - 0.4, ey + 2.4, 0.25, true);
}

// ---------------------------------------------------------------- Nelson and his lions

const STONE_LOOK: Look = { skin: C.stone, hair: C.stoneDark, top: C.stone, legs: C.stoneDark, long: false, hat: null };
const BRONZE_LOOK: Look = { skin: BRONZE, hair: BRONZE, top: BRONZE, legs: BRONZE, long: false, hat: null };
/** How far out from the column each lion lies, along the diagonals. */
const LION = 3.1;

/** One of the four lions, lying on its plinth with its head up. */
function lion(pen: Pen, x: number, y: number, flip: boolean): void {
  pen.obj(() => {
    pen.box(x - 0.95, y - 0.95, 0, 1.9, 1.9, 0.7, C.granite, { top: C.graniteCap, w: W_THIN });
    pen.push(x, y, 0.7, 0, 1.25);
    const k = pen.card(0, 0, 0, flip);
    k.bar(-0.95, 0.36, -1.3, 0.62, 0.09, BRONZE);
    k.ellipse(-0.15, 0.42, 0.92, 0.4, BRONZE, { outline: true, w: W_FINE, seg: 12, grain: 0.5 });
    k.bar(0.4, 0.16, 1.15, 0.14, 0.2, BRONZE, { layer: 1 });
    k.circle(0.6, 0.9, 0.46, scaleRGB(BRONZE, 0.78), { outline: true, w: W_FINE, seg: 10, layer: 2, grain: 0.5 });
    k.circle(0.72, 0.88, 0.29, BRONZE, { outline: true, w: 0.04, seg: 9, layer: 3 });
    pen.pop();
  }, 0.15);
}

function nelson(c: LondonCtx): void {
  const { pen, rng } = c;
  const [nx, ny] = NELSON;
  pen.obj(() => {
    for (const [hw, z] of [
      [2.3, 0],
      [1.9, 0.3],
      [1.5, 0.6],
    ]) {
      pen.box(nx - hw, ny - hw, z, 2 * hw, 2 * hw, 0.3, C.granite, { top: C.graniteCap, w: W_THIN });
    }
  });
  pen.obj(() => {
    pen.box(nx - 1.15, ny - 1.15, 0.9, 2.3, 2.3, 2.8, C.granite, { w: 0.1 });
    // a battle in bronze on each face
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, nx - 1.15, ny - 1.15, 0.9, 2.3, 2.3);
      f.rect(0.25, 0.5, 2.05, 2.3, BRONZE, { outline: true, w: W_FINE, grain: 0.6 });
      f.ticks(0.4, 0.7, 1.9, 2.1, { n: 9, len: 0.5, ang: 1.2, jit: 0.8, color: hex("#93a79e"), w: 0.06, layer: 2 });
    }
    pen.box(nx - 1.3, ny - 1.3, 3.7, 2.6, 2.6, 0.3, C.graniteCap, { w: W_THIN });
  }, 0.1);
  pen.obj(() => {
    pen.cyl(nx, ny, 4.0, 0.62, 10.6, C.granite, { seg: 10, r2: 0.5, w: 0.1 });
    for (const t of [0.15, 0.785, 1.42]) {
      pen.stroke(
        [
          [nx + Math.cos(t) * 0.63, ny + Math.sin(t) * 0.63, 4.3],
          [nx + Math.cos(t) * 0.51, ny + Math.sin(t) * 0.51, 14.4],
        ],
        { w: 0.05, color: C.graniteDark, kind: L_MARK, wobble: 0.3, alpha: 0.8 },
      );
    }
  }, 0.25);
  pen.obj(() => {
    pen.box(nx - 0.85, ny - 0.85, 14.6, 1.7, 1.7, 0.7, BRONZE, { w: W_THIN });
    pen.box(nx - 1.0, ny - 1.0, 15.3, 2.0, 2.0, 0.2, C.graniteCap, { w: W_THIN });
  }, 0.45);
  // the admiral: cocked hat worn athwart, sword, and a pigeon who has the best view in London
  pen.obj(() => {
    pen.push(nx, ny, 15.5, 0, 1.25);
    person(pen, 0, 0, 0, STONE_LOOK, "stand");
    const k = pen.card(0, 0, 0);
    k.poly(
      [
        [-0.66, 2.14],
        [0.66, 2.14],
        [0.34, 2.5],
        [0, 2.4],
        [-0.34, 2.5],
      ],
      C.greyDark,
      { outline: true, w: W_FINE, layer: 6, grain: 0.4 },
    );
    k.bar(-0.42, 0.95, -0.62, 0.12, 0.08, C.stoneDark, { layer: 5 });
    pen.pop();
    pigeonOn(pen.card(nx + 0.05, ny, 15.5 + 3.1), "stand");
  }, 0.6);
  // floodlights for the night
  pen.obj(() => {
    for (const [dx, dy, z, w] of [
      [1.3, 0.2, 2.2, 3.0],
      [0.2, 1.3, 2.2, 3.0],
      [0.7, 0.7, 7.5, 2.3],
      [0.6, 0.6, 12.5, 2.1],
      [0.5, 0.5, 16.8, 2.6],
    ]) {
      pen.stroke(
        [
          [nx + dx, ny + dy, z],
          [nx + dx, ny + dy + 0.02, z],
        ],
        { w, kind: L_LIGHT, wobble: 0, alpha: 0.32 },
      );
    }
  }, 0.3);
  lion(pen, nx - LION, ny - LION, true);
  lion(pen, nx + LION, ny - LION, false);
  lion(pen, nx - LION, ny + LION, true);
  lion(pen, nx + LION, ny + LION, false);
  // people sit all round the foot of it
  for (const dx of [-1.3, -0.3, 0.9]) person(pen, nx + dx, ny + 1.96, 0.18, randomLook(rng), "sit", dx < 0);
  for (const dy of [-1.0, 0.2, 1.2]) person(pen, nx + 1.96, ny + dy, 0.18, randomLook(rng), "sit", false);
}

// ---------------------------------------------------------------- the plinths

/** The cockerel on the fourth plinth: very large, very blue. Draw on a card. */
function cockerel(k: Plane): void {
  const o = { outline: true, w: W_FINE, grain: 0.3 };
  for (const [a, b] of [
    [-1.4, 2.35],
    [-1.75, 1.9],
    [-1.7, 1.35],
  ]) {
    k.poly(
      [
        [-0.5, 1.25],
        [a, b],
        [-0.85, 0.95],
      ],
      ULTRA,
      o,
    );
  }
  k.bar(-0.12, 0.6, -0.14, 0.06, 0.1, ULTRA);
  k.bar(0.25, 0.6, 0.3, 0.06, 0.1, ULTRA);
  k.ellipse(0, 1.05, 0.78, 0.56, ULTRA, { ...o, seg: 12, layer: 1 });
  k.bar(0.45, 1.3, 0.72, 2.12, 0.36, ULTRA, { layer: 2 });
  k.circle(0.78, 2.3, 0.28, ULTRA, { ...o, layer: 3, seg: 9 });
  k.poly(
    [
      [1.0, 2.36],
      [1.34, 2.25],
      [1.0, 2.18],
    ],
    C.yellow,
    { layer: 4, grain: 0, outline: true, w: 0.03 },
  );
  k.poly(
    [
      [0.58, 2.52],
      [0.66, 2.84],
      [0.78, 2.6],
      [0.9, 2.86],
      [0.98, 2.52],
    ],
    C.red,
    { layer: 4, grain: 0.2, outline: true, w: 0.03 },
  );
  k.circle(0.88, 2.02, 0.1, C.red, { layer: 4, seg: 6, grain: 0 });
}

function plinths(c: LondonCtx): void {
  const { pen, rng } = c;
  // the fourth plinth, which has never had its statue and gets something new every year or two
  pen.obj(() => {
    pen.box(5.6, 26.2, 0, 2, 2, 2.4, C.granite, { top: C.graniteCap, w: 0.1 });
    cockerel(pen.card(6.6, 27.2, 2.4));
  }, 0.2);
  snapper(pen, 9.0, 27.9, randomLook(rng), true);
  // and one that has: a king on a horse
  pen.obj(() => {
    pen.box(40.2, 27.3, 0, 2.4, 1.4, 2.2, C.granite, { top: C.graniteCap, w: 0.1 });
  }, 0.2);
  pen.push(41.4, 28.0, 2.2, 0, 0.85);
  horse(pen, 0, BRONZE, (p, z) => person(p, 0, 0, z - 0.4, BRONZE_LOOK, "bust"));
  pen.pop();
}

// ---------------------------------------------------------------- characters

/** A bride: veil, a dress to the ground, a bouquet. */
function bride(pen: Pen, x: number, y: number, lk: Look): void {
  pen.obj(() => {
    const k = pen.card(x, y, 0);
    k.poly(
      [
        [-0.3, 2.2],
        [0.1, 2.3],
        [-0.42, 0.95],
        [-0.8, 1.0],
      ],
      C.white,
      { outline: true, w: 0.04, grain: 0.2, layer: -1 },
    );
    person(pen, x, y, 0, lk, "stand");
    k.poly(
      [
        [-0.62, 0.02],
        [0.62, 0.02],
        [0.34, 0.95],
        [-0.34, 0.95],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 1.6, grain: 0.3 },
    );
    k.circle(-0.36, 1.02, 0.2, C.pink, { outline: true, w: 0.04, layer: 5, seg: 7 });
  });
}

/** Someone lying down with a newspaper over their face. */
function sleeper(pen: Pen, x: number, y: number, z: number, lk: Look): void {
  pen.obj(() => {
    const k = pen.card(x, y, z);
    k.bar(-1.0, 0.14, -0.15, 0.14, 0.24, lk.legs);
    k.bar(-0.15, 0.17, 0.5, 0.19, 0.34, lk.top, { layer: 1 });
    k.circle(0.74, 0.22, 0.2, lk.skin, { outline: true, w: W_FINE, layer: 2, seg: 8, grain: 0.4 });
    k.poly(
      [
        [0.0, 0.1],
        [0.98, 0.14],
        [0.94, 0.56],
        [-0.02, 0.5],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 3, grain: 0.2 },
    );
    for (const b of [0.22, 0.32, 0.42]) k.seg(0.1, b, 0.86, b + 0.03, { w: 0.035, color: C.grey, kind: L_MARK, wobble: 0.3, layer: 4 });
  });
}

/** A pedicab: a tricycle with a hooded bench behind, lit up like a fairground. Nose towards local +x. */
function pedicab(pen: Pen, rng: Rng, frame: number, hood: RGB, seat: RGB): void {
  for (const y of [-0.72, 0.72]) pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true).circle(-1.75, 0.5, 0.5, null, { w: 0.08, seg: 10, wobble: 0 });
  pen.box(-2.45, -0.62, 0.45, 1.5, 1.24, 0.42, seat, { w: W_THIN });
  pen.box(-2.5, -0.62, 0.87, 0.22, 1.24, 0.8, seat, { w: W_THIN });
  person(pen, -1.75, 0.3, 0.72, randomLook(rng), "bust", false);
  person(pen, -1.75, -0.3, 0.72, randomLook(rng), "bust", true);
  for (const [px, py] of [
    [-2.45, -0.6],
    [-2.45, 0.6],
    [-1.0, -0.6],
    [-1.0, 0.6],
  ]) {
    pen.pole([px, py, 0.87], [px, py, 2.25], 0.06, C.white, { ink: false });
  }
  pen.box(-2.55, -0.7, 2.25, 1.65, 1.4, 0.14, hood, { w: W_THIN, glow: 0.6, kind: F_NEON });
  for (let a = -2.5; a <= -0.9; a += 0.4) for (const y of [-0.74, 0.74]) bulb(pen, a, y, 2.2, 0.17);
  pen.push(0.55, 0, 0);
  bike(pen, { color: C.black, rider: randomLook(rng), frame });
  pen.pop();
}

// ---------------------------------------------------------------- everyone who stands still

function life(c: LondonCtx): void {
  const { pen, rng } = c;
  const anyone = () => randomLook(rng);
  const small = () => (rng.chance(0.2) ? 0.72 : 1);

  // ---- the Gallery's terrace and steps
  sleeper(pen, SLEEPER[0], SLEEPER[1], TER, anyone());
  const treads: [number, number][] = [
    [11.7, 1],
    [12.9, 0],
    [14.5, 1],
    [15.8, 0],
    [19.4, 0],
  ];
  for (const [x, tread] of treads) {
    // tread 1 is the middle step, tread 0 the bottom one
    const y = GY1 + 3.2 + (tread === 1 ? 1.39 : 2.05);
    person(pen, x, y, (TER * (tread + 1)) / 3 - 0.42, anyone(), "sit", rng.chance(0.5));
  }
  // a tour: the guide's umbrella goes up and everybody follows it
  pen.obj(() => {
    const guide = anyone();
    guide.top = C.red;
    person(pen, 22.9, 22.6, TER, guide, "stand");
    umbrella(pen, 22.9, 22.6, TER, C.yellow);
  });
  for (const [x, y] of scatter(rng, 20.2, 22.0, 22.2, 23.7, 5, 0.75)) {
    if (rng.chance(0.4)) {
      const lk = anyone();
      pen.obj(() => {
        person(pen, x, y, TER, lk, "stand", false);
        const k = pen.card(x, y, TER);
        k.bar(0.34, 1.34, 0.72, 1.6, 0.17, lk.top, { layer: 4 });
        k.rect(0.7, 1.5, 0.88, 1.82, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
      });
    } else person(pen, x, y, TER, anyone(), "stand", false);
  }
  // students with sketchbooks, and people going in
  for (const x of [8.9, 10.1]) {
    pen.obj(() => {
      person(pen, x, 23.9, TER - 0.36, anyone(), "sit", true);
      pen.card(x, 23.9, TER - 0.36).rect(-0.52, 0.72, -0.12, 1.02, C.white, { outline: true, w: 0.04, layer: 5, grain: 0.2 });
    });
  }
  person(pen, 14.4, 23.6, TER, anyone(), "stand");
  person(pen, 16.9, 23.7, TER, anyone(), "wave", true);
  person(pen, 24.6, 23.2, TER, anyone(), "stand", true, 0.72);

  // ---- round the fountains
  for (const [i, f] of FOUNT.entries()) {
    for (const deg of i === 0 ? [20, 62, 104] : [5, 75, 118]) {
      const t = (deg * Math.PI) / 180;
      person(pen, f[0] + Math.cos(t) * (FOUNT_R + 0.12), f[1] + Math.sin(t) * (FOUNT_R + 0.12), 0, anyone(), "sit", Math.cos(t) < Math.sin(t), small());
    }
  }
  // a wedding party has come for its photographs
  const groom = suit(rng);
  bride(pen, 36.55, 34.85, { skin: SKIN[1], hair: HAIR[2], top: C.white, legs: C.white, long: true, hat: null });
  pen.obj(() => {
    person(pen, 37.3, 34.3, 0, groom, "stand", true);
    const k = pen.card(37.3, 34.3, 0);
    k.poly(
      [
        [-0.1, 1.42],
        [0.1, 1.42],
        [0, 1.1],
      ],
      C.white,
      { layer: 2.5, grain: 0 },
    );
    k.circle(0.2, 1.22, 0.07, C.pink, { layer: 5, seg: 6, grain: 0 });
  });
  snapper(pen, 40.3, 34.6, { ...anyone(), top: C.black }, true);
  pen.obj(() => {
    // the assistant holds a reflector to put some light in their faces
    const lk = anyone();
    person(pen, 34.9, 36.7, 0, lk, "wave");
    pen.card(34.9, 36.7, 0).circle(0.92, 1.9, 0.52, C.gold, { outline: true, w: W_FINE, layer: 5, seg: 12, grain: 0.3 });
  });

  // ---- the lions
  pen.obj(() => {
    person(pen, NELSON[0] + LION - 0.3, NELSON[1] - LION, 1.2, anyone(), "sit", false, 0.72);
    person(pen, NELSON[0] + LION + 0.6, NELSON[1] - LION + 0.55, 0.7, anyone(), "cheer", true, 0.72);
  });
  bobby(pen, 28.2, 35.9, 0, "wave", true, rng);
  snapper(pen, 30.3, 34.9, anyone(), true);
  person(pen, NELSON[0] - LION + 0.6, NELSON[1] + LION + 0.5, 0.7, anyone(), "cheer", false);
  snapper(pen, 22.9, 40.6, anyone(), true);
  pigeonOn(pen.card(NELSON[0] + LION + 0.7, NELSON[1] + LION, 0.7 + 1.68), "stand");

  // ---- the living statue (who is a mover) and the ring round it
  pen.box(STATUE[0] - 0.45, STATUE[1] - 0.45, 0, 0.9, 0.9, 0.7, C.greyDark, { w: W_THIN });
  for (let i = 0; i < 9; i++) {
    if (i === 6 || i === 7) continue;
    const t = (i / 9) * Math.PI * 2 + 0.3;
    const r = 2.0 + rng.range(-0.1, 0.2);
    person(pen, STATUE[0] + Math.cos(t) * r, STATUE[1] + Math.sin(t) * r, 0, anyone(), rng.pick(["stand", "stand", "wave"]), Math.cos(t) > Math.sin(t), small());
  }
  pen.cyl(STATUE[0] + 0.9, STATUE[1] + 1.0, 0, 0.26, 0.2, C.black, { seg: 8, w: W_FINE });

  // ---- the busker, his amp, his open case, and his half circle
  pen.obj(() => {
    const lk = { ...anyone(), hat: C.black };
    person(pen, BUSKER[0], BUSKER[1], 0, lk, "stand");
    const k = pen.card(BUSKER[0], BUSKER[1], 0);
    k.ellipse(0.12, 1.0, 0.3, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 8 });
    k.bar(0.3, 1.08, 0.78, 1.36, 0.07, C.woodDark, { layer: 5 });
    pen.box(BUSKER[0] - 1.1, BUSKER[1] - 0.2, 0, 0.6, 0.5, 0.62, C.black, { w: W_FINE, top: C.charcoal });
    pen.box(BUSKER[0] - 0.3, BUSKER[1] + 0.75, 0, 1.1, 0.42, 0.13, C.charcoal, { top: C.red, w: W_FINE });
  });
  for (const [dx, dy] of [
    [1.7, 0.9],
    [1.2, 1.9],
    [0.1, 2.2],
    [-1.0, 1.9],
    [-1.8, 0.9],
    [1.9, -0.3],
  ]) {
    person(pen, BUSKER[0] + dx, BUSKER[1] + dy, 0, anyone(), rng.pick(["stand", "stand", "cheer"]), dx > 0, small());
  }

  // ---- three friends and a selfie stick
  pen.obj(() => {
    person(pen, 30.6, 29.3, 0, anyone(), "stand");
    person(pen, 31.35, 29.0, 0, anyone(), "wave", true);
    person(pen, 29.95, 28.9, 0, anyone(), "stand", false, 0.72);
    const k = pen.card(30.6, 29.3, 0);
    k.seg(0.4, 1.3, 1.35, 2.25, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
    k.rect(1.28, 2.18, 1.5, 2.5, C.black, { layer: 5, grain: 0 });
  });

  // ---- the pavement artist: flags of the world in chalk
  pen.obj(() => {
    const g = pen.floor(0, 3);
    const cols: RGB[] = [C.red, C.white, C.blue, C.yellow, C.green, C.orange, C.black, C.pink];
    for (let i = 0; i < 8; i++) {
      const a = 30.4 + (i % 4) * 0.7;
      const b = 40.55 + Math.floor(i / 4) * 0.5;
      g.rect(a, b, a + 0.6, b + 0.4, cols[i], { outline: true, w: 0.035, grain: 0.6 });
      g.rect(a, b + 0.14, a + 0.6, b + 0.27, cols[(i + 3) % 8], { layer: 1, grain: 0.6 });
    }
    person(pen, 33.5, 41.1, -0.34, anyone(), "sit", true);
    pen.cyl(32.9, 41.75, 0, 0.2, 0.14, C.black, { seg: 7, w: 0.04 });
  });
  person(pen, 31.2, 39.7, 0, anyone(), "stand");
  person(pen, 32.3, 39.6, 0, anyone(), "stand", true, 0.72);

  // ---- ice cream
  pen.push(38.7, 39.5, 0);
  stall(pen, rng, { w: 3.0, d: 2.0, a: C.pink, sign: "ICES", goods: [C.white, C.pink, C.yellow, hex("#c9e6b0")] });
  pen.pop();
  for (const [x, y] of [
    [39.3, 42.3],
    [40.1, 42.2],
    [40.9, 42.35],
  ]) {
    person(pen, x, y, 0, anyone(), "stand", rng.chance(0.5));
  }
  pen.obj(() => {
    person(pen, 42.2, 41.6, 0, anyone(), "wave", false, 0.72);
    const k = pen.card(42.2, 41.6, 0);
    k.poly(
      [
        [0.38, 1.36],
        [0.54, 1.36],
        [0.46, 1.1],
      ],
      C.wood,
      { layer: 5, grain: 0.2, outline: true, w: 0.03 },
    );
    k.circle(0.46, 1.45, 0.11, C.pink, { layer: 6, seg: 7, grain: 0, outline: true, w: 0.03 });
  });

  // ---- lost, with a map; a dog being walked; a man who feeds the pigeons whatever the signs say
  for (const [x, y, flip] of [
    [40.3, 31.5, false],
    [41.1, 31.9, true],
  ] as const) {
    pen.obj(() => {
      person(pen, x, y, 0, anyone(), "stand", flip);
      if (!flip) pen.card(x, y, 0).rect(0.2, 1.0, 0.86, 1.4, C.white, { outline: true, w: 0.04, layer: 5, grain: 0.2 });
    });
  }
  pen.obj(() => {
    person(pen, 33.0, 37.5, 0, anyone(), "stand");
    dogOn(pen.card(34.3, 37.8, 0), hex("#e0994d"), { corgi: true });
    pen.stroke(
      [
        [33.4, 37.5, 0.9],
        [34.6, 37.8, 0.52],
      ],
      { w: 0.035, color: C.red, kind: L_BAR, wobble: 0 },
    );
  });
  pen.obj(() => {
    person(pen, PIGEONS[0] + 2.0, PIGEONS[1] - 0.9, -0.34, { ...anyone(), hat: C.brickBrown }, "sit", true);
    pen.card(PIGEONS[0] + 2.0, PIGEONS[1] - 0.9, -0.34).rect(-0.62, 0.62, -0.34, 0.96, C.wood, { outline: true, w: 0.04, layer: 5, grain: 0.3 });
  });

  // ---- pigeons too lazy to fly
  const clear = (x: number, y: number) =>
    FOUNT.every((f) => Math.hypot(x - f[0], y - f[1]) > FOUNT_R + 0.7) && !(Math.abs(x - NELSON[0]) < 4.2 && Math.abs(y - NELSON[1]) < 4.2) && Math.hypot(x - PIGEONS[0], y - PIGEONS[1]) > 2.6;
  for (const [x, y] of scatter(rng, 9, 27.6, 42.4, 42.8, 16, 1.6, clear)) pigeon(pen, x, y, 0, rng.chance(0.5), rng.chance(0.4));

  // ---- under the theatre's canopy: the queue for returns, and the usher
  for (let i = 0; i < 8; i++) {
    const lk = anyone();
    const x = 22.8 + i * 0.8;
    person(pen, x, 12.05 + rng.range(-0.08, 0.08), 0, lk, rng.chance(0.2) ? "wave" : "stand", rng.chance(0.3), small());
    if (i % 4 === 1) umbrella(pen, x, 12.05, 0, rng.pick([C.black, C.navy, C.red]));
  }
  pen.obj(() => {
    person(pen, 24.8, 10.7, 0, { skin: SKIN[2], hair: HAIR[0], top: C.red, legs: C.black, long: false, hat: null }, "stand");
    hat(pen, 24.8, 10.7, 0, "cap", { color: C.red });
  });
  // at the stage door somebody in a ruff is going over it once more, skull in hand
  pen.obj(() => {
    person(pen, 28.7, 10.6, 0, { skin: SKIN[0], hair: HAIR[1], top: C.black, legs: C.black, long: true, hat: null }, "wave");
    const k = pen.card(28.7, 10.6, 0);
    k.ellipse(0, 1.47, 0.3, 0.1, C.white, { outline: true, w: 0.035, layer: 4, seg: 8, grain: 0 });
    k.circle(0.66, 2.02, 0.17, C.white, { outline: true, w: 0.04, layer: 5, seg: 8, grain: 0 });
    for (const a of [0.6, 0.72]) k.circle(a, 2.04, 0.035, C.black, { layer: 6, seg: 5, grain: 0 });
  });
  // reading the menu
  person(pen, 42.6, 8.2, 0, anyone(), "stand", true);
  person(pen, 41.9, 8.35, 0, anyone(), "stand", true, 0.72);

  // ---- a quartet on the church steps, and the people it has stopped
  for (let i = 0; i < 4; i++) {
    const x = MX0 + 1.15 + i * 1.37;
    const lk: Look = { skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: C.black, legs: C.black, long: i % 2 === 0, hat: null };
    pen.obj(() => {
      person(pen, x, MY1 + 2.36, 0.18, lk, "sit", i > 1);
      const k = pen.card(x, MY1 + 2.36, 0.18, i > 1);
      if (i === 3) k.ellipse(0.3, 0.72, 0.2, 0.34, C.wood, { outline: true, w: 0.04, layer: 5, seg: 8 });
      else k.ellipse(0.3, 1.2, 0.15, 0.1, C.wood, { outline: true, w: 0.04, layer: 5, seg: 7 });
      k.seg(0.1, i === 3 ? 0.9 : 1.32, 0.62, i === 3 ? 0.8 : 1.08, { w: 0.04, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 6 });
    });
  }
  person(pen, 29.3, 13.6, 0, anyone(), "stand", false);
  person(pen, 39.5, 15.3, 0, anyone(), "cheer", true, 0.72);

  // ---- the news stand, the way down to the Tube, a tree
  pen.push(40.4, 16.2, 0);
  stall(pen, rng, { w: 3.0, d: 1.9, a: C.green, sign: "NEWS", goods: [C.white, C.cream, C.red, C.grey] });
  pen.pop();
  pen.obj(() => {
    person(pen, 41.5, 19.3, 0, suit(rng), "stand");
    pen.card(41.5, 19.3, 0).rect(-0.5, 0.95, 0.5, 1.5, C.white, { outline: true, w: 0.04, layer: 5, grain: 0.2 });
  });
  tubeEntrance(pen, 38.0, 21.8, 0);
  person(pen, 39.6, 23.4, 0, anyone(), "stand", true);
  tree(pen, rng, 42.7, 22.4, { kind: "elm" });
  globeLamp(pen, 4.55, 43.55, 0, 3.2, 1);
  globeLamp(pen, 43.45, 43.55, 0, 3.2, 1);
}

// ---------------------------------------------------------------- everything that moves

/** Someone on foot keeping a place on a route (unlike walker(), which puts them anywhere). */
function stride(route: Route, kind: WalkerKind, speed: number, at: number, born: number, phase = 0): Mover {
  return traveler(route, { speed, at, born, span: 0.8, sprite: (h, t) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6 + phase) & 1] });
}

/** Two children walking side by side, as schools make them. */
function pair(a: Look, b: Look, seed: number): WalkerKind {
  const mk = (pose: Pose, flip: boolean) =>
    makeSprite(
      (pen) => {
        person(pen, 0, -0.3, 0, a, pose, flip, 0.68);
        person(pen, 0, 0.3, 0, b, pose === "walkA" ? "walkB" : "walkA", flip, 0.68);
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
  const { ox, oy, oz } = c;
  const W = (x: number, y: number, z = 0): V3 => [ox + x, oy + y, oz + z];
  const born = c.done;
  /** Seconds since the camera arrived. With no tour, something to the same effect comes round every so often. */
  const arrived = (t: number): number => {
    const at = c.visit();
    return at != null ? t - at : ((((t - born - 5) % 22) + 22) % 22) - 1;
  };
  /** Draw by hand on the moving layer, in the block's own frame, with a pen that is the same every frame. */
  const byHand = (m: Parameters<Mover>[0], seed: number, draw: (pen: Pen) => void) => {
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => born;
    dp.rng = new Rng(seed);
    dp.push(ox, oy, oz);
    draw(dp);
    dp.pop();
    dp.reveal = keep;
    dp.rng = keepRng;
  };

  // ---- the screens
  c.movers.push((m) => {
    if (m.t < born || !m.sees(ox + 11, oy + 8, 7, 14)) return;
    byHand(m, 1819, (pen) => drawSigns(pen, m.t, arrived(m.t)));
  });

  // ---- the light running round the theatre's canopy
  const bulbs = canopyBulbs();
  c.movers.push((m) => {
    if (m.t < born || !m.sees(ox + 24.5, oy + 11.5, 3.2, 10)) return;
    byHand(m, 77, (pen) => {
      const front = pen.wall("y+", CAN_X0, TY1, CAN_Z, CAN_W, CAN_D, 2);
      const side = pen.wall("x+", CAN_X0, TY1, CAN_Z, CAN_W, CAN_D, 2);
      const step = Math.floor(m.t * 6);
      pen.begin();
      bulbs.forEach((b, i) => {
        if ((((i - step) % 4) + 4) % 4 !== 0) return;
        (b.side ? side : front).circle(b.a, 0.21, 0.12, C.yellow, { glow: 1, kind: F_NEON, seg: 6, grain: 0, shade: false });
        pen.stroke(
          [
            [b.x, b.y, CAN_Z + 0.21],
            [b.x, b.y + 0.02, CAN_Z + 0.21],
          ],
          { w: 0.34, kind: L_LIGHT, wobble: 0 },
        );
      });
      pen.end();
    });
  });

  // ---- the fountains: always playing, and up they go when the camera arrives
  c.movers.push((m) => {
    if (m.t < born) return;
    const tau = arrived(m.t);
    const jump = smooth(0, 0.45, tau) - smooth(1.7, 2.6, tau);
    byHand(m, 31, (pen) => {
      for (const [fx, fy] of FOUNT) {
        if (!m.sees(ox + fx, oy + fy, 3, 8)) continue;
        const h = 1.0 + 0.22 * Math.sin(m.t * 3.1 + fx) + 3.4 * jump;
        const k = pen.card(fx, fy, 1.3);
        pen.begin();
        for (const s of [-1, -0.45, 0.45, 1]) {
          k.line(
            [
              [s * 0.06, 0],
              [s * 0.2, h * 0.72],
              [s * 0.42, h],
              [s * 0.72, h * 0.7],
              [s * 0.98, -0.5],
            ],
            { w: 0.1, color: C.white, kind: L_RIPPLE, wobble: 0.5, alpha: 0.92 },
          );
        }
        pen.end();
      }
    });
  });

  // ---- pedicabs, round and round Eros
  const loop = new Route(rounded([W(27.8, 15.4), W(35.6, 15.4), W(35.6, 23.2), W(27.8, 23.2)], true, 3.2), true);
  const rigs: [RGB, RGB][] = [
    [C.neonPink, hex("#f4c8dc")],
    [C.neonBlue, hex("#cfe6f5")],
  ];
  rigs.forEach(([hood, seat], i) => {
    const frames = [0, 1].map((f) => new Turning((p) => pedicab(p, new Rng(60 + i), f, hood, seat), 24, 610 + i));
    c.movers.push(traveler(loop, { speed: 2.3, at: i * 0.5, born: born + 0.2 * i, span: 2.2, sprite: (h, t) => frames[Math.floor(t * 3 + i) & 1].at(h) }));
  });

  // ---- the pigeons, and the child who keeps them fit
  const T = 12;
  const kc: V2 = [PIGEONS[0] - 2.2, PIGEONS[1] + 0.3];
  const kidLoop: V3[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2;
    kidLoop.push(W(kc[0] + Math.cos(t) * 2.2, kc[1] + Math.sin(t) * 1.7));
  }
  const kidRoute = new Route(kidLoop, true);
  const kidLook = randomLook(new Rng(13));
  const kidSprite = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, kidLook, pose, flip, 0.66), 0, 120);
  const kid = [
    [kidSprite("walkA", false), kidSprite("cheer", false)],
    [kidSprite("walkA", true), kidSprite("cheer", true)],
  ];
  c.movers.push(traveler(kidRoute, { speed: kidRoute.length / T, at: 0, born, span: 0.8, sprite: (h, t) => kid[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 4) & 1] }));
  const bird = (how: "stand" | "peck" | "up" | "down", flip: boolean) => makeSprite((p) => pigeonOn(p.card(0, 0, 0, flip), how), 0, 3);
  const standing = [
    [bird("stand", false), bird("peck", false)],
    [bird("stand", true), bird("peck", true)],
  ];
  const flying = [
    [bird("up", false), bird("down", false)],
    [bird("up", true), bird("down", true)],
  ];
  const pr = new Rng(21);
  const flock: { hx: number; hy: number; dx: number; dy: number; dz: number; lag: number; flip: number; ph: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const a = pr.range(0, 6.28);
    const r = Math.sqrt(pr.next()) * 1.8;
    flock.push({ hx: PIGEONS[0] + Math.cos(a) * r, hy: PIGEONS[1] + Math.sin(a) * r * 0.8, dx: pr.range(-1.6, 1.6), dy: pr.range(-1.6, 1.6), dz: pr.range(-0.8, 0.8), lag: pr.range(0, 0.5), flip: pr.chance(0.5) ? 1 : 0, ph: pr.range(0, 10) });
  }
  // the flight: one lap round the column and home again
  const fc: V2 = [NELSON[0], NELSON[1] - 1.5];
  const th0 = Math.atan2(PIGEONS[1] - fc[1], PIGEONS[0] - fc[0]);
  const lap = (u: number, out: V3) => {
    const th = th0 + u * Math.PI * 2;
    out[0] = fc[0] + Math.cos(th) * 8.5;
    out[1] = fc[1] + Math.sin(th) * 6.6;
    out[2] = 6.2 + Math.sin(u * Math.PI) * 2.6;
  };
  const q: V3 = [0, 0, 0];
  const q2: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(ox + 24, oy + 33, 4, 20)) return;
    for (const b of flock) {
      // the child reaches the flock at the top of every cycle
      const u = (((m.t - b.lag) % T) + T) % T;
      let x: number;
      let y: number;
      let z: number;
      let air = true;
      let right = b.flip === 0;
      if (u < 1.1) {
        const e = ease.inOut(u / 1.1);
        lap(0, q);
        x = b.hx + (q[0] + b.dx - b.hx) * e;
        y = b.hy + (q[1] + b.dy - b.hy) * e;
        z = (q[2] + b.dz) * e;
        right = q[0] - q[1] > b.hx - b.hy;
      } else if (u < 6.1) {
        const v = (u - 1.1) / 5;
        lap(v, q);
        lap(v + 0.01, q2);
        x = q[0] + b.dx;
        y = q[1] + b.dy;
        z = q[2] + b.dz;
        right = q2[0] - q2[1] > q[0] - q[1];
      } else if (u < 7.6) {
        const e = ease.inOut((u - 6.1) / 1.5);
        lap(1, q);
        x = q[0] + b.dx + (b.hx - q[0] - b.dx) * e;
        y = q[1] + b.dy + (b.hy - q[1] - b.dy) * e;
        z = (q[2] + b.dz) * (1 - e);
        right = b.hx - b.hy > q[0] - q[1];
      } else {
        x = b.hx;
        y = b.hy;
        z = 0;
        air = false;
      }
      const s = air ? flying[right ? 0 : 1][Math.floor(m.t * 9 + b.ph) & 1] : standing[b.flip][Math.floor(m.t * 1.3 + b.ph) % 3 === 0 ? 1 : 0];
      m.put(s, ox + x, oy + y, oz + z, born);
    }
  });

  // ---- a school party in pairs round the west fountain, a teacher at each end
  const round = new Route(rounded([W(8.6, 27.6), W(18.6, 27.6), W(18.6, 36.1), W(8.6, 36.1)], true, 2.0), true);
  const kr = new Rng(404);
  const child = (): Look => ({ skin: kr.pick(SKIN), hair: kr.pick(HAIR), top: C.hivis, legs: kr.pick([C.navy, C.charcoal]), long: kr.chance(0.5), hat: null });
  const L = round.length;
  c.movers.push(stride(round, castWalker({ skin: SKIN[1], hair: HAIR[5], top: C.teal, legs: C.navy, long: true, hat: null }, 71), 1.15, 1.25 / L, born, 0.5));
  for (let i = 0; i < 5; i++) c.movers.push(stride(round, pair(child(), child(), 80 + i), 1.15, (-i * 1.0) / L, born + i * 0.05, i * 0.7));
  c.movers.push(stride(round, castWalker({ skin: SKIN[3], hair: HAIR[0], top: C.orange, legs: C.charcoal, long: false, hat: null }, 72), 1.15, -5.2 / L, born + 0.3, 0.2));

  // ---- a man with a sandwich board, up and down the bottom of the square
  const boardLook = randomLook(new Rng(9));
  const board = (pose: Pose, flip: boolean) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, boardLook, pose, flip);
        const k = p.card(0, 0, 0, flip);
        k.rect(-0.44, 0.42, 0.44, 1.5, C.white, { outline: true, w: W_FINE, layer: 4, grain: 0.2 });
        p.card(0, 0, 0).text("SALE", 0, 0.86, 0.24, { align: "c", color: C.red, kind: L_MARK, w: 0.055, wobble: 0.2, layer: 5 });
      },
      0,
      45,
    );
  const boardKind: WalkerKind = {
    frames: [
      [board("walkA", false), board("walkB", false)],
      [board("walkA", true), board("walkB", true)],
    ],
  };
  const beat = new Route(rounded([W(20.5, 42.5), W(37.5, 42.5), W(37.5, 42.62), W(20.5, 42.62)], true, 0.05), true);
  c.movers.push(stride(beat, boardKind, 1.0, 0.1, born + 0.2));

  // ---- the living statue moves only when paid
  const gold: Look = { skin: C.gold, hair: C.gold, top: C.gold, legs: C.gold, long: false, hat: C.gold };
  const statue = (pose: Pose) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, gold, pose);
        p.card(0, 0, 0).rect(-0.3, 2.22, 0.3, 2.75, C.gold, { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
      },
      0,
      81,
    );
  const poses = [statue("stand"), statue("wave"), statue("cheer")];
  const sp = W(STATUE[0], STATUE[1], 0.7);
  c.movers.push((m) => {
    const u = m.t % 6.5;
    m.put(u < 4.6 ? poses[0] : u < 5.6 ? poses[1] : poses[2], sp[0], sp[1], sp[2], born);
  });

  // ---- notes drifting up from the busker and from the quartet, and the sleeper's snores
  const drift = (draw: (k: Plane) => void, seed: number): Sprite => makeSprite((p) => draw(p.card(0, 0, 0)), 0, seed);
  const note = drift((k) => {
    k.ellipse(0, 0, 0.17, 0.12, C.black, { grain: 0, seg: 8 });
    k.seg(0.15, 0.02, 0.15, 0.62, { w: 0.05, kind: L_BAR, wobble: 0 });
    k.seg(0.15, 0.62, 0.4, 0.5, { w: 0.07, kind: L_BAR, wobble: 0 });
  }, 71);
  const zed = drift((k) => k.text("Z", 0, 0, 0.5, { align: "c", w: 0.07, wobble: 0.2 }), 72);
  const rising: [Sprite, V3, number, number][] = [
    [note, W(BUSKER[0] + 0.5, BUSKER[1] - 0.3, 2.5), 3.4, 4],
    [note, W(MX0 + 3.2, MY1 + 2.5, 2.7), 3.0, 4],
    [zed, W(SLEEPER[0] + 0.5, SLEEPER[1] - 0.4, TER + 0.6), 4.2, 3],
  ];
  c.movers.push((m) => {
    if (m.t < born) return;
    for (const [s, p, period, n] of rising) {
      if (!m.sees(p[0], p[1], p[2], 8)) continue;
      for (let i = 0; i < n; i++) {
        const u = (m.t / period + i / n) % 1;
        const sx = Math.sin(u * 7 + i * 2) * 0.35;
        // each one sketches itself in, then runs its reveal backwards to fade out as it rises
        const shown = Math.min(u * period, ((1 - u) / 0.3) * 1.05);
        m.put(s, p[0] + sx + i * 0.25, p[1] - sx - i * 0.2, p[2] + u * 3.0, m.t - shown);
      }
    }
  });

  // ---- people on foot: round the square, round the column, and in and out of Chinatown
  const ring = new Route(rounded([W(4.9, 26.75), W(43.1, 26.75), W(43.1, 43.2), W(4.9, 43.2)], true, 1.0), true);
  for (let i = 0; i < 8; i++) c.movers.push(walker(ring, rng, born + rng.range(0, 1)));
  const gawp = new Route(rounded([W(18.8, 33.0), W(29.2, 33.0), W(29.2, 41.9), W(18.8, 41.9)], true, 2.6), true);
  for (let i = 0; i < 6; i++) c.movers.push(walker(gawp, rng, born + rng.range(0, 1)));
  const lane = new Route(
    rounded([W(40.3, 8.1), W(40.3, 13.4), W(37.0, 14.9), W(37.0, 24.8), W(27.0, 24.8), W(26.95, 13.0), W(29.9, 12.75), W(30.4, 14.55), W(37.3, 14.55), W(40.9, 13.3), W(40.9, 8.1)], true, 0.4),
    true,
  );
  for (let i = 0; i < 7; i++) c.movers.push(walker(lane, rng, born + rng.range(0, 1)));
}

// ---------------------------------------------------------------- the block

export const westend: LondonBuilder = (c) => {
  const { pen } = c;
  c.early(() => ground(c));
  lights(c);
  theatre(c);
  gate(c);
  church(c);
  gallery(c);
  erosFountain(c);
  for (const [x, y] of FOUNT) {
    fountain(pen, x, y, FOUNT_R, 2.0);
    // lit from under the water at night
    pen.obj(() => {
      pen.stroke(
        [
          [x + 0.6, y + 0.6, 0.6],
          [x + 0.6, y + 0.62, 0.6],
        ],
        { w: 3.6, kind: L_LIGHT, wobble: 0, alpha: 0.26 },
      );
    }, 0.2);
  }
  nelson(c);
  plinths(c);
  life(c);
  motion(c);
};
