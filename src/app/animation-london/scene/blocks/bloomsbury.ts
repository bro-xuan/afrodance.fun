// Bloomsbury and St Pancras. The British Museum looks out over its forecourt
// from behind its columns, the glass roof of the Great Court swelling round
// the copper dome of the Reading Room. Next door the trains for the continent
// ease out from under St Pancras's blue iron shed, past the red-brick clock
// tower, and run off the edge of the drawing. Between the two: a terrace with
// blue plaques, a garden square of plane trees with a cafe hut, an ice cream
// van, and a school party in hi-vis walking two by two to see the mummies.

import { RGB, Rng, V2, V3, clamp, hex } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_LIGHT, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, castWalker, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN, TROUSERS } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  bench,
  bike,
  bin,
  cab,
  cafeTable,
  dogOn,
  fountain,
  hat,
  hedge,
  lamp,
  lancet,
  lightString,
  person,
  phoneBox,
  pigeon,
  pointed,
  portico,
  railing,
  randomLook,
  speckle,
  squirrel,
  stall,
  steps,
  terrace,
  tree,
  tubeEntrance,
  tufts,
  umbrella,
  van,
  windowAt,
  windowGrid,
} from "../props";
import { Mover } from "../types";

const STONE = C.portland;
const STONE_D = C.portlandDark;
const STONE_L = C.portlandLight;
const BRONZE_DOOR = hex("#5a4a3a");
const GLASS = hex("#d6e8f1");
const IRON = hex("#a3c9e0");
const IRON_D = hex("#6f9fc0");
const DARK = hex("#3d3a40");
const BRICK = C.brick;
const BRICK_D = C.brickDark;
const DRESSING = C.bathLight;

// The museum: the main range, the two wings that reach forward from it, and the portico between them.
const MX0 = 5;
const MX1 = 27;
const MY0 = 5;
const MY1 = 18;
const MH = 7.6;
const WING = 3.5;
const WY1 = 25;
const PX = 11;
const PW = 10;
/** The two lawns of the forecourt (their x ranges), either side of the way in. */
const LAWNS: [number, number][] = [
  [10.2, 14.4],
  [17.6, 21.8],
];
const LAWN_Y0 = 24.1;
const LAWN_Y1 = 26.3;
/** Height of the portico's floor, up its flight of steps. */
const PODIUM = 1.0;

// The garden square, and the fountain in the middle of it.
const QX0 = 15;
const QX1 = 28.4;
const QY0 = 31.5;
const QY1 = 43.6;
const QCX = 21.7;
const QCY = 37.6;

// St Pancras: the train shed (its open end faces +y), the two tracks that leave it, the hotel wing and the clock tower.
const SX0 = 29.5;
const SW = 10;
const SY0 = 5;
const SY1 = 19;
const SHED_H = 9.6;
const TRACKS = [32.5, 36.5];
const HX = 39.5;
const HW = 4.5;
const HD = 11.5;
const HH = 8.2;
const TX = 39.8;
const TY = 16.5;
const TS = 4.2;
const TH = 17;
/** Where the laid track gives out and the pencilled track begins; where a train starts to fade and where it is gone. */
const TRACK_END = 34.6;
const FADE0 = 35.2;
const FADE1 = 41.5;
/** The middle of the taxi rank (x). */
const RANK_X = 40.25;

const lookOf = (skin: RGB, hair: RGB, top: RGB, legs: RGB, long = false, hatCol: RGB | null = null): Look => ({ skin, hair, top, legs, long, hat: hatCol });

/** Someone on a school trip (or in charge of one): a yellow vest over whatever they came in. */
function hiVis(rng: Rng): Look {
  const lk = randomLook(rng);
  lk.top = C.hivis;
  lk.hat = null;
  return lk;
}

/** Someone sitting with a book open. */
function reader(pen: Pen, x: number, y: number, z: number, lk: Look, flip: boolean, cover: RGB): void {
  pen.obj(() => {
    person(pen, x, y, z, lk, "sit", flip);
    pen.card(x, y, z, flip).rect(0.3, 0.74, 0.68, 1.0, cover, { outline: true, w: 0.035, layer: 5, grain: 0.2 });
  });
}

/** Someone holding a phone out to take a picture, at any height. */
function photographer(pen: Pen, x: number, y: number, z: number, lk: Look, flip = false): void {
  pen.obj(() => {
    person(pen, x, y, z, lk, "stand", flip);
    const k = pen.card(x, y, z, flip);
    k.bar(0.34, 1.34, 0.72, 1.6, 0.17, lk.top, { layer: 4 });
    k.rect(0.7, 1.5, 0.88, 1.82, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  });
}

/** A wheeled suitcase trailing behind whoever is drawn on this card. */
function suitcase(k: Plane, rgb: RGB): void {
  k.rect(-0.88, 0.03, -0.48, 0.7, rgb, { outline: true, w: 0.04, layer: 0.5, grain: 0.3 });
  k.seg(-0.52, 0.7, -0.4, 0.92, { w: 0.045, color: C.greyDark, kind: L_BAR, wobble: 0 });
}

/** Sprites for a figure that walks: [heading right, heading left] x [stride, passing]. */
type Frames = Sprite[][];

function walkFrames(draw: (pen: Pen, pose: Pose, flip: boolean) => void, seed: number): Frames {
  const mk = (pose: Pose, flip: boolean) => makeSprite((p) => draw(p, pose, flip), 0, seed);
  return [
    [mk("walkA", false), mk("walkB", false)],
    [mk("walkA", true), mk("walkB", true)],
  ];
}

/** Which way a walker heading `h` faces on the page: 0 right, 1 left. */
const facing = (h: number) => (Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1);

/** A figure of our own drawing following a route for ever. */
function stroll(route: Route, fr: Frames, speed: number, at: number, born: number, rate = 2.6): Mover {
  return traveler(route, { speed, at, born, span: 0.8, sprite: (h, t) => fr[facing(h)][Math.floor(t * rate + at * 23) & 1] });
}

// ---------------------------------------------------------------- the ground

function onSquarePath(a: number, b: number): boolean {
  if (Math.hypot(a - QCX, b - QCY) < 2.7) return true;
  const ring = a > 15.9 && a < 27.5 && b > 32.4 && b < 42.7 && !(a > 17.0 && a < 26.4 && b > 33.5 && b < 41.6);
  const ns = a > 21.1 && a < 22.3 && (b < 35.3 || b > 39.9);
  const ew = b > 37.0 && b < 38.2 && (a < 19.4 || a > 24.0);
  return ring || ns || ew;
}

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  // the museum's forecourt: stone flags, a lawn either side of the way in
  g1.rect(4.4, MY1, 27.6, 28, C.plaza, { grain: 0.7 });
  for (const [a0, a1] of LAWNS) {
    g2.rect(a0, LAWN_Y0, a1, LAWN_Y1, C.grass, { outline: true, w: W_THIN });
    tufts(g3, a0 + 0.2, LAWN_Y0 + 0.2, a1 - 0.2, LAWN_Y1 - 0.2, 0.5);
  }
  speckle(g3, 4.8, 22.5, 27.2, 27.9, C.streetDark, 0.22, (a, b) => !LAWNS.some(([p, q]) => a > p - 0.2 && a < q + 0.2 && b > LAWN_Y0 - 0.2 && b < LAWN_Y1 + 0.2));
  // the garden square: grass, a gravel walk round the edge and four more to the fountain in the middle
  g1.rect(QX0 + 0.4, QY0 + 0.4, QX1 - 0.4, QY1 - 0.4, C.grass, { outline: true, w: W_THIN });
  const gravel = { grain: 0.8 };
  g2.rect(16, 32.5, 27.4, 33.4, C.gravel, gravel);
  g2.rect(16, 41.7, 27.4, 42.6, C.gravel, gravel);
  g2.rect(16, 33.4, 16.9, 41.7, C.gravel, gravel);
  g2.rect(26.5, 33.4, 27.4, 41.7, C.gravel, gravel);
  g2.rect(21.2, QY0 + 0.4, 22.2, 32.5, C.gravel, gravel);
  g2.rect(21.2, 33.4, 22.2, 35.3, C.gravel, gravel);
  g2.rect(21.2, 39.9, 22.2, 41.7, C.gravel, gravel);
  g2.rect(QX0 + 0.4, 37.1, 16, 38.1, C.gravel, gravel);
  g2.rect(16.9, 37.1, 19.4, 38.1, C.gravel, gravel);
  g2.rect(24.0, 37.1, 26.5, 38.1, C.gravel, gravel);
  g3.circle(QCX, QCY, 2.6, C.gravel, { seg: 22, grain: 0.8, outline: true, w: 0.05, ink: C.streetDark });
  tufts(g3, QX0 + 0.6, QY0 + 0.6, QX1 - 0.6, QY1 - 0.6, 0.45, (a, b) => !onSquarePath(a, b));
  // the station: ballast under the two tracks, ragged where the laid track stops, and flags outside the hotel door
  g1.poly(
    [
      [31.3, SY1],
      [37.7, SY1],
      [37.7, 34.3],
      [36.9, 35.0],
      [36.1, 34.4],
      [35.2, 35.1],
      [34.3, 34.5],
      [33.4, 35.2],
      [32.4, 34.5],
      [31.3, 34.9],
    ],
    C.ballast,
    { grain: 0.9 },
  );
  speckle(g3, 31.5, SY1 + 0.3, 37.5, 34.2, C.greyDark, 0.5, (a) => !(a > 33.7 && a < 35.3));
  g1.rect(38.4, 20.8, 43.8, 35.4, C.plaza, { grain: 0.7 });
  speckle(g3, 38.6, 21, 43.6, 35.2, C.streetDark, 0.25);
  // the taxi rank: a strip of tarmac down to the street, with the word on it
  g1.rect(RANK_X - 1.3, 36.2, RANK_X + 1.3, 43.9, C.tarmac, { grain: 0.9, outline: true, w: 0.05 });
  for (const x of [RANK_X - 1.05, RANK_X + 1.05]) g2.seg(x, 36.5, x, 43.7, { w: 0.06, color: C.yellowLine, kind: L_MARK, wobble: 0.2 });
  pen.plane([RANK_X + 0.42, 43.6, 0], [0, -1, 0], [-1, 0, 0], 2, true).text("TAXI", 0, 0, 0.62, { color: C.roadLine, kind: L_MARK, w: 0.085, wobble: 0.3 });
}

