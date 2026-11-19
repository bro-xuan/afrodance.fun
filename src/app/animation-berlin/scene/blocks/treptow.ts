// Treptower Park, and the Spreepark that went bankrupt in it: the big red
// wheel still stands in the wood and still turns when the wind gets into it,
// a dinosaur lies on its back in the long grass, the roller coaster runs into
// a cat's mouth and stops. In front, a reach of the Spree with the Insel der
// Jugend on its high arched bridge, boats for hire, a beer garden under the
// chestnuts, and the observatory with the longest telescope anyone ever
// pointed at the sky.
//
// A place off the grid: a 40 x 40 frame standing on the bare paper, so it
// lays its own ground. Land at the back, water along the front (the lower
// edge on the page); everything on the land is drawn TOP above the paper.

import { RGB, Rng, V2, V3 } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { bierbank, tags } from "../berlin";
import { dinghy, hullShape } from "../boats";
import { W_FINE, W_THIN, Look, bridge, humpZ, person, randomLook, tree, windowAt } from "../kit";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder } from "../types";

/** The land stands this far above the paper; the water lies just above it. */
const TOP = 0.8;
const LAKE = 0.08;
const EARTH: RGB = [201, 178, 140];
const PAPER: RGB = [243, 239, 228];

// ---------------------------------------------------------------- the lie of the land

