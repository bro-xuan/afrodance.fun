// The bridges over the Thames, west to east: Albert Bridge strung with bulbs,
// Westminster Bridge on its seven green arches, the Millennium footbridge,
// plain London Bridge, and Tower Bridge, which opens.
//
// Every bridge is drawn in the same frame: the origin is on the south bank at
// the bridge's west edge, local x runs north across the river (0 to RIVER),
// local y runs east across the deck (0 to its width), the deck is at z = 0 and
// the water at z = WATER. The face the camera sees is the east one (local y+).
// Boats pass at local x = LANE_A and LANE_B, so no pier may stand there.

import { RGB, Rng, V2, V3, hex, scaleRGB } from "../engine/math";
import { F_NEON, L_BAR, L_MARK, Pen, Plane } from "../engine/pen";
import { W_FINE, W_THIN, flag, lamp, railing } from "./kit";
import { C } from "./palette";
import { bulb, globeLamp } from "./street";

export const RIVER = 34;
export const WATER = -4.4;
/** Where the two lanes of river traffic cross every bridge (local x). */
export const LANE_A = (RIVER * 2.5) / 7;
export const LANE_B = (RIVER * 4.5) / 7;

const H = -WATER;

/** The road over a bridge: tarmac between two narrow pavements, a dashed line down the middle. */
function roadway(pen: Pen, W: number, z = 0, walk = 1.05, x0 = 0, x1 = RIVER): void {
  const g = pen.floor(z, 1);
  g.rect(x0, walk, x1, W - walk, C.tarmac, { grain: 0.9 });
  const g2 = pen.floor(z, 2);
  for (const y of [walk, W - walk]) g2.seg(x0, y, x1, y, { w: 0.06 });
  for (let a = x0 + 0.8; a < x1 - 1; a += 2.8) g2.seg(a, W / 2, a + 1.4, W / 2, { w: 0.11, color: C.roadLine, kind: L_MARK, wobble: 0.2 });
}

/**
 * A bridge as one solid slab seen from the side: the outline of its east face,
 * with an arch cut out of the bottom between each pair of piers. `piers` are
 * the pier centres, `pw` their width, `rise` how high the arches spring.
 */
function arched(pen: Pen, W: number, piers: number[], pw: number, rise: number, top: number, rgb: RGB, front?: RGB): V2[][] {
  const edges = [0, ...piers, RIVER];
  const prof: V2[] = [[0, 0]];
  const rings: V2[][] = [];
  for (let k = 0; k < edges.length - 1; k++) {
    const a0 = edges[k] + (k === 0 ? 0.5 : pw / 2);
    const a1 = edges[k + 1] - (k === edges.length - 2 ? 0.5 : pw / 2);
    const ra = (a1 - a0) / 2;
    const ring: V2[] = [];
    const n = Math.max(6, Math.round(ra * 2.2));
    for (let i = 0; i <= n; i++) {
      const t = Math.PI - (Math.PI * i) / n;
      ring.push([a0 + ra + Math.cos(t) * ra, Math.sin(t) * rise]);
    }
    prof.push(...ring);
    rings.push(ring);
  }
  prof.push([RIVER, 0], [RIVER, top], [0, top]);
  pen.wall("y+", 0, 0, WATER, RIVER, 0).extrude(prof, W, rgb, { crease: 25, front });
  return rings;
}

/** A stone pier with a pointed cutwater on its east side. */
function pier(pen: Pen, x: number, pw: number, W: number, top: number, rgb: RGB, cap: RGB): void {
  pen.box(x - pw / 2, -0.3, WATER, pw, W + 0.6, top - WATER, rgb, { top: cap, w: 0.1 });
  pen.solid(
    [
      [x - pw / 2, W + 0.3, WATER],
      [x + pw / 2, W + 0.3, WATER],
      [x, W + 1.3, WATER],
      [x - pw / 2, W + 0.3, top - 0.9],
      [x + pw / 2, W + 0.3, top - 0.9],
      [x, W + 1.3, top - 0.9],
    ],
    [
      [0, 2, 5, 3],
      [2, 1, 4, 5],
      [3, 5, 4],
    ],
    [rgb, rgb, cap],
    { w: 0.09 },
  );
  // the tide line
  const f = pen.wall("y+", x - pw / 2, -0.3, WATER, pw, W + 0.6);
  f.rect(0, 0, pw, 0.5, scaleRGB(rgb, 0.82), { grain: 0.7 });
}

