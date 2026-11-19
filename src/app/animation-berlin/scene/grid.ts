// Where everything is: the grid of blocks, the streets between them, the
// Spree and its island, and the tests the rest of the scene asks of a point
// ("is this water?", "is this a block?"). Numbers only; nothing is drawn here.
//
// Block (i, j) runs from world (COL_X[i], ROW_Y[j]) to that plus BLOCK in x
// and y. World +x runs to the lower right of the page (east), +y to the lower
// left (south), z up. The camera sees +x faces, +y faces and tops.
//
// The land is one base (road surface at z = 0) in two pieces, west and east of
// the river, with a ring road round the outside; blocks stand CURB higher.
// The river lies WATER below the road, on the paper itself, and runs on over
// the paper past both ends of the base.

import { V2, smooth } from "../engine/math";
import { FRAME } from "./frame";

export const STREETS = FRAME.lanes === "street";
export const COLS = FRAME.cols;
export const ROWS = FRAME.rows;
export const BLOCK = FRAME.block;
export const LANE = FRAME.lane;
/** A block and a street: the step from one row to the next (columns step further across the river). */
export const PITCH = BLOCK + LANE;
export const RIVER = FRAME.river.width;
const AFTER = FRAME.river.after;

/** World x of each column's far edge, and world y of each row's. */
export const COL_X: number[] = [];
{
  let x = 0;
  for (let i = 0; i < COLS; i++) {
    COL_X.push(x);
    x += BLOCK + (i === AFTER ? RIVER : LANE);
  }
}
export const ROW_Y: number[] = Array.from({ length: ROWS }, (_, j) => j * PITCH);
export const GRID_X = COL_X[COLS - 1] + BLOCK;
export const GRID_Y = ROW_Y[ROWS - 1] + BLOCK;
export const MID_X = GRID_X / 2;
export const MID_Y = GRID_Y / 2;

/** Water level below the road. The paper itself is at this height. */
export const WATER = -3;
/** How far a block (its sidewalk) stands above the road. */
export const CURB = 0.3;
/** Width of the ring road the base runs round the outside of the grid. */
export const MARGIN = LANE;
/** Width of the strip the city lays along each block edge (a sidewalk, or the riverside walk): places keep off it. */
export const QUAY = 3.6;
/** Where walkers go along that strip, measured in from the block edge. */
export const QUAY_LINE = 2.4;
/** The edges of the base. */
export const X0 = -MARGIN;
export const X1 = GRID_X + MARGIN;
export const Y0 = -MARGIN;
export const Y1 = GRID_Y + MARGIN;
/** The Spree's west and east banks, and the middle of the stream. */
export const RX0 = COL_X[AFTER] + BLOCK;
export const RX1 = COL_X[AFTER + 1];
export const RIVER_MID = (RX0 + RX1) / 2;

/** What a tour stop at zoom 1 shows, in paper units: one block and a little of its neighbours. */
export const TOUR_VIEW = { w: BLOCK * 2.17, h: BLOCK * 1.375 };
/** Seconds of timeline over which boats and cars are checked against each other. One loop of the film must fit inside it. */
export const TRAFFIC_HORIZON = 150;

export function blockOrigin(i: number, j: number): V2 {
  return [COL_X[i], ROW_Y[j]];
}

// ---------------------------------------------------------------- the island and the bridges

/** Museum Island: a spindle of land in mid-river beside the middle row, pointed at both ends. */
export const ISLAND = {
  x0: RX0 + 7.5,
  x1: RX1 - 8,
  y0: ROW_Y[1] + 0.5,
  y1: ROW_Y[1] + 44,
  /** How long the pointed north and south ends are. */
  tipN: 8.5,
  tipS: 6.5,
};
const ISLAND_CX = (ISLAND.x0 + ISLAND.x1) / 2;
const ISLAND_HW = (ISLAND.x1 - ISLAND.x0) / 2;

/** The great axis: the promenade from the Brandenburg Gate over the island to Alexanderplatz runs along this world y. */
export const AXIS_Y = ROW_Y[1] + 31;
export const AXIS_W = 5;

/** The island's outline in world coordinates, anticlockwise seen from above in world axes; `grow` moves it outwards. */
export function islandOutline(grow = 0): V2[] {
  const { y0, y1, tipN, tipS } = ISLAND;
  const hw = ISLAND_HW + grow;
  const pts: V2[] = [];
  const n = 9;
  // down the east side, round the south end, up the west side, round the north end
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * Math.PI;
    pts.push([ISLAND_CX + Math.cos(t) * hw, y1 - tipS + Math.sin(t) * (tipS + grow)]);
  }
  for (let k = 0; k <= n; k++) {
    const t = Math.PI + (k / n) * Math.PI;
    pts.push([ISLAND_CX + Math.cos(t) * hw, y0 + tipN + Math.sin(t) * (tipN + grow)]);
  }
  return pts;
}

