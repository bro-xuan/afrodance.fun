// The Dam: the square the city grew around. The Royal Palace fills the back,
// the Nieuwe Kerk and a department store stand beside it, the National
// Monument faces them across the cobbles. Today there is a wedding: the couple
// are on the palace balcony and half the city has turned up in orange.

import { RGB, Rng, V2, V3, ease, hex, scaleRGB } from "../../engine/math";
import { Sprite } from "../../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { Look, Pose, W_FINE, W_THIN, archWindow, bench, bikeRow, bricks, flag, lamp, person, railing, randomLook, speckle, stall, windowAt, windowGrid } from "../kit";
import { Route, Turning, makeSprite, rounded, traveler, walker } from "../motion";
import { C, HAIR, SKIN } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

/** The balcony scene, for the camera's last close-up: local x, y and how far to push in. */
export const damSpot: [number, number, number] = [18.9, 24.5, 2.8];

const SAND = hex("#e6d4a9");
const SAND_D = hex("#cdb786");
const SAND_L = hex("#f3e8c9");
const LEAD = hex("#8f9ba8");
const BRONZE = hex("#6c8a74");
const CHURCH = hex("#cbb99d");
const CHURCH_L = hex("#e7dcc6");
const STORE = hex("#b98a66");
const SILVER = hex("#b9c0c6");
const NAVY = hex("#2b3350");
const PIGEON = hex("#8e97a3");
const PIGEON_D = hex("#5f6874");

// the palace: back wall at x = 7, front at x = 16, thirty units long
const PX = 7;
const PY0 = 9.5;
const PH = 10.2;
/** Centre of the National Monument. */
const MON: V2 = [33.5, 24.5];
/** Where the pigeons like to stand. */
const PIGEONS: V2 = [29.6, 34.5];

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