// ---------------------------------------------------------------- Westminster Bridge

const WM_GREEN = hex("#6f9f7c");
const WM_DARK = hex("#4f7d60");

/** Seven low iron arches, painted the green of the Commons benches, with three-globe lamps on every pier. */
export function westminsterBridge(pen: Pen, W: number): void {
  const piers = [1, 2, 3, 4, 5, 6].map((k) => (k * RIVER) / 7);
  pen.begin();
  const rings = arched(pen, W, piers, 1.0, 2.7, H - 0.02, WM_GREEN);
  pen.end();
  for (const p of piers) pen.obj(() => pier(pen, p, 1.0, W, -0.55, C.granite, C.graniteCap), 0.1);
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, WATER, RIVER, W);
    // the arch ribs, and a line of little shields along the spandrels
    for (const ring of rings) {
      f.line(
        ring.map((p) => [p[0], p[1] + 0.12] as V2),
        { w: 0.2, color: WM_DARK, kind: L_MARK, wobble: 0.2, layer: 1 },
      );
      const mid = ring[Math.floor(ring.length / 2)];
      f.circle(mid[0], mid[1] + 0.75, 0.22, C.gold, { outline: true, w: 0.035, layer: 1, seg: 7, grain: 0.3 });
    }
    f.rect(0, H - 0.62, RIVER, H - 0.02, C.portland, { grain: 0.5, layer: 1 });
    f.seg(0, H - 0.62, RIVER, H - 0.62, { w: 0.06, layer: 1 });
    roadway(pen, W);
  }, 0.2);
  // parapets pierced with trefoils, and the lamps
  pen.obj(() => {
    for (const y of [0, W - 0.22]) {
      pen.box(0, y, 0, RIVER, 0.22, 0.85, WM_GREEN, { w: W_THIN, top: WM_DARK });
      const f = pen.wall("y+", 0, y, 0, RIVER, 0.22);
      for (let a = 0.6; a < RIVER; a += 0.8) f.circle(a, 0.45, 0.16, WM_DARK, { layer: 1, seg: 6, grain: 0.3 });
    }
  }, 0.3);
  for (const p of [0.5, ...piers, RIVER - 0.5]) {
    globeLamp(pen, p, 0.1, 0.85, 2.3, 1);
    globeLamp(pen, p, W - 0.1, 0.85, 2.3, 1);
  }
}

// ---------------------------------------------------------------- London Bridge

/** Three flat concrete spans and nothing else, except the strip of red light under its edge at night. */
export function londonBridge(pen: Pen, W: number): void {
  const piers = [6.5, RIVER - 6.5];
  pen.begin();
  arched(pen, W, piers, 1.7, 1.5, H - 0.02, C.portlandDark, C.portland);
  pen.end();
  for (const p of piers) pen.obj(() => pier(pen, p, 1.7, W, -1.2, C.granite, C.graniteCap), 0.1);
  pen.obj(() => {
    const f = pen.wall("y+", 0, 0, WATER, RIVER, W);
    f.rect(0, H - 0.9, RIVER, H - 0.02, C.portlandLight, { grain: 0.5, layer: 1 });
    f.seg(0, H - 0.9, RIVER, H - 0.9, { w: 0.06, layer: 1 });
    f.rect(0.4, H - 1.12, RIVER - 0.4, H - 0.94, C.red, { glow: 1, kind: F_NEON, layer: 2, grain: 0.2 });
    roadway(pen, W);
  }, 0.2);
  pen.obj(() => {
    for (const y of [0, W - 0.25]) pen.box(0, y, 0, RIVER, 0.25, 0.8, C.portland, { w: W_THIN, top: C.portlandLight });
  }, 0.3);
  for (let a = 4; a < RIVER; a += 8.6) {
    lamp(pen, a, 0.5, 0, 3.0);
    lamp(pen, a + 4.3, W - 0.5, 0, 3.0);
  }
}

