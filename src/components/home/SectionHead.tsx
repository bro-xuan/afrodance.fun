import s from "./home.module.css";

/**
 * A section's number and pillar in pixel caps, its heading, and one line under it. Heads always
 * sit on the page's column, so they share one left edge even where a showcase runs wider.
 * `quiet` makes the heading smaller, for the section that isn't one of the three pillars.
 */
export default function SectionHead({
  titleId,
  n,
  label,
  title,
  sub,
  quiet,
}: {
  titleId: string;
  n: string;
  label: string;
  title: string;
  sub?: string;
  quiet?: boolean;
}) {
  return (
    <header className={`${s.head}${quiet ? ` ${s.headQuiet}` : ""} pixel-reveal`}>
      <p className={s.eyebrow}>
        {n} / {label}
      </p>
      <h2 id={titleId} className={s.title}>
        {title}
      </h2>
      {sub && <p className={s.sub}>{sub}</p>}
    </header>
  );
}
