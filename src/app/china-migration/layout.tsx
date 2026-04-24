import { Inter, Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "China Migration · 1990 — 2020",
  description:
    "Three decades of migration into and out of China, drawn from UN DESA's bilateral migrant-stock data.",
};

export default function ChinaMigrationLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${fraunces.variable} china-migration-page min-h-screen bg-[#0e1726] text-white/85`}
      style={{ fontFamily: "var(--font-ui), ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      {children}
    </div>
  );
}
