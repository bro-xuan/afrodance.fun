import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { alsoMade, apps, drawnInCode, mora, museum, newsletter, siteConfig } from "@/data/projects";
import MoraPhones from "./MoraPhones";
import TopBar, { SECTIONS } from "./TopBar";

const html = renderToStaticMarkup(createElement(Home));
const topBar = renderToStaticMarkup(createElement(TopBar));
/** The text a markup string reads as: tags dropped, the entities React writes turned back. */
const words = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

function at(needle: string) {
  const i = html.indexOf(needle);
  expect(i, needle).toBeGreaterThan(-1);
  return i;
}
const section = (id: string, next: string) => html.slice(at(`id="${id}"`), at(`id="${next}"`));

describe("Home", () => {
  it("shows the apps, the newsletter and the art in that order, then Also made, then Say hi", () => {
    const ids = ["apps", "newsletter", "art", "also-made", "say-hi"];
    const order = ids.map((id) => at(`id="${id}"`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("links the top bar to the three pillars and Say hi, in page order, and leaves Also made out", () => {
    expect(SECTIONS.map((s) => s.href)).toEqual(["#apps", "#newsletter", "#art", "#say-hi"]);
    for (const { href } of SECTIONS) expect(topBar).toContain(`href="${href}"`);
    expect(topBar).not.toContain("#also-made");
    expect(topBar).not.toContain("Amsterdam");
  });

  it("turns the apps over as a carousel: one tab and one panel per app, the first one showing", () => {
    const appsHtml = section("apps", "newsletter");
    const names = [mora.name, ...apps.map((a) => a.name)];
    expect(appsHtml).toContain('aria-roledescription="carousel"');
    expect(appsHtml.match(/role="tab"/g)).toHaveLength(names.length);
    expect(appsHtml.match(/role="tabpanel"/g)).toHaveLength(names.length);
    expect(appsHtml.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(appsHtml.match(/data-active="true"/g)).toHaveLength(1);
    expect(appsHtml.indexOf('aria-selected="true"')).toBeLessThan(appsHtml.indexOf(`>${apps[0].name}<`));
    for (const app of apps) expect(appsHtml).toContain(app.audience);
  });

  it("leaves the stat chips off the newsletter", () => {
    expect(words(section("newsletter", "art"))).not.toContain("real AI use cases");
  });

  it("introduces Stefan, then the selected projects, and none of the projects it moved down", () => {
    const intro = words(html.slice(0, at('id="apps"')));
    expect(intro).toContain(`Hi, I'm ${siteConfig.owner}.`);
    expect(intro).toContain(siteConfig.bio);
    for (const tag of siteConfig.tags) expect(intro).toContain(tag);
    const selected = intro.slice(intro.indexOf("Selected projects"));
    expect(selected.length).toBeLessThan(intro.length);
    const names = [mora.name, ...apps.map((a) => a.name), newsletter.title, ...drawnInCode.map((p) => p.title)];
    const firsts = names.map((name) => selected.indexOf(name));
    expect(firsts.every((i) => i > -1)).toBe(true);
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
    expect(selected).toContain("every analog camera ever made");
    for (const { title } of alsoMade) expect(intro).not.toContain(title);
  });

  it("names each Also made project only in its own row, at the bottom", () => {
    const above = words(html.slice(0, at('id="also-made"')));
    for (const { title } of alsoMade) expect(above).not.toContain(title);
    const index = words(section("also-made", "say-hi"));
    for (const { title } of alsoMade) expect(index).toContain(title);
  });

  it("sends Subscribe to whatpeoplemade.com, which has the sign-up, in a new tab", () => {
    const [tag] = html.match(/<a\b[^>]*>(?=Subscribe to the newsletter)/) ?? [""];
    expect(tag).toContain(`href="${newsletter.url}"`);
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain(`title="Sign up at whatpeoplemade.com. ${newsletter.pitch.replace(/'/g, "&#x27;")}"`);
  });

  it("hangs the three cities and the museum on the wall, each with its picture and link", () => {
    const art = section("art", "also-made");
    for (const piece of [...drawnInCode, museum]) {
      expect(art).toContain(`href="${piece.url}"`);
      expect(art).toContain(piece.image.src);
    }
  });

  it("leads the apps with Mora, then the others", () => {
    const appsHtml = section("apps", "newsletter");
    const firsts = [mora.name, ...apps.map((a) => a.name)].map((name) => appsHtml.indexOf(`>${name}<`));
    expect(firsts.every((i) => i > -1)).toBe(true);
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
    expect(appsHtml).toContain(`href="${mora.url}"`);
  });

  it("keeps Mora's two phones away from screen readers: the text beside them says it all", () => {
    const phones = renderToStaticMarkup(createElement(MoraPhones));
    expect(phones).toMatch(/^<div[^>]*aria-hidden="true"/);
    expect(phones).toContain("Day 1,000");
    expect(section("apps", "newsletter")).toContain(phones);
  });

  it("opens outside links in a new tab without handing them the opener, and on-site links in this one", () => {
    const tags = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    expect(tags.length).toBeGreaterThan(20);
    for (const tag of tags) {
      const href = tag.match(/href="([^"]*)"/)?.[1] ?? "";
      if (/^https?:/.test(href)) {
        expect(tag, href).toContain('target="_blank"');
        expect(tag, href).toContain('rel="noopener noreferrer"');
      } else {
        expect(tag, href).not.toContain('target="_blank"');
      }
    }
  });

  it("has one h1, and no guestbook", () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain("Leave a message");
    expect(html).not.toContain('id="guestbook"');
  });
});
