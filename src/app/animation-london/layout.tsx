import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import type { ReactNode } from "react";

// A handwriting face for the title and captions: the page is a sketchbook.
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand", display: "swap" });

const description =
  "An isometric London that sketches itself onto the page: the Thames flows in, then Westminster, St Paul's, the Tower and the rest arrive one by one. Red buses, black cabs and river boats included, and Tower Bridge opens. Every line is drawn by code.";

export const metadata: Metadata = {
  // The share image (opengraph-image.jpg, next to this file) needs a full address.
  metadataBase: new URL("https://afrodance.fun"),
  title: "London, drawn in code · afrodance.fun",
  description,
  openGraph: {
    title: "London, drawn in code",
    description,
    type: "website",
    url: "/animation-london",
  },
  twitter: {
    card: "summary_large_image",
    title: "London, drawn in code",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe4",
};

export default function AnimationLayout({ children }: { children: ReactNode }) {
  return <div className={hand.variable}>{children}</div>;
}
