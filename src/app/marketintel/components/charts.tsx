"use client";

import { useMemo, useState, type ReactNode } from "react";
import { C } from "../lib/format";
import { useWidth } from "../lib/hooks";

/**
 * Hand-rolled SVG charts. Mark specs follow the dataviz rules: hairline
 * recessive grid, 2px lines, 2px surface gaps between bars, one y-axis per
 * chart, and a hover layer (crosshair + tooltip) on every plot.
 */

const AXIS = { fontSize: "0.8rem", fill: C.muted, fontFamily: "var(--font-mi-mono)" } as const;

const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

function niceTicks(lo: number, hi: number, n = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

export function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = x > w * 0.6;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[9rem] rounded-md border bg-white/95 px-2.5 py-1.5 text-[0.8rem] leading-snug shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur"
      style={{ borderColor: C.line, top: Math.max(0, y), ...(left ? { right: w - x + 12 } : { left: x + 12 }) }}
    >
      {children}
    </div>
  );
}

// ── Line (sparklines, price) ───────────────────────────────────────────────
export function LineChart({
  data, height = 56, color = C.ink, fmt, fmtT, axis = false, area = true, refLine,
}: {
  data: { t: number; v: number }[];
  height?: number;
  color?: string;
  fmt: (v: number) => string;
  fmtT?: (t: number) => string;
  axis?: boolean;
  area?: boolean;
  refLine?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: axis ? 4 : 0, r: axis ? 76 : 0, t: 6, b: axis ? 20 : 4 };
  const geo = useMemo(() => {
    if (!data.length || !w) return null;
    const vs = data.map((d) => d.v).concat(refLine ?? []);
    let lo = Math.min(...vs);
    let hi = Math.max(...vs);
    const padV = (hi - lo || Math.abs(hi) || 1) * 0.08;
    lo -= padV;
    hi += padV;
    const x = scale(data[0].t, data[data.length - 1].t, pad.l, w - pad.r);
    const y = scale(lo, hi, height - pad.b, pad.t);
    const line = data.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`).join("");
    return { x, y, line, lo, hi };
  }, [data, w, height, pad.l, pad.r, pad.t, pad.b, refLine]);

  const tf = fmtT ?? ((t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
  const h = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg
          width={w}
          height={height}
          className="block overflow-visible"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const mx = e.clientX - r.left;
            let best = 0;
            data.forEach((d, i) => Math.abs(geo.x(d.t) - mx) < Math.abs(geo.x(data[best].t) - mx) && (best = i));
            setHover(best);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {axis &&
            niceTicks(geo.lo, geo.hi, 4).map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={w - pad.r} y1={geo.y(v)} y2={geo.y(v)} stroke={C.grid} />
                <text x={w - pad.r + 6} y={geo.y(v) + 4} style={AXIS}>{fmt(v)}</text>
              </g>
            ))}
          {refLine !== undefined && (
            <line x1={pad.l} x2={w - pad.r} y1={geo.y(refLine)} y2={geo.y(refLine)} stroke={C.neutral} strokeWidth={1} />
          )}
          {area && (
            <path
              d={`${geo.line}L${geo.x(data[data.length - 1].t)},${height - pad.b}L${geo.x(data[0].t)},${height - pad.b}Z`}
              fill={color}
              opacity={0.07}
            />
          )}
          <path d={geo.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {axis && (
            <>
              <text x={pad.l} y={height - 4} style={AXIS}>{tf(data[0].t)}</text>
              <text x={w - pad.r} y={height - 4} textAnchor="end" style={AXIS}>{tf(data[data.length - 1].t)}</text>
            </>
          )}
          {h && (
            <>
              <line x1={geo.x(h.t)} x2={geo.x(h.t)} y1={pad.t} y2={height - pad.b} stroke={C.ink} strokeOpacity={0.25} />
              <circle cx={geo.x(h.t)} cy={geo.y(h.v)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {geo && h && (
        <Tip x={geo.x(h.t)} y={0} w={w}>
          <div className="text-[0.8rem]" style={{ color: C.muted }}>{tf(h.t)}</div>
          <div className="font-mono font-semibold tabular-nums">{fmt(h.v)}</div>
        </Tip>
      )}
    </div>
  );
}

// ── Flow bars with a price line above, shared x ────────────────────────────
/**
 * Two stacked bands on one time axis: BTC price as a line on top, daily flows
 * as diverging bars below. Each band keeps its own single y-scale (no dual
 * axis), and one hover column highlights the same day in both.
 */
export function BarsWithPrice({
  items, priceH = 120, barH = 220, fmt, fmtPrice, renderTip,
}: {
  items: { key: string; label: string; v: number; price: number | null }[];
  priceH?: number;
  barH?: number;
  fmt: (v: number) => string;
  fmtPrice: (v: number) => string;
  renderTip: (i: number) => ReactNode;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gap = 18;
  const height = priceH + gap + barH;
  const pad = { r: 64, t: 8, b: 22 };
  const geo = useMemo(() => {
    if (!items.length || !w) return null;
    const slot = (w - pad.r) / items.length;
    const ps = items.map((d) => d.price).filter((p): p is number => p !== null);
    const plo = Math.min(...ps);
    const phi = Math.max(...ps);
    const padP = (phi - plo) * 0.08 || phi * 0.01;
    const py = scale(plo - padP, phi + padP, priceH, pad.t);
    const m = Math.max(1, ...items.map((d) => Math.abs(d.v)));
    const top = priceH + gap;
    const y = scale(-m * 1.05, m * 1.05, height - pad.b, top);
    const cx = (i: number) => (i + 0.5) * slot;
    const line = items
      .map((d, i) => (d.price === null ? null : `${cx(i).toFixed(1)},${py(d.price).toFixed(1)}`))
      .filter(Boolean)
      .join(" L");
    return { slot, py, plo, phi, y, m, top, cx, line, hasPrice: ps.length > 1 };
  }, [items, w, priceH, height, pad.t, pad.b, pad.r]);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg width={w} height={height} className="block" onMouseLeave={() => setHover(null)}>
          {/* price band */}
          {geo.hasPrice && (
            <>
              {niceTicks(geo.plo, geo.phi, 3).map((v) => (
                <g key={`p${v}`}>
                  <line x1={0} x2={w - pad.r} y1={geo.py(v)} y2={geo.py(v)} stroke={C.grid} />
                  <text x={w - pad.r + 6} y={geo.py(v) + 4} style={AXIS}>{fmtPrice(v)}</text>
                </g>
              ))}
              <path d={`M${geo.line}`} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
            </>
          )}
          {/* flow band */}
          {niceTicks(-geo.m, geo.m, 4).map((v) => (
            <g key={`f${v}`}>
              <line x1={0} x2={w - pad.r} y1={geo.y(v)} y2={geo.y(v)} stroke={v === 0 ? C.neutral : C.grid} />
              <text x={w - pad.r + 6} y={geo.y(v) + 4} style={AXIS}>{fmt(v)}</text>
            </g>
          ))}
          {items.map((d, i) => {
            const bw = Math.max(2, geo.slot - 2);
            const x = i * geo.slot + 1;
            const y0 = geo.y(0);
            const y1 = geo.y(d.v);
            const top = Math.min(y0, y1);
            const hgt = Math.max(1, Math.abs(y1 - y0));
            const r = Math.min(4, bw / 2, hgt);
            const path =
              d.v >= 0
                ? `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${y0}Z`
                : `M${x},${y0}V${top + hgt - r}Q${x},${top + hgt} ${x + r},${top + hgt}H${x + bw - r}Q${x + bw},${top + hgt} ${x + bw},${top + hgt - r}V${y0}Z`;
            return <path key={d.key} d={path} fill={d.v >= 0 ? C.long : C.short} opacity={hover === null || hover === i ? 1 : 0.45} />;
          })}
          {hover !== null && (
            <>
              <line x1={geo.cx(hover)} x2={geo.cx(hover)} y1={pad.t} y2={height - pad.b} stroke={C.neutral} strokeDasharray="3 3" />
              {items[hover].price !== null && (
                <circle cx={geo.cx(hover)} cy={geo.py(items[hover].price!)} r={4} fill={C.ink} stroke="#fff" strokeWidth={2} />
              )}
            </>
          )}
          {/* hit targets span both bands */}
          {items.map((d, i) => (
            <rect key={`h${d.key}`} x={i * geo.slot} y={0} width={geo.slot} height={height - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
          <text x={0} y={height - 5} style={AXIS}>{items[0].label}</text>
          <text x={w - pad.r} y={height - 5} textAnchor="end" style={AXIS}>{items[items.length - 1].label}</text>
        </svg>
      )}
      {geo && hover !== null && (
        <Tip x={geo.cx(hover)} y={0} w={w}>
          {renderTip(hover)}
        </Tip>
      )}
    </div>
  );
}
