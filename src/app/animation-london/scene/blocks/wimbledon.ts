// Wimbledon: the tennis, on an islet of its own in the bottom left corner of
// the page. Centre Court with its roof drawn back and a point being played on
// the grass: the server holds serve as the camera arrives, and the crowd gets
// to its feet. Outside, the hill where people without tickets picnic in front
// of the big screen, strawberries and cream, a doubles match on an outside
// court, the ground crew by their rolled-up rain cover, and the Queue.

import { RGB, Rng, V2, V3, clamp, hex, lerp, scaleRGB, smooth } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_NEON, L_BAR, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { LondonBuilder, LondonCtx } from "../city";
import { Route, makeSprite, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import { Look, Pose, W_FINE, W_THIN, bulb, clock, dogOn, flag, flowerBed, handFlag, lamp, lightString, person, pigeonOn, railing, randomLook, speckle, stall, tree, tufts, umbrella, windowAt } from "../props";

/** Height of the islet above the paper. */
const G = 1.4;

// the islet: a rounded tile of turf
const LX0 = 1.0;
const LX1 = 39.6;
const LY0 = 1.2;
const LY1 = 39.4;
const LR = 4.6;

// Centre Court: the grass inside the stands, the net, and the court's lines measured from its middle
const AX0 = 9;
const AX1 = 26;
const AY0 = 9;
const AY1 = 20;
const NETX = 17.5;
const MIDY = 14.5;
const BASE = 6.1;
const SIDE = 2.9;
const SINGLE = 2.2;
const SERVICE = 3.25;
// the stands behind it: five tiers on the two far sides, a back wall, and the roof's ring beam on masts
const ROWS = 5;
const DEEP = 1.1;
const FIRST = 0.8;
const RISE = 1.15;
const BACK = 3.15;
const WALL_H = 6.7;
const BEAM = 10.0;
const tierTop = (k: number) => FIRST + k * RISE;
/** The scoreboard, on the back wall of the north stand. */
const SB = { x: 20.0, y: BACK, z: 7.2, w: 5.8, d: 0.35, h: 2.4 };
/** The building with the big screen on it, and the picture area of the screen on its south wall. */
const SCR = { x: 29.6, y: 2.9, w: 8.3, d: 2.4, h: 6.2, a0: 1.15, b0: 1.9, pw: 6, ph: 3.3 };
// the outside court
const OX0 = 4.5;
const OX1 = 16.5;
const OY0 = 27.6;
const OY1 = 34.6;
const OCX = 10.5;
const OCY = 31.1;

const GREEN = hex("#2e5a45");
const GREEN_L = hex("#3f7559");
const GREEN_D = hex("#234636");
const PURPLE = hex("#5b3f8c");
const PURPLE_L = hex("#9a7fd0");
const TURF = hex("#8fca6c");
const TURF_L = hex("#a8da87");
const TURF_D = hex("#5f9a4c");
const WORN = hex("#c7c284");
const IVY = hex("#4f9150");
const IVY_D = hex("#39733f");
const IVY_L = hex("#78b565");
const BALL = hex("#dbe94a");
const STRAW = hex("#ead9a4");
const BOARD = hex("#1c2a23");
const FABRIC = hex("#f8f5ec");
const FABRIC_D = hex("#dde2e1");
const SUMMER: RGB[] = [C.white, C.cream, hex("#f6d9e0"), hex("#cfe6f2"), hex("#f7ecc0"), hex("#dfeed6"), C.sky, C.pink, C.lilac];

// ---------------------------------------------------------------- the ground

function shoreline(): V2[] {
  const out: V2[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / 4.2));
    const nx = (by - ay) / len;
    const ny = -(bx - ax) / len;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const w = 0.14 * Math.sin(i * 2.1 + ax * 0.7 + ay * 0.3) * Math.sin(Math.PI * t);
      out.push([ax + (bx - ax) * t + nx * w, ay + (by - ay) * t + ny * w]);
    }
  };
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i < 6; i++) {
      const t = a0 + (i / 6) * (Math.PI / 2);
      out.push([cx + Math.cos(t) * LR, cy + Math.sin(t) * LR]);
    }
  };
  edge(LX0 + LR, LY0, LX1 - LR, LY0);
  corner(LX1 - LR, LY0 + LR, -Math.PI / 2);
  edge(LX1, LY0 + LR, LX1, LY1 - LR);
  corner(LX1 - LR, LY1 - LR, 0);
  edge(LX1 - LR, LY1, LX0 + LR, LY1);
  corner(LX0 + LR, LY1 - LR, Math.PI / 2);
  edge(LX0, LY1 - LR, LX0, LY0 + LR);
  corner(LX0 + LR, LY0 + LR, Math.PI);
  return out;
}

function onLand(x: number, y: number, pad = 0): boolean {
  const x0 = LX0 + pad;
  const x1 = LX1 - pad;
  const y0 = LY0 + pad;
  const y1 = LY1 - pad;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + LR ? x0 + LR : x > x1 - LR ? x1 - LR : x;
  const cy = y < y0 + LR ? y0 + LR : y > y1 - LR ? y1 - LR : y;
  return Math.hypot(x - cx, y - cy) <= LR;
}

/** The paved parts: round Centre Court, the concourse south of it, and the paths. */
const PAVED: [number, number, number, number][] = [
  [2.7, 2.7, 29.4, 24.3],
  [17.0, 24.3, 18.6, 37.6],
  [18.6, 24.3, 29.4, 28.4],
  [29.4, 19.6, 32.0, 28.4],
];
const paved = (x: number, y: number) => PAVED.some(([x0, y0, x1, y1]) => x > x0 - 0.2 && x < x1 + 0.2 && y > y0 - 0.2 && y < y1 + 0.2);

/** A lawn mown in stripes. */
function lawn(pen: Pen, x0: number, y0: number, x1: number, y1: number, bands: number): void {
  pen.floor(0, 2).rect(x0, y0, x1, y1, TURF, { outline: true, w: 0.06, grain: 0.8 });
  const g = pen.floor(0, 3);
  const h = (y1 - y0) / bands;
  for (let k = 0; k < bands; k += 2) g.rect(x0 + 0.06, y0 + k * h, x1 - 0.06, y0 + (k + 1) * h, TURF_L, { grain: 0.8 });
}

/** The white lines of a tennis court round its middle (cx, cy), long axis along x. */
function courtLines(g: Plane, cx: number, cy: number, base: number, side: number, single: number, service: number, w: number): void {
  const o = { w, color: C.white, kind: L_MARK, wobble: 0.12 };
  g.loop(
    [
      [cx - base, cy - side],
      [cx + base, cy - side],
      [cx + base, cy + side],
      [cx - base, cy + side],
    ],
    o,
  );
  for (const s of [-1, 1]) {
    g.seg(cx - base, cy + s * single, cx + base, cy + s * single, o);
    g.seg(cx + s * service, cy - single, cx + s * service, cy + single, o);
    g.seg(cx + s * base, cy, cx + s * (base - 0.32), cy, o);
  }
  g.seg(cx - service, cy, cx + service, cy, o);
}

function ground(c: LondonCtx): void {
  const { pen } = c;
  const g1 = pen.floor(0, 1);
  for (const [x0, y0, x1, y1] of PAVED) g1.rect(x0, y0, x1, y1, C.paving, { grain: 0.6 });
  const g2 = pen.floor(0, 2);
  // the edges of the paving, where it meets the grass
  const edge = { w: 0.06, color: C.flagDark, kind: L_MARK, wobble: 0.5 };
  g2.line(
    [
      [29.4, 2.7],
      [29.4, 19.6],
      [32.0, 19.6],
      [32.0, 28.4],
      [18.6, 28.4],
      [18.6, 37.6],
      [17.0, 37.6],
      [17.0, 24.3],
      [2.7, 24.3],
    ],
    edge,
  );
  speckle(g2, 9.3, 22, 31.8, 28.3, C.flagDark, 0.3, (a, b) => paved(a, b) && !(a > 19.4 && a < 25.2 && b > 24.2 && b < 27.2));
  speckle(g2, 17.1, 28.4, 18.5, 37.5, C.flagDark, 0.3);
  speckle(g2, 27.95, 5.6, 29.3, 21.8, C.flagDark, 0.3);
  // Centre Court's grass, worn at the baselines by a fortnight of tennis
  lawn(pen, AX0, AY0, AX1, AY1, 12);
  const g4 = pen.floor(0, 4);
  for (const s of [-1, 1]) g4.ellipse(NETX + s * (BASE + 0.15), MIDY, 0.55, 1.5, WORN, { seg: 10, grain: 0.9 });
  courtLines(g4, NETX, MIDY, BASE, SIDE, SINGLE, SERVICE, 0.1);
  // the outside court
  lawn(pen, OX0, OY0, OX1, OY1, 8);
  courtLines(g4, OCX, OCY, 4.5, 2.3, 1.75, 2.4, 0.085);
  // rough grass everywhere else
  const open = (a: number, b: number) => onLand(a, b, 0.6) && !paved(a, b) && !(a > OX0 - 0.6 && a < OX1 + 0.4 && b > OY0 - 0.6 && b < OY1 + 0.4) && !(a > 29.2 && b < 18.2);
  tufts(g2, 1.6, 24.4, 39.2, 39, 0.3, open);
  tufts(g2, 29.6, 18, 39.2, 24.6, 0.3, open);
}

// ---------------------------------------------------------------- small parts

/** A patch of wall the ivy is kept clipped away from: a window, a door, a sign. */
type Hole = [number, number, number, number];

/** Ivy over a stretch of wall: the walls of Wimbledon are green. Its leaves keep off the holes. */
function ivy(f: Plane, a0: number, b0: number, a1: number, b1: number, holes: Hole[] = []): void {
  f.rect(a0, b0, a1, b1, IVY, { grain: 1 });
  const area = (a1 - a0) * (b1 - b0);
  const inside = holes.length ? (a: number, b: number) => !holes.some(([p, q, r, t]) => a > p - 0.2 && a < r + 0.2 && b > q - 0.2 && b < t + 0.2) : undefined;
  f.ticks(a0 + 0.08, b0 + 0.08, a1 - 0.08, b1 - 0.08, { n: Math.round(area * 2.6), len: 0.3, ang: 0.7, jit: 1.5, color: IVY_D, w: 0.1, layer: 1, inside });
  f.ticks(a0 + 0.08, b0 + 0.08, a1 - 0.08, b1 - 0.08, { n: Math.round(area * 1.4), len: 0.26, ang: -0.6, jit: 1.5, color: IVY_L, w: 0.09, layer: 1, inside });
}

/** A round bar through several points, with an ink edge: a roof truss. */
function bar(pen: Pen, pts: V3[], w: number, rgb: RGB): void {
  pen.stroke(pts, { w: w + 0.1, kind: L_BAR, wobble: 0 });
  pen.stroke(pts, { w, color: rgb, kind: L_BAR, wobble: 0, bias: 0.012 });
}

