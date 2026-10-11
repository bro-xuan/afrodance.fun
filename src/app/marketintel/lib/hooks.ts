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
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as T;
        if (alive) {
          setData(j);
          setError(null);
        }
      } catch (e) {
        if (alive && !(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : String(e));
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
 * Live BTC spot + 24h change from Binance's public miniTicker stream, with
 * Coinbase as fallback when Binance is unreachable (e.g. US visitors).
 */
export function useLivePrice() {
  const [state, setState] = useState<{ price: number | null; open24h: number | null; src: string | null }>({
    price: null,
    open24h: null,
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
        if (d.type === "ticker") setState({ price: Number(d.price), open24h: Number(d.open_24h), src: "Coinbase" });
      };
    };

    try {
      ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@miniTicker");
      ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        setState({ price: Number(d.c), open24h: Number(d.o), src: "Binance" });
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

