import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gzip/brotli-compress HTML and JSON responses
  compress: true,
  // when next/image is used, serve AVIF first then WebP; cache long
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  experimental: {
    turbopackFileSystemCacheForDev: false,
    // tree-shake framer-motion imports so only used parts ship
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
