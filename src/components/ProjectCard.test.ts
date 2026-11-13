import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Project } from "@/types";
import ProjectCard from "./ProjectCard";

const card = (overrides: Partial<Project>) =>
  renderToStaticMarkup(
    createElement(ProjectCard, {
      project: { title: "Thing", description: "Does a thing.", emoji: "🧪", ...overrides },
    }),
  );

describe("ProjectCard", () => {
  it("links an on-site project in the same tab", () => {
    const html = card({ url: "/thing" });
    expect(html).toContain('href="/thing"');
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain(">Visit</button>");
  });

  it("opens an external project in a new tab without handing it the opener", () => {
    const html = card({ url: "https://thing.example" });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("gives a project that isn't public yet no link, no hover lift and a disabled Coming soon button", () => {
    const html = card({});
    expect(html).not.toContain("<a");
    expect(html).not.toContain("card-hover");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Coming soon<\/button>/);
  });

  it("shows the project's scene when it has one, and the emoji tile when it doesn't", () => {
    expect(card({ url: "/thing", visual: "photo-relight" })).toContain('id="rlv-relit"');
    const plain = card({ url: "/thing" });
    expect(plain).toContain("emoji-tile");
    expect(plain).toContain("🧪");
  });
});
