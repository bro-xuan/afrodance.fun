import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import type { ReactNode } from "react";
import { PLACE } from "./place";

// A handwriting face for the title and captions: the page is a sketchbook.
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  // A share image (opengraph-image.jpg next to this file) needs a full address to point at.
  ...(PLACE.site ? { metadataBase: new URL(PLACE.site) } : {}),
  title: PLACE.title,
  description: PLACE.description,
  openGraph: {
    title: PLACE.title,
    description: PLACE.description,
    type: "website",
    url: PLACE.path,
  },
  twitter: {
    card: "summary_large_image",
    title: PLACE.title,
    description: PLACE.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe4",
};

export default function FilmLayout({ children }: { children: ReactNode }) {
  return <div className={hand.variable}>{children}</div>;
}
