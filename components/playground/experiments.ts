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
import { ContractCover, DplCover, InvoiceCover, PondCover, CatOperatorCover } from "./covers";

export type Experiment = {
  id: string;
  index: string;
  title: string;
  /* the small muted line above the title - what kind of thing this is */
  kind: string;
  /* the row's copy: one line that sells it, then two that explain it */
  tagline: string;
  blurb: string;
  href: string;
  cta: string;
  /* the badge a storefront puts on a first release */
  flag?: string;
  /* where a price would sit */
  meta: string;
  cover: ComponentType;
  status: "live" | "soon";
  /* the panel's date readout: the day it landed on the shelf, MM.DD.YYYY */
  shipped: string;
  /* the panel's two readouts. Real counts from the build, never invented */
  stats: [Stat, Stat];
  theme: Theme;
  tags: Tag[];
};

export type Stat = { value: string; label: string };

/* the icons a tag can carry; drawn in TagIcon in ExperimentShelf.tsx */
export type TagIcon =
  | "game"
  | "timer"
  | "ball"
  | "free"
  | "nosignup"
  | "dashboard"
  | "trophy"
  | "cube"
  | "cloud"
  | "globe"
  | "machine"
  | "pixel"
  | "leaf"
  | "sparkle"
  | "lock"
  | "doc"
  | "receipt"
  | "pencil";

/* a short label saying what kind of thing this is, 3-4 to an entry */
export type Tag = { label: string; icon: TagIcon };

