import type { Candle, PriceData } from "@/app/marketintel/lib/types";
import { cachedJson, getJSON, num, settle } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];
export const maxDuration = 15;

/**
 * BTCUSDT spot candles for the price chart, key levels and realized vol.
 * Binance first; Bybit spot as fallback (no taker split there, so its
 * candles carry delta 0 and the CVD line goes flat rather than lying).
 */

type BinanceKline = [number, string, string, string, string, string, number, string, number, string, ...unknown[]];

async function binance(interval: string, limit: number): Promise<Candle[]> {
  const rows = await getJSON<BinanceKline[]>(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
  return rows.flatMap((k) => {
    const [o, h, l, c, v, buy] = [k[1], k[2], k[3], k[4], k[5], k[9]].map(num);
    return o === null || h === null || l === null || c === null || v === null
      ? []
      : [{ t: k[0], o, h, l, c, v, delta: buy === null ? 0 : 2 * buy - v }];
  });
}

async function bybit(interval: string, limit: number): Promise<Candle[]> {
  const r = await getJSON<{ result: { list: string[][] } }>(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
  );
  return r.result.list
    .flatMap((k) => {
      const [t, o, h, l, c, v] = k.map(num);
      return t === null || o === null || h === null || l === null || c === null || v === null ? [] : [{ t, o, h, l, c, v, delta: 0 }];
    })
    .reverse(); // Bybit lists newest first
}

export async function GET() {
  const { values: v, sources } = await settle({
    "binance-1h": () => binance("1h", 168),
    "binance-1d": () => binance("1d", 120),
  });
  let hourly = v["binance-1h"];
  let daily = v["binance-1d"];
  if (!hourly || !daily) {
    const fb = await settle({
      "bybit-1h": () => bybit("60", 168),
      "bybit-1d": () => bybit("D", 120),
    });
    hourly ??= fb.values["bybit-1h"];
    daily ??= fb.values["bybit-1d"];
    sources.push(...fb.sources);
  }

  const body: PriceData = { asOf: Date.now(), hourly: hourly ?? [], daily: daily ?? [], sources };
  return cachedJson(body, 30);
}
