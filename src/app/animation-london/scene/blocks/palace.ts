// Buckingham Palace, at the top of the Mall. The long stone front fills the
// back of the block behind its gravel forecourt and black-and-gold railings;
// the Victoria Memorial stands in a ring of red tarmac before the gates, the
// Mall runs away east between rows of Union flags, and St James's Park has
// the corner by the street, with its lake, its pelicans and its deckchairs.
// It is eleven o'clock: a band is marching the new guard in through the
// gates, the crowd at the railings has its phones up, two troopers are
// exercising their horses. And down at the zebra crossing a policeman has
// stopped the traffic for a duck and her six ducklings, which is where the
// camera ends up.

import { RGB, Rng, V2, V3, clamp, hex, scaleRGB, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN, UK_RED } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  archWindow,
  belisha,
  bobby,
  duckOn,
  flag,
  flowerBed,
  guardsman,
  handFlag,
  hat,
  hedge,
  horse,
  lamp,
  person,
  phoneBox,
  railing,
  randomLook,
  snapper,
  speckle,
  squirrel,
  stall,
  tree,
  tufts,
  umbrella,
  windowAt,
} from "../props";

/**
 * The zebra crossing over the street south of the block: its west edge (move
 * this and everything about the crossing moves with it), its east edge, the
 * two kerbs, and the line the ducks take across.
 */
const ZX0 = 24;
const ZX1 = ZX0 + 3;
const KERB = 48;
const FARKERB = 58;
const DUCK_X = ZX0 + 1.3;

/** The crossing is where the film ends: local x and y of its middle, and how far the camera pushes in. */
export const palaceSpot: [number, number, number] = [(ZX0 + ZX1) / 2, 52.5, 2.7];

const STONE = C.portland;
const STONE_D = C.portlandDark;
const STONE_L = C.portlandLight;
const JOINT = scaleRGB(C.portlandDark, 0.88);
const BALUSTER = scaleRGB(C.portlandDark, 0.76);
const LEAD = hex("#8f97a3");
const MARBLE = hex("#fbfaf5");
const MARBLE_D = hex("#e2ddd0");
const GILT_D = hex("#c2952c");
const DOORWAY = hex("#4b4038");
const COAT = hex("#2e2a2b");
const DECK_GREEN = hex("#4f9a63");

// The palace: its back wall is at y = PY0, the front of its wings at FRONT; twenty-three bays long.
const PX0 = 6;
const PX1 = 42;
const PY0 = 5;
const PD = 7.5;
const FRONT = PY0 + PD;
/** Height of the wings up to the balustrade, and of the three pavilions with their attics. */
const PH = 9.4;
const ATTIC = 10.3;
const BAY = (PX1 - PX0) / 23;
/** How far the middle pavilion stands forward of the wings. */
const CENTRE_OUT = 0.9;
/** The railings, and the opening of the centre gates in them. */
const RAIL_Y = 20;
const GATE0 = 21.9;
const GATE1 = 26.1;
/** The Victoria Memorial, and the ring of road round it. */
const MEM: V2 = [24, 29.5];
const RING_IN = 5.2;
const RING_OUT = 8;
/** The Mall: its two kerbs. */
const MALL0 = 27.4;
const MALL1 = 31.6;
/** The lake in the park. */
const LAKE: V2 = [11.4, 38.3];
const LAKE_A = 5.2;
const LAKE_B = 3.1;
/** The ride where the troopers exercise: the middle of the oval, half its straight, the radius of its ends. */
const RIDE: V2 = [36.3, 38.7];
const RIDE_L = 3.6;
const RIDE_R = 2.8;

const STONE_LOOK: Look = { skin: MARBLE, hair: MARBLE_D, top: MARBLE, legs: MARBLE_D, long: false, hat: null };
const GILT_LOOK: Look = { skin: C.gold, hair: GILT_D, top: C.gold, legs: C.gold, long: true, hat: null };
const BRONZE_LOOK: Look = { skin: C.bronze, hair: C.bronze, top: C.bronze, legs: C.bronze, long: false, hat: null };

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

/** Places for a crowd to stand: up to n points in a rectangle, no two closer than gap. */
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

const inLake = (x: number, y: number, pad = 0) => Math.pow((x - LAKE[0]) / (LAKE_A * 1.12 + pad), 2) + Math.pow((y - LAKE[1]) / (LAKE_B * 1.12 + pad), 2) < 1;
const onRing = (x: number, y: number, pad = 0) => Math.hypot(x - MEM[0], y - MEM[1]) < RING_OUT + pad;

