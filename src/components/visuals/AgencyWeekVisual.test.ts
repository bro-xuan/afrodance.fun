import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AgencyWeekVisual, {
  BODY_BOTTOM,
  BODY_TOP,
  COL0,
  COL_W,
  HEART_ART,
  LIFT,
  PITCH,
  POSTS,
  tileX,
} from "./AgencyWeekVisual";

const html = renderToStaticMarkup(createElement(AgencyWeekVisual));
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

type Stop = { at: number; opacity: number; move?: [number, number] };

/** A keyframes block's stops in order, one per percentage, with its opacity and translate. */
function stops(name: string): Stop[] {
  const body = css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`))![1];
  return [...body.matchAll(/^\s*([\d.%,\s]+?)\s*\{([^}]*)\}/gm)].flatMap(([, at, decl]) => {
    const t = decl.match(/translate\((-?[\d.]+)(?:px)?,\s*(-?[\d.]+)(?:px)?\)/);
    const move: [number, number] | undefined = t ? [Number(t[1]), Number(t[2])] : undefined;
    const opacity = Number(decl.match(/opacity:\s*([\d.]+)/)![1]);
    return at.split(",").map((p) => ({ at: Number(p.trim().replace("%", "")), opacity, move }));
  });
}

/** The [from, to) stretches of the loop a class shows for; every interval holds (steps(1, end)). */
function shown(name: string): [number, number][] {
  const s = stops(name);
  const spans: [number, number][] = [];
  s.forEach((stop, i) => {
    if (stop.opacity === 1 && s[i + 1]) spans.push([stop.at, s[i + 1].at]);
  });
  return spans;
}

describe("AgencyWeekVisual", () => {
  it("draws every photo 18×13 and every tile 5×5, with a colour for every pixel", () => {
    for (const post of POSTS) {
      expect(post.photo).toHaveLength(13);
      expect(post.mini).toHaveLength(5);
      for (const row of post.photo) expect(row).toHaveLength(18);
      for (const row of post.mini) expect(row).toHaveLength(5);
      const used = new Set([...post.photo.join(""), ...post.mini.join("")]);
      expect([...used].filter((ch) => !post.colours[ch])).toEqual([]);
    }
  });

  it("lifts every post off the same spot on the phone and lands it on its slot, in whole pixels", () => {
    for (const post of POSTS) {
      const flight = stops(`awv-post-${post.key}`).filter((s) => s.opacity === 1);
      expect(flight[0].move).toEqual([LIFT.x - tileX(post.day), LIFT.y - post.y]);
      expect(flight.at(-1)!.move).toEqual([0, 0]);
      for (const { move } of flight) for (const d of move!) expect(Number.isInteger(d)).toBe(true);
    }
  });

  it("sends a post only while its own photo is on the phone, after the owner's tap", () => {
    const taps = shown("awv-press").map(([from]) => from);
    for (const post of POSTS) {
      const [from, to] = shown(`awv-screen-${post.key}`)[0];
      const flight = stops(`awv-post-${post.key}`).filter((s) => s.opacity === 1);
      const [takeoff, landing] = [flight[0].at, flight.at(-1)!.at];
      expect(taps.some((t) => t >= from && t < takeoff)).toBe(true);
      expect(landing).toBeLessThan(to);
    }
  });

  it("keeps every post inside its day's column, and its heart in the week clear of it", () => {
    for (const post of POSTS) {
      const column = COL0 + post.day * PITCH;
      expect(tileX(post.day)).toBeGreaterThanOrEqual(column);
      expect(tileX(post.day) + 5).toBeLessThan(column + COL_W); // the shadow, too
      expect(post.y + 6).toBeLessThanOrEqual(BODY_BOTTOM);

      const heartTop = post.y - 6;
      const rise = stops(`awv-heart-${post.key}`).find((s) => s.opacity === 1)!.move![1];
      expect(heartTop).toBeGreaterThan(BODY_TOP); // a row under the header's rule
      expect(heartTop + HEART_ART.length - 1 + rise).toBeLessThan(post.y);
    }
  });

  it("rests on the finished frame: the third post up, the other screens and the tap hidden", () => {
    const hidden = css.match(/((?:\.awv-[\w-]+,\s*)*\.awv-[\w-]+)\s*\{\s*opacity:\s*0;\s*\}/)![1];
    expect(new Set(hidden.split(/,\s*/))).toEqual(
      new Set([".awv-screen-a", ".awv-screen-b", ".awv-done", ".awv-press", ".awv-ring"]),
    );
  });

  it("freezes every animated part for prefers-reduced-motion", () => {
    const classes = new Set([...html.matchAll(/class="(awv-[\w-]+)"/g)].map(([, c]) => c));
    const frozen = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*((?:\.awv-[\w-]+,?\s*)+)\{/)![1];
    expect(classes.size).toBe(12);
    for (const c of classes) expect(frozen).toContain(`.${c}`);
  });
});
