import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UseCaseGalleryVisual from "./UseCaseGalleryVisual";

type Rect = { x: number; y: number; width: number; height: number; fill?: string };

function rects(markup: string): Rect[] {
  return [...markup.matchAll(/<rect\b([^>]*?)\/?>/g)].map(([, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return { x: +a.x, y: +a.y, width: +a.width, height: +a.height, fill: a.fill };
  });
}

const html = renderToStaticMarkup(createElement(UseCaseGalleryVisual));
const all = rects(html);
const cover = (cls: string) => rects(html.match(new RegExp(`<rect class="${cls}"[^>]*>`))![0])[0];
const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

describe("UseCaseGalleryVisual", () => {
  it("lays eight 11px tiles on a four-by-two grid", () => {
    const tiles = all.filter((r) => r.width === 11 && r.height === 11);
    expect(tiles.map((t) => [t.x, t.y])).toEqual([
      [4, 8], [17, 8], [30, 8], [43, 8],
      [4, 21], [17, 21], [30, 21], [43, 21],
    ]);
  });

  it("shrinks each row's cover in four whole tile steps, with paper to spare round the tiles", () => {
    for (const [cls, rowY] of [["wpv-cover-a", 8], ["wpv-cover-b", 21]] as const) {
      const c = cover(cls);
      expect(c.width).toBe(4 * 13);
      expect(c.x).toBeLessThan(4);
      expect(c.x + c.width).toBeGreaterThan(43 + 11);
      expect(c.y).toBeLessThan(rowY);
      expect(c.y + c.height).toBeGreaterThan(rowY + 11);
    }
  });

  it("lifts the issue's cover in whole 5px bands, with blank paper under both of its edges", () => {
    const c = cover("wpv-cover-page");
    expect(c.height % 5).toBe(0);
    const printed = all.filter((r) => !same(r, c) && r.x >= 67 && r.x < 92 && r.y >= c.y && r.y < 36);
    expect(printed.length).toBeGreaterThan(0);
    for (const r of printed) {
      expect(r.y).toBeGreaterThan(c.y);
      expect(r.y + r.height).toBeLessThan(c.y + c.height);
    }
  });

  it("frames three picks and prints them in the issue as thumbnails in their topic colours", () => {
    expect(html.match(/class="wpv-pick"/g)).toHaveLength(3);
    const thumbs = all.filter((r) => r.width === 6 && r.height === 4);
    expect(thumbs.map((t) => t.fill)).toEqual(["#007748", "#734dbe", "#6b6620"]);
  });
});
