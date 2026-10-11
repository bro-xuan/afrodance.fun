"use client";

import { C, countdown, localDay, localTime, tzLabel } from "../lib/format";
import { useNow } from "../lib/hooks";
import type { EventsData, MarketEvent } from "../lib/types";
import { Empty, Panel, Skeleton } from "./ui";

const CAT: Record<MarketEvent["category"], string> = {
  fed: "Fed",
  inflation: "Inflation",
  jobs: "Labour",
  growth: "Growth",
  earnings: "Earnings",
  crypto: "Crypto",
  other: "Macro",
};

const WHY: Partial<Record<MarketEvent["category"], string>> = {
  fed: "Rate path → dollar & liquidity → BTC",
  inflation: "Hot print = fewer cuts = BTC headwind",
  jobs: "Weak jobs = more cuts priced; strong = fewer",
  earnings: "AI/tech risk appetite spills into BTC",
  crypto: "Dealer hedging can pin price into expiry",
};

const dayKey = localDay;

function ImpactTag({ impact }: { impact: MarketEvent["impact"] }) {
  const s = impact === "high" ? { bg: C.ink, fg: "#fff", t: "HIGH" } : { bg: "#f1f0ec", fg: C.ink2, t: "MED" };
  return (
    <span className="mi-num inline-block rounded px-1.5 py-0.5 text-[0.8rem] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.t}
    </span>
  );
}

export function Calendar({ ev }: { ev: EventsData | null }) {
  const now = useNow(1000);
  if (!ev) return <Skeleton h="22rem" />;

  const upcoming = ev.events.filter((e) => e.t > now - 2 * 3_600_000);
  const next = upcoming.find((e) => e.impact === "high" && e.t > now);
  const groups = new Map<string, MarketEvent[]>();
  for (const e of upcoming) {
    const k = dayKey(e.t);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel className="lg:col-span-4" title="Next high-impact event">
        {next ? (
          <div>
            <div className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">{next.title}</div>
            <div className="mt-1 text-[0.9rem]" style={{ color: C.muted }}>
              {dayKey(next.t)}, {localTime(next.t)} {tzLabel(next.t)}{next.estimated && ". Date estimated"}
            </div>
            <div className="mi-num mt-5 text-[2.6rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: C.accent }}>
              {countdown(next.t, now).replace(/^in /, "")}
            </div>
            {(next.forecast || next.previous) && (
              <div className="mt-4 flex gap-6 text-[0.9rem]">
                {next.forecast && <span>Forecast <b className="mi-num">{next.forecast}</b></span>}
                {next.previous && <span style={{ color: C.muted }}>Prior <span className="mi-num">{next.previous}</span></span>}
              </div>
            )}
            {(next.note || WHY[next.category]) && (
              <p className="mt-4 text-[0.9rem] leading-relaxed" style={{ color: C.ink2 }}>{next.note ?? WHY[next.category]}</p>
            )}
          </div>
        ) : (
          <Empty>No high-impact events scheduled.</Empty>
        )}
      </Panel>

      <Panel
        className="lg:col-span-8"
        title="Catalyst calendar"
        aside={`times in your time zone (${tzLabel(now)})`}
        sources={ev.sources}
        footnote="Forecast is the economists' consensus; Prior is the last release. A print far from forecast is what moves markets. FOMC, CPI, payrolls and PCE dates come from the Fed, BLS and BEA schedules; this week's full USD calendar from ForexFactory; options expiries from the Deribit and CME schedule. NVIDIA's date is estimated until confirmed."
      >
        {groups.size ? (
          <div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
            <div className="mi-label hidden grid-cols-[4.5rem_3.2rem_1fr_5.5rem_5.5rem_6.5rem] gap-x-3 sm:grid">
              <span>Time</span>
              <span>Impact</span>
              <span>Event</span>
              <span className="text-right">Forecast</span>
              <span className="text-right">Prior</span>
              <span className="text-right">Countdown</span>
            </div>
            {[...groups.entries()].map(([day, list]) => (
              <div key={day}>
                <div className="mi-label sticky top-0 bg-white pb-1">{day}</div>
                <ul>
                  {list.map((e) => (
                    <li
                      key={e.id}
                      className="grid grid-cols-[4.5rem_3.2rem_1fr] items-baseline gap-x-3 gap-y-0.5 border-t py-2 sm:grid-cols-[4.5rem_3.2rem_1fr_5.5rem_5.5rem_6.5rem]"
                      style={{ borderColor: C.grid, opacity: e.t < now ? 0.55 : 1 }}
                    >
                      <span className="mi-num text-[0.9rem]">{localTime(e.t)}</span>
                      <ImpactTag impact={e.impact} />
                      <span className="text-[0.95rem]">
                        <span className="font-semibold">{e.title}</span>{" "}
                        <span className="text-[0.8rem]" style={{ color: C.muted }}>
                          {CAT[e.category]}
                          {e.estimated && ", est."}
                        </span>
                      </span>
                      <span className="mi-num col-start-3 text-[0.85rem] font-semibold sm:col-start-auto sm:text-right">
                        {e.forecast && <span className="sm:hidden" style={{ color: C.muted }}>Forecast </span>}
                        {e.forecast ?? ""}
                      </span>
                      <span className="mi-num col-start-3 text-[0.85rem] sm:col-start-auto sm:text-right" style={{ color: C.muted }}>
                        {e.previous && <span className="sm:hidden">Prior </span>}
                        {e.previous ?? ""}
                      </span>
                      <span className="mi-num col-start-3 text-[0.85rem] sm:col-start-auto sm:text-right" style={{ color: e.t - now < 86_400_000 && e.t > now ? C.accent : C.muted }}>
                        {countdown(e.t, now)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No upcoming events.</Empty>
        )}
      </Panel>
    </div>
  );
}
