import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
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
      // Paper Kite, the agency's site, baked into public/paperkite by `pnpm export:afrodance` in
      // bro-xuan/small-business-marketing: one .html file per page. Cloudflare serves each at its
      // clean path itself; these are for `next start` (files that exist, like its scripts, win).
      {
        source: "/paperkite",
        destination: "/paperkite/index.html",
      },
      {
        source: "/paperkite/:path*",
        destination: "/paperkite/:path*.html",
      },
    ];
  },
};

export default nextConfig;

// Lets `next dev` see local versions of the Cloudflare bindings (IMAGES, ASSETS).
initOpenNextCloudflareForDev();