/** A flag in the club's colours, green over purple. */
function clubFlag(pen: Pen, x: number, y: number, z: number, h: number, size = 1): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + h], 0.09, C.white);
  const k = pen.card(x, y, z + h - 1.05 * size);
  const w = 1.7 * size;
  const hh = 1.0 * size;
  k.rect(0.05, 0, 0.05 + w, hh / 2, PURPLE, { sway: 0.5, grain: 0.5, layer: 1, shade: false });
  k.rect(0.05, hh / 2, 0.05 + w, hh, hex("#2f7a52"), { sway: 0.5, grain: 0.5, layer: 1, shade: false });
  k.loop(
    [
      [0.05, 0],
      [0.05 + w, 0],
      [0.05 + w, hh],
      [0.05, hh],
    ],
    { w: W_FINE, sway: 0.5, layer: 2 },
  );
  pen.end();
}

/** A parasol in alternating panels. */
function parasol(pen: Pen, x: number, y: number, z: number, r: number, a: RGB, b: RGB): void {
  pen.pole([x, y, z - 1.7], [x, y, z + 0.35], 0.06, C.white, { ink: false });
  const n = 8;
  const verts: V3[] = [];
  for (let i = 0; i < n; i++) verts.push([x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r, z]);
  verts.push([x, y, z + 0.45]);
  const faces: number[][] = [];
  const cols: RGB[] = [];
  for (let i = 0; i < n; i++) {
    faces.push([i, (i + 1) % n, n]);
    cols.push(i % 2 === 0 ? a : b);
  }
  pen.solid(verts, faces, cols, { crease: 0.5, over: 0, w: W_FINE });
}

/** A straw boater with a purple band, for whoever stands at (x, y, z). */
function boater(pen: Pen, x: number, y: number, z: number, flip = false): void {
  const k = pen.card(x, y, z, flip);
  k.rect(-0.3, 2.04, 0.3, 2.36, STRAW, { outline: true, w: W_FINE, layer: 6, grain: 0.3 });
  k.rect(-0.52, 1.98, 0.52, 2.08, STRAW, { outline: true, w: 0.04, layer: 7, grain: 0.3 });
  k.seg(-0.3, 2.14, 0.3, 2.14, { w: 0.07, color: PURPLE, kind: L_MARK, wobble: 0, layer: 8 });
}

/** Someone dressed for a summer's day out. */
function summer(rng: Rng): Look {
  const lk = randomLook(rng);
  if (rng.chance(0.45)) lk.top = rng.pick(SUMMER);
  lk.hat = rng.chance(0.3) ? rng.pick([STRAW, STRAW, C.white, PURPLE_L, hex("#3f8f58")]) : null;
  return lk;
}

/** A spectator in a stand, drawn cheaply: shoulders, a head, hair. The far rows lose their outlines. */
function fan(k: Plane, lk: Look, far: boolean, up = false): void {
  const line = far ? {} : { outline: true, w: 0.045 };
  k.poly(
    [
      [-0.3, 0],
      [0.3, 0],
      [0.26, 0.62],
      [-0.26, 0.62],
    ],
    lk.top,
    { grain: 0.5, ...line },
  );
  if (up) {
    k.bar(-0.26, 0.5, -0.52, 1.2, 0.13, lk.top, { layer: 2 });
    k.bar(0.26, 0.5, 0.52, 1.2, 0.13, lk.top, { layer: 2 });
  }
  k.circle(0, 0.96, 0.33, lk.skin, { seg: 7, grain: 0.3, layer: 1, ...line });
  k.ellipse(0, 1.0, 0.35, 0.34, lk.hat ?? lk.hair, { a0: 0, a1: Math.PI, seg: 5, layer: 2, grain: 0.3 });
  if (!far) {
    k.seg(-0.11, 0.88, -0.11, 0.98, { w: 0.06, wobble: 0, layer: 3 });
    k.seg(0.11, 0.88, 0.11, 0.98, { w: 0.06, wobble: 0, layer: 3 });
  }
}

/** Looks for the spectators who jump up when a point is won: a few, shared round. */
const LIVELY: Look[] = (() => {
  const r = new Rng(1877);
  const out: Look[] = [];
  for (let i = 0; i < 8; i++) out.push(summer(r));
  return out;
})();

/** Where one of them sits, and which look it has. */
interface Seat {
  x: number;
  y: number;
  z: number;
  look: number;
  ph: number;
}

function scatter(rng: Rng, x0: number, y0: number, x1: number, y1: number, n: number, gap: number): V2[] {
  const out: V2[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const x = rng.range(x0, x1);
    const y = rng.range(y0, y1);
    if (out.some((p) => Math.hypot(p[0] - x, p[1] - y) < gap)) continue;
    out.push([x, y]);
  }
  return out;
}

/** A tennis net across a court: posts, the white tape, a hint of mesh. */
function net(pen: Pen, x: number, y0: number, y1: number): void {
  pen.begin();
  pen.pole([x, y0, 0], [x, y0, 0.98], 0.1, C.ironGreen);
  pen.pole([x, y1, 0], [x, y1, 0.98], 0.1, C.ironGreen);
  const p = pen.plane([x, y0, 0], [0, 1, 0], [0, 0, 1], 0, true);
  const len = y1 - y0;
  const mesh = { w: 0.03, color: C.charcoal, kind: L_MARK, wobble: 0, alpha: 0.5 };
  for (let a = 0.4; a < len; a += 0.4) p.seg(a, 0.05, a, 0.86, mesh);
  for (const b of [0.3, 0.58]) p.seg(0, b, len, b, mesh);
  p.line(
    [
      [0, 0.95],
      [len / 2, 0.86],
      [len, 0.95],
    ],
    { w: 0.1, color: C.white, kind: L_BAR, wobble: 0 },
  );
  p.seg(len / 2, 0, len / 2, 0.86, { w: 0.07, color: C.white, kind: L_BAR, wobble: 0 });
  pen.end();
}

// ---------------------------------------------------------------- Centre Court

const OFFICIAL = (rng: Rng): Look => ({ skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: C.navy, legs: C.cream, long: rng.chance(0.4), hat: C.cream });
const BALL_KID = (rng: Rng): Look => ({ skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: PURPLE, legs: C.navy, long: rng.chance(0.5), hat: null });
const CREW = (rng: Rng): Look => ({ skin: rng.pick(SKIN), hair: rng.pick(HAIR), top: GREEN_L, legs: C.navy, long: false, hat: GREEN });

/** The umpire, up a tall chair at the net under a parasol. */
function umpire(pen: Pen, x: number, y: number): void {
  pen.begin();
  for (const [dx, dy] of [
    [-0.42, -0.36],
    [0.42, -0.36],
    [0.42, 0.36],
    [-0.42, 0.36],
  ]) {
    pen.pole([x + dx, y + dy, 0], [x + dx * 0.72, y + dy * 0.72, 1.6], 0.09, GREEN);
  }
  for (const z of [0.5, 1.0]) {
    pen.stroke(
      [
        [x + 0.4, y + 0.34, z],
        [x - 0.4, y + 0.34, z],
      ],
      { w: 0.06, color: GREEN, kind: L_BAR, wobble: 0 },
    );
  }
  pen.box(x - 0.36, y - 0.32, 1.6, 0.72, 0.64, 0.1, GREEN, { w: W_FINE });
  pen.box(x - 0.36, y - 0.4, 1.7, 0.72, 0.08, 0.8, GREEN, { w: W_FINE });
  person(pen, x, y + 0.02, 1.28, { skin: SKIN[2], hair: HAIR[6], top: C.navy, legs: C.cream, long: false, hat: null }, "sit");
  parasol(pen, x - 0.5, y - 0.45, 3.35, 1.0, PURPLE, hex("#2f7a52"));
  pen.end();
}

/**
 * The two tall stands on the far sides of the court, full of people. Returns
 * the seats of the ones who jump up when a point is won.
 */
