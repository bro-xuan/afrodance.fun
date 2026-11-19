import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import type { ReactNode } from "react";

// A handwriting face for the title and captions: the page is a sketchbook.
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand", display: "swap" });

const description =
  "An isometric Amsterdam that sketches itself onto the page canal by canal, then takes you round: Centraal Station, the Jordaan, the Rijksmuseum, the Skinny Bridge. Boats, bikes and trams included. Every line is drawn by code.";

export const metadata: Metadata = {
  // The share image (opengraph-image.jpg, next to this file) needs a full address.
  metadataBase: new URL("https://afrodance.fun"),
  title: "Amsterdam, drawn in code · afrodance.fun",
  description,
  openGraph: {
    title: "Amsterdam, drawn in code",
    description,
    type: "website",
    url: "/animation-amsterdam",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amsterdam, drawn in code",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe4",
};

export default function AnimationLayout({ children }: { children: ReactNode }) {
  return <div className={hand.variable}>{children}</div>;
}
