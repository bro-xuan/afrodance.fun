import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
import DitherBand from "@/components/DitherBand";
import DriftPixels, { type DriftPixel } from "@/components/DriftPixels";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import {
  slime,
  chick,
  robot,
  ghost,
  sprout,
  butterfly,
  bee,
  fish,
  frog,
  mushroom,
  star,
  ufo,
  EMOTES,
} from "@/data/sprites";

// Original pixel critters living in each section's gutters. They stay clear of
// the content column and only render where there's room (lg/xl), mirroring the
// DriftPixels breakpoints. Sizes range from tiny (bee, star) to large, and each
// comes alive differently — walking, hopping, floating, fluttering, spinning on
// scroll, or reacting when you hover it.
const aboutCritters: Critter[] = [
  { sprite: sprout, pos: "left-[3%] top-[60%]", width: "2.7rem", behavior: "bob", delay: "0.3s" },
  { sprite: ghost, pos: "right-[4%] top-[24%]", width: "2.6rem", behavior: "float", delay: "0.6s" },
  { sprite: butterfly, pos: "left-[9%] top-[18%]", width: "2.1rem", behavior: "flutter", delay: "0.2s" },
  { sprite: mushroom, pos: "right-[8%] top-[62%]", width: "2.4rem", behavior: "hover-wiggle", emote: EMOTES.sparkle },
];

const projectsCritters: Critter[] = [
  { sprite: robot, pos: "left-[1.5%] top-[68%]", width: "2.8rem", behavior: "patrol", range: "6rem", frameDur: "0.3s" },
  { sprite: chick, pos: "right-[2%] top-[16%]", width: "2.3rem", behavior: "walk-scroll", range: "7rem", facing: "right", frameDur: "0.24s" },
  { sprite: star, pos: "left-[3%] top-[22%]", width: "1.8rem", behavior: "spin-scroll" },
  { sprite: ufo, pos: "right-[2.5%] top-[72%]", width: "3rem", behavior: "peek-scroll" },
];

const writingCritters: Critter[] = [
  { sprite: slime, pos: "left-[4%] top-[64%]", width: "2.8rem", behavior: "hop", delay: "0.4s" },
  { sprite: ghost, pos: "right-[5%] top-[30%]", width: "2.5rem", behavior: "rise-scroll" },
  { sprite: fish, pos: "left-[8%] top-[22%]", width: "2.9rem", behavior: "swim", delay: "0.2s" },
  { sprite: frog, pos: "right-[7%] top-[66%]", width: "2.6rem", behavior: "hover-jump", emote: EMOTES.heart },
];

const guestbookCritters: Critter[] = [
  { sprite: chick, pos: "left-[2.5%] top-[62%]", width: "2.4rem", behavior: "patrol", range: "5rem", frameDur: "0.26s" },
  { sprite: sprout, pos: "right-[3%] top-[22%]", width: "2.7rem", behavior: "bob", delay: "0.8s" },
  { sprite: slime, pos: "left-[6%] top-[20%]", width: "2.5rem", behavior: "hop-scroll" },
  { sprite: bee, pos: "right-[8%] top-[44%]", width: "1.7rem", behavior: "buzz" },
  { sprite: star, pos: "right-[6%] top-[76%]", width: "1.7rem", behavior: "spin-scroll" },
];

const contactCritters: Critter[] = [
  { sprite: butterfly, pos: "left-[5%] top-[30%]", width: "2rem", behavior: "flutter", delay: "0.5s" },
  { sprite: bee, pos: "right-[6%] top-[26%]", width: "1.6rem", behavior: "buzz", delay: "0.3s" },
];

// Gutter parallax pixels per section. Offsets stay clear of each section's
// content column at every breakpoint they render on.
const aboutDrift: DriftPixel[] = [
  { pos: "left-[10%] top-[30%]", size: "h-2.5 w-2.5", color: "bg-[#6aad30]/40", speed: "drift-mid", bob: "0.5s" },
  { pos: "right-[6%] top-[15%]", size: "h-3 w-3", color: "bg-[#3498db]/35", speed: "drift-slow", bob: "1.3s" },
  { pos: "right-[11%] top-[55%]", size: "h-2 w-2", color: "bg-[#e6b800]/45", speed: "drift-fast" },
];