function farStands(c: LondonCtx): Seat[] {
  const { pen, rng } = c;
  const seats: Seat[] = [];
  // fill one tier with people: `at` turns a distance along the tier into a seat
  const fill = (k: number, len: number, at: (a: number) => V2, royal?: [number, number]) => {
    const z = tierTop(k);
    for (let a = 0.5; a < len - 0.3; a += 0.78) {
      // two aisles of steps
      if (Math.abs(a - len * 0.3) < 0.42 || Math.abs(a - len * 0.72) < 0.42) continue;
      if (rng.chance(0.07)) continue;
      const [x, y] = at(a + rng.range(-0.06, 0.06));
      const inBox = royal !== undefined && k < 2 && a > royal[0] && a < royal[1];
      if (!inBox && k < 3 && rng.chance(0.3)) {
        seats.push({ x, y, z, look: rng.int(0, LIVELY.length), ph: rng.range(0, 6.28) });
        continue;
      }
      const lk = summer(rng);
      // the royal box: best seats in the house, best hats
      if (inBox) lk.hat = rng.pick([C.cream, C.pink, C.lilac, C.navy]);
      fan(pen.card(x, y, z), lk, k >= 3);
    }
  };
  for (let k = 0; k < ROWS; k++) {
    // west stand: tiers climb towards -x
    const x0 = AX0 - (k + 1) * DEEP;
    pen.obj(() => {
      pen.box(x0, AY0, 0, DEEP, AY1 - AY0, tierTop(k), GREEN, { top: GREEN_L, w: 0.09 });
      fill(k, AY1 - AY0, (a) => [x0 + 0.55, AY1 - a]);
    }, 0.05 * k);
    // north stand: tiers climb towards -y
    const y0 = AY0 - (k + 1) * DEEP;
    pen.obj(() => {
      pen.box(AX0, y0, 0, AX1 - AX0, DEEP, tierTop(k), GREEN, { top: GREEN_L, w: 0.09 });
      // its east end shows from outside: ivy
      ivy(pen.wall("x+", AX0, y0, 0, AX1 - AX0, DEEP, 1), 0, 0, DEEP, tierTop(k));
      fill(k, AX1 - AX0, (a) => [AX0 + a, y0 + 0.55], [6.3, 10.7]);
    }, 0.05 * k);
  }
  // the front walls, in the club's purple, with the court's name on the north one
  pen.obj(() => {
    const fw = pen.wall("x+", AX0 - DEEP, AY0, 0, DEEP, AY1 - AY0);
    fw.rect(0, 0.42, AY1 - AY0, FIRST, PURPLE, { grain: 0.5 });
    fw.seg(0, 0.42, AY1 - AY0, 0.42, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0.1 });
    const fn = pen.wall("y+", AX0, AY0 - DEEP, 0, AX1 - AX0, DEEP);
    fn.rect(0, 0.1, AX1 - AX0, FIRST, PURPLE, { grain: 0.5 });
    fn.seg(0, 0.1, AX1 - AX0, 0.1, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0.1 });
    fn.text("CENTRE COURT", 3.6, 0.26, 0.34, { align: "c", color: C.white, kind: L_MARK, w: 0.065, wobble: 0.2, layer: 1 });
    // the royal box: a drape over the front, gold along its edge
    fn.rect(6.3, 0.1, 10.7, FIRST, hex("#3f2a66"), { grain: 0.4, layer: 1 });
    fn.line(
      [
        [6.3, 0.2],
        [7.4, 0.36],
        [8.5, 0.2],
        [9.6, 0.36],
        [10.7, 0.2],
      ],
      { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0.2, layer: 2 },
    );
  }, 0.1);
  // back walls, and the corner between the two stands with the commentary boxes in it
  pen.obj(() => {
    pen.box(BACK, AY0, 0, 0.35, AY1 - AY0, WALL_H, GREEN_D, { w: 0.09 });
    pen.box(AX0, BACK, 0, AX1 - AX0, 0.35, WALL_H, GREEN_D, { w: 0.09 });
    ivy(pen.wall("x+", AX0, BACK, 0, AX1 - AX0, 0.35, 1), 0, 0, 0.35, WALL_H);
  }, 0.2);
  pen.obj(() => {
    const h = 7.5;
    pen.box(BACK, BACK, 0, AX0 - BACK, AY0 - BACK, h, GREEN, { top: GREEN_D });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, BACK, BACK, 0, AX0 - BACK, AY0 - BACK);
      const w = AX0 - BACK;
      f.rect(0.3, 6.05, w - 0.3, 7.0, C.glass, { outline: true, w: W_FINE, glow: 0.9, grain: 0.4 });
      for (let a = 1.6; a < w - 0.4; a += 1.3) f.seg(a, 6.05, a, 7.0, { w: 0.05, color: GREEN_D, kind: L_MARK, wobble: 0, layer: 1 });
      f.rect(0, 7.15, w, 7.5, PURPLE, { grain: 0.5 });
    }
  }, 0.25);
  clubFlag(pen, BACK + 1.0, BACK + 1.0, 7.5, 4.6, 1.0);
  // up on its roof: a television camera, and two people with the best view of all
  pen.obj(() => {
    railing(
      pen,
      [
        [BACK + 0.1, AY0 - 0.1, 7.5],
        [AX0 - 0.1, AY0 - 0.1, 7.5],
        [AX0 - 0.1, BACK + 0.1, 7.5],
      ],
      0.7,
      C.white,
      0.8,
    );
    const cx = AX0 - 0.9;
    const cy = AY0 - 0.9;
    for (const [dx, dy] of [
      [-0.3, -0.25],
      [0.3, -0.25],
      [0, 0.35],
    ]) {
      pen.stroke(
        [
          [cx + dx, cy + dy, 7.5],
          [cx, cy, 8.8],
        ],
        { w: 0.07, kind: L_BAR, wobble: 0 },
      );
    }
    pen.box(cx - 0.2, cy - 0.5, 8.8, 0.45, 0.95, 0.45, C.charcoal, { w: W_THIN });
    pen.box(cx - 0.1, cy + 0.45, 8.9, 0.26, 0.4, 0.26, C.black, { w: W_FINE });
    person(pen, cx - 0.75, cy + 0.15, 7.5, { skin: SKIN[2], hair: HAIR[1], top: C.charcoal, legs: C.navy, long: false, hat: C.black }, "stand", true);
    person(pen, AX0 - 0.7, AY0 - 3.6, 7.5, summer(rng), "wave");
    person(pen, AX0 - 0.75, AY0 - 4.7, 7.5, summer(rng), "stand", true);
  }, 0.5);
  return seats;
}

/** The low stands on the two sides nearest the camera, one row deep so the court can be seen over them. */
function nearStands(c: LondonCtx, seats: Seat[]): void {
  const { pen, rng } = c;
  const row = (n: number, at: (i: number) => V2) => {
    for (let i = 0; i < n; i++) {
      if (rng.chance(0.08)) continue;
      const [x, y] = at(i);
      if (rng.chance(0.3)) seats.push({ x, y, z: 0.4, look: rng.int(0, LIVELY.length), ph: rng.range(0, 6.28) });
      else fan(pen.card(x, y, 0.4), summer(rng), false);
    }
  };
  pen.obj(() => {
    pen.box(AX1, AY0, 0, 1.5, AY1 - AY0, 0.4, GREEN, { top: GREEN_L, w: 0.09 });
    pen.box(AX1 + 1.5, AY0, 0, 0.35, AY1 - AY0 + 1.85, 1.25, GREEN_D, { w: 0.09 });
    ivy(pen.wall("x+", AX1 + 1.5, AY0, 0, 0.35, AY1 - AY0 + 1.85, 1), 0, 0, AY1 - AY0 + 1.85, 1.05);
    row(13, (i) => [AX1 + 0.75, AY0 + 0.6 + i * 0.82]);
  });
  pen.obj(() => {
    pen.box(AX0, AY1, 0, AX1 - AX0 + 1.5, 1.5, 0.4, GREEN, { top: GREEN_L, w: 0.09 });
    pen.box(AX0, AY1 + 1.5, 0, AX1 - AX0 + 1.5, 0.35, 1.25, GREEN_D, { w: 0.09 });
    ivy(pen.wall("y+", AX0, AY1 + 1.5, 0, AX1 - AX0 + 1.5, 0.35, 1), 0, 0, AX1 - AX0 + 1.5, 1.05);
    row(21, (i) => [AX0 + 0.6 + i * 0.82, AY1 + 0.75]);
  });
}

/** The roof: a white ring beam on masts behind the far stands, and the folding roof drawn back to the west end. */
function roof(c: LondonCtx): void {
  const { pen } = c;
  const bx = BACK + 0.18;
  pen.obj(() => {
    for (const y of [9.4, 12.1, 14.8, 17.5, 19.8]) pen.pole([bx, y, WALL_H], [bx, y, BEAM], 0.16, C.white);
    for (const x of [9.5, 12.6, 15.7, 18.8, 21.9, 25.6]) pen.pole([x, bx, WALL_H], [x, bx, BEAM], 0.16, C.white);
    pen.pole([bx, bx, 7.5], [bx, bx, BEAM], 0.2, C.white);
    for (const x of [4.0, 7.4]) pen.pole([x, AY1 + 0.3, 7.3], [x, AY1 + 0.3, BEAM + 0.2], 0.16, C.white);
  }, 0.3);
  pen.obj(() => {
    pen.box(BACK - 0.15, BACK - 0.15, BEAM, 0.9, AY1 + 0.6 - BACK, 0.5, C.white, { w: 0.09 });
    pen.box(BACK + 0.75, BACK - 0.15, BEAM, AX1 + 0.2 - BACK - 0.75, 0.9, 0.5, C.white, { w: 0.09 });
    // the lattice of the beam, and a row of lamps under it for the evening sessions
    const fx = pen.wall("x+", BACK - 0.15, BACK + 0.75, BEAM, 0.9, AY1 - 0.3 - BACK);
    const fy = pen.wall("y+", BACK + 0.75, BACK - 0.15, BEAM, AX1 + 0.2 - BACK - 0.75, 0.9);
    for (const [f, len] of [
      [fx, AY1 - 0.3 - BACK],
      [fy, AX1 + 0.2 - BACK - 0.75],
    ] as const) {
      for (let a = 0; a < len - 0.5; a += 1.0) f.seg(a, 0.06, a + 1.0, 0.44, { w: 0.045, color: C.grey, kind: L_MARK, wobble: 0, layer: 1 });
    }
    for (let y = 9.6; y < AY1; y += 1.3) bulb(pen, BACK + 0.8, y, BEAM - 0.05, 0.22);
    for (let x = 9.6; x < AX1; x += 1.3) bulb(pen, x, BACK + 0.8, BEAM - 0.05, 0.22);
    pen.pole([3.8, AY1 + 0.3, BEAM + 0.35], [7.6, AY1 + 0.3, BEAM + 0.35], 0.3, C.white);
  }, 0.4);
  // five trusses bunched together, the fabric folded between them like a concertina
  pen.obj(() => {
    const ya = BACK + 0.75;
    const yb = AY1 + 0.3;
    const xs = [4.2, 4.92, 5.64, 6.36, 7.08];
    const arch = (x: number, drop: number): V3[] => {
      const pts: V3[] = [];
      for (let j = 0; j <= 10; j++) pts.push([x, lerp(ya, yb, j / 10), BEAM + 0.5 + 1.5 * Math.sin((Math.PI * j) / 10) - drop]);
      return pts;
    };
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = arch(xs[i], 0);
      const b = arch(xs[i + 1], 0);
      const v = arch((xs[i] + xs[i + 1]) / 2, 0.42);
      for (let j = 0; j < 10; j++) {
        pen.fill([a[j], a[j + 1], v[j + 1], v[j]], FABRIC_D, { grain: 0.4 });
        pen.fill([v[j], v[j + 1], b[j + 1], b[j]], FABRIC, { grain: 0.4 });
      }
    }
    for (const x of xs) bar(pen, arch(x, 0), 0.2, C.white);
  }, 0.55);
}

/** The scoreboard: names and sets painted on, games and points changed by hand as the match goes on. */
function scoreboard(c: LondonCtx): void {
  const { pen } = c;
  pen.obj(() => {
    for (const x of [SB.x + 0.5, SB.x + SB.w - 0.5]) pen.pole([x, SB.y + 0.18, WALL_H], [x, SB.y + 0.18, SB.z], 0.14, GREEN_D);
    pen.box(SB.x, SB.y, SB.z, SB.w, SB.d, SB.h, BOARD, { w: 0.09 });
    const f = pen.wall("y+", SB.x, SB.y, SB.z, SB.w, SB.d);
    f.rect(0.12, 0.12, SB.w - 0.12, SB.h - 0.12, BOARD, { outline: true, w: 0.05, ink: C.gold, grain: 0.3 });
    f.seg(0.2, SB.h / 2, SB.w - 0.2, SB.h / 2, { w: 0.04, color: C.gold, kind: L_MARK, wobble: 0, layer: 1 });
    for (const kind of [L_MARK, L_SPARK]) {
      const o = { color: C.yellow, kind, w: 0.08, wobble: 0.2, layer: 1 };
      f.text("REED", 0.3, 1.44, 0.44, o);
      f.text("MOSS", 0.3, 0.42, 0.44, o);
      f.text("6", 2.62, 1.44, 0.44, o);
      f.text("4", 2.62, 0.42, 0.44, o);
      f.text("2", 3.38, 0.42, 0.44, o);
    }
  }, 0.45);
}