/** A pointed gothic window. */
function lancet(f: Plane, a0: number, b0: number, a1: number, b1: number, lit: boolean): void {
  const shape = (x0: number, y0: number, x1: number, y1: number): V2[] => {
    const w = x1 - x0;
    const sp = y1 - w * 0.866;
    const pts: V2[] = [
      [x0, y0],
      [x1, y0],
      [x1, sp],
    ];
    for (let k = 1; k <= 4; k++) {
      const t = (k / 4) * (Math.PI / 3);
      pts.push([x0 + Math.cos(t) * w, sp + Math.sin(t) * w]);
    }
    for (let k = 1; k <= 3; k++) {
      const t = (Math.PI * 2) / 3 + (k / 4) * (Math.PI / 3);
      pts.push([x1 + Math.cos(t) * w, sp + Math.sin(t) * w]);
    }
    pts.push([x0, sp]);
    return pts;
  };
  const i = Math.min(0.13, (a1 - a0) * 0.14);
  f.poly(shape(a0, b0, a1, b1), CHURCH_L, { outline: true, w: W_FINE, grain: 0.3 });
  f.poly(shape(a0 + i, b0 + i, a1 - i, b1 - i * 1.8), C.glass, { layer: 1, glow: lit ? 1 : 0, grain: 0.5 });
  const m = (a0 + a1) / 2;
  const sp = b1 - (a1 - a0) * 0.866;
  f.seg(m, b0 + i, m, b1 - i * 2.2, { w: 0.05, color: CHURCH_L, kind: L_MARK, wobble: 0, layer: 2 });
  f.seg(a0 + i, sp, a1 - i, sp, { w: 0.05, color: CHURCH_L, kind: L_MARK, wobble: 0, layer: 2 });
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

/** Someone dressed for the occasion. */
function fan(rng: Rng): Look {
  const lk = randomLook(rng);
  if (rng.chance(0.62)) lk.top = C.orange;
  if (rng.chance(0.22)) lk.hat = C.orange;
  return lk;
}

/** A little flag on a stick, held up by whoever stands at (x, y). */
function handFlag(pen: Pen, x: number, y: number, z: number, kind: "orange" | "nl", flip = false): void {
  const k = pen.card(x, y, z, flip);
  pen.begin();
  k.seg(0.52, 1.25, 0.6, 2.72, { w: 0.06, color: C.white, kind: L_BAR, wobble: 0, layer: 4 });
  if (kind === "orange") k.rect(0.62, 2.2, 1.3, 2.68, C.orange, { outline: true, w: W_FINE, sway: 0.3, layer: 5, grain: 0.4 });
  else {
    k.rect(0.62, 2.2, 1.3, 2.36, C.blueDark, { sway: 0.3, layer: 5, grain: 0.4 });
    k.rect(0.62, 2.36, 1.3, 2.52, C.white, { sway: 0.3, layer: 5, grain: 0.4 });
    k.rect(0.62, 2.52, 1.3, 2.68, C.red, { sway: 0.3, layer: 5, grain: 0.4 });
    k.loop(
      [
        [0.62, 2.2],
        [1.3, 2.2],
        [1.3, 2.68],
        [0.62, 2.68],
      ],
      { w: W_FINE, sway: 0.3, layer: 6 },
    );
  }
  pen.end();
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

// ---------------------------------------------------------------- the ground

function ground(c: BlockCtx): void {
  const { pen } = c;
  pen.floor(0, 1).rect(6.2, 6.2, 41.8, 41.8, C.plaza);
  const g = pen.floor(0, 2);
  for (const r of [5.9, 7.0, 8.1]) {
    g.arc(MON[0], MON[1], r, r, 0, Math.PI * 2, { w: 0.06, color: C.streetDark, kind: L_MARK, wobble: 0.6, seg: 44, alpha: 0.9 });
  }
  // a strip of smoother stone leading from the palace doors to the monument
  g.rect(17.2, 23.2, MON[0] - 5.9, 25.8, hex("#f3ecdd"), { grain: 0.6 });
  g.seg(17.2, 23.2, MON[0] - 5.9, 23.2, { w: 0.05, color: C.streetDark, kind: L_MARK });
  g.seg(17.2, 25.8, MON[0] - 5.9, 25.8, { w: 0.05, color: C.streetDark, kind: L_MARK });
  speckle(g, 16.6, 16.8, 41.4, 41.4, C.streetDark, 0.4, (a, b) => Math.hypot(a - MON[0], b - MON[1]) > 5.4);
}

// ---------------------------------------------------------------- the Royal Palace

function palace(c: BlockCtx): void {
  const { pen, rng } = c;
  const lit = () => rng.chance(0.78);

  /** Storeys, pilasters and windows across a run of bays on one wall. */
  const bays = (f: Plane, a0: number, n: number, bay: number, doors: boolean) => {
    const a1 = a0 + n * bay;
    f.rect(a0, 0, a1, 2.55, SAND_D, { grain: 0.8 });
    bricks(f, a0 + 0.15, 0.3, a1 - 0.15, 2.3, scaleRGB(SAND_D, 0.86), 0.45);
    for (const b of [2.55, 6.0]) {
      f.rect(a0, b, a1, b + 0.28, SAND_L, { grain: 0.4, layer: 1 });
      f.seg(a0, b, a1, b, { w: W_FINE, layer: 1 });
    }
    f.rect(a0, 9.5, a1, PH, SAND_L, { grain: 0.4, layer: 1 });
    f.seg(a0, 9.5, a1, 9.5, { w: W_THIN, layer: 1 });
    for (let i = 0; i <= n; i++) {
      const a = Math.min(a1 - 0.17, Math.max(a0 + 0.17, a0 + i * bay));
      f.rect(a - 0.15, 2.83, a + 0.15, 9.5, SAND_L, { grain: 0.4, outline: true, w: 0.04, ink: SAND_D });
    }
    for (let i = 0; i < n; i++) {
      const m = a0 + (i + 0.5) * bay;
      if (!doors) windowAt(f, m - 0.4, 0.95, m + 0.4, 1.9, lit(), SAND_L, false);
      for (const s of [2.83, 6.28]) {
        windowAt(f, m - 0.44, s + 0.3, m + 0.44, s + 2.05, lit(), SAND_L);
        windowAt(f, m - 0.44, s + 2.28, m + 0.44, s + 2.92, lit(), SAND_L, false);
      }
    }
  };

  const part = (y0: number, d: number, w: number, n: number, doors: boolean, extra?: () => void) =>
    pen.obj(() => {
      pen.box(PX, y0, 0, w, d, PH, SAND);
      bays(pen.wall("x+", PX, y0, 0, w, d), 0, n, d / n, doors);
      extra?.();
    });

  part(PY0, 4, 9.5, 2, false);
  part(PY0 + 4, 6, 9, 3, false);
  part(PY0 + 10, 10, 10.1, 5, true, () => {
    // seven small doors, where you would expect one grand one
    const f = pen.wall("x+", PX, PY0 + 10, 0, 10.1, 10);
    for (let i = 0; i < 7; i++) {
      const a = 1.1 + i * 1.3;
      f.poly(archShape(a - 0.42, 0, a + 0.42, 2.05), hex("#5a4636"), { outline: true, w: W_FINE, layer: 1, grain: 0.6 });
    }
  });
  part(PY0 + 20, 6, 9, 3, false);
  part(PY0 + 26, 4, 9.5, 2, false, () => {
    bays(pen.wall("y+", PX, PY0 + 26, 0, 9.5, 4), 0, 4, 9.5 / 4, false);
  });

  // roofs
  pen.obj(() => {
    pen.hip(PX, PY0, PH, 9, 30, 2.5, LEAD);
    for (const y of [PY0 + 6.5, PY0 + 22.6]) pen.box(PX + 4.15, y, PH + 1.9, 0.7, 0.9, 1.5, SAND_D, { top: C.charcoal, w: W_THIN });
  }, 0.1);
  pen.obj(() => {
    // the pediment over the middle, with its carved sea of figures
    pen.gable(PX + 4.5, PY0 + 10, PH, 5.6, 10, 2.5, "x", LEAD, { gable: SAND_L });
    const f = pen.wall("x+", PX + 4.5, PY0 + 10, PH, 5.6, 10);
    f.poly(
      [
        [0.75, 0.2],
        [9.25, 0.2],
        [5, 2.3],
      ],
      SAND_D,
      { outline: true, w: W_FINE, grain: 0.6 },
    );
    for (let i = 0; i < 9; i++) {
      const a = 1.6 + i * 0.85;
      const h = 0.3 + (1 - Math.abs(a - 5) / 3.9) * 0.95;
      f.ellipse(a, 0.28 + h * 0.42, 0.22, h * 0.42, C.white, { layer: 1, seg: 8, grain: 0.3, outline: true, w: 0.04, ink: SAND_D });
    }
  }, 0.15);
  pen.obj(() => {
    // bronze figures standing on the pediment
    for (const [y, z] of [
      [PY0 + 10.25, PH],
      [PY0 + 15, PH + 2.5],
      [PY0 + 19.75, PH],
    ]) {
      const k = pen.card(PX + 10.1, y, z);
      k.bar(0, 0.05, 0, 0.8, 0.3, BRONZE);
      k.bar(0, 0.6, 0.3, 1.05, 0.12, BRONZE);
      k.circle(0, 1.08, 0.2, BRONZE, { outline: true, w: W_FINE, layer: 2, seg: 8 });
    }
  }, 0.3);

  // the cupola and its weather vane: a little gilded ship
  const cx = PX + 4.5;
  const cy = PY0 + 15;
  pen.obj(() => {
    pen.box(cx - 1.8, cy - 1.8, PH + 1.0, 3.6, 3.6, 2.1, SAND_L);
  }, 0.25);
  pen.obj(() => {
    const z0 = PH + 3.1;
    pen.cyl(cx, cy, z0, 1.7, 2.7, SAND_L, { top: SAND_D, seg: 16 });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + 0.2;
      if (Math.cos(t - Math.PI / 4) < 0.05) continue;
      const x = cx + Math.cos(t) * 1.74;
      const y = cy + Math.sin(t) * 1.74;
      pen.stroke(
        [
          [x, y, z0 + 0.5],
          [x, y, z0 + 2.05],
        ],
        { w: 0.4, color: C.glass, kind: L_BAR, wobble: 0 },
      );
    }
    pen.cyl(cx, cy, z0 + 2.7, 1.95, 0.25, SAND_L, { seg: 16 });
  }, 0.4);
  pen.obj(() => {
    const z0 = PH + 6.05;
    pen.dome(cx, cy, z0, 1.85, 1.7, LEAD, { seg: 16 });
    pen.cyl(cx, cy, z0 + 1.65, 0.45, 0.8, SAND_L, { seg: 8 });
    pen.cone(cx, cy, z0 + 2.45, 0.6, 0.75, LEAD, { seg: 8 });
    pen.pole([cx, cy, z0 + 3.1], [cx, cy, z0 + 4.4], 0.07, C.gold, { ink: false });
    const k = pen.card(cx, cy, z0 + 3.75);
    k.poly(
      [
        [-0.55, 0.12],
        [0.55, 0.12],
        [0.38, -0.12],
        [-0.38, -0.12],
      ],
      C.gold,
      { outline: true, w: W_FINE, grain: 0.2 },
    );
    k.poly(
      [
        [0.05, 0.2],
        [0.05, 0.78],
        [0.5, 0.25],
      ],
      C.gold,
      { outline: true, w: W_FINE, grain: 0.2 },
    );
  }, 0.55);

  // the balcony, dressed for the day
  pen.obj(() => {
    const bx = PX + 10.1;
    pen.box(bx, 21.5, 2.62, 1.05, 6, 0.24, SAND_L);
    railing(
      pen,
      [
        [bx + 0.05, 21.55, 2.86],
        [bx + 1.0, 21.55, 2.86],
        [bx + 1.0, 27.45, 2.86],
        [bx + 0.05, 27.45, 2.86],
      ],
      0.75,
      SAND_D,
      0.6,
    );
    const f = pen.wall("x+", bx, 23, 1.95, 1.08, 3);
    f.poly(
      [
        [0, 1.72],
        [3, 1.72],
        [3, 0.4],
        [2.25, 0.12],
        [1.5, 0.4],
        [0.75, 0.12],
        [0, 0.4],
      ],
      C.orange,
      { outline: true, w: W_THIN, grain: 0.5 },
    );
    f.line(
      [
        [1.08, 0.82],
        [1.08, 1.25],
        [1.3, 1.02],
        [1.5, 1.32],
        [1.7, 1.02],
        [1.92, 1.25],
        [1.92, 0.82],
        [1.08, 0.82],
      ],
      { w: 0.07, color: C.gold, kind: L_MARK, wobble: 0.2, layer: 1 },
    );
  }, 0.5);

  // flags either side of the forecourt, with bulbs strung to the palace for the evening
  flag(pen, 17.6, 12.2, 0, 7.5, "nl", 1.25);
  flag(pen, 17.6, 36.8, 0, 7.5, "amsterdam", 1.25);
  pen.obj(() => {
    for (const [ya, yb] of [
      [12.2, 21.4],
      [36.8, 27.6],
    ]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push([17.6 - t * 0.4, ya + (yb - ya) * t, 6.4 - t * 1.2 - Math.sin(t * Math.PI) * 0.8]);
      }
      pen.stroke(pts, { w: 0.035, color: C.inkSoft, kind: L_BAR, wobble: 0 });
      for (let i = 1; i < 8; i++) {
        const p = pts[i];
        pen.stroke(
          [
            [p[0], p[1] - 0.02, p[2] - 0.12],
            [p[0], p[1] + 0.02, p[2] - 0.12],
          ],
          { w: 0.2, kind: L_LIGHT, wobble: 0 },
        );
      }
    }
  }, 0.6);
  // bikes left against the palace, as they are against everything
  bikeRow(pen, rng, 18.25, 13.5, 5, 0);
}

