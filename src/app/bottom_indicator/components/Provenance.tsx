import { fmtDate, summary } from "../lib/summary";

export function Provenance() {
  const { asOf } = summary();
  return (
    <footer className="mt-8 flex flex-col gap-1.5 text-xs text-[#8695ac]">
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
  );
}
