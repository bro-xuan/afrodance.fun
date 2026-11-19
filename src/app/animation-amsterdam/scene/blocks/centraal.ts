// Centraal Station: Cuypers' brick palace of a station on the IJ, its glass
// train shed over the viaduct behind, trams, taxis and a mountain of bikes on
// the forecourt, and out the back the free ferries to Noord.

import { RGB, Rng, V2, V3, clamp, ease, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { cruiseBoat, hullShape } from "../boats";
import { RAIL_Z, TRACKS, WATER, railEnds } from "../city";
import {
  W_FINE,
  W_THIN,
  archWindow,
  bench,
  bike,
  bikeRow,
  bricks,
  flag,
  lamp,
  person,
  railing,
  randomLook,
  speckle,
  stall,
  tree,
  windowAt,
} from "../kit";
import { Route, Turning, makeSprite, traveler, walker } from "../motion";
import { C, SHIRT, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";
import { ISLET_PLAN, PLAN } from "./plan";

const BRICK = C.brick;
const STONE = C.quayCap;
const SLATE = C.slate;
const GLASSROOF = hex("#cfe3ee");
const NS_YELLOW = hex("#f7c531");
const NS_BLUE = hex("#1f4f9a");

// The building, front to the city (+x). Sections along y, symmetrical about y = 24.
const BACK = 9.6;
const FRONT = 18.4;

// The train shed: a glass barrel vault over the viaduct.
const SHED_Y0 = 8;
const SHED_Y1 = 34;
const SHED_CX = 4.9;
const SHED_A = 4.6;
const SHED_B = 6.5;

/**
 * The ferry crossing, in world coordinates: the two lanes (y), and where the
 * middle of a ferry sits when it is docked at each end (x). Noord builds its
 * landing to match.
 */
export const FERRY = {
  lanes: [97.5, 104] as [number, number],
  cityX: -19.45,
  noordX: -35.35,
  length: 10.5,
};

// ---------------------------------------------------------------- the station

/** Points of half an ellipse standing on the viaduct, from the IJ side over the top to the city side. */
function arch(a: number, b: number, n = 12): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const th = Math.PI - (Math.PI * i) / n;
    pts.push([SHED_CX + Math.cos(th) * a, RAIL_Z + Math.sin(th) * b]);
  }
  return pts;
}

function shed(pen: Pen): void {
  const outer = arch(SHED_A, SHED_B);
  const inner = arch(SHED_A - 0.28, SHED_B - 0.28).reverse();
  const bays = 4;
  const len = (SHED_Y1 - SHED_Y0) / bays;
  for (let k = 0; k < bays; k++) {
    const y = SHED_Y0 + k * len;
    pen.begin();
    pen.wall("y+", 0, y, 0, 10, 0).extrude([...outer, ...inner], len, GLASSROOF, { crease: 40, glow: 0.3, grain: 0.6, w: 0.11 });
    // iron ribs across and purlins along, on the side the camera sees
    for (let r = 1; r < 3; r++) {
      const yy = y + (r * len) / 3;
      const rib: V3[] = [];
      for (let i = 4; i <= 12; i++) {
        const th = Math.PI - (Math.PI * i) / 12;
        rib.push([SHED_CX + Math.cos(th) * (SHED_A + 0.02), yy, RAIL_Z + Math.sin(th) * (SHED_B + 0.02)]);
      }
      pen.stroke(rib, { w: 0.06, color: C.slate, kind: L_MARK, wobble: 0.3 });
    }
    for (const deg of [18, 40, 62, 84]) {
      const th = (deg * Math.PI) / 180;
      const x = SHED_CX + Math.cos(th) * (SHED_A + 0.02);
      const z = RAIL_Z + Math.sin(th) * (SHED_B + 0.02);
      pen.stroke(
        [
          [x, y, z],
          [x, y + len, z],
        ],
        { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.3 },
      );
    }
    pen.end();
  }
  // the fan-light that closes the southern end above the trains
  pen.begin();
  const f = pen.wall("y+", 0, 0, 0, 10, SHED_Y1);
  const ia = SHED_A - 0.28;
  const ib = SHED_B - 0.28;
  const zc = RAIL_Z + 4.3;
  const half = ia * Math.sqrt(1 - Math.pow((zc - RAIL_Z) / ib, 2));
  const th0 = Math.acos(half / ia);
  const fan: V2[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const th = th0 + ((Math.PI - 2 * th0) * i) / n;
    fan.push([SHED_CX + Math.cos(th) * ia, RAIL_Z + Math.sin(th) * ib]);
  }
  f.poly(fan, GLASSROOF, { outline: true, w: W_THIN, glow: 0.45, grain: 0.5 });
  for (let i = 1; i < n; i++) f.seg(SHED_CX, zc, fan[i][0], fan[i][1], { w: 0.05, color: C.slate, kind: L_MARK, wobble: 0 });
  f.arc(SHED_CX, zc, half * 0.5, (ib - 4.3) * 0.5, 0, Math.PI, { w: 0.05, color: C.slate, kind: L_MARK, wobble: 0 });
  pen.end();
  // brick piers carrying the ends of the vault, and the open-air platform ends beyond it
  pen.obj(() => {
    pen.box(8.0, SHED_Y1 - 0.5, 0, 1.5, 4.5, RAIL_Z - 0.25, BRICK);
    pen.box(7.62, SHED_Y1 - 0.5, RAIL_Z - 0.25, 1.9, 4.6, 0.4, STONE, { w: W_THIN });
    pen.box(0.3, SHED_Y1 - 0.5, RAIL_Z - 0.25, 1.75, 4.6, 0.4, STONE, { w: W_THIN });
    pen.box(8.0, SHED_Y0 - 0.1, 0, 1.5, 0.6, RAIL_Z, BRICK);
  });
}

/** Stone plinth and string courses on a wall of the given width and height. */
function courses(f: Plane, w: number, h: number, mid: number): void {
  f.rect(0, 0, w, 0.5, STONE, { grain: 0.5 });
  f.rect(0, mid, w, mid + 0.28, STONE, { grain: 0.5 });
  f.rect(0, h - 0.4, w, h, STONE, { grain: 0.5 });
  f.seg(0, 0.5, w, 0.5, { w: W_FINE });
  f.seg(0, mid, w, mid, { w: W_FINE });
  f.seg(0, h - 0.4, w, h - 0.4, { w: W_FINE });
}

/** Two storeys of arched windows along a wall. */
function arcade(f: Plane, rng: Rng, a0: number, a1: number, h: number, n: number): void {
  const step = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.5) * step;
    archWindow(f, a - 0.56, 0.95, a + 0.56, 3.35, rng.chance(0.75), STONE);
    archWindow(f, a - 0.48, 4.5, a + 0.48, h - 0.75, rng.chance(0.6), STONE);
  }
}

function wing(pen: Pen, rng: Rng, y0: number, y1: number, winY0: number, winY1: number): void {
  const h = 7;
  const w = FRONT - BACK;
  pen.begin();
  pen.box(BACK, y0, 0, w, y1 - y0, h, BRICK);
  pen.gable(BACK, y0, h, w, y1 - y0, 2.9, "y", SLATE, { gable: BRICK });
  const f = pen.wall("x+", BACK, winY0, 0, w, winY1 - winY0);
  const len = winY1 - winY0;
  courses(f, len, h, 3.8);
  arcade(f, rng, 0.2, len - 0.2, h, 3);
  bricks(f, 0.2, 0.6, len - 0.2, h - 0.5, C.brickDark, 0.22);
  // dormers on the slate
  for (const yy of [winY0 + len * 0.28, winY0 + len * 0.72]) {
    pen.box(FRONT - 2.6, yy - 0.45, h + 0.5, 1.5, 0.9, 1.0, BRICK, { top: SLATE, w: W_THIN });
    windowAt(pen.wall("x+", FRONT - 2.6, yy - 0.45, h + 0.5, 1.5, 0.9), 0.2, 0.2, 0.7, 0.85, rng.chance(0.5), STONE, false);
  }
  pen.end();
}