/** The officials, the chairs and the kit round the court. */
function courtside(c: LondonCtx): void {
  const { pen, rng } = c;
  net(pen, NETX, MIDY - SIDE - 0.3, MIDY + SIDE + 0.3);
  umpire(pen, NETX, AY0 + 1.45);
  // line judges in blazers, one at the end of every line
  for (const [x, y, flip] of [
    [AX0 + 0.95, 12.1, false],
    [AX0 + 0.95, 17.0, false],
    [AX1 - 1.0, 12.0, true],
    [AX1 - 1.0, 16.9, true],
    [14.25, AY0 + 1.1, false],
    [20.75, AY0 + 1.1, true],
    [14.25, AY1 - 1.15, false],
    [20.75, AY1 - 1.15, true],
  ] as const) {
    person(pen, x, y, 0, OFFICIAL(rng), "stand", flip, 0.92);
  }
  // ball kids standing at the back corners, hands behind them
  for (const [x, y] of [
    [AX0 + 0.6, AY0 + 0.9],
    [AX0 + 0.6, AY1 - 0.9],
    [AX1 - 1.1, AY0 + 0.9],
    [AX1 - 1.1, AY1 - 0.9],
  ]) {
    person(pen, x, y, 0, BALL_KID(rng), "stand", x > NETX, 0.74);
  }
  // the players' chairs either side of the umpire, towels over them
  for (const x of [NETX - 2.3, NETX + 1.6]) {
    pen.obj(() => {
      pen.box(x, AY0 + 0.75, 0, 0.7, 0.55, 0.45, GREEN, { w: W_FINE, top: GREEN_L });
      pen.box(x, AY0 + 0.7, 0.45, 0.7, 0.1, 0.5, GREEN, { w: W_FINE });
      pen.card(x + 0.35, AY0 + 1.32, 0).rect(-0.25, 0.3, 0.2, 0.55, C.white, { outline: true, w: 0.04, grain: 0.2 });
      pen.box(x + 0.85, AY0 + 0.85, 0, 0.75, 0.4, 0.34, x < NETX ? C.red : C.navy, { w: W_FINE });
    });
  }
  // Centre Court's own cover, rolled up along the west end
  pen.obj(() => pen.pole([AX0 + 0.3, 11.2, 0.3], [AX0 + 0.3, 17.8, 0.3], 0.52, GREEN_D));
}

/** The clubhouse at the south-west corner: ivy to the roof, the players' balcony, the club's badge. */
function clubhouse(c: LondonCtx): void {
  const { pen, rng } = c;
  const x0 = BACK;
  const y0 = AY1;
  const w = AX0 - BACK;
  const d = 4.6;
  const h = 7.3;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, hex("#c8b48e"), { top: GREEN_D });
    ivy(pen.wall("y+", x0, y0, 0, w, d, 1), 0, 0, w, h - 0.4, [
      [2.35, 0, 3.55, 2.25],
      [0.55, 0.8, 1.65, 2.2],
      [4.25, 0.8, 5.35, 2.2],
      [0.55, 3.75, 1.65, 5.2],
      [4.25, 3.75, 5.35, 5.2],
      [2.25, 3.45, 3.65, 5.3],
      [2.4, 5.65, 3.5, 6.75],
    ]);
    const east = pen.wall("x+", x0, y0, 0, w, d, 1);
    const eastHoles: Hole[] = [
      [0.5, 3.75, 1.5, 5.15],
      [2.0, 3.75, 3.0, 5.15],
      [0.9, 5.4, 2.1, 6.6],
    ];
    ivy(east, 0, 0, d - 1.85, h - 0.4, eastHoles);
    ivy(east, d - 1.85, 1.25, d, h - 0.4, eastHoles);
    const f = pen.wall("y+", x0, y0, 0, w, d, 3);
    f.rect(0, h - 0.4, w, h, C.cream, { grain: 0.4 });
    // the door under a striped canopy, and windows either side
    f.rect(2.35, 0, 3.55, 2.25, GREEN_D, { outline: true, w: W_THIN });
    f.circle(3.3, 1.1, 0.07, C.gold, { layer: 1, seg: 6, grain: 0 });
    for (const a of [0.55, 4.25]) windowAt(f, a, 0.8, a + 1.1, 2.2, true, C.cream);
    for (const a of [0.55, 4.25]) windowAt(f, a, 3.75, a + 1.1, 5.2, rng.chance(0.7), C.cream);
    f.rect(2.25, 3.45, 3.65, 5.3, C.glass, { outline: true, w: W_FINE, glow: 1, ink: C.cream });
    // the badge: crossed rackets on purple
    f.circle(2.95, 6.2, 0.56, hex("#2f7a52"), { outline: true, w: W_FINE, seg: 14, grain: 0.3 });
    f.circle(2.95, 6.2, 0.42, PURPLE, { layer: 1, seg: 12, grain: 0.3 });
    f.seg(2.72, 5.95, 3.18, 6.45, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    f.seg(3.18, 5.95, 2.72, 6.45, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    const g = pen.wall("x+", x0, y0, 0, w, d, 3);
    g.rect(0, h - 0.4, d, h, C.cream, { grain: 0.4 });
    for (const b of [3.75]) for (const a of [0.5, 2.0]) windowAt(g, a, b, a + 1.0, b + 1.4, rng.chance(0.7), C.cream);
    clock(g, 1.5, 6.0, 0.6, 2, 20, { rim: PURPLE_L });
  });
  // the canopy over the door, and the balcony the players wave from
  pen.obj(() => {
    const aw = pen.plane([x0 + 2.05, y0 + d, 2.9], [1, 0, 0], [0, 1.0, -0.45], 0, true);
    for (let i = 0; i < 6; i++) aw.rect((i * 1.8) / 6, 0, ((i + 1) * 1.8) / 6, 1, i % 2 === 0 ? PURPLE : hex("#2f7a52"), { grain: 0.6 });
    aw.loop(
      [
        [0, 0],
        [1.8, 0],
        [1.8, 1],
        [0, 1],
      ],
      { w: W_THIN },
    );
    pen.box(x0 + 1.3, y0 + d, 3.2, 3.3, 0.8, 0.16, C.cream, { w: W_FINE });
    railing(
      pen,
      [
        [x0 + 1.35, y0 + d + 0.05, 3.36],
        [x0 + 1.35, y0 + d + 0.75, 3.36],
        [x0 + 4.55, y0 + d + 0.75, 3.36],
        [x0 + 4.55, y0 + d + 0.05, 3.36],
      ],
      0.7,
      C.white,
      0.6,
    );
    const whites = (i: number): Look => ({ skin: SKIN[i], hair: HAIR[i + 2], top: C.white, legs: C.white, long: i === 0, hat: null });
    person(pen, x0 + 2.4, y0 + d + 0.4, 3.36, whites(0), "wave");
    person(pen, x0 + 3.5, y0 + d + 0.4, 3.36, whites(2), "wave", true);
  }, 0.15);
  flag(pen, x0 + 1.0, y0 + d - 0.6, h, 3.4, "uk", 0.9);
  clubFlag(pen, x0 + w - 0.9, y0 + d - 0.6, h, 3.4, 0.9);
  // purple and white flowers along the south wall, the way the club likes them
  flowerBed(pen, rng, AX0 + 0.5, AY1 + 1.95, 12, 0.55, [PURPLE_L, C.white, PURPLE, C.lilac], 3);
  flowerBed(pen, rng, x0 + 0.2, y0 + d + 0.1, 1.7, 0.5, [PURPLE_L, C.white, C.pink], 3);
}

// ---------------------------------------------------------------- the hill and the big screen

/** The building with the big screen on it, showing Centre Court from above. (The ball and the players are put on the picture every frame.) */
function bigScreen(c: LondonCtx): void {
  const { pen } = c;
  pen.obj(() => {
    pen.box(SCR.x, SCR.y, 0, SCR.w, SCR.d, SCR.h, GREEN, { top: GREEN_D });
    ivy(pen.wall("y+", SCR.x, SCR.y, 0, SCR.w, SCR.d, 1), 0, 0, SCR.w, SCR.h - 0.45, [[SCR.a0 - 0.22, SCR.b0 - 0.75, SCR.a0 + SCR.pw + 0.22, SCR.b0 + SCR.ph + 0.22]]);
    ivy(pen.wall("x+", SCR.x, SCR.y, 0, SCR.w, SCR.d, 1), 0, 0, SCR.d, SCR.h - 0.45, [[0.7, 0, 1.7, 2.2]]);
    const f = pen.wall("y+", SCR.x, SCR.y, 0, SCR.w, SCR.d, 3);
    f.rect(0, SCR.h - 0.45, SCR.w, SCR.h, PURPLE, { grain: 0.5 });
    f.rect(SCR.a0 - 0.22, SCR.b0 - 0.75, SCR.a0 + SCR.pw + 0.22, SCR.b0 + SCR.ph + 0.22, C.black, { outline: true, w: W_THIN, grain: 0.3 });
    f.rect(SCR.a0, SCR.b0, SCR.a0 + SCR.pw, SCR.b0 + SCR.ph, hex("#7cc260"), { layer: 1, glow: 1, kind: F_NEON, grain: 0.3 });
    // the court on the screen
    const sx = SCR.pw / (AX1 - AX0);
    const sy = SCR.ph / (AY1 - AY0);
    const A = (x: number) => SCR.a0 + (x - AX0) * sx;
    const B = (y: number) => SCR.b0 + SCR.ph - (y - AY0) * sy;
    for (const kind of [L_MARK, L_SPARK]) {
      const o = { w: 0.05, color: C.white, kind, wobble: 0.1, layer: 2 };
      f.loop(
        [
          [A(NETX - BASE), B(MIDY - SIDE)],
          [A(NETX + BASE), B(MIDY - SIDE)],
          [A(NETX + BASE), B(MIDY + SIDE)],
          [A(NETX - BASE), B(MIDY + SIDE)],
        ],
        o,
      );
      f.seg(A(NETX), B(MIDY - SIDE - 0.3), A(NETX), B(MIDY + SIDE + 0.3), { ...o, w: 0.07 });
      for (const s of [-1, 1]) {
        f.seg(A(NETX - BASE), B(MIDY + s * SINGLE), A(NETX + BASE), B(MIDY + s * SINGLE), o);
        f.seg(A(NETX + s * SERVICE), B(MIDY - SINGLE), A(NETX + s * SERVICE), B(MIDY + SINGLE), o);
      }
      f.seg(A(NETX - SERVICE), B(MIDY), A(NETX + SERVICE), B(MIDY), o);
      f.text("LIVE", SCR.a0 + 0.1, SCR.b0 - 0.58, 0.3, { color: C.red, kind, w: 0.07, wobble: 0.2, layer: 2 });
      f.text("CENTRE COURT", SCR.a0 + SCR.pw - 0.1, SCR.b0 - 0.58, 0.3, { align: "r", color: C.white, kind, w: 0.06, wobble: 0.2, layer: 2 });
    }
    const g = pen.wall("x+", SCR.x, SCR.y, 0, SCR.w, SCR.d, 3);
    g.rect(0, SCR.h - 0.45, SCR.d, SCR.h, PURPLE, { grain: 0.5 });
    g.rect(0.7, 0, 1.7, 2.2, GREEN_D, { outline: true, w: W_THIN });
  });
  clubFlag(pen, SCR.x + 0.9, SCR.y + 1.2, SCR.h, 3.2, 0.9);
  clubFlag(pen, SCR.x + SCR.w - 0.9, SCR.y + 1.2, SCR.h, 3.2, 0.9);
}

