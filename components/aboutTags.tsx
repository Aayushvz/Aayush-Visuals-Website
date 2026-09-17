/*
  The tag pile under the About statement.

  The reference sets a field of rotated colour pills and small round chips
  settling at the bottom of the screen, cut off by the fold. This is that
  arrangement, written down: every pill carries its position as a percentage
  of the stage, its own tilt, and the colour it is painted in.

  Positions are percentages rather than pixels so the whole pile scales with
  the stage instead of being laid out again per breakpoint - the stage sets
  one font-size proportional to its width and everything inside is sized in
  em, so the composition holds its proportions at any width rather than
  reflowing into a different picture.

  The labels are Aayush's own work rather than the reference's, which is the
  one part of this that should not be copied.
*/

import type { ReactNode } from "react";

/*
  Where a thing goes on a phone, or nothing if it does not go there at all.

  A phone is a third of the width, so the desktop arrangement cannot simply
  scale: at 390px the full set landed on top of itself. Every tag carries its
  own phone coordinates instead, spread down the band rather than packed into
  the same three rows.

  They all keep one now. Thinning the set was right while the tags sat where
  they were placed and overlapped each other; once they fall into a pile the
  overlap resolves itself, and nine pills stack into something worth looking
  at where five left the bottom of the screen bare. Anything without a phone
  position would still be dropped at that width, which keeps the mechanism
  for a tag that genuinely does not fit.
*/
type Phone = { x: number; y: number; rot: number };

export type Pill = {
  label: string;
  icon: ReactNode;
  /** stage-relative centre, in percent */
  x: number;
  y: number;
  rot: number;
  bg: string;
  /** the About link rides in the pile rather than sitting apart from it */
  href?: string;
  phone?: Phone;
};

export type Chip = {
  icon: ReactNode;
  x: number;
  y: number;
  rot: number;
  bg: string;
  /** chips come in two sizes in the reference, small and smaller */
  size: number;
  phone?: Phone;
};

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Shuffle = (
  <svg viewBox="0 0 24 24" {...s}><path d="M3 6h4l10 12h4M17 4l4 2-4 2M3 18h4l3-3.6M14 8.6 17 6h4M17 20l4-2-4-2" /></svg>
);
const Corner = (
  <svg viewBox="0 0 24 24" {...s}><path d="M5 19V9a4 4 0 0 1 4-4h10" /><rect x="3" y="3" width="18" height="18" rx="5" opacity=".35" /></svg>
);
const Move = (
  <svg viewBox="0 0 24 24" {...s}><path d="M12 3v18M3 12h18M12 3l-2.4 2.6M12 3l2.4 2.6M12 21l-2.4-2.6M12 21l2.4-2.6M3 12l2.6-2.4M3 12l2.6 2.4M21 12l-2.6-2.4M21 12l-2.6 2.4" /></svg>
);
const Smile = (
  <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2a4.4 4.4 0 0 0 7 0" /><path d="M9 9.4v.01M15 9.4v.01" strokeWidth="2.2" /></svg>
);
const Hash = (
  <svg viewBox="0 0 24 24" {...s}><path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16" /></svg>
);
const Globe = (
  <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>
);
const Spark = (
  <svg viewBox="0 0 24 24" {...s}><path d="M12 3c.6 4.8 4.2 8.4 9 9-4.8.6-8.4 4.2-9 9-.6-4.8-4.2-8.4-9-9 4.8-.6 8.4-4.2 9-9Z" /></svg>
);
const Pencil = (
  <svg viewBox="0 0 24 24" {...s}><path d="M4 20l1-4.4L16.4 4.2a2 2 0 0 1 2.8 2.8L7.8 18.4 4 20Z" /></svg>
);
const Arrow = (
  <svg viewBox="0 0 24 24" {...s}><path d="M7 17 17 7M9 7h8v8" /></svg>
);
const Cup = (
  <svg viewBox="0 0 24 24" {...s}><path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9ZM16 10h2.5a2.5 2.5 0 0 1 0 5H16M8 3v2.5M12 3v2.5" /></svg>
);
const Check = (
  <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.4 12.2 2.6 2.6 4.6-5.2" /></svg>
);
const Layers = (
  <svg viewBox="0 0 24 24" {...s}><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3ZM4 12l8 4.5 8-4.5M4 16.5 12 21l8-4.5" /></svg>
);
const Bolt = (
  <svg viewBox="0 0 24 24" {...s}><path d="M13 3 5 13.5h6L11 21l8-10.5h-6L13 3Z" /></svg>
);
const Wand = (
  <svg viewBox="0 0 24 24" {...s}><path d="m5 19 9-9M15.5 5.2 16 3l.5 2.2L18.7 6l-2.2.5L16 8.7 15.5 6.5 13.3 6l2.2-.8ZM19.8 12.4l.4-1.6.4 1.6 1.6.4-1.6.4-.4 1.6-.4-1.6-1.6-.4 1.6-.4Z" /></svg>
);

