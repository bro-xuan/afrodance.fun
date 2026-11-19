// Wannsee: where Berlin goes when it is hot. A bay of the Havel with the
// longest inland beach in Europe curving round it, rows of hooded wicker
// chairs, the long yellow bath house from 1930, a pontoon to dive from,
// dinghies racing round two buoys and the BVG's ferry plodding across. Behind,
// the pines of the Grunewald and, on the hill the city piled up out of its own
// rubble, the white domes of the listening station on the Teufelsberg.
//
// A place off the grid: a 40 x 40 frame standing on the bare paper, so it
// lays its own ground. The whole place is a disc; the bay is a bite out of
// its lower right (the lake fills the front and right of the frame), the land
// wraps round the back and left. The beach slopes from the land (TOP above
// the paper) into the water.

import { RGB, Rng, V2, V3 } from "../../engine/math";
import { F_WATER, L_BAR, L_LIGHT, L_MARK, L_RIPPLE, L_SPARK, Pen, Plane } from "../../engine/pen";
import { flagOf, queue, tags } from "../berlin";
import { hullShape } from "../boats";
import { W_FINE, W_THIN, Look, flag, lamp, person, railing, randomLook, tree } from "../kit";
import { Route, Turning, makeSprite, traveler } from "../motion";
import { C, SKIN } from "../palette";
import { BlockBuilder } from "../types";

const TOP = 0.8;
const LAKE = 0.08;
const EARTH: RGB = [201, 178, 140];
const WET: RGB = [224, 204, 160];
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- the lie of the land

/** The middle of the whole place, and how far it reaches by direction. */
const FX = 20;
const FY = 20;
const edgeR = (th: number) => 21 + 0.8 * Math.sin(3 * th + 1.9) + 0.5 * Math.sin(5 * th + 0.4);
const inPlace = (x: number, y: number, pad = 0) => Math.hypot(x - FX, y - FY) < edgeR(Math.atan2(y - FY, x - FX)) - pad;

/**
 * The bay is part of a big circle whose centre is out in the lake, to the
 * lower right: the shore is its near side. The beach is the band just behind
 * the shore.
 */
const BX = 45;
const BY = 24.7;
const RHO = 26;
const DEPTH = 5.8;
const SLOPE = (TOP - LAKE - 0.03) / DEPTH;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A point by its angle round the bay (0 the middle of the beach, positive towards the lower left of the page) and its distance from the bay's centre. */
const bay = (a: number, r: number): V2 => [BX - r * Math.cos(a), BY + r * Math.sin(a)];
/** A point by d (out into the lake from the middle of the waterline; negative is inland) and s (along the shore, positive to the lower left). */
const ds = (d: number, s: number): V2 => [BX - RHO + d, BY + s];

/** How far round the bay the shore runs before it meets the edge of the place: its two horns. */
function horn(sign: number): number {
  let lo = 15 * DEG;
  let hi = 85 * DEG;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    const p = bay(sign * mid, RHO);
    if (inPlace(p[0], p[1])) lo = mid;
    else hi = mid;
  }
  return lo;
}
const HORN_L = horn(1);
const HORN_R = horn(-1);
/** The beach's depth at a place along the bay: full in the middle, nothing at the horns. */
const depthAt = (a: number) => DEPTH * clamp01(((a > 0 ? HORN_L : HORN_R) - Math.abs(a)) / (6 * DEG));
/** Height of the sand, t units up the beach from the water's edge. */
const sandZ = (t: number) => LAKE + 0.03 + SLOPE * t;
/** A place on the beach: s units along the shore from its middle, t units up from the water. Returns x, y and the sand's height there. */
const beach = (s: number, t: number): V3 => {
  const p = bay(s / RHO, RHO + t);
  return [p[0], p[1], sandZ(t)];
};
/** The way to turn something on the beach so that its front (its local +y) faces the water. */
const facing = (p: V3 | V2) => Math.atan2(BY - p[1], BX - p[0]) / DEG - 90;

const inLake = (x: number, y: number, pad = 0) => inPlace(x, y, pad) && Math.hypot(x - BX, y - BY) < RHO - pad;
/** On the high ground, behind the beach. */
function onHigh(x: number, y: number, pad = 0): boolean {
  if (!inPlace(x, y, pad)) return false;
  const a = Math.atan2(y - BY, BX - x);
  const within = a < HORN_L && a > -HORN_R;
  return Math.hypot(x - BX, y - BY) > RHO + (within ? depthAt(a) : 0) + pad;
}

// The hill, at the back; the bath house, between the wood and the beach.
const HILL: V2 = [9.5, 9.5];
const HILL_H = 7;
const BATH_L = 17;
const BATH_W = 3.6;
const BATH_H = 3.4;
/** The bath house's own frame: x along its front (towards the upper right of the page), y towards the water. */
const BATH_O = ds(-10.9, BATH_L / 2);

// What is in the water.
const BUOYS = RHO - 5.4;
/** Half the length of the bathing place, along the shore. */
const BATHING = 9.1;
const PONTOON = bay(1.5 * DEG, RHO - 3.3);
/** The ferry's lane: from a stage by the right horn to one by the left, clear of the swimmers. */
const FERRY_A: V2 = [29.4, 4.6];
const FERRY_B: V2 = [25.3, 37.2];
/** The dinghies' course: round two buoys, out in the lake. */
const COURSE: V2 = [34.6, 23.5];

// ---------------------------------------------------------------- small things

/** A Strandkorb: the hooded wicker seat for two that every German beach is covered in. It faces local +y. */
function strandkorb(pen: Pen, rng: Rng, stripe: RGB, taken: number): void {
  const wicker: RGB = [216, 186, 134];
  pen.begin();
  pen.box(-0.68, -0.45, 0, 1.36, 0.92, 0.45, wicker, { w: W_FINE });
  pen.box(-0.68, -0.45, 0.45, 1.36, 0.3, 1.2, wicker, { w: W_FINE });
  for (const x of [-0.68, 0.58]) pen.box(x, -0.15, 0.45, 0.1, 0.5, 1.0, wicker, { w: W_FINE });
  pen.box(-0.7, -0.47, 1.55, 1.4, 0.9, 0.13, wicker, { w: W_FINE });
  // the lining, striped; the cushion
  const f = pen.wall("y+", -0.58, -0.45, 0.45, 1.16, 0.3);
  for (let k = 0; k < 5; k++) f.rect(k * 0.232, 0, (k + 1) * 0.232, 1.1, k % 2 ? C.white : stripe, { grain: 0.5 });
  pen.floor(0.46, 1).rect(-0.58, -0.15, 0.58, 0.46, stripe, { grain: 0.5 });
  if (taken > 0) person(pen, taken > 1 ? -0.28 : 0, 0.12, 0.3, randomLook(rng), "bust", false);
  if (taken > 1) person(pen, 0.3, 0.12, 0.3, randomLook(rng), "bust", true);
  pen.end();
}

/** A beach umbrella. */
function parasol(pen: Pen, x: number, y: number, z: number, a: RGB): void {
  pen.begin();
  pen.pole([x, y, z], [x, y, z + 2.1], 0.08, C.white);
  pen.cone(x, y, z + 1.75, 1.25, 0.5, a, { seg: 8, crease: 0.5 });
  pen.end();
}

/** A sandcastle with a paper flag. */
function castle(pen: Pen, x: number, y: number, z: number): void {
  pen.begin();
  pen.cyl(x, y, z, 0.42, 0.28, WET, { seg: 8, r2: 0.34 });
  pen.cone(x, y, z + 0.28, 0.26, 0.34, WET, { seg: 6 });
  pen.pole([x, y, z + 0.6], [x, y, z + 0.95], 0.04, C.woodDark, { ink: false });
  pen.card(x, y, z + 0.78).rect(0, 0, 0.26, 0.17, C.red, { grain: 0.3, layer: 1 });
  pen.end();
}

