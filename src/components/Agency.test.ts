import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { aboutConfig, agency } from "@/data/projects";
import Agency from "./Agency";
import Hero from "./Hero";

const html = renderToStaticMarkup(createElement(Agency));
/** The markup's text with React's escapes undone, to look for copy in. */
const text = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("Agency", () => {
  it("is where the hero's agency link lands", () => {
    // the in-page link whose own text (up to its </a>) mentions the agency
    const target = renderToStaticMarkup(createElement(Hero)).match(
      /<a href="#([^"]+)"[^>]*>(?:(?!<\/a>)[^])*creative content agency/,
    );
    expect(target?.[1]).toBe("agency");
    expect(html).toContain('id="agency"');
  });

  it("opens every outside link in a new tab without handing it the opener", () => {
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /href="https:/.test(tag));
    expect(links).toHaveLength(3); // the scene, the site button, LinkedIn
    for (const tag of links) {
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    const hrefs = links.map((tag) => tag.match(/href="([^"]+)"/)![1]);
    expect(new Set(hrefs)).toEqual(new Set([agency.url, agency.contact.url]));
  });

  it("keeps the scene out of the tab order, since the site button goes to the same place", () => {
    const scene = html.match(new RegExp(`<a href="${agency.url.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"[^>]*>(?=<div)`))![0];
    expect(scene).toContain('tabindex="-1"');
    expect(scene).toContain('aria-hidden="true"');
    expect(text).toContain(`Visit ${new URL(agency.url).host}`);
  });

  it("shows the pitch, the facts, every step and every promise", () => {
    const { name, intro, headline, facts, description, steps, promises, contact } = agency;
    for (const copy of [name, intro, headline, ...facts, description, ...promises, contact.label]) {
      expect(text).toContain(copy);
    }
    for (const step of steps) {
      expect(text).toContain(step.title);
      expect(text).toContain(step.body);
    }
  });

  it("is introduced by the About blurb", () => {
    expect(aboutConfig.bio.startsWith("I run a creative content agency")).toBe(true);
  });
});