/*
  Read straight off the reference, pill by pill, as percentages of the stage.

  They are meant to crowd. The reference's own pile has its pills touching
  and clipping each other and running over the line of text above it, and an
  arrangement spaced out enough to guarantee clearance stops being a pile and
  becomes a grid. What went wrong the first time was not these coordinates,
  which are faithful: it was that the stage they sit on was too short for its
  width, so a layout drawn for a 4.4:1 field was being squeezed into 5.3:1
  and the vertical gaps closed up. The stage is sized off width now.

  Three pills sit half off the stage, so the field reads as continuing past
  the frame rather than as a row that happens to end.
*/
export const PILLS: Pill[] = [
  { label: "Prototyping", icon: Shuffle, x: 4, y: 16, rot: -9, bg: "#eeeeec", phone: { x: 20, y: 8, rot: -8 } },
  { label: "Design systems", icon: Corner, x: 41, y: 23, rot: -15, bg: "#bfe36d", phone: { x: 62, y: 16, rot: -10 } },
  { label: "Motion design", icon: Move, x: 58, y: 51, rot: -13, bg: "#a6d7f4", phone: { x: 30, y: 28, rot: -9 } },
  { label: "Making it pop", icon: Spark, x: 92, y: 53, rot: -11, bg: "#fb8b3c", phone: { x: 72, y: 38, rot: -7 } },
  { label: "Thinking systems", icon: Globe, x: 74, y: 66, rot: -5, bg: "#f9c5d7", phone: { x: 38, y: 50, rot: -6 } },
  { label: "Improving UX", icon: Smile, x: 43, y: 73, rot: -8, bg: "#f7c32b", phone: { x: 70, y: 62, rot: -8 } },
  { label: "Brand identity", icon: Layers, x: 22, y: 12, rot: -10, bg: "#f9c5d7", phone: { x: 30, y: 22, rot: -7 } },
  { label: "UI design", icon: Corner, x: 64, y: 22, rot: -7, bg: "#cbb8f8", phone: { x: 68, y: 44, rot: -9 } },
  { label: "Wireframing", icon: Hash, x: 88, y: 85, rot: -9, bg: "#a6d7f4", phone: { x: 35, y: 57, rot: -6 } },
  { label: "Shipping it", icon: Bolt, x: 26, y: 62, rot: 6, bg: "#bfe36d", phone: { x: 72, y: 79, rot: -8 } },
  { label: "User research", icon: Pencil, x: 72, y: 96, rot: -8, bg: "#cbb8f8", phone: { x: 32, y: 73, rot: -9 } },
  /*
    The bottom row sits lower than the reference reads it, and is meant to be
    half cut off by the fold. On a short wide window the 42vh cap flattens
    the stage to 5.2:1, which pulls the rows together until this one runs 21%
    into "improving ux"; dropping it past the edge separates them without
    moving it sideways out of the composition.
  */
  { label: "Reframing problems", icon: Hash, x: 41, y: 95, rot: -8, bg: "#54cf99", phone: { x: 58, y: 86, rot: -7 } },
  /*
    The one pill that goes somewhere, and the only one not painted in a
    pastel: white on a violet reads as the actionable object in a field of
    labels. A step darker than the brand's own #8b5cf6, which measured
    4.23:1 against white and is 15px uppercase text, so it needed 4.5.

    The reference has no equivalent, so this takes the empty lower-left,
    clear of "improving ux" by thirty points of stage width. It keeps a
    phone position unconditionally: the others are decoration and can be
    dropped at that width, this one is the route to /about.
  */
  { label: "About me", icon: Arrow, x: 13, y: 80, rot: 7, bg: "#7c3aed", href: "/about", phone: { x: 20, y: 95, rot: 7 } },
];

export const CHIPS: Chip[] = [
  { icon: Wand, x: 5, y: 45, rot: -6, bg: "#f7f7f5", size: 3.4, phone: { x: 82, y: 8, rot: -6 } },
  { icon: Cup, x: 29, y: 31, rot: 9, bg: "#d8c9fb", size: 3.2, phone: { x: 10, y: 40, rot: 9 } },
  { icon: Check, x: 26, y: 47, rot: -4, bg: "#a6d7f4", size: 3, phone: { x: 88, y: 52, rot: -4 } },
  { icon: Spark, x: 62, y: 82, rot: 6, bg: "#f7c32b", size: 3.3, phone: { x: 12, y: 62, rot: 6 } },
  { icon: Arrow, x: 2, y: 63, rot: 12, bg: "#fb8b3c", size: 3.9, phone: { x: 90, y: 88, rot: 12 } },
  { icon: Layers, x: 48, y: 40, rot: -8, bg: "#f7f7f5", size: 3.1, phone: { x: 88, y: 30, rot: -8 } },
  { icon: Bolt, x: 82, y: 36, rot: 7, bg: "#f7c32b", size: 3.5, phone: { x: 10, y: 90, rot: 7 } },
];
