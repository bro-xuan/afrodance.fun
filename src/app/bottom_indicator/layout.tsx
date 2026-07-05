import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-bi", display: "swap" });

export const metadata = {
  title: "BTC Bottom Indicator · afrodance.fun",
  description:
    "A dashboard of Bitcoin on-chain valuation signals — MVRV, NUPL, SOPR, realized-price models — scored 0–100 to gauge how close BTC is to a cycle bottom.",
};

export default function BottomIndicatorLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} bottom-indicator-page min-h-screen bg-[#f5f6f8] text-[#1f2328]`}
      style={{ fontFamily: "var(--font-bi), ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      {children}
    </div>
  );
}
