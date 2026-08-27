/**
 * Generate the BTC bottom & top indicator snapshot.
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
// Full daily history back to 2009 (keyless, one request). Fills the pre-Binance
// years the cycle charts need; Binance wins wherever both have a close.
const BLOCKCHAIN_INFO_URL =
  "https://api.blockchain.info/charts/market-price?timespan=all&format=json&sampled=false";
const CYCLES_PATH = new URL("./cycles.json", OUT_DIR);

// Cycle anchors = bear-market lows (daily close). Cowen counts cycle days from
// low to low: 2015-01-14 → 2018-12-15 = 1,431 days, 2018-12-15 → 2022-11-21 =
// 1,437 days. The peak inside each cycle is computed, not hard-coded.
const CYCLE_LOWS = ["2011-11-18", "2015-01-14", "2018-12-15", "2022-11-21"];
const HALVINGS = ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"];
const GENESIS_MS = Date.UTC(2009, 0, 3);
// Per-metric score history (weekly), merged across runs like the snapshot, so
// the "price colored by risk" chart can average whatever has been fetched.
const SCORE_HISTORY_PATH = new URL("./score-history.json", OUT_DIR);

// ── Metric registry ────────────────────────────────────────────────────────
// kind "oscillator":   mean-reverting ratio → score = percentile of raw value.
//                      Optionally `transform` reshapes the fetched series first
//                      (e.g. Hash Ribbons = SMA ratio of the hashrate series).
// kind "priceModel":   bitcoin-data USD price level → percentile of (spot/model).
// kind "priceDerived": computed ENTIRELY from the Binance price series via
//                      `compute(priceSeries)`; costs no bitcoin-data budget.
// direction "lowIsBottom": cheap/low = capitulation = low score = "Bottom".
// side "bottom" | "top": one-sided specialist trigger — only meaningful at its
//                      own extreme, so it is EXCLUDED from the headline average
//                      and only counts toward its own watch panel. Omitted =
//                      "both" (two-sided; lows marked bottoms AND highs tops).
//
// The first block hits the rate-limited bitcoin-data API (one request each).
const METRICS = [
  { slug: "mvrv-zscore", name: "MVRV Z-Score", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Market cap vs realized cap in standard deviations. Deep lows marked historic bottoms; extremes above ~7 marked every major top." },
  { slug: "mvrv", name: "MVRV Ratio", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Market value / realized value. Below ~1 the average holder is underwater; above ~3.5 is historically overheated." },
  { slug: "nupl", name: "Net Unrealized P/L (NUPL)", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Share of supply sitting in profit. Negative = capitulation; above ~0.75 = the euphoria zone of past tops." },
  { slug: "sopr", name: "SOPR", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Spent-output profit ratio. Sustained sub-1 = coins selling at a loss; persistently rich = heavy profit-taking near tops." },
  { slug: "reserve-risk", name: "Reserve Risk", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Long-term-holder conviction vs price. Lows flag attractive risk/reward; highs flag late-cycle complacency." },
  { slug: "sth-mvrv", name: "Short-Term Holder MVRV", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Cost-basis ratio of recent buyers. Deep lows = fresh money underwater; extremes = new buyers sitting on top-heavy gains." },
  { slug: "lth-mvrv", name: "Long-Term Holder MVRV", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Cost-basis ratio of seasoned holders. Lows accompany bear-market bottoms; extremes accompany distribution tops." },
  { slug: "puell-multiple", name: "Puell Multiple", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Daily miner issuance in USD vs its yearly average. Sub-0.5 marked every cycle low; above ~4 marked blow-off tops." },
  { slug: "rhodl-ratio", name: "RHODL Ratio", direction: "lowIsBottom", kind: "oscillator",
    blurb: "Realized-cap HODL waves (1-week vs 1–2-year bands). Lows = speculation flushed out; highs = froth at cycle peaks." },
  { slug: "hashrate", name: "Hash Ribbons", direction: "lowIsBottom", kind: "oscillator",
    transform: hashRibbons, side: "bottom",
    blurb: "30-day vs 60-day hashrate momentum. Dips below 1 mark miner-capitulation bottoms; says nothing about tops." },
  { slug: "realized-price", name: "Realized Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Aggregate on-chain cost basis. Spot below it = the market underwater; spot far above it = historically stretched." },
  { slug: "balanced-price", name: "Balanced Price", direction: "lowIsBottom", kind: "priceModel",
    blurb: "Realized minus transferred price. Spot near it marked cycle bottoms; a large premium marked late-cycle heat." },
  // priceDerived — computed from Binance klines, zero bitcoin-data budget.
  { slug: "mayer-multiple", name: "Mayer Multiple", direction: "lowIsBottom", kind: "priceDerived",
    compute: (series) => ratioToSMA(series, 200),
    blurb: "Price vs its 200-day average. Readings near 0.5 marked deep bottoms; above ~2.4 marked overheated tops." },
  { slug: "mayer-200w", name: "200-Week MA Ratio", direction: "lowIsBottom", kind: "priceDerived",
    compute: (series) => ratioToSMA(series, 1400),
    blurb: "Price vs its 200-week average — the line macro bottoms touch; multiples of ~3+ accompanied past tops." },
  { slug: "pi-cycle-bottom", name: "Pi Cycle Bottom", direction: "lowIsBottom", kind: "priceDerived",
    compute: piCycleBottom, side: "bottom",
    blurb: "150-day EMA vs 0.745× the 471-day average. Ratios near/below 1 have pinned cycle lows; says nothing about tops." },
  { slug: "pi-cycle-top", name: "Pi Cycle Top", direction: "lowIsBottom", kind: "priceDerived",
    compute: piCycleTop, side: "top",
    blurb: "111-day MA vs 2× the 350-day MA. The upward cross of 1 called the 2013, 2017 and 2021 tops within days." },
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

// Pi Cycle Top: 111-day SMA ÷ (2 × 350-day SMA); the cross above 1 has marked
// every blow-off top since 2013 within days.
function piCycleTop(points) {
  const values = points.map((p) => p.v);
  const s111 = smaSeries(values, 111);
  const s350 = smaSeries(values, 350);
  return points
    .map((p, i) => (s111[i] && s350[i] ? { d: p.d, ts: p.ts, v: s111[i] / (2 * s350[i]) } : null))
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

// ── Cycle-chart series (pure) ──────────────────────────────────────────────
// Chart 1: each cycle re-based to its low → [dayIndex, price / lowPrice], so
// four cycles overlay on one "days since cycle low" axis. Chart 2: weekly
// closes with the Bull-Market-Support / Bear-Market-Resistance band (20W SMA +
// 21W EMA — same two lines, Cowen names them by regime) and the 200W SMA.
const round4 = (v) => Number(v.toPrecision(4));

function buildCycles(points) {
  const byDate = new Map(points.map((p, i) => [p.d, i]));
  const cycles = [];
  for (let c = 0; c < CYCLE_LOWS.length; c++) {
    const lowIdx = byDate.get(CYCLE_LOWS[c]);
    if (lowIdx === undefined) continue;
    const nextLowIdx = c + 1 < CYCLE_LOWS.length ? byDate.get(CYCLE_LOWS[c + 1]) : undefined;
    const endIdx = nextLowIdx ?? points.length - 1;
    const low = points[lowIdx];
    let peakIdx = lowIdx;
    for (let i = lowIdx; i <= endIdx; i++) if (points[i].v > points[peakIdx].v) peakIdx = i;
    const series = [];
    for (let i = lowIdx; i <= endIdx; i++) series.push(round4(points[i].v / low.v));
    cycles.push({
      label: `${low.d.slice(0, 4)} cycle`,
      lowDate: low.d,
      lowPrice: round4(low.v),
      peakDate: points[peakIdx].d,
      peakPrice: round4(points[peakIdx].v),
      peakDay: peakIdx - lowIdx,
      endDay: endIdx - lowIdx,
      endedAtNextLow: nextLowIdx !== undefined,
      /** Unsampled multiples at the peak and at the last day. */
      peakMultiple: round4(points[peakIdx].v / low.v),
      endMultiple: round4(points[endIdx].v / low.v),
      /** price ÷ lowPrice on days 0, 2, 4, … and endDay (see `step`). */
      step: 2,
      roi: sampleEvery(series, 2),
    });
  }
  return cycles;
}

