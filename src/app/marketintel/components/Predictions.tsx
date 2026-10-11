"use client";

import { ExternalLink } from "lucide-react";
import { C, countdown, localDay, localTime, pct, price, tzLabel, usd } from "../lib/format";
import { useNow } from "../lib/hooks";
import type { FedData, PolyMarket, PolymarketData, PolyRung } from "../lib/types";
import { FedWatch } from "./FedWatch";
import { Empty, Panel, Skeleton } from "./ui";

export function Predictions({ p, spot, fed }: { p: PolymarketData | null; spot: number | null; fed: FedData | null }) {
  // The Fed panel has its own futures source, so it renders even when Polymarket is down.
  return (
    <div className="space-y-6">
      <PolyMarkets p={p} spot={spot} fed={<FedWatch f={fed} />} />
    </div>
  );
}

function PolyMarkets({ p, spot, fed }: { p: PolymarketData | null; spot: number | null; fed: React.ReactNode }) {
  const now = useNow(1000);
  if (!p) return <><Skeleton h="22rem" />{fed}</>;
  if (!p.markets.length) return <><Panel sources={p.sources}><Empty>No live Polymarket markets found right now.</Empty></Panel>{fed}</>;

  const btc = p.markets.filter((m) => m.group === "btc");
  const macro = p.markets.filter((m) => m.group === "macro");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {btc.map((m) => (
          <Card key={m.slug} m={m} now={now}>
            {m.kind === "dist" && <RangeBuckets m={m} spot={spot} />}
            {m.kind === "above" && <Above m={m} spot={spot} />}
            {m.kind === "hit" && <HitLadder rungs={m.rungs} spot={spot} />}
          </Card>
        ))}
      </div>

      {fed}

      {macro.length > 0 && (
        <div>
          <h3 className="mi-label mb-3">More macro odds that move BTC</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {macro.map((m) => (
              <Card key={m.slug} m={m} now={now}>
                <Outcomes m={m} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ m, now, children }: { m: PolyMarket; now: number; children: React.ReactNode }) {
  return (
    <Panel
      title={
        m.horizon.startsWith("Close")
          ? `Close ${localDay(m.endDate)}, ${localTime(m.endDate)} ${tzLabel(m.endDate)}`
          : m.group === "macro"
            ? m.horizon
            : `${m.horizon}, ends ${localDay(m.endDate)} ${localTime(m.endDate)}`
      }
      aside={
        <span className="mi-num">
          {countdown(m.endDate, now)}, vol {usd(m.volume, 1)}
        </span>
      }
    >
      <a
        href={`https://polymarket.com/event/${m.slug}`}
        target="_blank"
        rel="noreferrer"
        className="mb-4 -mt-1 inline-flex items-center gap-1.5 text-[1rem] font-semibold underline-offset-4 hover:underline"
      >
        {m.title}
        <ExternalLink size="0.85em" style={{ color: C.muted }} aria-hidden />
      </a>
      {children}
    </Panel>
  );
}

/** Price where the "above" odds cross `level`, interpolated between strikes. */
function crossAt(rungs: PolyRung[], level: number): number | null {
  const r = [...rungs].sort((a, b) => a.strike - b.strike);
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i];
    const b = r[i + 1];
    if (a.p >= level && b.p < level) return a.strike + ((a.p - level) / (a.p - b.p)) * (b.strike - a.strike);
  }
  return null;
}

/** "Bitcoin above ___ on <date>": odds BTC settles above each strike. */
function Above({ m, spot }: { m: PolyMarket; spot: number | null }) {
  const lo = crossAt(m.rungs, 0.9);
  const hi = crossAt(m.rungs, 0.1);
  // Keep the strikes that are still in play; settled ones (0% / 100%) are noise.
  const live = [...m.rungs].filter((r) => r.p >= 0.03 && r.p <= 0.97).sort((a, b) => b.strike - a.strike);
  const above = spot === null ? live : live.filter((r) => r.strike >= spot);
  const below = spot === null ? [] : live.filter((r) => r.strike < spot);

  const Row = ({ r }: { r: PolyRung }) => (
    <li className="grid grid-cols-[5.2rem_1fr_3rem] items-center gap-2 text-[0.85rem]">
      <span className="mi-num">{price(r.strike)}</span>
      <span className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1, r.p * 100)}%`, background: C.venues.binance }} />
      <span className="mi-num text-right font-semibold">{(r.p * 100).toFixed(0)}%</span>
    </li>
  );

  return (
    <>
      <p className="mb-3 text-[0.85rem]" style={{ color: C.ink2 }}>
        Where Polymarket traders think BTC will close at that time.
      </p>
      <div className="mb-4">
        <div className="mi-label">Middle guess</div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="mi-num text-[1.4rem] font-semibold">{price(m.impliedMedian)}</span>
          {m.impliedMedian && spot && (
            <span className="mi-num text-[0.85rem]" style={{ color: m.impliedMedian >= spot ? C.longInk : C.shortInk }}>
              {pct((m.impliedMedian / spot - 1) * 100, 2)} vs now
            </span>
          )}
        </div>
        {lo && hi && (
          <div className="mt-1 text-[0.85rem]" style={{ color: C.ink2 }}>
            80% likely between <span className="mi-num font-semibold" style={{ color: C.ink }}>{price(lo)}</span> and{" "}
            <span className="mi-num font-semibold" style={{ color: C.ink }}>{price(hi)}</span>
          </div>
        )}
      </div>
      {live.length ? (
        <>
          <div className="mi-label mb-1.5">Odds BTC is above</div>
          <ul className="space-y-1">{above.map((r) => <Row key={r.strike} r={r} />)}</ul>
          {spot && (
            <div className="my-2 flex items-center gap-2 text-[0.8rem] font-semibold">
              <span className="h-px flex-1" style={{ background: C.ink }} />
              now {price(spot)}
              <span className="h-px flex-1" style={{ background: C.ink }} />
            </div>
          )}
          <ul className="space-y-1">{below.map((r) => <Row key={r.strike} r={r} />)}</ul>
        </>
      ) : (
        <Empty>Every strike is all but settled.</Empty>
      )}
    </>
  );
}

/** "Bitcoin price on <date>": mutually exclusive $2K buckets. */
function RangeBuckets({ m, spot }: { m: PolyMarket; spot: number | null }) {
  const rows = (m.outcomes ?? []).map((o) => {
    const nums = o.label.replace(/,/g, "").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const lo = o.label.startsWith("<") ? -Infinity : nums[0];
    const hi = o.label.startsWith(">") ? Infinity : o.label.startsWith("<") ? nums[0] : nums[1] ?? nums[0];
    return { ...o, lo, hi };
  });
  const max = Math.max(0.01, ...rows.map((r) => r.p));
  const best = rows.reduce((a, b) => (b.p > a.p ? b : a), rows[0]);
  return (
    <div>
      {best && (
        <div className="mb-3 flex items-baseline gap-2">
          <span className="mi-num text-[1.4rem] font-semibold">{(best.p * 100).toFixed(0)}%</span>
          <span className="text-[0.9rem]" style={{ color: C.ink2 }}>most likely close: {best.label.replace(/,000/g, "K")}</span>
        </div>
      )}
      <ul className="space-y-1">
        {[...rows].reverse().filter((r) => r.p >= 0.005).map((r) => {
          const here = spot !== null && spot >= r.lo && spot < r.hi;
          return (
            <li key={r.label} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-[0.85rem]">
              <span className="mi-num" style={{ fontWeight: here ? 700 : 400 }}>{r.label.replace(/,000/g, "K")}</span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1, (r.p / max) * 100)}%`, background: C.venues.binance }} />
                {here && <span className="text-[0.8rem] font-semibold">spot</span>}
              </span>
              <span className="mi-num text-right font-semibold">{(r.p * 100).toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[0.8rem]" style={{ color: C.muted }}>Buckets under 0.5% hidden.</p>
    </div>
  );
}