// ---------------------------------------------------------------- Millennium Bridge

/** The footbridge: a thin steel deck slung between two Y-shaped piers on cables that run beside it, not over it. */
export function millenniumBridge(pen: Pen, W: number): void {
  const piers = [8, RIVER - 8];
  const steel = C.metal;
  const pale = hex("#dfe6ea");
  const cableZ = (x: number) => 0.75 * Math.pow(Math.cos(((x - 17) / 9) * Math.PI) * 0.5 + 0.5, 1) - 0.25;
  pen.begin();
  pen.box(0, 0, -0.28, RIVER, W, 0.28, pale, { top: hex("#eef1f2"), w: 0.09 });
  const g = pen.floor(0, 1);
  for (let a = 0.8; a < RIVER; a += 0.85) g.seg(a, 0.25, a, W - 0.25, { w: 0.035, color: C.grey, kind: L_MARK, wobble: 0, alpha: 0.7 });
  pen.end();
  for (const p of piers) {
    pen.obj(() => {
      pen.cyl(p, W / 2, WATER, 1.1, H - 1.5, C.portland, { seg: 10, w: 0.1, top: C.portlandLight });
      for (const s of [-1, 1]) {
        pen.pole([p, W / 2 + s * 0.4, -1.5], [p, W / 2 + s * (W / 2 + 1.5), cableZ(p) + 0.05], 0.34, steel);
      }
    }, 0.1);
  }
  pen.obj(() => {
    for (const s of [-1, 1]) {
      const y = W / 2 + s * (W / 2 + 1.35);
      for (const dy of [0, s * 0.3]) {
        const pts: V3[] = [];
        for (let a = 0; a <= RIVER + 0.01; a += 1) pts.push([a, a < 1 || a > RIVER - 1 ? W / 2 + s * (W / 2 + 0.2) + dy * 0.3 : y + dy, cableZ(a)]);
        pen.stroke(pts, { w: 0.09, color: steel, kind: L_BAR, wobble: 0 });
      }
      // the arms that carry the deck on the cables
      for (let a = 1.5; a < RIVER - 1; a += 1.6) {
        pen.stroke(
          [
            [a, W / 2 + s * (W / 2 - 0.1), -0.2],
            [a, y, cableZ(a)],
          ],
          { w: 0.07, color: steel, kind: L_BAR, wobble: 0 },
        );
      }
      // the blade of light
      for (let a = 0.6; a < RIVER; a += 0.9) bulb(pen, a, W / 2 + s * (W / 2 - 0.05), 0.12, 0.16);
    }
  }, 0.25);
  for (const y of [0.08, W - 0.08]) {
    railing(
      pen,
      [
        [0, y, 0],
        [RIVER, y, 0],
      ],
      0.8,
      steel,
      1.1,
    );
  }
}

// ---------------------------------------------------------------- Albert Bridge

const AB_PINK = hex("#f3c9c9");
const AB_GREEN = hex("#9fceb0");
const AB_WHITE = hex("#fbf6ec");

