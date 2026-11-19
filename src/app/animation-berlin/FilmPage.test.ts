import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilmPage } from "./FilmPage";
import { PLACE } from "./place";

// What the server sends before any drawing happens: the page has to make sense like this too.
const html = renderToStaticMarkup(createElement(FilmPage));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe(`the ${PLACE.path} page`, () => {
  it("is a canvas that says what it shows, under a title", () => {
    expect(html).toContain("<canvas");
    expect(html).toContain('role="img"');
    expect(html).toContain(`aria-label="${esc(PLACE.alt)}"`);
    expect(html).toContain(`<h1>${esc(PLACE.name)}</h1>`);
    expect(html).toContain(esc(PLACE.tagline));
  });

  it("offers pause and draw-again buttons with names, and a way home", () => {
    expect(html).toContain('aria-label="Pause"');
    expect(html).toContain('aria-label="Draw it again"');
    expect(html).toContain(`href="/"`);
    expect(html).toContain(esc(PLACE.home));
    expect(html).toContain("drag to look around, scroll to zoom");
  });

  it("starts with no caption showing, no fallback message and no way back to a tour it has not left", () => {
    expect(html).toMatch(/data-show="false"[^>]*aria-hidden="true"/);
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("WebGL2");
    expect(html).not.toContain("back to the tour");
  });

  it("has had its placeholders filled in", () => {
    for (const v of Object.values(PLACE)) expect(String(v)).not.toMatch(/__[A-Z]+__/);
  });
});
