// The city plan. Nine blocks in a diamond, separated by canals instead of
// streets, ringed by water, with the IJ opening out to the north-west and
// small islands floating off the corners of the page.
//
//            (0,0) Oosterdok
//      (0,1) Centraal   (1,0) Windmill
// (0,2) Jordaan   (1,1) Dam    (2,0) Amstel
//      (1,2) Vondelpark  (2,1) Rijksmuseum
//            (2,2) Markets
//
// Block (i, j) has its far corner at world (i * PITCH, j * PITCH). The railway
// runs on a brick viaduct along the north-west edge (blocks with i = 0).

import { C30, Rng, V2, V3, paperX, paperY } from "../engine/math";
import { Mesh } from "../engine/mesh";
import { F_WATER, L_BAR, L_MARK, L_RIPPLE, L_SPARK, Pen } from "../engine/pen";
import { dinghy, sloep } from "./boats";
import { bikeRow, bollard, bricks, bridge, humpZ, lamp, person, randomLook, speckle, tree } from "./kit";
import { Route, boat, cyclist, drape, offsetLoop, rounded, tram, walker } from "./motion";
import { BOAT, C } from "./palette";
import { BlockBuilder, BlockCtx, Mover, Stop } from "./types";

export const BLOCK = 48;
export const LANE = 13;
export const PITCH = BLOCK + LANE;
export const GRID = 3 * BLOCK + 2 * LANE;
/** Water level below the street. The paper itself is at this height. */
export const WATER = -2.4;
export const RING = 11;
export const MID = GRID / 2;
/** Width of the quay street the city lays along canal-side edges: blocks keep off it. */
export const QUAY = 6.2;
/** Centre line of that street, measured in from the block edge. */
export const QUAY_LINE = 4.95;
export const BRIDGE_W = 5.6;
export const HUMP = 0.9;
/** Where a bridge lands along a block edge. */
export const LANDING = BLOCK / 2;
/** The railway viaduct: local x range on the i = 0 blocks, and the height of the rails. */
export const RAIL_X0 = 1.6;
export const RAIL_X1 = 8.0;
export const RAIL_Z = 3.0;
/** Centre lines of the two tracks (world x). */
export const TRACKS: [number, number] = [RAIL_X0 + 1.7, RAIL_X1 - 1.7];

export interface BlockDef {
  id: string;
  i: number;
  j: number;
  /** When the block starts to draw. */
  t: number;
  name: string;
  note: string;
  build: BlockBuilder;
  /**
   * Land outlines in local coordinates, for a block that is not a plain square
   * (a river mouth, a harbour basin). The rest of the square is water.
   */
  land?: V2[][];
}

export interface IsletDef {
  id: string;
  /** World centre. The builder's local frame runs from (0,0) to (40,40) around it, z = 0 on the paper. */
  x: number;
  y: number;
  t: number;
  name: string;
  note: string;
  build: BlockBuilder;
}

export interface City {
  mesh: Mesh;
  movers: Mover[];
  stops: Stop[];
  /** Paper-space bounds of everything, for framing the whole city. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Timeline second by which the whole drawing is finished. */
  done: number;
  /** Timeline second from which nothing in the static drawing is still arriving. */
  settled: number;
  /** How many times two canal boats run into each other in one loop of the timeline. Should be none. */
  boatClashes: number;
}

/** Distance from the city centre to the outer edge of the water, by direction. */
export function shore(theta: number): number {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const p = 7;
  let r = (MID + RING) / Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p);
  // the IJ: a wide bay off the north-west side
  let d = theta - Math.PI;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  r += 66 * Math.exp(-Math.pow(d / 0.47, 2));
  r *= 1 + 0.011 * Math.sin(7 * theta + 1.3) + 0.007 * Math.sin(13 * theta + 0.4) + 0.004 * Math.sin(29 * theta);
  return r;
}

/** True over open water (canals, the ring, the IJ). */
export function inWater(x: number, y: number): boolean {
  const dx = x - MID;
  const dy = y - MID;
  return Math.hypot(dx, dy) < shore(Math.atan2(dy, dx)) - 0.6;
}

function onBlock(x: number, y: number, pad = 0): boolean {
  if (x < -pad || y < -pad || x > GRID + pad || y > GRID + pad) return false;
  const fx = ((x % PITCH) + PITCH) % PITCH;
  const fy = ((y % PITCH) + PITCH) % PITCH;
  return fx < BLOCK + pad && fy < BLOCK + pad;
}

/** Street-level height at a world point: zero, or the hump of a bridge deck. */
export function groundZ(x: number, y: number): number {
  if (x < 0 || y < 0 || x > GRID || y > GRID) return 0;
  const fx = x % PITCH;
  const fy = y % PITCH;
  const laneX = fx > BLOCK;
  const laneY = fy > BLOCK;
  if (laneX && !laneY && Math.abs(fy - LANDING) < BRIDGE_W / 2 + 0.3) return humpZ(fx - BLOCK, LANE, HUMP);
  if (laneY && !laneX && Math.abs(fx - LANDING) < BRIDGE_W / 2 + 0.3) return humpZ(fy - BLOCK, LANE, HUMP);
  return 0;
}

const dist = (x: number, y: number) => Math.hypot(x - MID, y - MID);

