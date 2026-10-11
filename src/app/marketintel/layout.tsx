import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./marketintel.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-mi", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mi-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Market Intel: BTC trading monitor | afrodance.fun",
  description:
    "One-stop BTC trading dashboard: aggregated open interest, funding and long/short ratios across Binance, Bybit, OKX, Hyperliquid, Bitget and Deribit; liquidation map and live liquidations; US spot ETF flows; Polymarket BTC odds; FOMC/CPI/earnings calendar; macro liquidity.",
};

export default function MarketIntelLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${mono.variable} mi-root min-h-screen bg-white text-[#0b0b0b]`}>{children}</div>
  );
}
