import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import snapshot from "./data/indicators.json";
import type { IndicatorsSnapshot } from "./types";
import { metaForPhase, phaseForScore } from "./lib/phase-meta";
import { buildGroups, phaseCounts, verdict } from "./lib/insights";
import { Gauge } from "./components/Gauge";
import { ConvictionBar } from "./components/ConvictionBar";
import { IndicatorGroups } from "./components/IndicatorGroups";

const data = snapshot as unknown as IndicatorsSnapshot;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function BottomIndicatorPage() {
  const rows = data.rows ?? [];
  const scored = rows.filter((r) => r.available && r.score !== null);
  const aggregate = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.score as number), 0) / scored.length)
    : null;

  const counts = phaseCounts(rows);
  const groups = buildGroups(rows);
  const asOf = rows.map((r) => r.asOfDate).filter(Boolean).sort().at(-1) ?? null;

  const meta = aggregate !== null ? metaForPhase(phaseForScore(aggregate)) : null;
  const headlineCount = aggregate !== null
    ? counts.find((c) => c.phase === phaseForScore(aggregate))?.count ?? 0
    : 0;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[#7f8ca3] transition hover:text-[#e6edf5]"
      >
        <ArrowLeft size={13} /> afrodance.fun
      </Link>

      <header className="mb-7 max-w-2xl">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6b7893]">
          Bitcoin · valuation
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#f2f6fb] md:text-[2.6rem]">
          BTC Bottom Indicator
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9aa9bd]">
          One score for how cheap or expensive Bitcoin is right now — the average of 15 on-chain,
          miner, and price signals, each ranked against its own entire history. Lower = closer to
          historic bottoms.
        </p>
      </header>

      {/* ── Hero: the gauge + verdict ─────────────────────────────── */}
      <section className="mb-5 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#121a2b] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(0,0,0,0.7)] sm:p-7">
        {aggregate !== null && meta ? (
          <>
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:gap-9">
              {/* gauge + explicit end tags */}
              <div>
                <Gauge score={aggregate} />
                <div className="mt-1 flex justify-between px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                  <span style={{ color: "#34d399" }}>Cheap · Accumulate</span>
                  <span style={{ color: "#f87171" }}>Expensive · Distribute</span>
                </div>
              </div>

              {/* verdict + consensus */}
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
                  {data.btcPrice ? (
                    <span className="text-sm text-[#8695ac]">
                      BTC <span className="tabular-nums font-semibold text-[#e6edf5]">${data.btcPrice.toLocaleString("en-US")}</span>
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <ConvictionBar counts={counts} total={scored.length} />
                </div>
              </div>
            </div>

            {/* how to read */}
            <div className="mt-6 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f1724] px-4 py-3 text-[13px] leading-relaxed text-[#8695ac]">
              <span className="font-semibold text-[#aab6c9]">How to read this:</span>{" "}
              the needle sits on a 0–100 value scale — left (green) = historically <strong className="font-semibold text-[#c7d0de]">cheap</strong>, accumulation;
              right (red) = historically <strong className="font-semibold text-[#c7d0de]">expensive</strong>, distribution. Each of the {scored.length} signals
              is ranked against its own full history and averaged, so today&apos;s{" "}
              <span className="tabular-nums text-[#c7d0de]">{aggregate}</span> means BTC is{" "}
              {aggregate < 50
                ? <>cheaper than roughly <span className="tabular-nums text-[#c7d0de]">{100 - aggregate}%</span></>
                : <>richer than roughly <span className="tabular-nums text-[#c7d0de]">{aggregate}%</span></>}{" "}
              of its entire trading history. Not financial advice.
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-xl font-semibold text-[#6b7893]">No data yet</div>
        )}
      </section>

      {/* ── The 15 signals, grouped ───────────────────────────────── */}
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#aab6c9]">The signals</h2>
        <span className="text-xs text-[#7f8ca3]">ranked 0 = cheapest · 100 = dearest</span>
      </div>
      <IndicatorGroups groups={groups} />

      {/* Footer / provenance */}
      <footer className="mt-6 flex flex-col gap-1.5 text-xs text-[#8695ac]">
        <div>
          Data as of <span className="text-[#8695ac]">{fmtDate(asOf)}</span> · snapshot refreshed daily via scheduled job
        </div>
        <div>
          On-chain &amp; miner metrics from{" "}
          <a href="https://bitcoin-data.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#aab6c9]">
            bitcoin-data.com
          </a>{" "}
          (BGeometrics); price-based signals and BTC spot from Binance. Scores are percentile ranks
          computed here — not investment advice, and different from any single provider&apos;s
          proprietary index.
        </div>
      </footer>
    </main>
  );
}