/** Lay the water: canals between the blocks, the ring around them, and the IJ. */
function water(pen: Pen): void {
  pen.reveal = (x, y) => 0.1 + (dist(x, y) / 150) * 1.5;
  const g = pen.floor(WATER, 0);
  const opt = { kind: F_WATER };
  // canals inside the grid, cell by cell so the water spreads outwards
  for (let a = 0; a < 5; a++) {
    for (let b = 0; b < 5; b++) {
      const laneX = a % 2 === 1;
      const laneY = b % 2 === 1;
      if (!laneX && !laneY) continue;
      const x0 = Math.floor(a / 2) * PITCH + (laneX ? BLOCK : 0);
      const y0 = Math.floor(b / 2) * PITCH + (laneY ? BLOCK : 0);
      const w = laneX ? LANE : BLOCK;
      const d = laneY ? LANE : BLOCK;
      g.rect(x0 - 0.3, y0 - 0.3, x0 + w + 0.3, y0 + d + 0.3, C.water, opt);
    }
  }
  // the ring and the bay, as a fan of pieces from the grid edge out to the shore
  const n = 220;
  const cl = (v: number) => Math.max(0, Math.min(GRID, v));
  let prev: V2 | null = null;
  const edge: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const th = (k / n) * Math.PI * 2;
    const r = shore(th);
    const p: V2 = [MID + Math.cos(th) * r, MID + Math.sin(th) * r];
    edge.push([p[0], p[1], WATER]);
    if (prev) {
      g.poly([prev, p, [cl(p[0]), cl(p[1])], [cl(prev[0]), cl(prev[1])]], C.water, opt);
    }
    prev = p;
  }
  // a wash line where the water meets the paper
  for (let k = 0; k < n; k += 11) {
    pen.stroke(edge.slice(k, Math.min(n + 1, k + 12)), { w: 0.16, color: C.waterDeep, kind: L_MARK, wobble: 1.5, alpha: 0.75 });
  }
  // ripples
  const gt = pen.floor(WATER, 1);
  const cell = 22;
  for (let x = -90; x < GRID + 30; x += cell) {
    for (let y = -30; y < GRID + 30; y += cell) {
      gt.ticks(x, y, x + cell, y + cell, {
        n: 26,
        len: 1.5,
        ang: -Math.PI / 4,
        jit: 0.08,
        bend: 0.22,
        color: C.waterInk,
        w: 0.075,
        kind: L_RIPPLE,
        alpha: 0.75,
        inside: (a, b) => inWater(a, b) && !onBlock(a, b, 0.8),
      });
    }
  }
}

