import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { featuredProject } from "@/data/projects";
import FeaturedProject from "./FeaturedProject";
import Hero from "./Hero";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const html = renderToStaticMarkup(createElement(FeaturedProject));

describe("FeaturedProject", () => {
  it("is where the hero's Subscribe button goes, in a new tab: the site, which has the sign-up", () => {
    // the hero link whose own text (up to its </a>) says Subscribe
    const [, button, inside] =
      renderToStaticMarkup(createElement(Hero)).match(/(<a\b[^>]*>)((?:(?!<\/a>)[^])*Subscribe(?:(?!<\/a>)[^])*)/) ?? [];
    expect(button).toContain(`href="${featuredProject.url}"`);
    expect(button).toContain('target="_blank"');
    expect(button).toContain('rel="noopener noreferrer"');
    // it sits beside the agency's box, so it says what you're subscribing to; the hover
    // text says where the click goes, with the pitch
    const says = inside.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    expect(says).toContain("Subscribe to my AI newsletter");
    expect(button).toContain(`title="Sign up at whatpeoplemade.com. ${featuredProject.newsletter.pitch}"`);
  });

  it("is not a second box in the hero: only the agency says \"I run a\" up top", () => {
    const hero = renderToStaticMarkup(createElement(Hero));
    expect(hero.match(/I run a/g)).toHaveLength(1);
    expect(hero).not.toContain('href="#what-people-made"');
  });

  it("opens every outside link in a new tab without handing it the opener", () => {
    const { url, newsletter } = featuredProject;
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /href="https:/.test(tag));
    expect(links).toHaveLength(4); // the scene, Browse the gallery, Subscribe, Past issues
    for (const tag of links) {
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    const hrefs = links.map((tag) => tag.match(/href="([^"]+)"/)![1]);
    expect(new Set(hrefs)).toEqual(new Set([url, newsletter.subscribeUrl, newsletter.archiveUrl]));
  });

  it("keeps the scene out of the tab order, since Browse the gallery goes to the same place", () => {
    const scene = html.match(new RegExp(`<a href="${escape(featuredProject.url)}"[^>]*>(?=<div)`))![0];
    expect(scene).toContain('tabindex="-1"');
    expect(scene).toContain('aria-hidden="true"');
  });

  it("shows its facts and the newsletter pitch", () => {
    for (const text of [...featuredProject.facts, featuredProject.newsletter.title, featuredProject.newsletter.pitch]) {
      expect(html).toContain(text);
    }
  });
});
