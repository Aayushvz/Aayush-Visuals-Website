/*
  Single source of truth for the Projects section. Adding a future project =
  append one object here. Every project also gets a full case-study page at
  /work/[id] (see components/projects/figma/FigmaProjectPage), rendered off
  this same array. `preview` is a tagged union so that page's CTA link can
  point at a live site, Behance, an image/video, or a local route without
  touching component code.

  `cover` and `logoText` are placeholders — real transparent PNG/SVG logos
  and cover photography will be dropped in later (see notes on ProjectTile).
*/

export type ProjectPreview =
  | { kind: "behance"; embedId: string; href: string }
  | { kind: "website"; href: string; image?: string }
  | { kind: "image"; src: string; href?: string }
  | { kind: "video"; src: string; poster?: string; href?: string }
  | { kind: "page"; href: string }; // future: local case-study route

type ShotBase = {
  /** shown under the image on the case-study page */
  caption: string;
  /** screen-reader description of what the image actually shows */
  alt: string;
  /** full-bleed within the column; non-wide shots sit inset for rhythm */
  wide?: boolean;
};

/*
  A shot is either one image, or a tall export sliced into stacked pieces.

  The strip form exists because WebP tops out at 16383px per side: a 22,306px
  case-study export physically cannot be one file, and a bitmap that tall
  would be ~125MB of RGBA to decode on the main thread even if it could. The
  slices carry their own dimensions so the page can reserve the exact box for
  each before it loads and not twitch as 18 images arrive.
*/
export type ProjectShot =
  | (ShotBase & { src: string })
  | (ShotBase & {
      strip: string[];
      sliceW: number;
      sliceH: number;
      /** the export rarely divides evenly, so the final piece is shorter */
      lastSliceH: number;
    });

export function isStripShot(
  shot: ProjectShot
): shot is ShotBase & { strip: string[]; sliceW: number; sliceH: number; lastSliceH: number } {
  return "strip" in shot;
}

export type Project = {
  id: string;
  /* Long-form process work is listed in its own section on /work rather than
     the Projects grid. Kept as a flag on the one array instead of a second
     parallel list, so the two can't drift and /work/[slug], the sitemap and
     the file-page dock all keep working with no extra wiring. */
  kind?: "project" | "case-study";
  title: string;
  /** short wordmark shown on the tile until a real logo asset lands */
  logoText: string;
  logoUrl?: string;
  bgVideoUrl?: string;
  category: string;
  year: string;
  /** placeholder cover photo — swap for real artwork later */
  cover: string;
  preview: ProjectPreview;
  /** label for the modal's primary action button */
  cta: string;
  role: string;
  tools: string[];
  description: string;
  highlights: string[];
  /** project-specific facts appended after Role/Category/Year on the
      case-study page (e.g. Surfaces, Airports) */
  extraFacts?: [string, string][];
  /** case-study gallery. Without it the page falls back to `cover` alone. */
  shots?: ProjectShot[];
};

