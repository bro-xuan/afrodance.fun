import { NextResponse } from "next/server";
import type { SourceStatus } from "@/app/marketintel/lib/types";

/**
 * Shared plumbing for the /api/marketintel/* routes.
 *
 * All upstreams are keyless public APIs. Bybit geo-blocks US IPs, so the
 * Cloudflare Worker is placed next to Frankfurt (`placement` in
 * wrangler.jsonc; the `preferredRegion` exports are Vercel leftovers and do
 * nothing there). Binance still refuses Cloudflare's egress IPs, which
 * geolocate to the US wherever the Worker runs, so every Binance read has a
 * Bybit fallback (./bybit.ts). Cloudflare doesn't cache a Worker's own
 * responses, so `s-maxage` only helps browsers and any cache in front.
 */

const UA = "Mozilla/5.0 (compatible; afrodance-marketintel/1.0; +https://afrodance.fun/marketintel)";

export async function getJSON<T = unknown>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function getText(url: string, timeoutMs = 10000, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Run named fetchers in parallel; collect values plus a status row per source.
 * A failed source yields `null` and an error string — never a thrown route.
 */
export async function settle<T extends Record<string, () => Promise<unknown>>>(
  jobs: T,
): Promise<{ values: { [K in keyof T]: Awaited<ReturnType<T[K]>> | null }; sources: SourceStatus[] }> {
  const keys = Object.keys(jobs) as (keyof T)[];
  const results = await Promise.allSettled(keys.map((k) => jobs[k]()));
  const values = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };
  const sources: SourceStatus[] = [];
  results.forEach((r, i) => {
    const k = keys[i];
    if (r.status === "fulfilled") {
      values[k] = r.value as Awaited<ReturnType<T[typeof k]>>;
      sources.push({ source: String(k), ok: true });
    } else {
      values[k] = null;
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      sources.push({ source: String(k), ok: false, error: msg.slice(0, 120) });
    }
  });
  return { values, sources };
}

/**
 * Try fetchers in order; the first success wins. Only that one gets a status
 * row: a primary that failed over isn't "unavailable" data. If all fail, every
 * attempt's error is reported.
 */
export async function firstOk<T>(jobs: [string, () => Promise<T>][]): Promise<{ value: T | null; sources: SourceStatus[] }> {
  const failed: SourceStatus[] = [];
  for (const [source, job] of jobs) {
    try {
      return { value: await job(), sources: [{ source, ok: true }] };
    } catch (e) {
      failed.push({ source, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 120) });
    }
  }
  return { value: null, sources: failed };
}

export function cachedJson(body: unknown, sMaxAge: number, swr = sMaxAge * 4) {
  return NextResponse.json(body, {
    headers: { "cache-control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}` },
  });
}
