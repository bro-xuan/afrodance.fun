// St Paul's: Wren's cathedral on a low terrace in the middle of the City, its
// dome over everything. The west front with its two towers looks along the
// street, the long south side looks at the river, and a broad way runs down
// from the transept to the footbridge. A choir in red sings on the transept
// steps, a pavement artist works in the court below, a child keeps sending
// the pigeons up round the dome, and a white ship moored at the embankment
// serves lunch.

import { Rng, V2, V3, clamp, ease, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx, WATER } from "../city";
import { Route, cyclist, drape, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import {
  Look,
  Pose,
  W_FINE,
  W_THIN,
  archWindow,
  bench,
  bike,
  bulb,
  cafeTable,
  dog,
  flag,
  globeLamp,
  hat,
  lamp,
  lightString,
  office,
  person,
  pigeon,
  pigeonOn,
  portico,
  pub,
  randomLook,
  snapper,
  speckle,
  stall,
  steps,
  suit,
  tree,
  tufts,
  umbrella,
  unionJack,
  windowAt,
  windowGrid,
} from "../props";

const STONE = C.portland;
const STONE_L = C.portlandLight;
const STONE_D = C.portlandDark;
const LEAD_D = hex("#6f7b88");
const DOORWAY = hex("#4a3d33");
const ROBE = hex("#b3261e");
const WAY = hex("#f6f1e6");
const PINK_GRANITE = hex("#d8b9a4");

/** The cathedral stands on a low terrace: its height, and its edges. */
const T = 0.6;
const PX0 = 4.6;
const PX1 = 43.3;
const PY0 = 4.6;
const PY1 = 30.5;
/** The broad steps from the terrace down to the way from the bridge. */
const SX0 = 24.5;
const SX1 = 33.5;
const SY1 = 32.4;
/** The crossing, under the dome, and the height of the walls (above the terrace). */
const CX = 26;
const CY = 18;
const WALL = 9;
/** The west towers: where each stands, and how wide it is. The south one carries the clock. */
const TWR_X = 36.7;
const TWR_S = 3.6;
const TWR_SOUTH = 22.2;
const TWR_NORTH = 10.2;
/** The front of the south transept, where the choir stands. */
const FRONT = 26.5;
/** Where the pigeons like to be. */
const PIGEONS: V2 = [18.2, 37.2];

const STATUE: Look = { skin: C.white, hair: C.stone, top: C.white, legs: C.stone, long: false, hat: null };

/** Height of the ground: the terrace, and the steps down from it. */
function groundZ(x: number, y: number): number {
  if (x > PX0 && x < PX1 && y > PY0 && y <= PY1) return T;
  if (x >= SX0 && x <= SX1 && y > PY1 && y < SY1) return T * (1 - (y - PY1) / (SY1 - PY1));
  return 0;
}

/** The outline of a round-headed opening. */
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

/** A long outline for a ship's hull seen from above: flat stern, pointed bow towards +x. */
function hull(L: number, B: number, bow = 0.22): V2[] {
  const h = L / 2;
  const b = B / 2;
  return [
    [-h, -b * 0.7],
    [-h + L * 0.06, -b],
    [h - L * bow, -b],
    [h - L * bow * 0.45, -b * 0.7],
    [h, 0],
    [h - L * bow * 0.45, b * 0.7],
    [h - L * bow, b],
    [-h + L * 0.06, b],
    [-h, b * 0.7],
  ];
}

/** Is a direction round a drum turned towards the camera? */
const faces = (t: number, slack = 0.25) => Math.cos(t - Math.PI / 4) > -slack;

// ---------------------------------------------------------------- the ground

function ground(c: LondonCtx): void {
  const { pen } = c;
  // the terrace, with a low wall along the sides that look down on the street
  pen.obj(() => {
    pen.box(PX0, PY0, 0, PX1 - PX0, PY1 - PY0, T, STONE_D, { top: C.plaza });
    for (const [x, y, w, d] of [
      [PX0, PY1 - 0.3, SX0 - PX0, 0.3],
      [SX1, PY1 - 0.3, PX1 - SX1, 0.3],
      [PX1 - 0.3, PY0, 0.3, 13.6 - PY0],
      [PX1 - 0.3, 22.4, 0.3, PY1 - 22.7],
    ]) {
      pen.box(x, y, T, w, d, 0.5, STONE_L, { w: W_FINE });
    }
  });
  steps(pen, SX0, PY1, 0, SX1 - SX0, SY1 - PY1, T, 4, STONE_L);

  const g = pen.floor(T, 1);
  const g2 = pen.floor(T, 2);
  // the churchyard lawn, south of the choir
  g.rect(5.6, 23.5, 21, 29.4, C.grass, { outline: true, w: W_THIN });
  tufts(g2, 5.8, 23.7, 20.8, 29.2, 0.35, (a, b) => !(a > 14.3 && a < 19.9 && b > 24 && b < 27.6));
  // rings of paving in front of the transept, speckle elsewhere
  for (const r of [3.4, 3.85]) g2.arc(CX, FRONT, r, r, 0.1, Math.PI - 0.1, { w: 0.05, color: C.streetDark, kind: L_MARK, wobble: 0.5, seg: 20 });
  speckle(g2, 30.2, 22.8, 43, 30.1, C.streetDark, 0.3);
  speckle(g2, 40.7, 4.9, 43, 9.8, C.streetDark, 0.3);

  const s = pen.floor(0, 1);
  const s2 = pen.floor(0, 2);
  // the way down to the bridge: pale stone, banded like broad shallow steps
  s.rect(25.5, SY1, 32.5, 47.95, WAY, { grain: 0.6 });
  for (let y = SY1 + 1.6; y < 45.6; y += 2.15) s2.seg(25.6, y, 32.4, y, { w: 0.05, color: C.flagDark, kind: L_MARK, wobble: 0.3 });
  for (const x of [25.5, 32.5]) s2.seg(x, SY1, x, 47.9, { w: 0.06, color: C.flagDark, kind: L_MARK });
  // the court below the terrace on the left
  s.rect(4.4, PY1 + 0.02, 25.5, 42.6, C.plaza, { grain: 0.7 });
  speckle(s2, 4.6, 31.3, 25.3, 42.4, C.streetDark, 0.3);
  // on the right, a cobbled lane and a lawn with a paved circle in the middle
  s.rect(34, 31.2, 43.95, 33.6, C.street, { grain: 0.8 });
  s2.ticks(34.2, 31.4, 43.8, 33.4, { n: 70, len: 0.4, ang: 0, jit: 0.05, color: C.streetDark, w: 0.05 });
  s2.seg(34, 33.6, 43.95, 33.6, { w: 0.06, color: C.streetDark, kind: L_MARK });
  s.rect(34.4, 34.5, 43.4, 41.9, C.grass, { outline: true, w: W_THIN });
  tufts(s2, 34.6, 34.7, 43.2, 41.7, 0.4, (a, b) => Math.hypot(a - 38.9, b - 38.2) > 2);
  s2.circle(38.9, 38.2, 1.75, C.plaza, { outline: true, w: W_FINE, seg: 16 });
  // the riverside walk, either side of the way
  for (const [x0, x1] of [
    [4.3, 25.5],
    [32.5, 43.95],
  ]) {
    s.rect(x0, 42.6, x1, 47.95, C.flag, { grain: 0.6 });
    s2.seg(x0, 42.6, x1, 42.6, { w: 0.06, color: C.flagDark, kind: L_MARK });
    s2.ticks(x0 + 0.2, 42.9, x1 - 0.2, 47.3, { n: Math.round((x1 - x0) * 1.6), len: 1.0, ang: Math.PI / 2, jit: 0.02, color: C.flagDark, w: 0.04, alpha: 0.7 });
  }
}

// ---------------------------------------------------------------- the cathedral

/**
 * Two storeys of wall, bay by bay: paired pilasters, a round-headed window
 * below, a smaller one under a little pediment above. `door` puts a doorway
 * in that bay instead of its lower window.
 */
function bays(f: Plane, rng: Rng, a0: number, n: number, bay: number, door = -1): void {
  const a1 = a0 + n * bay;
  f.rect(a0, 0, a1, 0.7, STONE_D, { grain: 0.7 });
  f.rect(a0, 4.45, a1, 4.95, STONE_L, { grain: 0.4, layer: 1 });
  f.seg(a0, 4.45, a1, 4.45, { w: W_FINE, layer: 1 });
  f.rect(a0, WALL - 0.55, a1, WALL, STONE_L, { grain: 0.4, layer: 1 });
  f.seg(a0, WALL - 0.55, a1, WALL - 0.55, { w: W_THIN, layer: 1 });
  for (let i = 0; i <= n; i++) {
    const a = clamp(a0 + i * bay, a0 + 0.3, a1 - 0.3);
    for (const [b0, b1] of [
      [0.7, 4.45],
      [4.95, WALL - 0.55],
    ]) {
      for (const d of [-0.15, 0.15]) f.rect(a + d - 0.09, b0, a + d + 0.09, b1, STONE_L, { grain: 0.4, outline: true, w: 0.035, ink: STONE_D });
    }
  }
  for (let i = 0; i < n; i++) {
    const m = a0 + (i + 0.5) * bay;
    const ww = Math.min(0.62, bay * 0.27);
    if (i === door) f.poly(archShape(m - 0.8, 0, m + 0.8, 3.4), DOORWAY, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
    else archWindow(f, m - ww, 1.15, m + ww, 3.75, rng.chance(0.75), STONE_L);
    windowAt(f, m - ww * 0.8, 5.55, m + ww * 0.8, 7.25, rng.chance(0.6), STONE_L, false);
    f.poly(
      [
        [m - ww - 0.1, 7.4],
        [m + ww + 0.1, 7.4],
        [m, 7.9],
      ],
      STONE_L,
      { outline: true, w: 0.035, layer: 1, grain: 0.3 },
    );
  }
}

/** The face of the clock, without its hands (they are drawn every frame). */
function dial(f: Plane, a: number, b: number, r: number): void {
  f.circle(a, b, r, C.gold, { outline: true, w: W_FINE, layer: 1, seg: 16, grain: 0.3 });
  f.circle(a, b, r * 0.84, C.white, { layer: 2, seg: 16, grain: 0.2, glow: 0.9 });
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    f.seg(a + Math.sin(t) * r * 0.62, b + Math.cos(t) * r * 0.62, a + Math.sin(t) * r * 0.76, b + Math.cos(t) * r * 0.76, { w: 0.05, wobble: 0, layer: 3 });
  }
}

/** One of the two west towers, from the roof up: a square stage, a round colonnaded one, a lead cap. */
function tower(pen: Pen, y0: number, clock: boolean, delay: number): void {
  const x0 = TWR_X;
  const s = TWR_S;
  const cx = x0 + s / 2;
  const cy = y0 + s / 2;
  pen.obj(() => {
    pen.box(x0, y0, WALL, s, s, 4.2, STONE, { glow: 0.2 });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, x0, y0, WALL, s, s);
      for (const a of [0.3, s - 0.3]) f.rect(a - 0.14, 0.2, a + 0.14, 3.7, STONE_L, { grain: 0.4, outline: true, w: 0.035, ink: STONE_D });
      if (clock) dial(f, s / 2, 2.2, 1.1);
      else {
        // the other tower holds the bells, behind louvres
        f.circle(s / 2, 2.2, 1.0, STONE_L, { outline: true, w: W_FINE, layer: 1, seg: 14, grain: 0.3 });
        f.circle(s / 2, 2.2, 0.78, C.charcoal, { layer: 2, seg: 12, grain: 0.5 });
        for (const b of [1.85, 2.2, 2.55]) f.seg(s / 2 - 0.6, b, s / 2 + 0.6, b, { w: 0.05, color: STONE_D, kind: L_MARK, wobble: 0, layer: 3 });
      }
      f.rect(0, 3.75, s, 4.2, STONE_L, { grain: 0.4, layer: 1 });
      f.seg(0, 3.75, s, 3.75, { w: W_FINE, layer: 1 });
    }
    for (const [ux, uy] of [
      [x0 + 0.3, y0 + 0.3],
      [x0 + s - 0.3, y0 + 0.3],
      [x0 + s - 0.3, y0 + s - 0.3],
      [x0 + 0.3, y0 + s - 0.3],
    ]) {
      pen.cone(ux, uy, WALL + 4.2, 0.24, 0.8, STONE_L, { seg: 6, w: W_FINE });
    }
  }, delay);
  pen.obj(() => {
    const z = WALL + 4.2;
    pen.cyl(cx, cy, z, 1.3, 2.6, STONE, { seg: 10, glow: 0.2 });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + 0.39;
      if (!faces(t)) continue;
      pen.pole([cx + Math.cos(t) * 1.6, cy + Math.sin(t) * 1.6, z + 0.15], [cx + Math.cos(t) * 1.6, cy + Math.sin(t) * 1.6, z + 2.45], 0.34, STONE_L);
      const u = t + Math.PI / 8;
      if (faces(u, 0)) {
        pen.stroke(
          [
            [cx + Math.cos(u) * 1.33, cy + Math.sin(u) * 1.33, z + 0.6],
            [cx + Math.cos(u) * 1.33, cy + Math.sin(u) * 1.33, z + 2.0],
          ],
          { w: 0.3, color: C.charcoal, kind: L_BAR, wobble: 0 },
        );
      }
    }
    pen.cyl(cx, cy, z + 2.6, 1.85, 0.32, STONE_L, { seg: 12, w: W_THIN });
  }, delay + 0.12);
  pen.obj(() => {
    const z = WALL + 4.2 + 2.92;
    pen.dome(cx, cy, z, 1.35, 1.5, C.lead, { seg: 12, rings: 3 });
    pen.card(cx, cy, z + 1.42).ellipse(0, 0.32, 0.2, 0.32, C.gold, { outline: true, w: 0.035, seg: 8, grain: 0.2, glow: 0.5 });
  }, delay + 0.24);
}

