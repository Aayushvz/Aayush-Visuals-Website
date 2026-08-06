/*
  The two sides, and the visual system each one carries.

  A team is not just a colour here. Picking one re-tints the stadium, the
  crowd, the LED ribbons and every piece of UI chrome for the rest of the
  match, so everything a team needs to art-direct the experience is on the
  object rather than looked up from a switch statement in six places.

  The identities are the design-process joke the whole game runs on:
  Precision versus Speed is the oldest argument in product design, and the
  brief asks for the cricket to *be* that argument rather than decorate it.
*/

import type { CSSProperties } from "react";

export type Playstyle = "precision" | "speed";

export type Team = {
  id: "panthers" | "falcons";
  name: string;
  /** the short form the scoreboard uses, where three characters is the budget */
  abbr: string;
  mascot: string;
  identity: string;
  motto: string;
  playstyle: Playstyle;
  /** one line explaining what picking this side actually does to the match */
  perk: string;

  /* --- the palette this side art-directs the whole experience with --- */
  colours: {
    /** the brand hue, used for fills and glows */
    primary: string;
    /** a lighter partner for gradients and holographic sweeps */
    light: string;
    /** dark enough to carry white text at 4.5:1, for solid controls */
    deep: string;
    /** the foreground that sits on `primary` when it is used as a large fill */
    ink: string;
    /** the card's rarity border, which animates through these stops */
    rarity: [string, string, string];
  };
};

export const TEAMS: Team[] = [
  {
    id: "panthers",
    name: "Pixel Panthers",
    abbr: "PXP",
    mascot: "🎨",
    identity: "Pixel Perfect",
    motto: "Every Pixel Matters",
    playstyle: "precision",
    /* precision widens the reward for timing rather than widening the window
       itself — the side is about accuracy, so making it *easier* to time
       would say the opposite of what the card says */
    perk: "Perfect timing pays double. The window is unforgiving.",
    colours: {
      primary: "#7C3AED",
      light: "#A78BFA",
      deep: "#5B21B6",
      ink: "#FFFFFF",
      rarity: ["#A78BFA", "#F0ABFC", "#7C3AED"],
    },
  },
  {
    id: "falcons",
    name: "Flow Falcons",
    abbr: "FLF",
    mascot: "⚡",
    identity: "User First",
    motto: "Great UX Wins.",
    playstyle: "speed",
    /* speed forgives mistiming but caps the ceiling: a side built on flow
       should feel generous and consistent, not explosive */
    perk: "A wider timing window, and singles come easy. Fewer maximums.",
    colours: {
      primary: "#2563EB",
      light: "#7DD3FC",
      deep: "#1D4ED8",
      ink: "#FFFFFF",
      rarity: ["#7DD3FC", "#67E8F9", "#2563EB"],
    },
  },
];

export function teamById(id: Team["id"]) {
  const t = TEAMS.find((x) => x.id === id);
  /* the id union makes this unreachable through the type system, but the
     value can still arrive from localStorage, which types do not police */
  if (!t) throw new Error(`No team with id "${id}"`);
  return t;
}

export function opponentOf(id: Team["id"]) {
  return TEAMS.find((t) => t.id !== id) ?? TEAMS[1];
}

/*
  How a pick bends the rules.

  Returned as multipliers over the tuning already in engine.ts rather than as
  replacement numbers, so the balance work that went into those windows is
  not thrown away by choosing a side. Precision narrows and pays; speed
  widens and flattens.
*/
export function ruleBiasFor(style: Playstyle) {
  return style === "precision"
    ? { windowScale: 0.88, perfectBonus: 2, sixChance: 1.15 }
    : { windowScale: 1.18, perfectBonus: 1, sixChance: 0.85 };
}

/** CSS custom properties a team paints onto whatever element it dresses. */
export function teamVars(t: Team): CSSProperties {
  return {
    "--tm-primary": t.colours.primary,
    "--tm-light": t.colours.light,
    "--tm-deep": t.colours.deep,
    "--tm-ink": t.colours.ink,
    "--tm-r1": t.colours.rarity[0],
    "--tm-r2": t.colours.rarity[1],
    "--tm-r3": t.colours.rarity[2],
  } as CSSProperties;
}
