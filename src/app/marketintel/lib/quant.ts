import { prevWeek, volumeProfile, vwapSince } from "./levels";
import type { Candle, DerivativesData, ExpiryVol, PriceData, VolData } from "./types";
import type { liqMagnet } from "./signals";

/**
 * Small quant toolkit for the dashboard: realized vol, the expected move
 * implied by options, barrier-touch odds, and the key price levels traders
 * actually mark on their charts.
 */

const DAY = 86_400_000;
const sq = (x: number) => x * x;

/** Annualised close-to-close realized vol (%) over the last `n` returns. BTC trades 365 days. */
export function realizedVol(candles: Candle[], n: number, periodsPerYear = 365): number | null {
  const c = candles.slice(-(n + 1));
  if (c.length < n + 1) return null;
  const r = c.slice(1).map((x, i) => Math.log(x.c / c[i].c));
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + sq(x - mean), 0) / (r.length - 1);
  return Math.sqrt(v * periodsPerYear) * 100;
}

/** Simple moving average of the last `n` closes, or null if there aren't enough. */
export function sma(candles: Candle[], n: number): number | null {
  if (candles.length < n) return null;
  return candles.slice(-n).reduce((s, c) => s + c.c, 0) / n;
}

/** Share of `xs` at or below `v`, 0 … 1: where today sits in its own recent history. */
export function percentileRank(xs: number[], v: number): number | null {
  if (xs.length < 10) return null;
  return xs.filter((x) => x <= v).length / xs.length;
}

