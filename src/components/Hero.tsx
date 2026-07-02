import { siteConfig } from "@/data/projects";

// Decorative floating pixels — same palette as PixelDivider
const floatingPixels = [
  { pos: "left-[8%] top-[22%]", size: "h-3 w-3", color: "bg-[#92cc41]", delay: "0s" },
  { pos: "left-[16%] top-[64%]", size: "h-2 w-2", color: "bg-[#209cee]", delay: "0.7s" },
  { pos: "left-[26%] top-[38%]", size: "h-2.5 w-2.5", color: "bg-[#f7d51d]", delay: "1.4s" },
  { pos: "right-[24%] top-[30%]", size: "h-2 w-2", color: "bg-[#e76e55]", delay: "0.4s" },
  { pos: "right-[14%] top-[58%]", size: "h-3 w-3", color: "bg-[#209cee]", delay: "1.1s" },
  { pos: "right-[7%] top-[24%]", size: "h-2.5 w-2.5", color: "bg-[#92cc41]", delay: "1.8s" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#eef5df] via-[#f6f6ee] to-[#faf8f2] px-4 pt-20 pb-16 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {floatingPixels.map((p, i) => (
          <span
            key={i}
            className={`float-pixel absolute ${p.pos} ${p.size} ${p.color}`}
            style={{ animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center">
        <div className="float-pixel mb-6 text-7xl sm:text-8xl">{siteConfig.emoji}</div>

        <h1 className="font-pixel mb-3 text-[clamp(1.75rem,5.5vw,3.5rem)] leading-tight text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4]">
          {siteConfig.name}
        </h1>

        <p className="font-body mb-5 text-base text-muted-foreground sm:text-lg">
          by Stefan Wang
        </p>

        <p className="font-body mb-8 max-w-xl text-lg text-[#2d2d2d] sm:text-xl">
          {siteConfig.tagline}
          <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
        </p>

        <div className="mb-9 inline-flex items-center gap-3 border-4 border-[#2d2d2d] bg-white px-4 py-2.5">
          <span className="cursor-blink inline-block h-2.5 w-2.5 shrink-0 bg-[#92cc41]" />
          <span className="font-pixel text-[0.6rem] leading-relaxed sm:text-xs">
            {siteConfig.status.text}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#projects" className="nes-btn is-success">
            View projects
          </a>
          <a href="#contact" className="nes-btn is-primary">
            Say hi
          </a>
        </div>
      </div>
    </section>
  );
}
