import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gzip/brotli-compress HTML and JSON responses
  compress: true,
  // when next/image is used, serve AVIF first then WebP; cache long
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  /*
    The invoice generator is its own Next app and its own deployment, but
    it answers on this domain. Both rules are needed: the bare path for the
    entry point, and the wildcard for everything the app then asks for -
    its chunks, its fonts, its API routes.

    Destination comes from an env var so the deployment URL is not baked
    into the repo. Set INVOICE_APP_ORIGIN in the environment; if it is
    missing the rules are simply not added, which fails as a 404 on the
    path rather than as a broken build.
  */
  async rewrites() {
    const origin = process.env.INVOICE_APP_ORIGIN;
    if (!origin) return [];

    return [
      {
        source: "/invoice-generator",
        destination: `${origin}/invoice-generator`,
      },
      {
        source: "/invoice-generator/:path*",
        destination: `${origin}/invoice-generator/:path*`,
      },
    ];
  },

  experimental: {
    turbopackFileSystemCacheForDev: false,
    // tree-shake framer-motion imports so only used parts ship
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
