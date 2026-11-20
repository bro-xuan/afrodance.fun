import UseCaseGalleryVisual from "@/components/visuals/UseCaseGalleryVisual";
import { essays, newsletter, siteConfig } from "@/data/projects";
import { hostOf, linkProps } from "./links";
import SectionHead from "./SectionHead";
import s from "./home.module.css";

const LANG = { en: "EN", zh: "中文" } as const;

/** "2026-06-09" → "Jun 2026" */
function monthYear(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function NewsletterSection() {
  const site = hostOf(newsletter.url);
  const out = linkProps(newsletter.url);

  return (
    <section id="newsletter" aria-labelledby="newsletter-title" className={`${s.section} ${s.news}`}>
      <div className={s.column}>
        <SectionHead
          titleId="newsletter-title"
          n="02"
          label="Newsletter"
          title={newsletter.title}
          sub={`${newsletter.tagline}: a daily gallery, and a weekly email.`}
        />

        {/* Out of the tab order: the Subscribe button below goes to the same place. */}
        <a href={newsletter.url} {...out} tabIndex={-1} aria-hidden="true" className={`${s.window} pixel-reveal`}>
          <div className={s.windowBar}>
            <span className={s.windowDots}>
              <span />
              <span />
              <span />
            </span>
            <span className={s.windowUrl}>{site}</span>
          </div>
          <div className={s.windowBody}>
            <UseCaseGalleryVisual />
          </div>
        </a>

        <div className={s.newsBody}>
          <p className={s.prose}>{newsletter.description}</p>
          <p className={s.prose}>{newsletter.pitch}</p>
          <div className={s.ctaRow}>
            <a
              href={newsletter.url}
              {...out}
              title={`Sign up at ${site}. ${newsletter.pitch}`}
              className={s.button}
            >
              Subscribe to the newsletter
              <span aria-hidden="true" className={s.buttonArrow}>
                →
              </span>
            </a>
            <a href={newsletter.archiveUrl} {...linkProps(newsletter.archiveUrl)} className={s.textLink}>
              Read past issues
            </a>
          </div>
        </div>

        <h3 className={s.miniHead}>Longer essays</h3>
        <ul className={s.rows}>
          {essays.map((essay) => (
            <li key={essay.url}>
              <a href={essay.url} {...linkProps(essay.url)} className={s.rowLink} lang={essay.lang}>
                <span className={s.rowTitle}>{essay.title}</span>
                <span aria-hidden="true" className={s.leader} />
                <span className={s.rowMeta} lang="en">
                  {LANG[essay.lang]} · {monthYear(essay.date)}
                </span>
              </a>
            </li>
          ))}
          <li>
            <a href={siteConfig.socials.substack} {...linkProps(siteConfig.socials.substack)} className={s.rowLink}>
              <span className={s.rowTitle}>Everything I write, on Substack</span>
              <span aria-hidden="true" className={s.leader} />
              <span className={s.rowMeta}>→</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
