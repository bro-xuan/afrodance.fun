// Reichstag: the parliament, heavy sandstone with a tower at each corner and
// DEM DEUTSCHEN VOLKE over the columns, and on its roof the glass dome whose
// spiral ramp anybody may walk up, to look down on those they elected. In
// front, the lawn of the Platz der Republik, where the queue for the dome is
// the longest thing in Berlin; beside it the Chancellery; and on the river
// side, steps down to the Spree and a row of white crosses on the railing.
//
// The Spree is this block's east edge (x = 48). The real building's great
// front faces west; here it is turned to the south so that the camera sees it.

import { RGB, V2, V3, hash1, scaleRGB } from "../../engine/math";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../../engine/pen";
import { flagOf, picnic, queue } from "../berlin";
import { BLOCK, QUAY } from "../city";
import { W_FINE, W_THIN, Look, archWindow, bench, lamp, person, randomLook, tree } from "../kit";
import { Route, makeSprite, rounded, walker } from "../motion";
import { C } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;

// the building: its footprint, the height of its walls and corner towers
const RX0 = 9;
const RY0 = 6;
const RW = 26;
const RD = 16;
const WALL = 10;
const TOWER = 4.2;
const TOWER_H = 13.2;
/** The front, and the middle of it. */
const FRONT = RY0 + RD;
const MID = RX0 + RW / 2;
// the dome: where it stands on the roof, how wide and how high
const DX = MID;
const DY = RY0 + RD / 2;
const DZ = WALL + 0.6;
const DR = 6.0;
const DH = 7.0;
/** The camera looks from this way round. */
const CAM = Math.PI / 4;

// the lawn in front
const LX0 = 14.6;
const LX1 = 34.8;
const LY0 = 27.6;
const LY1 = B - E - 0.2;

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

/** An arch-topped shape on a wall plane. */
function archShape(a0: number, b0: number, a1: number, b1: number): V2[] {
  const r = (a1 - a0) / 2;
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, b1 - r],
  ];
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI;
    pts.push([a0 + r + Math.cos(t) * r, b1 - r + Math.sin(t) * r]);
  }
  pts.push([a0, b1 - r]);
  return pts;
}

/** A point on the dome's glass: `lat` up from its foot, `lon` round it. */
function onDome(lat: number, lon: number, k = 1): V3 {
  return [DX + Math.cos(lat) * Math.cos(lon) * DR * k, DY + Math.cos(lat) * Math.sin(lon) * DR * k, DZ + Math.sin(lat) * DH * k];
}

// ---------------------------------------------------------------- the building

/** One stretch of the heavy front: a rusticated ground floor, tall arched windows between engaged columns, an attic. */
function front(f: Plane, a0: number, a1: number, bays: number, lit: () => boolean): void {
  const w = (a1 - a0) / bays;
  for (let k = 0; k < bays; k++) {
    const a = a0 + (k + 0.5) * w;
    f.rect(a - 0.42, 0.75, a + 0.42, 2.0, C.glass, { outline: true, w: W_FINE, layer: 1, glow: lit() ? 1 : 0, ink: C.sandstoneLight });
    archWindow(f, a - 0.6, 3.3, a + 0.6, 7.3, lit(), C.sandstoneLight);
    f.rect(a - 0.42, 8.0, a + 0.42, 8.9, C.glass, { outline: true, w: W_FINE, layer: 1, glow: lit() ? 1 : 0, ink: C.sandstoneLight });
  }
  for (let k = 0; k <= bays; k++) f.seg(a0 + k * w, 2.75, a0 + k * w, 9.35, { w: 0.2, color: C.sandstoneLight, kind: L_MARK, wobble: 0.15 });
}

