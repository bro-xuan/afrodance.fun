import { siteConfig } from "@/data/projects";

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
      <div className="mb-6 text-6xl">{siteConfig.emoji}</div>

      <h1 className="font-pixel mb-4 text-2xl text-[#4a7c10] sm:text-4xl">
        {siteConfig.name}
      </h1>

      <p className="font-body mb-8 text-base text-muted-foreground sm:text-lg">
        {siteConfig.tagline}
        <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
      </p>

      <div className="flex gap-4 text-2xl">
        <i className="nes-icon is-medium heart" />
        <i className="nes-icon is-medium star" />
        <i className="nes-icon is-medium like" />
      </div>
    </section>
  );
}
