import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { C } from "../lib/format";
import type { SourceStatus } from "../lib/types";
import type { Lean } from "../lib/signals";

export function Section({ n, title, kicker, children }: { n: string; title: string; kicker?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-12 first:mt-0" id={title.toLowerCase().replace(/[^a-z]+/g, "-")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b pb-3" style={{ borderColor: C.ink }}>
        <h2 className="flex items-baseline gap-3 text-[1.5rem] font-semibold tracking-[-0.02em]">
          <span className="mi-num text-[0.9rem] font-medium" style={{ color: C.accent }}>{n}</span>
          {title}
        </h2>
        {kicker && <div className="text-[0.85rem]" style={{ color: C.muted }}>{kicker}</div>}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title, aside, children, className = "", sources, footnote,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  sources?: SourceStatus[];
  footnote?: ReactNode;
}) {
  const failed = sources?.filter((s) => !s.ok) ?? [];
  return (
    <div className={`mi-panel flex flex-col rounded-xl border bg-white p-4 sm:p-5 ${className}`} style={{ borderColor: C.line }}>
      {(title || aside) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title && <h3 className="mi-label">{title}</h3>}
          {aside && <div className="text-right text-[0.8rem]" style={{ color: C.muted }}>{aside}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {failed.length > 0 && (
        <div className="mt-3 rounded-md bg-[#fff6f0] px-2.5 py-1.5 text-[0.8rem]" style={{ color: C.shortInk }}>
          Unavailable: {failed.map((f) => f.source).join(", ")}
        </div>
      )}
      {footnote && <div className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: C.muted }}>{footnote}</div>}
    </div>
  );
}

const LEAN = {
  bull: { label: "Bullish", fg: C.longInk, bg: "#e6f5f0", Icon: ArrowUpRight },
  bear: { label: "Bearish", fg: C.shortInk, bg: "#fcebea", Icon: ArrowDownRight },
  neutral: { label: "Neutral", fg: C.ink2, bg: "#f1f0ec", Icon: Equal },
};

export function LeanChip({ lean }: { lean: Lean }) {
  const l = LEAN[lean];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.8rem] font-medium" style={{ color: l.fg, background: l.bg }}>
      <l.Icon size="0.9em" strokeWidth={2.5} aria-hidden />
      {l.label}
    </span>
  );
}

export function Skeleton({ h = "8rem" }: { h?: string }) {
  return <div className="mi-skel w-full rounded-lg" style={{ height: h }} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[6rem] items-center justify-center rounded-lg border border-dashed px-4 text-center text-[0.9rem]" style={{ borderColor: C.line, color: C.muted }}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, valueColor }: { label: ReactNode; value: ReactNode; sub?: ReactNode; valueColor?: string }) {
  return (
    <div>
      <div className="mi-label">{label}</div>
      <div className="mi-num mt-1 text-[1.6rem] font-semibold leading-none tracking-[-0.02em]" style={{ color: valueColor ?? C.ink }}>{value}</div>
      {sub && <div className="mt-1.5 text-[0.85rem]" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

/** Two-sided long/short split bar with in-bar labels (identity never color-alone). */
export function SplitBar({ long, label = true }: { long: number; label?: boolean }) {
  const l = Math.max(0, Math.min(1, long));
  return (
    <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px] text-[0.8rem] font-semibold text-white">
      <div className="flex items-center pl-1.5" style={{ width: `${l * 100}%`, background: C.long }}>
        {label && l > 0.18 && `L ${(l * 100).toFixed(0)}%`}
      </div>
      <div className="flex items-center justify-end pr-1.5" style={{ width: `${(1 - l) * 100}%`, background: C.short }}>
        {label && 1 - l > 0.18 && `S ${((1 - l) * 100).toFixed(0)}%`}
      </div>
    </div>
  );
}