/** The outline of a running track: two straights joined by half circles. */
function oval(cx: number, cy: number, half: number, r: number, n = 9): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push([cx + half + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  for (let i = 0; i <= n; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / n;
    pts.push([cx - half + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

function lakeShape(): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * t + 0.6) + 0.05 * Math.sin(5 * t + 1.9);
    pts.push([LAKE[0] + Math.cos(t) * LAKE_A * k, LAKE[1] + Math.sin(t) * LAKE_B * k]);
  }
  return pts;
}

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  const g2 = pen.floor(0, 2);
  const g3 = pen.floor(0, 3);
  const g4 = pen.floor(0, 4);
  // the forecourt's gravel, the paved apron outside the railings with the avenue down to the crossing, two lawns
  g1.rect(4.6, 4.6, 43.4, RAIL_Y, C.gravel, { grain: 0.9 });
  g1.poly(
    [
      [4.6, RAIL_Y],
      [43.4, RAIL_Y],
      [43.4, 33.4],
      [28.8, 33.4],
      [28.8, 43.6],
      [21.6, 43.6],
      [21.6, 30.6],
      [4.6, 30.6],
    ],
    C.plaza,
    { grain: 0.8 },
  );
  g1.rect(4.6, 30.6, 21.6, 43.6, C.grass);
  g1.rect(28.8, 33.4, 43.4, 43.6, C.grass);
  // the ring of red tarmac round the memorial, the Mall leading out of it, and the memorial's own island
  g2.circle(MEM[0], MEM[1], RING_OUT, C.mallRed, { seg: 44, grain: 0.9 });
  g2.rect(MEM[0] + 7.6, MALL0, 43.9, MALL1, C.mallRed, { grain: 0.9 });
  g3.circle(MEM[0], MEM[1], RING_IN, STONE_L, { seg: 36, grain: 0.6 });
  const gap = Math.asin((MALL1 - MALL0) / 2 / RING_OUT);
  g4.arc(MEM[0], MEM[1], RING_OUT, RING_OUT, gap, Math.PI * 2 - gap, { w: 0.07, seg: 44 });
  g4.circle(MEM[0], MEM[1], RING_IN, null, { w: 0.07, seg: 36 });
  const mouth = MEM[0] + RING_OUT * Math.cos(gap);
  g4.seg(mouth, MALL0, 43.9, MALL0, { w: 0.07 });
  g4.seg(mouth, MALL1, 43.9, MALL1, { w: 0.07 });
  speckle(g4, mouth, MALL0 + 0.2, 43.7, MALL1 - 0.2, scaleRGB(C.mallRed, 0.86), 0.5);
  speckle(g4, MEM[0] - RING_OUT, MEM[1] - RING_OUT, MEM[0] + RING_OUT, MEM[1] + RING_OUT, scaleRGB(C.mallRed, 0.86), 0.45, (a, b) => {
    const d = Math.hypot(a - MEM[0], b - MEM[1]);
    return d > RING_IN + 0.3 && d < RING_OUT - 0.3;
  });
  speckle(g2, 4.8, FRONT + 1.2, 43.2, RAIL_Y - 0.2, scaleRGB(C.gravel, 0.84), 0.5);
  speckle(g2, 4.8, RAIL_Y + 0.3, 43.2, 33.2, C.streetDark, 0.22, (a, b) => !onRing(a, b, 0.3) && !(b > 30.4 && a < 21.8) && !(b > MALL0 - 0.3 && a > 31));
  speckle(g2, 21.9, 37.8, 28.6, 43.4, C.streetDark, 0.22);

  // St James's Park: the lake, a worn path from it to the avenue, and grass
  g2.poly(lakeShape(), C.water, { kind: F_WATER, outline: true, ink: C.waterInk, w: 0.1 });
  g3.ticks(LAKE[0] - LAKE_A, LAKE[1] - LAKE_B, LAKE[0] + LAKE_A, LAKE[1] + LAKE_B, {
    n: 30,
    len: 1.1,
    ang: -Math.PI / 4,
    jit: 0.08,
    bend: 0.22,
    color: C.waterInk,
    w: 0.07,
    kind: L_RIPPLE,
    alpha: 0.75,
    inside: (a, b) => inLake(a, b, -0.75),
  });
  g2.poly(
    [
      [16.7, 39.3],
      [19.4, 40.2],
      [21.6, 41.3],
      [21.6, 42.5],
      [19.1, 41.3],
      [16.5, 40.4],
    ],
    C.path,
    { outline: true, w: 0.05, ink: C.streetDark },
  );
  tufts(g2, 4.8, 30.9, 21.4, 43.4, 0.4, (a, b) => !inLake(a, b, 0.35) && !onRing(a, b, 0.3) && !(a > 16 && b > 38.8 && b < 42.8));
  // the ride: an oval of sand in its own lawn
  g2.poly(oval(RIDE[0], RIDE[1], RIDE_L, RIDE_R + 0.75), C.sand, { outline: true, w: 0.06 });
  g3.poly(oval(RIDE[0], RIDE[1], RIDE_L, RIDE_R - 0.75), C.grass, { outline: true, w: 0.06 });
  speckle(g4, RIDE[0] - RIDE_L - RIDE_R - 0.7, RIDE[1] - RIDE_R - 0.7, RIDE[0] + RIDE_L + RIDE_R + 0.7, RIDE[1] + RIDE_R + 0.7, C.woodDark, 0.5, (a, b) => {
    const dx = Math.max(0, Math.abs(a - RIDE[0]) - RIDE_L);
    const d = Math.hypot(dx, b - RIDE[1]);
    return Math.abs(d - RIDE_R) < 0.6;
  });
  tufts(g2, 29, 33.6, 43.2, 43.4, 0.35, (a, b) => {
    const dx = Math.max(0, Math.abs(a - RIDE[0]) - RIDE_L);
    const d = Math.hypot(dx, b - RIDE[1]);
    return Math.abs(d - RIDE_R) > 0.95 && !onRing(a, b, 0.3);
  });
}

/** The zebra crossing, painted over the street's own markings: stripes, give-way lines, zig-zags and a word to pedestrians at each kerb. */
function crossing(c: LondonCtx): void {
  const { pen } = c;
  c.early(() => {
    pen.begin();
    // (these sit several layers up so that the street's centre line and yellow lines do not show through)
    const cover = pen.floor(0, 7);
    cover.rect(ZX0 - 0.35, KERB + 0.03, ZX1 + 0.35, FARKERB - 0.03, C.tarmac, { grain: 0.9 });
    const g = pen.floor(0, 8);
    const y0 = KERB + 1.45;
    const y1 = FARKERB - 1.45;
    const n = 7;
    const step = (y1 - y0) / n;
    for (let k = 0; k < n; k += 2) g.rect(ZX0, y0 + k * step + 0.06, ZX1, y0 + (k + 1) * step - 0.06, C.roadLine, { grain: 0.5 });
    const mark = { w: 0.09, color: C.roadLine, kind: L_MARK, wobble: 0.2 };
    for (let q = 0; q < 4; q++) {
      g.seg(ZX0 - 0.6, KERB + 0.85 + q * 1.05, ZX0 - 0.6, KERB + 1.45 + q * 1.05, mark);
      g.seg(ZX1 + 0.6, FARKERB - 0.85 - q * 1.05, ZX1 + 0.6, FARKERB - 1.45 - q * 1.05, mark);
    }
    for (const y of [KERB + 0.95, (KERB + FARKERB) / 2 - 0.42, (KERB + FARKERB) / 2 + 0.42, FARKERB - 0.95]) {
      for (const s of [-1, 1]) {
        const pts: V2[] = [];
        for (let k = 0; k <= 7; k++) pts.push([(s < 0 ? ZX0 - 1.0 : ZX1 + 1.0) + s * k * 0.72, y + (k % 2 === 0 ? -0.15 : 0.15)]);
        g.line(pts, { w: 0.06, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
      }
    }
    // the near one reads from this side of the street, the far one from the other
    const near = pen.plane([(ZX0 + ZX1) / 2, KERB + 1.22, 0], [1, 0, 0], [0, -1, 0], 9, true);
    near.text("LOOK RIGHT", 0, 0, 0.44, { align: "c", color: C.roadLine, kind: L_MARK, w: 0.085, wobble: 0.3 });
    const far = pen.plane([(ZX0 + ZX1) / 2, FARKERB - 1.22, 0], [-1, 0, 0], [0, 1, 0], 9, true);
    far.text("LOOK RIGHT", 0, 0, 0.44, { align: "c", color: C.roadLine, kind: L_MARK, w: 0.085, wobble: 0.3 });
    pen.end();
  });
  belisha(pen, ZX0 - 0.3, KERB - 0.4);
  belisha(pen, ZX1 + 0.3, FARKERB + 0.4);
}

// ---------------------------------------------------------------- the palace

/**
 * The storeys of one stretch of the front, n bays from a0: a rusticated
 * ground floor of arches, two floors of windows between pilasters, a cornice.
 * Flat bands go on f1, windows and doors a layer above them on f2.
 */
function storeys(f1: Plane, f2: Plane, a0: number, n: number, bay: number, lit: () => boolean, doors: boolean): void {
  const a1 = a0 + n * bay;
  f1.rect(a0, 0, a1, 2.9, STONE_D, { grain: 0.7 });
  for (const b of [0.58, 1.16, 1.74, 2.32]) f1.seg(a0 + 0.05, b, a1 - 0.05, b, { w: 0.035, color: JOINT, kind: L_MARK, wobble: 0.3, alpha: 0.8 });
  f1.rect(a0, 2.9, a1, 3.16, STONE_L, { grain: 0.4 });
  f1.seg(a0, 2.9, a1, 2.9, { w: W_FINE });
  f1.rect(a0, 8.3, a1, 8.78, STONE_L, { grain: 0.4 });
  f1.seg(a0, 8.3, a1, 8.3, { w: W_THIN });
  for (let i = 0; i <= n; i++) {
    const a = clamp(a0 + i * bay, a0 + 0.16, a1 - 0.16);
    f1.rect(a - 0.14, 3.16, a + 0.14, 8.3, STONE_L, { grain: 0.4, outline: true, w: 0.04, ink: STONE_D });
  }
  for (let i = 0; i < n; i++) {
    const m = a0 + (i + 0.5) * bay;
    if (doors && i >= 1 && i <= n - 2) f2.poly(archShape(m - 0.52, 0, m + 0.52, 2.5), DOORWAY, { outline: true, w: W_FINE, grain: 0.6 });
    else archWindow(f2, m - 0.4, 0.6, m + 0.4, 2.3, lit(), STONE_L);
    windowAt(f2, m - 0.43, 3.6, m + 0.43, 5.7, lit(), STONE_L);
    f2.poly(
      [
        [m - 0.58, 5.86],
        [m + 0.58, 5.86],
        [m, 6.14],
      ],
      STONE_L,
      { outline: true, w: 0.04, ink: STONE_D, grain: 0.3 },
    );
    windowAt(f2, m - 0.4, 6.6, m + 0.4, 7.85, lit(), STONE_L, false);
  }
}

/** The stone balusters along a roof edge. */
function balusters(f: Plane, a0: number, a1: number, b0: number, b1: number): void {
  f.seg(a0, b0 + 0.08, a1, b0 + 0.08, { w: 0.04, color: BALUSTER, kind: L_MARK, wobble: 0.2 });
  for (let a = a0 + 0.2; a < a1 - 0.1; a += 0.34) f.seg(a, b0 + 0.12, a, b1 - 0.1, { w: 0.09, color: BALUSTER, kind: L_MARK, wobble: 0 });
}

/** The Royal Standard: England twice, Scotland and Ireland. It flies when the King is at home. */
function royalStandard(pen: Pen, x: number, y: number, z: number, h: number): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.1, C.white);
  const k = pen.card(x, y, z + h - 1.4);
  const w = 2.3;
  const hh = 1.25;
  const o = { sway: 0.5, grain: 0.35, layer: 1, shade: false };
  k.rect(0.05, hh / 2, 0.05 + w / 2, hh, UK_RED, o);
  k.rect(0.05 + w / 2, hh / 2, 0.05 + w, hh, C.gold, o);
  k.rect(0.05, 0, 0.05 + w / 2, hh / 2, C.royal, o);
  k.rect(0.05 + w / 2, 0, 0.05 + w, hh / 2, UK_RED, o);
  const mark = (a: number, b: number, rgb: RGB, len = 0.5) => k.seg(a - len / 2, b, a + len / 2, b, { w: 0.07, color: rgb, kind: L_MARK, sway: 0.5, wobble: 0, layer: 2 });
  // three gold lions, a red lion, a gold harp
  for (const [a, b] of [
    [0.05 + w * 0.25, hh * 0.75],
    [0.05 + w * 0.75, hh * 0.25],
  ]) {
    for (const d of [-0.17, 0, 0.17]) mark(a, b + d, C.gold);
  }
  mark(0.05 + w * 0.75, hh * 0.75, UK_RED, 0.34);
  mark(0.05 + w * 0.25, hh * 0.25, C.gold, 0.3);
  k.loop(
    [
      [0.05, 0],
      [0.05 + w, 0],
      [0.05 + w, hh],
      [0.05, hh],
    ],
    { w: W_FINE, sway: 0.5, layer: 3 },
  );
  k.seg(0.05, hh / 2, 0.05 + w, hh / 2, { w: 0.035, sway: 0.5, wobble: 0, layer: 3 });
  k.seg(0.05 + w / 2, 0, 0.05 + w / 2, hh, { w: 0.035, sway: 0.5, wobble: 0, layer: 3 });
  pen.end();
}

function palaceBuilding(c: LondonCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.8);

  // the long range behind, with a wing of six bays showing either side of the middle
  pen.obj(() => {
    pen.box(PX0, PY0, 0, PX1 - PX0, PD, PH, STONE, { top: LEAD });
    const f1 = pen.wall("y+", PX0, PY0, 0, PX1 - PX0, PD, 1);
    const f2 = pen.wall("y+", PX0, PY0, 0, PX1 - PX0, PD, 2);
    for (const a0 of [3 * BAY, 14 * BAY]) {
      storeys(f1, f2, a0, 6, BAY, lit, false);
      balusters(f1, a0, a0 + 6 * BAY, 8.78, PH);
    }
  });

  // the three pavilions, a storey taller, standing forward of the wings
  const pavilion = (x0: number, w: number, a0: number, n: number, out: number, doors: boolean, delay: number) =>
    pen.obj(() => {
      const d = PD + 0.2 + out;
      pen.box(x0, PY0 - 0.2, 0, w, d, ATTIC, STONE, { top: LEAD });
      const f1 = pen.wall("y+", x0, PY0 - 0.2, 0, w, d, 1);
      const f2 = pen.wall("y+", x0, PY0 - 0.2, 0, w, d, 2);
      storeys(f1, f2, a0, n, BAY, lit, doors);
      f1.rect(0, ATTIC - 0.42, w, ATTIC, STONE_L, { grain: 0.4 });
      f1.seg(0, ATTIC - 0.42, w, ATTIC - 0.42, { w: W_FINE });
      for (let i = 0; i < n; i++) {
        const m = a0 + (i + 0.5) * BAY;
        f2.rect(m - 0.3, 9.02, m + 0.3, 9.62, C.glass, { outline: true, w: 0.04, glow: lit() ? 1 : 0, grain: 0.5 });
      }
    }, delay);
  pavilion(PX0 - 0.25, 3 * BAY + 0.25, 0.25, 3, 0.6, false, 0.05);
  pavilion(PX0 + 9 * BAY, 5 * BAY, 0, 5, CENTRE_OUT, true, 0.1);
  pavilion(PX0 + 20 * BAY, 3 * BAY + 0.25, 0, 3, 0.6, false, 0.15);
  // the end of the east pavilion, which the camera can see
  pen.obj(() => {
    const d = PD + 0.2 + 0.6;
    const x0 = PX0 + 20 * BAY;
    const w = 3 * BAY + 0.25;
    const g1 = pen.wall("x+", x0, PY0 - 0.2, 0, w, d, 1);
    const g2 = pen.wall("x+", x0, PY0 - 0.2, 0, w, d, 2);
    storeys(g1, g2, 0, 5, d / 5, lit, false);
    g1.rect(0, ATTIC - 0.42, d, ATTIC, STONE_L, { grain: 0.4 });
    g1.seg(0, ATTIC - 0.42, d, ATTIC - 0.42, { w: W_FINE });
    for (let i = 0; i < 5; i++) {
      const m = (i + 0.5) * (d / 5);
      g2.rect(m - 0.3, 9.02, m + 0.3, 9.62, C.glass, { outline: true, w: 0.04, glow: lit() ? 1 : 0, grain: 0.5 });
    }
  }, 0.2);

  // the pediment over the middle, with the royal arms carved in it
  const cx0 = PX0 + 9 * BAY - 0.25;
  const cw = 5 * BAY + 0.5;
  pen.obj(() => {
    const d = PD - 1.2 + CENTRE_OUT + 0.3;
    pen.gable(cx0, PY0 + 1.2, ATTIC, cw, d, 1.7, "y", LEAD, { gable: STONE_L });
    const f = pen.wall("y+", cx0, PY0 + 1.2, ATTIC, cw, d, 1);
    f.poly(
      [
        [0.85, 0.18],
        [cw - 0.85, 0.18],
        [cw / 2, 1.4],
      ],
      STONE_D,
      { outline: true, w: W_FINE, grain: 0.6 },
    );
    const f2 = pen.wall("y+", cx0, PY0 + 1.2, ATTIC, cw, d, 2);
    f2.circle(cw / 2, 0.66, 0.33, C.gold, { seg: 9, outline: true, w: 0.035, grain: 0.3 });
    for (const s of [-1, 1]) {
      for (const k of [1, 2]) f2.ellipse(cw / 2 + s * k * 0.86, 0.5 - k * 0.07, 0.2, 0.33 - k * 0.07, C.white, { seg: 8, grain: 0.3, outline: true, w: 0.035, ink: STONE_D });
    }
  }, 0.3);
  // figures on the corners of the pediment, chimneys along the roof
  pen.obj(() => {
    for (const [x, z] of [
      [cx0 + 0.25, ATTIC],
      [cx0 + cw / 2, ATTIC + 1.7],
      [cx0 + cw - 0.25, ATTIC],
    ]) {
      const k = pen.card(x, FRONT + CENTRE_OUT + 0.25, z);
      k.bar(0, 0.05, 0, 0.72, 0.28, MARBLE);
      k.circle(0, 0.98, 0.19, MARBLE, { outline: true, w: W_FINE, layer: 2, seg: 8 });
    }
    for (const x of [12.4, 17.6, 30.4, 35.6]) pen.box(x, 7.2, PH, 0.95, 0.75, 1.0, STONE_D, { top: C.charcoal, w: W_THIN });
  }, 0.45);
  royalStandard(pen, 24, 8.4, ATTIC + 1.7, 4.6);

  // the balcony, its red and gold drape, and the family come out to wave
  pen.obj(() => {
    const x0 = PX0 + 10 * BAY;
    const w = 3 * BAY;
    const y0 = FRONT + CENTRE_OUT;
    pen.box(x0 - 0.2, y0, 2.92, w + 0.4, 0.95, 0.24, STONE_L, { w: W_THIN });
    railing(
      pen,
      [
        [x0 - 0.15, y0 + 0.05, 3.16],
        [x0 - 0.15, y0 + 0.9, 3.16],
        [x0 + w + 0.15, y0 + 0.9, 3.16],
        [x0 + w + 0.15, y0 + 0.05, 3.16],
      ],
      0.62,
      STONE_D,
      0.5,
    );
    const dw = w - 1.7;
    const f = pen.wall("y+", x0 + 0.85, y0, 2.3, dw, 0.98, 1);
    f.poly(
      [
        [0, 1.46],
        [dw, 1.46],
        [dw, 0.42],
        [dw * 0.75, 0.14],
        [dw * 0.5, 0.42],
        [dw * 0.25, 0.14],
        [0, 0.42],
      ],
      C.red,
      { outline: true, w: W_THIN, grain: 0.5 },
    );
    f.line(
      [
        [0.08, 0.52],
        [dw * 0.25, 0.26],
        [dw * 0.5, 0.52],
        [dw * 0.75, 0.26],
        [dw - 0.08, 0.52],
      ],
      { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0.2, layer: 1 },
    );
    f.circle(dw / 2, 0.98, 0.24, C.gold, { layer: 1, seg: 8, outline: true, w: 0.035, grain: 0.2 });
    const royals: [Look, Pose, boolean][] = [
      [{ skin: SKIN[0], hair: HAIR[3], top: hex("#f3c8d4"), legs: hex("#f3c8d4"), long: true, hat: hex("#f3c8d4") }, "wave", true],
      [{ skin: SKIN[0], hair: HAIR[7], top: C.navy, legs: C.navy, long: false, hat: null }, "wave", false],
      [{ skin: SKIN[0], hair: HAIR[7], top: hex("#bfe0ec"), legs: hex("#bfe0ec"), long: true, hat: hex("#bfe0ec") }, "stand", true],
      [{ skin: SKIN[0], hair: HAIR[2], top: C.charcoal, legs: C.charcoal, long: false, hat: null }, "wave", true],
    ];
    royals.forEach(([lk, pose, flip], i) => person(pen, x0 + 0.75 + i * ((w - 1.5) / 3), y0 + 0.45, 3.16, lk, pose, flip, 0.84));
  }, 0.5);
  // the front is floodlit after dark
  pen.obj(() => {
    for (const x of [8.5, 15.4, 24, 32.6, 39.5]) {
      pen.stroke(
        [
          [x, FRONT + 1.7, 1.4],
          [x + 0.02, FRONT + 1.7, 1.4],
        ],
        { w: 3.0, kind: L_LIGHT, wobble: 0, alpha: 0.2 },
      );
    }
  }, 0.6);
}

