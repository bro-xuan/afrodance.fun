import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
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
      <PixelDivider />
      <AboutMe />
      <PixelDivider />
      <ProjectGrid />
      <PixelDivider />
      <ArticleGrid />
      <PixelDivider />
      <Guestbook />
      <PixelDivider />
      <Contact />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