// ---------------------------------------------------------------- the Nieuwe Kerk

function church(c: BlockCtx): void {
  const { pen, rng } = c;
  const X0 = 20;
  const Y0 = 8.2;
  const L = 11.5;
  const D = 6;
  const H = 8;
  const lit = () => rng.chance(0.6);
  pen.obj(() => {
    pen.box(X0, Y0, 0, L, D, H, CHURCH);
    const f = pen.wall("y+", X0, Y0, 0, L, D);
    for (const a of [0.55, 2.05, 8.5, 10.0]) lancet(f, a, 2.3, a + 1.0, 6.9, lit());
    bricks(f, 0.2, 0.2, L - 0.2, 2.0, scaleRGB(CHURCH, 0.86), 0.4);
    const e = pen.wall("x+", X0, Y0, 0, L, D);
    lancet(e, 1.9, 2.0, 4.1, 8.4, lit());
    bricks(e, 0.2, 0.2, D - 0.2, 1.8, scaleRGB(CHURCH, 0.86), 0.4);
  });
  pen.obj(() => {
    pen.gable(X0, Y0, H, L, D, 5, "x", C.slate, { gable: CHURCH });
    const e = pen.wall("x+", X0, Y0, H, L, D);
    e.circle(3, 1.7, 0.62, CHURCH_L, { outline: true, w: W_FINE, seg: 12 });
    e.circle(3, 1.7, 0.42, C.glass, { layer: 1, seg: 10, glow: 0.8 });
  }, 0.12);
  // the transept, with the great window
  pen.obj(() => {
    pen.box(X0 + 3.6, Y0 + 5, 0, 4.4, 3.3, H, CHURCH);
    const f = pen.wall("y+", X0 + 3.6, Y0 + 5, 0, 4.4, 3.3);
    lancet(f, 1.0, 1.9, 3.4, 9.3, true);
    f.seg(1.8, 2.1, 1.8, 7.0, { w: 0.05, color: CHURCH_L, kind: L_MARK, wobble: 0, layer: 2 });
    f.seg(2.6, 2.1, 2.6, 7.0, { w: 0.05, color: CHURCH_L, kind: L_MARK, wobble: 0, layer: 2 });
    bricks(f, 0.2, 0.2, 4.2, 1.6, scaleRGB(CHURCH, 0.86), 0.5);
  }, 0.05);
  pen.obj(() => {
    pen.gable(X0 + 3.6, Y0 + 3, H, 4.4, 5.3, 5, "y", C.slate, { gable: CHURCH });
  }, 0.18);
  // buttresses
  for (const x of [X0 - 0.05, X0 + 1.7, X0 + 8.0, X0 + 9.65, X0 + L - 0.4]) {
    pen.obj(() => {
      pen.box(x, Y0 + D, 0, 0.45, 0.55, 6.2, CHURCH_L, { w: W_THIN });
      pen.gable(x, Y0 + D, 6.2, 0.45, 0.55, 0.5, "x", C.slate, { w: W_THIN });
    });
  }
  for (const x of [X0 + 3.55, X0 + 7.6]) {
    pen.box(x, Y0 + 8.3, 0, 0.45, 0.5, 7.2, CHURCH_L, { w: W_THIN });
  }
  // a slender spire over the crossing: the church never got its tower
  pen.obj(() => {
    const sx = X0 + 5.8;
    const sy = Y0 + 3;
    pen.cyl(sx, sy, H + 4.6, 0.5, 1.3, CHURCH_L, { seg: 8 });
    pen.cone(sx, sy, H + 5.9, 0.62, 3.3, C.slate, { seg: 8 });
    pen.pole([sx, sy, H + 9.2], [sx, sy, H + 10.1], 0.06, C.gold, { ink: false });
    pen.card(sx, sy, H + 9.9).circle(0, 0.15, 0.17, C.gold, { outline: true, w: W_FINE, seg: 8 });
  }, 0.4);

  // a tour group, following the umbrella
  pen.obj(() => {
    const guide = randomLook(rng);
    guide.top = C.red;
    person(pen, 20.7, 15.7, 0, guide, "wave");
    const k = pen.card(20.7, 15.7, 0);
    k.seg(0.64, 1.86, 0.7, 3.0, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
    k.ellipse(0.7, 3.0, 0.62, 0.42, C.red, { outline: true, w: W_FINE, layer: 5, a0: 0, a1: Math.PI, seg: 8 });
  });
  for (const [x, y] of scatter(rng, 21.5, 15.2, 23.3, 17.0, 6, 0.72)) {
    const lk = randomLook(rng);
    if (rng.chance(0.4)) lk.hat = C.yellow;
    if (rng.chance(0.4)) photographer(pen, x, y, lk, true);
    else person(pen, x, y, 0, lk, "stand", true);
  }
}

// ---------------------------------------------------------------- the department store

function store(c: BlockCtx): void {
  const { pen, rng } = c;
  const X0 = 33;
  const Y0 = 7.2;
  const W = 8.8;
  const D = 7.3;
  const H = 11.5;
  pen.obj(() => {
    pen.box(X0, Y0, 0, W, D, H, STORE, { top: C.slateLight });
    const f = pen.wall("y+", X0, Y0, 0, W, D);
    f.rect(0, 0, W, 0.4, C.stoneDark, { grain: 0.6 });
    for (let i = 0; i < 4; i++) {
      const a = 0.55 + i * 2.05;
      archWindow(f, a, 0.4, a + 1.6, 3.3, true, C.cream);
    }
    f.rect(0.3, 3.75, W - 0.3, 4.7, C.charcoal, { outline: true, w: W_FINE });
    f.text("WARENHUIS", W / 2, 3.98, 0.5, { align: "c", color: C.gold, w: 0.085, layer: 1 });
    windowGrid(f, rng, 0.4, 5.0, W - 0.4, 10.5, 5, 3, { lit: 0.7, trim: C.cream });
    f.rect(0, 10.75, W, H, C.cream, { grain: 0.4 });
    f.seg(0, 10.75, W, 10.75, { w: W_FINE });
    const g = pen.wall("x+", X0, Y0, 0, W, D);
    g.rect(0, 0, D, 0.4, C.stoneDark, { grain: 0.6 });
    for (let i = 0; i < 3; i++) {
      const a = 0.7 + i * 2.1;
      archWindow(g, a, 0.4, a + 1.6, 3.3, true, C.cream);
    }
    windowGrid(g, rng, 0.4, 5.0, D - 0.4, 10.5, 4, 3, { lit: 0.7, trim: C.cream });
    g.rect(0, 10.75, D, H, C.cream, { grain: 0.4 });
    g.seg(0, 10.75, D, 10.75, { w: W_FINE });
  });
  // awnings over the shop windows
  pen.obj(() => {
    for (let i = 0; i < 4; i++) {
      const a = X0 + 0.45 + i * 2.05;
      const aw = pen.plane([a, Y0 + D, 3.55], [1, 0, 0], [0, 1.0, -0.5], 0, true);
      aw.rect(0, 0, 1.8, 1, C.blueDark, { outline: true, w: W_FINE, grain: 0.5 });
      aw.seg(0, 1, 1.8, 1, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0 });
    }
  }, 0.1);
  // corner turret with a clock, flags along the roof
  pen.obj(() => {
    pen.box(X0 + W - 1.9, Y0 + D - 1.9, H, 1.9, 1.9, 3.1, STORE);
    pen.pyramid(X0 + W - 2.05, Y0 + D - 2.05, H + 3.1, 2.2, 2.2, 2.3, C.copper);
    pen.card(X0 + W - 0.95, Y0 + D - 0.95, H + 5.4).circle(0, 0.2, 0.2, C.gold, { outline: true, w: W_FINE, seg: 8 });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, X0 + W - 1.9, Y0 + D - 1.9, H, 1.9, 1.9);
      f.circle(0.95, 1.75, 0.62, C.white, { outline: true, w: W_FINE, seg: 14, grain: 0.2, glow: 0.6 });
      f.seg(0.95, 1.75, 0.95, 2.2, { w: 0.06, wobble: 0, layer: 1 });
      f.seg(0.95, 1.75, 1.25, 1.62, { w: 0.06, wobble: 0, layer: 1 });
    }
  }, 0.3);
  flag(pen, X0 + 1.0, Y0 + D - 0.4, H, 2.8, "amsterdam", 0.8);
  flag(pen, X0 + 3.3, Y0 + D - 0.4, H, 2.8, "nl", 0.8);
  flag(pen, X0 + 5.6, Y0 + D - 0.4, H, 2.8, "amsterdam", 0.8);
  // shoppers, bags in hand
  for (const [x, y] of scatter(rng, 33.6, 15.5, 40.6, 16.3, 6, 0.9)) {
    const lk = randomLook(rng);
    pen.obj(() => {
      person(pen, x, y, 0, lk, "stand", rng.chance(0.5));
      pen.card(x, y, 0).rect(0.36, 0.5, 0.7, 0.92, rng.pick([C.white, C.red, C.yellow, C.sky]), { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
    });
  }
}

// ---------------------------------------------------------------- the National Monument

const STONE_LOOK: Look = { skin: C.white, hair: C.stone, top: C.white, legs: C.stone, long: false, hat: null };

function monument(c: BlockCtx): void {
  const { pen, rng } = c;
  const [mx, my] = MON;
  // three round steps
  pen.obj(() => {
    pen.cyl(mx, my, 0, 5.2, 0.22, C.stone, { seg: 28 });
    pen.cyl(mx, my, 0.22, 4.4, 0.22, C.stone, { seg: 26 });
    pen.cyl(mx, my, 0.44, 3.6, 0.22, C.quayCap, { seg: 24 });
  });
  // the curved wall that closes the back
  pen.obj(() => {
    const foot: V2[] = [];
    const a0 = (150 * Math.PI) / 180;
    const a1 = (300 * Math.PI) / 180;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = a0 + ((a1 - a0) * i) / n;
      foot.push([mx + Math.cos(t) * 3.45, my + Math.sin(t) * 3.45]);
    }
    for (let i = n; i >= 0; i--) {
      const t = a0 + ((a1 - a0) * i) / n;
      foot.push([mx + Math.cos(t) * 2.95, my + Math.sin(t) * 2.95]);
    }
    pen.extrude(foot, 0.66, 3.2, C.white, { crease: 30, top: C.quayCap });
    for (const z of [1.15, 2.75]) {
      const line: V3[] = [];
      for (let i = 0; i <= n; i++) {
        const t = a0 + ((a1 - a0) * i) / n;
        line.push([mx + Math.cos(t) * 2.93, my + Math.sin(t) * 2.93, z]);
      }
      pen.stroke(line, { w: 0.05, color: C.stoneDark, kind: L_MARK, wobble: 0.3 });
    }
    // urns set into the wall
    for (let i = 1; i < 7; i++) {
      const t = a0 + ((a1 - a0) * (i * 2)) / n;
      const k = pen.card(mx + Math.cos(t) * 2.9, my + Math.sin(t) * 2.9, 1.3);
      k.ellipse(0, 0.5, 0.2, 0.32, C.stoneDark, { outline: true, w: 0.04, seg: 8, grain: 0.4 });
    }
  }, 0.1);
  // the pylon
  pen.obj(() => {
    const b = 0.78;
    const t = 0.5;
    const z0 = 0.66;
    const z1 = 10.4;
    pen.solid(
      [
        [mx - b, my - b, z0],
        [mx + b, my - b, z0],
        [mx + b, my + b, z0],
        [mx - b, my + b, z0],
        [mx - t, my - t, z1],
        [mx + t, my - t, z1],
        [mx + t, my + t, z1],
        [mx - t, my + t, z1],
      ],
      [
        [1, 2, 6, 5],
        [3, 0, 4, 7],
        [2, 3, 7, 6],
        [0, 1, 5, 4],
        [4, 5, 6, 7],
      ],
      C.white,
    );
    // the figures carved on its front, and the woman and child above them
    person(pen, mx + 1.05, my + 0.25, z0, STONE_LOOK, "stand", false, 0.85);
    person(pen, mx + 0.25, my + 1.05, z0, STONE_LOOK, "stand", true, 0.85);
    person(pen, mx + 0.85, my + 0.85, z0, STONE_LOOK, "cheer", false, 0.9);
    pen.box(mx + 0.2, my + 0.2, 5.6, 0.75, 0.75, 0.25, C.quayCap, { w: W_THIN });
    person(pen, mx + 0.62, my + 0.62, 5.85, STONE_LOOK, "wave", false, 0.8);
    const k = pen.card(mx + 0.6, my + 0.6, 8.2);
    k.circle(0, 0.4, 0.42, null, { ink: C.stoneDark, w: 0.11, seg: 12 });
  }, 0.2);
  // two lions keeping watch
  for (const [dx, dy, flip] of [
    [4.2, -1.5, false],
    [-1.5, 4.2, true],
  ] as const) {
    pen.obj(() => {
      const x = mx + dx;
      const y = my + dy;
      pen.box(x - 0.55, y - 0.55, 0.22, 1.1, 1.1, 0.75, C.quayCap, { w: W_THIN });
      const k = pen.card(x, y, 0.97, flip);
      k.ellipse(-0.05, 0.36, 0.5, 0.3, C.stone, { outline: true, w: W_FINE, seg: 10 });
      k.circle(0.42, 0.66, 0.3, C.stoneDark, { outline: true, w: W_FINE, seg: 9, layer: 1 });
      k.circle(0.47, 0.64, 0.19, C.stone, { outline: true, w: 0.04, seg: 8, layer: 2 });
      k.bar(-0.5, 0.42, -0.72, 0.75, 0.08, C.stone, { layer: 1 });
    });
  }
  flag(pen, mx - 4.4, my + 3.7, 0, 7.2, "nl", 1.1);
  flag(pen, mx + 3.7, my - 4.4, 0, 7.2, "amsterdam", 1.1);
  // people on the steps: the best seats on the square
  const seats: [number, number][] = [
    [8, 4.7],
    [22, 4.75],
    [35, 4.0],
    [47, 4.72],
    [58, 3.95],
    [70, 4.74],
    [84, 4.0],
    [96, 4.7],
    [108, 4.72],
    [-6, 4.0],
    [-20, 4.74],
  ];
  for (const [deg, r] of seats) {
    const t = (deg * Math.PI) / 180;
    const z = (r > 4.4 ? 0.22 : 0.44) - 0.14;
    person(pen, mx + Math.cos(t) * r, my + Math.sin(t) * r, z, randomLook(rng), "sit", Math.cos(t) < Math.sin(t));
  }
  pen.obj(() => {
    // one of them has brought a guitar
    const t = (58 * Math.PI) / 180;
    const k = pen.card(mx + Math.cos(t) * 3.95, my + Math.sin(t) * 3.95, 0.3);
    k.ellipse(0.2, 0.72, 0.26, 0.2, C.wood, { outline: true, w: W_FINE, layer: 5, seg: 9 });
    k.bar(0.36, 0.84, 0.82, 1.2, 0.08, C.woodDark, { layer: 5 });
  });
}

