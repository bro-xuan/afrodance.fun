"use client";

import { useMemo, useState } from "react";
import { C, countdown, pct, price } from "../lib/format";
import { useWidth } from "../lib/hooks";
import { HORIZONS, type Horizon } from "../lib/signals";
import { CALL, FORWARD, FORWARD_LABEL, type HorizonStats, type PulseHistory, type TrackPoint } from "../lib/track";
import { Tip } from "./charts";
import { Empty, Panel, Skeleton } from "./ui";

const AXIS = { fontSize: "0.8rem", fill: C.muted, fontFamily: "var(--font-mi-mono)" } as const;

// The venue trio is the palette's validated three-series set.
const HCOLOR: Record<Horizon, string> = { intraday: C.venues.binance, swing: C.venues.bybit, macro: C.venues.okx };

export function TrackRecord({ hist, now }: { hist: PulseHistory | null; now: number }) {
  if (!hist) return <Skeleton h="20rem" />;
  const down = hist.sources.find((s) => s.source === "redis" && !s.ok);
  return (
    <Panel
      title="Track record"
      aside={hist.since ? `${hist.samples.toLocaleString("en-US")} hourly snapshots since ${new Date(hist.since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : undefined}
      sources={down?.error === "not configured" ? undefined : hist.sources}
      footnote={
        <>
          Every hour the three scores are logged with BTC&apos;s price, then graded once their horizon has passed: intraday
          against the next 24h, swing the next 7 days, macro the next 30 days. A call is a score of ±{CALL} or more; hit rate
          is how often price then moved the called way. &quot;All hours&quot; is BTC&apos;s average move over the same window,
          the drift a call has to beat. Hourly samples overlap, so the honest sample size is the number of separate windows:
          below about 20, treat the numbers as anecdotes.
        </>
      }
    >
      {hist.series.length < 2 ? (
        <Empty>{down?.error === "not configured" ? "Score history needs Redis, which isn't configured here." : "Recording started. The chart fills in as hourly snapshots arrive."}</Empty>
      ) : (
        <ScoreChart data={hist.series} />
      )}
      <StatsTable stats={hist.stats} since={hist.since} now={now} />
    </Panel>
  );
}

function StatsTable({ stats, since, now }: { stats: PulseHistory["stats"]; since: number | null; now: number }) {
  const ret = (x: number | null) => (x === null ? "n/a" : pct(x, 2));
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[40rem] text-[0.85rem]">
        <thead>
          <tr className="text-left" style={{ color: C.muted }}>
            {["Horizon", "Calls", "Hit rate", "After bullish", "After bearish", "All hours", "Windows"].map((h, i) => (
              <th key={h} className={`border-b pb-2 font-medium ${i ? "text-right" : ""}`} style={{ borderColor: C.line }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HORIZONS.map(({ key, label }) => {
            const s: HorizonStats = stats[key];
            const firstGrade = since !== null ? since + FORWARD[key] : null;
            return (
              <tr key={key} className="border-b" style={{ borderColor: C.line }}>
                <td className="py-2">
                  <span className="mr-2 inline-block size-2 rounded-full" style={{ background: HCOLOR[key] }} />
                  <span className="font-medium">{label}</span>{" "}
                  <span style={{ color: C.muted }}>vs next {FORWARD_LABEL[key]}</span>
                </td>
                {s.graded === 0 ? (
                  <td colSpan={6} className="py-2 text-right" style={{ color: C.muted }}>
                    {firstGrade === null ? "Waiting for the first snapshot" : firstGrade > now ? `First grade ${countdown(firstGrade, now)}` : "Not enough history yet"}
                  </td>
                ) : (
                  <>
                    <td className="mi-num py-2 text-right">{s.calls}</td>
                    <td className="mi-num py-2 text-right font-semibold" style={{ color: s.hitRate === null ? C.ink : s.hitRate >= 0.55 ? C.longInk : s.hitRate < 0.45 ? C.shortInk : C.ink }}>
                      {s.hitRate === null ? "n/a" : `${(s.hitRate * 100).toFixed(0)}%`}
                    </td>
                    <td className="mi-num py-2 text-right">{ret(s.bullAvg)}</td>
                    <td className="mi-num py-2 text-right">{ret(s.bearAvg)}</td>
                    <td className="mi-num py-2 text-right" style={{ color: C.muted }}>{ret(s.baseAvg)}</td>
                    <td className="mi-num py-2 text-right" style={{ color: s.windows < 20 ? C.muted : C.ink }}>{s.windows}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** BTC price on top, the three horizon scores below, one shared time axis and hover column. */
function ScoreChart({ data }: { data: TrackPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const priceH = 130;
  const gap = 16;
  const scoreH = 130;
  const height = priceH + gap + scoreH + 22;
  const pad = { r: 64, t: 6 };

  const geo = useMemo(() => {
    if (!w) return null;
    const t0 = data[0].t;
    const t1 = data[data.length - 1].t;
    const x = (t: number) => (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * (w - pad.r));
    let lo = Math.min(...data.map((d) => d.px));
    let hi = Math.max(...data.map((d) => d.px));
    const pv = (hi - lo || hi * 0.01) * 0.08;
    lo -= pv;
    hi += pv;
    const py = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (priceH - pad.t);
    const top = priceH + gap;
    const sy = (v: number) => top + ((100 - Math.max(-100, Math.min(100, v))) / 200) * scoreH;
    const path = (pick: (d: TrackPoint) => number | null, y: (v: number) => number) => {
      let out = "";
      let pen = false; // break the line across missing scores
      for (const d of data) {
        const v = pick(d);
        if (v === null) {
          pen = false;
          continue;
        }
        out += `${pen ? "L" : "M"}${x(d.t).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      }
      return out;
    };
    return {
      x, py, sy, lo, hi, top,
      price: path((d) => d.px, py),
      lines: HORIZONS.map((h) => ({ key: h.key, d: path((p) => p[h.key], sy) })),
    };
  }, [data, w, pad.r, pad.t]);

  const tf = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
  const h = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg
          width={w}
          height={height}
          className="block overflow-visible"
          onMouseMove={(e) => {
            const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
            let best = 0;
            data.forEach((d, i) => Math.abs(geo.x(d.t) - mx) < Math.abs(geo.x(data[best].t) - mx) && (best = i));
            setHover(best);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {/* price band */}
          <text x={w - pad.r + 6} y={geo.py(geo.hi) + 10} style={AXIS}>{price(geo.hi)}</text>
          <text x={w - pad.r + 6} y={geo.py(geo.lo)} style={AXIS}>{price(geo.lo)}</text>
          <path d={geo.price} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
          {/* score band: ±CALL shaded as "no edge" */}
          <rect x={0} y={geo.sy(CALL)} width={w - pad.r} height={geo.sy(-CALL) - geo.sy(CALL)} fill={C.grid} />
          {[100, 0, -100].map((v) => (
            <g key={v}>
              <line x1={0} x2={w - pad.r} y1={geo.sy(v)} y2={geo.sy(v)} stroke={v === 0 ? C.neutral : C.grid} />
              <text x={w - pad.r + 6} y={geo.sy(v) + 4} style={AXIS}>{v > 0 ? `+${v}` : v}</text>
            </g>
          ))}
          {geo.lines.map((l) => (
            <path key={l.key} d={l.d} fill="none" stroke={HCOLOR[l.key]} strokeWidth={2} strokeLinejoin="round" />
          ))}
          <text x={0} y={height - 4} style={AXIS}>{tf(data[0].t)}</text>
          <text x={w - pad.r} y={height - 4} textAnchor="end" style={AXIS}>{tf(data[data.length - 1].t)}</text>
          {h && <line x1={geo.x(h.t)} x2={geo.x(h.t)} y1={pad.t} y2={geo.top + scoreH} stroke={C.ink} strokeOpacity={0.25} />}
        </svg>
      )}
      <div className="absolute left-0 flex gap-4 text-[0.8rem]" style={{ top: priceH - 4, color: C.ink2 }}>
        {HORIZONS.map((x) => (
          <span key={x.key} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3" style={{ background: HCOLOR[x.key] }} />
            {x.label}
          </span>
        ))}
      </div>
      {geo && h && (
        <Tip x={geo.x(h.t)} y={0} w={w}>
          <div style={{ color: C.muted }}>{tf(h.t)}</div>
          <div className="font-mono font-semibold tabular-nums">{price(h.px)}</div>
          {HORIZONS.map((x) => (
            <div key={x.key} className="flex justify-between gap-3 font-mono tabular-nums">
              <span style={{ color: HCOLOR[x.key] }}>{x.label}</span>
              <span>{h[x.key] === null ? "n/a" : `${h[x.key]! > 0 ? "+" : ""}${h[x.key]!.toFixed(0)}`}</span>
            </div>
          ))}
        </Tip>
      )}
    </div>
  );
}