/** The slab a block stands on: quay walls down to the water, a paved top with a kerb line. */
function slab(pen: Pen, c: BlockCtx): void {
  pen.reveal = () => c.t;
  pen.begin();
  pen.box(0, 0, WATER, BLOCK, BLOCK, -WATER, C.quay, { top: C.paving });
  for (const side of ["x+", "y+"] as const) {
    const f = pen.wall(side, 0, 0, WATER, BLOCK, BLOCK);
    f.rect(0, -WATER - 0.42, BLOCK, -WATER, C.quayCap, { grain: 0.5 });
    f.seg(0, -WATER - 0.42, BLOCK, -WATER - 0.42, { w: 0.07 });
    bricks(f, 0.3, 0.15, BLOCK - 0.3, -WATER - 0.55, C.quayDark, 0.55);
    f.seg(0, 0.02, BLOCK, 0.02, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
  }
  const g = pen.floor(0, 1);
  g.loop(
    [
      [0.62, 0.62],
      [BLOCK - 0.62, 0.62],
      [BLOCK - 0.62, BLOCK - 0.62],
      [0.62, BLOCK - 0.62],
    ],
    { w: 0.07 },
  );
  pen.end();
}

/** A block that is partly water: lay water under it, then each piece of land with its quay walls. */
function landSlab(pen: Pen, c: BlockCtx, land: V2[][]): void {
  pen.reveal = () => c.t - 0.15;
  pen.floor(WATER, 0).rect(-0.3, -0.3, BLOCK + 0.3, BLOCK + 0.3, C.water, { kind: F_WATER });
  pen.floor(WATER, 1).ticks(0, 0, BLOCK, BLOCK, {
    n: 90,
    len: 1.5,
    ang: -Math.PI / 4,
    jit: 0.08,
    bend: 0.22,
    color: C.waterInk,
    w: 0.075,
    kind: L_RIPPLE,
    alpha: 0.75,
  });
  pen.reveal = () => c.t;
  for (const foot of land) {
    pen.begin();
    pen.extrude(foot, WATER, 0, C.quay, { top: C.paving });
    const n = foot.length;
    let area = 0;
    for (let k = 0; k < n; k++) area += foot[k][0] * foot[(k + 1) % n][1] - foot[(k + 1) % n][0] * foot[k][1];
    for (let k = 0; k < n; k++) {
      const a = area > 0 ? foot[k] : foot[(k + 1) % n];
      const b = area > 0 ? foot[(k + 1) % n] : foot[k];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // only the walls that face the camera, and only square-on ones, get the stone cap and brick
      let f = null;
      if (Math.abs(a[0] - b[0]) < 1e-6 && b[1] > a[1]) f = pen.wall("x+", a[0], a[1], WATER, 0, len);
      else if (Math.abs(a[1] - b[1]) < 1e-6 && b[0] < a[0]) f = pen.wall("y+", b[0], a[1], WATER, len, 0);
      if (!f) continue;
      f.rect(0, -WATER - 0.42, len, -WATER, C.quayCap, { grain: 0.5 });
      f.seg(0, -WATER - 0.42, len, -WATER - 0.42, { w: 0.07 });
      bricks(f, 0.3, 0.15, len - 0.3, -WATER - 0.55, C.quayDark, 0.55);
      f.seg(0, 0.02, len, 0.02, { w: 0.2, color: C.waterDeep, kind: L_MARK, wobble: 0.6 });
    }
    pen.end();
  }
}

/**
 * Canal-side dressing for one edge of a block: a brick street, elms on the
 * waterside with bikes parked between them, lamps, bollards and a few people.
 */
function dressQuay(c: BlockCtx, side: "xp" | "xm" | "yp" | "ym", viaduct: boolean): void {
  const { pen, rng } = c;
  // work in a frame where the edge runs along local +x at y = 0 and the block is on +y
  const frames: Record<string, [number, number, number]> = {
    ym: [0, 0, 0],
    xp: [BLOCK, 0, 90],
    yp: [BLOCK, BLOCK, 180],
    xm: [0, BLOCK, 270],
  };
  const [fx, fy, rot] = frames[side];
  const clear = RAIL_X1 + 1.3;
  // keep clear of the bridge landing, and of the railway viaduct where there is one
  const taken = (a: number) =>
    Math.abs(a - LANDING) < BRIDGE_W / 2 + 1.4 || (viaduct && ((side === "ym" && a < clear) || (side === "yp" && a > BLOCK - clear)));
  pen.push(fx, fy, 0, rot);
  c.early(() => {
    const g = pen.floor(0, 1);
    g.rect(0.62, 0.62, BLOCK - 0.62, QUAY, C.street);
    g.seg(0.62, QUAY, BLOCK - 0.62, QUAY, { w: 0.07, color: C.streetDark, kind: L_MARK });
    speckle(pen.floor(0, 2), 1, 3.6, BLOCK - 1, QUAY - 0.2, C.streetDark, 0.5);
  });
  const trees: number[] = [];
  for (let a = 3.6; a < BLOCK - 3; a += rng.range(6.2, 7.6)) {
    if (taken(a)) continue;
    trees.push(a);
    tree(pen, rng, a, 1.7, { kind: "elm" });
  }
  for (let k = 0; k + 1 < trees.length; k++) {
    const a0 = trees[k] + 1.1;
    const a1 = trees[k + 1] - 1.1;
    if (a1 - a0 < 2 || a1 - a0 > 7 || taken((a0 + a1) / 2) || rng.chance(0.45)) continue;
    bikeRow(pen, rng, a0, 2.05, Math.floor((a1 - a0) / 0.62), 270, 0.62);
  }
  for (let a = 9; a < BLOCK - 6; a += 12) {
    if (taken(a)) continue;
    lamp(pen, a + rng.range(-0.6, 0.6), 3.5);
  }
  for (let a = 2.4; a < BLOCK - 2; a += 2.7) {
    if (taken(a) || rng.chance(0.3)) continue;
    bollard(pen, a, 3.55);
  }
  for (let k = 0; k < 3; k++) {
    const a = rng.range(4, BLOCK - 4);
    if (taken(a)) continue;
    const sit = rng.chance(0.5);
    person(pen, a, sit ? 0.5 : rng.range(0.9, 1.2), sit ? -0.35 : 0, randomLook(rng), sit ? "sit" : rng.pick(["stand", "wave"]), rng.chance(0.5));
  }
  pen.pop();
}

/** The railway: a brick arcade across the three north-west blocks, girders over the water between. */
function railway(pen: Pen, tOf: (j: number) => number): void {
  const x0 = RAIL_X0;
  const x1 = RAIL_X1;
  const w = x1 - x0;
  const brick = C.brickRose;
  const rails = (ya: number, yb: number) => {
    for (const tx of TRACKS) {
      for (const s of [-0.55, 0.55]) {
        pen.stroke(
          [
            [tx + s, ya, RAIL_Z + 0.04],
            [tx + s, yb, RAIL_Z + 0.04],
          ],
          { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2 },
        );
      }
      for (let y = ya + 0.4; y < yb; y += 1.0) {
        pen.stroke(
          [
            [tx - 0.85, y, RAIL_Z + 0.02],
            [tx + 0.85, y, RAIL_Z + 0.02],
          ],
          { w: 0.11, color: C.woodDark, kind: L_MARK, wobble: 0, alpha: 0.8 },
        );
      }
    }
  };
  const masts = (ya: number, yb: number) => {
    for (let y = ya + 3; y < yb - 1; y += 11.5) {
      pen.begin();
      for (const x of [x0 + 0.25, x1 - 0.25]) {
        pen.stroke(
          [
            [x, y, RAIL_Z],
            [x, y, RAIL_Z + 4.2],
          ],
          { w: 0.11, color: C.greyDark, kind: L_BAR, wobble: 0 },
        );
      }
      pen.stroke(
        [
          [x0 + 0.25, y, RAIL_Z + 4.2],
          [x1 - 0.25, y, RAIL_Z + 4.2],
        ],
        { w: 0.09, color: C.greyDark, kind: L_BAR, wobble: 0 },
      );
      pen.end();
    }
    for (const tx of TRACKS) {
      pen.stroke(
        [
          [tx, ya, RAIL_Z + 3.9],
          [tx, yb, RAIL_Z + 3.9],
        ],
        { w: 0.04, color: C.inkSoft, kind: L_BAR, wobble: 0, alpha: 0.7 },
      );
    }
  };
  const girder = (ya: number, yb: number, t: number) => {
    pen.reveal = () => t;
    pen.begin();
    pen.box(x0 + 0.2, ya, RAIL_Z - 0.7, w - 0.4, yb - ya, 0.7, C.copperDark, { top: C.ballast });
    const f = pen.wall("x+", x0 + 0.2, ya, RAIL_Z - 0.7, w - 0.4, yb - ya);
    for (let a = 0.8; a < yb - ya; a += 1.3) f.seg(a, 0.05, a, 0.65, { w: 0.06, wobble: 0 });
    f.seg(0, 0.7, yb - ya, 0.7, { w: 0.14, color: C.copperDark, kind: L_MARK, wobble: 0 });
    pen.stroke(
      [
        [x1 - 0.2, ya, RAIL_Z + 0.9],
        [x1 - 0.2, yb, RAIL_Z + 0.9],
      ],
      { w: 0.09, color: C.copperDark, kind: L_BAR, wobble: 0 },
    );
    for (let y = ya; y <= yb + 0.01; y += (yb - ya) / 6) {
      pen.stroke(
        [
          [x1 - 0.2, y, RAIL_Z],
          [x1 - 0.2, y, RAIL_Z + 0.9],
        ],
        { w: 0.08, color: C.copperDark, kind: L_BAR, wobble: 0 },
      );
    }
    rails(ya, yb);
    masts(ya, yb);
    pen.end();
  };
  for (let j = 0; j < 3; j++) {
    const y0 = j * PITCH + 0.62;
    const len = BLOCK - 1.24;
    const t = tOf(j) + 0.45;
    pen.reveal = (_x, y) => t + ((y - y0) / len) * 0.9;
    // the arcade, in bays so it draws itself along its length
    const bays = 11;
    const bw = len / bays;
    for (let k = 0; k < bays; k++) {
      const ya = y0 + k * bw;
      pen.begin();
      pen.box(x0, ya, 0, w, bw, RAIL_Z, brick, { top: C.ballast });
      const f = pen.wall("x+", x0, ya, 0, w, bw);
      const arch: V2[] = [
        [0.55, 0],
        [bw - 0.55, 0],
        [bw - 0.55, 1.35],
      ];
      for (let q = 1; q <= 6; q++) {
        const th = (q / 7) * Math.PI;
        arch.push([bw / 2 + Math.cos(th) * (bw / 2 - 0.55), 1.35 + Math.sin(th) * 1.0]);
      }
      arch.push([0.55, 1.35]);
      const shop = (k * 7 + j * 3) % 5 === 1;
      f.poly(arch, shop ? C.glassLight : C.brickBrown, { outline: true, w: 0.08, glow: shop ? 0.9 : 0, grain: 0.7 });
      f.rect(0, RAIL_Z - 0.32, bw, RAIL_Z, C.quayCap, { grain: 0.5 });
      f.seg(0, RAIL_Z - 0.32, bw, RAIL_Z - 0.32, { w: 0.06 });
      pen.end();
    }
    pen.obj(() => {
      rails(y0, y0 + len);
      masts(y0, y0 + len);
    });
    // girder to the next block, or out over the ring
    if (j < 2) girder(y0 + len, (j + 1) * PITCH + 0.62, Math.max(tOf(j), tOf(j + 1)) + 1.0);
  }
  // out over the ring at both ends, then the line trails off as an unfinished sketch
  const [yTop, yBot] = railShores();
  girder(yTop, 0.62, tOf(0) + 1.2);
  girder(GRID - 0.62, yBot, tOf(2) + 1.2);
  for (const [ya, yb, t] of [
    [yTop, yTop - 30, tOf(0) + 1.6],
    [yBot, yBot + 30, tOf(2) + 1.6],
  ] as const) {
    pen.reveal = () => t;
    pen.begin();
    for (const tx of TRACKS) {
      for (const s of [-0.55, 0.55]) {
        for (let k = 0; k < 10; k++) {
          const a = ya + ((yb - ya) * k) / 10;
          const b = ya + ((yb - ya) * (k + 0.62)) / 10;
          const za = RAIL_Z - ((RAIL_Z - WATER) * k) / 10;
          const zb = RAIL_Z - ((RAIL_Z - WATER) * (k + 0.62)) / 10;
          pen.stroke(
            [
              [tx + s, a, za],
              [tx + s, b, zb],
            ],
            { w: 0.07, color: C.inkSoft, kind: L_MARK, wobble: 1.4, alpha: 0.85 * (1 - k / 10.5) },
          );
        }
      }
    }
    pen.end();
  }
}

/** World y where the railway meets the shore at the top and bottom of the drawing. */
function railShores(): [number, number] {
  const x = (TRACKS[0] + TRACKS[1]) / 2;
  let a = 0;
  while (a > -60 && inWater(x, a)) a -= 0.25;
  let b = GRID;
  while (b < GRID + 60 && inWater(x, b)) b += 0.25;
  return [a + 1.2, b - 1.2];
}

/** Where the railway trails off the drawing at each end (world y): trains appear and vanish here. */
export function railEnds(): [number, number] {
  const [a, b] = railShores();
  return [a - 30, b + 30];
}

/** The path that hugs the four quays around the canal crossing between blocks (a..a+1, b..b+1). */
function quayLoop(a: number, b: number): V3[] {
  const cx = a * PITCH + BLOCK + LANE / 2;
  const cy = b * PITCH + BLOCK + LANE / 2;
  const h = LANE / 2 + QUAY_LINE;
  const yN = b * PITCH + LANDING;
  const yS = (b + 1) * PITCH + LANDING;
  const xW = a * PITCH + LANDING;
  const xE = (a + 1) * PITCH + LANDING;
  return [
    [cx - h, yN, 0],
    [cx + h, yN, 0],
    [cx + h, cy - h, 0],
    [xE, cy - h, 0],
    [xE, cy + h, 0],
    [cx + h, cy + h, 0],
    [cx + h, yS, 0],
    [cx - h, yS, 0],
    [cx - h, cy + h, 0],
    [xW, cy + h, 0],
    [xW, cy - h, 0],
    [cx - h, cy - h, 0],
  ];
}

function landRoute(pts: V3[], off: number, reverse: boolean): Route {
  const p = reverse ? pts.slice().reverse() : pts;
  return new Route(drape(rounded(offsetLoop(p, off), true, 1.1), true, groundZ, 0.7), true);
}

/** The water round one block: down the middle of each canal, six units out where it meets the ring. */
function blockLoop(i: number, j: number): Route {
  const L = [-6, BLOCK + LANE / 2, PITCH + BLOCK + LANE / 2, GRID + 6];
  const p: V3[] = [
    [L[i], L[j], WATER],
    [L[i + 1], L[j], WATER],
    [L[i + 1], L[j + 1], WATER],
    [L[i], L[j + 1], WATER],
  ];
  // keeping right puts each boat in the half of the canal away from its own block
  return new Route(rounded(offsetLoop(p, 1.6), true, 3.6), true);
}

interface Hull {
  route: Route;
  /** Place on the route at t = 0, as a fraction of its length. */
  at: number;
  /** Half length and half width, with a little room to spare. */
  a: number;
  b: number;
  span: number;
}

const BOAT_SPEED = 3;
/** How many seconds of the timeline the canal boats are checked against each other for. One loop must fit inside it. */
export const BOAT_HORIZON = 120;
const HP: V3 = [0, 0, 0];

/** Do two boats overlap at time t? Each is a rectangle lying along its heading. */
function touching(p: Hull, q: Hull, t: number): boolean {
  const sp = p.at * p.route.length + BOAT_SPEED * t;
  const sq = q.at * q.route.length + BOAT_SPEED * t;
  p.route.pos(sp, HP);
  const px = HP[0];
  const py = HP[1];
  q.route.pos(sq, HP);
  const dx = HP[0] - px;
  const dy = HP[1] - py;
  const reach = p.a + q.a;
  if (dx * dx + dy * dy > reach * reach) return false;
  const hp = p.route.heading(sp, p.span);
  const hq = q.route.heading(sq, q.span);
  const ux = Math.cos(hp);
  const uy = Math.sin(hp);
  const vx = Math.cos(hq);
  const vy = Math.sin(hq);
  // separating axes: along and across each boat
  const dot = Math.abs(ux * vx + uy * vy);
  const crs = Math.abs(ux * vy - uy * vx);
  if (Math.abs(dx * ux + dy * uy) > p.a + q.a * dot + q.b * crs) return false;
  if (Math.abs(-dx * uy + dy * ux) > p.b + q.a * crs + q.b * dot) return false;
  if (Math.abs(dx * vx + dy * vy) > q.a + p.a * dot + p.b * crs) return false;
  if (Math.abs(-dx * vy + dy * vx) > q.b + p.a * crs + p.b * dot) return false;
  return true;
}

/**
 * Boats on the canals, bikes and walkers on the quays, the tram between
 * Centraal and the Dam. Returns how many times two canal boats still meet
 * (none, unless the plan changes).
 */
function traffic(pen: Pen, movers: Mover[], born: number): number {
  const rng = new Rng(8086);
  const start = () => born + rng.range(0, 1.6);
  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      const loop = quayLoop(a, b);
      const tramLoop = a === 0 && b === 0;
      const fwd = landRoute(loop, 0.62, false);
      const back = landRoute(loop, 0.62, true);
      if (tramLoop) {
        // rails, and two trams that share the lane with a few cyclists keeping their distance
        pen.reveal = () => born - 1.2;
        pen.begin();
        for (const o of [0.1, 1.14]) {
          const rail = drape(rounded(offsetLoop(loop, o), true, 1.1), true, groundZ, 0.9);
          rail.push(rail[0]);
          pen.strokeW(
            rail.map((p) => [p[0], p[1], p[2] + 0.03] as V3),
            { w: 0.075, color: C.greyDark, kind: L_MARK, wobble: 0.2, layer: 3 },
          );
        }
        pen.end();
        movers.push(tram(fwd, 0.08, born + 0.3, 5.2));
        movers.push(tram(fwd, 0.58, born + 0.9, 5.2));
        for (const at of [0.22, 0.32, 0.43, 0.74, 0.86, 0.95]) movers.push(cyclist(fwd, rng, start(), 5.2, at));
      } else {
        for (let k = 0; k < 6; k++) movers.push(cyclist(fwd, rng, start()));
      }
      for (let k = 0; k < 6; k++) movers.push(cyclist(back, rng, start()));
      const w1 = landRoute(loop, 1.75, false);
      const w2 = landRoute(loop, 1.75, true);
      for (let k = 0; k < 5; k++) movers.push(walker(w1, rng, start()));
      for (let k = 0; k < 5; k++) movers.push(walker(w2, rng, start()));
    }
  }
  // Canal boats circle one block each: the Dam and the three blocks beside it
  // that have open water on their outer side. Every loop turns the same way,
  // so two loops only ever share a canal in opposite lanes. Their paths do
  // cross at the junctions, so each loop's boats are slid along it until no
  // two boats are ever in the same place at the same time. That only works
  // because every loop is the same length and carries the same number of
  // boats at the same speed: the gaps between them then stay in step.
  const fleets: [number, number, ("cruise" | "sloep")[]][] = [
    [1, 1, ["cruise", "sloep", "cruise", "sloep"]],
    [1, 0, ["sloep", "cruise", "sloep", "sloep"]],
    [2, 1, ["cruise", "sloep", "sloep", "sloep"]],
    [1, 2, ["sloep", "sloep", "cruise", "sloep"]],
  ];
  const STEP = 0.35;
  const from = born - 1;
  const steps = Math.ceil((BOAT_HORIZON - from) / STEP);
  /** Where a boat is at every step of the timeline. */
  const track = (h: Hull): Float32Array => {
    const out = new Float32Array(steps * 2);
    for (let k = 0; k < steps; k++) {
      h.route.pos(h.at * h.route.length + BOAT_SPEED * (from + k * STEP), HP);
      out[k * 2] = HP[0];
      out[k * 2 + 1] = HP[1];
    }
    return out;
  };
  const afloat: { hull: Hull; path: Float32Array }[] = [];
  let clashes = 0;
  for (const [i, j, kinds] of fleets) {
    const route = blockLoop(i, j);
    const n = kinds.length;
    const crew = (shift: number): Hull[] =>
      kinds.map((k, q) => ({
        route,
        at: shift + q / n,
        a: (k === "cruise" ? 11.5 : 5.6) / 2 + 0.9,
        b: (k === "cruise" ? 2.8 : 2.1) / 2 + 0.12,
        span: k === "cruise" ? 5 : 3,
      }));
    /** How many moments this crew spends inside a boat that is already out there. */
    const hitsOf = (cand: Hull[]): number => {
      let hits = 0;
      for (const h of cand) {
        const path = track(h);
        for (const o of afloat) {
          const reach = (h.a + o.hull.a) * (h.a + o.hull.a);
          for (let k = 0; k < steps; k++) {
            const dx = o.path[k * 2] - path[k * 2];
            const dy = o.path[k * 2 + 1] - path[k * 2 + 1];
            if (dx * dx + dy * dy < reach && touching(h, o.hull, from + k * STEP)) hits++;
          }
        }
      }
      return hits;
    };
    // try the crew at every position along one gap, and take the middle of the widest clear stretch
    const tries = afloat.length ? 32 : 1;
    const hits: number[] = [];
    for (let c = 0; c < tries; c++) hits.push(hitsOf(crew(c / tries / n)));
    let pick = 0;
    let run = 0;
    let bestRun = 0;
    for (let c = 0; c < tries * 2; c++) {
      if (hits[c % tries] === 0) {
        run++;
        if (run > bestRun && run <= tries) {
          bestRun = run;
          pick = c - (run - 1) / 2;
        }
      } else run = 0;
    }
    if (bestRun === 0) {
      pick = hits.indexOf(Math.min(...hits));
      clashes += hits[pick];
    }
    crew((pick % tries) / tries / n).forEach((h, q) => {
      afloat.push({ hull: h, path: track(h) });
      movers.push(boat(route, rng, start(), kinds[q], BOAT_SPEED, h.at));
    });
  }
  return clashes;
}

