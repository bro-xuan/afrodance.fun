import Hero from "@/components/Hero";
import DitherBand from "@/components/DitherBand";
import DriftPixels, { type DriftPixel } from "@/components/DriftPixels";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import ProjectGrid from "@/components/ProjectGrid";
import ArticleGrid from "@/components/ArticleGrid";
import Contact from "@/components/Contact";
import KonamiEasterEgg from "@/components/KonamiEasterEgg";
import Footer from "@/components/Footer";
import {
  slime,
  chick,
  robot,
  ghost,
  sprout,
  butterfly,
  fish,
  frog,
  star,
  ufo,
  EMOTES,
} from "@/data/sprites";

// Original pixel critters living in each section's gutters. They stay clear of
// the content column and only render where there's room (lg/xl).
const projectsCritters: Critter[] = [
  { sprite: robot, pos: "left-[1.5%] top-[68%]", width: "2.8rem", behavior: "patrol", range: "6rem", frameDur: "0.3s" },
  { sprite: chick, pos: "right-[2%] top-[16%]", width: "2.3rem", behavior: "walk-scroll", range: "7rem", facing: "right", frameDur: "0.24s" },
  { sprite: star, pos: "left-[3%] top-[22%]", width: "1.8rem", behavior: "spin-scroll" },
  { sprite: ufo, pos: "right-[2.5%] top-[72%]", width: "3rem", behavior: "peek-scroll" },
];

const writingCritters: Critter[] = [
  { sprite: slime, pos: "left-[2%] top-[64%]", width: "2.7rem", behavior: "hop", delay: "0.4s" },
  { sprite: ghost, pos: "right-[2.5%] top-[26%]", width: "2.5rem", behavior: "rise-scroll" },
  { sprite: fish, pos: "left-[2.5%] top-[22%]", width: "2.8rem", behavior: "swim", delay: "0.2s" },
  { sprite: frog, pos: "right-[2.5%] top-[68%]", width: "2.5rem", behavior: "hover-jump", emote: EMOTES.heart },
];

const contactCritters: Critter[] = [
  { sprite: butterfly, pos: "left-[5%] top-[28%]", width: "2.1rem", behavior: "flutter", delay: "0.5s" },
  { sprite: sprout, pos: "right-[5%] top-[64%]", width: "2.5rem", behavior: "bob", delay: "0.4s" },
  { sprite: star, pos: "right-[7%] top-[22%]", width: "1.7rem", behavior: "spin-scroll" },
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
  { pos: "left-[3%] top-[24%]", size: "h-2.5 w-2.5", color: "bg-[#e6b800]/45", speed: "drift-mid", bob: "0.4s" },
  { pos: "left-[2%] top-[72%]", size: "h-2 w-2", color: "bg-[#6aad30]/40", speed: "drift-fast" },
  { pos: "right-[3%] top-[30%]", size: "h-3 w-3", color: "bg-[#3498db]/40", speed: "drift-slow", bob: "1.2s" },
  { pos: "right-[2%] top-[75%]", size: "h-2 w-2", color: "bg-[#e07460]/45", speed: "drift-mid" },
];

const contactDrift: DriftPixel[] = [
  { pos: "left-[7%] top-[20%]", size: "h-2.5 w-2.5", color: "bg-[#3498db]/45", speed: "drift-mid", bob: "0.9s" },
  { pos: "left-[9%] top-[76%]", size: "h-2 w-2", color: "bg-[#6aad30]/40", speed: "drift-fast" },
  { pos: "right-[8%] top-[24%]", size: "h-3 w-3", color: "bg-[#e07460]/40", speed: "drift-slow", bob: "0.3s" },
  { pos: "right-[9%] top-[78%]", size: "h-2.5 w-2.5", color: "bg-[#e6b800]/40", speed: "drift-mid" },
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <div aria-hidden="true" className="scroll-xp" />
      <Hero />

      <DitherBand color="#f2f7e6" className="relative overflow-clip py-4">
        <DriftPixels pixels={projectsDrift} className="hidden xl:block" />
        <PixelCritters critters={projectsCritters} className="hidden xl:block" />
        <ProjectGrid />
      </DitherBand>

      <div className="relative">
        <DriftPixels pixels={writingDrift} className="hidden xl:block" />
        <PixelCritters critters={writingCritters} className="hidden xl:block" />
        <ArticleGrid />
      </div>

      <DitherBand color="#ecf4fb" className="relative overflow-clip py-4">
        <DriftPixels pixels={contactDrift} className="hidden lg:block" />
        <PixelCritters critters={contactCritters} className="hidden lg:block" />
        <Contact />
      </DitherBand>

      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