/** Someone who has been watching from the hill all afternoon. */
interface Picnicker {
  x: number;
  y: number;
  z: number;
  lk: Look;
  ph: number;
}

/**
 * The hill: lawn in terraces rising away from the screen, covered in rugs,
 * hampers and people. Returns the ones who leap up when a point is won.
 */
function hill(c: LondonCtx): Picnicker[] {
  const { pen, rng } = c;
  const leapers: Picnicker[] = [];
  const x0 = 29.5;
  const x1 = 38.7;
  const rugs: RGB[] = [hex("#e0655a"), hex("#6f9fd0"), hex("#e6c25a"), hex("#7fb87a"), hex("#b98fd0")];
  for (let k = 0; k < 5; k++) {
    const y0 = 6.3 + k * 2.3;
    const top = 0.45 * (k + 1);
    pen.obj(() => {
      pen.box(x0, y0, 0, x1 - x0, 2.3, top, C.grassDark, { top: k % 2 === 0 ? C.grass : C.grassLight, w: 0.09 });
      tufts(pen.floor(top, 1), x0 + 0.3, y0 + 0.2, x1 - 0.3, y0 + 2.1, 0.35);
    }, 0.04 * k);
    const spots = scatter(rng, x0 + 0.8, y0 + 0.55, x1 - 0.8, y0 + 1.75, 5, 1.45);
    spots.forEach(([x, y], i) => {
      const lk = summer(rng);
      // a rug under about half of them, and something to eat
      if (i % 2 === 0) {
        pen.obj(() => {
          const g = pen.floor(top, 1);
          const col = rng.pick(rugs);
          g.rect(x - 0.95, y - 0.6, x + 0.95, y + 0.6, col, { outline: true, w: 0.045, grain: 0.6 });
          const gg = pen.floor(top, 2);
          for (const a of [-0.32, 0.32]) gg.seg(x + a, y - 0.58, x + a, y + 0.58, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.2, alpha: 0.9 });
          gg.seg(x - 0.93, y, x + 0.93, y, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0.2, alpha: 0.9 });
          pen.box(x + 0.45, y + 0.12, top, 0.42, 0.32, 0.26, C.wood, { w: W_FINE, top: C.woodDark });
          if (rng.chance(0.6)) person(pen, x - 0.55, y + 0.25, top, summer(rng), "bust", rng.chance(0.5), rng.chance(0.3) ? 0.72 : 1);
        });
      }
      if (i === 1 || (k % 2 === 0 && i === 3)) {
        leapers.push({ x, y, z: top, lk, ph: rng.range(0, 6.28) });
        return;
      }
      const pose: Pose = rng.pick(["bust", "bust", "bust", "stand", "wave"]);
      person(pen, x, y, top, lk, pose, rng.chance(0.5));
      if (pose === "wave" && rng.chance(0.6)) handFlag(pen, x, y, top, false);
    });
  }
  // two parasols, a dog asleep, and champagne on ice
  pen.obj(() => parasol(pen, 32.4, 9.4, 0.9 + 2.3, 1.2, C.white, hex("#e0655a")));
  pen.obj(() => parasol(pen, 36.6, 14.2, 1.8 + 2.3, 1.2, C.white, hex("#6f9fd0")));
  pen.obj(() => dogOn(pen.card(34.9, 11.9, 1.35), hex("#b98352"), { s: 0.9, tail: 0.1 }));
  pen.obj(() => {
    pen.cyl(31.1, 16.4, 2.25, 0.22, 0.34, C.metal, { seg: 7, w: 0.04 });
    pen.pole([31.1, 16.4, 2.5], [31.2, 16.4, 2.95], 0.1, hex("#2f5d50"), { ink: false });
  });
  return leapers;
}

// ---------------------------------------------------------------- outside: strawberries, the gate, the Queue, the outside court

function strawberries(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.push(19.6, 24.4, 0);
  stall(pen, rng, { w: 5.4, d: 2.2, a: C.red, b: C.white, goods: [C.red, C.red, C.white, C.pink, C.red], sign: "STRAWBERRIES" });
  pen.pop();
  lightString(pen, [19.7, 26.85, 2.2], [24.9, 26.85, 2.2], 8, 0.25);
  // people who have just been served, a punnet each
  for (const [x, y, flip] of [
    [20.6, 27.5, false],
    [21.7, 27.75, true],
    [23.0, 27.45, false],
    [24.1, 27.8, true],
  ] as const) {
    pen.obj(() => {
      const lk = summer(rng);
      person(pen, x, y, 0, lk, "stand", flip);
      const k = pen.card(x, y, 0, flip);
      k.rect(0.3, 0.86, 0.62, 1.06, C.white, { outline: true, w: 0.04, layer: 5, grain: 0.2 });
      k.circle(0.4, 1.1, 0.07, C.red, { layer: 6, seg: 5, grain: 0 });
      k.circle(0.52, 1.1, 0.07, C.red, { layer: 6, seg: 5, grain: 0 });
    });
  }
  person(pen, 25.6, 27.2, 0, summer(rng), "wave", false, 0.72);
}

/** The gate: a little green lodge with a striped canopy, a steward in a boater taking tickets. */
function gate(c: LondonCtx): void {
  const { pen } = c;
  const x0 = 29.7;
  const y0 = 20.4;
  pen.obj(() => {
    pen.box(x0, y0, 0, 2.0, 1.6, 2.7, GREEN, { top: GREEN_D });
    const f = pen.wall("y+", x0, y0, 0, 2.0, 1.6);
    f.rect(0.5, 0, 1.5, 1.95, BOARD, { outline: true, w: W_THIN });
    for (const b of [0.6, 1.0]) f.seg(0.5, b, 1.5, b, { w: 0.06, color: C.metal, kind: L_MARK, wobble: 0, layer: 1 });
    f.rect(0.2, 2.05, 1.8, 2.55, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    f.text("GATE 3", 1.0, 2.17, 0.24, { align: "c", color: PURPLE, kind: L_MARK, w: 0.055, wobble: 0.2, layer: 1 });
    ivy(pen.wall("x+", x0, y0, 0, 2.0, 1.6, 1), 0, 0, 1.6, 2.7);
    const aw = pen.plane([x0 - 0.1, y0 + 1.6, 2.72], [1, 0, 0], [0, 0.9, -0.42], 0, true);
    for (let i = 0; i < 6; i++) aw.rect((i * 2.2) / 6, 0, ((i + 1) * 2.2) / 6, 1, i % 2 === 0 ? PURPLE : hex("#2f7a52"), { grain: 0.6 });
    aw.loop(
      [
        [0, 0],
        [2.2, 0],
        [2.2, 1],
        [0, 1],
      ],
      { w: W_THIN },
    );
  });
  clubFlag(pen, x0 + 1.0, y0 + 0.5, 2.7, 3.0, 0.8);
  pen.obj(() => {
    person(pen, x0 + 2.45, y0 + 2.0, 0, { skin: SKIN[0], hair: HAIR[7], top: C.navy, legs: C.cream, long: false, hat: null }, "wave", true);
    boater(pen, x0 + 2.45, y0 + 2.0, 0, true);
  });
}

/** The tea lawn: tables under the club's parasols, a waiter, and a champion of long ago in bronze. */
function teaLawn(c: LondonCtx): void {
  const { pen, rng } = c;
  const leaf = hex("#2f7a52");
  for (const [x, y, col] of [
    [36.3, 20.4, PURPLE],
    [34.4, 22.9, leaf],
    [37.5, 23.7, PURPLE],
    [35.6, 26.2, leaf],
  ] as const) {
    pen.obj(() => {
      // (the kit's table, under a parasol in two colours)
      pen.cyl(x, y, 0.62, 0.5, 0.08, C.white, { seg: 9 });
      pen.pole([x, y, 0], [x, y, 0.62], 0.09, C.greyDark, { ink: false });
      const spots: V2[] = [
        [0.85, 0],
        [-0.85, 0],
        [0, 0.85],
        [0, -0.85],
      ];
      const n = rng.int(2, 5);
      spots.forEach(([dx, dy], i) => {
        pen.box(x + dx - 0.2, y + dy - 0.2, 0, 0.4, 0.4, 0.42, C.wood);
        if (i < n) person(pen, x + dx, y + dy, 0.3, summer(rng), "bust", rng.chance(0.5));
      });
      parasol(pen, x, y, 2.3, 1.5, col, C.white);
    });
  }
  // a waiter with a tray of something cold
  pen.obj(() => {
    person(pen, 36.0, 24.5, 0, { skin: SKIN[2], hair: HAIR[0], top: C.white, legs: C.black, long: false, hat: null }, "stand");
    const k = pen.card(36.0, 24.5, 0);
    k.rect(0.3, 1.2, 0.95, 1.27, C.metal, { outline: true, w: 0.035, layer: 5, grain: 0.2 });
    for (const a of [0.45, 0.62, 0.8]) k.rect(a - 0.05, 1.27, a + 0.05, 1.5, C.orange, { layer: 6, grain: 0.2 });
  });
  // the statue: a champion of the 1930s, mid-swing, on a stone plinth
  pen.obj(() => {
    const bronze: Look = { skin: C.bronze, hair: C.bronze, top: C.bronze, legs: C.bronze, long: false, hat: null };
    pen.box(32.9, 18.85, 0, 1.0, 1.0, 0.9, C.stone, { w: W_THIN, top: C.stoneDark });
    person(pen, 33.4, 19.35, 0.9, bronze, "wave", false, 0.95);
    const k = pen.card(33.4, 19.35, 0.9);
    k.seg(0.6, 1.78, 0.84, 2.2, { w: 0.06, color: C.bronze, kind: L_BAR, wobble: 0, layer: 5 });
    k.ellipse(0.97, 2.44, 0.22, 0.28, null, { ink: C.bronze, w: 0.06, layer: 5, seg: 9 });
  });
  person(pen, 34.6, 19.7, 0, summer(rng), "stand", true);
}

/** The order of play, on a board outside the clubhouse, and people working out where to be. */
function orderOfPlay(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    for (const x of [12.7, 15.7]) pen.pole([x, 25.3, 0], [x, 25.3, 0.95], 0.1, GREEN_D);
    pen.box(12.4, 25.22, 0.9, 3.6, 0.16, 2.0, C.white, { w: W_FINE });
    const f = pen.wall("y+", 12.4, 25.22, 0.9, 3.6, 0.16);
    f.rect(0, 1.55, 3.6, 2.0, PURPLE, { grain: 0.4 });
    f.text("ORDER OF PLAY", 1.8, 1.67, 0.2, { align: "c", color: C.white, kind: L_MARK, w: 0.05, wobble: 0.2, layer: 1 });
    for (let r = 0; r < 5; r++) {
      const b = 1.3 - r * 0.26;
      f.seg(0.2, b, 1.5, b, { w: 0.05, color: C.inkSoft, kind: L_MARK, wobble: 0.3 });
      f.seg(2.1, b, 3.4, b, { w: 0.05, color: C.inkSoft, kind: L_MARK, wobble: 0.3 });
      f.seg(1.72, b, 1.9, b, { w: 0.05, color: PURPLE, kind: L_MARK, wobble: 0 });
    }
  });
  person(pen, 13.2, 26.2, 0, summer(rng), "stand", false);
  person(pen, 14.3, 26.4, 0, summer(rng), "wave", true);
  person(pen, 15.3, 26.15, 0, summer(rng), "stand", true, 0.72);
}

