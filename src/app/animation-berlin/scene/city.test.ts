import { describe, expect, it } from "vitest";
import { FV, LV, Mesh, Sprite } from "../engine/mesh";
import { Pen } from "../engine/pen";
import { planTimeline, planTour } from "../film";
import { BLOCKS, CLOSEUP, DRAWN, ISLETS, TOUR } from "./blocks";
import { ISLET_PLAN, PLAN } from "./blocks/plan";
import { BLOCK, COLS, COL_X, LANE, ROWS, ROW_Y, RX0, RX1, WATER, X0, X1, Y0, Y1, buildCity, inWater, onBase, onBlock, onDeck, onIsland } from "./city";
import { FRAME } from "./frame";
import { MoveCtx } from "./types";

const city = buildCity(BLOCKS, ISLETS);
const tl = planTimeline(city.done, planTour(city.stops, TOUR), CLOSEUP != null);
const NEAR = city.depth.mid + city.depth.half;
const FAR = city.depth.mid - city.depth.half;
/** Near one of the places that stand on the paper off the grid (they keep their own boats and people). */
const nearIslet = (x: number, y: number) => ISLETS.some((s) => !s.island && Math.hypot(x - s.x, y - s.y) < 34);

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
  it("puts one place on every square of the grid, and the camera visits them all", () => {
    expect(BLOCKS.map((b) => b.id).sort()).toEqual(PLAN.map((p) => p.id).sort());
    const squares = new Set(BLOCKS.map((b) => `${b.i},${b.j}`));
    expect(squares.size).toBe(BLOCKS.length);
    expect(BLOCKS.length).toBe(COLS * ROWS);
    for (const b of BLOCKS) {
      expect(b.i).toBeGreaterThanOrEqual(0);
      expect(b.i).toBeLessThan(COLS);
      expect(b.j).toBeGreaterThanOrEqual(0);
      expect(b.j).toBeLessThan(ROWS);
    }
    const ids = [...PLAN.map((p) => p.id), ...ISLET_PLAN.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    // a drawing registered under a mistyped id would never be used
    for (const id of Object.keys(DRAWN)) expect(ids).toContain(id);
    expect([...TOUR].sort()).toEqual([...ids].sort());
    const stops = city.stops.map((s) => s.id);
    for (const id of TOUR) expect(stops).toContain(id);
  });

  it("is made of real numbers, inside the depth range the renderer draws", () => {
    const m = city.mesh;
    expect(m.fn).toBeGreaterThan(1000);
    expect(m.ln).toBeGreaterThan(1000);
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
    let latest = -Infinity;
    for (let i = 0; i < m.fn; i++) latest = Math.max(latest, m.fv[i * FV + 3]);
    for (let i = 0; i < m.ln; i++) latest = Math.max(latest, m.lv[i * LV + 6]);
    // colour needs a second after an object starts; allow that much past `done`
    expect(latest).toBeLessThanOrEqual(city.done + 0.2);
    expect(city.settled).toBeCloseTo(latest + 1.05, 5);
  });

  it("keeps everything that floats in the Spree, clear of its banks and the island", () => {
    let afloat = 0;
    let inTown = 0;
    const aground: string[] = [];
    play(city.done + 2, city.done + 150, 0.5, (x, y, z, t) => {
      if (Math.abs(z - WATER) > 0.05 || nearIslet(x, y)) return;
      afloat++;
      if (y > Y0 && y < Y1) inTown++;
      // a boat is about three wide: its middle keeps a good unit of water on every side
      if (!inWater(x, y, 1) && aground.length < 5) aground.push(`${x.toFixed(1)}, ${y.toFixed(1)} at t=${t.toFixed(1)}`);
    });
    expect(afloat).toBeGreaterThan(2000);
    // and there is always something to watch between the bridges
    expect(inTown).toBeGreaterThan(600);
    expect(aground).toEqual([]);
  });

  it("keeps cars, trams and cyclists on the road and the bridges", () => {
    let driving = 0;
    const off: string[] = [];
    play(city.done + 2, city.done + 90, 0.5, (x, y, z, t) => {
      if (Math.abs(z) > 0.05 || nearIslet(x, y)) return;
      driving++;
      if ((onBlock(x, y) || onIsland(x, y) || !(onBase(x, y) || onDeck(x, y))) && off.length < 5) off.push(`${x.toFixed(1)}, ${y.toFixed(1)} at t=${t.toFixed(1)}`);
    });
    expect(driving).toBeGreaterThan(500);
    expect(off).toEqual([]);
  });

  it("drives on the right", () => {
    // Along a street, whatever heads east (+x) keeps to its south half and whatever
    // heads west to its north; down a street, southbound keeps west. On this page
    // that is the right-hand side of the way each one is facing.
    const before = new Map<number, [number, number]>();
    const wrong: string[] = [];
    let checked = 0;
    for (const t of [city.done + 20, city.done + 20.4]) {
      let k = 0;
      play(t, t + 0.01, 1, (x, y, z) => {
        const id = k++;
        if (Math.abs(z) > 0.05) return;
        const was = before.get(id);
        before.set(id, [x, y]);
        if (!was) return;
        const dx = x - was[0];
        const dy = y - was[1];
        // only what is driving straight along the middle of a stretch of street
        const streetsY = [Y0, ...ROW_Y.map((r) => r + BLOCK)];
        const streetsX = [X0, COL_X[0] + BLOCK, X1 - LANE];
        for (const y0 of streetsY) {
          if (y > y0 && y < y0 + LANE && Math.abs(dy) < 0.02 && Math.abs(dx) > 0.8 && COL_X.some((c) => x > c + 8 && x < c + BLOCK - 8)) {
            checked++;
            if (dx > 0 !== y > y0 + LANE / 2 && wrong.length < 5) wrong.push(`heading ${dx > 0 ? "east" : "west"} at ${x.toFixed(1)}, ${y.toFixed(1)}`);
          }
        }
        for (const x0 of streetsX) {
          if (x > x0 && x < x0 + LANE && Math.abs(dx) < 0.02 && Math.abs(dy) > 0.8 && ROW_Y.some((r) => y > r + 8 && y < r + BLOCK - 8)) {
            checked++;
            if (dy > 0 !== x < x0 + LANE / 2 && wrong.length < 5) wrong.push(`heading ${dy > 0 ? "south" : "north"} at ${x.toFixed(1)}, ${y.toFixed(1)}`);
          }
        }
      });
    }
    expect(checked).toBeGreaterThan(20);
    expect(wrong).toEqual([]);
    // and on the river the boats pass port to port: downstream (north) along the east bank
    expect(RX1 - RX0).toBeGreaterThan(LANE);
  });

  it("never lets two boats, cars or trams run into each other, and finds room for all of them", () => {
    expect(city.trafficClashes).toBe(0);
    expect(city.trafficDropped).toBe(0);
  });

  it("keeps everything that moves inside the depth range, for a whole loop of the timeline", () => {
    let seen = 0;
    const dyn = play(0, tl.end, 0.25, (x, y, z, t) => {
      seen++;
      const d = x + y + z;
      if (!(d > FAR + 10 && d < NEAR - 10)) throw new Error(`a mover reached ${x}, ${y}, ${z} at t=${t}`);
    });
    expect(seen).toBeGreaterThan(1000);
    for (let i = 0; i < dyn.fn * FV; i++) expect(Number.isFinite(dyn.fv[i])).toBe(true);
    for (let i = 0; i < dyn.ln * LV; i++) expect(Number.isFinite(dyn.lv[i])).toBe(true);
  });

  it("keeps the fireworks, drawn by hand each frame, inside the depth range too", () => {
    if (!FRAME.fireworks) return;
    let night = 0;
    let day = 0;
    let frames = 0;
    for (let t = tl.dark; t < tl.nightEnd; t += 0.25) {
      frames++;
      const dyn = play(t, t + 0.01, 1, () => {}, tl.dark);
      night += dyn.ln;
      for (let i = 0; i < dyn.ln; i++) {
        for (let k = 0; k < 6; k += 3) {
          const d = dyn.lv[i * LV + k] + dyn.lv[i * LV + k + 1] + dyn.lv[i * LV + k + 2];
          if (!(d > FAR + 10 && d < NEAR - 10)) throw new Error(`a stroke drawn at t=${t} is at depth ${d}`);
        }
      }
      // the same moment with the lights left off, for comparison
      day += play(t, t + 0.01, 1, () => {}).ln;
    }
    // the rockets went up: a few hundred sparks a frame more than without them
    expect((night - day) / frames).toBeGreaterThan(200);
  });
});
