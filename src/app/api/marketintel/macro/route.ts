import type { MacroData, MacroStat, OptionsSnapshot, Series } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, getText, num, settle } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 25;

/**
 * Macro + sentiment context for BTC. All keyless:
 *   FRED (daily/weekly closes): 10Y yield, broad dollar index, S&P 500,
 *     Nasdaq Composite, VIX, and the Fed net-liquidity proxy
 *     (balance sheet − Treasury General Account − reverse repo).
 *   DefiLlama: total USD stablecoin supply (crypto's dry powder).
 *   CoinGecko: BTC dominance.  alternative.me: Fear & Greed.
 *   Deribit: DVOL (BTC implied vol index), options put/call OI, max pain.
 */

const DAY = 86_400_000;

async function fred(id: string): Promise<Series> {
  const since = new Date(Date.now() - 200 * DAY).toISOString().slice(0, 10);
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${since}`);
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .flatMap((line) => {
      const [d, v] = line.split(",");
      const n = num(v);
      const t = Date.parse(d);
      return n !== null && Number.isFinite(t) ? [{ t, v: n }] : [];
    });
}

/** Value of `s` at or before t (series sorted ascending). */
function asOf(s: Series, t: number): number | null {
  let out: number | null = null;
  for (const p of s) {
    if (p.t > t) break;
    out = p.v;
  }
  return out;
}

function stat(
  key: string, label: string, unit: MacroStat["unit"], series: Series | null, lookbackDays: number,
  note: string, source: string, keep = 120,
): MacroStat {
  const s = (series ?? []).slice(-keep);
  const last = s.at(-1);
  const prev = last ? asOf(s, last.t - lookbackDays * DAY) : null;
  return {
    key, label, unit, note, source,
    value: last?.v ?? null,
    change: last && prev !== null ? last.v - prev : null,
    changeLabel: lookbackDays === 1 ? "1d" : `${lookbackDays}d`,
    series: s,
  };
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const expiryMs = (code: string) => {
  const m = code.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  return m ? Date.UTC(2000 + Number(m[3]), MONTHS.indexOf(m[2]), Number(m[1]), 8) : NaN;
};

async function options(): Promise<OptionsSnapshot> {
  const r = await getJSON<{ result: { instrument_name: string; open_interest: number }[] }>(
    "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option",
  );
  let calls = 0;
  let puts = 0;
  const byExp = new Map<string, { k: number; oi: number; call: boolean }[]>();
  for (const o of r.result) {
    const [, exp, k, cp] = o.instrument_name.split("-");
    const oi = o.open_interest || 0;
    if (cp === "C") calls += oi;
    else puts += oi;
    if (!byExp.has(exp)) byExp.set(exp, []);
    byExp.get(exp)!.push({ k: Number(k), oi, call: cp === "C" });
  }
  // Next Friday expiry (weeklies/monthlies/quarterlies) — the ones that pin.
  const now = Date.now();
  const next = [...byExp.keys()]
    .map((code) => ({ code, t: expiryMs(code) }))
    .filter((x) => x.t > now && new Date(x.t).getUTCDay() === 5)
    .sort((a, b) => a.t - b.t)[0];

  let maxPain: number | null = null;
  let expOi: number | null = null;
  if (next) {
    const legs = byExp.get(next.code)!;
    expOi = legs.reduce((s, l) => s + l.oi, 0);
    const strikes = [...new Set(legs.map((l) => l.k))].sort((a, b) => a - b);
    let best = Infinity;
    for (const s of strikes) {
      const pain = legs.reduce((acc, l) => acc + l.oi * Math.max(0, l.call ? s - l.k : l.k - s), 0);
      if (pain < best) {
        best = pain;
        maxPain = s;
      }
    }
  }
  return {
    putCallOi: calls > 0 ? puts / calls : null,
    nextExpiry: next ? new Date(next.t).toISOString() : null,
    nextExpiryMaxPain: maxPain,
    nextExpiryOiBtc: expOi,
  };
}

export async function GET() {
  const { values: v, sources } = await settle({
    "fred-DGS10": () => fred("DGS10"),
    "fred-DTWEXBGS": () => fred("DTWEXBGS"),
    "fred-SP500": () => fred("SP500"),
    "fred-NASDAQCOM": () => fred("NASDAQCOM"),
    "fred-VIXCLS": () => fred("VIXCLS"),
    "fred-WALCL": () => fred("WALCL"),
    "fred-WTREGEN": () => fred("WTREGEN"),
    "fred-RRPONTSYD": () => fred("RRPONTSYD"),
    "defillama-stables": async () => {
      const r = await getJSON<{ date: string; totalCirculatingUSD: { peggedUSD: number } }[]>("https://stablecoins.llama.fi/stablecoincharts/all");
      return r.slice(-120).map((x) => ({ t: Number(x.date) * 1000, v: x.totalCirculatingUSD.peggedUSD / 1e9 }));
    },
    "coingecko-global": async () => {
      const r = await getJSON<{ data: { market_cap_percentage: { btc: number } } }>("https://api.coingecko.com/api/v3/global");
      return r.data.market_cap_percentage.btc;
    },
    "alternative-fng": async () => {
      const r = await getJSON<{ data: { value: string; value_classification: string; timestamp: string }[] }>("https://api.alternative.me/fng/?limit=60");
      return r.data;
    },
    "deribit-dvol": async () => {
      const end = Date.now();
      const r = await getJSON<{ result: { data: [number, number, number, number, number][] } }>(
        `https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=1D&start_timestamp=${end - 120 * DAY}&end_timestamp=${end}`,
      );
      return r.result.data.map((d) => ({ t: d[0], v: d[4] }));
    },
    "deribit-options": options,
  });

  // Net liquidity ($T) on the Fed balance-sheet's weekly (Wednesday) grid.
  let netLiq: Series | null = null;
  if (v["fred-WALCL"] && v["fred-WTREGEN"] && v["fred-RRPONTSYD"]) {
    netLiq = v["fred-WALCL"].flatMap((p) => {
      const tga = asOf(v["fred-WTREGEN"]!, p.t);
      const rrp = asOf(v["fred-RRPONTSYD"]!, p.t);
      // WALCL & WTREGEN are $ millions, RRPONTSYD is $ billions → $ trillions.
      return tga !== null && rrp !== null ? [{ t: p.t, v: (p.v - tga) / 1e6 - rrp / 1000 }] : [];
    });
  }

  const dom = v["coingecko-global"];
  const fng = v["alternative-fng"];

  const stats: MacroStat[] = [
    stat("netliq", "Fed net liquidity", "usdT", netLiq, 28, "Fed balance sheet minus the Treasury account and reverse repo. Rising liquidity has tracked BTC rallies.", "FRED"),
    stat("stables", "Stablecoin supply", "usdB", v["defillama-stables"], 30, "Total USD stablecoins: dry powder that can rotate into BTC.", "DefiLlama"),
    stat("dxy", "US dollar (broad)", "index", v["fred-DTWEXBGS"], 30, "Fed trade-weighted dollar. A strong dollar is usually a BTC headwind.", "FRED"),
    stat("us10y", "US 10Y yield", "pct", v["fred-DGS10"], 30, "Higher real rates raise the opportunity cost of holding BTC.", "FRED"),
    stat("spx", "S&P 500", "index", v["fred-SP500"], 30, "BTC trades as a high-beta risk asset; watch for divergences.", "FRED"),
    stat("ndx", "Nasdaq Composite", "index", v["fred-NASDAQCOM"], 30, "Tech and AI risk appetite, the tightest equity correlation to BTC.", "FRED"),
    stat("vix", "VIX", "index", v["fred-VIXCLS"], 30, "Equity fear gauge. VIX spikes tend to drag BTC with them.", "FRED"),
    stat("dvol", "BTC DVOL", "index", v["deribit-dvol"], 30, "Deribit 30-day implied vol. Low DVOL = complacency, big moves often follow.", "Deribit"),
    {
      key: "dom", label: "BTC dominance", unit: "pct", value: dom ?? null, series: [],
      note: "BTC share of total crypto market cap. Rising = risk-off within crypto.", source: "CoinGecko",
    },
  ];

  const body: MacroData = {
    asOf: Date.now(),
    stats,
    fearGreed: fng?.length
      ? {
          value: Number(fng[0].value),
          label: fng[0].value_classification,
          series: fng.map((d) => ({ t: Number(d.timestamp) * 1000, v: Number(d.value) })).reverse(),
        }
      : null,
    options: v["deribit-options"] ?? { putCallOi: null, nextExpiry: null, nextExpiryMaxPain: null, nextExpiryOiBtc: null },
    sources,
  };
  return cachedJson(body, 300);
}