function pavilion(pen: Pen, rng: Rng, y0: number, y1: number, south: boolean): void {
  const h = 8.6;
  const x1 = FRONT + 0.6;
  const w = x1 - BACK;
  const d = y1 - y0;
  pen.begin();
  pen.box(BACK, y0, 0, w, d, h, BRICK);
  pen.hip(BACK - 0.15, y0 - 0.15, h, w + 0.3, d + 0.3, 3.3, SLATE);
  const f = pen.wall("x+", BACK, y0, 0, w, d);
  courses(f, d, h, 3.8);
  arcade(f, rng, 0.25, d - 0.25, h, 2);
  bricks(f, 0.2, 0.6, d - 0.2, h - 0.5, C.brickDark, 0.22);
  if (south) {
    const g = pen.wall("y+", BACK, y0, 0, w, d);
    courses(g, w, h, 3.8);
    arcade(g, rng, 0.4, w - 0.4, h, 4);
    bricks(g, 0.2, 0.6, w - 0.2, h - 0.5, C.brickDark, 0.22);
  }
  // corner turrets
  for (const yy of [y0, y1 - 0.7]) {
    pen.box(x1 - 0.7, yy, h, 0.7, 0.7, 1.3, STONE, { w: W_THIN });
    pen.pyramid(x1 - 0.8, yy - 0.1, h + 1.3, 0.9, 0.9, 1.3, SLATE, { w: W_THIN });
  }
  pen.end();
}

/** A dial on a tower face: a clock, or the wind dial Centraal has on its other tower. */
function dial(f: Plane, a: number, b: number, r: number, wind: boolean): void {
  f.circle(a, b, r, C.white, { outline: true, w: W_THIN, glow: 0.75, grain: 0.3, seg: 16 });
  f.circle(a, b, r * 0.82, null, { ink: C.gold, w: 0.07, seg: 14, layer: 1 });
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const k = i % 3 === 0 ? 0.62 : 0.72;
    f.seg(a + Math.cos(t) * r * k, b + Math.sin(t) * r * k, a + Math.cos(t) * r * 0.8, b + Math.sin(t) * r * 0.8, { w: 0.05, wobble: 0, layer: 1 });
  }
  if (wind) {
    f.seg(a - r * 0.5, b - r * 0.3, a + r * 0.55, b + r * 0.33, { w: 0.09, color: C.redDark, kind: L_MARK, wobble: 0, layer: 2 });
    f.seg(a + r * 0.55, b + r * 0.33, a + r * 0.3, b + r * 0.36, { w: 0.09, color: C.redDark, kind: L_MARK, wobble: 0, layer: 2 });
  } else {
    f.seg(a, b, a + r * 0.1, b + r * 0.6, { w: 0.08, wobble: 0, layer: 2 });
    f.seg(a, b, a + r * 0.42, b - r * 0.12, { w: 0.1, wobble: 0, layer: 2 });
  }
}

function tower(pen: Pen, rng: Rng, y0: number, wind: boolean): void {
  const x0 = 15.8;
  const w = 3.5;
  const d = 3.0;
  const h = 14;
  pen.begin();
  pen.box(x0, y0, 0, w, d, h, BRICK);
  pen.box(x0 - 0.22, y0 - 0.22, h, w + 0.44, d + 0.44, 0.55, STONE, { w: W_THIN });
  pen.pyramid(x0 - 0.05, y0 - 0.05, h + 0.55, w + 0.1, d + 0.1, 4.8, SLATE);
  const cx = x0 + w / 2;
  const cy = y0 + d / 2;
  pen.pole([cx, cy, h + 5.2], [cx, cy, h + 6.9], 0.09, C.gold, { ink: false });
  pen.card(cx, cy, h + 6.9).circle(0, 0, 0.22, C.gold, { outline: true, w: W_FINE, seg: 8 });
  for (const side of ["x+", "y+"] as const) {
    const f = pen.wall(side, x0, y0, 0, w, d);
    const fw = side === "x+" ? d : w;
    for (const b of [0, 3.8, 7.3, 10.2]) {
      f.rect(0, b, fw, b + (b === 0 ? 0.5 : 0.26), STONE, { grain: 0.5 });
      f.seg(0, b + (b === 0 ? 0.5 : 0.26), fw, b + (b === 0 ? 0.5 : 0.26), { w: W_FINE });
    }
    archWindow(f, fw / 2 - 0.42, 1.0, fw / 2 + 0.42, 3.2, rng.chance(0.6), STONE);
    archWindow(f, fw / 2 - 0.36, 4.5, fw / 2 + 0.36, 6.6, rng.chance(0.6), STONE);
    archWindow(f, fw / 2 - 0.36, 7.9, fw / 2 + 0.36, 9.7, rng.chance(0.5), STONE);
    dial(f, fw / 2, 12.15, Math.min(1.12, fw / 2 - 0.3), wind);
    bricks(f, 0.15, 0.6, fw - 0.15, 10.1, C.brickDark, 0.2);
  }
  pen.end();
}

function centre(pen: Pen): void {
  const y0 = 20.5;
  const d = 7;
  const x1 = FRONT + 1.3;
  const w = x1 - BACK;
  const h = 10.2;
  pen.begin();
  pen.box(BACK, y0, 0, w, d, h, BRICK);
  pen.gable(BACK, y0, h, w, d, 3.7, "x", SLATE, { gable: BRICK });
  const f = pen.wall("x+", BACK, y0, 0, w, d);
  f.rect(0, 0, d, 0.5, STONE, { grain: 0.5 });
  f.rect(0, 4.05, d, 4.75, STONE, { grain: 0.5 });
  f.seg(0, 4.05, d, 4.05, { w: W_FINE });
  f.seg(0, 4.75, d, 4.75, { w: W_FINE });
  f.rect(0, h - 0.4, d, h, STONE, { grain: 0.5 });
  f.text("CENTRAAL", d / 2, 4.2, 0.4, { align: "c", w: 0.06 });
  // three doors, glowing with the hall behind them
  for (let i = 0; i < 3; i++) {
    const a = 1.25 + i * 2.25;
    const door: V2[] = [
      [a - 0.85, 0],
      [a + 0.85, 0],
      [a + 0.85, 2.6],
    ];
    for (let k = 1; k < 7; k++) {
      const t = (k / 7) * Math.PI;
      door.push([a + Math.cos(t) * 0.85, 2.6 + Math.sin(t) * 0.85]);
    }
    door.push([a - 0.85, 2.6]);
    f.poly(door, STONE, { outline: true, w: W_FINE, grain: 0.4 });
    f.poly(
      door.map((p) => [a + (p[0] - a) * 0.8, p[1] * 0.93] as V2),
      hex("#5a4a44"),
      { layer: 1, glow: 0.85, grain: 0.5 },
    );
  }
  // the great lunette over the entrance
  const lun: V2[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = (k / 12) * Math.PI;
    lun.push([d / 2 + Math.cos(t) * 2.7, 5.3 + Math.sin(t) * 3.2]);
  }
  f.poly(lun, STONE, { outline: true, w: W_THIN, grain: 0.4 });
  f.poly(
    lun.map((p) => [d / 2 + (p[0] - d / 2) * 0.9, 5.45 + (p[1] - 5.3) * 0.9] as V2),
    C.glass,
    { layer: 1, glow: 1, grain: 0.5 },
  );
  for (let k = 1; k < 6; k++) {
    const t = (k / 6) * Math.PI;
    f.seg(d / 2, 5.45, d / 2 + Math.cos(t) * 2.4, 5.45 + Math.sin(t) * 2.85, { w: 0.06, color: STONE, kind: L_MARK, wobble: 0, layer: 2 });
  }
  f.arc(d / 2, 5.45, 1.25, 1.5, 0, Math.PI, { w: 0.06, color: STONE, kind: L_MARK, wobble: 0, layer: 2 });
  // the city's three crosses in the gable
  const g = pen.wall("x+", BACK, y0, h, w, d);
  g.circle(d / 2, 1.25, 0.62, C.red, { outline: true, w: W_FINE, seg: 10 });
  g.rect(d / 2 - 0.16, 0.7, d / 2 + 0.16, 1.8, C.black, { layer: 1, grain: 0.3 });
  for (let i = 0; i < 3; i++) {
    const b = 0.93 + i * 0.32;
    g.seg(d / 2 - 0.09, b - 0.09, d / 2 + 0.09, b + 0.09, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    g.seg(d / 2 - 0.09, b + 0.09, d / 2 + 0.09, b - 0.09, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
  }
  bricks(f, 0.2, 5, d - 0.2, h - 0.5, C.brickDark, 0.15);
  // pinnacles at the front corners
  for (const yy of [y0 - 0.05, y0 + d - 0.65]) {
    pen.box(x1 - 0.7, yy, h, 0.7, 0.7, 1.6, STONE, { w: W_THIN });
    pen.pyramid(x1 - 0.8, yy - 0.1, h + 1.6, 0.9, 0.9, 1.5, SLATE, { w: W_THIN });
  }
  pen.end();
  // glass canopy over the doors
  pen.begin();
  pen.box(x1, y0 - 0.2, 3.75, 2.5, d + 0.4, 0.2, GLASSROOF, { w: W_THIN, glow: 0.4 });
  for (const yy of [y0 + 0.1, y0 + d / 2, y0 + d - 0.1]) {
    pen.pole([x1 + 2.3, yy, 0], [x1 + 2.3, yy, 3.75], 0.11, scaleRGB(C.slate, 0.8));
  }
  for (let k = 1; k < 5; k++) {
    const yy = y0 - 0.2 + (k * (d + 0.4)) / 5;
    pen.stroke(
      [
        [x1, yy, 3.96],
        [x1 + 2.5, yy, 3.96],
      ],
      { w: 0.05, color: C.slate, kind: L_MARK, wobble: 0 },
    );
  }
  // a string of bulbs along the canopy edge
  for (let k = 0; k < 9; k++) {
    const yy = y0 + (k * d) / 8;
    pen.stroke(
      [
        [x1 + 2.52, yy - 0.03, 3.7],
        [x1 + 2.52, yy + 0.03, 3.7],
      ],
      { w: 0.2, kind: L_LIGHT, wobble: 0 },
    );
  }
  pen.end();
}

// ---------------------------------------------------------------- the forecourt

function suitcase(pen: Pen, x: number, y: number, rgb: RGB): void {
  pen.begin();
  pen.box(x - 0.22, y - 0.15, 0, 0.44, 0.3, 0.64, rgb, { w: W_FINE, grain: 0.5 });
  pen.stroke(
    [
      [x, y, 0.64],
      [x, y, 0.98],
    ],
    { w: 0.05, kind: L_BAR, wobble: 0 },
  );
  pen.end();
}

/** Someone just off a train: a person with their case beside them. */
function traveller(pen: Pen, rng: Rng, x: number, y: number): void {
  const flip = rng.chance(0.5);
  person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "walkA", "wave"]), flip, rng.chance(0.1) ? 0.72 : 1);
  if (rng.chance(0.8)) suitcase(pen, x + (flip ? -0.6 : 0.6), y + 0.12, rng.pick(SHIRT));
}

