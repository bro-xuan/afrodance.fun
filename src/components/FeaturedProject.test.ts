import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { featuredProject } from "@/data/projects";
import FeaturedProject from "./FeaturedProject";
import Hero from "./Hero";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const html = renderToStaticMarkup(createElement(FeaturedProject));

describe("FeaturedProject", () => {
  it("is where the hero's newsletter link lands", () => {
    // the in-page link whose own text (up to its </a>) mentions the newsletter
    const target = renderToStaticMarkup(createElement(Hero)).match(
      /<a href="#([^"]+)"[^>]*>(?:(?!<\/a>)[^])*weekly AI newsletter/,
    );
    expect(target?.[1]).toBe("what-people-made");
    expect(html).toContain('id="what-people-made"');
  });

  it("opens the site, the sign-up and the archive in new tabs without handing them the opener", () => {
    const { url, newsletter } = featuredProject;
    for (const href of [url, newsletter.subscribeUrl, newsletter.archiveUrl]) {
      expect(html).toMatch(new RegExp(`href="${escape(href)}" target="_blank" rel="noopener noreferrer"`));
    }
  });

  it("shows its facts and the newsletter pitch", () => {
    for (const text of [...featuredProject.facts, featuredProject.newsletter.title, featuredProject.newsletter.pitch]) {
      expect(html).toContain(text);
    }
  });
});
