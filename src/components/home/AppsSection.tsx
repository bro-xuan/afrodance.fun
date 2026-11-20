import Image from "next/image";
import { VISUALS } from "@/components/visuals/registry";
import { apps, mora } from "@/data/projects";
import type { App } from "@/types";
import AppCarousel, { type Slide } from "./AppCarousel";
import { hostOf, linkProps } from "./links";
import MoraPhones from "./MoraPhones";
import SectionHead from "./SectionHead";
import s from "./home.module.css";

function GoButton({ href, children, className }: { href: string; children: string; className?: string }) {
  return (
    <div className={s.ctaRow}>
      <a href={href} {...linkProps(href)} className={`${s.button}${className ? ` ${className}` : ""}`}>
        {children}
        <span aria-hidden="true" className={s.buttonArrow}>
          →
        </span>
      </a>
    </div>
  );
}

function MoraSlide() {
  return (
    <article className={s.spread} aria-labelledby="mora-title">
      <MoraPhones />
      <div>
        <div className={s.appHead}>
          <Image
            src={mora.icon.src}
            alt={mora.icon.alt}
            width={mora.icon.width}
            height={mora.icon.height}
            className={s.appIcon}
            unoptimized
          />
          <div>
            <h3 id="mora-title" className={s.appName}>
              {mora.name}
            </h3>
            <span className={s.status}>{mora.status}</span>
          </div>
        </div>
        <p className={s.tagline}>{mora.tagline}</p>
        <p className={s.prose}>{mora.description}</p>
        <ul className={s.features}>
          {mora.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <p className={s.facts}>{mora.facts.join(" · ")}</p>
        <GoButton href={mora.url} className={s.moraButton}>
          Meet Mora
        </GoButton>
      </div>
    </article>
  );
}

function AppSlide({ app }: { app: App }) {
  const Visual = VISUALS[app.visual];
  const id = `${app.name.toLowerCase()}-title`;
  return (
    <article className={s.spread} aria-labelledby={id}>
      <div className={s.spreadScene} aria-hidden="true">
        <Visual />
      </div>
      <div>
        <h3 id={id} className={s.appName}>
          {app.name}
        </h3>
        <p className={`${s.tagline} ${s.appLine}`}>{app.tagline}</p>
        <p className={s.prose}>{app.description}</p>
        <GoButton href={app.url}>{`Open ${hostOf(app.url)}`}</GoButton>
      </div>
    </article>
  );
}

// The apps as a carousel: Mora first, then the others, each as an open spread beside its
// picture, turning over on its own.
export default function AppsSection() {
  const slides: Slide[] = [
    { id: "mora", name: mora.name, audience: mora.audience, content: <MoraSlide /> },
    ...apps.map((app) => ({
      id: app.name.toLowerCase(),
      name: app.name,
      audience: app.audience,
      content: <AppSlide app={app} />,
    })),
  ];

  return (
    <section id="apps" aria-labelledby="apps-title" className={`${s.section} ${s.apps}`}>
      <div className={s.column}>
        <SectionHead
          titleId="apps-title"
          n="01"
          label="Apps"
          title="Things to use"
          sub="Products I build and run. Each one is free to start."
        />
      </div>

      <div className={`${s.wide} pixel-reveal`}>
        <AppCarousel slides={slides} label="Apps" />
      </div>
    </section>
  );
}
