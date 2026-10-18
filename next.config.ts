import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
