/*
  Broad-nib type engine.

  Every letter of the Aayush Visuals face is drawn as a CENTRELINE and then
  written with one pen: a rounded rectangle held at a fixed angle. The ink
  is the Minkowski sum of the centreline and the nib, built as a union of
  convex hulls (nib stamped at sample i, nib stamped at sample i+1). All
  hulls share one winding direction, so a single nonzero-filled path unions
  them with no seams.

  Why a pen rather than drawn outlines: contrast stops being a per-glyph
  decision. Strokes travelling along the nib's long axis come out hairline,
  strokes across it come out full weight, and terminals are cut at the pen
  angle - the same for every letter, at every size. Change NIB and the whole
  face re-weights together.

  Units: 1000 = cap-height-ish em, y grows downward (SVG).
*/

export type Pt = [number, number];

export const NIB = {
  /** long axis */
  w: 252,
  /** short axis */
  h: 40,
  /** pen angle, degrees above horizontal (thin strokes run up-right) */
  angle: 20,
  /** corner rounding of the nib, as a fraction of h */
  round: 0.2,
  /** pressure on an upstroke vs a downstroke (pointed-pen modulation) */
  up: 0.5,
  /** terminal swell: how much bigger the pen gets at a stroke's ends */
  flare: 0.2,
  /** how far (units of arc) the swell reaches into the stroke */
  flareReach: 70,
};

/* ---------- nib shape ---------- */

function nibPolygon(): Pt[] {
  const { w, h, angle, round } = NIB;
  const r = h * round;
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const pts: Pt[] = [];
  const corners: [number, number, number][] = [
    [hw, hh, 0],
    [-hw, hh, 90],
    [-hw, -hh, 180],
    [hw, -hh, 270],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= 3; k++) {
      const a = ((a0 + k * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  const t = (-angle * Math.PI) / 180;
  const c = Math.cos(t),
    s = Math.sin(t);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

const NIB_POLY = nibPolygon();

/* ---------- geometry ---------- */

function hull(points: Pt[]): Pt[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
      lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
      upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/* ---------- centreline parsing: absolute M / L / C / Q only ---------- */

function sampleCentreline(d: string): Pt[] {
  const tok = d.match(/[MLCQ]|-?\d*\.?\d+/g) ?? [];
  const out: Pt[] = [];
  let i = 0;
  let cur: Pt = [0, 0];
  let cmd = "M";
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLCQ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "M") {
      cur = [num(), num()];
      out.push(cur);
      cmd = "L";
    } else if (cmd === "L") {
      const p: Pt = [num(), num()];
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - cur[0], p[1] - cur[1]) / 14));
      for (let k = 1; k <= n; k++)
        out.push([cur[0] + ((p[0] - cur[0]) * k) / n, cur[1] + ((p[1] - cur[1]) * k) / n]);
      cur = p;
    } else if (cmd === "C") {
      const c1: Pt = [num(), num()],
        c2: Pt = [num(), num()],
        p: Pt = [num(), num()];
      const n = 64;
      for (let k = 1; k <= n; k++) {
        const t = k / n,
          u = 1 - t;
        out.push([
          u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
          u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1],
        ]);
      }
      cur = p;
    } else if (cmd === "Q") {
      const c1: Pt = [num(), num()],
        p: Pt = [num(), num()];
      const n = 48;
      for (let k = 1; k <= n; k++) {
        const t = k / n,
          u = 1 - t;
        out.push([
          u * u * cur[0] + 2 * u * t * c1[0] + t * t * p[0],
          u * u * cur[1] + 2 * u * t * c1[1] + t * t * p[1],
        ]);
      }
      cur = p;
    }
  }
  return out;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Ink outline for one centreline, as SVG path data, plus its bounds. */
export function writeStroke(d: string) {
  const pts = sampleCentreline(d);
  /* arc length at every sample, for the terminal swell */
  const s: number[] = [0];
  for (let k = 1; k < pts.length; k++)
    s.push(s[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const L = s[s.length - 1] || 1;
  const swell = (k: number) =>
    1 +
    NIB.flare *
      (Math.exp(-s[k] / NIB.flareReach) + Math.exp(-(L - s[k]) / NIB.flareReach));

  /* pressure per segment, from its vertical direction, lightly smoothed so
     a curve modulates continuously instead of stepping */
  const seg: number[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const dx = pts[k + 1][0] - pts[k][0],
      dy = pts[k + 1][1] - pts[k][1];
    const v = dy / (Math.hypot(dx, dy) || 1); // -1 up .. 1 down
    const e = (v + 1) / 2;
    seg.push(NIB.up + (1 - NIB.up) * e * e * (3 - 2 * e));
  }
  const pr = seg.map((p, k) =>
    k > 0 && k < seg.length - 1 ? (seg[k - 1] + 2 * p + seg[k + 1]) / 4 : p,
  );

  let path = "";
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  const stamp = (p: Pt, sc: number) =>
    NIB_POLY.map(([x, y]) => [x * sc + p[0], y * sc + p[1]] as Pt);
  const emit = (h: Pt[]) => {
    path += "M" + h.map(([x, y]) => `${f(x)},${f(y)}`).join("L") + "Z";
    for (const [x, y] of h) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  };
  if (pts.length === 1) emit(hull(stamp(pts[0], 1)));
  for (let k = 0; k < pts.length - 1; k++) {
    emit(hull([...stamp(pts[k], pr[k] * swell(k)), ...stamp(pts[k + 1], pr[k] * swell(k + 1))]));
  }
  return { path, box: [x0, y0, x1, y1] as const };
}

/** Stamp the nib once between two points - used by the live ink canvas. */
export function nibHull(a: Pt, b: Pt, scale: number): Pt[] {
  const s = (p: Pt) => NIB_POLY.map(([x, y]) => [x * scale + p[0], y * scale + p[1]] as Pt);
  return hull([...s(a), ...s(b)]);
}
