/*
  Cuts a character design sheet into individual transparent sprite frames.

  The sheets arrive as one flat image on a light grey card: figures laid out
  in labelled rows, with headings, captions and swatch panels mixed in. What
  the game needs is the opposite of that — one tightly cropped PNG per pose,
  with an alpha channel, plus the measurements that let the renderer place
  it on the crease.

  Three problems, in order:

  1. BACKGROUND REMOVAL. The card is near-uniform grey, but so are parts of
     the characters (grey trousers, white shoes, the white ball). A global
     "replace everything near #ebebeb with transparent" punches holes
     through all of those. Instead this flood-fills inward from the image
     border, so only grey *connected to the outside* is removed and every
     enclosed pixel survives no matter what colour it is.

  2. FRAME DISCOVERY. Rather than hand-typing 60 bounding boxes, the script
     finds them: it projects the remaining opaque pixels onto each axis,
     splits into bands wherever there is a run of empty rows/columns, and
     treats each resulting island as a frame. Islands smaller than a
     threshold are dropped, which is what discards the text and the little
     UI swatches without needing to know where they are.

  3. MEASUREMENT. Each frame is emitted with its width, height, and `ax`:
     where the feet sit horizontally as a fraction of frame width, measured
     from the alpha of the bottom 7%. That is the same contract
     batterSprites.ts already uses, so the renderer places these the same
     way it places the batter — anchored on the feet, not on the box.

  Usage:
    node scripts/cut-sprites.mjs "<sheet.png>" <out-dir> [--report]

  `--report` prints the discovered boxes and writes nothing, which is how
  you check a sheet's layout before committing to a cut.
*/

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];
const REPORT_ONLY = process.argv.includes("--report");

if (!SRC || !OUT) {
  console.error('usage: node scripts/cut-sprites.mjs "<sheet.png>" <out-dir> [--report]');
  process.exit(1);
}

/* How far a pixel may sit from the sampled background colour and still count
   as background. The sheets are flat, so this can be tight; too loose and it
   starts eating the light grey panel outlines and the white shoes. */
const BG_TOLERANCE = 26;

/* A gap this many empty pixels wide separates two frames. Too small and a
   figure's outstretched arm splits into its own frame; too large and two
   neighbouring poses merge into one. */
const GAP_X = 14;
const GAP_Y = 18;

/*
  Islands below this are captions, labels, swatches and stray marks.

  The floors are on the SHORT and LONG side rather than on width and height,
  because a figure is not always upright. A keeper's full-length dive is
  roughly 220x74 — wider than it is tall — and a height floor set to catch
  text rejected exactly the poses that lie down. Measuring the longest side
  instead accepts a dive and still rejects a caption, which is short in both
  directions.
*/
const MIN_SHORT = 40;
const MIN_LONG = 95;
const MIN_FILL = 900; // opaque pixels
/* used only when deciding whether a wide box is two figures */
const MIN_W = 46;

const img = sharp(SRC);
const meta = await img.metadata();
const W = meta.width;
const H = meta.height;

const { data } = await img
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const CH = 4;
const idx = (x, y) => (y * W + x) * CH;

/* --- 1. sample the background from the four corners ------------------- */

function sampleBg() {
  const pts = [
    [2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3],
    [Math.floor(W / 2), 2], [Math.floor(W / 2), H - 3],
  ];
  let r = 0, g = 0, b = 0;
  for (const [x, y] of pts) {
    const i = idx(x, y);
    r += data[i]; g += data[i + 1]; b += data[i + 2];
  }
  return [r / pts.length, g / pts.length, b / pts.length];
}

const [BR, BG_, BB] = sampleBg();

function isBg(i) {
  return (
    Math.abs(data[i] - BR) <= BG_TOLERANCE &&
    Math.abs(data[i + 1] - BG_) <= BG_TOLERANCE &&
    Math.abs(data[i + 2] - BB) <= BG_TOLERANCE
  );
}

/* --- 2. flood fill transparency inward from the border ----------------- */

/*
  An explicit stack, not recursion: a 1536x1024 sheet is 1.5M pixels and a
  recursive fill blows the call stack long before it finishes.
*/
const outside = new Uint8Array(W * H);
const stack = [];

for (let x = 0; x < W; x++) {
  stack.push(x, 0, x, H - 1);
}
for (let y = 0; y < H; y++) {
  stack.push(0, y, W - 1, y);
}

while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const p = y * W + x;
  if (outside[p]) continue;
  if (!isBg(p * CH)) continue;
  outside[p] = 1;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

/*
  Enclosed pockets.

  Filling from the border only reaches background the outside can see. The
  gap between a bowler's legs, the triangle under a bent arm and the hole
  inside a follow-through are all sealed off by the figure, so they survive
  as opaque lumps of card grey — which on grass reads as the sprite carrying
  a piece of the design sheet around with it.

  Any *large* region of background-coloured pixels is one of those pockets.
  The size floor is what keeps this safe: a pocket between the legs is
  thousands of pixels, while genuinely light details in the art — the ball,
  the shoes, the jersey lettering — are either outside the colour tolerance
  entirely or far too small to qualify.
*/
const MIN_POCKET = 140;
let pockets = 0;
let pocketPx = 0;

