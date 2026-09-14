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
  "Branding",
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
   until matching projects are added to PROJECTS.

   Branding is deliberately narrow: Aayush's call, and it is currently the
   three projects that are identity work first - dropby, IP-TT Cell and AIU.
   Several others do carry identity work (Mike Tyson, Layover, Riviera,
   Elevation, Futurepreneurs, Gravitas) and used to sit under this chip; they
   were taken out so the filter answers "show me branding" with branding
   rather than with most of the site. Their `tags` still carry the words, so
   a text search for "branding" or "identity" still finds them. */
const TAXONOMY: Record<string, { categories: string[]; tags: string[] }> = {
  "mike-tyson-invitational": {
    categories: ["UI/UX"],
    tags: ["website", "webflow", "sports", "boxing", "branding", "motion"],
  },
  "elevation-capital": {
    categories: ["UI/UX"],
    tags: ["website", "framer", "ai", "report", "startups", "development"],
  },
  riviera: {
    categories: ["UI/UX"],
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
    tags: ["app", "booking", "travel", "mobile", "prototyping", "airport", "identity"],
  },
  "meal-maestro": {
    categories: ["Product Design", "UI/UX"],
    tags: ["app", "food", "recipes", "meal planning", "mobile", "gdg", "hackathon"],
  },
  yantra: {
    categories: ["UI/UX"],
    tags: ["3d", "website", "fest", "interactive", "webgl"],
  },
  dropby: {
    categories: ["Branding", "Product Design", "UI/UX"],
    tags: ["app", "social", "location", "mobile", "identity", "rebrand", "campaign", "logo"],
  },
  futurepreneurs: {
    categories: ["UI/UX"],
    tags: ["event", "website", "framer", "startup", "founders"],
  },
  posterfolio: {
    /* "Graphic Design" was not one of WORK_CATEGORIES, so this matched no
       chip and the project was reachable only under All */
    categories: ["Posters", "Social Media Creatives"],
    tags: ["poster", "print", "typography", "editorial", "series", "graphic design", "social"],
  },
  gravitas: {
    categories: ["UI/UX"],
    tags: ["branding", "website", "fest", "identity", "print"],
  },
  /*
    Without an entry here a project falls back to [p.category], and a
    category that is not one of WORK_CATEGORIES matches no chip at all - see
    the note on posterfolio. "Branding" now IS a chip, but "UI Design" is
    not, so all three of these needed naming against the real taxonomy
    rather than against the label in their hero.
  */
  "ip-tt-cell": {
    categories: ["Branding"],
    tags: ["logo", "branding", "identity", "university", "vit", "intellectual property", "patents", "pillar"],
  },
  aiu: {
    categories: ["Branding"],
    tags: ["logo", "branding", "identity", "redesign", "seal", "emblem", "university", "education"],
  },
  "moon-store": {
    categories: ["UI/UX"],
    tags: ["website", "ecommerce", "fashion", "clothing", "gen-z", "storefront", "customisation"],
  },
  "solo-leveling": {
    categories: ["UI/UX"],
    tags: ["website", "anime", "manga", "streaming", "ecommerce", "merch", "fan", "concept", "dark mode"],
  },
  /* Branding was narrowed to identity-first work; this is identity and
     nothing else, so it joins dropby, IP-TT Cell and AIU there. */
  fuzion: {
    categories: ["Branding"],
    tags: ["branding", "identity", "logo", "wordmark", "streetwear", "fashion", "typography", "stationery", "billboard"],
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

/*
  Running order, set by hand.

  The two sections are ordered independently because they answer different
  questions: the grid leads with the work that should be seen first, the
  reading list leads with the work that rewards being read. Anything not
  named here still appears, appended in PROJECTS order, so a newly added
  project is never silently dropped from a section.
*/
const PROJECT_ORDER = [
  "mike-tyson-invitational",
  "cpgrams",
  "layover",
  "gravitas",
  "meal-maestro",
  "elevation-capital",
  "posterfolio",
  "dropby",
  "riviera",
  "fuzion",
  "yantra",
] as const;

const CASE_STUDY_ORDER = [
  "mike-tyson-invitational",
  "cpgrams",
  "layover",
  "meal-maestro",
  "dropby",
  "gravitas",
] as const;

/* unlisted ids sort to the end; Array#sort is stable, so they keep their
   PROJECTS order relative to each other */
const byOrder = (ids: readonly string[]) => (a: WorkItem, b: WorkItem) => {
  const rank = (id: string) => {
    const i = ids.indexOf(id);
    return i === -1 ? ids.length : i;
  };
  return rank(a.id) - rank(b.id);
};

/* The filterable grid, and it lists EVERY project without exception: this
   section is the complete body of work, so anything added to PROJECTS shows
   up here automatically and nothing has to be opted in.

   Case studies also appear in their own section below (see CASE_STUDIES).
   That repetition is deliberate: this grid answers "what has he made", the
   section below answers "what can I read in depth". Every deep dive carries
   the "Case Study" chip so the filter can isolate them here too. */
export const WORKS: WorkItem[] = PROJECTS.map(toWorkItem).sort(byOrder(PROJECT_ORDER));

/* Long-form process work, listed in its own section below Projects.
   `alsoCaseStudy` opts a project in here while leaving it in the grid above,
   for work that is both a shipped product and a deep dive. */
export const CASE_STUDIES: WorkItem[] = PROJECTS.filter(isDeepDive)
  .map(toWorkItem)
  .sort(byOrder(CASE_STUDY_ORDER));

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
