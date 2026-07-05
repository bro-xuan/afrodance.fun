import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import snapshot from "./data/indicators.json";
import type { IndicatorsSnapshot } from "./types";
import { metaForPhase, phaseForScore } from "./lib/phase-meta";
import { IndicatorTable } from "./components/IndicatorTable";

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
  const aggPhase = aggregate !== null ? phaseForScore(aggregate) : null;
  const aggMeta = aggPhase ? metaForPhase(aggPhase) : null;

  const asOf = rows.map((r) => r.asOfDate).filter(Boolean).sort().at(-1) ?? null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[#8b9096] transition hover:text-[#1f2328]"
      >
        <ArrowLeft size={13} /> afrodance.fun
      </Link>

      <header className="mb-8 max-w-2xl">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#a4a9ae]">
          Bitcoin · on-chain
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#111417] md:text-4xl">
          BTC Bottom Indicator
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5f656b]">
          A basket of on-chain valuation signals — MVRV, NUPL, SOPR, realized-price models — each
          scored against its own history from <strong className="font-semibold text-[#1f2328]">0
          (deepest bottom)</strong> to <strong className="font-semibold text-[#1f2328]">100 (frothiest
          top)</strong>. When most signals cluster low, BTC is statistically in accumulation territory.
        </p>
      </header>

      {/* Aggregate summary */}
      <section className="mb-6 rounded-2xl border border-[#eceef0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[#a4a9ae]">
              Aggregate signal
            </div>
            {aggregate !== null && aggMeta ? (
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums" style={{ color: aggMeta.accent }}>
                  {aggregate}
                </span>
                <span className="text-sm text-[#8b9096]">/ 100</span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${aggMeta.badge}`}
                >
                  {aggPhase}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-2xl font-semibold text-[#b4b8bd]">No data yet</div>
            )}
            <div className="mt-2 text-xs text-[#a4a9ae]">
              Mean of {scored.length} scored indicator{scored.length === 1 ? "" : "s"}
            </div>
          </div>

          {data.btcPrice ? (
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-[#a4a9ae]">
                BTC spot
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[#1f2328]">
                ${data.btcPrice.toLocaleString("en-US")}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <IndicatorTable rows={rows} />

      {/* Footer / provenance */}
      <footer className="mt-6 flex flex-col gap-1.5 text-xs text-[#a4a9ae]">
        <div>
          Data as of <span className="text-[#6b7075]">{fmtDate(asOf)}</span> · snapshot refreshed daily via scheduled job
        </div>
        <div>
          On-chain metrics from{" "}
          <a href="https://bitcoin-data.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#6b7075]">
            bitcoin-data.com
          </a>{" "}
          (BGeometrics); BTC price from Binance. Scores are percentile ranks computed here — not
          investment advice, and different from any single provider&apos;s proprietary index.
        </div>
      </footer>
    </main>
  );
}
