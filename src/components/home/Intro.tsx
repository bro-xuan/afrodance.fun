import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import PixelCritters, { type Critter } from "@/components/PixelCritters";
import { apps, drawnInCode, mora, museum, newsletter, siteConfig } from "@/data/projects";
import { cat, chick, dino, robot, EMOTES } from "@/data/sprites";
import { linkProps } from "./links";
import s from "./home.module.css";

// The critters on the grass under the intro: the page's first sign of life.
const critters: Critter[] = [
  { sprite: robot, pos: "bottom-[0.7rem] left-[4%]", width: "2.9rem", behavior: "patrol", range: "5rem", frameDur: "0.32s" },
  { sprite: cat, pos: "bottom-[0.55rem] left-[15%]", width: "3.6rem", behavior: "hover-wiggle", emote: EMOTES.heart, delay: "0.5s" },
  { sprite: chick, pos: "bottom-[0.8rem] right-[17%]", width: "2.2rem", behavior: "patrol", range: "4rem", delay: "0.4s", frameDur: "0.26s" },
  { sprite: dino, pos: "bottom-[0.7rem] right-[4%]", width: "4rem", behavior: "patrol", range: "5rem", frameDur: "0.34s" },
];

/** The nth line of the intro to step in. */
const step = (n: number) => ({ "--i": n }) as CSSProperties;

function app(name: string) {
  const found = apps.find((a) => a.name === name);
  if (!found) throw new Error(`no app called ${name} in src/data/projects.ts`);
  return found;
}

function city(title: string) {
  const found = drawnInCode.find((p) => p.title === title);
  if (!found) throw new Error(`no city called ${title} in src/data/projects.ts`);
  return found;
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} {...linkProps(href)} className={s.link}>
      {children}
    </a>
  );
}

// Who Stefan is first (portrait, bio, tags), then rog.ie's short paragraph whose links are the
// whole site: the selected projects, one line per section, each tagged with the section it opens.
export default function Intro() {
  const predictooor = app("Predictooor");
  const referReady = app("ReferReady");

  return (
    <section className={s.introBand} aria-labelledby="intro-title">
      <div className={s.intro}>
        <h1 id="intro-title" className={`${s.wordmark} ${s.rise}`} style={step(0)}>
          {siteConfig.name}
        </h1>

        <div className={`${s.about} ${s.rise}`} style={step(1)}>
          <Image
            src="/selfie-pixel.png"
            alt={`Pixel portrait of ${siteConfig.owner}`}
            width={480}
            height={480}
            unoptimized
            priority
            className={`${s.portrait} float-pixel`}
          />
          <div>
            <p className={s.lead}>Hi, I&apos;m {siteConfig.owner}.</p>
            <p className={s.bio}>{siteConfig.bio}</p>
            <ul className={s.tags} aria-label="What I work on">
              {siteConfig.tags.map((tag) => (
                <li key={tag} className={s.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className={`${s.selected} ${s.rise}`} style={step(2)}>
          Selected projects
        </h2>
        <ul className={s.pillars}>
          <li className={`${s.pillar} ${s.apps} ${s.rise}`} style={step(3)}>
            <a href="#apps" className={s.pillarTag}>
              Apps
            </a>
            <p className={s.pillarText}>
              <A href={mora.url}>{mora.name}</A>, an iOS app for couples. Also{" "}
              <A href={predictooor.url}>{predictooor.name}</A>, a Polymarket whale tracker, and{" "}
              <A href={referReady.url}>{referReady.name}</A>, reference-call prep for job seekers.
            </p>
          </li>
          <li className={`${s.pillar} ${s.news} ${s.rise}`} style={step(4)}>
            <a href="#newsletter" className={s.pillarTag}>
              Newsletter
            </a>
            <p className={s.pillarText}>
              <A href={newsletter.url}>{newsletter.title}</A>, a daily gallery of real AI use cases and a weekly AI
              newsletter.
            </p>
          </li>
          <li className={`${s.pillar} ${s.art} ${s.rise}`} style={step(5)}>
            <a href="#art" className={s.pillarTag}>
              Art
            </a>
            <p className={s.pillarText}>
              <A href={city("Amsterdam").url}>Amsterdam</A>, <A href={city("London").url}>London</A> and{" "}
              <A href={city("Berlin").url}>Berlin</A>, drawn in code line by line, and a museum of{" "}
              <A href={museum.url}>every analog camera ever made</A>.
            </p>
          </li>
        </ul>
      </div>

      <div aria-hidden="true" className="pixel-grass pointer-events-none absolute inset-x-0 bottom-0 h-6" />
      <PixelCritters critters={critters} className="hidden sm:block" />
    </section>
  );
}