// ---------------------------------------------------------------- the British Museum

function museum(c: LondonCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.7);
  const W = MX1 - MX0;
  const D = MY1 - MY0;
  const cornice = (f: Plane, a0: number, a1: number) => {
    f.rect(a0, MH - 0.55, a1, MH, STONE_L, { grain: 0.4 });
    f.seg(a0, MH - 0.55, a1, MH - 0.55, { w: W_FINE });
  };
  // the main range
  pen.obj(() => {
    pen.box(MX0, MY0, 0, W, D, MH, STONE, { top: STONE_D });
    const f = pen.wall("y+", MX0, MY0, 0, W, D);
    // behind the portico: the great bronze doors, and tall windows either side of them
    f.rect(10.2, PODIUM, 11.8, 4.7, BRONZE_DOOR, { outline: true, w: W_THIN, grain: 0.6 });
    f.seg(11, PODIUM, 11, 4.7, { w: 0.05, wobble: 0, layer: 1 });
    for (const a of [6.9, 8.5, 13.5, 15.1]) windowAt(f, a - 0.45, 1.9, a + 0.45, 4.6, lit(), STONE_L);
    cornice(f, WING, W - WING);
  });
  // the two wings
  for (const x of [MX0, MX1 - WING]) {
    pen.obj(() => {
      pen.box(x, MY1, 0, WING, WY1 - MY1, MH, STONE, { top: STONE_D });
      const f = pen.wall("y+", x, MY1, 0, WING, WY1 - MY1);
      for (const a of [0.55, 2.05]) windowAt(f, a, 1.3, a + 0.9, 4.4, lit(), STONE_L);
      cornice(f, 0, WING);
      if (x === MX0) {
        const g = pen.wall("x+", x, MY1, 0, WING, WY1 - MY1);
        for (const a of [0.8, 3.05, 5.3]) windowAt(g, a, 1.3, a + 0.9, 4.4, lit(), STONE_L);
        cornice(g, 0, WY1 - MY1);
      }
    });
  }
  // the east side, wing and all: a plinth, pilasters, two rows of windows
  pen.obj(() => {
    const g = pen.wall("x+", MX0, MY0, 0, W, WY1 - MY0);
    const len = WY1 - MY0;
    g.rect(0, 0, len, 0.7, STONE_D, { grain: 0.6 });
    g.seg(0, 0.7, len, 0.7, { w: W_FINE });
    windowGrid(g, rng, 0.6, 1.2, len - 0.6, 6.7, 8, 2, { lit: 0.6, trim: STONE_L, fillA: 0.4, fillB: 0.66 });
    for (let k = 0; k <= 8; k++) {
      const a = 0.6 + (k * (len - 1.2)) / 8;
      g.rect(a - 0.13, 0.7, a + 0.13, MH - 0.55, STONE_L, { grain: 0.4 });
    }
    cornice(g, 0, len);
  }, 0.05);
  // the colonnade: across the front of each wing, and down the inner side of the west one
  for (const x of [MX0, MX1 - 4.8]) {
    pen.obj(() => {
      pen.box(x - 0.1, WY1, 0, 5.0, 1.45, 0.3, STONE_L, { w: W_FINE });
      portico(pen, x, WY1, 0.3, 4.8, 1.3, 6.2, 4, { pediment: 0, stone: STONE });
    }, 0.1);
  }
  pen.push(MX0 + WING, WY1, 0, 270);
  pen.obj(() => {
    pen.box(0, 0, 0, 7, 1.45, 0.3, STONE_L, { w: W_FINE });
    portico(pen, 0, 0, 0.3, 7, 1.3, 6.2, 5, { pediment: 0, stone: STONE });
  }, 0.1);
  pen.pop();
  // the portico: eight columns on a flight of steps, the name along the frieze, a pediment crowded with marble figures
  pen.obj(() => {
    pen.box(PX - 0.2, MY1, 0, PW + 0.4, 2.8, PODIUM, STONE_L, { w: W_THIN });
    portico(pen, PX, MY1, PODIUM, PW, 2.6, 6.5 - PODIUM, 8, { pediment: 2.0, roof: C.lead, stone: STONE });
    pen.wall("y+", PX - 0.15, MY1, 6.5, PW + 0.3, 2.75).text("BRITISH MUSEUM", (PW + 0.3) / 2, 0.17, 0.36, { align: "c", color: C.inkSoft, w: 0.06, wobble: 0.3 });
    const pf = pen.wall("y+", PX - 0.3, MY1, 7.2, PW + 0.6, 2.9);
    for (let i = 0; i < 11; i++) {
      const a = 1.5 + i * 0.76;
      const hh = 0.3 + (1 - Math.abs(a - 5.3) / 4.4) * 1.0;
      pf.ellipse(a, 0.24 + hh * 0.45, 0.2, hh * 0.45, C.white, { layer: 1, seg: 8, grain: 0.3, outline: true, w: 0.035, ink: STONE_D });
    }
    // lamps at the columns' feet light the front up after dark
    for (let k = 0; k < 8; k++) {
      const x = PX + 0.6 + (k * (PW - 1.2)) / 7;
      pen.stroke(
        [
          [x, MY1 + 2.72, 1.8],
          [x + 0.02, MY1 + 2.72, 1.8],
        ],
        { w: 1.3, kind: L_LIGHT, wobble: 0, alpha: 0.22 },
      );
    }
  }, 0.12);
  steps(pen, PX - 0.2, MY1 + 2.8, 0, PW + 0.4, 2.2, PODIUM, 5, STONE_L);
  // the Great Court's roof, a pillow of glass on a steel lattice, and the Reading Room's dome coming up through it
  pen.obj(() => {
    const x0 = 8.5;
    const x1 = 23.5;
    const y0 = 6.3;
    const y1 = 16.7;
    const nx = 10;
    const ny = 6;
    const zAt = (i: number, j: number) => MH + 0.06 + 1.0 * Math.pow(Math.sin((Math.PI * i) / nx), 0.55) * Math.pow(Math.sin((Math.PI * j) / ny), 0.55);
    const verts: V3[] = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) verts.push([x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny, zAt(i, j)]);
    const id = (i: number, j: number) => j * (nx + 1) + i;
    const faces: number[][] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) faces.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
    pen.solid(verts, faces, GLASS, { convex: false, ink: C.slateLight, w: 0.05, glow: 0.5, grain: 0.4, over: 0, crease: 0.1 });
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = (i + j) % 2 === 0 ? verts[id(i, j)] : verts[id(i + 1, j)];
        const b = (i + j) % 2 === 0 ? verts[id(i + 1, j + 1)] : verts[id(i, j + 1)];
        pen.stroke(
          [
            [a[0], a[1], a[2] + 0.02],
            [b[0], b[1], b[2] + 0.02],
          ],
          { w: 0.04, color: C.slateLight, kind: L_MARK, wobble: 0 },
        );
      }
    }
    const cx = (MX0 + MX1) / 2;
    const cy = 11.5;
    pen.cyl(cx, cy, MH, 3.0, 2.4, STONE_L, { seg: 16, top: C.copperDark });
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2 + 0.26;
      if (Math.cos(t - Math.PI / 4) < 0.05) continue;
      const x = cx + Math.cos(t) * 3.04;
      const y = cy + Math.sin(t) * 3.04;
      pen.stroke(
        [
          [x, y, MH + 1.3],
          [x, y, MH + 2.1],
        ],
        { w: 0.42, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.dome(cx, cy, MH + 2.4, 3.05, 1.8, C.copper, { seg: 16 });
    pen.cyl(cx, cy, MH + 4.15, 0.5, 0.5, STONE_L, { seg: 8, w: W_FINE });
    pen.cone(cx, cy, MH + 4.65, 0.62, 0.6, C.copper, { seg: 8, w: W_FINE });
  }, 0.3);
}

// ---------------------------------------------------------------- the forecourt and the street outside it

