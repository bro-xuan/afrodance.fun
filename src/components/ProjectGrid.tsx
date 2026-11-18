import { agency, projects } from "@/data/projects";
import FeaturedProject from "./FeaturedProject";
import ProjectCard from "./ProjectCard";

// The bracket under the agency line: thin, and lighter than the text it hangs from.
const LINE = "bg-[#84a85c]";

export default function ProjectGrid() {
  return (
    <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-10 sm:py-14">
      <div className="pixel-reveal mb-8 flex flex-col items-center text-center">
        <span className="font-pixel mb-3 inline-block border-2 border-[#2d2d2d] bg-white px-2.5 py-1 text-[0.58rem] tracking-wider text-[#3a6510]">
          01 / SIDE PROJECTS &amp; LAB
        </span>
        <h2 className="font-pixel !mb-3 text-xl text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4] sm:text-2xl">
          Projects
        </h2>
        <p className="font-body !mb-0 text-base text-[#595959]">
          Little things I&apos;ve shipped — AI, crypto, and the occasional bad idea.
        </p>
      </div>

      {/* The agency grows everything below it: its line sits right on top of the projects,
          and a pixel bracket fans out from it onto them. `!` overrides nes.css `a` rules. */}
      <div className="pixel-reveal mb-1.5">
        <p className="font-body !mb-0 px-2 text-center text-lg leading-snug text-[#2d2d2d] sm:text-xl">
          Running an agentic social media agency for my apps&apos; growth:{" "}
          <a
            href={agency.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group whitespace-nowrap !text-[#4a7c10] !no-underline"
          >
            <span className="font-semibold underline decoration-2 decoration-dotted underline-offset-4 group-hover:decoration-solid">
              {agency.name}
            </span>
          </a>
        </p>

        {/* a thin bracket: a stem up to the line, a bar across the full width, and its two
            ends dropping onto the edges of the projects below */}
        <div aria-hidden="true" className="relative mt-2 h-5">
          <span className={`absolute left-1/2 top-0 h-2.5 w-0.5 -translate-x-1/2 ${LINE}`} />
          <span className={`absolute inset-x-0 top-2.5 h-0.5 ${LINE}`} />
          <span className={`absolute left-0 top-2.5 bottom-0 w-0.5 ${LINE}`} />
          <span className={`absolute right-0 top-2.5 bottom-0 w-0.5 ${LINE}`} />
        </div>
      </div>

      <FeaturedProject />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
