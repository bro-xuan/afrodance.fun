import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AmsterdamAnimation } from "./AmsterdamAnimation";

// What the server sends before any drawing happens: the page has to make sense like this too.
const html = renderToStaticMarkup(createElement(AmsterdamAnimation));

describe("the /animation page", () => {
  it("is a canvas that says what it shows, under a title", () => {
    expect(html).toContain("<canvas");
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="An isometric drawing of Amsterdam[^"]+"/);
    expect(html).toContain("<h1>Amsterdam</h1>");
    expect(html).toContain("drawn in code");
  });

  it("offers pause and draw-again buttons with names, and a way home", () => {
    expect(html).toContain('aria-label="Pause"');
    expect(html).toContain('aria-label="Draw it again"');
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>afrodance\.fun<\/a>/);
    expect(html).toContain("drag to look around, scroll to zoom");
  });

  it("starts with no caption showing, no fallback message and no way back to a tour it has not left", () => {
    expect(html).toMatch(/data-show="false"[^>]*aria-live="polite"/);
    expect(html).not.toContain("WebGL2");
    expect(html).not.toContain("back to the tour");
  });
});
