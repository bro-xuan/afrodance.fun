import { describe, expect, it } from "vitest";
import { Mesh } from "../engine/mesh";
import { Pen, Plane, hasGlyph } from "../engine/pen";
import { planTimeline, planTour } from "../film";
import { BLOCKS, CLOSEUP, ISLETS, TOUR } from "./blocks";
import { buildCity } from "./city";
import { MoveCtx } from "./types";

// Builds the whole city and plays it through a loop: a second or so on a quiet
// laptop, ten times that on a busy one. Room for a busy machine, not for a hang.
describe("the lettering", { timeout: 60_000 }, () => {
  it("has a shape for every character the city writes, on its signs and as it moves", () => {
    // A character with no shape is skipped without a word: SPÄTI would read SP TI.
    const missing = new Map<string, string>();
    let written = 0;
    const real = Plane.prototype.text;
    Plane.prototype.text = function (this: Plane, ...args: Parameters<typeof real>) {
      written++;
      for (const ch of args[0]) if (!hasGlyph(ch) && !missing.has(ch)) missing.set(ch, args[0]);
      return real.apply(this, args);
    };
    try {
      const city = buildCity(BLOCKS, ISLETS);
      const tl = planTimeline(city.done, planTour(city.stops, TOUR), CLOSEUP != null);
      // and whatever the movers letter as the film runs
      const dyn = new Mesh(1 << 12, 1 << 12);
      const pen = new Pen(dyn, 1);
      for (let t = 0; t < tl.end; t += 0.5) {
        const m: MoveCtx = { mesh: dyn, pen, t, clock: t, night: t > tl.dark ? 1 : 0, nightAt: tl.dark, put() {}, sees: () => true };
        dyn.clear();
        for (const mover of city.movers) mover(m);
      }
    } finally {
      Plane.prototype.text = real;
    }
    // the city is full of signs: if next to nothing was lettered, this test is not looking at anything
    expect(written).toBeGreaterThan(20);
    expect([...missing].map(([ch, str]) => `"${ch}" in "${str}"`)).toEqual([]);
  });

  it("knows the letters Berlin needs", () => {
    for (const word of ["SPÄTI", "DÖNER", "BÜCHER", "CAFÉ", "BÄCKEREI", "STRASSE DES 17. JUNI", "U1", "KADEWE", "straße"]) expect(hasGlyph(word), word).toBe(true);
    expect(hasGlyph("€")).toBe(false);
  });
});