// ---------------------------------------------------------------- characters

const BRIDE: Look = { skin: SKIN[1], hair: HAIR[2], top: C.white, legs: C.white, long: true, hat: null };
const GROOM: Look = { skin: SKIN[0], hair: HAIR[0], top: NAVY, legs: NAVY, long: false, hat: null };
const GUARD: Look = { skin: SKIN[2], hair: C.black, top: C.blueDark, legs: C.black, long: false, hat: C.black };

function bride(pen: Pen, pose: Pose): void {
  const k = pen.card(0, 0, 0);
  // the veil sits behind her
  k.poly(
    [
      [-0.3, 2.2],
      [0.1, 2.3],
      [-0.42, 0.95],
      [-0.8, 1.0],
    ],
    C.white,
    { outline: true, w: 0.04, grain: 0.2, layer: -1 },
  );
  person(pen, 0, 0, 0, BRIDE, pose);
  k.poly(
    [
      [-0.62, 0.02],
      [0.62, 0.02],
      [0.34, 0.95],
      [-0.34, 0.95],
    ],
    C.white,
    { outline: true, w: W_FINE, layer: 1.6, grain: 0.3 },
  );
  k.circle(-0.36, 1.02, 0.2, C.pink, { outline: true, w: 0.04, layer: 5, seg: 7 });
  k.circle(-0.3, 1.1, 0.09, C.red, { layer: 6, seg: 6, grain: 0 });
}

