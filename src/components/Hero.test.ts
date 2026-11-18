import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { agency, featuredProject } from "@/data/projects";
import Hero from "./Hero";

const heroHtml = renderToStaticMarkup(createElement(Hero));
const homeHtml = renderToStaticMarkup(createElement(Home));

describe("Hero & Home", () => {
  it("leads with the newsletter as one plain link, not a card", () => {
    expect(heroHtml).toContain("I curate the most awesome AI use cases every day, plus a weekly AI newsletter");
    expect(heroHtml).toContain(`href="${featuredProject.url}"`);
    expect(heroHtml).not.toContain("FOR BUSINESSES");
    expect(heroHtml).not.toContain("FOR AI BUILDERS");
  });

  it("keeps the agency out of the hero: it's one linked line pointing down onto the projects, with no section of its own", () => {
    expect(heroHtml).not.toContain("agency");
    expect(homeHtml).not.toContain('id="agency"');
    // between the Projects heading and the first project
    const heading = homeHtml.indexOf("SIDE PROJECTS");
    const above = homeHtml.slice(heading, homeHtml.indexOf(featuredProject.title, heading));
    expect(above).toContain("Running an agentic social media agency for my apps&#x27; growth:");
    expect(above).toContain(`href="${agency.url}" target="_blank" rel="noopener noreferrer"`);
    expect(above).toContain(agency.name);
  });

  it("drops the city from the top bar", () => {
    expect(heroHtml).not.toContain("Amsterdam");
  });

  it("provides top navigation to every page section", () => {
    expect(heroHtml).not.toContain('href="#agency"');
    for (const anchor of ["#projects", "#writing", "#contact"]) {
      expect(heroHtml).toContain(`href="${anchor}"`);
    }
  });

  it("removes the guestbook and 'Leave a message' feature completely", () => {
    expect(heroHtml).not.toContain("Leave a message");
    expect(heroHtml).not.toContain("#guestbook");
    expect(homeHtml).not.toContain("id=\"guestbook\"");
    expect(homeHtml).not.toContain("Sign the Guestbook");
  });
});