/** Boats tied up along the quays of every canal between two blocks. */
function moorings(pen: Pen, tAt: (i: number, j: number) => number): void {
  const rng = new Rng(2024);
  const tie = (x: number, y: number, rot: number, t: number) => {
    pen.reveal = () => t + rng.range(0, 0.5);
    pen.push(x, y, WATER, rot + rng.range(-4, 4));
    const k = rng.next();
    if (k < 0.5) sloep(pen, rng, { color: rng.pick(BOAT), crew: [], flag: null });
    else if (k < 0.82) dinghy(pen, rng, rng.pick([C.wood, C.red, C.blue, C.white, C.green]), 0);
    else sloep(pen, rng, { color: rng.pick(BOAT), flag: C.orange });
    pen.pop();
  };
  // two stretches per bank, either side of the bridge; two berths in each
  const berths = [7, 13.5, 34.5, 41];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i < 2) {
        const x0 = i * PITCH + BLOCK;
        const t = Math.max(tAt(i, j), tAt(i + 1, j)) + 1.5;
        for (const b of berths) {
          if (rng.chance(0.5)) tie(x0 + 1.35, j * PITCH + b + rng.range(-0.4, 0.4), 90, t);
          if (rng.chance(0.5)) tie(x0 + LANE - 1.35, j * PITCH + b + rng.range(-0.4, 0.4), 270, t);
        }
      }
      if (j < 2) {
        const y0 = j * PITCH + BLOCK;
        const t = Math.max(tAt(i, j), tAt(i, j + 1)) + 1.5;
        for (const b of berths) {
          if (rng.chance(0.5)) tie(i * PITCH + b + rng.range(-0.4, 0.4), y0 + 1.35, 180, t);
          if (rng.chance(0.5)) tie(i * PITCH + b + rng.range(-0.4, 0.4), y0 + LANE - 1.35, 0, t);
        }
      }
    }
  }
}

