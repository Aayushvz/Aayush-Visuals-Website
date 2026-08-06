/*
  The batter's artwork: twelve frames cut from the approved character sheet.

  Frames are the original pixels, not a redraw, so every pose is the same
  character by construction — nothing here can drift from the reference.

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
*/

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

const KEYS = Object.keys(BATTER_FRAMES);

const images = new Map<string, HTMLImageElement>();
let started = false;

/** Kick off loading. Safe to call repeatedly; only the first call does work. */
export function preloadBatter() {
  if (started || typeof window === "undefined") return;
  started = true;
  for (const k of KEYS) {
    const img = new Image();
    img.decoding = "async";
    img.src = `/cricket/batter/${k}.png`;
    images.set(k, img);
  }
}

/** A frame, or null while it's still loading — callers fall back to the
    procedural batter so the crease is never empty on the first ball. */
export function batterFrame(action: BatterAction, index: number) {
  const key = `${action}-${Math.max(0, Math.min(2, index))}`;
  const img = images.get(key);
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  return { img, meta: BATTER_FRAMES[key] };
}

export function batterReady() {
  return KEYS.every((k) => {
    const i = images.get(k);
    return !!i && i.complete && i.naturalWidth > 0;
  });
}