for (let sy = 0; sy < H; sy++) {
  for (let sx = 0; sx < W; sx++) {
    const p0 = sy * W + sx;
    if (outside[p0] || !isBg(p0 * CH)) continue;

    const region = [];
    const st = [sx, sy];
    outside[p0] = 2; /* claimed, pending the size test */

    while (st.length) {
      const y = st.pop();
      const x = st.pop();
      const p = y * W + x;
      region.push(p);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (outside[q] || !isBg(q * CH)) continue;
        outside[q] = 2;
        st.push(nx, ny);
      }
    }

    if (region.length >= MIN_POCKET) {
      pockets++;
      pocketPx += region.length;
      for (const p of region) outside[p] = 1;
    } else {
      /* too small to be a pocket — hand it back to the figure */
      for (const p of region) outside[p] = 0;
    }
  }
}

console.log(`cleared ${pockets} enclosed pockets (${pocketPx.toLocaleString()} px)`);

/* write the alpha we just decided */
for (let p = 0; p < W * H; p++) {
  if (outside[p] === 1) data[p * CH + 3] = 0;
}

const opaque = (x, y) => data[(y * W + x) * CH + 3] > 12;

/* --- 3. find frames as connected components ---------------------------- */

/*
  Projection onto the axes was the obvious approach and it does not work on
  these sheets: the headings, the caption rows and the panel outlines all
  span most of the width, so every horizontal band bridges into its
  neighbours and the whole sheet comes back as one box.

  Connected components do not care about that. Each figure is its own island
  of ink, and the furniture around it — text, rules, panel borders — is
  rejected afterwards by shape rather than by position, so the script never
  needs to know how a particular sheet is laid out.
*/

const label = new Int32Array(W * H).fill(-1);
const comps = [];

for (let sy = 0; sy < H; sy++) {
  for (let sx = 0; sx < W; sx++) {
    const p0 = sy * W + sx;
    if (label[p0] !== -1 || !opaque(sx, sy)) continue;

    const id = comps.length;
    let minX = sx, maxX = sx, minY = sy, maxY = sy, fill = 0;
    const st = [sx, sy];
    label[p0] = id;

    while (st.length) {
      const y = st.pop();
      const x = st.pop();
      fill++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      /* 8-connected: a diagonal hairline of anti-aliased pixels is still one
         limb, and 4-connectivity splits those into confetti */
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const p = ny * W + nx;
          if (label[p] !== -1 || !opaque(nx, ny)) continue;
          label[p] = id;
          st.push(nx, ny);
        }
      }
    }
    comps.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, fill });
  }
}

/*
  Keep only things shaped like a person.

  - size floors drop letters, captions and the small gear icons
  - the density floor drops panel outlines and rules: a hollow rectangle has
    a huge bounding box and almost no ink in it
  - the width ceiling drops headings, which are wide and short
*/
/*
  Regions to ignore, as `--exclude=x0,y0,x1,y1` (repeatable).

  This started as a simple right-hand x clip and that was not enough: the
  bowler sheet's close-up crops sit in the same column as the last frame of
  the run-up cycle, so any vertical cut either keeps the close-ups or throws
  away RECOVERY. They separate cleanly in y, hence rectangles.
*/
const EXCLUDES = process.argv
  .filter((a) => a.startsWith("--exclude="))
  .map((a) => a.split("=")[1].split(",").map(Number))
  .filter((r) => r.length === 4 && r.every((n) => Number.isFinite(n)));

const excluded = (c) =>
  EXCLUDES.some(
    ([x0, y0, x1, y1]) =>
      c.x + c.w > x0 && c.x < x1 && c.y + c.h > y0 && c.y < y1
  );

let boxes = comps.filter((c) => {
  if (excluded(c)) return false;
  if (Math.min(c.w, c.h) < MIN_SHORT) return false;
  if (Math.max(c.w, c.h) < MIN_LONG) return false;
  if (c.fill < MIN_FILL) return false;
  const density = c.fill / (c.w * c.h);
  if (density < 0.12) return false;
  if (c.w > W * 0.34) return false;
  return true;
});

/*
  Two figures whose arms overlap arrive as one component. They are obvious
  in the numbers — roughly twice the width of every other pose on the same
  row — and they split cleanly at whichever interior column carries the
  least ink, which is the gap between the two bodies.

  The median is taken per row rather than per sheet: a row of crouching
  fielders and a row of leaping ones have genuinely different widths, and a
  sheet-wide median would call half of one row "too wide".
*/
function medianWidth(list) {
  if (!list.length) return 0;
  const w = list.map((b) => b.w).sort((a, b) => a - b);
  return w[Math.floor(w.length / 2)];
}

