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

export const metadata: Metadata = {
  title: "Stefan Wang — afrodance.fun",
  description:
    "Stefan Wang — I run Paper Kite, an agentic social media agency for local businesses. Also building fun things on the internet, mostly AI and crypto.",
  openGraph: {
    title: "Stefan Wang — afrodance.fun",
    description:
      "I run Paper Kite, an agentic social media agency for local businesses. Also building fun things on the internet, mostly AI and crypto.",
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
