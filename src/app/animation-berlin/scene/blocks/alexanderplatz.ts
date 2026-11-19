// Alexanderplatz: the TV tower, taller than anything else in the city by a
// long way, with the cross of light the sun puts on its sphere; the red town
// hall and the S-Bahn station along the north side; and the square itself,
// where people meet under the World Clock, trams go round, men sell bratwurst
// from a grill they wear, and the Neptune fountain plays between the tower
// and the river.
//
// The Spree is this block's west edge (x = 0), with the island beyond it: so
// everything west of the tower is kept low. The city's axis comes in over the
// bridge at y = AX and its walkers turn round at x = 9: that strip stays clear.

import { RGB, Rng, V2, V3, scaleRGB, smooth } from "../../engine/math";
import { F_WATER, L_BAR, L_MARK, L_SPARK, Pen, Plane } from "../../engine/pen";
import { ampel, dog, flagOf, litfass, queue, sSign } from "../berlin";
import { AXIS_Y, BLOCK, QUAY, ROW_Y } from "../city";
import { W_FINE, W_THIN, Look, archWindow, bench, flowerBed, lamp, person, randomLook, stall, tree } from "../kit";
import { Route, makeSprite, offsetLoop, rounded, tram, traveler, walker } from "../motion";
import { C, TULIP } from "../palette";
import { BlockBuilder, BlockCtx } from "../types";

const E = QUAY + 0.8;
const B = BLOCK;
/** The axis, in the block's own coordinates. */
const AX = AXIS_Y - ROW_Y[1];
/** The tower's foot. */
const TX = 20;
const TY = 19;
const SHAFT = 37.2;
const BALL = 4.4;
/** The middle of the sphere, and the top of the mast. */
const BALL_Z = SHAFT + BALL - 0.5;
const TIP_Z = 58.6;
/** The World Clock. */
const WX = 27.6;
const WY = 30.6;

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

/** A point on the sphere: `lat` up from its equator, `lon` round it (the camera looks from lon = 45 degrees). */
function onBall(lat: number, lon: number, r = BALL): V3 {
  return [TX + Math.cos(lat) * Math.cos(lon) * r, TY + Math.cos(lat) * Math.sin(lon) * r, BALL_Z + Math.sin(lat) * r];
}
const CAM = Math.PI / 4;

// ---------------------------------------------------------------- the tower

