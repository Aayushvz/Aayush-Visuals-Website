// Colour utilities. Parse the hex strings from the palette once, blend them for
// shading, and hand back rgba() strings for translucent glows and reflections.

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const cache = new Map<string, RGBA>();

/** Parse #rgb / #rrggbb / #rrggbbaa into 0–255 components. */
export const parseHex = (hex: string): RGBA => {
  const hit = cache.get(hex);
  if (hit) return hit;

  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  const out = { r, g, b, a };
  cache.set(hex, out);
  return out;
};

/** hex + alpha → "rgba(r,g,b,a)" for soft light. */
export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const rgba = (r: number, g: number, b: number, a: number): string =>
  `rgba(${r | 0},${g | 0},${b | 0},${a})`;

/** Blend two hex colours by t (0 = a, 1 = b) → "rgb(...)". */
export const mix = (aHex: string, bHex: string, t: number): string => {
  const a = parseHex(aHex);
  const b = parseHex(bHex);
  const r = a.r + (b.r - a.r) * t;
  const g = a.g + (b.g - a.g) * t;
  const bl = a.b + (b.b - a.b) * t;
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
};
