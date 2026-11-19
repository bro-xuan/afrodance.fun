// Schiphol, on its own island off the south-west side of the page: a runway,
// the control tower, a small terminal with its name on the roof, two airliners
// at the stands and a baggage train doing the rounds. Every so often a plane
// lines up, takes off and flies straight across the city, shadow and all.
//
// The island's local frame is 40 x 40 around its centre with z = 0 on the
// paper. The runway runs along y on the camera side; departures head towards
// smaller y, which is the way to the city.

import { RGB, V2, V3, hex, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { BLOCK, GRID, PITCH, WATER } from "../city";
import { Look, W_FINE, W_THIN, person, railing, randomLook, tree, tufts } from "../kit";
import { Route, Turning, makeSprite, rounded } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const SKY_BLUE = hex("#4a9bdc");
const BELLY = hex("#dde3e8");
const WING = hex("#eef1f3");
const ASPHALT = hex("#7b7a80");
const CONCRETE = hex("#dbd8d0");
const HIVIS = hex("#e4ee3c");
const LINE_YELLOW = hex("#f2c230");

const RW_X0 = 30;
const RW_X1 = 35.5;
const RW_Y0 = 2;
const RW_Y1 = 38;
const RW_X = (RW_X0 + RW_X1) / 2;

// terminal footprint
const TX = 4.5;
const TY = 8;
const TW = 6.5;
const TD = 24;
const TH = 4.6;

// stands
const STAND_X = 20.5;
const STAND_Y: [number, number] = [14.5, 26.5];

const P: V3 = [0, 0, 0];

function blob(cx: number, cy: number, rx: number, ry: number, p: number, wob: number, n = 76): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const k = 1 / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
    const w = 1 + wob * (0.6 * Math.sin(5 * t + 0.7) + 0.4 * Math.sin(9 * t + 2.1));
    out.push([cx + c * k * rx * w, cy + s * k * ry * w]);
  }
  return out;
}

