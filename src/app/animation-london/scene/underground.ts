// The Underground. The slab the city stands on is cut straight down along its
// two front edges, and in the cut you can see what is under the streets: the
// tunnels of two Tube lines, stations with people waiting on the platforms,
// escalators up to the pavement, and now and then a train. One line runs under
// the south bank; the other comes down the east side, dives under the river
// and comes up again at London Bridge.
//
// Everything here is flat: paint on the cut face, and trains that are flat
// drawings sliding along just in front of it.

import { RGB, Rng, V2, V3, clamp, hex } from "../engine/math";
import { Sprite } from "../engine/mesh";
import { L_BAR, L_LIGHT, L_MARK, Pen, Plane } from "../engine/pen";
import { person, randomLook } from "./kit";
import { makeSprite } from "./motion";
import { C, SKIN } from "./palette";
import { roundel, tubeSign } from "./street";
import { Mover } from "./types";

const TUNNEL = hex("#3d3944");
const TUNNEL_L = hex("#59545f");
const TILE = hex("#f1ead8");
/** The tunnel's floor and roof, and a station's roof, as heights above the foot of the face. */
const T0 = 0.42;
const T1 = 2.72;
const S1 = 3.3;
/** Platform height, and how long a station is. */
const PLAT = 0.86;
const STATION = 13;
/** One carriage, and how many make a train. */
const CAR = 3.4;
const CARS = 4;
const TRAIN = CAR * CARS;

/** A stretch of cut face with a tunnel in it. */
export interface Face {
  /** World position of the face's a = 0 end at the foot of the slab, and the unit direction a runs in. */
  o: V3;
  dir: V2;
  /** Which way the face looks: "y+" (the front of the south bank) or "x+" (the east side). */
  side: "x+" | "y+";
  len: number;
  /** Where the tunnel shows: from a0 to a1. */
  a0: number;
  a1: number;
  stations: { name: string; at: number; line: RGB }[];
  /** When this stretch of the city has arrived (the paint goes on just after). */
  t: (a: number) => number;
}

/** The same plane, counted as `near` units closer to the camera when it comes to what hides what. */
function nearer(pen: Pen, p: Plane, near: number, layer: number): Plane {
  return new Plane(pen, p.o, p.u, p.v, p.n, true, layer, near, 1);
}

/**
 * The face as a plane to paint on. Everything is painted flat on the face, but
 * in a fixed order from back to front: the clay, the bore, the stations, the
 * people, the trains, and the mouths the trains come out of. `near` puts a
 * layer of paint in that order without moving it.
 */
function wallOf(pen: Pen, f: Face, near: number, layer: number): Plane {
  return nearer(pen, pen.plane([f.o[0], f.o[1], f.o[2]], [f.dir[0], f.dir[1], 0], [0, 0, 1], 0, true), near, layer);
}

/** World position of a point on a face, `out` in front of it. */
function at(f: Face, a: number, b: number, out: number): V3 {
  return [f.o[0] + f.dir[0] * a + (f.side === "x+" ? out : 0), f.o[1] + f.dir[1] * a + (f.side === "y+" ? out : 0), f.o[2] + b];
}

/** The mouth of a tunnel: a round-topped hole. */
function mouth(a: number, flip: boolean): V2[] {
  const pts: V2[] = [];
  const r = (T1 - T0) / 2;
  for (let k = 0; k <= 8; k++) {
    const t = -Math.PI / 2 + (Math.PI * k) / 8;
    pts.push([a + (flip ? -1 : 1) * Math.cos(t) * 0.8, T0 + r + Math.sin(t) * r]);
  }
  return pts;
}

