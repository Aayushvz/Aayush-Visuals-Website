import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Served at /robots.txt. The sitemap pointer is the part that matters —
   it's how a crawler that arrives without a Search Console submission still
   finds every page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
