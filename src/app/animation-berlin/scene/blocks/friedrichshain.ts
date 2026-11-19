// Friedrichshain: the East Side Gallery, the longest piece of the Wall still
// standing, painted from end to end, with the Spree behind it; the twin domed
// towers of the Frankfurter Tor at the back; Berghain in its corner, grey and
// windowless, with its queue all in black; and between them the RAW grounds:
// graffitied sheds, a bunker people climb, a half-pipe, a flea market, food
// trucks, a beer garden, and a street of bars with every table taken.
//
// The river is the block's west edge (local x = 0), so the Wall runs north to
// south just inside it and shows the camera its painted, eastern face. The
// Oberbaumbrücke lands at the south-west corner and the U1's terminus stands
// just beyond the south edge: both are the city's, and so is the yellow train.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { altbauRow, bierbank, dog, picnic, queue, tags } from "../berlin";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, bike, bikeRow, cafeTable, person, railing, randomLook, stall, windowGrid } from "../kit";
import { Route, cyclist, makeSprite, rounded, walker } from "../motion";
import { C, GRAFFITI, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;

function stroll(c: BlockCtx, pts: V2[], r = 1.0): Route {
  return new Route(
    rounded(
      pts.map((p) => [c.ox + p[0], c.oy + p[1], c.oz] as V3),
      true,
      r,
    ),
    true,
  );
}

/** A string of bulbs from post to post: small yellow dots by day, light at night. */
function bulbs(pen: Pen, pts: V3[], sag = 0.5, posts = true): void {
  pen.begin();
  if (posts) for (const p of pts) pen.pole([p[0], p[1], 0], p, 0.1, C.greyDark);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85));
    const wire: V3[] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      wire.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]);
    }
    pen.stroke(wire, { w: 0.04, kind: L_BAR, wobble: 0 });
    for (let k = 1; k < n; k++) {
      const p = wire[k];
      pen.stroke(
        [
          [p[0], p[1], p[2] - 0.1],
          [p[0], p[1], p[2] - 0.2],
        ],
        { w: 0.15, color: C.yellow, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [p[0], p[1], p[2] - 0.12],
          [p[0], p[1], p[2] - 0.2],
        ],
        { w: 0.36, kind: L_LIGHT, wobble: 0, alpha: 0.9 },
      );
    }
  }
  pen.end();
}

// ---------------------------------------------------------------- the East Side Gallery

/** Where a mural's own coordinates start on its piece of wall: a little in from the joint, above the bare foot. */
const X = (x: number) => 0.08 + x;
const Y = (y: number) => 0.3 + y;

type Mural = (f: Plane, w: number, h: number) => void;

function ground(f: Plane, w: number, h: number, rgb: RGB): void {
  f.rect(X(0), Y(0), X(w), Y(h), rgb, { grain: 0.6 });
}

/** A dove, as a child would paint one: a body, a head, one wing up. */
function dove(f: Plane, a: number, b: number, s: number, dir: number): void {
  f.poly(
    [
      [a - 0.1 * s * dir, b + 0.08 * s],
      [a - 0.5 * s * dir, b + 0.78 * s],
      [a + 0.22 * s * dir, b + 0.18 * s],
    ],
    C.white,
    { outline: true, w: W_FINE, layer: 1 },
  );
  f.poly(
    [
      [a - 0.36 * s * dir, b + 0.05 * s],
      [a - 0.78 * s * dir, b + 0.2 * s],
      [a - 0.74 * s * dir, b - 0.12 * s],
    ],
    C.white,
    { outline: true, w: W_FINE, layer: 1 },
  );
  f.ellipse(a, b, 0.42 * s, 0.2 * s, C.white, { outline: true, w: W_FINE, layer: 2, seg: 10 });
  f.circle(a + 0.42 * s * dir, b + 0.14 * s, 0.14 * s, C.white, { outline: true, w: W_FINE, layer: 3, seg: 8 });
  f.seg(a + 0.54 * s * dir, b + 0.14 * s, a + 0.7 * s * dir, b + 0.1 * s, { w: 0.07, color: C.orange, kind: L_MARK, wobble: 0, layer: 3 });
}

/** A word, a colour to each letter. */
function letters(f: Plane, word: string, a: number, b: number, size: number, cols: RGB[], w = 0.15): void {
  const adv = (size / 6) * 5.5;
  word.split("").forEach((ch, i) => f.text(ch, a + i * adv, b + (i % 2) * size * 0.2, size, { color: cols[i % cols.length], kind: L_MARK, w, wobble: 0.4, layer: 2 }));
}

/**
 * Ten paintings, south to north. None is a copy of anything on the real
 * wall; all of them are the kind of thing that is: birds, hands, a sun, big
 * words in bright letters.
 */
