"use client";

import Link from "next/link";
import { useMemo } from "react";
import { C, ago } from "../lib/format";
import { useApi, useNow } from "../lib/hooks";
import { keyLevels } from "../lib/quant";
import { buildSignals, liqMagnet, volRegime } from "../lib/signals";
import type { PulseHistory } from "../lib/track";
import type { DerivativesData, EtfData, EventsData, FedData, LiquidationData, MacroData, PolymarketData, PriceData, VolData } from "../lib/types";
import { Calendar } from "./Calendar";
import { EtfFlows } from "./EtfFlows";
import { Liquidations } from "./Liquidations";
import { Macro } from "./Macro";
import { Positioning } from "./Positioning";
import { Predictions } from "./Predictions";
import { PriceLevels } from "./PriceLevels";
import { Pulse } from "./Pulse";
import { TopBar } from "./TopBar";
import { TrackRecord } from "./TrackRecord";
import { Volatility } from "./Volatility";
import { Section } from "./ui";

const API = "/api/marketintel";

export function Dashboard() {
  const der = useApi<DerivativesData>(`${API}/derivatives`, 30_000);
  const liq = useApi<LiquidationData>(`${API}/liquidations`, 60_000);
  const etf = useApi<EtfData>(`${API}/etf`, 15 * 60_000);
  const poly = useApi<PolymarketData>(`${API}/polymarket`, 30_000);
  const fed = useApi<FedData>(`${API}/fed`, 2 * 60_000);
  const ev = useApi<EventsData>(`${API}/events`, 30 * 60_000);
  const mac = useApi<MacroData>(`${API}/macro`, 5 * 60_000);
  const px = useApi<PriceData>(`${API}/price`, 60_000);
  const vol = useApi<VolData>(`${API}/vol`, 60_000);
  const hist = useApi<PulseHistory>(`${API}/pulse`, 5 * 60_000);
  const now = useNow(5000);

  const signals = useMemo(
    () => buildSignals({ d: der.data, l: liq.data, e: etf.data, p: poly.data, m: mac.data, v: vol.data, px: px.data }),
    [der.data, liq.data, etf.data, poly.data, mac.data, vol.data, px.data],
  );
  const spot = der.data?.price ?? liq.data?.price ?? null;
  const regime = useMemo(() => volRegime(vol.data, px.data, spot), [vol.data, px.data, spot]);
  const levels = useMemo(
    () => (px.data ? keyLevels(px.data.daily, px.data.hourly, spot, liqMagnet(liq.data), mac.data, vol.data?.dvol ?? null) : []),
    [px.data, spot, liq.data, mac.data, vol.data],
  );

  const feeds = [
    ["Price", px],
    ["Derivatives", der],
    ["Options", vol],
    ["Liquidations", liq],
    ["ETF", etf],
    ["Polymarket", poly],
    ["Fed watch", fed],
    ["Calendar", ev],
    ["Macro", mac],
    ["Track record", hist],
  ] as const;

  return (
    <>
      <TopBar d={der.data} />
      <main className="mx-auto w-[min(96%,110rem)] pb-20 pt-10">
        <Section n="01" title="Market pulse" kicker="The panels below scored into an intraday, swing and macro bias, plus how far BTC is expected to move. Not financial advice.">
          <Pulse signals={signals} regime={regime} spot={spot} />
          <div className="mt-4">
            <TrackRecord hist={hist.data} now={now} />
          </div>
        </Section>

        <Section n="02" title="Price & levels" kicker="Where the market is, and the levels traders are watching">
          <PriceLevels px={px.data} levels={levels} spot={spot} />
        </Section>

        <Section n="03" title="Positioning" kicker="Binance, Bybit, OKX, Hyperliquid, Bitget, Deribit">
          <Positioning d={der.data} />
        </Section>

        <Section n="04" title="Liquidations" kicker="Where leveraged positions get force closed">
          <Liquidations l={liq.data} spot={spot} />
        </Section>

        <Section n="05" title="Volatility & term structure" kicker="Deribit options and futures: what vol costs, skew, and carry">
          <Volatility v={vol.data} regime={regime} />
        </Section>

        <Section n="06" title="ETF flows" kicker="US spot bitcoin ETFs, daily">
          <EtfFlows e={etf.data} />
        </Section>

        <Section n="07" title="Prediction markets" kicker="Polymarket. Picks up each new market automatically as old ones settle">
          <Predictions p={poly.data} spot={spot} fed={fed.data} />
        </Section>

        <Section n="08" title="Catalyst calendar" kicker="Fed, CPI, jobs, earnings, expiries">
          <Calendar ev={ev.data} />
        </Section>

        <Section n="09" title="Macro & sentiment" kicker="Liquidity, rates, dollar, risk, volatility">
          <Macro m={mac.data} />
        </Section>

        <footer className="mt-16 border-t pt-6 text-[0.85rem] leading-relaxed" style={{ borderColor: C.line, color: C.muted }}>
          <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[0.85rem]">
              {feeds.map(([name, f]) => {
                const failed = f.data?.sources.filter((s) => !s.ok).length ?? 0;
                const state = f.error && !f.data ? "down" : !f.data ? "loading" : failed ? "partial" : "ok";
                const color = state === "ok" ? C.long : state === "partial" ? "#e0a100" : state === "down" ? C.short : "#c9c8c2";
                return (
                  <li key={name} className="flex items-center gap-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2 rounded-full" style={{ background: color }} />
                      {name}
                    </span>
                    <span className="mi-num text-[0.8rem]" style={{ color: C.muted }}>
                      {state === "loading" ? "…" : f.data ? ago(f.data.asOf, now) : state}
                      {failed ? `, ${failed} off` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          Data: Binance, Bybit, OKX, Hyperliquid, Bitget, Deribit (options, futures, DVOL), Coinbase (public APIs). Farside Investors (ETF flows).
          Polymarket. ForexFactory, Federal Reserve, BLS, BEA (calendar). FRED, DefiLlama, CoinGecko, alternative.me (macro).
          The liquidation map is a model. Nothing here is financial advice.{" "}
          <Link href="/" className="underline underline-offset-4">afrodance.fun</Link>
        </footer>
      </main>
    </>
  );
}
