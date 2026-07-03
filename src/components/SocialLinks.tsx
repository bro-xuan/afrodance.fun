import { siteConfig } from "@/data/projects";

// NES.css ships github + twitter icons but no LinkedIn. This draws the LinkedIn
// mark as a chunky pixel badge — blue notched square + white "in" — so it
// matches the blue-box-white-glyph weight of the NES twitter icon beside it.
function LinkedInPixel({ px }: { px: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {/* Blue badge with 1px-notched (retro-rounded) corners */}
      <g fill="#0a66c2">
        <rect x="1" y="0" width="14" height="16" />
        <rect x="0" y="1" width="16" height="14" />
      </g>
      {/* White "in" */}
      <g fill="#ffffff">
        <rect x="3" y="3" width="2" height="2" />
        <rect x="3" y="6" width="2" height="7" />
        <rect x="7" y="6" width="6" height="2" />
        <rect x="7" y="6" width="2" height="7" />
        <rect x="11" y="6" width="2" height="7" />
      </g>
    </svg>
  );
}

// NES.css icon scales: default (no class) = 2x = 32px, is-medium = 3x = 48px.
// 1x (is-small, 16px) is deliberately not offered — pixel art at 1px per art
// pixel reads as an illegible smudge.
const nesSize = { regular: "", medium: "is-medium" } as const;
const linkedinPx = { regular: 32, medium: 48 } as const;
const gap = { regular: "gap-3", medium: "gap-6" } as const;

export default function SocialLinks({
  size = "medium",
  className = "",
}: {
  size?: "regular" | "medium";
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center ${gap[size]} ${className}`}>
      <a
        href={siteConfig.socials.github}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        className="inline-flex transition-opacity hover:opacity-70"
      >
        <i className={`nes-icon github ${nesSize[size]}`} />
      </a>
      <a
        href={siteConfig.socials.twitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X"
        className="inline-flex transition-opacity hover:opacity-70"
      >
        <i className={`nes-icon twitter ${nesSize[size]}`} />
      </a>
      <a
        href={siteConfig.socials.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
        className="inline-flex transition-opacity hover:opacity-70"
      >
        <LinkedInPixel px={linkedinPx[size]} />
      </a>
    </div>
  );
}
