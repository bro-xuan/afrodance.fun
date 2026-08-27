import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { metaForPhase, phaseForScore } from "./lib/phase-meta";
import { buildTriggers, buildWatch, verdict } from "./lib/insights";
import { data, summary } from "./lib/summary";
import { SECTIONS } from "./lib/routes";
import { Gauge } from "./components/Gauge";
import { LivePrice } from "./components/LivePrice";
import { ConvictionBar } from "./components/ConvictionBar";
import { ExtremeWatch } from "./components/ExtremeWatch";
import { PageShell } from "./components/PageShell";
import { SectionHeading } from "./components/SectionHeading";

export default function BottomIndicatorPage() {
  const { rows, scored, aggregate, counts, asOf } = summary();

  const bottomWatch = buildWatch(rows, "bottom");
  const topWatch = buildWatch(rows, "top");
  const bottomTriggers = buildTriggers(rows, "bottom");
  const topTriggers = buildTriggers(rows, "top");

  const meta = aggregate !== null ? metaForPhase(phaseForScore(aggregate)) : null;
  const headlineCount = aggregate !== null
    ? counts.find((c) => c.phase === phaseForScore(aggregate))?.count ?? 0
    : 0;

  return (
    <PageShell
      eyebrow="Bitcoin · cycle valuation"
      title={<>BTC Bottom &amp; Top Indicator</>}
      intro={<>
        One score for where Bitcoin sits in its market cycle — the average of{" "}
        {scored.length ? `${scored.length} ` : ""}two-sided on-chain, miner, and price signals,
        each ranked against its own entire history.
        0 = past bottoms, 100 = past tops. Three one-sided trigger signals watch each extreme separately.
      </>}
    >
      {/* ── Hero: the gauge + verdict ─────────────────────────────── */}
      <section className="mb-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#121a2b] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(0,0,0,0.7)] sm:p-7">
        {aggregate !== null && meta ? (
          <>
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:gap-9">
              <div>
                <Gauge score={aggregate} />
                <div className="mt-1 flex justify-between px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                  <span style={{ color: "#34d399" }}>Bottom · Accumulate</span>
                  <span style={{ color: "#f87171" }}>Top · Distribute</span>
                </div>
              </div>

              <div>
                <p className="text-[17px] leading-relaxed text-[#dfe7f1] md:text-[19px]">
                  {verdict(aggregate, counts, scored.length)}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span
                    className="inline-flex items-baseline gap-1.5 rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: `${meta.hex}1c` }}
                  >
                    <span className="text-lg font-bold tabular-nums" style={{ color: meta.text }}>
                      {headlineCount}
                    </span>
                    <span className="text-sm text-[#aab6c9]">/ {scored.length} signals reading {meta.label}</span>
                  </span>
                  <LivePrice fallback={data.btcPrice} asOf={asOf} />
                </div>

                <div className="mt-5">
                  <ConvictionBar counts={counts} total={scored.length} />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f1724] px-4 py-3 text-[13px] leading-relaxed text-[#8695ac]">
              <span className="font-semibold text-[#aab6c9]">How to read this:</span>{" "}
              the needle sits on a 0–100 cycle scale — left (green) = historically{" "}
              <strong className="font-semibold text-[#c7d0de]">cheap</strong>, where past bottoms lived;
              right (red) = historically <strong className="font-semibold text-[#c7d0de]">expensive</strong>,
              where past tops lived. Each of the {scored.length} two-sided signals is ranked against its
              own full history and averaged, so today&apos;s{" "}
              <span className="tabular-nums text-[#c7d0de]">{aggregate}</span> means BTC is{" "}
              {aggregate < 50
                ? <>cheaper than roughly <span className="tabular-nums text-[#c7d0de]">{100 - aggregate}%</span></>
                : <>richer than roughly <span className="tabular-nums text-[#c7d0de]">{aggregate}%</span></>}{" "}
              of its entire trading history. The watch panels below count how many signals sit at each
              extreme; one-sided triggers only ever count toward their own end. Not financial advice.
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-xl font-semibold text-[#6b7893]">No data yet</div>
        )}
      </section>

      {/* ── Extreme watch ─────────────────────────────────────────── */}
      <SectionHeading title="Bottom & top watch" aside="signals at each extreme · trigger crosses at ratio 1.00" />
      <ExtremeWatch
        bottom={{ watch: bottomWatch, triggers: bottomTriggers }}
        top={{ watch: topWatch, triggers: topTriggers }}
      />

      {/* ── Go deeper ─────────────────────────────────────────────── */}
      <SectionHeading title="Go deeper" aside="each section on its own page" />
      <div className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.slice(1).map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#121a2b] p-5 transition hover:border-[rgba(255,255,255,0.16)] hover:bg-[#151f33]"
          >
            <div className="flex items-center justify-between text-[15px] font-semibold text-[#f2f6fb]">
              {s.label}
              <ArrowRight size={15} className="text-[#6b7893] transition group-hover:translate-x-0.5 group-hover:text-[#e6edf5]" />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#8695ac]">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
