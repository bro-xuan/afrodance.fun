import type { CrossData, DerivativesData, EtfData, LiquidationData, MacroData, OiPoint, PolymarketData, PriceData, RealizedLiqData, VolData } from "./types";
import { localDay, pct, price, usd } from "./format";
import { leverageContext, nearestExpiry, ordinal, realizedVol, sigmaMove, sma, touchProb } from "./quant";

/**
 * "Market pulse": turns the raw panels into one-line reads, each scored on a
 * continuous −1 (bearish) … +1 (bullish) scale with a dead zone around
 * "normal", so noise like −0.0004% funding scores 0 instead of flipping a
 * bullish vote. Each read carries a weight per trading horizon (taker flow
 * matters for today, ETF flows for the next weeks, liquidity for the next
 * months), so the pulse is three net biases rather than one blurred average.
 * Every threshold is a round, well-known desk heuristic so it's easy to
 * sanity-check. Context, not trade signals.
 */

export type Lean = "bull" | "bear" | "neutral";
export type SignalKind = "Trend" | "Flow" | "Leverage" | "Options" | "Crowd" | "Odds" | "Macro";
export type Horizon = "intraday" | "swing" | "macro";
export const HORIZONS: { key: Horizon; label: string; span: string }[] = [
  { key: "intraday", label: "Intraday", span: "hours to 2 days" },
  { key: "swing", label: "Swing", span: "1 to 3 weeks" },
  { key: "macro", label: "Macro", span: "1 to 3 months" },
];
export type Weights = Partial<Record<Horizon, number>>;

/** |net| below this, the pulse says "no edge"; at or above it, it's a call (and gets graded). */
export const NO_EDGE = 8;
/**
 * Bump whenever reads, weights or thresholds change, so the track record
 * never grades two different scoring models as one.
 */
export const MODEL = 3;
export type Signal = {
  key: string;
  label: string;
  kind: SignalKind;
  contrarian: boolean; // reads against the crowd: extremes fade
  value: string;
  read: string;
  score: number; // −1 … +1
  w: Weights; // weight per horizon; missing = doesn't count there
  lean: Lean;
};

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
/** Shrink toward zero by `zone`: values inside the zone are just noise. */
const dz = (x: number, zone: number) => Math.sign(x) * Math.max(0, Math.abs(x) - zone);
const leanOf = (score: number): Lean => (score >= 0.2 ? "bull" : score <= -0.2 ? "bear" : "neutral");

export const OI_VENUES = ["binance", "bybit", "okx"] as const;
export type OiVenue = (typeof OI_VENUES)[number];

/** % change in OI (BTC terms) over the last `hours`, per venue and combined. */
export function oiChange(h: OiPoint[], hours: number) {
  const full = h.filter((p) => OI_VENUES.every((v) => p[v] !== null) && p.price !== null);
  if (full.length < 2) return null;
  const now = full[full.length - 1];
  // Look up by time, not row count, so a missing hour can't stretch the window.
  const target = now.t - hours * 3_600_000;
  const then = full.find((p) => Math.abs(p.t - target) <= 30 * 60_000);
  if (!then) return null;
  const sum = (p: OiPoint) => OI_VENUES.reduce((s, v) => s + p[v]!, 0);
  const venues = Object.fromEntries(OI_VENUES.map((v) => [v, (now[v]! / then[v]! - 1) * 100])) as Record<OiVenue, number>;
  return {
    total: (sum(now) / sum(then) - 1) * 100,
    btc: sum(now) - sum(then),
    price: (now.price! / then.price! - 1) * 100,
    venues,
  };
}

