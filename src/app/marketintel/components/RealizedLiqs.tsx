"use client";

import { useState } from "react";
import { C, ago, localTime, price, usd } from "../lib/format";
import { useLiveLiquidations, useWidth } from "../lib/hooks";
import type { RealizedLiqData } from "../lib/types";
import { Tip } from "./charts";
import { Empty, Panel, Skeleton, Stat } from "./ui";

/** Liquidations that actually filled: OKX history scaled to all venues, plus a live tape. */
export function RealizedLiqs({ lq, scale, now }: { lq: RealizedLiqData | null; scale: number | null; now: number }) {
  const live = useLiveLiquidations();
  if (!lq) return <Skeleton h="22rem" />;
  const k = scale ?? 1;
  const est = scale !== null;
  const win = [
    { label: "Last hour", v: lq.h1 },
    { label: "Last 4 hours", v: lq.h4 },
    { label: `Last ${lq.coverageHours < 23.5 ? `${lq.coverageHours.toFixed(0)}h (OKX history limit)` : "24 hours"}`, v: lq.h24 },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        className="lg:col-span-7"
        title="Liquidations that happened"
        aside={est ? <>estimated all venues, ×{k.toFixed(1)} from OKX</> : "OKX only"}
        sources={lq.sources}
        footnote={
          <>
            Filled forced orders on OKX&apos;s BTC-USDT swap, the one major venue with a public liquidation history, scaled to all
            venues by OKX&apos;s share of open interest. A one-sided flush is usually the end of a move, not the start: once the
            forced sellers are done, price often bounces.
          </>
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-4">
          {win.map((w) => (
            <Stat
              key={w.label}
              label={w.label}
              value={
                <span className="text-[1.05rem]">
                  <span style={{ color: C.longInk }}>{usd(w.v.long * k, 1)}</span>
                  <span style={{ color: C.muted }}> / </span>
                  <span style={{ color: C.shortInk }}>{usd(w.v.short * k, 1)}</span>
                </span>
              }
              sub="longs / shorts liquidated"
            />
          ))}
        </div>
        <HourlyBars hourly={lq.hourly} k={k} />
        {lq.largest.length > 0 && (
          <div className="mt-4">
            <div className="mi-label mb-2">Largest fills, OKX</div>
            <ul className="grid gap-x-6 gap-y-1 text-[0.85rem] sm:grid-cols-2">
              {lq.largest.slice(0, 6).map((o) => (
                <li key={`${o.t}-${o.usd}`} className="mi-num flex justify-between gap-3">
                  <span style={{ color: o.side === "long" ? C.longInk : C.shortInk }}>{o.side === "long" ? "Long" : "Short"} {usd(o.usd, 2)}</span>
                  <span style={{ color: C.muted }}>{price(o.px)}, {localTime(o.t)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel
        className="lg:col-span-5"
        title="Live tape"
        aside={live.venues.length ? `${live.venues.join(" + ")}, since ${ago(live.since, now)}` : "connecting…"}
        footnote="Streamed straight from Bybit (every fill) and Binance (largest fill per second only) into this page. Totals count from when you opened it."
      >
        <div className="mb-3 flex gap-8">
          <Stat label="Longs liquidated" value={usd(live.long, 2)} valueColor={C.longInk} />
          <Stat label="Shorts liquidated" value={usd(live.short, 2)} valueColor={C.shortInk} />
        </div>
        {live.events.length ? (
          <ul className="max-h-[16rem] space-y-1 overflow-y-auto text-[0.85rem]">
            {live.events.map((e, i) => (
              <li key={`${e.t}-${i}`} className="mi-num flex justify-between gap-3 border-b pb-1" style={{ borderColor: C.grid }}>
                <span style={{ color: e.side === "long" ? C.longInk : C.shortInk, fontWeight: e.usd >= 250_000 ? 600 : 400 }}>
                  {e.side === "long" ? "Long" : "Short"} {usd(e.usd, e.usd >= 1e6 ? 2 : 0)}
                </span>
                <span style={{ color: C.muted }}>{e.venue}, {price(e.px)}, {ago(e.t, now)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No liquidations since you opened the page.</Empty>
        )}
      </Panel>
    </div>
  );
}

/** 24 hourly bars: longs liquidated below the axis, shorts above. */
function HourlyBars({ hourly, k }: { hourly: RealizedLiqData["hourly"]; k: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const h = 140;
  const mid = h / 2;
  const max = Math.max(1, ...hourly.map((b) => Math.max(b.long, b.short)));
  const slot = w ? w / hourly.length : 0;
  const bar = Math.max(1, slot - 2);
  const y = (v: number) => (v / max) * (mid - 6);
  const b = hover !== null ? hourly[hover] : null;
  if (!hourly.some((x) => x.long || x.short)) return <Empty>No OKX liquidations in the last 24 hours.</Empty>;
  return (
    <div ref={ref} className="relative w-full" style={{ height: h }} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={h} className="block">
          <line x1={0} x2={w} y1={mid} y2={mid} stroke={C.neutral} />
          {hourly.map((x, i) => (
            <g key={x.t} onMouseEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.5}>
              <rect x={i * slot} y={0} width={slot} height={h} fill="transparent" />
              <rect x={i * slot + 1} y={mid - y(x.short)} width={bar} height={y(x.short)} fill={C.short} rx={1} />
              <rect x={i * slot + 1} y={mid} width={bar} height={y(x.long)} fill={C.long} rx={1} />
            </g>
          ))}
          <text x={0} y={12} style={{ fontSize: "0.8rem", fill: C.muted }}>shorts</text>
          <text x={0} y={h - 4} style={{ fontSize: "0.8rem", fill: C.muted }}>longs</text>
        </svg>
      )}
      {b && hover !== null && (
        <Tip x={hover * slot + slot / 2} y={0} w={w}>
          <div style={{ color: C.muted }}>{localTime(b.t)}</div>
          <div className="mi-num" style={{ color: C.longInk }}>Longs {usd(b.long * k, 1)}</div>
          <div className="mi-num" style={{ color: C.shortInk }}>Shorts {usd(b.short * k, 1)}</div>
        </Tip>
      )}
    </div>
  );
}
