"use client";

import { useMemo, useState } from "react";
import { C, price } from "../lib/format";
import { useWidth } from "../lib/hooks";
import type { Level, LevelKind } from "../lib/quant";
import type { Candle, PriceData } from "../lib/types";
import { Tip } from "./charts";
import { Empty, Panel, Skeleton } from "./ui";

const AXIS = { fontSize: "0.8rem", fill: C.muted, fontFamily: "var(--font-mi-mono)" } as const;
const TAG_W = 140;

const LEVEL_COLOR: Record<LevelKind, string> = {
  session: C.ink2,
  open: C.accent,
  trend: C.venues.binance,
  liq: C.short,
  options: C.venues.okx,
  vol: C.neutral,
};
const levelColor = (l: Level) => (l.key === "liqd" ? C.long : LEVEL_COLOR[l.kind]);

const NO_CANDLES: Candle[] = [];

const VIEWS = {
  "1H": { label: "1H, 7 days", pick: (p: PriceData) => p.hourly.slice(-168) },
  "1D": { label: "1D, 120 days", pick: (p: PriceData) => p.daily.slice(-120) },
} as const;

export function PriceLevels({ px, levels, spot }: { px: PriceData | null; levels: Level[]; spot: number | null }) {
  const [view, setView] = useState<keyof typeof VIEWS>("1H");
  if (!px) return <Skeleton h="30rem" />;
  const candles = VIEWS[view].pick(px);
  const last = spot ?? candles.at(-1)?.c ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        className="lg:col-span-9"
        title="BTCUSDT spot"
        aside={
          <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: C.line }}>
            {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className="px-2.5 py-1 text-[0.8rem] font-medium"
                style={view === k ? { background: C.ink, color: "#fff" } : { color: C.ink2 }}
                aria-pressed={view === k}
              >
                {VIEWS[k].label}
              </button>
            ))}
          </div>
        }
        sources={px.sources}
        footnote="Binance spot candles. Lower pane is CVD, the running total of market buys minus market sells: spot in blue, Binance perp in orange (1H view, each on its own scale so the shapes compare). Price up with spot CVD flat or falling means the rally isn't backed by spot buyers; perp CVD leading while spot lags is leverage-driven and tends to fade."
      >
        {candles.length > 2 ? (
          <CandleChart candles={candles} perp={view === "1H" ? px.perpHourly : NO_CANDLES} levels={levels} spot={last} daily={view === "1D"} />
        ) : (
          <Empty>Price history unavailable</Empty>
        )}
      </Panel>

      <Panel className="lg:col-span-3" title="Key levels" aside="distance from spot">
        {last && levels.length ? (
          <ul className="text-[0.9rem]">
            {[...levels, { key: "spot", label: "Spot", price: last, kind: "session" as const, note: "" }]
              .sort((a, b) => b.price - a.price)
              .map((l) => {
                const isSpot = l.key === "spot";
                const d = (l.price / last - 1) * 100;
                return (
                  <li
                    key={l.key}
                    title={l.note}
                    className="grid grid-cols-[0.6rem_1fr_auto_3.6rem] items-center gap-2 border-t py-1.5 first:border-t-0"
                    style={{ borderColor: C.grid, fontWeight: isSpot ? 700 : 400, background: isSpot ? "#f7f7f4" : undefined }}
                  >
                    <span className="inline-block size-2 rounded-full" style={{ background: isSpot ? C.ink : levelColor(l as Level) }} />
                    <span className="truncate">{l.label}</span>
                    <span className="mi-num text-right">{price(l.price)}</span>
                    <span className="mi-num text-right text-[0.8rem]" style={{ color: isSpot ? C.ink : d >= 0 ? C.longInk : C.shortInk }}>
                      {isSpot ? "" : `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}%`}
                    </span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <Empty>Levels load with price data</Empty>
        )}
        <p className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: C.muted }}>
          Session levels use UTC days. Liquidation clusters are modelled. Hover a row for what it means.
        </p>
      </Panel>
    </div>
  );
}