/** A small tent, for people who slept in the Queue. It glows like a lantern after dark. */
function tent(pen: Pen, x: number, y: number, rgb: RGB): void {
  pen.begin();
  pen.gable(x, y, 0, 1.7, 2.1, 1.25, "y", rgb, { gable: scaleRGB(rgb, 0.86), glow: 0.45, w: 0.09 });
  pen.wall("y+", x, y, 0, 1.7, 2.1).poly(
    [
      [0.55, 0],
      [1.15, 0],
      [0.85, 0.85],
    ],
    C.charcoal,
    { outline: true, w: 0.04, grain: 0.4 },
  );
  for (const s of [-0.4, 2.1]) {
    pen.stroke(
      [
        [x + 0.85, y + 2.1, 1.22],
        [x + s, y + 2.75, 0],
      ],
      { w: 0.03, color: C.inkSoft, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
}

/** The Queue: a long patient line doubling back between rope barriers, a steward at its end, tents beside it. */
function theQueue(c: LondonCtx): void {
  const { pen, rng } = c;
  const lanes: [V2, V2][] = [
    [
      [30.7, 23.0],
      [30.7, 28.5],
    ],
    [
      [31.6, 29.3],
      [37.2, 29.3],
    ],
    [
      [37.4, 30.3],
      [37.4, 31.3],
    ],
    [
      [36.5, 32.2],
      [20.6, 32.2],
    ],
    [
      [19.8, 33.1],
      [19.8, 34.2],
    ],
    [
      [20.6, 35.1],
      [30.4, 35.1],
    ],
  ];
  for (const [a, b] of lanes) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 1.04));
    for (let i = 0; i <= n; i++) {
      if (rng.chance(0.1)) continue;
      const x = lerp(a[0], b[0], i / n) + rng.range(-0.08, 0.08);
      const y = lerp(a[1], b[1], i / n) + rng.range(-0.08, 0.08);
      const lk = summer(rng);
      const kind = rng.next();
      const flip = rng.chance(0.5);
      if (kind < 0.09) {
        // someone who brought a stool, and something to read
        pen.obj(() => {
          pen.box(x - 0.22, y - 0.22, 0, 0.44, 0.44, 0.4, C.woodDark, { w: 0.04 });
          person(pen, x, y, 0, lk, "sit", flip);
          pen.card(x, y, 0, flip).rect(0.24, 0.72, 0.72, 1.08, C.white, { outline: true, w: 0.04, layer: 5, grain: 0.2 });
        });
      } else if (kind < 0.17) person(pen, x, y, 0, lk, "stand", flip, 0.72);
      else if (kind < 0.25) {
        pen.obj(() => {
          person(pen, x, y, 0, lk, "stand", flip);
          umbrella(pen, x, y, 0, rng.pick([PURPLE_L, C.white, hex("#3f8f58"), C.yellow]), flip);
        });
      } else person(pen, x, y, 0, lk, kind > 0.92 ? "wave" : "stand", flip);
    }
  }
  // rope barriers between the lanes
  pen.obj(() => {
    for (const [xa, xb, y] of [
      [30.6, 36.4, 30.75],
      [20.8, 36.4, 33.65],
      [20.8, 30.4, 36.3],
    ]) {
      const pts: V3[] = [];
      for (let x = xa; x <= xb + 0.01; x += (xb - xa) / Math.round((xb - xa) / 2.4)) {
        pen.pole([x, y, 0], [x, y, 0.8], 0.09, C.iron);
        pts.push([x, y, 0.74]);
      }
      pen.stroke(pts, { w: 0.05, color: PURPLE, kind: L_BAR, wobble: 0 });
    }
  }, 0.1);
  // the end of the Queue, clearly marked
  pen.obj(() => {
    const x = 31.9;
    const y = 35.1;
    person(pen, x, y, 0, { skin: SKIN[3], hair: HAIR[0], top: C.navy, legs: C.cream, long: false, hat: null }, "stand");
    boater(pen, x, y, 0);
    pen.pole([x + 0.62, y, 0], [x + 0.62, y, 3.3], 0.08, C.white);
    const k = pen.card(x + 0.62, y, 2.45);
    k.rect(-0.95, 0, 0.95, 0.85, C.white, { outline: true, w: W_FINE, ink: PURPLE, grain: 0.2 });
    k.text("QUEUE", 0, 0.25, 0.36, { align: "c", color: PURPLE, kind: L_MARK, w: 0.07, wobble: 0.2, layer: 1 });
  });
  // tents, and the people who slept in them
  tent(pen, 32.9, 36.3, hex("#e98a4a"));
  tent(pen, 35.4, 34.3, hex("#5fa7d6"));
  tent(pen, 35.6, 36.9, hex("#b6d65a"));
  pen.obj(() => {
    person(pen, 34.9, 38.3, 0, summer(rng), "bust");
    pen.cyl(35.55, 38.5, 0, 0.16, 0.24, C.metal, { seg: 6, w: 0.04 });
    person(pen, 37.5, 35.2, 0, summer(rng), "wave", true);
  });
}

/** An outside court: canvas round two sides, a bench of spectators, the ground crew by the rolled-up cover. */
function outsideCourt(c: LondonCtx): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.box(OX0 - 0.2, OY0 - 0.3, 0, OX1 - OX0 + 0.4, 0.2, 1.5, GREEN_D, { w: 0.09 });
    pen.box(OX0 - 0.4, OY0 - 0.3, 0, 0.2, OY1 - OY0 + 0.5, 1.5, GREEN_D, { w: 0.09 });
    const f = pen.wall("y+", OX0 - 0.2, OY0 - 0.3, 0, OX1 - OX0 + 0.4, 0.2);
    f.text("COURT 14", (OX1 - OX0) / 2 + 0.2, 0.55, 0.42, { align: "c", color: C.white, kind: L_MARK, w: 0.07, wobble: 0.2 });
  });
  net(pen, OCX, OCY - 2.6, OCY + 2.6);
  // a bench either side of the net post, and whoever wandered over to watch
  for (const [xa, xb] of [
    [5.2, 9.4],
    [11.6, 15.8],
  ]) {
    pen.obj(() => {
      pen.box(xa, OY0 + 0.1, 0.32, xb - xa, 0.42, 0.1, C.wood, { w: W_FINE });
      for (const x of [xa + 0.2, xb - 0.2]) pen.pole([x, OY0 + 0.3, 0], [x, OY0 + 0.3, 0.32], 0.08, C.iron, { ink: false });
      for (let x = xa + 0.5; x < xb - 0.2; x += 1.05) {
        if (rng.chance(0.25)) continue;
        person(pen, x, OY0 + 0.32, 0.02, summer(rng), "sit", rng.chance(0.5));
      }
    });
  }
  // the cover, rolled up along the near side, and the crew who will run it out when it rains
  pen.obj(() => {
    pen.pole([5.6, OY1 + 0.75, 0.32], [15.4, OY1 + 0.75, 0.32], 0.62, GREEN_D);
    for (const x of [6.6, 8.7, 10.8, 12.9, 15.0]) person(pen, x, OY1 + 0.36, 0, CREW(rng), x === 10.8 ? "wave" : "stand", rng.chance(0.5));
  });
}

// ---------------------------------------------------------------- the tennis

/** How long one point takes, from serve to serve; between shots; from the last shot to its bounce. */
const PERIOD = 10.5;
const SHOT = 0.7;
const FLY = 0.42;
/** Where the two players stand along the court: behind their baselines. */
const HX = [NETX - BASE - 0.55, NETX + BASE + 0.55];

/** A point: where across the court each shot is struck (the server strikes first), and where the last one lands. */
interface Rally {
  ys: number[];
  win: V2;
}

/**
 * The six points of the game being played, over and over. The server (at the
 * west end) wins the points with seven shots in them and loses the ones with
 * six: 15-0, 15 all, 30-15, 30 all, 40-30, game.
 */
const RALLIES: Rally[] = [
  { ys: [14.2, 15.9, 13.0, 13.3, 16.0, 15.6, 13.1], win: [22.7, 12.7] },
  { ys: [14.6, 13.3, 15.6, 15.3, 13.0, 13.4], win: [12.3, 16.3] },
  { ys: [14.8, 13.2, 15.8, 15.5, 12.9, 13.6, 15.9], win: [22.6, 16.4] },
  { ys: [14.3, 15.8, 13.2, 13.0, 15.7, 15.5], win: [12.4, 12.7] },
  { ys: [14.2, 13.4, 13.2, 15.7, 15.2, 13.1, 14.0], win: [22.8, 16.5] },
  { ys: [14.4, 15.8, 13.1, 13.4, 15.9, 15.5, 13.0], win: [22.7, 12.6] },
];
const POINTS: [string, string][] = [
  ["0", "0"],
  ["15", "0"],
  ["15", "15"],
  ["30", "15"],
  ["30", "30"],
  ["40", "30"],
];
const wonAt = (r: Rally) => (r.ys.length - 1) * SHOT + FLY;
const winnerOf = (r: Rally) => (r.ys.length - 1) % 2;

type Act = "ready" | "swing" | "runA" | "runB" | "cheer";

/** Where a player is across the court, and what they are doing, `tau` seconds into a point. */
function playerAt(r: Rally, next: Rally, who: number, tau: number): { y: number; act: Act } {
  const won = wonAt(r);
  const home = who === 0 ? next.ys[0] : MIDY;
  // the places this player has to be, and when
  const marks: [number, number][] = [[0, who === 0 ? r.ys[0] : MIDY]];
  for (let k = who === 0 ? 2 : 1; k < r.ys.length; k += 2) marks.push([k * SHOT, r.ys[k]]);
  // the one who loses the point lunges after the last ball and does not get there
  if (winnerOf(r) !== who) marks.push([won, lerp(marks[marks.length - 1][1], r.win[1], 0.55)]);
  marks.push([won + 1.7, marks[marks.length - 1][1]], [won + 4.0, home], [PERIOD + 1, home]);
  let i = 0;
  while (i < marks.length - 2 && tau >= marks[i + 1][0]) i++;
  const [ta, ya] = marks[i];
  const [tb, yb] = marks[i + 1];
  const u = smooth(ta + 0.14, tb - 0.1, tau);
  let act: Act = Math.abs(yb - ya) > 0.15 && u > 0.02 && u < 0.98 ? (Math.floor(tau * 7) & 1 ? "runA" : "runB") : "ready";
  for (let k = who; k < r.ys.length; k += 2) if (tau > k * SHOT - 0.1 && tau < k * SHOT + 0.17) act = "swing";
  if (who === 0 && tau > PERIOD - 0.12) act = "swing";
  if (winnerOf(r) === who && tau > won + 0.05 && tau < won + 1.6) act = "cheer";
  return { y: lerp(ya, yb, u), act };
}

