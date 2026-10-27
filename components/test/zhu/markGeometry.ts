/*
  Aayush's logo mark as outlines, rebuilt from measurements of the supplied
  2000x2000 PNG rather than traced, so every edge is exact at any size.

  The mark is two shapes:
    bar - a parallelogram leaning 28.4deg from vertical, 418px wide, with
          only its top-left corner rounded (radius ~150px)
    dot - a circle, radius 243px

  Output is in "mark units": the mark's bounding box (x 318-1589, y 445-1426
  in the PNG) is scaled so its height is 1, centred on zero, with y pointing
  UP (three.js convention). Pure maths, no three.js, so it can be tested.
*/

export type Pt = [number, number];

const BOX = { x0: 318, x1: 1589, y0: 445, y1: 1426 };
const H = BOX.y1 - BOX.y0; // 981
const CX = (BOX.x0 + BOX.x1) / 2;
const CY = (BOX.y0 + BOX.y1) / 2;

/* PNG pixels -> mark units */
const u = (x: number, y: number): Pt => [(x - CX) / H, -(y - CY) / H];

const BAR = {
  bl: [318, 1426] as Pt,
  br: [736, 1426] as Pt,
  tr: [1262, 445] as Pt,
  tl: [844, 445] as Pt,
  corner: 150, // top-left rounding radius, px
};
const DOT = { cx: 1345, cy: 1183, r: 243 };

export function markOutline(samples = 10): { bar: Pt[]; dot: { cx: number; cy: number; r: number } } {
  const { bl, br, tr, tl, corner } = BAR;

  /* the rounding starts `corner` px down the slanted left edge and ends
     `corner` px along the top edge; a quadratic through the sharp vertex
     joins them tangent to both edges */
  const ldx = bl[0] - tl[0],
    ldy = bl[1] - tl[1];
  const llen = Math.hypot(ldx, ldy);
  const a: Pt = [tl[0] + (ldx / llen) * corner, tl[1] + (ldy / llen) * corner];
  const tdx = tr[0] - tl[0];
  const b: Pt = [tl[0] + Math.sign(tdx) * corner, tl[1]];

  const bar: Pt[] = [u(a[0], a[1])];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples,
      s = 1 - t;
    bar.push(
      u(
        s * s * a[0] + 2 * s * t * tl[0] + t * t * b[0],
        s * s * a[1] + 2 * s * t * tl[1] + t * t * b[1],
      ),
    );
  }
  bar.push(u(tr[0], tr[1]), u(br[0], br[1]), u(bl[0], bl[1]));

  const [cx, cy] = u(DOT.cx, DOT.cy);
  return { bar, dot: { cx, cy, r: DOT.r / H } };
}