function building(c: BlockCtx): void {
  const { pen, rng } = c;
  const st = C.sandstone;
  const lt = C.sandstoneLight;
  const dk = C.sandstoneDark;
  const lit = () => rng.chance(0.6);
  // the body
  pen.obj(() => {
    pen.box(RX0, RY0, 0, RW, RD, WALL, st, { top: C.zinc, glow: 0.12 });
    for (const [f, len] of [
      [pen.wall("y+", RX0, RY0, 0, RW, RD), RW],
      [pen.wall("x+", RX0, RY0, 0, RW, RD), RD],
    ] as [Plane, number][]) {
      f.rect(0, 0, len, 2.6, dk, { grain: 0.7 });
      for (const b of [0.65, 1.3, 1.95]) f.seg(0.05, b, len - 0.05, b, { w: 0.05, color: scaleRGB(dk, 0.82), kind: L_MARK, wobble: 0.2, layer: 1 });
      f.rect(0, 2.6, len, 2.95, lt, { grain: 0.5, layer: 1 });
      f.rect(0, WALL - 0.65, len, WALL, lt, { grain: 0.5, layer: 1 });
      f.seg(0, WALL - 0.65, len, WALL - 0.65, { w: 0.06, layer: 2 });
    }
    // the south front either side of the portico, and the long east flank
    const s = pen.wall("y+", RX0, RY0, 0, RW, RD);
    front(s, TOWER + 0.2, 7.4, 1, lit);
    front(s, RW - 7.4, RW - TOWER - 0.2, 1, lit);
    const e = pen.wall("x+", RX0, RY0, 0, RW, RD);
    front(e, TOWER + 0.3, RD - TOWER - 0.3, 4, lit);
    // behind the columns: three tall doors, a row of windows over them
    for (const a of [RW / 2 - 2.9, RW / 2, RW / 2 + 2.9]) {
      s.poly(archShape(a - 0.85, 0.75, a + 0.85, 5.6), C.doorRed, { outline: true, w: W_THIN, layer: 1 });
      s.seg(a, 0.75, a, 4.75, { w: 0.05, wobble: 0, layer: 2 });
      s.rect(a - 0.5, 6.4, a + 0.5, 7.6, C.glass, { outline: true, w: W_FINE, layer: 1, glow: 1, ink: lt });
    }
  });
  // the four corner towers, each with its flag
  const corners: V2[] = [
    [RX0 - 0.3, RY0 - 0.3],
    [RX0 + RW - TOWER + 0.3, RY0 - 0.3],
    [RX0 - 0.3, FRONT - TOWER + 0.3],
    [RX0 + RW - TOWER + 0.3, FRONT - TOWER + 0.3],
  ];
  corners.forEach(([x0, y0], k) => {
    pen.obj(() => {
      pen.box(x0, y0, 0, TOWER, TOWER, TOWER_H, st, { top: C.zinc, glow: 0.12 });
      for (const sd of ["x+", "y+"] as const) {
        const f = pen.wall(sd, x0, y0, 0, TOWER, TOWER);
        f.rect(0, 0, TOWER, 2.6, dk, { grain: 0.7 });
        f.rect(0, 2.6, TOWER, 2.95, lt, { grain: 0.5, layer: 1 });
        front(f, 0.5, TOWER - 0.5, 1, lit);
        f.rect(0, WALL - 0.65, TOWER, WALL, lt, { grain: 0.5, layer: 1 });
        // the upper stage: paired openings and a heavy cornice
        for (const a of [TOWER / 2 - 0.75, TOWER / 2 + 0.75]) f.poly(archShape(a - 0.42, 10.5, a + 0.42, 12.2), scaleRGB(st, 0.55), { layer: 1, grain: 0.6 });
        f.rect(0, TOWER_H - 0.6, TOWER, TOWER_H, lt, { grain: 0.5, layer: 1 });
        f.seg(0, TOWER_H - 0.6, TOWER, TOWER_H - 0.6, { w: 0.06, layer: 2 });
      }
    }, 0.1 + k * 0.03);
    pen.obj(() => {
      pen.box(x0 + 0.35, y0 + 0.35, TOWER_H, TOWER - 0.7, TOWER - 0.7, 0.55, lt, { top: C.zinc, w: W_THIN });
      for (const [ax, ay] of [
        [0.1, 0.1],
        [TOWER - 0.6, 0.1],
        [0.1, TOWER - 0.6],
        [TOWER - 0.6, TOWER - 0.6],
      ]) {
        pen.box(x0 + ax, y0 + ay, TOWER_H, 0.5, 0.5, 0.95, lt, { w: W_FINE });
      }
    }, 0.26 + k * 0.03);
    flagOf(pen, x0 + TOWER / 2, y0 + TOWER / 2, TOWER_H + 0.55, 5.0, "de", 1.45);
  });

  // the portico: steps, six columns, the words, the pediment
  const pw = 11.6;
  const px = MID - pw / 2;
  pen.obj(() => {
    pen.box(px - 1.4, FRONT, 0, pw + 2.8, 4.5, 0.25, lt, { w: W_THIN });
    pen.box(px - 1.0, FRONT, 0.25, pw + 2.0, 3.7, 0.25, lt, { w: W_THIN });
    pen.box(px - 0.6, FRONT, 0.5, pw + 1.2, 2.9, 0.25, lt, { w: W_THIN });
    for (let k = 0; k < 6; k++) {
      const x = px + 0.7 + (k * (pw - 1.4)) / 5;
      pen.cyl(x, FRONT + 2.1, 0.75, 0.52, 0.3, lt, { seg: 8 });
      pen.cyl(x, FRONT + 2.1, 1.05, 0.44, 6.5, st, { seg: 8, r2: 0.38 });
      pen.box(x - 0.55, FRONT + 1.55, 7.55, 1.1, 1.1, 0.5, lt, { w: W_THIN });
      // floodlights up the columns, for the night
      pen.stroke(
        [
          [x, FRONT + 2.65, 1.0],
          [x, FRONT + 2.65, 7.2],
        ],
        { w: 1.2, kind: L_LIGHT, wobble: 0, alpha: 0.28 },
      );
    }
  }, 0.18);
  pen.obj(() => {
    pen.box(px - 0.2, FRONT, 8.05, pw + 0.4, 2.75, 1.2, st, { glow: 0.2 });
    const f = pen.wall("y+", px - 0.2, FRONT, 8.05, pw + 0.4, 2.75);
    f.rect(0, 0.95, pw + 0.4, 1.2, lt, { grain: 0.5 });
    f.text("DEM DEUTSCHEN VOLKE", (pw + 0.4) / 2, 0.2, 0.54, { align: "c", w: 0.085, color: scaleRGB(dk, 0.6), kind: L_MARK, wobble: 0.25, layer: 1 });
  }, 0.3);
  pen.obj(() => {
    pen.gable(px - 0.45, FRONT - 0.2, 9.25, pw + 0.9, 3.2, 2.5, "y", C.zinc, { gable: st });
    const f = pen.wall("y+", px - 0.45, FRONT - 0.2, 9.25, pw + 0.9, 3.2);
    // the relief in the pediment
    f.poly(
      [
        [1.3, 0.3],
        [pw - 0.4, 0.3],
        [(pw + 0.9) / 2, 1.95],
      ],
      lt,
      { outline: true, w: W_FINE, grain: 0.5 },
    );
    f.ticks(2.4, 0.4, pw - 1.5, 1.25, { n: 16, len: 0.6, ang: Math.PI / 2, jit: 0.3, color: dk, w: 0.08, layer: 1 });
    // a figure on the peak, and one on each end
    for (const [a, b] of [
      [0.2, 0.05],
      [(pw + 0.9) / 2, 2.5],
      [pw + 0.7, 0.05],
    ]) {
      const cd = pen.card(px - 0.45 + a, FRONT + 3.0, 9.25 + b);
      cd.poly(
        [
          [-0.2, 0],
          [0.2, 0],
          [0.15, 0.8],
          [-0.15, 0.8],
        ],
        lt,
        { outline: true, w: W_FINE },
      );
      cd.circle(0, 0.96, 0.16, lt, { outline: true, w: W_FINE, seg: 7, layer: 1 });
    }
  }, 0.4);

  // the roof terrace the dome stands on, and a few of the people who have made it up there
  pen.obj(() => {
    pen.box(DX - 7.6, DY - 6.6, WALL, 15.2, 13.2, 0.6, st, { top: C.stone });
  }, 0.3);
  for (const [x, y, fl] of [
    [DX + 6.9, DY + 3.6, true],
    [DX + 5.6, DY + 5.7, true],
    [DX + 2.2, DY + 6.2, false],
    [DX - 2.6, DY + 6.1, false],
    [DX + 7.1, DY - 0.4, true],
  ] as [number, number, boolean][]) {
    person(pen, x, y, DZ, randomLook(rng), rng.pick(["stand", "wave", "stand"]), fl, 0.78);
  }
}