function forecourt(c: LondonCtx): void {
  const { pen, rng } = c;
  // railings along the street, a stone pier with a lantern either side of the gate, the gates standing open
  railing(
    pen,
    [
      [4.6, 26.6, 0],
      [4.6, 28, 0],
      [14.1, 28, 0],
    ],
    1.25,
    C.iron,
    0.62,
  );
  railing(
    pen,
    [
      [17.9, 28, 0],
      [27.45, 28, 0],
      [27.45, 26.6, 0],
    ],
    1.25,
    C.iron,
    0.62,
  );
  for (const x of [14.1, 17.3]) {
    pen.obj(() => {
      pen.box(x, 27.7, 0, 0.6, 0.6, 2.3, STONE_L, { w: W_THIN });
      pen.box(x - 0.08, 27.62, 2.3, 0.76, 0.76, 0.16, STONE_L, { w: W_FINE });
    });
    lamp(pen, x + 0.3, 28, 2.46, 0.9);
  }
  railing(
    pen,
    [
      [14.7, 27.9, 0],
      [15.0, 26.5, 0],
    ],
    1.25,
    C.iron,
    0.5,
  );
  railing(
    pen,
    [
      [17.3, 27.9, 0],
      [17.0, 26.5, 0],
    ],
    1.25,
    C.iron,
    0.5,
  );
  // a banner for each of the exhibitions, on a pole at the outer end of each lawn
  const banners: [number, number, RGB][] = [
    [10.45, 25.2, C.teal],
    [21.55, 25.2, C.red],
  ];
  for (const [x, y, col] of banners) {
    pen.obj(() => {
      pen.pole([x, y, 0], [x, y, 3.7], 0.09, C.iron);
      const k = pen.card(x, y, 1.45);
      k.rect(0.08, 0, 0.8, 2.1, col, { outline: true, w: W_FINE, sway: 0.12, grain: 0.5 });
      k.circle(0.44, 1.5, 0.2, C.white, { layer: 1, seg: 8, grain: 0, sway: 0.12 });
      for (const b of [0.45, 0.72]) k.seg(0.24, b, 0.64, b, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, sway: 0.12, layer: 1 });
    });
  }
  // the gatekeeper
  pen.obj(() => {
    person(pen, 18.3, 27.4, 0, lookOf(SKIN[2], HAIR[0], C.navy, C.navy), "stand");
    hat(pen, 18.3, 27.4, 0, "cap");
  });

  // on the steps: sitting in the sun, posing between the columns, taking each other's picture
  const sitters: [number, number, number][] = [
    [11.5, 21.9, 0.46],
    [12.3, 22.78, 0.06],
    [13.1, 22.34, 0.26],
    [13.9, 22.78, 0.06],
    [14.6, 21.9, 0.46],
    [17.5, 22.34, 0.26],
    [18.3, 21.9, 0.46],
    [19.2, 22.78, 0.06],
    [20.0, 22.34, 0.26],
    [20.7, 22.78, 0.06],
  ];
  sitters.forEach(([x, y, z], i) => {
    if (i === 2) reader(pen, x, y, z, randomLook(rng), false, C.red);
    else person(pen, x, y, z, randomLook(rng), "sit", rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  });
  person(pen, 12.5, 19.6, PODIUM, randomLook(rng), "wave");
  person(pen, 13.2, 19.7, PODIUM, randomLook(rng), "cheer", true);
  photographer(pen, 12.9, 21.05, PODIUM, randomLook(rng), true);
  person(pen, 15.3, 19.4, PODIUM, randomLook(rng), "walkA");
  person(pen, 15.9, 19.2, PODIUM, randomLook(rng), "walkB", false, 0.7);
  person(pen, 19.4, 19.5, PODIUM, randomLook(rng), "stand", true);
  person(pen, 20.1, 19.7, PODIUM, randomLook(rng), "stand");
  pen.obj(() => {
    person(pen, 17.3, 18.8, PODIUM, lookOf(SKIN[3], HAIR[6], C.navy, C.navy), "stand", true);
    hat(pen, 17.3, 18.8, PODIUM, "cap", { flip: true });
  });
  // a guide with her umbrella up, so nobody loses her, and the party she is telling about the Rosetta Stone
  pen.obj(() => {
    person(pen, 20.0, 23.5, 0, lookOf(SKIN[1], HAIR[5], C.blue, TROUSERS[1], true), "wave");
    umbrella(pen, 20.0, 23.5, 0, C.red);
  });
  const party: [number, number][] = [
    [18.6, 23.7],
    [19.15, 23.2],
    [20.9, 23.25],
    [21.5, 23.65],
    [20.6, 23.95],
    [21.95, 23.2],
  ];
  party.forEach(([x, y], i) => {
    if (i === 1) photographer(pen, x, y, 0, randomLook(rng), false);
    else person(pen, x, y, 0, randomLook(rng), "stand", x > 20);
  });
  // a class having its packed lunch on the west lawn, round in a ring
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.4;
    person(pen, 12.3 + Math.cos(t) * 0.98, 25.2 + Math.sin(t) * 0.7, -0.3, hiVis(rng), "sit", Math.cos(t) > 0, 0.7);
  }
  pen.obj(() => {
    const g = pen.floor(0, 4);
    for (const [x, y, col] of [
      [12.1, 25.05, C.red],
      [12.6, 25.3, C.blue],
      [12.2, 25.4, C.orange],
    ] as const) {
      g.rect(x, y, x + 0.28, y + 0.2, col, { outline: true, w: 0.03, grain: 0.2 });
    }
  });
  person(pen, 13.75, 25.85, 0, hiVis(rng), "stand", true);
  // on the east lawn: two with books, and the pigeons
  reader(pen, 18.9, 24.95, -0.3, randomLook(rng), false, C.blue);
  reader(pen, 20.7, 25.6, -0.3, randomLook(rng), true, C.yellow);
  pigeon(pen, 19.8, 24.5);
  pigeon(pen, 21.0, 24.75, 0, true, true);
  pigeon(pen, 13.4, 23.35, 0, false, true);
  pigeon(pen, 14.1, 23.65, 0, true);
  pigeon(pen, 17.9, 23.3);
  person(pen, 11.3, 23.55, 0, randomLook(rng), "walkA");
  person(pen, 12.0, 23.4, 0, randomLook(rng), "walkB", false, 0.72);
  // benches along the railings
  bench(pen, 11.8, 27.15, 180);
  person(pen, 11.4, 27.1, 0.42, randomLook(rng), "sit");
  person(pen, 12.3, 27.1, 0.42, randomLook(rng), "sit", true);
  bench(pen, 24.2, 27.25, 180);
  reader(pen, 24.2, 27.2, 0.42, randomLook(rng), false, C.green);
  bin(pen, 22.9, 27.4);

  // out in the street: the ice cream van that is always at the gates, and its queue
  pen.push(24.8, 29.15, 0, 0);
  pen.obj(() => {
    van(pen, hex("#fbf3e2"));
    const f = pen.wall("y+", -2.4, -0.975, 0.3, 4.8, 1.95);
    f.rect(0.45, 0.62, 2.85, 1.3, C.glass, { outline: true, w: W_FINE, glow: 0.9, layer: 2, grain: 0.3 });
    f.rect(0.3, 0.42, 3.0, 0.62, C.pink, { outline: true, w: 0.04, layer: 2, grain: 0.3 });
    f.text("ICES", 1.65, 1.42, 0.3, { align: "c", color: C.red, kind: L_MARK, w: 0.08, wobble: 0.3, layer: 2 });
    // a striped canopy over the hatch
    const aw = pen.plane([-1.95, 0.975, 1.62], [1, 0, 0], [0, 0.7, -0.32], 0, true);
    for (let i = 0; i < 6; i++) aw.rect(i * 0.4, 0, (i + 1) * 0.4, 1, i % 2 === 0 ? C.pink : C.white, { grain: 0.5 });
    aw.loop(
      [
        [0, 0],
        [2.4, 0],
        [2.4, 1],
        [0, 1],
      ],
      { w: W_FINE },
    );
    // the giant cone on the roof
    pen.cyl(-1.2, 0, 2.15, 0.1, 0.75, C.ochre, { seg: 8, r2: 0.34, w: W_FINE });
    pen.dome(-1.2, 0, 2.9, 0.36, 0.42, C.pink, { seg: 8, rings: 3, w: W_FINE });
    person(pen, -0.75, 1.0, 0.72, lookOf(SKIN[1], HAIR[1], C.white, C.white, false, C.white), "bust");
  });
  pen.pop();
  const queue: [number, number, number][] = [
    [23.3, 30.8, 0.7],
    [24.05, 30.75, 1],
    [24.8, 30.85, 0.7],
    [25.5, 30.75, 0.72],
    [26.3, 30.8, 1],
  ];
  for (const [x, y, s] of queue) person(pen, x, y, 0, randomLook(rng), s < 1 ? rng.pick(["cheer", "stand", "wave"]) : "stand", rng.chance(0.5), s);
  // and two visitors who cannot get the whole front into one picture
  photographer(pen, 16.9, 30.75, 0, randomLook(rng), true);
  photographer(pen, 21.4, 30.2, 0, randomLook(rng), true);
}

// ---------------------------------------------------------------- the terrace