/** A sentry box: black, with a pointed roof and the royal cypher over the door. */
function sentryBox(pen: Pen, x: number, y: number): void {
  pen.begin();
  pen.box(x - 0.6, y - 0.55, 0, 1.2, 1.1, 2.5, C.iron, { w: 0.09 });
  pen.pyramid(x - 0.72, y - 0.67, 2.5, 1.44, 1.34, 0.75, C.black, { w: W_THIN });
  const f = pen.wall("y+", x - 0.6, y - 0.55, 0, 1.2, 1.1);
  f.poly(archShape(0.2, 0, 1.0, 2.15), hex("#1c1b1e"), { outline: true, w: W_FINE, grain: 0.4 });
  f.circle(0.6, 2.3, 0.1, C.gold, { seg: 6, grain: 0 });
  pen.end();
}

/** A gate, or a stretch of fence, in wrought iron: bars, two rails and a gilded crest. Drawn on a plane w wide and h high. */
function ironwork(p: Plane, w: number, h: number): void {
  const n = Math.round(w / 0.21);
  for (let i = 0; i <= n; i++) {
    const a = (w * i) / n;
    const top = h - 0.3 + 0.3 * Math.sin((a / w) * Math.PI);
    p.seg(a, 0, a, top, { w: 0.05, color: C.iron, kind: L_BAR, wobble: 0 });
    p.seg(a, top, a, top + 0.16, { w: 0.08, color: C.gold, kind: L_BAR, wobble: 0 });
  }
  p.seg(0, 0.25, w, 0.25, { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0 });
  p.seg(0, h - 0.55, w, h - 0.55, { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0 });
  p.circle(w / 2, h * 0.5, 0.3, C.gold, { outline: true, w: 0.035, seg: 9, grain: 0.2, layer: 1 });
  p.poly(
    [
      [w / 2 - 0.22, h * 0.5 + 0.3],
      [w / 2 - 0.26, h * 0.5 + 0.56],
      [w / 2 - 0.1, h * 0.5 + 0.44],
      [w / 2, h * 0.5 + 0.64],
      [w / 2 + 0.1, h * 0.5 + 0.44],
      [w / 2 + 0.26, h * 0.5 + 0.56],
      [w / 2 + 0.22, h * 0.5 + 0.3],
    ],
    C.gold,
    { outline: true, w: 0.03, layer: 1, grain: 0.2 },
  );
}