/** The glass dome: slices of pale glass, white ribs and rings, the eye open at the top, the mirrored cone hanging inside. */
function dome(c: BlockCtx): void {
  const { pen } = c;
  const top = 1.3;
  const lats = [0, 0.24, 0.48, 0.72, 0.94, 1.14, top];
  pen.obj(() => {
    pen.cyl(DX, DY, DZ, DR + 0.3, 0.35, C.sandstoneLight, { seg: 20 });
    for (let k = 0; k + 1 < lats.length; k++) {
      const a = lats[k];
      const b = lats[k + 1];
      pen.cyl(DX, DY, DZ + Math.sin(a) * DH, Math.cos(a) * DR, (Math.sin(b) - Math.sin(a)) * DH, k % 2 ? C.glassPale : C.sky, {
        seg: 20,
        r2: Math.cos(b) * DR,
        top: null,
        edges: false,
        glow: 0.62,
        grain: 0.35,
      });
    }
    // the eye, open to the sky, and the ring round it
    pen.cyl(DX, DY, DZ + Math.sin(top) * DH, Math.cos(top) * DR, 0.22, C.white, { seg: 14, top: C.glass, w: W_THIN });
    // its outline: the foot on the camera's side, and the limb over the far side
    const foot: V3[] = [];
    for (let q = 0; q <= 16; q++) foot.push(onDome(0, CAM - Math.PI / 2 + (q / 16) * Math.PI, 1.005));
    pen.stroke(foot, { w: 0.11 });
    const limb: V3[] = [];
    for (let q = 0; q <= 20; q++) {
      const lon = CAM + Math.PI / 2 + (q / 20) * Math.PI;
      const lat = Math.min(top, Math.atan(-(DH / DR) * (Math.cos(lon) + Math.sin(lon))));
      limb.push(onDome(lat, lon, 1.005));
    }
    pen.stroke(limb, { w: 0.11 });
    // the ribs and the rings, in white
    for (let q = 0; q < 24; q++) {
      const lon = (q / 24) * Math.PI * 2;
      if (Math.cos(lon - CAM) < -0.35) continue;
      const rib: V3[] = [];
      for (let s = 0; s <= 6; s++) rib.push(onDome((s / 6) * top, lon, 1.004));
      pen.stroke(rib, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0.12, bias: 0.05 });
    }
    for (const lat of lats.slice(1, -1)) {
      const ring: V3[] = [];
      for (let q = 0; q <= 18; q++) ring.push(onDome(lat, CAM - 1.9 + (q / 18) * 3.8, 1.004));
      pen.stroke(ring, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0.12, bias: 0.05 });
    }
  }, 0.36);
  // The cone of mirrors that hangs from the eye. It is inside the glass, which
  // the pen cannot see through: so it is drawn where the page would show it,
  // but pulled towards the camera until it is in front of the dome.
  pen.obj(() => {
    const k = 3.8;
    const cd = pen.card(DX + k, DY + k, DZ + k);
    const mirror: RGB = [226, 238, 246];
    cd.poly(
      [
        [-1.95, 6.35],
        [1.95, 6.35],
        [0.3, 1.5],
        [-0.3, 1.5],
      ],
      mirror,
      { outline: true, w: W_FINE, grain: 0.3, glow: 0.5, ink: C.slateLight },
    );
    for (const b of [2.5, 3.5, 4.5, 5.5]) {
      const hw = 0.3 + ((b - 1.5) / 4.85) * 1.65;
      cd.seg(-hw, b, hw, b, { w: 0.05, color: C.slateLight, kind: L_MARK, wobble: 0, layer: 1 });
    }
    for (const a of [-0.5, 0, 0.5]) cd.seg(a * 0.3, 1.5, a * 3.2, 6.35, { w: 0.045, color: C.slateLight, kind: L_MARK, wobble: 0, layer: 1 });
    // light from inside, after dark
    cd.seg(0, 0.6, 0, 6.2, { w: 6.5, kind: L_LIGHT, wobble: 0, alpha: 0.2, layer: 2 });
  }, 0.5);
}

// ---------------------------------------------------------------- beside it

