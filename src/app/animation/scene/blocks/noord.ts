// Noord: the island across the IJ. The A'DAM tower with its swing over the
// edge, the white origami of the EYE film museum, the old shipyard's crane
// and containers, and the landing where the free ferry comes in.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen } from "../../engine/pen";
import { WATER } from "../city";
import { W_FINE, W_THIN, bench, bike, cafeTable, flag, lamp, person, railing, randomLook, speckle, tree, tufts, windowGrid } from "../kit";
import { Route, makeSprite, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";
import { FERRY } from "./centraal";

/** Street level above the water. */
const G = -WATER;

// The island: a rounded lozenge of land, centred a little south of the frame's middle so the ferry lands on its flank.
const CX = 15;
const CY = 26.5;
const RA = 10;
const RB = 15;

function shoreline(n = 48): V2[] {
  const pts: V2[] = [];
  const e = 2 / 3;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const k = 1 + 0.018 * Math.sin(5 * t + 0.7) + 0.012 * Math.sin(9 * t);
    pts.push([CX + RA * k * Math.sign(c) * Math.pow(Math.abs(c), e), CY + RB * k * Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  return pts;
}

function onLand(x: number, y: number, pad = 0): boolean {
  const dx = Math.abs(x - CX) / (RA - pad);
  const dy = Math.abs(y - CY) / (RB - pad);
  return dx * dx * dx + dy * dy * dy < 1;
}

// ---------------------------------------------------------------- A'DAM tower

const TX = 9.6;
const TY = 14.6;
const TW = 5.2;
const TOWER_TOP = 18;
const CROWN_H = 2.1;
const TCX = TX + TW / 2;
const TCY = TY + TW / 2;
// the swing, in the crown's own turned frame: pivot bar along local x, swinging along local y
const SWING_X = 0.5;
const SWING_Y = -2.35;
const SWING_H = 3.1;

function tower(pen: Pen, rng: Rng): void {
  const body = hex("#3f506f");
  // podium
  pen.begin();
  pen.box(TX - 0.9, TY - 0.9, 0, TW + 1.8, TW + 1.8, 1.5, C.stone, { top: C.ballast });
  for (const side of ["x+", "y+"] as const) {
    const f = pen.wall(side, TX - 0.9, TY - 0.9, 0, TW + 1.8, TW + 1.8);
    f.rect(0.4, 0.2, TW + 1.4, 1.2, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
    for (let k = 1; k < 6; k++) f.seg(0.4 + (k * (TW + 1.0)) / 6, 0.2, 0.4 + (k * (TW + 1.0)) / 6, 1.2, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  pen.end();
  // the shaft, in three lifts so it grows as it is drawn
  const lifts = 3;
  const lh = (TOWER_TOP - 0.4 - 1.5) / lifts;
  for (let k = 0; k < lifts; k++) {
    const z = 1.5 + k * lh;
    pen.begin();
    pen.box(TX, TY, z, TW, TW, lh, body, { top: null });
    for (const side of ["x+", "y+"] as const) {
      const f = pen.wall(side, TX, TY, z, TW, TW);
      windowGrid(f, rng, 0.3, 0.15, TW - 0.3, lh - 0.1, 4, 3, { lit: 0.5, fillA: 0.6, fillB: 0.56, bars: false });
      for (let q = 0; q <= 4; q++) {
        const a = 0.3 + (q * (TW - 0.6)) / 4;
        f.seg(a, 0, a, lh, { w: 0.1, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
      }
    }
    pen.end(0.15 + k * 0.28);
  }
  // the crown: a box turned a quarter of a quarter, a viewing deck on top
  pen.begin();
  pen.box(TX - 0.3, TY - 0.3, TOWER_TOP - 0.4, TW + 0.6, TW + 0.6, 0.4, C.white, { w: W_THIN });
  pen.push(TCX, TCY, TOWER_TOP, 45);
  const h = 3.1;
  pen.box(-h, -h, 0, 2 * h, 2 * h, CROWN_H, C.white, { top: C.ballast });
  for (const side of ["x+", "y+", "y-"] as const) {
    const f = pen.wall(side, -h, -h, 0, 2 * h, 2 * h);
    f.rect(0.25, 0.3, 2 * h - 0.25, 1.75, C.glass, { outline: true, w: W_FINE, glow: 1 });
    if (side === "x+") f.text("A'DAM", h, 0.55, 0.95, { align: "c", w: 0.12, color: C.white, kind: L_MARK, wobble: 0.3, layer: 1 });
  }
  railing(
    pen,
    [
      [-h + 0.1, h - 0.1, CROWN_H],
      [h - 0.1, h - 0.1, CROWN_H],
      [h - 0.1, -h + 0.1, CROWN_H],
      [-h + 0.1, -h + 0.1, CROWN_H],
    ],
    0.7,
    C.greyDark,
    1.3,
  );
  // a string of lights round the top
  for (let k = 0; k < 9; k++) {
    const u = -h + (k * 2 * h) / 8;
    for (const p of [
      [h, u],
      [u, h],
    ] as V2[]) {
      pen.stroke(
        [
          [p[0], p[1] - 0.02, CROWN_H + 0.05],
          [p[0], p[1] + 0.02, CROWN_H + 0.05],
        ],
        { w: 0.22, kind: L_LIGHT, wobble: 0 },
      );
    }
  }
  // the swing's red frame: two A-frames and a bar
  const red = C.red;
  for (const sx of [SWING_X - 1.25, SWING_X + 1.25]) {
    pen.pole([sx, SWING_Y - 0.85, CROWN_H], [sx, SWING_Y, CROWN_H + SWING_H], 0.14, red);
    pen.pole([sx, SWING_Y + 0.85, CROWN_H], [sx, SWING_Y, CROWN_H + SWING_H], 0.14, red);
  }
  pen.pole([SWING_X - 1.25, SWING_Y, CROWN_H + SWING_H], [SWING_X + 1.25, SWING_Y, CROWN_H + SWING_H], 0.16, red);
  // mast with a warning light
  pen.pole([-0.8, 0.9, CROWN_H], [-0.8, 0.9, CROWN_H + 4.2], 0.1, C.white);
  pen.card(-0.8, 0.9, CROWN_H + 4.2).circle(0, 0.1, 0.2, C.red, { outline: true, w: 0.04, glow: 1, seg: 7 });
  // people on the deck, queuing for their turn
  for (let i = 0; i < 6; i++) {
    person(pen, rng.range(0.6, 2.5), rng.range(-0.6, 2.4), CROWN_H, randomLook(rng), rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5));
  }
  pen.pop();
  pen.end(1.0);
}

// ---------------------------------------------------------------- EYE

function eye(pen: Pen, rng: Rng): void {
  const white = C.white;
  const shade = hex("#e9ecec");
  // a long low wedge that climbs towards the east
  const nw: V2 = [6.6, 32.2];
  const ne: V2 = [18.4, 31.4];
  const se: V2 = [19.6, 37.4];
  const sw: V2 = [7.6, 38.4];
  const hNW = 2.2;
  const hNE = 4.4;
  const hSE = 3.8;
  const hSW = 2.0;
  pen.begin();
  pen.solid(
    [
      [nw[0], nw[1], 0],
      [ne[0], ne[1], 0],
      [se[0], se[1], 0],
      [sw[0], sw[1], 0],
      [nw[0], nw[1], hNW],
      [ne[0], ne[1], hNE],
      [se[0], se[1], hSE],
      [sw[0], sw[1], hSW],
    ],
    [
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
      [0, 1, 5, 4],
      [4, 5, 6],
      [4, 6, 7],
    ],
    [shade, white, white, white, white, shade],
    { w: 0.12, grain: 0.5 },
  );
  // the glass front on the water, with the name over it
  const len = Math.hypot(se[0] - sw[0], se[1] - sw[1]);
  const f = pen.plane([sw[0], sw[1], 0], [(se[0] - sw[0]) / len, (se[1] - sw[1]) / len, 0], [0, 0, 1], 1, true);
  f.poly(
    [
      [0.5, 0.3],
      [len - 0.5, 0.3],
      [len - 0.5, 2.5],
      [0.5, 1.4],
    ],
    C.glass,
    { outline: true, w: W_FINE, glow: 1 },
  );
  for (let q = 1; q < 10; q++) {
    const a = 0.5 + (q * (len - 1)) / 10;
    f.seg(a, 0.3, a, 1.4 + (1.1 * (a - 0.5)) / (len - 1), { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }
  f.text("EYE", len - 3.0, 2.58, 0.52, { align: "c", w: 0.085, color: C.black });
  const le = Math.hypot(se[0] - ne[0], se[1] - ne[1]);
  const fe = pen.plane([se[0], se[1], 0], [(ne[0] - se[0]) / le, (ne[1] - se[1]) / le, 0], [0, 0, 1], 1, true);
  fe.rect(0.5, 0.3, le - 0.5, 2.3, C.glass, { outline: true, w: W_FINE, glow: 1 });
  for (let q = 1; q < 5; q++) fe.seg(0.5 + (q * (le - 1)) / 5, 0.3, 0.5 + (q * (le - 1)) / 5, 2.3, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  pen.end();
  // the wing that juts out over the quay
  pen.obj(() => {
    const tip: V3 = [24.2, 35.3, 5.7];
    pen.solid(
      [[ne[0], ne[1], hNE], [se[0], se[1], hSE], tip, [ne[0], ne[1], 2.5], [se[0], se[1], 2.3]],
      [
        [0, 1, 2],
        [1, 4, 2],
        [0, 2, 3],
        [3, 2, 4],
      ],
      [white, hex("#d9dee0"), shade, shade],
      { w: 0.12, grain: 0.5 },
    );
  });
  // the terrace on the water
  cafeTable(pen, rng, 10.4, 39.9, C.white, 2);
  cafeTable(pen, rng, 13.4, 40.1, C.white, 3);
  cafeTable(pen, rng, 16.4, 39.6, C.white, 2);
  person(pen, 12.0, 40.6, 0, randomLook(rng), "stand");
  person(pen, 18.4, 39.2, 0, randomLook(rng), "wave", true);
  // sheltering under the wing
  person(pen, 20.3, 34.4, 0, randomLook(rng), "stand");
  person(pen, 20.5, 36.0, 0, randomLook(rng), "wave", true);
}

// ---------------------------------------------------------------- the shipyard

const BOX: RGB[] = [C.red, C.blue, C.yellow, hex("#58b7a3"), C.orange, C.green];

/** A shipping container, long side along local x. */
function container(pen: Pen, rgb: RGB, label?: string, open = false): void {
  const L = 4.2;
  const W = 1.7;
  const H = 1.7;
  pen.begin();
  pen.box(0, 0, 0, L, W, H, rgb, { w: 0.11 });
  const dark = scaleRGB(rgb, 0.82);
  for (const side of ["y+", "y-"] as const) {
    const f = pen.wall(side, 0, 0, 0, L, W);
    for (let a = 0.3; a < L; a += 0.3) f.seg(a, 0.12, a, H - 0.12, { w: 0.045, color: dark, kind: L_MARK, wobble: 0 });
    if (label && side === "y+") f.text(label, L / 2, 0.5, 0.72, { align: "c", w: 0.11, color: C.white, kind: L_MARK, wobble: 0.3, layer: 1 });
  }
  for (const side of ["x+", "x-"] as const) {
    const f = pen.wall(side, 0, 0, 0, L, W);
    if (open) f.rect(0.15, 0.1, W - 0.15, H - 0.15, C.lamp, { outline: true, w: W_FINE, glow: 1, grain: 0.3 });
    else {
      f.seg(W / 2, 0.1, W / 2, H - 0.1, { w: 0.06, wobble: 0 });
      f.seg(W / 2 - 0.2, 0.3, W / 2 - 0.2, H - 0.3, { w: 0.05, color: C.greyDark, kind: L_MARK, wobble: 0 });
      f.seg(W / 2 + 0.2, 0.3, W / 2 + 0.2, H - 0.3, { w: 0.05, color: C.greyDark, kind: L_MARK, wobble: 0 });
    }
  }
  pen.end();
}

function shipyard(pen: Pen, rng: Rng): void {
  // a stack of containers turned into a cafe
  const put = (x: number, y: number, z: number, rot: number, rgb: RGB, label?: string, open = false) => {
    pen.push(x, y, z, rot);
    container(pen, rgb, label, open);
    pen.pop();
  };
  put(17.2, 20.5, 0, 0, BOX[0], undefined, true);
  put(17.2, 22.4, 0, 0, BOX[1], "NDSM");
  put(17.6, 20.7, 1.7, 0, BOX[2]);
  put(21.4, 20.9, 3.4, 90, BOX[3]);
  // fairy lights from the stack to a pole
  pen.obj(() => {
    const a: V3 = [21.4, 24.1, 5.1];
    const b: V3 = [23.4, 24.2, 2.9];
    pen.pole([23.4, 24.2, 0], b, 0.09, C.greyDark);
    pen.stroke([a, [22.4, 24.15, 3.5], b], { w: 0.04, kind: L_BAR, wobble: 0 });
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * 0.5;
      pen.stroke(
        [
          [x - 0.02, 24.15, z],
          [x + 0.02, 24.15, z],
        ],
        { w: 0.2, kind: L_LIGHT, wobble: 0 },
      );
      pen.card(x, 24.15, z - 0.1).circle(0, 0, 0.08, rng.pick([C.yellow, C.red, C.white]), { seg: 5, grain: 0 });
    }
  });
  cafeTable(pen, rng, 22.7, 21.6, C.orange, 2);
  cafeTable(pen, rng, 22.4, 23.9, null, 3);
  // someone with a spray can, finishing a piece on the end of the blue one
  pen.obj(() => {
    const f = pen.wall("x+", 17.2, 22.4, 0, 4.2, 1.7);
    const paint = [C.pink, C.yellow, hex("#58b7a3"), C.purple, C.orange];
    for (let k = 0; k < 5; k++) f.circle(0.3 + k * 0.27, 0.6 + (k % 2) * 0.4, 0.24, paint[k], { layer: 1, grain: 0.4, seg: 8 });
    f.line(
      [
        [0.2, 0.4],
        [0.55, 1.2],
        [0.9, 0.45],
        [1.25, 1.2],
        [1.55, 0.5],
      ],
      { w: 0.09, color: C.white, kind: L_MARK, wobble: 0.6, layer: 2 },
    );
    person(pen, 22.1, 22.8, 0, { ...randomLook(rng), top: C.black, hat: C.red }, "wave", true);
  });

  // the old shipyard crane, its jib across the page, a container on the hook out over the water
  const yel = hex("#e9b530");
  pen.push(20.7, 16.3, 0, 315);
  pen.begin();
  const legs: V2[] = [
    [-1.1, -1.1],
    [1.1, -1.1],
    [1.1, 1.1],
    [-1.1, 1.1],
  ];
  for (const [lx, ly] of legs) pen.pole([lx, ly, 0], [lx * 0.7, ly * 0.7, 8.4], 0.2, yel);
  for (let k = 0; k < 4; k++) {
    const a = legs[k];
    const b = legs[(k + 1) % 4];
    for (const [z0, z1, s0, s1] of [
      [0.6, 4.2, 0.98, 0.85],
      [4.2, 8.0, 0.85, 0.71],
    ]) {
      pen.stroke(
        [
          [a[0] * s0, a[1] * s0, z0],
          [b[0] * s1, b[1] * s1, z1],
        ],
        { w: 0.07, color: yel, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [b[0] * s0, b[1] * s0, z0],
          [a[0] * s1, a[1] * s1, z1],
        ],
        { w: 0.07, color: yel, kind: L_BAR, wobble: 0 },
      );
    }
  }
  pen.end();
  pen.begin();
  pen.box(-1.15, -1.15, 8.4, 2.3, 2.3, 1.7, C.stone, { top: C.slateLight, w: 0.11 });
  for (const side of ["x+", "y+", "x-", "y-"] as const) {
    pen.wall(side, -1.15, -1.15, 8.4, 2.3, 2.3).rect(0.3, 0.55, 2.0, 1.35, C.glass, { outline: true, w: W_FINE, glow: 0.9 });
  }
  // the jib: two chords and a zigzag between them
  const jz = 10.6;
  const j0 = -3.6;
  const j1 = 9.8;
  for (const dz of [0, 0.9]) {
    pen.stroke(
      [
        [j0, 0, jz + dz],
        [j1, 0, jz + dz * 0.25],
      ],
      { w: 0.12, color: yel, kind: L_BAR, wobble: 0 },
    );
  }
  for (let k = 0; k < 13; k++) {
    const xa = j0 + (k * (j1 - j0)) / 13;
    const xb = j0 + ((k + 1) * (j1 - j0)) / 13;
    const ta = k / 13;
    const tb = (k + 1) / 13;
    pen.stroke(
      [
        [xa, 0, jz + (k % 2 === 0 ? 0 : 0.9 * (1 - ta * 0.75))],
        [xb, 0, jz + (k % 2 === 0 ? 0.9 * (1 - tb * 0.75) : 0)],
      ],
      { w: 0.06, color: yel, kind: L_BAR, wobble: 0 },
    );
  }
  pen.pole([0, 0, 10.1], [0, 0, 12.8], 0.14, yel);
  pen.stroke(
    [
      [0, 0, 12.8],
      [j1, 0, jz + 0.25],
    ],
    { w: 0.045, kind: L_BAR, wobble: 0 },
  );
  pen.stroke(
    [
      [0, 0, 12.8],
      [j0, 0, jz + 0.9],
    ],
    { w: 0.045, kind: L_BAR, wobble: 0 },
  );
  pen.box(j0 - 0.2, -0.5, jz - 0.9, 1.3, 1.0, 0.9, C.greyDark, { w: W_THIN });
  pen.card(0, 0, 12.8).circle(0, 0.1, 0.18, C.red, { outline: true, w: 0.04, glow: 1, seg: 7 });
  // the hook and its load
  const hx = 8.2;
  pen.stroke(
    [
      [hx, 0, jz],
      [hx, 0, 6.6],
    ],
    { w: 0.045, kind: L_BAR, wobble: 0 },
  );
  for (const [dx, dy] of [
    [-1.6, -0.6],
    [1.6, -0.6],
    [1.6, 0.6],
    [-1.6, 0.6],
  ]) {
    pen.stroke(
      [
        [hx, 0, 6.6],
        [hx + dx, dy, 5.7],
      ],
      { w: 0.04, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
  put(hx - 2.1, -0.85, 4.0, 0, C.red);
  pen.pop();
}

// ---------------------------------------------------------------- the ferry landing

const LAND_X0 = 23.2;
const LAND_X1 = 27.2;

function landing(c: BlockCtx): void {
  const { pen, rng } = c;
  const lanes = FERRY.lanes.map((y) => y - c.oy);
  const y0 = lanes[0] - 2.4;
  const y1 = lanes[1] + 2.4;
  pen.obj(() => {
    for (const x of [LAND_X1 - 0.5, LAND_X1 - 2.2]) {
      for (const y of [y0 + 0.5, (y0 + y1) / 2, y1 - 0.5]) pen.pole([x, y, -G], [x, y, -0.3], 0.3, C.woodDark);
    }
    pen.box(LAND_X0, y0, -0.32, LAND_X1 - LAND_X0, y1 - y0, 0.32, C.wood, { top: C.stone, w: 0.11 });
    const f = pen.wall("y+", LAND_X0, y0, -0.32, LAND_X1 - LAND_X0, y1 - y0);
    for (let a = 0.5; a < LAND_X1 - LAND_X0; a += 0.9) f.seg(a, 0.02, a, 0.3, { w: 0.05, color: C.woodDark, kind: L_MARK, wobble: 0 });
  });
  for (const y of lanes) {
    pen.obj(() => {
      pen.fill(
        [
          [LAND_X1, y - 1.7, 0.01],
          [LAND_X1, y + 1.7, 0.01],
          [LAND_X1 + 2.1, y + 1.7, -G + 0.9],
          [LAND_X1 + 2.1, y - 1.7, -G + 0.9],
        ],
        C.metal,
        { outline: true, w: W_THIN },
      );
      for (let k = 1; k < 5; k++) {
        const x = LAND_X1 + (2.1 * k) / 5;
        const z = 0.01 + ((-G + 0.9 - 0.01) * k) / 5;
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
      [LAND_X1 - 0.15, (lanes[0] + lanes[1]) / 2 - 1.3, 0],
      [LAND_X1 - 0.15, (lanes[0] + lanes[1]) / 2 + 1.3, 0],
    ],
    0.9,
    C.white,
    1.3,
  );
  railing(
    pen,
    [
      [LAND_X0 + 0.4, y1 - 0.15, 0],
      [LAND_X1 - 0.15, y1 - 0.15, 0],
    ],
    0.9,
    C.white,
    1.3,
  );
  // shelter with the destination on it, between the two berths
  pen.obj(() => {
    const sx = LAND_X0 + 0.2;
    const sy = (lanes[0] + lanes[1]) / 2 - 0.9;
    pen.box(sx, sy, 0.15, 3.4, 0.12, 2.1, hex("#cfe3ee"), { w: W_THIN, grain: 0.5 });
    pen.box(sx - 0.2, sy - 0.1, 2.3, 3.8, 1.8, 0.14, C.blue, { w: W_THIN });
    pen.pole([sx + 0.1, sy + 1.5, 0], [sx + 0.1, sy + 1.5, 2.3], 0.09, C.white);
    pen.pole([sx + 3.3, sy + 1.5, 0], [sx + 3.3, sy + 1.5, 2.3], 0.09, C.white);
    const sign = pen.wall("y+", sx - 0.2, sy - 0.1, 2.44, 3.8, 1.8);
    sign.rect(0.2, 0, 3.6, 0.74, C.white, { outline: true, w: W_FINE, grain: 0.3 });
    sign.text("CENTRAAL", 1.9, 0.2, 0.32, { align: "c", layer: 1, w: 0.05, color: C.blueDark, kind: L_MARK });
    pen.stroke(
      [
        [sx + 0.4, sy + 0.9, 2.26],
        [sx + 3.0, sy + 0.9, 2.26],
      ],
      { w: 0.16, kind: L_LIGHT, wobble: 0 },
    );
  });
  lamp(pen, LAND_X0 + 0.6, y1 - 0.6);
  lamp(pen, LAND_X0 + 0.6, y0 + 3.4);
  flag(pen, LAND_X1 - 0.5, y0 + 0.5, 0, 4.6, "amsterdam", 0.9);
  for (let i = 0; i < 11; i++) {
    const x = rng.range(LAND_X0 + 0.5, LAND_X1 - 0.9);
    const y = rng.range(y0 + 2.6, y1 - 1.0);
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5));
    if (rng.chance(0.5)) {
      pen.push(x + 0.3, y + 0.55, 0, rng.pick([-10, 0, 10]));
      bike(pen, { color: rng.pick([C.black, C.blueDark, C.redDark, C.green]), crate: rng.chance(0.3) });
      pen.pop();
    }
  }
}

// ---------------------------------------------------------------- beach and half-pipe

function beach(pen: Pen, rng: Rng): void {
  for (let i = 0; i < 4; i++) {
    const x = 6.2 + (i % 2) * 1.3;
    const y = 21.4 + i * 1.2;
    pen.obj(() => {
      const col = rng.pick([C.red, C.yellow, C.blue, C.orange]);
      pen.fill(
        [
          [x - 0.35, y - 0.3, 0.12],
          [x + 0.75, y - 0.3, 0.12],
          [x + 0.75, y + 0.3, 0.12],
          [x - 0.35, y + 0.3, 0.12],
        ],
        col,
        { outline: true, w: W_FINE, layer: 2 },
      );
      pen.fill(
        [
          [x - 0.35, y - 0.3, 0.12],
          [x - 0.35, y + 0.3, 0.12],
          [x - 0.8, y + 0.3, 0.8],
          [x - 0.8, y - 0.3, 0.8],
        ],
        col,
        { outline: true, w: W_FINE },
      );
      if (rng.chance(0.75)) person(pen, x + 0.05, y, 0.05, randomLook(rng), "sit");
    });
  }
  pen.obj(() => {
    pen.pole([7.4, 22.2, 0], [7.4, 22.2, 2.3], 0.08, C.white, { ink: false });
    pen.cone(7.4, 22.2, 1.95, 1.4, 0.55, C.yellow, { seg: 8, crease: 0.5 });
    pen.pole([5.9, 24.6, 0], [5.9, 24.6, 2.3], 0.08, C.white, { ink: false });
    pen.cone(5.9, 24.6, 1.95, 1.4, 0.55, C.red, { seg: 8, crease: 0.5 });
  });
  person(pen, 7.6, 26.2, 0, randomLook(rng), "cheer", false, 0.72);
  person(pen, 8.3, 25.4, 0, randomLook(rng), "stand", true);
  // a bucket and a castle
  pen.obj(() => {
    pen.cone(6.6, 26.8, 0, 0.42, 0.5, C.sand, { seg: 7, w: W_FINE });
    pen.cyl(7.2, 27.1, 0, 0.16, 0.26, C.red, { seg: 6, w: W_FINE });
  });
}

const PIPE_X = 9.8;
const PIPE_Y = 22.4;
const PIPE_L = 6;
const PIPE_D = 2.6;

/** Height of the half-pipe's riding surface at distance u along it. */
function pipeZ(u: number): number {
  const r = 1.5;
  const lo = 0.22;
  if (u < 0.4 || u > PIPE_L - 0.4) return lo + r;
  if (u < 0.4 + r) return lo + r - Math.sqrt(Math.max(0, r * r - Math.pow(0.4 + r - u, 2)));
  if (u > PIPE_L - 0.4 - r) return lo + r - Math.sqrt(Math.max(0, r * r - Math.pow(u - (PIPE_L - 0.4 - r), 2)));
  return lo;
}

function halfPipe(pen: Pen, rng: Rng): void {
  const prof: V2[] = [
    [0, 0],
    [PIPE_L, 0],
  ];
  for (let i = 0; i <= 24; i++) {
    const u = PIPE_L - (PIPE_L * i) / 24;
    prof.push([u, pipeZ(u)]);
  }
  pen.begin();
  pen.wall("y+", PIPE_X, PIPE_Y, 0, PIPE_L, 0).extrude(prof, PIPE_D, C.wood, { crease: 30, w: 0.11 });
  for (const u of [0.4, PIPE_L - 0.4]) {
    pen.stroke(
      [
        [PIPE_X + u, PIPE_Y, pipeZ(u) + 0.03],
        [PIPE_X + u, PIPE_Y + PIPE_D, pipeZ(u) + 0.03],
      ],
      { w: 0.1, color: C.metal, kind: L_BAR, wobble: 0 },
    );
  }
  pen.end();
  person(pen, PIPE_X + 0.2, PIPE_Y + 0.8, pipeZ(0), randomLook(rng), "stand", false, 0.85);
  person(pen, PIPE_X + PIPE_L - 0.2, PIPE_Y + 1.9, pipeZ(0), randomLook(rng), "cheer", true, 0.85);
  person(pen, PIPE_X + 2.2, PIPE_Y + PIPE_D + 0.9, 0, randomLook(rng), "wave");
  person(pen, PIPE_X + 3.4, PIPE_Y + PIPE_D + 1.0, 0, randomLook(rng), "stand", true, 0.72);
}

// ---------------------------------------------------------------- movers

function movers(c: BlockCtx): void {
  const born = c.done + 0.2;
  const rng = new Rng(909);

  // the swing: out over the edge and back, redrawn every frame
  const riders = [randomLook(rng), randomLook(rng)];
  const cx = c.ox + TCX;
  const cy = c.oy + TCY;
  const top = c.oz + G + TOWER_TOP + CROWN_H;
  c.movers.push((m) => {
    if (m.t < born || !m.sees(cx, cy, top + 2, 12)) return;
    const pen = m.pen;
    pen.rng = new Rng(31);
    const th = 1.0 * Math.sin(m.t * 1.75);
    const len = 2.5;
    const sy = SWING_Y - Math.sin(th) * len;
    const sz = SWING_H - Math.cos(th) * len;
    pen.push(cx, cy, top, 45);
    pen.begin();
    for (const dx of [-0.5, 0.5]) {
      pen.stroke(
        [
          [SWING_X + dx, SWING_Y, SWING_H],
          [SWING_X + dx, sy, sz],
        ],
        { w: 0.045, kind: L_BAR, wobble: 0 },
      );
    }
    pen.stroke(
      [
        [SWING_X - 0.6, sy, sz],
        [SWING_X + 0.6, sy, sz],
      ],
      { w: 0.12, color: C.woodDark, kind: L_BAR, wobble: 0 },
    );
    person(pen, SWING_X - 0.3, sy, sz - 0.45, riders[0], th > 0.55 ? "cheer" : "sit");
    person(pen, SWING_X + 0.3, sy, sz - 0.45, riders[1], "sit");
    pen.end();
    pen.pop();
  });

  // two skaters in the half-pipe
  for (let i = 0; i < 2; i++) {
    const lk = randomLook(rng);
    const mk = (flip: boolean) =>
      makeSprite(
        (pen) => {
          person(pen, 0, 0, 0.1, lk, "walkA", flip, 0.9);
          const b = pen.card(0, 0, 0, flip);
          b.bar(-0.5, 0.06, 0.5, 0.06, 0.1, C.black, { layer: 5 });
        },
        0,
        40 + i,
      );
    const right = mk(false);
    const left = mk(true);
    const y = c.oy + PIPE_Y + 0.7 + i * 1.2;
    const phase = i * 1.9;
    c.movers.push((m) => {
      if (m.t < born) return;
      const a = m.t * 1.7 + phase;
      const u = PIPE_L / 2 + (PIPE_L / 2 - 0.55) * Math.sin(a);
      m.put(Math.cos(a) >= 0 ? right : left, c.ox + PIPE_X + u, y, c.oz + G + pipeZ(u), born + i * 0.3);
    });
  }

  // people strolling the shore
  const loop = new Route(
    (
      [
        [9.4, 26.1],
        [22.5, 26.1],
        [22.5, 38.6],
        [21.5, 38.6],
        [21.3, 27.1],
        [9.4, 26.9],
      ] as V2[]
    ).map((p) => [c.ox + p[0], c.oy + p[1], c.oz + G] as V3),
    true,
    1.2,
  );
  for (let i = 0; i < 6; i++) c.movers.push(walker(loop, rng, born + rng.next()));
}

// ---------------------------------------------------------------- the island

export const noord: BlockBuilder = (c) => {
  const { pen, rng } = c;
  const shore = shoreline();

  c.early(() => {
    pen.begin();
    pen.extrude(shore, 0, G, C.quay, { top: C.paving, crease: 30 });
    pen.end();
    pen.push(0, 0, G);
    const g = pen.floor(0, 1);
    // grass at the foot of the tower, sand on the west shore, white paving round the EYE
    const blob = (cx: number, cy: number, rx: number, ry: number, rgb: RGB, ph: number) => {
      const pts: V2[] = [];
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2;
        const k = 1 + 0.08 * Math.sin(3 * t + ph) + 0.05 * Math.sin(5 * t + ph * 2);
        pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
      }
      g.poly(pts, rgb, { outline: true, w: 0.07 });
    };
    blob(11.6, 28.6, 3.6, 1.5, C.grass, 0.4);
    blob(7.0, 24.2, 1.9, 3.9, C.sand, 1.3);
    blob(13.4, 39.3, 6.6, 1.7, C.white, 2.2);
    blob(20.6, 20.6, 3.4, 5.2, C.street, 0.9);
    tufts(pen.floor(0, 2), 8, 27, 15.4, 30.2, 0.5, (a, b) => Math.pow((a - 11.6) / 3.3, 2) + Math.pow((b - 28.6) / 1.3, 2) < 1);
    speckle(pen.floor(0, 2), 5.2, 12, 25, 41, C.stoneDark, 0.16, (a, b) => onLand(a, b, 0.8));
    pen.pop();
  });

  pen.push(0, 0, G);
  tower(pen, rng);
  shipyard(pen, rng);
  halfPipe(pen, rng);
  beach(pen, rng);
  eye(pen, rng);
  landing(c);

  // trees, lamps, benches, a queue for the lift up the tower
  for (const [x, y] of [
    [9.4, 28.9],
    [12.7, 30.3],
    [23.7, 25.9],
    [20.6, 40.0],
    [8.4, 39.6],
    [17.8, 13.4],
  ] as V2[]) {
    tree(pen, rng, x, y, { kind: "round" });
  }
  for (const [x, y] of [
    [9.0, 30.4],
    [15.9, 21.2],
    [20.6, 30.2],
  ] as V2[]) {
    lamp(pen, x, y);
  }
  bench(pen, 11.6, 28.0, 0);
  person(pen, 11.4, 28.1, 0.3, randomLook(rng), "sit");
  person(pen, 12.1, 28.1, 0.3, randomLook(rng), "sit", true);
  for (let i = 0; i < 8; i++) {
    person(pen, 16.5 + rng.range(-0.12, 0.12), 14.5 + i * 0.72, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), rng.chance(0.15) ? 0.72 : 1);
  }
  for (let i = 0; i < 7; i++) {
    person(pen, rng.range(16.2, 20.6), rng.range(27.6, 29.2), 0, randomLook(rng), rng.pick(["stand", "wave", "walkA"]), rng.chance(0.5), rng.chance(0.2) ? 0.72 : 1);
  }
  flag(pen, 20.5, 21.5, 5.1, 3.4, "amsterdam", 1.0);
  flag(pen, 5.6, 30.6, 0, 4.6, "orange", 0.9);
  pen.pop();

  movers(c);
  c.focus(12.4, 19.3, 1.12);
};
