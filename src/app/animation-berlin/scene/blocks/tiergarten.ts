// Tiergarten: the city's big wood, with the Siegessäule standing in the
// middle of the Großer Stern and the traffic going round and round it. From
// the roundabout the Straße des 17. Juni runs east to the Gate (the city's
// axis, local y = AX); north of it a meadow full of Sunday barbecues, south of
// it the Neuer See with its rowing boats and its beer garden, and at the back
// the president's white palace, Bellevue. Goldelse, on top of the column,
// catches the sun as the camera arrives.

import { RGB, Rng, V2, V3, mixRGB, scaleRGB } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen } from "../../engine/pen";
import { bierbank, dog, flagOf, picnic, queue, stehtisch, swan } from "../berlin";
import { dinghy } from "../boats";
import { AXIS_Y, BLOCK, QUAY, ROW_Y } from "../city";
import { W_FINE, W_THIN, Look, bench, lamp, person, randomLook, tree, windowAt, windowGrid } from "../kit";
import { Route, Turning, VehicleKind, cyclist, makeSprite, rounded, traveler, vehicle, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** The axis, in the block's own coordinates. */
const AX = AXIS_Y - ROW_Y[1];
/** The column stands on the axis, here, in the middle of its roundabout. */
const CX = 15.5;
const CY = AX;
/** The roundabout: the island in the middle, the outer kerb, and the line the traffic keeps to. */
const R_IN = 5.6;
const R_OUT = 10.0;
const R_LANE = 7.6;

const GRANITE: RGB = [172, 96, 84];
const GRANITE_DARK: RGB = [138, 76, 68];
const BRONZE: RGB = [116, 104, 78];
const GOLD_DARK: RGB = [196, 146, 40];
const AVENUE: RGB = mixRGB(C.road, C.white, 0.34);
/** Lanterns along the meadow path, just off it. */
const LAMPS: V2[] = [
  [27.3, 13.2],
  [35.0, 10.5],
  [39.6, 10.9],
  [43.2, 13.0],
  [43.5, 22.0],
  [26.2, 18.5],
];

function stroll(c: BlockCtx, pts: V2[], r = 1.2, z = 0): Route {
  return new Route(
    rounded(
      pts.map((p) => [c.ox + p[0], c.oy + p[1], c.oz + z] as V3),
      true,
      r,
    ),
    true,
  );
}

function dist(pts: V2[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2));
    best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t));
  }
  return best;
}

// ---------------------------------------------------------------- the Siegessäule

/** Victoria in gold: winged, striding, a wreath held high and a staff with the cross in her other hand. */
function victoria(pen: Pen, x: number, y: number, z: number): void {
  const cd = pen.card(x, y, z);
  const g = C.gold;
  const o = { outline: true, w: W_FINE, glow: 0.12 };
  // her wings, behind her
  cd.poly(
    [
      [-0.25, 3.05],
      [-1.55, 4.75],
      [-2.2, 3.65],
      [-1.85, 2.45],
      [-0.6, 1.9],
    ],
    GOLD_DARK,
    { ...o, layer: 1 },
  );
  cd.poly(
    [
      [0.3, 3.05],
      [1.2, 3.95],
      [1.85, 3.1],
      [1.3, 2.3],
      [0.5, 2.1],
    ],
    GOLD_DARK,
    { ...o, layer: 1 },
  );
  for (const [a0, b0, a1, b1] of [
    [-0.7, 2.6, -1.7, 3.9],
    [-0.9, 2.3, -1.95, 3.2],
    [0.7, 2.6, 1.45, 3.35],
  ]) {
    cd.seg(a0, b0, a1, b1, { w: 0.06, color: scaleRGB(GOLD_DARK, 0.78), kind: L_MARK, wobble: 0.3, layer: 2 });
  }
  // her robe, blown back as she strides
  cd.poly(
    [
      [-1.0, 0],
      [0.95, 0],
      [0.62, 1.5],
      [0.44, 3.08],
      [-0.42, 3.08],
      [-0.66, 1.4],
    ],
    g,
    { ...o, layer: 3 },
  );
  cd.seg(-0.25, 0.2, -0.08, 2.0, { w: 0.06, color: GOLD_DARK, kind: L_MARK, wobble: 0.3, layer: 4 });
  cd.seg(0.38, 0.2, 0.2, 1.8, { w: 0.06, color: GOLD_DARK, kind: L_MARK, wobble: 0.3, layer: 4 });
  // her head, under an eagle helmet
  cd.circle(0.03, 3.5, 0.38, g, { ...o, layer: 5, seg: 10 });
  cd.poly(
    [
      [-0.42, 3.7],
      [0.46, 3.7],
      [0.6, 4.05],
      [0.02, 4.28],
      [-0.52, 4.05],
    ],
    GOLD_DARK,
    { ...o, layer: 6 },
  );
  // the laurel wreath, held up to the city
  cd.bar(0.4, 2.92, 1.12, 4.25, 0.21, g, { layer: 5 });
  for (let k = 0; k < 11; k++) {
    // leaf by leaf
    const a = (k / 11) * Math.PI * 2 + 0.3;
    cd.circle(1.36 + Math.cos(a) * 0.5, 4.84 + Math.sin(a) * 0.5, 0.17, k % 2 ? g : GOLD_DARK, { outline: true, w: W_FINE, layer: 6, seg: 6, glow: 0.12 });
  }
  // the staff with the iron cross
  cd.bar(-0.4, 2.92, -0.88, 2.5, 0.21, g, { layer: 5 });
  cd.bar(-0.92, 0.95, -0.92, 5.1, 0.11, g, { layer: 5 });
  cd.rect(-1.24, 5.1, -0.6, 5.74, g, { ...o, layer: 6 });
  cd.seg(-0.92, 5.2, -0.92, 5.64, { w: 0.11, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 7 });
  cd.seg(-1.14, 5.42, -0.7, 5.42, { w: 0.11, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 7 });
}

/** How high Victoria's feet are, once the whole column is up. */
const TOP = 28.8;

/**
 * The Victory Column: a granite base with bronze reliefs, a round hall of
 * columns with a mosaic behind them, four drums of sandstone ringed with
 * gilded cannon barrels, a platform for the people who climbed the 285 steps,
 * and Goldelse. It goes up piece by piece.
 */