/** "93rd", "1st", "42nd" */
export function ordinal(p: number): string {
  const n = Math.round(p * 100);
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

/** Binance's current funding and OI ranked against their own last 90 / 30 days. */
export function leverageContext(d: DerivativesData | null) {
  const fNow = d?.venues.find((v) => v.exchange === "Binance" && /USDT/.test(v.market))?.fundingRate8h ?? null;
  const oiNow = d?.oiHistory.at(-1)?.binance ?? null;
  return {
    fundingPct: fNow !== null && d ? percentileRank(d.fundingHistory.map((x) => x.v), fNow) : null,
    oiPct: oiNow !== null && d ? percentileRank(d.oiDaily.map((x) => x.v), oiNow) : null,
  };
}

/** 1σ move in $ over `days`, from an annualised vol in %. */
export const sigmaMove = (spot: number, volPct: number, days: number) => spot * (volPct / 100) * Math.sqrt(days / 365);

// Abramowitz-Stegun 7.1.26, |error| < 1.5e-7: plenty for deltas and touch odds.
export function normCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * Odds a driftless lognormal path touches `barrier` before `days` (reflection
 * principle): 2·(1 − N(|ln(B/S)| / σ√T)). The "fair" price of a Polymarket
 * hit market if options vol is right.
 */
export function touchProb(spot: number, barrier: number, volPct: number, days: number): number {
  const sd = (volPct / 100) * Math.sqrt(days / 365);
  if (sd <= 0) return 0;
  return Math.min(1, 2 * (1 - normCdf(Math.abs(Math.log(barrier / spot)) / sd)));
}

/** Expiry closest to `targetDays`, among those with a usable value for `pick`. */
export function nearestExpiry(v: VolData | null, targetDays: number, pick: (e: ExpiryVol) => number | null): ExpiryVol | null {
  const xs = (v?.expiries ?? []).filter((e) => pick(e) !== null);
  return xs.reduce<ExpiryVol | null>((b, e) => (!b || Math.abs(e.days - targetDays) < Math.abs(b.days - targetDays) ? e : b), null);
}

// ── Key levels ─────────────────────────────────────────────────────────────
export type LevelKind = "session" | "open" | "trend" | "vwap" | "profile" | "cme" | "onchain" | "liq" | "options" | "vol";
export type Level = { key: string; label: string; price: number; kind: LevelKind; note: string };

const utcDay = (t: number) => Math.floor(t / DAY) * DAY;
const utcWeekStart = (t: number) => {
  const d = utcDay(t);
  return d - (((new Date(d).getUTCDay() + 6) % 7) * DAY); // Monday 00:00 UTC
};
const utcMonthStart = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

export function keyLevels(
  px: PriceData,
  spot: number | null,
  mag: ReturnType<typeof liqMagnet>,
  vol: VolData | null,
  now = Date.now(),
): Level[] {
  const { daily, hourly } = px;
  const dvol = vol?.dvol ?? null;
  const out: Level[] = [];
  const today = utcDay(now);
  const prev = daily.filter((c) => c.t < today).at(-1);
  if (prev) {
    out.push({ key: "pdh", label: "Prev. day high", price: prev.h, kind: "session", note: "Yesterday's UTC high. First resistance, often swept" });
    out.push({ key: "pdl", label: "Prev. day low", price: prev.l, kind: "session", note: "Yesterday's UTC low. First support, often swept" });
  }
  // Last 7d range from hourly candles.
  const wk = hourly.filter((c) => c.t >= now - 7 * DAY);
  if (wk.length) {
    out.push({ key: "7dh", label: "7 day high", price: Math.max(...wk.map((c) => c.h)), kind: "session", note: "Top of the past week's range" });
    out.push({ key: "7dl", label: "7 day low", price: Math.min(...wk.map((c) => c.l)), kind: "session", note: "Bottom of the past week's range" });
  }
  const wOpen = daily.find((c) => c.t === utcWeekStart(now)) ?? hourly.find((c) => c.t === utcWeekStart(now));
  if (wOpen) out.push({ key: "wo", label: "Weekly open", price: wOpen.o, kind: "open", note: "Monday 00:00 UTC. Above it, the week is green" });
  const mOpen = daily.find((c) => c.t === utcMonthStart(now));
  if (mOpen) out.push({ key: "mo", label: "Monthly open", price: mOpen.o, kind: "open", note: "1st of the month, 00:00 UTC" });
  const pw = prevWeek(daily, utcWeekStart(now));
  if (pw) {
    out.push({ key: "pwh", label: "Prev. week high", price: pw.h, kind: "session", note: "Last week's UTC high. A weekly breakout level" });
    out.push({ key: "pwl", label: "Prev. week low", price: pw.l, kind: "session", note: "Last week's UTC low. A weekly breakdown level" });
  }

  // Anchored VWAPs: the average price paid since the week / month opened.
  // Above it, the period's buyers are in profit and tend to defend it.
  const wv = vwapSince(hourly, utcWeekStart(now));
  if (wv) out.push({ key: "wvwap", label: "Weekly VWAP", price: wv, kind: "vwap", note: "Volume-weighted average price since Monday 00:00 UTC" });
  const mv = vwapSince(hourly, utcMonthStart(now));
  if (mv) out.push({ key: "mvwap", label: "Monthly VWAP", price: mv, kind: "vwap", note: "Volume-weighted average price since the 1st" });

  const vp = volumeProfile(hourly, 250);
  if (vp) {
    out.push({ key: "poc", label: "Volume POC, 30d", price: vp.poc, kind: "profile", note: "Most traded price of the month. Price gravitates back to it" });
    out.push({ key: "vah", label: "Value area high", price: vp.vah, kind: "profile", note: "Top of the range holding 70% of the month's volume. Acceptance above = trend" });
    out.push({ key: "val", label: "Value area low", price: vp.val, kind: "profile", note: "Bottom of the 70% value area. Acceptance below = trend down" });
  }

  if (px.cmeGap) {
    const g = px.cmeGap;
    out.push({
      key: "cme", label: "CME gap", price: g.close / (1 + g.basis), kind: "cme",
      note: `Unfilled weekend gap: CME closed at $${Math.round(g.close).toLocaleString("en-US")} and reopened at $${Math.round(g.reopen).toLocaleString("en-US")}. Shown in spot terms. Gaps tend to get filled`,
    });
  }
  if (px.onchain.sth) out.push({ key: "sth", label: "STH cost basis", price: px.onchain.sth, kind: "onchain", note: `Average cost of coins moved in the last 155 days (as of ${px.onchain.asOf}). The bull/bear pivot: recent buyers defend it in bull markets, sell into it in bear markets` });
  if (px.onchain.realized) out.push({ key: "rp", label: "Realized price", price: px.onchain.realized, kind: "onchain", note: `Average cost of every coin (as of ${px.onchain.asOf}). Bear market floor` });

  const closed = daily.filter((c) => c.t < today);
  const ma50 = sma(closed, 50);
  const ma200 = sma(closed, 200);
  if (ma50) out.push({ key: "ma50", label: "50D average", price: ma50, kind: "trend", note: "Swing trend line. Bulls defend it in uptrends, bears sell it in downtrends" });
  if (ma200) out.push({ key: "ma200", label: "200D average", price: ma200, kind: "trend", note: "The bull/bear line. Funds and allocators key off it" });

  if (mag?.peakAbove.v) out.push({ key: "liqu", label: "Short liq cluster", price: mag.peakAbove.price, kind: "liq", note: `Densest short liquidations within +5% (model)` });
  if (mag?.peakBelow.v) out.push({ key: "liqd", label: "Long liq cluster", price: mag.peakBelow.price, kind: "liq", note: `Densest long liquidations within −5% (model)` });

  const g = vol?.gamma;
  if (g?.flip) out.push({ key: "gflip", label: "Gamma flip", price: g.flip, kind: "options", note: "Dealer gamma changes sign here (Deribit, assumed positioning). Above: dealers dampen moves. Below: they amplify them" });
  if (g?.callWall) out.push({ key: "cwall", label: "Call wall", price: g.callWall, kind: "options", note: "Strike with the most call gamma. Dealer hedging sells into it: resistance" });
  if (g?.putWall) out.push({ key: "pwall", label: "Put wall", price: g.putWall, kind: "options", note: "Strike with the most put gamma. Dealer hedging buys into it: support" });

  if (spot && dvol) {
    const m = sigmaMove(spot, dvol, 1);
    out.push({ key: "s1u", label: "+1σ today", price: spot + m, kind: "vol", note: `1-day expected move from DVOL ${dvol.toFixed(0)}` });
    out.push({ key: "s1d", label: "−1σ today", price: spot - m, kind: "vol", note: `About 68% of days close inside ±1σ` });
  }
  // Keep the list to levels a trade could plausibly reach.
  const ref = spot ?? hourly.at(-1)?.c;
  return out.filter((l) => !ref || Math.abs(l.price / ref - 1) <= 0.25).sort((a, b) => b.price - a.price);
}
