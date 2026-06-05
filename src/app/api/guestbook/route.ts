import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { GuestbookMessage } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGES_KEY = "guestbook:messages";
const RATE_LIMIT_PREFIX = "guestbook:rl:";
const RATE_LIMIT_SECONDS = 60;
const MAX_RETURN = 50;
const MAX_NAME_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 200;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Dev fallback: in-memory store so the form works without env vars.
const devStore: GuestbookMessage[] = [];
const devRateLimit = new Map<string, number>();

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

async function checkRateLimit(ip: string): Promise<boolean> {
  if (redis) {
    const key = `${RATE_LIMIT_PREFIX}${ip}`;
    const set = await redis.set(key, "1", { nx: true, ex: RATE_LIMIT_SECONDS });
    return set === "OK";
  }
  const now = Date.now();
  const last = devRateLimit.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_SECONDS * 1000) return false;
  devRateLimit.set(ip, now);
  return true;
}

export async function GET() {
  if (redis) {
    const raw = await redis.lrange<GuestbookMessage | string>(
      MESSAGES_KEY,
      0,
      MAX_RETURN - 1
    );
    const messages = raw.map((entry) =>
      typeof entry === "string" ? (JSON.parse(entry) as GuestbookMessage) : entry
    );
    return NextResponse.json({ messages });
  }
  return NextResponse.json({ messages: [...devStore] });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: real users leave this empty.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const entry: GuestbookMessage = {
    id: Date.now(),
    name,
    message,
    date: new Date().toISOString().split("T")[0],
  };

  if (redis) {
    await redis.lpush(MESSAGES_KEY, JSON.stringify(entry));
    await redis.ltrim(MESSAGES_KEY, 0, 999);
  } else {
    devStore.unshift(entry);
    if (devStore.length > 100) devStore.length = 100;
  }

  return NextResponse.json({ ok: true, entry });
}
