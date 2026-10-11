import type { ExpiryVol, VolData } from "@/app/marketintel/lib/types";
import { normCdf } from "@/app/marketintel/lib/quant";
import { cachedJson, getJSON, settle } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 15;

/**
 * Deribit options + futures, reduced to what a vol trader reads first:
 * ATM implied vol per expiry (the term structure), 25-delta risk reversal
 * (skew: who pays up for upside vs downside) and butterfly (tail premium),
 * plus the annualised basis of each dated future over the index.
 *
 * Deltas aren't in the book summary, so they're recomputed with Black-76 on
 * Deribit's own mark IV and per-expiry forward (r = 0, as Deribit quotes).
 */

const DAY = 86_400_000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const expiryMs = (code: string) => {
  const m = code.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  return m ? Date.UTC(2000 + Number(m[3]), MONTHS.indexOf(m[2]), Number(m[1]), 8) : NaN;
};

type Leg = { k: number; iv: number; call: boolean; delta: number };

/** IV at a target delta, interpolated linearly between the two bracketing strikes. */
function ivAtDelta(legs: Leg[], target: number): number | null {
  for (let i = 0; i < legs.length - 1; i++) {
    const a = legs[i];
    const b = legs[i + 1];
    if ((a.delta - target) * (b.delta - target) <= 0 && a.delta !== b.delta) {
      return a.iv + ((target - a.delta) / (b.delta - a.delta)) * (b.iv - a.iv);
    }
  }
  return null;
}

type Summary = { instrument_name: string; mark_iv?: number; mark_price: number; underlying_price?: number; estimated_delivery_price?: number; open_interest: number };

export async function GET() {
  const now = Date.now();
  const { values: v, sources } = await settle({
    "deribit-options": () => getJSON<{ result: Summary[] }>("https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option"),
    "deribit-futures": () => getJSON<{ result: Summary[] }>("https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=future"),
    "deribit-dvol": async () => {
      const r = await getJSON<{ result: { data: [number, number, number, number, number][] } }>(
        `https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp=${now - 30 * 3_600_000}&end_timestamp=${now}`,
      );
      return r.result.data;
    },
  });

  const futures = v["deribit-futures"]?.result ?? [];
  const index = futures.find((f) => f.estimated_delivery_price)?.estimated_delivery_price ?? null;

  // Group options by expiry code.
  const byExp = new Map<string, { F: number; legs: { k: number; iv: number; call: boolean; oi: number }[] }>();
  for (const o of v["deribit-options"]?.result ?? []) {
    const [, code, k, cp] = o.instrument_name.split("-");
    if (!o.underlying_price || !o.mark_iv) continue;
    if (!byExp.has(code)) byExp.set(code, { F: o.underlying_price, legs: [] });
    byExp.get(code)!.legs.push({ k: Number(k), iv: o.mark_iv, call: cp === "C", oi: o.open_interest || 0 });
  }

  const futByCode = new Map(futures.map((f) => [f.instrument_name.split("-")[1], f.mark_price]));
  const codes = new Set([...byExp.keys(), ...[...futByCode.keys()].filter((c) => c !== "PERPETUAL")]);

  const expiries: ExpiryVol[] = [...codes]
    .map((code) => {
      const t = expiryMs(code);
      const days = (t - now) / DAY;
      const fut = futByCode.get(code);
      const basisAnn = fut && index && days > 0.5 ? ((fut / index - 1) * 365) / days * 100 : null;
      const e = byExp.get(code);
      let atmIv: number | null = null;
      let rr25: number | null = null;
      let fly25: number | null = null;
      let oiBtc = 0;
      if (e && days > 0.5) {
        const T = days / 365;
        const F = e.F;
        oiBtc = e.legs.reduce((s, l) => s + l.oi, 0);
        // OTM wings only: they carry the liquid quotes.
        const otm = e.legs
          .filter((l) => (l.call ? l.k >= F : l.k <= F))
          .map((l) => {
            const sd = (l.iv / 100) * Math.sqrt(T);
            const d1 = (Math.log(F / l.k) + 0.5 * sd * sd) / sd;
            return { ...l, delta: l.call ? normCdf(d1) : normCdf(d1) - 1 };
          })
          .sort((a, b) => a.k - b.k);
        const calls = otm.filter((l) => l.call);
        const puts = otm.filter((l) => !l.call);
        const below = puts.at(-1);
        const above = calls[0];
        if (below && above) {
          atmIv = above.k === below.k ? above.iv : below.iv + ((F - below.k) / (above.k - below.k)) * (above.iv - below.iv);
        }
        const c25 = ivAtDelta(calls, 0.25);
        const p25 = ivAtDelta(puts, -0.25);
        if (c25 !== null && p25 !== null) {
          rr25 = c25 - p25;
          if (atmIv !== null) fly25 = (c25 + p25) / 2 - atmIv;
        }
      }
      return { code, t, days, forward: e?.F ?? fut ?? null, atmIv, rr25, fly25, basisAnn, oiBtc };
    })
    .filter((x) => Number.isFinite(x.t) && x.days > 0.5)
    .sort((a, b) => a.t - b.t);

  const dv = v["deribit-dvol"] ?? [];
  const last = dv.at(-1);
  const dayAgo = last ? dv.find((d) => d[0] >= last[0] - 24 * 3_600_000) : undefined;

  const body: VolData = {
    asOf: now,
    index,
    dvol: last?.[4] ?? null,
    dvol24hAgo: dayAgo?.[4] ?? null,
    expiries,
    sources,
  };
  return cachedJson(body, 60);
}
