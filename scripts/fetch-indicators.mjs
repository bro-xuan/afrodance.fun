/**
 * Generate the BTC bottom-indicator snapshot.
 *
 * Source: bitcoin-data.com keyless REST API (BGeometrics). History array per
 * metric at GET https://bitcoin-data.com/v1/{slug} → [{ d, unixTs, <field> }, …].
 * Spot BTC price history (for price-model ratios) comes from Binance daily
 * klines (keyless; BTCUSDT from 2017, which spans multiple cycles).
 *
 * Output: src/app/bottom_indicator/data/indicators.json
 *
 * The free tier allows ~10 requests/hour (HTTP 429 RATE_LIMIT_HOUR_EXCEEDED
 * beyond that). This script fetches one history array per metric, so keep the
 * registry small. On 429 it stops, MERGES what it got over any existing
 * snapshot, and tells you which metrics remain — re-run next hour to finish.
 *
 * Usage:
 *   node scripts/fetch-indicators.mjs                # refresh all metrics
 *   node scripts/fetch-indicators.mjs --only=mvrv,nupl
 *
 * Re-run whenever you want fresher numbers, then commit the JSON.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const OUT_DIR = new URL("../src/app/bottom_indicator/data/", import.meta.url);
const OUT_PATH = new URL("./indicators.json", OUT_DIR);
const BD_BASE = "https://bitcoin-data.com/v1";
const BINANCE_HOSTS = ["https://api.binance.com", "https://api.binance.us"];
const BTCUSDT_GENESIS = Date.UTC(2017, 7, 17); // first BTCUSDT daily candle

// ── Metric registry ────────────────────────────────────────────────────────
// kind "oscillator": mean-reverting ratio → score = percentile of raw value.
// kind "priceModel": USD price level → score = percentile of (spot / model).
// direction "lowIsBottom": cheap/low = capitulation = low score = "Bottom".
const METRICS = [
  { slug: "mvrv-zscore", name: "MVRV Z-Score", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Market cap vs realized cap in standard deviations. Deep lows mark historic bottoms." },
  { slug: "mvrv", name: "MVRV Ratio", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Market value / realized value. Below ~1 means the average holder is underwater." },
  { slug: "nupl", name: "Net Unrealized P/L (NUPL)", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Share of supply sitting in profit. Negative = net-unrealized-loss capitulation." },
  { slug: "sopr", name: "SOPR", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Spent-output profit ratio. Sustained sub-1 means coins move at a loss." },
  { slug: "reserve-risk", name: "Reserve Risk", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Confidence of long-term holders vs price. Lows flag attractive risk/reward." },
  { slug: "sth-mvrv", name: "Short-Term Holder MVRV", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Cost-basis ratio of recent buyers. Deep lows = fresh money deeply underwater." },
  { slug: "lth-mvrv", name: "Long-Term Holder MVRV", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Cost-basis ratio of seasoned holders. Lows accompany late-stage bear bottoms." },
  { slug: "realized-price", name: "Realized Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Aggregate on-chain cost basis. Spot below it means the market is underwater." },
  { slug: "balanced-price", name: "Balanced Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Realized minus transferred price. Spot near it has marked cycle bottoms." },
];

// ── Scoring (pure) ─────────────────────────────────────────────────────────
// NOTE: phase boundaries must stay in sync with src/app/bottom_indicator/lib/phase-meta.ts
function percentileRank(value, sortedAsc) {
  // fraction of history <= value, in 0..100
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sortedAsc.length) * 100;
}

function computeScore(value, sortedAsc, direction) {
  const p = percentileRank(value, sortedAsc);
  const score = direction === "lowIsBottom" ? p : 100 - p;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function phaseForScore(score) {
  if (score < 20) return "Bottom";
  if (score < 40) return "Bearish";
  if (score < 60) return "Neutral";
  if (score < 80) return "Bullish";
  return "Top";
}

// ── Fetch helpers ──────────────────────────────────────────────────────────
class RateLimitError extends Error {}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = null; }
  if (res.status === 429 || body?.error?.code === "RATE_LIMIT_HOUR_EXCEEDED") {
    throw new RateLimitError("bitcoin-data.com hourly rate limit hit");
  }
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return { body };
}

// Pull the single numeric metric field out of a { d, unixTs, <field> } row.
function extractValue(row) {
  const key = Object.keys(row).find((k) => k !== "d" && k !== "unixTs" && k !== "blockNumber");
  const v = Number(row[key]);
  return Number.isFinite(v) ? v : null;
}

// Return { points: [{ d, ts, v }], notFound } sorted by time ascending.
async function getHistory(slug) {
  const { body, notFound } = await fetchJson(`${BD_BASE}/${slug}`);
  if (notFound || !Array.isArray(body)) return { points: null, notFound: true };
  const points = body
    .map((r) => ({ d: r.d, ts: Number(r.unixTs), v: extractValue(r) }))
    .filter((p) => p.d && Number.isFinite(p.ts) && p.v !== null)
    .sort((a, b) => a.ts - b.ts);
  return { points: points.length ? points : null, notFound: points.length === 0 };
}

// date (YYYY-MM-DD, UTC) → spot USD close, paginated from one Binance host.
async function binancePrices(host) {
  const map = new Map();
  let start = BTCUSDT_GENESIS;
  const now = Date.now();
  while (start < now) {
    const url = `${host}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000&startTime=${start}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Binance ${host} → HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) break;
    for (const k of rows) map.set(new Date(k[0]).toISOString().slice(0, 10), Number(k[4]));
    if (rows.length < 1000) break;
    start = rows[rows.length - 1][0] + 86_400_000;
  }
  return map;
}

// Try each keyless host in turn; first with a usable series wins.
async function getBtcPriceByDate() {
  let lastErr;
  for (const host of BINANCE_HOSTS) {
    try {
      const map = await binancePrices(host);
      if (map.size > 500) return map;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("no keyless BTC price source available");
}

// index of the point whose ts is closest to `targetTs`.
function nearestIndex(points, targetTs) {
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const diff = Math.abs(points[i].ts - targetTs);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

// Build a scored IndicatorRow from a metric's series (raw for oscillator,
// spot/model ratio for priceModel).
function scoreSeries(def, points) {
  const latest = points[points.length - 1];
  const values = points.map((p) => p.v);
  const sorted = [...values].sort((a, b) => a - b);
  const score = computeScore(latest.v, sorted, def.direction);

  const idx30 = nearestIndex(points, latest.ts - 30 * 86400);
  const score30 = computeScore(points[idx30].v, sorted, def.direction);

  return {
    slug: def.slug,
    name: def.name,
    blurb: def.blurb,
    phase: phaseForScore(score),
    score,
    change30d: score - score30,
    rawValue: Math.round(latest.v * 1e4) / 1e4,
    asOfDate: latest.d,
    available: true,
  };
}

function unavailableRow(def) {
  return { slug: def.slug, name: def.name, blurb: def.blurb, phase: null, score: null,
    change30d: null, rawValue: null, asOfDate: null, available: false };
}

// ── Main ───────────────────────────────────────────────────────────────────
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

// Load existing snapshot so a partial (rate-limited) run merges, never clobbers.
const existing = existsSync(OUT_PATH)
  ? JSON.parse(readFileSync(OUT_PATH, "utf8"))
  : { generatedAt: null, btcPrice: null, rows: [] };
const rowBySlug = new Map(existing.rows.map((r) => [r.slug, r]));

const needsPrice = METRICS.some((m) => m.kind === "priceModel" && (!only || only.has(m.slug)));
let priceByDate = null;
if (needsPrice) {
  try {
    console.log("Fetching BTC price history from Binance…");
    priceByDate = await getBtcPriceByDate();
    console.log(`  ${priceByDate.size} daily closes`);
  } catch (e) {
    console.warn(`  price fetch failed (${e.message}) — price-model metrics will be skipped`);
  }
}

let btcSpot = existing.btcPrice ?? null;
if (priceByDate?.size) {
  const lastDate = [...priceByDate.keys()].sort().at(-1);
  btcSpot = Math.round(priceByDate.get(lastDate));
}

const remaining = [];
let hitLimit = false;

for (const def of METRICS) {
  if (only && !only.has(def.slug)) continue;
  if (hitLimit) { remaining.push(def.slug); continue; }
  try {
    process.stdout.write(`Fetching ${def.slug}… `);
    const { points, notFound } = await getHistory(def.slug);
    if (notFound || !points) {
      console.log("404 / empty → unavailable");
      rowBySlug.set(def.slug, unavailableRow(def));
      continue;
    }

    let series = points;
    if (def.kind === "priceModel") {
      if (!priceByDate?.size) {
        console.log("no price series → unavailable");
        rowBySlug.set(def.slug, unavailableRow(def));
        continue;
      }
      // Convert model price series into a spot/model ratio series.
      series = points
        .filter((p) => priceByDate.has(p.d) && p.v > 0)
        .map((p) => ({ d: p.d, ts: p.ts, v: priceByDate.get(p.d) / p.v }));
      if (!series.length) {
        console.log("no overlapping dates → unavailable");
        rowBySlug.set(def.slug, unavailableRow(def));
        continue;
      }
    }

    const row = scoreSeries(def, series);
    rowBySlug.set(def.slug, row);
    console.log(`score ${row.score} (${row.phase}), 30d ${row.change30d >= 0 ? "+" : ""}${row.change30d}, as of ${row.asOfDate}`);
    await new Promise((r) => setTimeout(r, 400)); // be gentle
  } catch (e) {
    if (e instanceof RateLimitError) {
      console.log("RATE LIMIT — stopping, will merge progress");
      hitLimit = true;
      remaining.push(def.slug);
    } else {
      console.log(`error: ${e.message} → unavailable`);
      rowBySlug.set(def.slug, unavailableRow(def));
    }
  }
}

// Emit rows in registry order so the table is deterministic.
const rows = METRICS.map((m) => rowBySlug.get(m.slug)).filter(Boolean);
const snapshot = {
  generatedAt: new Date().toISOString(),
  btcPrice: btcSpot,
  rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");

const ok = rows.filter((r) => r.available).length;
console.log(`\nWrote ${rows.length} rows (${ok} available) → ${OUT_PATH.pathname}`);
if (remaining.length) {
  console.log(`Rate-limited before: ${remaining.join(", ")} — re-run in ~1h to finish.`);
}