function fernsehturm(c: BlockCtx): void {
  const { pen } = c;
  const steel: RGB = [205, 210, 214];
  const steelDark: RGB = [150, 157, 164];

  // the pavilion at its foot: a glazed drum under a ring of folded concrete roofs
  pen.obj(() => {
    pen.cyl(TX, TY, 0, 4.2, 2.8, C.glassLight, { seg: 16, top: C.concrete, glow: 0.55 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      if (Math.cos(a) + Math.sin(a) < -0.1) continue;
      pen.stroke(
        [
          [TX + Math.cos(a) * 4.22, TY + Math.sin(a) * 4.22, 0.05],
          [TX + Math.cos(a) * 4.22, TY + Math.sin(a) * 4.22, 2.8],
        ],
        { w: 0.09, color: C.white, kind: L_MARK, wobble: 0, bias: 0.03 },
      );
    }
    // the way in, on the side of the square
    const door = pen.wall("y+", TX - 1.2, TY - 4.3, 0, 2.4, 8.55);
    door.rect(0, 0, 2.4, 2.3, C.charcoal, { outline: true, w: W_THIN, glow: 0.4 });
    door.seg(1.2, 0, 1.2, 2.3, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  });
  pen.obj(() => {
    const n = 10;
    const inner = 3.3;
    const pt = (a: number, r: number, z: number): V3 => [TX + Math.cos(a) * r, TY + Math.sin(a) * r, z];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const i0 = pt(a0, inner, 3.0);
      const i1 = pt(a1, inner, 3.0);
      const im = pt(am, inner, 3.9);
      const o0 = pt(a0, 6.1, 2.55);
      const o1 = pt(a1, 6.1, 2.55);
      const om = pt(am, 6.7, 5.0);
      // each wing is a fold: one side in the light, the other in its own shade
      pen.fill([i0, o0, om], C.white, { grain: 0.5 });
      pen.fill([i0, om, im], C.white, { grain: 0.5 });
      pen.fill([im, om, o1], C.stone, { grain: 0.5 });
      pen.fill([im, o1, i1], C.stone, { grain: 0.5 });
      pen.stroke([im, om], { w: 0.09 });
      pen.stroke([i0, o0], { w: 0.07 });
      pen.stroke([o0, om, o1], { w: 0.1 });
    }
    pen.cyl(TX, TY, 2.8, inner + 0.1, 1.0, C.concrete, { seg: 14 });
  }, 0.16);

  // the shaft
  pen.obj(() => {
    pen.cyl(TX, TY, 3.6, 1.75, SHAFT - 3.6, C.concrete, { seg: 12, r2: 1.0 });
    for (const a of [-0.35, 0.25, 0.8, 1.35, 1.95]) {
      pen.stroke(
        [
          [TX + Math.cos(a) * 1.75, TY + Math.sin(a) * 1.75, 3.8],
          [TX + Math.cos(a) * 1.01, TY + Math.sin(a) * 1.01, SHAFT - 0.3],
        ],
        { w: 0.05, color: C.concreteDark, kind: L_MARK, wobble: 0.12, bias: 0.04 },
      );
    }
  }, 0.26);

  // the sphere, in slices: steel above and below, a band of windows round the middle
  const cut = Math.acos(1.0 / BALL);
  const lats = [-cut, -1.08, -0.8, -0.52, -0.24, 0.02, 0.3, 0.58, 0.86, 1.12, cut];
  pen.obj(() => {
    for (let k = 0; k + 1 < lats.length; k++) {
      const a = lats[k];
      const b = lats[k + 1];
      const band = k === 4;
      const col = band ? C.glass : a < 0 ? scaleRGB(steel, 0.9) : steel;
      pen.cyl(TX, TY, BALL_Z + Math.sin(a) * BALL, Math.cos(a) * BALL, (Math.sin(b) - Math.sin(a)) * BALL, col, {
        seg: 18,
        r2: Math.cos(b) * BALL,
        top: null,
        edges: false,
        glow: band ? 0.9 : 0,
        grain: 0.5,
      });
    }
    // its outline, as the page sees it (a sphere draws as a circle, a little larger than its radius)
    pen.card(TX, TY, BALL_Z).circle(0, 0, BALL * 1.2247, null, { ink: C.ink, w: 0.13, seg: 30 });
    // the seams between the steel panels: rings and ribs on the side we see
    for (const lat of lats.slice(1, -1)) {
      const ring: V3[] = [];
      for (let q = 0; q <= 14; q++) ring.push(onBall(lat, CAM - 1.75 + (q / 14) * 3.5, BALL + 0.02));
      pen.stroke(ring, { w: lat === lats[4] || lat === lats[5] ? 0.08 : 0.05, color: lat === lats[4] || lat === lats[5] ? C.ink : steelDark, kind: L_MARK, wobble: 0.1, bias: 0.05 });
    }
    for (let q = -4; q <= 4; q++) {
      const lon = CAM + q * 0.36;
      for (const [l0, l1] of [
        [lats[0], lats[4]],
        [lats[5], lats[10]],
      ]) {
        const rib: V3[] = [];
        for (let s = 0; s <= 6; s++) rib.push(onBall(l0 + ((l1 - l0) * s) / 6, lon, BALL + 0.02));
        pen.stroke(rib, { w: 0.045, color: steelDark, kind: L_MARK, wobble: 0.1, bias: 0.05 });
      }
      // the mullions of the window band
      pen.stroke([onBall(lats[4], lon + 0.18, BALL + 0.03), onBall(lats[5], lon + 0.18, BALL + 0.03)], { w: 0.07, color: steel, kind: L_MARK, wobble: 0, bias: 0.06 });
      pen.stroke([onBall(lats[4], lon, BALL + 0.03), onBall(lats[5], lon, BALL + 0.03)], { w: 0.07, color: steel, kind: L_MARK, wobble: 0, bias: 0.06 });
    }
    // "the Pope's revenge": the sun on the steel makes a cross, which nobody planned
    cross(pen, 0.7, 1);
  }, 0.4);

  // above the sphere: the collar, and the mast in red and white
  const top = BALL_Z + Math.sin(cut) * BALL;
  pen.obj(() => {
    pen.cyl(TX, TY, top - 0.1, 1.0, 2.5, C.concrete, { seg: 10 });
    pen.cyl(TX, TY, top + 1.0, 1.08, 0.5, C.red, { seg: 10 });
    pen.cyl(TX, TY, top + 2.4, 1.5, 0.3, steel, { seg: 12 });
    let z = top + 2.7;
    const n = 7;
    const step = (TIP_Z - z) / n;
    for (let k = 0; k < n; k++) {
      pen.pole([TX, TY, z], [TX, TY, z + step + 0.02], 0.62 - k * 0.07, k % 2 ? C.white : C.red, { ink: C.ink });
      z += step;
    }
  }, 0.54);
}

/** The cross of light on the sphere: the upright along a meridian, the bar along a parallel. */
function cross(pen: Pen, alpha: number, wide: number): void {
  const up: V3[] = [];
  for (let s = 0; s <= 8; s++) up.push(onBall(0.2 + (s / 8) * 0.82, CAM, BALL + 0.05));
  const bar: V3[] = [];
  for (let s = 0; s <= 8; s++) bar.push(onBall(0.66, CAM - 0.52 + (s / 8) * 1.04, BALL + 0.05));
  for (const line of [up, bar]) pen.stroke(line, { w: 0.34 * wide, color: C.white, kind: L_MARK, wobble: 0.2, alpha, bias: 0.1 });
}

// ---------------------------------------------------------------- along the north side

/** The Rotes Rathaus: red brick, round arches, a frieze in terracotta, and the clock tower. */
function rathaus(c: BlockCtx, x0: number, y0: number): void {
  const { pen, rng } = c;
  const w = 12;
  const d = 6;
  const h = 9;
  const brick = C.brick;
  const pale = C.sandstoneLight;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, h, brick, { top: C.brickDark });
    const walls: [Plane, number][] = [
      [pen.wall("y+", x0, y0, 0, w, d), w],
      [pen.wall("x+", x0, y0, 0, w, d), d],
    ];
    for (const [f, len] of walls) {
      f.rect(0, 0, len, 0.7, C.brickDark, { grain: 0.7 });
      // the stone chronicle: a band of terracotta reliefs all the way round
      f.rect(0, 3.6, len, 4.25, C.brickRose, { grain: 0.5, layer: 1 });
      f.ticks(0.2, 3.7, len - 0.2, 4.15, { n: Math.round(len * 2.2), len: 0.42, ang: Math.PI / 2, jit: 0.4, color: C.brickDark, w: 0.07, layer: 2 });
      f.rect(0, h - 0.5, len, h, C.brickRose, { grain: 0.5, layer: 1 });
      const n = Math.max(2, Math.round(len / 1.9));
      for (let k = 0; k < n; k++) {
        const a = ((k + 0.5) * len) / n;
        // (the tower stands in front of the middle of the south front)
        if (len === w && Math.abs(a - w / 2) < 1.9) continue;
        archWindow(f, a - 0.48, 1.0, a + 0.48, 3.2, rng.chance(0.6), pale);
        archWindow(f, a - 0.48, 4.9, a + 0.48, 8.0, rng.chance(0.65), pale);
      }
      f.ticks(0.2, 0.8, len - 0.2, h - 0.6, { n: Math.round(len * h * 0.22), len: 0.5, ang: 0, jit: 0.02, color: C.brickDark, w: 0.05 });
    }
  });
  // the tower, standing forward of the front: clock, belfry, a crown of battlements, the flag
  const tx = x0 + w / 2 - 1.6;
  const ty = y0 + d - 2.6;
  const tw = 3.2;
  pen.obj(() => {
    pen.box(tx, ty, 0, tw, tw, 14.5, brick);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, tx, ty, 0, tw, tw);
      f.rect(0, 0, tw, 0.7, C.brickDark, { grain: 0.7 });
      if (sd === "y+") f.poly(archShape(tw / 2 - 0.85, 0, tw / 2 + 0.85, 3.1), C.doorRed, { outline: true, w: W_THIN, layer: 1 });
      else archWindow(f, tw / 2 - 0.5, 1.0, tw / 2 + 0.5, 3.2, true, pale);
      f.rect(0, 3.6, tw, 4.25, C.brickRose, { grain: 0.5, layer: 1 });
      archWindow(f, tw / 2 - 0.55, 5.0, tw / 2 + 0.55, 8.2, true, pale);
      f.rect(0, 9.0, tw, 9.4, pale, { grain: 0.5, layer: 1 });
      // the clock
      f.circle(tw / 2, 11.6, 1.2, C.charcoal, { layer: 1, seg: 16, grain: 0.4 });
      f.circle(tw / 2, 11.6, 1.02, C.white, { outline: true, w: W_FINE, layer: 2, seg: 16, grain: 0.3, glow: 0.5 });
      f.seg(tw / 2, 11.6, tw / 2 - 0.42, 12.0, { w: 0.1, color: C.ink, kind: L_MARK, wobble: 0, layer: 3 });
      f.seg(tw / 2, 11.6, tw / 2 + 0.6, 12.1, { w: 0.07, color: C.ink, kind: L_MARK, wobble: 0, layer: 3 });
      f.rect(0, 14.0, tw, 14.5, pale, { grain: 0.5, layer: 1 });
      f.ticks(0.2, 0.8, tw - 0.2, 13.9, { n: 44, len: 0.5, ang: 0, jit: 0.02, color: C.brickDark, w: 0.05 });
    }
  }, 0.12);
  pen.obj(() => {
    pen.box(tx + 0.25, ty + 0.25, 14.5, tw - 0.5, tw - 0.5, 3.0, brick);
    for (const sd of ["x+", "y+"] as const) {
      const f = pen.wall(sd, tx + 0.25, ty + 0.25, 14.5, tw - 0.5, tw - 0.5);
      for (const a of [0.75, tw - 1.25]) f.poly(archShape(a - 0.42, 0.4, a + 0.42, 2.5), scaleRGB(brick, 0.5), { layer: 1, grain: 0.6 });
    }
    // the crown: a parapet and four corner turrets
    pen.box(tx, ty, 17.5, tw, tw, 0.6, brick, { top: C.brickDark });
    for (const [ax, ay] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      pen.box(tx - 0.1 + ax * (tw - 0.6), ty - 0.1 + ay * (tw - 0.6), 18.1, 0.8, 0.8, 1.5, brick, { top: C.brickRose, w: W_THIN });
    }
  }, 0.26);
  flagOf(pen, tx + tw / 2, ty + tw / 2, 18.1, 4.6, "berlin", 1.15);
}