/** The railings across the front of the forecourt, their stone piers and lanterns, and the gates. */
function fence(c: LondonCtx): void {
  const { pen } = c;
  const pier = (x: number, big: boolean) =>
    pen.obj(() => {
      const s = big ? 0.5 : 0.38;
      const h = big ? 3.0 : 2.2;
      pen.box(x - s, RAIL_Y - s, 0, 2 * s, 2 * s, h, STONE, { top: STONE_L, w: 0.09 });
      pen.box(x - s - 0.08, RAIL_Y - s - 0.08, h, 2 * s + 0.16, 2 * s + 0.16, 0.16, STONE_L, { w: W_FINE });
      const k = pen.card(x, RAIL_Y, h + 0.16);
      k.poly(
        [
          [-0.16, 0],
          [0.16, 0],
          [0.24, 0.46],
          [-0.24, 0.46],
        ],
        C.lamp,
        { outline: true, w: W_FINE, glow: 1, grain: 0.2, layer: 1 },
      );
      k.poly(
        [
          [-0.28, 0.46],
          [0.28, 0.46],
          [0, 0.72],
        ],
        C.iron,
        { outline: true, w: W_FINE, layer: 2 },
      );
      k.seg(-0.01, 0.24, 0.01, 0.24, { kind: L_LIGHT, w: 2.0, alpha: 0.2, wobble: 0 });
    });
  // black railings tipped with gold
  const run = (x0: number, x1: number) =>
    pen.obj(() => {
      const n = Math.round((x1 - x0) / 0.42);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        pen.stroke(
          [
            [x, RAIL_Y, 0],
            [x, RAIL_Y, 1.55],
          ],
          { w: 0.06, color: C.iron, kind: L_BAR, wobble: 0 },
        );
        pen.stroke(
          [
            [x, RAIL_Y, 1.55],
            [x, RAIL_Y, 1.78],
          ],
          { w: 0.1, color: C.gold, kind: L_BAR, wobble: 0 },
        );
      }
      for (const z of [0.22, 1.3]) {
        pen.stroke(
          [
            [x0, RAIL_Y, z],
            [x1, RAIL_Y, z],
          ],
          { w: 0.08, color: C.iron, kind: L_BAR, wobble: 0 },
        );
      }
    });
  for (const x of [5.6, 12.0, 15.0, 33.0, 36.0, 42.4]) pier(x, false);
  for (const x of [GATE0 - 0.5, GATE1 + 0.5]) pier(x, true);
  run(6.0, 11.6);
  run(15.4, GATE0 - 1.0);
  run(GATE1 + 1.0, 32.6);
  run(36.4, 42.0);
  // the side gates are shut; the centre gates stand open for the guard
  for (const x of [12.38, 33.38]) pen.obj(() => ironwork(pen.plane([x, RAIL_Y, 0], [1, 0, 0], [0, 0, 1], 0, true), 2.24, 2.5));
  for (const [x, dx] of [
    [GATE0, -0.26],
    [GATE1, 0.26],
  ]) {
    pen.obj(() => ironwork(pen.plane([x, RAIL_Y - 0.05, 0], [dx, -0.966, 0], [0, 0, 1], 0, true), 2.05, 2.8), 0.1);
  }
  // sentry boxes either side of the middle; the sentry from the east one is out on his beat
  sentryBox(pen, 19.1, 14.3);
  sentryBox(pen, 28.9, 14.3);
  guardsman(pen, 19.1, 15.3, 0, "stand", false, c.rng);
}

// ---------------------------------------------------------------- the Victoria Memorial