const ROW_BUCKET = 130;
const byRow = new Map();
for (const b of boxes) {
  const k = Math.floor(b.y / ROW_BUCKET);
  if (!byRow.has(k)) byRow.set(k, []);
  byRow.get(k).push(b);
}

const split = [];
for (const [, row] of byRow) {
  const med = medianWidth(row);
  for (const b of row) {
    if (med && b.w > med * 1.6) {
      /* ink per column across the component, then cut at the emptiest
         column in the middle 60% — the edges are always near-empty and
         cutting there would just shave a limb off */
      const col = new Int32Array(b.w);
      for (let x = 0; x < b.w; x++) {
        let n = 0;
        for (let y = b.y; y < b.y + b.h; y++) if (opaque(b.x + x, y)) n++;
        col[x] = n;
      }
      let best = -1;
      let bestN = Infinity;
      for (let x = Math.floor(b.w * 0.2); x < Math.floor(b.w * 0.8); x++) {
        if (col[x] < bestN) {
          bestN = col[x];
          best = x;
        }
      }
      if (best > 0) {
        /* re-tighten each half to its own ink rather than to the cut line */
        const halves = [];
        for (const [from, to] of [
          [0, best],
          [best + 1, b.w - 1],
        ]) {
          let minX = to, maxX = from, minY = b.h - 1, maxY = 0, fill = 0;
          for (let x = from; x <= to; x++) {
            for (let y = 0; y < b.h; y++) {
              if (!opaque(b.x + x, b.y + y)) continue;
              fill++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
          halves.push({
            x: b.x + minX,
            y: b.y + minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1,
            fill,
          });
        }

        /*
          Only accept a split that produced two plausible figures. A wide box
          is just as often one pose with an arm flung out as it is two poses
          touching, and in that case the "emptiest column" lands inside the
          figure and shaves the arm off. Requiring both halves to stand on
          their own turns that failure into a no-op instead of silent damage.
        */
        const ok = halves.every(
          (hf) =>
            hf.w >= MIN_W &&
            Math.max(hf.w, hf.h) >= MIN_LONG &&
            hf.fill >= MIN_FILL
        );
        if (ok) {
          console.log(
            `  split ${b.w}px box at x+${best} into ${halves[0].w}px + ${halves[1].w}px (row median ${med}px, ${bestN}px ink in the seam)`
          );
          split.push(...halves);
          continue;
        }
        console.log(
          `  kept ${b.w}px box whole — best seam at x+${best} would leave ${halves[0].w}x${halves[0].h} + ${halves[1].w}x${halves[1].h}, not two figures`
        );
      }
    }
    split.push(b);
  }
}
boxes = split;

/*
  Reading order. Sorting by y alone interleaves rows, because figures in one
  row do not share a top edge — a raised arm starts 60px higher than a
  crouch. Bucketing y first means "same row" survives that.
*/
boxes.sort(
  (a, b) =>
    Math.floor(a.y / ROW_BUCKET) - Math.floor(b.y / ROW_BUCKET) || a.x - b.x
);
boxes.forEach((b) => (b.band = [Math.floor(b.y / ROW_BUCKET) * ROW_BUCKET, 0]));

console.log(`sheet ${path.basename(SRC)}  ${W}x${H}`);
console.log(`background rgb(${BR.toFixed(0)}, ${BG_.toFixed(0)}, ${BB.toFixed(0)})`);
console.log(`found ${boxes.length} frames\n`);

let band = -1;
boxes.forEach((b, i) => {
  if (b.band[0] !== band) {
    band = b.band[0];
    console.log(`-- band y=${b.band[0]}..${b.band[1]}`);
  }
  console.log(`  [${String(i).padStart(2)}] x=${String(b.x).padStart(4)} y=${String(b.y).padStart(4)} ${String(b.w).padStart(3)}x${String(b.h).padStart(3)}`);
});

if (REPORT_ONLY) process.exit(0);

/* --- 4. emit ----------------------------------------------------------- */

await mkdir(OUT, { recursive: true });

const cut = sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } });
const manifest = [];

for (let i = 0; i < boxes.length; i++) {
  const b = boxes[i];
  const name = `frame-${String(i).padStart(2, "0")}`;
  const buf = await cut
    .clone()
    .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(OUT, `${name}.png`), buf);

  /* foot anchor: centre of mass of the bottom 7% of opaque pixels */
  const footTop = b.y + Math.floor(b.h * 0.93);
  let sum = 0, n = 0;
  for (let y = footTop; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      if (opaque(x, y)) { sum += x - b.x; n++; }
    }
  }
  const ax = n ? sum / n / b.w : 0.5;
  manifest.push({ name, w: b.w, h: b.h, ax: +ax.toFixed(4) });
}

await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`\nwrote ${manifest.length} frames + manifest.json to ${OUT}`);
