import { C, price } from "../lib/format";
import { composite, type Signal, type volRegime } from "../lib/signals";
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
  const c = composite(signals);
  if (!signals.length || !c) return <Skeleton h="16rem" />;

  const drivers = [...signals]
    .filter((s) => s.lean !== "neutral")
    .sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))
    .slice(0, 3);
  const netColor = c.net >= 8 ? C.longInk : c.net <= -8 ? C.shortInk : C.ink;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Net bias */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 lg:col-span-5" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between">
            <span className="mi-label">Net bias, weighted</span>
            <span className="text-[0.8rem]" style={{ color: C.muted }}>{signals.length} reads, −100 to +100</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="mi-num text-[2.6rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: netColor }}>
              {c.net > 0 ? "+" : c.net < 0 ? "−" : ""}{Math.abs(c.net).toFixed(0)}
            </span>
            <span className="text-[1.1rem] font-medium">{c.label}</span>
          </div>
          <div>
            <Meter score={c.net / 100} h={10} color={c.net >= 8 ? C.long : c.net <= -8 ? C.short : C.neutral} />
            <div className="mt-1 flex justify-between text-[0.8rem]" style={{ color: C.muted }}>
              <span>Bearish</span>
              <span>Bullish</span>
            </div>
          </div>
          <div className="text-[0.9rem] leading-snug" style={{ color: C.ink2 }}>
            <span className="mi-num font-semibold" style={{ color: C.longInk }}>{c.bull.length}</span> bullish,{" "}
            <span className="mi-num font-semibold" style={{ color: C.shortInk }}>{c.bear.length}</span> bearish,{" "}
            <span className="mi-num font-semibold">{c.neutral.length}</span> inside their normal band.
            {c.agree !== null && (
              <> {(c.agree * 100).toFixed(0)}% of the directional weight agrees{c.agree < 0.65 ? ", so conviction is low" : ""}.</>
            )}
          </div>
          {drivers.length > 0 && (
            <div className="text-[0.85rem]" style={{ color: C.muted }}>
              Driven by{" "}
              {drivers.map((d, i) => (
                <span key={d.key}>
                  {i > 0 && ", "}
                  <span className="font-medium" style={{ color: d.score > 0 ? C.longInk : C.shortInk }}>{d.label.split(",")[0]}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expected move + vol regime */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 lg:col-span-7" style={{ borderColor: C.line, background: C.line }}>
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
                  {s.kind}{s.contrarian ? ", contrarian" : ""}{s.weight < 0.75 ? ", low weight" : ""}
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
          </div>
        ))}
      </div>
      <p className="text-[0.8rem] leading-relaxed" style={{ color: C.muted }}>
        Each read is scored −100 to +100 against its normal band, so readings inside that band score zero instead of casting a
        vote. Contrarian reads (funding, crowd positioning, sentiment, basis) count against the crowd. Flows and leverage
        weigh more than sentiment gauges. Expected moves are 1σ from DVOL (Deribit 30-day implied vol).
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
