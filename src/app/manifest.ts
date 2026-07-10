import type { MetadataRoute } from "next";

// PWA manifest — powers the Android home-screen install and app switcher.
// Icons live in /public; the browser-tab favicon (icon.svg / favicon.ico) and
// the iOS icon (apple-icon.png) are picked up automatically from src/app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "afrodance.fun — Stefan Wang",
    short_name: "afrodance",
    description:
      "Stefan Wang — building fun things on the internet, mostly AI and crypto.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#6aad30",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
