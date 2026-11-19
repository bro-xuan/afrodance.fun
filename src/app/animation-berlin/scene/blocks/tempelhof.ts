// Tempelhofer Feld: the airport the city closed in 2008 and then simply kept
// as it was. The great curved terminal still stands along the back with its
// roof reaching out over the apron and a raisin bomber parked under it; the
// runway is for kite boards, wind skates and roller blades now, the meadow for
// kites, barbecues, a garden knocked together out of pallets, and sheep.
//
// A place off the grid: a 40 x 40 frame standing on the bare paper, so it
// lays its own ground. Nearly everything is laid out in the field's own frame
// F, turned 45 degrees from the world: a runs across the page (the way the
// runway goes), b towards the camera, from the middle of the field.

import { RGB, Rng, V2, V3 } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, L_SPARK, Pen } from "../../engine/pen";
import { dog, picnic, tags } from "../berlin";
import { W_FINE, W_THIN, Look, person, randomLook, tree } from "../kit";
import { Route, cyclist, makeSprite, rounded, walker } from "../motion";
import { C, SKIN } from "../palette";
import { BlockBuilder } from "../types";

const TOP = 0.8;
const EARTH: RGB = [201, 178, 140];
const K = Math.SQRT1_2;
const DEG = Math.PI / 180;

