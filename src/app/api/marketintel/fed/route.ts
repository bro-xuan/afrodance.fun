import type { FedData, FedMeeting, FedMove } from "@/app/marketintel/lib/types";
import { etToMs, FOMC } from "../_lib/fomc";
import { cachedJson, getJSON, getText, num, settle } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fed watch: odds for the next three FOMC decisions from two independent
 * markets, side by side.
 *
 *   FedWatch    CME's own method, applied here to live 30-day fed funds
 *               futures (ZQ) prices. CME's site blocks automated access, so we
 *               read the futures quotes (via Yahoo Finance) and do the maths.
 *   Polymarket  Gamma API, "Fed decision in <month>" events.
 *
 * FedWatch method, per meeting month: the contract prices the month's average
 * effective fed funds rate (100 − price). Split the month at the meeting day
 * to get the rate expected before and after the decision; the difference in
 * 25bp steps gives the move odds. When the month after a meeting has no
 * meeting, its contract is a cleaner read of the post-meeting rate, so it's
 * used instead (CME does the same).
 *
 * Current target range and effective rate come from FRED.
 */

const MOVES: { key: FedMove; label: string }[] = [
  { key: "cut50", label: "Cut 50+ bp" },
  { key: "cut25", label: "Cut 25 bp" },
  { key: "hold", label: "Hold" },
  { key: "hike25", label: "Hike 25 bp" },
  { key: "hike50", label: "Hike 50+ bp" },
];

const stepMove = (n: number): FedMove => (n <= -2 ? "cut50" : n === -1 ? "cut25" : n === 0 ? "hold" : n === 1 ? "hike25" : "hike50");

type PMarket = { groupItemTitle?: string; bestBid?: number; bestAsk?: number; lastTradePrice?: number; closed?: boolean };
type PEvent = { slug: string; endDate?: string; markets?: PMarket[] };

function polyMove(s: string): FedMove | null {
  const t = s.toLowerCase();
  if (t.includes("no change")) return "hold";
  if (t.includes("decrease")) return t.includes("50") ? "cut50" : "cut25";
  if (t.includes("increase")) return t.includes("50") ? "hike50" : "hike25";
  return null;
}

const mid = (bid: number | null, ask: number | null, last: number | null) =>
  bid !== null && ask !== null && ask - bid <= 0.1 ? (bid + ask) / 2 : last;