/** The Chancellery: a white cube with a great round-topped window in each face, behind a screen of thin columns. */
function chancellery(c: BlockCtx, x0: number, y0: number): void {
  const { pen } = c;
  const w = 8.4;
  const d = 9;
  const h = 8;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.white, { top: C.concrete });
    for (const [f, len] of [
      [pen.wall("y+", x0, y0, 0, w, d), w],
      [pen.wall("x+", x0, y0, 0, w, d), d],
    ] as [Plane, number][]) {
      f.poly(archShape(1.0, 0.5, len - 1.0, 7.1), C.glassLight, { outline: true, w: W_THIN, glow: 0.7, grain: 0.4 });
      for (let b = 1.9; b < 6.4; b += 1.4) f.seg(1.0, b, len - 1.0, b, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
      for (let a = 2.2; a < len - 1.2; a += 1.3) f.seg(a, 0.5, a, 6.4, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
      f.rect(len / 2 - 0.8, 0, len / 2 + 0.8, 2.2, C.charcoal, { outline: true, w: W_FINE, layer: 2, glow: 0.4 });
    }
  });
  // the screen of columns in front of the two faces the camera sees, and the flat roof that sails over them
  pen.obj(() => {
    for (let k = 0; k < 4; k++) {
      pen.pole([x0 + 0.6 + (k * (w - 1.2)) / 3, y0 + d + 0.9, 0], [x0 + 0.6 + (k * (w - 1.2)) / 3, y0 + d + 0.9, h], 0.2, C.white);
      pen.pole([x0 + w + 0.9, y0 + 0.6 + (k * (d - 1.2)) / 3, 0], [x0 + w + 0.9, y0 + 0.6 + (k * (d - 1.2)) / 3, h], 0.2, C.white);
    }
    pen.box(x0 - 0.3, y0 - 0.3, h, w + 1.6, d + 1.6, 0.35, C.white, { w: W_THIN });
  }, 0.16);
  flagOf(pen, x0 + 1.2, y0 + 1.2, h + 0.35, 3.6, "de", 0.9);
  flagOf(pen, x0 + 2.8, y0 + 1.2, h + 0.35, 3.6, "eu", 0.9);
  // the carpet, a guard, and two black cars waiting
  pen.obj(() => pen.floor(0, 2).rect(x0 + w / 2 - 0.7, y0 + d, x0 + w / 2 + 0.7, y0 + d + 2.1, C.redDark, { outline: true, w: W_FINE, grain: 0.5 }));
  const guard: Look = { skin: [238, 187, 150], hair: [43, 32, 25], top: C.blueDark, legs: C.blueDark, long: false, hat: C.blueDark };
  person(pen, x0 + w / 2 + 1.3, y0 + d + 0.7, 0, guard, "stand", true);
  limo(pen, x0 + 2.3, y0 + d + 3.2, 0);
  limo(pen, x0 + 7.0, y0 + d + 3.2, 0);
}

/** A long black car, nose along local +x. */
function limo(pen: Pen, x: number, y: number, rot: number): void {
  pen.push(x, y, 0, rot);
  pen.begin();
  pen.box(-1.9, -0.82, 0, 3.8, 1.64, 0.3, C.black, { edges: false });
  pen.box(-2.2, -0.9, 0.3, 4.4, 1.8, 0.66, C.charcoal);
  pen.box(-1.2, -0.78, 0.96, 2.3, 1.56, 0.56, C.glass, { top: C.charcoal });
  pen.end();
  pen.pop();
}

/** A police van, white with a blue band, lettered so. Nose along local +x. */
function polizei(pen: Pen, x: number, y: number): void {
  pen.push(x, y, 0, 0);
  pen.begin();
  pen.box(-2.2, -0.9, 0, 4.4, 1.8, 0.34, C.black, { edges: false });
  pen.box(-2.5, -1.0, 0.34, 5.0, 2.0, 2.0, C.white, { top: C.white });
  const f = pen.wall("y+", -2.5, -1.0, 0.34, 5.0, 2.0);
  f.rect(0, 0.55, 5.0, 1.05, C.blue, { grain: 0.5 });
  f.text("POLIZEI", 2.1, 0.63, 0.32, { align: "c", color: C.white, kind: L_MARK, w: 0.06, layer: 1 });
  f.rect(3.6, 1.15, 4.8, 1.85, C.glass, { outline: true, w: W_FINE, layer: 1 });
  f.rect(0.4, 1.2, 3.2, 1.85, C.glass, { outline: true, w: W_FINE, layer: 1 });
  const g = pen.wall("x+", -2.5, -1.0, 0.34, 5.0, 2.0);
  g.rect(0.2, 1.1, 1.8, 1.85, C.glass, { outline: true, w: W_FINE, layer: 1 });
  g.rect(0, 0.55, 2.0, 1.05, C.blue, { grain: 0.5 });
  pen.box(-0.6, -0.5, 2.34, 1.2, 1.0, 0.22, C.blue, { w: W_FINE, glow: 0.3 });
  pen.end();
  pen.pop();
}

/** The Paul-Löbe-Haus: concrete frames with glass between them, under a flat roof that overhangs a long way. */
function loebe(c: BlockCtx, x0: number, y0: number, w: number, d: number): void {
  const { pen, rng } = c;
  const h = 8.6;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, C.concrete, { top: C.concreteDark });
    for (const [f, len] of [
      [pen.wall("y+", x0, y0, 0, w, d), w],
      [pen.wall("x+", x0, y0, 0, w, d), d],
    ] as [Plane, number][]) {
      const n = Math.max(2, Math.round(len / 1.9));
      const bw = len / n;
      for (let k = 0; k < n; k++) {
        for (let fl = 0; fl < 4; fl++) {
          f.rect(k * bw + 0.22, 0.4 + fl * 2.0, (k + 1) * bw - 0.22, 2.1 + fl * 2.0, C.glassLight, { outline: true, w: W_FINE, layer: 1, glow: rng.chance(0.55) ? 0.9 : 0.1, grain: 0.4 });
        }
      }
    }
  });
  pen.obj(() => {
    pen.box(x0 - 0.4, y0 - 0.4, h, w + 1.9, d + 2.0, 0.4, C.concrete, { w: W_THIN });
    for (const a of [0.4, w / 2, w - 0.4]) pen.pole([x0 + a, y0 + d + 1.2, 0], [x0 + a, y0 + d + 1.2, h], 0.18, C.concrete);
  }, 0.16);
}

// ---------------------------------------------------------------- small things