function inPoly(x: number, y: number, pts: V2[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Something held: drawn on a card in front of the figure standing at the same spot. */
function held(pen: Pen, x: number, y: number, z: number, draw: (c: Plane) => void): void {
  const c = pen.card(x, y, z);
  c.layer = 6;
  pen.begin();
  draw(c);
  pen.end();
}

// ---------------------------------------------------------------- the airliner

/**
 * A small twin-engined airliner, nose towards local +x, wheels on z = 0.
 * `pitch` lifts the nose (degrees) about the main wheels.
 */
function airliner(pen: Pen, o: { pitch?: number; gear?: boolean } = {}): void {
  const th = ((o.pitch ?? 0) * Math.PI) / 180;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const PA = -0.8;
  const CZ = 1.6;
  // (a along the body, s to the left, u up from the ground) to local space
  const T = (a: number, s: number, u: number): V3 => [PA + (a - PA) * ct - u * st, s, (a - PA) * st + u * ct];
  pen.begin();

  // fuselage: an eight-sided tube, sky blue on top, white down the sides
  const stations: [number, number, number][] = [
    [-5.9, 0.2, 0.55],
    [-4.4, 0.72, 0.12],
    [-2.8, 0.85, 0],
    [3.4, 0.85, 0],
    [4.7, 0.62, -0.08],
    [5.6, 0.2, -0.2],
  ];
  const verts: V3[] = [];
  for (const [a, r, du] of stations) {
    for (let k = 0; k < 8; k++) {
      const ph = Math.PI / 8 + (k * Math.PI) / 4;
      verts.push(T(a, r * Math.cos(ph), CZ + du + r * Math.sin(ph)));
    }
  }
  const faces: number[][] = [];
  const cols: RGB[] = [];
  for (let i = 0; i < stations.length - 1; i++) {
    for (let k = 0; k < 8; k++) {
      const k1 = (k + 1) % 8;
      faces.push([i * 8 + k, i * 8 + k1, (i + 1) * 8 + k1, (i + 1) * 8 + k]);
      cols.push(k <= 2 ? SKY_BLUE : k === 3 || k === 7 ? C.white : BELLY);
    }
  }
  const last = (stations.length - 1) * 8;
  faces.push([last, last + 1, last + 2, last + 3, last + 4, last + 5, last + 6, last + 7]);
  cols.push(C.white);
  faces.push([7, 6, 5, 4, 3, 2, 1, 0]);
  cols.push(SKY_BLUE);
  pen.solid(verts, faces, cols, { convex: false, crease: 50, over: 0, w: 0.11 });

  // flat pieces: wings, tailplane, fin
  const slab = (pts: [number, number, number][], thick: number, across: "u" | "s", rgb: RGB) => {
    const v: V3[] = [];
    const h = thick / 2;
    for (const [a, s, u] of pts) v.push(across === "u" ? T(a, s, u + h) : T(a, s + h, u));
    for (const [a, s, u] of pts) v.push(across === "u" ? T(a, s, u - h) : T(a, s - h, u));
    const n = pts.length;
    const f: number[][] = [];
    const top: number[] = [];
    const bot: number[] = [];
    for (let i = 0; i < n; i++) {
      top.push(i);
      bot.push(2 * n - 1 - i);
      f.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
    }
    f.push(top, bot);
    pen.solid(v, f, rgb, { w: W_THIN, over: 0 });
  };
  for (const m of [1, -1]) {
    slab(
      [
        [1.3, 0.6 * m, CZ - 0.45],
        [-1.5, 0.6 * m, CZ - 0.45],
        [-2.3, 4.8 * m, CZ - 0.1],
        [-1.3, 4.8 * m, CZ - 0.1],
      ],
      0.16,
      "u",
      WING,
    );
    slab(
      [
        [-4.3, 0.3 * m, CZ + 0.3],
        [-5.5, 0.3 * m, CZ + 0.3],
        [-5.9, 2.0 * m, CZ + 0.36],
        [-5.3, 2.0 * m, CZ + 0.36],
      ],
      0.12,
      "u",
      WING,
    );
  }
  slab(
    [
      [-3.7, 0, CZ + 0.72],
      [-5.2, 0, CZ + 3.0],
      [-6.05, 0, CZ + 3.0],
      [-5.75, 0, CZ + 0.66],
    ],
    0.16,
    "s",
    SKY_BLUE,
  );

  // engines under the wings
  for (const m of [1, -1]) {
    const ev: V3[] = [];
    for (const a of [-0.1, 1.6]) {
      for (let k = 0; k < 8; k++) {
        const ph = (k * Math.PI) / 4;
        ev.push(T(a, 2.1 * m + 0.4 * Math.cos(ph), CZ - 0.98 + 0.4 * Math.sin(ph)));
      }
    }
    const ef: number[][] = [];
    const ec: RGB[] = [];
    for (let k = 0; k < 8; k++) {
      ef.push([k, (k + 1) % 8, 8 + ((k + 1) % 8), 8 + k]);
      ec.push(SKY_BLUE);
    }
    ef.push([8, 9, 10, 11, 12, 13, 14, 15]);
    ec.push(C.charcoal);
    ef.push([7, 6, 5, 4, 3, 2, 1, 0]);
    ec.push(C.greyDark);
    pen.solid(ev, ef, ec, { crease: 50, over: 0, w: W_THIN });
  }

  // cheat line, cabin windows (lit at night), doors, windscreen
  for (const m of [1, -1]) {
    pen.stroke([T(-4.2, 0.7 * m, CZ + 0.4), T(-2.8, 0.8 * m, CZ + 0.34), T(3.4, 0.8 * m, CZ + 0.34), T(4.5, 0.63 * m, CZ + 0.27)], {
      w: 0.09,
      color: C.blueDark,
      kind: L_MARK,
      wobble: 0,
    });
    for (let a = -3.3; a <= 3.25; a += 0.44) {
      pen.stroke([T(a, 0.8 * m, CZ + 0.08), T(a + 0.13, 0.8 * m, CZ + 0.08)], { w: 0.13, color: C.glass, kind: L_MARK, wobble: 0 });
    }
    for (let a = -3.3; a <= 3.25; a += 0.88) {
      pen.stroke([T(a, 0.82 * m, CZ + 0.08), T(a + 0.1, 0.82 * m, CZ + 0.08)], { w: 0.12, kind: L_LIGHT, wobble: 0 });
    }
    for (const a of [3.72, 4.06]) pen.stroke([T(a, 0.79 * m, CZ - 0.3), T(a, 0.79 * m, CZ + 0.26)], { w: 0.045, wobble: 0 });
    pen.stroke([T(-1.8, 4.86 * m, CZ - 0.06), T(-1.78, 4.86 * m, CZ - 0.06)], { w: 0.28, kind: L_LIGHT, wobble: 0 });
  }
  pen.stroke([T(4.3, 0.62, CZ + 0.34), T(4.56, 0.3, CZ + 0.53), T(4.56, -0.3, CZ + 0.53), T(4.3, -0.62, CZ + 0.34)], {
    w: 0.2,
    color: C.glass,
    kind: L_MARK,
    wobble: 0,
  });
  pen.stroke([T(-5.6, 0, CZ + 3.06), T(-5.58, 0, CZ + 3.06)], { w: 0.28, kind: L_LIGHT, wobble: 0 });

  if (o.gear !== false) {
    pen.pole(T(4.0, 0, CZ - 0.75), T(4.0, 0, 0.24), 0.1, C.greyDark);
    pen.pole(T(4.0, -0.14, 0.22), T(4.0, 0.14, 0.22), 0.4, C.black, { ink: false });
    for (const m of [1, -1]) {
      pen.pole(T(-0.8, 1.0 * m, CZ - 0.55), T(-0.8, 1.0 * m, 0.26), 0.12, C.greyDark);
      pen.pole(T(-0.8, 1.0 * m - 0.16, 0.25), T(-0.8, 1.0 * m + 0.16, 0.25), 0.46, C.black, { ink: false });
    }
  }
  pen.end();
}

/**
 * The airliner's outline seen from above, as hatching: rows across the body,
 * each [distance along the body, from, to] in units to either side.
 */
const HATCH: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let a = -5.7; a <= 5.5; a += 0.4) {
    const body = a > 4.2 ? 0.62 * Math.max(0.15, (5.7 - a) / 1.5) : a < -4 ? 0.62 * Math.max(0.2, (a + 6.2) / 2.2) : 0.62;
    out.push([a, -body, body]);
    // main wing: between the swept leading and trailing edges
    if (a < 1.25 && a > -2.3) {
      const outer = Math.min(4.8, 0.6 + (4.2 * (1.3 - a)) / 2.6);
      const inner = Math.max(0.62, a < -1.5 ? 0.6 + (4.2 * (-1.5 - a)) / 0.8 : 0);
      if (outer > inner + 0.1) out.push([a, inner, outer], [a, -outer, -inner]);
    }
    // tailplane
    if (a < -4.3 && a > -5.9) {
      const outer = Math.min(2.0, 0.3 + (1.7 * (-4.3 - a)) / 1.0);
      const inner = Math.max(body, a < -5.5 ? 0.3 + (1.7 * (-5.5 - a)) / 0.4 : 0);
      if (outer > inner + 0.1) out.push([a, inner, outer], [a, -outer, -inner]);
    }
  }
  return out;
})();

