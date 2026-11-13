import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PhotoRelightVisual from "./PhotoRelightVisual";

type Rect = { x: number; y: number; width: number; height: number; fill?: string };

function rects(markup: string): Rect[] {
  return [...markup.matchAll(/<rect\b([^>]*?)\/?>/g)].map(([, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return { x: +a.x, y: +a.y, width: +a.width, height: +a.height, fill: a.fill };
  });
}

const html = renderToStaticMarkup(createElement(PhotoRelightVisual));

/** The rects of one photo layer; both hold rects only, so the first </g> closes them. */
const layer = (id: string) => rects(html.match(new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`))![1]);

describe("PhotoRelightVisual", () => {
  it.each(["rlv-original", "rlv-relit"])("%s covers the 28×32 print exactly, row by row", (id) => {
    const rows = new Map<number, Rect[]>();
    for (const r of layer(id)) rows.set(r.y, [...(rows.get(r.y) ?? []), r]);
    expect([...rows.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 32 }, (_, i) => 4 + i));
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      let x = 34;
      for (const r of row) {
        expect(r.x).toBe(x); // no gap and no overlap with the run before
        expect(r.height).toBe(1);
        x += r.width;
      }
      expect(x).toBe(62);
    }
  });

  it("gives the sun, the rims and the highlights to the relit photo only", () => {
    const lit = ["#fff3d2", "#ffd07a", "#f2a65a", "#e5a060", "#fbd6a8"];
    const fills = (id: string) => new Set(layer(id).map((r) => r.fill));
    expect(lit.filter((c) => fills("rlv-original").has(c))).toEqual([]);
    expect(lit.filter((c) => !fills("rlv-relit").has(c))).toEqual([]);
  });

  it("cuts the relit photo into seven side-by-side 4px strips across the print", () => {
    const clips = [...html.matchAll(/<clipPath id="rlv-strip-\d"><rect\b([^>]*?)\/?>/g)].map(
      ([, attrs]) => rects(`<rect${attrs}>`)[0],
    );
    expect(clips.map((r) => r.x)).toEqual([34, 38, 42, 46, 50, 54, 58]);
    expect(clips.every((r) => r.width === 4 && r.y === 4 && r.height === 32)).toBe(true);
  });

  it("walks the light in from the sun's side and back out, with the right three strips lit when still", () => {
    const strips = [
      ...html.matchAll(
        /class="rlv-reveal" style="opacity:(\d);animation-delay:([\d.]+)s"><g class="rlv-revert" style="animation-delay:([\d.]+)s">/g,
      ),
    ];
    expect(strips.map(([, still]) => still)).toEqual(["0", "0", "0", "0", "1", "1", "1"]);
    expect(strips.map(([, , reveal]) => reveal)).toEqual(["1.2", "1.0", "0.8", "0.6", "0.4", "0.2", "0.0"]);
    expect(strips.map(([, , , revert]) => revert)).toEqual(["0.0", "0.2", "0.4", "0.6", "0.8", "1.0", "1.2"]);
  });
});
