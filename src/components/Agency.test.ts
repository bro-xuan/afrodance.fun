import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { aboutConfig, agency } from "@/data/projects";
import nextConfig from "../../next.config";
import Agency from "./Agency";
import Hero from "./Hero";

const html = renderToStaticMarkup(createElement(Agency));
/** The markup's text with React's escapes undone, to look for copy in. */
const text = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);

describe("Agency", () => {
  it("is where the hero's agency link lands", () => {
    // the in-page link whose own text (up to its </a>) mentions the agency
    const target = renderToStaticMarkup(createElement(Hero)).match(
      /<a href="#([^"]+)"[^>]*>(?:(?!<\/a>)[^])*agentic social media agency/,
    );
    expect(target?.[1]).toBe("agency");
    expect(html).toContain('id="agency"');
  });

  it("links only to the agency's site, in a new tab like the site's other links out", () => {
    expect(links).toHaveLength(2); // the scene and the button
    for (const tag of links) {
      expect(tag).toContain(`href="${agency.url}"`);
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    expect(text).toContain(`Visit ${agency.name}`);
  });

  it("keeps the scene out of the tab order, since the button goes to the same place", () => {
    const scene = links.find((tag) => tag.includes('tabindex="-1"'));
    expect(scene).toContain('aria-hidden="true"');
  });

  it("sends every old afrodance.fun/paperkite link on to the same page on the agency's site", async () => {
    expect(await nextConfig.redirects?.()).toContainEqual({
      source: "/paperkite/:path*",
      destination: `${agency.url}/:path*`,
      permanent: true,
    });
    // Cloudflare serves a file in public/ before the Worker, and so the redirect, sees the request.
    expect(existsSync(new URL("../../public/paperkite", import.meta.url))).toBe(false);
  });

  it("shows the pitch, the facts and every promise", () => {
    const { name, intro, headline, facts, description, promises } = agency;
    for (const copy of [name, intro, headline, ...facts, description, ...promises]) {
      expect(text).toContain(copy);
    }
  });

  it("is introduced by the About blurb", () => {
    expect(aboutConfig.bio.startsWith("I run an agentic social media agency")).toBe(true);
  });
});