/** Once it is dark: fireworks over the city. Each rocket climbs, bursts into a ring of sparks, and droops. */
function fireworks(movers: Mover[]): void {
  const rng = new Rng(1231);
  const colours: [number, number, number][] = [
    [255, 214, 120],
    [255, 120, 96],
    [255, 255, 255],
    [140, 230, 170],
    [255, 150, 205],
    [150, 200, 255],
  ];
  const k = 1 / (2 * C30);
  const shells: { at: number; x: number; y: number; z: number; r: number; c: [number, number, number]; c2: [number, number, number]; n: number; spin: number }[] = [];
  for (let i = 0; i < 20; i++) {
    // spread across the sky over the city, as the page sees it
    const px = rng.range(-150, 150);
    const py = rng.range(4, 100);
    const z = rng.range(36, 54);
    const a = px * k;
    const b = py + z;
    shells.push({
      at: 0.15 + i * 0.36 + rng.range(-0.12, 0.12),
      x: a + b,
      y: b - a,
      z,
      r: rng.range(11, 19),
      c: rng.pick(colours),
      c2: rng.pick(colours),
      n: rng.int(18, 26),
      spin: rng.range(0, 1),
    });
  }
  movers.push((m) => {
    if (m.night < 0.5) return;
    const tau = m.t - m.nightAt;
    for (const s of shells) {
      const u = tau - s.at;
      if (u < -0.55 || u > 1.7) continue;
      if (!m.sees(s.x, s.y, s.z, 40)) continue;
      if (u < 0) {
        // the rocket on its way up
        const f = 1 + u / 0.55;
        const z1 = WATER + (s.z - WATER) * (1 - (1 - f) * (1 - f));
        m.pen.stroke(
          [
            [s.x, s.y, Math.max(WATER, z1 - 3.5)],
            [s.x, s.y, z1],
          ],
          { w: 0.32, color: [255, 236, 190], kind: L_SPARK, wobble: 0, alpha: 0.9 },
        );
        continue;
      }
      const grow = 1 - Math.exp(-3.4 * u);
      const fade = Math.pow(Math.max(0, 1 - u / 1.7), 1.4);
      const drop = 2.6 * u * u;
      for (let ring = 0; ring < 2; ring++) {
        const R = s.r * grow * (ring ? 0.55 : 1);
        const col = ring ? s.c2 : s.c;
        const n = ring ? Math.round(s.n * 0.6) : s.n;
        for (let q = 0; q < n; q++) {
          const a = ((q + s.spin + ring * 0.5) / n) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const r0 = R * 0.7;
          m.pen.stroke(
            [
              [s.x + ca * r0 * k, s.y - ca * r0 * k, s.z + sa * r0 - drop],
              [s.x + ca * R * k, s.y - ca * R * k, s.z + sa * R - drop],
            ],
            { w: ring ? 0.3 : 0.4, color: col, kind: L_SPARK, wobble: 0, alpha: fade },
          );
          // a bright bead at the tip of each spark
          if (!ring) {
            m.pen.stroke(
              [
                [s.x + ca * R * 0.985 * k, s.y - ca * R * 0.985 * k, s.z + sa * R * 0.985 - drop],
                [s.x + ca * R * k, s.y - ca * R * k, s.z + sa * R - drop],
              ],
              { w: 0.7, color: [255, 250, 235], kind: L_SPARK, wobble: 0, alpha: fade },
            );
          }
        }
      }
    }
  });
}

