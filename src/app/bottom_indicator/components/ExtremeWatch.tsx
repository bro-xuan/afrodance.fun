import type { Trigger, Watch } from "../lib/insights";

/**
 * The two "extreme watch" panels, read as a pair: the gauge says WHERE in the
 * cycle we are; these say HOW LOUDLY each end is ringing. Each panel counts
 * the signals sitting in its extreme zone and lists that end's one-sided
 * specialist triggers (all ratios that pivot on 1.0) with a distance-to-fire
 * meter — so an approaching Pi Cycle cross is visible before it happens.
 */

const SIDE_STYLE = {
  bottom: {
    hue: "#10b981",
    text: "#34d399",
    title: "Bottom watch",
    zone: "score < 20",
    blurb: "signals in the historic-bottom zone",
  },
  top: {
    hue: "#ef4444",
    text: "#f87171",
    title: "Top watch",
    zone: "score ≥ 80",
    blurb: "signals in the historic-top zone",
  },
} as const;

const STATE_STYLE = {
  fired: { label: "Triggered", color: null as string | null }, // null → side hue
  near: { label: "Close", color: "#facc15" },
  quiet: { label: "Quiet", color: "#5c6a83" },
} as const;

/**
 * Distance-to-fire meter: the trigger line (ratio = 1.0) is the notch at the
 * far end; the fill shows how far along the ratio is toward it. Fired = full
 * bar in the side's colour. The bottom side approaches 1.0 from above, the
 * top side from below, so progress is |distance| mapped onto the same track.
 */
function TriggerMeter({ trigger, side }: { trigger: Trigger; side: "bottom" | "top" }) {
  const s = SIDE_STYLE[side];
  const v = trigger.row.rawValue as number;
  // 0 = far away (≥40% from the line), 1 = at/through the line.
  const dist = side === "bottom" ? v - 1 : 1 - v;
  const progress = Math.max(0, Math.min(1, 1 - dist / 0.4));
  const fillColor =
    trigger.state === "fired" ? s.hue : trigger.state === "near" ? "#eab308" : "#3d4a63";
  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1c2740]"
      role="meter"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${trigger.row.name} distance to trigger`}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(4, progress * 100)}%`,
          backgroundColor: fillColor,
          boxShadow: trigger.state === "fired" ? `0 0 8px ${s.hue}` : undefined,
        }}
      />
      {/* the 1.0 trigger line */}
      <span className="absolute right-[2px] top-0 h-full w-px bg-[#8695ac]" />
    </div>
  );
}

function TriggerRow({ trigger, side }: { trigger: Trigger; side: "bottom" | "top" }) {
  const s = SIDE_STYLE[side];
  const st = STATE_STYLE[trigger.state];
  const stateColor = st.color ?? s.text;
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-[#c7d0de]">{trigger.row.name}</span>
        <span className="whitespace-nowrap text-xs text-[#7f8ca3]">
          ratio <span className="font-semibold tabular-nums text-[#e6edf5]">{(trigger.row.rawValue as number).toFixed(2)}</span>
          {" · "}{trigger.rule}{" · "}
          <span className="font-semibold" style={{ color: stateColor }}>{st.label}</span>
        </span>
      </div>
      <TriggerMeter trigger={trigger} side={side} />
    </div>
  );
}

function WatchCard({ watch, triggers }: { watch: Watch; triggers: Trigger[] }) {
  const s = SIDE_STYLE[watch.side];
  const n = watch.firing.length;
  return (
    <section className="flex flex-col rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#121a2b] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <header className="flex items-baseline justify-between gap-3">
        <h3
          className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: s.text }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: n ? s.hue : "#3d4a63", boxShadow: n ? `0 0 8px ${s.hue}` : undefined }}
          />
          {s.title}
        </h3>
        <span className="text-2xl font-bold tabular-nums" style={{ color: n ? s.text : "#5c6a83" }}>
          {n}
          <span className="text-sm font-medium text-[#5c6a83]"> / {watch.eligible.length}</span>
        </span>
      </header>
      <p className="mt-0.5 text-xs text-[#7f8ca3]">
        {s.blurb} <span className="text-[#5c6a83]">({s.zone})</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {n ? (
          watch.firing.map((r) => (
            <span
              key={r.slug}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ backgroundColor: `${s.hue}1a`, color: s.text }}
            >
              {r.name}
            </span>
          ))
        ) : (
          <span className="text-xs italic text-[#5c6a83]">
            none — no signal is at this extreme right now
          </span>
        )}
      </div>

      <div className="mt-auto border-t border-[#1a2438] pt-3">
        <div className="mb-0.5 mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b7893]">
          Specialist trigger{triggers.length === 1 ? "" : "s"} · only fire{triggers.length === 1 ? "s" : ""} at {watch.side}s
        </div>
        {triggers.length ? (
          triggers.map((t) => <TriggerRow key={t.row.slug} trigger={t} side={watch.side} />)
        ) : (
          <div className="py-2 text-xs italic text-[#5c6a83]">trigger data unavailable</div>
        )}
      </div>
    </section>
  );
}

export function ExtremeWatch({
  bottom,
  top,
}: {
  bottom: { watch: Watch; triggers: Trigger[] };
  top: { watch: Watch; triggers: Trigger[] };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <WatchCard watch={bottom.watch} triggers={bottom.triggers} />
      <WatchCard watch={top.watch} triggers={top.triggers} />
    </div>
  );
}
