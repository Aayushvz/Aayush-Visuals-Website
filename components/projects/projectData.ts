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
    category: "Website Design",
    year: "2026",
    cover: "https://picsum.photos/seed/mti-portfolio/1600/1100",
    preview: { kind: "website", href: "https://mike-tyson-invitational.webflow.io" },
    cta: "Visit Live Website",
    role: "Design & Build",
    tools: ["Webflow", "Figma", "Motion"],
    description:
      "A high-impact tournament site for the Mike Tyson Invitational — built for momentum, clarity and a heavyweight first impression.",
    highlights: [
      "Countdown-driven landing built around a hard launch deadline",
      "Custom Webflow interactions tuned for mobile performance",
      "Ticketing flow simplified into a single frictionless path",
    ],
  },
  {
    id: "layover",
    title: "Layover",
    logoText: "layover*",
    category: "Product Design",
    year: "2026",
    cover: "https://picsum.photos/seed/layover-portfolio/1600/1100",
    preview: { kind: "website", href: "https://mylayover.in/" },
    cta: "Visit Website",
    role: "Product Design",
    tools: ["Figma", "Prototyping"],
    description:
      "Product design for Layover — turning a complex travel-stopover problem into a clean, intuitive booking experience.",
    highlights: [
      "End-to-end booking flow redesigned around traveller trust",
      "Component system built for fast iteration on a startup roadmap",
      "Motion details tuned to make a complex flow feel effortless",
    ],
  },
  {
    id: "gravitas",
    title: "Gravitas",
    logoText: "GRAVITAS·25",
    category: "Website + Branding",
    year: "2025",
    cover: "https://picsum.photos/seed/gravitas-portfolio/1600/1100",
    preview: {
      kind: "behance",
      embedId: "239867397",
      href: "https://www.behance.net/gallery/239867397",
    },
    cta: "View Full Project on Behance",
    role: "Brand + Web Design",
    tools: ["Figma", "Illustrator", "Framer"],
    description:
      "An end-to-end brand system and website for Gravitas — a flagship techno-management fest — scaled across every touchpoint.",
    highlights: [
      "Unified identity system scaled across print, stage and digital",
      "Signature visual language built around a bold techno-management theme",
      "Website structured to carry the fest's scale without losing clarity",
    ],
  },
  {
    id: "futurepreneurs",
    title: "Futurepreneurs",
    logoText: "FUTUREPRENEURS",
    category: "Event Website",
    year: "2025",
    cover: "https://picsum.photos/seed/futurepreneurs-portfolio/1600/1100",
    preview: { kind: "website", href: "https://riviera.vit.ac.in/" },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma"],
    description:
      "An event website for Futurepreneurs — a founders' initiative — presented with a confident, startup-grade identity.",
    highlights: [
      "Founder-first narrative translated into a confident startup-grade site",
      "Built for fast content updates across a multi-week event",
      "Responsive system tuned for heavy mobile traffic on event day",
    ],
  },
  {
    id: "dropby",
    title: "DropBy",
    logoText: "dropby.",
    category: "Product Design",
    year: "2025",
    cover: "https://picsum.photos/seed/dropby-portfolio/1600/1100",
    preview: {
      kind: "behance",
      embedId: "230479963",
      href: "https://www.behance.net/gallery/230479963",
    },
    cta: "View Full Project on Behance",
    role: "Product Design",
    tools: ["Figma", "Prototyping"],
    description:
      "Product design and visual identity for DropBy — a location-first social app — from flows to a cohesive interface system.",
    highlights: [
      "Location-first interaction model designed from first principles",
      "Full visual identity built alongside the product from day one",
      "Prototype-tested flows refined through multiple usability passes",
    ],
  },
  {
    id: "riviera",
    title: "Riviera",
    logoText: "RIVIERA",
    category: "Website Design",
    year: "2025",
    cover: "https://picsum.photos/seed/riviera-portfolio/1600/1100",
    preview: { kind: "website", href: "https://riviera.vit.ac.in/" },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma", "Motion"],
    description:
      "Website design for Riviera — one of the country's largest student fests — built to carry the scale and energy of the event.",
    highlights: [
      "Website built to carry one of the country's largest student fests",
      "Motion-forward homepage designed to signal scale and energy",
      "Content architecture built for dozens of events and sub-brands",
    ],
  },
];