/** The S-Bahn station: a viaduct of brick arches with shops in them, a glazed hall on top, and a train in it. */
function station(c: BlockCtx, x0: number, x1: number, y0: number): void {
  const { pen } = c;
  const len = x1 - x0;
  const d = 6.2;
  const vh = 3.3;
  const brick = C.brickRose;
  const signs = ["BACK", "KIOSK", "DÖNER", "BLUMEN", "CAFÉ", "PRESSE", "EIS"];
  pen.obj(() => {
    pen.box(x0, y0, 0, len, d, vh, brick, { top: C.ballast });
    const f = pen.wall("y+", x0, y0, 0, len, d);
    const n = Math.round(len / 2.6);
    const bw = len / n;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * bw;
      f.poly(archShape(a - 0.95, 0, a + 0.95, 2.6), k % 3 === 2 ? scaleRGB(brick, 0.5) : C.glassLight, { outline: true, w: W_FINE, layer: 1, glow: k % 3 === 2 ? 0 : 0.85 });
      if (k % 3 !== 2) {
        f.rect(a - 0.9, 1.45, a + 0.9, 1.85, k % 2 ? C.white : C.yellow, { layer: 2, outline: true, w: W_FINE });
        const word = signs[k % signs.length];
        f.text(word, a, 1.53, Math.min(0.2, 1.5 / word.length), { align: "c", layer: 3, w: 0.04 });
      }
    }
    f.rect(0, vh - 0.42, len, vh, C.quayCap, { grain: 0.5, layer: 1 });
    f.ticks(0.2, 0.2, len - 0.2, vh - 0.5, { n: Math.round(len * 1.6), len: 0.5, ang: 0, jit: 0.02, color: scaleRGB(brick, 0.8), w: 0.05, inside: (a, b) => b > 2.75 || Math.abs((((a % bw) + bw) % bw) - bw / 2) > 1.05 });
    const e = pen.wall("x+", x0, y0, 0, len, d);
    e.poly(archShape(d / 2 - 1.3, 0, d / 2 + 1.3, 2.7), scaleRGB(brick, 0.5), { outline: true, w: W_FINE, layer: 1 });
    e.rect(0, vh - 0.42, d, vh, C.quayCap, { grain: 0.5, layer: 1 });
  });
  // the hall: glass walls with the train showing through, under a barrel vault
  const hx = x0 + 0.35;
  const hl = len - 0.7;
  const hy = y0 + 0.35;
  const hd = d - 0.7;
  const wallH = 2.7;
  pen.obj(() => {
    pen.box(hx, hy, vh, hl, hd, wallH, C.glassPale, { glow: 0.5, grain: 0.5, top: null });
    const f = pen.wall("y+", hx, hy, vh, hl, hd);
    // the train: red below the waist, ochre above, as every S-Bahn has been since the twenties
    const t0 = 1.2;
    const t1 = hl - 1.8;
    f.rect(t0, 0.18, t1, 1.0, C.sbahnRed, { layer: 1, grain: 0.5 });
    f.rect(t0, 1.0, t1, 2.0, C.sbahnOchre, { layer: 1, grain: 0.5 });
    f.rect(t0, 2.0, t1, 2.2, C.charcoal, { layer: 1, grain: 0.5 });
    for (let a = t0 + 0.4; a + 0.8 < t1; a += 1.25) {
      const door = Math.round((a - t0) / 1.25) % 4 === 2;
      if (door) f.rect(a, 0.25, a + 0.8, 1.85, C.sbahnRed, { layer: 2, outline: true, w: W_FINE });
      f.rect(a + 0.08, 1.12, a + 0.72, 1.82, C.glass, { layer: 3, glow: 0.9, grain: 0.4 });
    }
    // the hall's own glazing bars in front of it
    for (let a = 0; a <= hl + 0.01; a += hl / Math.round(hl / 1.5)) f.seg(a, 0, a, wallH, { w: 0.07, color: C.white, kind: L_MARK, wobble: 0, layer: 4 });
    f.seg(0, wallH - 0.05, hl, wallH - 0.05, { w: 0.09, color: C.white, kind: L_MARK, wobble: 0, layer: 4 });
    f.seg(0, 0.05, hl, 0.05, { w: 0.09, color: C.zinc, kind: L_MARK, wobble: 0, layer: 4 });
  }, 0.14);
  pen.obj(() => {
    const prof: V2[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI;
      prof.push([hd / 2 + (Math.cos(t) * hd) / 2, Math.sin(t) * 3.0]);
    }
    pen.wall("x+", hx, hy, vh + wallH, 0, hd).extrude(prof, hl, C.glassPale, { crease: 60, glow: 0.45, grain: 0.5 });
    // the ribs of the vault, and the fan of bars in its end
    for (let a = 0; a <= hl + 0.01; a += hl / Math.round(hl / 2.3)) {
      const rib: V3[] = prof.map(([pa, pb]) => [hx + a, hy + hd - pa, vh + wallH + pb + 0.02] as V3);
      pen.stroke(rib, { w: 0.09, color: C.zinc, kind: L_MARK, wobble: 0.1, bias: 0.04 });
    }
    const e = pen.wall("x+", hx, hy, vh, hl, hd);
    e.rect(0, 0, hd, wallH, C.glassPale, { glow: 0.5, grain: 0.5 });
    for (let k = 1; k < 6; k++) {
      const t = (k / 6) * Math.PI;
      e.seg(hd / 2, wallH, hd / 2 + (Math.cos(t) * hd) / 2, wallH + Math.sin(t) * 3.0, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    }
    for (let a = 0.9; a < hd; a += 1.0) e.seg(a, 0, a, wallH, { w: 0.06, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
    e.seg(0, wallH, hd, wallH, { w: 0.08, color: C.white, kind: L_MARK, wobble: 0, layer: 1 });
  }, 0.3);
  // its name, on the viaduct
  pen.obj(() => {
    const sg = pen.plane([x0 + len / 2 - 4.3, y0 + d + 0.05, vh - 0.36], [1, 0, 0], [0, 0, 1], 2, true);
    sg.rect(0, 0, 8.6, 0.78, C.white, { outline: true, w: W_FINE });
    sg.text("ALEXANDERPLATZ", 4.3, 0.2, 0.4, { align: "c", layer: 1, w: 0.06 });
  }, 0.2);
}

/** The hotel: a slab of glass and white bands on a low podium that wears a mosaic round its waist. */
function hotel(c: BlockCtx, x0: number, y0: number): void {
  const { pen, rng } = c;
  const w = 7;
  const d = 6.6;
  pen.obj(() => {
    pen.box(x0, y0, 0, w, d, 4.2, C.concrete, { top: C.concreteDark });
    for (const [f, len] of [
      [pen.wall("y+", x0, y0, 0, w, d), w],
      [pen.wall("x+", x0, y0, 0, w, d), d],
    ] as [Plane, number][]) {
      f.rect(0.3, 0.4, len - 0.3, 2.2, C.glassLight, { outline: true, w: W_FINE, glow: 0.8, layer: 1 });
      // the frieze: a band of bright tiles telling a story nobody stops to read
      f.rect(0, 2.6, len, 3.6, C.cream, { layer: 1, grain: 0.4, outline: true, w: W_FINE });
      for (const col of [C.red, C.blue, C.yellow, C.teal, C.orange, C.green]) {
        f.ticks(0.15, 2.7, len - 0.15, 3.5, { n: Math.round(len * 1.6), len: 0.4, ang: Math.PI / 2, jit: 0.9, color: col, w: 0.16, layer: 2 });
      }
    }
  });
  const tx = x0 + 0.5;
  const ty = y0 + 0.4;
  const tw = w - 1.0;
  const td = d - 1.0;
  const h = 16;
  pen.obj(() => {
    pen.box(tx, ty, 4.2, tw, td, h, C.white, { top: C.concreteDark });
    for (const [f, len] of [
      [pen.wall("y+", tx, ty, 4.2, tw, td), tw],
      [pen.wall("x+", tx, ty, 4.2, tw, td), td],
    ] as [Plane, number][]) {
      for (let b = 0.5; b + 1.0 < h; b += 1.55) {
        f.rect(0.15, b, len - 0.15, b + 0.95, C.glass, { layer: 1, grain: 0.5 });
        const n = Math.round(len / 0.75);
        for (let k = 0; k < n; k++) {
          if (rng.chance(0.45)) f.rect(0.15 + (k * (len - 0.3)) / n + 0.05, b + 0.08, 0.15 + ((k + 1) * (len - 0.3)) / n - 0.05, b + 0.87, C.glass, { layer: 2, glow: 1, grain: 0.4 });
          f.seg(0.15 + (k * (len - 0.3)) / n, b, 0.15 + (k * (len - 0.3)) / n, b + 0.95, { w: 0.045, color: C.white, kind: L_MARK, wobble: 0, layer: 3 });
        }
      }
    }
  }, 0.14);
  pen.obj(() => {
    const sg = pen.plane([tx + 0.4, ty + td - 0.2, 4.2 + h], [1, 0, 0], [0, 0, 1], 1, true);
    sg.rect(0, 0, tw - 0.8, 1.25, C.blueDark, { outline: true, w: W_FINE, glow: 0.3 });
    sg.text("HOTEL", (tw - 0.8) / 2, 0.3, 0.66, { align: "c", layer: 1, color: C.white, kind: L_MARK, w: 0.1 });
    pen.pole([tx + 1, ty + 1, 4.2 + h], [tx + 1, ty + 1, 4.2 + h + 2.6], 0.07, C.greyDark, { ink: false });
  }, 0.3);
}

// ---------------------------------------------------------------- on the square

/** The Neptune fountain: a wide basin, the god on his shell in the middle, four rivers lounging on the rim. */
function neptun(c: BlockCtx, x: number, y: number): void {
  const { pen } = c;
  const r = 3.4;
  const bronze: RGB = [104, 150, 128];
  pen.obj(() => {
    pen.cyl(x, y, 0, r, 0.5, C.sandstone, { seg: 20, top: C.sandstoneLight });
    pen.floor(0.51, 1).circle(x, y, r - 0.35, C.water, { kind: F_WATER, seg: 20, outline: true, w: W_FINE, ink: C.waterInk });
    pen.cyl(x, y, 0.5, 1.1, 0.7, C.sandstoneDark, { seg: 10 });
    pen.cyl(x, y, 1.2, 0.5, 0.25, bronze, { seg: 10, r2: 1.25 });
  });
  pen.obj(() => {
    // Neptune: beard, crown, trident
    const cd = pen.card(x, y, 1.45);
    cd.poly(
      [
        [-0.42, 0],
        [0.42, 0],
        [0.3, 1.15],
        [-0.3, 1.15],
      ],
      bronze,
      { outline: true, w: W_FINE, layer: 1 },
    );
    cd.circle(0, 1.42, 0.3, bronze, { outline: true, w: W_FINE, layer: 2, seg: 9 });
    cd.bar(0.28, 1.0, 0.62, 0.7, 0.16, bronze, { layer: 2 });
    cd.bar(0.62, 0.1, 0.62, 2.35, 0.08, bronze, { layer: 3 });
    for (const o of [-0.2, 0, 0.2]) cd.bar(0.62 + o, 2.3, 0.62 + o, 2.75, 0.07, bronze, { layer: 3 });
    cd.bar(0.42, 2.3, 0.82, 2.3, 0.07, bronze, { layer: 3 });
  }, 0.12);
  // the four rivers, on the rim, and the jets they pour
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2) + 0.55;
    const fx = x + Math.cos(a) * (r - 0.1);
    const fy = y + Math.sin(a) * (r - 0.1);
    pen.obj(() => {
      const cd = pen.card(fx, fy, 0.5, Math.cos(a) - Math.sin(a) < 0);
      cd.ellipse(0, 0.26, 0.6, 0.24, bronze, { outline: true, w: W_FINE, seg: 10 });
      cd.circle(0.52, 0.56, 0.2, bronze, { outline: true, w: W_FINE, layer: 1, seg: 8 });
      const jet: V3[] = [];
      for (let s = 0; s <= 6; s++) {
        const u = s / 6;
        jet.push([fx + (x - fx) * u * 0.62, fy + (y - fy) * u * 0.62, 0.8 + Math.sin(u * Math.PI) * 1.1]);
      }
      pen.stroke(jet, { w: 0.09, color: C.white, kind: L_BAR, wobble: 0.3, sway: 0.2 });
    }, 0.2);
  }
}

