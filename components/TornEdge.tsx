"use client";

import { useId } from "react";

/*
  A torn-paper top edge.

  The device Process introduced and the page now uses at more than one seam:
  a shape filled in the colour of the section ABOVE, laid over the top of the
  section below, so the two read as one sheet torn across rather than two
  blocks butted together.

  `fill` is therefore always the colour of what sits above, not of the section
  this belongs to. It is applied through `style` rather than the SVG `fill`
  attribute so a CSS custom property (var(--cream)) actually resolves.

  Filter ids come from useId: two of these on one page with hardcoded ids
  would collide, and every instance after the first would silently take the
  first one's displacement.

  Mount it as a child of a `position: relative` section, NOT inside a sticky
  pane - a sticky pane is its own stacking context (so the edge would be
  trapped under anything the pane paints) and it holds still for the whole
  pin, so the edge would park on screen instead of passing once at the seam.
*/
export default function TornEdge({
  fill,
  dots = false,
  className = "",
}: {
  /** the colour of the section ABOVE this one */
  fill: string;
  /** carry a dot grid across the tear, for a dark fill that has one */
  dots?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const desktop = `tornEdge-${uid}`;
  const mobile = `tornEdge-${uid}-m`;

  return (
    <div className={`tornEdge ${className}`.trim()} aria-hidden>
      <svg
        className="tornEdge__svg--desktop"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* two-band fractal noise: low horizontal frequency gives the broad
              tears, high vertical the fine fibres along the edge */}
          <filter id={desktop} x="-5%" y="-600%" width="110%" height="1300%">
            <feTurbulence type="fractalNoise" baseFrequency="0.055 0.07" numOctaves="5" seed="31" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <path
          d="M0,-500 L1440,-500 L1440,100 C1400,75 1360,64 1320,60 C1280,56 1240,61 1200,58 C1160,55 1120,59 1080,56 C1040,54 1000,58 960,55 C920,52 880,56 840,54 C800,51 760,55 720,52 C680,49 640,54 600,51 C560,48 520,52 480,49 C440,46 400,51 360,48 C320,45 280,49 240,46 C200,44 160,48 120,45 C80,64 40,80 0,100 Z"
          style={{ fill }}
          filter={`url(#${desktop})`}
        />
      </svg>

      <svg
        className="tornEdge__svg--mobile"
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={mobile} x="-8%" y="-700%" width="116%" height="1500%">
            <feTurbulence type="fractalNoise" baseFrequency="0.019 0.13" numOctaves="4" seed="9" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <path
          d="M0,-500 L1440,-500 L1440,72 C1400,54 1360,47 1320,44 C1280,41 1240,46 1200,43 C1160,40 1120,46 1080,42 C1040,38 1000,45 960,41 C920,38 880,44 840,41 C800,37 760,43 720,39 C680,36 640,43 600,39 C560,36 520,42 480,38 C440,35 400,41 360,38 C320,34 280,40 240,37 C200,33 160,40 120,36 C80,49 40,62 0,72 Z"
          style={{ fill }}
          filter={`url(#${mobile})`}
        />
      </svg>

      {/* after the svg in the DOM so it paints on top of the fill */}
      {dots ? <div className="tornEdge__dots" /> : null}
    </div>
  );
}
