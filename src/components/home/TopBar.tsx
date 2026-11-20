import Image from "next/image";
import SocialLinks from "@/components/SocialLinks";
import { siteConfig } from "@/data/projects";
import s from "./home.module.css";

/** The menu: the three pillars, in page order, then Say hi. Also made is left out on purpose. */
export const SECTIONS = [
  { label: "Apps", href: "#apps" },
  { label: "Newsletter", href: "#newsletter" },
  { label: "Art", href: "#art" },
  { label: "Say hi", href: "#say-hi" },
];

export default function TopBar() {
  return (
    <header className={s.topbar}>
      <a href="#top" className={s.brand}>
        <Image src="/selfie-pixel.png" alt="" width={128} height={128} unoptimized priority />
        {siteConfig.owner}
      </a>
      <nav aria-label="Page sections" className={s.nav}>
        {SECTIONS.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <SocialLinks size="regular" />
    </header>
  );
}
