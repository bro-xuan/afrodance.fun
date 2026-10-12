"use client";

import { useMemo, useState } from "react";
import { checkTrade, HORIZON_DAYS, type PlanLevel, type Side } from "../lib/bias";
import { C, countdown, localDay, localTime, pct, price } from "../lib/format";
import type { Level } from "../lib/quant";
import { HORIZONS, type Horizon, type Signal } from "../lib/signals";
import type { MarketEvent } from "../lib/types";
import { Panel, Skeleton } from "./ui";

const TONE = {
  for: { fg: C.longInk, bg: "#e6f5f0" },
  against: { fg: C.shortInk, bg: "#fcebea" },
  neutral: { fg: C.ink2, bg: "#f1f0ec" },
};

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: C.line }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="px-3 py-1.5 text-[0.9rem] font-medium"
          style={value === o.key ? { background: C.ink, color: "#fff" } : { color: C.ink2 }}
          aria-pressed={value === o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BiasCheck({ signals, levels, spot, dvol, events, now }: {
  signals: Signal[];
  levels: Level[];
  spot: number | null;
  dvol: number | null;
  events: MarketEvent[];
  now: number;
}) {
  const [side, setSide] = useState<Side>("long");
  const [horizon, setHorizon] = useState<Horizon>("swing");
  const [entryText, setEntryText] = useState("");
  const typed = Number(entryText.replace(/[^\d.]/g, ""));
  // Blank or nonsense entry = market price; a typed entry far from spot is a typo, not a plan.
  const entry = typed > 0 && spot && Math.abs(typed / spot - 1) < 0.5 ? typed : spot;

  // `now` ticks every few seconds; catalysts only need the minute.
  const minute = Math.floor(now / 60_000) * 60_000;
  const r = useMemo(
    () => (entry ? checkTrade({ side, horizon, entry, signals, levels, dvol, events, now: minute }) : null),
    [side, horizon, entry, signals, levels, dvol, events, minute],
  );
  if (!r || !entry || !signals.length) return <Skeleton h="22rem" />;

  const tone = TONE[r.tone];
  const days = HORIZON_DAYS[horizon];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Toggle label="Side" value={side} onChange={setSide} options={[{ key: "long", label: "Long" }, { key: "short", label: "Short" }]} />
        <Toggle label="Horizon" value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ key: h.key, label: h.label }))} />
        <label className="flex items-center gap-2 text-[0.9rem]" style={{ color: C.ink2 }}>
          Entry
          <input
            inputMode="decimal"
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            placeholder={`${price(spot)} (market)`}
            className="mi-num w-[11rem] rounded-md border bg-white px-2.5 py-1.5 text-[0.9rem]"
            style={{ borderColor: C.line }}
          />
        </label>
        {entryText && entry === spot && <span className="text-[0.8rem]" style={{ color: C.shortInk }}>More than 50% from spot, using market price</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-5" title="Does the pulse agree?">
          <div className="rounded-lg px-4 py-3" style={{ background: tone.bg }}>
            <div className="flex items-baseline gap-3">
              <span className="mi-num text-[2rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: tone.fg }}>
                {r.aligned === null ? "n/a" : `${r.aligned > 0 ? "+" : r.aligned < 0 ? "−" : ""}${Math.abs(r.aligned).toFixed(0)}`}
              </span>
              <span className="text-[1.05rem] font-semibold" style={{ color: tone.fg }}>{r.verdict}</span>
            </div>
            <div className="mt-1 text-[0.85rem]" style={{ color: C.ink2 }}>
              {HORIZONS.find((h) => h.key === horizon)!.label} bias in your direction, {r.reads} reads
              {r.agree !== null && <>, {(r.agree * 100).toFixed(0)}% agree{r.agree < 0.65 ? " (low conviction)" : ""}</>}.
            </div>
          </div>
          <Evidence title="For your trade" color={C.longInk} reads={r.pro} empty="Nothing backs it right now." />
          <Evidence title="Against it" color={C.shortInk} reads={r.con} empty="Nothing argues against it right now." />
        </Panel>

        <Panel
          className="lg:col-span-7"
          title="Trade plan from the levels"
          footnote={
            <>
              Stop sits just beyond the nearest chart level against you (levels get swept), skipping anything within a quarter of
              the horizon&apos;s 1σ move ({r.sigma ? price(r.sigma) : "n/a"}). Targets are the next levels in your favour. Odds are
              from DVOL for a driftless market over {days === 1 ? "1 day" : `${days} days`}: they price distance, not direction,
              so read them next to the verdict. Not financial advice.
            </>
          }
        >
          <table className="w-full text-[0.9rem]">
            <tbody>
              <PlanRow name="Entry" level={{ label: entryText ? "Your entry" : "Market", price: entry, dist: 0 }} />
              {r.stop && <PlanRow name="Stop" level={r.stop} color={C.shortInk} />}
              {r.targets.map((t, i) => <PlanRow key={t.label} name={`Target ${i + 1}`} level={t} color={C.longInk} />)}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4" style={{ borderColor: C.line, background: C.line }}>
            <Cell label="Reward : risk" value={r.rr === null ? "n/a" : `${r.rr.toFixed(1)}R`} sub="to target 1" />
            <Cell label="Breakeven" value={r.breakeven === null ? "n/a" : `${(r.breakeven * 100).toFixed(0)}%`} sub="win rate needed" />
            <Cell label="Target 1 touched" value={r.pTarget === null ? "n/a" : `${(r.pTarget * 100).toFixed(0)}%`} sub={`within ${days === 1 ? "1 day" : `${days} days`}`} />
            <Cell label="Stop touched" value={r.pStop === null ? "n/a" : `${(r.pStop * 100).toFixed(0)}%`} sub={`within ${days === 1 ? "1 day" : `${days} days`}`} />
          </div>

          {r.warnings.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-lg px-4 py-3 text-[0.85rem] leading-snug" style={{ background: "#fff6e5", color: "#7a4b00" }}>
              {r.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
            </ul>
          )}

          <div className="mt-4">
            <div className="mi-label mb-2">Catalysts inside the window</div>
            {r.catalysts.length ? (
              <ul className="space-y-1 text-[0.9rem]">
                {r.catalysts.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">{e.title}</span>
                    <span className="mi-num text-[0.85rem]" style={{ color: C.muted }}>
                      {localDay(e.t)} {localTime(e.t)}, {countdown(e.t, now)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[0.9rem]" style={{ color: C.muted }}>No high-impact events before the horizon ends.</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Evidence({ title, color, reads, empty }: { title: string; color: string; reads: Signal[]; empty: string }) {
  return (
    <div className="mt-4">
      <div className="mi-label mb-2" style={{ color }}>{title}</div>
      {reads.length ? (
        <ul className="space-y-2">
          {reads.slice(0, 4).map((s) => (
            <li key={s.key} className="text-[0.85rem] leading-snug">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium" style={{ color: C.ink }}>{s.label}</span>
                <span className="mi-num shrink-0" style={{ color }}>{s.value}</span>
              </div>
              <div style={{ color: C.ink2 }}>{s.read}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[0.85rem]" style={{ color: C.muted }}>{empty}</div>
      )}
    </div>
  );
}

function PlanRow({ name, level, color }: { name: string; level: PlanLevel; color?: string }) {
  return (
    <tr className="border-b" style={{ borderColor: C.line }}>
      <td className="whitespace-nowrap py-2 pr-3 font-medium" style={{ color: color ?? C.ink }}>{name}</td>
      <td className="py-2 pr-3" style={{ color: C.ink2 }}>{level.label}</td>
      <td className="mi-num py-2 text-right font-semibold">{price(level.price)}</td>
      <td className="mi-num w-[5rem] py-2 text-right text-[0.85rem]" style={{ color: C.muted }}>{level.dist ? pct(level.dist, 2) : ""}</td>
    </tr>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white p-3">
      <span className="mi-label">{label}</span>
      <span className="mi-num text-[1.2rem] font-semibold">{value}</span>
      <span className="text-[0.8rem]" style={{ color: C.muted }}>{sub}</span>
    </div>
  );
}
