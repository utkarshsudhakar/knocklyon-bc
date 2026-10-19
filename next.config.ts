import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/fixtures.ics": ["./content/fixtures/**/*"],
    "/schedule/admin": [
      "./content/fixtures/**/*",
      "./content/settings/site.json",
    ],
    "/schedule/admin/export": [
      "./content/fixtures/**/*",
      "./content/settings/site.json",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tina.io" },
    ],
  },
};

export default nextConfig;
