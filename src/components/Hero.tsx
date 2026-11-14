import Image from "next/image";
import { agency, featuredProject, siteConfig } from "@/data/projects";
import SocialLinks from "@/components/SocialLinks";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import { robot, chick, cat, dino, butterfly, EMOTES } from "@/data/sprites";

// Critters on the hero's grass strip — the page's first sign of life. A big cat
// waves back when you hover it; a dino paces the far side; a butterfly drifts
// overhead. Robot, chick and slime fill in between.
// Positions keep the standing critters in the clear zones left and right of the
// button row so the interactive cat never sits over a CTA.
const heroCritters: Critter[] = [
  { sprite: robot, pos: "bottom-[0.7rem] left-[4%]", width: "2.9rem", behavior: "patrol", range: "5rem", frameDur: "0.32s" },
  { sprite: cat, pos: "bottom-[0.55rem] left-[13%]", width: "3.8rem", behavior: "hover-wiggle", emote: EMOTES.heart, delay: "0.5s" },
  { sprite: chick, pos: "bottom-[0.8rem] right-[18%]", width: "2.2rem", behavior: "patrol", range: "4rem", delay: "0.4s", frameDur: "0.26s" },
  { sprite: dino, pos: "bottom-[0.7rem] right-[5%]", width: "4rem", behavior: "patrol", range: "5rem", frameDur: "0.34s" },
  { sprite: butterfly, pos: "top-[20%] right-[26%]", width: "2.2rem", behavior: "flutter", delay: "0.3s" },
];

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

      <PixelCritters critters={heroCritters} className="hidden sm:block" />

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

        <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
          {/* span, not p: NES.css's unlayered `p {margin-bottom}` outranks
              Tailwind margin utilities and skews items-center alignment */}
          <span className="font-body text-base text-muted-foreground sm:text-lg">
            by Stefan Wang
          </span>
          <SocialLinks size="regular" />
        </div>

        <p className="font-body mb-8 max-w-xl text-lg text-[#2d2d2d] sm:text-xl">
          {siteConfig.tagline}
          <span className="cursor-blink ml-1 inline-block text-[#4a7c10]">_</span>
        </p>

        {/* One box up top, for what this page leads with: the agency, on butter, which jumps
            to its section below. The newsletter is a button beside it, not a second box
            under it, and goes straight to the sign-up. Where the two don't fit on a line,
            the button drops below. The `!`s beat nes.css's unlayered rules:
            `a { background-color: transparent }`, `a:hover { text-decoration: underline }`
            and `.nes-btn { display: inline-block }`. */}
        <div className="mb-8 flex max-w-full flex-wrap items-stretch justify-center gap-x-4 gap-y-3">
          <a
            href="#agency"
            className="pixel-shadow inline-flex max-w-full items-center gap-3 border-4 border-[#2d2d2d] !bg-[#fdf6d8] px-4 py-2 text-left !no-underline hover:!bg-[#f9ebb4]"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              🎨
            </span>
            <span className="font-body text-base text-[#2d2d2d] sm:text-lg">
              I run a creative content agency:{" "}
              <span className="whitespace-nowrap text-[#4a7c10] underline underline-offset-2">{agency.name}</span>
            </span>
            <span aria-hidden="true" className="font-pixel text-[0.8rem] text-[#4a7c10]">
              ↓
            </span>
          </a>
          {/* Stretched to the agency box's height: nes.css draws the button's border in the 4px
              outside its box, which its own 4px margin leaves room for, so the two line up
              edge to edge. Its text is sized in rem so it grows with that box on wide screens. */}
          <a
            href={featuredProject.newsletter.subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Subscribe to my weekly AI newsletter, ${featuredProject.title}`}
            title={`My weekly AI newsletter: ${featuredProject.title}`}
            className="nes-btn is-error !inline-flex items-center justify-center gap-2 text-[1rem]"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              📬
            </span>
            Subscribe
          </a>
        </div>

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