// ---------------------------------------------------------------- small vehicles

function tugShape(pen: Pen): void {
  pen.box(-0.62, -0.46, 0, 1.24, 0.92, 0.14, C.charcoal, { edges: false });
  pen.box(-0.72, -0.42, 0.14, 1.44, 0.84, 0.46, LINE_YELLOW, { w: W_THIN });
  pen.box(0.0, -0.36, 0.6, 0.56, 0.72, 0.46, C.glassPale, { w: W_FINE, glow: 0.6 });
  const driver: Look = { skin: hex("#d39a6c"), hair: hex("#2b2019"), top: HIVIS, legs: C.blueDark, long: false, hat: null };
  person(pen, -0.38, 0, 0.5, driver, "bust", false);
}

function cartShape(pen: Pen, bags: RGB[]): void {
  pen.box(-0.55, -0.44, 0, 1.1, 0.88, 0.14, C.charcoal, { edges: false });
  pen.box(-0.64, -0.42, 0.14, 1.28, 0.84, 0.13, C.greyDark, { w: W_FINE });
  pen.box(-0.52, -0.32, 0.27, 0.46, 0.62, 0.42, bags[0], { w: W_FINE, grain: 0.5 });
  pen.box(0.02, -0.34, 0.27, 0.5, 0.32, 0.3, bags[1], { w: W_FINE, grain: 0.5 });
  pen.box(0.04, 0.03, 0.27, 0.46, 0.3, 0.36, bags[2], { w: W_FINE, grain: 0.5 });
}

function car(pen: Pen, x: number, y: number, rgb: RGB): void {
  pen.begin();
  pen.box(x - 0.42, y + 0.1, 0, 0.84, 1.7, 0.14, C.charcoal, { edges: false });
  pen.box(x - 0.46, y, 0.12, 0.92, 1.9, 0.4, rgb, { w: W_THIN });
  pen.box(x - 0.4, y + 0.5, 0.52, 0.8, 0.95, 0.34, C.glassPale, { w: W_FINE, top: rgb, glow: 0.4 });
  pen.end();
}

// ---------------------------------------------------------------- the island