/** How far the field reaches from its middle, by direction (world axes). */
const edgeR = (th: number) => 20.5 + 0.8 * Math.sin(3 * th + 0.5) + 0.5 * Math.sin(5 * th + 1.2);
/** Is a point of F on the field? */
function inField(a: number, b: number, pad = 0): boolean {
  const x = (a + b) * K;
  const y = (b - a) * K;
  return Math.hypot(x, y) < edgeR(Math.atan2(y, x)) - pad;
}
/** How far the field reaches to the right (or the left) at a given b. */
function reach(b: number, sign: number, pad: number): number {
  let lo = 0;
  let hi = 24;
  for (let k = 0; k < 22; k++) {
    const mid = (lo + hi) / 2;
    if (inField(sign * mid, b, pad)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// The runway, the taxiway behind it, and the lanes people keep to on them.
const RUNWAY_B = 2.1;
const RUNWAY_HALF = 2.5;
const RUNWAY_A = 18;
const TAXI_B = -2.4;
// The terminal: an arc round the back of the apron.
const T_IN = 15.5;
const T_OUT = 18.5;
const T_H = 7.6;
const T_FROM = 233 * DEG;
const T_TO = 307 * DEG;
const FACETS = 14;
const ROOF_IN = 11.8;
const ROOF_Z = 3.3;
const APRON_B = -4.2;
const SILVER: RGB = [206, 211, 216];
// The kicker on the runway: where its lip is, and the lane it stands in.
const RAMP_A = -0.95;
const RAMP_B = RUNWAY_B + 1.3;

// ---------------------------------------------------------------- small things

/** A sheep. */
function sheep(pen: Pen, x: number, y: number, flip: boolean, lamb = false): void {
  const s = lamb ? 0.62 : 1;
  const cd = pen.card(x, y, 0, flip);
  pen.begin();
  for (const a of [-0.4, -0.22, 0.24, 0.4]) cd.seg(a * s, 0.3 * s, a * s, 0, { w: 0.09 * s, kind: L_MARK, color: C.black, wobble: 0 });
  cd.ellipse(0, 0.55 * s, 0.75 * s, 0.45 * s, C.white, { outline: true, w: W_FINE, seg: 12, layer: 1 });
  cd.circle(0.75 * s, 0.7 * s, 0.25 * s, C.black, { seg: 8, layer: 2 });
  pen.end();
}

/** A sunflower. */
function sunflower(pen: Pen, x: number, y: number, z: number, h: number): void {
  const cd = pen.card(x, y, z);
  pen.begin();
  cd.bar(0, 0, 0.04, h, 0.07, C.green);
  cd.circle(0.05, h + 0.12, 0.3, C.yellow, { outline: true, w: W_FINE, seg: 9, layer: 1 });
  cd.circle(0.05, h + 0.12, 0.13, C.brickBrown, { seg: 6, layer: 2, grain: 0.3 });
  pen.end();
}

/** A raised bed nailed together from pallets, with whatever is growing in it. */
function bed(pen: Pen, rng: Rng, x: number, y: number, w: number, d: number): void {
  pen.begin();
  pen.box(x, y, 0, w, d, 0.45, C.wood, { top: [118, 92, 70], w: W_FINE });
  pen.floor(0.46, 1).ticks(x + 0.1, y + 0.1, x + w - 0.1, y + d - 0.1, { n: Math.round(w * d * 9), len: 0.3, ang: 1.3, jit: 0.9, color: rng.pick([C.grassDark, C.leaf, C.leafDark, C.leaf2]), w: 0.1 });
  if (rng.chance(0.5)) for (let k = 0; k < 4; k++) pen.card(x + rng.range(0.2, w - 0.2), y + rng.range(0.2, d - 0.2), 0.5).circle(0, 0.1, 0.1, rng.pick([C.red, C.orange, C.pink, C.yellow]), { seg: 5, grain: 0 });
  pen.end();
}

/** A kettle grill. */
function grill(pen: Pen, x: number, y: number): void {
  pen.begin();
  for (const [dx, dy] of [
    [-0.3, -0.2],
    [0.3, -0.2],
    [0, 0.32],
  ]) {
    pen.stroke(
      [
        [x + dx, y + dy, 0],
        [x + dx * 0.5, y + dy * 0.5, 0.6],
      ],
      { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
  }
  pen.cyl(x, y, 0.55, 0.42, 0.28, C.black, { seg: 9, r2: 0.48, top: C.charcoal });
  // the embers, for after dark
  pen.stroke(
    [
      [x, y, 0.9],
      [x, y, 0.94],
    ],
    { w: 1.1, kind: L_LIGHT, wobble: 0, alpha: 0.5 },
  );
  pen.end();
}

/** A lantern left burning in the garden. */
function lantern(pen: Pen, x: number, y: number, z: number): void {
  pen.begin();
  pen.box(x - 0.1, y - 0.1, z, 0.2, 0.2, 0.3, C.lamp, { w: W_FINE, glow: 1 });
  pen.stroke(
    [
      [x, y, z + 0.12],
      [x, y, z + 0.18],
    ],
    { w: 1.3, kind: L_LIGHT, wobble: 0, alpha: 0.4 },
  );
  pen.end();
}

/** Kites. Each is drawn on a card round its own middle; the cloth and the tails take the wind. */
function kite(pen: Pen, kind: "diamond" | "delta" | "octopus" | "power", a: RGB, b: RGB): void {
  const cd = pen.card(0, 0, 0);
  if (kind === "diamond") {
    cd.poly(
      [
        [0, 1.15],
        [0.78, 0.1],
        [0, -1.3],
        [-0.78, 0.1],
      ],
      a,
      { outline: true, w: W_FINE, sway: 0.2 },
    );
    cd.poly(
      [
        [0, 1.15],
        [0.78, 0.1],
        [0, 0.1],
      ],
      b,
      { layer: 1, sway: 0.2, grain: 0.4 },
    );
    cd.line(
      [
        [0, -1.3],
        [0.2, -1.9],
        [-0.15, -2.5],
        [0.2, -3.1],
        [0, -3.7],
      ],
      { w: 0.07, color: b, kind: L_MARK, wobble: 0.3, sway: 0.3, swayB: 1 },
    );
    // (after dark they fly them with little lights along the spars)
    cd.seg(0, 1.05, 0, -1.2, { w: 0.1, color: b, kind: L_SPARK, wobble: 0, sway: 0.2 });
    cd.seg(-0.7, 0.1, 0.7, 0.1, { w: 0.1, color: a, kind: L_SPARK, wobble: 0, sway: 0.2 });
  } else if (kind === "delta") {
    cd.poly(
      [
        [-1.6, -0.55],
        [0, 1.0],
        [1.6, -0.55],
        [0, -0.15],
      ],
      a,
      { outline: true, w: W_FINE, sway: 0.2 },
    );
    cd.poly(
      [
        [-0.5, -0.28],
        [0, 1.0],
        [0.5, -0.28],
        [0, -0.15],
      ],
      b,
      { layer: 1, sway: 0.2, grain: 0.4 },
    );
    for (const s of [-1, 1]) {
      cd.line(
        [
          [s * 1.5, -0.55],
          [s * 1.7, -1.4],
          [s * 1.4, -2.3],
        ],
        { w: 0.07, color: b, kind: L_MARK, wobble: 0.3, sway: 0.3, swayB: 1 },
      );
    }
    cd.line(
      [
        [-1.6, -0.55],
        [0, 1.0],
        [1.6, -0.55],
      ],
      { w: 0.1, color: a, kind: L_SPARK, wobble: 0, sway: 0.2 },
    );
  } else if (kind === "octopus") {
    // one of the giants they fly at the festival: a head the size of a van, and legs
    for (let k = 0; k < 6; k++) {
      const x = -1.25 + k * 0.5;
      cd.line(
        [
          [x, -0.9],
          [x + 0.25, -1.9],
          [x - 0.2, -2.9],
          [x + 0.2, -3.9],
          [x, -4.8],
        ],
        { w: 0.3, color: k % 2 ? a : b, kind: L_MARK, wobble: 0.4, sway: 0.2, swayB: 1 },
      );
    }
    cd.ellipse(0, 0, 1.7, 1.4, a, { outline: true, w: W_THIN, seg: 16, sway: 0.12, layer: 1 });
    for (const s of [-1, 1]) {
      cd.circle(s * 0.6, 0.1, 0.38, C.white, { outline: true, w: W_FINE, seg: 9, layer: 2, sway: 0.12 });
      cd.circle(s * 0.6 + 0.08, 0.02, 0.15, C.black, { seg: 6, layer: 3, grain: 0, sway: 0.12 });
    }
    cd.arc(0, -0.45, 0.5, 0.3, Math.PI * 1.1, Math.PI * 1.9, { w: 0.08, wobble: 0, layer: 3, sway: 0.12, seg: 6 });
    cd.arc(0, 0, 1.7, 1.4, 0, Math.PI * 2, { w: 0.12, color: b, kind: L_SPARK, wobble: 0, sway: 0.12, seg: 16 });
    for (const s of [-1, 1]) cd.arc(s * 0.6, 0.1, 0.38, 0.38, 0, Math.PI * 2, { w: 0.1, color: C.white, kind: L_SPARK, wobble: 0, sway: 0.12, seg: 9 });
  } else {
    // the board rider's kite: a fat arched wing, its tips down towards the lines
    const arch = (r: number, h: number, dy: number): V2[] => {
      const pts: V2[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = (20 + k * 14) * DEG;
        pts.push([Math.cos(t) * r, Math.sin(t) * h + dy]);
      }
      return pts;
    };
    const outer = arch(2.7, 1.6, 0);
    const inner = arch(2.3, 1.05, -0.05);
    cd.poly([...outer, ...[...inner].reverse()], a, { outline: true, w: W_FINE, sway: 0.1 });
    for (const k of [2, 5, 8]) cd.seg(outer[k][0], outer[k][1], inner[k][0], inner[k][1], { w: 0.36, color: b, kind: L_MARK, wobble: 0, layer: 1, sway: 0.1 });
    cd.line(outer, { w: 0.1, color: b, kind: L_SPARK, wobble: 0, sway: 0.1 });
  }
}

/** Somebody on a board with wheels, steering a kite (the kite and its lines are drawn by the mover). */
function boarder(pen: Pen, look: Look, flip: boolean): void {
  pen.box(-0.75, -0.2, 0.18, 1.5, 0.4, 0.08, C.orange, { w: W_FINE });
  for (const x of [-0.5, 0.5]) pen.card(x, 0.22, 0).circle(0, 0.14, 0.14, C.black, { seg: 7 });
  person(pen, 0, 0, 0.26, look, "cheer", flip);
}

/** A sail on a skateboard, and whoever is hanging on to it. It goes along +x. */
function windSkate(pen: Pen, look: Look, sail: RGB, flip: boolean): void {
  pen.box(-0.9, -0.2, 0.18, 1.8, 0.4, 0.08, C.wood, { w: W_FINE });
  for (const x of [-0.6, 0.6]) pen.card(x, 0.22, 0).circle(0, 0.14, 0.14, C.black, { seg: 7 });
  pen.pole([0.35, 0, 0.26], [0.35, 0, 3.7], 0.07, C.greyDark);
  const pl = pen.plane([0.35, 0, 0.75], [-0.9, 0.44, 0], [0, 0, 1], 0, true);
  pl.poly(
    [
      [0, 0],
      [1.9, 0.2],
      [0, 2.9],
    ],
    sail,
    { outline: true, w: W_FINE, grain: 0.4 },
  );
  pl.seg(0, 1.1, 1.25, 1.2, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  person(pen, -0.35, 0, 0.26, look, "stand", flip);
}

/**
 * The raisin bomber: one of the transports that flew coal and flour in when
 * the city was cut off, kept here on the apron. Silver, four engines, nose
 * along +x; drawn in the pen's frame with z = 0 on the tarmac.
 */
function bomber(pen: Pen): void {
  const body: V2[] = [
    [-4.9, 0],
    [-3.6, -0.34],
    [-2.3, -0.62],
    [3.2, -0.66],
    [4.3, -0.45],
    [4.95, 0],
    [4.3, 0.45],
    [3.2, 0.66],
    [-2.3, 0.62],
    [-3.6, 0.34],
  ];
  const wing = (s: number): V2[] => [
    [1.0, s * 0.5],
    [-1.2, s * 0.5],
    [-0.45, s * 5.6],
    [0.55, s * 5.6],
  ];
  const stab = (s: number): V2[] => [
    [-3.5, s * 0.25],
    [-4.7, s * 0.25],
    [-4.55, s * 2.0],
    [-3.95, s * 2.0],
  ];
  // the far wing and tailplane first, then the body, then the near ones
  pen.obj(() => {
    pen.extrude(wing(-1), 1.5, 1.68, SILVER, { w: W_THIN });
    pen.extrude(stab(-1), 2.0, 2.12, SILVER, { w: W_FINE });
    for (const y of [-2.0, -3.75]) {
      pen.box(0.3, y - 0.27, 1.25, 1.6, 0.54, 0.5, [176, 182, 188], { w: W_FINE });
      prop(pen, 1.95, y, 1.5);
    }
  });
  pen.obj(() => {
    // the wheels it stands on
    for (const [x, y] of [
      [3.5, 0],
      [0.1, -1.9],
      [0.1, 1.9],
    ]) {
      pen.pole([x, y, 0.3], [x, y, 1.3], 0.1, C.greyDark);
      pen.card(x, y, 0).circle(0, 0.32, 0.32, C.black, { seg: 8 });
    }
    pen.extrude(body, 0.95, 2.25, SILVER, { top: [226, 230, 234], crease: 20, w: 0.11 });
    const f = pen.wall("y+", -2.3, -0.64, 0.95, 5.5, 1.28);
    f.seg(0, 0.62, 5.5, 0.62, { w: 0.09, color: C.blueDark, kind: L_MARK, wobble: 0 });
    for (let a = 0.5; a < 5.2; a += 0.62) f.rect(a, 0.78, a + 0.3, 1.02, C.glass, { layer: 1, grain: 0.3 });
    // the star on its side, and the door
    f.circle(1.25, 0.34, 0.24, C.blueDark, { layer: 1, seg: 9, grain: 0.3 });
    f.circle(1.25, 0.34, 0.1, C.white, { layer: 2, seg: 5, grain: 0 });
    f.rect(2.2, 0.12, 2.75, 1.0, [184, 190, 196], { outline: true, w: W_FINE, layer: 1 });
    // the cockpit's windows, round the nose
    pen.floor(2.26, 1).poly(
      [
        [3.25, -0.5],
        [4.05, -0.34],
        [4.05, 0.34],
        [3.25, 0.5],
      ],
      C.glass,
      { outline: true, w: W_FINE, grain: 0.3 },
    );
    // the fin
    const fin = pen.plane([-4.9, 0, 2.2], [1, 0, 0], [0, 0, 1], 0, true);
    fin.poly(
      [
        [0.05, 0],
        [2.1, 0],
        [1.45, 1.95],
        [0.55, 2.05],
      ],
      SILVER,
      { outline: true, w: W_THIN },
    );
    fin.seg(0.6, 0.1, 0.85, 1.95, { w: 0.05, wobble: 0, layer: 1 });
    fin.rect(0.75, 1.35, 1.5, 1.6, C.red, { layer: 1, grain: 0.4 });
  }, 0.12);
  pen.obj(() => {
    pen.extrude(wing(1), 1.5, 1.68, SILVER, { w: W_THIN });
    pen.extrude(stab(1), 2.0, 2.12, SILVER, { w: W_FINE });
    for (const y of [2.0, 3.75]) {
      pen.box(0.3, y - 0.27, 1.25, 1.6, 0.54, 0.5, [176, 182, 188], { w: W_FINE });
      prop(pen, 1.95, y, 1.5);
    }
  }, 0.24);
}

/** A three-bladed propeller, standing still. */
function prop(pen: Pen, x: number, y: number, z: number): void {
  const cd = pen.card(x, y, z);
  for (const t of [90, 210, 330]) cd.bar(0, 0, Math.cos(t * DEG) * 0.75, Math.sin(t * DEG) * 0.75, 0.1, C.charcoal, { layer: 1 });
  cd.circle(0, 0, 0.15, C.red, { seg: 6, layer: 2, grain: 0 });
}

// ---------------------------------------------------------------- the place

export const tempelhof: BlockBuilder = (c) => {
  const { pen, rng } = c;
  /** A point of F in the world, z above the grass. */
  const W = (a: number, b: number, z = 0): V3 => [c.ox + 20 + (a + b) * K, c.oy + 20 + (b - a) * K, c.oz + TOP + z];

  // ---- the ground
  const land: V2[] = [];
  for (let k = 0; k < 48; k++) {
    const th = (k / 48) * Math.PI * 2;
    land.push([20 + Math.cos(th) * edgeR(th), 20 + Math.sin(th) * edgeR(th)]);
  }
  const arcOf = (r: number, from: number, to: number, n: number): V2[] => {
    const pts: V2[] = [];
    for (let k = 0; k <= n; k++) {
      const t = from + ((to - from) * k) / n;
      pts.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    return pts;
  };
  const strip = (b0: number, b1: number, pad: number): V2[] => [
    [-reach(b0, -1, pad), b0],
    [reach(b0, 1, pad), b0],
    [reach(b1, 1, pad), b1],
    [-reach(b1, -1, pad), b1],
  ];

  c.early(() => {
    pen.extrude(land, 0, TOP, EARTH, { top: C.grass, w: W_THIN });
    pen.push(20, 20, TOP, -45);
    const g = pen.floor(0, 1);
    // the meadow is mown in strips; the rest is left long for the larks
    for (const b0 of [6.4, 10.4, 14.4]) g.poly(strip(b0, b0 + 1.9, 0.9), C.grassLight, { grain: 0.9 });
    // the apron in front of the terminal: old concrete, in slabs
    const a0 = Math.asin(-APRON_B / (T_IN + 0.1));
    const apron = arcOf(T_IN + 0.1, Math.PI + a0, Math.PI * 2 - a0, 30);
    g.poly(apron, [214, 211, 204], { outline: true, w: W_FINE, grain: 0.9 });
    for (let k = -3; k <= 3; k++) g.seg(k * 4, APRON_B, k * 3.3, -Math.sqrt(Math.max(0, T_IN * T_IN - k * k * 10.9)), { w: 0.05, color: C.concreteDark, kind: L_MARK, wobble: 0.3, layer: 1 });
    for (const r of [8, 11.5]) g.line(arcOf(r, Math.PI + Math.asin(-APRON_B / r) + 0.05, Math.PI * 2 - Math.asin(-APRON_B / r) - 0.05, 16), { w: 0.05, color: C.concreteDark, kind: L_MARK, wobble: 0.3, layer: 1 });
    // the shade under the great roof
    g.poly([...arcOf(T_IN, T_FROM, T_TO, 14), ...arcOf(ROOF_IN, T_FROM, T_TO, 14).reverse()], [190, 188, 184], { layer: 2, grain: 0.9 });
    // the taxiway, joining the runway at both ends
    const taxi: RGB = [206, 204, 198];
    g.rect(-17.0, TAXI_B - 0.8, 17.0, TAXI_B + 0.8, taxi, { layer: 1, grain: 0.85, outline: true, w: W_FINE });
    for (const s of [-1, 1]) {
      g.rect(s * 17.0, TAXI_B - 0.8, s * 15.3, RUNWAY_B - RUNWAY_HALF + 0.1, taxi, { layer: 1, grain: 0.85 });
      g.rect(s * 9.8, APRON_B - 0.2, s * 8.2, TAXI_B - 0.7, taxi, { layer: 1, grain: 0.85 });
    }
    // a yellow line down the middle of it, as there always was
    for (let a = -15.4; a < 15; a += 2.6) pen.floor(0, 3).rect(a, TAXI_B - 0.05, a + 1.5, TAXI_B + 0.05, C.yellow, { grain: 0.3 });
    // the runway: tarmac, its edge lines, the centre line, the piano keys and the numbers
    g.rect(-RUNWAY_A, RUNWAY_B - RUNWAY_HALF, RUNWAY_A, RUNWAY_B + RUNWAY_HALF, C.road, { layer: 2, grain: 0.85, outline: true, w: W_FINE });
    const paint = pen.floor(0, 4);
    for (const s of [-1, 1]) paint.rect(-RUNWAY_A + 0.3, RUNWAY_B + s * (RUNWAY_HALF - 0.3) - 0.06, RUNWAY_A - 0.3, RUNWAY_B + s * (RUNWAY_HALF - 0.3) + 0.06, C.roadLine, { grain: 0.3 });
    for (let a = -8.6; a < 8; a += 3.2) paint.rect(a, RUNWAY_B - 0.1, a + 1.9, RUNWAY_B + 0.1, C.roadLine, { grain: 0.3 });
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) {
        const b = RUNWAY_B - 1.95 + k * 0.52 + (k > 3 ? 0.26 : 0);
        paint.rect(s * (RUNWAY_A - 0.7), b, s * (RUNWAY_A - 3.0), b + 0.3, C.roadLine, { grain: 0.3 });
      }
      for (const o of [-1.25, 0.55]) paint.rect(s * 10.4, RUNWAY_B + o, s * 8.9, RUNWAY_B + o + 0.7, C.roadLine, { grain: 0.3 });
    }
    for (const [str, a] of [
      ["09", -13.1],
      ["27", 13.1],
    ] as [string, number][]) {
      pen.plane([a, RUNWAY_B + 1.15, 0.01], [1, 0, 0], [0, -1, 0], 4, true).text(str, 0, 0, 2.3, { align: "c", color: C.roadLine, kind: L_MARK, w: 0.32, wobble: 0.2 });
    }
    // the old lights: along the runway's edges (most of them still come on), green across one
    // threshold and red across the other, blue down the taxiway
    const lampAt = (a: number, b: number, col: RGB | null, w: number) => {
      pen.floor(0.02, 5).rect(a - 0.09, b - 0.09, a + 0.09, b + 0.09, col ?? [250, 244, 214], { grain: 0 });
      const at: V3[] = [
        [a, b, 0.12],
        [a, b, 0.16],
      ];
      if (col) pen.stroke(at, { w, color: col, kind: L_SPARK, wobble: 0 });
      else pen.stroke(at, { w, kind: L_LIGHT, wobble: 0, alpha: 0.9 });
    };
    for (let a = -16.8; a < 17; a += 2.4) for (const s of [-1, 1]) if (rng.chance(0.82)) lampAt(a, RUNWAY_B + s * (RUNWAY_HALF + 0.28), null, 0.6);
    for (let k = 0; k < 6; k++) {
      lampAt(-RUNWAY_A - 0.3, RUNWAY_B - 2 + k * 0.8, [96, 232, 128], 0.34);
      lampAt(RUNWAY_A + 0.3, RUNWAY_B - 2 + k * 0.8, [255, 84, 64], 0.34);
    }
    for (let a = -15.6; a < 16; a += 2.6) for (const s of [-1, 1]) lampAt(a, TAXI_B + s * 1.0, [120, 160, 255], 0.26);
    // weeds in the cracks, long grass everywhere else
    pen.floor(0, 5).ticks(-RUNWAY_A, RUNWAY_B - RUNWAY_HALF, RUNWAY_A, RUNWAY_B + RUNWAY_HALF, { n: 46, len: 0.5, ang: 1.3, jit: 0.9, color: C.grassDark, w: 0.07 });
    pen.floor(0, 3).ticks(-21, -21, 21, 21, {
      n: 620,
      len: 0.5,
      ang: 1.2,
      jit: 0.5,
      color: C.grassDark,
      w: 0.06,
      inside: (a, b) => inField(a, b, 0.7) && Math.abs(b - RUNWAY_B) > RUNWAY_HALF + 0.3 && Math.abs(b - TAXI_B) > 1 && !(b < APRON_B && Math.hypot(a, b) < T_OUT + 0.3),
    });
    // bare patches, where the kite flyers stand
    for (const [a, b, r] of [
      [-6.5, 7.6, 1.3],
      [1.5, 11.6, 1.5],
      [15.6, 9.4, 1.0],
      [-1.6, 6.2, 1.0],
      [6.4, 5.6, 1.1],
    ]) {
      g.ellipse(a, b, r * 1.3, r * 0.8, [214, 204, 156], { grain: 0.9, seg: 12, layer: 1 });
    }
    pen.pop();
  });

  // everything from here is in F, on the grass
  pen.push(20, 20, TOP, -45);

  // ---- the terminal: a pale stone arc, three rows of windows, and its roof reaching out over the apron
  const stone = C.sandstoneLight;
  pen.obj(() => {
    pen.extrude([...arcOf(T_OUT, T_FROM, T_TO, FACETS), ...arcOf(T_IN, T_FROM, T_TO, FACETS).reverse()], 0, T_H, stone, { top: C.stone, crease: 9 });
  });
  const inner = arcOf(T_IN, T_FROM, T_TO, FACETS);
  pen.obj(() => {
    for (let k = 0; k < FACETS; k++) {
      const p = inner[k];
      const q = inner[k + 1];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const f = pen.plane([p[0], p[1], 0], [(q[0] - p[0]) / len, (q[1] - p[1]) / len, 0], [0, 0, 1], 1, true);
      // the gates down in the shade, and three storeys of offices over the roof
      f.rect(0.18, 0.15, len - 0.18, 1.6, [96, 100, 108], { grain: 0.5 });
      for (const b of [4.25, 5.35, 6.45]) f.rect(len / 2 - 0.36, b, len / 2 + 0.36, b + 0.74, C.glass, { outline: true, w: W_FINE, ink: C.white, glow: rng.chance(0.6) ? 1 : 0, grain: 0.5, layer: 1 });
      f.seg(0, T_H - 0.32, len, T_H - 0.32, { w: 0.05, color: C.sandstoneDark, kind: L_MARK, wobble: 0 });
    }
  }, 0.1);
  // the roof: a dark steel wing, thirty metres of it in life with nothing holding up its front edge
  pen.obj(() => {
    pen.extrude([...arcOf(T_IN + 0.1, T_FROM + 0.02, T_TO - 0.02, FACETS), ...arcOf(ROOF_IN, T_FROM + 0.02, T_TO - 0.02, FACETS).reverse()], ROOF_Z, ROOF_Z + 0.42, C.steelDark, { top: C.slate, crease: 9 });
    for (let k = 1; k < FACETS; k += 2) {
      const t = T_FROM + ((T_TO - T_FROM) * k) / FACETS;
      pen.pole([Math.cos(t) * 13.6, Math.sin(t) * 13.6, 0], [Math.cos(t) * 13.6, Math.sin(t) * 13.6, ROOF_Z], 0.1, C.grey);
      pen.stroke(
        [
          [Math.cos(t) * 13.2, Math.sin(t) * 13.2, ROOF_Z - 0.25],
          [Math.cos(t) * 13.2, Math.sin(t) * 13.2, ROOF_Z - 0.2],
        ],
        { w: 1.5, kind: L_LIGHT, wobble: 0, alpha: 0.4 },
      );
    }
  }, 0.22);
  // its name, in letters along the roof's edge
  pen.obj(() => {
    const cd = pen.card(0, -ROOF_IN - 0.1, ROOF_Z + 0.42);
    cd.text("TEMPELHOF", 0, 0.12, 0.95, { align: "c", w: 0.13, wobble: 0.2 });
    cd.text("TEMPELHOF", 0, 0.12, 0.95, { align: "c", w: 0.16, wobble: 0, kind: L_SPARK, color: C.lamp });
  }, 0.34);
  // the radar tower at the building's end: a square white tower, a walkway round its top, and the ball
  {
    const t = 316 * DEG;
    pen.push(Math.cos(t) * 17, Math.sin(t) * 17, 0, 45);
    pen.obj(() => {
      pen.box(-1.3, -1.3, 0, 2.6, 2.6, 13, C.white);
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, -1.3, -1.3, 0, 2.6, 2.6);
        for (const b of [2.2, 5.2, 8.2, 11.0]) f.rect(0.6, b, 2.0, b + 0.7, C.glass, { outline: true, w: W_FINE, glow: b > 10 ? 1 : 0, layer: 1 });
        f.rect(0, 0, 2.6, 0.5, C.stoneDark, { grain: 0.5 });
      }
    }, 0.2);
    pen.obj(() => {
      pen.box(-1.8, -1.8, 13, 3.6, 3.6, 0.3, C.concreteDark, { w: W_THIN });
      for (const [x0, y0, x1, y1] of [
        [-1.75, 1.75, 1.75, 1.75],
        [1.75, -1.75, 1.75, 1.75],
      ]) {
        pen.stroke(
          [
            [x0, y0, 14.0],
            [x1, y1, 14.0],
          ],
          { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
        );
      }
    }, 0.34);
    pen.obj(() => {
      pen.cyl(0, 0, 13.3, 1.4, 0.9, C.white, { seg: 14, r2: 2.15, glow: 0.14 });
      pen.cyl(0, 0, 14.2, 2.15, 0.7, C.white, { seg: 14, r2: 2.3, glow: 0.14 });
      pen.dome(0, 0, 14.9, 2.3, 2.4, C.white, { seg: 14, rings: 5, glow: 0.14 });
    }, 0.46);
    pen.pop();
  }

  // ---- on the apron: the raisin bomber, a board that says what it was, and a family reading it
  pen.push(-1.4, -9.4, 0);
  bomber(pen);
  pen.pop();
  pen.obj(() => {
    const cd = pen.card(-6.6, -5.9, 0);
    cd.bar(-0.5, 0, -0.5, 1.0, 0.07, C.greyDark);
    cd.bar(0.5, 0, 0.5, 1.0, 0.07, C.greyDark);
    cd.rect(-0.75, 0.75, 0.75, 1.65, C.white, { outline: true, w: W_FINE, layer: 1 });
    for (const b of [1.4, 1.2, 1.0]) cd.seg(-0.55, b, 0.5, b, { w: 0.045, color: C.inkSoft, kind: L_MARK, wobble: 0.3, layer: 2 });
  });
  person(pen, -5.7, -5.2, 0, randomLook(rng), "stand", true);
  person(pen, -5.0, -5.6, 0, randomLook(rng), "wave", true);
  person(pen, -6.3, -4.9, 0, randomLook(rng), "cheer", false, 0.72);
  person(pen, -7.5, -5.3, 0, randomLook(rng), "stand", false, 0.72);
  // somebody learning to skate on the smooth concrete, somebody teaching
  person(pen, -9.3, -7.4, 0, randomLook(rng), "cheer", false, 0.72);
  person(pen, -10.2, -7.2, 0, randomLook(rng), "stand", false);
  person(pen, -11.2, -9.6, 0, randomLook(rng), "walkA", true);
  person(pen, 10.9, -9.9, 0, randomLook(rng), "walkB", false);

  // ---- a kicker somebody dragged on to the runway
  pen.obj(() => {
    const deck = pen.plane([RAMP_A - 1.4, RAMP_B + 0.45, 0.02], [0.926, 0, 0.378], [0, -1, 0], 1, true);
    deck.rect(0, 0, 1.51, 0.9, C.wood, { outline: true, w: W_FINE });
    const side = pen.plane([RAMP_A - 1.4, RAMP_B + 0.45, 0], [1, 0, 0], [0, 0, 1], 1, true);
    side.poly(
      [
        [0, 0],
        [1.4, 0],
        [1.4, 0.57],
      ],
      C.woodDark,
      { outline: true, w: W_FINE },
    );
  });

  // ---- the garden: beds knocked together from pallets, sunflowers, a shed, a scarecrow
  pen.push(-8.8, 11.0, 0, 45);
  const beds: [number, number, number, number][] = [
    [-4.4, -2.6, 1.5, 1.0],
    [-2.5, -2.8, 1.1, 1.4],
    [-0.9, -2.4, 1.6, 1.0],
    [-4.2, -0.9, 1.0, 1.5],
    [-2.6, -0.8, 1.6, 1.1],
    [-0.5, -0.7, 1.2, 1.2],
    [-4.0, 1.2, 1.7, 1.0],
    [-1.8, 0.9, 1.1, 1.5],
    [0.0, 1.1, 1.5, 1.0],
    [1.4, -2.0, 1.0, 1.6],
    [-3.1, 2.9, 1.4, 1.0],
    [-1.0, 3.0, 1.6, 1.1],
  ];
  for (const [x, y, w, d] of beds) bed(pen, rng, x, y, w, d);
  for (const [x, y, h] of [
    [-4.0, -2.2, 1.7],
    [-3.5, -2.0, 2.1],
    [-0.4, -2.0, 1.9],
    [-3.6, 1.6, 2.2],
    [-3.0, 1.7, 1.8],
    [0.4, 1.5, 2.0],
    [1.9, -1.2, 2.3],
    [-0.4, 3.5, 1.9],
  ]) {
    sunflower(pen, x, y, 0.45, h);
  }
  // the shed, made of doors and a sheet of tin, with something sprayed on it
  pen.obj(() => {
    pen.box(2.0, 0.6, 0, 1.9, 1.6, 1.9, [150, 176, 190]);
    const f = pen.wall("y+", 2.0, 0.6, 0, 1.9, 1.6);
    f.rect(0.2, 0, 0.95, 1.6, C.doorRed, { outline: true, w: W_FINE, layer: 1 });
    tags(f, rng, 1.0, 1.85, 0.3, 1.5, 2);
    const g = pen.wall("x+", 2.0, 0.6, 0, 1.9, 1.6);
    g.rect(0.3, 0.8, 1.2, 1.5, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.8 });
  });
  pen.obj(() => pen.gable(1.85, 0.45, 1.9, 2.2, 1.9, 0.5, "y", C.zinc, { gable: [150, 176, 190] }), 0.15);
  // the scarecrow, in somebody's old football shirt
  pen.obj(() => {
    const cd = pen.card(0.9, 2.6, 0);
    cd.bar(0, 0, 0, 2.0, 0.08, C.woodDark);
    cd.bar(-0.75, 1.45, 0.75, 1.45, 0.08, C.woodDark);
    cd.poly(
      [
        [-0.7, 1.6],
        [0.7, 1.6],
        [0.4, 1.3],
        [0.34, 0.75],
        [-0.34, 0.75],
        [-0.4, 1.3],
      ],
      C.blue,
      { outline: true, w: W_FINE, layer: 1, sway: 0.15 },
    );
    cd.circle(0, 1.92, 0.27, C.sand, { outline: true, w: W_FINE, layer: 2, seg: 8 });
    cd.poly(
      [
        [-0.42, 2.08],
        [0.42, 2.08],
        [0.2, 2.5],
        [-0.2, 2.5],
      ],
      C.brickBrown,
      { outline: true, w: W_FINE, layer: 3 },
    );
  });
  // bunting, a sofa that somebody carried all the way out here, lanterns for the evening
  pen.obj(() => {
    const a: V3 = [-4.6, 3.6, 2.2];
    const b: V3 = [2.0, 2.2, 2.2];
    pen.pole([a[0], a[1], 0], a, 0.07, C.woodDark);
    pen.stroke([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1.85], b], { w: 0.04, color: C.inkSoft, kind: L_BAR, wobble: 0 });
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const cd = pen.card(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 2.2 - 0.35 * 4 * t * (1 - t) - 0.36);
      cd.poly(
        [
          [-0.17, 0.36],
          [0.17, 0.36],
          [0, 0],
        ],
        [C.red, C.yellow, C.blue, C.pink, C.teal][k % 5],
        { sway: 0.3, grain: 0.3 },
      );
      cd.seg(0, 0.4, 0, 0.44, { w: 0.7, kind: L_LIGHT, wobble: 0, alpha: 0.55 });
    }
  });
  pen.obj(() => {
    pen.box(0.3, -3.6, 0, 1.7, 0.7, 0.42, C.brickRose, { w: W_FINE });
    pen.box(0.3, -3.75, 0.42, 1.7, 0.2, 0.5, C.brickRose, { w: W_FINE });
  });
  person(pen, 0.8, -3.2, 0.22, randomLook(rng), "sit", false);
  person(pen, 1.5, -3.2, 0.22, randomLook(rng), "sit", true);
  for (const [x, y] of [
    [-3.4, -1.3],
    [-1.4, 0.3],
    [0.9, 0.3],
    [-2.4, 2.5],
    [1.7, -2.6],
  ]) {
    lantern(pen, x, y, 0);
  }
  // people watering, weeding, and standing about with a mug
  const can = (x: number, y: number) => pen.box(x, y, 0.75, 0.3, 0.2, 0.26, C.blue, { w: W_FINE });
  person(pen, -3.0, -1.6, 0, randomLook(rng), "stand", false);
  can(-2.75, -1.55);
  person(pen, -1.3, 2.3, 0, { ...randomLook(rng), hat: C.cream }, "stand", true);
  can(-1.75, 2.35);
  person(pen, 0.8, -1.2, 0, randomLook(rng), "wave", false);
  person(pen, -4.8, 0.4, 0, randomLook(rng), "stand", false, 0.72);
  person(pen, 2.6, 2.6, 0, randomLook(rng), "stand", true);
  pen.pop();

  // ---- the sheep that mow the far end, their shepherd, her dog, and the tape that is supposed to keep them in
  const flock: V2[] = [];
  for (let tries = 0; tries < 200 && flock.length < 13; tries++) {
    const a = rng.range(5.0, 12.3);
    const b = rng.range(8.0, 13.6);
    if (!inField(a, b, 1.6) || flock.some((p) => Math.hypot(p[0] - a, p[1] - b) < 1.35)) continue;
    flock.push([a, b]);
    sheep(pen, a, b, rng.chance(0.5), flock.length % 5 === 0);
  }
  pen.obj(() => {
    const posts: V2[] = [
      [4.2, 7.5],
      [8.4, 7.1],
      [12.8, 7.7],
    ];
    for (const [a, b] of posts) pen.pole([a, b, 0], [a, b, 0.9], 0.06, C.orange);
    pen.stroke(
      posts.map((p) => [p[0], p[1], 0.8] as V3),
      { w: 0.05, color: C.white, kind: L_BAR, wobble: 0.2 },
    );
  });
  const shepherd: Look = { skin: SKIN[1], hair: [124, 82, 48], top: C.green, legs: C.brickBrown, long: true, hat: C.sand };
  person(pen, 4.4, 9.4, 0, shepherd, "stand", false);
  pen.stroke(
    [
      [4.8, 9.4, 0],
      [4.85, 9.4, 2.3],
      [5.1, 9.4, 2.5],
      [5.25, 9.4, 2.3],
    ],
    { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
  );
  dog(pen, 5.6, 8.5, 0, C.black, false, 0.9);

  // ---- barbecues, and everybody who came with one
  for (const [a, b, n] of [
    [-2.4, 9.6, 3],
    [1.2, 14.2, 2],
    [-4.6, 15.2, 3],
  ]) {
    picnic(pen, rng, a, b, 0, n);
  }
  grill(pen, -0.6, 9.1);
  grill(pen, 2.9, 13.5);
  person(pen, -0.1, 9.6, 0, { ...randomLook(rng), top: C.white }, "stand", true);
  person(pen, 3.5, 13.9, 0, randomLook(rng), "wave", true);
  pen.obj(() => {
    pen.box(-3.9, 9.9, 0, 0.6, 0.4, 0.38, C.blue, { top: C.white, w: W_FINE });
    pen.box(-0.2, 14.6, 0, 0.6, 0.4, 0.38, C.red, { top: C.white, w: W_FINE });
  });
  // a few thorn trees: the only shade for half a mile
  for (const [a, b] of [
    [-15.4, 7.8],
    [-6.4, 17.0],
    [3.6, 17.6],
  ]) {
    if (inField(a, b, 1.5)) tree(pen, rng, a, b, { kind: "round", h: 1.5, r: 1.2 });
  }
  // people out for a walk, and one asleep
  for (const [a, b] of [
    [-12.2, 6.4],
    [6.0, -11.4],
    [-12.6, -5.0],
    [7.0, 15.6],
    [-10.4, 14.6],
  ]) {
    if (inField(a, b, 1)) person(pen, a, b, 0, randomLook(rng), rng.pick(["stand", "wave", "walkA"]), rng.chance(0.5), rng.chance(0.25) ? 0.72 : 1);
  }
  pen.pop();

  // ---- what moves
  // kites: a person on the ground, a string, and the kite up in the wind over the runway
  const flyers: { a: number; b: number; ka: number; kb: number; z: number; kind: "diamond" | "delta" | "octopus"; c1: RGB; c2: RGB }[] = [
    { a: -6.5, b: 7.6, ka: -9.5, kb: 0.5, z: 11, kind: "diamond", c1: C.red, c2: C.yellow },
    { a: 1.5, b: 11.6, ka: 8.6, kb: 2.0, z: 15.0, kind: "octopus", c1: C.purple, c2: C.pink },
    { a: 15.6, b: 9.4, ka: 13.4, kb: 0.4, z: 12.5, kind: "delta", c1: C.blue, c2: C.white },
    { a: 16.4, b: -5.6, ka: 16.8, kb: -9.4, z: 12.5, kind: "diamond", c1: C.teal, c2: C.white },
    { a: -11.6, b: 5.6, ka: -13.4, kb: -4.5, z: 9.5, kind: "delta", c1: C.orange, c2: C.yellow },
    { a: -1.6, b: 6.2, ka: -3.6, kb: -4.0, z: 17.5, kind: "diamond", c1: C.pink, c2: C.purple },
    { a: 6.4, b: 5.6, ka: 8.4, kb: -5.0, z: 16.5, kind: "delta", c1: C.red, c2: C.white },
    { a: -4.2, b: -6.6, ka: -6.0, kb: -11.5, z: 12.0, kind: "diamond", c1: C.yellow, c2: C.green },
    { a: 11.4, b: 14.2, ka: 13.6, kb: 6.0, z: 8.5, kind: "diamond", c1: C.green, c2: C.yellow },
  ];
  pen.push(20, 20, TOP, -45);
  flyers.forEach((f, k) => person(pen, f.a, f.b, 0, randomLook(rng), k % 3 === 1 ? "wave" : "cheer", f.ka < f.a, k % 4 === 3 ? 0.72 : 1));
  pen.pop();
  flyers.forEach((f, k) => {
    const sprite = makeSprite((p) => kite(p, f.kind, f.c1, f.c2), 0, 40 + k);
    const hand = W(f.a + (f.ka < f.a ? -0.45 : 0.45), f.b, 1.75);
    const born = c.done + k * 0.12;
    c.movers.push((m) => {
      if (m.t < born) return;
      // the wind never holds still: each kite wanders a little on its own beat
      const p = W(f.ka + Math.sin(m.clock * (0.7 + 0.07 * k) + k) * 0.9, f.kb + Math.cos(m.clock * 0.5 + k * 2) * 0.5, f.z + Math.sin(m.clock * (1.1 + 0.05 * k) + k * 1.7) * 0.55);
      if (!m.sees(p[0], p[1], p[2], 12)) return;
      m.put(sprite, p[0], p[1], p[2], born);
      const mid: V3 = [(hand[0] + p[0]) / 2, (hand[1] + p[1]) / 2, (hand[2] + p[2]) / 2 - 0.9];
      m.pen.stroke([hand, mid, [p[0], p[1], p[2] - (f.kind === "octopus" ? 1.2 : 0.4)]], { w: 0.04, kind: L_BAR, wobble: 0, alpha: 0.8 });
    });
  });

  // the board rider: round a long thin loop on the runway behind a kite the size of a bus,
  // and off the kicker as the camera arrives (and once a lap after that)
  {
    const look: Look = { skin: SKIN[2], hair: [43, 32, 25], top: C.yellow, legs: C.black, long: false, hat: C.red };
    const ride = [makeSprite((p) => boarder(p, look, false), -45, 51), makeSprite((p) => boarder(p, look, true), 135, 52)];
    const wing = makeSprite((p) => kite(p, "power", C.red, C.white), 0, 53);
    const P = 17;
    const AIR = 1.2;
    const born = c.done + 0.3;
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = c.stay();
      const jump = s ? s.at + 0.45 : c.done + 2;
      // (the phase puts the rider on the kicker's lip, heading right, at the jump)
      const ph = ((m.t - jump) / P + 0.2397) * Math.PI * 2;
      const a = -14.5 * Math.cos(ph);
      const b = RAMP_B - 0.95 + 0.95 * Math.sin(ph);
      const u = ((((m.t - jump) % P) + P) % P) / AIR;
      const hop = u < 1 ? 2.4 * 4 * u * (1 - u) : 0;
      const p = W(a, b, hop);
      if (!m.sees(p[0], p[1], p[2], 16)) return;
      if (u < 1) {
        // in the air: a shadow left behind on the tarmac, and the line of the flight so far
        m.pen.stroke([W(a - 0.55, b, 0.03), W(a + 0.55, b, 0.03)], { w: 0.5, color: C.black, kind: L_MARK, wobble: 0, alpha: 0.26 });
        const arc: V3[] = [];
        for (let q = 0; q <= 8; q++) {
          const f = (u * q) / 8;
          const pf = ph - ((u - f) * AIR * Math.PI * 2) / P;
          arc.push(W(-14.5 * Math.cos(pf), RAMP_B - 0.95 + 0.95 * Math.sin(pf), 0.3 + 2.4 * 4 * f * (1 - f)));
        }
        m.pen.stroke(arc, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, alpha: 0.75 });
      }
      m.put(ride[Math.sin(ph) > 0 ? 0 : 1], p[0], p[1], p[2], born);
      // the kite flies ahead, on the camera's side, and swings over the top at each end of the runway
      const sw = Math.tanh(2.4 * Math.sin(ph));
      const k = W(a + 5.4 * sw, RUNWAY_B + 3.0, 8.0 + (1 - Math.abs(sw)) * 3 + hop * 0.5 + Math.sin(m.clock * 1.3) * 0.3);
      m.put(wing, k[0], k[1], k[2], born);
      for (const o of [-2.35, 2.35]) {
        m.pen.stroke(
          [
            [p[0], p[1], p[2] + 1.9],
            [k[0] + o * 0.577, k[1] - o * 0.577, k[2] + 0.43],
          ],
          { w: 0.035, kind: L_BAR, wobble: 0, alpha: 0.8 },
        );
      }
    });
  }

  // two wind skaters, each in a lane of their own
  for (const [lane, amp, period, phase, sail, seed] of [
    [-0.1, 13, 23, 0.744, C.teal, 61],
    [2.45, 14, 29, 3.884, C.pink, 62],
  ] as [number, number, number, number, RGB, number][]) {
    const look = randomLook(new Rng(seed));
    const sprites = [makeSprite((p) => windSkate(p, look, sail, false), -45, seed), makeSprite((p) => windSkate(p, look, sail, true), 135, seed)];
    const born = c.done + 0.5;
    c.movers.push((m) => {
      if (m.t < born) return;
      const s = c.stay();
      const ph = ((m.t - (s ? s.at : c.done)) / period) * Math.PI * 2 + phase;
      const p = W(-amp * Math.cos(ph), lane, 0);
      m.put(sprites[Math.sin(ph) > 0 ? 0 : 1], p[0], p[1], p[2], born);
    });
  }

  // round and round on wheels: out along the taxiway, back down the edge of the runway
  const lap = new Route(
    rounded(
      [W(-16.3, TAXI_B), W(16.3, TAXI_B), W(16.3, RUNWAY_B + RUNWAY_HALF - 0.3), W(-16.3, RUNWAY_B + RUNWAY_HALF - 0.3)],
      true,
      2.6,
    ),
    true,
  );
  for (let k = 0; k < 4; k++) c.movers.push(cyclist(lap, rng, c.done + rng.range(0, 1), rng.range(4.0, 5.2)));
  for (let k = 0; k < 3; k++) c.movers.push(walker(lap, rng, c.done + rng.range(0, 1), rng.range(2.9, 3.4)));
  for (let k = 0; k < 3; k++) c.movers.push(walker(lap, rng, c.done + rng.range(0, 1), rng.range(2.0, 2.4)));

  // two dogs and a ball, over and over
  {
    const from: V2 = [9.8, 5.9];
    const to: V2 = [15.0, 6.3];
    pen.push(20, 20, TOP, -45);
    person(pen, from[0] - 0.7, from[1], 0, randomLook(rng), "cheer", false);
    pen.pop();
    const ball = makeSprite((p) => p.card(0, 0, 0).circle(0, 0.12, 0.12, C.yellow, { outline: true, w: W_FINE, seg: 7 }), 0, 71);
    const dogs = [C.woodDark, C.cream].map((col, i) => [makeSprite((p) => dog(p, 0, 0, 0, col, false, 0.9), 0, 72 + i), makeSprite((p) => dog(p, 0, 0, 0, col, true, 0.9), 0, 74 + i)]);
    const born = c.done + 0.7;
    c.movers.push((m) => {
      if (m.t < born) return;
      const ph = (m.t % 5.2) / 5.2;
      // the throw (the first fifth), the chase out, the trot home
      const thrown = Math.min(1, ph / 0.2);
      const bp = ph < 0.55 ? thrown : 1 - (ph - 0.55) / 0.45;
      const lob = ph < 0.2 ? 2.2 * 4 * thrown * (1 - thrown) : 0;
      const b = W(from[0] + (to[0] - from[0]) * bp, from[1] + (to[1] - from[1]) * bp, lob + (ph >= 0.55 ? 0.45 : 0));
      m.put(ball, b[0], b[1], b[2], born);
      for (let i = 0; i < 2; i++) {
        const lag = i * 0.07;
        const out = Math.min(1, Math.max(0, (ph - 0.06 - lag) / 0.44));
        const dp = ph < 0.55 ? out : 1 - Math.max(0, ph - 0.55 - lag) / 0.45;
        const hopZ = Math.abs(Math.sin(m.t * 11 + i)) * 0.18;
        const d = W(from[0] + (to[0] - from[0]) * dp - (ph >= 0.55 ? 0 : 0.3), from[1] + (to[1] - from[1]) * dp + 0.5 * i, hopZ);
        m.put(dogs[i][ph < 0.55 ? 0 : 1], d[0], d[1], d[2], born);
      }
    });
  }

  // smoke from the two grills
  for (const [a, b, k] of [
    [-0.6, 9.1, 0],
    [2.9, 13.5, 1],
  ]) {
    const born = c.done + 0.4;
    const base = W(a, b, 1.0);
    c.movers.push((m) => {
      if (m.t < born || !m.sees(base[0], base[1], base[2], 8)) return;
      for (let q = 0; q < 4; q++) {
        const u = ((m.t * 0.45 + q / 4 + k * 0.37) % 1 + 1) % 1;
        const cd = m.pen.card(base[0], base[1], base[2] + u * 3.4);
        const r = 0.18 + u * 0.42;
        const drift = u * u * 1.2 + Math.sin(u * 5 + q) * 0.15;
        const pts: V2[] = [];
        for (let j = 0; j < 8; j++) pts.push([drift + Math.cos((j / 8) * Math.PI * 2) * r, Math.sin((j / 8) * Math.PI * 2) * r * 0.85]);
        cd.line(pts, { closed: true, color: [168, 164, 156], w: 0.07, alpha: 0.75 * (1 - u), kind: L_MARK, wobble: 0 });
      }
    });
  }
};
