import { describe, expect, it } from "vitest";
import { agency, featuredProject, projects } from "./projects";

describe("projects", () => {
  it("gives every card a unique title, since the grid keys on it", () => {
    const titles = projects.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("links every card on-site or over https", () => {
    for (const { url } of projects.filter((p) => p.url)) expect(url).toMatch(/^(\/|https:\/\/)/);
  });

  it("doesn't show the featured project in the grid as well", () => {
    expect(projects.map((p) => p.title)).not.toContain(featuredProject.title);
  });

  it("links the featured project and its newsletter over https", () => {
    const { url, newsletter } = featuredProject;
    for (const href of [url, newsletter.subscribeUrl, newsletter.archiveUrl]) expect(href).toMatch(/^https:\/\//);
  });

  it("links the agency to its site on this one", () => {
    expect(agency.url).toMatch(/^\/[a-z-]+$/);
  });

  it("keeps the agency's facts and promises unique, since their lists key on them", () => {
    expect(new Set(agency.promises).size).toBe(agency.promises.length);
    expect(new Set(agency.facts).size).toBe(agency.facts.length);
  });
});
