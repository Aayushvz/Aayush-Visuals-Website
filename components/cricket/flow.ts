/*
  The match as a sequence of stages.

  The game already had a ball-level phase machine (idle → runup → flight →
  resolved → over) and that stays exactly where it is, inside CricketGame.
  This is the layer above it: which *screen* you are on. The two are
  deliberately separate. A ball is resolved many times inside one innings,
  and an innings happens twice inside one match, so folding them together
  gives you a state called "resolved-during-the-AI-innings-after-the-intro"
  and no way to reason about any of it.

  Every stage below is something a visitor can be looking at. Nothing here
  knows about canvas, React or cricket rules.
*/

export type Stage =
  /** camera flies into the stadium, title lands, Start appears */
  | "opening"
  /** two collectible cards, pick a side */
  | "select"
  /** TV broadcast intro: cuts, VS card, anthem beat */
  | "intro"
  /** the player's six balls — this is where the existing game lives */
  | "innings"
  /** the AI's reply, simulated and commentated, roughly five seconds */
  | "chase"
  /** cinematic finish: fireworks or a respectful handshake */
  | "finish"
  /** full-screen match summary */
  | "result";

export const STAGE_ORDER: Stage[] = [
  "opening",
  "select",
  "intro",
  "innings",
  "chase",
  "finish",
  "result",
];

/*
  How long each non-interactive stage runs before it hands over on its own.

  These are the numbers that decide whether the opening feels cinematic or
  feels like being held hostage, so they live together where they can be
  tuned against each other rather than scattered through six components.

  The rule of thumb: a visitor who came to see a portfolio will forgive
  about four seconds of showmanship before they start looking for a skip
  button. Every one of these is under that, and `skippable` is true for all
  of them anyway.
*/
export const STAGE_MS: Partial<Record<Stage, number>> = {
  intro: 3800,
  chase: 5200,
  finish: 3400,
};

/** Stages a visitor can click past. Interactive stages are not on the list
    because there is nothing to skip — they end when you finish them. */
export const SKIPPABLE: Stage[] = ["opening", "intro", "chase", "finish"];

export function isSkippable(stage: Stage) {
  return SKIPPABLE.includes(stage);
}

export function nextStage(stage: Stage): Stage {
  const i = STAGE_ORDER.indexOf(stage);
  /* result is terminal: it loops back to innings via Play Again, which is an
     explicit choice rather than a progression */
  return i < 0 || i === STAGE_ORDER.length - 1 ? stage : STAGE_ORDER[i + 1];
}

/*
  Which stages paint the 3D-ish stadium behind them.

  The stadium is one persistent canvas that never unmounts across the whole
  experience — that is the entire reason the transitions can be cinematic.
  Unmounting it between screens would mean a black frame and a fresh camera
  every time, which is exactly the "page reload" feel the brief rules out.
  Screens are layers *over* a running scene, not replacements for it.
*/
export function showsStadium(stage: Stage) {
  return stage !== "result";
}

/** Whether the HUD (score, balls, XP) belongs on screen at this stage. */
export function showsHud(stage: Stage) {
  return stage === "innings" || stage === "chase";
}
