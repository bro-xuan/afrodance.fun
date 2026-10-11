import { Redis } from "@upstash/redis";
import { after, NextResponse, type NextRequest } from "next/server";
import { buildSignals, composite, HORIZONS, type Horizon } from "@/app/marketintel/lib/signals";
import { HOUR, horizonStats, type PulseHistory, type PulseSample } from "@/app/marketintel/lib/track";
import type { DerivativesData, EtfData, LiquidationData, MacroData, PolymarketData, PriceData, SourceStatus, VolData } from "@/app/marketintel/lib/types";
import { cachedJson } from "../_lib/http";
import { GET as derivatives } from "../derivatives/route";
import { GET as etf } from "../etf/route";
import { GET as liquidations } from "../liquidations/route";
import { GET as macro } from "../macro/route";
import { GET as polymarket } from "../polymarket/route";
import { GET as price } from "../price/route";
import { GET as vol } from "../vol/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 60;

/**
 * Pulse track record. GET returns the logged horizon scores and how they
 * graded against later price moves. Logging is hourly and idempotent: the
 * first request in an hour that finds no sample for it computes one (in the
 * background, or inline with ?record=1, which the hourly GitHub Action uses).
 * At most one snapshot per hour gets computed no matter who calls, so the
 * endpoint needs no secret.
 */

const KEY = "marketintel:pulse:v1";
const KEEP = 3 * 365 * 24 * HOUR;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

async function body<T>(handler: () => Promise<Response>): Promise<T | null> {
  try {
    const r = await handler();
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The same scores the dashboard shows, computed from the same routes. */
async function snapshot(now: number): Promise<PulseSample | null> {
  const [d, l, e, p, m, v, px] = await Promise.all([
    body<DerivativesData>(derivatives),
    body<LiquidationData>(liquidations),
    body<EtfData>(etf),
    body<PolymarketData>(polymarket),
    body<MacroData>(macro),
    body<VolData>(vol),
    body<PriceData>(price),
  ]);
  const spot = d?.price ?? px?.hourly.at(-1)?.c ?? null;
  if (!spot) return null;
  const signals = buildSignals({ d, l, e, p, m, v, px, now });
  const round = (x: number) => Math.round(x * 10) / 10;
  const h = Object.fromEntries(
    HORIZONS.map(({ key }) => {
      const c = composite(signals, key);
      return [key, c ? round(c.net) : null];
    }),
  ) as Record<Horizon, number | null>;
  return {
    t: Math.floor(now / HOUR) * HOUR,
    px: spot,
    h,
    r: Object.fromEntries(signals.map((s) => [s.key, Math.round(s.score * 100)])),
  };
}

async function record(now: number, latest: PulseSample | undefined): Promise<PulseSample | null> {
  const bucket = Math.floor(now / HOUR) * HOUR;
  if (latest?.t === bucket) return null;
  // One writer per hour, even when the Action and a visitor arrive together.
  if (redis && !(await redis.set(`${KEY}:lock:${bucket}`, 1, { nx: true, ex: 300 }))) return null;
  const s = await snapshot(now);
  if (s && redis) {
    await redis.zadd(KEY, { score: s.t, member: s });
    await redis.zremrangebyscore(KEY, 0, now - KEEP);
  }
  return s;
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  const force = req.nextUrl.searchParams.get("record") === "1";
  const sources: SourceStatus[] = [];
  let samples: PulseSample[] = [];
  if (redis) {
    try {
      samples = await redis.zrange<PulseSample[]>(KEY, 0, -1);
      sources.push({ source: "redis", ok: true });
    } catch (err) {
      sources.push({ source: "redis", ok: false, error: err instanceof Error ? err.message.slice(0, 120) : "read failed" });
    }
  } else {
    sources.push({ source: "redis", ok: false, error: "not configured" });
  }
  samples.sort((a, b) => a.t - b.t);

  let recorded: PulseSample | null | undefined;
  if (force) recorded = await record(now, samples.at(-1));
  else if (redis && samples.at(-1)?.t !== Math.floor(now / HOUR) * HOUR) after(() => record(now, samples.at(-1)).catch(() => {}));

  const cutoff = now - 30 * 24 * HOUR;
  const out: PulseHistory = {
    asOf: now,
    since: samples[0]?.t ?? null,
    samples: samples.length,
    series: samples.filter((s) => s.t >= cutoff).map((s) => ({ t: s.t, px: s.px, ...s.h })),
    stats: Object.fromEntries(HORIZONS.map(({ key }) => [key, horizonStats(samples, key)])) as PulseHistory["stats"],
    sources,
    ...(force ? { recorded: recorded ?? null } : {}),
  };
  // Forced records must never come from a CDN copy, or the hour gets skipped.
  return force ? NextResponse.json(out, { headers: { "cache-control": "no-store" } }) : cachedJson(out, 300);
}