/** Paint a tunnel and its stations on a face, and put the signs up at street level. */
export function tunnel(pen: Pen, rng: Rng, f: Face): void {
  const base = wallOf(pen, f, 0.4, 0);
  const top = wallOf(pen, f, 0.4, 1);
  // the bore, in lengths so it arrives along with the ground above it
  const n = Math.max(2, Math.round((f.a1 - f.a0) / 14));
  for (let k = 0; k < n; k++) {
    const p = f.a0 + ((f.a1 - f.a0) * k) / n;
    const q = f.a0 + ((f.a1 - f.a0) * (k + 1)) / n;
    pen.reveal = () => f.t((p + q) / 2) + 0.35;
    pen.begin();
    // (the bore runs a little past each mouth, under the lip that is drawn over it)
    base.rect(k === 0 ? p - 0.85 : p, T0, k === n - 1 ? q + 0.85 : q, T1, TUNNEL, { grain: 0.8 });
    top.seg(p, T0, q, T0, { w: 0.08 });
    top.seg(p, T1, q, T1, { w: 0.08 });
    // the iron rings that line a tube tunnel, a pair of cables, the rail
    for (let a = p + 0.6; a < q; a += 1.25) top.seg(a, T0 + 0.1, a, T1 - 0.1, { w: 0.045, color: TUNNEL_L, kind: L_MARK, wobble: 0.3, alpha: 0.8 });
    top.seg(p, T1 - 0.3, q, T1 - 0.3, { w: 0.04, color: C.red, kind: L_MARK, wobble: 0.4, alpha: 0.7 });
    top.seg(p, T0 + 0.16, q, T0 + 0.16, { w: 0.06, color: C.metal, kind: L_MARK, wobble: 0 });
    pen.end();
  }
  // stations
  for (const s of f.stations) {
    const a0 = s.at - STATION / 2;
    const a1 = s.at + STATION / 2;
    pen.reveal = () => f.t(s.at) + 0.55;
    pen.begin();
    const st = wallOf(pen, f, 0.5, 0);
    st.rect(a0, T0, a1, S1, TILE, { grain: 0.4, glow: 0.85, outline: true, w: 0.07 });
    const st2 = wallOf(pen, f, 0.5, 1);
    st2.rect(a0, S1 - 0.5, a1, S1 - 0.28, s.line, { grain: 0.3 });
    st2.rect(a0, T0, a1, PLAT, C.grey, { grain: 0.6 });
    st2.seg(a0, PLAT, a1, PLAT, { w: 0.09, color: C.yellow, kind: L_MARK, wobble: 0 });
    for (let a = a0 + 0.5; a < a1; a += 0.5) st2.seg(a, PLAT + 0.1, a, S1 - 0.6, { w: 0.03, color: C.stoneDark, kind: L_MARK, wobble: 0, alpha: 0.5 });
    // the name, on its roundel
    const size = Math.min(0.46, 7.2 / s.name.length);
    const tw = s.name.length * size * 0.92;
    const st3 = wallOf(pen, f, 0.5, 2);
    st3.rect(s.at - tw / 2 - 0.5, 1.72, s.at + tw / 2 + 0.5, 2.5, C.white, { outline: true, w: 0.05, grain: 0.2, glow: 0.9 });
    roundel(st3, s.at - tw / 2 - 1.3, 2.1, 0.44, 1);
    st3.text(s.name, s.at, 2.1 - size / 2, size, { align: "c", color: C.tubeBlue, kind: L_MARK, w: 0.07, wobble: 0.2, layer: 2 });
    // strip lights
    for (let a = a0 + 1; a < a1; a += 2.2) {
      const p = at(f, a, S1 - 0.14, 0.1);
      const q = at(f, a + 1.1, S1 - 0.14, 0.1);
      pen.stroke([p, q], { w: 0.12, kind: L_LIGHT, wobble: 0 });
    }
    // the escalator up to the street, at the far end
    const e0 = a1 - 0.6;
    const e1 = Math.min(f.len - 1.2, a1 + 4.6);
    const h = -f.o[2];
    const shaft: V2[] = [
      [e0, PLAT],
      [e0 + 1.5, PLAT],
      [e1, h - 0.36],
      [e1 - 1.5, h - 0.36],
    ];
    st.poly(shaft, TILE, { outline: true, w: 0.06, grain: 0.4, glow: 0.7 });
    for (let k = 1; k < 9; k++) {
      const u = k / 9;
      st2.seg(e0 + (e1 - 1.5 - e0) * u, PLAT + (h - 0.36 - PLAT) * u, e0 + 1.5 + (e1 - e0 - 1.5) * u, PLAT + (h - 0.36 - PLAT) * u, { w: 0.04, color: C.greyDark, kind: L_MARK, wobble: 0 });
    }
    pen.end();
    // people on the platform and riding up
    pen.reveal = () => f.t(s.at) + 0.8;
    const count = rng.int(5, 9);
    for (let k = 0; k < count; k++) {
      const p = at(f, rng.range(a0 + 0.7, a1 - 1.2), PLAT, 0.35);
      person(pen, p[0], p[1], p[2], randomLook(rng), rng.pick(["stand", "stand", "stand", "wave"]), rng.chance(0.5), 0.62);
    }
    for (const u of [0.3, 0.62]) {
      const p = at(f, e0 + 0.75 + (e1 - e0 - 1.5) * u, PLAT + (h - 0.36 - PLAT) * u, 0.35);
      person(pen, p[0], p[1], p[2], randomLook(rng), "stand", f.side === "y+", 0.62);
    }
    // the sign on the pavement above
    const up = at(f, e1 - 0.4, h, -1.0);
    tubeSign(pen, up[0], up[1], 0, 3.0);
  }
  // the mouths, drawn a little proud of the face so that a train slides out from behind them
  pen.reveal = () => f.t(f.a0) + 0.5;
  const lip = wallOf(pen, f, 2.9, 0);
  for (const [a, flip] of [
    [f.a0, true],
    [f.a1, false],
  ] as const) {
    pen.begin();
    const w = 5.2;
    // a patch of clay with the mouth bitten out of the side that faces the tunnel
    const cover: V2[] = flip
      ? [[a - w, T0 - 0.25], [a, T0 - 0.25], ...mouth(a, true), [a, T1 + 0.25], [a - w, T1 + 0.25]]
      : [[a + w, T1 + 0.25], [a, T1 + 0.25], ...mouth(a, false).reverse(), [a, T0 - 0.25], [a + w, T0 - 0.25]];
    lip.poly(cover, C.clay, { grain: 0.9 });
    lip.line(mouth(a, flip), { w: 0.14, color: C.clayDark, kind: L_MARK, wobble: 0.3 });
    lip.ticks(Math.min(a, a + (flip ? -w : w)) + 0.2, T0, Math.max(a, a + (flip ? -w : w)) - 0.9, T1, { n: 14, len: 0.3, ang: 0, jit: 0.4, color: C.clayDark, w: 0.07, alpha: 0.7 });
    pen.end();
  }
}

