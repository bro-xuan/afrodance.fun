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
      <AboutMe />
      <PixelDivider />
      <div className="border-y-4 border-[#dbe7c2] bg-[#f2f7e6] py-6">
        <ProjectGrid />
      </div>
      <PixelDivider />
      <ArticleGrid />
      <div className="border-y-4 border-[#cfe3f2] bg-[#ecf4fb] py-6">
        <Guestbook />
      </div>
      <Contact />
      <PixelDivider />
      <Footer />
      <KonamiEasterEgg />
    </main>
  );
}