/** Where the ball is `tau` seconds into a point (written into `out`); false while a ball kid has it. */
function ballAt(r: Rally, next: Rally, tau: number, out: V3): boolean {
  const n = r.ys.length;
  const last = (n - 1) * SHOT;
  const won = last + FLY;
  const fromX = (k: number) => HX[k % 2] + (k % 2 === 0 ? 0.55 : -0.55);
  if (tau < last) {
    // a shot: over the net to its bounce, then up to the other racket
    const k = Math.floor(tau / SHOT);
    const u = tau / SHOT - k;
    const sx = fromX(k);
    const ex = fromX(k + 1);
    const bx = lerp(sx, ex, 0.8);
    const by = lerp(r.ys[k], r.ys[k + 1], 0.8);
    if (u < 0.6) {
      const v = u / 0.6;
      out[0] = lerp(sx, bx, v);
      out[1] = lerp(r.ys[k], by, v);
      out[2] = lerp(1.3, 0.13, v) + 5 * v * (1 - v);
    } else {
      const w = (u - 0.6) / 0.4;
      out[0] = lerp(bx, ex, w);
      out[1] = lerp(by, r.ys[k + 1], w);
      out[2] = lerp(0.13, 1.05, w) + 1.2 * w * (1 - w);
    }
    return true;
  }
  const sx = fromX(n - 1);
  const sy = r.ys[n - 1];
  if (tau < won) {
    // the winner
    const v = (tau - last) / FLY;
    out[0] = lerp(sx, r.win[0], v);
    out[1] = lerp(sy, r.win[1], v);
    out[2] = lerp(1.3, 0.13, v) + 4.6 * v * (1 - v);
    return true;
  }
  if (tau < won + 2.3) {
    // it skips on past the baseline and rolls to the back of the court
    const d = Math.hypot(r.win[0] - sx, r.win[1] - sy);
    const v = clamp((tau - won) / 0.5, 0, 1);
    const run = 2.4 * v + 0.7 * (1 - Math.pow(1 - clamp((tau - won - 0.5) / 0.7, 0, 1), 2));
    out[0] = clamp(r.win[0] + ((r.win[0] - sx) / d) * run, AX0 + 0.35, AX1 - 0.35);
    out[1] = clamp(r.win[1] + ((r.win[1] - sy) / d) * run, AY0 + 0.35, AY1 - 0.35);
    out[2] = 0.13 + 2.0 * v * (1 - v);
    return true;
  }
  if (tau > PERIOD - 1.8) {
    // the server bounces it a few times, then tosses it up
    out[0] = HX[0] + 0.55;
    out[1] = next.ys[0];
    const v = (tau - (PERIOD - 0.4)) / 0.4;
    out[2] = v < 0 ? 0.13 + 0.8 * Math.abs(Math.sin((Math.PI * (tau - (PERIOD - 1.8))) / 0.4)) : lerp(0.93, 1.3, v) + 3.6 * v * (1 - v);
    return true;
  }
  return false;
}

function playerSprite(lk: Look, act: Act, flip: boolean, seed: number, s = 1): Sprite {
  return makeSprite(
    (p) => {
      const pose: Pose = act === "swing" ? "wave" : act === "runA" ? "walkA" : act === "runB" ? "walkB" : act === "cheer" ? "cheer" : "stand";
      person(p, 0, 0, 0, lk, pose, flip, s);
      const k = p.card(0, 0, 0, flip);
      // shorts, white like everything else
      k.poly(
        [
          [-0.37 * s, 0.5 * s],
          [0.37 * s, 0.5 * s],
          [0.33 * s, 0.8 * s],
          [-0.33 * s, 0.8 * s],
        ],
        C.white,
        { outline: true, w: W_FINE, layer: 1.5, grain: 0.3 },
      );
      // the racket: raised to hit or to celebrate, otherwise held low
      const high = act === "swing" || act === "cheer";
      const hx = (high ? 0.62 : 0.45) * s;
      const hy = (high ? 1.88 : 0.86) * s;
      const tx = hx + (high ? 0.26 : 0.4) * s;
      const ty = hy + (high ? 0.46 : -0.2) * s;
      k.seg(hx, hy, tx, ty, { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 5 });
      const l = Math.hypot(tx - hx, ty - hy);
      k.ellipse(tx + ((tx - hx) / l) * 0.28 * s, ty + ((ty - hy) / l) * 0.28 * s, 0.24 * s, 0.3 * s, null, { ink: C.black, w: 0.055, layer: 5, seg: 9 });
    },
    0,
    seed,
  );
}

const ACTS: Act[] = ["ready", "swing", "runA", "runB", "cheer"];