/** A taxi, pointing along local +x. */
function taxi(pen: Pen): void {
  pen.begin();
  pen.box(-1.5, -0.86, 0, 0.75, 1.72, 0.34, C.black, { edges: false });
  pen.box(0.75, -0.86, 0, 0.75, 1.72, 0.34, C.black, { edges: false });
  pen.box(-1.9, -0.82, 0.26, 3.8, 1.64, 0.62, C.charcoal, { w: 0.1 });
  pen.box(-1.05, -0.74, 0.88, 2.2, 1.48, 0.58, C.charcoal, { w: W_THIN });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -1.05, -0.74, 0.88, 2.2, 1.48);
    const w = side.startsWith("y") ? 2.2 : 1.48;
    f.rect(0.12, 0.08, w - 0.12, 0.5, C.glassLight, { grain: 0.4, glow: 0.3 });
  }
  pen.box(-0.25, -0.3, 1.46, 0.5, 0.6, 0.2, C.yellow, { w: W_FINE, glow: 1 });
  for (const side of ["x+", "x-"] as const) {
    const fr = pen.wall(side, -1.9, -0.82, 0.26, 3.8, 1.64);
    const col = side === "x+" ? C.lamp : C.red;
    fr.rect(0.12, 0.3, 0.42, 0.5, col, { glow: 1, grain: 0 });
    fr.rect(1.22, 0.3, 1.52, 0.5, col, { glow: 1, grain: 0 });
  }
  pen.end();
}

/** A glass tram shelter with its back to the square, open towards the rails. */
function shelter(pen: Pen, rng: Rng, x: number, y: number, len: number): void {
  pen.begin();
  pen.box(x, y, 0.2, 0.12, len, 2.15, GLASSROOF, { w: W_THIN, grain: 0.5 });
  pen.box(x - 0.15, y - 0.15, 2.4, 2.35, len + 0.3, 0.14, C.slateLight, { w: W_THIN });
  pen.pole([x + 2.05, y + 0.05, 0], [x + 2.05, y + 0.05, 2.4], 0.09, C.greyDark);
  pen.pole([x + 2.05, y + len - 0.05, 0], [x + 2.05, y + len - 0.05, 2.4], 0.09, C.greyDark);
  pen.box(x + 0.25, y + 0.5, 0.4, 0.45, len - 1, 0.1, C.wood, { w: W_FINE });
  pen.stroke(
    [
      [x + 1.0, y + 0.4, 2.36],
      [x + 1.0, y + len - 0.4, 2.36],
    ],
    { w: 0.16, kind: L_LIGHT, wobble: 0 },
  );
  const n = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < n; i++) {
    const sit = rng.chance(0.35);
    person(pen, sit ? x + 0.5 : x + rng.range(1.0, 1.8), y + 0.6 + ((len - 1.2) * (i + rng.next() * 0.6)) / n, sit ? 0.28 : 0, randomLook(rng), sit ? "sit" : "stand", rng.chance(0.3));
  }
  // the stop sign
  pen.pole([x + 2.15, y - 0.7, 0], [x + 2.15, y - 0.7, 2.75], 0.08, C.greyDark);
  const s = pen.card(x + 2.15, y - 0.7, 2.15);
  s.rect(-0.5, 0, 0.5, 0.6, C.yellow, { outline: true, w: W_FINE, layer: 1, grain: 0.3 });
  s.text("TRAM", 0, 0.17, 0.25, { align: "c", layer: 2, w: 0.05 });
  pen.end();
}