/** The Fountain of International Friendship: a spiral of enamel bowls, each spilling into the next. */
function friendship(c: BlockCtx, x: number, y: number): void {
  const { pen } = c;
  const r = 3.0;
  pen.obj(() => {
    pen.cyl(x, y, 0, r, 0.4, C.concrete, { seg: 18, top: C.stone });
    pen.floor(0.41, 1).circle(x, y, r - 0.3, C.water, { kind: F_WATER, seg: 18, outline: true, w: W_FINE, ink: C.waterInk });
  });
  const cols: RGB[] = [C.red, C.orange, C.yellow, C.teal, C.blue, C.purple, C.pink, C.green, C.orange, C.red];
  let prev: V3 | null = null;
  for (let k = 0; k < cols.length; k++) {
    const a = k * 0.92 + 0.4;
    const rr = 2.2 - k * 0.2;
    const bx = x + Math.cos(a) * rr;
    const by = y + Math.sin(a) * rr;
    const h = 0.7 + k * 0.26;
    const here: V3 = [bx, by, h + 0.32];
    const from: V3 | null = prev;
    pen.obj(() => {
      pen.pole([bx, by, 0.4], [bx, by, h], 0.1, C.greyDark, { ink: false });
      pen.cyl(bx, by, h, 0.16, 0.32, cols[k], { seg: 8, r2: 0.62, top: C.glassPale });
      // water falling from this bowl into the one below
      if (from) pen.stroke([here, [(here[0] + from[0]) / 2, (here[1] + from[1]) / 2, here[2] + 0.05], from], { w: 0.06, color: C.white, kind: L_BAR, wobble: 0.3, sway: 0.2 });
    }, 0.1 + k * 0.03);
    prev = here;
  }
}

