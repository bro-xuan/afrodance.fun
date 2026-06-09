import { Project } from "@/types";

const buttonClass: Record<string, string> = {
  primary: "nes-btn is-primary",
  success: "nes-btn is-success",
  warning: "nes-btn is-warning",
  error: "nes-btn is-error",
};

export default function ProjectCard({ project }: { project: Project }) {
  const btnCls = buttonClass[project.color ?? "primary"];
  const isExternal = project.url.startsWith("http");

  return (
    <a
      href={project.url}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="card-hover block transition-transform h-full"
    >
      <div className="nes-container with-title is-centered h-full flex flex-col">
        <p className="title font-pixel !flex items-center justify-center text-center min-h-[2.6rem]">
          {project.title}
        </p>
        <div className="flex flex-col items-center text-center gap-4 p-2 flex-1">
          <span className="text-4xl leading-none">{project.emoji}</span>
          <p className="font-body text-sm text-muted-foreground flex-1">
            {project.description}
          </p>
          <button type="button" className={btnCls}>
            Visit
          </button>
        </div>
      </div>
    </a>
  );
}
