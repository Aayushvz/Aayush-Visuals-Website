// Small, dependency-free math helpers shared across every system.

export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Where does `v` sit between a and b? Inverse of lerp. */
export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : (v - a) / (b - a);

/** Remap v from range [a,b] into [c,d]. */
export const remap = (
  v: number,
  a: number,
  b: number,
  c: number,
  d: number
): number => lerp(c, d, invLerp(a, b, v));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
};

export const smootherstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Positive modulo — always returns a value in [0, m). */
export const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** Frame-rate independent exponential smoothing toward a target. */
export const damp = (
  current: number,
  target: number,
  smoothing: number,
  dt: number
): number => lerp(current, target, 1 - Math.pow(smoothing, dt));

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by);

export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

export const round = Math.round;