/*
  An experiment's colours, taken from the thing itself so each rig looks
  like it belongs to its tool. `accent` fills the band and the button,
  `onAccent` is the text on it, `wall` is the pale cladding behind the
  rig, `ink` the big number painted on that wall, `glow` the lit dots and
  status light, `light` the pale tint for the index number and small copy.
*/
export type Theme = {
  wall: string;
  ink: string;
  accent: string;
  onAccent: string;
  glow: string;
  light: string;
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: "dpl",
    index: "01",
    title: "Design Premier League",
    tags: [
      { label: "Browser game", icon: "game" },
      { label: "Cricket", icon: "ball" },
      { label: "Timing", icon: "timer" },
      { label: "Free to play", icon: "free" },
    ],
    tagline: "One over, six balls. Time the swing.",
    blurb:
      "A browser cricket game for designers. Pick a side, face a full over and time every shot to the delivery for a clean six.",
    kind: "Browser game",
    href: "/cricket",
    cta: "Play the over",
    flag: "First Run",
    meta: "Free",
    cover: DplCover,
    /* kept on the site purple */
    theme: {
      wall: "#d3cbeb",
      ink: "#1d1530",
      accent: "#7c3aed",
      onAccent: "#f6f1ff",
      glow: "#a78bfa",
      light: "#d9ccff",
    },
    shipped: "08.04.2026",
    stats: [
      { value: "6", label: "Balls an over" },
      { value: "2", label: "Teams" },
    ],
    status: "live",
  },
  {
    id: "cat",
    index: "02",
    title: "CAT Operator Assistant",
    tags: [
      { label: "Dashboard", icon: "dashboard" },
      { label: "3D model", icon: "cube" },
      { label: "Heavy machinery", icon: "machine" },
      { label: "Weather-aware", icon: "cloud" },
    ],
    tagline: "A cab dashboard built for gloved hands.",
    blurb:
      "A hackathon build for heavy-machine operators, with shift jobs planned around the weather, a job-time estimator and a fleet view, in English and Hindi.",
    kind: "Dashboard UI",
    href: "https://aayushvz.github.io/cat-operator-assistant",
    cta: "View dashboard",
    flag: "New",
    meta: "Case Study",
    cover: CatOperatorCover,
    /* Caterpillar yellow on black, against site concrete */
    theme: {
      wall: "#e3dccb",
      ink: "#1a1712",
      accent: "#ffcd11",
      onAccent: "#1a1400",
      glow: "#ffd84a",
      light: "#fff1b8",
    },
    shipped: "09.23.2026",
    stats: [
      { value: "5", label: "Menu tabs" },
      { value: "2", label: "Languages" },
    ],
    status: "live",
  },
  {
    id: "pond",
    index: "03",
    title: "Lotus Pond",
    tags: [
      { label: "Pixel art", icon: "pixel" },
      { label: "Ambient", icon: "leaf" },
      { label: "Toy", icon: "sparkle" },
    ],
    tagline: "A pixel frog, a pond, and nowhere to be.",
    blurb:
      "A small pixel-art diorama. The frog sits on its lily pad and snaps at passing bugs while you watch. No score and no timer.",
    kind: "Pixel diorama",
    href: "/frog",
    cta: "Visit the pond",
    /* no score, no timer, nothing to lose - so the status line says what it
       costs rather than pretending there is a challenge to beat */
    meta: "Free · stay as long as you like",
    cover: PondCover,
    /* the pond's teal-grey water and night navy, with a frog green */
    theme: {
      wall: "#c7dbe1",
      ink: "#0b0f1e",
      accent: "#2f8f6f",
      onAccent: "#effaf5",
      glow: "#7fd6b0",
      light: "#d4f0e4",
    },
    shipped: "08.30.2026",
    stats: [
      { value: "1", label: "Frog" },
      { value: "0", label: "Timers" },
    ],
    status: "live",
  },
  {
    id: "invoice",
    index: "04",
    title: "Invoice Generator",
    tags: [
      { label: "Freelance tool", icon: "receipt" },
      { label: "No signup", icon: "nosignup" },
      { label: "Stays in your browser", icon: "lock" },
    ],
    tagline: "Bill a client in under a minute.",
    blurb:
      "Build a clean invoice with line items, taxes and your details, then export it. No signup, and nothing leaves your browser.",
    kind: "Freelance tool",
    href: "https://invoice-generator-teal-pi.vercel.app/invoice-generator/en",
    cta: "Bill a client",
    meta: "Free · no signup, nothing leaves your browser",
    cover: InvoiceCover,
    /* a ledger blue */
    theme: {
      wall: "#d3deef",
      ink: "#0f1a33",
      accent: "#2563eb",
      onAccent: "#f2f6ff",
      glow: "#7aa7ff",
      light: "#d6e4ff",
    },
    shipped: "09.19.2026",
    stats: [
      { value: "0", label: "Signups" },
      { value: "0", label: "Uploads" },
    ],
    status: "live",
  },
  {
    id: "contract",
    index: "05",
    title: "Contract Generator Tool",
    tags: [
      { label: "Freelance tool", icon: "doc" },
      { label: "Editable clauses", icon: "pencil" },
      { label: "No signup", icon: "nosignup" },
      { label: "Stays in your browser", icon: "lock" },
    ],
    tagline: "Write the agreement you'll actually send.",
    blurb:
      "Create client agreements with scope, payment terms, timelines, revisions, and usage rights built in.",
    kind: "Freelance tool",
    href: "/contract",
    cta: "Draft an agreement",
    /* the price line. For a tool, the question someone actually has before
       typing a client's name and fee is where that data goes, so that is
       what this answers rather than inventing a challenge to beat */
    meta: "Free · no signup, nothing leaves your browser",
    cover: ContractCover,
    /* the contract tool is built on the site purple, so it keeps it */
    theme: {
      wall: "#d3cbeb",
      ink: "#1d1530",
      accent: "#7c3aed",
      onAccent: "#f6f1ff",
      glow: "#a78bfa",
      light: "#d9ccff",
    },
    shipped: "09.17.2026",
    stats: [
      { value: "13", label: "Clauses" },
      { value: "0", label: "Signups" },
    ],
    status: "live",
  },
];

/* Vacant slots. Deliberately not derived from a count: each one is a real
   place on the shelf that a future experiment moves into, and there is one
   so the live trio plus this fills the top row of the grid rather than
   leaving a gap after the last real card. */
/* an empty slot has no product yet, so no colour: bare concrete */
export const SOON_THEME: Theme = {
  wall: "#dcd9d3",
  ink: "#26241f",
  accent: "#6a6d6e",
  onAccent: "#f4f4f2",
  glow: "#a0a3a4",
  light: "#e2e2e0",
};

export const SOON: {
  index: string;
  hint: string;
  kind: string;
  tagline: string;
  blurb: string;
  tags: Tag[];
}[] = [
  {
    index: "06",
    hint: "Sketched, not built",
    kind: "Canvas sketch",
    tagline: "Something is on the bench.",
    blurb: "The next experiment is still a sketch. It moves onto this shelf the day it is playable.",
    tags: [
      { label: "Canvas sketch", icon: "pencil" },
      { label: "In the workshop", icon: "sparkle" },
    ],
  },
];

