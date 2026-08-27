import type { ReactNode } from "react";

export function ChartCard({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#121a2b] p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-[#f2f6fb]">{title}</h2>
      <p className="mb-4 mt-1 text-[13px] leading-relaxed text-[#8695ac]">{intro}</p>
      {children}
    </section>
  );
}
