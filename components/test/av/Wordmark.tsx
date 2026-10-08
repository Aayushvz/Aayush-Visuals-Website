import { GLYPHS, M, measure } from "./glyphs";

/*
  Sets a word from the hand-drawn alphabet.

  Every line uses the SAME vertical box (ascender top to descender bottom)
  whether or not it contains an ascender or a descender. That is what keeps
  two stacked lines sharing a baseline: trim the box to each line's own
  extremes and "aayush" (descender in the y) and "visuals" (none) would sit
  at different heights for no visible reason.

  Glyphs are placed with a transform rather than by rewriting path data, so
  the alphabet stays readable as drawn.
*/

const TOP = M.ascTop;
const BOX_H = M.descBottom - M.ascTop;

type Placed = { key: string; d: string; x: number };

function layout(text: string, tracking: number): Placed[] {
  const out: Placed[] = [];
  let x = 0;
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    g.d.forEach((d, j) => out.push({ key: `${i}-${j}`, d, x }));
    x += g.w + tracking;
  });
  return out;
}

export default function Wordmark({
  text,
  tracking = -2,
  className,
  title,
}: {
  text: string;
  /** negative tightens; the reference sets very tight */
  tracking?: number;
  className?: string;
  title?: string;
}) {
  const w = measure(text, tracking);
  const placed = layout(text, tracking);

  return (
    <svg
      className={className}
      viewBox={`0 ${TOP} ${w} ${BOX_H}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={M.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {placed.map((p) => (
          <path key={p.key} d={p.d} transform={`translate(${p.x} 0)`} />
        ))}
      </g>
    </svg>
  );
}
