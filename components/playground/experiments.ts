/*
  The playground index.

  One entry per experiment. This is the only file that needs editing when a
  new toy lands: the shelf renders whatever is in here, and the hero reads
  the counts off it, so a new object with status "live" shows up in both
  places at once.

  `status` is the whole vocabulary. "live" gets a real tile and a real link,
  "soon" gets a vacant outlined slot with no link on it, which is how the
  page says "more is coming" without a paragraph claiming so.
*/

import type { ComponentType } from "react";
import TitleCrest from "@/components/cricket/TitleCrest";

export type Experiment = {
  id: string;
  index: string;
  title: string;
  blurb: string;
  href: string;
  cta: string;
  year: string;
  /* small key/value rows printed down the side of the tile */
  specs: { k: string; v: string }[];
  art?: { src: string; alt: string };
  /* a drawn SVG mark instead of a photo — takes priority over `art` */
  logo?: ComponentType;
  status: "live" | "soon";
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: "dpl",
    index: "01",
    title: "Design Premier League",
    blurb:
      "Six balls, one over, a floodlit night. A browser cricket game with hand-drawn sprites, a broadcast cold open and a scoreboard that actually holds you to it.",
    href: "/cricket",
    cta: "Play the over",
    year: "2026",
    specs: [
      { k: "Type", v: "Browser game" },
      { k: "Built with", v: "Canvas, Web Audio" },
      { k: "Time", v: "One over, about 90s" },
    ],
    /* the game's own league badge (TitleCrest, drawn for the opening
       broadcast sting) — box art for the game, not a photo of its maker. */
    logo: TitleCrest,
    status: "live",
  },
];

/* Vacant slots. Deliberately not derived from a count: each one is a real
   place on the shelf that a future experiment moves into. */
export const SOON: { index: string; hint: string }[] = [
  { index: "02", hint: "In the workshop" },
  { index: "03", hint: "Not started yet" },
];

export const LIVE_COUNT = EXPERIMENTS.filter((e) => e.status === "live").length;
