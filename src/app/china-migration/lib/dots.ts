import type { CountryGeom } from "./projection";

// Deterministic PRNG so dot layouts stay stable across frames and reloads.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Find the nearest on-land pixel to (x0, y0) by expanding-ring search against
// the union of all country paths. Used when a territory has no polygon in the
// 110m topo (Hong Kong, Macao, Singapore) — the raw data centroid may project
// into simplified ocean, so we snap onto the nearest parent coastline before
// placing the bouquet. Returns the original point if it's already on land,
// or the closest land pixel within `maxRadius`; null if none found.
function snapToLand(
  x0: number,
  y0: number,
  allPaths: Path2D[],
  ctx: CanvasRenderingContext2D,
  maxRadius: number
): [number, number] | null {
  const onLand = (x: number, y: number) => {
    for (const p of allPaths) if (ctx.isPointInPath(p, x, y)) return true;
    return false;
  };
  if (onLand(x0, y0)) return [x0, y0];
  // Expanding ring: step outward 2 px at a time, sample 24 angles per ring.
  // 24 angles at 60 px gives ≤ 16 px arc length between probes — fine enough
  // to catch any coastline thicker than a pixel.
  for (let r = 2; r <= maxRadius; r += 2) {
    for (let a = 0; a < 24; a++) {
      const theta = (a / 24) * Math.PI * 2;
      const x = x0 + Math.cos(theta) * r;
      const y = y0 + Math.sin(theta) * r;
      if (onLand(x, y)) return [x, y];
    }
  }
  return null;
}

// Generate a pool of dot positions that sit inside (or on) a country polygon.
// - If a polygon exists at any size, rejection-sample inside it first. This
//   keeps dots on actual land and never floats them into the sea.
// - If polygon sampling returns fewer than `maxDots` (tiny island territories
//   like Hong Kong, Macao, Singapore where the polygon is a few pixels wide
//   or missing entirely), top up with a tight phyllotaxis bouquet anchored to
//   the nearest on-land pixel. We search against the union of all country
//   paths so a missing territory snaps onto its parent coastline (HK/Macao →
//   China, Singapore → Malaysia) instead of floating into open water.
export function buildDotPool(
  seed: number,
  geom: CountryGeom | undefined,
  fallbackCenter: [number, number],
  maxDots: number,
  ctx: CanvasRenderingContext2D,
  allPaths: Path2D[]
): Array<[number, number]> {
  const pool: Array<[number, number]> = [];
  const rng = mulberry32(seed);

  // Chromium quirk: isPointInPath treats the (x, y) input as DEVICE space
  // when the ctx has a non-identity CTM, but Path2D coords produced by d3-geo
  // are in logical space. Reset the transform for the duration of the hit
  // tests so both sides are in the same coordinate system, then restore.
  const savedTransform = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (geom) {
    const [x0, y0, x1, y1] = geom.bbox;
    const bboxW = Math.max(1, x1 - x0);
    const bboxH = Math.max(1, y1 - y0);
    const maxTries = maxDots * 120;
    let tries = 0;
    while (pool.length < maxDots && tries < maxTries) {
      const x = x0 + rng() * bboxW;
      const y = y0 + rng() * bboxH;
      if (ctx.isPointInPath(geom.path, x, y)) pool.push([x, y]);
      tries++;
    }
  }

  if (pool.length < maxDots) {
    // Anchor the bouquet on land. Prefer the polygon centroid when we have
    // one, else snap the data centroid to the nearest on-land pixel.
    let anchor: [number, number] = geom ? [geom.cx, geom.cy] : fallbackCenter;
    if (!geom) {
      const snapped = snapToLand(anchor[0], anchor[1], allPaths, ctx, 60);
      if (snapped) anchor = snapped;
    }
    const need = maxDots - pool.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    // Tight radius so the bouquet doesn't overflow the coast.
    const radius = Math.min(12, 3.5 + Math.sqrt(need) * 0.55);
    const [cx, cy] = anchor;
    for (let i = 0; i < need; i++) {
      const r = radius * Math.sqrt((i + 0.5) / need);
      const t = i * golden;
      const px = cx + Math.cos(t) * r;
      const py = cy + Math.sin(t) * r;
      // Reject bouquet points that wander off land (can happen near thin
      // coastlines). Fall back to the anchor itself if rejected — better a
      // slightly denser cluster than dots in the sea.
      let ok = false;
      for (const p of allPaths) {
        if (ctx.isPointInPath(p, px, py)) { ok = true; break; }
      }
      if (ok) pool.push([px, py]);
      else pool.push([cx, cy]);
    }
  }

  // Shuffle deterministically so the first N dots used at low stock aren't
  // clustered on one edge of the bbox.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  ctx.setTransform(savedTransform);
  return pool;
}
