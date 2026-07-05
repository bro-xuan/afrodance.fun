/**
 * Generate the BTC bottom-indicator snapshot.
 *
 * Two keyless data sources:
 *   - bitcoin-data.com REST API (BGeometrics). History array per metric at
 *     GET https://bitcoin-data.com/v1/{slug} → [{ d, unixTs, <field> }, …].
 *     This is the RATE-LIMITED source (see below).
 *   - Binance daily klines (BTCUSDT from Aug 2017). Used both for spot price
 *     and to compute the "priceDerived" metrics entirely locally — those cost
 *     ZERO bitcoin-data.com budget.
 *
 * Output: src/app/bottom_indicator/data/indicators.json
 *
 * bitcoin-data.com free tier: ~8 requests/hour AND ~15/day (HTTP 429
 * RATE_LIMIT_HOUR_EXCEEDED beyond the hourly cap). One request per bitcoin-data
 * metric, so the registry currently needs >1 run/hour to fully refresh. The
 * script copes:
 *   - On 429 it stops the bitcoin-data fetches, MERGES what it got over the
 *     existing snapshot, and lists which metrics remain.
 *   - It fetches STALEST metrics first, so the next run continues where this
 *     one stopped.
 *   - It SKIPS metrics fetched within MIN_REFRESH_HOURS (default 20h), so a
 *     second same-day run only spends budget on what's actually stale, keeping
 *     the whole registry inside the daily cap.
 * priceDerived metrics are always recomputed (free), never rate-limited.
 *
 * Usage:
 *   node scripts/fetch-indicators.mjs                # refresh stale metrics
 *   node scripts/fetch-indicators.mjs --force        # ignore freshness, refetch all
 *   node scripts/fetch-indicators.mjs --only=mvrv,nupl
 *   MIN_REFRESH_HOURS=0 node scripts/fetch-indicators.mjs   # (testing) never skip
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
// kind "oscillator":   mean-reverting ratio → score = percentile of raw value.
//                      Optionally `transform` reshapes the fetched series first
//                      (e.g. Hash Ribbons = SMA ratio of the hashrate series).
// kind "priceModel":   bitcoin-data USD price level → percentile of (spot/model).
// kind "priceDerived": computed ENTIRELY from the Binance price series via
//                      `compute(priceSeries)`; costs no bitcoin-data budget.
// direction "lowIsBottom": cheap/low = capitulation = low score = "Bottom".
//
// The first block hits the rate-limited bitcoin-data API (one request each).
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
  { slug: "puell-multiple", name: "Puell Multiple", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Daily miner issuance in USD vs its yearly average. Green sub-0.5 zone marked every cycle low." },
  { slug: "rhodl-ratio", name: "RHODL Ratio", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Realized-cap HODL waves (1-week vs 1–2-year bands). Lows flag speculative capital flushed out." },
  { slug: "hashrate", name: "Hash Ribbons", direction: "lowIsBottom", kind: "oscillator",
    transform: hashRibbons,
    blurb: "30-day vs 60-day hashrate momentum. Dips below 1 mark miner-capitulation bottoms." },
  { slug: "realized-price", name: "Realized Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Aggregate on-chain cost basis. Spot below it means the market is underwater." },
  { slug: "balanced-price", name: "Balanced Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Realized minus transferred price. Spot near it has marked cycle bottoms." },
  // priceDerived — computed from Binance klines, zero bitcoin-data budget.
  { slug: "mayer-multiple", name: "Mayer Multiple", direction: "lowIsBottom", kind: "priceDerived",
    compute: (series) => ratioToSMA(series, 200),
    blurb: "Price relative to its 200-day average. Readings near 0.5 have marked deep bottoms." },
  { slug: "mayer-200w", name: "200-Week MA Ratio", direction: "lowIsBottom", kind: "priceDerived",
    compute: (series) => ratioToSMA(series, 1400),
    blurb: "Price vs its 200-week average — the line macro bottoms have historically touched." },
  { slug: "pi-cycle-bottom", name: "Pi Cycle Bottom", direction: "lowIsBottom", kind: "priceDerived",
    compute: piCycleBottom,
    blurb: "150-day EMA vs 0.745× the 471-day average. Ratios near/below 1 have pinned cycle lows." },
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

// ── Derived-series helpers (pure) ────────────────────────────────────────────
// Rolling means over a [{ d, ts, v }] series. Return an array aligned to the
// input; entries before the window is full are null.
function smaSeries(values, window) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

function emaSeries(values, window) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (window + 1);
  let ema = null;
  for (let i = 0; i < values.length; i++) {
    ema = ema === null ? values[i] : values[i] * k + ema * (1 - k);
    if (i >= window - 1) out[i] = ema; // emit once the window has warmed up
  }
  return out;
}

// price ÷ SMA(price, window): Mayer Multiple (200d), 200-week MA ratio (1400d).
function ratioToSMA(points, window) {
  const ma = smaSeries(points.map((p) => p.v), window);
  return points
    .map((p, i) => (ma[i] ? { d: p.d, ts: p.ts, v: p.v / ma[i] } : null))
    .filter(Boolean);
}

// Pi Cycle Bottom: 150-day EMA ÷ (0.745 × 471-day SMA); ≤1 marks the low zone.
function piCycleBottom(points) {
  const values = points.map((p) => p.v);
  const ema = emaSeries(values, 150);
  const sma = smaSeries(values, 471);
  return points
    .map((p, i) => (ema[i] && sma[i] ? { d: p.d, ts: p.ts, v: ema[i] / (0.745 * sma[i]) } : null))
    .filter(Boolean);
}

// Hash Ribbons: 30-day ÷ 60-day SMA of the hashrate series (<1 = capitulation).
function hashRibbons(points) {
  const values = points.map((p) => p.v);
  const s30 = smaSeries(values, 30);
  const s60 = smaSeries(values, 60);
  return points
    .map((p, i) => (s30[i] && s60[i] ? { d: p.d, ts: p.ts, v: s30[i] / s60[i] } : null))
    .filter(Boolean);
}

// Binance date→close Map → sorted [{ d, ts, v }] series (ts in Unix seconds, to
// match bitcoin-data's unixTs, so scoreSeries' 30-day lookback lines up).
function priceSeriesFromMap(priceByDate) {
  return [...priceByDate.entries()]
    .map(([d, v]) => ({ d, ts: Math.round(Date.parse(`${d}T00:00:00Z`) / 1000), v }))
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.ts - b.ts);
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
    fetchedAt: new Date().toISOString(),
    available: true,
  };
}

function unavailableRow(def) {
  return { slug: def.slug, name: def.name, blurb: def.blurb, phase: null, score: null,
    change30d: null, rawValue: null, asOfDate: null, fetchedAt: new Date().toISOString(),
    available: false };
}

// ── Main ───────────────────────────────────────────────────────────────────
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

// Freshness skip keeps a same-day second run inside the daily request cap.
// An explicit --force or --only means "refetch now regardless".
const MIN_REFRESH_HOURS = Number(process.env.MIN_REFRESH_HOURS ?? 20);
const force = process.argv.includes("--force") || only !== null;
const nowMs = Date.now();

// Load existing snapshot so a partial (rate-limited) run merges, never clobbers.
const existing = existsSync(OUT_PATH)
  ? JSON.parse(readFileSync(OUT_PATH, "utf8"))
  : { generatedAt: null, btcPrice: null, rows: [] };
const rowBySlug = new Map(existing.rows.map((r) => [r.slug, r]));

// A bitcoin-data metric already fetched successfully within the window doesn't
// need re-fetching this run. (Unavailable rows are always retried.)
function isFresh(def) {
  const row = rowBySlug.get(def.slug);
  if (!row?.available || !row.fetchedAt) return false;
  const ageH = (nowMs - Date.parse(row.fetchedAt)) / 3_600_000;
  return Number.isFinite(ageH) && ageH < MIN_REFRESH_HOURS;
}

const needsPrice = METRICS.some(
  (m) => (m.kind === "priceModel" || m.kind === "priceDerived") && (!only || only.has(m.slug))
);
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

// Sorted price series for priceDerived metrics (built once, reused per metric).
const priceSeries = priceByDate?.size ? priceSeriesFromMap(priceByDate) : null;

const remaining = [];
let hitLimit = false;

// Fetch stalest metrics first: a rate-limited run always starts with whatever
// the previous run couldn't reach, so consecutive runs cover the whole
// registry even when no single run can. ("" sorts before any timestamp,
// putting never-fetched rows at the front; output order stays registry order.
// Falls back to asOfDate for snapshots that predate the fetchedAt field.)
const lastFetched = (def) => {
  const row = rowBySlug.get(def.slug);
  return row?.fetchedAt ?? row?.asOfDate ?? "";
};
const fetchOrder = [...METRICS].sort((a, b) =>
  lastFetched(a) < lastFetched(b) ? -1 : lastFetched(a) > lastFetched(b) ? 1 : 0
);

for (const def of fetchOrder) {
  if (only && !only.has(def.slug)) continue;

  // priceDerived: computed from the Binance series — no API budget, never limited.
  if (def.kind === "priceDerived") {
    const series = priceSeries ? def.compute(priceSeries) : [];
    if (!series.length) {
      console.log(`${def.slug}… ${priceSeries ? "not enough history" : "no price series"} → unavailable`);
      rowBySlug.set(def.slug, unavailableRow(def));
      continue;
    }
    const row = scoreSeries(def, series);
    rowBySlug.set(def.slug, row);
    console.log(`${def.slug}… score ${row.score} (${row.phase}), 30d ${row.change30d >= 0 ? "+" : ""}${row.change30d} [price-derived]`);
    continue;
  }

  // bitcoin-data path (rate-limited). Skip anything still fresh; stop on 429.
  if (!force && isFresh(def)) {
    console.log(`Skipping ${def.slug} — fetched <${MIN_REFRESH_HOURS}h ago`);
    continue;
  }
  if (hitLimit) { remaining.push(def.slug); continue; }
  try {
    process.stdout.write(`Fetching ${def.slug}… `);
    const { points, notFound } = await getHistory(def.slug);
    if (notFound || !points) {
      console.log("404 / empty → unavailable");
      rowBySlug.set(def.slug, unavailableRow(def));
      continue;
    }

    // Reshape the raw series if the metric asks for it (e.g. Hash Ribbons).
    let series = def.transform ? def.transform(points) : points;
    if (!series.length) {
      console.log("transform produced no points → unavailable");
      rowBySlug.set(def.slug, unavailableRow(def));
      continue;
    }
    if (def.kind === "priceModel") {
      if (!priceByDate?.size) {
        console.log("no price series → unavailable");
        rowBySlug.set(def.slug, unavailableRow(def));
        continue;
      }
      // Convert model price series into a spot/model ratio series.
      series = series
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
