import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve images directly without optimisation — avoids CDN/domain config
    // issues on Vercel for a site this size.
    unoptimized: true,
  },
};

export default nextConfig;
