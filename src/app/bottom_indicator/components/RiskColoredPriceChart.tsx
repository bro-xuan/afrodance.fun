"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import { CHART, fmtDate, fmtUsd, linePath, linearScale, logScale, logTicks } from "../lib/chart";
import { PHASE_META, metaForPhase, phaseForScore } from "../lib/phase-meta";

/**
 * Cowen's "price color-coded by risk", using this page's own 0–100 cycle
 * score: weekly closes as dots tinted by the zone the score sat in that week
 * (green = historically cheap … red = historically expensive), over a faint
 * price line. Weeks where too few signals have history yet are left grey.
 */

export interface RiskPoint { d: string; close: number; score: number | null; count: number }

type Range = "4y" | "all";
const RANGE_WEEKS: Record<Range, number> = { "4y": 208, all: Infinity };
const W = 760, H = 360;
const M = { top: 20, right: 24, bottom: 36, left: 58 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const MIN_SIGNALS = 3;

export function RiskColoredPriceChart({ points, totalSignals }: { points: RiskPoint[]; totalSignals: number }) {
  const [range, setRange] = useState<Range>("4y");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId();

  const view = useMemo(() => {
    const n = Math.min(points.length, RANGE_WEEKS[range]);
    const slice = points.slice(points.length - n);
    const lo = Math.min(...slice.map((p) => p.close)), hi = Math.max(...slice.map((p) => p.close));
    const x = linearScale([0, slice.length - 1], [M.left, M.left + PW]);
    const y = logScale([lo / 1.15, hi * 1.15], [M.top + PH, M.top]);
    const yTicks = logTicks(lo / 1.15, hi * 1.15, Math.log10(hi / lo) > 2.5 ? [1] : [1, 2, 5]);
    const xTicks: { i: number; label: string }[] = [];
    let lastYear = "";
    slice.forEach((r, i) => { const yr = r.d.slice(0, 4); if (yr !== lastYear) { xTicks.push({ i, label: yr }); lastYear = yr; } });
    const everyN = Math.ceil(xTicks.length / 9);
    return { slice, x, y, yTicks, xTicks: xTicks.filter((_, k) => k % everyN === 0) };
  }, [points, range]);
  const { slice, x, y, yTicks, xTicks } = view;

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / PW) * (slice.length - 1));
    setHoverIdx(i < 0 || i >= slice.length ? null : i);
  }
  const h = hoverIdx === null ? null : slice[hoverIdx];
  const tipX = hoverIdx === null ? 0 : x(hoverIdx);
  const tipLeftSide = tipX > M.left + PW * 0.6;
  const colorOf = (p: RiskPoint) => (p.score === null || p.count < MIN_SIGNALS ? CHART.textMuted : metaForPhase(phaseForScore(p.score)).hex);
  const last = slice[slice.length - 1];
  const covered = points.filter((p) => p.score !== null && p.count >= MIN_SIGNALS);
  const firstCovered = covered[0]?.d ?? null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[#0f1724] p-1" role="tablist" aria-label="Time range">
          {(["4y", "all"] as Range[]).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHoverIdx(null); }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                range === r ? "bg-[#1e2939] text-[#f2f6fb]" : "text-[#8695ac] hover:text-[#dfe7f1]"}`}>{r}</button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#aab6c9]" aria-label="Legend">
          {PHASE_META.map((z) => (
            <li key={z.phase} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: z.hex }} />
              {z.label} <span className="text-[#5c6a83]">{z.min}–{z.max}</span>
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART.textMuted }} />
            &lt;{MIN_SIGNALS} signals
          </li>
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-labelledby={`${uid}-title`} onPointerMove={onMove} onPointerLeave={() => setHoverIdx(null)}
        tabIndex={0} onFocus={() => setHoverIdx(slice.length - 1)} onBlur={() => setHoverIdx(null)}>
        <title id={`${uid}-title`}>
          Weekly Bitcoin price, each week colored by the page&apos;s 0–100 cycle score at the time.
          {last.score !== null ? ` Latest score ${last.score} (${metaForPhase(phaseForScore(last.score)).label}).` : ""}
        </title>
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

        <path d={linePath(slice.map((p, i) => [x(i), y(p.close)]))} fill="none" stroke={CHART.textMuted} strokeWidth={1} opacity={0.6} />
        {slice.map((p, i) => (
          <circle key={p.d} cx={x(i)} cy={y(p.close)} r={range === "all" ? 2.6 : 3.4} fill={colorOf(p)} />
        ))}

        {h && hoverIdx !== null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={M.top} y2={M.top + PH} stroke={CHART.textSecondary} strokeWidth={1} />
            <circle cx={tipX} cy={y(h.close)} r={6.5} fill={CHART.surface} />
            <circle cx={tipX} cy={y(h.close)} r={4.5} fill={colorOf(h)} />
            <foreignObject x={tipLeftSide ? tipX - 196 : tipX + 10} y={M.top + 4} width={186} height={96}>
              <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0f1724]/95 px-3 py-2 text-[11.5px] leading-snug shadow-lg">
                <div className="mb-1 font-semibold text-[#dfe7f1]">week of {fmtDate(h.d)}</div>
                <div className="flex justify-between"><span className="text-[#8695ac]">Close</span><span className="font-semibold tabular-nums text-[#f2f6fb]">{fmtUsd(h.close)}</span></div>
                <div className="flex justify-between"><span className="text-[#8695ac]">Score</span>
                  <span className="font-semibold tabular-nums text-[#f2f6fb]">
                    {h.score === null ? "—" : `${h.score} · ${metaForPhase(phaseForScore(h.score)).label}`}
                  </span></div>
                <div className="text-[#5c6a83]">{h.count} of {totalSignals} signals had history</div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      <p className="mt-3 text-[13px] leading-relaxed text-[#8695ac]">
        Each week is scored exactly as the gauge scores today — every two-sided signal ranked against its full
        history, then averaged — using whichever signals had data that week
        {firstCovered ? <> (≥{MIN_SIGNALS} signals from {fmtDate(firstCovered, { year: "numeric", month: "short" })})</> : null}.
        The on-chain feed&apos;s free tier only serves ~4 years of history, so before mid-2022 only the price-derived
        signals exist and the dots stay grey; coverage from there on fills in as the daily refresh rotates through the registry.
      </p>
    </div>
  );
}
