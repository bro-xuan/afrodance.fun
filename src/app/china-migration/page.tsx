import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import migration from "./data/migration.json";
import type { MigrationData } from "./types";
import { MigrationMap } from "./components/MigrationMap";

const data = migration as unknown as MigrationData;

export default function ChinaMigrationPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-white/55 hover:text-white/85 transition mb-8"
      >
        <ArrowLeft size={12} /> afrodance.fun
      </Link>

      <header className="mb-8 md:mb-12 max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-3">
          A visual essay
        </div>
        <h1
          className="text-4xl md:text-6xl leading-[1.05] tracking-tight text-white"
          style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 500 }}
        >
          A generation of migration,{" "}
          <span className="italic text-[#f5d2a4]">in and out of China.</span>
        </h1>
        <p className="mt-5 text-base md:text-lg text-white/70 leading-relaxed">
          This map starts <em>empty</em> in 1990. Every dot you&rsquo;ll see appear after that is a
          packet of roughly fourteen thousand people (four thousand for the cooler direction)
          joining the Chinese diaspora abroad, or foreign-born residents arriving inside China,
          since that baseline year. By the end of 2024 about{" "}
          <span className="tabular-nums">7.7 million</span> new outbound dots and{" "}
          <span className="tabular-nums">1.1 million</span> inbound dots have piled up — warm for
          out, cool for in. The dots settle inside the country the migrants live in; the comet
          streaks are air traffic between five-year snapshots, not individuals.
        </p>
        <p className="mt-4 text-sm md:text-base text-[#f5d2a4]/90 italic">
          Press play below to watch 1990 to 2024 unfold in thirty seconds.
        </p>
      </header>

      <MigrationMap data={data} />

      <footer
        className="mt-12 md:mt-16 border-t border-white/10 pt-6 grid gap-4 md:grid-cols-2 text-xs text-white/55 leading-relaxed"
        style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}
      >
        <div>
          <div className="text-white/75 mb-1.5 uppercase tracking-[0.18em]">Source</div>
          United Nations Department of Economic and Social Affairs, Population Division (2024).{" "}
          <em>International Migrant Stock 2024.</em> Bilateral matrix by destination and origin,
          mid-year stock, 1990–2024. Free to download at un.org.
        </div>
        <div>
          <div className="text-white/75 mb-1.5 uppercase tracking-[0.18em]">What you&apos;re looking at</div>
          UN DESA reports stock — &ldquo;people born in country X living in country Y&rdquo; — every five
          years, not annual flows. Migration here is approximated from period-to-period stock change.
          Hong Kong, Macao, and Taiwan appear as separate territories per the source. Undocumented
          migrants are undercounted.
        </div>
      </footer>
    </main>
  );
}