/** A man who sells bratwurst from a grill he wears, under an umbrella that grows out of his back. */
function grillwalker(pen: Pen, rng: Rng, x: number, y: number, flip: boolean): void {
  const look: Look = { ...randomLook(rng), top: C.red, hat: C.red };
  person(pen, x, y, 0, look, "stand", flip);
  pen.obj(() => {
    const cd = pen.card(x, y, 0, flip);
    cd.rect(0.25, 0.95, 1.05, 1.22, C.charcoal, { outline: true, w: W_FINE, layer: 5 });
    for (const a of [0.38, 0.6, 0.82]) cd.bar(a, 1.25, a + 0.14, 1.3, 0.09, C.brickBrown, { layer: 6 });
    cd.bar(0.3, 1.5, 0.5, 1.2, 0.07, C.greyDark, { layer: 5 });
    pen.pole([x, y, 1.4], [x, y, 3.3], 0.06, C.greyDark, { ink: false });
    pen.cone(x, y, 3.05, 1.15, 0.45, C.red, { seg: 8, crease: 0.5 });
  });
}

/** Spiked hair in a colour of one's own choosing, on top of whoever stands at (x, y). */
function mohawk(pen: Pen, x: number, y: number, z: number, col: RGB, flip: boolean): void {
  const cd = pen.card(x, y, z, flip);
  cd.poly(
    [
      [-0.3, 2.05],
      [-0.26, 2.45],
      [-0.12, 2.2],
      [-0.02, 2.58],
      [0.1, 2.22],
      [0.24, 2.48],
      [0.3, 2.05],
    ],
    col,
    { outline: true, w: W_FINE, layer: 6 },
  );
}

/** The World Clock: a column, a wide drum with the cities of the world round it, the compass rose it stands on. */
function weltzeituhr(c: BlockCtx): void {
  const { pen } = c;
  const alu: RGB = [198, 203, 208];
  c.early(() => {
    const g = pen.floor(0, 2);
    g.circle(WX, WY, 3.0, C.stone, { outline: true, w: W_FINE, seg: 24 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const b = a + Math.PI / 8;
      g.poly(
        [
          [WX, WY],
          [WX + Math.cos(a) * (k % 2 ? 1.9 : 2.8), WY + Math.sin(a) * (k % 2 ? 1.9 : 2.8)],
          [WX + Math.cos(b) * 0.7, WY + Math.sin(b) * 0.7],
        ],
        k % 2 ? C.stoneDark : C.charcoal,
        { layer: 1, grain: 0.5 },
      );
    }
  });
  pen.obj(() => {
    pen.cyl(WX, WY, 0, 0.5, 2.9, C.charcoal, { seg: 8 });
    const n = 16;
    const r = 2.6;
    pen.cyl(WX, WY, 2.9, r, 1.6, alu, { seg: n, top: alu, glow: 0.3 });
    const cities = ["BERLIN", "MOSKAU", "TOKIO", "PEKING", "DELHI", "KAIRO", "PARIS", "LONDON", "LIMA", "HANOI", "PRAG", "WIEN", "ROM", "SOFIA", "OSLO", "KIEW"];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const ux = Math.cos(a1) - Math.cos(a0);
      const uy = Math.sin(a1) - Math.sin(a0);
      const len = Math.hypot(ux, uy) * r;
      if (uy / Math.hypot(ux, uy) - ux / Math.hypot(ux, uy) < 0.12) continue;
      const f = pen.plane([WX + Math.cos(a0) * r, WY + Math.sin(a0) * r, 2.9], [(ux * r) / len, (uy * r) / len, 0], [0, 0, 1], 1);
      // a band of the hours, a band of the map, and a name
      f.rect(0, 1.18, len, 1.5, k % 2 ? C.white : C.charcoal, { grain: 0.4 });
      f.rect(0, 0.1, len, 0.5, k % 3 ? C.sky : C.grassLight, { grain: 0.4 });
      f.text(cities[k], len / 2, 0.72, 0.17, { align: "c", w: 0.035, layer: 1 });
      f.seg(0, 0, 0, 1.6, { w: 0.05, wobble: 0 });
    }
    pen.pole([WX, WY, 4.5], [WX, WY, 5.3], 0.12, C.charcoal);
  });
}

/** A skater: somebody on a board. */
function skater(look: Look, flip: boolean): ReturnType<typeof makeSprite> {
  return makeSprite((p) => {
    const cd = p.card(0, 0, 0, flip);
    cd.rect(-0.55, 0.06, 0.55, 0.16, C.charcoal, { layer: 0 });
    for (const a of [-0.36, 0.36]) cd.circle(a, 0.06, 0.07, C.white, { seg: 6, layer: 1, grain: 0 });
    person(p, 0, 0, 0.16, look, "walkA", flip);
  }, 0, 41);
}

/** A tram stop: a glass shelter, a bench in it, the sign with the H. */
function haltestelle(pen: Pen, x: number, y: number): void {
  pen.obj(() => {
    for (const o of [0, 4.2]) pen.pole([x, y + o, 0], [x, y + o, 2.5], 0.1, C.greyDark);
    pen.box(x - 0.9, y - 0.2, 2.5, 1.6, 4.6, 0.12, C.bvg, { w: W_FINE });
    const f = pen.wall("x+", x - 0.95, y, 0, 0.05, 4.2);
    f.rect(0.1, 0.5, 4.1, 2.3, C.glassPale, { outline: true, w: W_FINE, grain: 0.4, glow: 0.3 });
    pen.box(x - 0.6, y + 0.9, 0.38, 0.4, 2.4, 0.1, C.wood, { w: W_FINE });
    // the sign: a green H on yellow
    pen.pole([x + 0.5, y - 0.9, 0], [x + 0.5, y - 0.9, 2.9], 0.09, C.greyDark);
    const cd = pen.card(x + 0.5, y - 0.9, 2.9);
    cd.circle(0, 0.42, 0.42, C.yellow, { outline: true, w: W_FINE, layer: 1, seg: 12 });
    cd.text("H", -0.15, 0.2, 0.42, { color: C.green, kind: L_MARK, w: 0.1, wobble: 0, layer: 2 });
  });
}

/** A pigeon on the ground. */
function pecker(pen: Pen, x: number, y: number, flip: boolean): void {
  const cd = pen.card(x, y, 0, flip);
  pen.begin();
  cd.ellipse(0, 0.16, 0.22, 0.13, C.metal, { outline: true, w: W_FINE, seg: 8 });
  cd.circle(0.2, 0.3, 0.09, C.slateLight, { outline: true, w: W_FINE, seg: 6, layer: 1 });
  pen.end();
}

// ---------------------------------------------------------------- the place