/** Somebody holding up a placard: a stick, a card, and a squiggle where the slogan would be. */
function placard(pen: Pen, x: number, y: number, col: RGB, flip: boolean): void {
  const cd = pen.card(x, y, 0, flip);
  pen.begin();
  cd.bar(0.36, 1.25, 0.36, 3.1, 0.07, C.woodDark, { layer: 5 });
  cd.rect(-0.35, 2.45, 1.05, 3.35, col, { outline: true, w: W_FINE, layer: 6 });
  cd.line(
    [
      [-0.2, 3.05],
      [0.1, 3.15],
      [0.4, 3.0],
      [0.85, 3.12],
    ],
    { w: 0.07, color: C.ink, kind: L_MARK, wobble: 0.5, layer: 7 },
  );
  cd.seg(-0.15, 2.72, 0.7, 2.72, { w: 0.06, color: C.ink, kind: L_MARK, wobble: 0.5, layer: 7 });
  pen.end();
}

/** A pigeon sitting on a ledge. */
function percher(pen: Pen, x: number, y: number, z: number, flip: boolean): void {
  const cd = pen.card(x, y, z, flip);
  pen.begin();
  cd.ellipse(0, 0.16, 0.22, 0.13, C.metal, { outline: true, w: W_FINE, seg: 8 });
  cd.circle(0.2, 0.3, 0.09, C.slateLight, { outline: true, w: W_FINE, seg: 6, layer: 1 });
  pen.end();
}

// ---------------------------------------------------------------- the place