const MURALS: Mural[] = [
  // the city's name, and paw prints across the bottom
  (f, w, h) => {
    ground(f, w, h, C.yellow);
    letters(f, "BERLIN", X(0.22), Y(1.25), 0.62, [C.red, C.blue, C.green, C.purple, C.orange, C.teal]);
    for (let k = 0; k < 4; k++) f.circle(X(0.5 + k * 0.76), Y(0.42 + (k % 2) * 0.22), 0.15, C.black, { layer: 1, seg: 7, grain: 0.3 });
  },
  // doves
  (f, w, h) => {
    ground(f, w, h, C.sky);
    dove(f, X(0.95), Y(2.15), 1, 1);
    dove(f, X(2.35), Y(1.5), 0.85, -1);
    dove(f, X(1.25), Y(0.7), 0.7, 1);
    f.line(
      [
        [X(1.55), Y(2.25)],
        [X(1.95), Y(2.4)],
        [X(2.2), Y(2.3)],
      ],
      { w: 0.07, color: C.green, kind: L_MARK, wobble: 0.3, layer: 4 },
    );
  },
  // a sun coming up over the water, smiling
  (f, w, h) => {
    ground(f, w, h, C.orange);
    f.rect(X(0), Y(0), X(w), Y(0.75), C.blue, { layer: 1, grain: 0.5 });
    const cx = X(w / 2);
    const cy = Y(1.8);
    f.circle(cx, cy, 0.72, C.yellow, { outline: true, w: W_FINE, layer: 2, seg: 14 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      f.seg(cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9, cx + Math.cos(a) * 1.24, cy + Math.sin(a) * 1.24, { w: 0.13, color: C.yellow, kind: L_MARK, wobble: 0.3, layer: 2 });
    }
    f.arc(cx, cy + 0.02, 0.38, 0.32, Math.PI * 1.15, Math.PI * 1.85, { w: 0.08, layer: 3, seg: 6 });
    for (const e of [-0.24, 0.24]) f.seg(cx + e, cy + 0.14, cx + e, cy + 0.28, { w: 0.09, wobble: 0, layer: 3 });
  },
  // two hands reaching, a heart between them
  (f, w, h) => {
    ground(f, w, h, C.pink);
    const tones: RGB[] = [
      [246, 211, 184],
      [168, 114, 76],
    ];
    for (const s of [0, 1]) {
      const m = (x: number) => (s ? X(w - x) : X(x));
      f.poly(
        [
          [m(0), Y(0.35)],
          [m(1.0), Y(1.2)],
          [m(1.32), Y(1.38)],
          [m(1.2), Y(1.62)],
          [m(0.86), Y(1.48)],
          [m(0), Y(1.0)],
        ],
        tones[s],
        { outline: true, w: W_FINE, layer: 1 },
      );
    }
    const cx = X(w / 2);
    for (const o of [-0.27, 0.27]) f.circle(cx + o, Y(2.35), 0.31, C.red, { layer: 2, seg: 10 });
    f.poly(
      [
        [cx - 0.57, Y(2.24)],
        [cx + 0.57, Y(2.24)],
        [cx, Y(1.6)],
      ],
      C.red,
      { layer: 2 },
    );
  },
  // a rainbow with a cloud at each foot
  (f, w, h) => {
    ground(f, w, h, C.white);
    const cols = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
    cols.forEach((col, i) => f.arc(X(w / 2), Y(0.6), 1.42 - i * 0.17, 1.95 - i * 0.2, 0, Math.PI, { w: 0.17, color: col, kind: L_MARK, wobble: 0.2, layer: 1, seg: 12 }));
    for (const x of [0.5, w - 0.5]) {
      f.ellipse(X(x), Y(0.55), 0.5, 0.3, C.glassPale, { outline: true, w: W_FINE, layer: 2, seg: 10 });
      f.circle(X(x + 0.2), Y(0.78), 0.26, C.glassPale, { outline: true, w: W_FINE, layer: 2, seg: 8 });
    }
  },
  // two enormous eyes
  (f, w, h) => {
    ground(f, w, h, C.teal);
    for (const cx of [0.85, w - 0.85]) {
      f.ellipse(X(cx), Y(1.6), 0.68, 0.48, C.white, { outline: true, w: W_THIN, layer: 1, seg: 14 });
      f.circle(X(cx + 0.08), Y(1.58), 0.3, C.blue, { layer: 2, seg: 10 });
      f.circle(X(cx + 0.1), Y(1.58), 0.14, C.black, { layer: 3, seg: 8, grain: 0 });
      for (let k = 0; k < 5; k++) {
        const a = 0.5 + (k / 4) * (Math.PI - 1.0);
        f.seg(X(cx) + Math.cos(a) * 0.68, Y(1.6) + Math.sin(a) * 0.5, X(cx) + Math.cos(a) * 0.9, Y(1.6) + Math.sin(a) * 0.72, { w: 0.07, wobble: 0, layer: 2 });
      }
      f.arc(X(cx), Y(2.45), 0.6, 0.2, 0.3, Math.PI - 0.3, { w: 0.13, color: C.black, kind: L_MARK, wobble: 0.3, layer: 2, seg: 6 });
    }
  },
  // FREIHEIT, in every colour, on black
  (f, w, h) => {
    ground(f, w, h, C.charcoal);
    letters(f, "FREIHEIT", X(0.13), Y(1.3), 0.46, [C.yellow, C.pink, C.sky, C.orange, C.grassLight, C.white, C.lilac, C.red], 0.13);
    for (const [x, y] of [
      [0.5, 2.5],
      [2.7, 2.6],
      [1.6, 0.5],
      [2.9, 0.6],
    ]) {
      f.seg(X(x - 0.16), Y(y), X(x + 0.16), Y(y), { w: 0.07, color: C.yellow, kind: L_MARK, wobble: 0, layer: 2 });
      f.seg(X(x), Y(y - 0.16), X(x), Y(y + 0.16), { w: 0.07, color: C.yellow, kind: L_MARK, wobble: 0, layer: 2 });
    }
  },
  // five round faces
  (f, w, h) => {
    ground(f, w, h, C.ochre);
    const faces: [number, number, RGB][] = [
      [0.6, 2.2, C.pink],
      [1.65, 2.32, C.sky],
      [2.7, 2.15, C.grassLight],
      [1.12, 0.95, C.orange],
      [2.2, 0.9, C.lilac],
    ];
    for (const [x, y, col] of faces) {
      f.circle(X(x), Y(y), 0.45, col, { outline: true, w: W_THIN, layer: 1, seg: 12 });
      for (const e of [-0.16, 0.16]) f.seg(X(x + e), Y(y + 0.06), X(x + e), Y(y + 0.18), { w: 0.09, wobble: 0, layer: 2 });
      f.arc(X(x), Y(y - 0.02), 0.22, 0.2, Math.PI * 1.15, Math.PI * 1.85, { w: 0.07, layer: 2, seg: 5 });
    }
  },
  // tulips, and LOVE over them
  (f, w, h) => {
    ground(f, w, h, C.green);
    [0.5, 1.2, 1.95, 2.75].forEach((x, k) => {
      f.seg(X(x), Y(0.05), X(x), Y(1.0), { w: 0.09, color: C.leafDark, kind: L_MARK, wobble: 0.3, layer: 1 });
      f.poly(
        [
          [X(x - 0.22), Y(1.0)],
          [X(x + 0.22), Y(1.0)],
          [X(x + 0.3), Y(1.5)],
          [X(x + 0.1), Y(1.3)],
          [X(x), Y(1.55)],
          [X(x - 0.1), Y(1.3)],
          [X(x - 0.3), Y(1.5)],
        ],
        TULIP[k],
        { outline: true, w: W_FINE, layer: 2 },
      );
    });
    letters(f, "LOVE", X(0.52), Y(2.08), 0.66, [C.white], 0.16);
  },
  // PEACE, over a crowd dancing to a tune
  (f, w, h) => {
    ground(f, w, h, C.red);
    for (const [x, y] of [
      [0.3, 1.62],
      [2.95, 1.55],
    ]) {
      f.ellipse(X(x), Y(y), 0.13, 0.09, C.yellow, { layer: 1, seg: 7, grain: 0.2 });
      f.seg(X(x + 0.11), Y(y), X(x + 0.11), Y(y + 0.42), { w: 0.06, color: C.yellow, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(X(x + 0.11), Y(y + 0.42), X(x + 0.28), Y(y + 0.3), { w: 0.07, color: C.yellow, kind: L_MARK, wobble: 0, layer: 1 });
    }
    for (let k = 0; k < 5; k++) {
      const x = X(0.42 + k * 0.6);
      const up = k % 2 ? 0.08 : 0;
      f.circle(x, Y(1.28 + up), 0.14, C.black, { layer: 1, seg: 7, grain: 0.2 });
      f.seg(x, Y(1.12 + up), x, Y(0.6 + up), { w: 0.13, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(x, Y(1.02 + up), x - 0.24, Y(1.42 + up), { w: 0.08, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(x, Y(1.02 + up), x + 0.24, Y(1.42 + up), { w: 0.08, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(x, Y(0.6 + up), x - 0.17, Y(0.12), { w: 0.09, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
      f.seg(x, Y(0.6 + up), x + 0.17, Y(0.12), { w: 0.09, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
    }
    letters(f, "PEACE", X(0.42), Y(2.1), 0.56, [C.white], 0.15);
  },
];

/** The Wall: concrete segments with the round pipe along the top, and a painting on every one. */
function gallery(c: BlockCtx, x0: number, y0: number, y1: number): void {
  const { pen } = c;
  const th = 0.3;
  const H = 3.6;
  const n = MURALS.length;
  const pw = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const s = y1 - i * pw;
    pen.obj(() => {
      pen.box(x0, s - pw, 0, th, pw, H, C.concrete);
      pen.pole([x0 + th / 2, s - pw, H + 0.12], [x0 + th / 2, s, H + 0.12], 0.44, C.concrete);
      const f = pen.wall("x+", x0, s - pw, 0, th, pw);
      MURALS[i](f, pw - 0.16, 3.1);
      // the joints between the slabs it was put up in
      for (const a of [pw / 3, (2 * pw) / 3]) f.seg(a, 0.05, a, H - 0.05, { w: 0.035, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 5, alpha: 0.5 });
      f.seg(0.01, 0.02, 0.01, H, { w: 0.05, layer: 5 });
    });
  }
}

// ---------------------------------------------------------------- the back of the block

/** One tower of the Frankfurter Tor: eight floors of flats in cream tiles, and on top a drum of columns under a copper dome. */
function frankfurterTor(c: BlockCtx, x0: number, y0: number): void {
  const { pen, rng } = c;
  const w = 8;
  const h = 13.2;
  const tile = hex("#eadcb8");
  pen.obj(() => {
    pen.box(x0, y0, 0, w, w, h, tile);
    for (const sd of ["y+", "x+"] as const) {
      const f = pen.wall(sd, x0, y0, 0, w, w);
      f.rect(0, 0, w, 3.0, C.sandstone, { grain: 0.6 });
      f.rect(0, 3.0, w, 3.3, C.sandstoneLight, { grain: 0.4, layer: 1 });
      for (let k = 0; k < 4; k++) f.rect(0.5 + k * 1.85, 0.5, 1.95 + k * 1.85, 2.5, C.glassLight, { outline: true, w: W_FINE, glow: 0.8, layer: 1 });
      windowGrid(f, rng, 0.4, 3.6, w - 0.4, 11.0, 5, 4, { lit: 0.6, trim: C.white, fillA: 0.56, fillB: 0.62 });
      // the top floor: a loggia behind a row of little columns
      f.rect(0.3, 11.2, w - 0.3, 12.7, scaleRGB(tile, 0.62), { layer: 1, grain: 0.6, glow: 0.25 });
      for (let k = 0; k <= 9; k++) {
        const a = 0.3 + (k * (w - 0.6)) / 9;
        f.seg(a, 11.2, a, 12.7, { w: 0.17, color: C.sandstoneLight, kind: L_MARK, wobble: 0, layer: 2 });
      }
      f.rect(0, 12.7, w, h, C.sandstoneLight, { grain: 0.4, layer: 1 });
      f.seg(0, 12.7, w, 12.7, { w: 0.05, layer: 2 });
      f.seg(0, 11.2, w, 11.2, { w: 0.05, layer: 2 });
    }
  });
  const cx = x0 + w / 2;
  const cy = y0 + w / 2;
  pen.obj(() => {
    pen.box(cx - 2.9, cy - 2.9, h, 5.8, 5.8, 1.8, tile, { top: C.stone });
    for (const sd of ["y+", "x+"] as const) {
      const f = pen.wall(sd, cx - 2.9, cy - 2.9, h, 5.8, 5.8);
      for (let k = 0; k < 3; k++) f.rect(0.7 + k * 1.6, 0.4, 1.9 + k * 1.6, 1.4, C.glass, { outline: true, w: W_FINE, glow: rng.chance(0.6) ? 1 : 0 });
    }
  }, 0.16);
  pen.obj(() => {
    pen.cyl(cx, cy, h + 1.8, 2.2, 3.2, tile, { seg: 14 });
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const px = cx + Math.cos(a) * 2.45;
      const py = cy + Math.sin(a) * 2.45;
      pen.pole([px, py, h + 1.8], [px, py, h + 4.95], 0.24, C.sandstoneLight);
    }
    pen.cyl(cx, cy, h + 4.95, 2.75, 0.35, C.sandstoneLight, { seg: 14 });
  }, 0.28);
  pen.obj(() => pen.dome(cx, cy, h + 5.3, 2.5, 3.0, C.copper, { seg: 14, rings: 4 }), 0.4);
  pen.obj(() => {
    pen.cyl(cx, cy, h + 8.2, 0.55, 1.2, tile, { seg: 8 });
    pen.cone(cx, cy, h + 9.4, 0.72, 0.9, C.copper, { seg: 8 });
    pen.pole([cx, cy, h + 10.3], [cx, cy, h + 11.6], 0.07, C.gold, { ink: false });
  }, 0.5);
}

/** Berghain: an old power station, all wall. Returns where its tall windows are (world points at their feet). */
function berghain(c: BlockCtx, x0: number, y0: number, w: number, d: number, h: number, doorA: number): V3[] {
  const { pen } = c;
  const slits: V3[] = [];
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.concreteDark, { top: C.concrete });
    for (const sd of ["y+", "x+"] as const) {
      const f = pen.wall(sd, x0, y0, 0, w, d);
      const len = sd === "y+" ? w : d;
      // a plinth, corner piers and a heavy cornice in paler concrete
      f.rect(0, 0, len, 1.2, scaleRGB(C.concreteDark, 0.86), { grain: 0.8 });
      for (const a of [0, len - 0.7]) f.rect(a, 1.2, a + 0.7, h - 1.3, C.concrete, { grain: 0.7, layer: 1 });
      f.rect(0, h - 1.3, len, h, C.concrete, { grain: 0.7, layer: 1 });
      f.seg(0, h - 1.3, len, h - 1.3, { w: 0.06, layer: 2 });
      f.ticks(0.9, 1.5, len - 0.9, h - 1.6, { n: 24, len: 1.7, ang: Math.PI / 2, jit: 0.04, color: scaleRGB(C.concreteDark, 0.87), w: 0.06 });
      // four very tall, very thin windows
      for (let k = 0; k < 4; k++) {
        const a = 1.35 + (k * (len - 2.7 - 0.55)) / 3;
        f.rect(a, 3.5, a + 0.55, h - 2.5, C.charcoal, { outline: true, w: W_FINE, layer: 1, grain: 0.5 });
        for (let b = 4.7; b < h - 2.7; b += 1.25) f.seg(a, b, a + 0.55, b, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 2 });
        slits.push(sd === "y+" ? [c.ox + x0 + a + 0.275, c.oy + y0 + d + 0.06, c.oz] : [c.ox + x0 + w + 0.06, c.oy + y0 + d - a - 0.275, c.oz]);
      }
    }
    // the door: low, unmarked, in the south wall
    const f = pen.wall("y+", x0, y0, 0, w, d);
    f.rect(doorA, 0, doorA + 1.3, 2.5, C.black, { outline: true, w: W_THIN, layer: 2 });
    f.rect(doorA - 0.2, 2.5, doorA + 1.5, 2.72, C.concrete, { layer: 2, outline: true, w: W_FINE });
  });
  pen.obj(() => pen.box(x0 + 1.6, y0 + 1.6, h, w - 3.2, d - 3.2, 2.0, C.concreteDark, { top: C.concrete }), 0.2);
  return slits;
}

// ---------------------------------------------------------------- the RAW grounds

/** Paint on every surface: big shapes in two colours, a word in fat white letters, and tags over the lot. */
function sprayed(f: Plane, rng: Rng, len: number, H: number, word?: string): void {
  const n = Math.max(2, Math.round(len / 3.0));
  for (let k = 0; k < n; k++) {
    const a = 0.25 + (k * (len - 0.5)) / n + rng.range(0, 0.3);
    const ww = Math.min(rng.range(1.5, 2.5), len - a - 0.2);
    if (ww < 0.8) continue;
    const b0 = rng.range(0.2, 0.5);
    const hh = rng.range(1.3, Math.max(1.4, Math.min(2.5, H - 0.8)));
    const pts: V2[] = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      pts.push([a + ww / 2 + Math.cos(t) * (ww / 2) * rng.range(0.85, 1.1), b0 + hh / 2 + Math.sin(t) * (hh / 2) * rng.range(0.8, 1.05)]);
    }
    f.poly(pts, rng.pick(GRAFFITI), { outline: true, w: 0.1, layer: 1, grain: 0.5 });
    const cx = a + ww / 2;
    const cy = b0 + hh / 2;
    f.poly(
      [
        [cx - ww * 0.28, cy - hh * 0.2],
        [cx + ww * 0.1, cy - hh * 0.3],
        [cx + ww * 0.3, cy + hh * 0.1],
        [cx - ww * 0.05, cy + hh * 0.28],
      ],
      rng.pick(GRAFFITI),
      { outline: true, w: 0.07, layer: 2, grain: 0.5 },
    );
  }
  if (word) {
    const size = Math.min(1.5, ((len - 1.4) / word.length / 5.5) * 6, H - 1.2);
    f.text(word, len / 2 + 0.07, H * 0.3 - 0.07, size, { align: "c", color: C.black, kind: L_MARK, w: 0.3, wobble: 0.5, layer: 3 });
    f.text(word, len / 2, H * 0.3, size, { align: "c", color: C.white, kind: L_MARK, w: 0.22, wobble: 0.5, layer: 4 });
  }
  tags(f, rng, 0.2, len - 0.2, 0.25, Math.min(2.7, H - 0.3), Math.round(len * 0.8));
}

/** A low brick workshop of the old railway works under a saw-tooth roof, its north lights turned to the camera. */
function shed(c: BlockCtx, x0: number, y0: number, w: number, d: number, H: number, teeth: number, word: string): void {
  const { pen, rng } = c;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, H, C.brick);
    for (const sd of ["y+", "x+"] as const) {
      const f = pen.wall(sd, x0, y0, 0, w, d);
      const len = sd === "y+" ? w : d;
      f.ticks(0.2, 0.2, len - 0.2, H - 0.2, { n: Math.round(len * H * 0.32), len: 0.5, ang: 0, jit: 0.02, color: C.brickDark, w: 0.055 });
      // a roller shutter, half up
      const da = sd === "y+" ? len * 0.62 : len * 0.2;
      f.rect(da, 0, da + 2.0, 2.4, C.zinc, { outline: true, w: W_THIN, layer: 1 });
      f.rect(da + 0.1, 0, da + 1.9, 1.1, C.charcoal, { layer: 2, glow: 0.5 });
      for (let b = 1.3; b < 2.4; b += 0.28) f.seg(da + 0.05, b, da + 1.95, b, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 2 });
      sprayed(f, rng, len, H, sd === "y+" ? word : undefined);
    }
  });
  const tw = w / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = x0 + k * tw;
    pen.obj(
      () => {
        pen.solid(
          [
            [a, y0, H],
            [a + tw, y0, H],
            [a + tw, y0, H + 1.4],
            [a, y0 + d, H],
            [a + tw, y0 + d, H],
            [a + tw, y0 + d, H + 1.4],
          ],
          [
            [0, 2, 5, 3],
            [1, 4, 5, 2],
            [3, 5, 4],
            [0, 1, 2],
          ],
          [C.zinc, C.glassPale, C.brick, C.brick],
        );
        const g = pen.wall("x+", a, y0, H, tw, d);
        g.rect(0.2, 0.18, d - 0.2, 1.22, C.glassPale, { outline: true, w: W_FINE, glow: 0.45, grain: 0.4 });
        for (let q = 1; q < 6; q++) g.seg(0.2 + (q * (d - 0.4)) / 6, 0.18, 0.2 + (q * (d - 0.4)) / 6, 1.22, { w: 0.05, color: C.greyDark, kind: L_MARK, wobble: 0, layer: 1 });
      },
      0.14 + k * 0.05,
    );
  }
}

/**
 * A Späti in a kiosk: open late, a fridge of beer glowing inside, crates
 * stacked outside and a bench where the evening gets spent.
 */
function spaeti(c: BlockCtx, x: number, y: number): void {
  const { pen, rng } = c;
  const w = 4.3;
  const d = 3.4;
  const h = 3.0;
  pen.obj(() => {
    pen.box(x, y, 0, w, d, h, C.cream, { top: C.zinc });
    pen.box(x - 0.25, y - 0.25, h, w + 0.5, d + 0.9, 0.22, C.zinc, { w: W_THIN });
    const f = pen.wall("y+", x, y, 0, w, d);
    f.rect(0.3, 0.5, 2.5, 2.25, C.glassLight, { outline: true, w: W_THIN, glow: 0.9, layer: 1 });
    for (let k = 0; k < 3; k++) f.rect(0.45 + k * 0.68, 0.6, 0.98 + k * 0.68, 2.1, [C.green, C.yellow, C.brickRose][k], { layer: 2, grain: 0.4, glow: 0.5 });
    f.rect(2.9, 0, 3.95, 2.25, C.door, { outline: true, w: W_FINE, layer: 1 });
    // its name stands on the edge of the canopy, where the street can read it
    const sg = pen.plane([x, y + d + 0.66, h + 0.22], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0.2, 0, w - 0.2, 0.74, C.yellow, { outline: true, w: W_FINE, glow: 0.5 });
    sg.text("SPÄTI", w / 2, 0.17, 0.42, { align: "c", layer: 1, kind: L_MARK, color: C.ink, w: 0.08 });
    const g = pen.wall("x+", x, y, 0, w, d);
    g.rect(0.4, 0.9, d - 0.4, 2.2, C.glassLight, { outline: true, w: W_THIN, glow: 0.8, layer: 1 });
    tags(g, rng, 0.2, d - 0.2, 0.15, 0.85, 3);
    tags(f, rng, 0.2, 2.8, 0.1, 0.5, 2);
  });
  // crates of empties, and the regulars
  for (let k = 0; k < 4; k++) pen.box(x + 0.15 + (k % 2) * 0.6, y + d + 0.15, Math.floor(k / 2) * 0.36, 0.55, 0.42, 0.36, [C.yellow, C.green, C.red, C.yellow][k], { w: W_FINE });
  pen.obj(() => pen.box(x + 1.7, y + d + 1.05, 0.36, 2.0, 0.42, 0.1, C.wood, { w: W_FINE }));
  for (let k = 0; k < 3; k++) person(pen, x + 2.0 + k * 0.7, y + d + 1.25, 0.2, randomLook(rng), "sit", k === 2);
  person(pen, x + 0.9, y + d + 1.3, 0, randomLook(rng), "stand", false);
}

/** A food truck, its hatch open towards local +y, the cab at its east end. */
function foodTruck(pen: Pen, rng: Rng, x: number, y: number, col: RGB, sign: string): void {
  const L = 4.1;
  const W = 2.1;
  pen.push(x, y, 0);
  pen.begin();
  pen.box(0.3, 0.1, 0, 0.7, W - 0.2, 0.42, C.black, { edges: false });
  pen.box(L - 1.2, 0.1, 0, 0.7, W - 0.2, 0.42, C.black, { edges: false });
  pen.box(0, 0, 0.42, L - 1.15, W, 2.15, col, { top: C.white });
  pen.box(L - 1.15, 0.08, 0.42, 1.15, W - 0.16, 1.45, col, { top: col });
  pen.wall("x+", L - 1.15, 0.08, 0.42, 1.15, W - 0.16).rect(0.2, 0.75, W - 0.36, 1.35, C.glass, { outline: true, w: W_FINE, glow: 0.3 });
  const f = pen.wall("y+", 0, 0, 0.42, L - 1.15, W);
  f.rect(0.35, 0.7, L - 1.5, 1.75, C.charcoal, { outline: true, w: W_THIN, glow: 0.7, layer: 1 });
  f.block(0.25, 0.6, L - 1.4, 0.7, 0.42, C.stone, { w: W_FINE });
  f.text(sign, (L - 1.15) / 2, 1.86, Math.min(0.26, (((L - 1.7) / sign.length) * 6) / 5.5), { align: "c", layer: 2, color: C.white, kind: L_MARK, w: 0.055 });
  // the hatch, propped open
  const flap = pen.plane([0.3, W, 2.2], [1, 0, 0], [0, 0.9, 0.35], 0, true);
  flap.rect(0, 0, L - 1.8, 1.0, scaleRGB(col, 0.85), { outline: true, w: W_FINE, grain: 0.6 });
  person(pen, (L - 1.15) / 2 - 0.3, W - 0.3, 0.9, randomLook(rng), "bust", false);
  pen.end();
  pen.pop();
}

/** A bird, wings up or down. */
function pigeon(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.34 : -0.1;
  cd.bar(-0.62, y, -0.2, 0.08, 0.13, C.slateLight);
  cd.bar(0.62, y, 0.2, 0.08, 0.13, C.slateLight);
  cd.ellipse(0, 0, 0.28, 0.15, C.metal, { outline: true, w: W_FINE, seg: 8, layer: 1 });
}

// ---------------------------------------------------------------- the place

export const friedrichshain: BlockBuilder = (c) => {
  const { pen, rng } = c;
  // aimed south-west of the middle and a little wider, so the Oberbaumbrücke and the U1 crossing it are in the picture
  c.focus(13.5, 40, 0.85);
  const black = (): Look => ({ ...randomLook(rng), top: C.black, legs: rng.pick([C.black, C.charcoal, C.black]), hat: null });

  // the ground: grass between the Wall and the river, the gallery's pavement, the yard's worn asphalt
  const WALL_X = 7.45;
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(QUAY + 0.15, 5, WALL_X - 0.1, 43, C.grass, { outline: true, w: W_THIN });
    pen.floor(0, 2).ticks(QUAY + 0.3, 5.2, WALL_X - 0.2, 42.8, { n: 60, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    g.rect(WALL_X + 0.35, E, 13.25, B - E, C.cobble);
    g.rect(13.25, 24.3, B - E, B - E, C.streetDark, { grain: 0.9 });
    pen.floor(0, 2).ticks(13.6, 24.6, B - E - 0.3, B - E - 0.3, {
      n: 140,
      len: 0.45,
      ang: 0.4,
      jit: 1.4,
      color: C.greyDark,
      w: 0.05,
    });
  });

  // (it stops short of the towers: anything north of here would be hidden behind them)
  gallery(c, WALL_X, 8.5, 43);

  // ---- the back: the two towers, and Berghain
  frankfurterTor(c, 14, 5);
  frankfurterTor(c, 24, 5);
  const BX = 34.2;
  const BW = 9.4;
  const DOOR = 6.6;
  const slits = berghain(c, BX, 5, BW, 10, 16, DOOR);
  // its yard and the queue: along the wall, round the corner, and back along the fence; nearly everyone in black
  const dx = BX + DOOR;
  queue(pen, rng, dx - 1.0, 16.3, 7, -1, 0, 0, (k) => (k === 4 ? randomLook(rng) : black()));
  queue(pen, rng, BX + 0.5, 17.2, 8, 0, 1, 0, () => black());
  queue(pen, rng, BX + 1.3, 23.6, 10, 1, 0, 0, (k) => (k === 6 ? randomLook(rng) : black()));
  railing(
    pen,
    [
      [BX - 0.1, 24.5, 0],
      [B - E, 24.5, 0],
    ],
    1.0,
    C.greyDark,
    1.3,
  );
  railing(
    pen,
    [
      [dx - 0.4, 17.2, 0],
      [BX + 1.3, 17.2, 0],
      [BX + 1.3, 22.7, 0],
      [B - E - 0.8, 22.7, 0],
    ],
    1.0,
    C.greyDark,
    1.3,
  );
  // the man on the door, arms folded; one he has just said no to; one coming out into the daylight
  const bouncer: Look = { skin: [211, 154, 108], hair: C.black, top: C.black, legs: C.black, long: false, hat: null };
  person(pen, dx - 0.35, 15.7, 0, bouncer, "stand", false, 1.15);
  pen.obj(() => {
    const cd = pen.card(dx - 0.35, 15.7, 0);
    cd.bar(-0.36, 1.38, 0.32, 1.22, 0.17, bouncer.skin, { layer: 6 });
    cd.bar(0.36, 1.38, -0.32, 1.22, 0.17, bouncer.skin, { layer: 7 });
  });
  person(pen, B - E - 1.4, 26.0, 0, black(), "walkB", true);
  person(pen, dx + 1.9, 16.2, 0, { ...black(), hair: [227, 194, 124] }, "walkA", false);
  pen.obj(() => {
    const cd = pen.card(dx + 1.9, 16.2, 1.78);
    cd.seg(-0.24, 0, 0.24, 0, { w: 0.13, color: C.black, kind: L_MARK, wobble: 0, layer: 7 });
  });

  // ---- the street of bars across the middle, in front of the towers
  const ROW_X0 = 18.4;
  const ROW_Y0 = 13.4;
  pen.push(ROW_X0, ROW_Y0, 0);
  altbauRow(pen, rng, 3, {
    widths: [5.1],
    graffiti: 0.7,
    shops: ["bar", "doner", "records"],
    // the end wall: a ladder painted all the way up to the moon
    end: (f, d, h) => {
      f.rect(0.25, h * 0.52, d - 0.25, h - 0.5, C.blueDark, { layer: 1, grain: 0.6 });
      const moon: V2[] = [];
      for (let k = 0; k <= 10; k++) moon.push([d * 0.62 + Math.cos(-1.57 + (k / 10) * 3.14) * 0.95, h - 2.3 + Math.sin(-1.57 + (k / 10) * 3.14) * 0.95]);
      for (let k = 10; k >= 0; k--) moon.push([d * 0.62 - 0.15 + Math.cos(-1.57 + (k / 10) * 3.14) * 0.52, h - 2.3 + Math.sin(-1.57 + (k / 10) * 3.14) * 0.95]);
      f.poly(moon, C.yellow, { layer: 2, outline: true, w: W_FINE, glow: 0.3 });
      for (const [a, b] of [
        [1.2, h - 1.4],
        [2.4, h - 3.4],
        [d - 1.1, h - 4.6],
        [1.6, h - 5.2],
      ]) {
        f.seg(a - 0.14, b, a + 0.14, b, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
        f.seg(a, b - 0.14, a, b + 0.14, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
      }
      for (const o of [0, 0.7]) f.seg(d * 0.3 + o, 0.5, d * 0.47 + o, h - 2.9, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.3, layer: 3 });
      for (let k = 1; k < 13; k++) {
        const t = k / 13;
        f.seg(d * 0.3 + d * 0.17 * t, 0.5 + (h - 3.4) * t, d * 0.3 + 0.7 + d * 0.17 * t, 0.5 + (h - 3.4) * t, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.2, layer: 3 });
      }
    },
  });
  pen.pop();
  const frontY = ROW_Y0 + 8;
  // every table out on the pavement, and every one of them full
  for (let k = 0; k < 6; k++) cafeTable(pen, rng, ROW_X0 + 1.3 + k * 2.62, frontY + 2.35 + (k % 2) * 0.3, k === 1 ? C.red : k === 4 ? C.yellow : null, 3 + (k % 2));
  bikeRow(pen, rng, 18.4, 28.7, 7, 270, 0.62);
  dog(pen, 24.6, frontY + 3.6, 0, C.cream, true);
  spaeti(c, 13.7, 18.3);

  // ---- the gallery's pavement: everybody photographing everybody
  // the souvenir stand at the north end
  pen.push(13.8, 24.7, 0);
  stall(pen, rng, { w: 3.7, sign: "SOUVENIR", goods: [C.red, C.yellow, C.black, C.white, C.concrete], a: C.red });
  pen.pop();
  for (let k = 0; k < 3; k++) person(pen, 14.6 + k * 1.1, 27.75 + (k % 2) * 0.3, 0, randomLook(rng), "stand", k === 1);
  // people posed against the paintings, and the people photographing them
  const poses: [number, number, boolean][] = [
    [39.4, 2, false],
    [36.4, 1, true],
    [33.9, 2, false],
    [27.6, 1, false],
    [19.9, 3, true],
    [17.0, 2, false],
    [13.6, 1, true],
  ];
  for (const [y, n, kid] of poses) {
    for (let k = 0; k < n; k++) person(pen, 8.45 + rng.range(0, 0.35), y + (k - (n - 1) / 2) * 0.8, 0, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5), kid && k === 0 ? 0.72 : 1);
    person(pen, 12.2 + rng.range(0, 0.5), y + rng.range(-0.3, 0.3), 0, randomLook(rng), "stand", true);
  }
  // two who have found the hearts
  person(pen, 8.5, 30.7, 0, randomLook(rng), "stand", false);
  person(pen, 8.95, 30.75, 0, randomLook(rng), "stand", true);
  // a tour on bicycles, pulled up to listen to its guide
  const guide: Look = { ...randomLook(rng), top: C.orange, hat: C.orange };
  person(pen, 11.9, 21.3, 0, guide, "wave", false);
  for (let k = 0; k < 4; k++) {
    pen.push(12.55 + (k % 2) * 0.35, 22.0 + k * 1.15, 0, 262 + k * 5);
    bike(pen, { rider: randomLook(rng), color: [C.red, C.blue, C.green, C.orange][k], frame: k % 2 });
    pen.pop();
  }
  // a painter up a ladder, giving one of the eyes its lashes back
  const ly = 24.3;
  pen.obj(() => {
    for (const o of [-0.26, 0.26]) pen.pole([9.0, ly + o, 0], [WALL_X + 0.45, ly + o, 3.05], 0.07, C.woodDark);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      pen.stroke(
        [
          [9.0 - 1.25 * t, ly - 0.26, 3.05 * t],
          [9.0 - 1.25 * t, ly + 0.26, 3.05 * t],
        ],
        { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
      );
    }
    for (const [o, col] of [
      [-0.9, C.red],
      [-1.25, C.blue],
      [0.85, C.white],
    ] as [number, RGB][]) {
      pen.cyl(9.2, ly + o, 0, 0.17, 0.3, C.zinc, { seg: 7, top: col });
    }
  });
  person(pen, 8.5, ly, 1.25, { ...randomLook(rng), top: C.white, legs: C.blueDark, hat: null }, "wave", true);
  dog(pen, 12.4, 22.5, 0, C.woodDark, true);

  // on the grass behind the Wall: people who came for the river, not the paintings
  for (const y of [8.5, 13.5, 21, 27.5, 34, 40.5]) {
    person(pen, 4.4 + rng.range(0, 0.3), y, -0.2, randomLook(rng), "sit", true);
    if (rng.chance(0.7)) person(pen, 4.45 + rng.range(0, 0.3), y + 0.85, -0.2, randomLook(rng), "sit", true);
  }
  picnic(pen, rng, 4.9, 17.3, 0, 2);

  // ---- the RAW grounds
  shed(c, 14.8, 29.6, 8.1, 6.0, 3.2, 3, "RAW");
  shed(c, 14.8, 37.3, 7.7, 6.0, 3.4, 3, "SKATE");

  // the flea market: four stalls in a row, and a rail of old coats
  const signs = ["FLOHMARKT", "VINYL", "TRÖDEL", "LAMPEN"];
  const goods: RGB[][] = [
    [C.brickRose, C.ochre, C.teal, C.cream],
    [C.black, C.charcoal, C.red, C.black],
    [C.copper, C.gold, C.blue, C.wood],
    [C.yellow, C.orange, C.white, C.pink],
  ];
  for (let k = 0; k < 4; k++) {
    pen.push(24.5 + k * 3.5, 28, 0);
    stall(pen, rng, { w: 3.4, sign: signs[k], goods: goods[k], a: [C.orange, C.blue, C.green, C.red][k] });
    pen.pop();
  }
  for (let k = 0; k < 11; k++) {
    person(pen, 25 + k * 1.2 + rng.range(-0.3, 0.3), 30.7 + rng.range(0, 1.4), 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.12) ? 0.72 : 1);
  }
  pen.obj(() => {
    const ry = 29.2;
    pen.pole([39.3, ry, 0], [39.3, ry, 1.9], 0.07, C.greyDark);
    pen.pole([42.6, ry, 0], [42.6, ry, 1.9], 0.07, C.greyDark);
    pen.stroke(
      [
        [39.3, ry, 1.9],
        [42.6, ry, 1.9],
      ],
      { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    for (let k = 0; k < 7; k++) {
      const cd = pen.card(39.6 + k * 0.45, ry, 0.7);
      cd.rect(-0.2, 0, 0.2, 1.15, rng.pick([C.brickBrown, C.blueDark, C.green, C.ochre, C.charcoal, C.redDark]), { outline: true, w: W_FINE, sway: 0.15 });
    }
  });
  person(pen, 41.0, 30.3, 0, randomLook(rng), "stand", false);
  bulbs(pen, [
    [24.4, 30.45, 3.3],
    [31.5, 30.45, 3.3],
    [38.6, 30.45, 3.3],
  ]);

  // two food trucks, a short queue at each
  foodTruck(pen, rng, 34.4, 33.6, C.teal, "FALAFEL");
  foodTruck(pen, rng, 39.2, 33.6, C.orange, "BURGER");
  queue(pen, rng, 35.6, 36.2, 3, 0.2, 1);
  queue(pen, rng, 40.4, 36.2, 2, -0.1, 1);

  // the beer garden: benches under bulbs
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 0 && j === 0) continue;
      bierbank(pen, rng, 37.3 + i * 3.9, 38.9 + j * 1.95, 0, 4 + ((i + j) % 3));
    }
  }
  bulbs(
    pen,
    [
      [35.2, 37.6, 3.4],
      [43.3, 37.6, 3.4],
      [43.3, 43.3, 3.4],
      [35.2, 43.3, 3.4],
      [35.2, 37.6, 3.4],
    ],
    0.45,
  );
  bulbs(
    pen,
    [
      [35.2, 37.6, 3.4],
      [43.3, 43.3, 3.4],
    ],
    0.6,
    false,
  );

  // ---- the bunker people climb: coloured holds, a rope, somebody at the top already
  const kx = 27.5;
  const ky = 35.9;
  const kr = 2.4;
  const kh = 9;
  pen.obj(() => {
    pen.cyl(kx, ky, 0, kr, kh, C.concreteDark, { seg: 14, r2: 2.15, top: C.concrete });
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, kx - kr + 0.12, ky - 1.15, 0, (kr - 0.12) * 2, 2.3);
      for (const col of [C.red, C.yellow, C.blue, C.green, C.pink]) {
        f.ticks(0.1, 0.5, 2.2, kh - 0.6, { n: 9, len: 0.2, ang: 0.4, jit: 1.5, color: col, w: 0.17, layer: 1 });
      }
      tags(f, rng, 0.1, 2.2, 0.2, 1.7, 3);
    }
  });
  pen.obj(() => railing(pen, Array.from({ length: 9 }, (_, k): V3 => [kx + Math.cos((k / 8) * Math.PI * 2) * 1.95, ky + Math.sin((k / 8) * Math.PI * 2) * 1.95, kh]), 0.8, C.greyDark, 1.4), 0.2);
  person(pen, kx + 0.2, ky + 0.3, kh, randomLook(rng), "cheer", false);
  // one climber fixed half way up the south side, his partner paying out rope below
  person(pen, kx - 0.5, ky + kr + 0.1, 4.4, randomLook(rng), "cheer", true);
  person(pen, kx - 1.4, ky + kr + 1.2, 0, randomLook(rng), "wave", false);
  pen.obj(() =>
    pen.stroke(
      [
        [kx - 1.2, ky + kr + 1.15, 1.2],
        [kx - 0.5, ky + kr - 0.2, kh + 0.1],
        [kx - 0.5, ky + kr + 0.12, 6.1],
      ],
      { w: 0.045, color: C.orange, kind: L_BAR, wobble: 0 },
    ),
  );
  // and one who goes up the east side, slowly, and comes down fast
  const belayer: V3 = [kx + kr + 1.5, ky - 0.3, 0];
  person(pen, belayer[0], belayer[1], 0, randomLook(rng), "wave", true);
  const climbLook = randomLook(rng);
  const climbing = [makeSprite((p) => person(p, 0, 0, 0, climbLook, "cheer", false), 0, 41), makeSprite((p) => person(p, 0, 0, 0, climbLook, "wave", false), 0, 42)];
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const wx = c.ox + kx + kr + 0.12;
    const wy = c.oy + ky - 0.45;
    if (!m.sees(wx, wy, c.oz + 5, 12)) return;
    const u = ((m.t - c.done) % 17) / 17;
    const z = u < 0.82 ? 1.0 + 6.2 * (u / 0.82) : 7.2 - 6.2 * ((u - 0.82) / 0.18);
    m.put(climbing[u < 0.82 ? Math.floor(m.t * 1.8) & 1 : 0], wx, wy, c.oz + z, c.done);
    m.pen.stroke(
      [
        [c.ox + belayer[0] - 0.2, c.oy + belayer[1], c.oz + 1.25],
        [wx - 0.5, wy, c.oz + kh + 0.15],
        [wx, wy, c.oz + z + 1.7],
      ],
      { w: 0.045, color: C.teal, kind: L_BAR, wobble: 0 },
    );
  });

  // ---- the half-pipe
  const HX = 24.2;
  const HY = 39.3;
  const HL = 9.0;
  const HW = 3.9;
  const HR = 2.2;
  const DECK = 0.9;
  const TOP = 0.15 + HR;
  const FLAT = (HL - 2 * DECK - 2 * HR) / 2;
  pen.obj(() => {
    const prof: V2[] = [
      [0, 0],
      [HL, 0],
      [HL, TOP],
    ];
    for (let k = 8; k >= 0; k--) {
      const th = ((k / 8) * Math.PI) / 2;
      prof.push([HL - DECK - HR + HR * Math.sin(th), 0.15 + HR - HR * Math.cos(th)]);
    }
    for (let k = 0; k <= 8; k++) {
      const th = ((k / 8) * Math.PI) / 2;
      prof.push([DECK + HR - HR * Math.sin(th), 0.15 + HR - HR * Math.cos(th)]);
    }
    prof.push([0, TOP]);
    pen.wall("y+", HX, HY, 0, HL, 0).extrude(prof, HW, C.wood, { crease: 24, front: C.woodDark });
    const f = pen.wall("y+", HX, HY, 0, HL, HW);
    tags(f, rng, 0.2, HL - 0.2, 0.15, 1.1, 5);
    // the steel coping along each lip
    for (const a of [DECK, HL - DECK]) {
      pen.stroke(
        [
          [HX + a, HY, TOP + 0.03],
          [HX + a, HY + HW, TOP + 0.03],
        ],
        { w: 0.1, color: C.metal, kind: L_MARK, wobble: 0 },
      );
    }
  });
  // people waiting their turn on the decks, boards under their arms, and a few watching
  for (const [x, fl] of [
    [HX + 0.45, false],
    [HX + HL - 0.45, true],
  ] as [number, boolean][]) {
    person(pen, x, HY + 1.0, TOP, randomLook(rng), "stand", fl);
    person(pen, x, HY + 2.6, TOP, randomLook(rng), "wave", fl, 0.72);
    pen.obj(() => {
      const cd = pen.card(x + (fl ? -0.35 : 0.35), HY + 1.0, TOP);
      cd.bar(0, 0.1, 0, 1.0, 0.14, rng.pick([C.red, C.yellow, C.teal]));
    });
  }
  for (let k = 0; k < 4; k++) person(pen, HX - 1.2 + rng.range(0, 0.6), HY + 0.6 + k * 0.85, 0, randomLook(rng), rng.pick(["stand", "cheer", "wave"]), false, k === 2 ? 0.72 : 1);
  // the skater: a pendulum from lip to lip, and once, as the camera comes, clean off the top
  const skLook: Look = { ...randomLook(rng), top: C.red, hat: C.black };
  const board = (p: Pen) => {
    const cd = p.card(0, 0, 0);
    cd.bar(-0.55, 0.06, 0.55, 0.06, 0.11, C.black, { layer: 0 });
  };
  const rideR = makeSprite(
    (p) => {
      board(p);
      person(p, 0, 0, 0.1, skLook, "walkA", false);
    },
    0,
    51,
  );
  const rideL = makeSprite(
    (p) => {
      board(p);
      person(p, 0, 0, 0.1, skLook, "walkA", true);
    },
    0,
    52,
  );
  const air = makeSprite(
    (p) => {
      board(p);
      person(p, 0, 0, 0.1, skLook, "cheer", false);
    },
    0,
    53,
  );
  const SMAX = FLAT + (HR * Math.PI) / 2;
  const PERIOD = 3.4;
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const wy = c.oy + HY + HW * 0.55;
    if (!m.sees(c.ox + HX + HL / 2, wy, c.oz + 2, 12)) return;
    const st = c.stay();
    // the swing that tops out as the camera settles goes higher than the rest
    const peak = st ? st.at + 1.2 : c.done + 2.5;
    const t0 = peak - PERIOD / 4;
    const boost = 1.9 * Math.exp(-Math.pow((m.t - peak) / 0.5, 2));
    const s = (SMAX * 0.97 + boost) * Math.sin(((m.t - t0) / PERIOD) * Math.PI * 2);
    const v = Math.cos(((m.t - t0) / PERIOD) * Math.PI * 2);
    const a = Math.abs(s);
    const sign = s < 0 ? -1 : 1;
    let x: number;
    let z: number;
    if (a <= FLAT) {
      x = a;
      z = 0.15;
    } else if (a <= SMAX) {
      const th = (a - FLAT) / HR;
      x = FLAT + HR * Math.sin(th);
      z = 0.15 + HR * (1 - Math.cos(th));
    } else {
      x = FLAT + HR;
      z = TOP + (a - SMAX);
    }
    m.put(a > SMAX ? air : v >= 0 ? rideR : rideL, c.ox + HX + HL / 2 + sign * x, wy, c.oz + z, c.done);
  });

  // ---- the one who leaps for the photograph, in front of BERLIN
  const leapLook = randomLook(rng);
  const leaper = makeSprite((p) => person(p, 0, 0, 0, leapLook, "cheer", false), 0, 61);
  person(pen, 12.3, 41.3, 0, randomLook(rng), "stand", true);
  c.movers.push((m) => {
    const st = c.stay();
    const cue = st ? st.at + 0.9 : c.done + 2;
    const u = (m.t - cue) / 0.75;
    const big = u > 0 && u < 1 ? 1.5 * 4 * u * (1 - u) : 0;
    const k = (m.t * 0.38) % 1;
    const small = k < 0.28 ? 0.75 * 4 * (k / 0.28) * (1 - k / 0.28) : 0;
    m.put(leaper, c.ox + 8.7, c.oy + 41.4, c.oz + Math.max(big, small), c.done);
  });

  // ---- Berghain after dark: light in the tall windows, on the beat, and the bass coming out under the door
  const neon: RGB[] = [
    [255, 70, 205],
    [90, 150, 255],
    [100, 255, 160],
  ];
  c.movers.push((m) => {
    if (m.night < 0.35 || !m.sees(c.ox + BX + BW / 2, c.oy + 15, c.oz + 8, 18)) return;
    const beat = m.t * 2.1;
    const k0 = Math.floor(beat);
    const punch = 1 - (beat - k0) * 0.75;
    slits.forEach((p, i) => {
      m.pen.stroke(
        [
          [p[0], p[1], p[2] + 3.6],
          [p[0], p[1], p[2] + 13.4],
        ],
        { w: 0.44, color: neon[(k0 + i * 2 + (i >> 2)) % 3], kind: L_SPARK, wobble: 0, alpha: (0.45 + 0.55 * punch) * ((k0 + i) % 2 ? 1 : 0.6) },
      );
    });
    m.pen.stroke(
      [
        [c.ox + dx - 0.2, c.oy + 15.5, c.oz + 0.05],
        [c.ox + dx + 1.5, c.oy + 15.5, c.oz + 0.05],
      ],
      { w: 1.5, color: neon[k0 % 3], kind: L_SPARK, wobble: 0, alpha: 0.3 * punch },
    );
  });

  // ---- everything else that moves
  // along the gallery, between the posers and the cameras
  const prom = stroll(
    c,
    [
      [9.9, 12.2],
      [9.9, 42.9],
      [11.1, 42.9],
      [11.1, 12.2],
    ],
    0.55,
  );
  for (let k = 0; k < 8; k++) c.movers.push(walker(prom, rng, c.done + rng.range(0, 1)));
  // bicycles through the yard, round the flea market
  const yard = stroll(
    c,
    [
      [23.6, 26.6],
      [43.0, 26.6],
      [43.0, 32.9],
      [23.6, 32.9],
    ],
    1.2,
  );
  for (let k = 0; k < 3; k++) c.movers.push(cyclist(yard, rng, c.done + rng.range(0, 1), rng.range(3.0, 3.8)));
  // pigeons round the nearer dome
  const frames = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => pigeon(p, up === 1, fl === 1), 0, 9)));
  for (let k = 0; k < 4; k++) {
    const r = 3.4 + k * 1.1;
    const sp = (0.5 + 0.08 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    const born = c.done + k * 0.25;
    c.movers.push((m) => {
      const a = ph + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      const flap = Math.floor(m.t * 6 + ph) & 1;
      m.put(frames[flap][vx - vy < 0 ? 1 : 0], c.ox + 28 + Math.cos(a) * r, c.oy + 9 + Math.sin(a) * r * 0.8, c.oz + 24.5 + Math.sin(m.t * 0.7 + ph) * 1.1, born);
    });
  }
};
