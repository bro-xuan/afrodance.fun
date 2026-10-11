"use client";

import { useMemo, useState } from "react";
import { C, price, usd } from "../lib/format";
import { useWidth } from "../lib/hooks";
import type { LiqBin } from "../lib/types";
import { Tip } from "./charts";

const AXIS = { fontSize: "0.8rem", fill: C.muted, fontFamily: "var(--font-mi-mono)" } as const;

/**
 * Liquidation map: x = price, bar height = estimated liquidation notional in
 * that price bin. Longs liquidate below spot, shorts above — position on the
 * axis is the redundant (non-color) encoding of side.
 */
export function LiqMapChart({ bins, spot, binSize, height = 300 }: { bins: LiqBin[]; spot: number; binSize: number; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 0, r: 0, t: 34, b: 24 };

  const geo = useMemo(() => {
    if (!bins.length || !w) return null;
    const lo = bins[0].price;
    const hi = bins[bins.length - 1].price + binSize;
    const x = (p: number) => ((p - lo) / (hi - lo)) * (w - pad.l - pad.r) + pad.l;
    const m = Math.max(1, ...bins.map((b) => b.longUsd + b.shortUsd));
    const y = (v: number) => height - pad.b - (v / m) * (height - pad.t - pad.b);
    const bw = Math.max(1, x(lo + binSize) - x(lo) - 1);
    // Label the two biggest clusters on each side.
    // Labels need ~90px clearance from each other and from the spot pill.
    const minGap = Math.max(6, Math.ceil(90 / Math.max(1, bw + 1)));
    const top = (side: "longUsd" | "shortUsd") => {
      const picked: LiqBin[] = [];
      for (const b of [...bins].filter((b) => b[side] > 0).sort((a, b) => b[side] - a[side])) {
        if (picked.length === 2) break;
        const far = picked.every((p) => Math.abs(p.price - b.price) / binSize >= minGap);
        if (far && Math.abs(x(b.price) - x(spot)) > 60) picked.push(b);
      }
      return picked;
    };
    const ticks: number[] = [];
    const step = binSize * Math.ceil((hi - lo) / binSize / 6 / 4) * 4;
    for (let p = Math.ceil(lo / step) * step; p < hi; p += step) ticks.push(p);
    return { x, y, bw, m, ticks, peaks: [...top("longUsd"), ...top("shortUsd")] };
  }, [bins, w, height, binSize, spot, pad.l, pad.r, pad.t, pad.b]);

  const hb = hover !== null ? bins[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <div className="mi-num absolute right-0 top-0 text-[0.8rem]" style={{ color: C.muted }}>
          tallest bar {usd(geo.m, 0)}
        </div>
      )}
      {geo && (
        <svg width={w} height={height} className="block" onMouseLeave={() => setHover(null)}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={w} y1={geo.y(geo.m * f)} y2={geo.y(geo.m * f)} stroke={C.grid} />
          ))}

          {bins.map((b, i) => {
            const x = geo.x(b.price);
            const yl = geo.y(b.longUsd);
            const ys = geo.y(b.longUsd + b.shortUsd);
            const base = height - pad.b;
            const dim = hover !== null && hover !== i ? 0.4 : 1;
            return (
              <g key={b.price} onMouseEnter={() => setHover(i)}>
                <rect x={x} y={pad.t} width={geo.bw + 1} height={base - pad.t} fill="transparent" />
                {b.longUsd > 0 && <rect x={x} y={yl} width={geo.bw} height={base - yl} fill={C.long} opacity={dim} rx={Math.min(2, geo.bw / 2)} />}
                {b.shortUsd > 0 && <rect x={x} y={ys} width={geo.bw} height={yl - ys - (b.longUsd > 0 ? 1 : 0)} fill={C.short} opacity={dim} rx={Math.min(2, geo.bw / 2)} />}
              </g>
            );
          })}

          {/* spot */}
          <line x1={geo.x(spot)} x2={geo.x(spot)} y1={14} y2={height - pad.b} stroke={C.ink} strokeWidth={1.5} />
          <rect x={geo.x(spot) - 44} y={0} width={88} height={20} rx={10} fill={C.ink} />
          <text x={geo.x(spot)} y={14} textAnchor="middle" style={{ ...AXIS, fill: "#fff", fontWeight: 600 }}>{price(spot)}</text>

          {geo.peaks.map((b) => {
            const v = b.longUsd + b.shortUsd;
            const cx = geo.x(b.price) + geo.bw / 2;
            return (
              <text key={`pk-${b.price}`} x={cx} y={geo.y(v) - 6} textAnchor="middle" style={{ ...AXIS, fill: C.ink2, fontWeight: 600 }}>
                {price(b.price)}
              </text>
            );
          })}

          <line x1={0} x2={w} y1={height - pad.b} y2={height - pad.b} stroke={C.line} />
          {geo.ticks.map((p) => (
            <text key={p} x={geo.x(p)} y={height - 6} textAnchor="middle" style={AXIS}>
              {`${(p / 1000).toFixed(p % 1000 ? 1 : 0)}k`}
            </text>
          ))}
        </svg>
      )}
      {geo && hb && (
        <Tip x={geo.x(hb.price)} y={pad.t} w={w}>
          <div className="font-semibold">{price(hb.price)} to {price(hb.price + binSize)}</div>
          <div style={{ color: C.muted }}>{(((hb.price + binSize / 2) / spot - 1) * 100).toFixed(1)}% from spot</div>
          {hb.longUsd > 0 && (
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: C.long }} />Long liqs</span>
              <span className="font-mono">{usd(hb.longUsd)}</span>
            </div>
          )}
          {hb.shortUsd > 0 && (
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: C.short }} />Short liqs</span>
              <span className="font-mono">{usd(hb.shortUsd)}</span>
            </div>
          )}
          {hb.longUsd + hb.shortUsd === 0 && <div style={{ color: C.muted }}>No modelled liquidations</div>}
        </Tip>
      )}
    </div>
  );
}
