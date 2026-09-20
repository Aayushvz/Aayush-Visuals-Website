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
  /*
    Static images in /public are served `max-age=0` by default, which means
    every reference to one costs a conditional request even when the bytes are
    already sitting in the browser. That is invisible most of the time and
    very visible here: the homepage warms the deck and gallery photographs
    ahead of their sections (see components/HomeDeferred.tsx), and with
    max-age=0 the <img> that mounts a moment later still has to go back to the
    server to be told nothing changed - re-serialising the very round trip the
    warm-up existed to remove.

    A day of freshness plus a week of stale-while-revalidate. Not `immutable`:
    these filenames are not content-hashed, so a replaced photograph has to be
    able to reach people who have already seen the old one.
  */
  async headers() {
    return [
      {
        source: "/:dir(gallery|services|projects|logos|hero|footer|about)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

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
