import Image from "next/image";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import SocialLinks from "@/components/SocialLinks";
import { siteConfig } from "@/data/projects";
import { butterfly, sprout } from "@/data/sprites";
import { linkProps } from "./links";
import SectionHead from "./SectionHead";
import s from "./home.module.css";

const critters: Critter[] = [
  { sprite: butterfly, pos: "right-[6%] top-[22%]", width: "2.1rem", behavior: "flutter", delay: "0.5s" },
  { sprite: sprout, pos: "right-[10%] bottom-[18%]", width: "2.5rem", behavior: "bob", delay: "0.4s" },
];

export default function SayHi() {
  const { linkedin, twitter, substack } = siteConfig.socials;
  return (
    <section id="say-hi" aria-labelledby="say-hi-title" className={`${s.section} ${s.apps}`}>
      <PixelCritters critters={critters} className="hidden lg:block" />
      <div className={s.column}>
        <div className={s.hiRow} aria-hidden="true">
          <Image src="/selfie-pixel.png" alt="" width={128} height={128} className={s.selfie} unoptimized />
          <span className={s.bubble}>hi!</span>
        </div>
        <SectionHead titleId="say-hi-title" n="05" label="Contact" title="Say hi" />
        <p className={s.prose}>
          Building something with AI, or want to talk about any of this? I&apos;m quickest to reply on{" "}
          <a href={linkedin} {...linkProps(linkedin)} className={s.link}>
            LinkedIn
          </a>{" "}
          and{" "}
          <a href={twitter} {...linkProps(twitter)} className={s.link}>
            X
          </a>
          , and I write longer pieces on{" "}
          <a href={substack} {...linkProps(substack)} className={s.link}>
            Substack
          </a>
          .
        </p>
        <div className={s.socialRow}>
          <SocialLinks size="medium" />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={s.footer}>
      <p>
        {siteConfig.name} · {siteConfig.owner}
      </p>
      <p>
        Secret: <span className={s.secret}>↑↑↓↓←→←→BA</span>
      </p>
      <a href="#top" className={s.top}>
        Back to top ↑
      </a>
    </footer>
  );
}
