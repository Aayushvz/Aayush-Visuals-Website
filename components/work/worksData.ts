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
  "Case Study",
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
  /* the still behind a moving thumbnail — a poster for the <video>, and
     what shows if the loop is still in flight */
  poster: string;
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
  cpgrams: {
    categories: ["Product Design", "UI/UX"],
    tags: [
      "chatbot",
      "conversational",
      "government",
      "govtech",
      "accessibility",
      "voice",
      "multilingual",
      "india",
      "darpg",
      "grievance",
      "mascot",
    ],
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
  posterfolio: {
    categories: ["Graphic Design"],
    tags: ["poster", "print", "typography", "editorial", "series"],
  },
  gravitas: {
    categories: ["Brand Design", "UI/UX"],
    tags: ["branding", "website", "fest", "identity", "print"],
  },
};

/* A deep dive is a category you can filter by, not just a section further
   down the page: someone looking for long-form process work should be able
   to ask for it from the same control as everything else. Derived from the
   project flags so the chip can never disagree with the Case Studies list. */
const isDeepDive = (p: (typeof PROJECTS)[number]) =>
  p.kind === "case-study" || p.alsoCaseStudy === true;

const toWorkItem = (p: (typeof PROJECTS)[number]): WorkItem => ({
  id: p.id,
  title: p.title,
  year: p.year,
  categories: [
    ...(isDeepDive(p) ? ["Case Study"] : []),
    ...(TAXONOMY[p.id]?.categories ?? [p.category]),
  ],
  tags: TAXONOMY[p.id]?.tags ?? [],
  thumbnail: p.bgVideoUrl ?? p.cover,
  poster: p.cover,
  logo: p.logoUrl,
  wordmark: p.logoText,
});

/* The filterable grid. Deep dives lead it: they are the work that rewards
   actually being read, so burying them under whichever project happened to
   ship last is the wrong default. Order within each group is preserved.

   Projects flagged `kind: "case-study"` still live only in the section
   below; `alsoCaseStudy` ones appear in both, and carry the "Case Study"
   chip so the filter can find them here too. */
export const WORKS: WorkItem[] = [
  ...PROJECTS.filter((p) => p.kind !== "case-study" && isDeepDive(p)),
  ...PROJECTS.filter((p) => p.kind !== "case-study" && !isDeepDive(p)),
].map(toWorkItem);

/* Long-form process work, listed in its own section below Projects.
   `alsoCaseStudy` opts a project in here while leaving it in the grid above,
   for work that is both a shipped product and a deep dive. */
export const CASE_STUDIES: WorkItem[] = PROJECTS.filter(
  (p) => p.kind === "case-study" || p.alsoCaseStudy
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
