// Shapes returned by /api/marketintel/* and consumed by the dashboard.
// Every endpoint reports per-source status so one dead upstream degrades a
// single panel instead of blanking the page.

export type SourceStatus = { source: string; ok: boolean; error?: string };

export type Envelope<T> = T & { asOf: number; sources: SourceStatus[] };

// ── Derivatives ────────────────────────────────────────────────────────────
export type VenueRow = {
  exchange: string; // "Binance"
  market: string; // "BTCUSDT perp"
  oiUsd: number;
  fundingRate8h: number | null; // 8h-equivalent, decimal (0.0001 = 0.01%)
};

// OI in BTC (coins) for the BTCUSDT perps on each venue.
export type OiPoint = { t: number; price: number | null; binance: number | null; bybit: number | null; okx: number | null };

export type RatioPoint = {
  t: number;
  binanceAccounts: number | null; // global long/short account ratio
  binanceTop: number | null; // top-trader long/short position ratio
  binanceTaker: number | null; // taker buy/sell volume ratio
  bybitAccounts: number | null;
  okxAccounts: number | null;
};

export type DerivativesData = Envelope<{
  price: number | null;
  price24hAgo: number | null;
  venues: VenueRow[];
  totalOiUsd: number;
  weightedFunding8h: number | null;
  oiHistory: OiPoint[];
  ratios: RatioPoint[];
  coinbasePremiumPct: number | null;
  fundingHistory: { t: number; v: number }[]; // Binance BTCUSDT 8h funding prints, ~90 days, decimal
  oiDaily: { t: number; v: number }[]; // Binance BTCUSDT OI in BTC, daily, 30 days
}>;

// ── Liquidations ───────────────────────────────────────────────────────────
export type LiqBin = { price: number; longUsd: number; shortUsd: number };

export type LiquidationData = Envelope<{
  price: number | null;
  binSize: number;
  bins: LiqBin[];
  scale: number; // Binance → all-venue OI multiplier used on the map
  windowHours: number; // how far back the model's position cohorts reach
}>;

// Forced orders that actually filled (OKX BTC-USDT swap), last 24h.
export type RealizedLiq = { t: number; side: "long" | "short"; px: number; usd: number }; // side = position liquidated
export type LiqTotals = { long: number; short: number };

export type RealizedLiqData = Envelope<{
  h1: LiqTotals;
  h4: LiqTotals;
  h24: LiqTotals;
  hourly: ({ t: number } & LiqTotals)[]; // 24 hourly buckets, oldest first
  largest: RealizedLiq[];
  coverageHours: number; // < 24 if OKX's history ran out or paging was capped
}>;

// ── ETF flows ──────────────────────────────────────────────────────────────
export type EtfDay = { date: string; total: number | null; funds: Record<string, number | null> };

export type EtfData = Envelope<{
  tickers: string[];
  days: EtfDay[]; // oldest → newest, US$ millions
  cumulative: number | null; // since-inception net, US$ millions
  prices: Record<string, number>; // BTC daily close (UTC), by date
  stale: boolean; // served from cache because the live scrape failed
}>;

// ── Events ─────────────────────────────────────────────────────────────────
export type Impact = "high" | "medium" | "low";

export type MarketEvent = {
  id: string;
  title: string;
  t: number; // ms epoch
  category: "fed" | "inflation" | "jobs" | "growth" | "earnings" | "crypto" | "other";
  impact: Impact;
  note?: string;
  forecast?: string;
  previous?: string;
  estimated?: boolean;
  source: string;
};

export type EventsData = Envelope<{ events: MarketEvent[] }>;

// ── Polymarket ─────────────────────────────────────────────────────────────
export type PolyKind = "above" | "hit" | "dist";

export type PolyRung = { strike: number; dir: "up" | "down" | "above"; p: number; question: string };

export type PolyMarket = {
  kind: PolyKind;
  horizon: string; // "Today", "This week", "October", "2026"
  title: string;
  slug: string;
  endDate: number;
  volume: number;
  volume24h: number;
  rungs: PolyRung[];
  group: "btc" | "macro";
  outcomes?: { label: string; p: number }[]; // "dist": mutually exclusive buckets, in listed order
  impliedMedian?: number | null; // above-ladders: strike where P(above) crosses 50%
};

export type PolymarketData = Envelope<{ markets: PolyMarket[] }>;

// ── Macro & sentiment ──────────────────────────────────────────────────────
export type Series = { t: number; v: number }[];

export type MacroStat = {
  key: string;
  label: string;
  value: number | null;
  unit: "pct" | "usd" | "index" | "usdT" | "usdB" | "ratio";
  change?: number | null; // absolute change over `changeLabel`
  changeLabel?: string;
  series: Series;
  note: string;
  source: string;
};

export type OptionsSnapshot = {
  putCallOi: number | null;
  nextExpiry: string | null;
  nextExpiryMaxPain: number | null;
  nextExpiryOiBtc: number | null;
};

export type MacroData = Envelope<{
  stats: MacroStat[];
  fearGreed: { value: number; label: string; series: Series } | null;
  options: OptionsSnapshot;
}>;

// ── Fed watch ──────────────────────────────────────────────────────────────
export type FedMove = "cut50" | "cut25" | "hold" | "hike25" | "hike50";

export type FedMeeting = {
  t: number; // decision time (statement release)
  polySlug: string | null;
  likelyTarget: { lo: number; hi: number; p: number } | null; // futures, cumulative
  moves: { key: FedMove; label: string; fedwatch: number | null; polymarket: number | null }[];
};

export type FedData = Envelope<{
  targetLo: number | null; // current fed funds target range, %
  targetHi: number | null;
  meetings: FedMeeting[];
}>;

// ── Price & levels ─────────────────────────────────────────────────────────
// Binance spot BTCUSDT candles. `delta` = taker buys − taker sells (BTC), the
// building block of CVD.
export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number; delta: number };

export type PriceData = Envelope<{
  hourly: Candle[]; // last ~31 days, 1h
  daily: Candle[]; // last ~400 days, 1D (UTC), newest may be in progress
  perpHourly: Candle[]; // Binance BTCUSDT perp, 1h, same window as `hourly`
}>;

// ── Volatility & term structure (Deribit) ──────────────────────────────────
export type ExpiryVol = {
  code: string; // "27NOV26"
  t: number; // expiry, ms epoch (08:00 UTC)
  days: number;
  forward: number | null; // Deribit's forward for this expiry
  atmIv: number | null; // %, interpolated at the forward
  rr25: number | null; // 25-delta risk reversal, call IV − put IV, vol points
  fly25: number | null; // 25-delta butterfly, wings − ATM, vol points
  basisAnn: number | null; // dated future vs index, annualised %
  oiBtc: number; // options OI on this expiry
};

export type VolData = Envelope<{
  index: number | null;
  dvol: number | null; // Deribit 30d implied vol index, now
  dvol24hAgo: number | null;
  expiries: ExpiryVol[]; // soonest first
}>;
