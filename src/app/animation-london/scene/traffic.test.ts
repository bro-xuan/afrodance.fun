import { describe, expect, it } from "vitest";
import { V3 } from "../engine/math";
import { Sprite } from "../engine/mesh";
import { Route } from "./motion";
import { Lane, Traffic, Vehicle } from "./traffic";

// A square circuit, 40 a side: 160 round.
const SQUARE: V3[] = [
  [0, 0, 0],
  [40, 0, 0],
  [40, 40, 0],
  [0, 40, 0],
];
const L = 160;
const noSprite = (): Sprite => {
  throw new Error("nothing is drawn in these tests");
};
const car = (at: number, o: Partial<Vehicle> = {}): Vehicle => ({ len: 2.4, speed: 5, at, sprite: noSprite, born: 0, ...o });

/** A circuit with these vehicles on it, the traffic first showing at second 0. */
function circuit(vehicles: Vehicle[], set?: (traffic: Traffic, lane: Lane) => void): Traffic {
  const traffic = new Traffic();
  const lane = new Lane(new Route(SQUARE, true));
  lane.vehicles.push(...vehicles);
  traffic.lanes.push(lane);
  set?.(traffic, lane);
  traffic.mover(0);
  return traffic;
}
const speed = (traffic: Traffic, vehicle: number, t: number) => (traffic.at(0, vehicle, t + 0.5) - traffic.at(0, vehicle, t)) / 0.5;

describe("road traffic", () => {
  it("lets a vehicle with the lane to itself cruise", () => {
    const traffic = circuit([car(0.25)]);
    expect(traffic.at(0, 0, 0)).toBeCloseTo(40, 3);
    expect(traffic.at(0, 0, 20)).toBeCloseTo(40 + 5 * 20, 1);
  });

  it("holds the queue at a shut line and lets it go again, however few are on the lane", () => {
    for (const n of [1, 2, 3, 5]) {
      // a line 70 round the circuit (the leader starts at most 19 round), shut from second 2 to second 30
      const vehicles = Array.from({ length: n }, (_, i) => car(i * 0.03));
      const traffic = circuit(vehicles, (t) => t.halts.push({ x: 40, y: 30, r: 0, closed: (s) => s > 2 && s < 30 }));
      // nobody crosses the line while it is shut: the leader stands with its nose just short of it
      const leader = n - 1;
      expect(traffic.at(0, leader, 29)).toBeGreaterThan(70 - 1.2 - 1);
      expect(traffic.at(0, leader, 29)).toBeLessThan(70 - 1.2 + 0.3);
      expect(Math.abs(speed(traffic, leader, 28))).toBeLessThan(0.01);
      // and every one of them is under way again well after it opens
      for (let i = 0; i < n; i++) {
        expect(speed(traffic, i, 50)).toBeGreaterThan(4);
        expect(traffic.at(0, i, 70)).toBeGreaterThan(200);
      }
      // never closer than bumper to bumper
      for (let t = 0; t < 70; t += 0.25) {
        for (let i = 0; i + 1 < n; i++) expect(traffic.at(0, i + 1, t) - traffic.at(0, i, t)).toBeGreaterThan(2.4 - 0.05);
      }
    }
  });

  it("gets two vehicles that are alone on a lane, nose to tail, under way", () => {
    // 0.8 apart, a touch closer than they queue: how a pair often ends up behind a shut line. The
    // one in front must not take the one behind it, a whole lap ahead, for a wall.
    const traffic = circuit([car(0), car(0.02)]);
    expect(traffic.at(0, 1, 0) - traffic.at(0, 0, 0) - 2.4).toBeCloseTo(0.8, 3);
    for (const v of [0, 1]) {
      expect(speed(traffic, v, 20)).toBeGreaterThan(4);
      expect(traffic.at(0, v, 40)).toBeGreaterThan(150);
    }
  });

  it("has a bus wait at its stop, every time round, and a car drive past it", () => {
    const traffic = circuit([car(0, { bus: true, len: 5.6 }), car(0.5)], (_t, lane) => lane.stops.push(60));
    for (const who of [0, 1]) {
      // seconds standing still within a length of the stop, each time it goes by
      const waits: number[] = [];
      let stood = 0;
      let before = traffic.at(0, who, 0);
      for (let t = 0.1; t < 140; t += 0.1) {
        const s = traffic.at(0, who, t);
        const d = (((60 - s) % L) + L) % L;
        if (d < 1 && Math.abs(s - before) < 1e-4) stood += 0.1;
        if (d > L - 3 && d < L - 2 && stood >= 0) {
          waits.push(stood);
          stood = -1;
        }
        if (d < 10 && stood < 0) stood = 0;
        before = s;
      }
      expect(waits.length).toBeGreaterThanOrEqual(3);
      if (who === 0) for (const w of waits) expect(w).toBeGreaterThan(2);
    }
    // the car is held up behind the bus while it waits, but never stands at the stop on its own account
    expect(traffic.at(0, 1, 140)).toBeGreaterThan(traffic.at(0, 0, 140));
  });

  it("gives the same answers whether it is worked out ahead for one loop or on first asking", () => {
    const make = () => circuit([car(0), car(0.2, { bus: true, len: 5.6 }), car(0.6)], (t, lane) => {
      lane.stops.push(100);
      t.halts.push({ x: 40, y: 20, r: 0.4, closed: (s) => s % 30 < 9 });
    });
    const lazy = make();
    const ready = make();
    ready.prepare(81);
    for (let t = 0; t <= 80; t += 0.5) for (let v = 0; v < 3; v++) expect(ready.at(0, v, t)).toBe(lazy.at(0, v, t));
    // past what was prepared it carries on at cruising speed rather than stopping dead or jumping back
    expect(ready.at(0, 0, 90)).toBeGreaterThan(ready.at(0, 0, 80));
  });
});
