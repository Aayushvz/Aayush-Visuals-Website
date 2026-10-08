/*
  A hand-drawn fat geometric alphabet, enough of one to set "aayush" and
  "visuals".

  Drawn as CENTRELINES, not outlines. The face this is modelled on is
  monoline - one stroke weight everywhere, circular bowls, rounded joins -
  so a stroked centreline reproduces it exactly, and reproduces it with a
  tenth of the data an outline would need. A bowl is a circle of radius 23
  stroked at 26: outer diameter 72, counter diameter 20. Those are the
  proportions measured off the reference.

  It also means the whole alphabet stays editable. Change STROKE and every
  glyph re-weights together; no counter can drift out of sync with its
  bowl, because there are no counters to maintain - they fall out of the
  geometry.

  The vertical metrics, in glyph units:

      10 ── ascender top        (h, l)
      56 ── x-height top
      92 ── bowl centre
     128 ── baseline
     158 ── descender bottom    (y)

  Centrelines sit 13 (half a stroke) inside each of those, so the painted
  edge lands on the metric. Advance widths likewise include the stroke, so
  a glyph's box is its painted box and laying them out is just addition.
*/

export const M = {
  stroke: 26,
  half: 13,
  ascTop: 10,
  xTop: 56,
  baseline: 128,
  descBottom: 158,
  /* centreline extremes */
  cAsc: 23,
  cXTop: 69,
  cBase: 115,
  cDesc: 145,
  bowlR: 23,
  bowlCy: 92,
} as const;

export type Glyph = {
  /** advance width, painted edge to painted edge */
  w: number;
  /** centreline subpaths, stroked at M.stroke with round caps and joins */
  d: string[];
};

export const GLYPHS: Record<string, Glyph> = {
  /* single-storey: a bowl with a stem on its right edge, the stem sharing
     the bowl's outer edge rather than sitting outside it */
  a: {
    w: 72,
    d: ["M36,69 A23,23 0 1,1 35.9,69 Z", "M59,69 L59,115"],
  },

  /* two stems joined by the bottom half of a bowl. One continuous stroke,
     so the join is a real join rather than two caps meeting */
  u: {
    w: 72,
    d: ["M13,69 L13,92 A23,23 0 0,0 59,92 L59,115"],
  },

  /* the only glyph that is not made of circles and lines. Two arcs of the
     same radius, turning opposite ways */
  s: {
    w: 68,
    /* Beziers, not arcs. An s wants two lobes of roughly 230 degrees, and
       at this stroke weight the radius that would give that is smaller
       than half the stroke - so an arc-built s either has no counter or,
       with a usable radius, closes each major arc into a full circle and
       draws an 8. Curves let the lobe be shaped directly instead of
       falling out of a radius. */
    d: ["M50,75 C36,67 20,73 24,84 C27,93 45,94 47,104 C49,114 31,118 16,107"],
  },

  /* full-height stem, then a shoulder arching off it into a second stem */
  h: {
    w: 72,
    d: ["M13,23 L13,115", "M13,92 A23,23 0 0,1 59,92 L59,115"],
  },

  /* two diagonals meeting in a round join at the baseline */
  v: {
    w: 72,
    d: ["M13,69 L36,115 L59,69"],
  },

  /* like v, but the right diagonal keeps going past the baseline */
  y: {
    w: 72,
    d: ["M13,69 L36,112", "M59,69 L26,145"],
  },

  /* a zero-length stroke with a round cap IS a dot - no separate circle */
  i: {
    w: 26,
    d: ["M13,69 L13,115", "M13,34 L13,34"],
  },

  l: {
    w: 26,
    d: ["M13,23 L13,115"],
  },

  ".": {
    w: 26,
    d: ["M13,115 L13,115"],
  },

  "!": {
    w: 26,
    d: ["M13,69 L13,99", "M13,115 L13,115"],
  },

  " ": { w: 30, d: [] },
};

/** total painted width of a word, given per-glyph tracking */
export function measure(text: string, tracking: number): number {
  const chars = [...text];
  let w = 0;
  chars.forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    w += g.w;
    if (i < chars.length - 1) w += tracking;
  });
  return w;
}
