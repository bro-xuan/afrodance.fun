import type { SourceStatus, VenueRow } from "@/app/marketintel/lib/types";
import { getJSON, num, settle } from "./http";

/**
 * Current BTC open interest + funding per venue, normalised to USD notional
 * and 8h-equivalent funding. Hyperliquid funds hourly, so its rate is ×8.
 */

type BinancePremium = { markPrice: string; lastFundingRate: string };
type BybitTickers = { result: { list: { openInterest: string; openInterestValue: string; fundingRate: string; markPrice: string }[] } };
type OkxOi = { data: { oiUsd: string }[] };
type OkxFunding = { data: { fundingRate: string }[] };

async function binanceUsdt(): Promise<VenueRow> {
  const [oi, prem] = await Promise.all([
    getJSON<{ openInterest: string }>("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"),
    getJSON<BinancePremium>("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
  ]);
  const mark = num(prem.markPrice)!;
  return { exchange: "Binance", market: "BTCUSDT perp", oiUsd: num(oi.openInterest)! * mark, fundingRate8h: num(prem.lastFundingRate) };
}

async function binanceCoin(): Promise<VenueRow> {
  const [oi, prem] = await Promise.all([
    getJSON<{ openInterest: string }>("https://dapi.binance.com/dapi/v1/openInterest?symbol=BTCUSD_PERP"),
    getJSON<BinancePremium[]>("https://dapi.binance.com/dapi/v1/premiumIndex?symbol=BTCUSD_PERP"),
  ]);
  // COIN-M BTC contracts are $100 each.
  return { exchange: "Binance", market: "BTCUSD coin-m", oiUsd: num(oi.openInterest)! * 100, fundingRate8h: num(prem[0]?.lastFundingRate) };
}

async function bybitLinear(): Promise<VenueRow> {
  const r = await getJSON<BybitTickers>("https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT");
  const t = r.result.list[0];
  return { exchange: "Bybit", market: "BTCUSDT perp", oiUsd: num(t.openInterestValue)!, fundingRate8h: num(t.fundingRate) };
}

async function bybitInverse(): Promise<VenueRow> {
  const r = await getJSON<BybitTickers>("https://api.bybit.com/v5/market/tickers?category=inverse&symbol=BTCUSD");
  const t = r.result.list[0];
  // Inverse OI is quoted in USD contracts.
  return { exchange: "Bybit", market: "BTCUSD inverse", oiUsd: num(t.openInterest)!, fundingRate8h: num(t.fundingRate) };
}

async function okx(instId: string, market: string): Promise<VenueRow> {
  const [oi, f] = await Promise.all([
    getJSON<OkxOi>(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instId}`),
    getJSON<OkxFunding>(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`),
  ]);
  return { exchange: "OKX", market, oiUsd: num(oi.data[0]?.oiUsd)!, fundingRate8h: num(f.data[0]?.fundingRate) };
}

async function bitget(): Promise<VenueRow> {
  const r = await getJSON<{ data: { holdingAmount: string; markPrice: string; fundingRate: string }[] }>(
    "https://api.bitget.com/api/v2/mix/market/ticker?symbol=BTCUSDT&productType=usdt-futures",
  );
  const t = r.data[0];
  return { exchange: "Bitget", market: "BTCUSDT perp", oiUsd: num(t.holdingAmount)! * num(t.markPrice)!, fundingRate8h: num(t.fundingRate) };
}

async function hyperliquid(): Promise<VenueRow> {
  const r = await getJSON<[{ universe: { name: string }[] }, { openInterest: string; markPx: string; funding: string }[]]>(
    "https://api.hyperliquid.xyz/info",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) },
  );
  const i = r[0].universe.findIndex((u) => u.name === "BTC");
  if (i < 0) throw new Error("BTC not listed");
  const c = r[1][i];
  const f = num(c.funding);
  return { exchange: "Hyperliquid", market: "BTC perp", oiUsd: num(c.openInterest)! * num(c.markPx)!, fundingRate8h: f === null ? null : f * 8 };
}

async function deribitPerp(): Promise<VenueRow> {
  const r = await getJSON<{ result: { open_interest: number; funding_8h: number } }>(
    "https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL",
  );
  return { exchange: "Deribit", market: "BTC perp", oiUsd: r.result.open_interest, fundingRate8h: r.result.funding_8h };
}

async function deribitFutures(): Promise<VenueRow> {
  const r = await getJSON<{ result: { instrument_name: string; open_interest: number }[] }>(
    "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=future",
  );
  const oi = r.result.filter((x) => x.instrument_name !== "BTC-PERPETUAL").reduce((s, x) => s + (x.open_interest || 0), 0);
  return { exchange: "Deribit", market: "BTC dated futures", oiUsd: oi, fundingRate8h: null };
}

export async function fetchVenues(): Promise<{ venues: VenueRow[]; sources: SourceStatus[] }> {
  const { values, sources } = await settle({
    "binance-usdt": binanceUsdt,
    "binance-coinm": binanceCoin,
    "bybit-linear": bybitLinear,
    "bybit-inverse": bybitInverse,
    "okx-usdt": () => okx("BTC-USDT-SWAP", "BTC-USDT swap"),
    "okx-usd": () => okx("BTC-USD-SWAP", "BTC-USD inverse"),
    bitget,
    hyperliquid,
    "deribit-perp": deribitPerp,
    "deribit-futures": deribitFutures,
  });
  const venues = Object.values(values).filter(
    (v): v is VenueRow => !!v && Number.isFinite(v.oiUsd) && v.oiUsd > 0,
  );
  venues.sort((a, b) => b.oiUsd - a.oiUsd);
  return { venues, sources };
}

export function weightedFunding(venues: VenueRow[]): number | null {
  let w = 0;
  let s = 0;
  for (const v of venues) {
    if (v.fundingRate8h === null) continue;
    w += v.oiUsd;
    s += v.oiUsd * v.fundingRate8h;
  }
  return w > 0 ? s / w : null;
}
