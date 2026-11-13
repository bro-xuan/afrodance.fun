import { agency } from "@/data/projects";
import AgencyWeekVisual from "./visuals/AgencyWeekVisual";

// Day-badge tints for the four steps, from the About tags' palette.
const STEP_TINTS = ["bg-[#e8f5d4]", "bg-[#d6eaf8]", "bg-[#fef3cd]", "bg-[#fadbd8]"];

// The agency, right under the intro: one box like the featured project's, with
// its scene and pitch on top, the four steps of a week in a band, and what it
// won't do along the bottom. It carries two outside links, the agency's site
// (the scene goes there too) and LinkedIn. Layout lives on divs because
// nes.css's unlayered normalize outranks Tailwind's flex/grid on semantic
// elements (so the lists are divs with list roles); `!` undoes its
// `p { margin-bottom: 1rem }`.
export default function Agency() {
  const { name, url, intro, headline, facts, description, steps, promises, contact } = agency;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

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
          <a href={url} {...external} tabIndex={-1} aria-hidden="true" className="card-hover block">
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
            <div className="flex flex-wrap items-center gap-3">
              <a href={url} {...external} className="nes-btn is-success">
                Visit {new URL(url).host}
              </a>
              <a href={contact.url} {...external} className="nes-btn is-primary">
                {contact.label}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 border-4 border-[#2d2d2d] bg-[#f2f7e6] p-3 sm:m-2 sm:mt-6 sm:p-4">
          <p className="font-pixel !mb-4 text-[0.8rem] leading-relaxed text-[#4a7c10]">How it works</p>
          <div role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div role="listitem" key={step.title} className="flex flex-col items-start gap-2">
                <span
                  className={`font-pixel border-2 border-[#2d2d2d] px-2 py-1 text-[0.7rem] leading-none text-[#2d2d2d] ${STEP_TINTS[i % STEP_TINTS.length]}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-pixel !mb-0 text-[0.75rem] leading-relaxed text-[#2d2d2d]">{step.title}</p>
                <p className="font-body !mb-0 text-base text-[#2d2d2d]">{step.body}</p>
              </div>
            ))}
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
