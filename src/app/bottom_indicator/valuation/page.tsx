import { cycles, scoreHistory, summary } from "../lib/summary";
import { PageShell } from "../components/PageShell";
import { SectionHeading } from "../components/SectionHeading";
import { ValuationCharts } from "../components/ValuationCharts";

export const metadata = {
  title: "Valuation · BTC Bottom & Top Indicator",
  description: "How cheap is Bitcoin? Logarithmic regression bands, 200-week SMA and support band, 2-year MA multiplier, and price color-coded by cycle score.",
};

export default function ValuationPage() {
  const { core } = summary();
  return (
    <PageShell
      eyebrow="Bitcoin · valuation"
      title="How cheap is Bitcoin?"
      intro={<>
        The price-level dimension: where today&apos;s price sits against the long-run regression trend,
        the moving-average floors every past bottom has tested, and the site&apos;s own cycle score
        painted onto price history.
      </>}
    >
      <SectionHeading title="Valuation charts" aside="price against its historical floors and ceilings · hover for values" />
      {cycles.cycles?.length > 0
        ? <ValuationCharts cycles={cycles} scoreHistory={scoreHistory} totalSignals={core.length} />
        : <div className="py-10 text-center text-xl font-semibold text-[#6b7893]">No data yet</div>}
    </PageShell>
  );
}
