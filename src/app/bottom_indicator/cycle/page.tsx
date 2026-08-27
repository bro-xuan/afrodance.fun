import { cycles } from "../lib/summary";
import { PageShell } from "../components/PageShell";
import { SectionHeading } from "../components/SectionHeading";
import { CycleTimingCharts } from "../components/CycleTimingCharts";

export const metadata = {
  title: "Cycle timing · BTC Bottom & Top Indicator",
  description: "Where Bitcoin sits in the 4-year cycle: cycle overlay from each bear-market low, drawdown from ATH, and monthly seasonality.",
};

export default function CyclePage() {
  return (
    <PageShell
      eyebrow="Bitcoin · cycle timing"
      title="Where are we in the cycle?"
      intro={<>
        The time dimension: how far this cycle has run against the last three, how deep the drawdown is
        compared with past bear-market floors, and which months have historically carried the lows.
      </>}
    >
      <SectionHeading title="Timing charts" aside="this cycle against the last three · hover for values" />
      {cycles.cycles?.length > 0
        ? <CycleTimingCharts cycles={cycles} />
        : <div className="py-10 text-center text-xl font-semibold text-[#6b7893]">No data yet</div>}
    </PageShell>
  );
}
