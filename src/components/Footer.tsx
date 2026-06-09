import { siteConfig } from "@/data/projects";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-4 px-4 pt-12 pb-8 text-center">
      <div className="flex gap-6">
        <a
          href={siteConfig.socials.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <i className="nes-icon github is-medium" />
        </a>
        <a
          href={siteConfig.socials.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X"
        >
          <i className="nes-icon twitter is-medium" />
        </a>
        <a
          href={siteConfig.socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="flex items-center hover:opacity-80"
        >
          <svg
            viewBox="0 0 11 11"
            width="40"
            height="40"
            shapeRendering="crispEdges"
            fill="#0a66c2"
            aria-hidden="true"
          >
            {/* i — transparent background, blue silhouette like the other two */}
            <rect x="1" y="1" width="2" height="2" />
            <rect x="1" y="4" width="2" height="6" />
            {/* n */}
            <rect x="4" y="4" width="6" height="2" />
            <rect x="4" y="4" width="2" height="6" />
            <rect x="8" y="4" width="2" height="6" />
          </svg>
        </a>
      </div>
      <p className="font-pixel text-xs text-muted-foreground">
        made with pixels &amp; {"<3"}
      </p>
    </footer>
  );
}