function memorial(c: LondonCtx): void {
  const { pen, rng } = c;
  const [mx, my] = MEM;
  // marble steps, a basin of water all round, the plinth
  pen.obj(() => {
    pen.cyl(mx, my, 0, 4.3, 0.3, MARBLE_D, { seg: 26, w: W_THIN, top: MARBLE });
    pen.cyl(mx, my, 0.3, 3.6, 0.3, MARBLE_D, { seg: 24, w: W_THIN, top: MARBLE });
    pen.floor(0.6, 1).circle(mx, my, 3.1, C.water, { kind: F_WATER, outline: true, w: W_FINE, ink: C.waterInk, seg: 20 });
    pen.cyl(mx, my, 0.6, 2.1, 1.0, MARBLE, { seg: 16, w: W_THIN, top: MARBLE_D });
  });
  // the pylon, with the Queen seated on the side that looks down the Mall
  pen.obj(() => {
    pen.box(mx - 1.0, my - 1.0, 1.6, 2.0, 2.0, 4.0, MARBLE, { top: MARBLE_D });
    pen.box(mx - 1.25, my - 1.25, 5.6, 2.5, 2.5, 0.3, MARBLE, { w: W_THIN, top: MARBLE_D });
    pen.cyl(mx, my, 5.9, 0.75, 0.8, MARBLE, { seg: 10, w: W_THIN });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, mx - 1.0, my - 1.0, 1.6, 2.0, 2.0);
      f.poly(archShape(0.3, 0.2, 1.7, 3.3), MARBLE_D, { outline: true, w: 0.04, ink: STONE_D, grain: 0.5 });
    }
    person(pen, mx + 1.22, my + 0.05, 1.72, STONE_LOOK, "sit", false, 1.05);
    person(pen, mx + 0.05, my + 1.22, 1.6, STONE_LOOK, "stand", true, 0.95);
  }, 0.12);
  // Victory, gilded, on her globe at the top
  pen.obj(() => {
    const k = pen.card(mx, my, 6.7);
    for (const s of [-1, 1]) {
      k.poly(
        [
          [s * 0.18, 1.62],
          [s * 1.3, 2.45],
          [s * 1.02, 1.5],
          [s * 0.3, 1.1],
        ],
        C.gold,
        { outline: true, w: W_FINE, grain: 0.2 },
      );
    }
    k.circle(0, 0.22, 0.32, C.gold, { outline: true, w: W_FINE, seg: 9, grain: 0.2 });
    person(pen, mx, my, 7.15, GILT_LOOK, "cheer", false, 0.9);
  }, 0.3);
  // bronze figures with lions at the four corners
  for (const [dx, dy, flip] of [
    [2.75, -2.75, false],
    [2.75, 2.75, false],
    [-2.75, 2.75, true],
    [-2.75, -2.75, true],
  ] as const) {
    pen.obj(() => {
      const x = mx + dx;
      const y = my + dy;
      pen.box(x - 0.5, y - 0.5, 0.3, 1.0, 1.0, 0.7, MARBLE_D, { w: W_THIN, top: MARBLE });
      const k = pen.card(x, y, 1.0, flip);
      k.ellipse(0.28, 0.3, 0.46, 0.26, C.bronze, { outline: true, w: W_FINE, seg: 10 });
      k.circle(0.72, 0.56, 0.24, C.bronze, { outline: true, w: W_FINE, seg: 8, layer: 1 });
      person(pen, x - 0.12, y, 1.0, BRONZE_LOOK, "stand", flip, 0.74);
    }, 0.2);
  }
  // red flower beds all round the island, in four arcs with a way through between them
  pen.obj(() => {
    const g = pen.floor(0, 4);
    for (let q = 0; q < 4; q++) {
      const a0 = ((q * 90 + 13) * Math.PI) / 180;
      const a1 = ((q * 90 + 77) * Math.PI) / 180;
      const bed: V2[] = [];
      for (let i = 0; i <= 8; i++) bed.push([mx + Math.cos(a0 + ((a1 - a0) * i) / 8) * 5.02, my + Math.sin(a0 + ((a1 - a0) * i) / 8) * 5.02]);
      for (let i = 8; i >= 0; i--) bed.push([mx + Math.cos(a0 + ((a1 - a0) * i) / 8) * 4.48, my + Math.sin(a0 + ((a1 - a0) * i) / 8) * 4.48]);
      g.poly(bed, C.grassDark, { outline: true, w: W_THIN });
      for (let i = 0; i < 16; i++) {
        const t = a0 + (a1 - a0) * rng.next();
        const r = rng.range(4.58, 4.92);
        pen.card(mx + Math.cos(t) * r, my + Math.sin(t) * r, 0).circle(0, 0.28, 0.16, rng.pick([C.red, C.red, C.guard, C.redDark, C.white]), { seg: 6, grain: 0, sway: 0.1 });
      }
    }
  }, 0.1);
  // lit from below after dark
  pen.obj(() => {
    for (const [dx, dy] of [
      [2.4, 0.4],
      [0.4, 2.4],
    ]) {
      pen.stroke(
        [
          [mx + dx, my + dy, 1.9],
          [mx + dx + 0.02, my + dy, 1.9],
        ],
        { w: 2.6, kind: L_LIGHT, wobble: 0, alpha: 0.28 },
      );
    }
  });
  // people on the steps: the best seats for the parade
  for (const deg of [20, 44, 68, 112, 136, 160, -20, -45]) {
    const t = (deg * Math.PI) / 180;
    person(pen, mx + Math.cos(t) * 3.98, my + Math.sin(t) * 3.98, 0.16, randomLook(rng), "sit", Math.cos(t) < Math.sin(t), rng.chance(0.2) ? 0.74 : 1);
  }
  snapper(pen, mx + 4.78, my - 0.25, randomLook(rng), false);
  snapper(pen, mx - 0.3, my - 4.78, randomLook(rng), true);
  person(pen, mx - 4.78, my + 0.3, 0, randomLook(rng), "wave", true);
}

// ---------------------------------------------------------------- the Mall, and the gardens either side

function mall(c: LondonCtx): void {
  const { pen, rng } = c;
  const reds: RGB[] = [C.red, C.red, C.guard, C.redDark, C.white];
  flowerBed(pen, rng, 6.0, 23.3, 8.6, 4.7, reds, 2.0);
  flowerBed(pen, rng, 33.3, 22.6, 9.4, 2.6, reds, 2.0);
  // Union flags down both sides of the Mall, lamps between them
  for (const y of [MALL0 - 0.65, MALL1 + 0.65]) {
    for (const x of [33.0, 36.5, 40.0, 43.3]) flag(pen, x, y, 0, 6.2, "uk", 1.15);
    for (const x of [34.75, 38.25, 41.7]) lamp(pen, x, y, 0, 3.5);
  }
  for (const [x, y] of [
    [17.9, 23.4],
    [30.1, 23.4],
    [17.9, 35.6],
    [30.3, 35.0],
  ]) {
    lamp(pen, x, y, 0, 3.5);
  }
  // people along the kerbs, waiting for the band to come by
  const north: [number, Pose | "snap", number][] = [
    [32.3, "stand", 1],
    [33.9, "snap", 1],
    [35.6, "wave", 1],
    [37.2, "cheer", 0.72],
    [39.0, "snap", 1],
    [40.8, "stand", 1],
    [42.5, "wave", 1],
  ];
  for (const [x, pose, s] of north) {
    const lk = randomLook(rng);
    if (pose === "snap") snapper(pen, x, MALL0 - 1.35, lk, false);
    else {
      person(pen, x, MALL0 - 1.35, 0, lk, pose, false, s);
      if (pose === "wave") handFlag(pen, x, MALL0 - 1.35, 0, false);
    }
  }
  const south: [number, Pose | "snap", number][] = [
    [32.6, "wave", 1],
    [34.2, "stand", 0.72],
    [35.4, "stand", 1],
    [37.4, "snap", 1],
    [39.3, "cheer", 1],
    [41.2, "stand", 1],
  ];
  for (const [x, pose, s] of south) {
    const lk = randomLook(rng);
    if (pose === "snap") snapper(pen, x, MALL1 + 1.2, lk, true);
    else {
      person(pen, x, MALL1 + 1.2, 0, lk, pose, true, s);
      if (pose === "wave") handFlag(pen, x, MALL1 + 1.2, 0, true);
    }
  }
  // a guide under a red umbrella, and the party following it
  pen.obj(() => {
    const guide = randomLook(rng);
    person(pen, 9.2, 29.6, 0, guide, "stand");
    umbrella(pen, 9.2, 29.6, 0, C.red);
  });
  for (const [x, y] of scatter(rng, 10.2, 29.05, 14.8, 30.1, 6, 0.76)) {
    const lk = randomLook(rng);
    if (rng.chance(0.4)) snapper(pen, x, y, lk, true);
    else person(pen, x, y, 0, lk, rng.pick(["stand", "stand", "wave"]), true, rng.chance(0.2) ? 0.72 : 1);
  }
}

// ---------------------------------------------------------------- St James's Park

function pelican(pen: Pen, x: number, y: number, z: number, flip: boolean): void {
  pen.obj(() => {
    const k = pen.card(x, y, z, flip);
    k.ellipse(0, 0.42, 0.42, 0.3, C.white, { outline: true, w: 0.045, seg: 9, grain: 0.2 });
    k.line(
      [
        [0.24, 0.6],
        [0.4, 0.92],
        [0.3, 1.18],
      ],
      { w: 0.15, color: C.white, kind: L_BAR, wobble: 0, layer: 1 },
    );
    k.circle(0.32, 1.22, 0.15, C.white, { outline: true, w: 0.04, seg: 7, layer: 2 });
    k.poly(
      [
        [0.42, 1.28],
        [1.02, 1.0],
        [0.6, 0.94],
        [0.42, 1.08],
      ],
      hex("#f2b54a"),
      { outline: true, w: 0.035, layer: 3, grain: 0.2 },
    );
    k.seg(-0.06, 0.14, -0.06, 0, { w: 0.05, color: C.orange, kind: L_BAR, wobble: 0 });
    k.seg(0.1, 0.14, 0.1, 0, { w: 0.05, color: C.orange, kind: L_BAR, wobble: 0 });
  });
}

/** A weeping willow: a round head with long strands hanging from it. */
function willow(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.begin();
  pen.pole([x, y, 0], [x, y, 2.9], 0.34, C.trunk);
  const k = pen.card(x, y, 2.3);
  k.ellipse(0, 1.5, 1.75, 1.2, C.leaf3, { outline: true, w: 0.1, sway: 0.25, layer: 1, seg: 14 });
  for (let i = 0; i < 11; i++) {
    const a = -1.55 + i * 0.31;
    const top = 1.5 - Math.sqrt(Math.max(0, 1 - Math.pow(a / 1.75, 2))) * 1.1;
    k.line(
      [
        [a, top + 0.5],
        [a + rng.range(-0.06, 0.06), top - 0.6],
        [a + rng.range(-0.1, 0.1), top - rng.range(1.3, 2.0)],
      ],
      { w: 0.11, color: i % 2 === 0 ? C.leaf2 : C.leaf, kind: L_MARK, wobble: 0.6, sway: 0.2, swayB: 0.55, layer: 2 },
    );
  }
  pen.end();
}