/** A birch: a lime-green crown on a white stem. */
function birch(pen: Pen, rng: Rng, x: number, y: number, z = 0): void {
  const h = rng.range(2.2, 2.9);
  tree(pen, rng, x, y, { kind: "round", h, r: rng.range(1.0, 1.3), color: C.leaf3, z });
  pen.pole([x, y, z], [x, y, z + h + 0.2], 0.24, C.white, { bias: 0.04 });
  const cd = pen.card(x, y, z);
  for (const b of [0.5, 1.2, 1.9]) cd.seg(-0.1, b, 0.06, b + 0.05, { w: 0.07, color: C.charcoal, kind: L_MARK, wobble: 0, layer: 2 });
}

/** A racing dinghy: white hull, a tall mainsail and a jib. Bow along +x. */
function sailBoat(pen: Pen, rng: Rng, sail: RGB, stripe: RGB | null): void {
  pen.begin();
  pen.extrude(hullShape(3.6, 1.4, 0.38), -0.06, 0.42, C.white, { top: C.wood, crease: 28, w: 0.1 });
  person(pen, -1.0, 0.25, 0.18, randomLook(rng), "bust", false);
  person(pen, -0.25, -0.2, 0.18, randomLook(rng), "bust", true);
  pen.pole([0.45, 0, 0.42], [0.45, 0, 4.7], 0.08, C.woodDark);
  // the boom is let out a little, so the sail shows from most sides
  const main = pen.plane([0.4, 0, 0.95], [-0.94, 0.34, 0], [0, 0, 1], 0, true);
  main.poly(
    [
      [0, 0],
      [2.05, 0.05],
      [0, 3.65],
    ],
    sail,
    { outline: true, w: W_FINE, grain: 0.4 },
  );
  if (stripe) {
    main.poly(
      [
        [0, 1.15],
        [1.41, 1.18],
        [1.03, 1.85],
        [0, 1.83],
      ],
      stripe,
      { layer: 1, grain: 0.4 },
    );
  }
  const jib = pen.plane([0.5, 0, 0.75], [0.97, -0.24, 0], [0, 0, 1], 0, true);
  jib.poly(
    [
      [0.05, 0.1],
      [1.2, 0],
      [0.05, 3.2],
    ],
    C.white,
    { outline: true, w: W_FINE, grain: 0.4 },
  );
  for (const s of [-1, 1]) {
    pen.stroke(
      [
        [-1.7, s * 0.4, 0.03],
        [-2.9, s * 0.75, 0.03],
      ],
      { w: 0.1, color: C.white, kind: L_RIPPLE, wobble: 0.6, alpha: 0.9 },
    );
  }
  pen.end();
}

/** The BVG's lake ferry: white, a yellow band, a saloon amidships and an open deck at each end. It lies along +x. */
function ferry(pen: Pen, rng: Rng): void {
  const hull: V2[] = [
    [-3.2, 0],
    [-2.5, -1.25],
    [2.5, -1.25],
    [3.2, 0],
    [2.5, 1.25],
    [-2.5, 1.25],
  ];
  pen.begin();
  pen.extrude(hull, -0.1, 0.55, C.white, { top: C.cream, crease: 28, w: 0.11 });
  pen.extrude(
    hull.map((p) => [p[0] * 1.01, p[1] * 1.02] as V2),
    0.28,
    0.45,
    C.bvg,
    { crease: 28, w: W_THIN },
  );
  pen.box(-1.7, -0.9, 0.55, 3.4, 1.8, 1.2, C.white, { top: C.zinc, w: W_THIN });
  for (const side of ["x+", "x-", "y+", "y-"] as const) {
    const f = pen.wall(side, -1.7, -0.9, 0.55, 3.4, 1.8);
    if (!f.visible) continue;
    const w = side.startsWith("y") ? 3.4 : 1.8;
    f.rect(0.2, 0.45, w - 0.2, 1.0, C.glass, { outline: true, w: W_FINE, glow: 0.85, layer: 1 });
    for (let a = 0.75; a < w - 0.3; a += 0.62) f.seg(a, 0.45, a, 1.0, { w: 0.05, color: C.white, kind: L_MARK, wobble: 0, layer: 2 });
    f.rect(0, 0, w, 0.22, C.bvg, { grain: 0.4 });
  }
  pen.box(-0.55, -0.5, 1.75, 1.1, 1.0, 0.62, C.white, { top: C.bvg, w: W_FINE });
  pen.pole([0, 0, 2.37], [0, 0, 3.3], 0.06, C.white, { ink: false });
  for (const x of [-2.35, 2.35]) {
    person(pen, x, 0.45, 0.42, randomLook(rng), "bust", x > 0);
    if (rng.chance(0.7)) person(pen, x, -0.45, 0.42, randomLook(rng), "bust", x < 0);
  }
  pen.end();
}

/** A pedal boat for two. */
function pedalo(pen: Pen, rng: Rng): void {
  pen.begin();
  pen.extrude(hullShape(2.7, 1.5, 0.28), -0.05, 0.4, C.yellow, { top: C.white, crease: 28, w: 0.1 });
  person(pen, -0.2, 0.33, 0.2, randomLook(rng), "bust", false);
  person(pen, -0.2, -0.33, 0.2, randomLook(rng), "bust", true);
  pen.end();
}

/** An inflatable flamingo to float about on, with somebody in it. */
function flamingo(pen: Pen, rng: Rng, x: number, y: number, flip: boolean): void {
  const pink: RGB = [244, 150, 180];
  const cd = pen.card(x, y, LAKE, flip);
  const neck: V2[] = [
    [0.7, 0.3],
    [1.0, 0.8],
    [0.82, 1.2],
    [1.05, 1.45],
  ];
  pen.begin();
  cd.ellipse(0, 0.2, 0.95, 0.34, pink, { outline: true, w: W_FINE, seg: 12 });
  cd.line(neck, { w: 0.26, color: C.ink, kind: L_BAR, wobble: 0 });
  cd.line(neck, { w: 0.17, color: pink, kind: L_BAR, wobble: 0, bias: 0.012 });
  cd.seg(1.1, 1.44, 1.3, 1.32, { w: 0.11, color: C.black, kind: L_MARK, wobble: 0, layer: 1 });
  pen.end();
  person(pen, x, y, LAKE - 0.2, randomLook(rng), "bust", flip);
}

function gull(pen: Pen, up: boolean, flip: boolean): void {
  const cd = pen.card(0, 0, 0, flip);
  const y = up ? 0.42 : -0.12;
  cd.bar(-0.95, y, -0.32, 0.1, 0.14, C.white);
  cd.bar(0.95, y, 0.32, 0.1, 0.14, C.white);
  cd.ellipse(0, 0, 0.36, 0.17, C.white, { outline: true, w: W_FINE, seg: 8, layer: 1 });
  cd.rect(0.3, -0.04, 0.5, 0.05, C.yellow, { layer: 2, grain: 0 });
}

/** A geodesic dome: a faceted white ball, with a few of its panels gone. */
function radome(pen: Pen, rng: Rng, x: number, y: number, z: number, r: number, torn: number): void {
  pen.begin();
  // the lower part of the ball, widening from its neck, then the cap
  pen.cyl(x, y, z, r * 0.62, r * 0.42, C.white, { seg: 12, r2: r * 0.94, crease: 12, w: 0.05, glow: 0.14 });
  pen.cyl(x, y, z + r * 0.42, r * 0.94, r * 0.3, C.white, { seg: 12, r2: r, crease: 12, w: 0.05, glow: 0.14 });
  pen.dome(x, y, z + r * 0.72, r, r * 1.02, C.white, { seg: 12, rings: 4, crease: 12, w: 0.05, glow: 0.14 });
  const cd = pen.card(x, y, z + r * 0.9);
  for (let k = 0; k < torn; k++) {
    const a = rng.range(-0.75, 0.75) * r;
    const b = rng.range(-0.5, 0.6) * r;
    const s = rng.range(0.16, 0.26) * r;
    cd.poly(
      [
        [a, b],
        [a + s * 1.3, b + s * 0.3],
        [a + s * 0.5, b + s * 1.2],
      ],
      [92, 96, 104],
      { outline: true, w: W_FINE, bias: r * 1.9, grain: 0.5 },
    );
  }
  pen.end();
}

