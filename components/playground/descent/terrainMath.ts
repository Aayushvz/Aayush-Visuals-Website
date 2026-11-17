/*
  All the geometry in this page is generated here rather than loaded.

  The reference for this page (ORVAE) ships 14.9 MB of hand-modelled glTF.
  This whole site's homepage is 1.22 MB, so that was never on the table —
  which means the landscape has to come from a function. Value noise with a
  few octaves, flat-shaded, reads as deliberate low-poly rather than as
  cheap, and costs nothing to download.
*/

/* A small integer hash — deterministic, no dependency, good enough for
   terrain. Not for anything that needs real randomness. */
function hash2(seed: number, x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth value noise in [-1, 1]. */
export function makeNoise2D(seed: number): (x: number, y: number) => number {
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = fade(x - xi);
    const ty = fade(y - yi);
    const a = lerp(hash2(seed, xi, yi), hash2(seed, xi + 1, yi), tx);
    const b = lerp(hash2(seed, xi, yi + 1), hash2(seed, xi + 1, yi + 1), tx);
    return lerp(a, b, ty);
  };
}

export type HeightFieldOptions = {
  segments: number;
  size: number;
  seed: number;
  amplitude: number;
  octaves?: number;
};

/*
  One height per vertex of a (segments + 1)^2 grid.

  Octave amplitudes are normalised by their own sum, so the result is
  guaranteed to stay inside `amplitude` no matter how many octaves are
  added later. The test asserts that, because a terrain that quietly
  exceeds its amplitude is a terrain that pokes through the camera path.
*/
export function heightField(opts: HeightFieldOptions): Float32Array {
  const { segments, size, seed, amplitude, octaves = 4 } = opts;
  const noise = makeNoise2D(seed);
  const side = segments + 1;
  const out = new Float32Array(side * side);

  let norm = 0;
  for (let o = 0; o < octaves; o++) norm += 1 / 2 ** o;

  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const u = (i / segments) * size * 0.04;
      const v = (j / segments) * size * 0.04;
      let sum = 0;
      for (let o = 0; o < octaves; o++) {
        const f = 2 ** o;
        sum += noise(u * f, v * f) / f;
      }
      out[j * side + i] = (sum / norm) * amplitude;
    }
  }
  return out;
}

/*
  How far the chasm wall sits from the centre line at each step down.

  Clamped to a floor of 6 world units: the camera flies down the middle,
  and a wall that wanders inside that radius would clip straight through
  the near plane. The test pins the floor.
*/
export function chasmWallOffsets(opts: {
  steps: number;
  seed: number;
  radius: number;
}): Float32Array {
  const { steps, seed, radius } = opts;
  const noise = makeNoise2D(seed);
  const out = new Float32Array(steps);
  const FLOOR = 6;
  for (let i = 0; i < steps; i++) {
    const n = (noise(i * 0.18, 0) + 1) / 2; /* 0..1 */
    out[i] = FLOOR + n * (radius - FLOOR);
  }
  return out;
}
