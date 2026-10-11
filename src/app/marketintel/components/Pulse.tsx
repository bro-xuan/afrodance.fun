import { C, price } from "../lib/format";
import { composite, HORIZONS, type Horizon, type Signal, type volRegime } from "../lib/signals";
import { LeanChip, Skeleton } from "./ui";

type Regime = ReturnType<typeof volRegime>;

const scoreColor = (s: number) => (s >= 0.2 ? C.long : s <= -0.2 ? C.short : C.neutral);

/** Diverging meter, −1 … +1, filled from the centre. */
function Meter({ score, h = 6, color }: { score: number; h?: number; color?: string }) {
  const s = Math.max(-1, Math.min(1, score));
  return (
    <div className="relative w-full rounded-full" style={{ height: h, background: "#efeee9" }} aria-hidden>
      <div
        className="absolute top-0 rounded-full"
        style={{
          height: h,
          left: s >= 0 ? "50%" : `${50 + s * 50}%`,
          width: `${Math.abs(s) * 50}%`,
          background: color ?? scoreColor(s),
        }}
      />
      <div className="absolute -top-[3px] left-1/2 w-px" style={{ height: h + 6, background: C.ink2 }} />
    </div>
  );
}

export function Pulse({ signals, regime, spot }: { signals: Signal[]; regime: Regime; spot: number | null }) {
  const rows = HORIZONS.map((h) => ({ ...h, c: composite(signals, h.key) }));
  if (!signals.length || rows.every((r) => !r.c)) return <Skeleton h="16rem" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Net bias, one per horizon */}
        <div className="flex flex-col rounded-xl border bg-white px-5 py-3 lg:col-span-5" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between py-2">
            <span className="mi-label">Net bias, by horizon</span>
            <span className="text-[0.8rem]" style={{ color: C.muted }}>−100 to +100</span>
          </div>
          {rows.map((r) => r.c && <HorizonRow key={r.key} label={r.label} span={r.span} c={r.c} />)}
        </div>

        {/* Expected move + vol regime */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 lg:col-span-7 lg:grid-cols-2" style={{ borderColor: C.line, background: C.line }}>
          <Cell
            label="Expected move today"
            value={regime.day !== null ? `±${price(regime.day)}` : "n/a"}
            sub={regime.day !== null && spot ? `1σ, ±${((regime.day / spot) * 100).toFixed(1)}%: ${price(spot - regime.day)} to ${price(spot + regime.day)}` : "needs DVOL"}
          />
          <Cell
            label="Expected move, 7 days"
            value={regime.week !== null ? `±${price(regime.week)}` : "n/a"}
            sub={regime.week !== null && spot ? `±${((regime.week / spot) * 100).toFixed(1)}%. About 2 in 3 weeks stay inside` : undefined}
          />
          <Cell
            label="Implied vol, DVOL"
            value={regime.dvol !== null ? regime.dvol.toFixed(1) : "n/a"}
            sub={regime.dvolChg !== null ? `${regime.dvolChg >= 0 ? "+" : "−"}${Math.abs(regime.dvolChg).toFixed(1)} pts vs 24h ago` : undefined}
          />
          <Cell
            label="Realized vol, 7d / 30d"
            value={regime.rv7 !== null && regime.rv30 !== null ? `${regime.rv7.toFixed(0)} / ${regime.rv30.toFixed(0)}` : "n/a"}
            sub="annualised, daily closes"
          />
          <Cell
            label="Vol risk premium"
            value={regime.premium !== null ? `${regime.premium >= 0 ? "+" : "−"}${Math.abs(regime.premium).toFixed(1)} pts` : "n/a"}
            sub={
              regime.premium === null ? undefined
              : regime.premium > 8 ? "Options rich vs realized: sellers well paid"
              : regime.premium < -3 ? "Options cheap vs realized: long vol is cheap"
              : regime.premium < 3 ? "IV close to realized: options fairly priced"
              : "IV over RV by a normal margin"
            }
          />
          <Cell
            label="Term structure"
            value={regime.inverted === null ? "n/a" : regime.inverted ? "Inverted" : "Upward"}
            sub={regime.inverted === null ? undefined : regime.inverted ? "Front IV over 3 month: an event is priced" : "Front IV under 3 month: calm"}
          />
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" style={{ borderColor: C.line, background: C.line }}>
        {signals.map((s) => (
          <div key={s.key} className="flex flex-col gap-2 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="mi-label">{s.label}</div>
                <div className="text-[0.8rem]" style={{ color: C.muted }}>
                  {s.kind}{s.contrarian ? ", contrarian" : ""}
                </div>
              </div>
              <LeanChip lean={s.lean} />
            </div>
            <div className="mi-num text-[1.25rem] font-semibold tracking-[-0.02em]">{s.value}</div>
            <div className="flex items-center gap-2">
              <Meter score={s.score} />
              <span className="mi-num w-[2.6rem] shrink-0 text-right text-[0.8rem]" style={{ color: C.muted }}>
                {s.score > 0 ? "+" : s.score < 0 ? "−" : ""}{Math.abs(s.score * 100).toFixed(0)}
              </span>
            </div>
            <div className="text-[0.85rem] leading-snug" style={{ color: C.ink2 }}>{s.read}</div>
            <HorizonTags w={s.w} />
          </div>
        ))}
      </div>
      <p className="text-[0.8rem] leading-relaxed" style={{ color: C.muted }}>
        Each read is scored −100 to +100 against its normal band, so readings inside that band score zero instead of casting a
        vote. Contrarian reads (funding, crowd positioning, sentiment, basis) count against the crowd. Each read counts toward
        the horizons it actually informs, with the weight shown under it: taker flow and OI drive intraday, ETF flows and
        funding drive swing, trend and liquidity drive macro. Expected moves are 1σ from DVOL (Deribit 30-day implied vol).
      </p>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-white p-4">
      <span className="mi-label">{label}</span>
      <span className="mi-num text-[1.3rem] font-semibold tracking-[-0.02em]">{value}</span>
      {sub && <span className="text-[0.8rem] leading-snug" style={{ color: C.muted }}>{sub}</span>}
    </div>
  );
}

