import { describe, expect, it } from "vitest";
import { V3, paperX, paperY } from "../engine/math";
import { FV, LV, Mesh, Sprite } from "../engine/mesh";
import { Pen } from "../engine/pen";
import { cueStops, planTimeline, planTour } from "../film";
import { BLOCKS, CLOSEUP, ISLETS, TOUR } from "./blocks";
import { ISLET_PLAN, PLAN } from "./blocks/plan";
import { BLOCK, COL, DEPTH, FOOTBRIDGE_W, FOOTBRIDGE_X, GX, GY, ROW, RY0, RY1, STREET, TOWER_BRIDGE, TRAFFIC_HORIZON, WATER, X0, X1, Y0, Y1, buildCity, inWater } from "./city";
import { MoveCtx } from "./types";

const city = buildCity(BLOCKS, ISLETS);

/**
 * The city as the film plays it: every stop knows when the camera arrives,
 * which is what Tower Bridge and the crossing outside the palace take their
 * cue from. The traffic is checked both ways: this is the schedule visitors see.
 */
function asFilmed(): { city: typeof city; end: number } {
  const c = buildCity(BLOCKS, ISLETS);
  const legs = planTour(c.stops, TOUR);
  const tl = planTimeline(c.done, legs, CLOSEUP != null);
  cueStops(legs, tl);
  return { city: c, end: tl.end };
}
const filmed = asFilmed();
/** Both schedules, and the last second worth looking at in each. */
const SCHEDULES: [string, typeof city, number][] = [
  ["with no tour", city, city.done + 100],
  ["as the film times it", filmed.city, filmed.end],
];
const mod = (v: number, m: number) => ((v % m) + m) % m;

// The renderer only draws what lies inside this band of depth (x + y + z).
const NEAR = DEPTH.mid + DEPTH.half;
const FAR = DEPTH.mid - DEPTH.half;

const nearIslet = (x: number, y: number) => ISLETS.some((s) => Math.hypot(x - s.x, y - s.y) < 34);
/** Inside one of the nine blocks. */
const onBlock = (x: number, y: number, pad = 0) => COL.some((cx) => x > cx + pad && x < cx + BLOCK - pad) && ROW.some((ry) => y > ry + pad && y < ry + BLOCK - pad);
/** On tarmac: a street, the ring road, or the deck of a road bridge. */
const onRoad = (x: number, y: number) => {
  if (x < -STREET || x > GX + STREET || y < -STREET || y > GY + STREET) return false;
  if (onBlock(x, y)) return false;
  if (y > RY0 && y < RY1) return [-STREET, 48, 106, GX].some((bx) => x >= bx && x <= bx + STREET);
  return true;
};

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

