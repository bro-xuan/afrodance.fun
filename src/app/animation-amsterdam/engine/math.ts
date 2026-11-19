// Shared maths for the Amsterdam drawing: the isometric projection, colour
// helpers, a seeded random source and the easing curves the camera uses.
//
// World axes: +x runs to the lower right of the page, +y to the lower left and
// +z straight up. One world unit is roughly a metre of "toy" city.

export const C30 = 0.8660254037844386;

export type V2 = [number, number];
export type V3 = [number, number, number];
export type RGB = [number, number, number];

/** Where a world point lands on the paper (x to the right, y downwards). */
export function paperX(x: number, y: number): number {
  return (x - y) * C30;
}
export function paperY(x: number, y: number, z: number): number {
  return (x + y) * 0.5 - z;
}

export function hex(h: string): RGB {
  const s = h.startsWith("#") ? h.slice(1) : h;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function scaleRGB(c: RGB, f: number): RGB {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
};

/** Small, fast, seedable random source (mulberry32). */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  /** Start the sequence again from a seed. */
  reset(seed: number): void {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Uniform in [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  /** Integer in [a, b). */
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  fork(): Rng {
    return new Rng(Math.floor(this.next() * 4294967296));
  }
}

/** Deterministic hash of a number to [0, 1). */
export function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash1(i + seed * 57.31) * 2 - 1;
  const b = hash1(i + 1 + seed * 57.31) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