export const schiphol: BlockBuilder = (c: BlockCtx) => {
  const { pen, rng } = c;
  const w3 = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const shape = blob(20, 20, 21.2, 21.4, 4.2, 0.016);
  c.focus(20, 21, 1.1);

  const paved = (a: number, b: number) =>
    (a > 10.8 && a < 28.4 && b > 6.3 && b < 34.7) || (a > 28 && a < RW_X1 + 0.3 && b > RW_Y0 - 0.3 && b < RW_Y1 + 0.3) || (a > 4.3 && a < 11.2 && b > 7.8 && b < 37.3);

  // ---- ground
  c.early(() => {
    pen.floor(0, 0).poly(blob(20, 20, 21.95, 22.15, 4.2, 0.016), C.sand, { grain: 0.8 });
    pen.floor(0, 1).poly(shape, C.grass, { outline: true, w: 0.1 });
    tufts(pen.floor(0, 2), -1.5, -1.5, 41.5, 41.5, 0.13, (a, b) => inPoly(a, b, shape) && !paved(a, b));

    const g = pen.floor(0, 2);
    // apron, taxiway links, car park, runway
    g.rect(11, 6.5, 28.2, 34.5, CONCRETE, { outline: true, ink: scaleRGB(CONCRETE, 0.76), w: 0.07 });
    g.rect(28.2, 28.6, RW_X0, 34, CONCRETE);
    g.rect(28.2, 7, RW_X0, 11, CONCRETE);
    g.rect(4.6, 32.6, 11, 37.1, ASPHALT, { outline: true, w: W_THIN });
    g.rect(RW_X0, RW_Y0, RW_X1, RW_Y1, ASPHALT, { outline: true, w: W_THIN });
    const m = pen.floor(0, 3);
    // concrete slab joints
    for (let a = 14.5; a < 28; a += 3.4) m.seg(a, 6.7, a, 34.3, { w: 0.045, color: scaleRGB(CONCRETE, 0.84), kind: L_MARK, wobble: 0.3 });
    for (let b = 10; b < 34; b += 3.5) m.seg(11.2, b, 28, b, { w: 0.045, color: scaleRGB(CONCRETE, 0.84), kind: L_MARK, wobble: 0.3 });
    // runway paint
    for (let y = RW_Y0 + 4.2; y < RW_Y1 - 5; y += 3) m.rect(RW_X - 0.12, y, RW_X + 0.12, y + 1.6, C.white, { grain: 0.4 });
    for (let k = 0; k < 6; k++) {
      const x = RW_X0 + 0.5 + k * 0.82;
      m.rect(x, RW_Y0 + 0.5, x + 0.42, RW_Y0 + 2.7, C.white, { grain: 0.4 });
      m.rect(x, RW_Y1 - 2.7, x + 0.42, RW_Y1 - 0.5, C.white, { grain: 0.4 });
    }
    for (const x of [RW_X0 + 0.22, RW_X1 - 0.22]) m.seg(x, RW_Y0 + 0.3, x, RW_Y1 - 0.3, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0.2 });
    // runway edge lights
    for (let y = RW_Y0 + 0.8; y < RW_Y1; y += 2.35) {
      for (const x of [RW_X0 - 0.3, RW_X1 + 0.3]) {
        m.seg(x - 0.05, y, x + 0.05, y, { w: 0.17, color: C.white, kind: L_MARK, wobble: 0 });
        m.seg(x - 0.01, y, x + 0.01, y, { w: 0.34, kind: L_LIGHT, wobble: 0 });
      }
    }
    // apron paint: stand centre lines, the taxi lane, stop bars
    const yl = { w: 0.1, color: LINE_YELLOW, kind: L_MARK, wobble: 0.2 } as const;
    for (const sy of STAND_Y) {
      m.seg(13.6, sy, 27.3, sy, yl);
      m.seg(14.4, sy - 0.8, 14.4, sy + 0.8, yl);
    }
    m.line(
      [
        [27.3, 8.4],
        [27.3, 30.6],
        [28.4, 31.5],
        [RW_X, 31.5],
      ],
      yl,
    );
    m.line(
      [
        [27.3, 9.4],
        [28.3, 8.9],
        [RW_X, 8.9],
      ],
      yl,
    );
    // parking bays
    for (let i = 0; i <= 5; i++) m.seg(4.95 + i * 1.17, 33.3, 4.95 + i * 1.17, 35.4, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0 });
  });

  // ---- trees behind the terminal and along the far edge
  for (let y = 9.2; y < 31.5; y += 4.3) tree(pen, rng, 2.3, y, { kind: "tall" });
  for (let x = 12.2; x < 27.5; x += 3.6) tree(pen, rng, x, 3.4, { kind: rng.chance(0.3) ? "tall" : "round" });

  // ---- the control tower
  {
    const x = 7.4;
    const y = 4.2;
    pen.obj(() => {
      pen.cyl(x, y, 0, 1.6, 0.8, C.stone, { seg: 10 });
      pen.cyl(x, y, 0.8, 1.05, 9.2, C.white, { seg: 10, top: null });
      // a ladder of slit windows up the shaft
      for (let z = 2; z < 9.4; z += 1.5) {
        for (const a of [Math.PI / 4 - 0.5, Math.PI / 4 + 0.5]) {
          pen.stroke(
            [
              [x + Math.cos(a) * 1.06, y + Math.sin(a) * 1.06, z],
              [x + Math.cos(a) * 1.06, y + Math.sin(a) * 1.06, z + 0.6],
            ],
            { w: 0.16, color: C.glass, kind: L_MARK, wobble: 0 },
          );
        }
      }
    });
    pen.obj(() => {
      pen.cyl(x, y, 10, 1.25, 0.6, C.stone, { seg: 10, r2: 2.0, top: null });
      pen.cyl(x, y, 10.6, 2.0, 2.0, C.glassLight, { seg: 10, r2: 2.7, top: null, glow: 1, grain: 0.4 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        pen.stroke(
          [
            [x + Math.cos(a) * 2.01, y + Math.sin(a) * 2.01, 10.6],
            [x + Math.cos(a) * 2.71, y + Math.sin(a) * 2.71, 12.6],
          ],
          { w: 0.09, color: C.white, kind: L_MARK, wobble: 0 },
        );
      }
      pen.cyl(x, y, 12.6, 2.8, 0.35, C.white, { seg: 12, top: C.stone });
    }, 0.25);
    pen.obj(() => {
      pen.pole([x, y, 12.95], [x, y, 15.9], 0.09, C.greyDark);
      pen.pole([x - 0.5, y, 14.8], [x + 0.5, y, 14.8], 0.06, C.greyDark, { ink: false });
      pen.card(x, y, 15.9).circle(0, 0.1, 0.17, C.red, { outline: true, w: 0.04, seg: 8, glow: 1, grain: 0 });
      pen.pole([x + 1.3, y + 1.3, 12.95], [x + 1.3, y + 1.3, 13.5], 0.1, C.greyDark, { ink: false });
    }, 0.4);
  }

  // ---- the terminal
  pen.obj(() => {
    pen.box(TX, TY, 0, TW, TD, TH, C.white, { top: C.stone });
    const f = pen.wall("x+", TX, TY, 0, TW, TD);
    f.rect(0.4, 0.5, TD - 0.4, TH - 0.6, C.glassLight, { outline: true, w: W_THIN, glow: 0.9, grain: 0.4 });
    for (let a = 1.6; a < TD - 0.6; a += 1.2) f.seg(a, 0.5, a, TH - 0.6, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    f.seg(0.4, 2.3, TD - 0.4, 2.3, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    for (const a of [5.5, 17.5]) f.rect(a - 0.75, 0, a + 0.75, 2.1, C.blueDark, { outline: true, w: W_FINE, layer: 1 });
    const e = pen.wall("y+", TX, TY, 0, TW, TD);
    e.rect(0.5, 0.5, TW - 0.5, TH - 0.6, C.glassLight, { outline: true, w: W_THIN, glow: 0.9, grain: 0.4 });
    for (let a = 1.7; a < TW - 0.6; a += 1.2) e.seg(a, 0.5, a, TH - 0.6, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    e.rect(TW / 2 - 1.0, 0, TW / 2 + 1.0, 2.2, C.glass, { outline: true, w: W_FINE, layer: 2, glow: 1 });
    e.seg(TW / 2, 0, TW / 2, 2.2, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
    e.block(TW / 2 - 1.5, 2.3, TW / 2 + 1.5, 2.5, 1.2, C.blue, { w: W_FINE });
  });
  // the name on the roof
  pen.obj(() => {
    pen.wall("x+", TX, TY, TH, TW - 0.25, TD).block(6.7, 0, 17.3, 2.3, 0.25, C.white, { w: W_THIN });
    pen.wall("x+", TX, TY, TH, TW + 0.01, TD).text("SCHIPHOL", 12, 0.55, 1.25, { align: "c", color: C.blueDark, kind: L_MARK, w: 0.18, wobble: 0.3 });
  }, 0.3);
  // roof clutter, and the viewing terraces at either end
  pen.obj(() => {
    pen.dome(TX + 2.1, TY + 2.3, TH, 1.1, 1.15, C.white, { seg: 10 });
    pen.box(TX + 1.2, TY + 10, TH, 1.6, 2.4, 0.6, C.grey, { w: W_THIN });
    pen.box(TX + 1.4, TY + 15.5, TH, 1.3, 1.3, 0.8, C.grey, { w: W_THIN });
  }, 0.35);
  for (const [y0, y1] of [
    [TY + 0.4, TY + 5.6],
    [TY + TD - 5.6, TY + TD - 0.4],
  ]) {
    railing(
      pen,
      [
        [TX + TW - 0.12, y0, TH],
        [TX + TW - 0.12, y1, TH],
      ],
      0.75,
      C.blueDark,
      1.3,
    );
    for (let i = 0; i < 4; i++) {
      person(pen, TX + TW - 0.75, y0 + 0.7 + i * 1.2 + rng.range(-0.2, 0.2), TH, randomLook(rng), rng.pick(["wave", "stand", "cheer", "wave"]), rng.chance(0.5), rng.chance(0.25) ? 0.72 : 1);
    }
  }

  // ---- stand 1: an airliner on the jet bridge, a tanker under the far wing
  pen.push(STAND_X, STAND_Y[0], 0, 180);
  airliner(pen);
  pen.pop();
  pen.obj(() => {
    const by = STAND_Y[0] + 0.86;
    pen.box(TX + TW, by, 1.2, 6.1, 1.15, 1.55, C.white, { top: C.stone, w: W_THIN });
    const f = pen.wall("y+", TX + TW, by, 1.2, 6.1, 1.15);
    f.rect(0.3, 0.55, 4.9, 1.2, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
    for (let a = 1.1; a < 4.8; a += 0.9) f.seg(a, 0.55, a, 1.2, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    for (let a = 5.25; a < 6; a += 0.22) f.seg(a, 0.08, a, 1.47, { w: 0.05, wobble: 0 });
    pen.pole([15.4, by + 0.58, 0.3], [15.4, by + 0.58, 1.2], 0.22, C.greyDark);
    pen.pole([15.4, by + 0.2, 0.24], [15.4, by + 0.96, 0.24], 0.44, C.black, { ink: false });
  });
  pen.obj(() => {
    pen.box(21.4, 7.4, 0, 2.7, 0.95, 0.16, C.charcoal, { edges: false });
    pen.cyl(22.2, 7.9, 0.16, 0.5, 0.9, C.white, { seg: 8, w: W_THIN });
    pen.box(21.7, 7.42, 0.16, 1.9, 0.96, 0.75, LINE_YELLOW, { w: W_THIN });
    pen.box(23.6, 7.46, 0.16, 0.6, 0.88, 0.95, C.white, { w: W_THIN });
    pen.stroke(
      [
        [22.2, 8.4, 0.5],
        [21.9, 9.6, 0.25],
        [21.7, 10.4, 1.05],
      ],
      { w: 0.08, kind: L_BAR, wobble: 0 },
    );
  });
  const crew = (i: number): Look => ({ skin: [hex("#f6d3b8"), hex("#a8724c"), hex("#d39a6c")][i % 3], hair: hex("#2b2019"), top: HIVIS, legs: C.blueDark, long: false, hat: i % 2 ? C.orange : null });
  person(pen, 22.9, 9.0, 0, crew(0), "stand", false);

  // ---- stand 2: boarding by the stairs, a marshaller with his bats
  pen.push(STAND_X, STAND_Y[1], 0, 180);
  airliner(pen);
  pen.pop();
  {
    const x0 = 16.05;
    const x1 = 17.15;
    const yTop = STAND_Y[1] + 0.9;
    const yBot = yTop + 2.9;
    const zTop = 1.32;
    pen.obj(() => {
      pen.fill(
        [
          [x1, yBot, 0.12],
          [x1, yTop, 0.12],
          [x1, yTop, zTop],
        ],
        C.blue,
        { outline: true, w: W_THIN },
      );
      pen.fill(
        [
          [x0, yBot, 0.12],
          [x1, yBot, 0.12],
          [x1, yTop, zTop],
          [x0, yTop, zTop],
        ],
        C.white,
        { outline: true, w: W_THIN, bias: 0.02 },
      );
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        pen.stroke(
          [
            [x0, yBot - 2.9 * t, 0.12 + (zTop - 0.12) * t],
            [x1, yBot - 2.9 * t, 0.12 + (zTop - 0.12) * t],
          ],
          { w: 0.045, wobble: 0, bias: 0.03 },
        );
      }
      for (const x of [x0, x1]) {
        pen.stroke(
          [
            [x, yBot, 1.0],
            [x, yTop, zTop + 0.9],
          ],
          { w: 0.08, color: C.blueDark, kind: L_BAR, wobble: 0 },
        );
        for (const t of [0, 0.5, 1]) {
          pen.stroke(
            [
              [x, yBot - 2.9 * t, 0.12 + (zTop - 0.12) * t],
              [x, yBot - 2.9 * t, 1.0 + (zTop - 0.12) * t],
            ],
            { w: 0.07, color: C.blueDark, kind: L_BAR, wobble: 0 },
          );
        }
      }
      pen.pole([x1 + 0.05, yBot - 0.5, 0.2], [x1 + 0.05, yBot - 0.2, 0.2], 0.4, C.black, { ink: false });
    });
    for (const t of [0.22, 0.52, 0.84]) {
      person(pen, (x0 + x1) / 2, yBot - 2.9 * t, 0.12 + (zTop - 0.12) * t, randomLook(rng), t > 0.8 ? "wave" : "walkA", false, 0.9);
    }
    const queue: V2[] = [
      [16.9, 30.9],
      [17.7, 31.4],
      [18.5, 31.2],
      [19.3, 31.7],
      [20.1, 31.5],
    ];
    queue.forEach(([qx, qy], i) => {
      person(pen, qx, qy, 0, randomLook(rng), i === 3 ? "wave" : "stand", i % 2 === 0, i === 2 ? 0.72 : 1);
      if (i % 2 === 1) held(pen, qx, qy, 0, (cd) => cd.rect(0.38, 0.05, 0.74, 0.62, [C.red, C.blue, C.purple][i % 3], { outline: true, w: 0.04 }));
    });
    // the marshaller
    person(pen, 13.9, STAND_Y[1], 0, crew(1), "cheer", false);
    held(pen, 13.9, STAND_Y[1], 0, (cd) => {
      cd.bar(-0.62, 1.92, -0.88, 2.42, 0.13, C.orange, { ink: false });
      cd.bar(0.62, 1.92, 0.88, 2.42, 0.13, C.orange, { ink: false });
    });
    person(pen, 23.6, 30.2, 0, crew(2), "stand", true);
    // wheel chocks and a cone or two
    for (const [kx, ky] of [
      [24.4, 28.1],
      [24.4, 24.9],
      [26.9, 26.5],
    ]) {
      pen.cone(kx, ky, 0, 0.2, 0.5, C.orange, { seg: 6, w: W_FINE });
    }
  }

  // ---- the car park, and people on their way in
  {
    const cols = [C.red, C.white, C.blue, LINE_YELLOW, C.greyDark];
    cols.forEach((col, i) => car(pen, 5.55 + i * 1.17, 33.4, col));
    pen.obj(() => {
      pen.pole([10.5, 36.4, 0], [10.5, 36.4, 2.3], 0.09, C.greyDark);
      const cd = pen.card(10.5, 36.4, 2.3);
      cd.rect(-0.45, 0, 0.45, 0.9, C.blue, { outline: true, w: W_FINE });
      cd.text("P", 0, 0.16, 0.56, { align: "c", color: C.white, kind: L_MARK, w: 0.1, layer: 1, wobble: 0 });
    });
    const going: V2[] = [
      [7.2, 32.9],
      [8.6, 32.6],
      [9.3, 33.1],
    ];
    going.forEach(([gx, gy], i) => {
      person(pen, gx, gy, 0, randomLook(rng), i === 0 ? "walkA" : "walkB", true, i === 2 ? 0.72 : 1);
      if (i < 2) held(pen, gx, gy, 0, (cd) => cd.rect(0.4, 0.04, 0.78, 0.66, i ? C.orange : C.teal, { outline: true, w: 0.04 }));
    });
  }

  // ---- by the runway: a fence, the spotters, a windsock, two hares
  railing(
    pen,
    [
      [36.5, 9, 0],
      [36.5, 30.5, 0],
    ],
    0.8,
    C.greyDark,
    1.9,
  );
  {
    person(pen, 37.6, 17.2, 0, randomLook(rng), "stand", true);
    pen.obj(() => {
      // a camera with a long lens on a tripod
      for (const [dx, dy] of [
        [-0.35, 0.25],
        [0.35, 0.25],
        [0, -0.4],
      ]) {
        pen.stroke(
          [
            [37.0 + dx, 17.9 + dy, 0],
            [37.0, 17.9, 1.35],
          ],
          { w: 0.06, kind: L_BAR, wobble: 0 },
        );
      }
      const cd = pen.card(37.0, 17.9, 1.35);
      cd.rect(-0.05, 0, 0.4, 0.3, C.black, { outline: true, w: 0.04 });
      cd.bar(-0.05, 0.16, -0.62, 0.2, 0.2, C.white, { layer: 1 });
    });
    person(pen, 37.5, 18.5, 0, randomLook(rng), "stand", true);
    // one on a step ladder for the view over the fence
    pen.obj(() => {
      pen.box(37.25, 19.9, 0, 0.7, 0.6, 0.7, C.metal, { w: W_FINE });
    });
    person(pen, 37.6, 20.2, 0.7, randomLook(rng), "wave", true);
    person(pen, 38.2, 21.4, 0, randomLook(rng), "cheer", true, 0.72);
    person(pen, 38.4, 16.0, 0, randomLook(rng), "sit", true);
    // the windsock: each band a little looser than the one before
    pen.obj(() => {
      pen.pole([37.6, 33, 0], [37.6, 33, 3.4], 0.1, C.white);
      const cd = pen.card(37.6, 33, 3.15);
      for (let i = 0; i < 5; i++) {
        const a0 = 0.05 + i * 0.36;
        const a1 = a0 + 0.36;
        const h0 = 0.3 - i * 0.04;
        const h1 = 0.3 - (i + 1) * 0.04;
        cd.poly(
          [
            [a0, -h0],
            [a1, -h1],
            [a1, h1],
            [a0, h0],
          ],
          i % 2 === 0 ? C.orange : C.white,
          { outline: true, w: 0.04, sway: 0.08 + i * 0.09, grain: 0.4 },
        );
      }
    });
    // hares, quite unbothered
    for (const [hx, hy, flip] of [
      [38.3, 26.8, false],
      [37.3, 6.2, true],
      [38.9, 12.2, false],
    ] as const) {
      pen.obj(() => {
        const cd = pen.card(hx, hy, 0, flip);
        const col = hex("#b08a5c");
        cd.ellipse(0, 0.24, 0.32, 0.22, col, { outline: true, w: 0.04, seg: 9 });
        cd.circle(0.28, 0.48, 0.15, col, { outline: true, w: 0.04, seg: 8, layer: 1 });
        cd.bar(0.24, 0.58, 0.18, 0.98, 0.08, col, { layer: 1 });
        cd.bar(0.34, 0.58, 0.36, 0.96, 0.08, col, { layer: 1 });
        cd.circle(-0.32, 0.26, 0.09, C.white, { seg: 6, layer: 1 });
      });
    }
  }

  // ================================================================ movers
  const born = c.done;

  // ---- the baggage train: a tug and three carts, round and round stand 2
  {
    const tug = new Turning(tugShape, 16, 701);
    const sets: RGB[][] = [
      [C.red, C.blue, C.orange],
      [C.green, C.purple, C.black],
      [C.teal, C.red, C.yellow],
    ];
    const carts = sets.map((bags, i) => new Turning((p) => cartShape(p, bags), 16, 710 + i));
    const route = new Route(rounded([w3(12.4, 33.3), w3(12.4, 20.5), w3(27.3, 20.5), w3(27.3, 33.3)], true, 1.3), true);
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = 2.7 * m.t;
      for (let i = 0; i < 4; i++) {
        const si = s - i * 1.6;
        route.pos(si, P);
        if (!m.sees(P[0], P[1], P[2], 6)) continue;
        m.put((i === 0 ? tug : carts[i - 1]).at(route.heading(si, 1.2)), P[0], P[1], P[2], born + 0.12 * i);
      }
    });
  }

  // ---- the radar on the tower roof
  {
    const o = w3(7.4 + 1.3, 4.2 + 1.3, 13.5);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(o[0], o[1], o[2], 6)) return;
      const a = m.t * 2.4;
      const dx = Math.cos(a) * 1.0;
      const dy = Math.sin(a) * 1.0;
      const pen2 = m.pen;
      pen2.begin();
      pen2.strokeW(
        [
          [o[0] - dx, o[1] - dy, o[2]],
          [o[0] + dx, o[1] + dy, o[2]],
        ],
        { w: 0.2, color: C.red, kind: L_BAR, wobble: 0 },
      );
      pen2.strokeW(
        [
          [o[0] - dx, o[1] - dy, o[2] + 0.22],
          [o[0] + dx, o[1] + dy, o[2] + 0.22],
        ],
        { w: 0.1, color: C.white, kind: L_BAR, wobble: 0 },
      );
      pen2.end();
    });
  }

  // ---- departures: line up, roll, rotate, and away over the city
  {
    const rolling = makeSprite((p) => airliner(p, { pitch: 0, gear: true }), 270, 721);
    const rotating = makeSprite((p) => airliner(p, { pitch: 9, gear: true }), 270, 722);
    const climbing = makeSprite((p) => airliner(p, { pitch: 13, gear: false }), 270, 723);
    const T = 24;
    const x = c.ox + RW_X;
    const yStart = c.oy + 31.5;
    const ROLL = 4.3;
    const ACC = 2.5;
    const dRoll = 0.5 * ACC * ROLL * ROLL;
    const vRoll = ACC * ROLL;
    const onLand = (wx: number, wy: number) => wx >= 0 && wy >= 0 && wx <= GRID && wy <= GRID && wx % PITCH < BLOCK && wy % PITCH < BLOCK;
    const shade: RGB = [84, 92, 120];
    c.movers.push((m) => {
      if (m.t < born) return;
      // on the tour, departures are timed so one leaves the ground a second after the camera arrives
      const at = c.visit();
      const ref = at == null ? born : at + 1 - (1.2 + ROLL);
      const n = Math.floor((m.t - ref) / T);
      const u = m.t - ref - n * T;
      const tau = u - 1.2;
      let d = 0;
      let z = 0;
      let spr = rolling;
      if (tau > 0) {
        if (tau <= ROLL) {
          d = 0.5 * ACC * tau * tau;
          if (tau > ROLL - 0.55) spr = rotating;
        } else {
          const t2 = tau - ROLL;
          const tc = Math.min(t2, 6.56);
          d = dRoll + vRoll * tc + 0.4 * tc * tc + 16 * (t2 - tc);
          z = Math.min(42, 3.0 * t2 + 0.12 * t2 * t2);
          spr = t2 > 0.7 ? climbing : rotating;
        }
      }
      // sketched in at the threshold, sketched back out at the far end of the page
      const p = u > T - 1.6 ? Math.max(0, 1.05 * (1 - (u - (T - 1.6)) / 1.15)) : u;
      if (p <= 0) return;
      const y = yStart - d;
      m.put(spr, x, y, c.oz + z, m.t - p);
      if (z < 0.4 || !m.sees(x, y, 0, 20)) return;
      // the shadow, hatched in pencil on whatever is underneath
      const k = 1 - 0.25 * (z / 42);
      const gz = (onLand(x, y) ? 0 : WATER) + 0.05;
      const fade = Math.min(1, p) * (0.9 - 0.35 * (z / 42));
      const pen2 = m.pen;
      pen2.begin();
      for (const [a, s0, s1] of HATCH) {
        pen2.strokeW(
          [
            [x + s0 * k, y - a * k, gz],
            [x + s1 * k, y - a * k, gz],
          ],
          { w: 0.13, color: shade, alpha: fade, kind: L_MARK, wobble: 0 },
        );
      }
      pen2.end();
    });
  }
};
