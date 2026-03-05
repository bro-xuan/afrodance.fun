import { Project } from "@/types";

const buttonClass: Record<string, string> = {
  primary: "nes-btn is-primary",
  success: "nes-btn is-success",
  warning: "nes-btn is-warning",
  error: "nes-btn is-error",
};

export default function ProjectCard({ project }: { project: Project }) {
  const btnCls = buttonClass[project.color ?? "primary"];

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover block transition-transform h-full"
    >
      <div className="nes-container with-title h-full">
        <p className="title font-pixel">{project.title}</p>
        <div className="flex flex-col items-center gap-4 p-2 h-full justify-between">
          <span className="text-4xl">{project.emoji}</span>
          <p className="font-body text-sm text-muted-foreground">
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
