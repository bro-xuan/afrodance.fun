"use client";

import { C, fixed, price } from "../lib/format";
import type { MacroData, MacroStat } from "../lib/types";
import { LineChart } from "./charts";
import { Panel, Skeleton } from "./ui";

function fmtValue(s: MacroStat, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "n/a";
  switch (s.unit) {
    case "pct": return `${v.toFixed(2)}%`;
    case "usdT": return `$${v.toFixed(2)}T`;
    case "usdB": return `$${v.toFixed(1)}B`;
    default: return v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toFixed(2);
  }
}

function fmtChange(s: MacroStat): string | null {
  if (s.change === null || s.change === undefined) return null;
  const c = s.change;
  const sign = c > 0 ? "+" : c < 0 ? "−" : "";
  const a = Math.abs(c);
  const base = s.value !== null && s.value - c !== 0 ? (c / (s.value - c)) * 100 : null;
  if (s.unit === "pct") return `${sign}${(a * 100).toFixed(0)}bp`;
  if (s.unit === "usdT") return `${sign}$${(a * 1000).toFixed(0)}B`;
  if (s.unit === "usdB") return `${sign}$${a.toFixed(1)}B`;
  return base !== null ? `${sign}${Math.abs(base).toFixed(1)}%` : null;
}

export function Macro({ m }: { m: MacroData | null }) {
  if (!m) return <Skeleton h="24rem" />;
  const o = m.options;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3" style={{ borderColor: C.line, background: C.line }}>
        {m.stats.map((s) => {
          const chg = fmtChange(s);
          return (
            <div key={s.key} className="flex flex-col gap-1.5 bg-white p-4" title={s.note}>
              <div className="flex items-center justify-between">
                <span className="mi-label">{s.label}</span>
                <span className="text-[0.8rem]" style={{ color: C.muted }}>{s.source}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="mi-num text-[1.45rem] font-semibold tracking-[-0.02em]">{fmtValue(s, s.value)}</span>
                {chg && (
                  <span className="mi-num text-[0.85rem]" style={{ color: C.ink2 }}>
                    {chg} <span style={{ color: C.muted }}>{s.changeLabel}</span>
                  </span>
                )}
              </div>
              {s.series.length > 2 && (
                <LineChart
                  data={s.series.slice(-90)}
                  height={44}
                  color={C.venues.binance}
                  fmt={(v) => fmtValue(s, v)}
                  fmtT={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                />
              )}
              <p className="text-[0.8rem] leading-snug" style={{ color: C.muted }}>{s.note}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 lg:col-span-3">
        <Panel title="Fear & Greed" aside="alternative.me">
          {m.fearGreed ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="mi-num text-[2.6rem] font-semibold leading-none tracking-[-0.04em]">{m.fearGreed.value}</span>
                <span className="text-[1rem] font-medium">{m.fearGreed.label}</span>
              </div>
              <div className="relative mt-3 h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${C.short}, #d9d8d2 50%, ${C.long})` }}>
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{ left: `${m.fearGreed.value}%`, background: C.ink }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[0.8rem]" style={{ color: C.muted }}>
                <span>Extreme fear</span>
                <span>Extreme greed</span>
              </div>
              <div className="mt-3">
                <LineChart data={m.fearGreed.series} height={48} color={C.ink2} refLine={50} fmt={(v) => v.toFixed(0)} fmtT={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              </div>
            </>
          ) : (
            <span style={{ color: C.muted }}>Unavailable</span>
          )}
        </Panel>

        <Panel title="Options positioning" aside="Deribit">
          <dl className="space-y-3 text-[0.9rem]">
            <div className="flex justify-between">
              <dt>Put / call OI</dt>
              <dd className="mi-num font-semibold">{fixed(o.putCallOi, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Next Friday expiry</dt>
              <dd className="mi-num">{o.nextExpiry ? new Date(o.nextExpiry).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "n/a"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Max pain</dt>
              <dd className="mi-num font-semibold">{price(o.nextExpiryMaxPain)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Expiring OI</dt>
              <dd className="mi-num">{o.nextExpiryOiBtc !== null ? `${o.nextExpiryOiBtc.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC` : "n/a"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: C.muted }}>
            P/C &lt; 0.7 = call-heavy (bullish bets). Max pain is the strike where option buyers lose most; spot tends to drift toward it into expiry.
          </p>
        </Panel>
      </div>
    </div>
  );
}
