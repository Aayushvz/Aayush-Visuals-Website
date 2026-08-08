"use client";

import PageLink from "./PageLink";
import type { ReactNode } from "react";

/*
  The site's primary button, ported from the "Visit Live Website" control on
  the case-study pages (components/projects/figma/figma-project.css,
  .figp-ext) so the homepage and the project pages share one primary action.

  The mechanic, unchanged from the original: a charcoal bar with a square
  accent tile at its left. On hover the accent doesn't fade in behind the
  label — it un-clips, spreading out of the square to fill the whole bar
  while the label steps aside for a conveyor of arrows travelling the way
  they point. One accent layer does both states, animated with clip-path, so
  the square genuinely becomes the bar instead of two shapes cross-fading.

  Only the accent differs from the case-study version: purple, the
  homepage's own colour, rather than the per-project case-study green.
*/

/* The glyph is drawn as a dot matrix rather than a stroked arrowhead: at
   17px a stroked chevron turns to mush, while dots stay crisp and give the
   march a mechanical, ticker-like cadence. Columns thin out left to right,
   which is what reads as an arrow. */
const DOT_COLUMNS = [
  { x: 2.6, ys: [2.6, 6.2, 9.8, 13.4], r: 1.35 },
  { x: 6.2, ys: [4.4, 8, 11.6], r: 1.25 },
  { x: 9.8, ys: [6.2, 9.8], r: 1.15 },
  { x: 13.4, ys: [8], r: 1.05 },
];

export function DotArrow() {
  return (
    <svg className="extCta__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {DOT_COLUMNS.map((col) =>
        col.ys.map((y) => (
          <circle key={`${col.x}-${y}`} cx={col.x} cy={y} r={col.r} fill="currentColor" />
        ))
      )}
    </svg>
  );
}

type Props = {
  href: string;
  children: ReactNode;
  /* optional payload shown after the label — the Selected Works button uses
     it for the total project count, which is the reason to click it */
  count?: ReactNode;
  /* route changes go through PageLink so they play the page-transition
     wipe; in-page hash jumps stay a plain anchor */
  route?: boolean;
  className?: string;
  "data-reveal"?: boolean | string;
};

export default function ExtCta({
  href,
  children,
  count,
  route = false,
  className,
  ...rest
}: Props) {
  const inner = (
    <>
      {/* One accent layer for both states, clipped to the tile at rest and
          un-clipped to the whole bar on hover. */}
      <span className="extCta__fill" aria-hidden="true" />

      {/* the square holds the glyph's place in the flex row so the label
          doesn't shift when the fill spreads past it */}
      <span className="extCta__tile" aria-hidden="true">
        <DotArrow />
      </span>

      {/* Hidden with opacity on hover, never display:none or
          visibility:hidden — this label is the link's accessible name, and
          those two would take it out of the accessibility tree and leave an
          unnamed link under the pointer. */}
      <span className="extCta__label">{children}</span>

      {/* The badge alone reads as "View all projects11" to a screen reader —
          the number butts straight onto the label with nothing between them.
          The visible badge is hidden from the accessibility tree and the same
          value is restated as a phrase, so the name comes out as
          "View all projects, 11 in total". */}
      {count != null && (
        <>
          <span className="extCta__num" aria-hidden="true">
            {count}
          </span>
          <span className="srOnly">, {count} in total</span>
        </>
      )}

      {/* the march. Two-plus identical glyphs so translating the track by
          exactly one pitch lands on a seamless repeat */}
      <span className="extCta__march" aria-hidden="true">
        <span className="extCta__marchTrack">
          {Array.from({ length: 14 }, (_, i) => (
            <DotArrow key={i} />
          ))}
        </span>
      </span>
    </>
  );

  const cls = className ? `extCta ${className}` : "extCta";

  if (route) {
    return (
      <PageLink href={href} className={cls} {...rest}>
        {inner}
      </PageLink>
    );
  }

  return (
    <a href={href} className={cls} {...rest}>
      {inner}
    </a>
  );
}
