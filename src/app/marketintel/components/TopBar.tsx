"use client";

import Link from "next/link";
import { useState } from "react";
import { C, pct, price, tzLabel, usd } from "../lib/format";
import { useLivePrice, useMounted, useNow } from "../lib/hooks";
import type { DerivativesData } from "../lib/types";

const NAV = [
  ["Pulse", "#market-pulse"],
  ["Positioning", "#positioning"],
  ["Liquidations", "#liquidations"],
  ["ETF flows", "#etf-flows"],
  ["Prediction markets", "#prediction-markets"],
  ["Calendar", "#catalyst-calendar"],
  ["Macro", "#macro-sentiment"],
] as const;

function clock(now: number, tz?: string) {
  return new Date(now).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TopBar({ d }: { d: DerivativesData | null }) {
  const live = useLivePrice();
  const now = useNow(1000);
  // Clocks use the viewer's zone, which the server can't know; render after mount.
  const mounted = useMounted();
  const px = live.price ?? d?.price ?? null;
  const open = live.open24h ?? d?.price24hAgo ?? null;
  const chg = px && open ? (px / open - 1) * 100 : null;

  // Flash the price on each tick: re-keying the span restarts a CSS fade.
  const [tick, setTick] = useState<{ px: number | null; dir: "up" | "down" | null; n: number }>({ px, dir: null, n: 0 });
  if (px !== tick.px) {
    setTick({ px, dir: tick.px === null || px === null ? null : px > tick.px ? "up" : "down", n: tick.n + 1 });
  }

  return (
    <header className="relative z-40 border-b sm:sticky sm:top-0 bg-white/90 backdrop-blur-md" style={{ borderColor: C.line }}>
      <div className="mx-auto flex w-[min(96%,110rem)] flex-wrap items-center gap-x-8 gap-y-2 py-3">
        <Link href="/marketintel" className="flex items-center gap-2.5">
          <span className="mi-live-dot" aria-hidden />
          <span className="text-[1.05rem] font-bold tracking-[-0.02em]">MARKET INTEL</span>
          <span className="mi-num rounded px-1.5 py-0.5 text-[0.8rem] font-semibold" style={{ background: C.ink, color: "#fff" }}>BTC</span>
        </Link>

        <div className="flex items-baseline gap-3">
          <span key={tick.n} className={`mi-num text-[1.6rem] font-semibold tracking-[-0.03em] ${tick.dir ? `mi-flash-${tick.dir}` : ""}`}>
            {price(px, 1)}
          </span>
          <span className="mi-num text-[0.95rem] font-medium" style={{ color: chg === null ? C.muted : chg >= 0 ? C.longInk : C.shortInk }}>
            {chg !== null && (chg >= 0 ? "▲ " : "▼ ")}
            {pct(chg)} <span style={{ color: C.muted }}>24h</span>
          </span>
        </div>

        <div className="hidden items-center gap-6 lg:flex">
          <Mini label="Agg. OI" value={usd(d?.totalOiUsd, 2)} />
          <Mini label="Funding 8h" value={d?.weightedFunding8h != null ? pct(d.weightedFunding8h * 100, 4) : "n/a"} />
        </div>

        <div className="ml-auto flex items-center gap-5 text-[0.8rem]" style={{ color: C.muted }}>
          {mounted && (
            <>
              <span className="mi-num">{tzLabel(now)} {clock(now)}</span>
              <span className="mi-num hidden sm:inline">New York {clock(now, "America/New_York")}</span>
            </>
          )}
          <span className="hidden md:inline">{live.src ? `live from ${live.src}` : "connecting…"}</span>
        </div>
      </div>
      <nav className="mx-auto flex w-[min(96%,110rem)] gap-5 overflow-x-auto pb-2 text-[0.85rem] font-medium" style={{ color: C.ink2 }}>
        {NAV.map(([label, href]) => (
          <a key={href} href={href} className="whitespace-nowrap underline-offset-4 hover:underline">
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="mi-label">{label}</div>
      <div className="mi-num text-[0.95rem] font-semibold">{value}</div>
    </div>
  );
}
