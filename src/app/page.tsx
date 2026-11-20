import KonamiEasterEgg from "@/components/KonamiEasterEgg";
import AlsoMade from "@/components/home/AlsoMade";
import AppsSection from "@/components/home/AppsSection";
import ArtSection from "@/components/home/ArtSection";
import Intro from "@/components/home/Intro";
import NewsletterSection from "@/components/home/NewsletterSection";
import SayHi, { Footer } from "@/components/home/SayHi";
import TopBar from "@/components/home/TopBar";
import s from "@/components/home/home.module.css";

// Three kinds of project first, in this order: the apps, the newsletter and the art.
// Everything else is one row each in "Also made".
export default function Home() {
  return (
    <div id="top" className={s.home}>
      <div aria-hidden="true" className="scroll-xp" />
      <TopBar />
      <main>
        <Intro />
        <AppsSection />
        <NewsletterSection />
        <ArtSection />
        <AlsoMade />
        <SayHi />
      </main>
      <Footer />
      <KonamiEasterEgg />
    </div>
  );
}