function groom(pen: Pen, pose: Pose): void {
  person(pen, 0, 0, 0, GROOM, pose, true);
  const k = pen.card(0, 0, 0);
  k.poly(
    [
      [-0.1, 1.42],
      [0.1, 1.42],
      [0, 1.1],
    ],
    C.white,
    { layer: 2.5, grain: 0 },
  );
  k.circle(0.2, 1.22, 0.07, C.orange, { layer: 5, seg: 6, grain: 0 });
}

function guard(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    person(pen, x, y, 0, GUARD, "stand");
    const k = pen.card(x, y, 0);
    k.poly(
      [
        [-0.33, 2.1],
        [0.33, 2.1],
        [0.36, 2.72],
        [0, 2.95],
        [-0.36, 2.72],
      ],
      C.black,
      { outline: true, w: W_FINE, layer: 5, grain: 0.5 },
    );
    k.seg(-0.2, 1.3, 0.2, 0.9, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
  });
}

function pigeonStanding(k: Plane, peck: number): void {
  k.ellipse(0, 0.2, 0.25, 0.16, PIGEON, { outline: true, w: 0.045, seg: 8, grain: 0.3 });
  if (peck) k.circle(0.26, 0.14, 0.1, PIGEON_D, { outline: true, w: 0.04, seg: 6, layer: 1 });
  else k.circle(0.2, 0.36, 0.1, PIGEON_D, { outline: true, w: 0.04, seg: 6, layer: 1 });
  k.seg(-0.03, 0.06, -0.03, 0, { w: 0.03, color: C.orange, kind: L_BAR, wobble: 0 });
  k.seg(0.07, 0.06, 0.07, 0, { w: 0.03, color: C.orange, kind: L_BAR, wobble: 0 });
}

function pigeonFlying(k: Plane, up: number): void {
  k.ellipse(0, 0, 0.26, 0.12, PIGEON, { outline: true, w: 0.045, seg: 8, grain: 0.3 });
  k.circle(0.26, 0.05, 0.09, PIGEON_D, { seg: 6, layer: 1, grain: 0 });
  const b = up ? 0.42 : -0.3;
  k.poly(
    [
      [-0.12, 0.04],
      [0.1, 0.04],
      [-0.08, b],
      [-0.34, b * 0.8],
    ],
    C.white,
    { outline: true, w: 0.04, layer: 2, grain: 0.2 },
  );
}

/** The street organ: a painted cart that plays by itself while its owner shakes the coin tin. */
function organ(pen: Pen, rng: Rng): void {
  const cream = hex("#f6ebcf");
  pen.begin();
  pen.box(0, 0, 0.55, 3.6, 1.5, 2.6, C.red);
  // big spoked wheels
  for (const y of [-0.12, 1.62]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    for (const a of [0.75, 2.85]) {
      q.circle(a, 0.62, 0.62, C.woodDark, { outline: true, w: W_THIN, seg: 12 });
      q.circle(a, 0.62, 0.2, C.gold, { layer: 1, seg: 8, outline: true, w: 0.04 });
    }
  }
  // the show front
  const f = pen.wall("y+", 0, 0, 0.55, 3.6, 1.5);
  f.extrude(
    [
      [0, 2.6],
      [3.6, 2.6],
      [3.6, 2.9],
      [3.05, 3.05],
      [2.5, 3.5],
      [1.8, 3.72],
      [1.1, 3.5],
      [0.55, 3.05],
      [0, 2.9],
    ],
    0.12,
    cream,
  );
  const ff = pen.wall("y+", 0, 0, 0.55, 3.6, 1.62);
  f.rect(0.12, 0.75, 3.48, 2.5, cream, { outline: true, w: W_FINE, grain: 0.4 });
  f.rect(1.15, 0.95, 2.45, 2.35, NAVY, { outline: true, w: W_FINE, layer: 1 });
  for (let i = 0; i < 6; i++) {
    const a = 1.3 + i * 0.2;
    const h = 0.6 + Math.sin((i / 5) * Math.PI) * 0.6;
    f.seg(a, 1.05, a, 1.05 + h, { w: 0.11, color: C.gold, kind: L_MARK, wobble: 0, layer: 2 });
  }
  for (const a of [0.25, 2.6]) {
    f.poly(archShape(a, 0.95, a + 0.75, 2.3), a < 1 ? C.pink : C.copper, { outline: true, w: W_FINE, layer: 1, grain: 0.4 });
    f.circle(a + 0.375, 1.85, 0.14, C.white, { layer: 2, seg: 7, grain: 0 });
    f.rect(a + 0.26, 1.2, a + 0.49, 1.7, C.white, { layer: 2, grain: 0 });
  }
  ff.text("ORGEL", 1.8, 2.82, 0.36, { align: "c", color: C.redDark, w: 0.075 });
  ff.line(
    [
      [0.12, 2.72],
      [0.6, 2.95],
      [1.1, 3.38],
      [1.8, 3.6],
      [2.5, 3.38],
      [3.0, 2.95],
      [3.48, 2.72],
    ],
    { w: 0.09, color: C.gold, kind: L_MARK, wobble: 0.2 },
  );
  // the owner, shaking the brass tin
  const owner = randomLook(rng);
  owner.hat = C.black;
  person(pen, 4.3, 1.9, 0, owner, "wave", false);
  pen.card(4.3, 1.9, 0).rect(0.56, 1.8, 0.8, 2.08, C.gold, { outline: true, w: W_FINE, layer: 5, grain: 0 });
  pen.end();
}

