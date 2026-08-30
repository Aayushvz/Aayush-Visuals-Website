// Cheap, deterministic value noise. Used for organic motion — wind drifting
// through reeds, firefly flicker, water shimmer — anything that should feel
// natural rather than mechanically periodic. No allocations in the hot path.

const hash = (n: number): number => {
  // Fast integer hash → [0,1). Deterministic for a given input.
  let x = Math.sin(n * 127.1) * 43758.5453;
  x -= Math.floor(x);
  return x;
};

const fade = (t: number): number => t * t * (3 - 2 * t);

/** Smooth 1D value noise in [0,1]. Continuous and repeatable. */
export const noise1 = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i);
  const b = hash(i + 1);
  return a + (b - a) * fade(f);
};

/** 1D noise remapped to [-1,1] — handy as a drifting signed offset. */
export const snoise1 = (x: number): number => noise1(x) * 2 - 1;

/** Layered noise for richer, more natural movement. */
export const fbm1 = (x: number, octaves = 3): number => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += snoise1(x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // [-1,1]
};

const hash2 = (x: number, y: number): number => {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  n -= Math.floor(n);
  return n;
};

/** Smooth 2D value noise in [0,1] — for spatial shimmer fields. */
export const noise2 = (x: number, y: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const top = a + (b - a) * fx;
  const bot = c + (d - c) * fx;
  return top + (bot - top) * fy;
};
