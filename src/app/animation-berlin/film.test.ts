import { describe, expect, it } from "vitest";
import { planTimeline, planTour } from "./film";
import { BLOCKS, CLOSEUP, ISLETS, TOUR } from "./scene/blocks";
import { BLOCK, TRAFFIC_HORIZON, blockOrigin, buildCity } from "./scene/city";

const city = buildCity(BLOCKS, ISLETS);
const legs = planTour(city.stops, TOUR);
const tl = planTimeline(city.done, legs, CLOSEUP != null);

describe("the tour", () => {
  it("stops once at every place on the route, in order", () => {
    expect(legs.map((l) => l.stop.id)).toEqual(TOUR);
    expect(tl.arrivals.map((a) => a.id)).toEqual(TOUR);
  });

  it("leaves out a stop that is not on the map rather than falling over", () => {
    const short = planTour(city.stops, [TOUR[0], "nowhere", TOUR[1]]);
    expect(short.map((l) => l.stop.id)).toEqual([TOUR[0], TOUR[1]]);
    expect(planTimeline(8, [], true).tourEnd).toBe(planTimeline(8, [], false).tourEnd);
  });

  it("takes longer over longer moves, and stays a shorter time on the islands", () => {
    for (const l of legs) {
      expect(l.travel).toBeGreaterThanOrEqual(1.25);
      expect(l.travel).toBeLessThanOrEqual(2.1);
    }
    const hops = legs.slice(1).map((l, k) => ({ d: Math.hypot(l.px - legs[k].px, l.py - legs[k].py), t: l.travel }));
    hops.sort((a, b) => a.d - b.d);
    if (hops.length > 1) expect(hops[hops.length - 1].t).toBeGreaterThanOrEqual(hops[0].t);
    const island = legs.filter((l) => l.stop.quick);
    const block = legs.filter((l) => !l.stop.quick);
    if (island.length && block.length) expect(Math.max(...island.map((l) => l.hold))).toBeLessThan(Math.min(...block.map((l) => l.hold)));
  });

  it("runs build, tour, close-up, pull-back, night and fade in order, inside a minute and a half or so", () => {
    expect(tl.built).toBe(city.done);
    expect(tl.tourStart).toBeGreaterThan(tl.built);
    let prev = tl.tourStart;
    for (const a of tl.arrivals) {
      expect(a.at).toBeGreaterThan(prev);
      prev = a.at;
    }
    expect(tl.tourEnd).toBeGreaterThan(prev);
    expect(tl.outEnd).toBeGreaterThan(tl.tourEnd);
    expect(tl.duskStart).toBeGreaterThan(tl.outEnd);
    expect(tl.nightEnd - tl.duskStart).toBeGreaterThan(6);
    expect(tl.end).toBeGreaterThan(tl.nightEnd);
    // the traffic is only checked this far
    expect(tl.end).toBeLessThan(TRAFFIC_HORIZON);
    // shorter than this and it is over before it starts; longer and people stop watching (FRAME.pace sets the stays)
    expect(tl.end, `loop is ${tl.end.toFixed(1)} s`).toBeGreaterThan(40);
    expect(tl.end, `loop is ${tl.end.toFixed(1)} s`).toBeLessThan(100);
    for (const a of tl.arrivals) expect(a.leave).toBeGreaterThan(a.at);
    if (tl.closeup) {
      expect(tl.closeup.at).toBeGreaterThan(tl.arrivals[tl.arrivals.length - 1].leave);
      expect(tl.closeup.until).toBe(tl.tourEnd);
    }
    expect(tl.dark).toBeGreaterThan(tl.duskStart);
    expect(tl.dark).toBeLessThan(tl.nightEnd);
  });

  it("ends close in on something inside the last stop, if there is a close-up", () => {
    if (!CLOSEUP) return;
    const last = BLOCKS.find((b) => b.id === TOUR[TOUR.length - 1]);
    expect(last).toBeDefined();
    if (!last) return;
    const [ox, oy] = blockOrigin(last.i, last.j);
    expect(CLOSEUP.x).toBeGreaterThan(ox);
    expect(CLOSEUP.x).toBeLessThan(ox + BLOCK);
    expect(CLOSEUP.y).toBeGreaterThan(oy);
    expect(CLOSEUP.y).toBeLessThan(oy + BLOCK);
    expect(CLOSEUP.zoom).toBeGreaterThan(1.5);
  });
});
