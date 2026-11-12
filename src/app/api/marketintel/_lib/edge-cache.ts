import type { SourceStatus } from "@/app/marketintel/lib/types";

/**
 * Edge cache for the market routes on Cloudflare Workers.
 *
 * Vercel's CDN honoured each route's `s-maxage`; Cloudflare doesn't cache a
 * Worker's own responses, so without this every visitor refetches every
 * upstream. And exchanges intermittently refuse or rate-limit Cloudflare's
 * shared egress IPs (Bybit 403s ~1 request in 3, OKX/CoinGecko 429), so a
 * fresh fetch can come back worse than the copy from a few minutes ago:
 *
 *   - a copy younger than the route's `s-maxage` is served as is;
 *   - otherwise the route runs, and if its result has more failed sources
 *     than a copy younger than KEEP_HEALTHY_S, the healthier copy is served
 *     (its `asOf` shows its age);
 *   - any other result replaces the cached copy.
 *
 * The cache is per data center; the Worker is placed next to Frankfurt, so in
 * practice there is one. A no-op where the Cache API is missing (next dev,
 * vitest) or inert (*.workers.dev).
 */

const KEEP_HEALTHY_S = 1800;
const STORED_AT = "x-mi-stored-at";
const ORIGINAL_CC = "x-mi-cache-control";

type EdgeCache = { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void> };

const edge = (): EdgeCache | null => (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;

const sMaxAge = (cc: string | null) => Number(/s-maxage=(\d+)/.exec(cc ?? "")?.[1] ?? 0);

async function failures(res: Response): Promise<number> {
  try {
    const body = (await res.clone().json()) as { sources?: SourceStatus[] };
    return body.sources?.filter((s) => !s.ok).length ?? 0;
  } catch {
    return Infinity;
  }
}

/** A cached copy, with the route's own cache headers back in place. */
function serve(cached: Response, label: string): Response {
  const out = new Response(cached.body, cached);
  out.headers.set("cache-control", cached.headers.get(ORIGINAL_CC) ?? "no-store");
  out.headers.delete(ORIGINAL_CC);
  out.headers.delete(STORED_AT);
  out.headers.set("x-mi-cache", label);
  return out;
}

export function edgeCached(name: string, load: () => Promise<Response>): () => Promise<Response> {
  const key = `https://afrodance.fun/__edge-cache/marketintel/${name}`;
  return async () => {
    const cache = edge();
    if (!cache) return load();

    const cached = await cache.match(key).catch(() => undefined);
    const age = cached ? (Date.now() - Number(cached.headers.get(STORED_AT))) / 1000 : Infinity;
    if (cached && age < sMaxAge(cached.headers.get(ORIGINAL_CC))) return serve(cached, "hit");

    const fresh = await load();
    const keepOld = cached && age < KEEP_HEALTHY_S;
    if (keepOld && (!fresh.ok || (await failures(cached)) < (await failures(fresh)))) return serve(cached, "healthier");
    if (!fresh.ok) return fresh;

    const stored = new Response(fresh.clone().body, fresh);
    stored.headers.set(ORIGINAL_CC, fresh.headers.get("cache-control") ?? "");
    stored.headers.set(STORED_AT, String(Date.now()));
    stored.headers.set("cache-control", `public, max-age=${KEEP_HEALTHY_S}`);
    await cache.put(key, stored).catch(() => {});
    return fresh;
  };
}