// Halving epochs: price ÷ halving-day price, index = days since the halving.
// Sampled every 2nd day (the overlay chart can't show finer at its width).
function buildHalvings(points) {
  const byDate = new Map(points.map((p, i) => [p.d, i]));
  const out = [];
  for (let h = 0; h < HALVINGS.length; h++) {
    const startIdx = byDate.get(HALVINGS[h]);
    if (startIdx === undefined) continue;
    const nextIdx = h + 1 < HALVINGS.length ? byDate.get(HALVINGS[h + 1]) : undefined;
    const endIdx = nextIdx ?? points.length - 1;
    const base = points[startIdx].v;
    let peakIdx = startIdx;
    for (let i = startIdx; i <= endIdx; i++) if (points[i].v > points[peakIdx].v) peakIdx = i;
    out.push({
      label: `${HALVINGS[h].slice(0, 4)} halving`,
      date: HALVINGS[h],
      price: round4(base),
      peakDay: peakIdx - startIdx,
      peakMultiple: round4(points[peakIdx].v / base),
      endDay: endIdx - startIdx,
      ended: nextIdx !== undefined,
      /** price ÷ halving price on days 0, 2, 4, … and endDay. */
      roi: sampleEvery(points.slice(startIdx, endIdx + 1).map((p) => round4(p.v / base)), 2),
    });
  }
  return out;
}

