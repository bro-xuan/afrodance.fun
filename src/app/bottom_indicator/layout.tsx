import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-bi", display: "swap" });

export const metadata = {
  title: "BTC Bottom & Top Indicator · afrodance.fun",
  description:
    "Where is Bitcoin in its cycle? 16 on-chain, miner, and price signals ranked against their own history — a 0–100 cycle score plus dedicated bottom-watch and top-watch trigger panels, refreshed daily.",
};

export default function BottomIndicatorLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} bottom-indicator-page min-h-screen bg-[#0a0e17] text-[#e6edf5]`}
      style={{ fontFamily: "var(--font-bi), ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      {children}
    </div>
  );
}