/** The dome: a podium, a drum ringed with columns, an attic, the lead dome, the lantern, the ball and cross. */
function dome(pen: Pen, rng: Rng): void {
  const lit = 0.42;
  pen.obj(() => {
    pen.cyl(CX, CY, WALL, 5.9, 2.2, STONE, { seg: 20, top: STONE_L, glow: 0.25 });
  }, 0.12);
  // the drum and its colonnade; a window between each pair of columns
  pen.obj(() => {
    const z0 = WALL + 2.2;
    pen.cyl(CX, CY, z0, 4.5, 5.2, STONE, { seg: 18, glow: lit });
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2 + 0.13;
      if (!faces(t, 0.3)) continue;
      const x = CX + Math.cos(t) * 5.3;
      const y = CY + Math.sin(t) * 5.3;
      pen.pole([x, y, z0 + 0.25], [x, y, z0 + 4.8], 0.46, STONE_L);
      const u = t + Math.PI / 24;
      if (!faces(u, 0.1)) continue;
      const wx = CX + Math.cos(u) * 4.56;
      const wy = CY + Math.sin(u) * 4.56;
      pen.stroke(
        [
          [wx, wy, z0 + 1.3],
          [wx, wy, z0 + 3.8],
        ],
        { w: 0.36, color: C.glass, kind: L_BAR, wobble: 0 },
      );
      if (i % 2 === 0) bulb(pen, wx, wy, z0 + 2.5, 0.3);
    }
    pen.cyl(CX, CY, z0 + 5.0, 5.7, 0.7, STONE_L, { seg: 20, glow: lit });
  }, 0.24);
  // the gallery round the top of the colonnade, and the plainer drum behind it
  pen.obj(() => {
    const z0 = WALL + 7.9;
    pen.cyl(CX, CY, z0, 5.6, 0.45, STONE_L, { seg: 20, w: W_THIN });
    pen.cyl(CX, CY, z0 + 0.45, 4.75, 2.1, STONE, { seg: 18, glow: lit });
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2 + 0.2;
      if (!faces(t, 0.05)) continue;
      const wx = CX + Math.cos(t) * 4.82;
      const wy = CY + Math.sin(t) * 4.82;
      pen.stroke(
        [
          [wx, wy, z0 + 1.0],
          [wx, wy, z0 + 1.95],
        ],
        { w: 0.3, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.cyl(CX, CY, z0 + 2.55, 5.0, 0.3, STONE_L, { seg: 18, w: W_THIN });
    // visitors who have climbed to the gallery, looking out over the City
    for (const deg of [-18, 12, 50, 84, 112]) {
      const t = (deg * Math.PI) / 180;
      person(pen, CX + Math.cos(t) * 5.2, CY + Math.sin(t) * 5.2, z0 + 0.45, randomLook(rng), deg === 50 ? "wave" : "stand", deg > 45, 0.56);
    }
    // floodlights at the foot of the drum
    for (const deg of [-30, 5, 45, 85, 120]) {
      const t = (deg * Math.PI) / 180;
      pen.stroke(
        [
          [CX + Math.cos(t) * 5.8, CY + Math.sin(t) * 5.8, WALL + 2.5],
          [CX + Math.cos(t) * 5.8 + 0.03, CY + Math.sin(t) * 5.8, WALL + 2.5],
        ],
        { w: 2.4, kind: L_LIGHT, wobble: 0, alpha: 0.22 },
      );
    }
  }, 0.36);
  // the dome itself, ribbed in lead
  pen.obj(() => {
    const z0 = WALL + 10.75;
    pen.dome(CX, CY, z0, 4.85, 6.2, C.lead, { seg: 20, rings: 6, glow: 0.22 });
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2 + 0.1;
      if (!faces(t, 0.1)) continue;
      const rib: V3[] = [];
      for (let k = 0; k <= 6; k++) {
        const ph = (k / 6) * Math.PI * 0.485;
        rib.push([CX + Math.cos(t) * Math.cos(ph) * 4.9, CY + Math.sin(t) * Math.cos(ph) * 4.9, z0 + Math.sin(ph) * 6.25]);
      }
      pen.stroke(rib, { w: 0.07, color: LEAD_D, kind: L_MARK, wobble: 0.2 });
    }
  }, 0.48);
  // the gilded gallery, the lantern, the ball and the cross
  pen.obj(() => {
    const z0 = WALL + 16.6;
    pen.cyl(CX, CY, z0, 1.55, 0.3, C.gold, { seg: 12, w: W_FINE });
    pen.cyl(CX, CY, z0 + 0.3, 0.95, 2.3, STONE_L, { seg: 10, glow: 0.4 });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + 0.3;
      if (!faces(t, 0)) continue;
      pen.stroke(
        [
          [CX + Math.cos(t) * 0.99, CY + Math.sin(t) * 0.99, z0 + 0.8],
          [CX + Math.cos(t) * 0.99, CY + Math.sin(t) * 0.99, z0 + 2.1],
        ],
        { w: 0.2, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.cyl(CX, CY, z0 + 2.6, 1.15, 0.22, STONE_L, { seg: 10, w: W_FINE });
    pen.dome(CX, CY, z0 + 2.82, 0.95, 0.85, C.lead, { seg: 10, rings: 3 });
    const k = pen.card(CX, CY, z0 + 3.6);
    k.circle(0, 0.4, 0.4, C.gold, { outline: true, w: W_FINE, seg: 10, grain: 0.2, glow: 0.6 });
    k.rect(-0.07, 0.78, 0.07, 1.8, C.gold, { outline: true, w: 0.03, grain: 0.2, glow: 0.6, layer: 1 });
    k.rect(-0.38, 1.3, 0.38, 1.44, C.gold, { outline: true, w: 0.03, grain: 0.2, glow: 0.6, layer: 2 });
  }, 0.6);
}

function church(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(0, 0, T);

  // the east end: choir and apse
  pen.obj(() => {
    pen.cyl(13, CY, 0, 4.4, WALL, STONE, { seg: 14, top: C.lead });
    pen.box(13, 13.5, 0, 9, 9, WALL, STONE, { top: C.lead });
    bays(pen.wall("y+", 13, 13.5, 0, 9, 9), rng, 0, 4, 2.25);
  });
  // the transepts, with the south door
  pen.obj(() => {
    pen.box(22, 9.5, 0, 8, 17, WALL, STONE, { top: C.lead });
    bays(pen.wall("y+", 22, 9.5, 0, 8, 17), rng, 0, 3, 8 / 3, 1);
    const e = pen.wall("x+", 22, 9.5, 0, 8, 17);
    bays(e, rng, 0, 2, 2);
    bays(e, rng, 13, 2, 2);
  }, 0.04);
  // the nave
  pen.obj(() => {
    pen.box(30, 13.5, 0, 6.5, 9, WALL, STONE, { top: C.lead });
    bays(pen.wall("y+", 30, 13.5, 0, 6.5, 9), rng, 0, 3, 6.5 / 3);
  }, 0.08);
  // the west end, wider than the nave, which the towers stand on
  pen.obj(() => {
    pen.box(36.5, 10, 0, 4, 16, WALL, STONE, { top: C.lead });
    bays(pen.wall("y+", 36.5, 10, 0, 4, 16), rng, 0, 2, 2);
    const f = pen.wall("x+", 36.5, 10, 0, 4, 16);
    bays(f, rng, 0, 2, 2.2);
    bays(f, rng, 11.6, 2, 2.2);
    // behind the portico: the great door, a lesser one each side, the windows over them
    f.poly(archShape(7.1, 0.9, 8.9, 4.3), DOORWAY, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
    for (const a of [5.5, 10.5]) f.poly(archShape(a - 0.5, 0.9, a + 0.5, 3.2), DOORWAY, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
    archWindow(f, 7.2, 5.9, 8.8, 8.3, true, STONE_L);
    for (const a of [5.5, 10.5]) archWindow(f, a - 0.45, 6.0, a + 0.45, 8.0, true, STONE_L);
  }, 0.12);

  // roofs, the transept's pediment, and balustrades along the tops of the walls
  pen.obj(() => {
    pen.gable(13, 14.1, WALL, 9, 7.8, 1.5, "x", C.lead);
    pen.cone(13, CY, WALL, 4.2, 1.4, C.lead, { seg: 14 });
    pen.gable(30, 14.1, WALL, 6.5, 7.8, 1.5, "x", C.lead);
    pen.gable(22.6, 9.5, WALL, 6.8, 17, 1.7, "y", C.lead, { gable: STONE });
    const f = pen.wall("y+", 22.6, 9.5, WALL, 6.8, 17);
    f.poly(
      [
        [0.8, 0.14],
        [6.0, 0.14],
        [3.4, 1.42],
      ],
      STONE_D,
      { outline: true, w: W_FINE, grain: 0.6 },
    );
    // a phoenix, carved rising from its fire
    f.ellipse(3.4, 0.5, 0.42, 0.24, STONE_L, { layer: 1, seg: 8, grain: 0.3, outline: true, w: 0.035, ink: STONE_D });
    f.line(
      [
        [2.7, 0.75],
        [3.4, 0.55],
        [4.1, 0.75],
      ],
      { w: 0.07, color: STONE_L, kind: L_MARK, wobble: 0.2, layer: 1 },
    );
    for (const [x, y, w, d] of [
      [13, 22.3, 9, 0.2],
      [30, 22.3, 6.5, 0.2],
      [29.8, 22.5, 0.2, 4],
      [36.5, 25.8, 4, 0.2],
      [40.3, 14.2, 0.2, 7.6],
    ]) {
      pen.box(x, y, WALL, w, d, 0.5, STONE_L, { w: W_FINE });
    }
  }, 0.2);
  // three saints on the transept
  for (const [x, z, s] of [
    [22.9, WALL + 0.05, 0.55],
    [26, WALL + 1.7, 0.62],
    [29.1, WALL + 0.05, 0.55],
  ]) {
    pen.obj(() => person(pen, x, FRONT - 0.15, z, STATUE, "stand", x > 26, s), 0.3);
  }

  // the south transept's porch: a half circle of columns on a half circle of steps
  pen.obj(() => {
    for (const [r, z] of [
      [3.0, 0],
      [2.6, 0.3],
      [2.2, 0.6],
    ]) {
      pen.cyl(CX, FRONT, z, r, 0.3, STONE_L, { seg: 18, w: W_THIN });
    }
    for (const deg of [18, 47, 76, 104, 133, 162]) {
      const t = (deg * Math.PI) / 180;
      pen.cyl(CX + Math.cos(t) * 1.9, FRONT + Math.sin(t) * 1.9, 0.9, 0.2, 3.4, STONE_L, { seg: 6, w: W_FINE });
    }
    pen.cyl(CX, FRONT, 4.3, 2.25, 0.55, STONE_L, { seg: 16, w: W_THIN });
    pen.dome(CX, FRONT, 4.85, 2.0, 0.7, C.lead, { seg: 14, rings: 2 });
  }, 0.28);

  dome(pen, rng);
  tower(pen, TWR_NORTH, false, 0.26);
  tower(pen, TWR_SOUTH, true, 0.3);

  // the west front: two storeys of columns under a pediment, and the steps down to the street.
  // (Turned so that it looks along +x: in here x runs across the front and y out from it.)
  pen.push(40.5, 21.6, 0, 270);
  pen.obj(() => {
    pen.box(-0.3, 0, 0, 7.8, 1.4, 0.9, STONE, { top: STONE_L });
    portico(pen, 0, 0, 0.9, 7.2, 1.4, 3.7, 6, { pediment: 0 });
  }, 0.24);
  pen.obj(() => {
    portico(pen, 1.1, 0, 5.3, 5.0, 1.4, 3.0, 4);
    // St Paul on the peak, an apostle at each end
    person(pen, 3.6, 0.95, 9.82, STATUE, "wave", false, 0.6);
    person(pen, 1.05, 0.95, 9.0, STATUE, "stand", false, 0.52);
    person(pen, 6.15, 0.95, 9.0, STATUE, "stand", true, 0.52);
  }, 0.42);
  steps(pen, -0.6, 1.4, -T, 8.4, 2.0, 0.9 + T, 6, STONE_L);
  // lamps that wash the front with light after dark
  for (const a of [0.4, 2.5, 4.7, 6.8]) {
    pen.stroke(
      [
        [a, 1.45, 1.0],
        [a + 0.03, 1.45, 1.0],
      ],
      { w: 1.6, kind: L_LIGHT, wobble: 0, alpha: 0.28 },
    );
  }
  pen.pop();

  pen.pop();
}

// ---------------------------------------------------------------- behind the cathedral

/** The Old Bailey's copper dome with Justice on top, an office in stone, and Temple Bar. */
function cityBehind(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(5.4, 5.2, T);
  pen.obj(() => {
    pen.box(0, 0, 0, 6.2, 5.6, 10.4, STONE, { top: STONE_D });
    for (const side of ["y+", "x+"] as const) {
      const f = pen.wall(side, 0, 0, 0, 6.2, 5.6);
      const len = side === "y+" ? 6.2 : 5.6;
      f.rect(0, 0, len, 2.6, STONE_D, { grain: 0.8 });
      windowGrid(f, rng, 0.3, 3.0, len - 0.3, 9.8, 4, 3, { lit: 0.6, trim: STONE_L, fillA: 0.5, fillB: 0.7 });
      f.rect(0, 9.9, len, 10.4, STONE_L, { grain: 0.4, layer: 1 });
    }
  });
  pen.obj(() => {
    pen.cyl(3.1, 2.8, 10.4, 1.9, 1.7, STONE_L, { seg: 12 });
    pen.dome(3.1, 2.8, 12.1, 1.95, 2.3, C.copper, { seg: 14, rings: 4 });
    // Justice, gilt: a sword up in her right hand, the scales in her left
    const q = 1.55;
    const P = (pts: V2[]): V2[] => pts.map((p) => [p[0] * q, p[1] * q]);
    const k = pen.card(3.1, 2.8, 14.35);
    k.circle(0, 0.2 * q, 0.22 * q, C.gold, { outline: true, w: 0.035, seg: 8, grain: 0.2, glow: 0.5 });
    k.poly(
      P([
        [-0.26, 0.4],
        [0.26, 0.4],
        [0.16, 1.25],
        [-0.16, 1.25],
      ]),
      C.gold,
      { outline: true, w: 0.035, layer: 1, grain: 0.2, glow: 0.5 },
    );
    k.circle(0, 1.42 * q, 0.17 * q, C.gold, { outline: true, w: 0.035, layer: 2, seg: 7, grain: 0.2, glow: 0.5 });
    const arm = { w: 0.1, color: C.gold, kind: L_BAR, wobble: 0, layer: 3 };
    k.line(P([[-0.15, 1.15], [-0.66, 1.2]]), arm);
    k.line(P([[0.15, 1.15], [0.66, 1.2]]), arm);
    k.line(P([[0.66, 1.2], [0.66, 2.15]]), { ...arm, w: 0.08 });
    k.line(P([[-0.66, 1.2], [-0.66, 0.95]]), { ...arm, w: 0.05 });
    k.line(P([[-0.92, 0.95], [-0.4, 0.95]]), { ...arm, w: 0.07 });
    for (const a of [-0.9, -0.42]) k.circle(a * q, 0.86 * q, 0.1 * q, C.gold, { layer: 3, seg: 6, grain: 0.2 });
  }, 0.3);
  pen.pop();

  // two offices in stone, where they show between the dome and the north tower
  pen.push(22.6, 4.9, T);
  office(pen, rng, 7.2, 4.3, 13, { style: "stone" });
  pen.pop();
  pen.push(30.6, 4.9, T);
  office(pen, rng, 5.6, 4.4, 16, { style: "stone", plant: false });
  pen.pop();

  // Temple Bar: the old gateway to the City, rebuilt here beside the cathedral
  pen.push(40.3, 5.6, T);
  pen.obj(() => {
    pen.box(0, 0, 0, 3.0, 1.3, 5.0, STONE);
    const f = pen.wall("y+", 0, 0, 0, 3.0, 1.3);
    f.poly(archShape(0.95, 0, 2.05, 2.7), DOORWAY, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
    for (const a of [0.42, 2.58]) f.poly(archShape(a - 0.24, 0, a + 0.24, 1.5), DOORWAY, { outline: true, w: 0.04, layer: 1, grain: 0.6 });
    f.rect(0, 2.95, 3.0, 3.25, STONE_L, { grain: 0.4, layer: 1 });
    // a king in each niche
    for (const a of [0.85, 2.15]) {
      f.poly(archShape(a - 0.28, 3.4, a + 0.28, 4.55), STONE_D, { outline: true, w: 0.035, layer: 1 });
      f.ellipse(a, 3.85, 0.13, 0.36, STONE_L, { layer: 2, seg: 7, grain: 0.2 });
    }
    f.rect(0, 4.7, 3.0, 5.0, STONE_L, { grain: 0.4, layer: 1 });
  });
  pen.obj(() => pen.gable(0.4, 0, 5.0, 2.2, 1.3, 0.9, "y", C.lead, { gable: STONE_L }), 0.15);
  pen.pop();
}

// ---------------------------------------------------------------- the churchyard

function churchyard(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(0, 0, T);
  // the information pavilion: a folded wedge of steel and glass
  pen.obj(() => {
    const x0 = 14.6;
    const y0 = 24.3;
    pen.solid(
      [
        [x0, y0, 0],
        [x0 + 5, y0, 0],
        [x0 + 5, y0 + 3, 0],
        [x0, y0 + 3, 0],
        [x0, y0, 1.5],
        [x0 + 5, y0, 3.3],
        [x0 + 5, y0 + 3, 2.9],
        [x0, y0 + 3, 1.9],
      ],
      [
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [3, 0, 4, 7],
        [0, 1, 5, 4],
        [4, 5, 6],
        [4, 6, 7],
      ],
      C.metal,
      { w: 0.1 },
    );
    const f = pen.wall("y+", x0, y0, 0, 5, 3);
    f.poly(
      [
        [0.3, 0.2],
        [4.7, 0.2],
        [4.7, 2.5],
        [0.3, 1.6],
      ],
      C.glassLight,
      { outline: true, w: W_FINE, glow: 0.9, grain: 0.3 },
    );
    f.circle(1.1, 0.95, 0.42, C.royal, { layer: 1, seg: 10, grain: 0.2 });
    f.text("I", 1.1, 0.68, 0.5, { align: "c", color: C.white, kind: L_MARK, w: 0.09, wobble: 0, layer: 2 });
    const e = pen.wall("x+", x0, y0, 0, 5, 3);
    e.poly(
      [
        [0.3, 0.2],
        [2.7, 0.2],
        [2.7, 2.85],
        [0.3, 2.5],
      ],
      C.glassLight,
      { outline: true, w: W_FINE, glow: 0.9, grain: 0.3 },
    );
  });
  // the old preaching cross: a column with a gilt saint
  pen.obj(() => {
    pen.box(7.6, 26.0, 0, 1.2, 1.2, 0.7, STONE, { top: STONE_L, w: W_THIN });
    pen.cyl(8.2, 26.6, 0.7, 0.26, 3.6, STONE_L, { seg: 7, w: W_FINE });
    person(pen, 8.2, 26.6, 4.3, { ...STATUE, skin: C.gold, top: C.gold, legs: C.gold, hair: C.gold }, "wave", false, 0.55);
  });
  tree(pen, rng, 6.7, 24.6, { kind: "elm" });
  tree(pen, rng, 11.8, 28.2, { kind: "round" });
  tree(pen, rng, 20.4, 28.5, { kind: "blossom" });
  bench(pen, 10.0, 24.4, 0);
  person(pen, 9.6, 24.45, 0.42, randomLook(rng), "sit");
  person(pen, 10.5, 24.45, 0.42, randomLook(rng), "sit", true);
  // the verger, in black, having a word with a visitor
  person(pen, 13.4, 28.9, 0, { skin: SKIN[1], hair: HAIR[7], top: C.black, legs: C.black, long: false, hat: null }, "stand");
  person(pen, 14.3, 29.1, 0, randomLook(rng), "wave", true);
  person(pen, 18.6, 28.2, 0, randomLook(rng), "stand", true);
  person(pen, 17.2, 28.0, 0, randomLook(rng), "stand", false, 0.72);
  // Queen Anne on her plinth, beside the west front
  pen.obj(() => {
    pen.box(41.5, 24.2, 0, 1.2, 1.2, 1.5, STONE_L, { w: W_THIN });
    person(pen, 42.1, 24.8, 1.5, STATUE, "stand", false, 0.85);
    const k = pen.card(42.1, 24.8, 1.5);
    k.poly(
      [
        [-0.2, 1.84],
        [0.2, 1.84],
        [0.26, 2.06],
        [0, 1.96],
        [-0.26, 2.06],
      ],
      C.gold,
      { outline: true, w: 0.03, layer: 6, grain: 0.2 },
    );
    k.seg(0.38, 0.9, 0.44, 1.7, { w: 0.05, color: C.gold, kind: L_BAR, wobble: 0, layer: 5 });
  });
  pen.pop();
}

// ---------------------------------------------------------------- the way to the bridge

function hill(c: LondonCtx): void {
  const { pen, rng } = c;
  tree(pen, rng, 33.3, 35.6, { kind: "elm" });
  tree(pen, rng, 33.3, 40.5, { kind: "elm" });
  lamp(pen, 24.9, 35.0);
  lamp(pen, 24.9, 40.6);
  // a tour group at the top, the guide's umbrella up so they can find her
  const guide = randomLook(rng);
  guide.top = C.red;
  pen.obj(() => {
    person(pen, 27.0, 33.9, 0, guide, "wave");
    umbrella(pen, 27.0, 33.9, 0.5, C.yellow);
  });
  for (const [x, y] of [
    [26.2, 35.2],
    [27.1, 35.6],
    [27.9, 35.0],
    [26.5, 36.3],
    [27.6, 36.6],
  ]) {
    const lk = randomLook(rng);
    if (rng.chance(0.5)) snapper(pen, x, y, lk, false);
    else person(pen, x, y, 0, lk, "stand", rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  // someone photographing the dome from further down, and friends posing for it
  snapper(pen, 31.3, 41.6, randomLook(rng), true);
  person(pen, 30.6, 39.9, 0, randomLook(rng), "cheer");
  person(pen, 31.5, 39.7, 0, randomLook(rng), "wave", true);
  // two City gents, bowlers on, umbrellas up whatever the weather
  for (const [x, y, flip] of [
    [26.1, 42.6, false],
    [27.7, 43.5, true],
  ] as const) {
    pen.obj(() => {
      person(pen, x, y, 0, suit(rng), "stand", flip);
      hat(pen, x, y, 0, "bowler", { flip });
      umbrella(pen, x, y, 0, flip ? C.navy : C.black, flip);
    });
  }
  // bollards where the bridge lands
  for (const x of [26.0, 32.0]) {
    pen.pole([x, 46.6, 0], [x, 46.6, 0.7], 0.24, C.iron);
  }
}

// ---------------------------------------------------------------- the court on the left

function court(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(5.0, 33.2, 0);
  pub(pen, rng, "THE MITRE", { w: 7.4, d: 5.6, floors: 2, tiles: C.ironGreen });
  pen.pop();
  cafeTable(pen, rng, 6.6, 40.5, C.red, 3);
  cafeTable(pen, rng, 9.9, 40.7, null, 2);
  cafeTable(pen, rng, 14.0, 34.6, C.yellow, 2);
  // a coffee cart, and its queue
  pen.push(21.2, 31.5, 0);
  stall(pen, rng, { w: 2.6, d: 1.7, sign: "COFFEE", a: C.green, goods: [C.white, hex("#8b5a3c"), C.cream] });
  pen.pop();
  for (let i = 0; i < 3; i++) person(pen, 21.9 + i * 0.75, 34.4 + (i % 2) * 0.3, 0, i === 1 ? suit(rng) : randomLook(rng), "stand", i === 2);
  // bicycle couriers between jobs: bikes against the terrace wall, bags on their backs
  const bags = [C.pink, C.yellow, C.teal];
  for (let i = 0; i < 3; i++) {
    pen.push(14.2 + i * 1.9, 31.0, 0, i === 1 ? 6 : -5);
    bike(pen, { color: [C.black, C.redDark, C.blueDark][i] });
    pen.pop();
    const x = 14.8 + i * 1.7;
    const y = 32.3 + (i % 2) * 0.35;
    const lk = randomLook(rng);
    pen.obj(() => {
      const k = pen.card(x, y, 0, i === 2);
      k.rect(-0.62, 0.86, -0.12, 1.46, bags[i], { outline: true, w: W_FINE, layer: 0.5, grain: 0.3 });
      person(pen, x, y, 0, lk, i === 0 ? "wave" : "stand", i === 2);
      k.ellipse(0, 2.2, 0.38, 0.24, bags[i], { a0: 0, a1: Math.PI, outline: true, w: 0.035, layer: 6, seg: 8, grain: 0.2 });
    });
  }
  // the pavement artist: chalks, a picture taking shape on the flags, a hat for coins
  pen.obj(() => {
    const g = pen.floor(0, 2);
    g.rect(16.1, 40.5, 19.1, 42.0, hex("#e9e3d6"), { outline: true, w: 0.05, ink: C.white, grain: 0.9 });
    const g3 = pen.floor(0, 3);
    unionJack(g3, 16.3, 40.7, 1.3, 0.8, { layer: 0, fine: false, outline: false });
    g3.circle(18.25, 41.1, 0.36, C.yellow, { grain: 0.9, seg: 9 });
    for (let k = 0; k < 8; k++) {
      const t = (k / 8) * Math.PI * 2;
      g3.seg(18.25 + Math.cos(t) * 0.45, 41.1 + Math.sin(t) * 0.45, 18.25 + Math.cos(t) * 0.62, 41.1 + Math.sin(t) * 0.62, { w: 0.06, color: C.orange, kind: L_MARK, wobble: 0 });
    }
    g3.line(
      [
        [16.4, 41.75],
        [17.0, 41.6],
        [17.6, 41.8],
        [18.2, 41.62],
        [18.8, 41.8],
      ],
      { w: 0.08, color: C.blue, kind: L_MARK, wobble: 0.3 },
    );
  });
  person(pen, 19.7, 41.4, -0.2, { ...randomLook(rng), top: hex("#7d8c99"), hat: C.woodDark }, "sit", true);
  pen.cyl(15.6, 41.7, 0, 0.26, 0.2, C.black, { seg: 8, w: W_FINE });
  for (let i = 0; i < 5; i++) pen.box(19.3 + i * 0.13, 42.2, 0, 0.1, 0.34, 0.06, [C.red, C.blue, C.yellow, C.green, C.pink][i], { edges: false });
  person(pen, 16.6, 39.9, 0, randomLook(rng), "stand");
  person(pen, 17.6, 39.75, 0, randomLook(rng), "stand", true, 0.72);
  person(pen, 18.5, 39.9, 0, randomLook(rng), "wave", true);
  // the man who feeds the pigeons, one on his arm
  const feeder: Look = { skin: SKIN[0], hair: HAIR[7], top: hex("#6f8f4e"), legs: hex("#6f5d4d"), long: false, hat: hex("#8a6f52") };
  pen.obj(() => {
    person(pen, 20.2, 35.6, 0, feeder, "wave");
    const k = pen.card(20.2, 35.6, 0);
    k.rect(-0.62, 0.72, -0.34, 1.06, C.cream, { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
    pigeonOn(pen.card(20.85, 35.6, 1.86), "stand");
  });
  for (const [x, y, peck] of [
    [19.3, 35.9, true],
    [20.6, 36.5, false],
    [19.7, 36.7, true],
    [21.1, 36.0, true],
  ] as const) {
    pigeon(pen, x, y, 0, x > 20.3, peck);
  }
}

// ---------------------------------------------------------------- the lane and the garden on the right

/** A cream wedding car with white ribbons, nose towards local +x. */
function weddingCar(pen: Pen): void {
  const cream = hex("#f3ead2");
  pen.begin();
  for (const y of [-0.92, 0.92]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    for (const a of [-1.45, 1.5]) {
      q.circle(a, 0.42, 0.42, C.black, { outline: true, w: W_FINE, seg: 10, grain: 0.3 });
      q.circle(a, 0.42, 0.2, C.white, { layer: 1, seg: 7, grain: 0 });
    }
  }
  pen.box(-2.4, -0.88, 0.3, 4.8, 1.76, 0.75, cream, { w: 0.1 });
  pen.box(-1.9, -0.8, 1.05, 2.5, 1.6, 0.8, cream, { w: 0.1, top: scaleRGB(cream, 0.9) });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -1.9, -0.8, 1.05, 2.5, 1.6);
    const w = side.startsWith("y") ? 2.5 : 1.6;
    f.rect(0.15, 0.12, w - 0.15, 0.66, C.glass, { outline: true, w: 0.045, grain: 0.4 });
  }
  pen.box(0.6, -0.6, 1.05, 1.75, 1.2, 0.2, cream, { w: W_THIN });
  pen.wall("x+", -2.4, -0.88, 0.3, 4.8, 1.76).rect(0.5, 0.15, 1.26, 0.7, C.metal, { outline: true, w: 0.04, layer: 1 });
  // white ribbons from the mascot back to the windscreen
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [2.35, 0, 1.3],
        [0.62, s * 0.78, 1.32],
      ],
      { w: 0.09, color: C.white, kind: L_MARK, wobble: 0 },
    );
  }
  pen.card(2.35, 0, 1.27).circle(0, 0.14, 0.17, C.pink, { outline: true, w: 0.035, seg: 7 });
  pen.end();
}

function garden(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(39.6, 32.4, 0, 0);
  weddingCar(pen);
  pen.pop();
  // the chauffeur, checking the time
  const driver: Look = { skin: SKIN[2], hair: HAIR[0], top: C.greyDark, legs: C.greyDark, long: false, hat: null };
  pen.obj(() => {
    person(pen, 36.4, 33.1, 0, driver, "stand", true);
    hat(pen, 36.4, 33.1, 0, "cap", { flip: true, color: C.greyDark });
  });
  // the column in the middle of the lawn: a gilded urn of flames on top
  pen.obj(() => {
    const x = 38.9;
    const y = 38.2;
    pen.box(x - 0.7, y - 0.7, 0, 1.4, 1.4, 1.1, STONE, { top: STONE_L, w: W_THIN });
    pen.cyl(x, y, 1.1, 0.42, 5.6, STONE_L, { seg: 8, r2: 0.34, w: W_THIN });
    pen.box(x - 0.5, y - 0.5, 6.7, 1.0, 1.0, 0.35, STONE_L, { w: W_FINE });
    const k = pen.card(x, y, 7.05);
    k.ellipse(0, 0.3, 0.32, 0.3, C.gold, { outline: true, w: 0.035, seg: 8, grain: 0.2, glow: 0.5 });
    k.poly(
      [
        [-0.22, 0.55],
        [0.22, 0.55],
        [0.32, 0.92],
        [0.12, 0.8],
        [0, 1.3],
        [-0.12, 0.85],
        [-0.32, 0.98],
      ],
      C.orange,
      { outline: true, w: 0.035, layer: 1, grain: 0.2, glow: 0.8 },
    );
  });
  tree(pen, rng, 35.3, 35.5, { kind: "blossom" });
  tree(pen, rng, 35.3, 41.2, { kind: "round" });
  // lunch hour: office workers on the grass with their sandwiches
  const spots: [number, number][] = [
    [36.0, 37.2],
    [36.9, 37.6],
    [40.9, 36.4],
    [41.8, 37.7],
    [36.3, 40.3],
    [37.4, 40.7],
    [40.6, 40.4],
    [41.5, 39.6],
  ];
  spots.forEach(([x, y], i) => {
    const lk = i % 3 === 2 ? randomLook(rng) : suit(rng);
    pen.obj(() => {
      person(pen, x, y, -0.36, lk, "sit", i % 2 === 1);
      if (i % 2 === 0) pen.card(x, y, -0.36, false).rect(0.34, 0.7, 0.6, 0.86, C.white, { outline: true, w: 0.03, layer: 5, grain: 0 });
    });
  });
  dog(pen, 38.7, 40.9, hex("#b98352"), false, 0.9);
  bench(pen, 38.9, 35.3, 0);
  person(pen, 38.5, 35.35, 0.42, randomLook(rng), "sit");
}

// ---------------------------------------------------------------- the riverside

/** A bronze sphinx on a plinth. `flip` turns it to face the other way. */
function sphinx(pen: Pen, x: number, y: number, flip: boolean): void {
  pen.obj(() => {
    pen.box(x - 1.1, y - 0.45, 0, 2.2, 0.9, 0.55, C.granite, { top: C.graniteCap, w: W_THIN });
    const k = pen.card(x, y, 0.55, flip);
    k.ellipse(-0.1, 0.34, 0.78, 0.3, C.bronze, { outline: true, w: W_FINE, seg: 10, grain: 0.4 });
    k.circle(-0.55, 0.46, 0.34, C.bronze, { outline: true, w: W_FINE, seg: 9, layer: 1, grain: 0.4 });
    k.bar(0.3, 0.14, 0.98, 0.14, 0.2, C.bronze, { layer: 1 });
    // the head, in its striped headcloth
    k.poly(
      [
        [0.34, 0.5],
        [0.92, 0.5],
        [0.84, 1.18],
        [0.62, 1.3],
        [0.4, 1.18],
      ],
      scaleRGB(C.bronze, 0.85),
      { outline: true, w: W_FINE, layer: 2, grain: 0.4 },
    );
    k.circle(0.64, 0.92, 0.2, C.bronze, { outline: true, w: 0.035, seg: 8, layer: 3, grain: 0.3 });
  });
}

/** A white steamer moored for good and serving lunch. Bow towards local +x, waterline at z = 0. */
function lunchShip(pen: Pen, rng: Rng): void {
  pen.begin();
  pen.extrude(hull(15.5, 3.4), -0.2, 1.25, C.white, { top: C.wood, crease: 28, w: 0.11 });
  pen.extrude(hull(15.56, 3.46), 0.12, 0.34, C.navy, { crease: 28, w: W_FINE });
  const side = pen.wall("y+", -6.6, -1.7, 0, 10.8, 3.4);
  for (let a = 0.6; a < 10.6; a += 0.9) side.circle(a, 0.78, 0.15, C.glass, { outline: true, w: 0.035, seg: 7, glow: 0.9, layer: 1 });
  // the saloon, the wheelhouse and the funnel
  pen.box(-4.8, -1.25, 1.25, 8.2, 2.5, 1.5, C.white, { top: C.cream, w: 0.1 });
  for (const s of ["y+", "x+"] as const) {
    const f = pen.wall(s, -4.8, -1.25, 1.25, 8.2, 2.5);
    const len = s === "y+" ? 8.2 : 2.5;
    windowGrid(f, rng, 0.2, 0.3, len - 0.2, 1.3, s === "y+" ? 8 : 2, 1, { lit: 0.95, trim: C.white, fillA: 0.7, fillB: 0.8, bars: false });
  }
  pen.box(1.3, -0.9, 2.75, 1.9, 1.8, 1.15, C.white, { top: C.stone, w: W_THIN });
  for (const s of ["y+", "x+"] as const) pen.wall(s, 1.3, -0.9, 2.75, 1.9, 1.8).rect(0.15, 0.4, s === "y+" ? 1.75 : 1.65, 0.95, C.glass, { outline: true, w: 0.045, glow: 0.9 });
  pen.cyl(-1.7, 0, 2.75, 0.6, 2.2, C.ochre, { seg: 10, w: W_THIN, top: C.black });
  pen.cyl(-1.7, 0, 4.55, 0.63, 0.4, C.black, { seg: 10, w: W_FINE });
  // lunch on the top deck, under parasols, and at the stern
  for (const [x, y, col] of [
    [-4.1, 0.45, C.red],
    [-3.0, -0.5, C.yellow],
    [-0.3, 0.45, C.red],
    [0.5, -0.5, C.blue],
  ] as const) {
    pen.cyl(x, y, 2.75, 0.34, 0.5, C.white, { seg: 7, w: W_FINE });
    person(pen, x - 0.5, y, 2.55, randomLook(rng), "bust", false, 0.9);
    person(pen, x + 0.5, y, 2.55, randomLook(rng), "bust", true, 0.9);
    pen.pole([x, y, 3.25], [x, y, 4.5], 0.06, C.white, { ink: false });
    pen.cone(x, y, 4.25, 0.85, 0.36, col, { seg: 8, crease: 0.5, w: W_FINE });
  }
  person(pen, -6.5, 0.5, 1.05, randomLook(rng), "bust", false, 0.9);
  person(pen, -5.7, -0.4, 1.05, randomLook(rng), "bust", true, 0.9);
  // masts fore and aft, with a string of bulbs right over the ship
  pen.pole([5.2, 0, 1.25], [5.2, 0, 5.6], 0.1, C.wood);
  pen.pole([-6.9, 0, 1.25], [-6.9, 0, 4.9], 0.1, C.wood);
  pen.end();
  lightString(pen, [5.2, 0, 5.6], [-1.7, 0, 5.0], 9, 0.5);
  lightString(pen, [-1.7, 0, 5.0], [-6.9, 0, 4.9], 7, 0.4);
  flag(pen, -7.5, 0, 1.25, 2.5, "uk", 0.55);
}

function riverside(c: LondonCtx): void {
  const { pen, rng } = c;
  // the parapet: broken where the bridge lands and at the stairs down to the ship
  pen.obj(() => {
    for (const [x0, x1] of [
      [4.3, 9.9],
      [11.1, 26.3],
      [31.7, 43.9],
    ]) {
      pen.box(x0, 47.5, 0, x1 - x0, 0.36, 0.85, C.granite, { top: C.graniteCap, w: W_THIN });
    }
  });
  for (const x of [5.2, 12.2, 22.9, 25.9, 32.1, 37.9, 43.4]) globeLamp(pen, x, 47.68, 0.85, 2.4);
  // plane trees, kept to the ends of the walk so they do not stand in front of the court
  tree(pen, rng, 6.2, 44.0, { kind: "elm" });
  tree(pen, rng, 43.0, 45.3, { kind: "elm" });
  for (const [x, n] of [
    [8.4, 2],
    [36.3, 2],
    [39.8, 1],
  ]) {
    bench(pen, x, 46.4, 0);
    for (let i = 0; i < n; i++) person(pen, x - 0.42 + i * 0.84, 46.42, 0.42, randomLook(rng), "sit", i === 1);
  }
  // people leaning on the parapet, watching the river
  for (const x of [6.0, 23.9, 33.6, 35.0, 41.9]) person(pen, x, 47.1, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);

  // Cleopatra's Needle: a pink granite obelisk between two sphinxes
  pen.obj(() => {
    const x = 17.2;
    const y = 46.3;
    const b = 0.5;
    const t = 0.3;
    const z0 = 1.2;
    const z1 = 8.8;
    pen.box(x - 0.9, y - 0.9, 0, 1.8, 1.8, z0, C.granite, { top: C.graniteCap, w: W_THIN });
    pen.solid(
      [
        [x - b, y - b, z0],
        [x + b, y - b, z0],
        [x + b, y + b, z0],
        [x - b, y + b, z0],
        [x - t, y - t, z1],
        [x + t, y - t, z1],
        [x + t, y + t, z1],
        [x - t, y + t, z1],
      ],
      [
        [1, 2, 6, 5],
        [3, 0, 4, 7],
        [2, 3, 7, 6],
        [0, 1, 5, 4],
        [4, 5, 6, 7],
      ],
      PINK_GRANITE,
      { w: 0.1 },
    );
    pen.pyramid(x - t, y - t, z1, 2 * t, 2 * t, 0.75, PINK_GRANITE, { w: W_THIN });
    for (const sd of ["x+", "y+"] as const) {
      pen.wall(sd, x - 0.52, y - 0.52, z0, 1.04, 1.04).ticks(0.32, 0.4, 0.72, 6.6, { n: 16, len: 0.2, ang: 0, jit: 1.3, color: scaleRGB(PINK_GRANITE, 0.72), w: 0.045 });
    }
  });
  sphinx(pen, 14.5, 46.35, false);
  sphinx(pen, 19.9, 46.35, true);

  // stairs down the wall to a landing stage, and the ship beyond it
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, WATER, 48, 48, 2);
    const top = -WATER;
    f.poly(
      [
        [9.9, top],
        [11.1, top],
        [8.2, 1.45],
        [7.0, 1.45],
      ],
      C.graniteDark,
      { outline: true, w: W_FINE, grain: 0.7 },
    );
    for (let k = 1; k < 9; k++) {
      const u = k / 9;
      f.seg(9.9 - 2.9 * u, top - (top - 1.45) * u, 11.1 - 2.9 * u, top - (top - 1.45) * u, { w: 0.04, color: C.graniteCap, kind: L_MARK, wobble: 0, layer: 1 });
    }
    f.seg(11.25, top + 0.75, 8.35, 2.2, { w: 0.07, color: C.iron, kind: L_BAR, wobble: 0, layer: 1 });
    pen.box(6.3, 48, WATER + 1.05, 2.4, 1.75, 0.25, C.wood, { top: hex("#d9b184"), w: W_THIN });
    for (const x of [6.4, 8.6]) pen.pole([x, 49.6, WATER - 0.1], [x, 49.6, WATER + 1.9], 0.2, C.woodDark);
  });
  pen.push(13.7, 51.4, WATER, 0);
  lunchShip(pen, rng);
  pen.pop();
  person(pen, 7.4, 48.9, WATER + 1.3, { skin: SKIN[1], hair: HAIR[0], top: C.white, legs: C.black, long: false, hat: null }, "wave");
}

// ---------------------------------------------------------------- people on the terrace and the steps

function crowd(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(0, 0, T);
  // listening to the choir
  for (const [x, y, pose, s] of [
    [22.5, 29.6, "stand", 1],
    [23.2, 30.0, "stand", 0.72],
    [28.9, 29.9, "stand", 1],
    [29.5, 29.4, "wave", 1],
    [28.6, 28.9, "stand", 0.72],
    [22.9, 28.7, "stand", 1],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), pose, x < CX, s);
  }
  // on the terrace wall, legs over the edge
  for (const x of [6.3, 7.2, 12.6, 19.4, 20.3, 35.4, 36.3, 40.2]) person(pen, x, PY1 + 0.14, 0.05, randomLook(rng), "sit", rng.chance(0.5));
  // a school party crossing the forecourt two by two in bright jackets, a teacher at each end
  for (let i = 0; i < 6; i++) {
    const lk = randomLook(rng);
    lk.top = C.hivis;
    person(pen, 31.2 + Math.floor(i / 2) * 0.85, 23.6 + (i % 2) * 0.62, 0, lk, i % 3 === 0 ? "walkA" : "walkB", false, 0.66);
  }
  person(pen, 30.4, 23.9, 0, randomLook(rng), "wave", false);
  person(pen, 34.0, 23.8, 0, randomLook(rng), "walkA", false);
  // strolling the forecourt
  person(pen, 34.9, 26.2, 0, randomLook(rng), "stand");
  person(pen, 35.7, 25.9, 0, randomLook(rng), "wave", true);
  snapper(pen, 38.2, 28.6, randomLook(rng), true);
  pen.pop();

  // on the broad steps below the terrace
  const tread = (k: number): [number, number] => [PY1 + ((SY1 - PY1) * (3.5 - k)) / 4, (T * (k + 1)) / 4];
  for (const [x, k] of [
    [25.0, 2],
    [25.8, 2],
    [27.3, 1],
    [28.1, 1],
    [32.6, 2],
    [33.1, 1],
  ] as const) {
    const [y, z] = tread(k);
    person(pen, x, y, z - 0.42, randomLook(rng), "sit", rng.chance(0.5));
  }

  // the west steps: people sitting in the sun either side of the way up, and a wedding at the top
  pen.push(40.5, 21.6, T, 270);
  const row = (k: number): [number, number] => [1.4 + (2.0 * (5.5 - k)) / 6, -T + ((0.9 + T) * (k + 1)) / 6];
  for (const [x, k] of [
    [0.1, 4],
    [0.9, 4],
    [1.9, 3],
    [2.6, 2],
    [0.4, 2],
    [4.9, 3],
    [5.7, 4],
    [6.5, 4],
    [7.2, 2],
    [6.0, 2],
  ] as const) {
    const [y, z] = row(k);
    person(pen, x, y, z - 0.42, randomLook(rng), "sit", x > 3.6);
  }
  const bride: Look = { skin: SKIN[1], hair: HAIR[2], top: C.white, legs: C.white, long: true, hat: null };
  const groom: Look = { skin: SKIN[3], hair: HAIR[0], top: C.slateLight, legs: C.slateLight, long: false, hat: null };
  pen.obj(() => {
    person(pen, 3.3, 1.55, 0.9, bride, "wave");
    pen.card(3.3, 1.55, 0.9).poly(
      [
        [-0.6, 0.02],
        [0.6, 0.02],
        [0.34, 0.95],
        [-0.34, 0.95],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 1.6, grain: 0.3 },
    );
    person(pen, 4.05, 1.55, 0.9, groom, "stand", true);
  });
  const [py, pz] = row(1);
  pen.push(0, 0, pz);
  snapper(pen, 3.7, py, { ...randomLook(rng), top: C.charcoal }, false);
  pen.pop();
  for (const [x, k] of [
    [2.5, 4],
    [4.9, 5],
  ] as const) {
    const [y, z] = row(k);
    person(pen, x, y, z, randomLook(rng), "cheer", x > 3.6);
  }
  pen.pop();
  pigeon(pen, 42.9, 23.4, 0, false, true);
  pigeon(pen, 43.3, 12.6, 0, true, false);
}

