import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
import DitherBand from "@/components/DitherBand";
import DriftPixels, { type DriftPixel } from "@/components/DriftPixels";

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
        <AboutMe />
      </div>
      <PixelDivider />
      <DitherBand color="#f2f7e6" className="relative overflow-clip py-6">
        <DriftPixels pixels={projectsDrift} className="hidden xl:block" />
        <ProjectGrid />
      </DitherBand>
      <PixelDivider />
      <div className="relative">
        <DriftPixels pixels={writingDrift} className="hidden lg:block" />
        <ArticleGrid />
      </div>
      <DitherBand color="#ecf4fb" className="relative overflow-clip py-6">
        <DriftPixels pixels={guestbookDrift} className="hidden lg:block" />
        <Guestbook />
      </DitherBand>
      <Contact />
      <PixelDivider />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