/** Albert Bridge: sugar-pink towers, a fan of rods from each, and a bulb every few inches after dark. */
export function albertBridge(pen: Pen, W: number): void {
  const piers = [8, RIVER - 8];
  const TOP = 7.2;
  pen.begin();
  pen.box(0, 0, -0.75, RIVER, W, 0.75, AB_GREEN, { top: C.flag, w: 0.1 });
  const f = pen.wall("y+", 0, 0, -0.75, RIVER, W);
  f.rect(0, 0.42, RIVER, 0.75, AB_WHITE, { grain: 0.4 });
  for (let a = 0.5; a < RIVER; a += 0.9) f.circle(a, 0.2, 0.11, AB_PINK, { layer: 1, seg: 6, grain: 0.2 });
  roadway(pen, W);
  pen.end();
  // a slim extra pier under the middle, added when lorries got heavier
  pen.obj(() => pen.cyl(17, W / 2, WATER, 0.9, H - 0.75, C.portland, { seg: 9, w: 0.1 }), 0.1);
  for (const p of piers) {
    pen.obj(() => {
      pen.box(p - 1.0, -0.6, WATER, 2.0, W + 1.2, H - 0.75, C.granite, { top: C.graniteCap, w: 0.1 });
      for (const y of [-0.25, W + 0.25]) {
        pen.cyl(p, y, -0.75, 0.62, 1.4, AB_WHITE, { seg: 8, w: W_THIN });
        pen.cyl(p, y, 0.65, 0.48, TOP - 1.9, AB_PINK, { seg: 8, w: W_THIN, r2: 0.36 });
        pen.cyl(p, y, TOP - 1.25, 0.56, 0.5, AB_WHITE, { seg: 8, w: W_THIN });
        pen.cone(p, y, TOP - 0.75, 0.52, 1.0, AB_GREEN, { seg: 8, w: W_THIN });
        pen.card(p, y, TOP + 0.25).circle(0, 0.12, 0.13, C.gold, { seg: 7, grain: 0.2, outline: true, w: 0.03 });
      }
      pen.box(p - 0.3, -0.25, TOP - 1.9, 0.6, W + 0.5, 0.5, AB_WHITE, { w: W_THIN });
    }, 0.15);
  }
  // the rods: a fan each way from every tower top down to the deck, bulbs all along them
  pen.obj(() => {
    for (const y of [-0.25, W + 0.25]) {
      const edge = y < 0 ? 0.08 : W - 0.08;
      for (const p of piers) {
        for (const dir of [-1, 1]) {
          const reach = dir < 0 ? (p < 17 ? p - 0.5 : p - 17.4) : p < 17 ? 16.6 - p : RIVER - 0.5 - p;
          for (let k = 1; k <= 4; k++) {
            const a = p + (dir * reach * k) / 4;
            const top: V3 = [p, y, TOP - 1.35];
            const foot: V3 = [a, edge, 0.85];
            pen.stroke([top, foot], { w: 0.055, color: AB_WHITE, kind: L_BAR, wobble: 0 });
            const n = 2 + k * 2;
            for (let q = 1; q < n; q++) bulb(pen, top[0] + ((foot[0] - top[0]) * q) / n, top[1] + ((foot[1] - top[1]) * q) / n, top[2] + ((foot[2] - top[2]) * q) / n, 0.15);
          }
        }
      }
    }
  }, 0.3);
  for (const y of [0.08, W - 0.08]) {
    railing(
      pen,
      [
        [0, y, 0],
        [RIVER, y, 0],
      ],
      0.85,
      AB_WHITE,
      1.0,
    );
    for (let a = 0.5; a < RIVER; a += 0.8) bulb(pen, a, y, 0.95, 0.14);
  }
}

// ---------------------------------------------------------------- Tower Bridge

/** The two river piers: local x of the faces that look at each other across the opening. */
export const TB_A = 9.2;
export const TB_B = RIVER - 9.2;
const TB_PIER = 4.0;
const TB_BLUE = hex("#8fc3df");
const TB_BLUE_D = hex("#5f9cc0");
const TB_STONE = C.bath;
const TB_STONE_D = C.bathDark;
const TB_STONE_L = C.bathLight;
const TB_SLATE = hex("#6b7890");
/** Height of the towers' walls, and of the high walkways between them. */
const TB_H = 15.4;
const TB_WALK = 11.2;

