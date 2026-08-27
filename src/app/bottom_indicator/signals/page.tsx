import { buildGroups } from "../lib/insights";
import { summary } from "../lib/summary";
import { PageShell } from "../components/PageShell";
import { SectionHeading } from "../components/SectionHeading";
import { IndicatorGroups } from "../components/IndicatorGroups";

export const metadata = {
  title: "The signals · BTC Bottom & Top Indicator",
  description: "Every on-chain, miner and price signal behind the Bitcoin cycle score, ranked 0–100 against its own history.",
};

export default function SignalsPage() {
  const { rows, scored } = summary();
  const groups = buildGroups(rows);
  return (
    <PageShell
      eyebrow="Bitcoin · cycle valuation"
      title="The signals"
      intro={<>
        The {scored.length} two-sided signals that make up the headline score, plus the one-sided triggers,
        grouped by what they measure. Each is ranked against its own entire history: 0 = where past bottoms
        lived, 100 = where past tops lived.
      </>}
    >
      <SectionHeading title="All signals" aside="ranked 0 = historic bottom · 100 = historic top" />
      <IndicatorGroups groups={groups} />
    </PageShell>
  );
}
