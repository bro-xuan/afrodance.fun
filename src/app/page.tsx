import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
import DitherBand from "@/components/DitherBand";
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
      <Hero />
      <AboutMe />
      <PixelDivider />
      <DitherBand color="#f2f7e6" className="py-6">
        <ProjectGrid />
      </DitherBand>
      <PixelDivider />
      <ArticleGrid />
      <DitherBand color="#ecf4fb" className="py-6">
        <Guestbook />
      </DitherBand>
      <Contact />
      <PixelDivider />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
