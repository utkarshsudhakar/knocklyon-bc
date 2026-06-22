import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve all images via a pass-through loader — bypasses /_next/image
    // domain whitelisting entirely. Works for both local /public files
    // and Tina Cloud CDN (assets.tina.io).
    loader: "custom",
    loaderFile: "./app/image-loader.ts",
  },
};

export default nextConfig;
