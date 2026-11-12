import { Redis } from "@upstash/redis";

/**
 * Shared Upstash client, or null when no database is connected (every caller
 * degrades gracefully). Accepts both env-var spellings: Upstash's own
 * (UPSTASH_REDIS_REST_*) and the names Vercel's Upstash Marketplace
 * integration injects (KV_REST_API_*).
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
