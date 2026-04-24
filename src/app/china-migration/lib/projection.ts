import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import type { GeoProjection, GeoPath } from "d3-geo";
import { feature } from "topojson-client";

type Topology = Parameters<typeof feature>[0];
type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; id?: string | number; properties?: Record<string, unknown>; geometry: unknown }>;
};

export type CountryGeom = {
  path: Path2D;
  cx: number;
  cy: number;
  areaPx: number;
  bbox: [number, number, number, number]; // x0,y0,x1,y1
};

// Build per-country pixel-space geometry (Path2D + centroid + bbox) for fast
// hit-testing and polygon-interior sampling. Called once per projection change.
export function buildCountryGeoms(
  topo: Topology,
  projection: GeoProjection
): Map<number, CountryGeom> {
  const fc = loadCountriesTopo(topo);
  const pathFn = geoPath(projection);
  const map = new Map<number, CountryGeom>();
  for (const f of fc.features) {
    const id = Number(f.id);
    if (!Number.isFinite(id)) continue;
    const d = pathFn(f as never);
    if (!d) continue;
    const path = new Path2D(d);
    const [cx, cy] = pathFn.centroid(f as never);
    const [[x0, y0], [x1, y1]] = pathFn.bounds(f as never);
    const areaPx = Math.max(0, pathFn.area(f as never));
    map.set(id, { path, cx, cy, areaPx, bbox: [x0, y0, x1, y1] });
  }
  return map;
}

export function buildProjection(width: number, height: number): GeoProjection {
  return geoNaturalEarth1().fitExtent(
    [[12, 12], [width - 12, height - 12]],
    { type: "Sphere" } as never
  );
}

export function projectLngLat(
  projection: GeoProjection,
  lng: number,
  lat: number
): [number, number] | null {
  const p = projection([lng, lat]);
  if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
  return [p[0], p[1]];
}

export function loadCountriesTopo(topo: Topology): FeatureCollection {
  const obj = topo.objects.countries;
  return feature(topo, obj) as unknown as FeatureCollection;
}

export function makePath(projection: GeoProjection, ctx: CanvasRenderingContext2D): GeoPath {
  return geoPath(projection, ctx);
}

export function drawBaseMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  countries: FeatureCollection,
  chinaCode: number
) {
  ctx.clearRect(0, 0, width, height);

  // Sea / background — solid; the page wrapper has a matching colour, so this
  // is mostly insurance against canvas transparency artifacts on resize.
  ctx.fillStyle = "#0e1726";
  ctx.fillRect(0, 0, width, height);

  // Sphere outline (subtle, so the flat projection feels intentional).
  const path = geoPath(projection, ctx);
  ctx.beginPath();
  path({ type: "Sphere" } as never);
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.stroke();

  // Graticule, very low alpha, gives depth without shouting.
  ctx.beginPath();
  path(geoGraticule10());
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.stroke();

  // Land — ivory fill with a hairline border in the sea colour.
  ctx.beginPath();
  for (const f of countries.features) path(f as never);
  ctx.fillStyle = "#e8dfc8";
  ctx.fill();
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "rgba(14,23,38,0.85)";
  ctx.stroke();

  // China highlight — slightly warmer fill so the focal country reads.
  for (const f of countries.features) {
    const id = Number(f.id);
    if (id === chinaCode) {
      ctx.beginPath();
      path(f as never);
      ctx.fillStyle = "#f5d2a4";
      ctx.fill();
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = "rgba(14,23,38,0.95)";
      ctx.stroke();
    }
  }
}
