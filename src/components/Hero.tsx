import Image from "next/image";
import { siteConfig } from "@/data/projects";
import SocialLinks from "@/components/SocialLinks";

// Decorative floating pixels — same palette as PixelDivider.
// Each bobs in place and drifts upward on scroll at its own speed.
const floatingPixels = [
  { pos: "left-[8%] top-[22%]", size: "h-3 w-3", color: "bg-[#92cc41]", delay: "0s", speed: "drift-mid" },
  { pos: "left-[16%] top-[64%]", size: "h-2 w-2", color: "bg-[#209cee]", delay: "0.7s", speed: "drift-fast" },
  { pos: "left-[26%] top-[38%]", size: "h-2.5 w-2.5", color: "bg-[#f7d51d]", delay: "1.4s", speed: "drift-slow" },
  { pos: "right-[24%] top-[30%]", size: "h-2 w-2", color: "bg-[#e76e55]", delay: "0.4s", speed: "drift-fast" },
  { pos: "right-[14%] top-[58%]", size: "h-3 w-3", color: "bg-[#209cee]", delay: "1.1s", speed: "drift-slow" },
  { pos: "right-[7%] top-[24%]", size: "h-2.5 w-2.5", color: "bg-[#92cc41]", delay: "1.8s", speed: "drift-mid" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#eef5df] via-[#f6f6ee] to-[#faf8f2] px-4 pt-20 pb-16 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {floatingPixels.map((p, i) => (
          <span key={i} className={`drift-pixel absolute ${p.pos} ${p.speed}`}>
            <span
              className={`float-pixel block ${p.size} ${p.color}`}
              style={{ animationDelay: p.delay }}
            />
          </span>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pixel-grass pointer-events-none absolute inset-x-0 bottom-0 h-6"
      />

      <div className="relative flex flex-col items-center">
        <Image
          src="/selfie-pixel.png"
          alt="Pixel portrait of Stefan Wang"
          width={128}
          height={128}
          unoptimized
          priority
          className="float-pixel mb-6 h-28 w-28 sm:h-32 sm:w-32"
          style={{ imageRendering: "pixelated" }}
        />

        <h1 className="font-pixel mb-3 text-[clamp(1.4rem,5.5vw,3.5rem)] leading-tight text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4]">
          {siteConfig.name}
        </h1>

        <div className="mb-5 flex items-center gap-3">
          <p className="font-body text-base text-muted-foreground sm:text-lg">
            by Stefan Wang
          </p>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <SocialLinks size="small" />
        </div>

        <p className="font-body mb-8 max-w-xl text-lg text-[#2d2d2d] sm:text-xl">
          {siteConfig.tagline}
          <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#projects" className="nes-btn is-success">
            View projects
          </a>
          <a href="#writing" className="nes-btn is-primary">
            View articles
          </a>
          <a href="#guestbook" className="nes-btn is-warning">
            Leave a message
          </a>
        </div>
      </div>
    </section>
  );
}
