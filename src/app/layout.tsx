import type { Metadata } from "next";
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
  title: "afrodance.fun",
  description: "Fun projects from the internet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${pixelify.variable}`}>
      <body className="min-h-screen bg-[#faf8f2] text-[#2d2d2d] antialiased">
        {children}
      </body>
    </html>
  );
}