// Every test here builds the whole city or plays it through a loop: a second or so on a quiet
// laptop, ten times that on a busy one. Room for a busy machine, not for a hang.
describe("the city", { timeout: 60_000 }, () => {
  it("puts one place on every square of the grid, and the camera visits them all", () => {
    expect(BLOCKS.map((b) => b.id).sort()).toEqual(PLAN.map((p) => p.id).sort());
    const squares = new Set(BLOCKS.map((b) => `${b.i},${b.j}`));
    expect(squares.size).toBe(9);
    for (const b of BLOCKS) {
      expect([0, 1, 2]).toContain(b.i);
      expect([0, 1, 2]).toContain(b.j);
      expect(typeof b.build).toBe("function");
    }
    for (const s of ISLETS) expect(typeof s.build).toBe("function");
    const ids = [...PLAN.map((p) => p.id), ...ISLET_PLAN.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect([...TOUR].sort()).toEqual([...ids].sort());
    const stops = city.stops.map((s) => s.id);
    for (const id of TOUR) expect(stops).toContain(id);
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

  it("frames the land and the islets, and lets the river run off the page", () => {
    const b = city.bounds;
    // the slab's west and east corners, on the paper
    expect(b.x0).toBeLessThan((X0 - Y1) * 0.866);
    expect(b.x1).toBeGreaterThan((X1 - Y0) * 0.866);
    // the river's far reaches are hundreds of units long: the frame must not stretch to hold them
    expect(b.x1 - b.x0).toBeLessThan(480);
    expect(inWater(X0 - 150, 123 + 200)).toBe(false);
    expect(inWater(X0 - 12, 123)).toBe(true);
    expect(inWater(X1 + 12, 123)).toBe(true);
    expect(inWater(80, 123)).toBe(true);
    expect(inWater(80, 100)).toBe(false);
  });

  it("keeps everything that floats on the water", () => {
    let afloat = 0;
    const aground: string[] = [];
    play(city.done + 2, city.done + 150, 0.5, (x, y, z, t) => {
      // the islets stand on the paper at water level, so what moves on them is not afloat
      if (Math.abs(z - WATER) > 0.05 || nearIslet(x, y)) return;
      afloat++;
      if (!inWater(x, y, 0) && aground.length < 5) aground.push(`${x.toFixed(1)}, ${y.toFixed(1)} at t=${t.toFixed(1)}`);
    });
    expect(afloat).toBeGreaterThan(1000);
    expect(aground).toEqual([]);
  });

  it("gives every boat on the river clear water ahead of it", () => {
    expect(city.boats.count).toBeGreaterThan(8);
    expect(city.boats.gap).toBeGreaterThan(1);
  });

  it.each(SCHEDULES)("keeps buses, cabs and cars on the road, and never lets one run into the one in front (%s)", (_name, c, until) => {
    const P: V3 = [0, 0, 0];
    const Q: V3 = [0, 0, 0];
    const off: string[] = [];
    const bumps: string[] = [];
    let seen = 0;
    for (let t = c.done; t < until; t += 0.25) {
      c.traffic.lanes.forEach((lane, a) => {
        const L = lane.route.length;
        const at = lane.vehicles.map((_, b) => c.traffic.at(a, b, t));
        lane.vehicles.forEach((v, b) => {
          seen++;
          lane.route.pos(at[b], P);
          if (!onRoad(P[0], P[1]) && off.length < 5) off.push(`${P[0].toFixed(1)}, ${P[1].toFixed(1)} at t=${t}`);
          // the vehicle ahead is the nearest one further round the lane
          let gap = Infinity;
          let ahead = -1;
          at.forEach((s, k) => {
            if (k === b) return;
            const d = mod(s - at[b], L);
            if (d < gap) {
              gap = d;
              ahead = k;
            }
          });
          if (ahead >= 0 && gap < (v.len + lane.vehicles[ahead].len) / 2 - 0.05 && bumps.length < 5) {
            lane.route.pos(at[ahead], Q);
            bumps.push(`lane ${a}: ${gap.toFixed(2)} apart near ${Q[0].toFixed(0)}, ${Q[1].toFixed(0)} at t=${t}`);
          }
        });
      });
    }
    expect(seen).toBeGreaterThan(5000);
    expect(off).toEqual([]);
    expect(bumps).toEqual([]);
  });

  it.each(SCHEDULES)("has the bridge to itself whenever Tower Bridge lifts (%s)", (_name, c, until) => {
    const P: V3 = [0, 0, 0];
    const caught: string[] = [];
    let lifted = 0;
    for (let t = c.done - 0.6; t < until; t += 0.1) {
      // any tilt at all: a bus on a leaf that has only just begun to move is still a bus on a moving leaf
      if (!(c.bridgeLift(t) > 0.001)) continue;
      lifted++;
      c.traffic.lanes.forEach((lane, a) => {
        lane.vehicles.forEach((v, b) => {
          lane.route.pos(c.traffic.at(a, b, t), P);
          const onLeaves = P[0] > TOWER_BRIDGE.x0 && P[0] < TOWER_BRIDGE.x1 && P[1] > TOWER_BRIDGE.y0 - v.len / 2 && P[1] < TOWER_BRIDGE.y1 + v.len / 2;
          if (onLeaves && caught.length < 5) caught.push(`a vehicle at y=${P[1].toFixed(1)} when the leaves are up, t=${t.toFixed(1)}`);
        });
      });
    }
    // the bridge opens once or more in that stretch, for about eleven seconds a time
    expect(lifted).toBeGreaterThan(100);
    expect(caught).toEqual([]);
  });

  it("keeps Tower Bridge clear whatever second the camera reaches the Tower", () => {
    // The tour is retimed by anything that moves a stop. The bridge must not depend on the luck of today's timing.
    const P: V3 = [0, 0, 0];
    const caught: string[] = [];
    for (let shift = -6; shift <= 6; shift += 1.5) {
      const c = buildCity(BLOCKS, ISLETS);
      const legs = planTour(c.stops, TOUR);
      const tl = planTimeline(c.done, legs, CLOSEUP != null);
      cueStops(legs, tl);
      const tower = c.stops.find((q) => q.id === "tower");
      if (!tower || tower.at == null) throw new Error("the Tower is not on the tour");
      tower.at += shift;
      for (let t = c.done - 0.6; t < tl.end; t += 0.1) {
        if (!(c.bridgeLift(t) > 0.001)) continue;
        c.traffic.lanes.forEach((lane, a) => {
          lane.vehicles.forEach((v, b) => {
            lane.route.pos(c.traffic.at(a, b, t), P);
            const onLeaves = P[0] > TOWER_BRIDGE.x0 && P[0] < TOWER_BRIDGE.x1 && P[1] > TOWER_BRIDGE.y0 - v.len / 2 && P[1] < TOWER_BRIDGE.y1 + v.len / 2;
            if (onLeaves && caught.length < 5) caught.push(`arriving ${shift} s off: a vehicle at y=${P[1].toFixed(1)}, t=${t.toFixed(1)}`);
          });
        });
      }
    }
    expect(caught).toEqual([]);
  });

  it.each(SCHEDULES)("has every bus wait at every stop it comes to (%s)", (_name, c, until) => {
    const missed: string[] = [];
    let calls = 0;
    c.traffic.lanes.forEach((lane, a) => {
      const L = lane.route.length;
      lane.vehicles.forEach((v, b) => {
        if (!v.bus) return;
        for (const stop of lane.stops) {
          // seconds spent standing within a length of the stop, since the bus last drove past it
          let stood = 0;
          let before = c.traffic.at(a, b, c.done);
          let ahead = mod(stop - before, L);
          // a bus that first appears right on top of a stop cannot pull up at it
          let fair = ahead > 6;
          for (let t = c.done + 0.1; t < until; t += 0.1) {
            const s = c.traffic.at(a, b, t);
            const d = mod(stop - s, L);
            if (d < 1 && Math.abs(s - before) < 1e-4) stood += 0.1;
            if (ahead < 2 && d > L - 2) {
              // it has just driven past the stop
              if (fair) {
                calls++;
                if (stood < 2 && missed.length < 5) missed.push(`lane ${a}, bus ${b} passed a stop at t=${t.toFixed(1)} after standing ${stood.toFixed(1)} s`);
              }
              stood = 0;
              fair = true;
            }
            before = s;
            ahead = d;
          }
        }
      });
    });
    expect(calls).toBeGreaterThan(8);
    expect(missed).toEqual([]);
  });

  it("works the traffic out the same whether it is prepared for one loop or left to the first frame", () => {
    const ready = asFilmed();
    ready.city.traffic.prepare(ready.end + 1);
    let seen = 0;
    for (let t = ready.city.done - 0.6; t < ready.end; t += 0.5) {
      ready.city.traffic.lanes.forEach((lane, a) => {
        lane.vehicles.forEach((_, b) => {
          seen++;
          expect(ready.city.traffic.at(a, b, t)).toBe(filmed.city.traffic.at(a, b, t));
        });
      });
    }
    expect(seen).toBeGreaterThan(5000);
  });

  it("puts the footbridge where the two places it joins expect it", () => {
    // St Paul's and Bankside both leave a way clear for x 27 to 31 of their block
    expect(FOOTBRIDGE_X - COL[1]).toBe(27);
    expect(FOOTBRIDGE_W).toBe(4);
  });

  it("takes in the whole of Tower Bridge when the tour stops at the Tower", () => {
    const stop = city.stops.find((q) => q.id === "tower");
    if (!stop) throw new Error("no stop at the Tower");
    // a tour stop at zoom 1 shows about 104 x 66 paper units, centred 4.5 above the point it aims at
    const halfW = 104 / stop.zoom / 2;
    const halfH = 66 / stop.zoom / 2;
    const cx = paperX(stop.x, stop.y);
    const cy = paperY(stop.x, stop.y, 4.5);
    // both towers, from the deck to the roofs (about 16 up)
    for (const x of [TOWER_BRIDGE.x0, TOWER_BRIDGE.x1]) {
      for (const y of [TOWER_BRIDGE.y0, TOWER_BRIDGE.y1]) {
        for (const z of [0, 16]) {
          expect(Math.abs(paperX(x, y) - cx)).toBeLessThan(halfW);
          expect(Math.abs(paperY(x, y, z) - cy)).toBeLessThan(halfH);
        }
      }
    }
  });

  it("keeps everything that moves inside the depth range, for a whole loop of the timeline", () => {
    let seen = 0;
    const dyn = play(0, 92, 0.25, (x, y, z, t) => {
      seen++;
      const d = x + y + z;
      if (!(d > FAR + 20 && d < NEAR - 20)) throw new Error(`a mover reached ${x}, ${y}, ${z} at t=${t}`);
    });
    expect(seen).toBeGreaterThan(5000);
    for (let i = 0; i < dyn.fn * FV; i++) expect(Number.isFinite(dyn.fv[i])).toBe(true);
    for (let i = 0; i < dyn.ln * LV; i++) expect(Number.isFinite(dyn.lv[i])).toBe(true);
    // the traffic is worked out this far ahead: a loop of the film has to fit inside it
    expect(TRAFFIC_HORIZON).toBeGreaterThan(100);
  });

  it("keeps the fireworks, drawn by hand each frame, inside the depth range too", () => {
    let sparks = 0;
    let west = 0;
    let east = 0;
    for (let t = 70; t < 80; t += 0.25) {
      const dyn = play(t, t + 0.01, 1, () => {}, 70);
      sparks += dyn.ln;
      for (let i = 0; i < dyn.ln; i++) {
        for (let k = 0; k < 6; k += 3) {
          const d = dyn.lv[i * LV + k] + dyn.lv[i * LV + k + 1] + dyn.lv[i * LV + k + 2];
          if (!(d > FAR + 10 && d < NEAR - 10)) throw new Error(`a stroke drawn at t=${t} is at depth ${d}`);
        }
        // high over the river: a spark, not a boat's wake or the bridge
        if (dyn.lv[i * LV + 2] > 20 && dyn.lv[i * LV + 1] > RY0 - 20 && dyn.lv[i * LV + 1] < RY1 + 20) {
          if (dyn.lv[i * LV] < GX / 3) west++;
          if (dyn.lv[i * LV] > (GX * 2) / 3) east++;
        }
      }
    }
    // far more strokes than the day's hand-drawn movers make: the rockets went up
    expect(sparks).toBeGreaterThan(20000);
    // and they went up all along the river, not at one end of it
    expect(west).toBeGreaterThan(2000);
    expect(east).toBeGreaterThan(2000);
  });
});
