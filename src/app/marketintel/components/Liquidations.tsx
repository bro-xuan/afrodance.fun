"use client";

import { C, price, usd } from "../lib/format";
import { liqMagnet } from "../lib/signals";
import type { LiquidationData } from "../lib/types";
import { LiqMapChart } from "./LiqMapChart";
import { Empty, Panel, Skeleton, Stat } from "./ui";

export function Liquidations({ l, spot }: { l: LiquidationData | null; spot: number | null }) {
  const mag = liqMagnet(l);
  const px = spot ?? l?.price ?? null;

  return (
    <Panel
      title="Liquidation map, estimated"
      aside={l ? <>±15% of spot, ${l.binSize} bins, last {l.windowHours}h of positions</> : null}
      sources={l?.sources}
      footnote={
        <>
          Model, not exchange data: reconstructs where leveraged positions opened from Binance 15-min OI changes, splits
          long/short by Binance top-trader positioning, spreads them over a 5× to 100× leverage mix, drops any cohort a later wick
          already liquidated, then scales to all venue OI (×{l?.scale.toFixed(2) ?? "n/a"}). Tall bars are levels where forced
          orders would cascade, and price often gets pulled toward them.
        </>
      }
    >
      {!l ? (
        <Skeleton h="19rem" />
      ) : l.bins.length && px ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.85rem]">
            <Legend color={C.long} label="Long liquidations (below spot)" />
            <Legend color={C.short} label="Short liquidations (above spot)" />
          </div>
          <LiqMapChart bins={l.bins} spot={px} binSize={l.binSize} height={380} />
          {mag && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4" style={{ borderColor: C.grid }}>
              <Stat label="Shorts at risk within +5%" value={usd(mag.above, 2)} />
              <Stat label="Densest above" value={price(mag.peakAbove.price)} sub={`+${((mag.peakAbove.price / px - 1) * 100).toFixed(1)}%`} />
              <Stat label="Longs at risk within −5%" value={usd(mag.below, 2)} />
              <Stat label="Densest below" value={price(mag.peakBelow.price)} sub={`${((mag.peakBelow.price / px - 1) * 100).toFixed(1)}%`} />
            </div>
          )}
        </>
      ) : (
        <Empty>Liquidation model unavailable: Binance history couldn&apos;t be reached.</Empty>
      )}
    </Panel>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: C.ink2 }}>
      <span className="inline-block size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
