import { featuredProject } from "@/data/projects";
import UseCaseGalleryVisual from "./visuals/UseCaseGalleryVisual";

// The project shown wide above the grid, with its weekly newsletter in a band
// along the bottom. Unlike a ProjectCard it isn't one big link: it carries
// three (the site, the sign-up and the archive). Layout lives on divs because
// nes.css's unlayered normalize outranks Tailwind's flex/grid on semantic
// elements; `!` undoes its `p { margin-bottom: 1rem }` and `a { color }`.
export default function FeaturedProject() {
  const { title, url, facts, description, newsletter } = featuredProject;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    // The anchor sits on the article, which never moves; the reveal animates the box inside,
    // so a link to #what-people-made lands at scroll-mt-8 instead of the reveal's offset.
    <article id="what-people-made" className="mb-14 scroll-mt-8">
      <div className="pixel-reveal nes-container with-title pixel-shadow !bg-white">
        <h3 className="title font-pixel">{title}</h3>

        <div className="grid items-center gap-6 p-2 md:grid-cols-2 md:gap-8">
          {/* Out of the tab order: "Browse the gallery" goes to the same place. */}
          <a href={url} {...external} tabIndex={-1} aria-hidden="true" className="card-hover block">
            <UseCaseGalleryVisual />
          </a>

          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <span
                  key={fact}
                  className="font-body border-2 border-[#2d2d2d] bg-[#fdf6d8] px-2 py-1 text-[0.85rem] leading-tight text-[#2d2d2d]"
                >
                  {fact}
                </span>
              ))}
            </div>
            <p className="font-body !mb-0 text-base text-[#2d2d2d]">{description}</p>
            <a href={url} {...external} className="nes-btn is-success">
              Browse the gallery
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-4 border-[#2d2d2d] bg-[#fbe9e5] p-3 sm:m-2 sm:mt-6 sm:p-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <p className="font-pixel !mb-2 text-[0.8rem] leading-relaxed text-[#a93226]">
              <span aria-hidden="true">📬 </span>
              {newsletter.title}
            </p>
            <p className="font-body !mb-0 text-base text-[#2d2d2d]">{newsletter.pitch}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
            <a href={newsletter.subscribeUrl} {...external} className="nes-btn is-error">
              Subscribe
            </a>
            <a
              href={newsletter.archiveUrl}
              {...external}
              className="font-body text-base !text-[#a93226] underline underline-offset-2 hover:opacity-80"
            >
              Past issues →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
