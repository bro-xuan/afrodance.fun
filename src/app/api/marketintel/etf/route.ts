import { redis } from "@/lib/redis";
import type { EtfData, EtfDay } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, getText } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * US spot bitcoin ETF net flows (US$m) from Farside Investors — the source
 * most desks and journalists quote. Farside publishes HTML only, so we parse
 * the table.
 *
 * /btc/ is the fast page (~2–3 weeks). Every successful scrape is merged into
 * Redis so the history grows past that window; when Redis holds too little,
 * we seed it once from the (slow, ~800KB) all-data page. If Farside is down or
 * blocks us, the last merged copy is served and flagged `stale`.
 */

const RECENT_URL = "https://farside.co.uk/btc/";
const ALL_URL = "https://farside.co.uk/bitcoin-etf-flow-all-data/";
const KEY = "marketintel:etf:v1";
const KEEP_DAYS = 90;


type Stored = { tickers: string[]; days: EtfDay[]; cumulative: number | null; savedAt: number };

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

// "(125.6)" → -125.6, "1,008" → 1008, "-" / "" → null
function flow(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  if (!t || t === "-") return null;
  const neg = /^\(.*\)$/.test(t);
  const n = Number(t.replace(/[()]/g, ""));
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseFarside(html: string): Omit<Stored, "savedAt"> {
  const start = html.indexOf('<table class="etf"');
  if (start < 0) throw new Error("ETF table not found");
  const end = html.indexOf("</table>", start);
  const rows = [...html.slice(start, end).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => clean(c[1])),
  );

  const header = rows.find((r) => r.includes("IBIT"));
  if (!header) throw new Error("ETF header row not found");
  const tickers = header.slice(1).filter((x) => x && x !== "Total");
  // Values are read by position, so a layout change would shift flows onto the
  // wrong fund. Refuse to parse rather than store bad numbers.
  if (header.length !== tickers.length + 2) throw new Error("ETF header layout changed");

  const days: EtfDay[] = [];
  let cumulative: number | null = null;
  for (const r of rows) {
    const m = r[0]?.match(/^(\d{2}) (\w{3}) (\d{4})$/);
    if (m && MONTHS[m[2]] && r.length === header.length) {
      const funds: Record<string, number | null> = {};
      tickers.forEach((tk, i) => (funds[tk] = flow(r[i + 1] ?? "")));
      days.push({ date: `${m[3]}-${MONTHS[m[2]]}-${m[1]}`, total: flow(r[tickers.length + 1] ?? ""), funds });
    } else if (r[0] === "Total") {
      cumulative = flow(r[tickers.length + 1] ?? "");
    }
  }
  if (!days.length) throw new Error("no ETF rows parsed");
  return { tickers, days, cumulative };
}

function merge(old: Stored | null, fresh: Omit<Stored, "savedAt">): Stored {
  const byDate = new Map<string, EtfDay>();
  for (const d of old?.days ?? []) byDate.set(d.date, d);
  for (const d of fresh.days) byDate.set(d.date, d); // fresh wins (late fund prints fill in)
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP_DAYS);
  return { tickers: fresh.tickers, days, cumulative: fresh.cumulative ?? old?.cumulative ?? null, savedAt: Date.now() };
}

/** BTC daily close (UTC) by date, for the price line over the flow bars. */
async function dailyCloses(): Promise<Record<string, number>> {
  const k = await getJSON<[number, string, string, string, string][]>(
    "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100",
  );
  return Object.fromEntries(k.map((r) => [new Date(r[0]).toISOString().slice(0, 10), Number(r[4])]));
}

export async function GET() {
  const pricesP = dailyCloses().then(
    (prices) => ({ prices, source: { source: "binance-1d", ok: true } }),
    (e) => ({ prices: {}, source: { source: "binance-1d", ok: false, error: e instanceof Error ? e.message : String(e) } }),
  );
  const stored = redis ? await redis.get<Stored>(KEY).catch(() => null) : null;

  try {
    const needSeed = !stored || stored.days.length < 30;
    // If the big seed page keeps failing, still take the recent page.
    const html = needSeed
      ? await getText(ALL_URL, 25000).catch(() => getText(RECENT_URL, 12000))
      : await getText(RECENT_URL, 12000);
    const merged = merge(stored, parseFarside(html));
    if (redis) await redis.set(KEY, merged).catch(() => {});
    const px = await pricesP;
    const body: EtfData = {
      asOf: Date.now(),
      prices: px.prices,
      tickers: merged.tickers,
      days: merged.days.slice(-60),
      cumulative: merged.cumulative,
      stale: false,
      sources: [{ source: "farside", ok: true }, px.source],
    };
    return cachedJson(body, 900);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const px = await pricesP;
    const body: EtfData = {
      asOf: stored?.savedAt ?? Date.now(),
      prices: px.prices,
      tickers: stored?.tickers ?? [],
      days: stored?.days.slice(-60) ?? [],
      cumulative: stored?.cumulative ?? null,
      stale: true,
      sources: [{ source: "farside", ok: false, error }, px.source],
    };
    return cachedJson(body, 120);
  }
}
