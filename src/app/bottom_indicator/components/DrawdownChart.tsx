"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import type { BearMarket, DailySeries } from "../types";
import { CHART, addDays, fmtDate, fmtPct, fmtUsd, linePath, linearScale, linearTicks } from "../lib/chart";

/**
 * Drawdown from the running all-time high, full history, with each completed
 * bear market's floor labelled — and a stat-tile row for "where are we now".
 */

const W = 760, H = 300;
const M = { top: 16, right: 24, bottom: 36, left: 50 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const RED = "#f87171";

export function DrawdownChart({ daily, bears, asOfDate }: { daily: DailySeries; bears: BearMarket[]; asOfDate: string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId();

  const model = useMemo(() => {
    const pts: { d: string; close: number; ath: number; athDate: string; dd: number }[] = [];
    for (let i = 0, ath = 0, athDate = daily.start; i < daily.closes.length; i++) {
      const c = daily.closes[i];
      const d = addDays(daily.start, i * daily.step);
      if (c > ath) { ath = c; athDate = d; }
      pts.push({ d, close: c, ath, athDate, dd: c / ath - 1 });
    }
    const x = linearScale([0, pts.length - 1], [M.left, M.left + PW]);
    const y = linearScale([-1, 0], [M.top + PH, M.top]);
    const xTicks: { i: number; label: string }[] = [];
    let lastYear = "";
    pts.forEach((p, i) => { const yr = p.d.slice(0, 4); if (yr !== lastYear) { xTicks.push({ i, label: yr }); lastYear = yr; } });
    const everyN = Math.ceil(xTicks.length / 9);
    const byDate = new Map(pts.map((p, i) => [p.d, i]));
    const floors = bears.filter((b) => b.ended && b.lowDate).map((b) => {
      // nearest sampled index to the low
      let i = byDate.get(b.lowDate as string);
      if (i === undefined) i = byDate.get(addDays(b.lowDate as string, 1));
      return i === undefined ? null : { i, b };
    }).filter((f): f is { i: number; b: BearMarket } => f !== null);
    return { pts, x, y, xTicks: xTicks.filter((_, k) => k % everyN === 0), floors };
  }, [daily, bears]);
  const { pts, x, y, xTicks, floors } = model;
  const last = pts[pts.length - 1];
  const daysSinceAth = Math.round((Date.parse(`${last.d}T00:00:00Z`) - Date.parse(`${last.athDate}T00:00:00Z`)) / 86_400_000);
  const ended = bears.filter((b) => b.ended);
  const avgDays = Math.round(ended.reduce((s, b) => s + b.days, 0) / ended.length);
  const avgDd = ended.reduce((s, b) => s + b.drawdown, 0) / ended.length;

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / PW) * (pts.length - 1));
    setHoverIdx(i < 0 || i >= pts.length ? null : i);
  }
  const h = hoverIdx === null ? null : pts[hoverIdx];
  const tipX = hoverIdx === null ? 0 : x(hoverIdx);
  const tipLeftSide = tipX > M.left + PW * 0.6;

  const line = pts.map((p, i) => [x(i), y(p.dd)] as [number, number]);
  const area = `${linePath(line)}L${x(pts.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;

  const tiles: { label: string; value: string; sub: string }[] = [
    { label: "Drawdown from ATH", value: fmtPct(last.dd), sub: `ATH ${fmtUsd(last.ath)} · ${fmtDate(last.athDate, { year: "numeric", month: "short", day: "numeric" })}` },
    { label: "Days since ATH", value: `${daysSinceAth}`, sub: `as of ${fmtDate(asOfDate, { month: "short", day: "numeric" })}` },
    { label: "Past bears · avg length", value: `${avgDays} days`, sub: ended.map((b) => b.days).join(" / ") },
    { label: "Past bears · avg floor", value: fmtPct(avgDd), sub: ended.map((b) => fmtPct(b.drawdown)).join(" / ") },
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-[#0f1724] px-3 py-2.5">
            <div className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">{t.label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-[#f2f6fb]">{t.value}</div>
            <div className="text-[11px] tabular-nums text-[#8695ac]">{t.sub}</div>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverIdx(null)}
        tabIndex={0} onFocus={() => setHoverIdx(pts.length - 1)} onBlur={() => setHoverIdx(null)}>
        <title id={`${uid}-title`}>
          Bitcoin drawdown from its all-time high since 2011. Currently {fmtPct(last.dd)} below the {fmtUsd(last.ath)} high,
          {" "}{daysSinceAth} days later. Past bear markets bottomed at {ended.map((b) => fmtPct(b.drawdown)).join(", ")}.
        </title>
        {linearTicks(-1, 0, 5).map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.textSecondary}>{Math.round(t * 100)}%</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.label} x={x(t.i)} y={M.top + PH + 18} textAnchor="middle" fontSize={11} fill={CHART.textSecondary}>{t.label}</text>
        ))}
        <path d={area} fill={RED} opacity={0.16} />
        <path d={linePath(line)} fill="none" stroke={RED} strokeWidth={1.5} strokeLinejoin="round" />
        <line x1={M.left} x2={M.left + PW} y1={y(0)} y2={y(0)} stroke={CHART.axis} strokeWidth={1} />

        {floors.map(({ i, b }) => (
          <g key={b.peakDate}>
            <circle cx={x(i)} cy={y(pts[i].dd)} r={5} fill={CHART.surface} />
            <circle cx={x(i)} cy={y(pts[i].dd)} r={3} fill={RED} />
            <text x={x(i)} y={y(pts[i].dd) + 16} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={CHART.textPrimary}>
              {fmtPct(b.drawdown)}
            </text>
            <text x={x(i)} y={y(pts[i].dd) + 28} textAnchor="middle" fontSize={10} fill={CHART.textSecondary}>
              {b.lowDate?.slice(0, 4)}
            </text>
          </g>
        ))}
        <circle cx={x(pts.length - 1)} cy={y(last.dd)} r={6} fill={CHART.surface} />
        <circle cx={x(pts.length - 1)} cy={y(last.dd)} r={4} fill={CHART.current} />

        {h && hoverIdx !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            <circle cx={tipX} cy={y(h.dd)} r={5.5} fill={CHART.surface} />
            <circle cx={tipX} cy={y(h.dd)} r={3.5} fill={RED} />
            <foreignObject x={tipLeftSide ? tipX - 196 : tipX + 10} y={M.top + 4} width={186} height={84}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">{fmtDate(h.d)}</div>
                <div className="flex justify-between"><span className="text-[#8695ac]">Drawdown</span><span className="font-semibold tabular-nums text-[#f2f6fb]">{fmtPct(h.dd, 1)}</span></div>
                <div className="flex justify-between"><span className="text-[#8695ac]">Close / ATH</span><span className="tabular-nums text-[#c7d0de]">{fmtUsd(h.close)} / {fmtUsd(h.ath)}</span></div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      <details className="mt-3 text-xs text-[#8695ac]">
        <summary className="cursor-pointer select-none hover:text-[#dfe7f1]">Bear markets (table)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left tabular-nums">
            <thead className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <tr>
                <th className="py-1 pr-3 font-medium">Peak</th>
                <th className="py-1 pr-3 font-medium">Low</th>
                <th className="py-1 pr-3 font-medium">Drawdown</th>
                <th className="py-1 pr-3 font-medium">Length</th>
              </tr>
            </thead>
            <tbody>
              {bears.map((b) => (
                <tr key={b.peakDate} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                  <td className="py-1.5 pr-3">{fmtDate(b.peakDate, { year: "numeric", month: "short" })} · {fmtUsd(b.peakPrice)}</td>
                  <td className="py-1.5 pr-3">{b.lowDate ? `${fmtDate(b.lowDate, { year: "numeric", month: "short" })} · ${fmtUsd(b.lowPrice)}` : `${fmtUsd(b.lowPrice)} so far`}</td>
                  <td className="py-1.5 pr-3">{fmtPct(b.drawdown)}{b.ended ? "" : " (to date)"}</td>
                  <td className="py-1.5 pr-3">{b.days} days{b.ended ? "" : " so far"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