export function onIsland(x: number, y: number, pad = 0): boolean {
  const { y0, y1, tipN, tipS } = ISLAND;
  const dx = (x - ISLAND_CX) / (ISLAND_HW + pad);
  if (Math.abs(dx) >= 1) return false;
  if (y < y0 + tipN) return y > y0 + tipN - (tipN + pad) * Math.sqrt(1 - dx * dx);
  if (y > y1 - tipS) return y < y1 - tipS + (tipS + pad) * Math.sqrt(1 - dx * dx);
  return true;
}

/** The road bridges over the Spree, north to south: the y where each deck starts (it is LANE wide). */
export const BRIDGE_Y = [Y0, ROW_Y[0] + BLOCK, ROW_Y[1] + BLOCK, GRID_Y];

/** True on the deck of a road bridge, or of the two footbridges that carry the axis over the island's arms. */
export function onDeck(x: number, y: number, pad = 0): boolean {
  if (x < RX0 - pad || x > RX1 + pad) return false;
  for (const y0 of BRIDGE_Y) if (y > y0 - pad && y < y0 + LANE + pad) return true;
  return Math.abs(y - AXIS_Y) < AXIS_W / 2 + pad;
}

// ---------------------------------------------------------------- the river beyond the base

export interface ReachPt {
  x: number;
  y: number;
  /** Half the river's width here. */
  hw: number;
  /** Unit vector across the stream. */
  nx: number;
  ny: number;
  /** Distance from the edge of the base. */
  u: number;
}

export const TAIL = 330;
const TAIL_STEP = 3;

/**
 * The river beyond the base. Downstream (north) it leaves towards the upper
 * right of the page, widens a little and swings west; upstream (south) it
 * comes in from the lower left, narrower, having swung in from the east.
 * Both run off the page and end in a point, like a brush lifted off paper.
 */
function reach(north: boolean): ReachPt[] {
  const out: ReachPt[] = [];
  let x = RIVER_MID;
  let y = north ? Y0 : Y1;
  for (let u = 0; u <= TAIL; u += TAIL_STEP) {
    const th = north
      ? -Math.PI / 2 - 0.5 * smooth(25, 120, u) + 0.16 * Math.sin(u / 38) * smooth(60, 150, u)
      : Math.PI / 2 - 0.45 * smooth(22, 110, u) + 0.18 * Math.sin(u / 34 + 1) * smooth(60, 150, u);
    const wide = RIVER / 2 + (north ? 2.5 : -3.5) * smooth(15, 170, u);
    const hw = wide * (1 + 0.03 * Math.sin(u / 7.3 + (north ? 0 : 2)) * smooth(8, 30, u)) * (1 - smooth(TAIL - 60, TAIL, u));
    out.push({ x, y, hw, nx: -Math.sin(th), ny: Math.cos(th), u });
    x += Math.cos(th) * TAIL_STEP;
    y += Math.sin(th) * TAIL_STEP;
  }
  return out;
}

export const REACH_N = reach(true);
export const REACH_S = reach(false);

function nearest(pts: ReachPt[], x: number, y: number): { at: ReachPt; d: number } {
  let best = Infinity;
  let at = pts[0];
  for (const p of pts) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < best) {
      best = d;
      at = p;
    }
  }
  return { at, d: Math.sqrt(best) };
}

/** Is a point of a reach nearest a stretch between two distances from the base? (Keeps ripple patches from overlapping.) */
export function onReach(pts: ReachPt[], x: number, y: number, u0: number, u1: number): boolean {
  const { at } = nearest(pts, x, y);
  return at.u >= u0 && at.u < u1;
}

// ---------------------------------------------------------------- what is where

/** True on a block's square (pad grows it). */
export function onBlock(x: number, y: number, pad = 0): boolean {
  let inX = false;
  for (const x0 of COL_X) if (x > x0 - pad && x < x0 + BLOCK + pad) inX = true;
  if (!inX) return false;
  for (const y0 of ROW_Y) if (y > y0 - pad && y < y0 + BLOCK + pad) return true;
  return false;
}

/** True on the base the city stands on, either side of the river (the bridges are not counted: see onDeck). */
export function onBase(x: number, y: number, pad = 0): boolean {
  if (y < Y0 - pad || y > Y1 + pad) return false;
  return (x > X0 - pad && x < RX0 + pad) || (x > RX1 - pad && x < X1 + pad);
}

/** True over the Spree: between the banks (but not on the island), or in the reaches beyond the base. */
export function inWater(x: number, y: number, pad = 0.4): boolean {
  if (y >= Y0 && y <= Y1) return x > RX0 + pad && x < RX1 - pad && !onIsland(x, y, pad);
  const { at, d } = nearest(y < Y0 ? REACH_N : REACH_S, x, y);
  return d < at.hw - pad;
}

/** True on dry land of the city itself: the base, its blocks and the island. */
export function onLand(x: number, y: number): boolean {
  return onBase(x, y) || onIsland(x, y);
}

/** Street level at a world point: a sidewalk's curb, or the road. */
export function groundZ(x: number, y: number): number {
  return onBlock(x, y) || onIsland(x, y) ? CURB : 0;
}