function terraceRow(c: LondonCtx): void {
  const { pen, rng } = c;
  // three Georgian houses down the west side, looking east across the square
  pen.push(5, 44, 0, 270);
  terrace(pen, rng, { n: 3, style: "georgian", w: 4.6, d: 7, floors: 3, lit: 0.6 });
  // blue plaques: somebody wrote something here
  for (const i of [0, 2]) {
    pen.obj(() => {
      const f = pen.wall("y+", i * 4.6, 0, 0, 4.6, 7);
      f.circle(2.3, 4.15, 0.32, C.royal, { outline: true, w: 0.04, layer: 2, seg: 10, grain: 0.2 });
      for (const b of [4.27, 4.15, 4.03]) f.seg(2.14, b, 2.46, b, { w: 0.035, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
    });
  }
  // an old painted sign on the end wall
  pen.obj(() => {
    const e = pen.wall("x-", 0, 0, 0, 4.6, 7);
    e.text("BOOKS", 3.5, 6.5, 0.9, { align: "c", color: C.white, kind: L_MARK, alpha: 0.8, w: 0.12, wobble: 0.5 });
    e.text("MAPS & PRINTS", 3.5, 5.6, 0.42, { align: "c", color: C.white, kind: L_MARK, alpha: 0.75, w: 0.07, wobble: 0.5 });
    e.text("BOUGHT & SOLD", 3.5, 4.9, 0.34, { align: "c", color: C.white, kind: L_MARK, alpha: 0.7, w: 0.06, wobble: 0.5 });
  });
  pen.pop();
  // the window cleaner, half way up his ladder
  pen.obj(() => {
    for (const y of [37.8, 38.2]) {
      pen.stroke(
        [
          [13.3, y, 0],
          [12.08, y, 6.4],
        ],
        { w: 0.08, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    for (let k = 1; k < 11; k++) {
      const t = k / 11;
      pen.stroke(
        [
          [13.3 - 1.22 * t, 37.8, 6.4 * t],
          [13.3 - 1.22 * t, 38.2, 6.4 * t],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    person(pen, 12.62, 38.0, 3.45, lookOf(SKIN[0], HAIR[2], C.white, TROUSERS[0], false, C.blue), "wave", true);
    pen.card(12.62, 38.0, 3.45, true).rect(0.56, 1.76, 0.82, 1.98, C.yellow, { outline: true, w: 0.03, layer: 5, grain: 0.2 });
    pen.cyl(13.45, 38.5, 0, 0.2, 0.34, C.blue, { seg: 7, w: W_FINE });
  });
  // the post, a bicycle against the railings, a cat on a doorstep
  pen.obj(() => {
    person(pen, 13.05, 42.9, 0, lookOf(SKIN[3], HAIR[0], C.red, C.navy), "stand", true);
    pen.card(13.05, 42.9, 0, true).rect(-0.62, 0.7, -0.26, 1.16, C.redDark, { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
  });
  pen.push(13.2, 33.2, 0, 86);
  bike(pen, { color: C.green, crate: true });
  pen.pop();
  pen.obj(() => dogOn(pen.card(12.62, 33.7, 0.3), hex("#8c8c8c"), { s: 0.58, tail: 0.5 }));
}

// ---------------------------------------------------------------- the garden square

function square(c: LondonCtx): void {
  const { pen, rng } = c;
  // railings all round, with gates on the north and west sides
  const runs: V3[][] = [
    [
      [QX0, 36.9, 0],
      [QX0, QY0, 0],
      [20.9, QY0, 0],
    ],
    [
      [22.5, QY0, 0],
      [QX1, QY0, 0],
      [QX1, QY1, 0],
      [QX0, QY1, 0],
      [QX0, 38.3, 0],
    ],
  ];
  for (const r of runs) railing(pen, r, 0.9, C.iron, 1.0);
  hedge(pen, QX0 + 0.45, QY0 + 0.3, 5.2, 0.4, 0.62);
  hedge(pen, 22.75, QY0 + 0.3, 5.2, 0.4, 0.62);
  for (const [x, y] of [
    [20.75, QY0 + 0.2],
    [22.65, QY0 + 0.2],
    [QX0 + 0.2, 36.75],
    [QX0 + 0.2, 38.45],
  ]) {
    lamp(pen, x, y, 0, 3.0);
  }
  fountain(pen, QCX, QCY, 1.5, 1.7);
  // the cafe hut: a green shed with a hatch, fairy lights from its eaves to the nearest lamp
  const hx = 22.6;
  const hy = 33.5;
  pen.obj(() => {
    pen.box(hx, hy, 0, 2.6, 1.8, 2.6, C.ironGreen, { w: 0.1 });
    pen.hip(hx - 0.3, hy - 0.3, 2.6, 3.2, 2.4, 0.95, C.iron);
    const f = pen.wall("y+", hx, hy, 0, 2.6, 1.8);
    f.rect(0.3, 0.95, 1.9, 1.95, C.lamp, { outline: true, w: W_FINE, glow: 0.9, grain: 0.2 });
    f.rect(0.2, 0.78, 2.0, 0.95, C.wood, { outline: true, w: 0.04 });
    f.rect(0.15, 2.05, 2.45, 2.5, C.black, { outline: true, w: 0.04, grain: 0.3 });
    f.text("CAFE", 1.3, 2.13, 0.28, { align: "c", color: C.gold, kind: L_MARK, w: 0.06, wobble: 0.3, layer: 1 });
    pen.wall("x+", hx, hy, 0, 2.6, 1.8).rect(0.45, 0, 1.3, 2.0, C.door, { outline: true, w: W_FINE });
  });
  person(pen, hx + 1.1, hy + 1.86, 0.86, lookOf(SKIN[2], HAIR[1], C.white, C.black), "bust");
  lightString(pen, [hx + 2.6, hy + 1.8, 2.6], [QCX + 1.0, QY0 + 0.2, 3.0], 6, 0.35);
  person(pen, 24.95, 35.8, 0, randomLook(rng), "stand", true);
  person(pen, 25.6, 36.2, 0, randomLook(rng), "stand", true);
  cafeTable(pen, rng, 23.3, 39.25, C.red, 2);
  cafeTable(pen, rng, 25.4, 39.45, C.yellow, 3);
  // plane trees, and a cherry
  tree(pen, rng, 18.1, 34.5, { kind: "round", h: 2.2, r: 1.35 });
  tree(pen, rng, 17.6, 40.8, { kind: "elm", h: 2.8, r: 1.8 });
  tree(pen, rng, 20.3, 40.9, { kind: "blossom" });
  tree(pen, rng, 26.0, 40.95, { kind: "round" });
  // benches round the gravel walk
  bench(pen, 19.6, 33.75, 0);
  person(pen, 19.2, 33.8, 0.42, randomLook(rng), "sit");
  pen.obj(() => {
    // a man feeding a squirrel from his sandwich
    person(pen, 20.0, 33.8, 0.42, lookOf(SKIN[0], HAIR[7], hex("#8a6f52"), TROUSERS[2]), "sit", true);
    pen.card(20.0, 33.8, 0.42, true).rect(0.36, 0.76, 0.6, 0.9, C.cream, { outline: true, w: 0.03, layer: 5, grain: 0 });
  });
  squirrel(pen, 20.75, 34.25);
  squirrel(pen, 25.5, 41.1, 0, true);
  bench(pen, 17.25, 36.0, 270);
  reader(pen, 17.3, 36.0, 0.42, randomLook(rng), false, C.purple);
  bench(pen, 24.6, 41.35, 180);
  person(pen, 24.3, 41.3, 0.42, randomLook(rng), "sit", true);
  // students on the grass with their books, one of them with a guitar instead
  reader(pen, 18.9, 36.3, -0.3, randomLook(rng), false, C.red);
  reader(pen, 20.2, 35.7, -0.3, randomLook(rng), true, C.teal);
  reader(pen, 19.8, 38.75, -0.3, randomLook(rng), true, C.orange);
  reader(pen, 20.6, 39.75, -0.3, randomLook(rng), false, C.white);
  pen.obj(() => {
    person(pen, 19.6, 36.75, -0.3, lookOf(SKIN[1], HAIR[3], C.charcoal, TROUSERS[3], true), "sit");
    const k = pen.card(19.6, 36.75, -0.3);
    k.ellipse(0.2, 0.72, 0.26, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 9 });
    k.bar(0.36, 0.84, 0.82, 1.2, 0.08, C.woodDark, { layer: 5 });
  });
  // a picnic on a rug
  pen.obj(() => {
    const g = pen.floor(0, 4);
    g.rect(17.1, 38.3, 18.6, 39.4, C.red, { outline: true, w: W_FINE, grain: 0.5 });
    for (const a of [17.4, 17.85, 18.3]) g.seg(a, 38.3, a, 39.4, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    for (const b of [38.6, 39.05]) g.seg(17.1, b, 18.6, b, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    pen.box(17.7, 38.75, 0, 0.4, 0.3, 0.26, C.wood, { w: W_FINE });
  });
  person(pen, 17.3, 38.8, -0.3, randomLook(rng), "sit");
  person(pen, 18.4, 39.0, -0.3, randomLook(rng), "sit", true);
  // the phone box by the gate that is now a library: take a book, leave a book
  phoneBox(pen, 19.3, 30.95, 0);
  pen.obj(() => {
    const k = pen.card(18.25, 31.1, 0);
    k.poly(
      [
        [-0.34, 0],
        [0.34, 0],
        [0.24, 0.9],
        [-0.24, 0.9],
      ],
      C.white,
      { outline: true, w: W_FINE, grain: 0.3 },
    );
    k.text("FREE", 0, 0.55, 0.2, { align: "c", w: 0.045, wobble: 0.3, layer: 1 });
    k.text("BOOKS", 0, 0.22, 0.17, { align: "c", w: 0.04, wobble: 0.3, layer: 1 });
  });
  reader(pen, 20.2, 30.9, 0, randomLook(rng), true, C.green);
}

// ---------------------------------------------------------------- St Pancras: the train shed

/** Height of the shed's arch at distance a across its span: a pointed vault that springs from the ground. */
function archH(a: number): number {
  const u = Math.min(1, Math.abs(a / (SW / 2) - 1));
  return SHED_H * Math.pow(1 - Math.pow(u, 1.35), 0.6);
}

/** How far in from the springing the arch has reached height b. */
const archA = (b: number) => (SW / 2) * (1 - Math.pow(1 - Math.pow(b / SHED_H, 1 / 0.6), 1 / 1.35));

function archRing(n = 22): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (SW / 2) * (1 - Math.cos((Math.PI * i) / n));
    pts.push([a, archH(a)]);
  }
  return pts;
}

function shed(c: LondonCtx): void {
  const { pen } = c;
  const ring = archRing();
  pen.obj(() => {
    // one great vault of glass on iron ribs
    const prof: V2[] = [[0, 0], [SW, 0], ...ring.slice(1, -1).reverse()];
    pen.wall("y+", SX0, SY0, 0, SW, 0).extrude(prof, SY1 - SY0, GLASS, { crease: 30, glow: 0.45, grain: 0.5, w: 0.1 });
    const f = pen.wall("y+", SX0, SY0, 0, SW, SY1 - SY0);
    // the open end: dark inside, the name on the beam across it, a fan of glazing above
    f.poly(
      [
        [0.45, 0],
        [SW - 0.45, 0],
        [SW - 0.7, 3.2],
        [SW - 0.9, 3.75],
        [0.9, 3.75],
        [0.7, 3.2],
      ],
      DARK,
      { grain: 0.6 },
    );
    f.poly(
      [
        [0.85, 3.75],
        [SW - 0.85, 3.75],
        [SW - 1.1, 4.45],
        [1.1, 4.45],
      ],
      IRON,
      { outline: true, w: W_FINE, grain: 0.4 },
    );
    f.text("ST PANCRAS", SW / 2, 3.9, 0.4, { align: "c", color: C.white, kind: L_MARK, w: 0.07, wobble: 0.3, layer: 1 });
    for (let a = 1.5; a < SW - 1.2; a += 0.7) f.seg(a, 4.45, a, archH(a) - 0.12, { w: 0.05, color: IRON_D, kind: L_MARK, wobble: 0, alpha: 0.9 });
    for (const b of [5.9, 7.3, 8.5]) f.seg(archA(b) + 0.1, b, SW - archA(b) - 0.1, b, { w: 0.05, color: IRON_D, kind: L_MARK, wobble: 0, alpha: 0.9 });
    f.line(ring, { w: 0.3, color: IRON, kind: L_MARK, wobble: 0.2, layer: 1 });
    // lamps under the beam
    for (let a = 1.6; a < SW - 1; a += 1.15) f.seg(a, 3.5, a + 0.02, 3.5, { kind: L_LIGHT, w: 0.28, wobble: 0, layer: 1 });
  });
  // the ribs, and the purlins that run the length of the roof
  pen.obj(() => {
    const seen = ring.filter((p) => p[0] > 2.2);
    for (let y = SY0; y <= SY1 + 0.01; y += 1.75) {
      pen.stroke(
        seen.map(([a, b]) => [SX0 + a, y, b + 0.03] as V3),
        { w: 0.1, color: IRON_D, kind: L_MARK, wobble: 0.2 },
      );
    }
    for (const a of [3.2, 4.1, 5, 5.9, 6.8, 7.8, 8.8]) {
      pen.stroke(
        [
          [SX0 + a, SY0, archH(a) + 0.03],
          [SX0 + a, SY1, archH(a) + 0.03],
        ],
        { w: 0.06, color: IRON_D, kind: L_MARK, wobble: 0.2, alpha: 0.85 },
      );
    }
  }, 0.2);
  // the platforms come a little way out into the daylight
  const platforms: [number, number, number][] = [
    [SX0 + 0.2, 1.5, 4.2],
    [33.75, 1.5, 4.8],
    [37.75, 1.55, 3.6],
  ];
  for (const [x, w, len] of platforms) {
    pen.obj(() => {
      pen.box(x, SY1, 0, w, len, 0.45, C.stone, { top: C.flag, w: W_THIN });
      const g = pen.floor(0.45, 1);
      for (const e of [x + 0.22, x + w - 0.22]) {
        if (e < 30.5 || e > 38.9) continue;
        g.seg(e, SY1 + 0.1, e, SY1 + len - 0.25, { w: 0.07, color: C.yellowLine, kind: L_MARK, wobble: 0.1 });
      }
    }, 0.05);
  }
}

/** The two tracks: laid as far as the fence goes, then only pencilled in, fainter and fainter. */
function tracks(c: LondonCtx): void {
  const { pen } = c;
  for (const tx of TRACKS) {
    pen.obj(() => {
      for (const s of [-0.55, 0.55]) {
        pen.stroke(
          [
            [tx + s, SY1, 0.05],
            [tx + s, TRACK_END, 0.05],
          ],
          { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2 },
        );
      }
      for (let y = SY1 + 0.4; y < TRACK_END; y += 0.95) {
        pen.stroke(
          [
            [tx - 0.85, y, 0.03],
            [tx + 0.85, y, 0.03],
          ],
          { w: 0.11, color: C.woodDark, kind: L_MARK, wobble: 0, alpha: 0.8 },
        );
      }
    });
    pen.obj(() => {
      for (const s of [-0.55, 0.55]) {
        for (let k = 0; k < 9; k++) {
          const a = TRACK_END + (8.6 * k) / 9;
          const b = TRACK_END + (8.6 * (k + 0.62)) / 9;
          pen.stroke(
            [
              [tx + s, a, 0.04],
              [tx + s, b, 0.04],
            ],
            { w: 0.07, color: C.inkSoft, kind: L_MARK, wobble: 1.4, alpha: 0.85 * (1 - k / 9.5) },
          );
        }
      }
      for (let k = 0; k < 6; k++) {
        const y = TRACK_END + 0.7 + k * 1.25;
        pen.stroke(
          [
            [tx - 0.8, y, 0.03],
            [tx + 0.8, y, 0.03],
          ],
          { w: 0.06, color: C.inkSoft, kind: L_MARK, wobble: 1.2, alpha: 0.6 * (1 - k / 6.5) },
        );
      }
    }, 0.25);
  }
  // fences either side, so nobody strays on to the line
  railing(
    pen,
    [
      [30.6, 23.45, 0],
      [30.6, 35.3, 0],
    ],
    0.85,
    C.iron,
    1.3,
  );
  railing(
    pen,
    [
      [38.35, 22.85, 0],
      [38.35, 35.3, 0],
    ],
    0.85,
    C.iron,
    1.3,
  );
  // the starting signal, between the tracks beyond the platform's end
  pen.obj(() => {
    pen.pole([34.5, 25.4, 0], [34.5, 25.4, 2.3], 0.1, C.iron);
    const k = pen.card(34.5, 25.4, 2.3);
    k.rect(-0.22, 0, 0.22, 0.96, C.black, { outline: true, w: W_FINE, grain: 0.3 });
    for (const b of [0.28, 0.68]) k.circle(0, b, 0.14, C.charcoal, { layer: 1, seg: 8, grain: 0 });
  });
}

// ---------------------------------------------------------------- St Pancras: the hotel and its clock tower

/** A clock face without its hands (they are drawn afresh every frame, so the clock can keep time). */
function dial(f: Plane, a: number, b: number, r: number): void {
  f.circle(a, b, r, C.gold, { outline: true, w: W_FINE, layer: 1, seg: 16, grain: 0.3 });
  f.circle(a, b, r * 0.84, C.white, { layer: 2, seg: 16, grain: 0.2, glow: 0.85 });
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    f.seg(a + Math.sin(t) * r * 0.62, b + Math.cos(t) * r * 0.62, a + Math.sin(t) * r * 0.78, b + Math.cos(t) * r * 0.78, { w: 0.045, wobble: 0, layer: 3 });
  }
}

const DIAL_B = 14.05;
const DIAL_R = 1.2;

function hotel(c: LondonCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.65);
  // the long wing down the east side of the shed: red brick, cream stone, pointed windows on every floor
  pen.obj(() => {
    pen.box(HX, SY0, 0, HW, HD, HH, BRICK, { top: C.charcoal });
    const f = pen.wall("x+", HX, SY0, 0, HW, HD);
    f.rect(0, 0, HD, 0.5, C.stoneDark, { grain: 0.6 });
    for (const b of [3.1, 6.1]) {
      f.rect(0, b, HD, b + 0.26, DRESSING, { grain: 0.4 });
      f.seg(0, b, HD, b, { w: W_FINE });
    }
    f.rect(0, HH - 0.3, HD, HH, DRESSING, { grain: 0.4 });
    f.seg(0, HH - 0.3, HD, HH - 0.3, { w: W_FINE });
    for (let i = 0; i < 5; i++) {
      const a = 0.75 + i * 2.15;
      lancet(f, a, 0.7, a + 1.3, 2.9, true, DRESSING);
      lancet(f, a + 0.1, 3.65, a + 1.2, 5.9, lit(), DRESSING);
      for (const q of [0.08, 0.72]) lancet(f, a + q, 6.6, a + q + 0.5, 7.7, lit(), DRESSING);
    }
    // courses of brick, where there is brick to see
    f.ticks(0.2, 0.6, HD - 0.2, HH - 0.4, {
      n: 70,
      len: 0.55,
      ang: 0,
      jit: 0.015,
      color: BRICK_D,
      w: 0.055,
      inside: (a, b) => {
        const m = (((a - 0.75) % 2.15) + 2.15) % 2.15;
        return m > 1.45 && Math.abs(b - 3.23) > 0.3 && Math.abs(b - 6.23) > 0.3;
      },
    });
  });
  pen.obj(() => {
    // a steep slate roof with a row of dormers looking east, chimneys along the ridge
    pen.gable(HX - 0.15, SY0, HH, HW + 0.3, HD, 2.9, "y", C.slate, { gable: BRICK });
    for (let i = 0; i < 4; i++) {
      const y = SY0 + 1.3 + i * 2.6;
      pen.box(HX + HW - 1.45, y, HH, 1.2, 0.9, 1.35, BRICK, { w: W_THIN });
      pen.gable(HX + HW - 1.5, y - 0.08, HH + 1.35, 1.3, 1.06, 0.7, "x", C.slate, { gable: BRICK, w: W_THIN });
      lancet(pen.wall("x+", HX + HW - 1.45, y, HH, 1.2, 0.9), 0.2, 0.4, 0.7, 1.25, lit(), DRESSING);
    }
    for (const y of [SY0 + 0.6, SY0 + 3.2, SY0 + 5.8, SY0 + 8.4]) {
      pen.box(HX + HW / 2 - 0.35, y, HH + 2.0, 0.7, 0.9, 2.1, BRICK_D, { top: C.charcoal, w: W_THIN });
      for (const q of [0.25, 0.65]) pen.cyl(HX + HW / 2, y + q, HH + 4.1, 0.13, 0.32, C.tile, { seg: 6, w: 0.04 });
    }
    // a lesser tower at the far end
    pen.box(HX + 0.8, SY0 + 0.1, HH, 2.9, 2.3, 3.4, BRICK, { w: W_THIN });
    pen.pyramid(HX + 0.65, SY0 - 0.05, HH + 3.4, 3.2, 2.6, 2.7, C.slate);
    lancet(pen.wall("x+", HX + 0.8, SY0 + 0.1, HH, 2.9, 2.3), 0.7, 1.4, 1.6, 3.0, lit(), DRESSING);
  }, 0.15);

  // the clock tower
  pen.obj(() => {
    pen.box(TX, TY, 0, TS, TS, TH, BRICK);
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, TX, TY, 0, TS, TS);
      f.rect(0, 0, TS, 0.5, C.stoneDark, { grain: 0.6 });
      for (const b of [4.9, 8.5, 12.0, 15.9]) {
        f.rect(0, b, TS, b + 0.28, DRESSING, { grain: 0.4 });
        f.seg(0, b, TS, b, { w: W_FINE });
      }
      for (const a of [0, TS - 0.3]) f.rect(a, 0.5, a + 0.3, 4.9, DRESSING, { grain: 0.4 });
      for (const [b0, b1] of [
        [5.5, 7.9],
        [9.1, 11.5],
      ]) {
        for (const a of [0.75, 2.45]) lancet(f, a, b0, a + 1.0, b1, lit(), DRESSING);
      }
      dial(f, TS / 2, DIAL_B, DIAL_R);
      if (side === "y+") {
        // the way in, and the departures board over it
        f.poly(pointed(1.2, 0, 3.0, 2.9), hex("#4b3a30"), { outline: true, w: W_THIN, layer: 1, grain: 0.6 });
        f.line(pointed(1.05, 0, 3.15, 3.05).slice(1, -1), { w: 0.13, color: DRESSING, kind: L_MARK, wobble: 0.2, layer: 2 });
        f.rect(0.3, 3.15, 3.9, 4.75, C.black, { outline: true, w: W_FINE, layer: 1, grain: 0.2 });
        const lines = ["PARIS 10.24", "LILLE 10.58", "BRUSSELS 11.04"];
        lines.forEach((s, i) => {
          for (const kind of [L_MARK, L_SPARK]) f.text(s, 0.46, 4.36 - i * 0.44, 0.24, { color: C.yellow, kind, w: 0.045, wobble: 0.2, layer: 2 });
        });
      } else lancet(f, 1.4, 0.9, 2.8, 4.1, true, DRESSING);
    }
  }, 0.1);
  pen.obj(() => {
    // a pinnacle on each corner, and the steep roof between them with its gilded finial
    for (const [px, py] of [
      [TX, TY],
      [TX + TS, TY],
      [TX + TS, TY + TS],
      [TX, TY + TS],
    ]) {
      pen.cyl(px, py, TH - 1.4, 0.42, 2.4, DRESSING, { seg: 6, w: W_FINE });
      pen.cone(px, py, TH + 1.0, 0.5, 1.5, C.slate, { seg: 6, w: W_FINE });
    }
    pen.box(TX + 0.25, TY + 0.25, TH, TS - 0.5, TS - 0.5, 0.5, DRESSING, { w: W_THIN });
    pen.pyramid(TX + 0.35, TY + 0.35, TH + 0.5, TS - 0.7, TS - 0.7, 5.6, C.slate);
    const cx = TX + TS / 2;
    const cy = TY + TS / 2;
    pen.pole([cx, cy, TH + 6.1], [cx, cy, TH + 7.3], 0.07, C.gold, { ink: false });
    pen.card(cx, cy, TH + 7.1).circle(0, 0.2, 0.16, C.gold, { outline: true, w: 0.03, seg: 7, grain: 0.2 });
  }, 0.4);
}

// ---------------------------------------------------------------- life round the station

const BRONZE_LOOK: Look = { skin: C.bronze, hair: C.bronze, top: C.bronze, legs: C.bronze, long: false, hat: null };

function stationLife(c: LondonCtx): void {
  const { pen, rng } = c;
  // the station piano: anyone may play, and somebody always is
  pen.obj(() => {
    pen.box(39.6, 24.4, 0, 1.6, 0.55, 1.2, C.teal, { w: W_THIN });
    pen.box(39.65, 24.95, 0.62, 1.5, 0.3, 0.1, C.white, { w: W_FINE });
    const g = pen.floor(0.725, 1);
    for (let a = 39.75; a < 41.1; a += 0.14) g.seg(a, 24.97, a, 25.12, { w: 0.05, wobble: 0, kind: L_MARK, color: C.black });
    pen.box(40.2, 25.4, 0, 0.45, 0.4, 0.42, C.woodDark, { w: W_FINE });
  });
  person(pen, 40.42, 25.62, 0.3, lookOf(SKIN[3], HAIR[0], C.orange, TROUSERS[0]), "sit", true);
  const audience: [number, number, Pose, number][] = [
    [39.25, 23.7, "stand", 1],
    [39.9, 23.2, "stand", 1],
    [40.7, 22.95, "wave", 1],
    [41.5, 23.15, "stand", 1],
    [42.1, 23.7, "stand", 1],
    [41.65, 24.5, "cheer", 0.66],
  ];
  audience.forEach(([x, y, pose, s], i) => {
    if (i === 1) photographer(pen, x, y, 0, randomLook(rng), false);
    else if (i === 3) {
      pen.obj(() => {
        person(pen, x, y, 0, randomLook(rng), pose);
        suitcase(pen.card(x, y, 0), C.blue);
      });
    } else person(pen, x, y, 0, randomLook(rng), pose, x < 40.5, s);
  });
  // a goodbye at the hotel door
  person(pen, 41.75, 21.6, 0, randomLook(rng), "wave", true);
  pen.obj(() => {
    person(pen, 42.2, 21.75, 0, randomLook(rng), "stand");
    suitcase(pen.card(42.2, 21.75, 0, true), C.red);
  });
  // a flower stall
  pen.push(38.9, 28.6, 0);
  stall(pen, rng, { w: 3.0, d: 1.9, sign: "FLOWERS", a: C.pink, goods: [C.red, C.pink, C.yellow, C.purple, C.white, C.orange] });
  pen.pop();
  person(pen, 39.9, 31.4, 0, randomLook(rng), "stand");
  pen.obj(() => {
    person(pen, 41.0, 31.5, 0, randomLook(rng), "wave", true);
    const k = pen.card(41.0, 31.5, 0, true);
    for (const [a, b, col] of [
      [0.56, 2.0, C.red],
      [0.7, 2.08, C.yellow],
      [0.64, 1.9, C.pink],
    ] as const) {
      k.circle(a, b, 0.11, col, { layer: 6, seg: 6, grain: 0 });
    }
  });
  // somebody with a long wait, asleep on a bench with her rucksack
  bench(pen, 40.3, 33.7, 0);
  pen.obj(() => {
    person(pen, 40.1, 33.75, 0.42, lookOf(SKIN[1], HAIR[4], C.green, TROUSERS[3], true, C.purple), "sit");
    pen.card(40.1, 33.75, 0.42).rect(0.5, 0.4, 0.95, 1.05, C.orange, { outline: true, w: W_FINE, layer: 1, grain: 0.3 });
  });
  lamp(pen, 38.85, 26.6);
  lamp(pen, 38.85, 34.3);
  // on the platforms: waiting, and the dispatcher with her bat
  person(pen, 30.4, 20.4, 0.45, randomLook(rng), "stand");
  pen.obj(() => {
    person(pen, 30.5, 21.7, 0.45, randomLook(rng), "stand", true);
    suitcase(pen.card(30.5, 21.7, 0.45), C.yellow);
  });
  person(pen, 34.4, 20.7, 0.45, randomLook(rng), "stand");
  pen.obj(() => {
    person(pen, 34.5, 23.1, 0.45, hiVis(rng), "wave");
    const k = pen.card(34.5, 23.1, 0.45);
    k.circle(0.66, 2.02, 0.2, C.white, { outline: true, w: W_FINE, layer: 6, seg: 8, grain: 0 });
  });
  person(pen, 38.45, 20.3, 0.45, randomLook(rng), "stand");
  person(pen, 38.6, 21.5, 0.45, randomLook(rng), "wave", true);
  // west of the tracks: the bronze couple who are always meeting, a way down to the Underground, children at the fence
  pen.obj(() => {
    pen.box(27.95, 20.6, 0, 1.1, 1.1, 0.7, STONE_D, { w: W_THIN });
    person(pen, 28.35, 21.15, 0.7, BRONZE_LOOK, "stand", false, 1.2);
    person(pen, 28.68, 21.15, 0.7, BRONZE_LOOK, "stand", true, 1.2);
  });
  photographer(pen, 28.4, 22.7, 0, randomLook(rng), true);
  tubeEntrance(pen, 28.9, 24.2, 90);
  person(pen, 28.9, 26.2, 0, randomLook(rng), "bust");
  person(pen, 30.25, 32.0, 0, randomLook(rng), "cheer", false, 0.68);
  person(pen, 30.2, 33.0, 0, randomLook(rng), "stand");
  tree(pen, rng, 28.75, 32.4, { kind: "round", h: 2.0, r: 1.15 });
  tree(pen, rng, 28.75, 39.2, { kind: "blossom", h: 2.0, r: 1.15 });
  // where the track runs out: a man with a camera on a tripod, and a child on her father's shoulders
  pen.obj(() => {
    for (const [dx, dy] of [
      [-0.3, -0.18],
      [0.3, -0.18],
      [0, 0.32],
    ]) {
      pen.stroke(
        [
          [30.9 + dx, 37.9 + dy, 0],
          [30.9, 37.9, 1.4],
        ],
        { w: 0.06, kind: L_BAR, wobble: 0 },
      );
    }
    pen.box(30.72, 37.75, 1.4, 0.36, 0.3, 0.26, C.black, { w: W_FINE });
    person(pen, 30.35, 38.35, 0, lookOf(SKIN[0], HAIR[7], hex("#6f8f4e"), TROUSERS[2], false, hex("#8a6f52")), "stand");
  });
  pen.obj(() => {
    person(pen, 38.75, 36.5, 0, randomLook(rng), "stand", true);
    person(pen, 38.75, 36.5, 1.55, randomLook(rng), "cheer", false, 0.6);
  });
  // the taxi rank: a cab with its light on, the cabbie helping with the cases, the next fares waiting by the sign
  pen.push(RANK_X, 40.0, 0, 90);
  cab(pen);
  pen.pop();
  pen.obj(() => {
    pen.pole([41.8, 36.0, 0], [41.8, 36.0, 2.7], 0.1, C.iron);
    const k = pen.card(41.8, 36.0, 2.1);
    k.rect(-0.55, 0, 0.55, 0.62, C.yellow, { outline: true, w: W_FINE, grain: 0.2, glow: 0.7, kind: F_NEON });
    k.text("TAXI", 0, 0.17, 0.26, { align: "c", w: 0.055, wobble: 0.2, layer: 1 });
  });
  pen.obj(() => {
    person(pen, 41.7, 39.4, 0, lookOf(SKIN[0], HAIR[7], C.charcoal, TROUSERS[1], false, C.charcoal), "wave", true);
    suitcase(pen.card(41.7, 39.4, 0), C.purple);
  });
  person(pen, 41.75, 38.3, 0, randomLook(rng), "stand");
  pen.obj(() => {
    person(pen, 41.7, 37.0, 0, randomLook(rng), "stand", true);
    suitcase(pen.card(41.7, 37.0, 0, true), C.teal);
  });
  // and somebody drawing the station, which is one way of getting it on to paper
  pen.obj(() => {
    for (const [dx, dy] of [
      [-0.32, 0.1],
      [0.32, 0.1],
      [0, -0.4],
    ]) {
      pen.stroke(
        [
          [30.25 + dx, 40.5 + dy, 0],
          [30.25, 40.5, 1.5],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    const k = pen.card(30.25, 40.5, 0.9);
    k.rect(-0.5, 0, 0.5, 1.15, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    k.line(
      [
        [-0.3, 0.15],
        [-0.3, 0.75],
        [-0.12, 1.0],
        [0.06, 0.75],
        [0.06, 0.15],
      ],
      { w: 0.035, color: C.inkSoft, kind: L_MARK, wobble: 0.6, layer: 1 },
    );
    k.arc(0.2, 0.15, 0.22, 0.42, 0, Math.PI, { w: 0.035, color: C.inkSoft, kind: L_MARK, wobble: 0.6, layer: 1 });
    person(pen, 30.8, 41.25, 0, lookOf(SKIN[1], HAIR[5], C.teal, TROUSERS[5], true, C.cream), "wave", true);
  });
}

// ---------------------------------------------------------------- the trains

const T_YEL = hex("#f4c430");
const T_WHITE = hex("#f1f0ea");
const T_ROOF = hex("#cfd5da");
const T_NAVY = hex("#253a66");

/** A power car: a long yellow nose on a white body. It points along local +x, centred on the origin. */
function noseCar(pen: Pen): void {
  pen.box(-2.0, -0.8, 0, 1.1, 1.6, 0.4, C.charcoal, { edges: false });
  pen.box(1.0, -0.8, 0, 1.1, 1.6, 0.4, C.charcoal, { edges: false });
  // the side view, pulled across the width of the car: the whole of it is nose-yellow to begin with
  pen.wall("y+", -2.5, -1, 0, 5, 0).extrude(
    [
      [0, 0.38],
      [4.5, 0.38],
      [5.0, 0.8],
      [4.95, 1.3],
      [4.25, 2.2],
      [3.4, 2.72],
      [0, 2.76],
    ],
    2,
    T_YEL,
    { crease: 20, w: 0.1 },
  );
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, -2.5, -1, 0, 5, 2);
    // a: distance along the wall as the camera sees it, for a place xv along the car
    const at = (xv: number) => (side === "y+" ? xv + 2.5 : 2.5 - xv);
    const quad = (pts: V2[]) => pts.map(([xv, b]) => [at(xv), b] as V2);
    f.poly(
      quad([
        [-2.5, 0.38],
        [0.95, 0.38],
        [0.5, 2.75],
        [-2.5, 2.76],
      ]),
      T_WHITE,
      { grain: 0.5 },
    );
    f.poly(
      quad([
        [-2.5, 1.5],
        [0.78, 1.5],
        [0.63, 2.25],
        [-2.5, 2.25],
      ]),
      T_NAVY,
      { layer: 1, grain: 0.4 },
    );
    for (const xv of [-2.2, -1.3, -0.4]) {
      f.poly(
        quad([
          [xv, 1.62],
          [xv + 0.7, 1.62],
          [xv + 0.7, 2.14],
          [xv, 2.14],
        ]),
        C.glass,
        { layer: 2, glow: 0.9, grain: 0.4 },
      );
    }
    f.poly(
      quad([
        [1.05, 1.72],
        [1.75, 1.72],
        [1.42, 2.3],
        [1.08, 2.42],
      ]),
      C.glass,
      { layer: 1, glow: 0.6, grain: 0.4, outline: true, w: 0.04 },
    );
    f.line(quad([[-2.5, 1.05], [0.7, 1.05], [2.2, 0.72]]), { w: 0.09, color: C.blue, kind: L_MARK, wobble: 0.2, layer: 1 });
  }
  pen.floor(2.77, 1).rect(-2.45, -0.92, 0.82, 0.92, T_ROOF, { grain: 0.5 });
  // the windscreen, on the slope of the nose, and the lamps below it
  pen.fill(
    [
      [2.38, -0.72, 1.4],
      [2.38, 0.72, 1.4],
      [1.83, 0.72, 2.1],
      [1.83, -0.72, 2.1],
    ],
    C.glass,
    { layer: 1, glow: 0.5, outline: true, w: 0.05, grain: 0.4 },
  );
  for (const y of [-0.75, 0.4]) {
    pen.fill(
      [
        [2.49, y, 0.9],
        [2.49, y + 0.35, 0.9],
        [2.47, y + 0.35, 1.12],
        [2.47, y, 1.12],
      ],
      C.lamp,
      { layer: 1, glow: 1, outline: true, w: 0.03, grain: 0.2 },
    );
  }
  pen.wall("x-", -2.5, -1, 0, 5, 2).rect(0.55, 0.5, 1.45, 2.4, DARK, { outline: true, w: 0.04, grain: 0.5 });
}

/** A coach: windows in a navy band, a yellow door at each end. */
function coach(pen: Pen): void {
  pen.box(-2.0, -0.8, 0, 1.1, 1.6, 0.4, C.charcoal, { edges: false });
  pen.box(0.9, -0.8, 0, 1.1, 1.6, 0.4, C.charcoal, { edges: false });
  pen.box(-2.5, -1, 0.38, 5, 2, 2.38, T_WHITE, { top: T_ROOF, w: 0.1 });
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, -2.5, -1, 0.38, 5, 2);
    f.rect(0, 1.12, 5, 1.87, T_NAVY, { grain: 0.4 });
    for (let i = 0; i < 5; i++) f.rect(0.95 + i * 0.66, 1.24, 1.47 + i * 0.66, 1.76, C.glass, { layer: 1, glow: 0.9, grain: 0.4 });
    for (const a of [0.15, 4.25]) f.rect(a, 0.1, a + 0.6, 2.0, T_YEL, { layer: 1, outline: true, w: 0.04, grain: 0.4 });
    f.seg(0.85, 0.68, 4.15, 0.68, { w: 0.09, color: C.blue, kind: L_MARK, wobble: 0.2 });
  }
  for (const side of ["x+", "x-"] as const) pen.wall(side, -2.5, -1, 0.38, 5, 2).rect(0.55, 0.1, 1.45, 2.0, DARK, { outline: true, w: 0.04, grain: 0.5 });
}

/** How far apart the cars of a train are, where a train stands with its nose out of the shed, and how it gets away. */
const CAR_GAP = 5.2;
const STAND = 18.7;
const ACC = 1.1;
const T_OUT = 7.8;
const T_IN = 10.5;
const TRAIN_PERIOD = 24;

function trains(c: LondonCtx): void {
  const born = c.done;
  const cars: [Sprite, number][] = [
    [makeSprite(noseCar, 90, 501), 0],
    [makeSprite(coach, 90, 502), -CAR_GAP],
    [makeSprite(noseCar, 270, 503), -2 * CAR_GAP],
  ];
  // On the tour a train starts to pull out a moment before the camera gets here.
  const start = (): number => {
    const at = c.visit();
    return at == null ? born + 3 : at - 1.0;
  };
  const cycle = (t: number): [number, number] => {
    const tt = t - start();
    const n = Math.floor(tt / TRAIN_PERIOD);
    return [n, tt - n * TRAIN_PERIOD];
  };
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 34.5, c.oy + 28, 1, 26)) return;
    const [n, p] = cycle(m.t);
    const even = ((n % 2) + 2) % 2 === 0;
    const show = (track: number, lead: number) => {
      for (const [s, off] of cars) {
        const y = lead + off;
        // past the end of the laid track a car comes apart into pencil lines, then nothing
        const prog = 1.05 * clamp((FADE1 - y) / (FADE1 - FADE0), 0, 1);
        if (prog <= 0.002) continue;
        m.put(s, c.ox + TRACKS[track], c.oy + y, c.oz + 0.04, prog >= 1.049 ? born : Math.max(born, m.t - prog));
      }
    };
    // the train that was standing here eases out, and a little later another comes in on the other track
    if (p < T_OUT) show(even ? 0 : 1, STAND + 0.5 * ACC * p * p);
    const q = p - T_IN;
    if (q >= 0) show(even ? 1 : 0, STAND + 0.5 * ACC * Math.pow(Math.max(0, T_OUT - q), 2));
  });
  // the signal: green while a train is leaving, red the rest of the time
  const lampOf = (rgb: RGB) => makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.15, rgb, { glow: 1, kind: F_NEON, seg: 8, grain: 0, layer: 2, outline: true, w: 0.03 }), 0, 61);
  const green = lampOf(hex("#49d27f"));
  const red = lampOf(C.red);
  c.movers.push((m) => {
    if (m.t < born) return;
    const go = cycle(m.t)[1] < T_OUT - 1;
    m.put(go ? green : red, c.ox + 34.5, c.oy + 25.4, c.oz + 2.3 + (go ? 0.68 : 0.28), born);
  });
}

