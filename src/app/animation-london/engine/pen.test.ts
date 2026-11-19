import { describe, expect, it } from "vitest";
import { C30 } from "./math";
import { FV, LV, Mesh } from "./mesh";
import { Pen } from "./pen";

/** Area on paper of everything filled so far. */
function filledArea(m: Mesh): number {
  let area = 0;
  const px = (i: number) => (m.fv[i * FV] - m.fv[i * FV + 1]) * C30;
  const py = (i: number) => (m.fv[i * FV] + m.fv[i * FV + 1]) * 0.5 - m.fv[i * FV + 2];
  for (let i = 0; i < m.fn; i += 3) {
    area += Math.abs((px(i + 1) - px(i)) * (py(i + 2) - py(i)) - (px(i + 2) - px(i)) * (py(i + 1) - py(i))) / 2;
  }
  return area;
}

describe("the pen", () => {
  it("fills a concave outline exactly, with no overlap and nothing left out", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    // an L on the ground: 3 x 3 with a 2 x 2 bite out of one corner, so 5 square units
    pen.floor(0, 0).poly(
      [
        [0, 0],
        [3, 0],
        [3, 1],
        [1, 1],
        [1, 3],
        [0, 3],
      ],
      [200, 200, 200],
    );
    // a unit square of ground covers C30 of paper
    expect(filledArea(m)).toBeCloseTo(5 * C30, 6);
  });

  it("draws only the faces of a box that the camera can see", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    pen.box(0, 0, 0, 2, 2, 2, [200, 200, 200], { edges: false });
    // +x, +y and the top: three quads, two triangles each
    expect(m.fn).toBe(18);
    const turned = new Mesh();
    const pen2 = new Pen(turned);
    pen2.push(0, 0, 0, 180);
    pen2.box(0, 0, 0, 2, 2, 2, [200, 200, 200], { edges: false });
    pen2.pop();
    expect(turned.fn).toBe(18);
  });

  it("inks each visible edge of a box once", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    pen.wobble = 0;
    pen.box(0, 0, 0, 1, 1, 1, [200, 200, 200], { over: 0 });
    // nine visible edges, each short enough to be a single stroke piece
    expect(m.ln).toBe(9);
  });

  it("swallows drawing on a wall that faces away, and keeps it on one that faces the camera", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    pen.wall("x-", 0, 0, 0, 4, 4).rect(0, 0, 1, 1, [0, 0, 0]);
    pen.wall("y-", 0, 0, 0, 4, 4).rect(0, 0, 1, 1, [0, 0, 0]);
    expect(m.fn).toBe(0);
    pen.wall("x+", 0, 0, 0, 4, 4).rect(0, 0, 1, 1, [0, 0, 0]);
    pen.wall("y+", 0, 0, 0, 4, 4).rect(0, 0, 1, 1, [0, 0, 0]);
    expect(m.fn).toBe(12);
  });

  it("gives one object one start time, orders its strokes, and spreads its colour wipe from 0 to 1", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    pen.reveal = () => 4.5;
    pen.obj(() => {
      pen.box(0, 0, 0, 2, 2, 2, [200, 200, 200]);
      pen.box(3, 0, 0, 1, 1, 1, [200, 200, 200]);
    });
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < m.fn; i++) {
      expect(m.fv[i * FV + 3]).toBe(4.5);
      lo = Math.min(lo, m.fv[i * FV + 4]);
      hi = Math.max(hi, m.fv[i * FV + 4]);
    }
    expect(lo).toBeCloseTo(0, 6);
    expect(hi).toBeCloseTo(1, 6);
    let last = -1;
    for (let i = 0; i < m.ln; i++) {
      expect(m.lv[i * LV + 6]).toBe(4.5);
      const u0 = m.lv[i * LV + 7];
      const u1 = m.lv[i * LV + 8];
      expect(u0).toBeGreaterThanOrEqual(last - 1e-6);
      expect(u1).toBeGreaterThan(u0);
      expect(u1).toBeLessThanOrEqual(1 + 1e-6);
      last = u0;
    }
  });

  it("never writes a number that is not a number", () => {
    const m = new Mesh();
    const pen = new Pen(m);
    pen.cyl(0, 0, 0, 2, 3, [200, 200, 200]);
    pen.cone(0, 0, 3, 2, 2, [200, 200, 200]);
    pen.dome(5, 5, 0, 2, 2, [200, 200, 200]);
    pen.gable(0, 5, 0, 3, 4, 2, "y", [200, 200, 200]);
    pen.hip(5, 0, 0, 3, 4, 2, [200, 200, 200]);
    pen.card(1, 1, 0).circle(0, 1, 1, [200, 200, 200], { outline: true });
    pen.wall("y+", 0, 0, 0, 5, 5).text("KAAS", 1, 1, 0.5);
    for (let i = 0; i < m.fn * FV; i++) expect(Number.isFinite(m.fv[i])).toBe(true);
    for (let i = 0; i < m.ln * LV; i++) expect(Number.isFinite(m.lv[i])).toBe(true);
    expect(m.fn).toBeGreaterThan(0);
    expect(m.ln).toBeGreaterThan(0);
  });
});
