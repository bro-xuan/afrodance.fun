import type { PolyKind, PolyMarket, PolymarketData, PolyRung } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, num } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polymarket odds, auto-discovered.
 *
 * Polymarket rolls these markets constantly (a new "Bitcoin above ___ on
 * <date>" every day, a new "Fed decision in <month>" per meeting…), so nothing
 * here is pinned to a market id. Each request lists active events for a few
 * tags, classifies them by slug pattern, and picks the soonest-unexpired event
 * per slot. When a market resolves, the next one is picked up automatically.
 *
 * BTC: price-range buckets for the next daily close, "above $K" ladders, and
 * weekly / monthly / yearly touch ladders.
 * Macro: next CPI print and Fed cuts this year. FOMC decisions live in the
 * separate Fed route, next to the futures-implied odds.
 */

const GAMMA = "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100";

type GMarket = {
  question: string;
  groupItemTitle?: string;
  outcomePrices?: string;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  closed?: boolean;
  active?: boolean;
};
type GEvent = { slug: string; title: string; endDate: string; volume?: number; volume24hr?: number; markets?: GMarket[] };

const RX = {
  range: /^bitcoin-price-on-[a-z]+-\d{1,2}-\d{4}$/,
  above: /^bitcoin-above-on-[a-z]+-\d{1,2}-\d{4}$/,
  week: /^what-price-will-bitcoin-hit-[a-z]+-\d{1,2}-(?:[a-z]+-)?\d{1,2}-\d{4}$/,
  month: /^what-price-will-bitcoin-hit-in-[a-z]+-\d{4}$/,
  year: /^what-price-will-bitcoin-hit-(?:before|in)-\d{4}$/,
  cpi: /^[a-z]+-inflation-us-annual$/,
  cuts: /^how-many-fed-rate-cuts-in-\d{4}$/,
};

/** Mid of a tight book (firm), else the last trade or listed price (may be stale). */
function quote(m: GMarket): { p: number; firm: boolean } | null {
  const bid = num(m.bestBid);
  const ask = num(m.bestAsk);
  if (bid !== null && ask !== null && ask - bid <= 0.1) return { p: (bid + ask) / 2, firm: true };
  const last = num(m.lastTradePrice);
  if (last !== null) return { p: last, firm: false };
  try {
    const p = num(JSON.parse(m.outcomePrices ?? "[]")[0]);
    return p === null ? null : { p, firm: false };
  } catch {
    return null;
  }
}

const prob = (m: GMarket) => quote(m)?.p ?? null;

/**
 * Odds must fall as the strike moves away from spot: P(above) and P(hit up)
 * drop as the strike rises, P(hit down) rises with it. A rung that breaks
 * that is a stale quote in a thin market (a $74K "above" at 53% under a $78K
 * at 94%), so drop it. Firm quotes from a tight book win over stale ones.
 */
function dropStale(r: (PolyRung & { firm: boolean })[]): PolyRung[] {
  const ordered = (a: PolyRung, b: PolyRung) => // a.strike < b.strike, same dir
    a.dir === "down" ? a.p <= b.p + 0.02 : a.p + 0.02 >= b.p;
  let xs = r;
  for (let pass = 0; pass < r.length; pass++) {
    const bad = xs.map((x) =>
      xs.filter((y) => y !== x && y.dir === x.dir && !(x.strike < y.strike ? ordered(x, y) : ordered(y, x))).length,
    );
    const worst = Math.max(0, ...bad);
    if (!worst) break;
    // Drop the rung with the most conflicts, preferring stale over firm.
    const i = bad.reduce((bi, n, j) => (n > bad[bi] || (n === bad[bi] && !xs[j].firm && xs[bi].firm) ? j : bi), bad.indexOf(worst));
    xs = xs.filter((_, j) => j !== i);
  }
  return xs.map((x) => ({ strike: x.strike, dir: x.dir, p: x.p, question: x.question }));
}

const open = (e: GEvent) => (e.markets ?? []).filter((m) => !m.closed && m.active !== false);

function rungs(e: GEvent, kind: PolyKind): PolyRung[] {
  const seen = new Set<string>();
  const out: (PolyRung & { firm: boolean })[] = [];
  for (const m of open(e)) {
    const q = quote(m);
    const strike = num((m.groupItemTitle ?? "").replace(/[^\d.]/g, ""));
    if (q === null || strike === null) continue;
    const dir: PolyRung["dir"] =
      kind === "above" ? "above" : /dip|below|↓/i.test(m.question + (m.groupItemTitle ?? "")) ? "down" : "up";
    const k = `${dir}:${strike}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ strike, dir, p: q.p, firm: q.firm, question: m.question });
  }
  return dropStale(out.sort((a, b) => a.strike - b.strike));
}

function outcomes(e: GEvent) {
  return open(e).flatMap((m) => {
    const p = prob(m);
    return p === null ? [] : [{ label: (m.groupItemTitle ?? m.question).trim(), p }];
  });
}

function impliedMedian(r: PolyRung[]): number | null {
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i];
    const b = r[i + 1];
    if (a.p >= 0.5 && b.p < 0.5) return a.strike + ((a.p - 0.5) / (a.p - b.p)) * (b.strike - a.strike);
  }
  return null;
}

const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

export async function GET() {
  const now = Date.now();
  const pages = await Promise.all(
    [
      `${GAMMA}&tag_slug=bitcoin&offset=0`,
      `${GAMMA}&tag_slug=bitcoin&offset=100`,
      `${GAMMA}&tag_slug=bitcoin&offset=200`,
      `${GAMMA}&tag_slug=fed&offset=0`,
      `${GAMMA}&tag_slug=economy&offset=0`,
    ].map((u) => getJSON<GEvent[]>(u).catch(() => [] as GEvent[])),
  );
  const events = [...new Map(pages.flat().map((e) => [e.slug, e])).values()];
  if (!events.length) {
    const body: PolymarketData = {
      asOf: now,
      markets: [],
      sources: [{ source: "polymarket-gamma", ok: false, error: "no events returned" }],
    };
    return cachedJson(body, 30);
  }

  const live = events.filter((e) => Date.parse(e.endDate) > now);
  const pick = (rx: RegExp) => live.filter((e) => rx.test(e.slug)).sort((a, b) => Date.parse(a.endDate) - Date.parse(b.endDate));
  // Soonest market with at least `minLeft` to run; a market about to settle
  // is all-but-decided, so roll to the next one as soon as it's listed.
  const fresh = (rx: RegExp, minLeft: number) => {
    const list = pick(rx);
    return list.find((e) => Date.parse(e.endDate) - now > minLeft) ?? list[0];
  };
  const H = 3_600_000;

  const base = (e: GEvent, kind: PolyKind, horizon: string, group: PolyMarket["group"]): PolyMarket => ({
    kind,
    horizon,
    group,
    title: e.title,
    slug: e.slug,
    endDate: Date.parse(e.endDate),
    volume: e.volume ?? 0,
    volume24h: e.volume24hr ?? 0,
    rungs: [],
  });

  const ladder = (e: GEvent | undefined, kind: "above" | "hit", horizon: string): PolyMarket | null => {
    if (!e) return null;
    const r = rungs(e, kind);
    if (!r.length) return null;
    return { ...base(e, kind, horizon, "btc"), rungs: r, ...(kind === "above" ? { impliedMedian: impliedMedian(r) } : {}) };
  };

  const dist = (e: GEvent | undefined, horizon: string, group: PolyMarket["group"]): PolyMarket | null => {
    if (!e) return null;
    const o = outcomes(e);
    return o.length ? { ...base(e, "dist", horizon, group), outcomes: o } : null;
  };

  const above = pick(RX.above);
  // Nearest daily close + the furthest-dated ladder within a week.
  const nearAbove = above.find((e) => Date.parse(e.endDate) - now > 2 * H) ?? above[0];
  const farAbove = above.filter((e) => Date.parse(e.endDate) - now <= 8 * 86_400_000).at(-1);
  const range = fresh(RX.range, 2 * H);
  // Client re-labels daily markets in the viewer's own time zone.
  const day = (e?: GEvent) => (e ? `Close ${fmtDay(Date.parse(e.endDate))}` : "");

  const markets = [
    dist(range, day(range), "btc"),
    ladder(nearAbove, "above", day(nearAbove)),
    farAbove && farAbove !== nearAbove ? ladder(farAbove, "above", day(farAbove)) : null,
    ladder(fresh(RX.week, 24 * H), "hit", "This week"),
    ladder(fresh(RX.month, 72 * H), "hit", "This month"),
    ladder(fresh(RX.year, 7 * 24 * H), "hit", "This year"),
    dist(fresh(RX.cpi, 2 * H), "Next CPI print", "macro"),
    dist(fresh(RX.cuts, 7 * 24 * H), "Fed cuts this year", "macro"),
  ].filter((m): m is PolyMarket => m !== null);

  const body: PolymarketData = { asOf: now, markets, sources: [{ source: "polymarket-gamma", ok: true }] };
  return cachedJson(body, 30);
}
