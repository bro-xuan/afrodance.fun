"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import type { BandRow } from "../types";
import {
  CHART, bandPath, fmtDate, fmtPct, fmtUsd, linePath, logScale, logTicks, linearScale,
} from "../lib/chart";

/**
 * Weekly BTC close (log) with Cowen's two moving-average structures:
 *  - the 20-week SMA / 21-week EMA band — "Bull Market Support Band" when price
 *    rides above it, "Bear Market Resistance Band" when price is capped below it;
 *  - the 200-week SMA — the line every macro bottom has touched or dipped under.
 * Being squeezed between the two is the setup Cowen flags for a cycle low.
 */

type Range = "2y" | "4y" | "all";
const RANGE_WEEKS: Record<Range, number> = { "2y": 104, "4y": 208, all: Infinity };

const W = 760, H = 360;
const M = { top: 20, right: 70, bottom: 36, left: 58 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

interface Props { rows: BandRow[]; asOfDate: string }

export function BandsChart({ rows, asOfDate }: Props) {
  const [range, setRange] = useState<Range>("4y");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId();

  const view = useMemo(() => {
    const n = Math.min(rows.length, RANGE_WEEKS[range]);
    const slice = rows.slice(rows.length - n);
    const vals = slice.flatMap((r) => [r[1], r[2], r[3], r[4]].filter((v): v is number => v !== null));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const x = linearScale([0, slice.length - 1], [M.left, M.left + PW]);
    const y = logScale([lo / 1.15, hi * 1.15], [M.top + PH, M.top]);
    const yTicks = logTicks(lo / 1.15, hi * 1.15, range === "all" ? [1] : [1, 2, 3, 5, 7]);
    // year (or half-year) tick at the first week of each year in view
    const xTicks: { i: number; label: string }[] = [];
    let lastYear = "";
    slice.forEach((r, i) => {
      const yr = r[0].slice(0, 4);
      if (yr !== lastYear) { xTicks.push({ i, label: yr }); lastYear = yr; }
    });
    const xy = (col: 1 | 2 | 3 | 4) => slice.map((r, i) => (r[col] === null ? null : [x(i), y(r[col] as number)] as [number, number]));
    return { slice, x, y, yTicks, xTicks, close: xy(1), sma20: xy(2), ema21: xy(3), sma200: xy(4) };
  }, [rows, range]);

  const { slice, x, y, yTicks, xTicks } = view;
  const last = slice[slice.length - 1];

  // Band edges: upper = max(sma20, ema21), lower = min — so the fill is the band.
  const upper = slice.map((r, i) => (r[2] === null || r[3] === null ? null : [x(i), y(Math.max(r[2], r[3]))] as [number, number]));
  const lower = slice.map((r, i) => (r[2] === null || r[3] === null ? null : [x(i), y(Math.min(r[2], r[3]))] as [number, number]));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / PW) * (slice.length - 1));
    setHoverIdx(i < 0 || i >= slice.length ? null : i);
  }

  const h = hoverIdx === null ? null : slice[hoverIdx];
  const tipX = hoverIdx === null ? 0 : x(hoverIdx);
  const tipLeftSide = tipX > M.left + PW * 0.6;

  // Current regime, in words.
  const bandLo = last[2] !== null && last[3] !== null ? Math.min(last[2], last[3]) : null;
  const bandHi = last[2] !== null && last[3] !== null ? Math.max(last[2], last[3]) : null;
  const regime = bandLo === null || bandHi === null ? null
    : last[1] > bandHi ? "above the band (Bull Market Support Band)"
    : last[1] < bandLo ? "below the band (Bear Market Resistance Band)"
    : "inside the band";
  const vs200 = last[4] === null ? null : last[1] / last[4] - 1;

  // Right-edge labels: sort by pixel y and push apart to >= 13px so none overlap.
  const edgeLabels = (() => {
    const items = [
      last[1] !== null ? { label: "BTC", value: last[1], color: CHART.textPrimary, weight: 600 } : null,
      bandHi !== null ? { label: "band", value: bandHi, color: CHART.textSecondary, weight: 400 } : null,
      last[4] !== null ? { label: "200W", value: last[4], color: CHART.textSecondary, weight: 600 } : null,
    ].filter((v): v is NonNullable<typeof v> => v !== null)
      .map((l) => ({ ...l, y: y(l.value), ly: y(l.value) }))
      .sort((a, b) => a.y - b.y);
    const GAP = 13;
    for (let i = 1; i < items.length; i++) items[i].ly = Math.max(items[i].ly, items[i - 1].ly + GAP);
    for (let i = items.length - 2; i >= 0; i--) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - GAP);
    return items;
  })();

  const LINES = [
    { key: "close", label: "Weekly close", color: CHART.current, width: 2.25 },
    { key: "band", label: "20W SMA / 21W EMA band", color: CHART.series[1], width: 1.5 },
    { key: "sma200", label: "200W SMA", color: CHART.series[0], width: 2 },
  ] as const;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[#0f1724] p-1" role="tablist" aria-label="Time range">
          {(["2y", "4y", "all"] as Range[]).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                range === r ? "bg-[#1e2939] text-[#f2f6fb]" : "text-[#8695ac] hover:text-[#dfe7f1]"}`}>
              {r}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#aab6c9]" aria-label="Legend">
          {LINES.map((l) => (
            <li key={l.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block w-4 rounded" style={{ background: l.color, height: l.width }} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverIdx(null)}
        tabIndex={0} onFocus={() => setHoverIdx(slice.length - 1)} onBlur={() => setHoverIdx(null)}>
        <title id={`${uid}-title`}>
          Weekly Bitcoin price with the 20-week SMA / 21-week EMA band and the 200-week SMA.
          {regime ? ` Latest close ${fmtUsd(last[1])} is ${regime}` : ""}
          {vs200 !== null ? `, ${fmtPct(vs200)} versus the 200-week SMA at ${fmtUsd(last[4] as number)}.` : "."}
        </title>
        <defs>
          <clipPath id={`${uid}-clip`}><rect x={M.left} y={M.top} width={PW} height={PH} /></clipPath>
        </defs>

        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.textSecondary}>{fmtUsd(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.label} x={x(t.i)} y={M.top + PH + 18} textAnchor="middle" fontSize={11} fill={CHART.textSecondary}>
            {t.label}
          </text>
        ))}
        <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} stroke={CHART.axis} strokeWidth={1} />

        <g clipPath={`url(#${uid}-clip)`}>
          <path d={bandPath(upper, lower)} fill={CHART.series[1]} opacity={0.22} />
          <path d={linePath(view.sma20)} fill="none" stroke={CHART.series[1]} strokeWidth={1.25} opacity={0.9} />
          <path d={linePath(view.ema21)} fill="none" stroke={CHART.series[1]} strokeWidth={1.25} opacity={0.9} />
          <path d={linePath(view.sma200)} fill="none" stroke={CHART.series[0]} strokeWidth={2} strokeLinejoin="round" />
          <path d={linePath(view.close)} fill="none" stroke={CHART.current} strokeWidth={2.25} strokeLinejoin="round" />
        </g>

        {/* direct labels at the right edge — de-overlapped, leader line when nudged */}
        {edgeLabels.map((l) => (
          <g key={l.label}>
            {Math.abs(l.ly - l.y) > 2 && (
              <line x1={M.left + PW + 2} x2={M.left + PW + 7} y1={l.y} y2={l.ly} stroke={CHART.textMuted} strokeWidth={1} />
            )}
            <text x={M.left + PW + 8} y={l.ly + 4} fontSize={11} fontWeight={l.weight} fill={l.color}>
              {l.label} {fmtUsd(l.value)}
            </text>
          </g>
        ))}

        {/* end marker with surface ring */}
        <circle cx={x(slice.length - 1)} cy={y(last[1])} r={6} fill={CHART.surface} />
        <circle cx={x(slice.length - 1)} cy={y(last[1])} r={4} fill={CHART.current} />

        {h && hoverIdx !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            <circle cx={tipX} cy={y(h[1])} r={5.5} fill={CHART.surface} />
            <circle cx={tipX} cy={y(h[1])} r={3.5} fill={CHART.current} />
            <foreignObject x={tipLeftSide ? tipX - 206 : tipX + 10} y={M.top + 4} width={196} height={150}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">week of {fmtDate(h[0])}</div>
                {([
                  ["Close", h[1], CHART.current],
                  ["20W SMA", h[2], CHART.series[1]],
                  ["21W EMA", h[3], CHART.series[1]],
                  ["200W SMA", h[4], CHART.series[0]],
                ] as const).map(([label, v, color]) => (
                  <div key={label} className="flex items-center gap-2 py-0.5">
                    <span aria-hidden className="inline-block w-3 rounded" style={{ height: 2, background: color }} />
                    <span className="text-[#8695ac]">{label}</span>
                    <span className="ml-auto font-semibold tabular-nums text-[#f2f6fb]">{v === null ? "—" : fmtUsd(v)}</span>
                  </div>
                ))}
                {h[4] !== null && (
                  <div className="mt-1 text-[#5c6a83]">close vs 200W: {fmtPct(h[1] / h[4] - 1)}</div>
                )}
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      {regime && (
        <p className="mt-3 text-[13px] leading-relaxed text-[#8695ac]">
          Latest weekly close <span className="tabular-nums text-[#c7d0de]">{fmtUsd(last[1])}</span> is{" "}
          <span className="text-[#c7d0de]">{regime}</span>
          {bandLo !== null && bandHi !== null && (
            <> at <span className="tabular-nums text-[#c7d0de]">{fmtUsd(bandLo)}–{fmtUsd(bandHi)}</span></>
          )}
          {vs200 !== null && (
            <>, and <span className="tabular-nums text-[#c7d0de]">{fmtPct(vs200)}</span> versus the 200-week SMA at{" "}
            <span className="tabular-nums text-[#c7d0de]">{fmtUsd(last[4] as number)}</span></>
          )}
          . Every prior macro bottom closed at or below the 200-week SMA.
        </p>
      )}

      <details className="mt-3 text-xs text-[#8695ac]">
        <summary className="cursor-pointer select-none hover:text-[#dfe7f1]">Last 12 weeks (table)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left tabular-nums">
            <thead className="text-[10.5px] uppercase tracking-wider text-[#5c6a83]">
              <tr>
                <th className="py-1 pr-3 font-medium">Week end</th>
                <th className="py-1 pr-3 font-medium">Close</th>
                <th className="py-1 pr-3 font-medium">20W SMA</th>
                <th className="py-1 pr-3 font-medium">21W EMA</th>
                <th className="py-1 pr-3 font-medium">200W SMA</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(-12).reverse().map((r) => (
                <tr key={r[0]} className="border-t border-[rgba(255,255,255,0.06)] text-[#c7d0de]">
                  <td className="py-1.5 pr-3">{fmtDate(r[0])}</td>
                  {[r[1], r[2], r[3], r[4]].map((v, i) => (
                    <td key={i} className="py-1.5 pr-3">{v === null ? "—" : fmtUsd(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[#5c6a83]">Weekly closes (Mon–Sun) · as of {fmtDate(asOfDate)}.</p>
        </div>
      </details>
    </div>
  );
}