function HitLadder({ rungs, spot }: { rungs: PolyRung[]; spot: number | null }) {
  // Drop the near-certain and near-impossible tails so the ladder stays legible.
  const keep = (r: PolyRung) => r.p >= 0.01 && r.p <= 0.99;
  const up = rungs.filter((r) => r.dir === "up" && keep(r)).sort((a, b) => b.strike - a.strike);
  const down = rungs.filter((r) => r.dir === "down" && keep(r)).sort((a, b) => b.strike - a.strike);

  const Row = ({ r }: { r: PolyRung }) => (
    <li className="grid grid-cols-[5.2rem_1fr_3rem] items-center gap-2 text-[0.85rem]" title={r.question}>
      <span className="mi-num">
        <span style={{ color: r.dir === "up" ? C.longInk : C.shortInk }}>{r.dir === "up" ? "↑" : "↓"}</span> {price(r.strike)}
      </span>
      <span className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1, r.p * 100)}%`, background: r.dir === "up" ? C.long : C.short }} />
      <span className="mi-num text-right font-semibold">{(r.p * 100).toFixed(0)}%</span>
    </li>
  );

  return (
    <div>
      <div className="mi-label mb-1.5">Odds of touching before expiry</div>
      <ul className="space-y-1">{up.map((r) => <Row key={`u${r.strike}`} r={r} />)}</ul>
      {spot && (
        <div className="my-2 flex items-center gap-2 text-[0.8rem] font-semibold">
          <span className="h-px flex-1" style={{ background: C.ink }} />
          spot {price(spot)}
          <span className="h-px flex-1" style={{ background: C.ink }} />
        </div>
      )}
      <ul className="space-y-1">{down.map((r) => <Row key={`d${r.strike}`} r={r} />)}</ul>
      {!up.length && !down.length && <Empty>All strikes already decided.</Empty>}
    </div>
  );
}

/** Fed decision, CPI print, number of cuts: show outcomes in listed order. */
function Outcomes({ m }: { m: PolyMarket }) {
  const rows = (m.outcomes ?? []).filter((o) => o.p >= 0.01);
  const hidden = (m.outcomes?.length ?? 0) - rows.length;
  const max = Math.max(0.01, ...rows.map((r) => r.p));
  return (
    <div>
      <ul className="space-y-1.5">
        {rows.map((o) => (
          <li key={o.label} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3rem] items-center gap-2 text-[0.9rem]">
            <span className="truncate">{o.label}</span>
            <span className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1, (o.p / max) * 100)}%`, background: C.venues.okx }} />
            <span className="mi-num text-right font-semibold">{(o.p * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-3 text-[0.8rem]" style={{ color: C.muted }}>{hidden} outcomes under 1% hidden.</p>
      )}
    </div>
  );
}