function pointedArch(a0: number, b0: number, a1: number, b1: number): V2[] {
  const w = a1 - a0;
  const sp = b1 - w * 0.7;
  const pts: V2[] = [
    [a0, b0],
    [a1, b0],
    [a1, sp],
  ];
  for (let k = 1; k <= 4; k++) {
    const t = k / 4;
    pts.push([a1 - (w / 2) * t * t * (3 - 2 * t) * 1.0, sp + (b1 - sp) * Math.sin((t * Math.PI) / 2)]);
  }
  for (let k = 3; k >= 0; k--) {
    const t = k / 4;
    pts.push([a0 + (w / 2) * t * t * (3 - 2 * t) * 1.0, sp + (b1 - sp) * Math.sin((t * Math.PI) / 2)]);
  }
  return pts;
}

function lancets(f: Plane, a0: number, a1: number, b0: number, b1: number, n: number, rng: Rng): void {
  const cell = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.5) * cell;
    f.poly(pointedArch(a - cell * 0.28, b0, a + cell * 0.28, b1), C.glass, { outline: true, w: 0.045, glow: rng.chance(0.75) ? 1 : 0, grain: 0.5, layer: 1 });
  }
}

/** One of the two great towers, standing on its pier between x0 and x0 + TB_PIER. */
function tbTower(pen: Pen, rng: Rng, x0: number, W: number): void {
  const y0 = -0.9;
  const d = W + 1.8;
  // the pier, with rounded ends up and down stream
  pen.obj(() => {
    pen.box(x0 - 0.5, y0 - 0.5, WATER, TB_PIER + 1.0, d + 1.0, H - 0.05, C.granite, { top: C.graniteCap, w: 0.11 });
    pen.cyl(x0 + TB_PIER / 2, y0 + d + 0.5, WATER, TB_PIER / 2 + 0.5, H - 0.9, C.granite, { seg: 12, w: 0.1, top: C.graniteCap });
    const f = pen.wall("y+", x0 - 0.5, y0 - 0.5, WATER, TB_PIER + 1.0, d + 1.0);
    f.rect(0, 0, TB_PIER + 1.0, 0.55, C.graniteDark, { grain: 0.7 });
  });
  // the shaft, with the road going through it
  pen.obj(() => {
    pen.box(x0, y0, 0, TB_PIER, d, TB_H, TB_STONE);
    for (const side of ["x-", "y+"] as const) {
      const f = pen.wall(side, x0, y0, 0, TB_PIER, d);
      const w = side === "x-" ? d : TB_PIER;
      for (const b of [5.6, 8.7, 11.8, 14.6]) {
        f.rect(0, b, w, b + 0.3, TB_STONE_L, { grain: 0.4, layer: 1 });
        f.seg(0, b, w, b, { w: W_FINE, layer: 1 });
      }
      // courses of rough granite
      f.ticks(0.3, 0.3, w - 0.3, TB_H - 0.5, { n: Math.round(w * TB_H * 0.5), len: 0.6, ang: 0, jit: 0.02, color: TB_STONE_D, w: 0.05, alpha: 0.8 });
      if (side === "x-") {
        // the gateway
        f.poly(pointedArch(w / 2 - 3.5, 0, w / 2 + 3.5, 5.3), hex("#4b4038"), { outline: true, w: W_THIN, layer: 1, grain: 0.6 });
        f.line(pointedArch(w / 2 - 3.9, 0, w / 2 + 3.9, 5.65).slice(1, -1), { w: 0.16, color: TB_STONE_L, kind: L_MARK, wobble: 0.2, layer: 2 });
        lancets(f, 1.6, w - 1.6, 6.3, 8.3, 4, rng);
        lancets(f, 2.4, w - 2.4, 9.4, 11.3, 3, rng);
        lancets(f, 3.2, w - 3.2, 12.5, 14.2, 2, rng);
        // the City's arms over the gateway
        f.circle(w / 2, 5.95, 0.42, C.red, { outline: true, w: 0.04, layer: 2, seg: 8, grain: 0.3 });
        f.circle(w / 2, 5.95, 0.2, C.white, { layer: 3, seg: 6, grain: 0 });
      } else {
        lancets(f, 0.5, w - 0.5, 1.4, 4.6, 2, rng);
        lancets(f, 0.5, w - 0.5, 6.3, 8.3, 2, rng);
        lancets(f, 0.5, w - 0.5, 9.4, 11.3, 2, rng);
        lancets(f, 0.5, w - 0.5, 12.5, 14.2, 2, rng);
      }
    }
  }, 0.12);
  // four corner turrets, each under a little spire
  pen.obj(() => {
    for (const [tx, ty] of [
      [x0, y0],
      [x0 + TB_PIER, y0],
      [x0 + TB_PIER, y0 + d],
      [x0, y0 + d],
    ]) {
      pen.cyl(tx, ty, 0, 0.72, TB_H + 1.3, TB_STONE_L, { seg: 8, w: 0.09, top: TB_STONE_D });
      pen.cone(tx, ty, TB_H + 1.3, 0.85, 2.3, TB_SLATE, { seg: 8, w: W_THIN });
      pen.card(tx, ty, TB_H + 3.6).circle(0, 0.1, 0.12, C.gold, { seg: 6, grain: 0.2, outline: true, w: 0.03 });
    }
  }, 0.25);
  // the steep roof between them
  pen.obj(() => {
    pen.box(x0 + 0.2, y0 + 0.2, TB_H, TB_PIER - 0.4, d - 0.4, 0.5, TB_STONE_L, { w: W_THIN });
    pen.hip(x0 + 0.3, y0 + 0.3, TB_H + 0.5, TB_PIER - 0.6, d - 0.6, 3.6, TB_SLATE, { inset: 1.5 });
    const mx = x0 + TB_PIER / 2;
    pen.pole([mx, y0 + d / 2, TB_H + 4.1], [mx, y0 + d / 2, TB_H + 5.6], 0.08, C.gold, { ink: false });
  }, 0.4);
}

