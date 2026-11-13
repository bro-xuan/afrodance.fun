import { agency } from "@/data/projects";
import AgencyWeekVisual from "./visuals/AgencyWeekVisual";

// The agency, right under the intro: one box like the featured project's, with
// its scene and pitch on top and what it won't do along the bottom. Its one way
// out is the agency's own site at /paperkite (the scene goes there too), which
// stays in the tab like the site's other on-site projects. Layout lives on divs
// because nes.css's unlayered normalize outranks Tailwind's flex/grid on semantic
// elements (so the list is divs with list roles); `!` undoes its
// `p { margin-bottom: 1rem }`.
export default function Agency() {
  const { name, url, intro, headline, facts, description, promises } = agency;

  return (
    <section id="agency" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-8">
      <div className="pixel-reveal mb-10 text-center">
        <h2 className="font-pixel mb-3 text-xl text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4] sm:text-2xl">
          My agency
        </h2>
        <p className="font-body text-base text-muted-foreground">{intro}</p>
      </div>

      <div className="pixel-reveal nes-container with-title pixel-shadow !bg-white">
        <h3 className="title font-pixel">{name}</h3>

        <div className="grid items-center gap-6 p-2 md:grid-cols-2 md:gap-8">
          {/* Out of the tab order: the site button goes to the same place. */}
          <a href={url} tabIndex={-1} aria-hidden="true" className="card-hover block">
            <AgencyWeekVisual />
          </a>

          <div className="flex flex-col items-start gap-4">
            <p className="font-pixel !mb-0 text-[0.85rem] leading-relaxed text-[#2d2d2d] sm:text-base">{headline}</p>
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
            <a href={url} className="nes-btn is-success">
              Visit {name}
            </a>
          </div>
        </div>

        <div role="list" className="mt-4 grid gap-x-8 gap-y-2 p-2 sm:grid-cols-2">
          {promises.map((promise) => (
            <div role="listitem" key={promise} className="flex items-start gap-3">
              {/* a pixel check, drawn rather than typed: the pixel fonts have no ✓ */}
              <svg
                viewBox="0 0 5 3"
                className="mt-[0.45em] h-[0.6rem] w-4 shrink-0"
                shapeRendering="crispEdges"
                aria-hidden="true"
              >
                <path d="M4 0h1v1H4zM0 1h1v1H0zM3 1h1v1H3zM1 2h2v1H1z" fill="#4a7c10" />
              </svg>
              <span className="font-body text-base text-[#2d2d2d]">{promise}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