/** A little hut with a counter and a sign over it. */
function kiosk(pen: Pen, rng: Rng, x: number, y: number, w: number, d: number, wall: RGB, roof: RGB, sign: string): void {
  const h = 2.7;
  pen.begin();
  pen.box(x, y, 0, w, d, h, wall);
  pen.hip(x - 0.35, y - 0.35, h, w + 0.7, d + 0.7, 0.95, roof);
  const fy = pen.wall("y+", x, y, 0, w, d);
  fy.rect(0.35, 1.0, w - 0.35, 2.0, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
  fy.rect(0.2, 2.1, w - 0.2, 2.58, C.white, { outline: true, w: W_FINE, grain: 0.3 });
  fy.text(sign, w / 2, 2.2, 0.26, { align: "c", layer: 1, w: 0.05 });
  fy.rect(0.25, 0.85, w - 0.25, 1.0, C.woodDark, { grain: 0.4 });
  const fx = pen.wall("x+", x, y, 0, w, d);
  fx.rect(0.35, 1.0, d - 0.35, 2.0, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
  fx.rect(0.6, 0, d - 0.6, 0.0, C.white);
  person(pen, x + w * 0.5, y + d * 0.55, 0, randomLook(rng), "bust");
  pen.end();
}

/** A tree in a round stone planter with a bench-height rim. */
function planter(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.cyl(x, y, 0, 1.0, 0.42, STONE, { seg: 10, top: C.grassDark });
  tree(pen, rng, x, y, { z: 0.42, kind: "round" });
}

const IRON: RGB = [52, 78, 66];

/** The round advertising column with a pointed cap that stands on every Amsterdam square. */
export function peperbus(pen: Pen, rng: Rng, x: number, y: number): void {
  const posters = [C.red, C.yellow, C.blue, C.pink, C.orange, C.teal, C.purple];
  pen.begin();
  pen.cyl(x, y, 0, 0.62, 0.3, IRON, { seg: 10, w: W_THIN });
  pen.cyl(x, y, 0.3, 0.55, 2.3, C.cream, { seg: 10, w: W_THIN });
  pen.cyl(x, y, 2.6, 0.7, 0.16, IRON, { seg: 10, w: W_THIN });
  pen.dome(x, y, 2.76, 0.6, 0.6, IRON, { seg: 10, rings: 3, w: W_THIN });
  pen.pole([x, y, 3.3], [x, y, 3.7], 0.07, IRON, { ink: false });
  const c = pen.card(x, y, 0.3);
  // the card stands on the column's axis, so its posters need lifting clear of the curved front
  const o = { outline: true, w: 0.04, bias: 1.05, grain: 0.4 };
  c.rect(-0.44, 1.25, -0.04, 2.08, rng.pick(posters), o);
  c.rect(0.02, 1.38, 0.44, 2.12, rng.pick(posters), o);
  c.rect(-0.4, 0.28, 0.08, 1.12, rng.pick(posters), o);
  c.rect(0.13, 0.42, 0.43, 1.24, C.white, o);
  pen.end();
}

/** A krul: the curly iron street urinal. Feet show underneath, a head on top. */
function krul(pen: Pen, rng: Rng, x: number, y: number): void {
  const curl: V2[] = [];
  const n = 18;
  const rad = (i: number) => 0.74 + (0.36 * i) / n;
  const ang = (i: number) => 0.9 + (5.3 * i) / n;
  for (let i = 0; i <= n; i++) curl.push([Math.cos(ang(i)) * (rad(i) + 0.05), Math.sin(ang(i)) * (rad(i) + 0.05)]);
  for (let i = n; i >= 0; i--) curl.push([Math.cos(ang(i)) * (rad(i) - 0.05), Math.sin(ang(i)) * (rad(i) - 0.05)]);
  person(pen, x - 0.1, y - 0.1, 0, randomLook(rng), "stand", true);
  pen.push(x, y, 0);
  pen.begin();
  for (const i of [0, 4, 8, 12, 16]) pen.pole([Math.cos(ang(i)) * rad(i), Math.sin(ang(i)) * rad(i), 0], [Math.cos(ang(i)) * rad(i), Math.sin(ang(i)) * rad(i), 0.5], 0.09, IRON, { ink: false });
  pen.extrude(curl, 0.48, 2.05, IRON, { crease: 50, w: W_THIN });
  for (let i = 1; i < n; i += 1) {
    const px = Math.cos(ang(i)) * (rad(i) + 0.06);
    const py = Math.sin(ang(i)) * (rad(i) + 0.06);
    if (px + py < 0.2) continue;
    pen.stroke(
      [
        [px, py, 1.72],
        [px, py, 1.92],
      ],
      { w: 0.07, color: C.lamp, kind: L_MARK, wobble: 0, alpha: 0.7 },
    );
  }
  pen.end();
  pen.pop();
}

/** The double-decker bike park: more bicycles than anyone can count. */
function bikeFlat(pen: Pen, rng: Rng, x0: number, y0: number, w: number, d: number): void {
  const rows = 3;
  const n = Math.floor(w / 0.6);
  const deck = 2.25;
  // ground floor
  pen.obj(() => {
    for (let r = 0; r < rows; r++) bikeRow(pen, rng, x0 + 0.3, y0 + 1.5 + (r * (d - 2.9)) / (rows - 1), n, 270, 0.6);
  });
  // steel deck on posts, with a ramp
  pen.obj(() => {
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 2; j++) {
        const px = x0 + (i * w) / 4;
        const py = y0 + (j * d) / 2;
        pen.pole([px, py, 0], [px, py, deck], 0.12, C.greyDark);
      }
    }
    pen.box(x0 - 0.25, y0 - 0.25, deck, w + 0.5, d + 0.5, 0.16, C.metal, { top: C.ballast, w: 0.1 });
    pen.fill(
      [
        [x0 + w + 0.25, y0 + d - 2.1, deck + 0.16],
        [x0 + w + 0.25, y0 + d + 0.25, deck + 0.16],
        [x0 + w + 5.6, y0 + d + 0.25, 0.02],
        [x0 + w + 5.6, y0 + d - 2.1, 0.02],
      ],
      C.ballast,
      { outline: true, w: W_THIN },
    );
    railing(
      pen,
      [
        [x0 - 0.2, y0 + d - 2.1, deck + 0.16],
        [x0 - 0.2, y0 - 0.2, deck + 0.16],
        [x0 + w + 0.2, y0 - 0.2, deck + 0.16],
        [x0 + w + 0.2, y0 + d - 2.1, deck + 0.16],
      ],
      0.8,
      C.greyDark,
      1.6,
    );
    railing(
      pen,
      [
        [x0 - 0.2, y0 + d + 0.2, deck + 0.16],
        [x0 + w + 0.2, y0 + d + 0.2, deck + 0.16],
        [x0 + w + 5.6, y0 + d + 0.2, 0.05],
      ],
      0.8,
      C.greyDark,
      1.6,
    );
  });
  // top floor
  pen.push(0, 0, deck + 0.16);
  pen.obj(() => {
    for (let r = 0; r < rows; r++) bikeRow(pen, rng, x0 + 0.3, y0 + 1.5 + (r * (d - 2.9)) / (rows - 1), n, 270, 0.6);
  });
  // someone hunting for theirs
  person(pen, x0 + w * 0.42, y0 + d * 0.36, 0, randomLook(rng), "stand");
  person(pen, x0 + w * 0.8, y0 + d * 0.7, 0, randomLook(rng), "wave", true);
  pen.pop();
  // the sign every Dutch bike park has
  pen.obj(() => {
    pen.pole([x0 - 0.9, y0 + d + 0.6, 0], [x0 - 0.9, y0 + d + 0.6, 3.0], 0.09, C.greyDark);
    const s = pen.card(x0 - 0.9, y0 + d + 0.6, 2.2);
    s.rect(-0.75, 0, 0.75, 0.75, C.blue, { outline: true, w: W_FINE, layer: 1, grain: 0.3 });
    s.text("FIETS", 0, 0.24, 0.26, { align: "c", layer: 2, w: 0.05, color: C.white, kind: L_MARK });
  });
}

function pigeonShape(pen: Pen, wing: -1 | 0 | 1, flip: boolean): void {
  const c = pen.card(0, 0, 0, flip);
  const grey = hex("#9aa3ad");
  const dark = hex("#6f7884");
  pen.begin();
  c.poly(
    [
      [-0.26, 0.2],
      [-0.52, 0.3],
      [-0.5, 0.1],
    ],
    dark,
    { outline: true, w: 0.04 },
  );
  c.ellipse(0, 0.2, 0.3, 0.17, grey, { outline: true, w: 0.045, seg: 8, layer: 1, grain: 0.3 });
  c.circle(0.26, 0.37, 0.115, dark, { outline: true, w: 0.04, seg: 6, layer: 2, grain: 0.3 });
  c.seg(0.36, 0.37, 0.47, 0.34, { w: 0.045, color: C.orange, kind: L_BAR, wobble: 0, layer: 2 });
  if (wing !== 0) {
    c.poly(
      [
        [-0.16, 0.24],
        [0.14, 0.26],
        [-0.12, 0.26 + wing * 0.52],
      ],
      C.white,
      { outline: true, w: 0.04, layer: 3, grain: 0.3 },
    );
  }
  pen.end();
}

function compass(pen: Pen, x: number, y: number, r: number): void {
  const g = pen.floor(0, 2);
  g.circle(x, y, r, C.paving, { outline: true, w: W_THIN, seg: 28, grain: 0.6 });
  g.circle(x, y, r * 0.86, null, { w: W_FINE, seg: 24, ink: C.stoneDark });
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2 + Math.PI / 4;
    const len = i % 2 === 0 ? r * 0.8 : r * 0.5;
    const s = r * 0.14;
    g.poly(
      [
        [x + Math.cos(t) * len, y + Math.sin(t) * len],
        [x + Math.cos(t + Math.PI / 2) * s, y + Math.sin(t + Math.PI / 2) * s],
        [x, y],
      ],
      i % 2 === 0 ? C.brickRose : C.stoneDark,
      { outline: true, w: W_FINE, layer: 1, grain: 0.6 },
    );
    g.poly(
      [
        [x + Math.cos(t) * len, y + Math.sin(t) * len],
        [x + Math.cos(t - Math.PI / 2) * s, y + Math.sin(t - Math.PI / 2) * s],
        [x, y],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 1, grain: 0.6 },
    );
  }
}