async function fredLatest(id: string) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const rows = (await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${since}`)).trim().split("\n");
  return num(rows.at(-1)?.split(",")[1]);
}

// ── Fed funds futures ──────────────────────────────────────────────────────
const MONTH_CODES = "FGHJKMNQUVXZ";
const monthKey = (y: number, m: number) => `${y}-${m}`; // m is 0-based
const shift = (y: number, m: number, by: number) => {
  const d = new Date(Date.UTC(y, m + by, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};

/** Implied average fed funds rate (%) for one contract month. */
async function zqRate(y: number, m: number): Promise<number> {
  const sym = `ZQ${MONTH_CODES[m]}${String(y % 100).padStart(2, "0")}.CBT`;
  type Chart = { chart: { result: { meta: { regularMarketPrice?: number } }[] | null } };
  let last: unknown;
  for (const host of ["query1", "query2"]) {
    try {
      const r = await getJSON<Chart>(`https://${host}.finance.yahoo.com/v8/finance/chart/${sym}?range=1d&interval=1d`);
      const p = num(r.chart.result?.[0]?.meta.regularMarketPrice);
      if (p !== null) return 100 - p;
      last = new Error(`${sym}: no price`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export async function GET() {
  const now = Date.now();
  const upcoming = FOMC.map((f) => ({ ...f, t: etToMs(f.date, "14:00") }))
    .filter((f) => f.t > now - 3_600_000)
    .slice(0, 3);

  // Contract months: this month through the month after the last meeting.
  const today = new Date(now);
  const cur = { y: today.getUTCFullYear(), m: today.getUTCMonth() };
  const months: { y: number; m: number }[] = [];
  if (upcoming.length) {
    const [ly, lm] = upcoming.at(-1)!.date.split("-").map(Number);
    for (let i = 0; ; i++) {
      const mo = shift(cur.y, cur.m, i);
      months.push(mo);
      if (mo.y > ly || (mo.y === ly && mo.m >= lm)) break; // lm is 1-based, so this includes the month after
    }
  }

  const { values, sources } = await settle({
    "cme-futures": async () => {
      const rates = await Promise.all(months.map((mo) => zqRate(mo.y, mo.m).catch(() => null)));
      if (rates.every((r) => r === null)) throw new Error("no futures quotes");
      return new Map(months.map((mo, i) => [monthKey(mo.y, mo.m), rates[i]]));
    },
    polymarket: () => {
      const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=fed&limit=50";
      return getJSON<PEvent[]>(url).catch(() => getJSON<PEvent[]>(url)); // one retry: Gamma times out now and then
    },
    "fred-target": async () => ({ lo: await fredLatest("DFEDTARL"), hi: await fredLatest("DFEDTARU") }),
    "fred-effr": () => fredLatest("DFF"),
  });

  const implied = values["cme-futures"] ?? new Map<string, number | null>();
  const rate = (y: number, m: number) => implied.get(monthKey(y, m)) ?? null;
  const meetingMonths = new Set(upcoming.map((f) => {
    const [y, m] = f.date.split("-").map(Number);
    return monthKey(y, m - 1);
  }));
  const effr = values["fred-effr"] ?? null;
  const target = values["fred-target"];

  const pEvents = (values.polymarket ?? []).filter((e) => /^fed-decision-in-[a-z]+(?:-\d+)?$/.test(e.slug));

  // Futures: walk the meetings in order, chaining each post-meeting rate into
  // the next meeting's starting rate. `cum` is the distribution of 25bp steps
  // away from today's target, for the "most likely target after" line.
  let prevEnd: number | null = null;
  let cum: Map<number, number> | null = new Map([[0, 1]]);

  const meetings: FedMeeting[] = upcoming.map((f, k) => {
    const [y, m1, d] = f.date.split("-").map(Number);
    const m = m1 - 1;
    const N = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const prev = shift(y, m, -1);
    const next = shift(y, m, 1);

    let start: number | null =
      k === 0
        ? y === cur.y && m === cur.m ? effr : rate(prev.y, prev.m) ?? effr
        : meetingMonths.has(monthKey(prev.y, prev.m)) ? prevEnd : rate(prev.y, prev.m) ?? prevEnd;
    const avg = rate(y, m);
    const nextRate = meetingMonths.has(monthKey(next.y, next.m)) ? null : rate(next.y, next.m);
    // New rate takes effect the day after the decision: d days at the old rate.
    let end: number | null = nextRate ?? (avg !== null && start !== null ? (avg - (d / N) * start) / ((N - d) / N) : null);
    if (start === null || end === null) start = end = null;
    prevEnd = end;

    const fut = new Map<FedMove, number>();
    if (start !== null && end !== null) {
      const steps = (end - start) / 0.25;
      const n = Math.floor(steps);
      const frac = steps - n;
      fut.set(stepMove(n), (fut.get(stepMove(n)) ?? 0) + 1 - frac);
      if (frac > 0) fut.set(stepMove(n + 1), (fut.get(stepMove(n + 1)) ?? 0) + frac);
      if (cum) {
        const nextCum = new Map<number, number>();
        for (const [s, p] of cum) {
          nextCum.set(s + n, (nextCum.get(s + n) ?? 0) + p * (1 - frac));
          if (frac > 0) nextCum.set(s + n + 1, (nextCum.get(s + n + 1) ?? 0) + p * frac);
        }
        cum = nextCum;
      }
    } else {
      cum = null;
    }

    let likelyTarget: FedMeeting["likelyTarget"] = null;
    if (cum && target?.lo != null) {
      const [s, p] = [...cum].reduce((a, b) => (b[1] > a[1] ? b : a));
      likelyTarget = { lo: target.lo + s * 0.25, hi: target.lo + s * 0.25 + 0.25, p };
    }

    // Polymarket: match by month name, and by date so January 2027 doesn't
    // pick up a stale January 2026 event.
    const poly = pEvents.find(
      (e) => e.slug.startsWith(`fed-decision-in-${MONTHS[m]}`) && (!e.endDate || Math.abs(Date.parse(e.endDate) - f.t) < 40 * 86_400_000),
    );
    const pol = new Map<FedMove, number>();
    for (const pm of poly?.markets ?? []) {
      if (pm.closed) continue;
      const mv = polyMove(pm.groupItemTitle ?? "");
      const p = mid(num(pm.bestBid), num(pm.bestAsk), num(pm.lastTradePrice));
      if (mv && p !== null) pol.set(mv, p);
    }

    return {
      t: f.t,
      polySlug: poly?.slug ?? null,
      likelyTarget,
      moves: MOVES.map((mv) => ({
        ...mv,
        fedwatch: start !== null ? fut.get(mv.key) ?? 0 : null,
        polymarket: poly ? pol.get(mv.key) ?? null : null,
      })),
    };
  });

  const body: FedData = {
    asOf: now,
    targetLo: target?.lo ?? null,
    targetHi: target?.hi ?? null,
    meetings,
    sources,
  };
  return cachedJson(body, 120);
}
