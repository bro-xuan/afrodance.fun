// Shared shapes for the scene: what a block builder receives, what a mover is.

import { Rng } from "../engine/math";
import { Mesh, Sprite } from "../engine/mesh";
import { Pen } from "../engine/pen";

/** Handed to every mover once per frame. */
export interface MoveCtx {
  /** The moving layer being filled for this frame. */
  mesh: Mesh;
  /** A pen on the moving layer, for things redrawn from scratch each frame (windmill sails, a drawbridge). */
  pen: Pen;
  /** Timeline seconds: the same clock the city is revealed on. */
  t: number;
  /** Free-running seconds. */
  clock: number;
  /** How dark it is, 0 (day) to 1 (night). */
  night: number;
  /** Timeline second at which night has fully fallen in this loop. */
  nightAt: number;
  /**
   * Stamp a sprite at a world position, skipping it when off screen. `t0` is
   * when the copy starts sketching itself in: pass the mover's birth time.
   */
  put(s: Sprite, x: number, y: number, z: number, t0: number, scale?: number): void;
  /** True when a world point (with some slack) is on screen. */
  sees(x: number, y: number, z: number, slack?: number): boolean;
}

export type Mover = (m: MoveCtx) => void;

export interface BlockCtx {
  pen: Pen;
  rng: Rng;
  /** World position of the block's far (top) corner. Local (0,0) is there; the block runs to (48,48). */
  ox: number;
  oy: number;
  /** World height of local z = 0: the block's surface (CURB above the road), or the paper for the places off the grid. */
  oz: number;
  /** When the block starts drawing, and when everything in it has its colour. */
  t: number;
  done: number;
  movers: Mover[];
  /** Draw ground-level areas (lawns, squares, ponds) so they arrive early, straight after the slab. */
  early(fn: () => void): void;
  /**
   * Which edges have the strip the city lays along them (a quay street by a
   * canal, a sidewalk by a road). Keep the block's own content QUAY units in
   * from those edges.
   */
  quay: { xm: boolean; xp: boolean; ym: boolean; yp: boolean };
  /** Column and row of the block on the grid; -1 for a place off the grid (an island). */
  i: number;
  j: number;
  /**
   * The edge of this block that is a bank of the Spree, if one is: "xp" for
   * the blocks west of the river (their local x = BLOCK edge), "xm" for those
   * east of it (their x = 0 edge). The city lays a riverside walk there with
   * a railing along the water; beyond it the river is `waterZ` below.
   */
  river: "xp" | "xm" | null;
  /** Local z of the water (and of the paper): what floats, or stands on the paper beside a place, goes here. */
  waterZ: number;
  /** Point the camera somewhere other than the middle when it visits (local coordinates, optional zoom). */
  focus(x: number, y: number, zoom?: number): void;
  /**
   * The timeline second the camera arrives here on its tour, or null when
   * there is no tour. Only known once the animation is running, so call it
   * from inside a mover: a bridge can then open, or a goal go in, on cue.
   */
  visit(): number | null;
  /**
   * The whole stay: when the camera arrives and leaves, and (on the last stop
   * of the tour) when the final close-up holds. Null when there is no tour.
   * Time a second beat of a set piece into the close-up with this.
   */
  stay(): { at: number; leave: number; closeup: { at: number; until: number } | null } | null;
}

export type BlockBuilder = (c: BlockCtx) => void;

/** A place the camera visits. */
export interface Stop {
  id: string;
  name: string;
  note: string;
  /** World point to centre on (ground level). */
  x: number;
  y: number;
  /** Zoom relative to "one block fills the frame". */
  zoom: number;
  /** A passing visit rather than a full stop (the islands). */
  quick?: boolean;
  /** When the camera arrives and leaves, once the tour has been timed. */
  at?: number;
  leave?: number;
  /** The final close-up, on the last stop only. */
  closeup?: { at: number; until: number } | null;
}
