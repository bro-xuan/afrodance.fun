import Image from "next/image";
import { aboutConfig, featuredProject, siteConfig } from "@/data/projects";
import SocialLinks from "@/components/SocialLinks";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import { robot, chick, cat, dino, butterfly, EMOTES } from "@/data/sprites";

// Critters on the hero's grass strip — the page's first sign of life.
// `pb-24` keeps the newsletter line well above the standing sprites at every viewport width.
const heroCritters: Critter[] = [
  { sprite: robot, pos: "bottom-[0.7rem] left-[4%]", width: "2.9rem", behavior: "patrol", range: "5rem", frameDur: "0.32s" },
  { sprite: cat, pos: "bottom-[0.55rem] left-[12%]", width: "3.6rem", behavior: "hover-wiggle", emote: EMOTES.heart, delay: "0.5s" },
  { sprite: chick, pos: "bottom-[0.8rem] right-[15%]", width: "2.2rem", behavior: "patrol", range: "4rem", delay: "0.4s", frameDur: "0.26s" },
  { sprite: dino, pos: "bottom-[0.7rem] right-[4%]", width: "4rem", behavior: "patrol", range: "5rem", frameDur: "0.34s" },
  { sprite: butterfly, pos: "top-[24%] right-[22%]", width: "2.2rem", behavior: "flutter", delay: "0.3s" },
];

const floatingPixels = [
  { pos: "left-[7%] top-[26%]", size: "h-3 w-3", color: "bg-[#92cc41]", delay: "0s", speed: "drift-mid" },
  { pos: "left-[15%] top-[62%]", size: "h-2 w-2", color: "bg-[#209cee]", delay: "0.7s", speed: "drift-fast" },
  { pos: "left-[24%] top-[36%]", size: "h-2.5 w-2.5", color: "bg-[#f7d51d]", delay: "1.4s", speed: "drift-slow" },
  { pos: "right-[24%] top-[32%]", size: "h-2 w-2", color: "bg-[#e76e55]", delay: "0.4s", speed: "drift-fast" },
  { pos: "right-[13%] top-[58%]", size: "h-3 w-3", color: "bg-[#209cee]", delay: "1.1s", speed: "drift-slow" },
  { pos: "right-[7%] top-[28%]", size: "h-2.5 w-2.5", color: "bg-[#92cc41]", delay: "1.8s", speed: "drift-mid" },
];

const navItems = [
  { label: "Projects", href: "#projects" },
  { label: "Writing", href: "#writing" },
  { label: "Say hi", href: "#contact" },
];

const newsletterSite = new URL(featuredProject.url).hostname.replace(/^www\./, "");

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#e8f2d5] via-[#f5f6ec] to-[#faf8f2] px-4 pt-5 pb-24">
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

      <PixelCritters critters={heroCritters} className="hidden sm:block" />

      {/* Top navigation bar — 2 tidy rows on phones (brand + socials, then section links),
          collapsing into a single horizontal bar from md upward. */}
      <header className="relative mx-auto mb-10 w-full max-w-6xl sm:mb-14">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b-2 border-[#2d2d2d]/12 pb-3">
          <div className="order-1 inline-flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#6aad30]"
            />
            <span className="font-pixel text-[0.68rem] text-[#2d2d2d]">Stefan Wang</span>
          </div>

          <nav
            aria-label="Page sections"
            className="order-3 w-full border-t border-[#2d2d2d]/10 pt-2 md:order-2 md:ml-auto md:w-auto md:border-t-0 md:pt-0"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 md:justify-end">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="font-body inline-flex min-h-9 items-center px-1 text-base !text-[#2d2d2d] !no-underline transition-colors hover:!text-[#4a7c10]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="order-2 flex items-center gap-4 md:order-3">
            <span
              aria-hidden="true"
              className="hidden h-5 w-[2px] bg-[#2d2d2d]/15 md:inline-block"
            />
            <SocialLinks size="regular" />
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <Image
          src="/selfie-pixel.png"
          alt="Pixel portrait of Stefan Wang"
          width={128}
          height={128}
          unoptimized
          priority
          className="float-pixel mb-5 h-28 w-28 sm:h-32 sm:w-32"
          style={{ imageRendering: "pixelated" }}
        />

        <h1 className="font-pixel !mb-3 text-[clamp(1.4rem,5.2vw,3.35rem)] leading-tight text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4]">
          {siteConfig.name}
        </h1>

        <p className="font-body !mb-5 max-w-xl text-lg text-[#2d2d2d] sm:text-xl">
          Hi, I&apos;m Stefan — {siteConfig.tagline}
          <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
        </p>

        <div className="mb-9 flex flex-wrap items-center justify-center gap-2">
          {aboutConfig.tags.map((tag) => (
            <span
              key={tag.label}
              className={`font-body border-2 border-[#2d2d2d]/80 px-2.5 py-0.5 text-sm leading-snug ${tag.color}`}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* What People Made (daily curation + the weekly newsletter): one centred, balanced
            sentence carrying on from the intro, all of it the link. `!` overrides nes.css `a` rules. */}
        <a
          href={featuredProject.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Sign up at ${newsletterSite}. ${featuredProject.newsletter.pitch}`}
          className="group font-body !block max-w-2xl text-balance text-center text-lg leading-snug !text-[#2d2d2d] !no-underline sm:text-xl"
        >
          I curate the most awesome AI use cases every day, plus a weekly AI newsletter —{" "}
          <span className="whitespace-nowrap">
            <span className="font-semibold text-[#a93226] underline decoration-2 decoration-dotted underline-offset-4 group-hover:decoration-solid">
              {featuredProject.title}
            </span>
            <span
              aria-hidden="true"
              className="ml-2 inline-block font-bold text-[#a93226] transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}