function column(c: BlockCtx): void {
  const { pen, rng } = c;
  const x = CX;
  const y = CY;
  pen.obj(() => {
    pen.box(x - 3.5, y - 3.5, 0, 7, 7, 0.45, GRANITE_DARK);
    pen.box(x - 3.0, y - 3.0, 0.45, 6, 6, 2.5, GRANITE);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, x - 3.0, y - 3.0, 0.45, 6, 6);
      f.rect(0.5, 0.42, 5.5, 2.08, BRONZE, { outline: true, w: W_FINE, grain: 0.6 });
      f.ticks(0.7, 0.6, 5.3, 1.9, { n: 24, len: 1.0, ang: Math.PI / 2, jit: 0.35, color: scaleRGB(BRONZE, 0.66), w: 0.1, layer: 1 });
    }
    pen.box(x - 3.25, y - 3.25, 2.95, 6.5, 6.5, 0.3, mixRGB(GRANITE, C.white, 0.3));
  });
  // the round hall: a ring of columns, and behind them the mosaic
  const z1 = 3.25;
  pen.obj(() => {
    pen.cyl(x, y, z1, 3.95, 0.3, C.sandstoneLight, { seg: 18 });
    pen.cyl(x, y, z1 + 0.3, 2.5, 4.2, mixRGB(C.gold, C.cream, 0.35), { seg: 16 });
    for (let k = 0; k < 46; k++) {
      // only the side the camera sees
      const a = rng.range(-0.7, 2.25);
      const b = z1 + rng.range(0.9, 4.1);
      pen.stroke(
        [
          [x + Math.cos(a) * 2.53, y + Math.sin(a) * 2.53, b],
          [x + Math.cos(a + 0.07) * 2.53, y + Math.sin(a + 0.07) * 2.53, b + rng.range(0.15, 0.5)],
        ],
        { w: 0.13, color: rng.pick([C.red, C.blue, C.white, C.green, C.brickBrown, C.gold]), kind: L_MARK, wobble: 0 },
      );
    }
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + 0.12;
      pen.pole([x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, z1 + 0.3], [x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, z1 + 4.5], 0.34, C.sandstoneLight);
    }
  }, 0.12);
  pen.obj(() => {
    pen.cyl(x, y, z1 + 4.5, 3.95, 0.65, C.sandstone, { seg: 18 });
    pen.cyl(x, y, z1 + 5.15, 2.7, 0.5, C.sandstoneLight, { seg: 14 });
  }, 0.24);
  // the shaft: four drums, each with its ring of captured cannon, gilded
  const z2 = z1 + 5.65;
  const DRUM = 4.4;
  for (let d = 0; d < 4; d++) {
    const zb = z2 + d * DRUM;
    const ra = 1.95 - d * 0.1;
    const rb = ra - 0.1;
    pen.obj(
      () => {
        pen.cyl(x, y, zb, ra, DRUM, C.sandstone, { seg: 12, r2: rb });
        pen.cyl(x, y, zb, ra + 0.14, 0.32, C.sandstoneLight, { seg: 12 });
        for (let k = 0; k < 7; k++) {
          const a = -0.6 + k * 0.45;
          pen.stroke(
            [
              [x + Math.cos(a) * (ra + 0.04), y + Math.sin(a) * (ra + 0.04), zb + 1.0],
              [x + Math.cos(a) * (rb + 0.07), y + Math.sin(a) * (rb + 0.07), zb + 3.5],
            ],
            { w: d === 3 ? 0.09 : 0.15, color: C.gold, kind: L_MARK, wobble: 0 },
          );
        }
      },
      0.36 + d * 0.11,
    );
  }
  const z3 = z2 + 4 * DRUM;
  // the capital, the platform and its railing, and the pedestal she stands on
  pen.obj(() => {
    pen.cyl(x, y, z3, 1.6, 0.5, C.sandstoneLight, { seg: 12, r2: 2.4 });
    pen.cyl(x, y, z3 + 0.5, 2.55, 0.3, C.sandstone, { seg: 14 });
    const top: V3[] = [];
    for (let k = 0; k <= 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const p: V3 = [x + Math.cos(a) * 2.42, y + Math.sin(a) * 2.42, z3 + 0.8];
      pen.stroke([p, [p[0], p[1], p[2] + 0.75]], { w: 0.07, color: C.black, kind: L_BAR, wobble: 0 });
      top.push([p[0], p[1], p[2] + 0.75]);
    }
    pen.stroke(top, { w: 0.08, color: C.black, kind: L_BAR, wobble: 0 });
    pen.cyl(x, y, z3 + 0.8, 1.05, 1.5, C.sandstoneLight, { seg: 10, r2: 0.85 });
  }, 0.82);
  // the ones who climbed all the way up
  for (const [a, pose, fl] of [
    [-0.25, "stand", true],
    [0.55, "wave", false],
    [1.3, "stand", false],
    [1.95, "cheer", true],
  ] as [number, "stand" | "wave" | "cheer", boolean][]) {
    person(pen, x + Math.cos(a) * 1.85, y + Math.sin(a) * 1.85, z3 + 0.8, randomLook(rng), pose, fl, 0.62);
  }
  pen.obj(() => {
    victoria(pen, x, y, z3 + 2.3);
    // floodlights, for the night
    for (const s of [-1, 1]) {
      pen.stroke(
        [
          [x + s * 1.3, y - s * 1.3, z3 + 1.2],
          [x + s * 0.5, y - s * 0.5, z3 + 7.2],
        ],
        { w: 1.9, kind: L_LIGHT, wobble: 0, alpha: 0.32 },
      );
    }
  }, 0.95);
}

// ---------------------------------------------------------------- Bellevue

