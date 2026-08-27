"use client";

import type { CyclesSnapshot } from "../types";
import { ChartCard } from "./ChartCard";
import { CycleOverlayChart } from "./CycleOverlayChart";
import { DrawdownChart } from "./DrawdownChart";
import { MonthlyReturnsHeatmap } from "./MonthlyReturnsHeatmap";

/** One client boundary for the "when" charts so the snapshot crosses server→client once. */
export function CycleTimingCharts({ cycles }: { cycles: CyclesSnapshot }) {
  const cur = cycles.cycles[cycles.cycles.length - 1];
  const priorEnds = cycles.cycles.slice(1, -1).map((c) => c.endDay);
  return (
    <>
      <ChartCard title="Where are we in the 4-year cycle?" intro={<>
        Each cycle starts at its bear-market low and is drawn on the same day axis. The last two cycles
        bottomed again on day {priorEnds.join(" and day ")}; today is day{" "}
        <span className="tabular-nums text-[#c7d0de]">{cur.endDay}</span> of this one (peak was day {cur.peakDay}).
        The shaded window marks where the prior lows landed. Switch to the halving view to count from the
        2024 halving instead.
      </>}>
        <CycleOverlayChart cycles={cycles.cycles} halvings={cycles.halvings} asOfDate={cycles.asOfDate} />
      </ChartCard>

      <ChartCard title="How deep is this bear market?" intro={<>
        Drawdown from the running all-time high. Every past cycle low sat 77–84% below the prior peak,
        roughly a year after it — the two numbers Cowen keeps returning to.
      </>}>
        <DrawdownChart daily={cycles.daily} bears={cycles.bears} asOfDate={cycles.asOfDate} />
      </ChartCard>

      <ChartCard title="Monthly returns and seasonality" intro={<>
        Calendar returns by year. The bottom rows average each month across all years — the basis for
        the &ldquo;Q4 seasonality&rdquo; argument, and where the past mid-term-year lows show up.
      </>}>
        <MonthlyReturnsHeatmap data={cycles.monthlyReturns} />
      </ChartCard>
    </>
  );
}