// ---------------------------------------------------------------- everything else that moves

function motion(c: LondonCtx, tClock: number): void {
  const { rng } = c;
  const born = c.done;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const loop = (pts: V2[], r = 0.4) =>
    new Route(
      rounded(
        pts.map(([x, y]) => W(x, y)),
        true,
        r,
      ),
      true,
    );

  // ---- the tower clock keeps time: a minute of its day for every second of the film
  c.movers.push((m) => {
    if (m.t < tClock || !m.sees(c.ox + TX + TS / 2, c.oy + TY + TS / 2, DIAL_B, 10)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => tClock;
    dp.rng = new Rng(1868);
    const minutes = 10 * 60 + 10 + m.t;
    const hm = ((minutes % 60) / 60) * Math.PI * 2;
    const hh = ((minutes % 720) / 720) * Math.PI * 2;
    dp.push(c.ox, c.oy, c.oz);
    for (const side of ["y+", "x+"] as const) {
      const f = dp.wall(side, TX, TY, 0, TS, TS);
      const a = TS / 2;
      f.seg(a, DIAL_B, a + Math.sin(hm) * DIAL_R * 0.66, DIAL_B + Math.cos(hm) * DIAL_R * 0.66, { w: 0.08, wobble: 0, layer: 4 });
      f.seg(a, DIAL_B, a + Math.sin(hh) * DIAL_R * 0.44, DIAL_B + Math.cos(hh) * DIAL_R * 0.44, { w: 0.11, wobble: 0, layer: 4 });
    }
    dp.pop();
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the school party: a teacher, five pairs of children with their rucksacks, and a helper to count them
  // Up the lane from the south, along the street, in at the gate as far as the steps, and back the same way.
  const crocodile = loop(
    [
      [13.6, 43.2],
      [13.6, 29.3],
      [15.4, 29.3],
      [15.4, 23.5],
      [16.6, 23.5],
      [16.6, 30.0],
      [14.4, 30.0],
      [14.4, 43.2],
    ],
    0.35,
  );
  const kr = new Rng(2024);
  const bags = [C.red, C.blue, C.purple, C.orange, C.teal, C.pink];
  const members: { fr: Frames; back: number; side: number; ph: number; delay: number }[] = [];
  const teacher = castWalker(lookOf(SKIN[1], HAIR[2], C.hivis, TROUSERS[0], true), 311, 1.001).frames;
  members.push({ fr: teacher, back: 0, side: 0, ph: 0, delay: 0 });
  for (let i = 0; i < 10; i++) {
    const lk = hiVis(kr);
    const bag = bags[i % bags.length];
    const fr = walkFrames((p, pose, flip) => {
      person(p, 0, 0, 0, lk, pose, flip, 0.68);
      p.card(0, 0, 0, flip).rect(-0.36, 0.52, -0.2, 0.92, bag, { outline: true, w: 0.03, layer: 0.5, grain: 0.3 });
    }, 320 + i);
    members.push({ fr, back: 1.15 + Math.floor(i / 2) * 0.82, side: i % 2 === 0 ? -0.27 : 0.27, ph: kr.range(0, 6), delay: 0.1 + i * 0.05 });
  }
  const helper = castWalker(lookOf(SKIN[4], HAIR[6], C.hivis, TROUSERS[1]), 341, 1.001).frames;
  members.push({ fr: helper, back: 5.5, side: 0, ph: 2, delay: 0.6 });
  const P: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born) return;
    for (const k of members) {
      const s = 1.3 * m.t - k.back;
      crocodile.pos(s, P);
      const h = crocodile.heading(s, 0.8);
      const x = P[0] - Math.sin(h) * k.side;
      const y = P[1] + Math.cos(h) * k.side;
      if (!m.sees(x, y, c.oz)) continue;
      m.put(k.fr[facing(h)][Math.floor(m.t * 2.9 + k.ph) & 1], x, y, c.oz, born + k.delay);
    }
  });

  // ---- round the square: a woman with two dogs on leads one way, a runner the other
  const ring = loop(
    [
      [16.45, 32.95],
      [26.95, 32.95],
      [26.95, 42.15],
      [16.45, 42.15],
    ],
    0.7,
  );
  const dogFrames = (rgb: RGB, s: number, corgi: boolean, seed: number): Frames => {
    const mk = (flip: boolean, step: number) => makeSprite((p) => dogOn(p.card(0, 0, 0, flip), rgb, { s, corgi, step }), 0, seed);
    return [
      [mk(false, 0), mk(false, 1)],
      [mk(true, 0), mk(true, 1)],
    ];
  };
  const owner = castWalker(lookOf(SKIN[0], HAIR[5], C.purple, TROUSERS[3], true), 351, 1.001).frames;
  const dogs = [
    { fr: dogFrames(hex("#b98352"), 0.95, false, 361), ahead: 1.15, side: 0.22 },
    { fr: dogFrames(hex("#f1ede4"), 0.7, false, 362), ahead: 0.8, side: -0.3 },
  ];
  const Q: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born + 0.3) return;
    const s = 1.25 * m.t + 9;
    ring.pos(s, P);
    if (!m.sees(P[0], P[1], P[2], 6)) return;
    const h = ring.heading(s, 0.8);
    m.put(owner[facing(h)][Math.floor(m.t * 2.6) & 1], P[0], P[1], P[2], born + 0.3);
    for (const d of dogs) {
      ring.pos(s + d.ahead, Q);
      const hd = ring.heading(s + d.ahead, 0.6);
      const x = Q[0] - Math.sin(hd) * d.side;
      const y = Q[1] + Math.cos(hd) * d.side;
      m.put(d.fr[facing(hd)][Math.floor(m.t * 5) & 1], x, y, Q[2], born + 0.3);
      // the lead
      m.pen.stroke(
        [
          [P[0], P[1], P[2] + 0.95],
          [x, y, Q[2] + 0.42],
        ],
        { w: 0.035, color: C.red, kind: L_BAR, wobble: 0 },
      );
    }
  });
  const runner = castWalker(lookOf(SKIN[2], HAIR[0], C.pink, C.black), 371, 1.001);
  const back = new Route(ring.pts.slice(0, -1).reverse(), true);
  c.movers.push(walker(back, rng, born + 0.5, 3.1, runner));
  for (let i = 0; i < 2; i++) c.movers.push(walker(i === 0 ? ring : back, rng, born + rng.range(0, 1)));

  // ---- a small boy and a corgi chasing each other round a plane tree
  const chase: V2[] = [];
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2;
    chase.push([17.6 + Math.cos(t) * 1.35, 40.8 + Math.sin(t) * 1.05]);
  }
  const round = loop(chase, 0);
  const boyLook = randomLook(new Rng(77));
  const boy = walkFrames((p, pose, flip) => person(p, 0, 0, 0, boyLook, pose === "walkB" ? "cheer" : pose, flip, 0.62), 381);
  c.movers.push(stroll(round, boy, 2.4, 0, born + 0.4, 4));
  const corgi = dogFrames(hex("#e0994d"), 0.8, true, 382);
  c.movers.push(traveler(round, { speed: 2.4, at: 0.5, born: born + 0.4, span: 0.6, sprite: (h, t) => corgi[facing(h)][Math.floor(t * 6) & 1] }));

  // ---- travellers wheeling their cases between the hotel door and the street
  const concourse = loop(
    [
      [42.7, 21.7],
      [42.7, 43.4],
      [43.4, 43.4],
      [43.4, 21.7],
    ],
    0.3,
  );
  const cases = [C.red, C.navy, C.yellow, C.green, C.orange];
  for (let i = 0; i < 5; i++) {
    const lk = randomLook(kr);
    const col = cases[i];
    const fr = walkFrames((p, pose, flip) => {
      person(p, 0, 0, 0, lk, pose, flip);
      suitcase(p.card(0, 0, 0, flip), col);
    }, 390 + i);
    c.movers.push(stroll(concourse, fr, kr.range(1.2, 1.6), (i + kr.range(-0.2, 0.2)) / 5, born + kr.range(0, 1)));
  }

  // ---- people passing: along the museum railings, and down the path beside the line
  const street = loop(
    [
      [5.6, 28.6],
      [21.4, 28.6],
      [21.4, 29.2],
      [5.6, 29.2],
    ],
    0.25,
  );
  for (let i = 0; i < 6; i++) c.movers.push(walker(street, rng, born + rng.range(0, 1)));
  const path = loop(
    [
      [29.25, 29.8],
      [29.25, 43.4],
      [29.8, 43.4],
      [29.8, 29.8],
    ],
    0.25,
  );
  for (let i = 0; i < 4; i++) c.movers.push(walker(path, rng, born + rng.range(0, 1)));

  // ---- notes drifting up from the piano
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
  const np = W(40.4, 24.7, 2.0);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(np[0], np[1], np[2], 8)) return;
    for (let i = 0; i < 4; i++) {
      const u = (m.t / 3.4 + i / 4) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      // each note sketches itself in, then runs its reveal backwards to fade out as it rises
      const p = Math.min(u * 3.4, ((1 - u) / 0.3) * 1.05);
      m.put(note, np[0] + sx + i * 0.22, np[1] - sx - i * 0.18, np[2] + u * 3.0, m.t - p);
    }
  });
}

// ---------------------------------------------------------------- the block

export const bloomsbury: LondonBuilder = (c) => {
  const { pen } = c;
  c.early(() => ground(c));
  c.focus(24, 23.2, 1.06);

  museum(c);
  forecourt(c);
  terraceRow(c);
  square(c);
  shed(c);
  tracks(c);
  // when the tower's clock faces have been drawn, so the hands can follow them in
  const tClock = pen.reveal(c.ox + TX + TS / 2, c.oy + TY + TS / 2, 0) + 1.3;
  hotel(c);
  stationLife(c);

  trains(c);
  motion(c, tClock);
};
