import { writeStroke } from "./nib";

/*
  The Aayush Visuals face - centrelines only. nib.ts turns them into ink.

  Vertical metrics (centreline / painted edge, painted = centreline -/+ 62):
      cap top        210 / 148
      x-height top   440 / 378
      ascender (l)   150 /  88
      baseline       942 / 1004

  Contrast comes from the pen, not the drawing: with the nib held at 16deg
  a "/" stroke is a hairline and a "\" stroke is full weight, so A is thin
  on the left and heavy on the right, V the reverse, exactly as a broad pen
  would leave them.

  Two italics live in the set (u at cap height, i at x-height). They are the
  same pen, just written faster and leaning - the wordmark switches into
  them once per line, which is what gives it a voice.
*/

export const CENTRELINES: Record<string, string[]> = {
  A: ["M70,942 L318,210 L420,210 L668,942", "M162,690 L576,690"],
  /* the macron: Aayush's long first vowel, ā */
  macron: ["M196,40 L476,40"],
  Y: ["M60,210 L350,612 L350,942", "M350,612 L650,210"],
  S: [
    "M572,330 C532,246 442,210 346,210 C206,210 116,280 116,396 C116,506 216,546 356,576 C506,608 592,662 592,776 C592,886 492,942 336,942 C200,942 110,890 74,800",
  ],
  H: ["M130,210 L130,942", "M610,210 L610,942", "M130,566 L610,566"],
  V: ["M58,210 L360,942 L662,210"],
  /* italic u, cap height */
  uI: [
    "M58,336 C98,254 150,210 202,210 C252,210 264,252 256,322 L216,700 C202,850 252,942 342,942 C462,942 560,822 604,624",
    "M664,210 L592,790 C582,892 614,952 706,904",
  ],
  /* italic i, x-height, with a pen-cut lozenge for a dot */
  iI: [
    "M36,650 C88,544 152,440 232,440 C270,440 274,482 268,532 L228,822 C220,902 248,952 326,902",
    "M282,140 L326,290",
  ],
  s: [
    "M502,526 C472,468 402,440 318,440 C210,440 140,490 140,566 C140,646 220,676 326,696 C446,719 516,756 516,832 C516,906 436,942 320,942 C220,942 140,912 104,856",
  ],
  u: [
    "M130,440 L130,740 C130,880 220,942 330,942 C432,942 512,880 542,780",
    "M562,440 L562,942",
  ],
  a: [
    "M116,522 C152,466 232,440 332,440 C472,440 546,500 546,620 L546,942",
    "M546,652 C382,652 112,692 112,826 C112,906 172,942 262,942 C382,942 472,880 546,790",
  ],
  l: ["M180,150 L180,862 C180,926 226,952 322,914"],
  /* the i's lozenge on its own, for the background */
  dot: ["M282,140 L326,290"],
};

export type Ink = {
  /** one path per centreline, in writing order */
  strokes: { ink: string; centre: string }[];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

const cache: Record<string, Ink> = {};

export function ink(key: string): Ink {
  if (cache[key]) return cache[key];
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  const strokes = CENTRELINES[key].map((centre) => {
    const { path, box } = writeStroke(centre);
    x0 = Math.min(x0, box[0]);
    x1 = Math.max(x1, box[2]);
    y0 = Math.min(y0, box[1]);
    y1 = Math.max(y1, box[3]);
    return { ink: path, centre };
  });
  return (cache[key] = { strokes, x0, x1, y0, y1 });
}
