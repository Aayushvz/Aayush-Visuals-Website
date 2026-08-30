// A shared description of where the important things sit, recomputed on resize.
// Modules hold a reference to one PondLayout object (mutated in place) so the
// water knows where to paint the moon's reflection, the sky knows where the
// horizon is, and so on — without any module reaching into another.

export interface PondLayout {
  w: number;
  h: number;
  /** Top of the water plane, in virtual pixels. */
  waterlineY: number;
  /** Where the far scenery meets the sky. */
  horizonY: number;
  moon: { x: number; y: number; r: number };
}

export const makePondLayout = (): PondLayout => ({
  w: 1,
  h: 1,
  waterlineY: 1,
  horizonY: 1,
  moon: { x: 0, y: 0, r: 8 },
});

/** Recompute layout in place from the current buffer size. */
export const computePondLayout = (
  out: PondLayout,
  w: number,
  h: number
): void => {
  out.w = w;
  out.h = h;
  out.waterlineY = Math.round(h * 0.55);
  out.horizonY = out.waterlineY;

  out.moon.r = Math.max(7, Math.round(h * 0.05));
  out.moon.x = Math.round(w * 0.73);
  out.moon.y = Math.round(h * 0.22);
};
