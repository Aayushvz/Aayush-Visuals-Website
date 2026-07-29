/*
  Works listing data — derived from the single source of truth in
  components/projects/projectData.ts so the homepage and the /work listing
  never drift. This layer only adds the listing-specific taxonomy (the filter
  categories + free-text search tags) and picks the thumbnail/wordmark; it does
  not duplicate copy. New projects added to PROJECTS flow in automatically.
*/

import { PROJECTS } from "@/components/projects/projectData";

export const WORK_CATEGORIES = [
  "All",
  "Product Design",
  "UI/UX",
  "Posters",
  "Brand Design",
  "Social Media Creatives",
  "Motion Graphics",
  "Video Edits",
] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export type WorkItem = {
  id: string;
  title: string;
  year: string;
  /** every filter category this project belongs to (drives the chips) */
  categories: string[];
  /** extra free-text terms the search should match beyond title/category */
  tags: string[];
  thumbnail: string;
  /** real logo asset shown centred + sharp over the image (when one exists) */
  logo?: string;
  /** text wordmark fallback for projects without a logo asset (e.g. Yantra) */
  wordmark: string;
};

/* map each existing project onto the listing taxonomy. Categories the site
   doesn't have work for yet (Posters, Motion Graphics, ...) simply stay empty
   until matching projects are added to PROJECTS. */
const TAXONOMY: Record<string, { categories: string[]; tags: string[] }> = {
  "mike-tyson-invitational": {
    categories: ["UI/UX", "Brand Design"],
    tags: ["website", "webflow", "sports", "boxing", "branding", "motion"],
  },
  "elevation-capital": {
    categories: ["UI/UX", "Brand Design"],
    tags: ["website", "framer", "ai", "report", "startups", "development"],
  },
  riviera: {
    categories: ["UI/UX", "Brand Design"],
    tags: ["website", "festival", "framer", "event", "identity"],
  },
  layover: {
    categories: ["Product Design", "UI/UX"],
    tags: ["app", "booking", "travel", "mobile", "prototyping"],
  },
  yantra: {
    categories: ["UI/UX"],
    tags: ["3d", "website", "fest", "interactive", "webgl"],
  },
  dropby: {
    categories: ["Product Design", "UI/UX"],
    tags: ["app", "social", "location", "mobile", "identity"],
  },
  futurepreneurs: {
    categories: ["UI/UX", "Brand Design"],
    tags: ["event", "website", "framer", "startup", "founders"],
  },
  gravitas: {
    categories: ["Brand Design", "UI/UX"],
    tags: ["branding", "website", "fest", "identity", "print"],
  },
};

const toWorkItem = (p: (typeof PROJECTS)[number]): WorkItem => ({
  id: p.id,
  title: p.title,
  year: p.year,
  categories: TAXONOMY[p.id]?.categories ?? [p.category],
  tags: TAXONOMY[p.id]?.tags ?? [],
  thumbnail: p.bgVideoUrl ?? p.cover,
  logo: p.logoUrl,
  wordmark: p.logoText,
});

/* Shipped product/brand work — the filterable grid. Case studies are split
   out so they can't surface through a category chip or a search query. */
export const WORKS: WorkItem[] = PROJECTS.filter(
  (p) => p.kind !== "case-study"
).map(toWorkItem);

/* Long-form process work, listed in its own section below Projects */
export const CASE_STUDIES: WorkItem[] = PROJECTS.filter(
  (p) => p.kind === "case-study"
).map(toWorkItem);

/** shared filter predicate so search + category always agree */
export function filterWorks(items: WorkItem[], category: string, query: string) {
  const q = query.trim().toLowerCase();
  return items.filter((w) => {
    const inCategory = category === "All" || w.categories.includes(category);
    if (!inCategory) return false;
    if (!q) return true;
    return (
      w.title.toLowerCase().includes(q) ||
      w.categories.some((c) => c.toLowerCase().includes(q)) ||
      w.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}
