import type { GlyphSet } from "./pixelFont";

/*
  Renders a string from a GlyphSet as SVG.

  Two things are worth knowing about this component.

  First, the outline is DERIVED. The reference's letters sit inside a heavy
  near-black keyline, and the obvious way to get that - drawing the keyline
  into each glyph - means every future tweak to a letterform has to be made
  twice, and the two drift. Instead the fill cells are dilated by
  `outline` cells (Chebyshev, so corners are covered too) and everything in
  the dilation that is not itself fill becomes keyline. A letter can be
  redrawn freely and its outline simply follows.

  Second, cells are merged into horizontal runs before they become <rect>s.
  The wordmark is a few thousand cells once dilated; one rect each is a lot
  of DOM for something that never changes, and adjacent rects also show
  hairline seams when the SVG is scaled to a fractional size.
*/

type Props = {
  text: string;
  set: GlyphSet;
  /* cell edge in px - the SVG scales to its container, so this only sets
     the internal coordinate system and the fill/outline ratio */
  cell?: number;
  fill?: string;
  outlineColor?: string;
  /* keyline thickness, in cells */
  outline?: number;
  className?: string;
  /* decorative by default: the hero states the real text in an <h1> */
  title?: string;
};

type Grid = boolean[][];

function buildGrid(text: string, set: GlyphSet): Grid {
  const cols: boolean[][] = []; // column-major while assembling
  const push = (n: number) => {
    for (let i = 0; i < n; i++) cols.push(new Array(set.rows).fill(false));
  };

  [...text].forEach((ch, i) => {
    if (i > 0) push(set.gap);
    if (ch === " ") {
      push(set.space);
      return;
    }
    const g = set.glyphs[ch];
    if (!g) {
      // A missing glyph is a drawing bug, not a runtime one. Leave a solid
      // block so it is obvious on screen rather than silently absent.
      push(3);
      return;
    }
    const w = g[0].length;
    for (let c = 0; c < w; c++) {
      const col = new Array(set.rows).fill(false);
      for (let r = 0; r < set.rows; r++) col[r] = g[r][c] === "#";
      cols.push(col);
    }
  });

  // back to row-major
  const grid: Grid = [];
  for (let r = 0; r < set.rows; r++) grid.push(cols.map((col) => col[r]));
  return grid;
}

/* every empty cell within `d` cells of a filled one */
function dilate(grid: Grid, d: number): Grid {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const out: Grid = Array.from({ length: h }, () => new Array(w).fill(false));
  if (d <= 0) return out;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!grid[r][c]) continue;
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= h || nc >= w) continue;
          if (!grid[nr][nc]) out[nr][nc] = true;
        }
      }
    }
  }
  return out;
}

/* merge each row's true cells into [x, width] runs */
function runs(grid: Grid): { x: number; y: number; w: number }[] {
  const out: { x: number; y: number; w: number }[] = [];
  grid.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = x < row.length && row[x];
      if (on && start === -1) start = x;
      if (!on && start !== -1) {
        out.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
  });
  return out;
}

/* grow the grid by `pad` empty cells on every side so the dilated keyline
   has somewhere to live instead of being clipped at the edges */
function padGrid(grid: Grid, pad: number): Grid {
  if (pad <= 0) return grid;
  const w = grid[0].length + pad * 2;
  const blank = () => new Array(w).fill(false);
  const out: Grid = [];
  for (let i = 0; i < pad; i++) out.push(blank());
  for (const row of grid) out.push([...new Array(pad).fill(false), ...row, ...new Array(pad).fill(false)]);
  for (let i = 0; i < pad; i++) out.push(blank());
  return out;
}

export default function PixelText({
  text,
  set,
  cell = 10,
  fill = "#ffffff",
  outlineColor = "#140b2b",
  outline = 2,
  className,
  title,
}: Props) {
  const base = padGrid(buildGrid(text, set), outline);
  const key = dilate(base, outline);

  const h = base.length;
  const w = base[0]?.length ?? 0;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w * cell} ${h * cell}`}
      width={w * cell}
      height={h * cell}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill={outlineColor}>
        {runs(key).map((r, i) => (
          <rect key={`k${i}`} x={r.x * cell} y={r.y * cell} width={r.w * cell} height={cell} />
        ))}
      </g>
      <g fill={fill}>
        {runs(base).map((r, i) => (
          <rect key={`f${i}`} x={r.x * cell} y={r.y * cell} width={r.w * cell} height={cell} />
        ))}
      </g>
    </svg>
  );
}