export function liqMagnet(l: LiquidationData | null, range = 0.05) {
  if (!l?.price || !l.bins.length) return null;
  const p = l.price;
  let above = 0;
  let below = 0;
  let peakAbove = { price: 0, v: 0 };
  let peakBelow = { price: 0, v: 0 };
  for (const b of l.bins) {
    const mid = b.price + l.binSize / 2;
    if (mid > p && mid <= p * (1 + range)) {
      above += b.shortUsd;
      if (b.shortUsd > peakAbove.v) peakAbove = { price: mid, v: b.shortUsd };
    } else if (mid < p && mid >= p * (1 - range)) {
      below += b.longUsd;
      if (b.longUsd > peakBelow.v) peakBelow = { price: mid, v: b.longUsd };
    }
  }
  return { above, below, peakAbove, peakBelow };
}

/**
 * Polymarket "hit" ladder: odds of touching exactly ±`move` from spot,
 * linearly interpolated between the two strikes either side, so up and down
 * are compared at the same distance.
 */
export function touchSkew(p: PolymarketData | null, spot: number | null, horizon = "This month", move = 0.05) {
  const m = p?.markets.find((x) => x.kind === "hit" && x.horizon === horizon);
  if (!m || !spot) return null;
  const at = (dir: "up" | "down", target: number) => {
    const r = m.rungs.filter((x) => x.dir === dir).sort((a, b) => a.strike - b.strike);
    for (let i = 0; i < r.length - 1; i++) {
      const lo = r[i];
      const hi = r[i + 1];
      if (target >= lo.strike && target <= hi.strike) {
        return lo.p + ((target - lo.strike) / (hi.strike - lo.strike)) * (hi.p - lo.p);
      }
    }
    return null;
  };
  const upAt = spot * (1 + move);
  const downAt = spot * (1 - move);
  const up = at("up", upAt);
  const down = at("down", downAt);
  return up !== null && down !== null ? { up, down, upAt, downAt, endDate: m.endDate } : null;
}

export type PulseInputs = {
  d: DerivativesData | null;
  l: LiquidationData | null;
  e: EtfData | null;
  p: PolymarketData | null;
  m: MacroData | null;
  v: VolData | null;
  px: PriceData | null;
  lq?: RealizedLiqData | null;
  x?: CrossData | null;
  now?: number;
};

/** OKX's realized liquidations scaled to all venues by its share of open interest. */
export function liqScale(d: DerivativesData | null): number | null {
  const okx = d?.venues.find((v) => v.exchange === "OKX" && /USDT/.test(v.market))?.oiUsd;
  return okx && d?.totalOiUsd ? d.totalOiUsd / okx : null;
}

type Draft = Omit<Signal, "lean">;

