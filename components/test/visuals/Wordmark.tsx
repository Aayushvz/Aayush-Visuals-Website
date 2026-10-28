import { ink } from "./glyphs";

/*
  Sets the two-line lockup from the nib face.

  Each glyph is placed by its painted box (auto side-bearings), then nudged
  with an optical kern - diagonals (A, V, Y) need to tuck, rounds need air.

  Writing animation: every stroke is masked by its own centreline, stroked
  wider than the pen and revealed with a dash offset in writing order. The
  ink path never changes; only how much of the pen's route is uncovered.
*/

type Item = { k: string; kern?: number; over?: { k: string; dx: number; dy: number } };

export const LINE_1: Item[] = [
  { k: "A", over: { k: "macron", dx: 0, dy: 0 } },
  { k: "A", kern: -40 },
  { k: "Y", kern: -110 },
  { k: "uI", kern: -30 },
  { k: "S", kern: 10 },
  { k: "H", kern: 10 },
];

export const LINE_2: Item[] = [
  { k: "V" },
  { k: "iI", kern: -120 },
  { k: "s", kern: -40 },
  { k: "u", kern: 0 },
  { k: "a", kern: 0 },
  { k: "l", kern: -10 },
  { k: "s", kern: -30 },
];

const TRACK = 26;

function setLine(items: Item[]) {
  let x = 0;
  const placed: { k: string; x: number }[] = [];
  items.forEach((it, i) => {
    const g = ink(it.k);
    if (i > 0) x += it.kern ?? 0;
    const gx = x - g.x0;
    placed.push({ k: it.k, x: gx });
    if (it.over) placed.push({ k: it.over.k, x: gx + it.over.dx });
    x += g.x1 - g.x0 + TRACK;
  });
  return { placed, width: x - TRACK };
}

/** how many pen strokes the lockup writes (for timing the writing) */
export function strokeCount() {
  const count = (items: Item[]) =>
    items.reduce((n, it) => n + ink(it.k).strokes.length + (it.over ? ink(it.over.k).strokes.length : 0), 0);
  return count(LINE_1) + count(LINE_2);
}

export default function Wordmark({
  className,
  write = true,
  gap = 34,
  idPrefix = "wm",
}: {
  className?: string;
  write?: boolean;
  /** mask id prefix: two lockups on one page (the loader over /test/visuals)
      must not share ids */
  idPrefix?: string;
  /** clearance (units) between line 1's baseline and line 2's tallest point */
  gap?: number;
}) {
  const l1 = setLine(LINE_1);
  const l2 = setLine(LINE_2);
  /* justify: line 2 is scaled up until it is exactly as wide as line 1, so
     the lockup reads as one block */
  const s2 = l1.width / l2.width;
  const top2 = Math.min(...l2.placed.map((p) => ink(p.k).y0));
  const bot2 = Math.max(...l2.placed.map((p) => ink(p.k).y1));
  const top1 = Math.min(...l1.placed.map((p) => ink(p.k).y0));
  const base1 = Math.max(...l1.placed.map((p) => ink(p.k).y1));
  const y2 = base1 + gap - top2 * s2;
  const H = y2 + bot2 * s2;

  let strokeIndex = 0;
  const glyph = (k: string, x: number, key: string) => {
    const g = ink(k);
    return (
      <g key={key} transform={`translate(${x} 0)`}>
        {g.strokes.map((s, j) => {
          const i = strokeIndex++;
          if (!write) return <path key={j} d={s.ink} />;
          const id = `${idPrefix}-${key}-${j}`;
          return (
            <g key={j}>
              <mask id={id} maskUnits="userSpaceOnUse" x="-500" y="-500" width="2000" height="2000">
                <path
                  d={s.centre}
                  pathLength={1}
                  className="vz-writeMask"
                  style={{ "--i": i } as React.CSSProperties}
                />
              </mask>
              <path d={s.ink} mask={`url(#${id})`} />
            </g>
          );
        })}
      </g>
    );
  };

  const pad = 24;
  return (
    <svg
      className={className}
      viewBox={`${-pad} ${top1 - pad} ${l1.width + pad * 2} ${H - top1 + pad * 2}`}
      role="img"
      aria-label="Aayush Visuals"
      focusable="false"
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
        <g>{l1.placed.map((p, n) => glyph(p.k, p.x, `a${n}`))}</g>
        <g transform={`translate(0 ${y2}) scale(${s2})`}>
          {l2.placed.map((p, n) => glyph(p.k, p.x, `b${n}`))}
        </g>
      </g>
    </svg>
  );
}

/** A single glyph as a bare path group, for the giant background letters. */
export function Glyph({ k, className }: { k: string; className?: string }) {
  const g = ink(k);
  return (
    <svg
      className={className}
      viewBox={`${g.x0} ${g.y0} ${g.x1 - g.x0} ${g.y1 - g.y0}`}
      aria-hidden
      focusable="false"
      overflow="visible"
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
        {g.strokes.map((s, j) => (
          <path key={j} d={s.ink} />
        ))}
      </g>
    </svg>
  );
}
