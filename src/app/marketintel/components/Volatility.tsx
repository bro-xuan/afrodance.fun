"use client";

import { C, localDay } from "../lib/format";
import type { volRegime } from "../lib/signals";
import type { VolData } from "../lib/types";
import { LineChart } from "./charts";
import { Empty, Panel, Skeleton, Stat } from "./ui";

const pts = (v: number | null, digits = 1) => (v === null ? "n/a" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`);
const fmtDays = (d: number) => (d < 1.5 ? `${Math.round(d * 24)}h` : `${Math.round(d)}d`);
// Charts plot against √days so the busy front end isn't crushed against the axis.
const fmtRootDays = (r: number) => fmtDays(r * r);

export function Volatility({ v, regime }: { v: VolData | null; regime: ReturnType<typeof volRegime> }) {
  if (!v) return <Skeleton h="24rem" />;
  const ex = v.expiries;
  const iv = ex.filter((e) => e.atmIv !== null).map((e) => ({ t: Math.sqrt(e.days), v: e.atmIv! }));
  const basis = ex.filter((e) => e.basisAnn !== null && e.days >= 2).map((e) => ({ t: Math.sqrt(e.days), v: e.basisAnn! }));

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel className="lg:col-span-5" title="Implied vs realized" aside="Deribit, Binance">
        <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-5">
          <Stat label="DVOL, 30d implied" value={v.dvol?.toFixed(1) ?? "n/a"} sub={regime.dvolChg !== null ? `${pts(regime.dvolChg)} pts in 24h` : undefined} />
          <Stat
            label="IV minus RV30"
            value={regime.premium !== null ? pts(regime.premium) : "n/a"}
            valueColor={regime.premium === null ? undefined : regime.premium < -3 ? C.longInk : regime.premium > 8 ? C.shortInk : undefined}
            sub="vol points"
          />
          <Stat label="Realized 7d" value={regime.rv7?.toFixed(1) ?? "n/a"} sub="annualised" />
          <Stat label="Realized 30d" value={regime.rv30?.toFixed(1) ?? "n/a"} sub="annualised" />
        </div>
        <div className="mb-1 text-[0.85rem] font-medium" style={{ color: C.ink2 }}>ATM implied vol by days to expiry (√ scale)</div>
        {iv.length > 2 ? (
          <LineChart data={iv} height={150} axis color={C.venues.okx} fmt={(x) => `${x.toFixed(0)}%`} fmtT={fmtRootDays} />
        ) : (
          <Empty>Term structure unavailable</Empty>
        )}
        <p className="mt-3 text-[0.85rem] leading-relaxed" style={{ color: C.muted }}>
          Implied vol normally sits a few points above realized: option sellers get paid for the risk. IV below RV means options
          are cheap. A curve that slopes down (front over back) means the market is pricing an event soon.
        </p>
      </Panel>

      <Panel
        className="lg:col-span-7"
        title="Term structure"
        aside={`${ex.length} expiries`}
        sources={v.sources}
        footnote="25Δ RR = implied vol of the 25-delta call minus the 25-delta put: positive means upside is bid, negative means people pay for crash protection. 25Δ fly = average wing vol over ATM: high means tails are expensive. Basis = dated future over the index, annualised. Deltas recomputed from Deribit mark IV."
      >
        {ex.length ? (
          <>
            {basis.length > 2 && (
              <div className="mb-4">
                <div className="mb-1 text-[0.85rem] font-medium" style={{ color: C.ink2 }}>Futures basis, annualised, by days to expiry (√ scale)</div>
                <LineChart data={basis} height={110} axis color={C.venues.binance} fmt={(x) => `${x.toFixed(1)}%`} fmtT={fmtRootDays} />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[0.9rem]">
                <thead>
                  <tr className="mi-label">
                    <th className="pb-2 text-left font-normal">Expiry</th>
                    <th className="pb-2 text-right font-normal">Days</th>
                    <th className="pb-2 text-right font-normal">ATM IV</th>
                    <th className="pb-2 text-right font-normal">25Δ RR</th>
                    <th className="pb-2 text-right font-normal">25Δ fly</th>
                    <th className="pb-2 text-right font-normal">Basis</th>
                    <th className="pb-2 text-right font-normal">Options OI</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.map((e) => (
                    <tr key={e.code} className="border-t" style={{ borderColor: C.grid }}>
                      <td className="py-1.5">{localDay(e.t)}</td>
                      <td className="mi-num py-1.5 text-right" style={{ color: C.muted }}>{fmtDays(e.days)}</td>
                      <td className="mi-num py-1.5 text-right font-semibold">{e.atmIv !== null ? `${e.atmIv.toFixed(1)}%` : "n/a"}</td>
                      <td className="mi-num py-1.5 text-right" style={{ color: e.rr25 === null ? C.muted : e.rr25 >= 0 ? C.longInk : C.shortInk }}>{pts(e.rr25)}</td>
                      <td className="mi-num py-1.5 text-right" style={{ color: C.ink2 }}>{pts(e.fly25)}</td>
                      <td className="mi-num py-1.5 text-right" style={{ color: C.ink2 }}>{e.basisAnn !== null ? `${e.basisAnn.toFixed(1)}%` : "n/a"}</td>
                      <td className="mi-num py-1.5 text-right" style={{ color: C.ink2 }}>
                        {e.oiBtc ? `${e.oiBtc.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC` : "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty>Deribit unavailable</Empty>
        )}
      </Panel>
    </div>
  );
}