function forecourt(c: BlockCtx): void {
  const { pen, rng } = c;

  // taxi rank along the north wing
  for (const y of [9.2, 13.5, 17.6]) {
    pen.push(21.4, y, 0, 90);
    taxi(pen);
    pen.pop();
  }
  pen.obj(() => {
    pen.pole([20.3, 7.0, 0], [20.3, 7.0, 2.7], 0.08, C.greyDark);
    const s = pen.card(20.3, 7.0, 2.1);
    s.rect(-0.5, 0, 0.5, 0.6, C.black, { outline: true, w: W_FINE, layer: 1 });
    s.text("TAXI", 0, 0.17, 0.25, { align: "c", layer: 2, w: 0.05, color: C.yellow, kind: L_MARK });
  });
  person(pen, 22.9, 10.6, 0, randomLook(rng), "wave", true);
  suitcase(pen, 23.4, 10.9, C.red);

  // tram shelters on the city side, tourist office, flower stall
  shelter(pen, rng, 38.5, 8.6, 5);
  shelter(pen, rng, 38.5, 15.4, 5);
  kiosk(pen, rng, 26.2, 7.0, 3.2, 2.8, C.white, C.blue, "VVV");
  person(pen, 27.2, 10.6, 0, randomLook(rng), "stand");
  person(pen, 28.3, 10.9, 0, randomLook(rng), "stand", true);
  person(pen, 30.1, 8.6, 0, randomLook(rng), "wave");

  pen.push(33.4, 29.4, 0);
  stall(pen, rng, { w: 3.6, d: 2.2, a: C.green, sign: "BLOEMEN", goods: TULIP });
  pen.pop();
  pen.obj(() => {
    for (let i = 0; i < 7; i++) {
      const bx = 33.7 + (i % 4) * 0.85 + (i > 3 ? 0.4 : 0);
      const by = 32.4 + (i > 3 ? 0.8 : 0);
      pen.cyl(bx, by, 0, 0.28, 0.45, C.metal, { seg: 7, w: W_FINE });
      const col = TULIP[i % TULIP.length];
      const cc = pen.card(bx, by, 0.45);
      for (let k = 0; k < 4; k++) cc.circle(-0.2 + k * 0.14, 0.22 + (k % 2) * 0.14, 0.13, col, { seg: 6, grain: 0, sway: 0.1, layer: 1 });
    }
  });
  person(pen, 36.2, 33.4, 0, randomLook(rng), "stand", true);
  person(pen, 32.9, 32.8, 0, randomLook(rng), "stand");

  // canal cruises: a booth, a queue, and a boat waiting at the quay
  kiosk(pen, rng, 37.6, 35.6, 3.4, 2.6, hex("#f0e2bd"), C.red, "RONDVAART");
  for (let i = 0; i < 7; i++) person(pen, 39.6 - i * 0.78 + rng.range(-0.1, 0.1), 39.1 + (i % 2) * 0.25, 0, randomLook(rng), "stand", rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  pen.push(49.9, 35.4, WATER, 90);
  cruiseBoat(pen, rng, { stripe: C.red });
  pen.pop();
  pen.fill(
    [
      [47.9, 36.6, 0.02],
      [47.9, 37.5, 0.02],
      [48.9, 37.5, WATER + 0.62],
      [48.9, 36.6, WATER + 0.62],
    ],
    C.wood,
    { outline: true, w: W_THIN },
  );

  // the bike park
  bikeFlat(pen, rng, 21.4, 30.9, 9.6, 9.8);
  bikeRow(pen, rng, 20.2, 29.1, 12, 270, 0.6);

  peperbus(pen, rng, 38.9, 22.6);
  krul(pen, rng, 39.9, 31.2);

  // greenery, light and somewhere to sit
  planter(pen, rng, 26.3, 17.3);
  planter(pen, rng, 35.2, 9.2);
  planter(pen, rng, 35.4, 21.2);
  planter(pen, rng, 33.2, 38.2);
  for (const [x, y] of [
    [25.0, 12.4],
    [36.8, 14.6],
    [25.4, 28.6],
    [36.6, 27.4],
    [31.4, 34.2],
  ] as V2[]) {
    lamp(pen, x, y);
  }
  bench(pen, 28.1, 18.2, 0);
  bench(pen, 33.6, 21.0, 90);
  bench(pen, 35.0, 11.4, 0);
  bench(pen, 31.4, 38.4, 90);
  person(pen, 27.8, 18.3, 0.3, randomLook(rng), "sit");
  person(pen, 33.6, 20.6, 0.3, randomLook(rng), "sit", true);
  flag(pen, 23.2, 20.2, 0, 6.4, "amsterdam", 1.25);
  flag(pen, 23.2, 27.8, 0, 6.4, "nl", 1.25);

  // a busker with a ring of listeners
  pen.obj(() => {
    const bx = 30.4;
    const by = 14.6;
    const lk = randomLook(rng);
    person(pen, bx, by, 0, lk, "stand");
    const gc = pen.card(bx, by + 0.02, 0);
    gc.ellipse(0.22, 0.98, 0.3, 0.24, C.wood, { outline: true, w: W_FINE, layer: 6, seg: 9 });
    gc.bar(0.3, 1.05, 0.86, 1.42, 0.09, C.woodDark, { layer: 6 });
    pen.box(bx + 0.5, by + 0.9, 0, 1.1, 0.5, 0.12, C.black, { w: W_FINE });
    for (let i = 0; i < 9; i++) {
      const t = -0.5 + (i / 8) * 4.0;
      const r = rng.range(2.4, 3.0);
      person(pen, bx + Math.cos(t) * r, by + Math.sin(t) * r, 0, randomLook(rng), rng.pick(["stand", "stand", "wave", "cheer"]), Math.cos(t) > 0, rng.chance(0.15) ? 0.72 : 1);
    }
  });

  // a tour group following an umbrella
  pen.obj(() => {
    const gx = 27.2;
    const gy = 27.6;
    person(pen, gx, gy, 0, { ...randomLook(rng), top: C.red }, "wave");
    pen.pole([gx + 0.62, gy, 1.8], [gx + 0.62, gy, 3.3], 0.06, C.black, { ink: false });
    pen.cone(gx + 0.62, gy, 3.0, 0.75, 0.42, C.yellow, { seg: 8, crease: 0.5, w: W_FINE });
    for (let i = 0; i < 9; i++) {
      person(pen, gx + 1.0 + (i % 3) * 0.95 + rng.range(-0.2, 0.2), gy + 0.9 + Math.floor(i / 3) * 0.95 + rng.range(-0.2, 0.2), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.4));
    }
  });

  // arrivals: suitcases, a reunion, a child after the pigeons
  for (let i = 0; i < 13; i++) traveller(pen, rng, rng.range(22.8, 37.5), rng.range(21.0, 27.2));
  for (let i = 0; i < 5; i++) traveller(pen, rng, rng.range(23.5, 31), rng.range(15.5, 19.5));
  pen.obj(() => {
    const a = randomLook(rng);
    const b = randomLook(rng);
    person(pen, 24.2, 23.6, 0, a, "cheer");
    person(pen, 24.95, 23.75, 0, b, "cheer", true);
    suitcase(pen, 25.7, 24.0, C.blue);
    const h = pen.card(24.6, 23.7, 2.9);
    h.poly(
      [
        [0, 0],
        [0.26, 0.26],
        [0.2, 0.45],
        [0, 0.34],
        [-0.2, 0.45],
        [-0.26, 0.26],
      ],
      C.red,
      { outline: true, w: 0.045, sway: 0.2 },
    );
  });
  person(pen, 33.6, 17.4, 0, randomLook(rng), "walkA", false, 0.7);
  for (let i = 0; i < 14; i++) {
    pen.push(rng.range(31, 36.6), rng.range(15.6, 19.6), 0);
    pigeonShape(pen, 0, rng.chance(0.5));
    pen.pop();
  }
  for (let i = 0; i < 6; i++) {
    pen.push(rng.range(27, 30.5), rng.range(20.4, 22.2), 0);
    pigeonShape(pen, 0, rng.chance(0.5));
    pen.pop();
  }
}

// ---------------------------------------------------------------- the ferry pier

const PIER_X = -12;
const PIER_Y0 = 33.6;
const PIER_Y1 = 45.8;

