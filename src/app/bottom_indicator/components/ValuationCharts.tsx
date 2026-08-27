"use client";

import { useMemo } from "react";
import type { CyclesSnapshot, ScoreHistory } from "../types";
import { ChartCard } from "./ChartCard";
import { BandsChart } from "./BandsChart";
import { PriceLinesChart } from "./PriceLinesChart";
import { RiskColoredPriceChart } from "./RiskColoredPriceChart";
import { CHART, fmtPct, fmtUsd, regressionPrice } from "../lib/chart";
import { aggregateScoreHistory } from "../lib/score-history";

interface Props { cycles: CyclesSnapshot; scoreHistory: ScoreHistory; totalSignals: number }

/** One client boundary for the "how cheap" charts; derived series are computed here. */
export function ValuationCharts({ cycles, scoreHistory, totalSignals }: Props) {
  const reg = cycles.regression;
  const bandRows = cycles.bands.rows;
  const regRows = bandRows.map((r) => ({
    d: r[0],
    values: [r[1], ...(["floor", "low", "mid", "high", "ceiling"] as const).map((k) => regressionPrice(reg, r[0], reg.bands[k]))],
  }));
  const regLast = regRows[regRows.length - 1];
  const regPos = Math.log10(regLast.values[0]! / regLast.values[3]!); // log-distance from the trend
  const investorRows = bandRows.map((r) => ({ d: r[0], values: [r[1], r[5], r[5] === null ? null : r[5] * 5] }));
  const invLast = investorRows[investorRows.length - 1];
  const riskAgg = useMemo(() => aggregateScoreHistory(scoreHistory, bandRows.map((r) => r[0])), [scoreHistory, bandRows]);
  const riskPoints = bandRows.map((r, i) => ({ d: r[0], close: r[1], score: riskAgg[i].score, count: riskAgg[i].count }));
  return (
    <>
      <ChartCard title="Price color-coded by cycle score" intro={<>
        The site&apos;s own 0–100 score painted onto price history — the Cowen &ldquo;risk&rdquo; view.
        Green weeks were historically cheap, red weeks historically expensive; the pattern at past
        bottoms is what to compare today against.
      </>}>
        <RiskColoredPriceChart points={riskPoints} totalSignals={totalSignals} />
      </ChartCard>

      <ChartCard title="Logarithmic regression bands" intro={<>
        Log price against log time since genesis, fitted through all history: the mid line is the
        long-run trend, the fan marks where 0.5&#8239;% / 10&#8239;% / 90&#8239;% / 99.5&#8239;% of history sat relative to it.
        Bear-market lows have hugged the lower green band; blow-off tops the upper red one, each cycle
        closer to trend than the last (Cowen&apos;s diminishing returns).
      </>}>
        <PriceLinesChart rows={regRows} defaultRange="all"
          title={`Bitcoin weekly price with logarithmic regression bands. Latest close ${fmtUsd(regLast.values[0]!)} sits ${regPos >= 0 ? "above" : "below"} the trend line at ${fmtUsd(regLast.values[3]!)}.`}
          lines={[
            { idx: 0, label: "Weekly close", color: CHART.current, width: 2.25, edge: true, short: "BTC" },
            { idx: 3, label: "Trend (regression)", color: CHART.series[0], width: 1.75, edge: true, short: "Trend" },
            { idx: 2, label: "Lower band (10%)", color: "#10b981", width: 1.25, opacity: 0.9, edge: true, short: "Low" },
            { idx: 1, label: "Floor (0.5%)", color: "#10b981", width: 1, opacity: 0.6 },
            { idx: 4, label: "Upper band (90%)", color: "#ef4444", width: 1.25, opacity: 0.9 },
            { idx: 5, label: "Ceiling (99.5%)", color: "#ef4444", width: 1, opacity: 0.6 },
          ]}
          fills={[
            { upper: 2, lower: 1, color: "#10b981", opacity: 0.16 },
            { upper: 5, lower: 4, color: "#ef4444", opacity: 0.14 },
          ]}
          footer={<p className="mt-3 text-[13px] leading-relaxed text-[#8695ac]">
            Latest close <span className="tabular-nums text-[#c7d0de]">{fmtUsd(regLast.values[0]!)}</span> is{" "}
            <span className="tabular-nums text-[#c7d0de]">{fmtPct(regLast.values[0]! / regLast.values[3]! - 1)}</span> vs the trend
            line (<span className="tabular-nums text-[#c7d0de]">{fmtUsd(regLast.values[3]!)}</span>); the lower band sits at{" "}
            <span className="tabular-nums text-[#c7d0de]">{fmtUsd(regLast.values[2]!)}</span> and the floor at{" "}
            <span className="tabular-nums text-[#c7d0de]">{fmtUsd(regLast.values[1]!)}</span>.
            Fit: log₁₀ price = {reg.a} + {reg.b} · log₁₀ days, OLS through {reg.fittedThrough}.
          </p>}
        />
      </ChartCard>

      <ChartCard title="Support band and the 200-week average" intro={<>
        The 20-week SMA / 21-week EMA band is support in bull markets and resistance in bear markets; the
        200-week SMA is the floor every past cycle low has tested. Price squeezed between the two is the
        classic pre-bottom setup.
      </>}>
        <BandsChart rows={bandRows} asOfDate={cycles.asOfDate} />
      </ChartCard>

      <ChartCard title="2-year MA multiplier (Investor Tool)" intro={<>
        Price below the 2-year moving average has marked every accumulation zone; price above 5× that
        average has marked every blow-off top. Two lines, one rule.
      </>}>
        <PriceLinesChart rows={investorRows} defaultRange="all"
          title={`Bitcoin weekly price with the 2-year moving average and 5× that average. Latest close ${fmtUsd(invLast.values[0]!)}${invLast.values[1] ? `, 2-year MA ${fmtUsd(invLast.values[1])}` : ""}.`}
          lines={[
            { idx: 0, label: "Weekly close", color: CHART.current, width: 2.25, edge: true, short: "BTC" },
            { idx: 1, label: "2-year MA", color: "#10b981", width: 2, edge: true, short: "2y MA" },
            { idx: 2, label: "2-year MA × 5", color: "#ef4444", width: 1.5, edge: true, short: "×5" },
          ]}
          fills={[{ upper: 2, lower: 1, color: CHART.textMuted, opacity: 0.08 }]}
          footer={invLast.values[1] ? <p className="mt-3 text-[13px] leading-relaxed text-[#8695ac]">
            Latest close is <span className="tabular-nums text-[#c7d0de]">{fmtPct(invLast.values[0]! / invLast.values[1] - 1)}</span> vs
            the 2-year MA at <span className="tabular-nums text-[#c7d0de]">{fmtUsd(invLast.values[1])}</span>
            {invLast.values[0]! < invLast.values[1] ? " — inside the historical accumulation zone." : " — above the accumulation zone."}
          </p> : null}
        />
      </ChartCard>
    </>
  );
}