// Keep every `step`-th element plus the last one.
function sampleEvery(arr, step) {
  const out = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if ((arr.length - 1) % step !== 0) out.push(arr[arr.length - 1]);
  return out;
}

// Log-log regression: log10(price) ~ a + b·log10(days since genesis). OLS for
// the trend, then residual quantiles for the band fan (Cowen-style: the
// lower bands hug the bear-market lows, the upper ones the blow-off tops).
function buildRegression(points) {
  const xs = [], ys = [];
  for (const p of points) {
    const days = (p.ts * 1000 - GENESIS_MS) / 86_400_000;
    if (days < 365) continue; // pre-2010 pennies distort the fit
    xs.push(Math.log10(days)); ys.push(Math.log10(p.v));
  }
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const b = sxy / sxx, a = my - b * mx;
  const resid = xs.map((x, i) => ys[i] - (a + b * x)).sort((p, q) => p - q);
  const q = (f) => resid[Math.min(n - 1, Math.max(0, Math.round(f * (n - 1))))];
  return {
    a: Number(a.toFixed(5)), b: Number(b.toFixed(5)),
    /** log10 offsets to add to the trend for each named band. */
    bands: { floor: Number(q(0.005).toFixed(4)), low: Number(q(0.1).toFixed(4)), mid: 0,
      high: Number(q(0.9).toFixed(4)), ceiling: Number(q(0.995).toFixed(4)) },
    fittedThrough: points.at(-1).d,
    genesis: "2009-01-03",
  };
}

// Calendar-month returns: { year: [12 × pct or null] }, from month-end closes.
function buildMonthlyReturns(points) {
  const monthEnd = new Map(); // "YYYY-MM" → last close of that month
  for (const p of points) monthEnd.set(p.d.slice(0, 7), p.v);
  const keys = [...monthEnd.keys()].sort();
  const out = {};
  for (let i = 1; i < keys.length; i++) {
    const [y, m] = keys[i].split("-");
    if (Number(y) < 2011) continue;
    (out[y] ??= new Array(12).fill(null))[Number(m) - 1] =
      Number(((monthEnd.get(keys[i]) / monthEnd.get(keys[i - 1]) - 1) * 100).toFixed(1));
  }
  return out;
}

