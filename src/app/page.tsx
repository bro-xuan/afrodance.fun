import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
import AboutMe from "@/components/AboutMe";
import ProjectGrid from "@/components/ProjectGrid";
import ArticleGrid from "@/components/ArticleGrid";
import NowSection from "@/components/NowSection";
import Guestbook from "@/components/Guestbook";
import KonamiEasterEgg from "@/components/KonamiEasterEgg";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl">
      <Hero />
      <PixelDivider />
      <ProjectGrid />
      <PixelDivider />
      <ArticleGrid />
      <PixelDivider />
      <NowSection />
      <PixelDivider />
      <Guestbook />
      <PixelDivider />
      <AboutMe />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
