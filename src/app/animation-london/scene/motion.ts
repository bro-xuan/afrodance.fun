// Everything that moves: routes to follow, sprites to stamp along them, and
// the stock cast (cyclists, walkers) the whole city shares. Buses, cabs and
// boats are in vehicles.ts; the traffic they make is in traffic.ts.
//
// A moving thing is drawn once into a Sprite and then copied into the moving
// layer every frame at its current position. Things that turn are drawn at a
// ring of headings on first use, so a boat rounding a corner swings round
// smoothly.

import { RGB, Rng, V3 } from "../engine/math";
import { Mesh, Sprite, spriteOf } from "../engine/mesh";
import { Pen } from "../engine/pen";
import { Look, Pose, bike, person, randomLook } from "./kit";
import { C } from "./palette";
import { Mover } from "./types";

/** Draw something once, at the origin, optionally turned by `rot` degrees. */
export function makeSprite(draw: (pen: Pen) => void, rot = 0, seed = 7): Sprite {
  const mesh = new Mesh(256, 256);
  const pen = new Pen(mesh, seed);
  pen.reveal = () => 0;
  pen.push(0, 0, 0, rot);
  pen.begin();
  draw(pen);
  pen.end();
  pen.pop();
  return spriteOf(mesh);
}

/**
 * One drawing at a ring of headings, each made the first time it is asked
 * for. The drawing should point along local +x.
 */
export class Turning {
  private cache: (Sprite | undefined)[];
  constructor(
    private draw: (pen: Pen) => void,
    private n = 24,
    private seed = 7,
  ) {
    this.cache = new Array(n);
  }
  /** Sprite for a heading in radians (atan2(dy, dx) in world axes). */
  at(heading: number): Sprite {
    const n = this.n;
    let k = Math.round((heading / (Math.PI * 2)) * n) % n;
    if (k < 0) k += n;
    let s = this.cache[k];
    if (!s) {
      s = makeSprite(this.draw, (k * 360) / n, this.seed);
      this.cache[k] = s;
    }
    return s;
  }
}

/** A path through world space, optionally a closed loop, with rounded corners. */
export class Route {
  readonly pts: V3[];
  readonly cum: number[];
  readonly length: number;

  constructor(
    pts: V3[],
    readonly closed = true,
    radius = 0,
  ) {
    this.pts = radius > 0 ? rounded(pts, closed, radius) : pts.slice();
    if (closed) this.pts.push(this.pts[0]);
    this.cum = [0];
    let acc = 0;
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1];
      const b = this.pts[i];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      this.cum.push(acc);
    }
    this.length = acc;
  }

  /** Point at distance s along the route. Loops wrap; open routes clamp. */
  pos(s: number, out: V3): V3 {
    const L = this.length;
    if (this.closed) s = ((s % L) + L) % L;
    else s = s < 0 ? 0 : s > L ? L : s;
    const cum = this.cum;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = this.pts[lo];
    const b = this.pts[hi];
    const d = cum[hi] - cum[lo];
    const u = d > 1e-9 ? (s - cum[lo]) / d : 0;
    out[0] = a[0] + (b[0] - a[0]) * u;
    out[1] = a[1] + (b[1] - a[1]) * u;
    out[2] = a[2] + (b[2] - a[2]) * u;
    return out;
  }

  /** Direction of travel at s (radians), averaged over `span` units so corners turn smoothly. */
  heading(s: number, span = 1.2): number {
    const a = this.pos(s - span * 0.5, HA);
    const ax = a[0];
    const ay = a[1];
    const b = this.pos(s + span * 0.5, HA);
    return Math.atan2(b[1] - ay, b[0] - ax);
  }
}

const HA: V3 = [0, 0, 0];
const P: V3 = [0, 0, 0];

/** Replace each corner of a path with a short curve of radius r. */
export function rounded(pts: V3[], closed: boolean, r: number): V3[] {
  const n = pts.length;
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (!closed && (i === 0 || i === n - 1)) {
      out.push(p);
      continue;
    }
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, la * 0.45, lb * 0.45);
    if (rr < 0.05) {
      out.push(p);
      continue;
    }
    const ax = p[0] + ((a[0] - p[0]) / la) * rr;
    const ay = p[1] + ((a[1] - p[1]) / la) * rr;
    const bx = p[0] + ((b[0] - p[0]) / lb) * rr;
    const by = p[1] + ((b[1] - p[1]) / lb) * rr;
    const k = 5;
    for (let j = 0; j <= k; j++) {
      const t = j / k;
      const u = 1 - t;
      out.push([u * u * ax + 2 * u * t * p[0] + t * t * bx, u * u * ay + 2 * u * t * p[1] + t * t * by, p[2]]);
    }
  }
  return out;
}

