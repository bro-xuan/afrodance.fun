import { C } from "../lib/format";
import type { Signal } from "../lib/signals";
import { LeanChip, Skeleton } from "./ui";

export function Pulse({ signals }: { signals: Signal[] }) {
  const bull = signals.filter((s) => s.lean === "bull").length;
  const bear = signals.filter((s) => s.lean === "bear").length;

  if (!signals.length) return <Skeleton h="9rem" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="text-[1.1rem] font-medium">
          <span className="mi-num font-semibold" style={{ color: C.longInk }}>{bull}</span> lean bullish,{" "}
          <span className="mi-num font-semibold" style={{ color: C.shortInk }}>{bear}</span> lean bearish,{" "}
          <span className="mi-num font-semibold">{signals.length - bull - bear}</span> neutral
        </div>
        <div className="flex h-2.5 min-w-[10rem] flex-1 gap-[2px] overflow-hidden rounded-full" aria-hidden>
          <div style={{ flex: bull, background: C.long }} />
          <div style={{ flex: signals.length - bull - bear, background: "#d9d8d2" }} />
          <div style={{ flex: bear, background: C.short }} />
        </div>
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: C.line, background: C.line }}>
        {signals.map((s) => (
          <div key={s.key} className="flex flex-col gap-2 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="mi-label">{s.label}</span>
              <LeanChip lean={s.lean} />
            </div>
            <div className="mi-num text-[1.3rem] font-semibold tracking-[-0.02em]">{s.value}</div>
            <div className="text-[0.9rem] leading-snug" style={{ color: C.ink2 }}>{s.read}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