/** A few things the builders of the Tube dug past. */
export function buried(pen: Pen, f: Face, a: number, what: "ammonite" | "amphora" | "bones" | "chest" | "boot"): void {
  const p = wallOf(pen, f, 0.3, 0);
  pen.reveal = () => f.t(a) + 0.7;
  pen.begin();
  const b = 3.36;
  if (what === "ammonite") {
    p.circle(a, b, 0.36, C.clayLight, { outline: true, w: 0.05, seg: 12, grain: 0.5 });
    const pts: V2[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * Math.PI * 3.4;
      pts.push([a + Math.cos(t) * 0.3 * (1 - k / 18), b + Math.sin(t) * 0.3 * (1 - k / 18)]);
    }
    p.line(pts, { w: 0.045, color: C.clayDark, kind: L_MARK, wobble: 0, layer: 1 });
  } else if (what === "amphora") {
    p.ellipse(a, b, 0.2, 0.36, C.tile, { outline: true, w: 0.05, seg: 10, grain: 0.5 });
    p.rect(a - 0.08, b + 0.3, a + 0.08, b + 0.5, C.tile, { outline: true, w: 0.04, layer: 1 });
    for (const s of [-1, 1]) p.arc(a + s * 0.18, b + 0.28, 0.12, 0.14, 0, Math.PI * 2, { w: 0.04, layer: 1, seg: 8 });
  } else if (what === "bones") {
    for (const [dx, dy, rot] of [
      [0, 0, 0.3],
      [0.5, 0.12, -0.5],
      [-0.42, 0.16, 1.1],
    ]) {
      const cx = Math.cos(rot) * 0.26;
      const sy = Math.sin(rot) * 0.26;
      p.seg(a + dx - cx, b + dy - sy, a + dx + cx, b + dy + sy, { w: 0.1, color: C.white, kind: L_BAR, wobble: 0, layer: 1 });
      for (const e of [-1, 1]) p.circle(a + dx + e * cx, b + dy + e * sy, 0.08, C.white, { layer: 1, seg: 6, grain: 0 });
    }
  } else if (what === "chest") {
    p.rect(a - 0.34, b - 0.22, a + 0.34, b + 0.14, C.woodDark, { outline: true, w: 0.05, grain: 0.5 });
    p.ellipse(a, b + 0.14, 0.34, 0.2, C.wood, { outline: true, w: 0.05, a0: 0, a1: Math.PI, seg: 8, layer: 1 });
    for (const dx of [-0.16, 0, 0.16]) p.circle(a + dx, b + 0.18, 0.06, C.gold, { layer: 2, seg: 6, grain: 0, glow: 0.6 });
  } else {
    p.poly(
      [
        [a - 0.3, b - 0.2],
        [a + 0.34, b - 0.2],
        [a + 0.34, b - 0.02],
        [a - 0.02, b + 0.02],
        [a - 0.04, b + 0.36],
        [a - 0.3, b + 0.36],
      ],
      C.brickBrown,
      { outline: true, w: 0.05, grain: 0.5 },
    );
  }
  pen.end();
}

