"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import type { CycleSeries } from "../types";
import {
  CHART, addDays, fmtDate, fmtMultiple, fmtPct, fmtUsd, linePath,
  linearScale, linearTicks, logScale, logTicks,
} from "../lib/chart";

/**
 * Cowen's cycle overlay: every 4-year cycle re-based to its bear-market low
 * and drawn on one "days since the low" axis, so the current cycle can be
 * read against where the previous ones peaked and bottomed.
 *
 * Two views of the same data:
 *  - ROI from low  : price ÷ low, log y, x = days since low (Cowen's "day N").
 *  - From the peak : price ÷ peak, linear y, x = days since the cycle high —
 *                    the drawdown path that ends at the next bottom.
 *
 * SSR renders the full static chart; the client adds the crosshair/tooltip.
 */

type Mode = "fromLow" | "fromPeak";

const W = 760, H = 360;
const M = { top: 22, right: 86, bottom: 40, left: 54 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

interface Props { cycles: CycleSeries[]; asOfDate: string }

export function CycleOverlayChart({ cycles, asOfDate }: Props) {
  const [mode, setMode] = useState<Mode>("fromLow");
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const uid = useId();

  const prior = cycles.slice(0, -1);

  // Per-cycle [day, value] series in the chosen frame. Sampled every 2nd day —
  // the eye can't tell at this width and it halves the path text.
  const model = useMemo(() => {
    const series = cycles.map((c, i) => {
      const isCurrent = i === cycles.length - 1;
      const start = mode === "fromLow" ? 0 : c.peakDay;
      const base = mode === "fromLow" ? 1 : c.roi[c.peakDay];
      const pts: [number, number][] = [];
      for (let d = start; d <= c.endDay; d += 2) pts.push([d - start, c.roi[d] / base]);
      if ((c.endDay - start) % 2 !== 0) pts.push([c.endDay - start, c.roi[c.endDay] / base]);
      return { c, isCurrent, pts, lastDay: c.endDay - start };
    });
    const maxX = Math.max(...series.map((s) => s.lastDay)) + 30;
    const ys = series.flatMap((s) => s.pts.map((p) => p[1]));
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const x = linearScale([0, maxX], [M.left, M.left + PW]);
    const y = mode === "fromLow"
      ? logScale([Math.min(0.8, yMin), yMax * 1.15], [M.top + PH, M.top])
      : linearScale([0, 1.02], [M.top + PH, M.top]);
    const yTicks = mode === "fromLow" ? logTicks(1, yMax * 1.15, [1, 2, 5]) : linearTicks(0, 1, 5);
    const xTicks = linearTicks(0, maxX, 7).filter((t) => t <= maxX);
    return { series, x, y, yTicks, xTicks, maxX };
  }, [cycles, mode]);

  const { series, x, y, yTicks, xTicks, maxX } = model;

  // Prior-cycle reference markers (bottoms in fromLow, next-low in fromPeak).
  const markers = prior.map((c) => (mode === "fromLow" ? c.endDay : c.endDay - c.peakDay));
  const markerLabel = mode === "fromLow" ? "prior lows" : "prior bottoms";
  const currentSeries = series[series.length - 1];
  const todayDay = currentSeries.lastDay;

  // Zone between earliest and latest prior bottom, so "the window" is one shape.
  const zone: [number, number] = [Math.min(...markers.slice(1)), Math.max(...markers.slice(1))];

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const day = Math.round(((px - M.left) / PW) * maxX);
    setHoverDay(day < 0 || day > maxX ? null : day);
  }

  const hover = hoverDay === null ? null : series.map((s) => {
    const c = s.c;
    const start = mode === "fromLow" ? 0 : c.peakDay;
    const d = hoverDay + start;
    if (d > c.endDay) return { s, value: null as number | null, date: null as string | null, price: null as number | null };
    const base = mode === "fromLow" ? 1 : c.roi[c.peakDay];
    return { s, value: c.roi[d] / base, date: addDays(c.lowDate, d), price: c.roi[d] * c.lowPrice };
  });

  const fmtVal = (v: number) => (mode === "fromLow" ? fmtMultiple(v) : fmtPct(v - 1));
  const colorFor = (s: (typeof series)[number], i: number) => (s.isCurrent ? CHART.current : CHART.series[i]);

  const tipX = hoverDay === null ? 0 : x(hoverDay);
  const tipLeftSide = tipX > M.left + PW * 0.6;

  return (
    <div>
      {/* controls: one row above the plot */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[#0f1724] p-1" role="tablist" aria-label="Chart view">
          {([["fromLow", "ROI from cycle low"], ["fromPeak", "Drawdown from peak"]] as const).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === m ? "bg-[#1e2939] text-[#f2f6fb]" : "text-[#8695ac] hover:text-[#dfe7f1]"}`}>
              {label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#aab6c9]" aria-label="Legend">
          {series.map((s, i) => (
            <li key={s.c.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded"
                style={{ background: colorFor(s, i), height: s.isCurrent ? 3 : 2 }} />
              {s.c.label}{s.isCurrent ? " (now)" : ""}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverDay(null)}
        tabIndex={0} onFocus={() => setHoverDay(todayDay)} onBlur={() => setHoverDay(null)}>
        <title id={`${uid}-title`}>
          {mode === "fromLow"
            ? `Bitcoin price as a multiple of each cycle low, by days since the low. Current cycle is on day ${todayDay}; the previous two cycles bottomed on days ${markers[1]} and ${markers[2]}.`
            : `Bitcoin drawdown from each cycle peak, by days since the peak. Current cycle is ${todayDay} days past its peak; previous cycles bottomed ${markers.slice(1).join(" and ")} days after theirs.`}
        </title>
        <defs>
          <clipPath id={`${uid}-clip`}><rect x={M.left} y={M.top} width={PW} height={PH} /></clipPath>
        </defs>

        {/* prior-bottom window */}
        <rect x={x(zone[0])} y={M.top} width={Math.max(2, x(zone[1]) - x(zone[0]))} height={PH}
          fill={CHART.textMuted} opacity={0.14} />

        {/* grid + axes */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.textSecondary}>
              {mode === "fromLow" ? fmtMultiple(t) : `${Math.round(t * 100)}%`}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={M.top + PH + 18} textAnchor="middle" fontSize={11} fill={CHART.textSecondary}>
            {t}
          </text>
        ))}
        <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} stroke={CHART.axis} strokeWidth={1} />
        <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={CHART.textMuted}>
          {mode === "fromLow" ? "days since cycle low" : "days since cycle peak"}
        </text>

        {/* prior-bottom markers */}
        {markers.map((d, i) => i > 0 && (
          <g key={`m${d}`}>
            <line x1={x(d)} x2={x(d)} y1={M.top} y2={M.top + PH} stroke={CHART.textMuted} strokeWidth={1} />
          </g>
        ))}
        <text x={x(zone[0]) - 6} y={M.top + 12} textAnchor="end" fontSize={10.5} fill={CHART.textSecondary}>
          {markerLabel} · day {markers[1]} &amp; {markers[2]}
        </text>

        {/* series */}
        <g clipPath={`url(#${uid}-clip)`}>
          {series.map((s, i) => (
            <path key={s.c.label} d={linePath(s.pts.map(([d, v]) => [x(d), y(v)]))} fill="none"
              stroke={colorFor(s, i)} strokeWidth={s.isCurrent ? 2.5 : 1.75} strokeLinejoin="round"
              opacity={s.isCurrent ? 1 : 0.85} />
          ))}
        </g>

        {/* "now" end marker with a surface ring */}
        {(() => {
          const last = currentSeries.pts[currentSeries.pts.length - 1];
          return (
            <g>
              <circle cx={x(last[0])} cy={y(last[1])} r={6} fill={CHART.surface} />
              <circle cx={x(last[0])} cy={y(last[1])} r={4} fill={CHART.current} />
              <text x={x(last[0]) + 9} y={y(last[1]) + 4} fontSize={11} fontWeight={600} fill={CHART.textPrimary}>
                day {todayDay}
              </text>
            </g>
          );
        })()}

        {/* crosshair */}
        {hover && hoverDay !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            {hover.map((h, i) => h.value !== null && (
              <g key={h.s.c.label}>
                <circle cx={tipX} cy={y(h.value)} r={5.5} fill={CHART.surface} />
                <circle cx={tipX} cy={y(h.value)} r={3.5} fill={colorFor(h.s, i)} />
              </g>
            ))}
            <foreignObject x={tipLeftSide ? tipX - 214 : tipX + 10} y={M.top + 4} width={204} height={PH - 8}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">
                  Day {hoverDay} {mode === "fromLow" ? "after the low" : "after the peak"}
                </div>
                {hover.map((h, i) => (
                  <div key={h.s.c.label} className="flex items-center gap-2 py-0.5">
                    <span aria-hidden className="inline-block w-3 rounded" style={{ height: 2, background: colorFor(h.s, i) }} />
                    <span className="w-[68px] text-[#8695ac]">{h.s.c.label.replace(" cycle", "")}</span>
                    {h.value === null ? (
                      <span className="text-[#5c6a83]">—</span>
                    ) : (
                      <>
                        <span className="font-semibold tabular-nums text-[#f2f6fb]">{fmtVal(h.value)}</span>
                        <span className="ml-auto tabular-nums text-[#8695ac]">{fmtUsd(h.price as number)}</span>
                      </>
                    )}
                  </div>
                ))}
                {hover.find((h) => h.s.isCurrent)?.date && (
                  <div className="mt-1 text-[#5c6a83]">now-cycle date: {fmtDate(hover.find((h) => h.s.isCurrent)!.date as string)}</div>
                )}
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      {/* table view — every value reachable without hovering */}
      <details className="mt-3 text-xs text-[#8695ac]">
        <summary className="cursor-pointer select-none hover:text-[#dfe7f1]">Cycle table</summary>
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
              {cycles.map((c) => {
                const endRoi = c.roi[c.endDay];
                return (
                  <tr key={c.label} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                    <td className="py-1.5 pr-3">{c.label}{c.endedAtNextLow ? "" : " (now)"}</td>
                    <td className="py-1.5 pr-3">{fmtDate(c.lowDate, { year: "numeric", month: "short" })} · {fmtUsd(c.lowPrice)}</td>
                    <td className="py-1.5 pr-3">{fmtDate(c.peakDate, { year: "numeric", month: "short" })} · {fmtUsd(c.peakPrice)}</td>
                    <td className="py-1.5 pr-3">{c.peakDay}</td>
                    <td className="py-1.5 pr-3">{fmtMultiple(c.roi[c.peakDay])}</td>
                    <td className="py-1.5 pr-3">{c.endedAtNextLow ? `day ${c.endDay}` : `day ${c.endDay} so far`}</td>
                    <td className="py-1.5 pr-3">{fmtPct(endRoi / c.roi[c.peakDay] - 1)}{c.endedAtNextLow ? "" : " (to date)"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[#5c6a83]">Daily closes · blockchain.info (2010→) and Binance (2017→) · as of {fmtDate(asOfDate)}.</p>
        </div>
      </details>
    </div>
  );
}
