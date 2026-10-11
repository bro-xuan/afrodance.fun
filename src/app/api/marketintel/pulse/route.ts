import { Redis } from "@upstash/redis";
import { after, NextResponse, type NextRequest } from "next/server";
import { buildSignals, composite, HORIZONS, MODEL, type Horizon } from "@/app/marketintel/lib/signals";
import { GRADE_DAYS, HOUR, horizonStats, MIN_READS, type PulseHistory, type PulseSample } from "@/app/marketintel/lib/track";
import type { DerivativesData, EtfData, LiquidationData, MacroData, PolymarketData, PriceData, RealizedLiqData, SourceStatus, VolData } from "@/app/marketintel/lib/types";
import { cachedJson } from "../_lib/http";
import { GET as derivatives } from "../derivatives/route";
import { GET as etf } from "../etf/route";
import { GET as liquidations } from "../liquidations/route";
import { GET as liqs } from "../liqs/route";
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
 * At most one snapshot per hour gets computed no matter who calls, and the
 * record path only reads the newest sample, so the endpoint needs no secret.
 */

const KEY = "marketintel:pulse:v1";
const DAY = 24 * HOUR;
const KEEP = 3 * 365 * DAY;
const CHUNK = 30 * DAY; // ~720 samples per Redis read

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

const bucketOf = (t: number) => Math.floor(t / HOUR) * HOUR;

async function body<T>(handler: () => Promise<Response>): Promise<T | null> {
  try {
    const r = await handler();
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The same scores the dashboard shows, computed from the same routes. */
async function snapshot(): Promise<PulseSample | null> {
  const [d, l, e, p, m, v, px, lq] = await Promise.all([
    body<DerivativesData>(derivatives),
    body<LiquidationData>(liquidations),
    body<EtfData>(etf),
    body<PolymarketData>(polymarket),
    body<MacroData>(macro),
    body<VolData>(vol),
    body<PriceData>(price),
    body<RealizedLiqData>(liqs),
  ]);
  // Always grade on the spot close, never a perp or index fallback: mixing
  // sources would put the basis into every graded return.
  const spot = px?.hourly.at(-1)?.c ?? null;
  if (!spot) return null;
  const at = Date.now();
  const signals = buildSignals({ d, l, e, p, m, v, px, lq, now: at });
  const h = {} as Record<Horizon, number | null>;
  const n = {} as Record<Horizon, number>;
  for (const { key } of HORIZONS) {
    const c = composite(signals, key);
    n[key] = c?.count ?? 0;
    h[key] = c && c.count >= MIN_READS[key] ? Math.round(c.net * 10) / 10 : null;
  }
  return {
    t: bucketOf(at),
    at,
    px: spot,
    model: MODEL,
    h,
    n,
    r: Object.fromEntries(signals.map((s) => [s.key, Math.round(s.score * 100)])),
  };
}

type Recorded = { sample: PulseSample | null; reason: "recorded" | "exists" | "locked" | "no-data" | "no-redis" };

async function record(): Promise<Recorded> {
  const bucket = bucketOf(Date.now());
  if (redis) {
    if ((await redis.zcount(KEY, bucket, bucket + HOUR - 1)) > 0) return { sample: null, reason: "exists" };
    // One writer per hour, even when the Action and a visitor arrive together.
    if (!(await redis.set(`${KEY}:lock:${bucket}`, 1, { nx: true, ex: 300 }))) return { sample: null, reason: "locked" };
  }
  const s = await snapshot();
  if (!redis) return { sample: s, reason: s ? "no-redis" : "no-data" };
  if (!s) {
    await redis.del(`${KEY}:lock:${bucket}`); // let the next caller retry this hour
    return { sample: null, reason: "no-data" };
  }
  // Replace rather than append, so a retry can never double-count an hour.
  await redis.zremrangebyscore(KEY, s.t, s.t + HOUR - 1);
  await redis.zadd(KEY, { score: s.t, member: s });
  await redis.zremrangebyscore(KEY, 0, s.t - KEEP);
  return { sample: s, reason: "recorded" };
}

/** Samples since `from`, read in month-sized chunks so no single response grows with history. */
async function readSince(from: number, to: number): Promise<PulseSample[]> {
  if (!redis) return [];
  const ranges: [number, number][] = [];
  for (let a = from; a <= to; a += CHUNK) ranges.push([a, Math.min(to, a + CHUNK - 1)]);
  const parts = await Promise.all(ranges.map(([a, b]) => redis.zrange<PulseSample[]>(KEY, a, b, { byScore: true })));
  return parts.flat().filter((s) => typeof s?.at === "number" && typeof s.px === "number");
}

export async function GET(req: NextRequest) {
  const now = Date.now();

  if (req.nextUrl.searchParams.get("record") === "1") {
    try {
      const r = await record();
      // A failed snapshot fails the Action, so outages show up as red runs.
      return NextResponse.json(r, { status: r.reason === "no-data" ? 503 : 200, headers: { "cache-control": "no-store" } });
    } catch (err) {
      return NextResponse.json(
        { sample: null, reason: "error", error: err instanceof Error ? err.message.slice(0, 200) : "record failed" },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
  }

  const sources: SourceStatus[] = [];
  let samples: PulseSample[] = [];
  let readOk = false;
  if (redis) {
    try {
      samples = await readSince(now - GRADE_DAYS * DAY, now);
      readOk = true;
      sources.push({ source: "redis", ok: true });
    } catch (err) {
      sources.push({ source: "redis", ok: false, error: err instanceof Error ? err.message.slice(0, 120) : "read failed" });
    }
  } else {
    sources.push({ source: "redis", ok: false, error: "not configured" });
  }
  samples.sort((a, b) => a.at - b.at);

  // Lazy logging: only when the read worked, so a Redis hiccup can't fan out
  // into a snapshot per request.
  if (readOk && samples.at(-1)?.t !== bucketOf(now)) after(() => record().catch(() => {}));

  const current = samples.filter((s) => s.model === MODEL);
  const cutoff = now - 30 * DAY;
  const out: PulseHistory = {
    asOf: now,
    since: current[0]?.at ?? null,
    samples: current.length,
    model: MODEL,
    series: samples.filter((s) => s.at >= cutoff).map((s) => ({ t: s.at, px: s.px, ...s.h })),
    stats: Object.fromEntries(HORIZONS.map(({ key }) => [key, horizonStats(current, key)])) as PulseHistory["stats"],
    sources,
  };
  return cachedJson(out, 300);
}