export function blockOrigin(i: number, j: number): V2 {
  return [i * PITCH, j * PITCH];
}

function makeCtx(
  pen: Pen,
  rng: Rng,
  ox: number,
  oy: number,
  oz: number,
  t: number,
  movers: Mover[],
  quay: BlockCtx["quay"],
  span: number,
  stop: Stop,
): BlockCtx {
  const sweep = 1.25;
  const jit = new Rng(Math.floor(ox * 7 + oy * 13 + 5));
  const normal = (x: number, y: number) => t + 0.5 + ((x - ox + (y - oy)) / (2 * span)) * sweep + jit.range(-0.07, 0.07);
  const c: BlockCtx = {
    pen,
    rng,
    ox,
    oy,
    oz,
    t,
    done: t + 0.5 + sweep + 1.15,
    movers,
    quay,
    early(fn) {
      const keep = pen.reveal;
      pen.reveal = (x, y) => t + 0.22 + ((x - ox + (y - oy)) / (2 * span)) * 0.5;
      fn();
      pen.reveal = keep;
    },
    focus(x, y, zoom = 1) {
      stop.x = ox + x;
      stop.y = oy + y;
      stop.zoom = zoom;
    },
    visit: () => stop.at ?? null,
  };
  pen.reveal = normal;
  return c;
}

