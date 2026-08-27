import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SubNav } from "./SubNav";
import { Provenance } from "./Provenance";

interface Props { eyebrow: string; title: ReactNode; intro: ReactNode; children: ReactNode }

export function PageShell({ eyebrow, title, intro, children }: Props) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[#7f8ca3] transition hover:text-[#e6edf5]"
      >
        <ArrowLeft size={13} /> afrodance.fun
      </Link>

      <header className="mb-6 max-w-2xl">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6b7893]">{eyebrow}</div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#f2f6fb] md:text-[2.6rem]">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9aa9bd]">{intro}</p>
      </header>

      <SubNav />

      {children}

      <Provenance />
    </main>
  );
}