function pier(c: BlockCtx): void {
  const { pen, rng } = c;
  const berths = FERRY.lanes.map((y) => y - c.oy);
  pen.obj(() => {
    for (const x of [-0.9, -2.7, -11.1]) {
      for (const y of [PIER_Y0 + 0.5, (PIER_Y0 + PIER_Y1) / 2, PIER_Y1 - 0.5]) {
        pen.pole([x, y, WATER], [x, y, -0.3], 0.3, C.woodDark);
      }
    }
    pen.box(PIER_X, PIER_Y0, -0.32, 0.3 - PIER_X, PIER_Y1 - PIER_Y0, 0.32, C.wood, { top: C.stone, w: 0.11 });
    const f = pen.wall("y+", PIER_X, PIER_Y0, -0.32, 0.3 - PIER_X, PIER_Y1 - PIER_Y0);
    for (let a = 0.6; a < -PIER_X; a += 0.9) f.seg(a, 0.02, a, 0.3, { w: 0.05, color: C.woodDark, kind: L_MARK, wobble: 0 });
  });
  // the ramps the ferries drop their bows onto
  for (const y of berths) {
    pen.obj(() => {
      pen.fill(
        [
          [PIER_X, y - 1.7, 0.01],
          [PIER_X, y + 1.7, 0.01],
          [PIER_X - 2.1, y + 1.7, WATER + 0.9],
          [PIER_X - 2.1, y - 1.7, WATER + 0.9],
        ],
        C.metal,
        { outline: true, w: W_THIN },
      );
      for (let k = 1; k < 5; k++) {
        const x = PIER_X - (2.1 * k) / 5;
        const z = 0.01 + ((WATER + 0.9 - 0.01) * k) / 5;
        pen.stroke(
          [
            [x, y - 1.6, z + 0.02],
            [x, y + 1.6, z + 0.02],
          ],
          { w: 0.05, color: C.greyDark, kind: L_MARK, wobble: 0 },
        );
      }
    });
  }
  railing(
    pen,
    [
      [-0.2, PIER_Y1 - 0.15, 0],
      [PIER_X + 0.15, PIER_Y1 - 0.15, 0],
    ],
    0.9,
    C.white,
    1.5,
  );
  railing(
    pen,
    [
      [PIER_X + 0.15, (berths[0] + berths[1]) / 2 - 1.3, 0],
      [PIER_X + 0.15, (berths[0] + berths[1]) / 2 + 1.3, 0],
    ],
    0.9,
    C.white,
    1.3,
  );
  // waiting shelter and the sign that makes this the best deal in town
  pen.obj(() => {
    const sx = -8.4;
    const sy = PIER_Y0 + 0.2;
    pen.box(sx, sy, 0.15, 4.6, 0.12, 2.1, GLASSROOF, { w: W_THIN, grain: 0.5 });
    pen.box(sx - 0.2, sy - 0.1, 2.3, 5.0, 1.9, 0.14, C.blue, { w: W_THIN });
    pen.pole([sx + 0.1, sy + 1.6, 0], [sx + 0.1, sy + 1.6, 2.3], 0.09, C.white);
    pen.pole([sx + 4.5, sy + 1.6, 0], [sx + 4.5, sy + 1.6, 2.3], 0.09, C.white);
    const sign = pen.wall("y+", sx - 0.2, sy - 0.1, 2.44, 5.0, 1.9);
    sign.rect(0.3, 0, 4.7, 0.78, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    sign.text("GRATIS PONT", 2.5, 0.2, 0.36, { align: "c", layer: 1, w: 0.055, color: C.blueDark, kind: L_MARK });
    pen.stroke(
      [
        [sx + 0.4, sy + 0.9, 2.26],
        [sx + 4.2, sy + 0.9, 2.26],
      ],
      { w: 0.16, kind: L_LIGHT, wobble: 0 },
    );
  });
  lamp(pen, -3.6, PIER_Y1 - 0.5);
  lamp(pen, -9.6, PIER_Y1 - 0.5);
  flag(pen, PIER_X + 0.4, PIER_Y1 - 0.5, 0, 4.6, "amsterdam", 0.9);
  // passengers, most of them with a bike
  for (let i = 0; i < 16; i++) {
    const x = rng.range(PIER_X + 0.9, -1.6);
    const y = rng.range(PIER_Y0 + 2.4, PIER_Y1 - 1.4);
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
    if (rng.chance(0.5)) {
      pen.push(x + 0.3, y + 0.55, 0, rng.pick([170, 180, 190]));
      bike(pen, { color: rng.pick([C.black, C.blueDark, C.redDark, C.green]), crate: rng.chance(0.3) });
      pen.pop();
    }
  }
}

// ---------------------------------------------------------------- ferries

/** The IJ ferry: blue and white, the same at both ends, bikes and all. */
function ferryShape(pen: Pen, rng: Rng): void {
  const L = FERRY.length;
  const h = L / 2;
  const hull: V2[] = [
    [-h, -1.5],
    [-h + 0.95, -2.3],
    [h - 0.95, -2.3],
    [h, -1.5],
    [h, 1.5],
    [h - 0.95, 2.3],
    [-h + 0.95, 2.3],
    [-h, 1.5],
  ];
  pen.begin();
  pen.extrude(hull, -0.12, 0.8, C.blue, { top: C.ballast, w: 0.11, crease: 20 });
  pen.extrude(
    hull.map((p) => [p[0] * 1.004, p[1] * 1.01] as V2),
    0.5,
    0.66,
    C.white,
    { w: W_THIN, crease: 20 },
  );
  // bulwarks along both sides
  for (const y of [-2.3, 2.14]) pen.box(-h + 1.0, y, 0.8, L - 2.0, 0.16, 0.6, C.white, { w: W_THIN });
  // the two legs of the bridge, with a window each, and the wheelhouse across the top
  for (const y of [-2.3, 1.74]) {
    pen.box(-1.7, y, 0.8, 3.4, 0.56, 2.0, C.white, { w: W_THIN });
    for (const side of ["y+", "y-"] as const) {
      const f = pen.wall(side, -1.7, y, 0.8, 3.4, 0.56);
      f.rect(0.35, 0.75, 1.45, 1.55, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
      f.rect(1.95, 0.75, 3.05, 1.55, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
    }
  }
  pen.box(-1.95, -2.4, 2.8, 3.9, 4.8, 0.18, C.white, { w: W_THIN });
  pen.box(-1.15, -1.55, 2.98, 2.3, 3.1, 1.15, C.white, { top: C.blue, w: W_THIN });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -1.15, -1.55, 2.98, 2.3, 3.1);
    const w = side.startsWith("y") ? 2.3 : 3.1;
    f.rect(0.15, 0.4, w - 0.15, 0.98, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
    const n = Math.round(w / 0.8);
    for (let i = 1; i < n; i++) f.seg((i * w) / n, 0.4, (i * w) / n, 0.98, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  pen.pole([0, 0, 4.13], [0, 0, 5.4], 0.08, C.white);
  pen.stroke(
    [
      [0, -0.5, 4.9],
      [0, 0.5, 4.9],
    ],
    { w: 0.09, kind: L_BAR, wobble: 0 },
  );
  pen.card(0, 0, 5.4).circle(0, 0, 0.16, C.lamp, { glow: 1, seg: 7, outline: true, w: 0.04 });
  // bow doors, folded up at each end
  for (const s of [-1, 1]) {
    pen.fill(
      [
        [s * h, -1.45, 0.8],
        [s * h, 1.45, 0.8],
        [s * (h + 0.35), 1.45, 1.55],
        [s * (h + 0.35), -1.45, 1.55],
      ],
      C.yellow,
      { outline: true, w: W_THIN },
    );
  }
  // deck lights
  for (const y of [-2.2, 2.2]) {
    for (let k = 0; k < 4; k++) {
      const x = -h + 1.6 + k * ((L - 3.2) / 3);
      pen.stroke(
        [
          [x - 0.03, y, 1.5],
          [x + 0.03, y, 1.5],
        ],
        { w: 0.2, kind: L_LIGHT, wobble: 0 },
      );
    }
  }
  // passengers: on foot, and holding their bikes
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = s * rng.range(2.3, 4.3);
      const y = rng.range(-1.7, 1.7);
      person(pen, x, y, 0.8, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
      if (i < 2) {
        pen.push(x + 0.25, y + 0.5, 0.8, 180);
        bike(pen, { color: rng.pick([C.black, C.redDark, C.green, C.orange]), crate: rng.chance(0.4) });
        pen.pop();
      }
    }
  }
  pen.end();
}

function wakeShape(pen: Pen, s: number): void {
  const x = s * (FERRY.length / 2);
  for (const k of [-1, 1]) {
    pen.stroke(
      [
        [x + s * 0.2, k * 1.7, 0.03],
        [x + s * 2.0, k * 2.7, 0.03],
        [x + s * 4.2, k * 3.3, 0.03],
      ],
      { w: 0.12, color: C.white, kind: L_RIPPLE, wobble: 0.7, alpha: 0.9 },
    );
  }
  pen.stroke(
    [
      [x + s * 0.5, 0.2, 0.03],
      [x + s * 2.6, -0.1, 0.03],
    ],
    { w: 0.1, color: C.white, kind: L_RIPPLE, wobble: 0.7, alpha: 0.85 },
  );
  pen.stroke(
    [
      [x + s * 1.2, -0.9, 0.03],
      [x + s * 3.2, -0.7, 0.03],
    ],
    { w: 0.09, color: C.white, kind: L_RIPPLE, wobble: 0.7, alpha: 0.8 },
  );
}

function ferries(c: BlockCtx, born: number): void {
  const ships: Sprite[] = [makeSprite((pen) => ferryShape(pen, new Rng(801)), 0, 801), makeSprite((pen) => ferryShape(pen, new Rng(802)), 0, 802)];
  const wakeEast = makeSprite((pen) => wakeShape(pen, 1), 0, 811);
  const wakeWest = makeSprite((pen) => wakeShape(pen, -1), 0, 812);
  const dwell = 3.8;
  const cross = 6.6;
  const cycle = 2 * (dwell + cross);
  for (let i = 0; i < 2; i++) {
    const y = FERRY.lanes[i];
    const phase = i * (dwell + cross);
    c.movers.push((m) => {
      if (m.t < born) return;
      const tt = (m.t + phase) % cycle;
      let x = FERRY.cityX;
      let moving = 0;
      if (tt < dwell) x = FERRY.cityX;
      else if (tt < dwell + cross) {
        x = FERRY.cityX + (FERRY.noordX - FERRY.cityX) * ease.inOutSine((tt - dwell) / cross);
        moving = -1;
      } else if (tt < 2 * dwell + cross) x = FERRY.noordX;
      else {
        x = FERRY.noordX + (FERRY.cityX - FERRY.noordX) * ease.inOutSine((tt - 2 * dwell - cross) / cross);
        moving = 1;
      }
      const z = WATER + 0.03 * Math.sin(m.clock * 1.7 + i * 2);
      m.put(ships[i], x, y, z, born);
      if (moving !== 0) m.put(moving < 0 ? wakeEast : wakeWest, x, y, WATER, born);
    });
  }
}

// ---------------------------------------------------------------- on the IJ

/** A small sailing boat, bow along local +x, heeling a little. */
function sailboat(pen: Pen, hull: RGB, sail: RGB, seed: number): void {
  const r = new Rng(seed);
  pen.begin();
  pen.extrude(hullShape(5.2, 1.7, 0.4), -0.1, 0.55, hull, { top: C.wood, crease: 28, w: 0.1 });
  person(pen, -1.7, 0.1, 0.3, randomLook(r), "bust");
  person(pen, -0.9, -0.3, 0.3, randomLook(r), "bust", true);
  pen.pole([0.4, 0, 0.5], [0.4, 0, 6.7], 0.1, C.white);
  const cloth = pen.plane([0.4, 0, 0], [0.94, 0.34, 0], [0.08, -0.06, 1], 0, true);
  cloth.poly(
    [
      [-0.15, 1.3],
      [-3.0, 1.3],
      [-0.15, 6.5],
    ],
    sail,
    { outline: true, w: W_THIN, grain: 0.5 },
  );
  cloth.poly(
    [
      [0.15, 1.1],
      [2.2, 1.1],
      [0.15, 5.7],
    ],
    C.white,
    { outline: true, w: W_THIN, grain: 0.5 },
  );
  cloth.seg(-0.15, 1.3, -3.0, 1.3, { w: 0.09, color: C.woodDark, kind: L_BAR, wobble: 0 });
  pen.card(0.4, 0, 6.7).rect(0, 0, 0.6, 0.36, C.red, { outline: true, w: 0.04, sway: 0.3 });
  for (const k of [-1, 1]) {
    pen.stroke(
      [
        [-2.5, k * 0.5, 0.03],
        [-3.9, k * 1.0, 0.03],
        [-5.2, k * 1.25, 0.03],
      ],
      { w: 0.1, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
    );
  }
  pen.end();
}

/** A channel buoy with a light on top. */
function buoy(pen: Pen, x: number, y: number, rgb: RGB): void {
  pen.begin();
  pen.cyl(x, y, WATER - 0.05, 0.55, 0.5, rgb, { seg: 8, w: W_THIN });
  pen.cone(x, y, WATER + 0.45, 0.42, 1.1, rgb, { seg: 8, w: W_THIN });
  pen.card(x, y, WATER + 1.55).circle(0, 0.12, 0.15, C.lamp, { outline: true, w: 0.04, glow: 1, seg: 6 });
  pen.end();
}

function onTheIJ(c: BlockCtx, born: number): void {
  const { pen } = c;
  buoy(pen, -27.2, 31.4, C.red);
  buoy(pen, -27.2, 47.6, C.green);
  buoy(pen, -23, 11, C.red);
  buoy(pen, -13.4, -22, C.green);
  const loop = new Route(
    [
      [-30, 50, WATER],
      [-15, 60, WATER],
      [-16, 80, WATER],
      [-32, 86, WATER],
      [-38, 67, WATER],
    ],
    true,
    6,
  );
  const fleet = [new Turning((p) => sailboat(p, C.white, hex("#f3ead2"), 91), 24, 91), new Turning((p) => sailboat(p, C.blue, C.red, 92), 24, 92), new Turning((p) => sailboat(p, C.wood, C.white, 93), 24, 93)];
  fleet.forEach((set, i) => {
    c.movers.push(traveler(loop, { speed: 2.3, at: i / 3 + 0.05 * i, born: born + i * 0.3, span: 4, sprite: (h) => set.at(h) }));
  });
}

// ---------------------------------------------------------------- trains

/** One car of an intercity, pointing along local +x. The leading car has a sloped nose. */
function trainCar(pen: Pen, lead: boolean, panto: boolean): void {
  const L = 8.3;
  const W = 2.3;
  const H = 2.85;
  const z0 = 0.42;
  const x0 = -L / 2;
  const body = lead ? L - 1.5 : L;
  pen.begin();
  pen.box(x0 + 0.8, -W / 2 + 0.15, 0.04, 1.7, W - 0.3, 0.4, C.charcoal, { edges: false });
  pen.box(x0 + L - 2.7, -W / 2 + 0.15, 0.04, 1.7, W - 0.3, 0.4, C.charcoal, { edges: false });
  pen.box(x0, -W / 2, z0, body, W, H, NS_YELLOW, { top: C.slateLight, w: 0.11 });
  if (lead) {
    const xa = x0 + body;
    const xb = x0 + L;
    pen.solid(
      [
        [xa, -W / 2, z0],
        [xb, -W / 2, z0],
        [xb, W / 2, z0],
        [xa, W / 2, z0],
        [xa, -W / 2, z0 + H],
        [xb, -W / 2, z0 + 1.25],
        [xb, W / 2, z0 + 1.25],
        [xa, W / 2, z0 + H],
      ],
      [
        [1, 2, 6, 5],
        [0, 1, 5, 4],
        [3, 7, 6, 2],
        [4, 5, 6, 7],
      ],
      [NS_YELLOW, NS_YELLOW, NS_YELLOW, NS_BLUE],
      { w: 0.11 },
    );
    const sl = pen.plane([xb, W / 2, z0 + 1.25], [0, -1, 0], [xa - xb, 0, H - 1.25], 1, true);
    sl.rect(0.22, 0.16, W - 0.22, 0.86, C.glass, { outline: true, w: W_FINE, glow: 0.5, grain: 0.4 });
    const fr = pen.wall("x+", xa, -W / 2, z0, xb - xa, W);
    fr.rect(0, 0, W, 0.32, NS_BLUE, { grain: 0.5 });
    fr.rect(0.22, 0.5, 0.58, 0.78, C.lamp, { glow: 1, grain: 0, layer: 1 });
    fr.rect(W - 0.58, 0.5, W - 0.22, 0.78, C.lamp, { glow: 1, grain: 0, layer: 1 });
  }
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, x0, -W / 2, z0, body, W);
    f.rect(0, 0, body, 0.32, NS_BLUE, { grain: 0.5 });
    f.rect(0.2, 1.22, body - 0.2, 2.32, NS_BLUE, { grain: 0.5 });
    const n = lead ? 4 : 5;
    const step = (body - 1.0) / n;
    for (let i = 0; i < n; i++) {
      f.rect(0.5 + i * step + 0.12, 1.36, 0.5 + (i + 1) * step - 0.12, 2.18, C.glass, { layer: 1, glow: 0.85, grain: 0.4 });
    }
    for (const a of [0.9, body - 1.8]) {
      f.rect(a, 0.34, a + 0.9, 2.5, NS_YELLOW, { outline: true, w: W_FINE, layer: 2, grain: 0.6 });
      f.rect(a + 0.18, 1.36, a + 0.72, 2.18, C.glass, { layer: 3, glow: 0.85, grain: 0.4 });
    }
  }
  if (panto) {
    pen.stroke(
      [
        [-1.1, 0, z0 + H],
        [-0.2, 0, z0 + H + 0.62],
        [0.7, 0, z0 + H],
      ],
      { w: 0.07, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [-0.2, -0.7, z0 + H + 0.62],
        [-0.2, 0.7, z0 + H + 0.62],
      ],
      { w: 0.09, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
}

function trains(c: BlockCtx, born: number): void {
  const lead = new Turning((pen) => trainCar(pen, true, false), 4, 71);
  const mid = new Turning((pen) => trainCar(pen, false, false), 4, 72);
  const midP = new Turning((pen) => trainCar(pen, false, true), 4, 73);
  const [yA, yB] = railEnds();
  const yTop = yA + 30;
  const yBot = yB - 30;
  const gap = 8.55;
  const cars = 4;
  const half = (gap * (cars - 1)) / 2;
  const stop = c.oy + 21;
  const railZ = (y: number) => {
    if (y < yTop) return RAIL_Z - (RAIL_Z - WATER) * clamp((yTop - y) / 30, 0, 1);
    if (y > yBot) return RAIL_Z - (RAIL_Z - WATER) * clamp((y - yBot) / 30, 0, 1);
    return RAIL_Z;
  };
  const arrive = 10.5;
  const dwell = 4.2;
  const leave = 10.5;
  const cycle = 31;
  for (let k = 0; k < 2; k++) {
    const dir = k === 0 ? 1 : -1;
    const x = TRACKS[k];
    const from = dir > 0 ? yA - half - 4 : yB + half + 4;
    const to = dir > 0 ? yB + half + 4 : yA - half - 4;
    c.movers.push((m) => {
      if (m.t < born) return;
      // on the tour, one train is gliding in and the other pulling out when the camera arrives
      const at = c.visit();
      const phase = k * 15.5 + (at == null ? 6 : 3.5 - at);
      const tt = (((m.t + phase) % cycle) + cycle) % cycle;
      let yc: number;
      if (tt < arrive) yc = from + (stop - from) * ease.out(tt / arrive);
      else if (tt < arrive + dwell) yc = stop;
      else if (tt < arrive + dwell + leave) yc = stop + (to - stop) * ease.in((tt - arrive - dwell) / leave);
      else return;
      for (let i = 0; i < cars; i++) {
        const y = yc + dir * (half - i * gap);
        if (y <= yA + 0.5 || y >= yB - 0.5) continue;
        const z = railZ(y);
        if (!m.sees(x, y, z, 10)) continue;
        // a car draws itself as it comes onto the page and rubs itself out as it leaves
        const q = Math.min(y - yA, yB - y) / 9;
        const t0 = Math.max(born, q >= 1 ? m.t - 20 : m.t - q * 1.08);
        const set = i === 0 || i === cars - 1 ? lead : i === 1 ? midP : mid;
        const heading = (i === cars - 1 ? -dir : dir) * (Math.PI / 2);
        m.put(set.at(heading), x, y, z, t0);
      }
    });
  }
}

// ---------------------------------------------------------------- pigeons

function pigeons(c: BlockCtx, born: number): void {
  const frames = [
    [makeSprite((pen) => pigeonShape(pen, 1, false), 0, 41), makeSprite((pen) => pigeonShape(pen, -1, false), 0, 42)],
    [makeSprite((pen) => pigeonShape(pen, 1, true), 0, 43), makeSprite((pen) => pigeonShape(pen, -1, true), 0, 44)],
  ];
  const pts: V3[] = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    pts.push([c.ox + 30.5 + Math.cos(t) * 8.5, c.oy + 20 + Math.sin(t) * 9.5, 3.6 + 2.2 * Math.sin(t * 2 + 0.6)]);
  }
  const loop = new Route(pts, true);
  const P: V3 = [0, 0, 0];
  for (let i = 0; i < 9; i++) {
    const off = i * 0.9 + (i % 3) * 0.5;
    const dx = ((i * 7) % 5) * 0.35 - 0.7;
    const dz = ((i * 3) % 4) * 0.3;
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = m.t * 6.2 - off;
      loop.pos(s, P);
      const h = loop.heading(s, 1.5);
      const right = Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1;
      m.put(frames[right][Math.floor(m.t * 7 + i * 0.37) & 1], P[0] + dx, P[1] - dx, P[2] + dz, born + i * 0.12);
    });
  }
}

// ---------------------------------------------------------------- the block

export const centraal: BlockBuilder = (c) => {
  const { pen, rng } = c;

  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(FRONT + 0.2, 6.2, 41.8, 41.8, C.plaza);
    speckle(pen.floor(0, 2), FRONT + 1, 7, 41, 41, C.stoneDark, 0.22);
    compass(pen, 31, 24, 4.4);
  });

  shed(pen);
  pavilion(pen, rng, 7, 11.5, false);
  wing(pen, rng, 11.5, 20.5, 11.5, 17.5);
  tower(pen, rng, 17.5, false);
  centre(pen);
  tower(pen, rng, 27.5, true);
  wing(pen, rng, 27.5, 36.5, 30.5, 36.5);
  pavilion(pen, rng, 36.5, 41, true);

  // people at the open end of the platforms
  for (let i = 0; i < 4; i++) person(pen, 8.6 + rng.range(-0.3, 0.4), SHED_Y1 + 0.6 + i * 0.8, RAIL_Z + 0.15, randomLook(rng), rng.pick(["stand", "wave"]), rng.chance(0.5));

  forecourt(c);
  pier(c);

  // movement: people crossing the square, pigeons, ferries, trains
  const w = (pts: V2[]) => new Route(pts.map((p) => [c.ox + p[0], c.oy + p[1], 0] as V3), true, 1.0);
  const axis = w([
    [22.9, 24.6],
    [40.6, 24.6],
    [40.6, 23.2],
    [22.9, 23.2],
  ]);
  const south = w([
    [23.4, 26.6],
    [31.9, 28.3],
    [32.3, 34.7],
    [37.6, 34.6],
    [38.0, 27.9],
    [30.0, 26.2],
  ]);
  const north = w([
    [24.0, 20.9],
    [29.8, 19.6],
    [37.4, 14.6],
    [33.4, 11.9],
    [24.2, 12.9],
  ]);
  const wr = new Rng(606);
  const start = c.done + 0.2;
  for (let i = 0; i < 7; i++) c.movers.push(walker(axis, wr, start + wr.next()));
  for (let i = 0; i < 4; i++) c.movers.push(walker(south, wr, start + wr.next()));
  for (let i = 0; i < 4; i++) c.movers.push(walker(north, wr, start + wr.next()));
  pigeons(c, start + 0.4);
  onTheIJ(c, start);

  const noordT = ISLET_PLAN.find((p) => p.id === "noord")?.t ?? c.t;
  ferries(c, Math.max(c.done, noordT + 2.7));
  const lineT = Math.max(...PLAN.filter((p) => p.i === 0).map((p) => p.t));
  trains(c, lineT + 3.1);

  c.focus(21, 25);
};