/** Schloss Bellevue: the president's house, white, three parts under grey roofs, the flag on top. */
function bellevue(c: BlockCtx, x0: number, y0: number): void {
  const { pen, rng } = c;
  const W = C.white;
  pen.obj(() => {
    for (const wx of [x0, x0 + 10.6]) {
      pen.box(wx, y0 + 0.5, 0, 5.4, 4.1, 5.0, W);
      const f = pen.wall("y+", wx, y0 + 0.5, 0, 5.4, 4.1);
      f.rect(0, 0, 5.4, 0.5, C.stone, { grain: 0.5 });
      windowGrid(f, rng, 0.3, 0.7, 5.1, 4.75, 4, 2, { lit: 0.65, trim: C.stone, fillA: 0.5, fillB: 0.74 });
      const g = pen.wall("x+", wx, y0 + 0.5, 0, 5.4, 4.1);
      windowGrid(g, rng, 0.3, 0.7, 3.8, 4.75, 3, 2, { lit: 0.5, trim: C.stone, fillA: 0.5, fillB: 0.74 });
    }
    pen.box(x0 + 5.4, y0, 0, 5.2, 5.0, 6.4, W);
    const f = pen.wall("y+", x0 + 5.4, y0, 0, 5.2, 5.0);
    f.rect(0, 0, 5.2, 0.5, C.stone, { grain: 0.5 });
    for (const a of [0.25, 1.45, 3.35, 4.55]) f.rect(a, 0.5, a + 0.4, 6.1, C.stone, { grain: 0.4, layer: 1 });
    f.rect(2.0, 0, 3.2, 2.5, C.door, { outline: true, w: W_FINE, layer: 1 });
    windowAt(f, 0.8, 1.0, 1.35, 2.6, true, C.stone);
    windowAt(f, 3.85, 1.0, 4.4, 2.6, true, C.stone);
    for (const a of [0.8, 2.3, 3.85]) windowAt(f, a, 3.4, a + 0.6, 5.5, a !== 2.3, C.stone);
  });
  pen.obj(() => {
    pen.hip(x0 - 0.15, y0 + 0.35, 5.0, 5.7, 4.4, 1.5, C.zinc);
    pen.hip(x0 + 10.45, y0 + 0.35, 5.0, 5.7, 4.4, 1.5, C.zinc);
    pen.gable(x0 + 5.25, y0 - 0.15, 6.4, 5.5, 5.3, 1.5, "y", C.zinc, { gable: W });
  }, 0.16);
  flagOf(pen, x0 + 8, y0 + 2.6, 7.9, 3.3, "de", 0.9);
}

// ---------------------------------------------------------------- small things

/** A string of bulbs sagging between two points: a wire, and dots that are yellow by day and alight by night. */
function bulbs(pen: Pen, a: V3, b: V3, n = 7, sag = 0.5): void {
  pen.begin();
  const wire: V3[] = [];
  for (let k = 0; k <= n + 1; k++) {
    const t = k / (n + 1);
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)];
    wire.push(p);
    if (k > 0 && k <= n) {
      pen.stroke([p, [p[0], p[1], p[2] - 0.16]], { w: 0.16, color: C.yellow, kind: L_BAR, wobble: 0 });
      pen.stroke(
        [
          [p[0], p[1], p[2] - 0.1],
          [p[0] + 0.03, p[1], p[2] - 0.1],
        ],
        { w: 0.42, kind: L_LIGHT, wobble: 0, alpha: 0.9 },
      );
    }
  }
  pen.stroke(wire, { w: 0.04, color: C.charcoal, kind: L_BAR, wobble: 0 });
  pen.end();
}

/** A kettle grill on three legs, coals glowing, and the smoke going wherever the wind takes it. */
function grill(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.begin();
  for (const [dx, dy] of [
    [-0.22, 0.12],
    [0.22, 0.12],
    [0, -0.24],
  ]) {
    pen.pole([x + dx, y + dy, 0], [x + dx * 0.5, y + dy * 0.5, 0.55], 0.06, C.black, { ink: false });
  }
  pen.cyl(x, y, 0.5, 0.26, 0.26, C.black, { seg: 8, r2: 0.4, top: [226, 96, 52] });
  for (let k = 0; k < 3; k++) {
    const dx = rng.range(-0.15, 0.15);
    const pts: V3[] = [];
    for (let q = 0; q <= 5; q++) pts.push([x + dx + Math.sin(q * 1.3 + k * 2) * 0.22 + q * 0.12, y + dx, 0.85 + q * 0.5]);
    pen.stroke(pts, { w: 0.2 + k * 0.05, color: [226, 224, 216], kind: L_MARK, wobble: 1.4, alpha: 0.75, sway: 0.15, swayB: 1 });
  }
  pen.end();
}

