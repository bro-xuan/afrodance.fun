import { featuredProject } from "@/data/projects";
import UseCaseGalleryVisual from "./visuals/UseCaseGalleryVisual";

// Shown wide above the project grid, framed as a pixel window with its weekly AI
// newsletter in a full-bleed bottom band.
export default function FeaturedProject() {
  const { title, url, facts, description, newsletter } = featuredProject;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <article id="what-people-made" className="mb-12 scroll-mt-8">
      <div className="pixel-reveal pixel-shadow border-4 border-[#2d2d2d] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#2d2d2d] bg-[#eef7df] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#e07460]" />
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#e6b800]" />
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#6aad30]" />
            </div>
            <h3 className="font-pixel !mb-0 text-sm text-[#2d2d2d] sm:text-base">{title}</h3>
          </div>
          <span className="font-pixel text-[0.58rem] tracking-wide text-[#3a6510]">
            FEATURED / DAILY AI GALLERY
          </span>
        </div>

        <div className="grid items-center gap-6 p-5 sm:p-7 md:grid-cols-2 md:gap-10">
          {/* Out of the tab order: "Browse the gallery" goes to the same place. */}
          <a href={url} {...external} tabIndex={-1} aria-hidden="true" className="card-hover block">
            <UseCaseGalleryVisual />
          </a>

          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <span
                  key={fact}
                  className="font-body border-2 border-[#2d2d2d] bg-[#fdf6d8] px-2.5 py-1 text-[0.85rem] leading-tight text-[#2d2d2d]"
                >
                  {fact}
                </span>
              ))}
            </div>
            <p className="font-body !mb-0 text-base leading-relaxed text-[#2d2d2d]">
              {description}
            </p>
            <a href={url} {...external} className="nes-btn is-success">
              Browse the gallery
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t-4 border-[#2d2d2d] bg-[#fbe9e5] px-5 py-5 sm:px-7 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <p className="font-pixel !mb-2 text-[0.78rem] leading-relaxed text-[#a93226]">
              <span aria-hidden="true">📬 </span>
              {newsletter.title}
            </p>
            <p className="font-body !mb-0 text-base leading-relaxed text-[#2d2d2d]">
              {newsletter.pitch}
            </p>
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
