"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import type { CycleSeries, HalvingEpoch } from "../types";
import {
  CHART, addDays, fmtDate, fmtMultiple, fmtPct, fmtUsd, linePath,
  linearScale, linearTicks, logScale, logTicks, sampledAt,
} from "../lib/chart";

/**
 * Cowen's cycle overlay: every epoch re-based to a common anchor and drawn on
 * one "days since …" axis, so the current cycle can be read against where the
 * previous ones peaked and bottomed.
 *
 *  - ROI from low      : price ÷ cycle low, log y, x = days since the low.
 *  - Drawdown from peak: price ÷ cycle peak, linear y, x = days since the high.
 *  - ROI after halving : price ÷ halving-day price, log y, x = days since halving.
 *
 * SSR renders the full static chart; the client adds the crosshair/tooltip.
 */

type Mode = "fromLow" | "fromPeak" | "halving";

const W = 760, H = 360;
const M = { top: 22, right: 86, bottom: 40, left: 54 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

interface Epoch {
  label: string;
  startDate: string;
  isCurrent: boolean;
  lastDay: number;
  valueAt: (day: number) => number;
  priceAt: (day: number) => number;
  /** where this (prior) epoch ended, in this frame's days; null = no marker */
  markerDay: number | null;
}

interface Props { cycles: CycleSeries[]; halvings: HalvingEpoch[]; asOfDate: string }

const MODES: { key: Mode; label: string }[] = [
  { key: "fromLow", label: "ROI from cycle low" },
  { key: "fromPeak", label: "Drawdown from peak" },
  { key: "halving", label: "ROI after halving" },
];

export function CycleOverlayChart({ cycles, halvings, asOfDate }: Props) {
  const [mode, setMode] = useState<Mode>("fromLow");
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const uid = useId();

  const epochs: Epoch[] = useMemo(() => {
    if (mode === "halving") {
      return halvings.map((h, i) => ({
        label: h.label, startDate: h.date, isCurrent: i === halvings.length - 1, lastDay: h.endDay,
        valueAt: (d) => sampledAt(h.roi, 2, d),
        priceAt: (d) => sampledAt(h.roi, 2, d) * h.price,
        markerDay: null,
      }));
    }
    return cycles.map((c, i) => {
      const start = mode === "fromLow" ? 0 : c.peakDay;
      const base = mode === "fromLow" ? 1 : c.peakMultiple;
      const isCurrent = i === cycles.length - 1;
      return {
        label: c.label, startDate: addDays(c.lowDate, start), isCurrent, lastDay: c.endDay - start,
        valueAt: (d) => sampledAt(c.roi, c.step, d + start) / base,
        priceAt: (d) => sampledAt(c.roi, c.step, d + start) * c.lowPrice,
        // the 2011 cycle was a short one; Cowen's "day 1,431 / 1,437" window is the last two
        markerDay: isCurrent || i === 0 ? null : c.endDay - start,
      };
    });
  }, [cycles, halvings, mode]);

  const model = useMemo(() => {
    const series = epochs.map((e) => {
      const pts: [number, number][] = [];
      for (let d = 0; d <= e.lastDay; d += 2) pts.push([d, e.valueAt(d)]);
      if (e.lastDay % 2 !== 0) pts.push([e.lastDay, e.valueAt(e.lastDay)]);
      return { e, pts };
    });
    const maxX = Math.max(...series.map((s) => s.e.lastDay)) + 30;
    const ys = series.flatMap((s) => s.pts.map((p) => p[1]));
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const x = linearScale([0, maxX], [M.left, M.left + PW]);
    const isLog = mode !== "fromPeak";
    const y = isLog
      ? logScale([Math.min(0.8, yMin), yMax * 1.15], [M.top + PH, M.top])
      : linearScale([0, 1.02], [M.top + PH, M.top]);
    const yTicks = isLog ? logTicks(Math.min(0.8, yMin), yMax * 1.15, [1, 2, 5]) : linearTicks(0, 1, 5);
    const xTicks = linearTicks(0, maxX, 7).filter((t) => t <= maxX);
    return { series, x, y, yTicks, xTicks, maxX, isLog };
  }, [epochs, mode]);

  const { series, x, y, yTicks, xTicks, maxX, isLog } = model;
  const currentSeries = series[series.length - 1];
  const todayDay = currentSeries.e.lastDay;
  const markers = epochs.map((e) => e.markerDay).filter((d): d is number => d !== null);
  const zone: [number, number] | null = markers.length >= 2 ? [Math.min(...markers), Math.max(...markers)] : null;
  const markerLabel = mode === "fromLow" ? "prior lows" : "prior bottoms";

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const day = Math.round(((px - M.left) / PW) * maxX);
    setHoverDay(day < 0 || day > maxX ? null : day);
  }

  const hover = hoverDay === null ? null : epochs.map((e) =>
    hoverDay > e.lastDay
      ? { e, value: null as number | null, price: null as number | null }
      : { e, value: e.valueAt(hoverDay), price: e.priceAt(hoverDay) });

  const fmtVal = (v: number) => (isLog ? fmtMultiple(v) : fmtPct(v - 1));
  const colorFor = (e: Epoch, i: number) => (e.isCurrent ? CHART.current : CHART.series[i % CHART.series.length]);
  const tipX = hoverDay === null ? 0 : x(hoverDay);
  const tipLeftSide = tipX > M.left + PW * 0.6;
  const xLabel = mode === "fromLow" ? "days since cycle low" : mode === "fromPeak" ? "days since cycle peak" : "days since halving";

  const title = mode === "fromLow"
    ? `Bitcoin price as a multiple of each cycle low, by days since the low. Current cycle is on day ${todayDay}; the previous two cycles bottomed on days ${markers.join(" and ")}.`
    : mode === "fromPeak"
      ? `Bitcoin drawdown from each cycle peak, by days since the peak. Current cycle is ${todayDay} days past its peak; previous cycles bottomed ${markers.join(" and ")} days after theirs.`
      : `Bitcoin price as a multiple of its price on halving day, by days since each halving. The current epoch is on day ${todayDay}.`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-[#0f1724] p-1" role="tablist" aria-label="Chart view">
          {MODES.map((m) => (
            <button key={m.key} role="tab" aria-selected={mode === m.key} onClick={() => { setMode(m.key); setHoverDay(null); }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === m.key ? "bg-[#1e2939] text-[#f2f6fb]" : "text-[#8695ac] hover:text-[#dfe7f1]"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#aab6c9]" aria-label="Legend">
          {epochs.map((e, i) => (
            <li key={e.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block w-4 rounded" style={{ background: colorFor(e, i), height: e.isCurrent ? 3 : 2 }} />
              {e.label}{e.isCurrent ? " (now)" : ""}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverDay(null)}
        tabIndex={0} onFocus={() => setHoverDay(todayDay)} onBlur={() => setHoverDay(null)}>
        <title id={`${uid}-title`}>{title}</title>
        <defs><clipPath id={`${uid}-clip`}><rect x={M.left} y={M.top} width={PW} height={PH} /></clipPath></defs>

        {zone && (
          <rect x={x(zone[0])} y={M.top} width={Math.max(2, x(zone[1]) - x(zone[0]))} height={PH} fill={CHART.textMuted} opacity={0.14} />
        )}

        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.textSecondary}>
              {isLog ? fmtMultiple(t) : `${Math.round(t * 100)}%`}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={M.top + PH + 18} textAnchor="middle" fontSize={11} fill={CHART.textSecondary}>{t}</text>
        ))}
        <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} stroke={CHART.axis} strokeWidth={1} />
        <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={CHART.textMuted}>{xLabel}</text>

        {zone && (
          <>
            {markers.map((d) => (
              <line key={`m${d}`} x1={x(d)} x2={x(d)} y1={M.top} y2={M.top + PH} stroke={CHART.textMuted} strokeWidth={1} />
            ))}
            <text x={x(zone[0]) - 6} y={M.top + 12} textAnchor="end" fontSize={10.5} fill={CHART.textSecondary}>
              {markerLabel} · day {markers.join(" & ")}
            </text>
          </>
        )}

        <g clipPath={`url(#${uid}-clip)`}>
          {series.map((s, i) => (
            <path key={s.e.label} d={linePath(s.pts.map(([d, v]) => [x(d), y(v)]))} fill="none"
              stroke={colorFor(s.e, i)} strokeWidth={s.e.isCurrent ? 2.5 : 1.75} strokeLinejoin="round"
              opacity={s.e.isCurrent ? 1 : 0.85} />
          ))}
        </g>

        {(() => {
          const last = currentSeries.pts[currentSeries.pts.length - 1];
          return (
            <g>
              <circle cx={x(last[0])} cy={y(last[1])} r={6} fill={CHART.surface} />
              <circle cx={x(last[0])} cy={y(last[1])} r={4} fill={CHART.current} />
              <text x={x(last[0]) + 9} y={y(last[1]) + 4} fontSize={11} fontWeight={600} fill={CHART.textPrimary}>day {todayDay}</text>
            </g>
          );
        })()}

        {hover && hoverDay !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            {hover.map((h, i) => h.value !== null && (
              <g key={h.e.label}>
                <circle cx={tipX} cy={y(h.value)} r={5.5} fill={CHART.surface} />
                <circle cx={tipX} cy={y(h.value)} r={3.5} fill={colorFor(h.e, i)} />
              </g>
            ))}
            <foreignObject x={tipLeftSide ? tipX - 214 : tipX + 10} y={M.top + 4} width={204} height={PH - 8}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">Day {hoverDay}</div>
                {hover.map((h, i) => (
                  <div key={h.e.label} className="flex items-center gap-2 py-0.5">
                    <span aria-hidden className="inline-block w-3 rounded" style={{ height: 2, background: colorFor(h.e, i) }} />
                    <span className="w-[64px] text-[#8695ac]">{h.e.label.replace(/ (cycle|halving)$/, "")}</span>
                    {h.value === null ? <span className="text-[#5c6a83]">—</span> : (
                      <>
                        <span className="font-semibold tabular-nums text-[#f2f6fb]">{fmtVal(h.value)}</span>
                        <span className="ml-auto tabular-nums text-[#8695ac]">{fmtUsd(h.price as number)}</span>
                      </>
                    )}
                  </div>
                ))}
                <div className="mt-1 text-[#5c6a83]">
                  now-epoch date: {fmtDate(addDays(currentSeries.e.startDate, Math.min(hoverDay, todayDay)))}
                </div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      <details className="mt-3 text-xs text-[#8695ac]">
        <summary className="cursor-pointer select-none hover:text-[#dfe7f1]">Cycle &amp; halving tables</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left tabular-nums">
            <thead className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <tr>
                <th className="py-1 pr-3 font-medium">Cycle</th>
                <th className="py-1 pr-3 font-medium">Low</th>
                <th className="py-1 pr-3 font-medium">Peak</th>
                <th className="py-1 pr-3 font-medium">Peak day</th>
                <th className="py-1 pr-3 font-medium">Peak ROI</th>
                <th className="py-1 pr-3 font-medium">Next low</th>
                <th className="py-1 pr-3 font-medium">Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.label} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                  <td className="py-1.5 pr-3">{c.label}{c.endedAtNextLow ? "" : " (now)"}</td>
                  <td className="py-1.5 pr-3">{fmtDate(c.lowDate, { year: "numeric", month: "short" })} · {fmtUsd(c.lowPrice)}</td>
                  <td className="py-1.5 pr-3">{fmtDate(c.peakDate, { year: "numeric", month: "short" })} · {fmtUsd(c.peakPrice)}</td>
                  <td className="py-1.5 pr-3">{c.peakDay}</td>
                  <td className="py-1.5 pr-3">{fmtMultiple(c.peakMultiple)}</td>
                  <td className="py-1.5 pr-3">{c.endedAtNextLow ? `day ${c.endDay}` : `day ${c.endDay} so far`}</td>
                  <td className="py-1.5 pr-3">{fmtPct(c.endMultiple / c.peakMultiple - 1)}{c.endedAtNextLow ? "" : " (to date)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="mt-3 w-full min-w-[420px] text-left tabular-nums">
            <thead className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <tr>
                <th className="py-1 pr-3 font-medium">Halving</th>
                <th className="py-1 pr-3 font-medium">Price</th>
                <th className="py-1 pr-3 font-medium">Peak day</th>
                <th className="py-1 pr-3 font-medium">Peak multiple</th>
                <th className="py-1 pr-3 font-medium">Epoch length</th>
              </tr>
            </thead>
            <tbody>
              {halvings.map((h) => (
                <tr key={h.label} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                  <td className="py-1.5 pr-3">{fmtDate(h.date)}</td>
                  <td className="py-1.5 pr-3">{fmtUsd(h.price)}</td>
                  <td className="py-1.5 pr-3">{h.peakDay}</td>
                  <td className="py-1.5 pr-3">{fmtMultiple(h.peakMultiple)}</td>
                  <td className="py-1.5 pr-3">{h.ended ? `${h.endDay} days` : `day ${h.endDay} so far`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[#5c6a83]">Daily closes · blockchain.info (2010→) and Binance (2017→) · as of {fmtDate(asOfDate)}.</p>
        </div>
      </details>
    </div>
  );
}
