// The Rijksmuseum and Museumplein. The museum stands across the back of the
// block with the cycle path running straight through its middle (a string
// quartet busks in the passage); in front are the long paddling pond, the
// lawns, the tulip beds and the Van Gogh Museum.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { F_WATER, L_BAR, L_MARK, L_RIPPLE, Pen, Plane } from "../../engine/pen";
import { Look, Pose, W_FINE, W_THIN, archWindow, bench, bikeRow, bricks, flowerBed, hedge, lamp, person, randomLook, speckle, tree, tufts, windowAt, windowGrid } from "../kit";
import { Route, Turning, castWalker, cyclist, makeSprite, rounded, traveler, walker } from "../motion";
import { C, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const PATH = hex("#d9937d");
const PATH_D = hex("#c27c68");
const SAND = hex("#ecdcbb");
const CONCRETE = hex("#d9d6cf");
const TITAN = hex("#b9bcc0");
const CELLO = hex("#9a5a34");
const TOWELS: RGB[] = [C.red, C.yellow, C.sky, C.pink, C.orange, C.lilac];

// the museum: back wall at x = 8, front at x = 18
const MX = 8;
const MW = 10;
const MH = 9.5;
// the pond
const PX0 = 25;
const PX1 = 40;
const PY0 = 20.6;
const PY1 = 27.4;
// the half-pipe
const RX = 41.2;
const RY = 33.6;
/** Where the string quartet sits: two violins, a viola, and the cello on the end. */
const QUARTET: V2[] = [
  [19.25, 19.35],
  [19.25, 20.25],
  [19.25, 21.15],
  [19.3, 22.05],
];

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

/** Height of the half-pipe's riding surface, a units along it. */
function rampZ(a: number): number {
  const R = 1.45;
  if (a < 0.55 || a > 4.45) return 1.55;
  if (a < 2) return 1.55 - Math.sqrt(Math.max(0, R * R - (2 - a) * (2 - a)));
  if (a > 3) return 1.55 - Math.sqrt(Math.max(0, R * R - (a - 3) * (a - 3)));
  return 0.1;
}

// ---------------------------------------------------------------- the ground

function ground(c: BlockCtx): void {
  const { pen } = c;
  const g = pen.floor(0, 1);
  // gravel forecourt and square
  g.rect(6.2, 6.2, 47.38, 41.8, C.plaza);
  // lawns
  const lawns: [number, number, number, number][] = [
    [23.8, 7.2, 30.4, 16.9],
    [23.8, 31.2, 40.2, 41.4],
    [43.9, 16.4, 47.2, 31.2],
  ];
  const g2 = pen.floor(0, 2);
  for (const [x0, y0, x1, y1] of lawns) {
    g2.rect(x0, y0, x1, y1, C.grass, { outline: true, w: 0.07, ink: C.grassDark });
    tufts(pen.floor(0, 3), x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.3, 0.5);
  }
  // the cycle path: through the passage and round the pond
  const path = pen.floor(0, 2);
  for (const [x0, y0, x1, y1] of [
    [6.3, 23.1, 21.6, 24.9],
    [21.55, 17.35, 23.25, 30.65],
    [41.75, 17.35, 43.45, 30.65],
    [21.55, 17.35, 43.45, 19.05],
    [21.55, 28.95, 43.45, 30.65],
  ]) {
    path.rect(x0, y0, x1, y1, PATH, { grain: 0.8 });
  }
  const mark = pen.floor(0, 3);
  // kerbs
  const kerb = { w: 0.07, color: PATH_D, kind: L_MARK, wobble: 0.4 };
  mark.line(
    [
      [6.3, 23.1],
      [21.55, 23.1],
      [21.55, 17.35],
      [43.45, 17.35],
      [43.45, 30.65],
      [21.55, 30.65],
      [21.55, 24.9],
      [6.3, 24.9],
    ],
    kerb,
  );
  mark.loop(
    [
      [23.25, 19.05],
      [41.75, 19.05],
      [41.75, 28.95],
      [23.25, 28.95],
    ],
    kerb,
  );
  const dash = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.floor(len / 1.3);
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.2) / n;
      const t1 = (i + 0.7) / n;
      mark.seg(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0 });
    }
  };
  dash(6.6, 24, 21.4, 24);
  dash(22.4, 18.2, 42.6, 18.2);
  dash(42.6, 18.2, 42.6, 29.8);
  dash(42.6, 29.8, 22.4, 29.8);
  dash(22.4, 29.8, 22.4, 18.2);
  // a sandy footpath round the big lawn
  const sand = pen.floor(0, 3);
  for (const [x0, y0, x1, y1] of [
    [24.6, 32.0, 39.6, 33.2],
    [24.6, 39.6, 39.6, 40.8],
    [24.6, 32.0, 25.8, 40.8],
    [38.4, 32.0, 39.6, 40.8],
  ]) {
    sand.rect(x0, y0, x1, y1, SAND, { grain: 0.7 });
  }
  // the pond
  pen.floor(0.1, 2).rect(PX0, PY0, PX1, PY1, C.water, { kind: F_WATER });
  pen.floor(0.1, 3).ticks(PX0 + 0.4, PY0 + 0.4, PX1 - 0.4, PY1 - 0.4, {
    n: 46,
    len: 1.2,
    ang: -Math.PI / 4,
    jit: 0.08,
    bend: 0.22,
    color: C.waterInk,
    w: 0.06,
    kind: L_RIPPLE,
    alpha: 0.7,
  });
  speckle(pen.floor(0, 2), 18.6, 6.6, 47, 41.4, C.streetDark, 0.12, (a, b) => {
    for (const [x0, y0, x1, y1] of lawns) if (a > x0 - 0.3 && a < x1 + 0.3 && b > y0 - 0.3 && b < y1 + 0.3) return false;
    if (a > 21.2 && a < 43.8 && b > 17 && b < 31) return false;
    return !(b > 22.8 && b < 25.2 && a < 22);
  });
}

// ---------------------------------------------------------------- the museum