/** A smaller gate tower on the bank, where the chains come down. */
function tbGate(pen: Pen, rng: Rng, x0: number, W: number): void {
  const y0 = -0.5;
  const d = W + 1.0;
  pen.obj(() => {
    pen.box(x0, y0, 0, 2.6, d, 6.2, TB_STONE);
    const f = pen.wall("x-", x0, y0, 0, 2.6, d);
    f.poly(pointedArch(d / 2 - 3.5, 0, d / 2 + 3.5, 5.0), hex("#4b4038"), { outline: true, w: W_THIN, layer: 1, grain: 0.6 });
    f.rect(0, 5.5, d, 5.8, TB_STONE_L, { grain: 0.4, layer: 1 });
    const g = pen.wall("y+", x0, y0, 0, 2.6, d);
    lancets(g, 0.3, 2.3, 1.4, 4.4, 1, rng);
    g.rect(0, 5.5, 2.6, 5.8, TB_STONE_L, { grain: 0.4, layer: 1 });
  });
  pen.obj(() => {
    for (const ty of [y0, y0 + d]) {
      pen.cyl(x0 + 1.3, ty, 0, 0.6, 7.0, TB_STONE_L, { seg: 8, w: 0.09 });
      pen.cone(x0 + 1.3, ty, 7.0, 0.72, 1.6, TB_SLATE, { seg: 8, w: W_THIN });
    }
    pen.hip(x0 + 0.1, y0 + 0.4, 6.2, 2.4, d - 0.8, 1.5, TB_SLATE);
  }, 0.2);
}

/** The lattice of a girder on a wall plane: two chords and crossed braces between them. */
function lattice(f: Plane, a0: number, a1: number, b0: number, b1: number, bay: number, rgb: RGB, layer = 1): void {
  for (let a = a0; a < a1 - 0.01; a += bay) {
    const e = Math.min(a1, a + bay);
    f.seg(a, b0, e, b1, { w: 0.06, color: rgb, kind: L_MARK, wobble: 0, layer });
    f.seg(a, b1, e, b0, { w: 0.06, color: rgb, kind: L_MARK, wobble: 0, layer });
    f.seg(a, b0, a, b1, { w: 0.06, color: rgb, kind: L_MARK, wobble: 0, layer });
  }
}

