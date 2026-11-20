import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { alsoMade, apps, drawnInCode, essays, mora, museum, newsletter } from "./projects";

const inPublic = (src: string) => new URL(`../../public${src}`, import.meta.url);
const pictures = [...drawnInCode, museum].map((p) => p.image).concat(mora.icon);

describe("projects", () => {
  it("names every project once across the page, since its lists key on the names", () => {
    const names = [
      newsletter.title,
      ...drawnInCode.map((p) => p.title),
      museum.title,
      mora.name,
      ...apps.map((a) => a.name),
      ...alsoMade.map((e) => e.title),
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it("links everything on-site or over https", () => {
    const urls = [
      newsletter.url,
      newsletter.archiveUrl,
      ...essays.map((e) => e.url),
      ...drawnInCode.map((p) => p.url),
      museum.url,
      mora.url,
      ...apps.map((a) => a.url),
      ...alsoMade.flatMap((e) => (e.url ? [e.url] : [])),
    ];
    for (const url of urls) expect(url).toMatch(/^(\/|https:\/\/)/);
  });

  it("puts the newsletter, the art and the apps up front, and everything else in Also made", () => {
    expect(newsletter.url).toBe("https://www.whatpeoplemade.com");
    expect(drawnInCode.map((p) => p.url)).toEqual(["/animation-amsterdam", "/animation-london", "/animation-berlin"]);
    expect(museum.url).toBe("https://analogcams.com");
    expect(mora.name).toBe("Mora");
    expect(apps.map((a) => a.name)).toEqual(["Predictooor", "ReferReady"]);
    const index = alsoMade.map((e) => e.title);
    for (const title of [
      "Paper Kite",
      "CineGlow",
      "Earl",
      "InstaClaw",
      "Corporate Translator",
      "3D of Everything",
      "China Migration",
      "NL House Buying Tool",
    ]) {
      expect(index).toContain(title);
    }
  });

  it("has every picture the page shows in public/, each described", () => {
    for (const { src, alt } of pictures) {
      expect(existsSync(inPublic(src)), src).toBe(true);
      expect(alt.length).toBeGreaterThan(20);
    }
  });

  it("keeps the lists that key on their text unique", () => {
    for (const list of [mora.features, mora.facts, essays.map((e) => e.url)]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("sends every old afrodance.fun/paperkite link on to the same page on the agency's site", async () => {
    const paperKite = alsoMade.find((e) => e.title === "Paper Kite");
    expect(paperKite?.url).toMatch(/^https:\/\/[a-z0-9.-]+$/);
    expect(await nextConfig.redirects?.()).toContainEqual({
      source: "/paperkite/:path*",
      destination: `${paperKite?.url}/:path*`,
      permanent: true,
    });
    // Cloudflare serves a file in public/ before the Worker, and so the redirect, sees the request.
    expect(existsSync(new URL("../../public/paperkite", import.meta.url))).toBe(false);
  });
});
