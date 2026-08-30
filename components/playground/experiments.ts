/*
  The playground index.

  One entry per experiment. This is the only file that needs editing when a
  new toy lands: the shelf renders whatever is in here, and the hero reads
  the counts off it, so a new object with status "live" shows up in both
  places at once.

  `status` is the whole vocabulary. "live" gets a real card with real cover
  art and a real link, "soon" gets a vacant slot in the same footprint with
  no link on it, which is how the page says "more is coming" without a
  paragraph claiming so.

  The shape mirrors a store shelf on purpose - cover, kind, title, price -
  because that is the format everybody already knows how to scan, and four
  fields is the whole card. There is no description here by design: the
  cover and the two lines under it either earn the click or they do not, and
  a paragraph on every tile would only make the row harder to read.
*/

import type { ComponentType } from "react";
import { DplCover } from "./covers";

export type Experiment = {
  id: string;
  index: string;
  title: string;
  /* the small muted line above the title - what kind of thing this is */
  kind: string;
  href: string;
  cta: string;
  /* the badge a storefront puts on a first release */
  flag?: string;
  /* where a price would sit */
  meta: string;
  cover: ComponentType;
  status: "live" | "soon";
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: "dpl",
    index: "01",
    title: "Design Premier League",
    kind: "Browser game",
    href: "/cricket",
    cta: "Play the over",
    flag: "First Run",
    meta: "Free",
    cover: DplCover,
    status: "live",
  },
];

/* Vacant slots. Deliberately not derived from a count: each one is a real
   place on the shelf that a future experiment moves into, and there are
   three so the top row of the grid is a complete row rather than a live
   card with a gap after it. */
export const SOON: { index: string; hint: string; kind: string }[] = [
  { index: "02", hint: "In the workshop", kind: "Interface toy" },
  { index: "03", hint: "Sketched, not built", kind: "Canvas sketch" },
  { index: "04", hint: "Not started yet", kind: "Unclaimed" },
];

export const LIVE_COUNT = EXPERIMENTS.filter((e) => e.status === "live").length;
