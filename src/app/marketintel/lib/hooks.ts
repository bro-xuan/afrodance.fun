"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Poll a JSON endpoint. Keeps the last good payload on transient failures. */
export function useApi<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const r = await fetch(url, { signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(20_000)]) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as T;
        if (alive) {
          setData(j);
          setError(null);
        }
      } catch (e) {
        if (alive && !ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) {
          setLoading(false);
          // Back off while the tab is hidden.
          timer = setTimeout(run, document.hidden ? intervalMs * 4 : intervalMs);
        }
      }
    };
    run();
    return () => {
      alive = false;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [url, intervalMs]);

  return { data, error, loading };
}

/** False during SSR and the hydration pass, true after. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Ticks every `ms` — drives countdowns and "x ago" labels. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Element width via ResizeObserver, so SVG charts draw at true pixel size. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Live BTC spot + 24h change and range from Binance's public miniTicker stream, with
 * Coinbase as fallback when Binance is unreachable (e.g. US visitors).
 */
export function useLivePrice() {
  const [state, setState] = useState<{ price: number | null; open24h: number | null; high24h: number | null; low24h: number | null; src: string | null }>({
    price: null,
    open24h: null,
    high24h: null,
    low24h: null,
    src: null,
  });
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let fallback: WebSocket | null = null;

    const startCoinbase = () => {
      if (closed || fallback) return;
      fallback = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      fallback.onopen = () =>
        fallback?.send(JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] }));
      fallback.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.type === "ticker") setState({ price: Number(d.price), open24h: Number(d.open_24h), high24h: Number(d.high_24h), low24h: Number(d.low_24h), src: "Coinbase" });
      };
    };

    try {
      ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@miniTicker");
      ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        setState({ price: Number(d.c), open24h: Number(d.o), high24h: Number(d.h), low24h: Number(d.l), src: "Binance" });
      };
      ws.onerror = startCoinbase;
      ws.onclose = () => !closed && startCoinbase();
    } catch {
      startCoinbase();
    }
    return () => {
      closed = true;
      ws?.close();
      fallback?.close();
    };
  }, []);
  return state;
}


export type LiveLiq = { t: number; venue: "Binance" | "Bybit"; side: "long" | "short"; px: number; usd: number };

/**
 * Live BTCUSDT liquidations from the page's own websockets: Bybit's
 * allLiquidation stream (every fill) and Binance's forceOrder stream (Binance
 * only pushes the largest order per second, so it undercounts). Totals run
 * from when the page opened. US visitors may not reach Binance.
 */
export function useLiveLiquidations(keep = 25) {
  const [state, setState] = useState<{ events: LiveLiq[]; long: number; short: number; since: number; venues: string[] }>(() => ({
    events: [],
    long: 0,
    short: 0,
    since: Date.now(),
    venues: [],
  }));
  useEffect(() => {
    const add = (e: LiveLiq) =>
      setState((s) => ({
        ...s,
        events: [e, ...s.events].slice(0, keep),
        long: s.long + (e.side === "long" ? e.usd : 0),
        short: s.short + (e.side === "short" ? e.usd : 0),
      }));
    const live = (venue: string) => setState((s) => (s.venues.includes(venue) ? s : { ...s, venues: [...s.venues, venue] }));

    const sockets: WebSocket[] = [];
    let ping: ReturnType<typeof setInterval> | undefined;
    try {
      const by = new WebSocket("wss://stream.bybit.com/v5/public/linear");
      by.onopen = () => {
        by.send(JSON.stringify({ op: "subscribe", args: ["allLiquidation.BTCUSDT"] }));
        live("Bybit");
        ping = setInterval(() => by.readyState === WebSocket.OPEN && by.send(JSON.stringify({ op: "ping" })), 20_000);
      };
      by.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (!d.topic?.startsWith("allLiquidation") || !Array.isArray(d.data)) return;
        for (const x of d.data) {
          const px = Number(x.p);
          const qty = Number(x.v);
          // Bybit: S = "Buy" means a long position was liquidated.
          if (px > 0 && qty > 0) add({ t: Number(x.T), venue: "Bybit", side: x.S === "Buy" ? "long" : "short", px, usd: px * qty });
        }
      };
      sockets.push(by);
    } catch {}
    try {
      const bn = new WebSocket("wss://fstream.binance.com/ws/btcusdt@forceOrder");
      bn.onopen = () => live("Binance");
      bn.onmessage = (m) => {
        const o = JSON.parse(m.data)?.o;
        const px = Number(o?.ap || o?.p);
        const qty = Number(o?.z || o?.q);
        // Binance: the forced order SELLs when a long is liquidated.
        if (px > 0 && qty > 0) add({ t: Number(o.T), venue: "Binance", side: o.S === "SELL" ? "long" : "short", px, usd: px * qty });
      };
      sockets.push(bn);
    } catch {}
    return () => {
      clearInterval(ping);
      sockets.forEach((s) => s.close());
    };
  }, [keep]);
  return state;
}
