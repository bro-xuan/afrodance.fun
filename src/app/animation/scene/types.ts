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
  /** World height of local z = 0: street level (0) for blocks, the paper for islands. */
  oz: number;
  /** When the block starts drawing, and when everything in it has its colour. */
  t: number;
  done: number;
  movers: Mover[];
  /** Draw ground-level areas (lawns, squares, ponds) so they arrive early, straight after the slab. */
  early(fn: () => void): void;
  /** Which edges have a canal-side quay street already laid by the city (the block should stay off it). */
  quay: { xm: boolean; xp: boolean; ym: boolean; yp: boolean };
  /** Point the camera somewhere other than the middle when it visits (local coordinates, optional zoom). */
  focus(x: number, y: number, zoom?: number): void;
  /**
   * The timeline second the camera arrives here on its tour, or null when
   * there is no tour. Only known once the animation is running, so call it
   * from inside a mover: a bridge can then open, or a goal go in, on cue.
   */
  visit(): number | null;
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
  /** When the camera arrives, once the tour has been timed. */
  at?: number;
}
