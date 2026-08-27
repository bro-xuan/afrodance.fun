"use client";

import { useId, useMemo, useState, type PointerEvent, type ReactNode } from "react";
import { CHART, bandPath, fmtDate, fmtUsd, linePath, linearScale, logScale, logTicks, spreadLabels } from "../lib/chart";

/**
 * Generic "price plus model lines" chart on a log y-axis over time: weekly
 * rows, N named lines, optional fills between two lines, range toggle,
 * crosshair tooltip listing every line, and de-overlapped right-edge labels.
 * Powers the log-regression and 2-year-MA (Investor Tool) charts.
 */

export interface LineSpec {
  /** index into row.values */
  idx: number;
  label: string;
  color: string;
  width?: number;
  opacity?: number;
  /** show a right-edge label for this line */
  edge?: boolean;
  /** shorter text for the edge label */
  short?: string;
}

export interface FillSpec { upper: number; lower: number; color: string; opacity?: number }

export interface PriceRow { d: string; values: (number | null)[] }

type Range = "2y" | "4y" | "all";
const RANGE_WEEKS: Record<Range, number> = { "2y": 104, "4y": 208, all: Infinity };

const W = 760, H = 360;
const M = { top: 20, right: 92, bottom: 36, left: 58 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

interface Props {
  rows: PriceRow[];
  lines: LineSpec[];
  fills?: FillSpec[];
  defaultRange?: Range;
  title: string;
  /** rendered below the plot (regime sentence etc.) */
  footer?: ReactNode;
  /** optional summary block inside the table <details> */
  tableNote?: ReactNode;
}

export function PriceLinesChart({ rows, lines, fills = [], defaultRange = "4y", title, footer, tableNote }: Props) {
  const [range, setRange] = useState<Range>(defaultRange);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId();

  const view = useMemo(() => {
    const n = Math.min(rows.length, RANGE_WEEKS[range]);
    const slice = rows.slice(rows.length - n);
    const shown = new Set(lines.map((l) => l.idx));
    const vals = slice.flatMap((r) => r.values.filter((v, i): v is number => v !== null && shown.has(i)));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const x = linearScale([0, slice.length - 1], [M.left, M.left + PW]);
    const y = logScale([lo / 1.15, hi * 1.15], [M.top + PH, M.top]);
    const decades = Math.log10(hi / lo);
    const yTicks = logTicks(lo / 1.15, hi * 1.15, decades > 2.5 ? [1] : decades > 1.2 ? [1, 2, 5] : [1, 2, 3, 5, 7]);
    const xTicks: { i: number; label: string }[] = [];
    let lastYear = "";
    slice.forEach((r, i) => {
      const yr = r.d.slice(0, 4);
      if (yr !== lastYear) { xTicks.push({ i, label: yr }); lastYear = yr; }
    });
    const everyN = Math.ceil(xTicks.length / 9);
    const pts = (idx: number) => slice.map((r, i) => (r.values[idx] === null ? null : [x(i), y(r.values[idx] as number)] as [number, number]));
    return { slice, x, y, yTicks, xTicks: xTicks.filter((_, k) => k % everyN === 0), pts };
  }, [rows, lines, range]);

  const { slice, x, y, yTicks, xTicks, pts } = view;
  const last = slice[slice.length - 1];

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / PW) * (slice.length - 1));
    setHoverIdx(i < 0 || i >= slice.length ? null : i);
  }
  const h = hoverIdx === null ? null : slice[hoverIdx];
  const tipX = hoverIdx === null ? 0 : x(hoverIdx);
  const tipLeftSide = tipX > M.left + PW * 0.6;

  const edge = lines.filter((l) => l.edge && last.values[l.idx] !== null);
  const edgeYs = spreadLabels(edge.map((l) => y(last.values[l.idx] as number)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[#0f1724] p-1" role="tablist" aria-label="Time range">
          {(["2y", "4y", "all"] as Range[]).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHoverIdx(null); }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                range === r ? "bg-[#1e2939] text-[#f2f6fb]" : "text-[#8695ac] hover:text-[#dfe7f1]"}`}>
              {r}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#aab6c9]" aria-label="Legend">
          {lines.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block w-4 rounded" style={{ background: l.color, height: l.width ?? 2 }} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverIdx(null)}
        tabIndex={0} onFocus={() => setHoverIdx(slice.length - 1)} onBlur={() => setHoverIdx(null)}>
        <title id={`${uid}-title`}>{title}</title>
        <defs><clipPath id={`${uid}-clip`}><rect x={M.left} y={M.top} width={PW} height={PH} /></clipPath></defs>

        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.textSecondary}>{fmtUsd(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.label} x={x(t.i)} y={M.top + PH + 18} textAnchor="middle" fontSize={11} fill={CHART.textSecondary}>{t.label}</text>
        ))}
        <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} stroke={CHART.axis} strokeWidth={1} />

        <g clipPath={`url(#${uid}-clip)`}>
          {fills.map((f, k) => (
            <path key={`f${k}`} d={bandPath(pts(f.upper), pts(f.lower))} fill={f.color} opacity={f.opacity ?? 0.18} />
          ))}
          {lines.map((l) => (
            <path key={l.label} d={linePath(pts(l.idx))} fill="none" stroke={l.color} strokeWidth={l.width ?? 2}
              opacity={l.opacity ?? 1} strokeLinejoin="round" />
          ))}
        </g>

        {edge.map((l, k) => {
          const ty = y(last.values[l.idx] as number);
          return (
            <g key={l.label}>
              {Math.abs(edgeYs[k] - ty) > 2 && (
                <line x1={M.left + PW + 2} x2={M.left + PW + 7} y1={ty} y2={edgeYs[k]} stroke={CHART.textMuted} strokeWidth={1} />
              )}
              <text x={M.left + PW + 8} y={edgeYs[k] + 4} fontSize={11} fontWeight={l.idx === 0 ? 600 : 400}
                fill={l.idx === 0 ? CHART.textPrimary : CHART.textSecondary}>
                {l.short ?? l.label} {fmtUsd(last.values[l.idx] as number)}
              </text>
            </g>
          );
        })}

        <circle cx={x(slice.length - 1)} cy={y(last.values[0] as number)} r={6} fill={CHART.surface} />
        <circle cx={x(slice.length - 1)} cy={y(last.values[0] as number)} r={4} fill={CHART.current} />

        {h && hoverIdx !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            {h.values[0] !== null && (
              <>
                <circle cx={tipX} cy={y(h.values[0])} r={5.5} fill={CHART.surface} />
                <circle cx={tipX} cy={y(h.values[0])} r={3.5} fill={CHART.current} />
              </>
            )}
            <foreignObject x={tipLeftSide ? tipX - 216 : tipX + 10} y={M.top + 4} width={206} height={Math.min(PH - 8, 40 + lines.length * 18)}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">week of {fmtDate(h.d)}</div>
                {lines.map((l) => (
                  <div key={l.label} className="flex items-center gap-2 py-0.5">
                    <span aria-hidden className="inline-block w-3 rounded" style={{ height: 2, background: l.color }} />
                    <span className="text-[#8695ac]">{l.short ?? l.label}</span>
                    <span className="ml-auto font-semibold tabular-nums text-[#f2f6fb]">
                      {h.values[l.idx] === null ? "—" : fmtUsd(h.values[l.idx] as number)}
                    </span>
                  </div>
                ))}
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      {footer}

      <details className="mt-3 text-xs text-[#8695ac]">
        <summary className="cursor-pointer select-none hover:text-[#dfe7f1]">Last 12 weeks (table)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left tabular-nums">
            <thead className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <tr>
                <th className="py-1 pr-3 font-medium">Week end</th>
                {lines.map((l) => <th key={l.label} className="py-1 pr-3 font-medium">{l.short ?? l.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(-12).reverse().map((r) => (
                <tr key={r.d} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                  <td className="py-1.5 pr-3">{fmtDate(r.d)}</td>
                  {lines.map((l) => (
                    <td key={l.label} className="py-1.5 pr-3">{r.values[l.idx] === null ? "—" : fmtUsd(r.values[l.idx] as number)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {tableNote}
        </div>
      </details>
    </div>
  );
}
