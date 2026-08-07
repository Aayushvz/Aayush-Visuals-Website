/*
  The reward layer's copy.

  Every ball produces two lines: what happened in the cricket, and a
  design-studio joke about it. The second line is why the game reads as a
  designer's portfolio piece rather than a generic cricket demo, so the
  wording is treated as content, not as strings to paraphrase.

  Keyed off engine.ts's Contact union so a new outcome can't be added without
  the compiler pointing here.
*/

import type { Contact } from "./engine";

export type Reward = { icon: string; line: string };

/* the headline — what actually happened */
export const EVENT_LABEL: Record<Contact, string> = {
  six: "SIX!",
  four: "FOUR!",
  single: "SINGLE!",
  dot: "DOT BALL!",
  wicket: "OUT!",
};

/*
  What the stadium says about the shot you just played.

  All of it is design-studio material, because the whole conceit of this
  game is that an over of cricket is an argument about craft. A six is the
  fantasy nobody gets — signed off first time, straight to production. A
  wicket is the thing that actually happens: the logo gets bigger.

  The lines are written to be read at a glance from across a stadium, so
  they are short, and they land as the punchline rather than building to
  one — there is no second beat on a board that shows for 1.2 seconds.
*/
const REWARDS: Record<Contact, Reward[]> = {
  /* a single: quiet competence, the bulk of the job */
  single: [
    { icon: "", line: "Nudged it 2px. Better." },
    { icon: "", line: "Grid locked." },
    { icon: "", line: "Named the layer." },
    { icon: "", line: "Auto-layout behaved." },
    { icon: "", line: "One round of revisions." },
    { icon: "", line: "Used the design system." },
  ],
  /* a four: the good day */
  four: [
    { icon: "", line: "Kerning: chef's kiss." },
    { icon: "", line: "Dev shipped it unchanged." },
    { icon: "", line: "Stakeholder said nothing." },
    { icon: "", line: "Pixel perfect handoff." },
    { icon: "", line: "That's a Dribbble shot." },
    { icon: "", line: "Whitespace defended." },
  ],
  /* a six: the fantasy */
  six: [
    { icon: "", line: "Approved on v1." },
    { icon: "", line: "Client said 'trust you'." },
    { icon: "", line: "No notes. None." },
    { icon: "", line: "Straight to production." },
    { icon: "", line: "Awwwards. Site of the day." },
    { icon: "", line: "Budget approved. Timeline too." },
  ],
  /* a dot: the meeting */
  dot: [
    { icon: "", line: "Let's circle back." },
    { icon: "", line: "Parked for now." },
    { icon: "", line: "Still wireframing." },
    { icon: "", line: "Awaiting brand feedback." },
    { icon: "", line: "Exploring directions." },
    { icon: "", line: "Sent. No reply." },
  ],
  /* a wicket: what actually happens */
  wicket: [
    { icon: "", line: "Make the logo bigger." },
    { icon: "", line: "Can we see it in blue?" },
    { icon: "", line: "final_v9_FINAL_real.fig" },
    { icon: "", line: "They picked Comic Sans." },
    { icon: "", line: "'Make it pop.'" },
    { icon: "", line: "Client's nephew redesigned it." },
  ],
};


/* headline override for the dismissal pool, index-matched to REWARDS.wicket */
const WICKET_HEADLINES = ["OUT!", "BOWLED!", "HIT WICKET!", "CAUGHT!", "RUN OUT!"];

/* last index served per contact, so the same line never lands twice running */
const lastPick: Partial<Record<Contact, number>> = {};

export function pickReward(contact: Contact): { headline: string; reward: Reward } {
  const pool = REWARDS[contact];
  let i = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && i === lastPick[contact]) i = (i + 1) % pool.length;
  lastPick[contact] = i;

  return {
    headline: contact === "wicket" ? WICKET_HEADLINES[i] : EVENT_LABEL[contact],
    reward: pool[i],
  };
}

/* ---------------------------------------------------------------- combo -- */

/*
  Consecutive scoring shots. A dot or a wicket resets it — the streak is a
  reward for keeping the scoreboard moving, so a ball that doesn't score
  shouldn't extend it.
*/
export type Combo = { icon: string; label: string; count: number };

const COMBO_LADDER: { icon: string; label: string }[] = [
  { icon: "🔥", label: "Creative Flow" },
  { icon: "🎨", label: "Design Streak" },
  { icon: "💎", label: "Pixel Streak" },
  { icon: "⚡", label: "Prototype Master" },
  { icon: "🚀", label: "Creative Momentum" },
  { icon: "🌟", label: "UX Wizard" },
];

export function comboFor(count: number): Combo | null {
  if (count < 2) return null; // a single good shot isn't a streak
  const rung = COMBO_LADDER[Math.min(count - 2, COMBO_LADDER.length - 1)];
  return { ...rung, count };
}

export function extendsCombo(contact: Contact) {
  return contact === "single" || contact === "four" || contact === "six";
}

/* ------------------------------------------------------------------- xp -- */

/* XP per outcome. A dot still pays a little: the brief says every ball grants
   XP, and zeroing it would make defending feel like a punishment. */
export const XP_FOR: Record<Contact, number> = {
  six: 50,
  four: 30,
  single: 15,
  dot: 5,
  wicket: 10,
};

/* the label that floats with it — "Design Points" for the big ones */
export function xpLabel(contact: Contact) {
  return contact === "six" || contact === "four" ? "Design Points" : "Creative XP";
}