const projectsDrift: DriftPixel[] = [
  { pos: "left-[2.5%] top-[10%]", size: "h-3 w-3", color: "bg-[#6aad30]/50", speed: "drift-fast", bob: "0.2s" },
  { pos: "left-[3%] top-[48%]", size: "h-2 w-2", color: "bg-[#3498db]/40", speed: "drift-mid" },
  { pos: "left-[1.5%] top-[80%]", size: "h-2.5 w-2.5", color: "bg-[#e6b800]/45", speed: "drift-slow", bob: "1.1s" },
  { pos: "right-[3%] top-[16%]", size: "h-2 w-2", color: "bg-[#e07460]/40", speed: "drift-mid", bob: "0.6s" },
  { pos: "right-[1.5%] top-[46%]", size: "h-3 w-3", color: "bg-[#6aad30]/40", speed: "drift-slow" },
  { pos: "right-[3%] top-[74%]", size: "h-2.5 w-2.5", color: "bg-[#3498db]/45", speed: "drift-fast", bob: "1.6s" },
];

const writingDrift: DriftPixel[] = [
  { pos: "left-[8%] top-[22%]", size: "h-2.5 w-2.5", color: "bg-[#e6b800]/45", speed: "drift-mid", bob: "0.4s" },
  { pos: "left-[11%] top-[68%]", size: "h-2 w-2", color: "bg-[#6aad30]/40", speed: "drift-fast" },
  { pos: "right-[9%] top-[30%]", size: "h-3 w-3", color: "bg-[#3498db]/40", speed: "drift-slow", bob: "1.2s" },
  { pos: "right-[11%] top-[75%]", size: "h-2 w-2", color: "bg-[#e07460]/45", speed: "drift-mid" },
];

const guestbookDrift: DriftPixel[] = [
  { pos: "left-[7%] top-[12%]", size: "h-2.5 w-2.5", color: "bg-[#3498db]/45", speed: "drift-mid", bob: "0.9s" },
  { pos: "left-[11%] top-[55%]", size: "h-2 w-2", color: "bg-[#6aad30]/40", speed: "drift-fast" },
  { pos: "left-[5%] top-[86%]", size: "h-2 w-2", color: "bg-[#e6b800]/40", speed: "drift-slow" },
  { pos: "right-[8%] top-[20%]", size: "h-3 w-3", color: "bg-[#e07460]/40", speed: "drift-slow", bob: "0.3s" },
  { pos: "right-[11%] top-[60%]", size: "h-2.5 w-2.5", color: "bg-[#3498db]/40", speed: "drift-fast", bob: "1.5s" },
  { pos: "right-[5%] top-[88%]", size: "h-2 w-2", color: "bg-[#6aad30]/45", speed: "drift-mid" },
];
import AboutMe from "@/components/AboutMe";
import ProjectGrid from "@/components/ProjectGrid";
import ArticleGrid from "@/components/ArticleGrid";
import Guestbook from "@/components/Guestbook";
import Contact from "@/components/Contact";
import KonamiEasterEgg from "@/components/KonamiEasterEgg";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <div aria-hidden="true" className="scroll-xp" />
      <Hero />
      <div className="relative">
        <DriftPixels pixels={aboutDrift} className="hidden lg:block" />
        <PixelCritters critters={aboutCritters} className="hidden lg:block" />
        <AboutMe />
      </div>
      <PixelDivider />
      <DitherBand color="#f2f7e6" className="relative overflow-clip py-6">
        <DriftPixels pixels={projectsDrift} className="hidden xl:block" />
        <PixelCritters critters={projectsCritters} className="hidden xl:block" />
        <ProjectGrid />
      </DitherBand>
      <PixelDivider />
      <div className="relative">
        <DriftPixels pixels={writingDrift} className="hidden lg:block" />
        <PixelCritters critters={writingCritters} className="hidden lg:block" />
        <ArticleGrid />
      </div>
      <DitherBand color="#ecf4fb" className="relative overflow-clip py-6">
        <DriftPixels pixels={guestbookDrift} className="hidden lg:block" />
        <PixelCritters critters={guestbookCritters} className="hidden lg:block" />
        <Guestbook />
      </DitherBand>
      <div className="relative">
        <PixelCritters critters={contactCritters} className="hidden lg:block" />
        <Contact />
      </div>
      <PixelDivider />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
