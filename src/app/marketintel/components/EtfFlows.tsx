"use client";

import { C, flowM, price, tone } from "../lib/format";
import type { EtfData } from "../lib/types";
import { BarsWithPrice } from "./charts";
import { Empty, Panel, Skeleton, Stat } from "./ui";

const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const sumDays = (e: EtfData, n: number) => e.days.slice(-n).reduce((s, d) => s + (d.total ?? 0), 0);

export function EtfFlows({ e }: { e: EtfData | null }) {
  if (!e) {
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8"><Skeleton h="20rem" /></div>
        <div className="lg:col-span-4"><Skeleton h="20rem" /></div>
      </div>
    );
  }
  if (!e.days.length) return <Panel title="US spot BTC ETF flows" sources={e.sources}><Empty>Farside unavailable</Empty></Panel>;

  // Farside lists today's row before every fund has reported; skip empty totals.
  const days = e.days.filter((d) => d.total !== null);
  const recent = days.slice(-30);
  const last = days[days.length - 1];
  const movers = Object.entries(last.funds)
    .filter(([, v]) => v !== null && v !== 0)
    .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))
    .slice(0, 7);
  const maxMove = Math.max(1, ...movers.map(([, v]) => Math.abs(v!)));

  // Longest same-sign streak ending at the latest day.
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && Math.sign(days[i].total!) === Math.sign(last.total!); i--) streak++;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        className="lg:col-span-8"
        title="Daily net flows vs BTC price, last 30 sessions"
        aside={<>US$ millions, {e.stale ? "cached copy, Farside unreachable" : "source farside.co.uk/btc"}</>}
        sources={e.sources}
        footnote="Top: BTC daily close (UTC, Binance). Bottom: net creations minus redemptions across all US spot bitcoin ETFs, in US$ millions. Farside publishes after each fund reports (evening ET); the newest day can be partial."
      >
        <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-[0.85rem]" style={{ color: C.ink2 }}>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: C.ink }} />BTC price</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm" style={{ background: C.long }} />Inflow</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm" style={{ background: C.short }} />Outflow</span>
        </div>
        <BarsWithPrice
          items={recent.map((d) => ({ key: d.date, label: fmtDate(d.date), v: d.total ?? 0, price: e.prices?.[d.date] ?? null }))}
          fmt={(v) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}`}
          fmtPrice={(v) => `${(v / 1000).toFixed(0)}K`}
          renderTip={(i) => {
            const d = recent[i];
            const top = Object.entries(d.funds)
              .filter(([, v]) => v)
              .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))
              .slice(0, 4);
            return (
              <>
                <div style={{ color: C.muted }}>{fmtDate(d.date)}</div>
                <div className="mi-num text-base font-semibold" style={{ color: tone(d.total) }}>{flowM(d.total)}</div>
                {e.prices?.[d.date] != null && <div className="mi-num mb-1" style={{ color: C.ink2 }}>BTC close {price(e.prices[d.date])}</div>}
                {top.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span>{k}</span>
                    <span className="mi-num">{flowM(v)}</span>
                  </div>
                ))}
              </>
            );
          }}
        />
      </Panel>

      <Panel className="lg:col-span-4" title={`Latest session, ${fmtDate(last.date)}`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat label="Day" value={flowM(last.total)} valueColor={tone(last.total)} sub={`${streak}-day ${last.total! >= 0 ? "inflow" : "outflow"} streak`} />
          <Stat label="5 sessions" value={flowM(sumDays({ ...e, days }, 5))} valueColor={tone(sumDays({ ...e, days }, 5))} />
          <Stat label="20 sessions" value={flowM(sumDays({ ...e, days }, 20))} valueColor={tone(sumDays({ ...e, days }, 20))} />
          <Stat label="Since launch" value={e.cumulative !== null ? `$${(e.cumulative / 1000).toFixed(1)}B` : "n/a"} sub="cumulative net" />
        </div>
        <div className="mt-5 border-t pt-4" style={{ borderColor: C.grid }}>
          <div className="mi-label mb-2">By fund</div>
          {movers.length ? (
            <ul className="space-y-1.5">
              {movers.map(([k, v]) => (
                <li key={k} className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-2 text-[0.9rem]">
                  <span className="font-semibold">{k}</span>
                  <span className={`flex ${v! < 0 ? "justify-end" : ""}`}>
                    <span
                      className="h-2.5"
                      style={{
                        width: `${(Math.abs(v!) / maxMove) * 100}%`,
                        background: v! >= 0 ? C.long : C.short,
                        borderRadius: v! >= 0 ? "0 4px 4px 0" : "4px 0 0 4px",
                      }}
                    />
                  </span>
                  <span className="mi-num text-right" style={{ color: tone(v) }}>{flowM(v)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[0.9rem]" style={{ color: C.muted }}>No fund moved.</div>
          )}
        </div>
      </Panel>

    </div>
  );
}
