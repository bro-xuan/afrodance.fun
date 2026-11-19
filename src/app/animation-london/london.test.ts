import { describe, expect, it } from "vitest";
import { heldSecond, planTimeline, planTour } from "./london";
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
    const short = planTour(city.stops, ["westminster", "atlantis", "tower"]);
    expect(short.map((l) => l.stop.id)).toEqual(["westminster", "tower"]);
    expect(planTimeline(8, [], true).tourEnd).toBe(planTimeline(8, [], false).tourEnd);
    expect(planTimeline(8, [], true).closeAt).toBeNull();
  });

  it("takes longer over longer moves, and stays a shorter time on the islets", () => {
    for (const l of legs) {
      expect(l.travel).toBeGreaterThanOrEqual(1.25);
      expect(l.travel).toBeLessThanOrEqual(2.1);
    }
    const hops = legs.slice(1).map((l, k) => ({ d: Math.hypot(l.px - legs[k].px, l.py - legs[k].py), t: l.travel }));
    hops.sort((a, b) => a.d - b.d);
    expect(hops[hops.length - 1].t).toBeGreaterThanOrEqual(hops[0].t);
    const islet = legs.filter((l) => l.stop.quick);
    const block = legs.filter((l) => !l.stop.quick);
    expect(islet.map((l) => l.stop.id).sort()).toEqual(ISLETS.map((s) => s.id).sort());
    expect(Math.max(...islet.map((l) => l.hold))).toBeLessThan(Math.min(...block.map((l) => l.hold)));
  });

  it("runs build, tour, close-up, pull-back, night and fade in that order, inside a minute and a half", () => {
    expect(tl.built).toBe(city.done);
    expect(tl.tourStart).toBeGreaterThan(tl.built);
    let prev = tl.tourStart;
    for (const a of tl.arrivals) {
      expect(a.at).toBeGreaterThan(prev);
      prev = a.at;
    }
    // the last stay and the close-up both fit between the last arrival and the end of the tour
    expect(tl.tourEnd - prev).toBeGreaterThan(5);
    expect(tl.closeAt).not.toBeNull();
    expect(tl.closeAt as number).toBeGreaterThan(prev);
    expect(tl.closeAt as number).toBeLessThan(tl.tourEnd);
    expect(tl.outEnd).toBeGreaterThan(tl.tourEnd);
    expect(tl.duskStart).toBeGreaterThan(tl.outEnd);
    expect(tl.nightEnd - tl.duskStart).toBeGreaterThan(6);
    expect(tl.end).toBeGreaterThan(tl.nightEnd);
    expect(tl.end).toBeLessThan(90);
    // the road traffic is only worked out this far into the timeline
    expect(tl.end).toBeLessThan(TRAFFIC_HORIZON - 5);
    // without a close-up the loop is shorter by exactly the close-up
    expect(planTimeline(city.done, legs, false).end).toBeLessThan(tl.end);
  });

  it("ends close in on the crossing outside the palace", () => {
    expect(TOUR[TOUR.length - 1]).toBe("palace");
    expect(CLOSEUP).not.toBeNull();
    const palace = BLOCKS.find((b) => b.id === "palace");
    if (!CLOSEUP || !palace) return;
    const [ox, oy] = blockOrigin(palace.i, palace.j);
    // on the palace's block or the street just south of it
    expect(CLOSEUP.x).toBeGreaterThan(ox);
    expect(CLOSEUP.x).toBeLessThan(ox + BLOCK);
    expect(CLOSEUP.y).toBeGreaterThan(oy);
    expect(CLOSEUP.y).toBeLessThan(oy + BLOCK + 10);
    expect(CLOSEUP.zoom).toBeGreaterThan(1.5);
  });

  it("holds the film at ?t= only when that is a sensible number of seconds", () => {
    expect(heldSecond("30")).toBe(30);
    expect(heldSecond("0")).toBe(0);
    expect(heldSecond(" 12.5 ")).toBe(12.5);
    // a number the drawing cannot survive (1e308 fills the page with NaN) is as good as no number
    for (const bad of [null, "", "  ", "abc", "-1", "1e300", "1e308", "Infinity", "NaN", "3601"]) expect(heldSecond(bad)).toBeNull();
  });
});