/** A deckchair in green and white stripes, facing +y, and whoever is in it. */
function deckchair(pen: Pen, x: number, y: number, sitter: Look | null, flip: boolean): void {
  pen.begin();
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a0 = x - 0.4 + (0.8 * i) / n;
    const a1 = x - 0.4 + (0.8 * (i + 1)) / n;
    pen.fill(
      [
        [a0, y - 0.38, 1.12],
        [a1, y - 0.38, 1.12],
        [a1, y + 0.5, 0.22],
        [a0, y + 0.5, 0.22],
      ],
      i % 2 === 0 ? DECK_GREEN : C.white,
      { grain: 0.5 },
    );
  }
  pen.stroke(
    [
      [x - 0.4, y - 0.38, 1.12],
      [x + 0.4, y - 0.38, 1.12],
      [x + 0.4, y + 0.5, 0.22],
      [x - 0.4, y + 0.5, 0.22],
    ],
    { closed: true, w: W_FINE },
  );
  for (const s of [-0.44, 0.44]) {
    pen.pole([x + s, y + 0.62, 0], [x + s, y - 0.46, 1.22], 0.07, C.wood, { ink: false });
    pen.pole([x + s, y - 0.3, 0], [x + s, y + 0.3, 0.78], 0.07, C.wood, { ink: false });
  }
  if (sitter) person(pen, x, y + 0.14, 0.1, sitter, "sit", flip);
  pen.end();
}

function park(c: LondonCtx): void {
  const { pen, rng } = c;
  hedge(pen, 4.8, 30.4, 8.2, 0.42, 0.6);
  railing(
    pen,
    [
      [4.8, 43.6, 0],
      [21.4, 43.6, 0],
    ],
    0.75,
    C.iron,
    0.9,
  );
  // the pelicans' rock, and the birds on the water
  pen.obj(() => {
    pen.floor(0, 3).ellipse(9.3, 38.0, 1.15, 0.66, C.stone, { outline: true, w: W_FINE, seg: 12, grain: 0.7 });
  });
  pelican(pen, 8.85, 38.0, 0.05, false);
  pelican(pen, 9.85, 38.15, 0.05, true);
  for (const [x, y, kind, flip] of [
    [13.7, 37.2, "drake", false],
    [12.6, 39.9, "duck", true],
    [6.9, 37.6, "drake", true],
  ] as const) {
    pen.obj(() => duckOn(pen.card(x, y, 0.02, flip), kind));
  }
  willow(pen, rng, 6.2, 35.3);
  tree(pen, rng, 5.4, 41.9, { kind: "round" });
  tree(pen, rng, 9.4, 42.8, { kind: "blossom" });
  tree(pen, rng, 19.2, 37.9, { kind: "round" });
  // deckchairs facing the lake
  const sitters = [true, true, false, true];
  sitters.forEach((taken, i) => deckchair(pen, 6.3 + i * 1.95, 32.9 + (i % 2) * 0.25, taken ? randomLook(rng) : null, i % 2 === 0));
  // ices, and the queue for them
  pen.push(13.2, 31.0, 0);
  stall(pen, rng, { w: 2.6, d: 1.8, a: C.pink, sign: "ICES", goods: [C.white, C.pink, hex("#8b5a3c"), C.yellow] });
  pen.pop();
  person(pen, 13.9, 33.6, 0, randomLook(rng), "stand", false);
  person(pen, 14.75, 33.75, 0, randomLook(rng), "stand", true);
  pen.obj(() => {
    // one satisfied customer
    const lk = randomLook(rng);
    person(pen, 15.9, 34.3, 0, lk, "wave", false, 0.72);
    const k = pen.card(15.9, 34.3, 0);
    k.poly(
      [
        [0.4, 1.36],
        [0.54, 1.36],
        [0.47, 1.12],
      ],
      C.ochre,
      { layer: 5, grain: 0, outline: true, w: 0.03 },
    );
    k.circle(0.47, 1.44, 0.11, C.pink, { layer: 6, seg: 6, grain: 0, outline: true, w: 0.03 });
  });
  // feeding the ducks, and having it photographed
  person(pen, 15.75, 36.5, 0, randomLook(rng), "wave", true, 0.72);
  snapper(pen, 16.7, 37.0, randomLook(rng), true);
  pen.obj(() => duckOn(pen.card(14.95, 36.75, 0, false), "duck"));
  pen.obj(() => duckOn(pen.card(15.2, 37.3, 0.02, false), "drake"));
  squirrel(pen, 6.3, 41.3, 0, false);
  squirrel(pen, 18.4, 39.0, 0, true);
}

// ---------------------------------------------------------------- the ride, and the avenue

function ride(c: LondonCtx): void {
  const { pen, rng } = c;
  tree(pen, rng, RIDE[0] - 1.6, RIDE[1], { kind: "round" });
  tree(pen, rng, RIDE[0] + 1.9, RIDE[1] + 0.2, { kind: "blossom" });
  for (const [x, pose, s] of [
    [33.2, "stand", 1],
    [34.6, "wave", 0.72],
    [37.9, "stand", 1],
    [39.4, "cheer", 0.72],
    [40.4, "stand", 1],
  ] as const) {
    person(pen, x, 34.35, 0, randomLook(rng), pose, false, s);
  }
  // on the avenue: a phone box to be photographed in front of, and a man selling balloons
  phoneBox(pen, 27.7, 42.4, 0);
  person(pen, 26.75, 43.05, 0, randomLook(rng), "wave", false);
  snapper(pen, 25.2, 43.2, randomLook(rng), false);
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 27.6, 39.4, 0, lk, "wave");
    const k = pen.card(27.6, 39.4, 0);
    const cols = [C.red, C.white, C.blue, C.red, C.yellow, C.blue, C.pink, C.white];
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
  person(pen, 26.6, 39.9, 0, randomLook(rng), "cheer", true, 0.68);
}

// ---------------------------------------------------------------- the crowd at the railings

/** Draws everyone who stands still. Returns where the ones who cannot keep still are standing. */
function crowd(c: LondonCtx): V2[] {
  const { pen, rng } = c;
  const jumpers: V2[] = [];
  // (the corners nearest the gates are left clear: the band comes through there)
  const spots = [
    ...scatter(rng, 6.6, 20.6, 20.6, 22.4, 20, 0.76, (x, y) => !(x > 19.4 && y > 21.7)),
    ...scatter(rng, 27.4, 20.6, 41.4, 22.4, 20, 0.76, (x, y) => !(x < 28.8 && y > 21.5)),
  ];
  spots.forEach(([x, y], i) => {
    if (i % 6 === 3) {
      jumpers.push([x, y]);
      return;
    }
    const lk = randomLook(rng);
    const flip = rng.chance(0.5);
    const r = rng.next();
    if (r < 0.36) snapper(pen, x, y, lk, flip);
    else if (r < 0.58) {
      person(pen, x, y, 0, lk, "wave", flip);
      handFlag(pen, x, y, 0, flip);
    } else if (r < 0.7) person(pen, x, y, 0, lk, "cheer", flip, rng.chance(0.3) ? 0.72 : 1);
    else if (r < 0.8) {
      // a child up on somebody's shoulders
      person(pen, x, y, 0, lk, "stand", flip);
      person(pen, x, y, 1.98, randomLook(rng), "bust", flip, 0.62);
    } else person(pen, x, y, 0, lk, "stand", flip, rng.chance(0.2) ? 0.72 : 1);
  });
  // two constables keep the way clear at the gates
  bobby(pen, GATE0 - 0.55, 21.15, 0, "stand", false, rng);
  bobby(pen, GATE1 + 0.55, 21.15, 0, "stand", true, rng);
  return jumpers;
}

// ---------------------------------------------------------------- characters

type Marcher = "major" | "bass" | "tuba" | "cymbals" | "trumpet" | "snare" | "guard";