/** Tower Bridge, everything but the two leaves that lift. */
export function towerBridge(pen: Pen, rng: Rng, W: number): void {
  const xa = TB_A - TB_PIER;
  const xb = TB_B;
  tbGate(pen, rng, -3.4, W);
  tbGate(pen, rng, RIVER + 0.8, W);
  tbTower(pen, rng, xa, W);
  tbTower(pen, rng, xb, W);
  // the fixed spans from each bank to its tower
  for (const [s0, s1] of [
    [0, xa],
    [xb + TB_PIER, RIVER],
  ]) {
    pen.obj(() => {
      pen.box(s0, 0, -0.8, s1 - s0, W, 0.8, TB_BLUE, { top: C.flag, w: 0.1 });
      const f = pen.wall("y+", s0, 0, -0.8, s1 - s0, W);
      f.rect(0, 0.5, s1 - s0, 0.8, C.white, { grain: 0.4 });
      roadway(pen, W, 0, 1.05, s0, s1);
      for (const y of [0, W - 0.2]) {
        pen.box(s0, y, 0, s1 - s0, 0.2, 0.9, TB_BLUE, { w: W_THIN, top: C.white });
        lattice(pen.wall("y+", s0, y, 0, s1 - s0, 0.2), 0, s1 - s0, 0.08, 0.82, 0.75, C.white);
      }
    }, 0.3);
  }
  // the chains: from high on each tower down to the gate on the bank, the deck hung from them
  pen.obj(() => {
    for (const y of [0.1, W - 0.1]) {
      for (const [top, foot] of [
        [xa, -2.1],
        [xb + TB_PIER, RIVER + 2.1],
      ]) {
        const pts: V3[] = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          const a = top + (foot - top) * t;
          const z = 11.6 - 8.4 * t - Math.sin(t * Math.PI) * 1.2;
          pts.push([a, y, z]);
          if (k > 0 && k < 8 && a > 0.3 && a < RIVER - 0.3) {
            pen.stroke(
              [
                [a, y, z],
                [a, y, 0.9],
              ],
              { w: 0.06, color: TB_BLUE_D, kind: L_BAR, wobble: 0 },
            );
          }
          bulb(pen, a, y, z + 0.25, 0.17);
        }
        pen.stroke(pts, { w: 0.24, color: TB_BLUE, kind: L_BAR, wobble: 0 });
        pen.stroke(
          pts.map((p) => [p[0], p[1], p[2] - 0.5] as V3),
          { w: 0.12, color: TB_BLUE_D, kind: L_BAR, wobble: 0 },
        );
      }
    }
  }, 0.45);
  // the high walkways
  pen.obj(() => {
    for (const y of [1.0, W - 2.2]) {
      pen.box(TB_A, y, TB_WALK, TB_B - TB_A, 1.2, 1.3, TB_BLUE, { top: C.white, w: 0.09 });
      const f = pen.wall("y+", TB_A, y, TB_WALK, TB_B - TB_A, 1.2);
      lattice(f, 0, TB_B - TB_A, 0.1, 1.2, 1.3, C.white);
      for (let a = 0.6; a < TB_B - TB_A; a += 0.9) bulb(pen, TB_A + a, y + 1.25, TB_WALK + 0.65, 0.16);
    }
    // the arched braces under them
    for (const y of [1.0, W - 1.0]) {
      const pts: V3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        pts.push([TB_A + (TB_B - TB_A) * t, y, TB_WALK - 2.6 * Math.pow(Math.abs(2 * t - 1), 2.2)]);
      }
      pen.stroke(pts, { w: 0.14, color: TB_BLUE, kind: L_BAR, wobble: 0 });
    }
  }, 0.55);
  flag(pen, xa + TB_PIER / 2, W + 0.9, TB_H + 1.3 + 2.3, 2.6, "uk", 0.9);
  flag(pen, xb + TB_PIER / 2, W + 0.9, TB_H + 1.3 + 2.3, 2.6, "uk", 0.9);
}

