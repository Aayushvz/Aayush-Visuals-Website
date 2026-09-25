import { EXPERIMENTS } from "@/components/playground/experiments";
import { Logo } from "@/components/playground/logos";
import { PROJECTS, SELECTED_PROJECTS } from "@/components/projects/projectData";
import type { Promo } from "@/components/PromoToast";

/*
  Every popup the site can show, built on the server so the project data
  never ships to the browser just to fill a notification. PromoManager
  (mounted once in the root layout) decides which one to show and when.

  Two kinds: whole pages (about, work, playground, contact) and single
  projects (the most recent one, plus a few featured case studies).
*/

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

/* "09.23.2026" -> "Sept 23" */
function shortDate(shipped: string) {
  const [mm, dd] = shipped.split(".");
  return `${MONTHS[Number(mm) - 1]} ${Number(dd)}`;
}

/* the most recent project: its case study on this site, not the live build */
const RECENT_EXPERIMENT = "cat";
const RECENT_CASE = "cat-operator-assistant";

/* featured case studies that get a popup of their own */
const FEATURED = ["mike-tyson-invitational", "layover", "cpgrams"];

const envelope = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 6h17v12h-17zM4 7l8 6 8-6" />
  </svg>
);

export function buildPromos(): Promo[] {
  const promos: Promo[] = [];

  const exp = EXPERIMENTS.find((e) => e.id === RECENT_EXPERIMENT);
  const recentCase = PROJECTS.find((p) => p.id === RECENT_CASE);
  if (exp && recentCase) {
    promos.push({
      id: "recent",
      href: `/work/${RECENT_CASE}`,
      band: "Most recent project",
      title: exp.title,
      meta: shortDate(exp.shipped),
      text: exp.blurb,
      marks: [
        { kind: "image", src: "/cat-dashboard/excavator.jpg" },
        {
          kind: "badge",
          bg: "#1a1712",
          fg: "#fff",
          node: <img src="/cat-dashboard/logo-white.png" alt="" width={19} height={13} />,
        },
      ],
      status: "Just shipped",
      statusTone: "green",
      chips: exp.tags.filter((t) => t.label.length <= 13).slice(0, 3),
      action: `Read the case study: ${exp.title}`,
    });
  }

  promos.push({
    id: "work",
    href: "/work",
    band: "See the work",
    title: "Selected projects",
    meta: "2020 - now",
    text: "Product, brand and website work across real launches, each written up as a case study.",
    marks: SELECTED_PROJECTS.slice(0, 3).map((p) => ({ kind: "image" as const, src: p.cover })),
    status: `${PROJECTS.length} projects`,
    statusTone: "purple",
    chips: [
      { label: "Product", icon: "dashboard" },
      { label: "Brand", icon: "sparkle" },
      { label: "Web", icon: "globe" },
    ],
    action: "View all projects",
  });

  promos.push({
    id: "playground",
    href: "/playground",
    band: "From the playground",
    title: "Tools & games I've built",
    meta: `${EXPERIMENTS.length} live`,
    text: "A cricket game, a pixel pond and a couple of freelance tools, all playable right in the browser.",
    marks: EXPERIMENTS.slice(0, 3).map((e) => ({
      kind: "badge" as const,
      bg: e.theme.accent,
      fg: e.theme.onAccent,
      node: <Logo id={e.id} />,
    })),
    status: "Free to try",
    statusTone: "purple",
    chips: [
      { label: "Games", icon: "game" },
      { label: "Tools", icon: "receipt" },
      { label: "Toys", icon: "sparkle" },
    ],
    action: "Open the playground",
  });

  promos.push({
    id: "about",
    href: "/about",
    band: "Get to know me",
    title: "About Aayush",
    meta: "Product designer",
    text: "How I work, where I have been, and what I care about when a product meets real people.",
    marks: [{ kind: "image", src: "/about/avatar.webp" }],
    status: "The story",
    statusTone: "purple",
    chips: [
      { label: "Story", icon: "pencil" },
      { label: "Skills", icon: "dashboard" },
      { label: "Journey", icon: "globe" },
    ],
    action: "Read about me",
  });

  promos.push({
    id: "contact",
    href: "/contact",
    band: "Let's work together",
    title: "Have a project in mind?",
    meta: "Open for work",
    text: "Tell me what you are building. I am taking on new product, brand and website projects.",
    marks: [
      { kind: "image", src: "/about/avatar.webp" },
      { kind: "badge", bg: "#7c3aed", fg: "#fff", node: envelope },
    ],
    status: "Available",
    statusTone: "green",
    chips: [
      { label: "Freelance", icon: "receipt" },
      { label: "Product", icon: "dashboard" },
      { label: "Brand", icon: "sparkle" },
    ],
    action: "Get in touch",
  });

  const icons = ["sparkle", "dashboard", "pencil"] as const;
  for (const id of FEATURED) {
    const p = PROJECTS.find((x) => x.id === id);
    if (!p) continue;
    promos.push({
      id: `project-${p.id}`,
      href: `/work/${p.id}`,
      band: "Featured project",
      title: p.title,
      meta: p.year,
      text: p.headline ?? p.description,
      marks: [{ kind: "image", src: p.cover }],
      status: p.category,
      statusTone: "purple",
      chips: p.tools
        .filter((t) => t.length <= 13)
        .slice(0, 3)
        .map((t, i) => ({ label: t, icon: icons[i % icons.length] })),
      action: `Read the case study: ${p.title}`,
    });
  }

  return promos;
}
