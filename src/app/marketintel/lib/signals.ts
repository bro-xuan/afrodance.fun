import type { DerivativesData, EtfData, LiquidationData, MacroData, OiPoint, PolymarketData } from "./types";
import { pct, price, usd } from "./format";

/**
 * "Market pulse": turns the raw panels into one-line reads. Every rule is a
 * simple, well-known heuristic; thresholds are deliberately round numbers so
 * they're easy to sanity-check. Context, not signals to trade blindly.
 */

export type Lean = "bull" | "bear" | "neutral";
export type Signal = { key: string; label: string; value: string; read: string; lean: Lean };

export const OI_VENUES = ["binance", "bybit", "okx"] as const;
export type OiVenue = (typeof OI_VENUES)[number];

/** % change in OI (BTC terms) over the last `hours`, per venue and combined. */
export function oiChange(h: OiPoint[], hours: number) {
  const full = h.filter((p) => OI_VENUES.every((v) => p[v] !== null) && p.price !== null);
  if (full.length <= hours) return null;
  const now = full[full.length - 1];
  const then = full[full.length - 1 - hours];
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
  return up !== null && down !== null ? { up, down, upAt, downAt } : null;
}

export function buildSignals(
  d: DerivativesData | null,
  l: LiquidationData | null,
  e: EtfData | null,
  p: PolymarketData | null,
  m: MacroData | null,
): Signal[] {
  const out: Signal[] = [];

  if (d?.weightedFunding8h != null) {
    const f = d.weightedFunding8h * 100;
    const ann = d.weightedFunding8h * 3 * 365 * 100;
    out.push({
      key: "funding",
      label: "Funding, OI weighted",
      value: `${pct(f, 4)} per 8h`,
      read:
        f > 0.03 ? `Longs paying up (${ann.toFixed(0)}% APR). Crowded, risk of a flush lower`
        : f < 0 ? `Shorts paying longs (${ann.toFixed(1)}% APR). Fuel for a short squeeze`
        : `Neutral carry (${ann.toFixed(1)}% APR), no crowding`,
      lean: f > 0.03 ? "bear" : f < 0 ? "bull" : "neutral",
    });
  }

  const r = d ? oiChange(d.oiHistory, 24) : null;
  if (r) {
    const up = r.price >= 0;
    const oiUp = r.total >= 0;
    const flat = Math.abs(r.total) < 0.5;
    out.push({
      key: "oi-regime",
      label: "Open interest 24h",
      value: `${pct(r.total, 2)} in BTC`,
      read: `Price ${pct(r.price, 2)}. ${
        flat ? "Leverage flat, the move is spot driven"
        : up && oiUp ? "Rising OI with price: new longs, trend has fuel"
        : up ? "Falling OI into strength: short covering, weaker rally"
        : oiUp ? "Rising OI into weakness: shorts pressing"
        : "Both falling: longs capitulating, deleveraging"
      }`,
      lean: flat || !oiUp ? "neutral" : up ? "bull" : "bear",
    });
  }

  const last = d?.ratios.at(-1);
  if (last?.binanceAccounts != null) {
    const a = last.binanceAccounts;
    const top = last.binanceTop;
    const share = (x: number) => `${((x / (1 + x)) * 100).toFixed(0)}%`;
    out.push({
      key: "ls",
      label: "Binance traders long",
      value: `${share(a)} of accounts`,
      read: `${top != null ? `Top traders ${share(top)} long by size. ` : ""}${
        a > 2 ? "Retail heavily long, contrarian bearish"
        : a < 0.9 ? "Retail net short, contrarian bullish"
        : top != null && top > a + 0.15 ? "Big accounts more long than the crowd"
        : "Normal skew, no extreme"
      }`,
      lean: a > 2 ? "bear" : a < 0.9 ? "bull" : top != null && top > a + 0.15 ? "bull" : "neutral",
    });
  }

  if (e?.days.length) {
    const days = e.days.filter((x) => x.total !== null);
    const last5 = days.slice(-5).reduce((s, x) => s + (x.total ?? 0), 0);
    const inflowDays = days.slice(-5).filter((x) => (x.total ?? 0) > 0).length;
    out.push({
      key: "etf",
      label: "Spot ETF flows, 5 days",
      value: `${last5 >= 0 ? "+" : "−"}$${Math.abs(last5).toFixed(0)}M`,
      read: `${inflowDays} of 5 days inflow. ${
        last5 > 500 ? "Steady institutional bid" : last5 < -500 ? "Institutions de-risking" : "Flows mixed"
      }`,
      lean: last5 > 500 ? "bull" : last5 < -500 ? "bear" : "neutral",
    });
  }

  if (d?.coinbasePremiumPct != null) {
    const c = d.coinbasePremiumPct;
    out.push({
      key: "cbp",
      label: "Coinbase premium",
      value: pct(c, 3),
      read:
        c > 0.05 ? "Coinbase above Binance: US buyers paying up"
        : c < -0.05 ? "Coinbase below Binance: US spot selling"
        : "Coinbase and Binance in line",
      lean: c > 0.05 ? "bull" : c < -0.05 ? "bear" : "neutral",
    });
  }

  const mag = liqMagnet(l);
  if (mag && (mag.above || mag.below)) {
    const bigger = mag.above >= mag.below ? "above" : "below";
    const peak = bigger === "above" ? mag.peakAbove : mag.peakBelow;
    out.push({
      key: "magnet",
      label: "Liquidations within 5%",
      value: `${usd(mag.above, 1)} up, ${usd(mag.below, 1)} down`,
      read: `Bigger pool ${bigger}, densest near ${price(peak.price)}. Price often hunts it`,
      lean: mag.above > mag.below * 1.3 ? "bull" : mag.below > mag.above * 1.3 ? "bear" : "neutral",
    });
  }

  const skew = touchSkew(p, d?.price ?? null);
  if (skew) {
    out.push({
      key: "poly",
      label: "Polymarket, this month",
      value: `${(skew.up * 100).toFixed(0)}% up, ${(skew.down * 100).toFixed(0)}% down`,
      read: `Odds BTC touches +5% (${price(skew.upAt)}) vs −5% (${price(skew.downAt)}) before month end`,
      lean: skew.up > skew.down * 1.3 ? "bull" : skew.down > skew.up * 1.3 ? "bear" : "neutral",
    });
  }

  if (m?.fearGreed) {
    const v = m.fearGreed.value;
    out.push({
      key: "fng",
      label: "Fear and Greed",
      value: `${v}, ${m.fearGreed.label}`,
      read: v >= 75 ? "Euphoria, tops form here" : v <= 25 ? "Capitulation zone, bottoms form here" : "Sentiment mid range",
      lean: v >= 75 ? "bear" : v <= 25 ? "bull" : "neutral",
    });
  }

  return out;
}