// ---------------------------------------------------------------- everything that moves

/** A chorister: red robe, white ruff, the music held up in front. */
function chorister(pen: Pen, lk: Look, s: number): void {
  person(pen, 0, 0, 0, lk, "stand", false, s);
  const k = pen.card(0, 0, 0);
  k.ellipse(0, 1.47 * s, 0.3 * s, 0.1 * s, C.white, { outline: true, w: 0.03, layer: 2.5, seg: 8, grain: 0 });
  k.rect(-0.24 * s, 0.92 * s, 0.24 * s, 1.2 * s, C.white, { outline: true, w: 0.035, layer: 4, grain: 0 });
}

/** A City gent on the move: bowler, rolled umbrella. [facing right, facing left] x [stride, passing]. */
function gent(seed: number): Sprite[][] {
  const lk = suit(new Rng(seed));
  const mk = (pose: Pose, flip: boolean) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, lk, pose, flip);
        hat(p, 0, 0, 0, "bowler", { pose, flip });
        p.card(0, 0, 0, flip).seg(0.5, 0.95, 0.66, 0.06, { w: 0.07, color: C.black, kind: L_BAR, wobble: 0, layer: 5 });
      },
      0,
      seed,
    );
  return [
    [mk("walkA", false), mk("walkB", false)],
    [mk("walkA", true), mk("walkB", true)],
  ];
}