/** One carriage of a Tube train, drawn flat: white over blue with red doors. `nose` is +1 or -1 for an end car facing that way, 0 for a middle one. */
function carriage(p: Plane, rng: Rng, nose: number): void {
  const h = 1.78;
  const x0 = -CAR / 2 + 0.05;
  const x1 = CAR / 2 - 0.05;
  const body: V2[] =
    nose > 0
      ? [
          [x0, 0],
          [x1, 0],
          [x1, h * 0.55],
          [x1 - 0.32, h],
          [x0, h],
        ]
      : nose < 0
        ? [
            [x0, 0],
            [x1, 0],
            [x1, h],
            [x0 + 0.32, h],
            [x0, h * 0.55],
          ]
        : [
            [x0, 0],
            [x1, 0],
            [x1, h],
            [x0, h],
          ];
  p.poly(body, C.white, { outline: true, w: 0.07, grain: 0.3, glow: 0.2 });
  p.rect(x0 + 0.04, 0.04, x1 - 0.04, 0.46, C.tubeBlue, { layer: 1, grain: 0.3 });
  p.rect(x0 + 0.04, h - 0.2, x1 - 0.36 * Math.abs(nose), h - 0.06, hex("#c9ced3"), { layer: 1, grain: 0.3 });
  for (const d of [-0.78, 0.78]) {
    p.rect(d - 0.3, 0.1, d + 0.3, h - 0.3, C.busRed, { outline: true, w: 0.04, layer: 2, grain: 0.3 });
    p.rect(d - 0.2, 0.78, d + 0.2, h - 0.44, C.glassLight, { layer: 3, grain: 0.2, glow: 0.9 });
    p.seg(d, 0.1, d, h - 0.3, { w: 0.03, wobble: 0, layer: 4 });
  }
  for (const [w0, w1] of [
    [-0.4, 0.4],
    [-CAR / 2 + 0.22, -1.16],
    [1.16, CAR / 2 - 0.22],
  ]) {
    if ((nose > 0 && w1 > 1.3) || (nose < 0 && w0 < -1.3)) continue;
    p.rect(w0, 0.78, w1, h - 0.44, C.glassLight, { outline: true, w: 0.035, layer: 2, grain: 0.2, glow: 0.9 });
    // somebody's head in the window
    for (let a = w0 + 0.16; a < w1 - 0.1; a += 0.3) {
      if (rng.chance(0.45)) continue;
      p.circle(a, 0.98, 0.1, rng.pick(SKIN), { layer: 3, seg: 6, grain: 0 });
    }
  }
  if (nose !== 0) {
    // the driver's window and the headlamp
    const e = nose > 0 ? x1 : x0;
    p.rect(e - (nose > 0 ? 0.62 : -0.2), 0.86, e - (nose > 0 ? 0.2 : -0.62), h - 0.5, C.glass, { outline: true, w: 0.035, layer: 2, grain: 0.3, glow: 0.5 });
    p.circle(e - nose * 0.16, 0.3, 0.09, C.lamp, { layer: 3, seg: 6, grain: 0, glow: 1 });
    p.rect(e - (nose > 0 ? 0.3 : -0.04), 0.04, e - (nose > 0 ? 0.04 : -0.3), 0.6, C.busRed, { layer: 2, grain: 0.3 });
  }
}

