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
          className="font-pixel text-xs flex items-center text-[#0a66c2] hover:opacity-80"
        >
          [in]
        </a>
      </div>
      <p className="font-pixel text-xs text-muted-foreground">
        made with pixels &amp; {"<3"}
      </p>
    </footer>
  );
}
