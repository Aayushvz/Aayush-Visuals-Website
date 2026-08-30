// Reusable oscillators. Environment pieces and (later) creatures compose these
// instead of scattering raw Math.sin calls everywhere — keeps motion readable
// and lets us tune feel from one place.

import { TAU } from "./math";
import { snoise1 } from "./noise";

/** Sine in [-1,1]. `period` in seconds, optional phase offset in turns. */
export const osc = (t: number, period: number, phase = 0): number =>
  Math.sin((t / period + phase) * TAU);

/** Sine remapped to [0,1]. */
export const osc01 = (t: number, period: number, phase = 0): number =>
  (osc(t, period, phase) + 1) * 0.5;

/** Vertical bob helper: amplitude-scaled sine. */
export const bob = (t: number, period: number, amp: number, phase = 0): number =>
  osc(t, period, phase) * amp;

/**
 * Sway that gusts — a base sine gently modulated by noise so a reed never
 * repeats exactly. Returns roughly [-amp, amp].
 */
export const sway = (
  t: number,
  period: number,
  amp: number,
  seed = 0
): number => {
  const gust = 0.65 + 0.35 * (snoise1(t * 0.15 + seed * 3.7) * 0.5 + 0.5);
  return osc(t, period, seed * 0.37) * amp * gust;
};

/**
 * Flicker for firefly light — mostly bright, occasionally dipping,
 * never fully periodic. Returns [min,1].
 */
export const flicker = (t: number, seed = 0, min = 0.82): number => {
  const n =
    snoise1(t * 6.3 + seed * 11.1) * 0.5 +
    snoise1(t * 2.1 + seed * 4.2) * 0.5; // [-1,1]-ish
  return min + (1 - min) * (0.5 + 0.5 * n);
};

/** Triangle wave in [0,1] — steady, linear ramps up and down. */
export const triangle = (t: number, period: number, phase = 0): number => {
  const p = ((t / period + phase) % 1 + 1) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
};
