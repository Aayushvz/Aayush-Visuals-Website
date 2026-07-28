import type { MetadataRoute } from "next";
import { PROJECTS } from "@/components/projects/projectData";
import { SITE_URL } from "@/lib/site";

/*
  Generated at build time, served at /sitemap.xml. Project pages are derived
  from PROJECTS, so a new case study appears in the sitemap automatically
  rather than needing to be remembered here.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/work", priority: 0.9 },
    { path: "/about", priority: 0.8 },
    { path: "/contact", priority: 0.7 },
  ].map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority,
  }));

  const projectRoutes = PROJECTS.map((p) => ({
    url: `${SITE_URL}/work/${p.id}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