export function buildCity(blocks: BlockDef[], islets: IsletDef[]): City {
  const mesh = new Mesh(1 << 18, 1 << 18);
  const pen = new Pen(mesh, 1971);
  const movers: Mover[] = [];
  const stops: Stop[] = [];
  let done = 0;

  water(pen);

  const tOf = new Map<string, number>();
  for (const b of blocks) tOf.set(b.i + "," + b.j, b.t);
  const tAt = (i: number, j: number) => tOf.get(i + "," + j) ?? 0.5;

  for (const b of blocks) {
    const [ox, oy] = blockOrigin(b.i, b.j);
    const rng = new Rng(1000 + b.i * 31 + b.j * 97);
    pen.rng = rng.fork();
    const quay = { xm: b.i > 0, xp: b.i < 2, ym: b.j > 0, yp: b.j < 2 };
    const stop: Stop = { id: b.id, name: b.name, note: b.note, x: ox + BLOCK / 2, y: oy + BLOCK / 2, zoom: 1 };
    pen.push(ox, oy, 0);
    const c = makeCtx(pen, rng, ox, oy, 0, b.t, movers, quay, BLOCK, stop);
    const normal = pen.reveal;
    if (b.land) landSlab(pen, c, b.land);
    else slab(pen, c);
    pen.reveal = normal;
    const viaduct = b.i === 0;
    if (quay.ym) dressQuay(c, "ym", viaduct);
    if (quay.xm) dressQuay(c, "xm", viaduct);
    if (quay.xp) dressQuay(c, "xp", viaduct);
    if (quay.yp) dressQuay(c, "yp", viaduct);
    b.build(c);
    pen.pop();
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  // bridges: one across every canal between two neighbouring blocks
  const brng = new Rng(77);
  pen.rng = brng.fork();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i < 2) {
        const t = Math.max(tAt(i, j), tAt(i + 1, j)) + 0.9;
        pen.reveal = () => t;
        pen.push(i * PITCH + BLOCK, j * PITCH + LANDING - BRIDGE_W / 2, 0, 0);
        bridge(pen, brng, LANE, BRIDGE_W, { water: -WATER, hump: HUMP });
        pen.pop();
        done = Math.max(done, t + 1.2);
      }
      if (j < 2) {
        const t = Math.max(tAt(i, j), tAt(i, j + 1)) + 0.9;
        pen.reveal = () => t;
        pen.push(i * PITCH + LANDING + BRIDGE_W / 2, j * PITCH + BLOCK, 0, 90);
        bridge(pen, brng, LANE, BRIDGE_W, { water: -WATER, hump: HUMP });
        pen.pop();
        done = Math.max(done, t + 1.2);
      }
    }
  }

  pen.rng = new Rng(4711);
  railway(pen, (j) => tAt(0, j));
  pen.rng = new Rng(9001);
  moorings(pen, tAt);

  for (const s of islets) {
    const rng = new Rng(5000 + Math.floor(s.x * 3 + s.y * 7));
    pen.rng = rng.fork();
    const stop: Stop = { id: s.id, name: s.name, note: s.note, x: s.x, y: s.y, zoom: 1.2, quick: true };
    pen.push(s.x - 20, s.y - 20, WATER);
    const c = makeCtx(pen, rng, s.x - 20, s.y - 20, WATER, s.t, movers, { xm: false, xp: false, ym: false, yp: false }, 40, stop);
    const first = mesh.fn;
    s.build(c);
    pen.pop();
    // Frame the island by what was actually drawn: fill most of the view, unless its builder asked for a closer one.
    let ix0 = Infinity;
    let iy0 = Infinity;
    let ix1 = -Infinity;
    let iy1 = -Infinity;
    for (let k = first * 6; k < mesh.fn * 6; k += 6) {
      const px = paperX(mesh.fv[k], mesh.fv[k + 1]);
      const py = paperY(mesh.fv[k], mesh.fv[k + 1], mesh.fv[k + 2]);
      if (px < ix0) ix0 = px;
      if (px > ix1) ix1 = px;
      if (py < iy0) iy0 = py;
      if (py > iy1) iy1 = py;
    }
    if (ix1 > ix0) {
      // a tour stop at zoom 1 shows about 104 x 66 units
      const fit = Math.min((104 * 0.76) / (ix1 - ix0), (66 * 0.74) / (iy1 - iy0), 1.9);
      if (fit > stop.zoom) {
        stop.zoom = fit;
        // the camera aims 4.5 units above the ground point it is given
        const a = (ix0 + ix1) / 2 / (2 * C30);
        const g = (iy0 + iy1) / 2 + 4.5;
        stop.x = a + g;
        stop.y = g - a;
      }
    }
    done = Math.max(done, c.done);
    stops.push(stop);
  }

  pen.rng = new Rng(31337);
  const boatClashes = traffic(pen, movers, done - 0.6);
  fireworks(movers);

  // paper bounds of the drawing
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const fv = mesh.fv;
  for (let k = 0; k < mesh.fn * 6; k += 6) {
    const px = paperX(fv[k], fv[k + 1]);
    const py = paperY(fv[k], fv[k + 1], fv[k + 2]);
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
  }
  night(pen, { x0, y0, x1, y1 }, islets);
  // when the last thing to be drawn in has all its colour (a second after it starts)
  // (the buffers are looked up afresh: adding the stars may have moved them)
  let latest = 0;
  const fv2 = mesh.fv;
  for (let k = 3; k < mesh.fn * 6; k += 6) if (fv2[k] > latest) latest = fv2[k];
  const lv = mesh.lv;
  for (let k = 6; k < mesh.ln * 12; k += 12) if (lv[k] > latest) latest = lv[k];
  return { mesh, movers, stops, bounds: { x0, y0, x1, y1 }, done, settled: latest + 1.05, boatClashes };
}