export const reichstag: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(24, 24.6, 1);

  // the ground: the forecourt, the great lawn in mown stripes, the paved bank
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E, E, B - QUAY, B - E, C.plaza);
    g.rect(LX0, LY0, LX1, LY1, C.grass, { outline: true, w: W_THIN, layer: 1 });
    for (let x = LX0 + 1.7; x < LX1; x += 3.4) g.rect(x, LY0 + 0.1, Math.min(LX1 - 0.1, x + 1.7), LY1 - 0.1, C.grassLight, { layer: 2, grain: 0.8 });
    pen.floor(0, 3).ticks(LX0 + 0.3, LY0 + 0.3, LX1 - 0.3, LY1 - 0.3, { n: 120, len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    pen.floor(0, 2).ticks(E + 0.4, E + 0.4, B - QUAY - 0.4, B - E - 0.4, {
      n: 110,
      len: 0.3,
      ang: -0.78,
      jit: 0.2,
      color: C.stoneDark,
      w: 0.06,
      inside: (a, b) => !(a > LX0 && a < LX1 && b > LY0),
    });
  });

  building(c);
  dome(c);
  loebe(c, 36.6, E + 0.4, 6.6, 8.6);
  chancellery(c, E + 0.4, 30.2);

  // ---- pigeons along the cornice
  for (const a of [1.2, 4.1, 9.6, 11.2, 17.5, 22.3]) percher(pen, RX0 + a, FRONT + 0.05, WALL, rng.chance(0.5));

  // ---- the forecourt: a television crew, school classes on the steps, people having their picture taken
  const reporter: Look = { ...randomLook(rng), top: C.red, hat: null, long: true };
  const tvx = 11.3;
  const tvy = 23.8;
  person(pen, tvx, tvy, 0, reporter, "stand", false);
  pen.obj(() => pen.card(tvx, tvy, 0).bar(0.38, 1.25, 0.42, 1.52, 0.16, C.charcoal, { layer: 6 }));
  // the camera on its tripod, the cameraman behind it, the sound man with his boom
  pen.obj(() => {
    const cx = tvx + 1.7;
    const cy = tvy + 1.5;
    for (const [dx, dy] of [
      [-0.4, 0.3],
      [0.4, 0.3],
      [0, -0.45],
    ]) {
      pen.stroke(
        [
          [cx + dx, cy + dy, 0],
          [cx, cy, 1.55],
        ],
        { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
      );
    }
    pen.box(cx - 0.42, cy - 0.2, 1.55, 0.84, 0.4, 0.42, C.charcoal, { w: W_FINE });
  });
  person(pen, tvx + 2.3, tvy + 1.85, 0, { ...randomLook(rng), hat: C.black }, "stand", true);
  person(pen, tvx + 1.3, tvy + 0.4, 0, randomLook(rng), "cheer", true);
  pen.obj(() => {
    pen.stroke(
      [
        [tvx + 0.95, tvy + 0.4, 1.95],
        [tvx + 0.2, tvy + 0.1, 3.0],
      ],
      { w: 0.06, color: C.greyDark, kind: L_BAR, wobble: 0 },
    );
    pen.card(tvx + 0.2, tvy + 0.1, 2.8).ellipse(0, 0.2, 0.14, 0.26, C.greyDark, { outline: true, w: W_FINE, seg: 8 });
  });
  // two school classes on the steps, each behind its teacher
  for (const [x0, col] of [
    [MID - 4.8, C.yellow],
    [MID + 1.6, C.sky],
  ] as [number, RGB][]) {
    person(pen, x0 - 0.9, FRONT + 4.1, 0.25, { ...randomLook(rng), top: C.teal }, "wave", false);
    for (let k = 0; k < 8; k++) person(pen, x0 + (k % 4) * 0.85, FRONT + 3.3 + Math.floor(k / 4) * 0.8, k < 4 ? 0.5 : 0.25, { ...randomLook(rng), top: col }, rng.pick(["stand", "stand", "wave"]), rng.chance(0.5), 0.72);
  }
  for (const [x, y, pose, fl] of [
    [MID + 8.2, FRONT + 3.3, "cheer", true],
    [MID + 9.0, FRONT + 3.2, "stand", true],
    [MID + 10.2, FRONT + 3.9, "wave", false],
    [MID + 11.4, FRONT + 2.6, "stand", false],
    [MID + 12.2, FRONT + 2.7, "stand", true],
  ] as [number, number, "cheer" | "stand" | "wave", boolean][]) {
    person(pen, x, y, 0, randomLook(rng), pose, fl);
  }
  for (const x of [LX0 + 0.5, LX1 - 0.5]) lamp(pen, x, LY0 + 0.5, 0, 3.2);
  for (const x of [LX0 + 0.5, LX1 - 0.5]) lamp(pen, x, LY1 - 0.5, 0, 3.2);

  // ---- the queue for the dome: it starts at the white pavilion by the steps and goes on, and back, and on, and back
  const qx = 36.4;
  pen.obj(() => {
    pen.box(qx - 0.2, 23.6, 0, 4.6, 2.6, 2.7, C.white, { top: C.zinc });
    const f = pen.wall("y+", qx - 0.2, 23.6, 0, 4.6, 2.6);
    f.rect(0.4, 0.3, 1.7, 2.2, C.charcoal, { outline: true, w: W_FINE, glow: 0.5 });
    f.rect(2.1, 0.9, 4.2, 2.1, C.glassLight, { outline: true, w: W_FINE, glow: 0.8 });
    f.text("KUPPEL", 3.15, 2.22, 0.26, { align: "c", w: 0.05 });
  });
  const runs = [qx + 0.3, qx + 1.5, qx + 2.7, qx + 3.9];
  runs.forEach((x, k) => {
    // each run goes the other way to the one before; ropes between
    if (k % 2 === 0) queue(pen, rng, x, 27.0, 9, 0, 1);
    else queue(pen, rng, x, 33.6, 9, 0, -1);
    if (k > 0) {
      pen.obj(() => {
        const rx = x - 0.6;
        for (const y of [26.6, 30.3, 34.0]) pen.pole([rx, y, 0], [rx, y, 0.95], 0.07, C.gold, { ink: false });
        pen.stroke(
          [
            [rx, 26.6, 0.9],
            [rx, 28.45, 0.74],
            [rx, 30.3, 0.9],
            [rx, 32.15, 0.74],
            [rx, 34.0, 0.9],
          ],
          { w: 0.05, color: C.redDark, kind: L_BAR, wobble: 0 },
        );
      });
    }
  });
  // a few of them have come prepared: an umbrella against the sun, a camera held up
  for (const [x, y, col] of [
    [runs[0], 29.4, C.yellow],
    [runs[2], 31.0, C.pink],
  ] as [number, number, RGB][]) {
    pen.obj(() => {
      pen.pole([x + 0.3, y, 1.3], [x + 0.3, y, 2.75], 0.05, C.greyDark, { ink: false });
      pen.cone(x + 0.3, y, 2.55, 0.85, 0.36, col, { seg: 8, crease: 0.5 });
    });
  }
  // the last in line, and the one asking how long it takes from here
  person(pen, runs[3] + 0.9, 27.3, 0, randomLook(rng), "wave", true);
  person(pen, runs[3] + 1.0, 28.4, 0, randomLook(rng), "stand", true, 0.72);

  // ---- a demonstration, small and in good humour, with the police looking on
  const demo: [number, number][] = [
    [37.0, 37.6],
    [38.1, 37.2],
    [39.2, 37.7],
    [40.3, 37.3],
    [37.5, 38.9],
    [38.7, 38.6],
    [39.9, 39.0],
    [41.0, 38.5],
    [38.2, 40.1],
    [39.5, 40.3],
    [40.7, 40.0],
  ];
  const signs: RGB[] = [C.yellow, C.white, C.pink, C.sky, C.orange, C.white, C.grassLight];
  demo.forEach(([x, y], k) => {
    person(pen, x, y, 0, randomLook(rng), k % 3 === 0 ? "cheer" : "stand", k % 2 === 0);
    if (k % 3 !== 0) placard(pen, x, y, signs[k % signs.length], k % 2 === 0);
  });
  // the drummer in front of them
  person(pen, 36.4, 39.9, 0, { ...randomLook(rng), top: C.purple }, "stand", false);
  pen.obj(() => {
    pen.cyl(36.95, 40.1, 0.75, 0.42, 0.5, C.red, { seg: 9, top: C.cream });
  });
  polizei(pen, 39.6, 42.6);
  const cop: Look = { skin: [238, 187, 150], hair: [124, 82, 48], top: C.blueDark, legs: C.blueDark, long: false, hat: C.white };
  person(pen, 36.3, 42.2, 0, cop, "stand", false);
  person(pen, 42.6, 41.2, 0, { ...cop, skin: [168, 114, 76], hair: [43, 32, 25] }, "stand", true);

  // ---- the lawn: football, picnics, a frisbee, kites
  // (the blankets ride a hair above the grass, or the mown stripes would show through them)
  const RUG = 0.08;
  picnic(pen, rng, 17.6, 29.6, RUG, 3);
  picnic(pen, rng, 31.6, 30.2, RUG, 2);
  picnic(pen, rng, 18.2, 41.0, RUG, 2);
  picnic(pen, rng, 32.6, 41.4, RUG, 3);
  picnic(pen, rng, 22.6, 42.2, RUG, 2);
  for (const [x, y, fl] of [
    [21.6, 28.9, false],
    [27.2, 29.4, true],
    [33.6, 34.6, true],
    [15.8, 33.6, false],
  ] as [number, number, boolean][]) {
    person(pen, x, y, -0.2, randomLook(rng), "sit", fl);
  }
  tree(pen, rng, 16.0, 37.6, { kind: "round", h: 1.9, r: 1.4 });
  tree(pen, rng, 33.4, 28.4, { kind: "round", h: 1.9, r: 1.4 });
  bench(pen, 33.0, 37.4, 270);
  person(pen, 33.2, 37.1, 0.3, randomLook(rng), "sit", false);
  person(pen, 33.2, 37.9, 0.3, randomLook(rng), "sit", true);
  // two with a frisbee at the near end of the lawn (the disc is a mover)
  const fa: V2 = [25.9, 40.4];
  const fb: V2 = [29.9, 42.0];
  person(pen, fa[0], fa[1], 0, randomLook(rng), "cheer", false);
  person(pen, fb[0], fb[1], 0, randomLook(rng), "wave", true);
  // the goal: two jackets on the grass; the keeper between them
  const goal: V2 = [29.6, 36.4];
  pen.obj(() => {
    for (const o of [-1.5, 1.5]) pen.floor(0, 4).rect(goal[0] - 0.3, goal[1] + o - 0.25, goal[0] + 0.3, goal[1] + o + 0.25, o < 0 ? C.red : C.blueDark, { outline: true, w: W_FINE });
  });

  // ---- the river bank: steps down to the water, the crosses, people with time
  const sy0 = 17.4;
  const sy1 = 32.6;
  pen.obj(() => {
    for (let k = 0; k < 4; k++) {
      const top = -0.8 * (k + 1);
      pen.box(B + k * 0.5, sy0, c.waterZ, 0.52, sy1 - sy0, top - c.waterZ, C.quayCap, { w: W_THIN });
      if (k === 3) pen.wall("x+", B + k * 0.5, sy0, c.waterZ, 0.52, sy1 - sy0).seg(0, 0.03, sy1 - sy0, 0.03, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
    }
    // the cheeks at either end
    for (const y of [sy0 - 0.5, sy1]) pen.box(B, y, c.waterZ, 2.02, 0.5, -c.waterZ, C.quay, { top: C.quayCap, w: W_THIN });
  });
  const sitters: [number, number, boolean][] = [
    [0, 18.6, false],
    [0, 19.5, true],
    [1, 21.4, false],
    [2, 22.8, true],
    [2, 23.6, false],
    [0, 25.4, true],
    [1, 26.8, false],
    [3, 28.0, true],
    [3, 28.9, false],
    [1, 30.6, true],
    [2, 31.6, false],
  ];
  for (const [k, y, fl] of sitters) person(pen, B + k * 0.5 + 0.2, y, -0.8 * (k + 1) - 0.25, randomLook(rng), "sit", fl, rng.chance(0.15) ? 0.72 : 1);
  // an ice cream each
  pen.obj(() => {
    for (const y of [18.6, 19.5]) {
      const cd = pen.card(B + 0.55, y, -0.8 + 0.8);
      cd.poly(
        [
          [-0.09, 0.22],
          [0.09, 0.22],
          [0, 0],
        ],
        C.ochre,
        { layer: 6, grain: 0.3 },
      );
      cd.circle(0, 0.3, 0.11, y < 19 ? C.pink : C.cream, { seg: 6, layer: 7, grain: 0 });
    }
  });
  // a guitar at the top of the steps
  const gx = 43.8;
  const gy = 24.4;
  person(pen, gx, gy, 0, { ...randomLook(rng), hat: C.ochre }, "stand", true);
  pen.obj(() => {
    const cd = pen.card(gx - 0.15, gy + 0.05, 0, true);
    cd.ellipse(0.1, 1.0, 0.3, 0.22, C.wood, { outline: true, w: W_FINE, layer: 6, seg: 9 });
    cd.bar(0.3, 1.1, 0.85, 1.42, 0.08, C.woodDark, { layer: 6 });
  });
  for (const [x, y] of [
    [42.3, 23.0],
    [42.1, 25.4],
    [42.9, 26.6],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave"]), false);
  }
  // The white crosses on the railing, north of the steps: for those who died at
  // the Wall, which ran along this bank. Only the crosses, and a few flowers.
  pen.obj(() => {
    for (let k = 0; k < 7; k++) {
      const y = 9.6 + k * 0.98;
      const cd = pen.card(B - 0.28, y, 0.5);
      cd.bar(0, 0, 0, 0.82, 0.13, C.white, { layer: 6 });
      cd.bar(-0.24, 0.55, 0.24, 0.55, 0.13, C.white, { layer: 6 });
    }
    for (const y of [11.1, 13.6]) {
      const cd = pen.card(B - 0.75, y, 0);
      for (const [a, b, col] of [
        [0, 0.18, C.red],
        [0.14, 0.12, C.white],
        [-0.12, 0.1, C.yellow],
      ] as [number, number, RGB][]) {
        cd.circle(a, b, 0.09, col, { seg: 6, grain: 0, layer: 1 });
      }
    }
  });

  // ---- what moves
  // round the lawn, and one who runs
  const lawn = stroll(c, [
    [LX0 - 0.9, LY0 - 0.9],
    [LX1 + 0.75, LY0 - 0.9],
    [LX1 + 0.75, 35.6],
    [LX1 + 0.75, LY1 + 0.15],
    [LX0 - 0.9, LY1 + 0.15],
  ]);
  for (let k = 0; k < 6; k++) c.movers.push(walker(lawn, rng, c.done + rng.range(0, 1)));
  c.movers.push(walker(lawn, rng, c.done + 0.5, 3.4));

  // the football: three in the field pass it round, one shoots, and it goes in between the jackets
  const players: { x: number; y: number; look: Look; flip: boolean }[] = [
    { x: 21.4, y: 33.4, look: randomLook(rng), flip: false },
    { x: 23.4, y: 37.6, look: randomLook(rng), flip: false },
    { x: 26.0, y: 34.2, look: randomLook(rng), flip: false },
    { x: 30.0, y: 36.4, look: { ...randomLook(rng), top: C.yellow }, flip: true },
  ];
  const sprites = players.map((p, k) => ({
    idle: makeSprite((q) => person(q, 0, 0, 0, p.look, k === 3 ? "stand" : "walkA", p.flip, k === 1 ? 0.72 : 1), 0, 61 + k),
    cheer: makeSprite((q) => person(q, 0, 0, 0, p.look, "cheer", p.flip, k === 1 ? 0.72 : 1), 0, 71 + k),
  }));
  const ball = makeSprite((q) => {
    const cd = q.card(0, 0, 0);
    cd.circle(0, 0.2, 0.2, C.white, { outline: true, w: W_FINE, seg: 9, grain: 0 });
    cd.seg(-0.08, 0.2, 0.08, 0.26, { w: 0.07, wobble: 0, layer: 1 });
  }, 0, 81);
  // where the ball is, by the second of a six-second round: three passes, the shot, the goal, the throw out
  const CYCLE = 6;
  const round = (m: { t: number }): number => {
    const s = c.stay();
    const since = m.t - (s ? s.at : c.done);
    return (((since + 1.2) % CYCLE) + CYCLE) % CYCLE;
  };
  const inGoal: V2 = [goal[0] + 0.5, goal[1] + 0.4];
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const tau = round(m);
    const scored = tau > 2.75 && tau < 4.4;
    players.forEach((p, k) => {
      // the three who scored jump about; the keeper does not
      const up = scored && k < 3;
      const hop = up ? Math.abs(Math.sin((tau - 2.75) * 7 + k)) * 0.45 : 0;
      m.put(up ? sprites[k].cheer : sprites[k].idle, c.ox + p.x, c.oy + p.y, c.oz + hop, c.done);
    });
    const legs: [V2, V2, number, number, number][] = [
      [[players[0].x, players[0].y], [players[1].x, players[1].y], 0, 1.0, 0.5],
      [[players[1].x, players[1].y], [players[2].x, players[2].y], 1.0, 2.0, 0.5],
      [[players[2].x, players[2].y], inGoal, 2.0, 2.75, 1.3],
      [inGoal, inGoal, 2.75, 4.4, 0],
      [inGoal, [players[0].x, players[0].y], 4.4, CYCLE, 1.8],
    ];
    for (const [a, b, t0, t1, lift] of legs) {
      if (tau < t0 || tau >= t1) continue;
      const u = (tau - t0) / (t1 - t0);
      m.put(ball, c.ox + a[0] + (b[0] - a[0]) * u + 0.3, c.oy + a[1] + (b[1] - a[1]) * u + 0.15, c.oz + Math.sin(Math.PI * u) * lift, c.done);
    }
  });

  // the frisbee, there and back
  const disc = makeSprite((q) => q.card(0, 0, 0).ellipse(0, 0, 0.34, 0.11, C.orange, { outline: true, w: W_FINE, seg: 10 }), 0, 85);
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const tt = (m.t - c.done) / 2.4;
    const u = tt - Math.floor(tt);
    const k = u < 0.12 ? 0 : u > 0.88 ? 1 : (u - 0.12) / 0.76;
    const s = Math.floor(tt) & 1 ? 1 - k : k;
    m.put(disc, c.ox + fa[0] + (fb[0] - fa[0]) * s, c.oy + fa[1] + (fb[1] - fa[1]) * s, c.oz + 1.9 + Math.sin(Math.PI * k) * 1.4, c.done);
  });

  // kites over the western end of the lawn, each on its string
  const kites: { fx: number; fy: number; col: RGB; ph: number }[] = [
    { fx: 17.4, fy: 35.2, col: C.red, ph: 0 },
    { fx: 20.4, fy: 40.4, col: C.purple, ph: 2.1 },
  ];
  for (const k of kites) {
    person(pen, k.fx, k.fy, 0, randomLook(rng), "cheer", false, 0.72);
    const kite = makeSprite((q) => {
      const cd = q.card(0, 0, 0);
      cd.poly(
        [
          [0, 0.95],
          [0.62, 0],
          [0, -1.15],
          [-0.62, 0],
        ],
        k.col,
        { outline: true, w: W_FINE },
      );
      cd.seg(0, -1.15, 0.3, -2.4, { w: 0.05, color: C.yellow, kind: L_MARK });
      cd.seg(-0.62, 0, 0.62, 0, { w: 0.04, wobble: 0, layer: 1 });
    }, 0, 91);
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const x = c.ox + k.fx - 3.2 + Math.sin(m.clock * 0.8 + k.ph) * 0.9;
      const y = c.oy + k.fy - 5.4;
      const z = c.oz + 11.5 + Math.sin(m.clock * 1.2 + k.ph) * 0.7;
      if (!m.sees(x, y, z, 12)) return;
      m.put(kite, x, y, z, c.done);
      m.pen.stroke(
        [
          [c.ox + k.fx + 0.25, c.oy + k.fy, c.oz + 1.3],
          [x, y, z - 1.1],
        ],
        { w: 0.04, kind: L_BAR, wobble: 0, alpha: 0.8 },
      );
    });
  }

  // the visitors in the dome: up one spiral and down the other. They are inside
  // the glass, so (like the cone) each is drawn pulled towards the camera, where
  // the page would show them.
  const N = 14;
  const walkers = Array.from({ length: 4 }, (_, k) => {
    const look = randomLook(rng);
    return [0, 1].map((fl) => makeSprite((q) => person(q, 0, 0, 0, look, fl ? "walkA" : "walkB", k % 2 === 0, 1), 0, 101 + k * 2 + fl));
  });
  c.movers.push((m) => {
    if (m.t < c.done + 0.3 || !m.sees(c.ox + DX, c.oy + DY, c.oz + DZ + 3, 10)) return;
    const s = c.stay();
    // a party of them is half way up just as the camera arrives
    const t0 = s ? s.at - 9 : c.done;
    for (let k = 0; k < N; k++) {
      const down = k % 2 === 1;
      const turns = 2.25;
      const period = 20;
      const u0 = (((m.t - t0) / period + k / N + hash1(k * 3.1) * 0.04) % 1 + 1) % 1;
      const u = down ? 1 - u0 : u0;
      const lat = 0.06 + u * 0.92;
      const lon = (down ? Math.PI : 0) + u * turns * Math.PI * 2 + 0.6;
      // only those on our side of the dome can be seen through it
      const facing = Math.cos(lon - CAM);
      if (facing < 0.05) continue;
      const p = onDome(lat, lon, 0.9);
      const pull = 1.2 + facing * 0.9;
      const step = Math.floor(m.t * 2.6 + k) & 1;
      m.put(walkers[k % 4][step], c.ox + p[0] + pull, c.oy + p[1] + pull, c.oz + p[2] - 0.3 + pull, c.done, 0.52);
    }
  });
};