// Full daily closes (every 2nd day + latest) for drawdown / risk-colored
// charts, as a compact [startDate, step, closes[]] triple.
function buildDaily(points, fromDate = "2011-01-01") {
  const from = points.findIndex((p) => p.d >= fromDate);
  const slice = points.slice(from);
  return { start: slice[0].d, step: 2, closes: sampleEvery(slice.map((p) => round4(p.v)), 2) };
}

// Bear markets: from each cycle peak to the next cycle low.
function buildBears(cycles) {
  const out = [];
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    out.push({
      peakDate: c.peakDate, peakPrice: c.peakPrice,
      lowDate: c.endedAtNextLow ? cycles[i + 1]?.lowDate ?? null : null,
      lowPrice: round4(c.endMultiple * c.lowPrice),
      drawdown: Number((c.endMultiple / c.peakMultiple - 1).toFixed(4)),
      days: c.endDay - c.peakDay,
      ended: c.endedAtNextLow,
    });
  }
  return out;
}

// Weekly closes (Mon–Sun weeks, Sunday close — TradingView's crypto week).
function weeklyCloses(points) {
  const weeks = [];
  let cur = null;
  for (const p of points) {
    const dow = (new Date(p.ts * 1000).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    const weekStart = p.ts - dow * 86400;
    if (!cur || cur.start !== weekStart) {
      cur = { start: weekStart, d: p.d, v: p.v };
      weeks.push(cur);
    } else {
      cur.d = p.d; cur.v = p.v;
    }
  }
  return weeks;
}

function buildBands(points, fromDate = "2012-01-01") {
  const weeks = weeklyCloses(points);
  const closes = weeks.map((w) => w.v);
  const sma20 = smaSeries(closes, 20);
  const ema21 = emaSeries(closes, 21);
  const sma200 = smaSeries(closes, 200);
  // 2-year (730-day) daily SMA, read at each week's end — the Investor Tool line.
  const daily730 = smaSeries(points.map((p) => p.v), 730);
  const idxByDate = new Map(points.map((p, i) => [p.d, i]));
  const rows = [];
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].d < fromDate) continue;
    const di = idxByDate.get(weeks[i].d);
    const s2y = di === undefined ? null : daily730[di];
    rows.push([
      weeks[i].d, round4(closes[i]),
      sma20[i] === null ? null : round4(sma20[i]),
      ema21[i] === null ? null : round4(ema21[i]),
      sma200[i] === null ? null : round4(sma200[i]),
      s2y === null ? null : round4(s2y),
    ]);
  }
  return { columns: ["weekEnd", "close", "sma20w", "ema21w", "sma200w", "sma2y"], rows };
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

// blockchain.info: { values: [{ x: unixSeconds, y: usd }] } daily since 2009.
async function blockchainInfoPrices() {
  const res = await fetch(BLOCKCHAIN_INFO_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`blockchain.info → HTTP ${res.status}`);
  const body = await res.json();
  const map = new Map();
  for (const p of body?.values ?? []) {
    const v = Number(p.y);
    if (Number.isFinite(v) && v > 0) map.set(new Date(p.x * 1000).toISOString().slice(0, 10), v);
  }
  return map;
}

