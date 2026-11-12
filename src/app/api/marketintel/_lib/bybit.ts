import { getJSON, num } from "./http";

/**
 * Bybit v5 public market data: the fallback wherever a route reads Binance.
 * Cloudflare's egress IPs geolocate to the US, so Binance answers 451/403 to
 * the Worker no matter where it's placed; Bybit doesn't. Bybit lists newest
 * first, every helper here returns oldest first, the way Binance does.
 */

const BY = "https://api.bybit.com/v5/market";

type List<T> = { result: { list: T[]; nextPageCursor?: string } };
export type BybitBar = { t: number; o: number; h: number; l: number; c: number; v: number };
type Pt = { t: number; v: number };

/** BTCUSDT candles. `interval` is Bybit's: "15", "60", "D". Max 1000. */
export async function bybitKlines(category: "spot" | "linear", interval: string, limit: number): Promise<BybitBar[]> {
  const r = await getJSON<List<string[]>>(`${BY}/kline?category=${category}&symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
  return r.result.list
    .flatMap((k) => {
      const [t, o, h, l, c, v] = k.map(num);
      return t === null || o === null || h === null || l === null || c === null || v === null ? [] : [{ t, o, h, l, c, v }];
    })
    .reverse();
}

/** BTCUSDT perp open interest in BTC. Bybit pages at 200 rows, so this follows the cursor. */
export async function bybitOiHistory(intervalTime: "15min" | "1h" | "1d", limit: number): Promise<Pt[]> {
  const out: Pt[] = [];
  let cursor = "";
  while (out.length < limit) {
    const r = await getJSON<List<{ openInterest: string; timestamp: string }>>(
      `${BY}/open-interest?category=linear&symbol=BTCUSDT&intervalTime=${intervalTime}&limit=${Math.min(200, limit - out.length)}${cursor ? `&cursor=${cursor}` : ""}`,
    );
    for (const x of r.result.list) {
      const t = num(x.timestamp);
      const v = num(x.openInterest);
      if (t !== null && v !== null) out.push({ t, v });
    }
    cursor = r.result.nextPageCursor ?? "";
    if (!cursor || !r.result.list.length) break;
  }
  return out.reverse();
}

/** Share of BTCUSDT perp accounts that are net long (0–1). Counts accounts, not size. Max 500. */
export async function bybitLongShare(period: "15min" | "1h", limit: number): Promise<Pt[]> {
  const r = await getJSON<List<{ buyRatio: string; timestamp: string }>>(
    `${BY}/account-ratio?category=linear&symbol=BTCUSDT&period=${period}&limit=${limit}`,
  );
  return r.result.list
    .flatMap((x) => {
      const t = num(x.timestamp);
      const v = num(x.buyRatio);
      return t !== null && v !== null ? [{ t, v }] : [];
    })
    .reverse();
}

/** BTCUSDT spot last price. */
export async function bybitSpot(): Promise<number> {
  const r = await getJSON<List<{ lastPrice: string }>>(`${BY}/tickers?category=spot&symbol=BTCUSDT`);
  const p = num(r.result.list[0]?.lastPrice);
  if (p === null) throw new Error("no price");
  return p;
}