/** A fox at a trot, on a card, nose to the right. */
function fox(pen: Pen, frame: number, flip: boolean): void {
  pen.push(0, 0, 0, 0, 0.85);
  const cd = pen.card(0, 0, 0, flip);
  const fur: RGB = [216, 122, 52];
  const sock: RGB = [74, 54, 44];
  const legs: [number, number][] = frame
    ? [
        [-0.42, -0.56],
        [-0.22, -0.12],
        [0.28, 0.42],
        [0.44, 0.34],
      ]
    : [
        [-0.42, -0.36],
        [-0.22, -0.32],
        [0.28, 0.24],
        [0.44, 0.56],
      ];
  for (const [a, a2] of legs) cd.bar(a, 0.32, a2, 0.04, 0.08, sock);
  cd.bar(-0.42, 0.48, -0.92, 0.64, 0.21, fur);
  cd.bar(-0.92, 0.64, -1.08, 0.7, 0.18, C.white);
  cd.ellipse(0, 0.44, 0.5, 0.18, fur, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  cd.poly(
    [
      [0.4, 0.46],
      [0.6, 0.76],
      [0.96, 0.5],
      [0.6, 0.4],
    ],
    fur,
    { outline: true, w: W_FINE, layer: 2 },
  );
  cd.poly(
    [
      [0.5, 0.68],
      [0.54, 0.94],
      [0.68, 0.74],
    ],
    fur,
    { outline: true, w: W_FINE, layer: 3 },
  );
  pen.pop();
}

/** A rabbit, sitting up. */
function rabbit(pen: Pen, x: number, y: number, flip: boolean): void {
  const cd = pen.card(x, y, 0, flip);
  const fur: RGB = [168, 146, 122];
  pen.begin();
  cd.ellipse(0, 0.2, 0.26, 0.2, fur, { outline: true, w: W_FINE, seg: 8 });
  cd.circle(0.2, 0.42, 0.13, fur, { outline: true, w: W_FINE, seg: 7, layer: 1 });
  cd.bar(0.17, 0.52, 0.12, 0.78, 0.07, fur, { layer: 1 });
  cd.bar(0.25, 0.52, 0.27, 0.76, 0.07, fur, { layer: 1 });
  cd.circle(-0.26, 0.2, 0.07, C.white, { seg: 5, layer: 2, grain: 0 });
  pen.end();
}

/** A bird on the wing, seen small: wings up or down. */
function bird(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.32 : -0.1;
  cd.bar(-0.56, y, -0.18, 0.07, 0.11, C.charcoal);
  cd.bar(0.56, y, 0.18, 0.07, 0.11, C.charcoal);
  cd.ellipse(0, 0, 0.24, 0.12, C.slate, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

/** The beer garden's kiosk: a green hut with a hatch on the lake side and its name along the roof. */
function kiosk(pen: Pen, rng: Rng, x: number, y: number): void {
  const w = 3.4;
  const d = 2.3;
  pen.obj(() => {
    pen.box(x, y, 0, w, d, 2.5, C.cream, { top: C.zinc });
    const f = pen.wall("y+", x, y, 0, w, d);
    f.rect(0, 0, w, 0.55, C.green, { grain: 0.5 });
    f.rect(0.3, 1.0, w - 0.3, 2.05, C.charcoal, { outline: true, w: W_THIN, glow: 0.6, layer: 1 });
    f.block(0.2, 0.92, w - 0.2, 1.02, 0.4, C.stone, { w: W_FINE });
    const g = pen.wall("x+", x, y, 0, w, d);
    g.rect(0, 0, d, 0.55, C.green, { grain: 0.5 });
    g.rect(0.6, 0, 1.5, 1.95, C.door, { outline: true, w: W_FINE, layer: 1 });
    const sg = pen.plane([x - 0.1, y + d + 0.02, 2.5], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, w + 0.2, 0.72, C.green, { outline: true, w: W_FINE, glow: 0.4 });
    sg.text("BIERGARTEN", (w + 0.2) / 2, 0.2, 0.33, { align: "c", layer: 1, color: C.white, kind: L_MARK, w: 0.065 });
    const aw = pen.plane([x, y + d, 2.45], [1, 0, 0], [0, 1.0, -0.42], 0, true);
    aw.rect(0, 0, w, 1.0, C.white, { outline: true, w: W_THIN, grain: 0.6 });
    for (let k = 0; k < 4; k++) aw.rect((k * 2 * w) / 8, 0, ((k * 2 + 1) * w) / 8, 1.0, C.green, { grain: 0.6, layer: 1 });
  });
  person(pen, x + w * 0.5, y + d - 0.25, 0.25, { ...randomLook(rng), top: C.white }, "bust", false);
}

/** One of the little stone lodges at the mouth of the tunnels that lead under the traffic to the column. */
function lodge(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    pen.box(x - 0.9, y - 0.9, 0, 1.8, 1.8, 2.2, C.sandstone);
    const f = pen.wall("x+", x - 0.9, y - 0.9, 0, 1.8, 1.8);
    f.rect(0.45, 0, 1.35, 1.7, C.charcoal, { outline: true, w: W_FINE, grain: 0.5 });
    const g = pen.wall("y+", x - 0.9, y - 0.9, 0, 1.8, 1.8);
    g.rect(0.45, 0, 1.35, 1.7, C.charcoal, { outline: true, w: W_FINE, grain: 0.5 });
    pen.box(x - 1.1, y - 1.1, 2.2, 2.2, 2.2, 0.28, C.sandstoneLight);
  });
}

// ---------------------------------------------------------------- the place

export const tiergarten: BlockBuilder = (c) => {
  const { pen, rng } = c;
  // the column is tall: stand back a little so all of her is in the picture
  c.focus(21.5, 22, 0.95);

  // the paths that wind through the wood, as lists of points: drawn below, and trees keep off them
  const meadowPath: V2[] = [
    [28.0, 25.9],
    [35.0, 26.1],
    [42.6, 25.7],
    [43.0, 18.5],
    [42.4, 12.2],
    [35.0, 11.4],
    [29.2, 12.0],
    [27.3, 16.0],
    [27.0, 21.0],
    [28.0, 25.9],
  ];
  const westPath: V2[] = [
    [8.2, 16.8],
    [6.4, 21.0],
    [5.6, 25.5],
  ];
  const southPath: V2[] = [
    [5.6, 36.5],
    [6.6, 40.2],
    [10.5, 42.6],
    [17.0, 42.9],
    [22.4, 42.3],
  ];
  const lawnPath: V2[] = [
    [17.6, 14.0],
    [16.8, 17.2],
    [18.6, 19.4],
    [18.0, 21.2],
  ];
  // the Neuer See, down in the corner nearest the camera
  const LX = 34.5;
  const LY = 40.55;
  const LRX = 8.7;
  const LRY = 2.8;
  const lake: V2[] = [];
  for (let k = 0; k < 30; k++) {
    const t = (k / 30) * Math.PI * 2;
    const r = 1 + 0.035 * Math.sin(3 * t + 0.6) + 0.025 * Math.sin(5 * t + 2);
    lake.push([LX + Math.cos(t) * LRX * r, LY + Math.sin(t) * LRY * r]);
  }
  const inLake = (x: number, y: number, pad = 0) => Math.hypot((x - LX) / (LRX + pad), (y - LY) / (LRY + pad)) < 0.97;

  c.early(() => {
    const g = pen.floor(0, 1);
    // the whole block is grass, under the trees
    g.rect(QUAY + 0.3, QUAY + 0.3, B - QUAY - 0.3, B - QUAY - 0.3, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(E + 0.3, E + 0.3, B - E - 0.3, B - E - 0.3, {
      n: 420,
      len: 0.42,
      ang: 0.9,
      jit: 0.5,
      color: C.grassDark,
      w: 0.06,
      inside: (a, b) => Math.hypot(a - CX, b - CY) > R_OUT + 0.4 && !(a > CX && Math.abs(b - AX) < 2.9) && !inLake(a, b, 0.4),
    });
    // the meadow is mown paler
    g.poly(
      [
        [29.4, 13.2],
        [36, 12.6],
        [41.8, 13.4],
        [42.2, 19],
        [41.6, 24.4],
        [35, 24.9],
        [29.0, 24.5],
        [28.4, 18.5],
      ],
      C.grassLight,
      { layer: 1, grain: 0.8 },
    );
    // the paths, in sand
    for (const p of [meadowPath, westPath, southPath, lawnPath]) g.line(p, { w: 1.3, color: C.path, kind: L_MARK, wobble: 0.4, layer: 2 });
    g.line(
      [
        [23.6, 37.6],
        [26.5, 38.1],
        [29.4, 37.1],
        [43.4, 37.0],
      ],
      { w: 1.0, color: C.path, kind: L_MARK, wobble: 0.3, layer: 2 },
    );
    // the avenue to the Gate, pale and wide, with a line down the middle
    g.rect(CX + 4, AX - 2.6, B - QUAY - 0.3, AX + 2.6, AVENUE, { layer: 2, grain: 0.8 });
    g.seg(CX + 9.7, AX - 2.6, B - QUAY - 0.3, AX - 2.6, { w: 0.07, layer: 2 });
    g.seg(CX + 9.7, AX + 2.6, B - QUAY - 0.3, AX + 2.6, { w: 0.07, layer: 2 });
    for (let x = 27.4; x + 1.3 < B - QUAY - 0.6; x += 2.7) g.rect(x, AX - 0.07, x + 1.3, AX + 0.07, C.roadLine, { layer: 3, grain: 0.3 });
    // the Großer Stern: tarmac all the way round, an island of setts in the middle
    g.circle(CX, CY, R_OUT, C.road, { seg: 44, grain: 0.8, layer: 3, outline: true, w: 0.08 });
    g.circle(CX, CY, R_IN, C.plaza, { seg: 32, layer: 4, outline: true, w: 0.08 });
    for (let k = 0; k < 22; k++) {
      const a0 = (k / 22) * Math.PI * 2;
      g.arc(CX, CY, 9.05, 9.05, a0, a0 + 0.15, { w: 0.14, color: C.roadLine, kind: L_MARK, wobble: 0, layer: 4, seg: 3 });
    }
    pen.floor(0, 6).ticks(CX - R_IN, CY - R_IN, CX + R_IN, CY + R_IN, {
      n: 70,
      len: 0.3,
      ang: -0.78,
      jit: 0.2,
      color: C.stoneDark,
      w: 0.06,
      inside: (a, b) => Math.hypot(a - CX, b - CY) < R_IN - 0.4 && Math.max(Math.abs(a - CX), Math.abs(b - CY)) > 3.7,
    });
    // the lake
    g.poly(lake, C.water, { kind: F_WATER, layer: 2, outline: true, w: W_THIN, ink: C.waterInk });
    pen.floor(0, 4).ticks(LX - LRX, LY - LRY, LX + LRX, LY + LRY, { n: 56, len: 1.2, ang: -Math.PI / 4, jit: 0.08, bend: 0.22, color: C.waterInk, w: 0.07, kind: L_RIPPLE, alpha: 0.75, inside: (a, b) => inLake(a, b, -0.5) });
    // Bellevue's oval of lawn, inside its drive
    g.ellipse(17.5, 12.3, 6.4, 2.2, C.path, { layer: 2, seg: 26 });
    g.ellipse(17.5, 12.3, 5.2, 1.5, C.grassLight, { layer: 3, seg: 24, outline: true, w: W_FINE });
  });

  column(c);
  lodge(pen, CX + R_OUT + 1.3, AX - 4.3);
  lodge(pen, CX + R_OUT + 1.3, AX + 4.3);
  bellevue(c, 9.5, 4.7);

  // ---- the wood. Trees go wherever nothing else is, a couple of units apart
  const paths = [meadowPath, westPath, southPath, lawnPath];
  const free = (x: number, y: number): boolean => {
    if (x < E + 0.8 || y < E + 0.8 || x > B - E - 0.8 || y > B - E - 0.8) return false;
    if (Math.hypot(x - CX, y - CY) < R_OUT + 1.5) return false;
    if (x > CX && Math.abs(y - AX) < 4.4) return false;
    if (x > 28.8 && x < 42.6 && y > 13.0 && y < 24.8) return false;
    if (x > 23.6 && y > 34.2) return false;
    if (x > 8.6 && x < 26.8 && y < 15.4) return false;
    if (Math.hypot((x - 9.4) / 4.0, (y - 20.4) / 3.2) < 1) return false;
    for (const p of paths) if (dist(p, x, y) < 1.3) return false;
    if (LAMPS.some(([lx, ly]) => Math.hypot(x - lx, y - ly) < 1.2)) return false;
    return true;
  };
  // (two are planted by hand: there is a hammock slung between them)
  const hx0: V2 = [32.2, 6.0];
  const hx1: V2 = [35.3, 6.5];
  const spots: V2[] = [hx0, hx1];
  for (let k = 0; k < 5200 && spots.length < 104; k++) {
    const x = rng.range(E, B - E);
    const y = rng.range(E, B - E);
    if (!free(x, y) || spots.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1.85)) continue;
    spots.push([x, y]);
  }
  for (const [x, y] of spots) {
    const k = rng.next();
    // lower trees towards the camera, so the wood does not hide what is in it
    const front = (x + y) / (2 * B);
    if (k < 0.42) tree(pen, rng, x, y, { kind: "elm", h: rng.range(2.3, 3.0) - front * 0.5, r: rng.range(1.5, 1.95) });
    else if (k < 0.82) tree(pen, rng, x, y, { kind: "round", h: rng.range(1.6, 2.3), r: rng.range(1.25, 1.7) });
    else tree(pen, rng, x, y, { kind: "tall" });
  }
  // rhododendrons, in flower along the paths
  for (const [x, y, col] of [
    [7.6, 14.2, C.pink],
    [5.4, 30.2, C.purple],
    [9.2, 41.2, C.blossom],
    [19.6, 41.6, C.pink],
    [26.4, 23.2, C.purple],
    [41.6, 26.9, C.blossom],
    [30.4, 11.6, C.pink],
    [20.8, 20.6, C.blossom],
  ] as [number, number, RGB][]) {
    tree(pen, rng, x, y, { kind: "bush", r: rng.range(0.7, 0.95), color: col });
    tree(pen, rng, x + 0.9, y + 0.5, { kind: "bush", r: rng.range(0.55, 0.8), color: C.hedge });
  }
  // the hammock, and whoever got to it first
  pen.obj(() => {
    const a: V3 = [hx0[0], hx0[1], 1.5];
    const b: V3 = [hx1[0], hx1[1], 1.5];
    const band: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      band.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1.5 - 0.85 * 4 * t * (1 - t) * 0.9]);
    }
    pen.stroke(band, { w: 0.5, color: C.orange, kind: L_BAR, wobble: 0 });
    pen.stroke(band, { w: 0.12, color: C.white, kind: L_BAR, wobble: 0, bias: 0.02 });
  });
  person(pen, (hx0[0] + hx1[0]) / 2 - 0.1, (hx0[1] + hx1[1]) / 2 + 0.05, 0.45, { ...randomLook(rng), hat: C.ochre }, "sit", false);
  // two big chestnuts over the beer garden
  tree(pen, rng, 34.3, 34.5, { kind: "elm", h: 2.9, r: 1.9 });
  tree(pen, rng, 40.7, 34.5, { kind: "elm", h: 2.9, r: 1.9 });

  // ---- the avenue: a double row of lamps, benches
  for (let x = 28.6; x < B - QUAY - 0.6; x += 4.9) {
    lamp(pen, x, AX - 3.15, 0, 3.4);
    lamp(pen, x + 2.4, AX + 3.15, 0, 3.4);
  }
  for (const [x, y] of LAMPS) lamp(pen, x, y, 0, 2.9);
  // an ice-cream cart where the paths meet, and the children who heard its bell
  pen.obj(() => {
    const ex = 35.3;
    const ey = 26.85;
    pen.box(ex, ey, 0.35, 1.5, 0.9, 0.75, C.white, { w: W_FINE });
    for (const o of [0.25, 1.25]) pen.cyl(ex + o, ey + 0.92, 0.02, 0.3, 0.06, C.charcoal, { seg: 8 });
    pen.pole([ex + 0.75, ey + 0.45, 1.1], [ex + 0.75, ey + 0.45, 2.5], 0.07, C.white, { ink: false });
    pen.cone(ex + 0.75, ey + 0.45, 2.2, 1.25, 0.5, C.pink, { seg: 8, crease: 0.5 });
    const sg = pen.wall("y+", ex, ey, 0.35, 1.5, 0.9);
    sg.text("EIS", 0.75, 0.2, 0.36, { align: "c", color: C.red, kind: L_MARK, w: 0.07 });
  });
  person(pen, 35.0, 27.2, 0, { ...randomLook(rng), top: C.white, hat: C.white }, "stand", false);
  for (let k = 0; k < 3; k++) person(pen, 35.7 + k * 0.62, 28.15 + (k % 2) * 0.12, 0, randomLook(rng), k === 1 ? "cheer" : "stand", true, 0.72);
  bench(pen, 31.2, AX - 3.3, 0);
  person(pen, 30.8, AX - 3.1, 0.3, randomLook(rng), "sit", false);
  bench(pen, 38.4, AX - 3.3, 0);
  // somebody asleep on this one, a newspaper over the face
  person(pen, 38.3, AX - 3.1, 0.3, { ...randomLook(rng), hat: C.white }, "sit", true);

  // ---- round the foot of the column: people looking up, and one much too close for the photograph
  for (const [a, r, pose, fl, s] of [
    [-0.35, 4.6, "stand", true, 1],
    [0.25, 4.7, "wave", false, 1],
    [0.6, 4.4, "stand", false, 0.72],
    [1.25, 4.7, "stand", true, 1],
    [1.75, 4.5, "cheer", false, 1],
    [2.3, 4.7, "stand", true, 1],
  ] as [number, number, "stand" | "wave" | "cheer", boolean, number][]) {
    person(pen, CX + Math.cos(a) * r, CY + Math.sin(a) * r, 0, randomLook(rng), pose, fl, s);
  }
  person(pen, CX + 3.35, CY + 2.4, 0, { ...randomLook(rng), top: C.yellow }, "cheer", true);

  // ---- Bellevue: two on guard at the door, and the gardener with his mower on the oval
  const guard: Look = { skin: [238, 187, 150], hair: C.black, top: C.blueDark, legs: C.blueDark, long: false, hat: C.blueDark };
  person(pen, 16.6, 10.0, 0, guard, "stand", false);
  person(pen, 18.5, 10.0, 0, { ...guard, skin: [211, 154, 108] }, "stand", true);
  person(pen, 15.4, 12.5, 0, { ...randomLook(rng), top: C.green, hat: C.ochre }, "walkA", false);
  pen.obj(() => {
    pen.box(16.0, 12.25, 0, 0.7, 0.5, 0.35, C.red, { w: W_FINE });
    pen.stroke(
      [
        [16.0, 12.5, 0.35],
        [15.6, 12.5, 1.0],
      ],
      { w: 0.06, color: C.black, kind: L_BAR, wobble: 0 },
    );
  });

  // ---- the meadow: Sunday. Three families round their grills
  const family = (gx: number, gy: number, n: number, seed: number) => {
    const r = new Rng(seed);
    grill(pen, r, gx, gy);
    // the one who does the grilling, with the tongs
    person(pen, gx - 0.75, gy + 0.2, 0, { ...randomLook(r), hat: null }, "wave", false);
    picnic(pen, r, gx + 1.9, gy + 1.3, 0, 3);
    for (let k = 0; k < n; k++) {
      const a = 0.4 + k * 1.3;
      person(pen, gx + Math.cos(a) * r.range(1.3, 2.3), gy + Math.sin(a) * r.range(1.0, 1.9) - 0.6, 0, randomLook(r), r.pick(["stand", "stand", "cheer"]), r.chance(0.5), r.chance(0.4) ? 0.72 : 1);
    }
    // the cool box
    pen.box(gx + 0.6, gy - 0.9, 0, 0.7, 0.45, 0.42, r.pick([C.blue, C.red, C.teal]), { top: C.white, w: W_FINE });
  };
  family(31.6, 15.4, 3, 11);
  family(37.6, 14.6, 4, 12);
  family(39.6, 20.6, 3, 13);
  // a dog that has got hold of a sausage and is not giving it back
  dog(pen, 35.2, 16.9, 0, C.woodDark, true);
  person(pen, 34.0, 16.2, 0, randomLook(rng), "cheer", false, 0.72);
  // sunbathers, flat out
  for (const [x, y, col] of [
    [33.4, 19.0, C.yellow],
    [35.2, 19.6, C.pink],
  ] as [number, number, RGB][]) {
    pen.floor(0, 3).rect(x - 0.95, y - 0.45, x + 0.95, y + 0.45, col, { outline: true, w: W_FINE });
    person(pen, x - 0.1, y, -0.25, randomLook(rng), "sit", false);
  }
  // rabbits, on the lawn in the wood, keeping an eye on the fox
  for (const [x, y, fl] of [
    [6.2, 38.6, false],
    [7.4, 39.5, true],
    [6.0, 40.4, false],
    [8.6, 38.3, true],
  ] as [number, number, boolean][]) {
    rabbit(pen, x, y, fl);
  }

  // ---- the beer garden of the Café am Neuen See: long tables on the shore, under bulbs
  for (const [x, n] of [
    [30.3, 5],
    [33.3, 4],
    [36.3, 6],
    [39.3, 4],
    [42.3, 5],
  ]) {
    bierbank(pen, rng, x, 35.75, 0, n);
  }
  const hang: V3[] = [
    [28.9, 34.9, 3.2],
    [31.8, 36.55, 3.2],
    [34.3, 34.6, 3.3],
    [37.8, 36.55, 3.2],
    [40.7, 34.6, 3.3],
    [43.4, 36.55, 3.2],
  ];
  for (const [x, y, z] of hang) {
    if (z < 3.25) pen.pole([x, y, 0], [x, y, z], 0.1, C.woodDark);
  }
  for (let k = 0; k + 1 < hang.length; k++) bulbs(pen, hang[k], hang[k + 1], 6, 0.42);
  // the kiosk, and the queue for it
  kiosk(pen, rng, 24.9, 34.75);
  queue(pen, rng, 26.2, 38.05, 4, -1, 0.06);
  stehtisch(pen, 28.6, 38.2);
  person(pen, 28.05, 38.3, 0, randomLook(rng), "stand", false);
  person(pen, 29.15, 38.35, 0, randomLook(rng), "wave", true);
  // boats for hire: a landing stage, two tied up, a man with a ticket roll
  pen.obj(() => {
    pen.box(33.0, 37.45, 0.02, 2.6, 1.35, 0.22, C.wood, { w: W_FINE });
    pen.floor(0.25, 1).ticks(33.1, 37.5, 35.5, 38.7, { n: 7, len: 1.2, ang: Math.PI / 2, jit: 0.02, color: C.woodDark, w: 0.05 });
    const sg = pen.card(32.8, 37.35, 0);
    sg.bar(0, 0, 0, 1.6, 0.07, C.woodDark);
    sg.rect(-0.95, 1.2, 0.95, 1.85, C.white, { outline: true, w: W_FINE, layer: 1 });
    sg.text("BOOTE", 0, 1.36, 0.3, { align: "c", layer: 2, w: 0.055 });
  });
  for (const [x, y, rot, col] of [
    [33.5, 39.55, 100, C.red],
    [35.0, 39.5, 82, C.blue],
  ] as [number, number, number, RGB][]) {
    pen.push(x, y, 0.03, rot);
    dinghy(pen, rng, col, 0);
    pen.pop();
  }
  person(pen, 34.3, 37.95, 0.24, { ...randomLook(rng), top: C.white, hat: C.blueDark }, "stand", false);
  swan(pen, 28.6, 41.0, 0.03, false);
  swan(pen, 29.6, 41.5, 0.03, true);
  swan(pen, 41.2, 39.2, 0.03, true);
  // on the shore path
  person(pen, 40.4, 37.1, 0, randomLook(rng), "stand", true);
  person(pen, 41.1, 37.2, 0, randomLook(rng), "wave", false, 0.72);

  // ---- what moves
  // round the Großer Stern, for ever. On this page keeping right means going round against the angle
  const ring: V3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = -(k / 40) * Math.PI * 2;
    ring.push([c.ox + CX + Math.cos(a) * R_LANE, c.oy + CY + Math.sin(a) * R_LANE, c.oz]);
  }
  const round = new Route(ring, true);
  const kinds: VehicleKind[] = ["bus", "car", "taxi", "car", "trabi"];
  kinds.forEach((kind, k) => c.movers.push(vehicle(round, rng, c.done + 0.2 + k * 0.15, kind, 3.3, k / kinds.length + (kind === "bus" ? 0 : 0.012))));
  // bicycles up and down the avenue, keeping right
  const avenue = stroll(
    c,
    [
      [27.2, AX + 1.35],
      [B - QUAY - 0.8, AX + 1.35],
      [B - QUAY - 0.8, AX - 1.35],
      [27.2, AX - 1.35],
    ],
    1.2,
  );
  for (let k = 0; k < 6; k++) c.movers.push(cyclist(avenue, rng, c.done + rng.range(0, 1), rng.range(3.4, 4.6)));
  // walkers and two joggers round the meadow, strollers along the shore
  const loop = stroll(c, meadowPath.slice(0, -1), 1.6);
  for (let k = 0; k < 6; k++) c.movers.push(walker(loop, rng, c.done + rng.range(0, 1)));
  for (let k = 0; k < 2; k++) c.movers.push(walker(loop, rng, c.done + rng.range(0, 1), rng.range(3.0, 3.5)));
  const shore = stroll(
    c,
    [
      [29.6, 36.8],
      [43.2, 36.8],
      [43.2, 37.25],
      [29.6, 37.25],
    ],
    0.2,
  );
  for (let k = 0; k < 4; k++) c.movers.push(walker(shore, rng, c.done + rng.range(0, 1)));
  // rowing boats, going round the lake the slow way
  const water: V3[] = [];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    water.push([c.ox + LX + 0.6 + Math.cos(a) * 6.3, c.oy + LY + 0.55 + Math.sin(a) * 1.05, c.oz + 0.03]);
  }
  const rowing = new Route(water, true);
  [C.wood, C.white, C.green].forEach((col, k) => {
    const seed = 410 + k * 9;
    const boat = new Turning((p) => dinghy(p, new Rng(seed), col, 2), 24, seed);
    c.movers.push(traveler(rowing, { speed: 0.55, at: k / 3 + 0.05, born: c.done + 0.3 * k, span: 2.4, sprite: (h) => boat.at(h) }));
  });
  // the fox, on its round through the trees
  const foxes = [0, 1].map((fl) => [0, 1].map((fr) => makeSprite((p) => fox(p, fr, fl === 1), 0, 21)));
  const den = stroll(
    c,
    [
      [6.4, 18.6],
      [9.6, 17.6],
      [12.8, 19.4],
      [12.4, 22.2],
      [9.2, 23.2],
      [6.2, 21.6],
    ],
    1.4,
  );
  c.movers.push(traveler(den, { speed: 2.3, at: 0.2, born: c.done + 0.5, span: 1, sprite: (h, t) => foxes[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 7) & 1] }));
  // a football, between two who would rather be playing for Hertha
  const pa: V2 = [31.6, 21.6];
  const pb: V2 = [36.6, 22.6];
  person(pen, pa[0] - 0.5, pa[1], 0, { ...randomLook(rng), top: C.blue }, "walkA", false);
  person(pen, pb[0] + 0.5, pb[1], 0, { ...randomLook(rng), top: C.white }, "walkB", true);
  person(pen, 34.2, 23.6, 0, randomLook(rng), "cheer", false, 0.72);
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const P = 1.5;
    const k = Math.floor(m.t / P);
    const u = m.t / P - k;
    const [from, to] = k % 2 === 0 ? [pa, pb] : [pb, pa];
    const x = c.ox + from[0] + (to[0] - from[0]) * u;
    const y = c.oy + from[1] + (to[1] - from[1]) * u;
    const z = c.oz + 0.22 + 4 * 1.5 * u * (1 - u);
    if (!m.sees(x, y, z, 4)) return;
    m.pen.card(x, y, z).circle(0, 0, 0.2, C.white, { outline: true, w: W_FINE, seg: 8, grain: 0 });
  });
  // a slackline between two posts, and somebody nearly staying on it
  const sa: V3 = [c.ox + 37.6, c.oy + 23.9, c.oz + 1.0];
  const sb: V3 = [c.ox + 41.4, c.oy + 23.3, c.oz + 1.0];
  pen.pole([37.6, 23.9, 0], [37.6, 23.9, 1.1], 0.14, C.woodDark);
  pen.pole([41.4, 23.3, 0], [41.4, 23.3, 1.1], 0.14, C.woodDark);
  const liner = makeSprite((p) => person(p, 0, 0, 0, { ...randomLook(rng), top: C.red, hat: null }, "cheer", false), 0, 33);
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const f = 0.5 + 0.3 * Math.sin(m.t * 0.45);
    const x = sa[0] + (sb[0] - sa[0]) * f + Math.sin(m.t * 3.1) * 0.07;
    const y = sa[1] + (sb[1] - sa[1]) * f;
    const z = sa[2] - 0.42 * Math.sin(Math.PI * f) + Math.sin(m.t * 2.3) * 0.03;
    if (!m.sees(x, y, z, 6)) return;
    m.pen.stroke([sa, [x, y, z], sb], { w: 0.07, color: C.orange, kind: L_BAR, wobble: 0 });
    m.put(liner, x, y, z, c.done);
  });

  // ---- the set piece: as the camera arrives the sun finds Goldelse, and the birds go up out of the trees
  const wx = c.ox + CX;
  const wy = c.oy + CY;
  const wz = c.oz + TOP;
  const glints: [number, number, number, number][] = [
    // across, up, when (seconds after the cue), size
    [1.34, 4.82, 0.0, 1.0],
    [0.05, 3.9, 0.4, 0.75],
    [-0.92, 5.42, 0.75, 0.85],
    [-1.5, 3.6, 1.1, 0.7],
    [0.5, 1.6, 1.4, 0.65],
    [1.34, 4.82, 1.8, 0.9],
    [-0.4, 2.6, 2.1, 0.6],
  ];
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(wx, wy, wz + 3, 12)) return;
    const s = c.stay();
    // with no tour she simply glints every so often
    const cue = s ? s.at + 0.35 : c.done + 1 + Math.floor((m.t - c.done) / 7) * 7;
    const cd = m.pen.card(wx, wy, wz);
    for (const [a, b, at, size] of glints) {
      const u = (m.t - cue - at) / 0.9;
      if (u <= 0 || u >= 1) continue;
      const k = Math.sin(Math.PI * u);
      const r = size * (0.6 + 1.5 * k);
      for (const [dx, dy, f] of [
        [1, 0, 1],
        [0, 1, 1],
        [0.7, 0.7, 0.42],
        [0.7, -0.7, 0.42],
      ]) {
        cd.seg(a - dx * r * f, b - dy * r * f, a + dx * r * f, b + dy * r * f, { w: 0.1 + 0.2 * k * f, color: C.lamp, alpha: k, kind: L_MARK, wobble: 0, layer: 9 });
        cd.seg(a - dx * r * f * 0.7, b - dy * r * f * 0.7, a + dx * r * f * 0.7, b + dy * r * f * 0.7, { w: 0.05 + 0.09 * k * f, color: C.white, alpha: k, kind: L_MARK, wobble: 0, layer: 10 });
      }
    }
  });
  const wings = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => bird(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 9; k++) {
    const r = 5.5 + (k % 4) * 1.5;
    const sp = (0.5 + 0.07 * (k % 5)) * (k % 2 ? -1 : 1);
    const ph = k * 1.7;
    // each one starts in a tree of its own
    const perch = 9 + (k % 3) * 2.2;
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const s = c.stay();
      const cue = s ? s.at + 0.2 + k * 0.07 : c.done + 0.5 + k * 0.1;
      const u = m.t - cue;
      if (u < 0) return;
      // up out of the leaves in a couple of seconds, then wheeling
      const rise = Math.min(1, u / 2.4);
      const e = rise * rise * (3 - 2 * rise);
      const a = ph + u * sp;
      const rr = perch + (r - perch) * e;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * (rise < 1 ? 9 : 5) + ph) & 1;
      m.put(wings[flap][vx - vy < 0 ? 1 : 0], wx + Math.cos(a) * rr, wy + Math.sin(a) * rr * 0.85, c.oz + 5 + e * (11 + (k % 4) * 3.2) + Math.sin(m.t * 0.8 + ph) * 0.9, cue);
    });
  }
};
