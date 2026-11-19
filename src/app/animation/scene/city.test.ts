import { describe, expect, it } from "vitest";
import { V2 } from "../engine/math";
import { FV, LV, Mesh, Sprite } from "../engine/mesh";
import { Pen } from "../engine/pen";
import { DEPTH_HALF, DEPTH_MID } from "../engine/renderer";
import { BLOCKS, ISLETS, TOUR } from "./blocks";
import { PLAN } from "./blocks/plan";
import { BLOCK, PITCH, WATER, buildCity, inWater } from "./city";
import { MoveCtx } from "./types";

const city = buildCity(BLOCKS, ISLETS);

// The renderer only draws what lies inside this band of depth (x + y + z).
const NEAR = DEPTH_MID + DEPTH_HALF;
const FAR = DEPTH_MID - DEPTH_HALF;

/**
 * Run every mover over a stretch of the timeline and report where each sprite
 * lands. From `nightAt` on it is dark, which is when the fireworks go up.
 */
function play(from: number, to: number, step: number, visit: (x: number, y: number, z: number, t: number) => void, nightAt = Infinity): Mesh {
  const dyn = new Mesh(1 << 12, 1 << 12);
  const pen = new Pen(dyn, 1);
  for (let t = from; t < to; t += step) {
    const m: MoveCtx = {
      mesh: dyn,
      pen,
      t,
      clock: t,
      night: t >= nightAt ? 1 : 0,
      nightAt,
      put(_s: Sprite, x: number, y: number, z: number) {
        visit(x, y, z, t);
      },
      sees: () => true,
    };
    dyn.clear();
    for (const mover of city.movers) mover(m);
  }
  return dyn;
}

describe("the city", () => {
  it("draws every neighbourhood on the plan and gives the camera a stop at each", () => {
    expect(BLOCKS.map((b) => b.id).sort()).toEqual(PLAN.map((p) => p.id).sort());
    for (const b of BLOCKS) expect(typeof b.build).toBe("function");
    for (const s of ISLETS) expect(typeof s.build).toBe("function");
    const stops = city.stops.map((s) => s.id);
    for (const id of TOUR) expect(stops).toContain(id);
    expect(new Set(TOUR).size).toBe(TOUR.length);
    expect(TOUR.length).toBe(BLOCKS.length + ISLETS.length);
  });

  it("is made of real numbers, inside the depth range the renderer can sort", () => {
    const m = city.mesh;
    expect(m.fn).toBeGreaterThan(100000);
    expect(m.ln).toBeGreaterThan(100000);
    for (let i = 0; i < m.fn; i++) {
      const x = m.fv[i * FV];
      const y = m.fv[i * FV + 1];
      const z = m.fv[i * FV + 2];
      const d = x + y + z + m.fv[i * FV + 5];
      if (!(d > FAR && d < NEAR)) throw new Error(`fill vertex ${i} at ${x}, ${y}, ${z} is outside the depth range`);
    }
    for (let i = 0; i < m.ln; i++) {
      for (let k = 0; k < 6; k += 3) {
        const d = m.lv[i * LV + k] + m.lv[i * LV + k + 1] + m.lv[i * LV + k + 2];
        if (!(d > FAR && d < NEAR)) throw new Error(`stroke ${i} is outside the depth range`);
      }
      if (!(m.lv[i * LV + 10] > 0 && m.lv[i * LV + 11] > 0)) throw new Error(`stroke ${i} has no width`);
    }
  });

  it("stays within a size any laptop draws at sixty frames a second", () => {
    expect(city.mesh.fn).toBeLessThan(1_600_000);
    expect(city.mesh.ln).toBeLessThan(1_300_000);
  });

  it("has finished sketching itself in before the tour sets off", () => {
    const m = city.mesh;
    expect(city.done).toBeLessThan(11);
    let latest = -Infinity;
    for (let i = 0; i < m.fn; i++) latest = Math.max(latest, m.fv[i * FV + 3]);
    for (let i = 0; i < m.ln; i++) latest = Math.max(latest, m.lv[i * LV + 6]);
    // colour needs a second after an object starts; allow that much past `done`
    expect(latest).toBeLessThanOrEqual(city.done + 0.2);
    expect(city.settled).toBeCloseTo(latest + 1.05, 5);
  });

  it("keeps everything that floats on the water", () => {
    let afloat = 0;
    const aground: string[] = [];
    // the islands stand on the paper at water level, so what moves on them is not afloat
    const ashore = (x: number, y: number) => ISLETS.some((s) => Math.hypot(x - s.x, y - s.y) < 34);
    // a block is land all over unless it gives its own outline (a harbour basin, a river mouth)
    const inside = (poly: V2[], x: number, y: number) => {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const onLand = (x: number, y: number) =>
      BLOCKS.some((b) => {
        const lx = x - b.i * PITCH;
        const ly = y - b.j * PITCH;
        if (lx < 0 || ly < 0 || lx > BLOCK || ly > BLOCK) return false;
        return b.land ? b.land.some((poly) => inside(poly, lx, ly)) : true;
      });
    play(city.done + 2, city.done + 150, 0.5, (x, y, z, t) => {
      if (Math.abs(z - WATER) > 0.05 || ashore(x, y)) return;
      afloat++;
      if ((!inWater(x, y) || onLand(x, y)) && aground.length < 5) aground.push(`${x.toFixed(1)}, ${y.toFixed(1)} at t=${t.toFixed(1)}`);
    });
    expect(afloat).toBeGreaterThan(1000);
    expect(aground).toEqual([]);
  });

  it("never lets two canal boats run into each other", () => {
    expect(city.boatClashes).toBe(0);
  });

  it("keeps everything that moves inside the depth range, for a whole loop of the timeline", () => {
    let seen = 0;
    const dyn = play(0, 75, 0.25, (x, y, z, t) => {
      seen++;
      const d = x + y + z;
      if (!(d > FAR + 20 && d < NEAR - 20)) throw new Error(`a mover reached ${x}, ${y}, ${z} at t=${t}`);
    });
    expect(seen).toBeGreaterThan(5000);
    for (let i = 0; i < dyn.fn * FV; i++) expect(Number.isFinite(dyn.fv[i])).toBe(true);
    for (let i = 0; i < dyn.ln * LV; i++) expect(Number.isFinite(dyn.lv[i])).toBe(true);
  });

  it("keeps the fireworks, drawn by hand each frame, inside the depth range too", () => {
    let sparks = 0;
    for (let t = 70; t < 80; t += 0.25) {
      const dyn = play(t, t + 0.01, 1, () => {}, 70);
      sparks += dyn.ln;
      for (let i = 0; i < dyn.ln; i++) {
        for (let k = 0; k < 6; k += 3) {
          const d = dyn.lv[i * LV + k] + dyn.lv[i * LV + k + 1] + dyn.lv[i * LV + k + 2];
          if (!(d > FAR + 10 && d < NEAR - 10)) throw new Error(`a stroke drawn at t=${t} is at depth ${d}`);
        }
      }
    }
    // far more strokes than the day's hand-drawn movers make: the rockets went up
    expect(sparks).toBeGreaterThan(20000);
  });
});