export function buildSignals({ d, l, e, p, m, v, px, lq = null, x = null, now = Date.now() }: PulseInputs): Signal[] {
  const out: Draft[] = [];
  const spot = d?.price ?? v?.index ?? null;
  const dow = new Date(now).getUTCDay();
  const weekend = dow === 0 || dow === 6;

  // ── Trend ───────────────────────────────────────────────────────────────
  // Positioning reads mean different things above and below the 200D: a
  // flush in an uptrend is a dip to buy, in a downtrend it's the trend.
  const closed = px?.daily.filter((c) => c.t < Math.floor(now / 86_400_000) * 86_400_000) ?? [];
  const ma50 = sma(closed, 50);
  const ma200 = sma(closed, 200);
  // Needs the full 200 days: a shorter feed would silently switch formulas
  // and make the logged score jump with no change in the market.
  // Spot close from the same feed as the averages, so a derivatives outage
  // doesn't take the trend read down with it.
  const close = px?.daily.at(-1)?.c ?? null;
  if (close && ma50 && ma200) {
    const d200 = close / ma200 - 1;
    const cross = ma50 / ma200 - 1;
    // 20-day return in σ units of daily vol, so a quiet grind and a volatile
    // spike of the same size don't score the same.
    const rv = realizedVol(closed, 30);
    const r20 = Math.log(close / closed.at(-20)!.c);
    const z = rv ? r20 / ((rv / 100) * Math.sqrt(20 / 365)) : 0;
    const parts = 0.4 * clamp(d200 / 0.1) + 0.3 * clamp(cross / 0.05) + 0.3 * clamp(z / 2);
    const above200 = d200 >= 0;
    const golden = cross >= 0;
    out.push({
      key: "trend",
      label: "Trend, daily",
      kind: "Trend",
      contrarian: false,
      value: `${pct(d200 * 100, 1)} vs 200D`,
      read: `${
        above200 && golden ? "Above the 200D, 50D over 200D: uptrend, dips get bought"
        : !above200 && !golden ? "Below the 200D, 50D under 200D: downtrend, rallies get sold"
        : above200 ? "Back above the 200D but 50D still under it: recovery, unconfirmed"
        : "Lost the 200D with 50D still over it: trend breaking down"
      }. 20 day move ${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`,
      score: clamp(parts),
      w: { intraday: 0.5, swing: 1.25, macro: 1.5 },
    });
  }

  // Intraday tape: where price sits against today's volume-weighted average,
  // and whether aggressive spot buyers or sellers are behind it.
  const day = px?.hourly.slice(-24) ?? [];
  const vol = day.reduce((s, c) => s + c.v, 0);
  if (day.length >= 12 && vol > 0) {
    // Spot close vs spot VWAP: the perp price would bake the basis into it.
    const vwap = day.reduce((s, c) => s + ((c.h + c.l + c.c) / 3) * c.v, 0) / vol;
    const dv = day[day.length - 1].c / vwap - 1;
    const taker = day.reduce((s, c) => s + c.delta, 0) / vol; // net taker share, −1 … +1
    const hasDelta = day.some((c) => c.delta !== 0); // Bybit fallback has no taker split
    const flow = hasDelta ? clamp(dz(taker, 0.01) / 0.05) : 0;
    const diverge = hasDelta && Math.sign(dv) !== Math.sign(taker) && Math.abs(dv) > 0.003 && Math.abs(taker) > 0.01;
    out.push({
      key: "tape",
      label: "Tape, 24h",
      kind: "Flow",
      contrarian: false,
      value: `${pct(dv * 100, 2)} vs VWAP`,
      read: `24h VWAP ${price(vwap)}. ${
        !hasDelta ? "No taker split from the fallback feed"
        : `Spot takers net ${taker >= 0 ? "buying" : "selling"} ${Math.abs(taker * 100).toFixed(1)}% of volume`
      }${
        diverge ? (dv > 0 ? ". Price up without aggressive buyers: fade risk" : ". Price down while takers buy: absorption")
        : ""
      }`,
      score: clamp(0.5 * clamp(dv / 0.015) + 0.5 * flow),
      w: { intraday: 1.25, swing: 0.25 },
    });
  }

  // ── Flow ────────────────────────────────────────────────────────────────
  if (e?.days.length) {
    const days = e.days.filter((x) => x.total !== null);
    const sum = (n: number) => days.slice(-n).reduce((s, x) => s + (x.total ?? 0), 0);
    const last5 = sum(5);
    const inflowDays = days.slice(-5).filter((x) => (x.total ?? 0) > 0).length;
    out.push({
      key: "etf",
      label: "ETF flows, 5 days",
      kind: "Flow",
      contrarian: false,
      value: `${last5 >= 0 ? "+" : "−"}$${Math.abs(last5).toFixed(0)}M`,
      read: `${inflowDays} of 5 days inflow, 20 days ${sum(20) >= 0 ? "+" : "−"}$${(Math.abs(sum(20)) / 1000).toFixed(2)}B. ${
        last5 > 500 ? "Steady institutional bid" : last5 < -500 ? "Institutions de-risking" : "Flows mixed"
      }`,
      score: clamp(dz(last5, 150) / 1000),
      w: { swing: 1, macro: 0.75 },
    });
  }

  if (d?.coinbasePremiumPct != null) {
    const c = d.coinbasePremiumPct;
    out.push({
      key: "cbp",
      label: "Coinbase premium",
      kind: "Flow",
      contrarian: false,
      value: pct(c, 3),
      read: `${
        c > 0.05 ? "Coinbase above Binance: US buyers paying up"
        : c < -0.05 ? "Coinbase below Binance: US spot selling"
        : "Coinbase and Binance in line"
      }${weekend ? ". Weekend: thin US flow, half weight" : ""}`,
      score: clamp(dz(c, 0.02) / 0.12),
      w: weekend ? { intraday: 0.4, swing: 0.25 } : { intraday: 0.75, swing: 0.5 },
    });
  }

  // Spot vs perp taker flow: who's doing the buying. Spot-led moves are
  // organic; perp-led moves are leverage and tend to give back.
  const sp = px?.hourly.slice(-24) ?? [];
  const pp = px?.perpHourly.slice(-24) ?? [];
  const share = (cs: typeof sp) => {
    const vol = cs.reduce((s, c) => s + c.v, 0);
    return vol > 0 && cs.some((c) => c.delta !== 0) ? cs.reduce((s, c) => s + c.delta, 0) / vol : null;
  };
  const ss = share(sp);
  const ps = share(pp);
  if (ss !== null && ps !== null) {
    const diff = ss - ps;
    const f = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)}%`;
    out.push({
      key: "spotperp",
      label: "Spot vs perp flow, 24h",
      kind: "Flow",
      contrarian: false,
      value: `${f(ss)} / ${f(ps)}`,
      read: `Net taker share, spot / perp (Binance). ${
        Math.abs(diff) < 0.01 ? "Spot and perp in step"
        : diff > 0 ? (ss > 0 ? "Spot buyers leading: organic demand" : "Perps selling harder than spot: leverage leaving")
        : ps > 0 ? "Perps buying, spot isn't: leverage-led, tends to fade" : "Spot selling harder than perps: real supply"
      }`,
      score: clamp(dz(diff, 0.01) / 0.08),
      w: { intraday: 0.75, swing: 0.5 },
    });
  }

  // ── Leverage ────────────────────────────────────────────────────────────
  if (d?.weightedFunding8h != null) {
    const f = d.weightedFunding8h * 100; // % per 8h
    const ann = d.weightedFunding8h * 3 * 365 * 100;
    const rated = d.venues.filter((x) => x.fundingRate8h !== null);
    const lo = rated.reduce((a, b) => (b.fundingRate8h! < a.fundingRate8h! ? b : a), rated[0]);
    const hi = rated.reduce((a, b) => (b.fundingRate8h! > a.fundingRate8h! ? b : a), rated[0]);
    // 0.01%/8h is the exchanges' default (the interest leg), so "normal" is
    // a small positive number. Only distance beyond the band carries signal.
    const score = f > 0.01 ? -clamp((f - 0.01) / 0.04) : f < -0.003 ? clamp((-f - 0.003) / 0.02) : 0;
    const rank = leverageContext(d).fundingPct;
    const outlier = lo && hi && hi.fundingRate8h! - lo.fundingRate8h! > 0.0001
      ? `. Range ${lo.exchange} ${pct(lo.fundingRate8h! * 100, 3)} to ${hi.exchange} ${pct(hi.fundingRate8h! * 100, 3)}`
      : "";
    out.push({
      key: "funding",
      label: "Funding",
      kind: "Leverage",
      contrarian: true,
      value: `${pct(f, 4)} / 8h`,
      read: `${
        f > 0.03 ? `Longs paying up (${ann.toFixed(0)}% APR). Crowded, flush risk`
        : f > 0.01 ? `Longs paying above baseline (${ann.toFixed(1)}% APR). Mild crowding`
        : f < -0.003 ? `Shorts paying longs (${ann.toFixed(1)}% APR). Squeeze fuel`
        : `Near zero (${ann.toFixed(1)}% APR). Nobody paying to lean`
      }${rank !== null ? `. ${ordinal(rank)} percentile of 90 days` : ""}${outlier}`,
      score,
      w: { intraday: 0.75, swing: 1 },
    });
  }

  const r = d ? oiChange(d.oiHistory, 24) : null;
  if (r) {
    const flat = Math.abs(r.total) < 0.5;
    const drift = Math.abs(r.price) < 0.5;
    const up = r.price >= 0;
    const oiUp = r.total >= 0;
    out.push({
      key: "oi-regime",
      label: "Open interest, 24h",
      kind: "Leverage",
      contrarian: false,
      value: `${pct(r.total, 2)} in BTC`,
      read: `Price ${pct(r.price, 2)}. ${
        flat ? "Leverage flat, the move is spot driven"
        : drift && oiUp ? "Leverage building while price sits still: a breakout is loading"
        : drift ? "Leverage leaving while price sits still: quieter tape ahead"
        : up && oiUp ? "Rising OI with price: new longs, trend has fuel"
        : up ? "Falling OI into strength: short covering, weaker rally"
        : oiUp ? "Rising OI into weakness: shorts pressing"
        : "Both falling: longs capitulating, deleveraging"
      }`,
      // New leverage behind a move backs it. Leverage leaving a move half
      // counts against it: short covering fades, long capitulation exhausts.
      score: flat || drift ? 0 : (up ? 1 : -1) * (oiUp ? 1 : -0.5) * clamp(Math.abs(r.total) / 4, 0, 1),
      w: { intraday: 1, swing: 0.5 },
    });
  }

  // Liquidations that actually happened. A one-sided flush is contrarian:
  // the forced sellers (or buyers) are done, and the move often reverses.
  const scale = liqScale(d);
  if (lq && scale && lq.sources.every((s) => s.ok)) {
    const L = lq.h4.long * scale;
    const S = lq.h4.short * scale;
    const total = L + S;
    const imb = total > 0 ? (L - S) / total : 0;
    const big = clamp(total / 50e6, 0, 1); // $50M+ in 4h across venues is a real flush
    out.push({
      key: "flush",
      label: "Liquidations, 4h",
      kind: "Leverage",
      contrarian: true,
      value: `${usd(L, 0)} L / ${usd(S, 0)} S`,
      read: `Estimated all venues from OKX fills (×${scale.toFixed(1)}). ${
        total < 5e6 ? "Quiet: no forced flow"
        : total < 25e6 ? `Light: mostly ${imb > 0.3 ? "longs" : imb < -0.3 ? "shorts" : "both sides"} liquidated, nothing that marks a flush`
        : imb > 0.3 ? "Longs flushed: forced selling done, bounce risk"
        : imb < -0.3 ? "Shorts squeezed: forced buying done, pullback risk"
        : "Both sides liquidated: chop"
      }`,
      score: total < 5e6 ? 0 : clamp(dz(imb, 0.3) / 0.5) * big,
      w: { intraday: 0.75, swing: 0.25 },
    });
  }

  const basis = nearestExpiry(v, 90, (x) => x.basisAnn);
  if (basis?.basisAnn != null) {
    const b = basis.basisAnn;
    out.push({
      key: "basis",
      label: "Basis, 3 months",
      kind: "Leverage",
      contrarian: true,
      value: `${pct(b, 1)} a year`,
      read: `Deribit ${basis.code} vs index. ${
        b > 12 ? "Rich carry: leveraged longs paying up"
        : b >= 5 ? "Normal contango"
        : b >= 0 ? "Thin carry: little appetite for leverage"
        : "Backwardation: hedgers paying, capitulation style"
      }`,
      score: b > 12 ? -clamp((b - 12) / 12) : b < 0 ? clamp(-b / 5) : 0,
      w: { swing: 0.5, macro: 0.75 },
    });
  }

  // ── Options ─────────────────────────────────────────────────────────────
  const skew = nearestExpiry(v, 30, (x) => x.rr25);
  if (skew?.rr25 != null) {
    const rr = skew.rr25;
    out.push({
      key: "rr25",
      label: "Skew, 25Δ RR",
      kind: "Options",
      contrarian: false,
      value: `${rr >= 0 ? "+" : "−"}${Math.abs(rr).toFixed(1)} vol pts`,
      read: `${skew.code}, ${Math.round(skew.days)}d. ${
        rr > 2 ? "Calls well bid over puts: desks chasing upside"
        : rr > 0.5 ? "Calls slightly over puts: mild upside demand"
        : rr < -2 ? "Puts well bid over calls: paying for crash protection"
        : rr < -0.5 ? "Puts slightly over calls: hedging demand"
        : "Flat skew: no directional premium"
      }`,
      score: clamp(dz(rr, 0.5) / 5),
      w: { intraday: 0.25, swing: 0.75 },
    });
  }

  // ── Crowd ───────────────────────────────────────────────────────────────
  const last = d?.ratios.at(-1);
  if (last?.binanceAccounts != null) {
    const a = last.binanceAccounts;
    const top = last.binanceTop;
    const shareOf = (x: number) => x / (1 + x);
    const share = shareOf(a);
    const topShare = top != null ? shareOf(top) : null;
    // Retail sits ~58% long most of the time; 67% is crowded, 49% unusual.
    const crowd = -clamp(dz(share - 0.58, 0.03) / 0.08);
    const smart = topShare !== null ? clamp(dz(topShare - share, 0.05) / 0.1) * 0.4 : 0;
    out.push({
      key: "ls",
      label: "Traders long",
      kind: "Crowd",
      contrarian: true,
      value: `${(share * 100).toFixed(0)}% of accounts`,
      read: `Binance. ${topShare !== null ? `Top traders ${(topShare * 100).toFixed(0)}% long by size. ` : ""}${
        a > 2 ? "Retail heavily long, contrarian bearish"
        : a < 0.9 ? "Retail net short, contrarian bullish"
        : smart > 0 ? "Big accounts more long than the crowd"
        : smart < 0 ? "Big accounts less long than the crowd"
        : "Normal skew, no extreme"
      }`,
      score: clamp(crowd + smart),
      w: { intraday: 0.5, swing: 0.75 },
    });
  }

  if (m?.fearGreed) {
    const fg = m.fearGreed.value;
    out.push({
      key: "fng",
      label: "Fear and Greed",
      kind: "Crowd",
      contrarian: true,
      value: `${fg}, ${m.fearGreed.label}`,
      read: fg >= 75 ? "Euphoria, tops form here" : fg <= 25 ? "Capitulation zone, bottoms form here" : fg > 60 ? "Leaning greedy, not extreme" : fg < 40 ? "Leaning fearful, not extreme" : "Sentiment mid range",
      score: -clamp(dz(fg - 50, 10) / 30),
      w: { swing: 0.5, macro: 0.5 },
    });
  }

  // ── Odds & liquidity ────────────────────────────────────────────────────
  const mag = liqMagnet(l);
  if (mag && (mag.above || mag.below)) {
    const bigger = mag.above >= mag.below ? "above" : "below";
    const peak = bigger === "above" ? mag.peakAbove : mag.peakBelow;
    const imb = (mag.above - mag.below) / (mag.above + mag.below);
    out.push({
      key: "magnet",
      label: "Liq pools, ±5%",
      kind: "Odds",
      contrarian: false,
      value: `${usd(mag.above, 1)} ↑ / ${usd(mag.below, 1)} ↓`,
      read: Math.abs(imb) < 0.1
        ? `Balanced pools. Densest ${bigger}, near ${price(peak.price)}`
        : `Bigger pool ${bigger}, densest near ${price(peak.price)}. Price often hunts it`,
      score: clamp(dz(imb, 0.1) / 0.4),
      w: { intraday: 0.75, swing: 0.25 },
    });
  }

  const t = touchSkew(p, spot);
  if (t) {
    const days = Math.max(0.1, (t.endDate - now) / 86_400_000);
    const dvol = v?.dvol ?? null;
    const fair = dvol && spot ? (touchProb(spot, t.upAt, dvol, days) + touchProb(spot, t.downAt, dvol, days)) / 2 : null;
    const avg = (t.up + t.down) / 2;
    const volNote = fair === null ? ""
      : Math.abs(avg - fair) < 0.05 ? ` Options agree (${(fair * 100).toFixed(0)}% fair).`
      : avg < fair ? ` Options imply ${(fair * 100).toFixed(0)}%: the crowd prices less movement.`
      : ` Options imply ${(fair * 100).toFixed(0)}%: the crowd prices more movement.`;
    out.push({
      key: "poly",
      label: "Polymarket, ±5%",
      kind: "Odds",
      contrarian: false,
      value: `↑${(t.up * 100).toFixed(0)}% / ↓${(t.down * 100).toFixed(0)}%`,
      read: `Odds of ${price(t.upAt)} vs ${price(t.downAt)} by ${localDay(t.endDate)}.${volNote}`,
      score: clamp(dz(t.up - t.down, 0.03) / 0.2),
      w: { swing: 0.5 },
    });
  }

  // Risk tape: today's equity and dollar moves, each weighted by how tightly
  // BTC has actually traded with that market over the last 30 sessions. A
  // 1% Nasdaq rally means little for BTC at a 0.1 correlation, a lot at 0.6.
  const legsX = (["nq", "dxy"] as const).flatMap((k) => {
    const q = x?.quotes.find((y) => y.key === k);
    const c = x?.correlations.find((y) => y.key === k)?.corr30;
    return q && !q.stale && q.change !== null && c != null ? [{ k, change: q.change, c, push: q.change * c }] : [];
  });
  if (legsX.length) {
    const push = legsX.reduce((s, y) => s + y.push, 0);
    const nq = legsX.find((y) => y.k === "nq");
    const dx = legsX.find((y) => y.k === "dxy");
    out.push({
      key: "risktape",
      label: "Risk tape, today",
      kind: "Macro",
      contrarian: false,
      value: [nq && `NQ ${pct(nq.change, 1)}`, dx && `DXY ${pct(dx.change, 1)}`].filter(Boolean).join(", "),
      read: `30d correlation to BTC: ${[nq && `Nasdaq ${nq.c.toFixed(2)}`, dx && `dollar ${dx.c.toFixed(2)}`].filter(Boolean).join(", ")}. ${
        Math.abs(push) < 0.15 ? "No meaningful push from macro today"
        : push > 0 ? "Cross-asset tape is a tailwind for BTC today"
        : "Cross-asset tape is a headwind for BTC today"
      }`,
      score: clamp(dz(push, 0.15) / 0.8),
      w: { intraday: 0.5, swing: 0.25 },
    });
  }

  // ── Macro ───────────────────────────────────────────────────────────────
  // The slow tide: more liquidity and stablecoins lift BTC, a rising dollar
  // and rising yields drain it. FRED prints daily or weekly, so this only
  // counts at swing and macro horizons.
  const stat = (k: string) => {
    const x = m?.stats.find((s) => s.key === k);
    return x?.value != null && x.change != null ? { value: x.value, change: x.change, pct: (x.change / (x.value - x.change)) * 100 } : null;
  };
  const liq = stat("netliq");
  const dxy = stat("dxy");
  // Real yields are the cleaner headwind gauge; fall back to nominal.
  const real = stat("real10y");
  const y10 = real ?? stat("us10y");
  const stb = stat("stables");
  const legs = [
    liq && { w: 0.3, s: clamp(dz(liq.pct, 0.5) / 3) },
    stb && { w: 0.2, s: clamp(dz(stb.pct, 0.5) / 3) },
    dxy && { w: 0.3, s: -clamp(dz(dxy.pct, 0.5) / 3) },
    y10 && { w: 0.2, s: -clamp(dz(y10.change, 0.1) / 0.4) }, // percentage points
  ].filter((x): x is { w: number; s: number } => !!x);
  if (legs.length >= 2) {
    const sw = legs.reduce((s, x) => s + x.w, 0);
    const score = legs.reduce((s, x) => s + x.w * x.s, 0) / sw;
    const tight = (dxy?.pct ?? 0) > 1 || (y10?.change ?? 0) > 0.2;
    const easy = (liq?.pct ?? 0) > 1 || (dxy?.pct ?? 0) < -1;
    out.push({
      key: "macro",
      label: "Liquidity, dollar, rates",
      kind: "Macro",
      contrarian: false,
      value: [
        dxy && `$ ${pct(dxy.pct, 1)}`,
        y10 && `${real ? "real 10Y" : "10Y"} ${y10.change >= 0 ? "+" : "−"}${Math.abs(y10.change * 100).toFixed(0)}bp`,
      ].filter(Boolean).join(", "),
      read: `Over 30 days: net liquidity ${liq ? pct(liq.pct, 1) : "n/a"}, stablecoins ${stb ? pct(stb.pct, 1) : "n/a"}. ${
        tight && !easy ? "Dollar or yields rising: tightening, a headwind"
        : easy && !tight ? "Liquidity expanding, dollar soft: a tailwind"
        : tight && easy ? "Mixed: liquidity up but the dollar or yields too"
        : "No strong macro push either way"
      }`,
      score: clamp(score),
      w: { swing: 0.5, macro: 1.5 },
    });
  }

  return out.map((x) => ({ ...x, score: Number.isFinite(x.score) ? x.score : 0, lean: leanOf(x.score) }));
}

/** Weighted net bias for one horizon, −100 … +100, plus how much the reads agree. */
export function composite(all: Signal[], h: Horizon) {
  const signals = all.filter((x) => (x.w[h] ?? 0) > 0);
  const wt = (x: Signal) => x.w[h] ?? 0;
  const w = signals.reduce((s, x) => s + wt(x), 0);
  if (!w) return null;
  const net = (signals.reduce((s, x) => s + wt(x) * x.score, 0) / w) * 100;
  const bullW = signals.filter((x) => x.lean === "bull").reduce((s, x) => s + wt(x), 0);
  const bearW = signals.filter((x) => x.lean === "bear").reduce((s, x) => s + wt(x), 0);
  // Agreement: the share of directional weight on the winning side.
  const agree = bullW + bearW > 0 ? Math.max(bullW, bearW) / (bullW + bearW) : null;
  const a = Math.abs(net);
  const side = net > 0 ? "bullish" : "bearish";
  const label = a < NO_EDGE ? "No edge, reads cancel out" : a < 20 ? `Mildly ${side}` : a < 40 ? `Moderately ${side}` : `Strongly ${side}`;
  const drivers = signals
    .filter((x) => x.lean !== "neutral")
    .sort((a, b) => Math.abs(b.score * wt(b)) - Math.abs(a.score * wt(a)))
    .slice(0, 3);
  return {
    net,
    label,
    agree,
    drivers,
    count: signals.length,
    bull: signals.filter((x) => x.lean === "bull"),
    bear: signals.filter((x) => x.lean === "bear"),
    neutral: signals.filter((x) => x.lean === "neutral"),
  };
}

/** Non-directional context: how much BTC is expected to move, and is vol cheap or rich. */
export function volRegime(v: VolData | null, px: PriceData | null, spot: number | null) {
  const dvol = v?.dvol ?? null;
  const rv7 = px ? realizedVol(px.daily.slice(0, -1), 7) : null; // completed days only
  const rv30 = px ? realizedVol(px.daily.slice(0, -1), 30) : null;
  const near = nearestExpiry(v, 7, (x) => x.atmIv);
  const far = nearestExpiry(v, 90, (x) => x.atmIv);
  return {
    dvol,
    dvolChg: dvol !== null && v?.dvol24hAgo != null ? dvol - v.dvol24hAgo : null,
    rv7,
    rv30,
    premium: dvol !== null && rv30 !== null ? dvol - rv30 : null, // IV − RV, vol points
    day: spot && dvol ? sigmaMove(spot, dvol, 1) : null,
    week: spot && dvol ? sigmaMove(spot, dvol, 7) : null,
    // Short-dated IV above long-dated = the market expects an event soon.
    inverted: near?.atmIv != null && far?.atmIv != null && near !== far ? near.atmIv > far.atmIv + 1 : null,
  };
}
