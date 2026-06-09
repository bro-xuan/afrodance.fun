import { projects } from "@/data/projects";
import ProjectCard from "./ProjectCard";

export default function ProjectGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="font-pixel text-[#4a7c10] text-lg sm:text-xl mb-3">
          Projects
        </h2>
        <p className="font-body text-sm text-muted-foreground mb-4">
          Little things I&apos;ve shipped — AI, crypto, and the occasional bad idea.
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-[#4a7c10]" />
          <span className="inline-block h-2 w-2 bg-[#1a7abb]" />
          <span className="inline-block h-2 w-2 bg-[#c9a800]" />
          <span className="inline-block h-2 w-2 bg-[#d44332]" />
          <span className="inline-block h-2 w-2 bg-[#7e3f9b]" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
