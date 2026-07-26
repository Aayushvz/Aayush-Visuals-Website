/*
  Single source of truth for the Projects section. Adding a future project =
  append one object here. `preview` is a tagged union so the modal (and any
  future full case-study page) can grow to support live sites, Behance,
  images, video, or local routes without touching component code.

  `cover` and `logoText` are placeholders — real transparent PNG/SVG logos
  and cover photography will be dropped in later (see notes on ProjectTile).
*/

export type ProjectPreview =
  | { kind: "behance"; embedId: string; href: string }
  | { kind: "website"; href: string; image?: string }
  | { kind: "image"; src: string; href?: string }
  | { kind: "video"; src: string; poster?: string; href?: string }
  | { kind: "page"; href: string }; // future: local case-study route

export type Project = {
  id: string;
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
    category: "Product Design",
    year: "2025",
    cover: "/projects/layover-cover.webp",
    preview: { kind: "website", href: "https://mylayover.in/", image: "/projects/layover-cover.webp" },
    cta: "Visit Website",
    role: "Product Design",
    tools: ["Figma", "Prototyping"],
    description:
      "Product design for Layover, turning a complex travel-stopover problem into a clean, intuitive booking experience.",
    highlights: [
      "End-to-end booking flow redesigned around traveller trust",
      "Component system built for fast iteration on a startup roadmap",
      "Motion details tuned to make a complex flow feel effortless",
    ],
  },
  {
    id: "yantra",
    title: "Yantra",
    logoText: "Yantra",
    category: "3d interactive website",
    year: "2026",
    cover: "/projects/yantra-cover.jpg.png",
    preview: {
      kind: "website",
      href: "https://yantra-xi.vercel.app/",
      image: "/projects/yantra-cover.jpg.png",
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
];