/** One of the band or the guard, in mid-stride: red tunic, white belt, bearskin, and whatever he carries. */
function marcher(pen: Pen, kind: Marcher, frame: number, flip: boolean, skin: RGB): void {
  const pose: Pose = frame === 0 ? "walkA" : "walkB";
  const lk: Look = { skin, hair: C.black, top: C.guard, legs: C.navy, long: false, hat: null };
  pen.begin();
  person(pen, 0, 0, 0, lk, pose, flip);
  const k = pen.card(0, 0, 0, flip);
  k.seg(-0.33, 0.98, 0.33, 0.98, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
  if (kind === "guard") k.seg(0.46, 0.75, 0.52, 2.5, { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
  else if (kind === "major") {
    // the drum major, with his mace
    const tip = frame === 0 ? 0.58 : 0.68;
    k.seg(-0.28, 1.38, 0.28, 1.04, { w: 0.08, color: C.gold, kind: L_MARK, wobble: 0, layer: 3 });
    k.bar(0.5, 0.92, tip, 2.62, 0.07, C.gold, { layer: 5 });
    k.circle(tip + 0.01, 2.7, 0.12, C.gold, { layer: 8, seg: 6, grain: 0, outline: true, w: 0.03 });
  } else if (kind === "bass") {
    k.circle(0.08, 1.02, 0.52, C.white, { outline: true, w: W_FINE, layer: 4, seg: 12, grain: 0.2 });
    k.circle(0.08, 1.02, 0.4, null, { ink: C.red, w: 0.08, layer: 5, seg: 12 });
    k.bar(0.5, frame === 0 ? 1.55 : 1.3, 0.74, frame === 0 ? 1.28 : 1.62, 0.06, C.woodDark, { layer: 6 });
  } else if (kind === "tuba") {
    k.bar(0.1, 1.0, 0.38, 1.9, 0.17, C.gold, { layer: 4 });
    k.ellipse(0.52, 2.16, 0.36, 0.3, C.gold, { outline: true, w: W_FINE, layer: 8, seg: 9, grain: 0.2 });
    k.ellipse(0.52, 2.16, 0.2, 0.16, GILT_D, { layer: 9, seg: 7, grain: 0 });
  } else if (kind === "cymbals") {
    const apart = frame === 0 ? 0.46 : 0.1;
    for (const s of [-1, 1]) k.ellipse(0.04 + s * apart, 1.3, 0.1, 0.27, C.gold, { outline: true, w: 0.035, layer: 5 + (s > 0 ? 1 : 0), seg: 8, grain: 0.2 });
  } else if (kind === "trumpet") {
    k.bar(0.2, 1.62, 0.8, 1.68, 0.07, C.gold, { layer: 5 });
    k.poly(
      [
        [0.8, 1.58],
        [1.0, 1.5],
        [1.0, 1.86],
        [0.8, 1.78],
      ],
      C.gold,
      { outline: true, w: 0.03, layer: 8, grain: 0.2 },
    );
  } else {
    // a side drum
    k.rect(-0.3, 0.7, 0.3, 0.98, C.white, { outline: true, w: W_FINE, layer: 4, grain: 0.2 });
    k.seg(-0.3, 0.84, 0.3, 0.84, { w: 0.05, color: C.red, kind: L_MARK, wobble: 0, layer: 5 });
    k.bar(-0.24, 1.3, frame === 0 ? -0.06 : -0.14, 1.0, 0.045, C.woodDark, { layer: 6 });
    k.bar(0.24, 1.3, frame === 0 ? 0.14 : 0.06, 1.0, 0.045, C.woodDark, { layer: 6 });
  }
  hat(pen, 0, 0, 0, "bearskin", { pose, flip });
  pen.end();
}

/** A trooper of the Household Cavalry, to sit on a horse: cuirass, helmet and plume. */
function trooper(tunic: RGB, plume: RGB, skin: RGB): (pen: Pen, z: number) => void {
  const lk: Look = { skin, hair: C.black, top: tunic, legs: C.white, long: false, hat: null };
  return (p, z) => {
    person(p, 0, 0, z - 0.42, lk, "bust");
    const k = p.card(0, 0, z - 0.42);
    k.rect(-0.2, 0.18, 0.2, 0.6, C.metal, { outline: true, w: 0.035, layer: 2, grain: 0.2 });
    const dome: V2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * Math.PI;
      dome.push([Math.cos(t) * 0.43, 1.36 + Math.sin(t) * 0.36]);
    }
    k.poly(dome, C.metal, { outline: true, w: W_FINE, layer: 6, grain: 0.2 });
    k.seg(-0.46, 1.37, 0.46, 1.37, { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0, layer: 7 });
    k.poly(
      [
        [-0.05, 1.7],
        [0.06, 1.7],
        [0.1, 2.12],
        [-0.3, 1.94],
        [-0.52, 1.52],
        [-0.28, 1.74],
      ],
      plume,
      { outline: true, w: 0.035, layer: 8, grain: 0.3, sway: 0.06 },
    );
  };
}

// ---------------------------------------------------------------- everything that moves

/** Distance along a route of the point on it nearest to (x, y). */
function along(route: Route, x: number, y: number): number {
  const p: V3 = [0, 0, 0];
  let best = Infinity;
  let at = 0;
  for (let s = 0; s <= route.length; s += 0.1) {
    route.pos(s, p);
    const d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
    if (d < best) {
      best = d;
      at = s;
    }
  }
  return at;
}

/** Seconds between one crossing of the ducks and the next, when there is no tour to time them by. */
const STORY_EVERY = 35;
/** The story, in seconds before (-) or after the camera arrives at the close-up. */
const HOLD_FROM = -11.5; // the traffic is asked to stop
const COP_OUT = -9.3; // the constable steps off the kerb
const COP_SET = -7.5; // and is standing in the road with his hand up
const DUCKS_GO = -1.4; // the mother steps off
const COP_BACK = 4.5; // the last duckling is over: he walks back
const COP_HOME = 6.3; // and the traffic may go
const DUCK_SPEED = 2.4;
const DUCK_GAP = 0.56;

function motion(c: LondonCtx, jumpAt: V2[]): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;
  const P: V3 = [0, 0, 0];
  const right = (h: number) => Math.cos(h) - Math.sin(h) >= 0;

  // ---- Changing the Guard: the band and the new guard, round and round from the Mall into the forecourt
  const [mx, my] = MEM;
  const arc = (deg: number): V3 => W(mx + Math.cos((deg * Math.PI) / 180) * 6.6, my + Math.sin((deg * Math.PI) / 180) * 6.6);
  const loop: V3[] = [
    W(43.3, MALL0 + 1.1),
    W(31.5, MALL0 + 1.1),
    arc(-10),
    arc(-30),
    arc(-50),
    arc(-70),
    W(25, 22.4),
    W(25, 15.7),
    W(23, 15.7),
    W(23, 22.4),
    arc(-110),
    arc(-130),
    arc(-150),
    arc(180),
    arc(150),
    arc(120),
    arc(90),
    arc(60),
    arc(35),
    arc(12),
    W(31.5, MALL1 - 1.1),
    W(43.3, MALL1 - 1.1),
  ];
  const route = new Route(rounded(loop, true, 0.85), true);
  const skins = [SKIN[0], SKIN[2], SKIN[4]];
  const kinds: Marcher[] = ["major", "bass", "tuba", "cymbals", "trumpet", "snare", "guard"];
  // sprites[kind][skin][facing][stride]
  const sprites: Sprite[][][][] = kinds.map((kind, a) =>
    skins.map((skin, b) => [false, true].map((flip) => [0, 1].map((frame) => makeSprite((p) => marcher(p, kind, frame, flip, skin), 0, 300 + a * 7 + b)))),
  );
  const column: { back: number; side: number; kind: number; skin: number }[] = [
    { back: 0, side: 0, kind: 0, skin: 0 },
    { back: 1.5, side: -0.55, kind: 1, skin: 2 },
    { back: 1.5, side: 0.55, kind: 2, skin: 0 },
    { back: 2.7, side: -0.55, kind: 3, skin: 1 },
    { back: 2.7, side: 0.55, kind: 4, skin: 0 },
    { back: 3.9, side: -0.55, kind: 5, skin: 0 },
    { back: 3.9, side: 0.55, kind: 2, skin: 1 },
  ];
  for (let r = 0; r < 5; r++) {
    column.push({ back: 5.6 + r * 1.15, side: -0.55, kind: 6, skin: r % 3 });
    column.push({ back: 5.6 + r * 1.15, side: 0.55, kind: 6, skin: (r + 1) % 3 });
  }
  const PACE = 1.7;
  const gate = along(route, c.ox + 25, c.oy + RAIL_Y + 0.6);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 28, c.oy + 24, 2, 34)) return;
    // on the tour the drum major reaches the gates as the camera arrives
    const at = c.visit();
    const head = at == null ? PACE * (m.t - born) : gate + PACE * (m.t - at);
    const stride = Math.floor(m.t * 2.7) & 1;
    for (const f of column) {
      const s = head - f.back;
      route.pos(s, P);
      const h = route.heading(s, 1.0);
      m.put(sprites[f.kind][f.skin][right(h) ? 0 : 1][stride], P[0] - Math.sin(h) * f.side, P[1] + Math.cos(h) * f.side, P[2], born);
    }
  });

  // ---- the sentry from the east box: ten paces along the front and back again
  const sentry = [false, true].map((flip) => (["walkA", "walkB", "stand"] as Pose[]).map((pose) => makeSprite((p) => guardsman(p, 0, 0, 0, pose, flip, new Rng(9)), 0, 41)));
  const beat0 = 29.7;
  const beat1 = 36.4;
  const leg = (beat1 - beat0) / 1.5;
  const halt = 0.7;
  c.movers.push((m) => {
    if (m.t < born) return;
    const T = 2 * (leg + halt);
    const u = (((m.t - born) % T) + T) % T;
    let x = beat0;
    let pose = 2;
    let east = true;
    if (u < leg) {
      x = beat0 + ((beat1 - beat0) * u) / leg;
      pose = Math.floor(m.t * 2.7) & 1;
    } else if (u < leg + halt) {
      x = beat1;
      east = false;
    } else if (u < 2 * leg + halt) {
      x = beat1 - ((beat1 - beat0) * (u - leg - halt)) / leg;
      pose = Math.floor(m.t * 2.7) & 1;
      east = false;
    }
    m.put(sentry[east ? 0 : 1][pose], c.ox + x, c.oy + 15.35, c.oz, born);
  });

  // ---- two troopers of the Household Cavalry, exercising their horses on the ride
  const track = new Route(
    oval(RIDE[0], RIDE[1], RIDE_L, RIDE_R, 10).map((p) => W(p[0], p[1])),
    true,
  );
  const riders = [trooper(C.guard, C.white, SKIN[1]), trooper(C.navy, C.red, SKIN[3])];
  riders.forEach((rider, i) => {
    const frames = [0, 1].map((frame) => new Turning((p) => horse(p, frame, COAT, rider), 32, 510 + i * 3 + frame));
    c.movers.push(
      traveler(track, {
        speed: 3.0,
        at: i * 0.5 + 0.1,
        born: born + 0.2 + i * 0.3,
        span: 2.4,
        sprite: (h, t) => frames[Math.floor(t * 3.4 + i) & 1].at(h),
      }),
    );
  });

  // ---- the ones in the crowd who cannot keep their feet on the ground
  const jr = new Rng(55);
  const jumpers = jumpAt.map(([x, y]) => {
    const lk = randomLook(jr);
    const flip = jr.chance(0.5);
    return {
      p: W(x, y),
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "cheer"), 0, 31),
      down: makeSprite(
        (p) => {
          person(p, 0, 0, 0, lk, "wave", flip);
          handFlag(p, 0, 0, 0, flip);
        },
        0,
        31,
      ),
      ph: jr.range(0, 6.28),
      w: jr.range(5.2, 7),
      b: born + jr.range(0, 0.8),
    };
  });
  c.movers.push((m) => {
    for (const j of jumpers) {
      const s = Math.sin(m.t * j.w + j.ph);
      m.put(s > 0 ? j.up : j.down, j.p[0], j.p[1], j.p[2] + (s > 0 ? s * 0.5 : 0), j.b);
    }
  });

  // ---- ducks on the lake, round and round
  const swim = [false, true].map((flip) => makeSprite((p) => duckOn(p.card(0, 0, 0, flip), "drake"), 0, 61));
  const paddle = (cx: number, cy: number, r: number, at: number, speed: number) => {
    const pts: V3[] = [];
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * Math.PI * 2;
      pts.push(W(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.7, 0.02));
    }
    c.movers.push(traveler(new Route(pts, true), { speed, at, born: born + 0.3, span: 0.5, sprite: (h) => swim[right(h) ? 0 : 1] }));
  };
  paddle(13.4, 38.7, 1.3, 0.1, 0.55);
  paddle(13.4, 38.7, 1.3, 0.22, 0.55);
  paddle(8.0, 39.7, 0.8, 0.6, 0.4);

  // ---- people strolling round the flower garden, and on the avenue
  const garden = new Route(rounded([W(5.3, 22.9), W(15.3, 22.9), W(15.3, 28.5), W(5.3, 28.5)], true, 0.5), true);
  for (let i = 0; i < 4; i++) c.movers.push(walker(garden, rng, born + rng.range(0, 1)));
  const stroll = new Route(rounded([W(23.4, 38.6), W(25.9, 38.6), W(25.9, 42.3), W(23.4, 42.3)], true, 0.5), true);
  for (let i = 0; i < 5; i++) c.movers.push(walker(stroll, rng, born + rng.range(0, 1)));

  // ---- the ducks, the constable, and the traffic that waits for them
  /** Where a moment falls in the story: seconds from the camera's arrival at the close-up, and which telling of it this is. */
  const story = (t: number): { u: number; n: number } => {
    const tc = c.closeup();
    if (tc != null) return { u: t - tc, n: 0 };
    const first = born + 16;
    const n = Math.max(0, Math.floor((t - first + STORY_EVERY - 14) / STORY_EVERY));
    return { u: t - first - n * STORY_EVERY, n };
  };
  const closed = (t: number): boolean => {
    if (t < born) return false;
    const { u } = story(t);
    return u >= HOLD_FROM && u < COP_HOME;
  };
  c.halt({ x: c.ox + (ZX0 + ZX1) / 2, y: c.oy + KERB + 3, r: 2.0, closed });
  // (the far lane stops well short: a waiting bus would otherwise stand between the camera and the ducks)
  c.halt({ x: c.ox + (ZX0 + ZX1) / 2, y: c.oy + FARKERB - 3, r: 7.0, closed });

  // the way the ducks go: off the park's path, over the pavement, across the stripes, and away along the far pavement
  const way = new Route(
    rounded([W(DUCK_X - 1.9, 40.8), W(DUCK_X + 0.3, 42.2), W(DUCK_X, 44.4), W(DUCK_X, KERB - 0.15), W(DUCK_X, FARKERB + 0.15), W(DUCK_X, FARKERB + 1.75), W(DUCK_X + 0.9, FARKERB + 2.25), W(DUCK_X + 7.3, FARKERB + 2.25)], false, 0.6),
    false,
  );
  const sKerb = along(way, c.ox + DUCK_X, c.oy + KERB - 0.15);
  const sEnd = way.length;
  const ducks = (["duck", "duckling"] as const).map((kind) => [false, true].map((flip) => [0, 0.07].map((hop) => makeSprite((p) => duckOn(p.card(0, 0, hop, flip), kind, 1.4), 0, 70))));
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + DUCK_X, c.oy + 52, 0, 16)) return;
    const { u, n } = story(m.t);
    // they wait in a line at the kerb, the mother dithering as the moment comes; then they go
    let lead = sKerb;
    if (u >= DUCKS_GO) lead = sKerb + DUCK_SPEED * (u - DUCKS_GO);
    else if (u > COP_SET) lead = sKerb - 0.22 + 0.22 * Math.abs(Math.sin((u - COP_SET) * 2.1));
    // each telling of the story they sketch themselves in again, back at the kerb
    const from = n === 0 ? born : m.t - (u + (STORY_EVERY - 14)) + 0.4;
    for (let i = 0; i < 7; i++) {
      const s = lead - (i === 0 ? 0 : 0.2 + i * DUCK_GAP);
      if (s >= sEnd) continue;
      way.pos(Math.max(0.05, s), P);
      const h = way.heading(Math.max(0.3, s), 0.6);
      const moving = u >= DUCKS_GO && s > 0.05;
      const hop = moving ? Math.floor(m.t * 6.5 + i * 0.6) & 1 : 0;
      // over the last stretch they un-draw themselves: colour first, then the lines
      const left = (sEnd - s) / 2.4;
      const t0 = left < 1 ? m.t - left * 1.08 : from;
      m.put(ducks[i === 0 ? 0 : 1][right(h) ? 0 : 1][hop], P[0], P[1], P[2], t0);
    }
  });

  const cop = (pose: Pose, flip: boolean) => makeSprite((p) => bobby(p, 0, 0, 0, pose, flip, new Rng(5)), 0, 88);
  const copStand = cop("stand", false);
  const copHalt = cop("wave", false);
  const copOut = [cop("walkA", true), cop("walkB", true)];
  const copBack = [cop("walkA", false), cop("walkB", false)];
  const post: V2 = [ZX1 - 0.45, KERB - 1.0];
  const mid = (KERB + FARKERB) / 2;
  c.movers.push((m) => {
    if (m.t < born) return;
    const { u } = story(m.t);
    const stride = Math.floor(m.t * 3) & 1;
    let y = post[1];
    let s = copStand;
    if (u >= COP_OUT && u < COP_SET) {
      y = post[1] + (mid - post[1]) * smooth(COP_OUT, COP_SET, u);
      s = copOut[stride];
    } else if (u >= COP_SET && u < COP_BACK) {
      y = mid;
      s = copHalt;
    } else if (u >= COP_BACK && u < COP_HOME) {
      y = mid + (post[1] - mid) * smooth(COP_BACK, COP_HOME, u);
      s = copBack[stride];
    }
    m.put(s, c.ox + post[0], c.oy + y, c.oz, born);
  });
}

// ---------------------------------------------------------------- the block

export const palace: LondonBuilder = (c) => {
  c.early(() => ground(c));
  crossing(c);
  palaceBuilding(c);
  fence(c);
  memorial(c);
  mall(c);
  park(c);
  ride(c);
  const jumpers = crowd(c);
  motion(c, jumpers);
};