export const alexanderplatz: BlockBuilder = (c) => {
  const { pen, rng } = c;
  // the tower is taller than a tour view: stand back, and look up
  c.focus(10, 8, 0.72);

  // the ground: grey setts across the square, lawns by the river, the little landing square where the bridge comes in
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(E, E, B - E, B - E, C.cobble);
    for (let x = 16; x < B - E; x += 3.2) g.seg(x, 12.6, x, B - E - 0.1, { w: 0.05, color: C.cobbleDark, kind: L_MARK, wobble: 0.3, layer: 1 });
    for (let y = 15; y < B - E; y += 3.2) g.seg(14.2, y, B - E - 0.1, y, { w: 0.05, color: C.cobbleDark, kind: L_MARK, wobble: 0.3, layer: 1 });
    // the lawns between the tower and the river, either side of the axis
    for (const [y0, y1] of [
      [12.9, AX - 2.9],
      [AX + 2.9, B - E],
    ]) {
      g.rect(E, y0, 13.6, y1, C.grass, { outline: true, w: W_THIN, layer: 1 });
      pen.floor(0, 2).ticks(E + 0.3, y0 + 0.3, 13.3, y1 - 0.3, { n: Math.round((y1 - y0) * 4), len: 0.42, ang: 0.9, jit: 0.5, color: C.grassDark, w: 0.06 });
    }
    // where the bridge lands
    g.rect(QUAY, AX - 2.5, 13.6, AX + 2.5, C.plaza, { layer: 1 });
    for (let x = 5; x < 13.6; x += 2.2) g.seg(x, AX - 2.4, x, AX + 2.4, { w: 0.05, color: C.stoneDark, kind: L_MARK, wobble: 0.3, layer: 2 });
  });

  rathaus(c, E + 0.2, E + 0.6);
  station(c, 17.6, 36.0, E + 0.6);
  hotel(c, 36.6, E + 0.6);
  fernsehturm(c);
  sSign(pen, 20.4, 12.1, 0, 3.4);
  litfass(pen, rng, 31.2, 14.6);

  // ---- between the tower and the river: Neptune
  const nx = 9.0;
  const ny = 20.6;
  c.early(() => pen.floor(0, 3).circle(nx, ny, 4.5, C.path, { seg: 24 }));
  neptun(c, nx, ny);
  // punks on the rim, their dogs, their bottles
  const punks: [number, number, RGB, boolean][] = [
    [nx - 1.4, ny + 3.55, C.pink, false],
    [nx - 0.5, ny + 3.75, C.grassLight, false],
    [nx + 0.6, ny + 3.7, C.orange, true],
  ];
  for (const [x, y, col, fl] of punks) {
    person(pen, x, y, 0.22, { ...randomLook(rng), top: C.black, legs: C.charcoal, hat: null, long: false }, "sit", fl);
    mohawk(pen, x, y, 0.22 - 0.3, col, fl);
  }
  dog(pen, nx - 2.5, ny + 4.4, 0, C.woodDark, false);
  dog(pen, nx + 1.7, ny + 4.5, 0, C.charcoal, true, 0.85);
  // people who came to look, and one drying a child
  for (const [x, y] of [
    [nx + 4.4, ny - 1.4],
    [nx + 4.6, ny + 0.4],
    [nx - 3.9, ny - 2.2],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave"]), x > nx);
  }
  bench(pen, nx - 2.6, ny - 4.6, 180);
  person(pen, nx - 2.9, ny - 4.8, 0.3, randomLook(rng), "sit", false);
  for (const [x, y] of [
    [6.2, 14.6],
    [12.2, 14.2],
    [6.0, 26.4],
  ]) {
    tree(pen, rng, x, y, { kind: "bush", r: 0.9 });
  }
  lamp(pen, 13.1, 14.0, 0, 3.2);
  lamp(pen, 13.1, AX - 3.3, 0, 3.2);

  // ---- the foot of the tower: the queue to go up, and a group filming the top
  queue(pen, rng, TX - 2.2, TY + 5.1, 6, 1, 0);
  queue(pen, rng, TX + 2.2, TY + 6.1, 6, -1, 0);
  pen.obj(() => {
    for (const y of [TY + 5.6, TY + 6.6]) {
      for (const x of [TX - 2.7, TX + 2.7]) pen.pole([x, y, 0], [x, y, 0.9], 0.07, C.greyDark, { ink: false });
      pen.stroke(
        [
          [TX - 2.7, y, 0.85],
          [TX, y, 0.72],
          [TX + 2.7, y, 0.85],
        ],
        { w: 0.05, color: C.red, kind: L_BAR, wobble: 0 },
      );
    }
  });
  const up: [number, number][] = [
    [27.2, 17.4],
    [28.3, 18.6],
    [29.0, 20.1],
    [27.6, 20.6],
    [28.9, 22.0],
    [30.2, 18.9],
    [30.4, 21.2],
  ];
  for (const [x, y] of up) person(pen, x, y, 0, randomLook(rng), rng.pick(["cheer", "wave", "cheer"]), true, rng.chance(0.15) ? 0.72 : 1);
  const guide: Look = { ...randomLook(rng), top: C.orange, hat: null };
  person(pen, 26.4, 19.2, 0, guide, "wave", false);

  // ---- under the World Clock, where half of Berlin has arranged to meet the other half
  weltzeituhr(c);
  const wait: [number, number, string, boolean][] = [
    [WX - 2.2, WY + 2.5, "stand", false],
    [WX - 0.9, WY + 3.3, "wave", false],
    [WX + 0.5, WY + 3.5, "stand", true],
    [WX + 1.9, WY + 2.9, "stand", true],
    [WX + 3.0, WY + 1.4, "wave", true],
    [WX - 3.3, WY + 0.6, "stand", false],
    [WX - 3.0, WY - 1.5, "stand", false],
    [WX + 3.3, WY - 0.6, "cheer", true],
  ];
  for (const [x, y, pose, fl] of wait) person(pen, x, y, 0, randomLook(rng), pose as "stand" | "wave" | "cheer", fl);
  // one has brought flowers; two have just found each other
  pen.obj(() => {
    const cd = pen.card(WX - 2.2 + 0.42, WY + 2.5, 1.0);
    for (const [a, b, col] of [
      [0, 0.5, C.red],
      [0.16, 0.42, C.yellow],
      [-0.14, 0.4, C.pink],
    ] as [number, number, RGB][]) {
      cd.circle(a, b, 0.14, col, { seg: 6, grain: 0, layer: 6 });
    }
    cd.bar(0, 0, 0, 0.36, 0.08, C.green, { layer: 5 });
  });
  person(pen, WX + 0.4, WY + 5.2, 0, randomLook(rng), "cheer", false);
  person(pen, WX + 1.1, WY + 5.2, 0, randomLook(rng), "cheer", true);

  // ---- the friendship fountain, at the front, and the skaters who use its rim
  const fx = 21.6;
  const fy = 39.0;
  friendship(c, fx, fy);
  for (const [x, y, fl] of [
    [fx - 4.6, fy - 2.4, false],
    [fx - 5.2, fy + 0.6, false],
  ] as [number, number, boolean][]) {
    person(pen, x, y, 0, randomLook(rng), "stand", fl, 0.72);
  }

  // ---- a few market stalls along the front of the square
  const wares: [string, RGB[], RGB][] = [
    ["OBST", [C.red, C.orange, C.yellow, C.grass], C.green],
    ["HONIG", [C.yellow, C.gold, C.ochre], C.orange],
  ];
  wares.forEach(([sign, goods, a], k) => {
    pen.push(25.6 + k * 3.6, 40.4, 0, 0);
    stall(pen, rng, { w: 3.1, sign, goods, a });
    pen.pop();
  });
  for (const [x, y] of [
    [26.4, 43.5],
    [29.0, 43.6],
    [30.6, 43.4],
  ]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "wave"]), rng.chance(0.5));
  }
  flowerBed(pen, rng, 5.0, 26.0, 3.2, 1.6, TULIP.slice(0, 4));
  flowerBed(pen, rng, 5.0, AX + 3.6, 3.0, 1.6, TULIP.slice(2, 6));

  // ---- bratwurst, free hugs, a busker
  grillwalker(pen, rng, 16.0, 29.6, false);
  person(pen, 17.5, 29.9, 0, randomLook(rng), "stand", true);
  grillwalker(pen, rng, 29.6, 36.6, true);
  person(pen, 28.2, 36.9, 0, randomLook(rng), "wave", false);
  person(pen, 28.0, 37.9, 0, randomLook(rng), "stand", false, 0.72);
  // free hugs: a sign held high, and a taker
  const hx = 19.6;
  const hy = 32.0;
  person(pen, hx, hy, 0, { ...randomLook(rng), top: C.yellow }, "cheer", false);
  pen.obj(() => {
    const cd = pen.card(hx, hy, 2.2);
    cd.rect(-1.0, 0.1, 1.0, 1.0, C.white, { outline: true, w: W_FINE, layer: 6 });
    cd.text("FREE", 0, 0.6, 0.26, { align: "c", layer: 7, w: 0.05 });
    cd.text("HUGS", 0, 0.2, 0.26, { align: "c", layer: 7, w: 0.05, color: C.red, kind: L_MARK });
  });
  person(pen, hx + 1.5, hy + 0.5, 0, randomLook(rng), "cheer", true);
  // a busker with a guitar and an amplifier on the lawn's edge, and his public
  const bx = 10.4;
  const by = 40.4;
  const busker: Look = { ...randomLook(rng), top: C.purple, hat: C.black };
  person(pen, bx, by, 0, busker, "stand", false);
  pen.obj(() => {
    const cd = pen.card(bx + 0.2, by + 0.05, 0);
    cd.ellipse(0.1, 1.0, 0.3, 0.22, C.wood, { outline: true, w: W_FINE, layer: 6, seg: 9 });
    cd.bar(0.3, 1.1, 0.85, 1.42, 0.08, C.woodDark, { layer: 6 });
    pen.box(bx - 1.1, by - 0.3, 0, 0.6, 0.5, 0.7, C.charcoal, { w: W_FINE });
  });
  for (let k = 0; k < 6; k++) {
    const a = -0.5 + k * 0.42;
    person(pen, bx + 0.6 + Math.cos(a) * 2.5, by + 0.3 + Math.sin(a) * 2.0, 0, randomLook(rng), k % 3 ? "stand" : "wave", true, k === 4 ? 0.72 : 1);
  }
  // a wedding party on the town hall's steps: it is also the registry office
  const bride: Look = { skin: [246, 211, 184], hair: [74, 48, 32], top: C.white, legs: C.white, long: true, hat: null };
  const groom: Look = { skin: [211, 154, 108], hair: [43, 32, 25], top: C.charcoal, legs: C.charcoal, long: false, hat: null };
  person(pen, 9.4, 12.6, 0, bride, "wave", false);
  person(pen, 10.2, 12.6, 0, groom, "stand", true);
  for (const [x, y] of [
    [7.6, 13.4],
    [8.4, 14.0],
    [11.6, 13.6],
    [12.3, 13.0],
  ]) {
    person(pen, x, y, 0, randomLook(rng), "cheer", x > 10);
  }

  // ---- the tram loop on the east side, with its stop
  // (a turning loop: two straights joined by half circles as wide as the square allows, so the tram bends, not folds)
  const LR = 4.1;
  const LX = B - E - 1.2 - LR;
  const LY0 = 16.6 + LR;
  const LY1 = B - E - 1.2 - LR;
  const loop: V3[] = [];
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI + (k / 12) * Math.PI;
    loop.push([LX + Math.cos(a) * LR, LY0 + Math.sin(a) * LR, 0]);
  }
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI;
    loop.push([LX + Math.cos(a) * LR, LY1 + Math.sin(a) * LR, 0]);
  }
  const world = (p: V3): V3 => [c.ox + p[0], c.oy + p[1], c.oz + p[2]];
  const rails = new Route(loop.map(world), true);
  c.early(() => {
    for (const o of [-0.55, 0.55]) {
      const rail = offsetLoop(loop, o);
      rail.push(rail[0]);
      pen.stroke(
        rail.map((p) => [p[0], p[1], 0.03] as V3),
        { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2, layer: 3 },
      );
    }
    // the middle of the loop: grass, a few flowers
    const g = pen.floor(0, 2);
    g.ellipse(LX, (LY0 + LY1) / 2, LR - 1.9, (LY1 - LY0) / 2 + 1.2, C.grass, { outline: true, w: W_THIN, seg: 20 });
  });
  for (const y of [LY0 + 1, (LY0 + LY1) / 2, LY1 - 1]) tree(pen, rng, LX, y, { kind: "round", h: 1.6, r: 1.1 });
  flowerBed(pen, rng, LX - 0.9, (LY0 + LY1) / 2 - 5.6, 1.8, 2.6, TULIP.slice(0, 4));
  flowerBed(pen, rng, LX - 0.9, (LY0 + LY1) / 2 + 3.0, 1.8, 2.6, TULIP.slice(1, 5));
  const SX = LX - LR - 1.75;
  haltestelle(pen, SX, 23.4);
  for (const [x, y, fl] of [
    [SX - 0.2, 24.2, true],
    [SX - 0.1, 25.6, true],
    [SX + 0.2, 28.6, false],
    [SX - 0.4, 29.6, true],
    [SX + 0.3, 22.2, false],
  ] as [number, number, boolean][]) {
    person(pen, x, y, 0, randomLook(rng), rng.pick(["stand", "stand", "wave"]), fl, rng.chance(0.15) ? 0.72 : 1);
  }
  ampel(pen, B - E - 0.3, B - E - 0.4, 0, true);
  ampel(pen, B - E - 0.3, 13.4, 0, false);
  for (const [x, y] of [
    [16.4, 30.4],
    [21.8, 28.2],
    [25.8, 41.8],
    [31.6, 33.4],
    [18.4, 33.0],
    [24.2, 28.2],
  ]) {
    pecker(pen, x, y, rng.chance(0.5));
  }
  lamp(pen, 16.6, 33.0, 0, 3.2);
  lamp(pen, 30.2, 25.6, 0, 3.2);
  lamp(pen, 22.6, 12.2, 0, 3.2);

  // ---- what moves
  // the tram: it comes round to the stop as the camera arrives
  const stopAt = (() => {
    // how far round the loop the stop is: find the point of the route nearest the shelter
    let best = 0;
    let bd = Infinity;
    const P: V3 = [0, 0, 0];
    for (let s = 0; s < rails.length; s += 0.5) {
      rails.pos(s, P);
      const dd = Math.hypot(P[0] - (c.ox + LX - LR), P[1] - (c.oy + 26));
      if (dd < bd) {
        bd = dd;
        best = s;
      }
    }
    return best;
  })();
  const SPEED = 2.4;
  const tramBorn = c.done + 0.4;
  const runTram = tram(rails, 0, -1e9, SPEED);
  c.movers.push((m) => {
    if (m.t < tramBorn) return;
    const s = c.stay();
    // run it on a clock of its own, set so that its middle is at the stop a second after the camera gets here
    const shift = s ? stopAt / SPEED - (s.at + 1.2) : 0;
    runTram({ ...m, t: m.t + shift, put: (sp, x, y, z, _t0, sc) => m.put(sp, x, y, z, tramBorn, sc) });
  });

  // the planets on top of the World Clock: wire rings that turn, a ball on each
  const ringTilt = [0.5, -0.7, 1.05];
  const ringR = [1.0, 1.45, 1.9];
  const balls: RGB[] = [C.yellow, C.blue, C.red];
  c.movers.push((m) => {
    if (m.t < c.done || !m.sees(c.ox + WX, c.oy + WY, c.oz + 6, 8)) return;
    const s = c.stay();
    const since = s ? m.t - s.at : m.t - c.done;
    // they turn slowly all day, and spin up for a moment when somebody is looking
    const psi = m.t * 0.5 + 5.0 * smooth(0, 2.6, since);
    const cx = c.ox + WX;
    const cy = c.oy + WY;
    const cz = c.oz + 6.2;
    for (let k = 0; k < 3; k++) {
      const r = ringR[k];
      const tilt = ringTilt[k];
      const rot = psi * (k % 2 ? -0.7 : 1) + k * 2.1;
      const pt = (th: number): V3 => {
        const px = Math.cos(th) * r;
        const py = Math.sin(th) * r * Math.cos(tilt);
        const pz = Math.sin(th) * r * Math.sin(tilt);
        return [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot), cz + pz];
      };
      const ring: V3[] = [];
      for (let q = 0; q < 16; q++) ring.push(pt((q / 16) * Math.PI * 2));
      m.pen.stroke(ring, { closed: true, w: 0.07, color: C.greyDark, kind: L_BAR, wobble: 0 });
      const b = pt(psi * (1.3 + k * 0.4));
      m.pen.card(b[0], b[1], b[2]).circle(0, 0, 0.24 - k * 0.03, balls[k], { outline: true, w: W_FINE, seg: 8, grain: 0 });
    }
    m.pen.card(cx, cy, cz).circle(0, 0, 0.3, C.gold, { outline: true, w: W_FINE, seg: 8, grain: 0 });
  });

  // the cross of light flares as the camera looks up; the light on the tip blinks all night
  const tip: V3 = [c.ox + TX, c.oy + TY, c.oz + TIP_Z];
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const s = c.stay();
    if (s && m.sees(c.ox + TX, c.oy + TY, c.oz + BALL_Z, 10)) {
      const u = m.t - (s.at + 0.5);
      if (u > 0 && u < 2.2) {
        const k = Math.sin((u / 2.2) * Math.PI);
        m.pen.push(c.ox, c.oy, c.oz);
        cross(m.pen, 0.95 * k, 1 + 1.3 * k);
        m.pen.pop();
      }
    }
    if (m.night > 0.3 && m.t % 1.2 < 0.6 && m.sees(tip[0], tip[1], tip[2], 6)) {
      m.pen.stroke([tip, [tip[0], tip[1], tip[2] + 0.12]], { w: 1.1, color: [255, 70, 50], kind: L_SPARK, wobble: 0, alpha: m.night });
      m.pen.stroke([tip, [tip[0], tip[1], tip[2] + 0.12]], { w: 2.6, color: [255, 70, 50], kind: L_SPARK, wobble: 0, alpha: m.night * 0.25 });
    }
  });

  // the square's own people, in two loops that keep clear of the fountains, the clock and the rails
  const northLoop = stroll(c, [
    [14.4, 13.0],
    [31.9, 13.0],
    [31.9, 20.4],
    [27.4, 26.9],
    [14.4, 26.9],
  ]);
  const southLoop = stroll(c, [
    [15.6, 34.3],
    [31.8, 34.3],
    [31.8, 43.3],
    [15.6, 43.3],
  ]);
  for (let k = 0; k < 5; k++) c.movers.push(walker(northLoop, rng, c.done + rng.range(0, 1)));
  for (let k = 0; k < 4; k++) c.movers.push(walker(southLoop, rng, c.done + rng.range(0, 1)));

  // skaters round the friendship fountain
  const ring: V3[] = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    ring.push([c.ox + fx + Math.cos(a) * 4.2, c.oy + fy + Math.sin(a) * 3.55, c.oz]);
  }
  const rink = new Route(ring, true);
  for (let k = 0; k < 3; k++) {
    const look = randomLook(rng);
    const right = skater(look, false);
    const left = skater(look, true);
    c.movers.push(
      traveler(rink, {
        speed: (3.0 + k * 0.5) * (k === 1 ? -1 : 1),
        at: k / 3 + 0.1,
        born: c.done + 0.3 * k,
        span: 1.2,
        sprite: (h) => ((Math.cos(h) - Math.sin(h)) * (k === 1 ? -1 : 1) >= 0 ? right : left),
      }),
    );
  }

  // children in and out of Neptune's jets
  for (let k = 0; k < 3; k++) {
    const look = randomLook(rng);
    const sprite = makeSprite((p) => person(p, 0, 0, 0, look, "cheer", k % 2 === 0, 0.72), 0, 51 + k);
    const a = 0.3 + k * 1.1;
    c.movers.push((m) => {
      const hop = Math.abs(Math.sin(m.t * 4.2 + k * 1.3));
      const rr = 4.0 + Math.sin(m.t * 0.9 + k * 2) * 0.35;
      m.put(sprite, c.ox + nx + Math.cos(a) * rr, c.oy + ny + Math.sin(a) * rr, c.oz + hop * hop * 0.4, c.done);
    });
  }

  // swifts round the shaft, half way up
  const bird = [0, 1].map((up) =>
    [0, 1].map((fl) =>
      makeSprite((p) => {
        const cd = p.card(0, 0, 0, fl === 1);
        const y = up ? 0.3 : -0.08;
        cd.bar(-0.55, y, -0.16, 0.06, 0.1, C.charcoal);
        cd.bar(0.55, y, 0.16, 0.06, 0.1, C.charcoal);
        cd.ellipse(0, 0, 0.22, 0.11, C.charcoal, { seg: 7, layer: 1 });
      }, 0, 9),
    ),
  );
  for (let k = 0; k < 5; k++) {
    const sp = (0.7 + 0.09 * k) * (k % 2 ? -1 : 1);
    const ph = k * 1.9;
    c.movers.push((m) => {
      const an = ph + m.t * sp;
      const r = 3.4 + k * 1.1;
      const flap = Math.floor(m.t * 7 + ph) & 1;
      m.put(bird[flap][-Math.sin(an) * sp - Math.cos(an) * sp < 0 ? 1 : 0], c.ox + TX + Math.cos(an) * r, c.oy + TY + Math.sin(an) * r, c.oz + 24 + k * 2.3 + Math.sin(m.t * 0.8 + ph) * 1.2, c.done + k * 0.2);
    });
  }

  // somebody always comes down the hotel on a rope: it is a thing you can pay for here
  const flyer = makeSprite((p) => person(p, 0, 0, 0, { ...randomLook(rng), top: C.orange }, "cheer", true, 0.62), 0, 57);
  const fxw = c.ox + 36.6 + 6.55;
  const fyw = c.oy + E + 0.6 + 3.2;
  c.movers.push((m) => {
    if (m.t < c.done) return;
    const u = ((m.t - c.done) % 8) / 8;
    const z = c.oz + 20.2 - Math.min(1, u / 0.55) * 14.8;
    if (u > 0.62 || !m.sees(fxw, fyw, z, 8)) return;
    m.pen.stroke(
      [
        [fxw, fyw, c.oz + 20.4],
        [fxw, fyw, z + 1.2],
      ],
      { w: 0.035, color: C.ink, kind: L_BAR, wobble: 0 },
    );
    m.put(flyer, fxw, fyw, z, c.done);
  });
};
