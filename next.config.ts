import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/date-scoring",
        destination: "/date-scoring/index.html",
      },
    ];
  },
};

export default nextConfig;
