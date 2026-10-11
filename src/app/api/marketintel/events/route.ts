import type { EventsData, Impact, MarketEvent } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON } from "../_lib/http";
import { etToMs, FOMC } from "../_lib/fomc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Market-moving calendar = curated schedule + live weekly feed.
 *
 * Curated (below): dates published by the Fed (FOMC) and BLS/BEA (CPI, jobs,
 * PCE), plus NVIDIA earnings (estimated until NVIDIA confirms). Update this
 * list when a new year's schedule is published.
 *
 * Live: ForexFactory's public this-week JSON adds every USD high/medium-impact
 * release with consensus forecast + prior print — Fed speakers, PPI, retail
 * sales, jobless claims, ISM, etc. When both sources list the same release,
 * the live row wins (it carries the forecast).
 *
 * Crypto options expiries (Deribit, last Friday of the month 08:00 UTC — CME
 * BTC futures settle the same day) are computed.
 */

type Curated = { date: string; et: string; title: string; category: MarketEvent["category"]; impact: Impact; note?: string; estimated?: boolean; source: string };

const FED = "federalreserve.gov";
const BLS = "bls.gov";
const CURATED: Curated[] = [
  // CPI — 8:30am ET
  { date: "2026-10-14", et: "08:30", title: "CPI (Sep)", category: "inflation", impact: "high", source: BLS },
  { date: "2026-11-10", et: "08:30", title: "CPI (Oct)", category: "inflation", impact: "high", source: BLS },
  { date: "2026-12-10", et: "08:30", title: "CPI (Nov)", category: "inflation", impact: "high", source: BLS },
  // Jobs report — 8:30am ET
  { date: "2026-11-06", et: "08:30", title: "Nonfarm payrolls (Oct)", category: "jobs", impact: "high", source: BLS },
  { date: "2026-12-04", et: "08:30", title: "Nonfarm payrolls (Nov)", category: "jobs", impact: "high", source: BLS },
  // PCE — 8:30am ET
  { date: "2026-12-23", et: "08:30", title: "Core PCE (Nov)", category: "inflation", impact: "high", note: "The Fed's preferred inflation gauge", source: "bea.gov" },
  // Earnings — after the close
  { date: "2026-11-18", et: "16:20", title: "NVIDIA Q3 FY27 earnings", category: "earnings", impact: "high", note: "AI-capex bellwether; moves Nasdaq and BTC risk appetite", estimated: true, source: "nvidia.com (est.)" },
];

function lastFridays(from: Date, count: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; out.length < count && i < count + 2; i++) {
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth() + i;
    const last = new Date(Date.UTC(y, m + 1, 0, 8, 0)); // last day of month, 08:00 UTC
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 2) % 7)); // back to Friday
    if (last.getTime() > from.getTime()) out.push(last);
  }
  return out;
}

type FF = { title: string; country: string; date: string; impact: string; forecast: string; previous: string };

function categorize(title: string): MarketEvent["category"] {
  if (/FOMC|Fed|Federal Funds|Powell|Beige/i.test(title)) return "fed";
  if (/CPI|PPI|PCE|Inflation/i.test(title)) return "inflation";
  if (/Payroll|Employment|Unemployment|Jobless|JOLTS|ADP/i.test(title)) return "jobs";
  if (/GDP|Retail|ISM|PMI|Consumer|Sentiment|Housing|Durable/i.test(title)) return "growth";
  return "other";
}

const KEY_RELEASE = /CPI|FOMC|Federal Funds|Non-Farm|PCE/i;

export async function GET() {
  const now = Date.now();
  const sources = [{ source: "curated-calendar", ok: true }] as EventsData["sources"];

  let live: MarketEvent[] = [];
  try {
    const ff = await getJSON<FF[]>("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
    live = ff
      .filter((e) => e.country === "USD" && (e.impact === "High" || e.impact === "Medium"))
      .map((e, i) => ({
        id: `ff-${i}`,
        title: e.title,
        t: Date.parse(e.date),
        category: categorize(e.title),
        impact: e.impact === "High" ? ("high" as const) : ("medium" as const),
        forecast: e.forecast || undefined,
        previous: e.previous || undefined,
        source: "ForexFactory",
      }));
    sources.push({ source: "forexfactory", ok: true });
  } catch (e) {
    sources.push({ source: "forexfactory", ok: false, error: e instanceof Error ? e.message : String(e) });
  }

  // A live row replaces the curated one for the same kind of release that day
  // (a CPI print never knocks out an FOMC row).
  const dayKey = (e: { t: number; category: string }) => `${e.category}:${new Date(e.t).toISOString().slice(0, 10)}`;
  const liveDays = new Set(live.filter((e) => KEY_RELEASE.test(e.title)).map(dayKey));

  const fomc: Curated[] = FOMC.map((f) => ({
    date: f.date,
    et: "14:00",
    title: f.sep ? "FOMC rate decision + dot plot" : "FOMC rate decision",
    category: "fed",
    impact: "high",
    note: f.sep ? "Includes Summary of Economic Projections" : "Statement 2:00pm ET, Powell presser 2:30pm",
    source: FED,
  }));
  const curated: MarketEvent[] = [...fomc, ...CURATED].map((c, i) => ({
    id: `c-${i}`,
    title: c.title,
    t: etToMs(c.date, c.et),
    category: c.category,
    impact: c.impact,
    note: c.note,
    estimated: c.estimated,
    source: c.source,
  })).filter((e) => !(e.category !== "earnings" && liveDays.has(dayKey(e))));

  const expiries: MarketEvent[] = lastFridays(new Date(now), 3).map((d) => {
    const quarterly = [2, 5, 8, 11].includes(d.getUTCMonth());
    return {
      id: `exp-${d.getTime()}`,
      title: quarterly ? "Quarterly BTC options & futures expiry" : "Monthly BTC options expiry",
      t: d.getTime(),
      category: "crypto" as const,
      impact: quarterly ? ("high" as const) : ("medium" as const),
      note: "Deribit 08:00 UTC; CME BTC futures settle the same day. Watch max-pain pinning into expiry.",
      source: "Deribit / CME schedule",
    };
  });

  const events = [...live, ...curated, ...expiries]
    .filter((e) => Number.isFinite(e.t) && e.t > now - 6 * 3_600_000)
    .sort((a, b) => a.t - b.t)
    .slice(0, 40);

  return cachedJson({ asOf: now, events, sources } satisfies EventsData, 1800);
}