/** A ring in the water, spreading. */
function ringAt(g: Plane, x: number, y: number, r: number, alpha: number): void {
  const pts: V2[] = [];
  for (let k = 0; k < 12; k++) pts.push([x + Math.cos((k / 12) * Math.PI * 2) * r, y + Math.sin((k / 12) * Math.PI * 2) * r]);
  g.line(pts, { closed: true, color: C.white, w: 0.09, alpha, kind: L_MARK, wobble: 0 });
}

/** A short pier: planks on posts, from a to b. */
function pier(pen: Pen, a: V2, b: V2, z: number): void {
  pen.begin();
  pen.stroke(
    [
      [a[0], a[1], z],
      [b[0], b[1], z],
    ],
    { w: 1.25, color: C.woodDark, kind: L_BAR, wobble: 0 },
  );
  pen.stroke(
    [
      [a[0], a[1], z],
      [b[0], b[1], z],
    ],
    { w: 1.05, color: C.wood, kind: L_BAR, wobble: 0, bias: 0.012 },
  );
  pen.pole([b[0], b[1], LAKE - 0.1], [b[0], b[1], z + 0.4], 0.16, C.woodDark);
  pen.end();
}

// ---------------------------------------------------------------- the place

export const wannsee: BlockBuilder = (c) => {
  const { pen, rng } = c;
  c.focus(16.2, 16.2, 1.22);

  // ---- the ground: the lake, the high land behind the beach, and the beach sloping between them
  const hornL = bay(HORN_L, RHO);
  const hornR = bay(-HORN_R, RHO);
  const thL = Math.atan2(hornL[1] - FY, hornL[0] - FX);
  const thR = Math.atan2(hornR[1] - FY, hornR[0] - FX);
  // the lake: round the edge of the place from the right horn to the left, and back under the sand
  const lake: V2[] = [];
  for (let k = 0; k <= 40; k++) {
    const th = thR + ((thL - thR) * k) / 40;
    lake.push([FX + Math.cos(th) * edgeR(th), FY + Math.sin(th) * edgeR(th)]);
  }
  const rim = lake.length;
  for (let k = 0; k <= 16; k++) {
    const a = HORN_L - 3 * DEG - ((HORN_L + HORN_R - 6 * DEG) * k) / 16;
    lake.push(bay(a, RHO + 1.1));
  }
  // the high ground: along the back of the beach from horn to horn, then round the back of the place
  const high: V2[] = [];
  const steps = 48;
  for (let k = 0; k <= steps; k++) {
    const a = -HORN_R + ((HORN_L + HORN_R) * k) / steps;
    high.push(bay(a, RHO + depthAt(a)));
  }
  {
    let t1 = thR;
    while (t1 < thL) t1 += Math.PI * 2;
    const n = 44;
    for (let k = 1; k < n; k++) {
      const th = thL + ((t1 - thL) * k) / n;
      high.push([FX + Math.cos(th) * edgeR(th), FY + Math.sin(th) * edgeR(th)]);
    }
  }

  c.early(() => {
    pen.floor(LAKE, 0).poly(lake, C.water, { kind: F_WATER });
    const edge: V3[] = lake.slice(0, rim).map((p) => [p[0], p[1], LAKE] as V3);
    for (let k = 0; k + 1 < edge.length; k += 9) pen.stroke(edge.slice(k, Math.min(edge.length, k + 10)), { w: 0.16, color: C.waterDeep, kind: L_MARK, wobble: 1.5, alpha: 0.75 });
    // the shallows, paler, along the beach
    const shallow: V2[] = [];
    const a0 = -HORN_R + 4 * DEG;
    const a1 = HORN_L - 4 * DEG;
    for (let k = 0; k <= 30; k++) shallow.push(bay(a0 + ((a1 - a0) * k) / 30, RHO - 0.3));
    for (let k = 30; k >= 0; k--) shallow.push(bay(a0 + ((a1 - a0) * k) / 30, RHO - 2.6));
    pen.floor(LAKE, 1).poly(shallow, [178, 222, 236], { kind: F_WATER, grain: 0.6 });
    pen.floor(LAKE, 2).ticks(17, 0, 43, 42, {
      n: 330,
      len: 1.5,
      ang: -Math.PI / 4,
      jit: 0.08,
      bend: 0.22,
      color: C.waterInk,
      w: 0.075,
      kind: L_RIPPLE,
      alpha: 0.75,
      inside: (a, b) => inLake(a, b, 0.7),
    });
    pen.extrude(high, 0, TOP, EARTH, { top: C.grass, w: W_THIN });
    // the beach, in strips from horn to horn, running down into the water
    pen.begin();
    for (let k = 0; k < steps; k++) {
      const p = -HORN_R + ((HORN_L + HORN_R) * k) / steps;
      const q = -HORN_R + ((HORN_L + HORN_R) * (k + 1)) / steps;
      const wp = depthAt(p);
      const wq = depthAt(q);
      const lowP = bay(p, RHO - 0.7);
      const lowQ = bay(q, RHO - 0.7);
      const midP = bay(p, RHO + Math.min(0.8, wp));
      const midQ = bay(q, RHO + Math.min(0.8, wq));
      const topP = bay(p, RHO + wp);
      const topQ = bay(q, RHO + wq);
      pen.fill(
        [
          [lowP[0], lowP[1], sandZ(-0.7)],
          [lowQ[0], lowQ[1], sandZ(-0.7)],
          [midQ[0], midQ[1], sandZ(Math.min(0.8, wq))],
          [midP[0], midP[1], sandZ(Math.min(0.8, wp))],
        ],
        WET,
        { grain: 0.9 },
      );
      pen.fill(
        [
          [midP[0], midP[1], sandZ(Math.min(0.8, wp))],
          [midQ[0], midQ[1], sandZ(Math.min(0.8, wq))],
          [topQ[0], topQ[1], sandZ(wq)],
          [topP[0], topP[1], sandZ(wp)],
        ],
        C.sand,
        { grain: 0.9 },
      );
    }
    pen.end();
    // footprints and shells
    pen.begin();
    for (let k = 0; k < 130; k++) {
      const a = rng.range(-HORN_R + 0.06, HORN_L - 0.06);
      const t = rng.range(0.3, Math.max(0.4, depthAt(a) - 0.3));
      const p = bay(a, RHO + t);
      pen.stroke(
        [
          [p[0], p[1], sandZ(t) + 0.01],
          [p[0] + 0.16, p[1] + 0.05, sandZ(t) + 0.01],
        ],
        { w: 0.06, color: [208, 186, 140], kind: L_MARK, wobble: 0 },
      );
    }
    pen.end();
    pen.floor(TOP, 2).ticks(-2, -2, 30, 42, { n: 330, len: 0.5, ang: 1.2, jit: 0.5, color: C.grassDark, w: 0.06, inside: (a, b) => onHigh(a, b, 0.7) });
    // the path through the wood, behind the bath house
    pen.floor(TOP, 1).line([ds(-12.3, -7.4), ds(-12.0, -3), ds(-12.0, 3), ds(-12.5, 7.5), ds(-11.9, 10.2)], { w: 1.2, color: C.path, kind: L_MARK, wobble: 0.5, layer: 1 });
  });

  // everything from here stands on the high ground, until the beach
  pen.push(0, 0, TOP);

  // ---- the Teufelsberg: a hill in four steps, pines on each, and the listening station on top
  const [hx, hy] = HILL;
  const levels: [number, number][] = [
    [6.0, 2.0],
    [4.9, 4.0],
    [3.9, 5.6],
    [3.0, HILL_H],
  ];
  let base = 0;
  levels.forEach(([r, top], i) => {
    const ring: V2[] = [];
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      const rr = r * (1 + 0.06 * Math.sin(3 * t + i * 1.7) + 0.04 * Math.sin(5 * t + i));
      ring.push([hx + Math.cos(t) * rr, hy + Math.sin(t) * rr]);
    }
    const from = base;
    pen.obj(() => pen.extrude(ring, from, top, [140, 190, 110], { top: i === levels.length - 1 ? C.grassLight : C.grass, w: W_THIN }), i * 0.1);
    // pines round the rim of each step
    if (i < levels.length - 1) {
      const n = 9 - i * 2;
      for (let k = 0; k < n; k++) {
        const t = (k / n) * Math.PI * 2 + i * 0.5 + rng.range(-0.15, 0.15);
        const rr = (r + levels[i + 1][0]) / 2;
        if (rng.chance(0.2)) birch(pen, rng, hx + Math.cos(t) * rr, hy + Math.sin(t) * rr, top);
        else tree(pen, rng, hx + Math.cos(t) * rr, hy + Math.sin(t) * rr, { kind: "tall", z: top, h: rng.range(1.0, 1.5), r: rng.range(1.1, 1.4) });
      }
    }
    base = top;
  });
  const Z = HILL_H;
  const pale: RGB = [224, 220, 208];
  pen.obj(() => {
    pen.box(hx - 2.5, hy - 1.5, Z, 5.0, 3.0, 1.9, pale, { top: C.concreteDark });
    const f = pen.wall("y+", hx - 2.5, hy - 1.5, Z, 5.0, 3.0);
    for (let a = 0.4; a < 4.4; a += 1.1) f.rect(a, 0.9, a + 0.7, 1.5, [84, 90, 100], { outline: true, w: W_FINE, layer: 1 });
    tags(f, rng, 0.1, 4.9, 0.1, 0.9, 5);
    const g = pen.wall("x+", hx - 2.5, hy - 1.5, Z, 5.0, 3.0);
    g.rect(1.0, 0, 1.9, 1.5, [84, 90, 100], { outline: true, w: W_FINE, layer: 1 });
    tags(g, rng, 0.1, 2.9, 0.1, 1.3, 3);
  }, 0.42);
  pen.obj(() => pen.cyl(hx + 0.2, hy - 0.5, Z + 1.9, 0.95, 7.0, pale, { seg: 10 }), 0.52);
  pen.obj(() => {
    const f = pen.wall("y+", hx + 0.2 - 0.95, hy - 0.5 - 0.4, Z + 1.9, 1.9, 1.36);
    for (const b of [1.4, 3.2, 5.0]) f.rect(0.6, b, 1.3, b + 0.7, [84, 90, 100], { outline: true, w: W_FINE });
    tags(f, rng, 0.2, 1.7, 0.2, 1.2, 2);
  }, 0.55);
  radome(pen, rng, hx - 1.45, hy + 0.45, Z + 1.9, 1.2, 2);
  radome(pen, rng, hx + 1.55, hy + 0.7, Z + 1.9, 1.0, 1);
  radome(pen, rng, hx + 0.2, hy - 0.5, Z + 8.9, 2.4, 4);
  // people who climbed up for the view
  person(pen, hx - 1.9, hy + 2.3, Z, randomLook(rng), "stand", false);
  person(pen, hx - 1.0, hy + 2.5, Z, randomLook(rng), "wave", true);
  person(pen, hx + 2.3, hy + 2.2, Z, randomLook(rng), "sit", true);

  // ---- the wood: pines and birches over everything that is not beach, hill or bath house
  const taken: V2[] = [];
  let planted = 0;
  for (let tries = 0; tries < 1400 && planted < 52; tries++) {
    const x = rng.range(-2, 33);
    const y = rng.range(-2, 42);
    if (!onHigh(x, y, 1.4) || Math.hypot(x - hx, y - hy) < 6.8) continue;
    // not on the bath house, its terrace, the kiosk or the path behind
    const d = x - (BX - RHO);
    const s = y - BY;
    if (d > -13.2 && d < -4 && s > -9.4 && s < 13.2) continue;
    if (taken.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1.9)) continue;
    taken.push([x, y]);
    planted++;
    if (rng.chance(0.2)) birch(pen, rng, x, y);
    else tree(pen, rng, x, y, { kind: "tall", h: rng.range(1.3, 2.0), r: rng.range(1.4, 1.9), color: rng.pick([C.leafDark, C.leafDark, C.hedge, [66, 128, 84] as RGB]) });
  }

  // ---- the bath house: long, low, yellow brick, a terrace on its roof and a terrace at its feet
  pen.push(BATH_O[0], BATH_O[1], 0, -90);
  const brick: RGB = [226, 192, 112];
  pen.obj(() => {
    pen.box(0, 0, 0, BATH_L, BATH_W, BATH_H, brick, { top: C.stone });
    const f = pen.wall("y+", 0, 0, 0, BATH_L, BATH_W);
    f.rect(0, BATH_H - 0.5, BATH_L, BATH_H, C.white, { grain: 0.4 });
    f.seg(0, BATH_H - 0.5, BATH_L, BATH_H - 0.5, { w: 0.05 });
    for (let k = 0; k < 13; k++) {
      const a = 0.55 + k * 1.25;
      if (k === 6) f.rect(a - 0.15, 0, a + 1.05, 2.3, C.doorBlue, { outline: true, w: W_THIN, layer: 1 });
      else f.rect(a, 0.85, a + 0.9, 2.35, C.glass, { outline: true, w: W_FINE, ink: C.white, layer: 1, glow: rng.chance(0.6) ? 1 : 0, grain: 0.5 });
    }
    f.ticks(0.2, 0.1, BATH_L - 0.2, BATH_H - 0.6, { n: 70, len: 0.5, ang: 0, jit: 0.02, color: [198, 160, 88], w: 0.05 });
    f.text("STRANDBAD WANNSEE", BATH_L / 2, BATH_H - 0.4, 0.3, { align: "c", layer: 2, w: 0.055 });
    const g = pen.wall("x-", 0, 0, 0, BATH_L, BATH_W);
    g.rect(0, BATH_H - 0.5, BATH_W, BATH_H, C.white, { grain: 0.4 });
    g.rect(1.2, 0.85, 2.4, 2.35, C.glass, { outline: true, w: W_FINE, ink: C.white, layer: 1, glow: 1, grain: 0.5 });
    g.ticks(0.2, 0.1, BATH_W - 0.2, BATH_H - 0.6, { n: 14, len: 0.5, ang: 0, jit: 0.02, color: [198, 160, 88], w: 0.05 });
    // the terrace at its feet
    pen.floor(0.02, 1).rect(-0.6, BATH_W, BATH_L + 0.6, BATH_W + 1.6, C.paving, { outline: true, w: W_FINE, grain: 0.8 });
  });
  // on the roof: a rail, parasols, people with a drink, three flags
  pen.obj(() => {
    railing(
      pen,
      [
        [0.15, BATH_W - 0.15, BATH_H],
        [BATH_L - 0.15, BATH_W - 0.15, BATH_H],
      ],
      0.7,
      C.white,
      1.4,
    );
    railing(
      pen,
      [
        [0.15, 0.2, BATH_H],
        [0.15, BATH_W - 0.15, BATH_H],
      ],
      0.7,
      C.white,
      1.4,
    );
  }, 0.15);
  for (const [a, col] of [
    [2.2, C.red],
    [6.4, C.yellow],
    [10.6, C.blue],
    [14.6, C.red],
  ] as [number, RGB][]) {
    parasol(pen, a, 1.5, BATH_H, col);
    person(pen, a - 0.6, 2.1, BATH_H + 0.3, randomLook(rng), "bust", false);
    if (rng.chance(0.7)) person(pen, a + 0.6, 2.2, BATH_H + 0.3, randomLook(rng), "bust", true);
  }
  // a string of bulbs along the roof, for the evening
  pen.obj(() => {
    for (let a = 0.6; a < BATH_L - 0.3; a += 1.05) {
      pen.stroke(
        [
          [a, BATH_W - 0.15, BATH_H + 0.78],
          [a, BATH_W - 0.15, BATH_H + 0.9],
        ],
        { w: 0.14, color: C.lamp, kind: L_BAR, wobble: 0 },
      );
      pen.stroke(
        [
          [a, BATH_W - 0.15, BATH_H + 0.82],
          [a, BATH_W - 0.15, BATH_H + 0.86],
        ],
        { w: 0.5, kind: L_LIGHT, wobble: 0, alpha: 0.85 },
      );
    }
  }, 0.2);
  flagOf(pen, 0.8, 0.6, BATH_H, 3.4, "berlin", 0.85);
  flagOf(pen, BATH_L / 2, 0.6, BATH_H, 3.8, "de", 0.85);
  flagOf(pen, BATH_L - 0.8, 0.6, BATH_H, 3.4, "berlin", 0.85);
  for (const a of [1.2, 5.6, 11.4, 15.8]) lamp(pen, a, BATH_W + 1.4, 0, 2.7);
  // on the terrace: people in towels, people in a hurry
  for (let k = 0; k < 9; k++) {
    const a = rng.range(0.6, BATH_L - 0.6);
    if (Math.abs(a - BATH_L / 2) < 1.2) continue;
    person(pen, a, BATH_W + rng.range(0.4, 1.2), 0, randomLook(rng), rng.pick(["stand", "walkA", "wave"]), rng.chance(0.5), rng.chance(0.3) ? 0.72 : 1);
  }
  // the ice-cream kiosk at the near end, and the queue it always has
  const kx = -3.5;
  pen.obj(() => {
    pen.box(kx, 2.2, 0, 2.2, 1.8, 2.1, C.white, { top: C.pink });
    const f = pen.wall("y+", kx, 2.2, 0, 2.2, 1.8);
    for (let k = 0; k < 6; k++) if (k % 2 === 0) f.rect(k * 0.367, 0, (k + 1) * 0.367, 0.8, C.pink, { grain: 0.5 });
    f.rect(0.25, 0.9, 1.95, 1.65, C.charcoal, { outline: true, w: W_FINE, glow: 0.7, layer: 1 });
    f.text("EIS", 1.1, 1.74, 0.26, { align: "c", layer: 1, w: 0.06 });
    const g = pen.wall("x-", kx, 2.2, 0, 2.2, 1.8);
    for (let k = 0; k < 5; k++) if (k % 2 === 0) g.rect(k * 0.36, 0, (k + 1) * 0.36, 2.1, C.pink, { grain: 0.5 });
    // a cone on the roof, so nobody misses it
    const cd = pen.card(kx + 1.1, 3.1, 2.1);
    cd.poly(
      [
        [-0.32, 0.75],
        [0.32, 0.75],
        [0, 0],
      ],
      C.ochre,
      { outline: true, w: W_FINE },
    );
    cd.circle(-0.14, 0.92, 0.26, C.pink, { outline: true, w: W_FINE, seg: 8, layer: 1 });
    cd.circle(0.16, 0.95, 0.26, C.cream, { outline: true, w: W_FINE, seg: 8, layer: 1 });
    cd.circle(0.02, 1.22, 0.24, C.brickBrown, { outline: true, w: W_FINE, seg: 8, layer: 2 });
  });
  person(pen, kx + 1.1, 3.75, 0.3, randomLook(rng), "bust", false);
  queue(pen, rng, kx + 1.1, 4.7, 7, 1, 0.04);
  pen.pop();
  pen.pop();

  // ---- the beach (things here are placed by how far along the shore they are, and how far up from the water)
  // a boardwalk from the terrace down the middle of the sand to the water
  pen.obj(() => {
    for (let k = 0; k < 9; k++) {
      const t0 = DEPTH + 0.3 - k * 0.6;
      const q = (s: number, t: number): V3 => {
        const p = beach(s, Math.min(t, DEPTH));
        return [p[0], p[1], p[2] + 0.03];
      };
      pen.fill([q(-0.75, t0), q(0.75, t0), q(0.75, t0 - 0.52), q(-0.75, t0 - 0.52)], C.wood, { outline: true, w: W_FINE, grain: 0.7 });
    }
  });
  // the hooded chairs, in three rows facing the lake; half of them taken
  const stripes: RGB[] = [C.blue, C.red, C.blue, C.teal];
  for (const t of [2.4, 3.7, 5.0]) {
    for (let s = -14.6; s < 10.2; s += 1.95) {
      // not on the boardwalk, nor round the lifeguard
      if (Math.abs(s) < 1.7) continue;
      if (t < 3 && s > -4.6 && s < -1.4) continue;
      if (rng.chance(0.16)) continue;
      const p = beach(s + rng.range(-0.25, 0.25), t + rng.range(-0.15, 0.15));
      pen.push(p[0], p[1], p[2], facing(p) + rng.range(-9, 9));
      strandkorb(pen, rng, rng.pick(stripes), rng.chance(0.55) ? (rng.chance(0.5) ? 2 : 1) : 0);
      pen.pop();
    }
  }
  // the lifeguard: a white hut on stilts, a red-and-yellow flag, and a man with nothing to do
  {
    const p = beach(-3.0, 1.4);
    pen.push(p[0], p[1], p[2], facing(p));
    pen.obj(() => {
      for (const [x, y] of [
        [-0.75, -0.75],
        [0.75, -0.75],
        [-0.75, 0.75],
        [0.75, 0.75],
      ]) {
        pen.pole([x * 1.15, y * 1.15, 0], [x, y, 2.0], 0.11, C.white);
      }
      pen.box(-0.95, -0.95, 2.0, 1.9, 1.9, 0.12, C.wood, { w: W_FINE });
      pen.box(-0.7, -0.85, 2.12, 1.4, 1.1, 1.25, C.white, { w: W_THIN });
      pen.pyramid(-0.85, -1.0, 3.37, 1.7, 1.4, 0.6, C.red);
      const f = pen.wall("y+", -0.7, -0.85, 2.12, 1.4, 1.1);
      f.rect(0.2, 0.35, 1.2, 0.95, C.glass, { outline: true, w: W_FINE, layer: 1 });
      f.text("DLRG", 0.7, 1.02, 0.15, { align: "c", color: C.red, kind: L_MARK, w: 0.045 });
      // the ladder
      for (const x of [-0.25, 0.25]) {
        pen.stroke(
          [
            [x, 1.75, 0],
            [x, 0.95, 2.05],
          ],
          { w: 0.07, color: C.wood, kind: L_BAR, wobble: 0 },
        );
      }
      for (let k = 1; k < 5; k++) {
        pen.stroke(
          [
            [-0.25, 1.75 - k * 0.16, k * 0.41],
            [0.25, 1.75 - k * 0.16, k * 0.41],
          ],
          { w: 0.05, color: C.wood, kind: L_BAR, wobble: 0 },
        );
      }
    });
    flag(pen, 0.85, -0.85, 2.12, 2.9, [C.yellow, C.red], 0.8);
    const guard: Look = { skin: SKIN[2], hair: [226, 194, 124], top: C.red, legs: C.red, long: false, hat: null };
    person(pen, 0.1, 0.55, 2.12, guard, "stand", false);
    pen.pop();
  }
  // beach volleyball, towards the right-hand end: a net, two a side
  const NET = -19.2;
  const netA = beach(NET, 1.5);
  const netB = beach(NET, 4.7);
  pen.obj(() => {
    pen.pole([netA[0], netA[1], netA[2]], [netA[0], netA[1], netA[2] + 2.5], 0.1, C.white);
    pen.pole([netB[0], netB[1], netB[2]], [netB[0], netB[1], netB[2] + 2.5], 0.1, C.white);
    for (const b of [2.45, 1.5]) {
      pen.stroke(
        [
          [netA[0], netA[1], netA[2] + b],
          [netB[0], netB[1], netB[2] + b],
        ],
        { w: b > 2 ? 0.1 : 0.05, color: C.white, kind: L_BAR, wobble: 0 },
      );
    }
    for (let k = 1; k < 8; k++) {
      const x = netA[0] + ((netB[0] - netA[0]) * k) / 8;
      const y = netA[1] + ((netB[1] - netA[1]) * k) / 8;
      const z = netA[2] + ((netB[2] - netA[2]) * k) / 8;
      pen.stroke(
        [
          [x, y, z + 1.5],
          [x, y, z + 2.45],
        ],
        { w: 0.035, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.85 },
      );
    }
    pen.stroke(
      [
        [netA[0], netA[1], netA[2] + 1.97],
        [netB[0], netB[1], netB[2] + 1.97],
      ],
      { w: 0.035, color: C.white, kind: L_BAR, wobble: 0, alpha: 0.85 },
    );
    // the court, scratched in the sand
    const corners = [beach(NET - 3.4, 1.5), beach(NET + 3.4, 1.5), beach(NET + 3.4, 4.7), beach(NET - 3.4, 4.7)].map((p) => [p[0], p[1], p[2] + 0.02] as V3);
    pen.stroke(corners, { closed: true, w: 0.06, color: C.white, kind: L_MARK, wobble: 0.4 });
  });
  const swim = (k: number): Look => ({ skin: rng.pick(SKIN), hair: randomLook(rng).hair, top: rng.pick(SKIN), legs: [C.blue, C.red, C.teal, C.black][k % 4], long: k % 2 === 0, hat: null });
  for (const [s, t, pose, fl] of [
    [NET - 2.1, 2.3, "cheer", false],
    [NET - 1.7, 4.0, "stand", false],
    [NET + 2.0, 2.6, "wave", true],
    [NET + 1.6, 4.1, "cheer", true],
  ] as [number, number, "cheer" | "stand" | "wave", boolean][]) {
    const p = beach(s, t);
    const lk = swim(Math.round(s + 40));
    person(pen, p[0], p[1], p[2], { ...lk, top: lk.skin }, pose, fl);
  }
  for (const [s, t] of [
    [NET - 4.6, 3.2],
    [NET + 4.5, 3.6],
    [NET + 4.9, 2.4],
  ]) {
    const p = beach(s, t);
    person(pen, p[0], p[1], p[2], swim(Math.round(s + 60)), rng.pick(["stand", "wave"]), s > NET);
  }
  // towels and people on them, umbrellas, castles, children with buckets
  for (const [s, t] of [
    [-4.4, 1.25],
    [-6.6, 1.35],
    [2.8, 1.3],
    [5.4, 1.2],
    [-9.6, 1.4],
    [11.6, 1.5],
    [-12.6, 1.3],
    [8.2, 1.35],
    [-24.4, 2.2],
    [13.4, 3.4],
  ]) {
    const p = beach(s, t);
    const col = rng.pick([C.red, C.yellow, C.teal, C.pink, C.white, C.orange]);
    const q = (dsh: number, dt: number): V3 => {
      const v = beach(s + dsh, t + dt);
      return [v[0], v[1], v[2] + 0.02];
    };
    pen.fill([q(-0.95, -0.45), q(0.95, -0.45), q(0.95, 0.45), q(-0.95, 0.45)], col, { outline: true, w: W_FINE, grain: 0.6 });
    const lk = swim(Math.round(s + 50));
    person(pen, p[0], p[1], p[2] - 0.2, { ...lk, top: rng.chance(0.5) ? lk.skin : rng.pick([C.red, C.blue, C.yellow, C.pink]) }, "sit", rng.chance(0.5));
  }
  for (const [s, col] of [
    [-15.6, C.red],
    [-8.2, C.yellow],
    [4.2, C.teal],
    [10.2, C.orange],
    [-23.2, C.blue],
  ] as [number, RGB][]) {
    const p = beach(s, 1.9);
    parasol(pen, p[0], p[1], p[2], col);
  }
  for (const [s, t] of [
    [1.6, 0.75],
    [-5.4, 0.7],
    [7.0, 0.6],
    [-11.2, 0.7],
  ]) {
    const p = beach(s, t);
    castle(pen, p[0], p[1], p[2]);
    const q = beach(s + 1.0, t + 0.2);
    person(pen, q[0], q[1], q[2], { ...randomLook(rng), top: rng.pick(SKIN) }, "wave", true, 0.72);
    const b = beach(s - 0.8, t + 0.15);
    pen.box(b[0] - 0.12, b[1] - 0.12, b[2], 0.24, 0.24, 0.26, C.red, { w: W_FINE });
    person(pen, b[0] - 0.4, b[1] + 0.4, b[2] - 0.2, { ...randomLook(rng), top: rng.pick(SKIN) }, "sit", false, 0.72);
  }
  // people going in and coming out, up to their knees
  for (let k = 0; k < 10; k++) {
    const p = bay(rng.range(-BATHING, BATHING) / RHO, RHO - rng.range(0.4, 1.3));
    const lk = swim(k);
    person(pen, p[0], p[1], LAKE - rng.range(0.3, 0.6), { ...lk, top: k % 3 ? lk.skin : C.red }, rng.pick(["stand", "wave", "cheer"]), rng.chance(0.5), rng.chance(0.35) ? 0.72 : 1);
  }
  // the fire on the beach, for after dark: logs, and the people who will sit round it
  const fire = beach(12.6, 2.0);
  pen.obj(() => {
    for (const r of [20, 80, 140]) {
      pen.push(fire[0], fire[1], fire[2], r);
      pen.box(-0.55, -0.09, 0, 1.1, 0.18, 0.16, C.brickBrown, { w: W_FINE });
      pen.pop();
    }
  });
  for (let k = 0; k < 5; k++) {
    const a = 0.4 + (k / 5) * Math.PI * 1.7;
    person(pen, fire[0] + Math.cos(a) * 1.5, fire[1] + Math.sin(a) * 1.3, fire[2] - 0.2, randomLook(rng), "sit", Math.cos(a) > 0);
  }

  // ---- in the water
  // the line of buoys round the bathing place
  pen.obj(() => {
    const rope: V3[] = [];
    for (let s = -BATHING; s <= BATHING + 0.01; s += 1.3) {
      const p = bay(s / RHO, BUOYS);
      rope.push([p[0], p[1], LAKE + 0.02]);
    }
    const endA = bay(-BATHING / RHO, RHO - 0.5);
    const endB = bay(BATHING / RHO, RHO - 0.5);
    pen.stroke([[endA[0], endA[1], LAKE + 0.02], ...rope, [endB[0], endB[1], LAKE + 0.02]], { w: 0.04, color: C.inkSoft, kind: L_MARK, wobble: 0.2, alpha: 0.7 });
    rope.forEach((p, k) => pen.card(p[0], p[1], LAKE).circle(0, 0.12, 0.2, k % 2 ? C.white : C.red, { outline: true, w: W_FINE, seg: 7 }));
  });
  // the pontoon: planks on barrels, a slide down one side, a diving board off the other
  const [qx, qy] = PONTOON;
  pen.obj(() => {
    for (const [x, y] of [
      [-1.1, -1.1],
      [1.1, -1.1],
      [-1.1, 1.1],
      [1.1, 1.1],
    ]) {
      pen.cyl(qx + x, qy + y, LAKE - 0.1, 0.42, 0.42, C.blue, { seg: 8 });
    }
    pen.box(qx - 1.6, qy - 1.6, LAKE + 0.3, 3.2, 3.2, 0.14, C.wood, { top: C.wood, w: W_THIN });
    pen.floor(LAKE + 0.45, 1).ticks(qx - 1.5, qy - 1.5, qx + 1.5, qy + 1.5, { n: 12, len: 2.2, ang: 0, jit: 0.02, color: C.woodDark, w: 0.05 });
    // the slide: a frame, and a blue chute down into the water alongside the shore
    const sx = qx + 0.9;
    const sy = qy - 1.0;
    for (const o of [-0.35, 0.35]) pen.pole([sx + o, sy, LAKE + 0.44], [sx + o, sy, LAKE + 2.7], 0.09, C.white);
    pen.box(sx - 0.45, sy - 0.45, LAKE + 2.6, 0.9, 0.9, 0.1, C.wood, { w: W_FINE });
    const chute: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      chute.push([sx + u * 0.3, sy - 0.3 - u * 3.0, LAKE + 2.65 - 2.5 * (u * 0.55 + 0.45 * u * u)]);
    }
    pen.stroke(chute, { w: 0.62, color: C.blueDark, kind: L_BAR, wobble: 0 });
    pen.stroke(chute, { w: 0.4, color: C.sky, kind: L_BAR, wobble: 0, bias: 0.012 });
    // the board: a stand and a plank out over the water, towards the lower left as the page sees it
    pen.box(qx + 0.2, qy + 0.7, LAKE + 0.44, 0.6, 0.6, 0.85, C.white, { w: W_FINE });
    pen.stroke(
      [
        [qx + 0.5, qy + 0.9, LAKE + 1.34],
        [qx + 0.5, qy + 3.4, LAKE + 1.34],
      ],
      { w: 0.42, color: C.ink, kind: L_BAR, wobble: 0 },
    );
    pen.stroke(
      [
        [qx + 0.5, qy + 0.9, LAKE + 1.34],
        [qx + 0.5, qy + 3.4, LAKE + 1.34],
      ],
      { w: 0.3, color: C.sky, kind: L_BAR, wobble: 0, bias: 0.012 },
    );
  });
  person(pen, qx - 0.6, qy - 0.3, LAKE + 0.44, { ...swim(3), top: SKIN[1] }, "stand", false, 0.72);
  person(pen, qx - 0.1, qy - 0.8, LAKE + 0.44, { ...swim(4), top: SKIN[3] }, "wave", false, 0.72);
  person(pen, qx + 0.9, qy - 1.0, LAKE + 2.7, { ...swim(5), top: SKIN[0] }, "cheer", true, 0.72);
  person(pen, qx - 1.25, qy + 1.2, LAKE + 0.24, { ...swim(6), top: SKIN[2] }, "sit", true);
  // an air bed and a flamingo; then heads, and arms, in the water inside the buoys
  const lilo = bay(-14 * DEG, RHO - 2.5);
  const pink = bay(-7.5 * DEG, RHO - 4.3);
  const splash: V2 = [qx + 0.5, qy + 5.1];
  pen.floor(LAKE + 0.03, 3).rect(lilo[0] - 0.45, lilo[1] - 1.0, lilo[0] + 0.45, lilo[1] + 1.0, C.yellow, { outline: true, w: W_FINE, grain: 0.4 });
  person(pen, lilo[0], lilo[1], LAKE - 0.15, { ...swim(9), top: SKIN[1] }, "sit", false);
  flamingo(pen, rng, pink[0], pink[1], true);
  for (let k = 0; k < 26; k++) {
    const p = bay(rng.range(-BATHING + 1, BATHING - 1) / RHO, rng.range(BUOYS + 0.8, RHO - 1.6));
    if (Math.hypot(p[0] - qx, p[1] - qy) < 3.6 || Math.hypot(p[0] - splash[0], p[1] - splash[1]) < 1.8 || Math.hypot(p[0] - lilo[0], p[1] - lilo[1]) < 1.6 || Math.hypot(p[0] - pink[0], p[1] - pink[1]) < 1.6) continue;
    const lk = swim(k);
    if (k % 4 === 0) person(pen, p[0], p[1], LAKE - 1.25, { ...lk, top: lk.skin }, "wave", rng.chance(0.5));
    else person(pen, p[0], p[1], LAKE - 0.62, { ...lk, top: lk.skin }, "bust", rng.chance(0.5), k % 3 === 0 ? 0.72 : 1);
  }
  // two buoys to race round
  for (const s of [-8, 8]) {
    const px = COURSE[0];
    const py = COURSE[1] + s;
    pen.obj(() => {
      pen.cyl(px, py, LAKE, 0.34, 0.5, C.orange, { seg: 8, r2: 0.16 });
      pen.pole([px, py, LAKE + 0.5], [px, py, LAKE + 1.3], 0.05, C.black, { ink: false });
      pen.card(px, py, LAKE + 0.95).rect(0, 0, 0.4, 0.3, C.orange, { grain: 0.3, layer: 1 });
    });
  }
  // the ferry's two stages, one by each horn, with people waiting and the BVG's yellow sign
  for (const [end, sign] of [
    [FERRY_A, -1],
    [FERRY_B, 1],
  ] as [V2, number][]) {
    // from where the shore is, straight out to where the ferry puts its nose
    const sx = BX - Math.sqrt(RHO * RHO - (end[1] - BY) * (end[1] - BY)) - 0.4;
    const from: V2 = [sx, end[1]];
    const to: V2 = [end[0] - 0.4, end[1]];
    pier(pen, from, to, LAKE + 0.5);
    pen.obj(() => {
      const cd = pen.card(from[0] + 0.3, from[1] - sign * 0.5, LAKE + 0.5);
      cd.bar(0, 0, 0, 2.0, 0.08, C.greyDark);
      cd.rect(-0.55, 1.5, 0.55, 2.15, C.bvg, { outline: true, w: W_FINE, layer: 1 });
      cd.text("F10", 0, 1.67, 0.3, { align: "c", layer: 2, w: 0.06 });
    });
    const n = sign > 0 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const f = 0.2 + k * 0.3;
      person(pen, from[0] + (to[0] - from[0]) * f, from[1] + sign * 0.15, LAKE + 0.5, randomLook(rng), k === 1 ? "wave" : "stand", sign > 0);
    }
  }

  // ---- what moves
  // dinghies racing round the two buoys
  const course: V3[] = [];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    course.push([c.ox + COURSE[0] + Math.cos(a) * 3.0, c.oy + COURSE[1] + Math.sin(a) * 10, c.oz + LAKE]);
  }
  const race = new Route(course, true);
  const sails: [RGB, RGB | null][] = [
    [C.white, C.red],
    [C.white, null],
    [C.yellow, null],
    [C.white, C.blue],
    [C.white, null],
  ];
  sails.forEach(([sail, stripe], k) => {
    const boat = new Turning((p) => sailBoat(p, new Rng(60 + k), sail, stripe), 32, 60 + k);
    c.movers.push(traveler(race, { speed: 1.5, at: 0.03 + k * 0.2 + (k % 2) * 0.025, born: c.done + k * 0.25, span: 2.6, sprite: (h) => boat.at(h) }));
  });

  // the ferry, there and back across the mouth of the bay; it is in mid-lake when the camera comes
  {
    const lx = FERRY_B[0] - FERRY_A[0];
    const ly = FERRY_B[1] - FERRY_A[1];
    const len = Math.hypot(lx, ly);
    const ship = makeSprite((p) => ferry(p, new Rng(77)), Math.atan2(ly, lx) / DEG, 77);
    const RUN = 10;
    const WAIT = 3;
    const T = 2 * (RUN + WAIT);
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const s = c.stay();
      const t0 = s ? s.at - (WAIT + RUN * 0.4) : c.done;
      const ph = (((m.t - t0) % T) + T) % T;
      const ease = (v: number) => v * v * (3 - 2 * v);
      const u = ph < WAIT ? 0 : ph < WAIT + RUN ? ease((ph - WAIT) / RUN) : ph < 2 * WAIT + RUN ? 1 : 1 - ease((ph - 2 * WAIT - RUN) / RUN);
      const f = (3.4 + (len - 6.8) * u) / len;
      m.put(ship, c.ox + FERRY_A[0] + lx * f, c.oy + FERRY_A[1] + ly * f, c.oz + LAKE, c.done);
    });
  }

  // a pedal boat pottering about by the left-hand stage, and somebody standing on a board beyond the right-hand buoys
  {
    const pts: V3[] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      pts.push([c.ox + 22.7 + Math.cos(a) * 1.0, c.oy + 33.4 + Math.sin(a) * 1.3, c.oz + LAKE]);
    }
    const boat = new Turning((p) => pedalo(p, new Rng(88)), 24, 88);
    c.movers.push(traveler(new Route(pts, true), { speed: 0.6, at: 0.2, born: c.done + 0.5, span: 1.6, sprite: (h) => boat.at(h) }));
    const sup = [0, 1].map((fl) =>
      makeSprite(
        (p) => {
          p.extrude(hullShape(2.6, 0.7, 0.3), 0, 0.12, C.white, { top: C.teal, crease: 28, w: 0.08 });
          person(p, 0, 0, 0.12, { skin: SKIN[1], hair: [43, 32, 25], top: C.orange, legs: C.blueDark, long: true, hat: null }, "stand", fl === 0);
          p.stroke(
            [
              [0.35, 0, 1.75],
              [0.75, 0.3, 0.02],
            ],
            { w: 0.06, color: C.woodDark, kind: L_BAR, wobble: 0 },
          );
        },
        fl ? -85 : 95,
      ),
    );
    c.movers.push((m) => {
      if (m.t < c.done + 0.6) return;
      // to and fro along the shore
      const ph = (m.t * 0.085) % 2;
      const u = ph < 1 ? ph : 2 - ph;
      m.put(sup[ph < 1 ? 0 : 1], c.ox + 25.7 - u * 0.4, c.oy + 8.6 + u * 4.4, c.oz + LAKE, c.done + 0.6);
    });
  }

  // the volleyball: over the net and back, for ever
  const ball = makeSprite((p) => p.card(0, 0, 0).circle(0, 0, 0.24, C.white, { outline: true, w: W_FINE, seg: 9 }), 0, 5);
  {
    const a = beach(NET - 1.9, 3.1);
    const b = beach(NET + 1.9, 3.1);
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const ph = (m.t / 1.45) % 2;
      const u = ph < 1 ? ph : 2 - ph;
      const lob = 4 * (ph % 1) * (1 - (ph % 1));
      m.put(ball, c.ox + a[0] + (b[0] - a[0]) * u, c.oy + a[1] + (b[1] - a[1]) * u, c.oz + sandZ(3.1) + 1.7 + 2.3 * lob, c.done);
    });
  }

  // somebody runs up the board and dives, just as the camera arrives; then the next one, and the next
  {
    const kid: Look = { skin: SKIN[1], hair: [124, 82, 48], top: SKIN[1], legs: C.red, long: false, hat: null };
    const run = [makeSprite((p) => person(p, 0, 0, 0, kid, "walkA", true, 0.8), 0, 3), makeSprite((p) => person(p, 0, 0, 0, kid, "walkB", true, 0.8), 0, 3)];
    const fly = makeSprite((p) => person(p, 0, 0, 0, kid, "cheer", true, 0.8), 0, 3);
    const head = makeSprite((p) => person(p, 0, 0, 0, kid, "bust", true, 0.8), 0, 3);
    const bx = c.ox + qx + 0.5;
    const by = c.oy + qy + 1.0;
    const bz = c.oz + LAKE + 1.4;
    const lakeZ = c.oz + LAKE;
    c.movers.push((m) => {
      if (m.t < c.done) return;
      const s = c.stay();
      const t0 = s ? s.at + 0.25 : c.done + 1.2;
      const ph = (((m.t - t0) % 8) + 8) % 8;
      if (ph < 0.55) {
        // along the board
        m.put(run[Math.floor(ph * 9) & 1], bx, by + 2.3 * (ph / 0.55), bz, c.done);
      } else if (ph < 1.25) {
        // through the air
        const u = (ph - 0.55) / 0.7;
        m.put(fly, bx, by + 2.3 + 1.8 * u, Math.max(lakeZ - 1.2, bz + 4.65 * u - 6.0 * u * u), c.done);
      } else {
        const ex = bx;
        const ey = by + 4.1;
        if (ph < 2.2) {
          // the splash: a crown of drops, and rings going out
          const f = (ph - 1.25) / 0.95;
          const cd = m.pen.card(ex, ey, lakeZ);
          for (let q = 0; q < 9; q++) {
            const a = 0.35 + (q / 8) * (Math.PI - 0.7);
            const r0 = 0.3 + f * 0.9;
            const r1 = r0 + 0.55 * (1 - f * 0.5);
            cd.seg(Math.cos(a) * r0, Math.sin(a) * r0 * 1.5 - f * f * 0.9, Math.cos(a) * r1, Math.sin(a) * r1 * 1.5 - f * f * 0.9, { color: C.white, w: 0.13, alpha: 1 - f, kind: L_MARK, wobble: 0 });
          }
          const g = m.pen.floor(lakeZ + 0.02, 2);
          ringAt(g, ex, ey, 0.5 + f * 1.6, 1 - f);
          ringAt(g, ex, ey, 0.2 + f * 0.9, 1 - f);
        }
        if (ph > 1.9 && ph < 5.2) m.put(head, ex, ey + 0.3, lakeZ - 0.55 + Math.sin(m.t * 3) * 0.05, c.done);
        // and the next one is already waiting at the back of the board
        if (ph > 5.6) m.put(run[1], bx, by, bz, c.done);
      }
    });
  }

  // the fire, once it is dark
  {
    const fx = c.ox + fire[0];
    const fy = c.oy + fire[1];
    const fz = c.oz + fire[2] + 0.15;
    c.movers.push((m) => {
      if (m.night < 0.25 || !m.sees(fx, fy, fz, 8)) return;
      const cd = m.pen.card(fx, fy, fz);
      for (let q = 0; q < 4; q++) {
        const f = 0.5 + 0.5 * Math.sin(m.t * (9 + q * 2.3) + q * 2.1);
        const a = (q - 1.5) * 0.22;
        cd.line(
          [
            [a * 1.3, 0],
            [a * 1.9 + Math.sin(m.t * 7 + q) * 0.1, 0.5 + 0.35 * f],
            [a * 0.7, 1.0 + 0.75 * f],
          ],
          { color: q % 2 ? [255, 206, 100] : [255, 132, 60], w: 0.32 - q * 0.03, alpha: m.night, kind: L_SPARK, wobble: 0 },
        );
      }
      cd.seg(-0.02, 0.6, 0.02, 0.6, { w: 5.0, kind: L_LIGHT, wobble: 0, alpha: 0.34 + 0.08 * Math.sin(m.t * 11) });
      cd.seg(-0.02, 0.4, 0.02, 0.4, { w: 1.6, kind: L_LIGHT, wobble: 0, alpha: 0.7 });
    });
  }

  // gulls over the bathers
  const gulls = [0, 1].map((up) => [0, 1].map((fl) => makeSprite((p) => gull(p, up === 1, fl === 1), 0, 9)));
  const over = ds(4, 1.5);
  for (let j = 0; j < 4; j++) {
    const r = 4.5 + j * 1.5;
    const sp = (0.42 + 0.07 * j) * (j % 2 ? -1 : 1);
    c.movers.push((m) => {
      if (m.t < c.done + j * 0.2) return;
      const a = j * 1.9 + m.t * sp;
      const vx = -Math.sin(a) * sp;
      const vy = Math.cos(a) * sp;
      m.put(gulls[Math.floor(m.t * 5 + j) & 1][vx - vy < 0 ? 1 : 0], c.ox + over[0] + Math.cos(a) * r * 0.8, c.oy + over[1] + Math.sin(a) * r, c.oz + 9 + j * 0.8 + Math.sin(m.t * 0.7 + j) * 0.8, c.done + j * 0.2);
    });
  }
};