/** Cut a path into short steps and take each point's height from a ground function (for bridge humps). */
export function drape(pts: V3[], closed: boolean, ground: (x: number, y: number) => number, step = 0.8): V3[] {
  const out: V3[] = [];
  const n = pts.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      out.push([x, y, ground(x, y)]);
    }
  }
  if (!closed) {
    const e = pts[n - 1];
    out.push([e[0], e[1], ground(e[0], e[1])]);
  }
  return out;
}

export interface TravelOpts {
  /** World units per second. */
  speed: number;
  /** Where on the route it starts, as a fraction of the length. */
  at: number;
  /** Timeline second it first appears (it sketches itself in from then). */
  born: number;
  /** Pick the sprite for a heading and time. */
  sprite: (heading: number, t: number) => Sprite;
  /** Smoothing span for the heading, in units. */
  span?: number;
  lift?: number;
}

/** Something that follows a route for ever. */
export function traveler(route: Route, o: TravelOpts): Mover {
  const span = o.span ?? 1.4;
  const lift = o.lift ?? 0;
  const s0 = o.at * route.length;
  return (m) => {
    if (m.t < o.born) return;
    const s = s0 + o.speed * m.t;
    route.pos(s, P);
    const x = P[0];
    const y = P[1];
    const z = P[2] + lift;
    if (!m.sees(x, y, z)) return;
    m.put(o.sprite(route.heading(s, span), m.t), x, y, z, o.born);
  };
}

// ---------------------------------------------------------------- the stock cast

export function lazy<T>(make: () => T): () => T {
  let v: T | undefined;
  return () => (v === undefined ? (v = make()) : v);
}

export interface CyclistKind {
  frames: [Turning, Turning];
}

function cyclistKind(seed: number): CyclistKind {
  const r = new Rng(seed);
  const rider = randomLook(r);
  const color: RGB = r.pick([C.black, C.black, C.blueDark, C.redDark, C.green, C.orange]);
  const cargo = r.chance(0.14);
  const crate = !cargo && r.chance(0.3);
  const mk = (frame: number) => new Turning((pen) => bike(pen, { rider, color, frame, cargo, crate }), 24, seed);
  return { frames: [mk(0), mk(1)] };
}

/** Two dozen different cyclists, built as they are needed. */
export const cyclists = lazy(() => {
  const list: CyclistKind[] = [];
  for (let i = 0; i < 24; i++) list.push(cyclistKind(100 + i * 7));
  return list;
});

/** A cyclist riding a route. */
export function cyclist(route: Route, rng: Rng, born: number, speed?: number, at?: number): Mover {
  const kind = rng.pick(cyclists());
  const phase = rng.next() * 10;
  return traveler(route, {
    speed: speed ?? rng.range(4.2, 5.8),
    at: at ?? rng.next(),
    born,
    span: 1.6,
    sprite: (h, t) => kind.frames[Math.floor(t * 3.2 + phase) & 1].at(h),
  });
}

export interface WalkerKind {
  /** [facing right, facing left] x [stride, passing] */
  frames: Sprite[][];
}

function walkerKind(seed: number, look?: Look, scale = 1): WalkerKind {
  const r = new Rng(seed);
  const lk = look ?? randomLook(r);
  const s = scale !== 1 ? scale : r.chance(0.12) ? 0.72 : 1;
  const mk = (pose: Pose, flip: boolean) => makeSprite((pen) => person(pen, 0, 0, 0, lk, pose, flip, s), 0, seed);
  return {
    frames: [
      [mk("walkA", false), mk("walkB", false)],
      [mk("walkA", true), mk("walkB", true)],
    ],
  };
}

export const walkers = lazy(() => {
  const list: WalkerKind[] = [];
  for (let i = 0; i < 28; i++) list.push(walkerKind(900 + i * 13));
  return list;
});

/** Someone on foot following a route. */
export function walker(route: Route, rng: Rng, born: number, speed?: number, kind?: WalkerKind): Mover {
  const k = kind ?? rng.pick(walkers());
  const phase = rng.next() * 10;
  return traveler(route, {
    speed: speed ?? rng.range(1.1, 1.7),
    at: rng.next(),
    born,
    span: 0.8,
    sprite: (h, t) => k.frames[Math.cos(h) - Math.sin(h) >= 0 ? 0 : 1][Math.floor(t * 2.6 + phase) & 1],
  });
}

/** A walker with a given look (a postman, a bride) at a given size. */
export function castWalker(look: Look, seed = 1, scale = 1): WalkerKind {
  return walkerKind(seed, look, scale);
}