const CX = 17;
const CY = 17;
const wrap = (a: number) => {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** How far the land reaches from its middle, by direction: flattened along the front, where the water is. */
function landR(th: number): number {
  const d = wrap(th - Math.PI / 4);
  return 18 - 4 * Math.exp(-((d / 0.75) * (d / 0.75))) + 0.9 * Math.sin(3 * th + 0.7) + 0.6 * Math.sin(5 * th + 2.1);
}

/** The water lies in front of the land, between these two directions, widest in the middle. */
const W0 = (-20 * Math.PI) / 180;
const W1 = (125 * Math.PI) / 180;
function waterR(th: number): number {
  const s = Math.sin((Math.PI * (th - W0)) / (W1 - W0));
  return landR(th) + 13 * Math.pow(Math.max(0, s), 0.8);
}

function onLand(x: number, y: number, pad = 0): boolean {
  const dx = x - CX;
  const dy = y - CY;
  return Math.hypot(dx, dy) < landR(Math.atan2(dy, dx)) - pad;
}

function inLake(x: number, y: number, pad = 0): boolean {
  const dx = x - CX;
  const dy = y - CY;
  const th = Math.atan2(dy, dx);
  if (th <= W0 || th >= W1) return false;
  const r = Math.hypot(dx, dy);
  return r > landR(th) + pad && r < waterR(th) - pad;
}

/** From a point on the land, how far along a direction until the shore. */
function shoreFrom(x: number, y: number, dx: number, dy: number): number {
  let lo = 0;
  let hi = 30;
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) / 2;
    if (onLand(x + dx * mid, y + dy * mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// The bridge runs straight out from the bank (towards the lower left of the page) to the little island.
const XA = 23.2;
const SHORE_Y = 24 + shoreFrom(XA, 24, 0, 1);
const GAP = 4.4;
const ISLE_R = 3;
const IX = XA;
const IY = SHORE_Y + GAP + ISLE_R;
const SPAN = GAP + 2.4;
const DECK = 2.4;
const HUMP = 2.3;
// the jetty runs out from the bank the other way (towards the lower right)
const JETTY_Y = 24.6;
const JETTY_X = 27 + shoreFrom(27, JETTY_Y, 1, 0);

/** Where the dinosaur lies and the teacups stand. */
const DINO: V2 = [12.4, 18.4];
const CUPS: V2 = [14.5, 25.7];

// The wheel.
const HX = 12.5;
const HY = 12.5;
const R = 9;
const HUB = 12;
/** One unit across the page, on a card that faces the camera, is this much of x (and as much less of y). */
const K = 0.5773502691896258;
const GONDOLAS = 32;
const STEP = (Math.PI * 2) / GONDOLAS;
/** One turn in fifty seconds. */
const angleAt = (t: number) => 0.4 + (t * Math.PI * 2) / 50;
const RED: RGB = [204, 70, 56];
const RED_DARK: RGB = [150, 52, 44];
const FADED: RGB[] = [
  [224, 184, 92],
  [206, 104, 90],
  [124, 158, 194],
  [146, 182, 134],
  [234, 226, 208],
];
const RUST: RGB = [164, 100, 68];

// ---------------------------------------------------------------- small things

function crow(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.36 : -0.12;
  cd.bar(-0.8, y, -0.26, 0.08, 0.13, C.charcoal);
  cd.bar(0.8, y, 0.26, 0.08, 0.13, C.charcoal);
  cd.ellipse(0, 0, 0.32, 0.16, C.charcoal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
  cd.rect(0.28, -0.04, 0.48, 0.04, C.greyDark, { layer: 2, grain: 0 });
}

function crowSitting(pen: Pen): void {
  const cd = pen.card(0, 0, 0);
  cd.ellipse(0, 0.24, 0.2, 0.27, C.charcoal, { outline: true, w: W_FINE, seg: 8 });
  cd.circle(0.12, 0.52, 0.14, C.charcoal, { seg: 7, layer: 1 });
  cd.seg(0.23, 0.52, 0.38, 0.48, { w: 0.07, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 2 });
}

function fox(pen: Pen, flip: boolean, stride: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const fur: RGB = [216, 122, 54];
  const legs: [number, number][] = stride
    ? [
        [-0.36, -0.5],
        [-0.2, -0.12],
        [0.24, 0.42],
        [0.38, 0.3],
      ]
    : [
        [-0.34, -0.3],
        [-0.2, -0.26],
        [0.26, 0.3],
        [0.38, 0.44],
      ];
  for (const [a, b] of legs) cd.bar(a, 0.36, b, 0.04, 0.09, C.brickBrown);
  cd.bar(-0.5, 0.46, -1.0, 0.62, 0.22, fur);
  cd.seg(-1.0, 0.62, -1.14, 0.66, { w: 0.2, color: C.white, kind: L_BAR, wobble: 0 });
  cd.ellipse(0, 0.44, 0.52, 0.19, fur, { outline: true, w: W_FINE, layer: 1, seg: 10 });
  cd.poly(
    [
      [0.42, 0.5],
      [0.6, 0.78],
      [0.98, 0.52],
      [0.6, 0.4],
    ],
    fur,
    { outline: true, w: W_FINE, layer: 2 },
  );
  cd.poly(
    [
      [0.52, 0.7],
      [0.56, 0.98],
      [0.7, 0.74],
    ],
    fur,
    { outline: true, w: W_FINE, layer: 3 },
  );
  cd.seg(0.94, 0.53, 0.99, 0.52, { w: 0.09, color: C.black, kind: L_MARK, wobble: 0, layer: 3 });
}

/** A fibreglass sauropod, life size, toppled on to its back with its legs in the air. */
function dinosaur(pen: Pen, x: number, y: number): void {
  const cd = pen.card(x, y, 0);
  const hide: RGB = [118, 168, 150];
  const belly: RGB = [190, 214, 188];
  pen.begin();
  // tail and neck along the ground, the legs sticking up
  cd.bar(-1.7, 0.75, -2.9, 0.42, 0.5, hide);
  cd.bar(-2.9, 0.42, -3.9, 0.22, 0.26, hide);
  for (const [a0, a1, b1] of [
    [-1.0, -1.25, 2.55],
    [-0.3, -0.3, 2.8],
    [0.55, 0.75, 2.7],
    [1.15, 1.55, 2.35],
  ]) {
    cd.bar(a0, 1.45, a1, b1, 0.42, hide, { layer: 0 });
  }
  cd.ellipse(0, 0.95, 2.05, 0.9, hide, { outline: true, w: W_THIN, layer: 1, seg: 16 });
  cd.ellipse(0.1, 1.3, 1.5, 0.42, belly, { layer: 2, seg: 12, grain: 0.5 });
  cd.bar(1.7, 0.85, 3.3, 0.45, 0.56, hide, { layer: 1 });
  cd.ellipse(3.7, 0.46, 0.5, 0.32, hide, { outline: true, w: W_FINE, layer: 2, seg: 10 });
  // a cross for an eye: it has been dead a long time
  cd.seg(3.72, 0.5, 3.9, 0.66, { w: 0.06, wobble: 0, layer: 3 });
  cd.seg(3.72, 0.66, 3.9, 0.5, { w: 0.06, wobble: 0, layer: 3 });
  // moss, and somebody's name
  cd.ticks(-1.6, 0.4, 1.6, 1.1, { n: 12, len: 0.4, ang: 0.4, jit: 0.8, color: C.leafDark, w: 0.1, layer: 3 });
  cd.line(
    [
      [-0.9, 1.05],
      [-0.6, 1.4],
      [-0.35, 1.02],
      [-0.05, 1.42],
      [0.2, 1.06],
    ],
    { w: 0.09, color: C.pink, kind: L_MARK, wobble: 0.5, layer: 4 },
  );
  pen.end();
}

/** A swan to pedal: a little white hull with a neck. Its bow is along the pen's +x. */
function swanBoat(pen: Pen, rng: Rng, crew: boolean): void {
  pen.begin();
  pen.extrude(hullShape(3.1, 1.5, 0.3), -0.05, 0.42, C.white, { top: C.cream, crease: 28, w: 0.1 });
  if (crew) {
    person(pen, -0.5, 0.32, 0.22, randomLook(rng), "bust", false);
    person(pen, -0.5, -0.32, 0.22, randomLook(rng), "bust", true);
  }
  // the neck always shows side on; it bends the way the boat is pointing on the page
  const a = pen.w(1, 0, 0);
  const o = pen.w(0, 0, 0);
  const right = a[0] - o[0] - (a[1] - o[1]) >= 0;
  const cd = pen.card(1.15, 0, 0.42, !right);
  const neck: V2[] = [
    [0, 0],
    [0.18, 0.55],
    [-0.05, 1.0],
    [0.2, 1.3],
  ];
  cd.line(neck, { w: 0.3, color: C.ink, kind: L_BAR, wobble: 0 });
  cd.line(neck, { w: 0.2, color: C.white, kind: L_BAR, wobble: 0, bias: 0.012 });
  cd.circle(0.26, 1.36, 0.2, C.white, { outline: true, w: W_FINE, seg: 8, layer: 1 });
  cd.seg(0.4, 1.34, 0.62, 1.26, { w: 0.1, color: C.orange, kind: L_MARK, wobble: 0, layer: 2 });
  pen.end();
}

/** A spinning-teacup ride that has not spun since 2001, with the ivy on it. */
function teacups(pen: Pen, x: number, y: number): void {
  const pink: RGB = [226, 178, 180];
  pen.obj(() => {
    pen.cyl(x, y, 0, 2.5, 0.3, pink, { seg: 14, top: [214, 196, 186] });
    pen.cyl(x, y, 0.3, 0.3, 1.5, C.grey, { seg: 7 });
    pen.cone(x, y, 1.7, 1.2, 0.6, [206, 104, 90], { seg: 9 });
  });
  const cols: RGB[] = [FADED[0], FADED[2], FADED[3], FADED[4]];
  for (let k = 0; k < 4; k++) {
    const a = 0.5 + (k * Math.PI) / 2;
    const cx = x + Math.cos(a) * 1.55;
    const cy = y + Math.sin(a) * 1.55;
    pen.obj(() => {
      pen.cyl(cx, cy, 0.3, 0.5, 0.62, cols[k], { seg: 9, r2: 0.68, top: [112, 100, 96] });
      const cd = pen.card(cx, cy, 0.5);
      cd.arc(0.78, 0.12, 0.2, 0.2, -1.4, 1.4, { w: 0.09, color: cols[k], kind: L_BAR, wobble: 0, seg: 5 });
    }, 0.1);
  }
  // ivy over the lot
  pen.floor(0.31, 1).ticks(x - 2.3, y - 2.3, x + 2.3, y + 2.3, { n: 46, len: 0.45, ang: 0.9, jit: 1.4, color: C.leafDark, w: 0.13, inside: (a, b) => Math.hypot(a - x, b - y) < 2.35 && Math.hypot(a - x - 1.2, b - y - 0.6) > 1.0 });
}

/** The cat the roller coaster ran through. Its face is a painted board that looks at the camera. */
function catFace(pen: Pen, x: number, y: number): void {
  const fur: RGB = [238, 178, 84];
  const cd = pen.card(x, y, 0);
  pen.begin();
  // what holds it up
  cd.bar(-1.9, 0, -1.9, 2.4, 0.14, RUST);
  cd.bar(1.9, 0, 1.9, 2.4, 0.14, RUST);
  cd.poly(
    [
      [-1.9, 3.7],
      [-2.25, 5.25],
      [-0.85, 4.55],
    ],
    fur,
    { outline: true, w: W_THIN, layer: 1 },
  );
  cd.poly(
    [
      [1.9, 3.7],
      [2.25, 5.25],
      [0.85, 4.55],
    ],
    fur,
    { outline: true, w: W_THIN, layer: 1 },
  );
  cd.ellipse(0, 2.6, 2.45, 2.2, fur, { outline: true, w: W_THIN, layer: 2, seg: 20 });
  // stripes, mad eyes, a nose, whiskers
  for (const a of [-0.5, 0, 0.5]) cd.seg(a, 4.72, a * 0.8, 4.1, { w: 0.14, color: RUST, kind: L_MARK, wobble: 0.3, layer: 3 });
  for (const s of [-1, 1]) {
    cd.ellipse(s * 0.95, 3.35, 0.52, 0.42, C.white, { outline: true, w: W_FINE, layer: 3, seg: 10 });
    cd.circle(s * 0.95 + 0.1, 3.3, 0.17, C.black, { layer: 4, seg: 7, grain: 0 });
    for (const b of [2.75, 2.5]) cd.seg(s * 0.75, b, s * 2.05, b + (b - 2.6) * 1.5, { w: 0.05, wobble: 0.3, layer: 3 });
  }
  cd.poly(
    [
      [-0.26, 2.92],
      [0.26, 2.92],
      [0, 2.62],
    ],
    C.pink,
    { outline: true, w: W_FINE, layer: 3 },
  );
  // the mouth is the tunnel
  cd.ellipse(0, 1.5, 1.4, 0.98, [62, 46, 44], { outline: true, w: W_THIN, layer: 3, seg: 14 });
  for (const a of [-0.8, -0.3, 0.3, 0.8]) {
    cd.poly(
      [
        [a - 0.2, 2.42 - Math.abs(a) * 0.22],
        [a + 0.2, 2.42 - Math.abs(a) * 0.22],
        [a, 1.95 - Math.abs(a) * 0.2],
      ],
      C.white,
      { outline: true, w: W_FINE, layer: 4 },
    );
  }
  // the paint is going
  cd.ticks(-1.8, 1.0, 1.8, 4.3, { n: 16, len: 0.5, ang: 0.3, jit: 1.5, color: [214, 196, 160], w: 0.12, layer: 3, inside: (a, b) => (a / 2.3) * (a / 2.3) + ((b - 2.6) / 2.05) * ((b - 2.6) / 2.05) < 1 && Math.hypot(a, b - 1.5) > 1.5 });
  pen.end();
}

/** A stretch of roller-coaster track on trestles: two rusty rails through the given points, sleepers between. */
function track(pen: Pen, pts: V3[]): void {
  pen.begin();
  const left: V3[] = [];
  const right: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l;
    const ny = (b[0] - a[0]) / l;
    const p = pts[i];
    left.push([p[0] + nx * 0.42, p[1] + ny * 0.42, p[2]]);
    right.push([p[0] - nx * 0.42, p[1] - ny * 0.42, p[2]]);
    pen.stroke([left[i], right[i]], { w: 0.1, color: C.brickBrown, kind: L_BAR, wobble: 0 });
    if (i % 3 === 1) {
      for (const q of [left[i], right[i]]) pen.stroke([[q[0], q[1], 0], q], { w: 0.1, color: RUST, kind: L_BAR, wobble: 0 });
      pen.stroke(
        [
          [left[i][0], left[i][1], 0],
          [right[i][0], right[i][1], p[2]],
        ],
        { w: 0.06, color: RUST, kind: L_BAR, wobble: 0 },
      );
    }
  }
  pen.stroke(left, { w: 0.13, color: RUST, kind: L_BAR, wobble: 0.3 });
  pen.stroke(right, { w: 0.13, color: RUST, kind: L_BAR, wobble: 0.3 });
  pen.end();
}

/** Bulbs on a wire between two points: little pale dots by day, lit by night. */
function bulbs(pen: Pen, a: V3, b: V3, sag = 0.5): void {
  const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85));
  const wire: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    wire.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]);
  }
  pen.begin();
  pen.stroke(wire, { w: 0.04, color: C.inkSoft, kind: L_BAR, wobble: 0, alpha: 0.8 });
  for (let k = 1; k < n; k++) {
    const p = wire[k];
    pen.stroke(
      [
        [p[0], p[1], p[2] - 0.05],
        [p[0], p[1], p[2] - 0.17],
      ],
      { w: 0.15, color: C.lamp, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [p[0], p[1], p[2] - 0.09],
        [p[0], p[1], p[2] - 0.13],
      ],
      { w: 0.55, kind: L_LIGHT, wobble: 0, alpha: 0.85 },
    );
  }
  pen.end();
}

