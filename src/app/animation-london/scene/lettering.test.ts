import { describe, expect, it } from "vitest";
import { Mesh } from "../engine/mesh";
import { Pen, Plane, hasGlyph } from "../engine/pen";
import { BLOCKS, ISLETS } from "./blocks";
import { buildCity } from "./city";
import { MoveCtx } from "./types";

describe("the lettering", () => {
  it("has a shape for every character the city writes, on its signs and as it moves", () => {
    // A character with no shape is skipped without a word: the sign just loses a letter.
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
      // and whatever the movers letter as the film runs: scoreboards, departure boards, BONG
      const dyn = new Mesh(1 << 12, 1 << 12);
      const pen = new Pen(dyn, 1);
      for (let t = 0; t < 82; t += 0.5) {
        const m: MoveCtx = { mesh: dyn, pen, t, clock: t, night: t > 72 ? 1 : 0, nightAt: 72, put() {}, sees: () => true };
        dyn.clear();
        for (const mover of city.movers) mover(m);
      }
    } finally {
      Plane.prototype.text = real;
    }
    // the city is full of signs: if next to nothing was lettered, this test is not looking at anything
    expect(written).toBeGreaterThan(200);
    expect([...missing].map(([ch, str]) => `"${ch}" in "${str}"`)).toEqual([]);
  });
});