function CandleChart({ candles, perp, levels, spot, daily }: { candles: Candle[]; perp: Candle[]; levels: Level[]; spot: number | null; daily: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const priceH = 380;
  const gap = 14;
  const cvdH = 90;
  const height = priceH + gap + cvdH + 22;
  const pad = { l: 0, r: 76, t: 8 };

  const geo = useMemo(() => {
    if (!w) return null;
    const plotW = w - pad.r;
    // Candles stop short of the right edge so level tags never cover the latest bars.
    const slot = (plotW - TAG_W) / candles.length;
    let lo = Math.min(...candles.map((c) => c.l));
    let hi = Math.max(...candles.map((c) => c.h));
    // Pull in levels that sit just outside the range, so nearby targets show.
    const ref = spot ?? candles.at(-1)!.c;
    for (const l of levels) {
      if (Math.abs(l.price / ref - 1) < 0.04) {
        lo = Math.min(lo, l.price);
        hi = Math.max(hi, l.price);
      }
    }
    const padV = (hi - lo) * 0.04;
    lo -= padV;
    hi += padV;
    const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (priceH - pad.t);
    let run = 0;
    const cvd = candles.map((c) => (run += c.delta));
    const clo = Math.min(0, ...cvd);
    const chi = Math.max(0, ...cvd);
    const top = priceH + gap;
    const cy = (v: number) => (chi === clo ? top + cvdH / 2 : top + ((chi - v) / (chi - clo)) * cvdH);
    const cx = (i: number) => (i + 0.5) * slot;
    const cvdPath = cvd.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join("");
    // Perp CVD on the same bars, scaled to its own range: perp volume dwarfs
    // spot, so a shared scale would flatten the spot line.
    const pd = new Map(perp.map((c) => [c.t, c.delta]));
    let prun = 0;
    const pcvd = perp.length ? candles.map((c) => (prun += pd.get(c.t) ?? 0)) : [];
    const plo = Math.min(0, ...pcvd);
    const phi = Math.max(0, ...pcvd);
    const py = (v: number) => (phi === plo ? top + cvdH / 2 : top + ((phi - v) / (phi - plo)) * cvdH);
    const perpPath = pcvd.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${py(v).toFixed(1)}`).join("");

    // Level tags: stack so labels never overlap.
    const tags = levels
      .filter((l) => l.price >= lo && l.price <= hi)
      .map((l) => ({ l, y: y(l.price) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, tags[i - 1].y + 15);

    const step = (hi - lo) / 5;
    const mag = 10 ** Math.floor(Math.log10(step));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step) ?? step;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / nice) * nice; v <= hi; v += nice) ticks.push(v);

    return { plotW, slot, y, cx, cy, cvd, cvdPath, pcvd, perpPath, top, tags, ticks, lo, hi };
  }, [w, candles, perp, levels, spot, pad.r, pad.t]);

  const fmtT = (t: number) =>
    daily
      ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const h = hover !== null ? candles[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg
          width={w}
          height={height}
          className="block"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.floor((e.clientX - r.left) / geo.slot);
            setHover(i >= 0 && i < candles.length ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {geo.ticks.map((v) => (
            <g key={v}>
              <line x1={0} x2={geo.plotW} y1={geo.y(v)} y2={geo.y(v)} stroke={C.grid} />
              <text x={geo.plotW + 6} y={geo.y(v) + 4} style={AXIS}>{price(v)}</text>
            </g>
          ))}

          {/* levels */}
          {geo.tags.map(({ l }) => (
            <line
              key={l.key}
              x1={0}
              x2={geo.plotW - TAG_W + 6}
              y1={geo.y(l.price)}
              y2={geo.y(l.price)}
              stroke={levelColor(l)}
              strokeWidth={1.25}
              strokeDasharray={l.kind === "vol" ? "2 4" : "6 4"}
              opacity={0.8}
            />
          ))}

          {/* candles */}
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const col = up ? C.long : C.short;
            const bw = Math.max(1, geo.slot * 0.68);
            const x = geo.cx(i);
            const yo = geo.y(c.o);
            const yc = geo.y(c.c);
            return (
              <g key={c.t} opacity={hover === null || hover === i ? 1 : 0.55}>
                <line x1={x} x2={x} y1={geo.y(c.h)} y2={geo.y(c.l)} stroke={col} strokeWidth={1} />
                <rect x={x - bw / 2} y={Math.min(yo, yc)} width={bw} height={Math.max(1, Math.abs(yc - yo))} fill={col} />
              </g>
            );
          })}

          {/* spot */}
          {spot !== null && spot >= geo.lo && spot <= geo.hi && (
            <g>
              <line x1={0} x2={geo.plotW} y1={geo.y(spot)} y2={geo.y(spot)} stroke={C.ink} strokeWidth={1} />
              <rect x={geo.plotW + 2} y={geo.y(spot) - 10} width={pad.r - 2} height={20} rx={3} fill={C.ink} />
              <text x={geo.plotW + 6} y={geo.y(spot) + 4} style={{ ...AXIS, fill: "#fff", fontWeight: 600 }}>{price(spot)}</text>
            </g>
          )}

          {/* level tags, stacked at the right edge of the plot */}
          {geo.tags.map(({ l, y }) => (
            <g key={`t${l.key}`}>
              <rect x={geo.plotW - TAG_W + 6} y={y - 8} width={TAG_W - 10} height={16} rx={3} fill="#fff" opacity={0.92} />
              <text x={geo.plotW - 8} y={y + 4} textAnchor="end" style={{ ...AXIS, fill: levelColor(l), fontWeight: 600 }}>
                {l.label}
              </text>
            </g>
          ))}

          {/* CVD pane */}
          <line x1={0} x2={geo.plotW} y1={geo.cy(0)} y2={geo.cy(0)} stroke={C.neutral} />
          <text x={geo.plotW + 6} y={geo.top + 10} style={AXIS}>CVD</text>
          <text x={geo.plotW + 6} y={geo.top + cvdH} style={AXIS}>
            {`${geo.cvd.at(-1)! >= 0 ? "+" : "−"}${Math.abs(geo.cvd.at(-1)!).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          </text>
          {geo.perpPath && <path d={geo.perpPath} fill="none" stroke={C.venues.bybit} strokeWidth={1.5} strokeDasharray="4 3" strokeLinejoin="round" />}
          <path d={geo.cvdPath} fill="none" stroke={C.venues.binance} strokeWidth={2} strokeLinejoin="round" />
          {geo.perpPath && (
            <text x={4} y={geo.top + 10} style={AXIS}>
              <tspan fill={C.venues.binance}>spot</tspan> / <tspan fill={C.venues.bybit}>perp</tspan>
            </text>
          )}

          {/* time axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const i = Math.min(candles.length - 1, Math.round(f * (candles.length - 1)));
            return (
              <text key={f} x={geo.cx(i)} y={height - 4} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} style={AXIS}>
                {fmtT(candles[i].t)}
              </text>
            );
          })}

          {hover !== null && (
            <line x1={geo.cx(hover)} x2={geo.cx(hover)} y1={pad.t} y2={geo.top + cvdH} stroke={C.ink} strokeOpacity={0.25} />
          )}
        </svg>
      )}
      {geo && h && hover !== null && (
        <Tip x={geo.cx(hover)} y={0} w={w}>
          <div className="text-[0.8rem]" style={{ color: C.muted }}>{fmtT(h.t)}</div>
          <div className="mi-num grid grid-cols-[auto_auto] gap-x-3">
            <span style={{ color: C.muted }}>O</span><span className="text-right">{price(h.o, 1)}</span>
            <span style={{ color: C.muted }}>H</span><span className="text-right">{price(h.h, 1)}</span>
            <span style={{ color: C.muted }}>L</span><span className="text-right">{price(h.l, 1)}</span>
            <span style={{ color: C.muted }}>C</span>
            <span className="text-right font-semibold" style={{ color: h.c >= h.o ? C.longInk : C.shortInk }}>
              {price(h.c, 1)} ({h.c >= h.o ? "+" : "−"}{Math.abs((h.c / h.o - 1) * 100).toFixed(2)}%)
            </span>
            <span style={{ color: C.muted }}>Vol</span><span className="text-right">{h.v.toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC</span>
            <span style={{ color: C.muted }}>Δ</span>
            <span className="text-right" style={{ color: h.delta >= 0 ? C.longInk : C.shortInk }}>
              {h.delta >= 0 ? "+" : "−"}{Math.abs(h.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC
            </span>
          </div>
        </Tip>
      )}
    </div>
  );
}
