import { siteConfig } from "@/data/projects";

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
      <div className="mb-6 text-6xl">{siteConfig.emoji}</div>

      <h1 className="font-pixel mb-2 text-2xl text-[#4a7c10] sm:text-4xl">
        {siteConfig.name}
      </h1>

      <p className="font-body mb-6 text-sm text-muted-foreground sm:text-base">
        by Stefan Wang
      </p>

      <p className="font-body mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
        {siteConfig.tagline}
        <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
      </p>

      <a
        href={siteConfig.socials.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-8 inline-flex items-center gap-2 border-2 border-[#4a7c10] bg-[#e8f5d4] px-3 py-2 font-body text-xs text-[#3a6510] hover:bg-[#d6e8b8] sm:text-sm"
      >
        <span>⚡</span>
        <span>{siteConfig.status.text} —</span>
        <span className="underline">{siteConfig.status.cta}</span>
      </a>

      <div className="flex gap-4 text-2xl">
        <i className="nes-icon is-medium heart" />
        <i className="nes-icon is-medium star" />
        <i className="nes-icon is-medium like" />
      </div>
    </section>
  );
}