function museum(c: BlockCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.7);
  const band = (f: Plane, w: number, b: number, h = 0.24) => {
    f.rect(0, b, w, b + h, C.cream, { grain: 0.4, layer: 1 });
    f.seg(0, b, w, b, { w: W_FINE, layer: 1 });
  };
  const quoins = (f: Plane, w: number, h: number) => {
    f.rect(0, 0, 0.26, h, C.cream, { grain: 0.4, layer: 1 });
    f.rect(w - 0.26, 0, w, h, C.cream, { grain: 0.4, layer: 1 });
  };

  /** The long brick front of a wing: ground-floor windows, tall arched galleries, a tiled frieze. */
  const wingFront = (f: Plane, w: number) => {
    f.rect(0, 0, w, 0.5, C.stone, { grain: 0.5 });
    bricks(f, 0.2, 0.6, w - 0.2, 3.2, C.brickDark, 0.4);
    windowGrid(f, rng, 0.3, 0.85, w - 0.3, 3.0, 4, 1, { trim: C.cream, fillA: 0.52, fillB: 0.88, lit: 0.6 });
    band(f, w, 3.3);
    const gap = (w - 3 * 1.7) / 4;
    for (let i = 0; i < 3; i++) {
      const a = gap + i * (1.7 + gap);
      archWindow(f, a, 4.15, a + 1.7, 8.0, lit(), C.cream);
      if (i < 2) {
        f.circle(a + 1.7 + gap / 2, 6.9, 0.26, C.gold, { outline: true, w: W_FINE, seg: 9, grain: 0.3 });
      }
    }
    bricks(f, 0.2, 3.7, w - 0.2, 8.1, C.brickDark, 0.14);
    f.rect(0, 8.3, w, 8.95, C.ochre, { grain: 0.5, layer: 1 });
    f.seg(0, 8.3, w, 8.3, { w: W_FINE, layer: 1 });
    for (let a = 0.25, i = 0; a < w - 0.3; a += 0.42, i++) {
      f.rect(a, 8.45, a + 0.2, 8.8, i % 3 === 0 ? C.blueDark : i % 3 === 1 ? C.white : C.tile, { layer: 2, grain: 0 });
    }
    band(f, w, 9.15, MH - 9.15);
  };

  // ---- the two wings
  for (const y0 of [7, 26.2]) {
    pen.obj(() => {
      pen.box(MX, y0, 0, MW, 14.8, MH, C.brick);
      wingFront(pen.wall("x+", MX, y0 === 7 ? 11.2 : 29, 0, MW, 7.8), 7.8);
      if (y0 > 20) {
        // the south end wall
        const e = pen.wall("y+", MX, y0, 0, MW, 14.8);
        e.rect(0, 0, 7.4, 0.5, C.stone, { grain: 0.5 });
        windowGrid(e, rng, 0.3, 0.85, 7.3, 3.0, 4, 1, { trim: C.cream, fillA: 0.52, fillB: 0.88, lit: 0.6 });
        band(e, 7.4, 3.3);
        for (let i = 0; i < 3; i++) archWindow(e, 0.5 + i * 2.35, 4.15, 2.1 + i * 2.35, 8.0, lit(), C.cream);
        band(e, 7.4, 9.15, MH - 9.15);
      } else {
        // inside the passage: the wall the quartet plays against
        const t = pen.wall("y+", MX, y0, 0, MW, 14.8);
        t.rect(0, 0, MW, 3.4, scaleRGB(C.brick, 0.6), { grain: 0.7 });
        for (const a of [2.5, 5.2, 7.9]) t.rect(a - 0.14, 2.3, a + 0.14, 2.75, C.lamp, { outline: true, w: 0.04, layer: 1, glow: 1, grain: 0 });
      }
    });
    pen.obj(() => {
      pen.hip(MX, y0, MH, MW, 14.8, 3.6, C.slate);
      for (const dy of [5.6, 8.9]) {
        const y = y0 + (y0 < 20 ? dy : dy - 2.8);
        pen.box(15.0, y, MH + 1.0, 1.5, 1.2, 1.25, C.cream, { w: W_THIN });
        pen.gable(14.6, y - 0.1, MH + 2.25, 1.95, 1.4, 0.75, "x", C.slate, { gable: C.cream, w: W_THIN });
        pen.wall("x+", 15.0, y, MH + 1.0, 1.5, 1.2).rect(0.25, 0.3, 0.95, 1.1, C.glass, { outline: true, w: W_FINE, glow: 0.8 });
      }
    }, 0.15);
  }

  // ---- the corner pavilions
  for (const y0 of [7, 36.8]) {
    pen.obj(() => {
      pen.box(15.4, y0, 0, 3.2, 4.2, 10.6, C.brick);
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, 15.4, y0, 0, 3.2, 4.2);
        const w = side === "x+" ? 4.2 : 3.2;
        f.rect(0, 0, w, 0.5, C.stone, { grain: 0.5 });
        quoins(f, w, 10.6);
        band(f, w, 3.3);
        band(f, w, 9.0);
        band(f, w, 10.25, 0.35);
        windowGrid(f, rng, 0.45, 0.85, w - 0.45, 3.0, 2, 1, { trim: C.cream, fillA: 0.5, fillB: 0.88, lit: 0.6 });
        archWindow(f, w / 2 - 0.85, 4.1, w / 2 + 0.85, 8.3, lit(), C.cream);
        f.circle(w / 2, 9.65, 0.26, C.gold, { outline: true, w: W_FINE, seg: 9, grain: 0.3, layer: 1 });
      }
    }, 0.05);
    pen.obj(() => {
      pen.pyramid(15.2, y0 - 0.2, 10.6, 3.6, 4.6, 4.4, C.slate);
      pen.pole([17, y0 + 2.1, 15], [17, y0 + 2.1, 16.1], 0.07, C.gold, { ink: false });
      pen.card(17, y0 + 2.1, 16.0).circle(0, 0.14, 0.15, C.gold, { outline: true, w: 0.04, seg: 7 });
    }, 0.25);
  }

  // ---- the middle, riding over the passage
  pen.obj(() => {
    pen.box(MX, 21.8, 3.4, MW, 4.4, 8.6, C.brick);
    // the arch itself
    const back = pen.wall("x+", MX, 21.8, 0, MW - 0.5, 4.4);
    const lintel: V2[] = [
      [0, 3.4],
      [4.4, 3.4],
      [4.4, 1.9],
    ];
    for (let k = 1; k < 10; k++) {
      const t = (k / 10) * Math.PI;
      lintel.push([2.2 + Math.cos(t) * 2.2, 1.9 + Math.sin(t) * 1.3]);
    }
    lintel.push([0, 1.9]);
    back.extrude(lintel, 0.5, C.brick, { crease: 25 });
    const f0 = pen.wall("x+", MX, 21.8, 0, MW, 4.4);
    f0.arc(2.2, 1.9, 2.05, 1.18, 0.05, Math.PI - 0.05, { w: 0.24, color: C.cream, kind: L_MARK, wobble: 0.2, seg: 12 });
    const f = pen.wall("x+", MX, 21.8, 3.4, MW, 4.4);
    f.rect(0, 0, 4.4, 0.42, C.cream, { grain: 0.4 });
    f.seg(0, 0.42, 4.4, 0.42, { w: W_FINE });
    f.text("RIJKSMUSEUM", 2.2, 0.1, 0.22, { align: "c", w: 0.045, layer: 1 });
    // the great stained window over the road
    f.poly(archShape(1.0, 1.0, 3.4, 5.6), C.cream, { outline: true, w: W_FINE, grain: 0.3 });
    f.poly(archShape(1.14, 1.14, 3.26, 5.46), C.glass, { layer: 1, glow: 1, grain: 0.5 });
    const panes = [C.red, C.yellow, C.sky, C.orange, C.purple, C.green];
    for (let i = 0; i < 14; i++) {
      const a = 1.35 + (i % 4) * 0.5;
      const b = 1.4 + Math.floor(i / 4) * 0.95;
      f.rect(a, b, a + 0.24, b + 0.5, panes[i % panes.length], { layer: 2, grain: 0, glow: 1 });
    }
    f.rect(0, 6.1, 4.4, 6.7, C.ochre, { grain: 0.5, layer: 1 });
    for (let a = 0.25, i = 0; a < 4.1; a += 0.42, i++) f.rect(a, 6.22, a + 0.2, 6.56, i % 2 ? C.blueDark : C.white, { layer: 2, grain: 0 });
    f.rect(0, 8.25, 4.4, 8.6, C.cream, { grain: 0.4, layer: 1 });
    f.seg(0, 8.25, 4.4, 8.25, { w: W_FINE, layer: 1 });
  }, 0.1);
  pen.obj(() => {
    pen.gable(MX, 21.8, 12, MW, 4.4, 2.8, "x", C.slate, { gable: C.brick });
    const g = pen.wall("x+", MX, 21.8, 12, MW, 4.4);
    g.circle(2.2, 1.0, 0.55, C.cream, { outline: true, w: W_FINE, seg: 12 });
    g.circle(2.2, 1.0, 0.36, C.glass, { layer: 1, seg: 9, glow: 0.8 });
    // a gilded figure on the gable
    const k = pen.card(18, 24, 14.8);
    k.bar(0, 0.05, 0, 0.75, 0.26, C.gold);
    k.poly(
      [
        [-0.1, 0.55],
        [-0.75, 1.0],
        [-0.2, 0.85],
      ],
      C.gold,
      { outline: true, w: 0.04, layer: 1, grain: 0.2 },
    );
    k.poly(
      [
        [0.1, 0.55],
        [0.75, 1.0],
        [0.2, 0.85],
      ],
      C.gold,
      { outline: true, w: 0.04, layer: 1, grain: 0.2 },
    );
    k.circle(0, 1.0, 0.18, C.gold, { outline: true, w: 0.04, layer: 2, seg: 8 });
  }, 0.3);

  // ---- the two towers
  for (const y0 of [19, 26.2]) {
    pen.obj(() => {
      pen.box(15.6, y0, 0, 3.0, 2.8, 15.5, C.brick);
      for (const side of ["x+", "y+"] as const) {
        const f = pen.wall(side, 15.6, y0, 0, 3.0, 2.8);
        const w = side === "x+" ? 2.8 : 3.0;
        quoins(f, w, 15.5);
        f.rect(0, 0, w, 0.5, C.stone, { grain: 0.5 });
        band(f, w, 3.3);
        band(f, w, 9.9);
        band(f, w, 12.1);
        band(f, w, 15.1, 0.4);
        const m = w / 2;
        windowAt(f, m - 0.45, 0.9, m + 0.45, 2.7, lit(), C.cream);
        archWindow(f, m - 0.5, 4.2, m + 0.5, 6.6, lit(), C.cream);
        archWindow(f, m - 0.5, 7.2, m + 0.5, 9.4, lit(), C.cream);
        f.circle(m, 11.05, 0.7, C.white, { outline: true, w: W_FINE, seg: 14, grain: 0.2, glow: 0.6, layer: 1 });
        f.seg(m, 11.05, m, 11.55, { w: 0.06, wobble: 0, layer: 2 });
        f.seg(m, 11.05, m + 0.32, 10.9, { w: 0.06, wobble: 0, layer: 2 });
        for (const a of [m - 0.75, m + 0.1]) f.poly(archShape(a, 12.6, a + 0.65, 14.6), C.charcoal, { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
      }
    }, 0.15);
    pen.obj(() => {
      pen.pyramid(15.4, y0 - 0.2, 15.5, 3.4, 3.2, 5.4, C.slate);
      pen.pole([17.1, y0 + 1.4, 20.9], [17.1, y0 + 1.4, 22.2], 0.07, C.gold, { ink: false });
      pen.card(17.1, y0 + 1.4, 22.1).circle(0, 0.15, 0.16, C.gold, { outline: true, w: 0.04, seg: 7 });
    }, 0.35);
  }
}

// ---------------------------------------------------------------- characters

function musician(pen: Pen, x: number, y: number, lk: Look, cello: boolean): void {
  pen.obj(() => {
    person(pen, x, y, 0.22, lk, "sit");
    const k = pen.card(x, y, 0.22);
    if (cello) {
      k.ellipse(0.44, 0.52, 0.25, 0.38, CELLO, { outline: true, w: W_FINE, layer: 5, seg: 10 });
      k.bar(0.44, 0.86, 0.52, 1.6, 0.07, C.black, { layer: 5, ink: false });
    } else {
      k.ellipse(0.3, 1.27, 0.2, 0.12, C.wood, { outline: true, w: 0.04, layer: 5, seg: 8 });
      k.bar(0.45, 1.29, 0.72, 1.35, 0.05, C.black, { layer: 5, ink: false });
    }
  });
}

/** Someone holding a phone out in front of them. */
function photographer(pen: Pen, x: number, y: number, lk: Look, flip: boolean): void {
  pen.obj(() => {
    person(pen, x, y, 0, lk, "stand", flip);
    const k = pen.card(x, y, 0, flip);
    k.bar(0.34, 1.34, 0.72, 1.6, 0.17, lk.top, { layer: 4 });
    k.rect(0.7, 1.5, 0.88, 1.82, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  });
}

/** Someone flat out on a towel. */
function sunbather(pen: Pen, rng: Rng, x: number, y: number, rot: number): void {
  const lk = randomLook(rng);
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.floor(0.03, 3).rect(-0.55, -1.25, 0.55, 1.25, rng.pick(TOWELS), { outline: true, w: W_FINE, grain: 0.5 });
  const b = pen.floor(0.1, 4);
  b.bar(-0.14, -0.2, -0.17, -1.0, 0.2, lk.skin);
  b.bar(0.14, -0.2, 0.17, -1.0, 0.2, lk.skin);
  b.rect(-0.32, -0.25, 0.32, 0.55, lk.top, { outline: true, w: W_FINE, layer: 1 });
  b.circle(0, 0.86, 0.3, lk.skin, { outline: true, w: W_FINE, layer: 2, seg: 9, grain: 0.4 });
  b.ellipse(0, 0.92, 0.32, 0.26, lk.hair, { layer: 3, a0: 0, a1: Math.PI, seg: 7, outline: true, w: 0.04, grain: 0.4 });
  pen.end();
  pen.pop();
}

function picnic(pen: Pen, rng: Rng, x: number, y: number): void {
  pen.obj(() => {
    const g = pen.floor(0.03, 3);
    const col = rng.pick([C.red, C.blue, C.green]);
    for (let i = 0; i < 4; i++) g.rect(x - 1.2 + i * 0.6, y - 1, x - 0.6 + i * 0.6, y + 1, i % 2 ? C.white : col, { grain: 0.5 });
    g.loop(
      [
        [x - 1.2, y - 1],
        [x + 1.2, y - 1],
        [x + 1.2, y + 1],
        [x - 1.2, y + 1],
      ],
      { w: W_FINE },
    );
    pen.box(x - 0.3, y - 0.25, 0.04, 0.6, 0.45, 0.35, C.wood, { w: W_FINE });
    person(pen, x - 0.75, y + 0.45, -0.3, randomLook(rng), "sit");
    person(pen, x + 0.7, y - 0.5, -0.3, randomLook(rng), "sit", true);
    if (rng.chance(0.6)) person(pen, x + 0.55, y + 0.65, -0.3, randomLook(rng), "sit", true, 0.7);
  });
}

function skater(pen: Pen, lk: Look, pose: Pose, flip: boolean): void {
  pen.pole([-0.48, 0, 0.07], [0.48, 0, 0.07], 0.1, C.charcoal, { ink: false });
  person(pen, 0, 0, 0.1, lk, pose, flip, 0.92);
}

function dog(pen: Pen, frame: number, coat: RGB): void {
  const legs = frame === 0 ? [0.55, 0.85, -0.55, -0.85] : [0.5, 0.3, -0.5, -0.3];
  pen.pole([0.45, 0.1, 0.55], [legs[0], 0.1, 0.05], 0.1, coat);
  pen.pole([0.45, -0.1, 0.55], [legs[1], -0.1, 0.05], 0.1, coat);
  pen.pole([-0.45, 0.1, 0.55], [legs[2], 0.1, 0.05], 0.1, coat);
  pen.pole([-0.45, -0.1, 0.55], [legs[3], -0.1, 0.05], 0.1, coat);
  pen.pole([-0.5, 0, 0.62], [0.5, 0, 0.62], 0.4, coat);
  pen.pole([0.55, 0, 0.75], [0.85, 0, 1.0], 0.3, coat);
  pen.pole([-0.6, 0, 0.75], [-0.85, 0, 1.1], 0.09, coat);
}

// ---------------------------------------------------------------- the passage and the gardens

function gardens(c: BlockCtx): void {
  const { pen, rng } = c;
  // the quartet, by the mouth of the passage where the sound carries
  const players: Look[] = [0, 1, 2, 3].map(() => {
    const lk = randomLook(rng);
    lk.top = C.white;
    lk.legs = C.black;
    lk.hat = null;
    return lk;
  });
  for (const [x, y] of QUARTET) pen.box(x - 0.24, y - 0.24, 0, 0.48, 0.48, 0.42, C.charcoal, { w: W_FINE });
  QUARTET.forEach(([x, y], i) => musician(pen, x, y, players[i], i === 3));
  // music stands, the open case for coins, and the people who have stopped
  pen.obj(() => {
    for (const [x, y] of QUARTET) {
      pen.stroke(
        [
          [x + 0.62, y + 0.05, 0],
          [x + 0.62, y + 0.05, 1.05],
        ],
        { w: 0.05, kind: L_BAR, wobble: 0 },
      );
      pen.card(x + 0.62, y + 0.05, 1.0).rect(-0.2, 0, 0.2, 0.3, C.white, { outline: true, w: 0.04, grain: 0, layer: 1 });
    }
    pen.box(20.75, 21.2, 0, 0.5, 0.95, 0.14, C.charcoal, { top: C.redDark, w: W_FINE });
  });
  // the listeners keep to the sides, and the children sit down in front, so nobody blocks the view
  for (const [x, y, s] of [
    [19.3, 17.7, 1],
    [20.2, 17.4, 1],
    [21.0, 17.9, 0.72],
    [20.9, 18.7, 1],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), false, s);
  }
  for (const [x, y] of [
    [21.1, 19.9],
    [21.15, 20.75],
    [21.1, 22.3],
  ]) {
    person(pen, x, y, -0.3, randomLook(rng), "sit", true, 0.7);
  }
  person(pen, 19.0, 25.4, 0, randomLook(rng), "stand", true);
  person(pen, 19.9, 25.45, 0, randomLook(rng), "wave", true, 0.7);

  // tulip beds in stripes down the museum front
  for (let i = 0; i < 5; i++) flowerBed(pen, rng, 19.0, 7.7 + i * 1.9, 2.2, 1.55, [TULIP[i % TULIP.length]], 3.2);
  for (let i = 0; i < 5; i++) flowerBed(pen, rng, 19.0, 31.6 + i * 1.9, 2.2, 1.55, [TULIP[(i + 2) % TULIP.length]], 3.2);
  hedge(pen, 18.75, 7.2, 2.7, 0.35, 0.5);
  hedge(pen, 18.75, 41.1, 2.7, 0.35, 0.5);

  // a bronze on a plinth, and bikes left where they should not be
  pen.obj(() => {
    pen.box(19.6, 29.7, 0, 1.1, 1.1, 0.8, C.quayCap, { w: W_THIN });
    pen.dome(20.15, 30.25, 0.8, 0.5, 0.75, hex("#6c8a74"), { seg: 10 });
    pen.cyl(20.15, 30.25, 1.5, 0.2, 0.55, hex("#6c8a74"), { seg: 7 });
  });
  bikeRow(pen, rng, 19.4, 26.3, 5, 0);
}

// ---------------------------------------------------------------- the pond and the lawns

function plein(c: BlockCtx): void {
  const { pen, rng } = c;
  // stone rim of the pond
  pen.obj(() => {
    const t = 0.36;
    const h = 0.28;
    pen.box(PX0 - t, PY0 - t, 0, PX1 - PX0 + 2 * t, t, h, C.quayCap, { w: W_THIN });
    pen.box(PX0 - t, PY1, 0, PX1 - PX0 + 2 * t, t, h, C.quayCap, { w: W_THIN });
    pen.box(PX0 - t, PY0, 0, t, PY1 - PY0, h, C.quayCap, { w: W_THIN });
    pen.box(PX1, PY0, 0, t, PY1 - PY0, h, C.quayCap, { w: W_THIN });
  });
  // a fountain in the middle
  pen.obj(() => {
    const fx = (PX0 + PX1) / 2;
    const fy = (PY0 + PY1) / 2;
    pen.cyl(fx, fy, 0.1, 0.55, 0.22, C.quayCap, { seg: 12 });
    for (let i = 0; i < 7; i++) {
      const t = (i / 7) * Math.PI * 2;
      pen.stroke(
        [
          [fx + Math.cos(t) * 0.2, fy + Math.sin(t) * 0.2, 0.32],
          [fx + Math.cos(t) * 0.55, fy + Math.sin(t) * 0.55, 1.75],
          [fx + Math.cos(t) * 1.0, fy + Math.sin(t) * 1.0, 1.25],
          [fx + Math.cos(t) * 1.25, fy + Math.sin(t) * 1.25, 0.15],
        ],
        { w: 0.075, color: C.white, kind: L_RIPPLE, wobble: 0.3, alpha: 0.95 },
      );
    }
    pen.floor(0.1, 4).ellipse(fx, fy, 1.4, 1.4, null, { ink: C.white, w: 0.07, seg: 14 });
  });
  // sitting on the rim with their feet in
  for (let i = 0; i < 9; i++) {
    const x = PX0 + 0.9 + i * 1.6 + rng.range(-0.3, 0.3);
    if (rng.chance(0.25)) continue;
    person(pen, x, PY1 + 0.12, 0.02, randomLook(rng), "sit", rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  for (let i = 0; i < 4; i++) {
    const y = PY0 + 0.9 + i * 1.6;
    person(pen, PX1 + 0.14, y, 0.02, randomLook(rng), "sit", false);
  }
  // paddlers who do not jump (the ones who do are in motion())
  for (const [x, y] of scatter(rng, PX0 + 1, PY0 + 0.9, PX1 - 1, PY1 - 0.9, 8, 1.5, (x, y) => Math.hypot(x - 32.5, y - 24) > 2)) {
    pen.obj(() => {
      const small = rng.chance(0.75);
      person(pen, x, y, small ? -0.36 : -0.5, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5), small ? 0.68 : 1);
      pen.floor(0.1, 4).ellipse(x, y, 0.62, 0.62, null, { ink: C.white, w: 0.07, seg: 10 });
    });
  }
  // toy ducks
  for (let i = 0; i < 4; i++) {
    const k = pen.card(rng.range(PX0 + 1, PX1 - 1), rng.range(PY0 + 0.6, PY1 - 0.6), 0.1, rng.chance(0.5));
    pen.obj(() => {
      k.ellipse(0, 0.14, 0.24, 0.14, C.white, { outline: true, w: 0.045, seg: 8 });
      k.circle(0.2, 0.34, 0.1, C.white, { outline: true, w: 0.04, seg: 6, layer: 1 });
      k.seg(0.28, 0.33, 0.38, 0.31, { w: 0.05, color: C.orange, kind: L_BAR, wobble: 0, layer: 2 });
    });
  }
  // visitors photographing the museum from the end of the pond
  photographer(pen, 23.9, 21.4, randomLook(rng), true);
  photographer(pen, 24.3, 26.6, randomLook(rng), true);
  person(pen, 24.2, 22.6, 0, randomLook(rng), "wave", true);
  person(pen, 23.8, 25.5, 0, randomLook(rng), "stand", true, 0.72);
  // an artist at an easel, painting the museum red
  pen.obj(() => {
    const x = 40.9;
    const y = 28.3;
    for (const [dx, dy] of [
      [-0.3, -0.25],
      [0.3, -0.25],
      [0, 0.4],
    ]) {
      pen.stroke(
        [
          [x + dx, y + dy, 0],
          [x, y, 1.7],
        ],
        { w: 0.07, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    const k = pen.card(x, y, 0.7, true);
    k.rect(-0.5, 0, 0.5, 0.95, C.white, { outline: true, w: W_FINE, grain: 0.2, layer: 2 });
    k.rect(-0.38, 0.12, 0.38, 0.5, C.brick, { layer: 3, grain: 0.2 });
    k.poly(
      [
        [-0.1, 0.5],
        [0.1, 0.5],
        [0, 0.78],
      ],
      C.slate,
      { layer: 3, grain: 0 },
    );
    const lk = randomLook(rng);
    lk.hat = C.black;
    person(pen, x + 0.75, y + 0.35, 0, lk, "wave", true);
  });

  // ---- the big lawn: towels, picnics, frisbee
  const taken: V2[] = [
    [27.4, 35.2],
    [35.6, 38.2],
  ];
  for (const [x, y] of scatter(rng, 26.8, 34, 37.6, 38.9, 7, 2.6, (x, y) => !taken.some((p) => Math.hypot(p[0] - x, p[1] - y) < 2.4) && Math.abs((y - 35.2) - ((x - 27.4) * 3) / 8.2) > 1.2)) {
    if (rng.chance(0.45)) picnic(pen, rng, x, y);
    else sunbather(pen, rng, x, y, rng.range(0, 360));
  }
  person(pen, 27.4, 35.2, 0, randomLook(rng), "cheer");
  person(pen, 35.6, 38.2, 0, randomLook(rng), "cheer", true);
  // the little lawn
  sunbather(pen, rng, 25.6, 9.4, 30);
  picnic(pen, rng, 28.2, 13.6);
  tree(pen, rng, 25.0, 15.4, { kind: "blossom" });
  tree(pen, rng, 29.3, 8.6, { kind: "round" });

  // ---- the half-pipe
  pen.obj(() => {
    const prof: V2[] = [
      [0, 0],
      [5, 0],
      [5, 1.55],
      [4.45, 1.55],
    ];
    for (let i = 1; i <= 7; i++) prof.push([4.45 - (i / 7) * 1.45, rampZ(4.45 - (i / 7) * 1.45)]);
    for (let i = 1; i <= 7; i++) prof.push([2 - (i / 7) * 1.45, rampZ(2 - (i / 7) * 1.45)]);
    prof.push([0, 1.55]);
    pen.wall("y+", RX, RY, 0, 5, 0).extrude(prof, 4, C.wood, { crease: 28 });
    for (const a of [0.55, 4.45]) {
      pen.stroke(
        [
          [RX + a, RY, 1.57],
          [RX + a, RY + 4, 1.57],
        ],
        { w: 0.12, color: C.metal, kind: L_BAR, wobble: 0 },
      );
    }
  });
  person(pen, RX + 0.28, RY + 0.8, 1.55, randomLook(rng), "stand", false, 0.9);
  person(pen, RX + 4.72, RY + 3.2, 1.55, randomLook(rng), "wave", true, 0.9);
  person(pen, RX + 2.2, RY + 4.9, 0, randomLook(rng), "sit", false, 0.9);
  person(pen, RX + 3.2, RY + 4.8, 0, randomLook(rng), "stand", true, 0.9);

  // ---- along the east edge: trees, benches, the ice-cream cart
  for (const y of [17.6, 20.4, 27.4, 30.1]) tree(pen, rng, 45.6 + rng.range(-0.4, 0.4), y, { kind: rng.pick(["round", "round", "blossom"]) });
  bench(pen, 44.6, 22.0, 90);
  bench(pen, 44.6, 26.6, 90);
  pen.obj(() => {
    const x = 45.5;
    const y = 24.2;
    pen.box(x - 0.6, y - 0.9, 0.35, 1.2, 1.8, 0.85, C.white, { top: C.pink, w: W_THIN });
    for (const dy of [-0.6, 0.6]) {
      pen.plane([x - 0.62, y + dy, 0], [0, 1, 0], [0, 0, 1], 0, true).circle(0, 0.36, 0.36, null, { w: 0.08, seg: 9, wobble: 0 });
    }
    const f = pen.wall("x+", x - 0.6, y - 0.9, 0.35, 1.2, 1.8);
    f.text("IJS", 0.9, 0.2, 0.42, { align: "c", color: C.red, w: 0.08 });
    pen.pole([x, y, 1.2], [x, y, 2.9], 0.07, C.white, { ink: false });
    pen.cone(x, y, 2.55, 1.5, 0.55, C.red, { seg: 8, crease: 0.5 });
    person(pen, x - 0.1, y + 1.3, 0, randomLook(rng), "stand", true);
    // cones on the counter
    for (const dy of [-0.5, 0, 0.5]) {
      const k = pen.card(x + 0.3, y + dy, 1.2);
      k.poly(
        [
          [-0.1, 0.25],
          [0.1, 0.25],
          [0, 0],
        ],
        C.wood,
        { grain: 0, layer: 1 },
      );
      k.circle(0, 0.34, 0.13, [C.pink, C.white, C.yellow][Math.round(dy * 2 + 1)], { outline: true, w: 0.04, seg: 7, layer: 2 });
    }
  });
  for (const [x, y, s] of [
    [46.75, 24.0, 0.68],
    [46.9, 25.0, 1],
    [46.6, 25.9, 0.68],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), s < 1 ? "cheer" : "stand", true, s);
  }

  for (const [x, y] of [
    [24.2, 19.7],
    [32.5, 19.6],
    [40.8, 19.7],
    [24.2, 28.4],
    [32.5, 28.4],
    [23.6, 31.6],
    [43.8, 31.9],
    [31.2, 17.0],
  ]) {
    lamp(pen, x, y, 0, 3.3);
  }
}

// ---------------------------------------------------------------- the Van Gogh Museum

function vanGogh(c: BlockCtx): void {
  const { pen, rng } = c;
  // the square block
  pen.obj(() => {
    pen.box(31.6, 7.4, 0, 6.6, 7.6, 6.4, CONCRETE, { top: C.stone });
    const f = pen.wall("y+", 31.6, 7.4, 0, 6.6, 7.6);
    for (const b of [0.7, 2.7, 4.7]) {
      f.rect(2.9, b, 6.3, b + 1.15, C.glass, { outline: true, w: W_FINE, glow: 0.7 });
      for (let a = 3.6; a < 6.2; a += 0.7) f.seg(a, b, a, b + 1.15, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    }
    // the banner everyone photographs
    f.rect(0.45, 0.9, 2.45, 5.7, C.yellow, { outline: true, w: W_THIN, grain: 0.5 });
    f.seg(1.45, 1.3, 1.5, 3.2, { w: 0.12, color: C.green, kind: L_MARK, wobble: 0.6, layer: 1 });
    for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2;
      f.ellipse(1.45 + Math.cos(t) * 0.52, 3.75 + Math.sin(t) * 0.52, 0.22, 0.22, C.orange, { layer: 1, seg: 6, grain: 0.2, outline: true, w: 0.03 });
    }
    f.circle(1.45, 3.75, 0.36, C.woodDark, { layer: 2, seg: 9, grain: 0.4, outline: true, w: 0.04 });
    f.text("VAN GOGH", 1.45, 4.95, 0.26, { align: "c", w: 0.055, layer: 1 });
    const g = pen.wall("x+", 31.6, 7.4, 0, 6.6, 7.6);
    for (const b of [0.7, 2.7, 4.7]) {
      g.rect(0.5, b, 7.1, b + 1.15, C.glass, { outline: true, w: W_FINE, glow: 0.7 });
      for (let a = 1.2; a < 7; a += 0.7) g.seg(a, b, a, b + 1.15, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    }
  });
  pen.obj(() => pen.box(33.3, 9.3, 6.4, 3.2, 3.6, 1.5, CONCRETE, { top: C.glassLight }), 0.2);
  // the glass hall between the two
  pen.obj(() => {
    pen.box(38.2, 9.2, 0, 2.3, 4.6, 3.6, C.glassPale, { top: C.white, w: W_THIN, glow: 0.6, grain: 0.5 });
    const f = pen.wall("y+", 38.2, 9.2, 0, 2.3, 4.6);
    for (let a = 0.55; a < 2.2; a += 0.55) f.seg(a, 0.05, a, 3.55, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0 });
    f.rect(0.7, 0, 1.6, 2.0, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 0.8 });
  }, 0.1);
  // the round wing
  pen.obj(() => {
    const foot: V2[] = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      foot.push([43.5 + Math.cos(t) * 3.3, 11.3 + Math.sin(t) * 3.7]);
    }
    pen.extrude(foot, 0, 4.8, TITAN, { crease: 30, top: scaleRGB(TITAN, 1.08) });
    const slit: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = -0.5 + (i / 10) * (Math.PI + 0.1);
      slit.push([43.5 + Math.cos(t) * 3.33, 11.3 + Math.sin(t) * 3.73, 3.4]);
    }
    pen.stroke(slit, { w: 0.42, color: C.glass, kind: L_MARK, wobble: 0.2 });
    // a shallow tilted lid
    const lid: V2[] = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      lid.push([43.5 + Math.cos(t) * 2.5, 11.3 + Math.sin(t) * 2.9]);
    }
    pen.extrude(lid, 4.8, 5.25, scaleRGB(TITAN, 0.92), { crease: 30, top: TITAN });
  }, 0.15);
  // the queue
  for (let i = 0; i < 11; i++) {
    const x = 32.2 + i * 0.82;
    person(pen, x, 16.2 + (i % 2) * 0.28, 0, randomLook(rng), i % 4 === 3 ? "wave" : "stand", i % 3 === 0, rng.chance(0.15) ? 0.72 : 1);
  }
  tree(pen, rng, 46.4, 16.0, { kind: "round" });
}