/** A horse and open carriage, nose towards +x, the rig centred on the origin. */
function carriage(pen: Pen, frame: number, coat: RGB, rng: Rng): void {
  pen.push(2.0, 0, 0);
  // the horse is all round bars, so it reads the same from whichever side it is seen
  const legs: number[][] =
    frame === 0
      ? [
          [0.72, 0.2, 1.02, 0.02],
          [0.72, -0.2, 0.45, 0.28],
          [-0.7, 0.2, -0.45, 0.28],
          [-0.7, -0.2, -1.02, 0.02],
        ]
      : [
          [0.72, 0.2, 0.5, 0.28],
          [0.72, -0.2, 0.98, 0.02],
          [-0.7, 0.2, -0.98, 0.02],
          [-0.7, -0.2, -0.5, 0.28],
        ];
  for (const l of legs) pen.pole([l[0], l[1], 1.15], [l[2], l[1], l[3] + 0.06], 0.17, coat);
  pen.pole([-0.78, 0, 1.4], [0.78, 0, 1.4], 0.86, coat);
  pen.pole([0.85, 0, 1.6], [1.3, 0, 2.3], 0.42, coat);
  pen.pole([1.3, 0, 2.38], [1.74, 0, 2.02], 0.32, coat);
  pen.pole([-1.05, 0, 1.55], [-1.42, 0, 0.95], 0.14, C.black, { ink: false });
  pen.stroke(
    [
      [0.8, 0, 1.98],
      [1.12, 0, 2.52],
    ],
    { w: 0.13, color: C.black, kind: L_BAR, wobble: 0, bias: 0.05 },
  );
  // the carriage itself
  pen.box(-4.45, -0.72, 0.8, 2.35, 1.44, 0.5, C.black, { w: W_THIN });
  pen.box(-4.45, -0.72, 1.3, 0.25, 1.44, 0.72, C.redDark, { w: W_THIN });
  pen.box(-2.55, -0.6, 1.3, 0.45, 1.2, 0.4, C.black, { w: W_THIN });
  for (const y of [-0.84, 0.84]) {
    const q = pen.plane([0, y, 0], [1, 0, 0], [0, 0, 1], 0, true);
    q.circle(-3.95, 0.62, 0.62, null, { w: 0.09, seg: 10, wobble: 0 });
    q.circle(-2.62, 0.48, 0.48, null, { w: 0.09, seg: 9, wobble: 0 });
    q.seg(-3.95, 0.05, -3.95, 1.2, { w: 0.05, wobble: 0, kind: L_BAR });
    q.seg(-4.52, 0.62, -3.38, 0.62, { w: 0.05, wobble: 0, kind: L_BAR });
    pen.stroke(
      [
        [-2.1, y * 0.6, 1.0],
        [0.7, y * 0.6, 1.3],
      ],
      { w: 0.07, kind: L_BAR, wobble: 0 },
    );
  }
  const driver = randomLook(rng);
  driver.hat = C.black;
  driver.top = C.charcoal;
  person(pen, -2.3, 0, 1.6, driver, "bust");
  pen.card(-2.3, 0, 1.6).rect(-0.26, 1.48, 0.26, 1.9, C.black, { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
  person(pen, -3.8, 0.32, 1.25, randomLook(rng), "bust");
  person(pen, -3.8, -0.34, 1.25, randomLook(rng), "bust", true);
  pen.pop();
}

// ---------------------------------------------------------------- life on the square

/** Draws everyone who stands still. Returns where the ones who jump are standing. */
function squareLife(c: BlockCtx): V2[] {
  const { pen, rng } = c;
  const jumpers: V2[] = [];

  // ---- the crowd under the balcony
  const crowd = scatter(rng, 18.5, 18.4, 24.9, 30.6, 44, 0.86, (x, y) => !(x < 19.3 && y > 21 && y < 28));
  crowd.forEach(([x, y], i) => {
    if (i % 4 === 0) {
      jumpers.push([x, y]);
      return;
    }
    const lk = fan(rng);
    const pose: Pose = rng.pick(["cheer", "wave", "stand", "wave", "cheer"]);
    const small = rng.chance(0.12);
    person(pen, x, y, 0, lk, pose, rng.chance(0.5), small ? 0.72 : 1);
    if (!small && pose !== "cheer" && rng.chance(0.3)) handFlag(pen, x, y, 0, rng.chance(0.6) ? "orange" : "nl", rng.chance(0.5));
  });
  guard(pen, 17.75, 21.3);
  guard(pen, 17.75, 27.7);
  // the television crew
  pen.obj(() => {
    const x = 18.6;
    const y = 31.3;
    for (const [dx, dy] of [
      [-0.35, -0.2],
      [0.35, -0.2],
      [0, 0.38],
    ]) {
      pen.stroke(
        [
          [x + dx, y + dy, 0],
          [x, y, 1.5],
        ],
        { w: 0.07, kind: L_BAR, wobble: 0 },
      );
    }
    pen.box(x - 0.2, y - 0.6, 1.5, 0.4, 0.9, 0.45, C.charcoal, { w: W_THIN });
    pen.box(x - 0.12, y - 0.9, 1.6, 0.24, 0.3, 0.24, C.black, { w: W_FINE });
    const op = randomLook(rng);
    op.hat = C.black;
    person(pen, x + 0.35, y + 0.85, 0, op, "stand", true);
    const rep = randomLook(rng);
    rep.top = C.red;
    person(pen, x + 1.3, y - 0.1, 0, rep, "wave");
    pen.card(x + 1.3, y - 0.1, 0).circle(0.66, 1.92, 0.1, C.charcoal, { layer: 5, seg: 6, grain: 0 });
  });

  // ---- the street organ and its audience
  pen.push(19.3, 39.3, 0, 270);
  organ(pen, rng);
  pen.pop();
  for (const [x, y, pose] of [
    [22.2, 36.0, "stand"],
    [22.8, 37.2, "cheer"],
    [22.3, 38.4, "stand"],
    [23.6, 36.5, "wave"],
    [23.5, 37.9, "stand"],
  ] as const) {
    person(pen, x, y, 0, randomLook(rng), pose, rng.chance(0.5), pose === "cheer" ? 0.7 : 1);
  }

  // ---- the living statue, and the ring that forms round anything that stands still
  pen.box(33.55, 37.35, 0, 0.9, 0.9, 0.7, C.greyDark, { w: W_THIN });
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2 + 0.3;
    if (i === 7) continue;
    const r = 2.45 + rng.range(-0.15, 0.25);
    person(pen, 34 + Math.cos(t) * r, 37.8 + Math.sin(t) * r, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), Math.cos(t) > Math.sin(t), rng.chance(0.2) ? 0.72 : 1);
  }
  // the hat for coins
  pen.cyl(34.9, 38.9, 0, 0.26, 0.2, C.black, { seg: 8, w: W_FINE });

  // ---- herring, the proper way: by the tail, head back
  pen.push(37.5, 33.1, 0);
  stall(pen, rng, { w: 3.2, d: 2.0, a: C.blue, sign: "HARING", goods: [C.metal, C.white, C.glassLight] });
  pen.pop();
  flag(pen, 37.2, 33.3, 0, 4.4, "nl", 0.8);
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 38.6, 36.5, 0, lk, "wave");
    const k = pen.card(38.6, 36.5, 0);
    k.poly(
      [
        [0.72, 1.99],
        [0.6, 1.72],
        [0.36, 1.58],
        [0.45, 1.85],
      ],
      C.metal,
      { outline: true, w: 0.04, layer: 6, grain: 0.2 },
    );
  });
  person(pen, 39.9, 36.8, 0, randomLook(rng), "stand", true);
  person(pen, 37.7, 37.0, 0, randomLook(rng), "stand", false, 0.72);

  // ---- photographs
  person(pen, 26.0, 31.3, 0, randomLook(rng), "cheer");
  person(pen, 26.75, 31.65, 0, randomLook(rng), "wave", true);
  photographer(pen, 25.0, 32.5, randomLook(rng), false);
  photographer(pen, 39.3, 39.3, randomLook(rng), false);
  person(pen, 40.4, 38.5, 0, randomLook(rng), "wave", true);
  // a selfie, with the stick
  pen.obj(() => {
    const a = randomLook(rng);
    person(pen, 23.0, 33.0, 0, a, "stand");
    person(pen, 23.75, 32.7, 0, randomLook(rng), "wave", true);
    person(pen, 22.35, 32.6, 0, randomLook(rng), "stand", false, 0.72);
    const k = pen.card(23.0, 33.0, 0);
    k.seg(0.4, 1.3, 1.35, 2.25, { w: 0.05, kind: L_BAR, wobble: 0, layer: 5 });
    k.rect(1.28, 2.18, 1.5, 2.5, C.black, { layer: 5, grain: 0 });
  });

  // ---- balloons
  pen.obj(() => {
    const lk = randomLook(rng);
    person(pen, 26.6, 39.8, 0, lk, "wave");
    const k = pen.card(26.6, 39.8, 0);
    const cols = [C.red, C.yellow, C.blue, C.orange, C.pink, C.green, C.purple, C.orange, C.red];
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
  person(pen, 27.7, 39.4, 0, randomLook(rng), "cheer", true, 0.68);

  // ---- a few pigeons too lazy to fly, benches and lamps
  for (let i = 0; i < 9; i++) {
    const x = rng.range(20, 40);
    const y = rng.range(32.5, 40.6);
    if (Math.hypot(x - PIGEONS[0], y - PIGEONS[1]) < 3) continue;
    pen.obj(() => pigeonStanding(pen.card(x, y, 0, rng.chance(0.5)), 0));
  }
  bench(pen, 24.6, 40.2, 0);
  bench(pen, 29.0, 40.2, 0);
  for (const [x, y] of [
    [18.3, 16.4],
    [40.45, 19.0],
    [17.6, 40.9],
    [40.4, 40.3],
    [31.0, 40.1],
    [40.5, 31.7],
  ]) {
    lamp(pen, x, y, 0, 3.6);
  }
  return jumpers;
}

// ---------------------------------------------------------------- everything that moves

function motion(c: BlockCtx, jumpAt: V2[]): void {
  const { rng } = c;
  const W = (x: number, y: number, z = 0): V3 => [c.ox + x, c.oy + y, c.oz + z];
  const born = c.done;

  // ---- the couple on the balcony
  const brideF = [makeSprite((p) => bride(p, "wave"), 0, 11), makeSprite((p) => bride(p, "cheer"), 0, 11)];
  const groomF = [makeSprite((p) => groom(p, "wave"), 0, 12), makeSprite((p) => groom(p, "stand"), 0, 12)];
  const bp = W(17.62, 24.0, 2.86);
  const gp = W(17.62, 25.05, 2.86);
  c.movers.push((m) => {
    m.put(brideF[Math.floor(m.t * 1.6) & 1], bp[0], bp[1], bp[2], born);
    m.put(groomF[Math.floor(m.t * 1.1 + 0.4) & 1], gp[0], gp[1], gp[2], born);
  });

  // ---- the ones who cannot keep their feet on the ground
  const jr = new Rng(55);
  const jumpers = jumpAt.map(([x, y]) => {
    const lk = fan(jr);
    const flip = jr.chance(0.5);
    return {
      p: W(x, y),
      up: makeSprite((p) => person(p, 0, 0, 0, lk, "cheer"), 0, 31),
      down: makeSprite((p) => person(p, 0, 0, 0, lk, "wave", flip), 0, 31),
      ph: jr.range(0, 6.28),
      w: jr.range(5.2, 7),
      b: born + jr.range(0, 0.8),
    };
  });
  c.movers.push((m) => {
    for (const j of jumpers) {
      const s = Math.sin(m.t * j.w + j.ph);
      m.put(s > 0 ? j.up : j.down, j.p[0], j.p[1], j.p[2] + (s > 0 ? s * 0.55 : 0), j.b);
    }
  });

  // ---- confetti
  const cols = [C.orange, C.orange, C.white, C.red, C.blue, C.yellow, C.pink];
  const bits: Sprite[] = cols.map((col, i) =>
    makeSprite(
      (p) => {
        p.card(0, 0, 0).poly(
          [
            [-0.13, -0.07],
            [0.13, -0.04],
            [0.11, 0.09],
            [-0.12, 0.06],
          ],
          col,
          { grain: 0, outline: true, w: 0.035 },
        );
      },
      0,
      40 + i,
    ),
  );
  const cr = new Rng(77);
  const confetti: { x: number; y: number; top: number; period: number; ph: number; sw: number; f: number; s: Sprite }[] = [];
  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: cr.range(17.4, 24.6),
      y: cr.range(19.2, 29.8),
      top: cr.range(6.5, 9.5),
      period: cr.range(3.2, 5.6),
      ph: cr.next(),
      sw: cr.range(0.25, 0.7),
      f: cr.range(1.2, 2.6),
      s: bits[i % bits.length],
    });
  }
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 21, c.oy + 24.5, 4, 14)) return;
    for (const b of confetti) {
      const u = (m.t / b.period + b.ph) % 1;
      const z = b.top * (1 - u) + 0.15;
      const dx = Math.sin(m.t * b.f + b.ph * 30) * b.sw;
      m.put(b.s, c.ox + b.x + dx * 0.5, c.oy + b.y - dx * 0.5, c.oz + z, born);
    }
  });

  // ---- notes drifting up from the organ
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
  const np = W(21.3, 37.5, 4.2);
  c.movers.push((m) => {
    if (m.t < born || !m.sees(np[0], np[1], np[2], 8)) return;
    for (let i = 0; i < 4; i++) {
      const u = (m.t / 3.4 + i / 4) % 1;
      const sx = Math.sin(u * 7 + i * 2) * 0.35;
      // each note sketches itself in, then runs its reveal backwards to fade out as it rises
      const p = Math.min(u * 3.4, ((1 - u) / 0.3) * 1.05);
      m.put(note, np[0] + sx + i * 0.25, np[1] - sx - i * 0.2, np[2] + u * 3.2, m.t - p);
    }
  });

  // ---- the living statue moves only when paid
  const silver: Look = { skin: SILVER, hair: SILVER, top: SILVER, legs: SILVER, long: false, hat: SILVER };
  const statue = (pose: Pose) =>
    makeSprite(
      (p) => {
        person(p, 0, 0, 0, silver, pose);
        p.card(0, 0, 0).rect(-0.3, 2.22, 0.3, 2.75, SILVER, { outline: true, w: W_FINE, layer: 5, grain: 0.3 });
      },
      0,
      81,
    );
  const st = [statue("stand"), statue("wave"), statue("cheer")];
  const sp = W(34, 37.8, 0.7);
  c.movers.push((m) => {
    const u = m.t % 6.5;
    m.put(u < 4.6 ? st[0] : u < 5.6 ? st[1] : st[2], sp[0], sp[1], sp[2], born);
  });

  // ---- the horse and carriage, round and round the monument
  const coat = hex("#7a5a43");
  const horse = [new Turning((p) => carriage(p, 0, coat, new Rng(5)), 32, 91), new Turning((p) => carriage(p, 1, coat, new Rng(5)), 32, 91)];
  const ring: V3[] = [W(MON[0] - 6.6, MON[1] - 6.4), W(MON[0] + 6.6, MON[1] - 6.4), W(MON[0] + 6.6, MON[1] + 6.4), W(MON[0] - 6.6, MON[1] + 6.4)];
  const loop = new Route(rounded(ring, true, 4.2), true);
  c.movers.push(
    traveler(loop, {
      speed: 1.9,
      at: 0.3,
      born: born + 0.3,
      span: 3.4,
      sprite: (h, t) => horse[Math.floor(t * 3.4) & 1].at(h),
    }),
  );

  // ---- the pigeons, and the two children who keep them fit
  const T = 12;
  const kidLoop: V3[] = [];
  const kc: V2 = [PIGEONS[0] - 2.4, PIGEONS[1] + 0.4];
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2;
    kidLoop.push(W(kc[0] + Math.cos(t) * 2.4, kc[1] + Math.sin(t) * 1.9));
  }
  const kidRoute = new Route(kidLoop, true);
  const kr = new Rng(13);
  for (let i = 0; i < 2; i++) {
    const lk = randomLook(kr);
    const mk = (pose: Pose, flip: boolean) => makeSprite((p) => person(p, 0, 0, 0, lk, pose, flip, 0.66), 0, 120 + i);
    const fr = [
      [mk("walkA", false), mk("cheer", false)],
      [mk("walkA", true), mk("cheer", true)],
    ];
    c.movers.push(
      traveler(kidRoute, {
        speed: kidRoute.length / T,
        at: 1 - (i * 1.3) / kidRoute.length,
        born,
        span: 0.8,
        sprite: (h, t) => fr[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 4 + i) & 1],
      }),
    );
  }
  const standing = [
    [makeSprite((p) => pigeonStanding(p.card(0, 0, 0), 0), 0, 3), makeSprite((p) => pigeonStanding(p.card(0, 0, 0), 1), 0, 3)],
    [makeSprite((p) => pigeonStanding(p.card(0, 0, 0, true), 0), 0, 3), makeSprite((p) => pigeonStanding(p.card(0, 0, 0, true), 1), 0, 3)],
  ];
  const flying = [
    [makeSprite((p) => pigeonFlying(p.card(0, 0, 0), 1), 0, 4), makeSprite((p) => pigeonFlying(p.card(0, 0, 0), 0), 0, 4)],
    [makeSprite((p) => pigeonFlying(p.card(0, 0, 0, true), 1), 0, 4), makeSprite((p) => pigeonFlying(p.card(0, 0, 0, true), 0), 0, 4)],
  ];
  const pr = new Rng(21);
  const flock: { hx: number; hy: number; ox: number; oy: number; oz: number; lag: number; flip: number; ph: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const a = pr.range(0, 6.28);
    const r = Math.sqrt(pr.next()) * 1.9;
    flock.push({
      hx: PIGEONS[0] + Math.cos(a) * r,
      hy: PIGEONS[1] + Math.sin(a) * r * 0.8,
      ox: pr.range(-1.6, 1.6),
      oy: pr.range(-1.6, 1.6),
      oz: pr.range(-0.8, 0.8),
      lag: pr.range(0, 0.5),
      flip: pr.chance(0.5) ? 1 : 0,
      ph: pr.range(0, 10),
    });
  }
  // the flight: one lap over the square and round the monument
  const fc: V2 = [31.5, 28.5];
  const th0 = Math.atan2(PIGEONS[1] - fc[1], PIGEONS[0] - fc[0]);
  const lap = (u: number, out: V3) => {
    const th = th0 + u * Math.PI * 2;
    out[0] = fc[0] + Math.cos(th) * 8.6;
    out[1] = fc[1] + Math.sin(th) * 6.4;
    out[2] = 6.4 + Math.sin(u * Math.PI) * 2.2;
  };
  const q: V3 = [0, 0, 0];
  const q2: V3 = [0, 0, 0];
  c.movers.push((m) => {
    if (m.t < born || !m.sees(c.ox + 30, c.oy + 30, 4, 18)) return;
    for (const b of flock) {
      // the children reach the flock at the top of every cycle
      const u = (((m.t - b.lag) % T) + T) % T;
      let x: number;
      let y: number;
      let z: number;
      let air = true;
      let right = b.flip === 0;
      if (u < 1.1) {
        const e = ease.inOut(u / 1.1);
        lap(0, q);
        x = b.hx + (q[0] + b.ox - b.hx) * e;
        y = b.hy + (q[1] + b.oy - b.hy) * e;
        z = (q[2] + b.oz) * e;
        right = q[0] - q[1] > b.hx - b.hy;
      } else if (u < 6.1) {
        const v = (u - 1.1) / 5;
        lap(v, q);
        lap(v + 0.01, q2);
        x = q[0] + b.ox;
        y = q[1] + b.oy;
        z = q[2] + b.oz;
        right = q2[0] - q2[1] > q[0] - q[1];
      } else if (u < 7.6) {
        const e = ease.inOut((u - 6.1) / 1.5);
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

  // ---- people crossing the square: along the two open sides, and past the church
  const prom: V3[] = [W(22.4, 41.3), W(41.5, 41.3), W(41.5, 16.75), W(41.05, 16.75), W(41.05, 40.85), W(22.4, 40.85)];
  const promRoute = new Route(rounded(prom, true, 0.3), true);
  for (let i = 0; i < 7; i++) c.movers.push(walker(promRoute, rng, born + rng.range(0, 1)));
  const north: V3[] = [W(17.4, 17.3), W(28.5, 17.3), W(29.3, 16.55), W(40.6, 16.55), W(40.6, 17.05), W(29.5, 17.05), W(28.7, 17.8), W(17.4, 17.8)];
  const northRoute = new Route(rounded(north, true, 0.25), true);
  for (let i = 0; i < 5; i++) c.movers.push(walker(northRoute, rng, born + rng.range(0, 1)));
}

export const dam: BlockBuilder = (c) => {
  c.early(() => ground(c));
  palace(c);
  church(c);
  store(c);
  monument(c);
  const jumpers = squareLife(c);
  motion(c, jumpers);
};
