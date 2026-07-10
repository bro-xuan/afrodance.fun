import type { ComponentType } from "react";
import { Project, ProjectVisual } from "@/types";
import BtcCycleVisual from "./visuals/BtcCycleVisual";

// Animated pixel-art scenes; projects without one fall back to the emoji tile.
const visuals: Record<ProjectVisual, ComponentType> = {
  "btc-cycle": BtcCycleVisual,
};

const buttonClass: Record<string, string> = {
  primary: "nes-btn is-primary",
  success: "nes-btn is-success",
  warning: "nes-btn is-warning",
  error: "nes-btn is-error",
};

// NES.css button palette — emoji tiles pick up the same accent as the card's button
const accentBg: Record<string, string> = {
  primary: "#e3f3fd",
  success: "#eef7df",
  warning: "#fdf6d8",
  error: "#fbe9e5",
};

export default function ProjectCard({ project }: { project: Project }) {
  const color = project.color ?? "primary";
  const btnCls = buttonClass[color];
  const isExternal = project.url.startsWith("http");
  const Visual = project.visual ? visuals[project.visual] : undefined;

  return (
    <a
      href={project.url}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="pixel-reveal card-hover block transition-transform h-full"
    >
      <div className="nes-container with-title is-centered pixel-shadow h-full flex flex-col !bg-white">
        <p className="title font-pixel !flex items-start justify-center text-center min-h-[4.5rem] leading-snug">
          {project.title}
        </p>
        <div className="flex flex-col items-center text-center gap-4 p-2 flex-1">
          {Visual ? (
            <Visual />
          ) : (
            <span
              className="emoji-tile inline-flex h-16 w-16 shrink-0 items-center justify-center border-4 border-[#2d2d2d] text-4xl leading-none"
              style={{ backgroundColor: accentBg[color] }}
            >
              {project.emoji}
            </span>
          )}
          <p className="font-body text-sm text-muted-foreground flex-1 w-full">
            {project.description}
          </p>
          <button type="button" className={btnCls}>
            Visit
          </button>
        </div>
      </div>
    </a>
  );
}
