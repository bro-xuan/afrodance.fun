import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Paper Kite, the agency, has its own domain: its site was a static copy at /paperkite
      // until 2026-11-15, and every old link goes on to the same page there (/paperkite →
      // paperkite.eu, /paperkite/showcase/nightjar → paperkite.eu/showcase/nightjar). Nothing
      // in public/paperkite may answer first: Cloudflare serves a matching file before the
      // Worker, and so this redirect, sees the request.
      {
        source: "/paperkite/:path*",
        destination: "https://paperkite.eu/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/date-scoring",
        destination: "/date-scoring/index.html",
      },
      // 3D of Things, baked into public/3d-of-everything by `npm run export` in
      // bro-xuan/3d-of-things: the skill's page at the root, the machines under /objects.
      // Each is its folder's index.html, which Vercel serves itself; these are for `next start`.
      {
        source: "/3d-of-everything",
        destination: "/3d-of-everything/index.html",
      },
      {
        source: "/3d-of-everything/objects",
        destination: "/3d-of-everything/objects/index.html",
      },
    ];
  },
};

export default nextConfig;

// Lets `next dev` see local versions of the Cloudflare bindings (IMAGES, ASSETS).
initOpenNextCloudflareForDev();
