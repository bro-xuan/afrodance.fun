"use client";

import { ExternalLink } from "lucide-react";
import { C, countdown, localDay, localTime, tzLabel } from "../lib/format";
import { useNow } from "../lib/hooks";
import type { FedData } from "../lib/types";
import { Empty, Panel, Skeleton } from "./ui";

const SRC = { fedwatch: C.venues.binance, polymarket: C.venues.okx };
const FEDWATCH_URL = "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html";

const pct0 = (p: number | null) => (p === null ? "n/a" : `${(p * 100).toFixed(0)}%`);
const range = (lo: number, hi: number) => `${lo.toFixed(2)}% to ${hi.toFixed(2)}%`;

function Odds({ p, color }: { p: number | null; color: string }) {
  return (
    <td className="py-1.5 pl-3 align-top">
      <div className="mi-num text-right">{pct0(p)}</div>
      <div className="mt-1 h-1.5 rounded-r-[4px]" style={{ width: `${(p ?? 0) * 100}%`, background: color }} />
    </td>
  );
}

function SourceHead({ label, color }: { label: string; color: string }) {
  return (
    <th className="w-[38%] pb-1.5 pl-3 text-right font-normal">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
    </th>
  );
}

export function FedWatch({ f }: { f: FedData | null }) {
  const now = useNow(1000);
  if (!f) return <Skeleton h="16rem" />;
  if (!f.meetings.length) return <Panel title="Fed rate odds" sources={f.sources}><Empty>No upcoming FOMC meetings listed.</Empty></Panel>;

  return (
    <Panel
      title="Fed rate odds, next three meetings"
      aside={f.targetLo !== null && f.targetHi !== null ? <>current target {range(f.targetLo, f.targetHi)}</> : null}
      sources={f.sources}
      footnote={
        <>
          FedWatch odds use CME&apos;s published method on live fed funds futures prices, so they track the{" "}
          <a href={FEDWATCH_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-4">
            CME FedWatch tool <ExternalLink size="0.85em" aria-hidden />
          </a>{" "}
          within a point or two. Both columns show the odds of each move at that one meeting. CME&apos;s own page shows the
          target range after it instead, which adds up all earlier meetings; that view is the &quot;futures see the target at&quot; line.
        </>
      }
    >
      <div className="grid gap-8 md:grid-cols-3">
        {f.meetings.map((m) => {
          const rows = m.moves.filter((x) => (x.fedwatch ?? 0) >= 0.01 || (x.polymarket ?? 0) >= 0.01);
          const score = (x: (typeof m.moves)[number]) => x.fedwatch ?? x.polymarket ?? 0;
          const top = m.moves.reduce((a, b) => (score(b) > score(a) ? b : a));
          const noData = m.moves.every((x) => x.fedwatch === null && x.polymarket === null);
          return (
            <div key={m.t} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[1.05rem] font-semibold">{localDay(m.t)}</div>
                <div className="mi-num text-[0.85rem]" style={{ color: C.accent }}>{countdown(m.t, now)}</div>
              </div>
              <div className="text-[0.8rem]" style={{ color: C.muted }}>
                Decision {localTime(m.t)} {tzLabel(m.t)}
              </div>

              <div className="mt-3 text-[0.9rem]" style={{ color: C.ink2 }}>Most likely: <span className="font-semibold" style={{ color: C.ink }}>{noData ? "n/a" : top.label.toLowerCase()}</span></div>
              <div className="mt-1 grid grid-cols-2 gap-3">
                {(["fedwatch", "polymarket"] as const).map((k) => (
                  <div key={k}>
                    <div className="mi-num text-[1.6rem] font-semibold leading-none">{pct0(top[k])}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[0.8rem]" style={{ color: C.muted }}>
                      <span className="inline-block size-2 rounded-full" style={{ background: SRC[k] }} />
                      {k === "fedwatch" ? "FedWatch" : "Polymarket"}
                    </div>
                  </div>
                ))}
              </div>
              {m.likelyTarget && (
                <div className="mt-2 text-[0.8rem]" style={{ color: C.muted }}>
                  Futures see the target at {range(m.likelyTarget.lo, m.likelyTarget.hi)} after this meeting ({pct0(m.likelyTarget.p)})
                </div>
              )}

              <table className="mt-4 w-full table-fixed text-[0.9rem]">
                <thead>
                  <tr className="mi-label">
                    <th className="pb-1.5 text-left font-normal">Outcome</th>
                    <SourceHead label="FedWatch" color={SRC.fedwatch} />
                    <SourceHead label="Polymkt" color={SRC.polymarket} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.key} className="border-t" style={{ borderColor: C.grid, fontWeight: x.key === top.key ? 600 : 400 }}>
                      <td className="py-1.5 align-top">{x.label}</td>
                      <Odds p={x.fedwatch} color={SRC.fedwatch} />
                      <Odds p={x.polymarket} color={SRC.polymarket} />
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex gap-4 text-[0.8rem]">
                <a href={FEDWATCH_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">CME FedWatch</a>
                {m.polySlug && (
                  <a href={`https://polymarket.com/event/${m.polySlug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Polymarket
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
