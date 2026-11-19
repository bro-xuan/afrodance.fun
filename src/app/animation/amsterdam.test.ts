import { describe, expect, it } from "vitest";
import { planTimeline, planTour } from "./amsterdam";
import { BLOCKS, CLOSEUP, ISLETS, TOUR } from "./scene/blocks";
import { BLOCK, PITCH, buildCity } from "./scene/city";

const city = buildCity(BLOCKS, ISLETS);
const legs = planTour(city.stops, TOUR);
const tl = planTimeline(city.done, legs, CLOSEUP != null);

describe("the tour", () => {
  it("stops once at every place on the route, in order", () => {
    expect(legs.map((l) => l.stop.id)).toEqual(TOUR);
    expect(tl.arrivals.map((a) => a.id)).toEqual(TOUR);
  });

  it("leaves out a stop that is not on the map rather than falling over", () => {
    const short = planTour(city.stops, ["dam", "atlantis", "jordaan"]);
    expect(short.map((l) => l.stop.id)).toEqual(["dam", "jordaan"]);
    expect(planTimeline(8, [], true).tourEnd).toBe(planTimeline(8, [], false).tourEnd);
  });

  it("takes longer over longer moves, and stays a shorter time on the islands", () => {
    for (const l of legs) {
      expect(l.travel).toBeGreaterThanOrEqual(1.25);
      expect(l.travel).toBeLessThanOrEqual(2.1);
    }
    // Centraal to Noord is a hop across the IJ; Noord to the Oosterdok is further
    const byId = Object.fromEntries(legs.map((l) => [l.stop.id, l]));
    expect(byId.polder.travel).toBeGreaterThan(byId.windmill.travel);
    const island = legs.filter((l) => l.stop.quick);
    const block = legs.filter((l) => !l.stop.quick);
    expect(island.map((l) => l.stop.id).sort()).toEqual(ISLETS.map((s) => s.id).sort());
    expect(Math.max(...island.map((l) => l.hold))).toBeLessThan(Math.min(...block.map((l) => l.hold)));
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
    expect(tl.outEnd).toBeGreaterThan(tl.tourEnd);
    expect(tl.duskStart).toBeGreaterThan(tl.outEnd);
    expect(tl.nightEnd - tl.duskStart).toBeGreaterThan(6);
    expect(tl.end).toBeGreaterThan(tl.nightEnd);
    expect(tl.end).toBeLessThan(90);
    // without a close-up the loop is shorter by exactly the close-up
    expect(planTimeline(city.done, legs, false).end).toBeLessThan(tl.end);
  });

  it("ends close in on something that happens on the Dam", () => {
    expect(TOUR[TOUR.length - 1]).toBe("dam");
    expect(CLOSEUP).not.toBeNull();
    const dam = BLOCKS.find((b) => b.id === "dam");
    if (!CLOSEUP || !dam) return;
    expect(CLOSEUP.x).toBeGreaterThan(dam.i * PITCH);
    expect(CLOSEUP.x).toBeLessThan(dam.i * PITCH + BLOCK);
    expect(CLOSEUP.y).toBeGreaterThan(dam.j * PITCH);
    expect(CLOSEUP.y).toBeLessThan(dam.j * PITCH + BLOCK);
    expect(CLOSEUP.zoom).toBeGreaterThan(1.5);
  });
});