export const PROJECTS: Project[] = [
  {
    id: "mike-tyson-invitational",
    title: "Mike Tyson Invitational",
    logoText: "MTI",
    logoUrl: "/projects/mike-tyson-logo.webp",
    bgVideoUrl: "/projects/mike-tyson-bg.webp",
    category: "Website Design",
    year: "2026",
    cover: "/projects/mike-tyson-bg.webp",
    preview: {
      kind: "website",
      href: "https://mike-tyson-invitational.webflow.io",
      image: "/projects/mike-tyson-bg.webp",
    },
    cta: "Visit Live Website",
    role: "Design & Build",
    tools: ["Webflow", "Figma", "Motion"],
    description:
      "A high-impact tournament site for the Mike Tyson Invitational, built for momentum, clarity and a heavyweight first impression.",
    highlights: [
      "Countdown-driven landing built around a hard launch deadline",
      "Custom Webflow interactions tuned for mobile performance",
      "Ticketing flow simplified into a single frictionless path",
    ],
  },
  {
    id: "elevation-capital",
    title: "Elevation Capital",
    logoText: "ELEVATION",
    logoUrl: "/logos/elevation-capital.webp",
    category: "Website Development",
    year: "2025",
    cover: "/projects/elevation-ai-cover.webp",
    preview: {
      kind: "website",
      href: "https://stateofaiadoption.elevationcapital.com/",
      image: "/projects/elevation-ai-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Website Development",
    tools: ["Framer", "Figma", "AI"],
    description:
      "Elevation Capital’s The State of AI Adoption in Indian Startups report reveals that 86% of startup founders plan to increase AI spending, 85% of engineering teams have moved AI into production, and productivity has become the primary proving ground.",
    highlights: [
      "Interactive report detailing AI adoption across 86% of Indian startup founders",
      "Developed natively on Framer with dynamic data visualizations and smooth motion",
      "Highlighting engineering teams moving AI into production and driving productivity",
    ],
  },
  {
    id: "riviera",
    title: "Riviera",
    logoText: "RIVIERA",
    logoUrl: "/projects/riviera-logo.webp",
    category: "Website Design",
    year: "2026",
    cover: "/projects/riviera-cover.webp",
    preview: {
      kind: "website",
      href: "https://riviera.vit.ac.in/",
      image: "/projects/riviera-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma", "Motion"],
    description:
      "Website design for Riviera, one of the country's largest student fests, built to carry the scale and energy of the event.",
    highlights: [
      "Website built to carry one of the country's largest student fests",
      "Motion-forward homepage designed to signal scale and energy",
      "Content architecture built for dozens of events and sub-brands",
    ],
  },
  {
    id: "layover",
    title: "Layover",
    logoText: "layover*",
    logoUrl: "/projects/layover-logo.webp",
    category: "Brand & Product Design",
    year: "2025",
    cover: "/projects/layover-cover.webp",
    preview: { kind: "website", href: "https://mylayover.in/", image: "/projects/layover-cover.webp" },
    cta: "Visit Website",
    role: "Brand identity · UI · product design",
    tools: ["Figma", "Prototyping"],
    description:
      "A layover is dead time you’ve already paid for. Layover turns it into something usable: enter your airport or PNR and it shows what’s actually open in your terminal right now — order a meal to your gate, or book into a lounge. Built around Indian airports (Delhi, Mumbai, Bengaluru, Hyderabad) and the details that matter there: terminal-aware delivery, veg and non-veg filters as a first-class control, and a live prep timer so you know whether you have time before boarding.",
    extraFacts: [
      ["Surfaces", "Marketing site, web app, mobile app"],
      ["Airports", "Delhi IGI, Mumbai CSIA, Bengaluru KIA, Hyderabad RGIA"],
    ],
    highlights: [
      "Terminal-aware delivery — every restaurant card carries its pier",
      "Veg and non-veg filters promoted to a first-class control",
      "Live prep timer, so you know whether you have time before boarding",
    ],
    shots: [
      {
        src: "/projects/layover/hero.webp",
        wide: true,
        caption:
          "The landing page. One question — which airport are you in — and the whole product follows from the answer.",
        alt:
          "Layover’s landing page over a photograph of an airport atrium, headline “Order Meals, Access Lounges. All In One App.”, with a panel listing Hyderabad RGIA, Bengaluru KIA, Mumbai CSIA and Delhi IGI above a field reading “enter your airport / PNR”.",
      },
      {
        src: "/projects/layover/brand.webp",
        wide: true,
        caption:
          "The wordmark, with the rotated “e” — a plane turning back on itself, which is the whole idea of a layover in one letter.",
        alt:
          "The LayOver wordmark in white on a black billboard on a tree-lined street, the “e” rotated 180 degrees.",
      },
      {
        src: "/projects/layover/app.webp",
        caption:
          "The app’s ordering surface, warm where the marketing site is dark — this is the part you use standing at a gate.",
        alt:
          "Two phone screens showing Layover’s food ordering interface in cream and gold: a delivery destination of “Layover office”, a greeting, a dish search field, category chips for fries and burgers, and an “Open Stalls” section.",
      },
      {
        src: "/projects/layover/order.webp",
        caption:
          "Browse by terminal, then track the order. Every restaurant card carries its pier, because in an airport “where” is the only question that matters.",
        alt:
          "Layover’s restaurant directory on desktop showing Tim Hortons, Starbucks, Theobroma, McDonald’s, Berco’s, Idli.com, KFC and Subway, each labelled “t3 domestic departure piers”, beside a mobile order-confirmed screen with a twenty-minute prep timer, itemised order and a map.",
      },
      {
        src: "/projects/layover/system.webp",
        wide: true,
        caption: "Site and app as one system — the dark front door, the warm room behind it.",
        alt:
          "Layover’s marketing site and mobile app shown together, the dark landing page beside the two cream ordering screens.",
      },
    ],
  },
  {
    id: "yantra",
    title: "Yantra",
    logoText: "Yantra",
    category: "3d interactive website",
    year: "2026",
    cover: "/projects/yantra-cover.webp",
    preview: {
      kind: "website",
      href: "https://yantra-xi.vercel.app/",
      image: "/projects/yantra-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["3D", "Web Design"],
    description:
      "Yantra is a week-long technical fest exclusive to VIT students, focused on enriching student life and elevating event experiences. It brings together technical events, workshops, and hackathons, while fostering a secure, inclusive, and welcoming environment that promotes holistic student growth.",
    highlights: [
      "3D interactive environment built for high engagement",
      "Unified portal for technical events and hackathons",
      "Elevated event experience focused on holistic student growth",
    ],
  },
  {
    id: "dropby",
    title: "DropBy",
    logoText: "dropby.",
    logoUrl: "/projects/dropby-logo.webp",
    category: "Product Design",
    year: "2024",
    cover: "/projects/dropby-cover.webp",
    preview: {
      kind: "website",
      image: "/projects/dropby-cover.webp",
      href: "https://www.behance.net/gallery/230479963",
    },
    cta: "View Full Project on Behance",
    role: "Product Design",
    tools: ["Figma", "Prototyping"],
    description:
      "Product design and visual identity for DropBy, a location-first social app, from flows to a cohesive interface system.",
    highlights: [
      "Location-first interaction model designed from first principles",
      "Full visual identity built alongside the product from day one",
      "Prototype-tested flows refined through multiple usability passes",
    ],
  },
  {
    id: "futurepreneurs",
    title: "Futurepreneurs",
    logoText: "FUTUREPRENEURS",
    logoUrl: "/projects/futurepreneurs-logo.webp",
    category: "Event Website",
    year: "2024",
    cover: "/projects/futurepreneurs-cover.webp",
    preview: {
      kind: "website",
      href: "https://riviera.vit.ac.in/",
      image: "/projects/futurepreneurs-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma"],
    description:
      "An event website for Futurepreneurs, a founders' initiative, presented with a confident, startup-grade identity.",
    highlights: [
      "Founder-first narrative translated into a confident startup-grade site",
      "Built for fast content updates across a multi-week event",
      "Responsive system tuned for heavy mobile traffic on event day",
    ],
  },
  {
    id: "gravitas",
    title: "Gravitas",
    logoText: "GRAVITAS·25",
    logoUrl: "/projects/gravitas-logo.webp",
    category: "Website + Branding",
    year: "2025",
    cover: "/projects/gravitas-cover.webp",
    preview: {
      kind: "website",
      image: "/projects/gravitas-cover.webp",
      href: "https://www.behance.net/gallery/239867397",
    },
    cta: "View Full Project on Behance",
    role: "Brand + Web Design",
    tools: ["Figma", "Illustrator", "Framer"],
    description:
      "An end-to-end brand system and website for Gravitas, a flagship techno-management fest, scaled across every touchpoint.",
    highlights: [
      "Unified identity system scaled across print, stage and digital",
      "Signature visual language built around a bold techno-management theme",
      "Website structured to carry the fest's scale without losing clarity",
    ],
  },
  {
    id: "meal-maestro",
    kind: "case-study",
    title: "Meal Maestro",
    logoText: "Meal Maestro",
    category: "UI Design",
    year: "2025",
    cover: "/projects/meal-maestro/cover.webp",
    preview: {
      kind: "website",
      href: "https://www.behance.net/AAYUSHVISUALS",
      image: "/projects/meal-maestro/cover.webp",
    },
    cta: "View on Behance",
    role: "UI design",
    tools: ["Figma"],
    description:
      "A meal-planning app built around one idea: the hard part isn’t cooking, it’s deciding. Meal Maestro takes what you like, what you avoid and what’s already in the kitchen, and turns it into a week of recipes and the one grocery list that covers them. Placed third at the GDG Design-a-thon.",
    extraFacts: [
      ["Recognition", "3rd — GDG Design-a-thon"],
      ["Research", "12 interviews · 140 survey responses · 5 weeks"],
    ],
    highlights: [
      "Grounded in primary research — 12 discovery interviews, 140 survey responses and 4 comparison teardowns",
      "Built on why people abandon meal planning, not on what an app could do",
      "Full design system: Poppins for display and headings, Open Sans for body",
    ],
    shots: [
      {
        /* The complete case study, exported at 1400x22306 and sliced into 18
           pieces — see the note on the strip shot type above for why it
           cannot ship as a single file. */
        strip: Array.from(
          { length: 18 },
          (_, i) => `/projects/meal-maestro/s${String(i).padStart(2, "0")}.webp`
        ),
        sliceW: 1400,
        sliceH: 1240,
        lastSliceH: 1226,
        wide: true,
        caption:
          "The full case study — research with real users, the insights it earned, the design system, and the flows it produced.",
        alt:
          "The Meal Maestro case study: a smart meal-planning app for personalised recommendations and nutrition guidance. It runs from the goal of making healthy eating simpler, through branding and primary research grounded in real voices and real data (12 discovery interviews, 140 survey responses, 4 comparison teardowns, 5 weeks), into key insights about why people abandon meal planning, then a design system of colour and type — Poppins for display and headings, Open Sans for body — and finally the home, recipe detail, tracker and explore flows.",
      },
    ],
  },
];
