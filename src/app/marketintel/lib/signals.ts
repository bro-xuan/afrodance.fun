import type { DerivativesData, EtfData, LiquidationData, MacroData, OiPoint, PolymarketData, PriceData, VolData } from "./types";
import { localDay, pct, price, usd } from "./format";
import { nearestExpiry, realizedVol, sigmaMove, touchProb } from "./quant";

/**
 * "Market pulse": turns the raw panels into one-line reads, each scored on a
 * continuous −1 (bearish) … +1 (bullish) scale with a dead zone around
 * "normal", so noise like −0.0004% funding scores 0 instead of flipping a
 * bullish vote. Scores are weighted (flows and leverage count more than
 * sentiment gauges) into one net bias. Every threshold is a round, well-known
 * desk heuristic so it's easy to sanity-check. Context, not trade signals.
 */

export type Lean = "bull" | "bear" | "neutral";
export type SignalKind = "Flow" | "Leverage" | "Options" | "Crowd" | "Odds";
export type Signal = {
  key: string;
  label: string;
  kind: SignalKind;
  contrarian: boolean; // reads against the crowd: extremes fade
  value: string;
  read: string;
  score: number; // −1 … +1
  weight: number;
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
  now?: number;
};

type Draft = Omit<Signal, "lean">;

export function buildSignals({ d, l, e, p, m, v, now = Date.now() }: PulseInputs): Signal[] {
  const out: Draft[] = [];
  const spot = d?.price ?? v?.index ?? null;
  const dow = new Date(now).getUTCDay();
  const weekend = dow === 0 || dow === 6;

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
      weight: 1,
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
      weight: weekend ? 0.4 : 0.75,
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
      }${outlier}`,
      score,
      weight: 1,
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
      score: flat || drift || !oiUp ? 0 : (up ? 1 : -1) * clamp(r.total / 4, 0, 1),
      weight: 0.75,
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
      weight: 0.5,
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
      weight: 0.75,
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
      weight: 0.75,
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
      weight: 0.5,
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
      weight: 0.5,
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
      weight: 0.5,
    });
  }

  return out.map((x) => ({ ...x, score: Number.isFinite(x.score) ? x.score : 0, lean: leanOf(x.score) }));
}

/** Weighted net bias, −100 … +100, plus how much the reads agree. */
export function composite(signals: Signal[]) {
  const w = signals.reduce((s, x) => s + x.weight, 0);
  if (!w) return null;
  const net = (signals.reduce((s, x) => s + x.weight * x.score, 0) / w) * 100;
  const bullW = signals.filter((x) => x.lean === "bull").reduce((s, x) => s + x.weight, 0);
  const bearW = signals.filter((x) => x.lean === "bear").reduce((s, x) => s + x.weight, 0);
  // Agreement: the share of directional weight on the winning side.
  const agree = bullW + bearW > 0 ? Math.max(bullW, bearW) / (bullW + bearW) : null;
  const a = Math.abs(net);
  const side = net > 0 ? "bullish" : "bearish";
  const label = a < 8 ? "No edge, reads cancel out" : a < 20 ? `Mildly ${side}` : a < 40 ? `Moderately ${side}` : `Strongly ${side}`;
  return {
    net,
    label,
    agree,
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
