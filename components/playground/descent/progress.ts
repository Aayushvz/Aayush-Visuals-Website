/*
  Scroll to progress, with no DOM and no three in sight so it can be tested.

  The whole journey is one number: `p` in [0, 1]. Everything downstream —
  camera, fog, cards — is a pure function of it.
*/

/* 13 screens: 3 ridge, 4 chasm, 4 forge, 2 finale. The pacing is deliberate;
   ORVAE spends 2 screens per chapter and that patience is most of why it
   reads as cinematic rather than rushed. */
export const DESCENT_SCREENS = 13;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const descentHeight = (vh: number): number => vh * DESCENT_SCREENS;

/** Where we are in the scrollable travel, 0 at the top, 1 at the bottom. */
export function rawProgress(scrollY: number, vh: number): number {
  const travel = Math.max(1, descentHeight(vh) - vh);
  return clamp01(scrollY / travel);
}

/*
  Exponential damping toward a target.

  `1 - exp(-lambda * dt)` rather than a plain lerp factor: a plain lerp is
  tied to frame rate, so the same scroll feels twice as fast at 120Hz as at
  60Hz. This form gives the same result for one 1/30s step as for two
  1/60s steps, which the test asserts.
*/
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