/** A ring in the plane of a card: an ink edge and the colour over it. */
function ringOn(cd: Plane, r: number, w: number, rgb: RGB, n = 44): void {
  const pts: V2[] = [];
  for (let k = 0; k < n; k++) pts.push([Math.cos((k / n) * Math.PI * 2) * r, Math.sin((k / n) * Math.PI * 2) * r]);
  cd.line(pts, { closed: true, w: w + 0.09, color: C.ink, kind: L_BAR, wobble: 0 });
  cd.line(pts, { closed: true, w, color: rgb, kind: L_BAR, wobble: 0, bias: 0.012 });
}

/** A path there and back along a line: out on one side of it, home on the other. */
function thereAndBack(line: V3[], half: number): V3[] {
  const side = (s: number) =>
    line.map((p, i): V3 => {
      const a = line[Math.max(0, i - 1)];
      const b = line[Math.min(line.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [p[0] - ((b[1] - a[1]) / l) * half * s, p[1] + ((b[0] - a[0]) / l) * half * s, p[2]];
    });
  return [...side(1), ...side(-1).reverse()];
}

// ---------------------------------------------------------------- the place

export const treptow: BlockBuilder = (c) => {
  const { pen, rng } = c;

  // ---- the ground: water in front, land behind, the little island in the water
  const lake: V2[] = [];
  for (let k = 0; k <= 36; k++) {
    const th = W0 + ((W1 - W0) * k) / 36;
    lake.push([CX + Math.cos(th) * waterR(th), CY + Math.sin(th) * waterR(th)]);
  }
  lake.push([CX, CY]);
  const land: V2[] = [];
  for (let k = 0; k < 44; k++) {
    const th = (k / 44) * Math.PI * 2;
    land.push([CX + Math.cos(th) * landR(th), CY + Math.sin(th) * landR(th)]);
  }
  const isle: V2[] = [];
  for (let k = 0; k < 14; k++) {
    const th = (k / 14) * Math.PI * 2;
    const r = ISLE_R * (1 + 0.07 * Math.sin(3 * th + 1));
    isle.push([IX + Math.cos(th) * r, IY + Math.sin(th) * r]);
  }
  const onIsle = (x: number, y: number, pad = 0) => Math.hypot(x - IX, y - IY) < ISLE_R + pad;
  // the path from the wood's edge, through the clearing, to the bridge
  const path: V2[] = [
    [4.6, 22.4],
    [10, 21.7],
    [15, 21.4],
    [20, 22.7],
    [XA, SHORE_Y - 1.6],
  ];
  const nearPath = (x: number, y: number, d: number) => {
    for (let i = 0; i + 1 < path.length; i++) {
      const [ax, ay] = path[i];
      const [bx, by] = path[i + 1];
      const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2));
      if (Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t) < d) return true;
    }
    return false;
  };
  // the clearing in front of the wheel, where the fun fair's relics lie: an oval across the page
  const inClearing = (x: number, y: number, grow = 1) => {
    const u = (x + y) / 2;
    const v = (x - y) / 2 + 0.6;
    return ((u - 19.0) / (6.0 * grow)) * ((u - 19.0) / (6.0 * grow)) + (v / (8.0 * grow)) * (v / (8.0 * grow)) < 1;
  };

  c.early(() => {
    pen.floor(LAKE, 0).poly(lake, C.water, { kind: F_WATER });
    const edge: V3[] = lake.slice(0, -1).map((p) => [p[0], p[1], LAKE] as V3);
    for (let k = 0; k + 1 < edge.length; k += 9) pen.stroke(edge.slice(k, Math.min(edge.length, k + 10)), { w: 0.16, color: C.waterDeep, kind: L_MARK, wobble: 1.5, alpha: 0.75 });
    pen.floor(LAKE, 1).ticks(6, 14, 46, 46, {
      n: 150,
      len: 1.5,
      ang: -Math.PI / 4,
      jit: 0.08,
      bend: 0.22,
      color: C.waterInk,
      w: 0.075,
      kind: L_RIPPLE,
      alpha: 0.75,
      inside: (a, b) => inLake(a, b, 0.7) && !onIsle(a, b, 0.5),
    });
    pen.extrude(land, 0, TOP, EARTH, { top: C.grass, w: W_THIN });
    pen.extrude(isle, 0, TOP - 0.1, EARTH, { top: C.grass, w: W_THIN });
    const g = pen.floor(TOP, 1);
    // paler where the fair stood
    const glade: V2[] = [];
    for (let k = 0; k < 22; k++) {
      const t = (k / 22) * Math.PI * 2;
      const u = 19.0 + Math.sin(t) * 5.5;
      const v = -0.6 + Math.cos(t) * 7.4;
      glade.push([u + v, u - v]);
    }
    g.poly(glade, C.grassLight, { grain: 0.9 });
    g.line(path, { w: 1.5, color: C.path, kind: L_MARK, wobble: 0.5, layer: 1 });
    pen.floor(TOP, 2).ticks(-1, -3, 37, 36, { n: 420, len: 0.5, ang: 1.2, jit: 0.5, color: C.grassDark, w: 0.06, inside: (a, b) => onLand(a, b, 0.7) && !nearPath(a, b, 0.9) });
    // the grass has had twenty years to grow where the fair was
    pen.floor(TOP, 2).ticks(8, 8, 32, 32, { n: 110, len: 0.95, ang: 1.45, jit: 0.3, color: C.leaf2, w: 0.07, inside: (a, b) => inClearing(a, b, 0.95) && !nearPath(a, b, 1) });
    // reeds along the bank
    pen.floor(LAKE, 2).ticks(4, 14, 40, 40, { n: 160, len: 0.9, ang: 1.5, jit: 0.25, color: C.leafDark, w: 0.07, inside: (a, b) => inLake(a, b, 0.05) && !inLake(a, b, 0.9) && Math.abs(a - XA) > 2.4 && Math.abs(b - JETTY_Y) > 1.6 });
  });

  // everything from here stands on the land
  pen.push(0, 0, TOP);

  // ---- the wheel's legs: an A either side of it, and the axle between them. The wheel itself is a mover.
  const feet = 4.5 * K;
  pen.obj(() => {
    for (const o of [-0.62, 0.62]) {
      for (const s of [-1, 1]) {
        pen.box(HX + s * feet + o - 0.4, HY - s * feet + o - 0.4, 0, 0.8, 0.8, 0.3, C.stoneDark, { w: W_THIN });
        pen.pole([HX + s * feet + o, HY - s * feet + o, 0.3], [HX + o, HY + o, HUB], 0.34, C.grey);
      }
      // a brace across each A
      pen.stroke(
        [
          [HX + feet * 0.5 + o, HY - feet * 0.5 + o, HUB * 0.5],
          [HX - feet * 0.5 + o, HY + feet * 0.5 + o, HUB * 0.5],
        ],
        { w: 0.16, color: C.greyDark, kind: L_BAR, wobble: 0 },
      );
    }
    pen.stroke(
      [
        [HX - 0.7, HY - 0.7, HUB],
        [HX + 0.7, HY + 0.7, HUB],
      ],
      { w: 0.5, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    // (a speck of paper at the top of the wheel's sweep: the camera frames a place by what stands still in it)
    pen.card(HX, HY, HUB + R + 1.4).poly(
      [
        [0, 0],
        [0.03, 0],
        [0, 0.03],
      ],
      PAPER,
      { grain: 0, shade: false },
    );
  });

  // ---- what is left of the fair
  dinosaur(pen, DINO[0], DINO[1]);
  teacups(pen, CUPS[0], CUPS[1]);
  catFace(pen, 21.5, 7.5);
  const rails: V3[] = [];
  {
    // out of the cat's mouth towards the camera, round into the clearing, and then nothing
    const ctrl: V3[] = [
      [21.9, 7.9, 1.55],
      [24.3, 10.3, 1.8],
      [25.7, 13.3, 1.7],
      [25.9, 16.6, 1.25],
    ];
    for (let i = 0; i + 1 < ctrl.length; i++) {
      for (let k = 0; k < 4; k++) {
        const t = k / 4;
        rails.push([ctrl[i][0] + (ctrl[i + 1][0] - ctrl[i][0]) * t, ctrl[i][1] + (ctrl[i + 1][1] - ctrl[i][1]) * t, ctrl[i][2] + (ctrl[i + 1][2] - ctrl[i][2]) * t]);
      }
    }
    rails.push(ctrl[ctrl.length - 1]);
  }
  track(pen, rails);
  // one car still on it, where it stopped
  pen.obj(() => {
    pen.push(25.78, 14.5, 1.58, 86);
    pen.box(-0.9, -0.48, 0.06, 1.8, 0.96, 0.55, FADED[1], { w: W_THIN });
    pen.box(0.35, -0.42, 0.61, 0.5, 0.84, 0.3, FADED[1], { w: W_FINE });
    pen.pop();
  }, 0.2);
  // the stranded swan, in the weeds by the water
  pen.push(19.4, 29.3, -0.12, 200);
  swanBoat(pen, rng, false);
  pen.pop();
  pen.floor(0, 3).ticks(18, 27.9, 21, 30.7, { n: 22, len: 0.95, ang: 1.5, jit: 0.3, color: C.leafDark, w: 0.08 });
  // the sign over the way in, with the ivy on that too
  pen.obj(() => {
    const cd = pen.card(21.7, 25.2, 0);
    for (const a of [-2.7, 2.7]) cd.bar(a, 0, a, 3.2, 0.16, RUST);
    cd.rect(-3.0, 3.0, 3.0, 4.1, [208, 214, 190], { outline: true, w: W_THIN, layer: 1 });
    cd.text("SPREEPARK", 0, 3.27, 0.56, { align: "c", layer: 2, color: RED_DARK, kind: L_MARK, w: 0.09 });
    cd.ticks(-3.0, 0.2, -2.3, 3.9, { n: 14, len: 0.4, ang: 1.2, jit: 1.2, color: C.leafDark, w: 0.12, layer: 3 });
    cd.ticks(1.7, 3.6, 3.0, 4.15, { n: 8, len: 0.4, ang: 1.2, jit: 1.2, color: C.leafDark, w: 0.12, layer: 3 });
  });

  // ---- the boat hire: a hut on the bank, a jetty, boats tied up along it
  pen.obj(() => {
    pen.box(25.3, 22.2, 0, 2.6, 2.0, 2.3, C.cream);
    const f = pen.wall("y+", 25.3, 22.2, 0, 2.6, 2.0);
    f.rect(0.3, 0.9, 2.3, 1.75, C.charcoal, { outline: true, w: W_FINE, glow: 0.7, layer: 1 });
    f.block(0.2, 0.82, 2.4, 0.9, 0.3, C.wood, { w: W_FINE });
    f.rect(0.15, 1.85, 2.45, 2.25, C.blueDark, { outline: true, w: W_FINE, layer: 1 });
    f.text("BOOTE", 1.3, 1.94, 0.24, { align: "c", layer: 2, color: C.white, kind: L_MARK, w: 0.055 });
    const g = pen.wall("x+", 25.3, 22.2, 0, 2.6, 2.0);
    g.rect(0.55, 0, 1.45, 1.7, C.doorBlue, { outline: true, w: W_FINE, layer: 1 });
    tags(g, rng, 0.1, 1.9, 0.3, 1.4, 2);
  });
  pen.obj(() => pen.gable(25.1, 22.0, 2.3, 3.0, 2.4, 0.9, "x", C.tile, { gable: C.cream }), 0.15);
  person(pen, 26.6, 23.95, 0.25, randomLook(rng), "bust", false);
  person(pen, 26.1, 25.0, 0, randomLook(rng), "stand", false);
  person(pen, 26.9, 25.2, 0, randomLook(rng), "wave", true, 0.72);
  pen.obj(() => {
    pen.box(JETTY_X - 1.6, JETTY_Y - 0.65, -0.42, 7.2, 1.3, 0.16, C.wood, { top: C.wood, w: W_THIN });
    pen.floor(-0.25, 1).ticks(JETTY_X - 1.5, JETTY_Y - 0.6, JETTY_X + 5.5, JETTY_Y + 0.6, { n: 16, len: 1.1, ang: Math.PI / 2, jit: 0.02, color: C.woodDark, w: 0.05 });
    for (let a = 0.2; a < 5.7; a += 1.75) {
      for (const o of [-0.6, 0.6]) pen.pole([JETTY_X + a, JETTY_Y + o, LAKE - TOP], [JETTY_X + a, JETTY_Y + o, -0.1], 0.13, C.woodDark);
    }
  });
  person(pen, JETTY_X + 4.9, JETTY_Y + 0.1, -0.26, randomLook(rng), "stand", true);
  // tied up: two rowing boats one side, a swan the other
  for (const [dx, dy, rot, kind] of [
    [1.2, 1.45, 4, 0],
    [3.9, 1.5, -5, 1],
    [2.6, -1.5, 184, 2],
  ] as [number, number, number, number][]) {
    pen.push(JETTY_X + dx, JETTY_Y + dy, LAKE - TOP, rot);
    if (kind === 2) swanBoat(pen, rng, false);
    else dinghy(pen, rng, kind ? C.blue : C.red, 0);
    pen.pop();
  }

  // ---- the beer garden under the chestnuts, with its lights
  const chestnuts: V2[] = [
    [31.8, 15.4],
    [33.2, 18.6],
    [29.6, 21.6],
    [26.6, 20.2],
  ];
  for (const [x, y] of chestnuts) tree(pen, rng, x, y, { kind: "elm", h: 2.3, r: 1.6, color: C.leaf2 });
  bierbank(pen, rng, 28.8, 19.2, 0, 5);
  bierbank(pen, rng, 30.9, 17.3, 0, 4);
  bierbank(pen, rng, 31.4, 19.8, 0, 6);
  bierbank(pen, rng, 29.2, 16.8, 0, 3);
  const wires: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [0, 2],
  ];
  for (const [i, j] of wires) bulbs(pen, [chestnuts[i][0], chestnuts[i][1], 3.05], [chestnuts[j][0], chestnuts[j][1], 3.05], 0.4);
  // someone carrying four at once
  const waiter: Look = { skin: [238, 187, 150], hair: [43, 32, 25], top: C.white, legs: C.black, long: false, hat: null };
  person(pen, 30.0, 18.5, 0, waiter, "cheer", false);

  // ---- the observatory: a round house, a mount, and the great refractor aimed over the trees
  const ox = 7.5;
  const oy = 25.5;
  pen.obj(() => {
    pen.cyl(ox, oy, 0, 2.6, 2.3, C.cream, { seg: 14, top: C.zinc });
    const f = pen.wall("y+", ox - 2.6, oy - 0.6, 0, 5.2, 3.19);
    f.rect(2.1, 0, 3.1, 1.7, C.door, { outline: true, w: W_FINE });
    const g = pen.wall("x+", ox - 0.6, oy - 2.6, 0, 3.19, 5.2);
    windowAt(g, 2.1, 0.75, 3.1, 1.75, true, C.white);
    pen.cyl(ox, oy, 2.3, 2.75, 0.14, C.stone, { seg: 14 });
  });
  pen.obj(() => {
    pen.box(ox - 0.7, oy - 0.7, 2.44, 1.4, 1.4, 1.5, C.steel, { w: W_THIN });
    // the tube: twenty-one metres of it in life, counterweighted behind the mount
    const a: V3 = [ox + 1.5, oy - 1.5, 2.6];
    const b: V3 = [ox - 5.4, oy + 5.4, 10.6];
    pen.pole(a, b, 0.62, C.white);
    pen.pole([ox + 1.5, oy - 1.5, 2.6], [ox + 2.1, oy - 2.1, 1.95], 0.9, C.greyDark);
    for (const t of [0.3, 0.55, 0.8]) {
      const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      pen.stroke(
        [
          [p[0] - 0.22, p[1] - 0.22, p[2] - 0.2],
          [p[0] + 0.22, p[1] + 0.22, p[2] + 0.2],
        ],
        { w: 0.1, color: C.greyDark, kind: L_BAR, wobble: 0, bias: 0.03 },
      );
    }
    pen.stroke(
      [
        [ox, oy, 3.9],
        [ox - 2.2, oy + 2.2, 6.2],
      ],
      { w: 0.14, color: C.steelDark, kind: L_BAR, wobble: 0 },
    );
  }, 0.2);
  person(pen, ox + 1.6, oy + 3.2, 0, randomLook(rng), "wave", false);
  person(pen, ox + 2.5, oy + 3.5, 0, randomLook(rng), "stand", true, 0.72);

  // ---- the wood
  const taken: V2[] = [...chestnuts];
  const clear = (x: number, y: number) => {
    const u = (x + y) / 2;
    const v = (x - y) / 2;
    if (inClearing(x, y, 1.02)) return false;
    // the wheel needs its own width of sky
    if (Math.abs(u - 12.5) < 1.7 && Math.abs(v) < 6.3) return false;
    // nor anything right behind its hub
    if (u > 8 && u < 12.5 && Math.abs(v) < 2.6) return false;
    if (x > 24.5 && x < 35 && y > 13.6 && y < 26.6) return false;
    if (Math.hypot(x - 22.4, y - 8.4) < 2.6 || (x > 22.4 && x < 28 && y > 8.6 && y < 18)) return false;
    if (Math.abs(x - XA) < 2.4 && y > 24.5) return false;
    if (Math.hypot(x - ox, y - oy) < 4.3 || Math.hypot(x - CUPS[0], y - CUPS[1]) < 3.5 || Math.hypot(x - 19.4, y - 29.3) < 2.2) return false;
    if (Math.abs(u - (DINO[0] + DINO[1]) / 2) < 2.4 && Math.abs(v - (DINO[0] - DINO[1]) / 2) < 3.2) return false;
    return !nearPath(x, y, 1.6);
  };
  let planted = 0;
  for (let tries = 0; tries < 900 && planted < 46; tries++) {
    const x = rng.range(-0.5, 37);
    const y = rng.range(-2.5, 36);
    if (!onLand(x, y, 1.5) || !clear(x, y) || taken.some((p) => Math.hypot(p[0] - x, p[1] - y) < 2.0)) continue;
    taken.push([x, y]);
    planted++;
    const back = x + y < 23;
    const kind = back ? rng.pick(["tall", "tall", "round", "elm"] as const) : rng.pick(["round", "elm", "round", "tall"] as const);
    tree(pen, rng, x, y, kind === "tall" ? { kind, h: rng.range(1.5, 2.2), r: rng.range(1.5, 1.9) } : { kind, h: rng.range(1.9, 2.8), r: rng.range(1.5, 2.0), color: rng.pick([C.leaf, C.leaf2, C.leaf3, C.grassDark, C.leafDark]) });
  }
  for (let k = 0; k < 9; k++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(0, 6.5);
    const u = 19.2 + Math.sin(a) * r * 0.85;
    const v = Math.cos(a) * r;
    const bx = u + v;
    const by = u - v;
    if (nearPath(bx, by, 1.3) || !clear(bx - 3, by - 3) || Math.hypot(bx - 18.2, by - 18.2) < 3.4) continue;
    tree(pen, rng, bx, by, { kind: "bush", r: rng.range(0.5, 0.8) });
  }

  // ---- the little island and its bridge
  pen.push(0, 0, -0.1);
  for (const [dx, dy] of [
    [-1.5, -0.4],
    [1.3, -1.0],
    [0.2, 1.4],
    [-1.2, 1.3],
    [1.7, 0.9],
  ]) {
    tree(pen, rng, IX + dx, IY + dy, { kind: "round", h: rng.range(1.7, 2.3), r: rng.range(1.2, 1.6), color: rng.pick([C.leaf3, C.leaf, C.leaf2]) });
  }
  person(pen, IX - 0.4, IY - 0.1, 0, randomLook(rng), "sit", false);
  person(pen, IX + 0.4, IY, 0, randomLook(rng), "sit", true);
  pen.pop();
  pen.push(XA + DECK / 2, SHORE_Y - 1.2, 0.03, 90);
  bridge(pen, rng, SPAN, DECK, { water: TOP + 0.03 - LAKE, hump: HUMP, color: C.sandstoneLight, bikes: false });
  // the gate tower at the island end: two brick piers and a beam
  pen.obj(() => {
    for (const y of [-0.62, DECK + 0.02]) {
      pen.box(SPAN - 1.25, y, -0.4, 0.95, 0.6, 3.5, C.brick);
      pen.pyramid(SPAN - 1.35, y - 0.1, 3.1, 1.15, 0.8, 0.9, C.tile);
    }
    pen.box(SPAN - 1.1, -0.1, 2.35, 0.65, DECK + 0.2, 0.42, C.brick);
  }, 0.3);
  person(pen, SPAN * 0.46, DECK * 0.62, humpZ(SPAN * 0.46, SPAN, HUMP), randomLook(rng), "stand", false);
  person(pen, SPAN * 0.56, DECK * 0.62, humpZ(SPAN * 0.56, SPAN, HUMP), randomLook(rng), "wave", true);
  pen.pop();

  // ---- people: the guided tour in its hard hats, staring up; an angler; a painter of ruins
  const guide: Look = { ...randomLook(rng), top: C.orange, hat: C.white };
  person(pen, 16.3, 17.6, 0, guide, "wave", false);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * 2.6 - 0.2;
    person(pen, 18.2 + Math.cos(a) * rng.range(0.7, 2.0), 18.3 + Math.sin(a) * rng.range(0.4, 1.3) - (k % 2) * 0.9, 0, { ...randomLook(rng), hat: C.yellow }, rng.pick(["stand", "stand", "wave", "cheer"]), true, k === 3 ? 0.72 : 1);
  }
  person(pen, 13.0, 31.4, 0, { ...randomLook(rng), hat: C.green }, "sit", false);
  pen.stroke(
    [
      [13.3, 31.4, 0.9],
      [14.2, 33.6, 2.4],
    ],
    { w: 0.05, color: C.woodDark, kind: L_BAR, wobble: 0 },
  );
  pen.stroke(
    [
      [14.2, 33.6, 2.4],
      [14.5, 34.6, LAKE - TOP],
    ],
    { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0, alpha: 0.8 },
  );
  // somebody photographing the dinosaur, somebody sitting on it
  person(pen, DINO[0] + 2.6, DINO[1] + 1.9, 0, randomLook(rng), "stand", true);
  person(pen, DINO[0] - 0.1, DINO[1] + 0.1, 1.75, randomLook(rng), "sit", true, 0.72);
  person(pen, 17.6, 27.4, 0, randomLook(rng), "stand", true);
  // a painter of ruins at her easel, and the roller coaster she is painting
  person(pen, 21.6, 14.9, 0, { ...randomLook(rng), top: C.cream, hat: C.redDark }, "stand", false);
  pen.obj(() => {
    const cd = pen.card(22.5, 14.4, 0);
    cd.bar(-0.3, 0, 0, 1.6, 0.07, C.woodDark);
    cd.bar(0.3, 0, 0, 1.6, 0.07, C.woodDark);
    cd.rect(-0.42, 0.75, 0.42, 1.5, C.white, { outline: true, w: W_FINE, layer: 1 });
    cd.circle(0.05, 1.18, 0.2, FADED[0], { layer: 2, seg: 7, grain: 0.3 });
    cd.seg(-0.3, 0.9, 0.3, 0.9, { w: 0.08, color: C.grass, kind: L_MARK, wobble: 0.3, layer: 2 });
  });
  // the pay box: nobody has paid since 2001
  pen.obj(() => {
    pen.box(24.3, 26.4, 0, 1.3, 1.3, 2.1, [150, 176, 190]);
    pen.pyramid(24.15, 26.25, 2.1, 1.6, 1.6, 0.8, RUST);
    const f = pen.wall("y+", 24.3, 26.4, 0, 1.3, 1.3);
    f.rect(0.25, 0.95, 1.05, 1.6, C.charcoal, { outline: true, w: W_FINE, layer: 1 });
    f.text("KASSE", 0.65, 1.72, 0.17, { align: "c", layer: 1, w: 0.045 });
    tags(f, rng, 0.05, 1.25, 0.1, 0.9, 2);
  });
  pen.pop();

  // ---- what moves
  const wx = c.ox + HX;
  const wy = c.oy + HY;
  const wz = c.oz + TOP + HUB;
  const born = c.t + 1.35;
  // the wheel: rims, spokes and gondolas drawn afresh as it turns; after dark it wears its bulbs
  c.movers.push((m) => {
    if (m.t < born || !m.sees(wx, wy, wz, R + 8)) return;
    const p = m.pen;
    p.reveal = () => born;
    const cd = p.card(wx, wy, wz);
    const ang = angleAt(m.t);
    p.begin();
    ringOn(cd, R, 0.22, RED);
    ringOn(cd, R - 1.0, 0.12, RED);
    const lace: V2[] = [];
    for (let k = 0; k <= GONDOLAS * 2; k++) {
      const a = ang + (k / (GONDOLAS * 2)) * Math.PI * 2;
      const r = k % 2 ? R : R - 1.0;
      lace.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    cd.line(lace, { w: 0.07, color: RED_DARK, kind: L_BAR, wobble: 0 });
    for (let k = 0; k < 16; k++) {
      const a = ang + (k / 16) * Math.PI * 2;
      cd.seg(Math.cos(a) * 0.8, Math.sin(a) * 0.8, Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), { w: 0.09, color: RED_DARK, kind: L_BAR, wobble: 0 });
    }
    cd.circle(0, 0, 0.95, C.grey, { outline: true, w: W_THIN, layer: 3, seg: 10, grain: 0.4 });
    cd.circle(0, 0, 0.36, RED, { layer: 4, seg: 8, grain: 0.3 });
    for (let k = 0; k < GONDOLAS; k++) {
      const a = ang + k * STEP;
      const gx = Math.cos(a) * R;
      const gy = Math.sin(a) * R;
      const col = FADED[k % FADED.length];
      cd.seg(gx, gy, gx, gy - 0.32, { w: 0.07, kind: L_BAR, wobble: 0 });
      cd.poly(
        [
          [gx - 0.62, gy - 0.58],
          [gx + 0.62, gy - 0.58],
          [gx + 0.4, gy - 0.3],
          [gx - 0.4, gy - 0.3],
        ],
        [col[0] * 0.78, col[1] * 0.78, col[2] * 0.78],
        { outline: true, w: W_FINE, layer: 2, grain: 0.5 },
      );
      cd.rect(gx - 0.5, gy - 1.45, gx + 0.5, gy - 0.58, col, { outline: true, w: W_FINE, layer: 2, grain: 0.5 });
      cd.rect(gx - 0.4, gy - 1.0, gx + 0.4, gy - 0.66, [84, 86, 96], { layer: 3, grain: 0.3 });
    }
    if (m.night > 0.05) {
      // a wave of light chases round the rim
      for (let k = 0; k < GONDOLAS; k++) {
        const a = ang + (k + 0.5) * STEP;
        const pulse = Math.max(0, Math.cos(k * STEP * 2 - m.t * 4.2));
        cd.seg(Math.cos(a) * R - 0.02, Math.sin(a) * R, Math.cos(a) * R + 0.02, Math.sin(a) * R, { w: 0.42 + 0.3 * pulse, kind: L_LIGHT, wobble: 0, alpha: 0.5 + 0.5 * pulse * pulse });
      }
      for (let k = 0; k < 8; k++) {
        const a = ang + (k / 8) * Math.PI * 2;
        for (const r of [2.6, 5.2]) cd.seg(Math.cos(a) * r - 0.02, Math.sin(a) * r, Math.cos(a) * r + 0.02, Math.sin(a) * r, { w: 0.32, kind: L_LIGHT, wobble: 0, alpha: 0.7 });
      }
      cd.seg(-0.02, 0, 0.02, 0, { w: 1.6, kind: L_LIGHT, wobble: 0, alpha: 0.5 });
    }
    p.end();
  });

  // crows on the rim. They ride it round until the camera comes, then lift off all together
  const flying = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => crow(p, up === 1, fl === 1), 0, 13)));
  const sitting = makeSprite((p) => crowSitting(p), 0, 14);
  for (let j = 0; j < 7; j++) {
    const since = born + 1.0 + j * 0.1;
    c.movers.push((m) => {
      if (m.t < since) return;
      const s = c.stay();
      if (!s) {
        // no tour: they wheel round it instead
        const a = j * 0.9 + m.t * (0.42 + 0.05 * j) * (j % 2 ? -1 : 1);
        const flap = Math.floor(m.t * 6 + j) & 1;
        m.put(flying[flap][Math.sin(a) * (j % 2 ? -1 : 1) > 0 ? 1 : 0], wx + Math.cos(a) * (R + 2.5 + j * 0.3) * K, wy - Math.cos(a) * (R + 2.5 + j * 0.3) * K, wz + Math.sin(a) * 3.5 + 6, since);
        return;
      }
      const lift = s.at + 0.2 + j * 0.08;
      // each sits on the stretch of rim that will be at the top when the camera gets here
      const slot = Math.round((Math.PI / 2 + (j - 3) * 0.2 - angleAt(lift)) / STEP);
      const a = angleAt(Math.min(m.t, lift)) + (slot + 0.5) * STEP;
      const pa = Math.cos(a) * R;
      const pb = Math.sin(a) * R + 0.1;
      if (m.t < lift) {
        m.put(sitting, wx + pa * K, wy - pa * K, wz + pb, since);
        return;
      }
      const u = m.t - lift;
      if (u > 9) return;
      const dir = (j % 2 ? 1 : -1) * (0.55 + 0.22 * (j % 3));
      const fa = pa + dir * u * 3.6 + Math.sin(u * 2.1 + j) * 0.5;
      const fb = pb + 5.8 * (1 - Math.exp(-u * 0.9)) + Math.sin(u * 3.1 + j) * 0.3;
      const flap = Math.floor(m.t * 7 + j) & 1;
      m.put(flying[flap][dir < 0 ? 1 : 0], wx + fa * K, wy - fa * K, wz + fb, since);
    });
  }

  // boats out on the water, round the little island and under its bridge
  const loop: V3[] = [];
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    loop.push([c.ox + IX + Math.cos(a) * 4.7, c.oy + IY - 0.5 + Math.sin(a) * 4.7, c.oz + LAKE]);
  }
  const water = new Route(loop, true);
  const fleet = [
    new Turning((p) => dinghy(p, new Rng(41), C.wood, 2), 24, 41),
    new Turning((p) => swanBoat(p, new Rng(42), true), 24, 42),
    new Turning((p) => dinghy(p, new Rng(43), C.green, 1), 24, 43),
  ];
  fleet.forEach((boat, k) => c.movers.push(traveler(water, { speed: 1.05, at: 0.08 + k * 0.335, born: c.done + k * 0.3, span: 2.2, sprite: (h) => boat.at(h) })));

  // a fox, on its round of the ruins
  const foxes = [0, 1].map((fl) => [0, 1].map((st) => makeSprite((p) => fox(p, fl === 1, st === 1), 0, 21)));
  const beat = new Route(
    rounded(
      (
        [
          [10.4, 24.7],
          [12.6, 23.1],
          [17.3, 23.4],
          [18.3, 27.0],
          [14.8, 29.5],
          [10.8, 28.7],
        ] as V2[]
      ).map((p) => [c.ox + p[0], c.oy + p[1], c.oz + TOP] as V3),
      true,
      1.6,
    ),
    true,
  );
  c.movers.push(traveler(beat, { speed: 2.3, at: 0.3, born: c.done + 0.4, span: 1.2, sprite: (h, t) => foxes[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 5) & 1] }));

  // people on the path, and over the bridge to the island and back
  const line: V3[] = path.map((p) => [c.ox + p[0], c.oy + p[1], c.oz + TOP] as V3);
  for (let a = 0.6; a < SPAN - 0.3; a += 0.7) line.push([c.ox + XA, c.oy + SHORE_Y - 1.2 + a, c.oz + TOP + 0.03 + humpZ(a, SPAN, HUMP)]);
  line.push([c.ox + XA, c.oy + IY - 1.2, c.oz + TOP - 0.1]);
  const walk = new Route(thereAndBack(line, 0.42), true);
  for (let k = 0; k < 5; k++) c.movers.push(walker(walk, rng, c.done + rng.range(0, 1), rng.range(1.15, 1.5)));
};