// Long history for the cycle charts: blockchain.info for 2010–2017, Binance
// (exchange close, more precise) overriding wherever it has the date.
async function getLongPriceByDate(binanceByDate) {
  const map = await blockchainInfoPrices();
  if (map.size < 2000) throw new Error("blockchain.info returned too little history");
  for (const [d, v] of binanceByDate ?? []) map.set(d, v);
  return map;
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

  // Weekly score history (every 7th point, always including the latest).
  // Same full-history percentile as the headline score, so the history is
  // exactly "what the gauge would read on that day with today's ranking".
  const history = [];
  for (let i = points.length - 1; i >= 0; i -= 7) {
    history.push([points[i].d, computeScore(points[i].v, sorted, def.direction)]);
  }
  history.reverse();
  scoreHistoryBySlug.set(def.slug, { side: def.side ?? "both", history });

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
const existingHistory = existsSync(SCORE_HISTORY_PATH)
  ? JSON.parse(readFileSync(SCORE_HISTORY_PATH, "utf8"))
  : { generatedAt: null, metrics: {} };
const scoreHistoryBySlug = new Map(Object.entries(existingHistory.metrics ?? {}));

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
    // A price-source outage is transient: keep yesterday's good row rather
    // than clobbering it with "unavailable" (stale beats blank).
    if (!priceSeries && rowBySlug.get(def.slug)?.available) {
      console.log(`${def.slug}… price source down — keeping previous snapshot row`);
      continue;
    }
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
        if (rowBySlug.get(def.slug)?.available) {
          console.log("price source down — keeping previous snapshot row");
        } else {
          console.log("no price series → unavailable");
          rowBySlug.set(def.slug, unavailableRow(def));
        }
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

// Emit rows in registry order so the table is deterministic. Presentation
// fields (name/blurb/side) always come from the registry, so copy or side
// changes reach the snapshot even for rows skipped as fresh this run.
const rows = METRICS.map((m) => {
  const row = rowBySlug.get(m.slug);
  return row ? { ...row, name: m.name, blurb: m.blurb, side: m.side ?? "both" } : null;
}).filter(Boolean);
const snapshot = {
  generatedAt: new Date().toISOString(),
  btcPrice: btcSpot,
  rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");

// Score history in registry order; metrics never fetched are simply absent.
const metricsHistory = {};
for (const m of METRICS) {
  const h = scoreHistoryBySlug.get(m.slug);
  if (h) metricsHistory[m.slug] = { ...h, side: m.side ?? "both" };
}
writeFileSync(SCORE_HISTORY_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  metrics: metricsHistory,
}) + "\n");
console.log(`Score history: ${Object.keys(metricsHistory).length} metrics → ${SCORE_HISTORY_PATH.pathname}`);

const ok = rows.filter((r) => r.available).length;
console.log(`\nWrote ${rows.length} rows (${ok} available) → ${OUT_PATH.pathname}`);

// ── Cycle charts ───────────────────────────────────────────────────────────
// Costs no bitcoin-data budget. A source outage keeps the previous file
// (stale beats blank), same as the price-derived rows above.
if (!only) {
  try {
    console.log("Building cycle charts (blockchain.info + Binance)…");
    const longSeries = priceSeriesFromMap(await getLongPriceByDate(priceByDate));
    const cycles = buildCycles(longSeries);
    const bands = buildBands(longSeries);
    const cyclesOut = {
      generatedAt: new Date().toISOString(),
      asOfDate: longSeries.at(-1).d,
      sources: ["blockchain.info market-price (2010→)", "Binance BTCUSDT daily close (2017→, wins on overlap)"],
      cycles,
      halvings: buildHalvings(longSeries),
      bears: buildBears(cycles),
      bands,
      regression: buildRegression(longSeries),
      monthlyReturns: buildMonthlyReturns(longSeries),
      daily: buildDaily(longSeries),
    };
    writeFileSync(CYCLES_PATH, JSON.stringify(cyclesOut) + "\n");
    const cur = cycles.at(-1);
    console.log(`  ${cycles.length} cycles, current on day ${cur?.endDay} (peak day ${cur?.peakDay}); ${bands.rows.length} weekly rows → ${CYCLES_PATH.pathname}`);
  } catch (e) {
    console.warn(`  cycle charts skipped (${e.message}) — keeping previous cycles.json`);
  }
}
if (remaining.length) {
  console.log(`Rate-limited before: ${remaining.join(", ")} — re-run in ~1h to finish.`);
}
