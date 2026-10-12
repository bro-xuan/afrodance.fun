"use client";

import { C, fixed, pct, price, usd } from "../lib/format";
import { leverageContext, ordinal } from "../lib/quant";
import { OI_VENUES, oiChange } from "../lib/signals";
import type { DerivativesData, RatioPoint } from "../lib/types";
import { LineChart } from "./charts";
import { Empty, Panel, Skeleton, SplitBar, Stat } from "./ui";

const RATIO_ROWS: { key: keyof Omit<RatioPoint, "t">; label: string; sub: string }[] = [
  { key: "binanceAccounts", label: "Binance, all accounts", sub: "counts traders, not dollars" },
  { key: "binanceTop", label: "Binance, top traders", sub: "top 20% of accounts, weighted by position size" },
  { key: "bybitAccounts", label: "Bybit, all accounts", sub: "counts traders, not dollars" },
  { key: "okxAccounts", label: "OKX, all accounts", sub: "counts traders, not dollars" },
  { key: "binanceTaker", label: "Binance, taker flow last hour", sub: "market buys vs market sells, by volume" },
];

export function Positioning({ d }: { d: DerivativesData | null }) {
  if (!d) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton h="26rem" />
        <Skeleton h="26rem" />
        <Skeleton h="26rem" />
      </div>
    );
  }

  const ctx = leverageContext(d);
  const windows = ([1, 4, 24] as const).map((h) => ({ h, c: oiChange(d.oiHistory, h) }));
  const day = windows[2].c;
  const maxOi = Math.max(...d.venues.map((v) => v.oiUsd), 1);
  const histTotal = d.oiHistory
    .filter((p) => OI_VENUES.every((v) => p[v] !== null))
    .map((p) => ({ t: p.t, v: OI_VENUES.reduce((s, v) => s + p[v]!, 0) }));
  const histPrice = d.oiHistory.filter((p) => p.price !== null).map((p) => ({ t: p.t, v: p.price! }));
  const ratioSources = d.sources.filter((s) => /-ls|taker/.test(s.source));
  const venueSources = d.sources.filter((s) => !/hist|klines|-ls|taker|spot/.test(s.source));

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Open interest by venue */}
      <Panel
        className="lg:col-span-5"
        title="Aggregate open interest"
        aside={<>{d.venues.length} markets, every 30s</>}
        sources={venueSources}
        footnote="USD value of open BTC perpetual and futures positions, read live from each exchange's public API. CME isn't included (no free real time feed)."
      >
        <div className="mb-5 flex flex-wrap gap-x-10 gap-y-3">
          <Stat label="Total OI" value={usd(d.totalOiUsd, 2)} />
          <Stat
            label="24h change in BTC"
            value={pct(day?.total, 2)}
            valueColor={day ? (day.total >= 0 ? C.longInk : C.shortInk) : undefined}
            sub={day ? `${day.btc >= 0 ? "+" : "−"}${Math.abs(day.btc).toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC on Binance, Bybit, OKX` : undefined}
          />
          <Stat
            label="OI vs last 30 days"
            value={ctx.oiPct === null ? "n/a" : `${ordinal(ctx.oiPct)} pct.`}
            sub={ctx.oiPct === null ? "Binance, in BTC" : ctx.oiPct >= 0.9 ? "Binance, in BTC. Near the month's high: crowded" : ctx.oiPct <= 0.1 ? "Binance, in BTC. Near the month's low: flushed" : "Binance, in BTC"}
          />
        </div>
        <ul className="space-y-2.5">
          {d.venues.map((v) => (
            <li key={v.exchange + v.market} className="grid grid-cols-[minmax(0,9.5rem)_1fr_4.5rem] items-center gap-3 text-[0.9rem]">
              <div className="truncate">
                <span className="font-semibold">{v.exchange}</span>{" "}
                <span className="text-[0.8rem]" style={{ color: C.muted }}>{v.market}</span>
              </div>
              <div className="h-3 rounded-r-[4px]" style={{ width: `${(v.oiUsd / maxOi) * 100}%`, background: C.venues.binance, minWidth: 2 }} />
              <div className="mi-num text-right">{usd(v.oiUsd, 2)}</div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* OI + price small multiples */}
      <Panel className="lg:col-span-7" title="Open interest vs price, 48h" aside="hourly, BTCUSDT perps" sources={d.sources.filter((s) => /hist|klines/.test(s.source))}>
        {histTotal.length > 2 ? (
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[0.85rem] font-medium" style={{ color: C.ink2 }}>Open interest in BTC, Binance + Bybit + OKX</div>
              <LineChart data={histTotal} height={150} axis color={C.venues.binance} fmt={(v) => `${(v / 1000).toFixed(1)}K`} />
            </div>
            <div>
              <div className="mb-1 text-[0.85rem] font-medium" style={{ color: C.ink2 }}>BTCUSDT price</div>
              <LineChart data={histPrice} height={150} axis color={C.ink} fmt={(v) => price(v)} />
            </div>
            <table className="w-full text-[0.9rem]">
              <thead>
                <tr className="mi-label text-left">
                  <th className="pb-1.5 font-normal">OI change in BTC</th>
                  {windows.map((w) => (
                    <th key={w.h} className="pb-1.5 text-right font-normal">{w.h}h</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...OI_VENUES, "total", "price"].map((k) => (
                  <tr key={k} className="border-t" style={{ borderColor: C.grid, fontWeight: k === "total" ? 600 : 400 }}>
                    <td className="py-1.5 capitalize">{k === "okx" ? "OKX" : k === "total" ? "All three" : k}</td>
                    {windows.map(({ h, c }) => {
                      const v = !c ? null : k === "total" ? c.total : k === "price" ? c.price : c.venues[k as (typeof OI_VENUES)[number]];
                      return (
                        <td key={h} className="mi-num py-1.5 text-right" style={{ color: v === null ? C.muted : v >= 0 ? C.longInk : C.shortInk }}>
                          {pct(v, 2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: C.muted }}>
              Measured in coins so price moves don&apos;t inflate it. Price up with OI up means new leverage is chasing. Price up
              with OI down is shorts covering. Price down with OI up is shorts adding. Both down is longs getting flushed.
            </p>
          </div>
        ) : (
          <Empty>History unavailable</Empty>
        )}
      </Panel>

      {/* Funding */}
      <Panel
        className="lg:col-span-5"
        title="Funding rates"
        aside="per 8h, and annualised"
        footnote="Positive = longs pay shorts. Hyperliquid funds hourly (shown ×8). Sustained > 0.03%/8h has marked crowded-long tops."
      >
        <div className="mb-4">
          <Stat
            label="OI-weighted average"
            value={d.weightedFunding8h != null ? pct(d.weightedFunding8h * 100, 4) : "n/a"}
            sub={d.weightedFunding8h != null ? `${pct(d.weightedFunding8h * 3 * 365 * 100, 2)} annualised` : undefined}
          />
          {ctx.fundingPct !== null && (
            <div className="mt-1 text-[0.85rem]" style={{ color: C.ink2 }}>
              Binance funding is at the <span className="mi-num font-semibold">{ordinal(ctx.fundingPct)}</span> percentile of the last 90 days.
            </div>
          )}
        </div>
        <table className="w-full text-[0.9rem]">
          <thead>
            <tr className="mi-label text-left">
              <th className="pb-2 font-normal">Venue</th>
              <th className="pb-2 text-right font-normal">8h</th>
              <th className="pb-2 text-right font-normal">APR</th>
            </tr>
          </thead>
          <tbody>
            {d.venues
              .filter((v) => v.fundingRate8h !== null)
              .map((v) => (
                <tr key={v.exchange + v.market} className="border-t" style={{ borderColor: C.grid }}>
                  <td className="py-1.5">
                    {v.exchange} <span className="text-[0.8rem]" style={{ color: C.muted }}>{v.market}</span>
                  </td>
                  <td className="mi-num py-1.5 text-right" style={{ color: v.fundingRate8h! >= 0 ? C.longInk : C.shortInk }}>
                    {pct(v.fundingRate8h! * 100, 4)}
                  </td>
                  <td className="mi-num py-1.5 text-right" style={{ color: C.ink2 }}>{pct(v.fundingRate8h! * 3 * 365 * 100, 1)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Panel>

      {/* Long / short board */}
      <Panel
        className="lg:col-span-7"
        title="Who is long"
        aside="latest hour, 48h trend"
        sources={ratioSources}
        footnote="A ratio of 1.45 means 1.45 long accounts for every short one, so 59% of accounts are long. Retail leans long most of the time, so only extremes matter: above 2.0 (67% long) is crowded, below 0.9 (47% long) is unusually bearish. Hyperliquid doesn't publish this data."
      >
        <ul className="divide-y" style={{ borderColor: C.grid }}>
          {RATIO_ROWS.map((row) => {
            const s = d.ratios.filter((r) => r[row.key] !== null).map((r) => ({ t: r.t, v: r[row.key] as number }));
            const last = s.at(-1)?.v ?? null;
            return (
              <li key={row.key} className="grid grid-cols-1 items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,13rem)_5.5rem_minmax(0,1fr)_7rem]" style={{ borderColor: C.grid }}>
                <div>
                  <div className="text-[0.9rem] font-semibold">{row.label}</div>
                  <div className="text-[0.8rem]" style={{ color: C.muted }}>{row.sub}</div>
                </div>
                <div>
                  <div className="mi-num text-[1.15rem] font-semibold leading-tight">
                    {last !== null ? `${((last / (1 + last)) * 100).toFixed(0)}%` : "n/a"}
                  </div>
                  <div className="mi-num text-[0.8rem]" style={{ color: C.muted }}>ratio {fixed(last, 2)}</div>
                </div>
                <div>{last !== null ? <SplitBar long={last / (1 + last)} /> : <span style={{ color: C.muted }}>n/a</span>}</div>
                <div>{s.length > 2 && <LineChart data={s} height={34} color={C.ink2} area={false} fmt={(v) => v.toFixed(2)} />}</div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
