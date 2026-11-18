import type { ComponentType, ReactNode } from "react";
import { Project, ProjectVisual } from "@/types";
import BtcCycleVisual from "./visuals/BtcCycleVisual";
import MarketIntelVisual from "./visuals/MarketIntelVisual";
import WhaleTrackerVisual from "./visuals/WhaleTrackerVisual";
import ReferenceCallVisual from "./visuals/ReferenceCallVisual";
import AnalogCameraVisual from "./visuals/AnalogCameraVisual";
import JargonDecoderVisual from "./visuals/JargonDecoderVisual";
import PortraitFrameVisual from "./visuals/PortraitFrameVisual";
import InstaClawDeployVisual from "./visuals/InstaClawDeployVisual";
import HouseBuildVisual from "./visuals/HouseBuildVisual";
import MigrationFlowVisual from "./visuals/MigrationFlowVisual";
import TeardownVisual from "./visuals/TeardownVisual";
import PhotoRelightVisual from "./visuals/PhotoRelightVisual";

// Animated pixel-art scenes; projects without one fall back to the emoji tile.
const visuals: Record<ProjectVisual, ComponentType> = {
  "btc-cycle": BtcCycleVisual,
  "market-intel": MarketIntelVisual,
  "whale-tracker": WhaleTrackerVisual,
  "reference-call": ReferenceCallVisual,
  "analog-camera": AnalogCameraVisual,
  "jargon-decoder": JargonDecoderVisual,
  "portrait-frame": PortraitFrameVisual,
  "instaclaw-deploy": InstaClawDeployVisual,
  "house-build": HouseBuildVisual,
  "migration-flow": MigrationFlowVisual,
  "machine-teardown": TeardownVisual,
  "photo-relight": PhotoRelightVisual,
};

const buttonClass: Record<string, string> = {
  primary: "nes-btn is-primary",
  success: "nes-btn is-success",
  warning: "nes-btn is-warning",
  error: "nes-btn is-error",
};

const headerPalette: Record<string, { bg: string; label: string }> = {
  primary: { bg: "#e3f3fd", label: "#15608f" },
  success: { bg: "#eef7df", label: "#3a6510" },
  warning: { bg: "#fdf6d8", label: "#6b5200" },
  error: { bg: "#fbe9e5", label: "#a93226" },
};

export default function ProjectCard({ project }: { project: Project }) {
  const color = project.color ?? "primary";
  const btnCls = buttonClass[color];
  const palette = headerPalette[color];
  const Visual = project.visual ? visuals[project.visual] : undefined;
  const isExternal = Boolean(project.url?.startsWith("http"));
  const badgeLabel = !project.url ? "SOON" : isExternal ? "EXTERNAL" : "ON-SITE";

  const card = (button: ReactNode) => (
    <div className="pixel-shadow flex h-full flex-col border-4 border-[#2d2d2d] bg-white">
      <div
        className="flex items-center justify-between border-b-4 border-[#2d2d2d] px-3.5 py-2"
        style={{ backgroundColor: palette.bg }}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {project.emoji}
        </span>
        <span
          className="font-pixel text-[0.52rem] tracking-wider"
          style={{ color: !project.url ? "#595959" : palette.label }}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 text-left">
        {Visual ? (
          <Visual />
        ) : (
          <div className="flex justify-center py-2">
            <span
              className="emoji-tile inline-flex h-16 w-16 shrink-0 items-center justify-center border-4 border-[#2d2d2d] text-4xl leading-none"
              style={{ backgroundColor: palette.bg }}
            >
              {project.emoji}
            </span>
          </div>
        )}

        <h3 className="font-pixel !mb-0 text-[0.76rem] leading-relaxed text-[#2d2d2d] transition-colors group-hover:text-[#4a7c10]">
          {project.title}
        </h3>

        <p className="font-body !mb-0 flex-1 text-sm leading-relaxed text-[#595959]">
          {project.description}
        </p>

        {project.stack && project.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="font-body border border-[#2d2d2d]/25 bg-[#faf8f2] px-1.5 py-0.5 text-xs leading-tight text-[#595959]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="pt-1">{button}</div>
      </div>
    </div>
  );

  // Not public yet: no link to follow, so no hover lift and a greyed-out button.
  if (!project.url) {
    return (
      <div className="pixel-reveal block h-full">
        {card(
          <button type="button" className="nes-btn is-disabled w-full" disabled>
            Coming soon
          </button>,
        )}
      </div>
    );
  }

  return (
    <a
      href={project.url}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group pixel-reveal card-hover block h-full !no-underline transition-transform"
    >
      {card(
        <button type="button" className={`${btnCls} w-full`}>
          Visit
        </button>,
      )}
    </a>
  );
}