/**
 * Things that only show after dark: stars scattered over the bare paper and
 * a crescent moon. They are drawn in the paper's own colour, so by day they
 * cannot be seen; at night anything that glows turns to warm light.
 */
function night(pen: Pen, b: { x0: number; y0: number; x1: number; y1: number }, islets: IsletDef[]): void {
  const rng = new Rng(1234);
  const paper: [number, number, number] = [243, 239, 228];
  const z = WATER + 0.02;
  pen.reveal = () => 0;
  const world = (px: number, py: number): V2 => {
    const a = px / (2 * C30);
    const c = py + z;
    return [a + c, c - a];
  };
  const free = (x: number, y: number) => {
    const dx = x - MID;
    const dy = y - MID;
    if (Math.hypot(dx, dy) < shore(Math.atan2(dy, dx)) + 3) return false;
    for (const s of islets) if (Math.hypot(x - s.x, y - s.y) < 27) return false;
    return true;
  };
  for (let k = 0; k < 420; k++) {
    const px = rng.range(b.x0, b.x1);
    const py = rng.range(b.y0, b.y1);
    const [x, y] = world(px, py);
    if (!free(x, y)) continue;
    const r = rng.chance(0.12) ? rng.range(0.5, 0.75) : rng.range(0.18, 0.4);
    const c = pen.card(x, y, z);
    // a four-pointed star
    c.poly(
      [
        [0, r],
        [r * 0.22, r * 0.22],
        [r, 0],
        [r * 0.22, -r * 0.22],
        [0, -r],
        [-r * 0.22, -r * 0.22],
        [-r, 0],
        [-r * 0.22, r * 0.22],
      ],
      paper,
      { glow: 1, grain: 0, shade: false },
    );
  }
  // the moon, top right of the city
  const [mx, my] = world(b.x0 + (b.x1 - b.x0) * 0.66, b.y0 + 9);
  const moon: V2[] = [];
  const R = 5.2;
  for (let k = 0; k <= 16; k++) {
    const t = -Math.PI / 2 + (k / 16) * Math.PI;
    moon.push([Math.cos(t) * R, Math.sin(t) * R]);
  }
  for (let k = 16; k >= 0; k--) {
    const t = -Math.PI / 2 + (k / 16) * Math.PI;
    moon.push([Math.cos(t) * R * 0.52 - R * 0.12, Math.sin(t) * R]);
  }
  pen.card(mx, my, z).poly(moon, paper, { glow: 1, grain: 0, shade: false });
}