// ---------------------------------------------------------------- everything that moves

function motion(c: BlockCtx): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;

  // ---- cyclists: in through the passage, round the pond, and out again
  const outer: V3[] = [W(7.0, 23.55), W(22.0, 23.55), W(22.0, 17.8), W(43.0, 17.8), W(43.0, 30.2), W(22.0, 30.2), W(22.0, 24.45), W(7.0, 24.45)];
  const inner: V3[] = [W(7.0, 23.55), W(22.8, 23.55), W(22.8, 29.4), W(42.2, 29.4), W(42.2, 18.6), W(22.8, 18.6), W(22.8, 24.45), W(7.0, 24.45)];
  const r1 = new Route(rounded(outer, true, 0.9), true);
  const r2 = new Route(rounded(inner, true, 0.9), true);
  for (let i = 0; i < 5; i++) c.movers.push(cyclist(r1, rng, born + rng.range(0, 1.2), rng.range(3.6, 4.6), (i + rng.range(0, 0.5)) / 5));
  for (let i = 0; i < 4; i++) c.movers.push(cyclist(r2, rng, born + rng.range(0, 1.2), rng.range(3.6, 4.6), (i + rng.range(0, 0.5)) / 4));

  // ---- the quartet's bows
  const bow = makeSprite(
    (p) => {
      p.card(0, 0, 0).seg(-0.42, -0.08, 0.42, 0.1, { w: 0.045, color: C.woodDark, kind: L_BAR, wobble: 0, layer: 7 });
    },
    0,
    5,
  );
  const bows: [number, number, number, number][] = QUARTET.map(([x, y], i) => [x, y, i === 3 ? 0.95 : 1.62, i * 1.3]);
  c.movers.push((m) => {
    if (!m.sees(c.ox + 19.3, c.oy + 20.7, 1, 6)) return;
    for (const [x, y, z, ph] of bows) {
      const d = Math.sin(m.t * 4.2 + ph) * 0.2;
      m.put(bow, c.ox + x + 0.2 + d * 0.577, c.oy + y - 0.2 - d * 0.577, c.oz + z, born);
    }
  });

  // ---- the school crocodile, two by two round the lawn
  const lane = (o: number): V3[] => [W(25.2 - o, 32.6 - o), W(39.0 + o, 32.6 - o), W(39.0 + o, 40.2 + o), W(25.2 - o, 40.2 + o)];
  const la = new Route(rounded(lane(0.28), true, 1.3), true);
  const lb = new Route(rounded(lane(-0.28), true, 1.3), true);
  const vest = hex("#f2e23a");
  const teacher: Look = { ...randomLook(new Rng(7)), top: C.teal };
  const kinds = [castWalker(teacher, 301, 1.001)];
  for (let i = 0; i < 8; i++) kinds.push(castWalker({ ...randomLook(new Rng(310 + i)), top: vest }, 310 + i, 0.68));
  kinds.push(castWalker({ ...randomLook(new Rng(9)), top: C.teal }, 302, 1.001));
  const v = 1.15;
  kinds.forEach((kind, i) => {
    const row = i === 0 ? 0 : i === 9 ? 5.2 : Math.floor((i - 1) / 2) + 1;
    const route = i === 0 || i === 9 || i % 2 === 1 ? la : lb;
    c.movers.push(
      traveler(route, {
        // both lanes take the same time for a lap, so pairs stay side by side
        speed: (v * route.length) / la.length,
        at: 0.2 - (row * 1.05) / la.length,
        born,
        span: 0.8,
        sprite: (h, t) => kind.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.8 + i * 0.5) & 1],
      }),
    );
  });

  // ---- frisbee, and the dog who thinks it is his
  const A: V3 = W(27.4, 35.2);
  const B: V3 = W(35.6, 38.2);
  const disc = makeSprite((p) => p.cyl(0, 0, 0, 0.3, 0.06, C.red, { seg: 9, w: 0.05 }), 0, 9);
  const coat = hex("#c79a5e");
  const dogs = [new Turning((p) => dog(p, 0, coat), 16, 14), new Turning((p) => dog(p, 1, coat), 16, 14)];
  const hd = Math.atan2(B[1] - A[1], B[0] - A[0]);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(A[0], A[1], 1, 16)) return;
    const u = (m.t % 5.6) / 5.6;
    // out for 2.3 s, held, back for 2.3 s, held
    const leg = u < 0.5 ? Math.min(1, (u * 5.6) / 2.3) : 1 - Math.min(1, ((u - 0.5) * 5.6) / 2.3);
    const s = leg * leg * (3 - 2 * leg);
    const flying = leg > 0.001 && leg < 0.999;
    m.put(disc, A[0] + (B[0] - A[0]) * s + 0.35, A[1] + (B[1] - A[1]) * s - 0.35, 1.45 + (flying ? Math.sin(leg * Math.PI) * 2.0 : 0.25), born);
    // the dog runs a beat behind, a little to one side
    const lu = (((m.t - 0.45) % 5.6) + 5.6) % 5.6 / 5.6;
    const dl = lu < 0.5 ? Math.min(1, (lu * 5.6) / 2.3) : 1 - Math.min(1, ((lu - 0.5) * 5.6) / 2.3);
    const ds = 0.12 + 0.76 * (dl * dl * (3 - 2 * dl));
    const moving = dl > 0.02 && dl < 0.98;
    m.put(
      dogs[moving ? Math.floor(m.t * 7) & 1 : 1].at(lu < 0.5 ? hd : hd + Math.PI),
      A[0] + (B[0] - A[0]) * ds + 0.9,
      A[1] + (B[1] - A[1]) * ds + 0.9,
      0,
      born,
    );
  });

  // ---- the skater in the half-pipe
  const sk: Look = { ...randomLook(new Rng(41)), top: C.purple, hat: C.red };
  const skF = [
    [makeSprite((p) => skater(p, sk, "wave", false), 0, 43), makeSprite((p) => skater(p, sk, "cheer", false), 0, 43)],
    [makeSprite((p) => skater(p, sk, "wave", true), 0, 43), makeSprite((p) => skater(p, sk, "cheer", true), 0, 43)],
  ];
  c.movers.push((m) => {
    const ph = m.t * 1.7;
    const s = Math.sin(ph);
    const a = 2.5 + 2.12 * s;
    const top = Math.abs(s) > 0.94;
    const air = top ? (Math.abs(s) - 0.94) * 9 : 0;
    const y = RY + 2 + Math.sin(m.t * 0.31) * 1.1;
    m.put(skF[Math.cos(ph) > 0 ? 0 : 1][top ? 1 : 0], c.ox + RX + a, c.oy + y, c.oz + rampZ(a) + air, born);
  });

  // ---- on the pond: children who cannot stop jumping, and three toy yachts
  const jr = new Rng(63);
  const hop: { x: number; y: number; up: Sprite; down: Sprite; ph: number; w: number }[] = [];
  for (const [x, y] of scatter(jr, PX0 + 1.2, PY0 + 1, PX1 - 1.2, PY1 - 1, 4, 3, (x, y) => Math.hypot(x - 32.5, y - 24) > 2.2)) {
    const lk = randomLook(jr);
    hop.push({
      x: c.ox + x,
      y: c.oy + y,
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "cheer", false, 0.68), 0, 70),
      down: makeSprite((p) => person(p, 0, 0, 0, lk, "stand", false, 0.68), 0, 70),
      ph: jr.range(0, 6.28),
      w: jr.range(3.4, 4.6),
    });
  }
  const yacht = (col: RGB) =>
    makeSprite(
      (p) => {
        p.box(-0.35, -0.12, 0, 0.7, 0.24, 0.14, col, { w: 0.05 });
        p.stroke(
          [
            [0, 0, 0.14],
            [0, 0, 0.95],
          ],
          { w: 0.04, kind: L_BAR, wobble: 0 },
        );
        p.card(0, 0, 0.2).poly(
          [
            [0.04, 0],
            [0.04, 0.72],
            [0.46, 0.05],
          ],
          C.white,
          { outline: true, w: 0.04, grain: 0.2 },
        );
      },
      0,
      77,
    );
  const yachts = [yacht(C.red), yacht(C.blue), yacht(C.yellow)];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 32.5, c.oy + 24, 0, 14)) return;
    for (const h of hop) {
      const s = Math.sin(m.t * h.w + h.ph);
      m.put(s > 0.2 ? h.up : h.down, h.x, h.y, c.oz - 0.36 + Math.max(0, s) * 0.4, born);
    }
    yachts.forEach((s, i) => {
      const x = 28 + i * 4.2 + Math.sin(m.t * 0.21 + i * 2.1) * 1.8;
      const y = 22.2 + i * 1.6 + Math.sin(m.t * 0.13 + i) * 0.7;
      m.put(s, c.ox + x, c.oy + y, c.oz + 0.1, born);
    });
  });

  // ---- a turn round the pond on foot
  const stroll: V3[] = [W(24.1, 19.7), W(40.9, 19.7), W(40.9, 28.3), W(24.1, 28.3)];
  const s1 = new Route(rounded(stroll, true, 0.8), true);
  const s2 = new Route(rounded(stroll.slice().reverse(), true, 0.8), true);
  for (let i = 0; i < 3; i++) c.movers.push(walker(s1, rng, born + rng.range(0, 1)));
  for (let i = 0; i < 3; i++) c.movers.push(walker(s2, rng, born + rng.range(0, 1)));
  const front: V3[] = [W(21.0, 8), W(21.25, 8), W(21.25, 40.6), W(21.0, 40.6)];
  const s3 = new Route(front, true);
  for (let i = 0; i < 4; i++) c.movers.push(walker(s3, rng, born + rng.range(0, 1)));
}

export const rijks: BlockBuilder = (c) => {
  c.early(() => ground(c));
  museum(c);
  gardens(c);
  plein(c);
  vanGogh(c);
  motion(c);
  // look a little towards the square rather than at the museum's roof
  c.focus(26, 24);
};
