export function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-2 mt-7 flex flex-wrap items-baseline justify-between gap-x-4 px-1">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#aab6c9]">{title}</h2>
      {aside && <span className="text-xs text-[#7f8ca3]">{aside}</span>}
    </div>
  );
}