function motion(c: LondonCtx): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;
  const gz = (wx: number, wy: number) => c.oz + groundZ(wx - c.ox, wy - c.oy);
  const path = (pts: V2[], r = 0.4): Route =>
    new Route(
      drape(
        rounded(
          pts.map((p) => W(p[0], p[1])),
          true,
          r,
        ),
        true,
        gz,
        0.35,
      ),
      true,
    );

  // ---- people on foot: up from the bridge to the cathedral and back, round the forecourt, along the river
  const way = path([
    [28.3, 45.4],
    [28.3, 33.2],
    [30.6, 32.4],
    [30.6, 29.4],
    [33.6, 28.5],
    [33.6, 29.9],
    [31.8, 30.3],
    [31.8, 32.6],
    [29.8, 33.6],
    [29.8, 45.4],
  ]);
  for (let i = 0; i < 9; i++) c.movers.push(walker(way, rng, born + rng.range(0, 1)));
  const forecourt = path([
    [32.4, 29.7],
    [41.2, 29.7],
    [41.2, 27.3],
    [32.4, 27.3],
  ]);
  for (let i = 0; i < 4; i++) c.movers.push(walker(forecourt, rng, born + rng.range(0, 1)));
  const west = path(
    [
      [5.2, 44.55],
      [25.2, 44.55],
      [25.2, 45.05],
      [5.2, 45.05],
    ],
    0.2,
  );
  const east = path(
    [
      [32.8, 44.55],
      [43.3, 44.55],
      [43.3, 45.05],
      [32.8, 45.05],
    ],
    0.2,
  );
  for (let i = 0; i < 4; i++) c.movers.push(walker(west, rng, born + rng.range(0, 1)));
  for (let i = 0; i < 3; i++) c.movers.push(walker(east, rng, born + rng.range(0, 1)));
  // two City gents take their constitutional along the embankment
  [west, east].forEach((route, i) => {
    const frames = gent(210 + i);
    c.movers.push(
      traveler(route, {
        speed: 1.35,
        at: 0.3 + i * 0.4,
        born: born + 0.5,
        span: 0.8,
        sprite: (h, t) => frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6 + i) & 1],
      }),
    );
  });
  // and two couriers ride it
  const ride = path(
    [
      [5.4, 43.0],
      [43.2, 43.0],
      [43.2, 43.45],
      [5.4, 43.45],
    ],
    0.2,
  );
  c.movers.push(cyclist(ride, rng, born + 0.3, 5.2, 0.1));
  c.movers.push(cyclist(ride, rng, born + 0.6, 4.6, 0.62));

  // ---- the choir on the transept steps, swaying as it sings; the conductor; the music going up
  const cr = new Rng(63);
  const places: [number, number, number, number][] = [];
  for (const deg of [42, 66, 90, 114, 138]) places.push([deg, 2.4, 0.6, 1]);
  for (const deg of [54, 72, 90, 108, 126]) places.push([deg, 2.82, 0.3, 0.84]);
  const singers = places.map(([deg, r, z, s], i) => {
    const t = (deg * Math.PI) / 180;
    const lk: Look = { skin: cr.pick(SKIN), hair: cr.pick(HAIR), top: ROBE, legs: ROBE, long: cr.chance(0.5), hat: null };
    return { p: W(CX + Math.cos(t) * r, FRONT + Math.sin(t) * r, T + z), s: makeSprite((p) => chorister(p, lk, s), 0, 300 + i), ph: i * 0.9 };
  });
  const baton = (pose: Pose) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, { skin: SKIN[0], hair: HAIR[7], top: C.black, legs: C.black, long: false, hat: null }, pose, true);
        p.card(0, 0, 0, true).seg(0.62, 1.88, 0.86, 2.3, { w: 0.04, color: C.white, kind: L_BAR, wobble: 0, layer: 5 });
      },
      0,
      321,
    );
  const conductor = [baton("wave"), baton("cheer")];
  const cp = W(CX + 0.3, FRONT + 3.75, T);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(cp[0], cp[1], cp[2], 8)) return;
    for (const s of singers) {
      const d = Math.sin(m.t * 1.9 + s.ph) * 0.07;
      m.put(s.s, s.p[0] + d, s.p[1] - d, s.p[2], born);
    }
    m.put(conductor[Math.floor(m.t * 2.4) & 1], cp[0], cp[1], cp[2], born);
  });
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
  const np = W(CX, FRONT + 2.4, T + 3.3);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(np[0], np[1], np[2], 8)) return;
    for (let i = 0; i < 4; i++) {
      const u = (m.t / 3.4 + i / 4) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      // each note sketches itself in, then runs its reveal backwards to fade out as it rises
      const p = Math.min(u * 3.4, ((1 - u) / 0.3) * 1.05);
      m.put(note, np[0] + sx + (i - 1.5) * 0.5, np[1] - sx - (i - 1.5) * 0.5, np[2] + u * 3.4, m.t - p);
    }
  });

  // ---- the clock on the south-west tower: a minute passes for every second of the film
  const shown = c.t + 0.5 + ((TWR_X + TWR_SOUTH + 3) / 96) * 1.25 + 0.3 + 1.1;
  const cw = W(TWR_X + TWR_S, TWR_SOUTH + TWR_S, T + WALL + 2.2);
  c.movers.push((m) => {
    if (m.t < shown || !m.sees(cw[0], cw[1], cw[2], 6)) return;
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => shown;
    dp.rng = new Rng(1710);
    const mins = 8 + m.t;
    const hm = (mins / 60) * Math.PI * 2;
    const hh = ((10 + mins / 60) / 12) * Math.PI * 2;
    for (const side of ["x+", "y+"] as const) {
      const f = dp.wall(side, c.ox + TWR_X, c.oy + TWR_SOUTH, c.oz + T + WALL, TWR_S, TWR_S);
      const a = TWR_S / 2;
      const b = 2.2;
      f.seg(a, b, a + Math.sin(hm) * 0.72, b + Math.cos(hm) * 0.72, { w: 0.08, wobble: 0, layer: 4 });
      f.seg(a, b, a + Math.sin(hh) * 0.48, b + Math.cos(hh) * 0.48, { w: 0.11, wobble: 0, layer: 4 });
    }
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the pigeons, and the child who sends them up round the dome
  const LAP = 13;
  /** When a lap starts. On the tour the flock goes up just as the camera arrives. */
  const start = (): number => {
    const at = c.visit();
    return at == null ? born + 2.5 : at - 0.3;
  };
  const phase = (t: number, lag = 0): number => (((t - start() - lag) % LAP) + LAP) % LAP;
  const bird = (how: "stand" | "peck" | "up" | "down", flip: boolean, seed: number) =>
    makeSprite(
      (p) => {
        // (on the wing they are drawn a little larger than life, so the flock reads from a distance)
        p.push(0, 0, 0, 0, how === "up" || how === "down" ? 1.3 : 1);
        pigeonOn(p.card(0, 0, 0, flip), how);
        p.pop();
      },
      0,
      seed,
    );
  const standing = [
    [bird("stand", false, 3), bird("peck", false, 3)],
    [bird("stand", true, 3), bird("peck", true, 3)],
  ];
  const flying = [
    [bird("up", false, 4), bird("down", false, 4)],
    [bird("up", true, 4), bird("down", true, 4)],
  ];
  const pr = new Rng(21);
  const flock: { hx: number; hy: number; ox: number; oy: number; oz: number; lag: number; flip: number; ph: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const a = pr.range(0, 6.28);
    const r = Math.sqrt(pr.next()) * 1.9;
    flock.push({
      hx: PIGEONS[0] + Math.cos(a) * r,
      hy: PIGEONS[1] + Math.sin(a) * r * 0.8,
      ox: pr.range(-1.8, 1.8),
      oy: pr.range(-1.8, 1.8),
      oz: pr.range(-1.1, 1.1),
      lag: pr.range(0, 0.5),
      flip: pr.chance(0.5) ? 1 : 0,
      ph: pr.range(0, 10),
    });
  }
  // the flight: up to the dome, once round it, and home
  const th0 = Math.atan2(PIGEONS[1] - CY, PIGEONS[0] - CX);
  const lap = (u: number, out: V3) => {
    const th = th0 + u * Math.PI * 2;
    out[0] = CX + Math.cos(th) * 8.4;
    out[1] = CY + Math.sin(th) * 8.4;
    out[2] = T + 15 + Math.sin(u * Math.PI) * 6.5;
  };
  const UP = 1.8;
  const ROUND = 5.6;
  const DOWN = 1.9;
  const q: V3 = [0, 0, 0];
  const q2: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 22, c.oy + 28, 10, 30)) return;
    for (const b of flock) {
      const u = phase(m.t, b.lag);
      let x: number;
      let y: number;
      let z: number;
      let air = true;
      let right = b.flip === 0;
      if (u < UP) {
        const e = ease.inOut(u / UP);
        lap(0, q);
        x = b.hx + (q[0] + b.ox - b.hx) * e;
        y = b.hy + (q[1] + b.oy - b.hy) * e;
        z = (q[2] + b.oz) * e;
        right = q[0] - q[1] > b.hx - b.hy;
      } else if (u < UP + ROUND) {
        const v = (u - UP) / ROUND;
        lap(v, q);
        lap(v + 0.01, q2);
        x = q[0] + b.ox;
        y = q[1] + b.oy;
        z = q[2] + b.oz;
        right = q2[0] - q2[1] > q[0] - q[1];
      } else if (u < UP + ROUND + DOWN) {
        const e = ease.inOut((u - UP - ROUND) / DOWN);
        lap(1, q);
        x = q[0] + b.ox + (b.hx - q[0] - b.ox) * e;
        y = q[1] + b.oy + (b.hy - q[1] - b.oy) * e;
        z = (q[2] + b.oz) * (1 - e);
        right = b.hx - b.hy > q[0] - q[1];
      } else {
        x = b.hx;
        y = b.hy;
        z = 0;
        air = false;
      }
      const s = air ? flying[right ? 0 : 1][Math.floor(m.t * 9 + b.ph) & 1] : standing[b.flip][Math.floor(m.t * 1.3 + b.ph) % 3 === 0 ? 1 : 0];
      m.put(s, c.ox + x, c.oy + y, c.oz + z, born);
    }
  });
  // the child: a run at the flock just before it goes up, a cheer, a slow walk back to try again
  const kid = randomLook(new Rng(13));
  const mk = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, kid, pose, flip, 0.66), 0, 120);
  const run = [mk("walkA", true), mk("walkB", true)];
  const back = [mk("walkA", false), mk("walkB", false)];
  const cheer = mk("cheer", true);
  const wait = mk("stand", true);
  const from: V2 = [23.3, 40.6];
  const to: V2 = [PIGEONS[0] + 1.5, PIGEONS[1] + 0.9];
  c.movers.push((m) => {
    if (m.t < born) return;
    const u = phase(m.t);
    let k = 0;
    let s: Sprite = wait;
    if (u > LAP - 1.5) {
      k = (u - (LAP - 1.5)) / 1.5;
      s = run[Math.floor(m.t * 6) & 1];
    } else if (u < 3.2) {
      k = 1;
      s = Math.floor(m.t * 3) & 1 ? cheer : wait;
    } else if (u < 7.4) {
      k = 1 - (u - 3.2) / 4.2;
      s = back[Math.floor(m.t * 2.6) & 1];
    }
    m.put(s, c.ox + from[0] + (to[0] - from[0]) * k, c.oy + from[1] + (to[1] - from[1]) * k, c.oz, born);
  });
}

// ---------------------------------------------------------------- the block

export const stpauls: LondonBuilder = (c) => {
  c.early(() => ground(c));
  church(c);
  cityBehind(c);
  churchyard(c);
  hill(c);
  court(c);
  garden(c);
  riverside(c);
  crowd(c);
  motion(c);
  // the cross on top of the dome is thirty units up: look a little higher, from a little further back
  c.focus(23, 23, 0.92);
};
