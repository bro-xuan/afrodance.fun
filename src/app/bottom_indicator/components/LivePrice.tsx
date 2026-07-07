"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live BTC spot for the header. Everything else on the page is a daily-close
 * snapshot baked in at refresh time; this one number updates in the browser so
 * the header isn't stale. It server-renders the snapshot `fallback` (no empty
 * flash, no layout shift), then hydrates to a live quote and polls.
 *
 * Two keyless, CORS-enabled sources with a fallback: Binance first, CoinGecko
 * if Binance is blocked/rate-limited. If both fail we keep showing the snapshot
 * close, honestly labelled — never a blank or a spinner-forever.
 */

const POLL_MS = 30_000;

async function fetchSpot(signal: AbortSignal): Promise<number | null> {
  // Binance: { symbol, price: "63412.00000000" }
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { signal });
    if (r.ok) {
      const v = Number((await r.json())?.price);
      if (Number.isFinite(v) && v > 0) return v;
    }
  } catch {
    /* fall through to CoinGecko */
  }
  // CoinGecko: { bitcoin: { usd: 63412 } }
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", { signal });
    if (r.ok) {
      const v = Number((await r.json())?.bitcoin?.usd);
      if (Number.isFinite(v) && v > 0) return v;
    }
  } catch {
    /* both sources unreachable */
  }
  return null;
}

function fmtClose(iso: string | null): string {
  if (!iso) return "close";
  const d = new Date(iso);
  return `close ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function LivePrice({ fallback, asOf }: { fallback: number | null; asOf: string | null }) {
  const [price, setPrice] = useState<number | null>(fallback);
  const [live, setLive] = useState(false);
  const prev = useRef<number | null>(fallback);
  // Brief tint when a new live tick differs from the last: green up, red down.
  const [tick, setTick] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const spot = await fetchSpot(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (spot !== null) {
        setTick(prev.current !== null && spot !== prev.current ? (spot > prev.current ? "up" : "down") : null);
        prev.current = spot;
        setPrice(spot);
        setLive(true);
      }
      timer = setTimeout(poll, POLL_MS);
    }
    poll();

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  // Clear the up/down flash shortly after each tick.
  useEffect(() => {
    if (!tick) return;
    const t = setTimeout(() => setTick(null), 900);
    return () => clearTimeout(t);
  }, [tick, price]);

  if (price === null) return null;

  const priceColor = tick === "up" ? "#5fc98b" : tick === "down" ? "#f0a868" : "#e6edf5";

  return (
    <span className="inline-flex items-center gap-2 text-sm text-[#8695ac]" aria-live="polite">
      <span>
        BTC{" "}
        <span className="tabular-nums font-semibold transition-colors duration-300" style={{ color: priceColor }}>
          ${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </span>
      {live ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5fc98b]">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#34d399]" />
          </span>
          Live
        </span>
      ) : (
        <span
          className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#5c6a83]"
          title="Live quote unavailable — showing the daily close from the snapshot"
        >
          {fmtClose(asOf)}
        </span>
      )}
    </span>
  );
}
