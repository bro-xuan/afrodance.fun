import { VISUALS } from "@/components/visuals/registry";
import { alsoMade } from "@/data/projects";
import type { IndexEntry } from "@/types";
import { linkProps } from "./links";
import SectionHead from "./SectionHead";
import s from "./home.module.css";

function Row({ entry }: { entry: IndexEntry }) {
  const inner = (
    <>
      <span aria-hidden="true" className={s.entryEmoji}>
        {entry.emoji}
      </span>
      <span className={s.entryTitle}>{entry.title}</span>
      <span aria-hidden="true" className={s.entryLeader} />
      <span className={s.entryKind}>{entry.kind}</span>
      <span className={s.entryLine}>{entry.line}</span>
    </>
  );
  return entry.url ? (
    <a href={entry.url} {...linkProps(entry.url)} className={s.entryLink}>
      {inner}
    </a>
  ) : (
    <div className={s.entryLink}>{inner}</div>
  );
}

// Everything that isn't one of the three pillars, as one index (rog.ie's project list, in
// pixels). On a wide screen with a pointer, hovering a row shows its animated scene in the
// gutter beside the list; everywhere else the row says what it is under its title.
export default function AlsoMade() {
  return (
    <section id="also-made" aria-labelledby="also-made-title" className={s.section}>
      <div className={s.column}>
        <SectionHead
          titleId="also-made-title"
          n="04"
          label="Also made"
          title="Experiments and side quests"
          sub="Tools, toys and earlier projects."
          quiet
        />
        <ul className={`${s.index} pixel-reveal`}>
          {alsoMade.map((entry) => {
            const Visual = entry.visual ? VISUALS[entry.visual] : null;
            return (
              <li key={entry.title} className={s.entry}>
                <Row entry={entry} />
                <div aria-hidden="true" className={s.preview}>
                  <div className={s.previewCard}>
                    {Visual && (
                      <div className={s.previewScene}>
                        <Visual />
                      </div>
                    )}
                    <p className={s.previewText}>{entry.line}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
