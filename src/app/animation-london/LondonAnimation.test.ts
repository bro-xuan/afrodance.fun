import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LondonAnimation } from "./LondonAnimation";

// What the server sends before any drawing happens: the page has to make sense like this too.
const html = renderToStaticMarkup(createElement(LondonAnimation));

describe("the /animation-london page", () => {
  it("is a canvas that says what it shows, under a title", () => {
    expect(html).toContain("<canvas");
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="An isometric drawing of London[^"]+"/);
    expect(html).toContain("<h1>London</h1>");
    expect(html).toContain("drawn in code");
  });

  it("offers pause and draw-again buttons with names, and a way home", () => {
    expect(html).toContain('aria-label="Pause"');
    expect(html).toContain('aria-label="Draw it again"');
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>afrodance\.fun<\/a>/);
    expect(html).toContain("drag to look around, scroll to zoom");
  });

  it("starts with no caption showing, no fallback message and no way back to a tour it has not left", () => {
    expect(html).toMatch(/data-show="false"[^>]*aria-hidden="true"/);
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("WebGL2");
    expect(html).not.toContain("back to the tour");
  });
});
