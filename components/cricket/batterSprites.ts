/*
  The batter's artwork: twelve frames cut from the approved character sheet,
  in each side's kit.

  Frames are the original pixels, not a redraw, so every pose is the same
  character by construction — nothing here can drift from the reference. The
  Panthers set is generated from the Falcons one by a measured hue rotation
  (scripts/recolour-batter.mjs), the same arrangement the bowler, keeper and
  fielder use, so the geometry is identical down to the pixel and only the
  colours differ.

  That is why the frame metadata below is NOT duplicated per team: `w`, `h`
  and `ax` describe the drawing, and recolouring does not move anything.

  Two numbers per frame matter for placement:

  - `h` is measured against IDLE_H below. Frames are NOT normalised to a
    common height: a raised bat makes the six frames taller without making
    the player taller, so scaling each to fit would shrink the body exactly
    when the shot is biggest. Every frame uses the one scale derived from the
    idle stance, and the bat is free to leave the top.
  - `ax` is where the feet sit horizontally, as a fraction of frame width.
    A bat swung out to the side stretches the bounding box, so centring the
    box would slide the body across the crease between frames. Anchoring on
    the feet keeps the player planted. Measured from the alpha channel of the
    bottom 7% of each frame; see the drive-1 value (0.67) for how far off
    centre this gets.

  `ax` also says which way the player bats. Every value here is at or above
  0.5 — the bat hangs off the LEFT of the feet in every shot — which makes
  this a left-hander's sheet. paintBatter stands him accordingly; see the
  note there.
*/

import { kitFrame, kitReady, preloadKit, type TeamKit } from "./spriteKit";

export type BatterAction = "idle" | "defend" | "six" | "drive";

type FrameMeta = { w: number; h: number; ax: number };

/** the standing figure's pixel height — the reference every frame scales by */
export const IDLE_H = 324;

export const BATTER_FRAMES: Record<string, FrameMeta> = {
  "idle-0": { w: 148, h: 324, ax: 0.4966 },
  "idle-1": { w: 177, h: 325, ax: 0.4972 },
  "idle-2": { w: 175, h: 326, ax: 0.4944 },
  "defend-0": { w: 149, h: 319, ax: 0.4966 },
  "defend-1": { w: 169, h: 308, ax: 0.5414 },
  "defend-2": { w: 143, h: 283, ax: 0.5629 },
  "six-0": { w: 133, h: 371, ax: 0.4962 },
  "six-1": { w: 144, h: 355, ax: 0.4965 },
  "six-2": { w: 125, h: 369, ax: 0.496 },
  "drive-0": { w: 144, h: 346, ax: 0.4965 },
  "drive-1": { w: 212, h: 292, ax: 0.6745 },
  "drive-2": { w: 222, h: 309, ax: 0.536 },
};

export const BATTER_POSES = Object.keys(BATTER_FRAMES);

/** Kick off loading for one side. Safe to call repeatedly. */
export function preloadBatter(team: TeamKit) {
  preloadKit(team, "batter", BATTER_POSES);
}

/** A frame, or null while it's still loading — callers fall back to the
    procedural batter so the crease is never empty on the first ball. */
export function batterFrame(team: TeamKit, action: BatterAction, index: number) {
  const pose = `${action}-${Math.max(0, Math.min(2, index))}`;
  return kitFrame(team, "batter", pose, BATTER_FRAMES[pose]);
}

export function batterReady(team: TeamKit) {
  return kitReady(team, "batter", BATTER_POSES);
}
