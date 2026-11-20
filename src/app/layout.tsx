import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Pixelify_Sans } from "next/font/google";
import "nes.css/css/nes.min.css";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

// The home page's selected projects, in its order: the apps, the newsletter and the art.
const description =
  "Stefan Wang builds products on the internet, mostly with AI and crypto. Selected projects: Mora, an iOS app for couples, plus Predictooor and ReferReady; What People Made, a daily gallery of real AI use cases and a weekly AI newsletter; and Amsterdam, London and Berlin drawn in code, with a museum of every analog camera ever made.";

export const metadata: Metadata = {
  title: "Stefan Wang — afrodance.fun",
  description,
  openGraph: {
    title: "Stefan Wang — afrodance.fun",
    description,
    type: "website",
  },
};

// Tints the mobile browser UI (address bar / task switcher) with the brand green.
export const viewport: Viewport = {
  themeColor: "#6aad30",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${pixelify.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#faf8f2] text-[#2d2d2d] antialiased">
        {children}
      </body>
    </html>
  );
}
