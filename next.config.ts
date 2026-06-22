import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        // Tina Cloud CDN — images uploaded via admin are served from here
        protocol: "https",
        hostname: "assets.tina.io",
      },
    ],
  },
};

export default nextConfig;
