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

const REWARDS: Record<Contact, Reward[]> = {
  single: [
    { icon: "✨", line: "Clean Layout!" },
    { icon: "📐", line: "Grid Locked!" },
    { icon: "🎯", line: "Perfect Alignment!" },
    { icon: "💡", line: "Smart Decision!" },
    { icon: "🎨", line: "Neat Execution!" },
  ],
  four: [
    { icon: "🎨", line: "Beautiful Composition!" },
    { icon: "🖼️", line: "Gallery Worthy!" },
    { icon: "✨", line: "Pixel Perfect!" },
    { icon: "💎", line: "Premium Finish!" },
    { icon: "📸", line: "Hero Shot!" },
  ],
  six: [
    { icon: "🚀", line: "Design Legend!" },
    { icon: "🏆", line: "Award Winning!" },
    { icon: "🌟", line: "Masterpiece!" },
    { icon: "⭐", line: "Behance Featured!" },
    { icon: "🎬", line: "Motion Magic!" },
  ],
  dot: [
    { icon: "🛠️", line: "Iterating..." },
    { icon: "✏️", line: "Needs Another Revision." },
    { icon: "📋", line: "Still Wireframing..." },
    { icon: "💭", line: "Thinking Like a Designer." },
  ],
  /* the brief separates BOWLED / CAUGHT / RUN OUT / HIT WICKET, but the
     engine only models a single "wicket" contact today. Rather than invent a
     dismissal type the game can't actually produce, all four sit in one pool
     and the headline comes from the pool entry when it names a dismissal. */
  wicket: [
    { icon: "💥", line: "Back to the Drawing Board!" },
    { icon: "🧩", line: "Component Broke!" },
    { icon: "📐", line: "Alignment Lost!" },
    { icon: "🎯", line: "Missed the Grid!" },
    { icon: "⚠️", line: "Prototype Failed!" },
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