/** A train's carriages as sprites for one face: [head, middle, tail] for a train whose head is towards +a (dir = 1) or -a. */
function carSprites(side: "x+" | "y+", dir: number): Sprite[] {
  const mk = (nose: number, seed: number) =>
    makeSprite(
      (pen) => {
        const p = side === "y+" ? pen.plane([0, 0, 0], [1, 0, 0], [0, 0, 1], 0, true) : pen.plane([0, 0, 0], [0, -1, 0], [0, 0, 1], 0, true);
        // In front of the people on the platforms, behind the mouths of the tunnel. (A figure is a card turned
        // to the camera, so its two sides are at different depths: the gap has to be wider than a figure.)
        carriage(nearer(pen, p, 2.4, 0), new Rng(seed), nose);
      },
      0,
      seed,
    );
  return [mk(dir, 11), mk(0, 12), mk(0, 13), mk(-dir, 14)];
}

/** One leg of a line: a face, and the stretch of the line's own length that shows on it. */
export interface Leg {
  face: Face;
  /** Distance along the line at which the face's a0 (dir > 0) or a1 (dir < 0) mouth lies. */
  from: number;
  /** +1 if trains run towards greater a on this face, -1 if towards lesser. */
  dir: number;
}

const DWELL = 2.3;
const SPEED = 8.5;

/**
 * A train service: trains set off every `period` seconds, call at every
 * station (easing in and out), and run on out of sight. `legs` are the
 * stretches of the line that can be seen, in order.
 */
export function service(movers: Mover[], legs: Leg[], born: number, period: number, phase: number): void {
  // where the train's middle has to be for each stop, as distances along the line
  const stops: number[] = [];
  let end = 0;
  for (const l of legs) {
    const span = l.face.a1 - l.face.a0;
    for (const s of l.face.stations) stops.push(l.from + (l.dir > 0 ? s.at - l.face.a0 : l.face.a1 - s.at));
    end = Math.max(end, l.from + span);
  }
  stops.sort((a, b) => a - b);
  // a timetable: [time, distance] knots, eased between
  const start = -TRAIN / 2 - 3;
  const knots: [number, number][] = [[0, start]];
  let t = 0;
  let u = start;
  for (const s of [...stops, end + TRAIN / 2 + 3]) {
    t += Math.max(1.2, (s - u) / SPEED + 0.9);
    knots.push([t, s]);
    u = s;
    if (s < end) {
      t += DWELL;
      knots.push([t, s]);
    }
  }
  const run = t;
  const where = (tau: number): number | null => {
    if (tau < 0 || tau > run) return null;
    for (let k = 0; k + 1 < knots.length; k++) {
      if (tau <= knots[k + 1][0]) {
        const f = clamp((tau - knots[k][0]) / Math.max(1e-6, knots[k + 1][0] - knots[k][0]), 0, 1);
        const e = f * f * (3 - 2 * f);
        return knots[k][1] + (knots[k + 1][1] - knots[k][1]) * e;
      }
    }
    return null;
  };
  const sprites = legs.map((l) => carSprites(l.face.side, l.dir));
  movers.push((m) => {
    if (m.t < born) return;
    // more than one train can be on the line at once
    const n = Math.ceil(run / period);
    for (let q = 0; q < n; q++) {
      const tau = ((((m.t - phase) % period) + period) % period) + q * period;
      const mid = where(tau);
      if (mid == null) continue;
      for (let i = 0; i < CARS; i++) {
        const d = mid + TRAIN / 2 - (i + 0.5) * CAR;
        for (let k = 0; k < legs.length; k++) {
          const l = legs[k];
          const along = d - l.from;
          const span = l.face.a1 - l.face.a0;
          if (along < -CAR || along > span + CAR) continue;
          const a = l.dir > 0 ? l.face.a0 + along : l.face.a1 - along;
          const p = at(l.face, a, T0 + 0.2, 0);
          if (!m.sees(p[0], p[1], p[2], 8)) continue;
          m.put(sprites[k][i === 0 ? 0 : i === CARS - 1 ? 3 : i], p[0], p[1], p[2], born);
        }
      }
    }
  });
}

export const LINE_GREY: RGB = hex("#8f979f");
export const LINE_BLACK: RGB = hex("#3a3a3f");