function tennis(c: LondonCtx, seats: Seat[], leapers: Picnicker[]): void {
  const born = c.done;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + G + z];
  const mid = W(20, 20, 2);
  // On the tour the game point is timed to be won a second after the camera arrives.
  const start = (): number => {
    const at = c.visit();
    return (at == null ? born + 1.2 : at + 1.0 - wonAt(RALLIES[5])) - 5 * PERIOD;
  };
  /** Which point of the film this is, which of the game's six, and how far into it. */
  const now = (t: number): { n: number; k: number; tau: number } => {
    const tt = t - start();
    const n = Math.floor(tt / PERIOD);
    return { n, k: ((n % 6) + 6) % 6, tau: tt - n * PERIOD };
  };
  /** How loudly the crowd is cheering, 0 to 1. */
  const roar = (t: number): number => {
    const s = now(t);
    const d = s.tau - wonAt(RALLIES[s.k]);
    return d < 0 ? 0 : smooth(0, 0.15, d) * (1 - smooth(1.5, 2.0, d)) * (s.k === 5 ? 1 : 0.8);
  };

  // ---- the two players and the ball
  const reed: Look = { skin: SKIN[1], hair: HAIR[2], top: C.white, legs: SKIN[1], long: true, hat: null };
  const moss: Look = { skin: SKIN[3], hair: HAIR[0], top: C.white, legs: SKIN[3], long: false, hat: C.white };
  const sprites = [reed, moss].map((lk, who) => {
    const set = {} as Record<Act, Sprite>;
    for (const a of ACTS) set[a] = playerSprite(lk, a, who === 1, 60 + who);
    return set;
  });
  const ball = makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.15, BALL, { outline: true, w: 0.04, seg: 8, grain: 0, glow: 0.7, kind: F_NEON }), 0, 21);
  const shadow = makeSprite((p) => p.floor(0.03, 6).circle(0, 0, 0.19, TURF_D, { seg: 8, grain: 0 }), 0, 22);
  const dot = makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.075, BALL, { seg: 6, grain: 0, glow: 1, kind: F_NEON }), 0, 23);
  const blob = makeSprite((p) => p.card(0, 0, 0).ellipse(0, 0.08, 0.1, 0.17, C.white, { seg: 6, grain: 0, glow: 1, kind: F_NEON, outline: true, w: 0.03 }), 0, 24);
  const B: V3 = [0, 0, 0];
  /** Where a point of Centre Court is on the big screen (world coordinates). */
  const onScreen = (x: number, y: number, z: number): V3 =>
    W(SCR.x + SCR.a0 + ((x - AX0) * SCR.pw) / (AX1 - AX0), SCR.y + SCR.d + 0.06, SCR.b0 + SCR.ph - ((y - AY0) * SCR.ph) / (AY1 - AY0) + z * 0.22);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(mid[0], mid[1], mid[2], 34)) return;
    const s = now(m.t);
    const r = RALLIES[s.k];
    const next = RALLIES[(s.k + 1) % 6];
    for (let who = 0; who < 2; who++) {
      const p = playerAt(r, next, who, s.tau);
      const step = p.act === "swing" ? (who === 0 ? 0.25 : -0.25) : 0;
      const hop = p.act === "cheer" ? 0.3 * Math.abs(Math.sin(m.t * 9)) : 0;
      const at = W(HX[who] + step, p.y, hop);
      m.put(sprites[who][p.act], at[0], at[1], at[2], born);
      const sc = onScreen(HX[who], p.y, 0);
      m.put(blob, sc[0], sc[1], sc[2], born);
    }
    if (ballAt(r, next, s.tau, B)) {
      const at = W(B[0], B[1], B[2]);
      m.put(ball, at[0], at[1], at[2], born);
      if (B[2] > 0.2 && s.tau < PERIOD - 1.8) m.put(shadow, at[0], at[1], c.oz + G, born);
      const sc = onScreen(B[0], B[1], B[2]);
      m.put(dot, sc[0], sc[1], sc[2], born);
    }
  });

  // ---- the ball kids at the net: crouched during the point, across the court after it
  const kr = new Rng(909);
  const kids = [0, 1].map((j) => {
    const lk = BALL_KID(kr);
    const mk = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, lk, pose, flip, 0.74), 0, 80 + j);
    return { crouch: mk("sit", j === 1), run: [mk("walkA", false), mk("walkB", false)], back: [mk("walkA", true), mk("walkB", true)] };
  });
  const NEAR: V2 = [NETX, MIDY + SIDE + 1.05];
  const FAR: V2 = [NETX - 0.85, MIDY - SIDE - 0.8];
  c.movers.push((m) => {
    if (m.t < born) return;
    const s = now(m.t);
    const won = wonAt(RALLIES[s.k]);
    const u = smooth(won + 0.6, won + 1.9, s.tau);
    for (let j = 0; j < 2; j++) {
      // they change ends after every point
      const near = (((j + s.n) % 2) + 2) % 2 === 0;
      const a = near ? NEAR : FAR;
      const b = near ? FAR : NEAR;
      const lane = NETX + (near ? 0.55 : -0.55);
      const p1: V2 = [lane, near ? MIDY + SIDE + 0.4 : MIDY - SIDE - 0.4];
      const p2: V2 = [lane, near ? MIDY - SIDE - 0.4 : MIDY + SIDE + 0.4];
      let x: number;
      let y: number;
      if (u < 0.12) {
        x = lerp(a[0], p1[0], u / 0.12);
        y = lerp(a[1], p1[1], u / 0.12);
      } else if (u < 0.88) {
        x = lane;
        y = lerp(p1[1], p2[1], (u - 0.12) / 0.76);
      } else {
        x = lerp(p2[0], b[0], (u - 0.88) / 0.12);
        y = lerp(p2[1], b[1], (u - 0.88) / 0.12);
      }
      const moving = u > 0.01 && u < 0.99;
      const set = near ? kids[j].run : kids[j].back;
      const at = W(x, y);
      m.put(moving ? set[Math.floor(m.t * 8) & 1] : kids[j].crouch, at[0], at[1], at[2], born + 0.2 * j);
    }
  });

  // ---- the crowd: some of them cannot stay in their seats when a point is won
  const fans = LIVELY.map((lk, i) => [makeSprite((p) => fan(p.card(0, 0, 0), lk, false), 0, 300 + i), makeSprite((p) => fan(p.card(0, 0, 0), lk, false, true), 0, 300 + i)]);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(mid[0], mid[1], mid[2], 34)) return;
    const loud = roar(m.t);
    for (const q of seats) {
      const up = loud > 0.25 && Math.sin(m.t * 11 + q.ph) > -0.3;
      const at = W(q.x, q.y, q.z + (up ? 0.22 * Math.abs(Math.sin(m.t * 8 + q.ph)) : 0));
      m.put(fans[q.look][up ? 1 : 0], at[0], at[1], at[2], born);
    }
  });
  const hillFolk = leapers.map((q, i) => ({
    q,
    sit: makeSprite((p) => person(p, 0, 0, 0, q.lk, "bust", i % 2 === 0), 0, 400 + i),
    up: makeSprite((p) => person(p, 0, 0, 0, q.lk, "cheer", i % 2 === 0), 0, 400 + i),
  }));
  c.movers.push((m) => {
    if (m.t < born) return;
    const loud = roar(m.t - 0.15);
    for (const h of hillFolk) {
      const up = loud > 0.3;
      const at = W(h.q.x, h.q.y, h.q.z + (up ? 0.3 * Math.abs(Math.sin(m.t * 7 + h.q.ph)) : 0));
      m.put(up ? h.up : h.sit, at[0], at[1], at[2], born);
    }
  });

  // ---- the scoreboard: games and points, changed as soon as the point is over
  const board = W(SB.x + SB.w / 2, SB.y, SB.z + 1);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(board[0], board[1], board[2], 10)) return;
    const s = now(m.t);
    const idx = s.tau >= wonAt(RALLIES[s.k]) ? s.n + 1 : s.n;
    const pts = POINTS[((idx % 6) + 6) % 6];
    const games = String(clamp(3 + Math.floor(idx / 6), 0, 5));
    const dp = m.pen;
    const keep = dp.reveal;
    const keepRng = dp.rng;
    dp.reveal = () => born;
    dp.rng = new Rng(1922);
    dp.push(c.ox, c.oy, c.oz + G);
    const f = dp.wall("y+", SB.x, SB.y, SB.z, SB.w, SB.d, 2);
    for (const kind of [L_MARK, L_SPARK]) {
      const o = { color: C.yellow, kind, w: 0.08, wobble: 0.2 };
      f.text(games, 3.38, 1.44, 0.44, o);
      f.text(pts[0], 5.5, 1.44, 0.44, { ...o, align: "r" });
      f.text(pts[1], 5.5, 0.42, 0.44, { ...o, align: "r" });
    }
    dp.pop();
    dp.reveal = keep;
    dp.rng = keepRng;
  });

  // ---- the doubles on the outside court: a cross-court rally that never ends
  const dr = new Rng(2024);
  const four = [0, 1, 2, 3].map((i) => {
    const lk: Look = { skin: dr.pick(SKIN), hair: dr.pick(HAIR), top: C.white, legs: dr.pick(SKIN), long: i % 2 === 0, hat: i === 3 ? C.white : null };
    const flip = i === 1 || i === 3;
    return { ready: playerSprite(lk, "ready", flip, 500 + i, 0.92), swing: playerSprite(lk, "swing", flip, 500 + i, 0.92) };
  });
  const DX = [OCX - 5.05, OCX + 5.05];
  const DY = [OCY - 1.5, OCY + 1.3];
  const LOB = 0.95;
  const wob = (j: number) => 0.35 * Math.sin(j * 2.4);
  const omid = W(OCX, OCY, 1);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(omid[0], omid[1], omid[2], 16)) return;
    const tt = m.t - born;
    const j = Math.floor(tt / LOB);
    const u = tt / LOB - j;
    const s = j % 2;
    const sx = DX[s] + (s === 0 ? 0.5 : -0.5);
    const ex = DX[1 - s] + (s === 0 ? -0.5 : 0.5);
    const sy = DY[s] + wob(j);
    const ey = DY[1 - s] + wob(j + 1);
    const bx = lerp(sx, ex, 0.8);
    const by = lerp(sy, ey, 0.8);
    let x: number;
    let y: number;
    let z: number;
    if (u < 0.6) {
      const v = u / 0.6;
      x = lerp(sx, bx, v);
      y = lerp(sy, by, v);
      z = lerp(1.2, 0.13, v) + 4.4 * v * (1 - v);
    } else {
      const w = (u - 0.6) / 0.4;
      x = lerp(bx, ex, w);
      y = lerp(by, ey, w);
      z = lerp(0.13, 1.0, w) + 1.1 * w * (1 - w);
    }
    const at = W(x, y, z);
    m.put(ball, at[0], at[1], at[2], born);
    if (z > 0.2) m.put(shadow, at[0], at[1], c.oz + G, born);
    // the two at the back follow the ball across; the two at the net shuffle and hope
    for (let i = 0; i < 2; i++) {
      // where this one has to be for their next shot, and where they were for their last
      const hits = j % 2 === i;
      const yNext = DY[i] + wob(hits ? j + 2 : j + 1);
      const yLast = DY[i] + wob(hits ? j : j - 1);
      const done = hits ? smooth(0.2, 1.9, u) : smooth(-0.8, 0.9, u);
      const py = lerp(yLast, yNext, done);
      const swing = (hits && u < 0.18) || (!hits && u > 0.9);
      const p = W(DX[i], py);
      m.put(swing ? four[i].swing : four[i].ready, p[0], p[1], p[2], born + 0.1 * i);
    }
    const n0 = W(OCX - 1.9, OCY + 1.5 + 0.3 * Math.sin(m.t * 1.1));
    m.put(four[2].ready, n0[0], n0[1], n0[2], born + 0.2);
    const n1 = W(OCX + 1.9, OCY - 1.5 + 0.3 * Math.sin(m.t * 0.9 + 1));
    m.put(four[3].ready, n1[0], n1[1], n1[2], born + 0.3);
  });

  // ---- the hawk that is flown over the courts to keep the pigeons off
  const hawk = [0, 1].map((flip) =>
    [0, 1].map((up) =>
      makeSprite(
        (p) => {
          const k = p.card(0, 0, 0, flip === 1);
          const brown = hex("#7a5236");
          k.ellipse(0, 0, 0.34, 0.14, brown, { outline: true, w: 0.045, seg: 8, grain: 0.3 });
          k.circle(0.34, 0.06, 0.11, hex("#caa77a"), { outline: true, w: 0.04, seg: 6, layer: 1 });
          k.poly(
            [
              [-0.3, 0.03],
              [-0.62, 0.1],
              [-0.56, -0.12],
            ],
            brown,
            { outline: true, w: 0.035, layer: 1, grain: 0.3 },
          );
          const b = up ? 0.62 : -0.34;
          k.poly(
            [
              [-0.16, 0.05],
              [0.16, 0.05],
              [0.02, b],
              [-0.42, b * 0.85],
            ],
            hex("#9a6c48"),
            { outline: true, w: 0.04, layer: 2, grain: 0.3 },
          );
        },
        0,
        700 + up,
      ),
    ),
  );
  const pigeon = [0, 1].map((flip) => [0, 1].map((up) => makeSprite((p) => pigeonOn(p.card(0, 0, 0, flip === 1), up ? "up" : "down"), 0, 710 + up)));
  c.movers.push((m) => {
    if (m.t < born + 0.4) return;
    // round and round above the court, the pigeon always a little way ahead
    for (const [lead, flap, set] of [
      [0, 5, hawk],
      [0.75, 9, pigeon],
    ] as const) {
      const a = (m.t / 15) * Math.PI * 2 + lead;
      const x = 17 + Math.cos(a) * 9;
      const y = 14 + Math.sin(a) * 8;
      // heading on the page: to the right when x - y is growing
      const right = -Math.sin(a) * 9 - Math.cos(a) * 8 > 0;
      const at = W(x, y, 13.5 + 1.2 * Math.sin(a * 2) - lead * 1.2);
      m.put(set[right ? 0 : 1][Math.floor(m.t * flap) & 1], at[0], at[1], at[2], born + 0.4);
    }
  });

  // ---- people on their way somewhere: along the concourse, down the path, past the hill
  const rng = new Rng(4040);
  const loops: V2[][] = [
    [
      [10.2, 22.55],
      [27.2, 22.55],
      [27.2, 23.6],
      [10.2, 23.6],
    ],
    [
      [17.4, 25.2],
      [17.4, 36.9],
      [18.2, 36.9],
      [18.2, 25.2],
    ],
    [
      [28.25, 6.2],
      [28.25, 21.2],
      [29.0, 21.2],
      [29.0, 6.2],
    ],
  ];
  loops.forEach((pts, i) => {
    const route = new Route(
      pts.map((p) => W(p[0], p[1])),
      true,
      0.3,
    );
    for (let k = 0; k < (i === 0 ? 7 : 4); k++) c.movers.push(walker(route, rng, born + rng.range(0, 1)));
  });
}

// ---------------------------------------------------------------- the islet

export const wimbledon: LondonBuilder = (c) => {
  const { pen, rng } = c;
  c.early(() => {
    pen.obj(() => pen.extrude(shoreline(), 0, G, C.clay, { top: C.grass, crease: 30 }));
    pen.push(0, 0, G);
    ground(c);
    pen.pop();
  });

  pen.push(0, 0, G);
  const seats = farStands(c);
  roof(c);
  scoreboard(c);
  courtside(c);
  nearStands(c, seats);
  clubhouse(c);
  bigScreen(c);
  const leapers = hill(c);
  strawberries(c);
  gate(c);
  outsideCourt(c);
  orderOfPlay(c);
  teaLawn(c);
  theQueue(c);
  // lamps along the paths, and a few trees round the edge
  for (const [x, y] of [
    [11.6, 24.0],
    [26.9, 24.0],
    [28.05, 5.9],
    [29.3, 19.0],
    [18.85, 30.6],
  ]) {
    lamp(pen, x, y);
  }
  for (const [x, y] of [
    [2.6, 27.4],
    [2.5, 32.2],
    [38.5, 20.2],
    [33.1, 26.7],
  ]) {
    tree(pen, rng, x, y, { kind: x > 30 ? "blossom" : "round" });
  }
  pen.pop();

  tennis(c, seats, leapers);
  // the whole islet in the frame, the court near the middle of it
  c.focus(23.3, 23.3, 1.2);
};