/**
 * The two leaves, and the barriers that stop the traffic. `lift` is how far
 * the leaves are up, in radians; `bar` how far the barriers are down, 0 to 1.
 * Drawn afresh every frame.
 */
export function towerBridgeLeaves(pen: Pen, W: number, lift: number, bar: number): void {
  const cs = Math.cos(lift);
  const sn = Math.sin(lift);
  const half = (TB_B - TB_A) / 2;
  pen.begin();
  for (const [hinge, dir] of [
    [TB_A, 1],
    [TB_B, -1],
  ]) {
    const tipX = hinge + dir * half * cs;
    const tipZ = half * sn;
    const th = 0.75;
    // across the leaf's thickness: perpendicular to its surface, pointing down when it lies flat
    const nx = dir * sn * th;
    const nz = -cs * th;
    const top: V3[] = [
      [hinge, 0, 0],
      [hinge, W, 0],
      [tipX, W, tipZ],
      [tipX, 0, tipZ],
    ];
    const bot = top.map((p) => [p[0] + nx, p[1], p[2] + nz] as V3);
    pen.solid(
      [...top, ...bot],
      [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [3, 0, 4, 7],
      ],
      [C.tarmac, TB_BLUE_D, TB_BLUE, TB_BLUE, TB_BLUE, TB_BLUE],
      { w: 0.1, convex: true },
    );
    // the white line down the middle, and the parapets riding up with the leaf
    pen.stroke(
      [
        [hinge + dir * 0.6 * cs, W / 2, 0.6 * sn + 0.03],
        [hinge + dir * (half - 0.5) * cs, W / 2, (half - 0.5) * sn + 0.03],
      ],
      { w: 0.1, color: C.roadLine, kind: L_MARK, wobble: 0 },
    );
    const ux = -dir * sn;
    const uz = cs;
    for (const y of [0.1, W - 0.1]) {
      const a: V3 = [hinge + ux * 0.9, y, uz * 0.9];
      const b: V3 = [tipX + ux * 0.9, y, tipZ + uz * 0.9];
      pen.pole(a, b, 0.1, TB_BLUE);
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        const px = hinge + (tipX - hinge) * t;
        const pz = tipZ * t;
        pen.pole([px, y, pz], [px + ux * 0.9, y, pz + uz * 0.9], 0.07, TB_BLUE, { ink: false });
        bulb(pen, px + ux * 1.0, y, pz + uz * 1.0, 0.15);
      }
    }
  }
  // barriers across the road at both towers
  const ang = (1 - bar) * 1.4;
  for (const [x, s] of [
    [TB_A - TB_PIER - 0.5, 1],
    [TB_B + TB_PIER + 0.5, -1],
  ]) {
    for (const [y0, dy] of [
      [1.2, 1],
      [W - 1.2, -1],
    ]) {
      const len = W / 2 - 1.4;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * len;
        const b = ((k + 1) / 4) * len;
        pen.pole([x, y0 + dy * Math.cos(ang) * a, 1.0 + Math.sin(ang) * a], [x, y0 + dy * Math.cos(ang) * b, 1.0 + Math.sin(ang) * b], 0.14, k % 2 === 0 ? C.red : C.white);
      }
      pen.pole([x, y0, 0], [x, y0, 1.1], 0.2, C.iron);
      // the red lamp on each post is lit while the road is shut
      if (bar > 0.05) pen.card(x + s * 0.01, y0, 1.1).circle(0, 0.22, 0.2, C.red, { glow: 1, kind: F_NEON, seg: 7, grain: 0, outline: true, w: 0.03 });
    }
  }
  pen.end();
}