type Comp = NonNullable<ReturnType<typeof composite>>;

function HorizonRow({ label, span, c }: { label: string; span: string; c: Comp }) {
  const color = c.net >= 8 ? C.longInk : c.net <= -8 ? C.shortInk : C.ink;
  return (
    <div className="flex flex-col gap-2 border-t py-3" style={{ borderColor: C.line }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[1rem] font-semibold">{label}</span>
          <span className="text-[0.8rem]" style={{ color: C.muted }}>{span}</span>
        </div>
        <span className="text-[0.8rem]" style={{ color: C.muted }}>{c.count} reads</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="mi-num w-[3.6rem] shrink-0 text-[2rem] font-semibold leading-none tracking-[-0.04em]" style={{ color }}>
          {c.net > 0 ? "+" : c.net < 0 ? "−" : ""}{Math.abs(c.net).toFixed(0)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[0.95rem] font-medium">{c.label}</span>
          <Meter score={c.net / 100} h={8} color={c.net >= 8 ? C.long : c.net <= -8 ? C.short : C.neutral} />
        </div>
      </div>
      <div className="text-[0.85rem] leading-snug" style={{ color: C.ink2 }}>
        <span className="mi-num font-semibold" style={{ color: C.longInk }}>{c.bull.length}</span> bullish,{" "}
        <span className="mi-num font-semibold" style={{ color: C.shortInk }}>{c.bear.length}</span> bearish
        {c.agree !== null && <>, {(c.agree * 100).toFixed(0)}% agree{c.agree < 0.65 ? " (low conviction)" : ""}</>}
        {c.drivers.length > 0 && (
          <span style={{ color: C.muted }}>
            . Driven by{" "}
            {c.drivers.map((d, i) => (
              <span key={d.key}>
                {i > 0 && ", "}
                <span className="font-medium" style={{ color: d.score > 0 ? C.longInk : C.shortInk }}>{d.label.split(",")[0]}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

const SHORT: Record<Horizon, string> = { intraday: "Intraday", swing: "Swing", macro: "Macro" };

/** Which horizons a read counts toward, and how heavily. */
function HorizonTags({ w }: { w: Signal["w"] }) {
  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
      {HORIZONS.filter((h) => (w[h.key] ?? 0) > 0).map((h) => (
        <span
          key={h.key}
          className="mi-num rounded px-1.5 py-0.5 text-[0.8rem]"
          style={{ background: C.grid, color: C.ink2 }}
          title={`Weight ${w[h.key]} in the ${SHORT[h.key].toLowerCase()} score`}
        >
          {SHORT[h.key]} ×{w[h.key]}
        </span>
      ))}
    </div>
  );
}
