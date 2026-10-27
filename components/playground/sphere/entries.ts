import { EXPERIMENTS, type Preview } from "../experiments";

/*
  What the playground ball shows: one card per entry, no repeats.

  The five experiments come straight from EXPERIMENTS (their first preview,
  their theme accent). Three portfolio projects sit alongside them here
  rather than in EXPERIMENTS, so they do not leak into the homepage
  experiments row, which also reads that array. Each links to its case
  study at /work/<id>.

  `accent` tints the dark backdrop behind the card's frame.
*/

export type SphereEntry = {
  id: string;
  title: string;
  kind: string;
  year: string;
  href: string;
  accent: string;
  preview: Preview;
};

const fromExperiments: SphereEntry[] = EXPERIMENTS.map((e) => ({
  id: e.id,
  title: e.title,
  kind: e.kind,
  year: e.shipped.slice(-4),
  href: e.href,
  accent: e.theme.accent,
  preview: e.previews[0],
}));

const projects: SphereEntry[] = [
  {
    id: "yantra",
    title: "Yantra",
    kind: "3D interactive website",
    year: "2026",
    href: "/work/yantra",
    accent: "#e39a32",
    /* recorded live off yantra-xi.vercel.app: the 3D mark, then the about deck */
    preview: {
      type: "browser",
      url: "yantra-xi.vercel.app",
      video: "/playground/yantra-live.mp4",
      poster: "/playground/yantra-live.webp",
    },
  },
  {
    id: "mike-tyson-invitational",
    title: "Mike Tyson Invitational",
    kind: "Website design",
    year: "2026",
    href: "/work/mike-tyson-invitational",
    accent: "#f72c25",
    /* the site's own homepage recording: intro, hero, dates */
    preview: {
      type: "browser",
      url: "mike-tyson-invitational-3821139c156afc7.webflow.io",
      video: "/playground/mike-tyson-live.mp4",
      poster: "/playground/mike-tyson-live.webp",
      /* a little narrower than the 2.2:1 recording: fills the card, trims only the edges */
      aspect: 1.75,
    },
  },
  {
    id: "dropby",
    title: "DropBy",
    kind: "Brand identity",
    year: "2024",
    href: "/work/dropby",
    accent: "#006fff",
    /* the identity out in the world: the real applications from the case study */
    preview: {
      type: "reel",
      images: [
        "/projects/dropby/statement.webp",
        "/projects/dropby/billboard.webp",
        "/projects/dropby/posters-street.webp",
        "/projects/dropby/banners.webp",
        "/projects/dropby/posters-wall.webp",
      ],
    },
  },
];

export const ENTRIES: SphereEntry[] = [...fromExperiments, ...projects];
