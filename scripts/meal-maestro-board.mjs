/*
  The Meal Maestro case-study board, divided into sections.

  The board is Figma frame 381:885, 1920x25254. Unlike Layover's it is not
  built as a stack of section frames - it is one flat canvas of overlapping
  elements, so there are no children to export one at a time and no list of
  boundaries to read off. The cuts have to be found in the picture.

  They are found by looking for rows the board is quiet on. A row that is
  one flat colour all the way across has nothing crossing it: no text, no
  card edge, no phone. Cutting there can never split a sentence or slice a
  mockup in half. The script walks out from evenly spaced targets and takes
  the longest quiet run it finds nearby, so the pieces come out roughly
  even in size but always land in the gaps the layout already has.

  Why it is cut at all: nobody should download twenty-five thousand pixels
  of case study to read the first screen. Every piece is lazy, so a reader
  fetches the section they have scrolled to and nothing else.

  Resolution is what Figma will give. A whole-frame export is clamped to
  32768px on its long side, so a 25254-tall frame tops out at 2492 wide -
  1.3x - and this board has no sub-frames to export separately at 2x the
  way Layover's did. Written at 2400, which is a downscale from 2492 and
  covers a 1440 window at 1.67x. The 1400px slices this replaces were
  0.97x of that window.

  Usage: node scripts/meal-maestro-board.mjs <exported-png> [parts]
*/
import sharp from "sharp";
import { mkdir, rm } from "node:fs/promises";

const DIR = "public/projects/meal-maestro/board";
const WIDTH = 2400;
const DESIGN_W = 1920;
/*
  How big a step along a row may be, 0-255, for the row to count as empty.

  The test is the biggest jump between neighbouring samples, not the row's
  total range. Total range rejects a row that crosses one of this board's
  full-width gradient bands - which is exactly the kind of row it is safest
  to cut on, since a gradient has nothing in it. An edge has a step; a
  gradient does not.
*/
const QUIET = 9;
/* how far from an even target the script may wander to find one */
const SEARCH = 0.45;

const src = process.argv[2];
const PARTS = Number(process.argv[3] ?? 13);
if (!src) {
  console.error("usage: node scripts/meal-maestro-board.mjs <exported-png> [parts]");
  process.exit(1);
}

const meta = await sharp(src, { limitInputPixels: false }).metadata();
const scale = meta.width / DESIGN_W;
console.log(`source ${meta.width}x${meta.height}  (${scale.toFixed(3)}x of the ${DESIGN_W}px design)`);

/*
  One sample row per source row: the width collapses to 240 columns but the
  height is held, so a row index here is a row index there.
*/
const PROBE_W = 240;
const { data, info } = await sharp(src, { limitInputPixels: false })
  .resize({ width: PROBE_W, height: meta.height, fit: "fill" })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const quiet = new Uint8Array(info.height);
for (let y = 0; y < info.height; y++) {
  const row = y * info.width;
  let step = 0;
  for (let x = 1; x < info.width; x++) {
    const d = Math.abs(data[row + x] - data[row + x - 1]);
    if (d > step) step = d;
  }
  quiet[y] = step <= QUIET ? 1 : 0;
}

/* the longest quiet run containing each row, so a cut lands in the middle
   of a band of empty canvas rather than on a single lucky row */
const runs = [];
let y = 0;
while (y < info.height) {
  if (!quiet[y]) { y++; continue; }
  const start = y;
  while (y < info.height && quiet[y]) y++;
  runs.push([start, y - 1]);
}
console.log(`${runs.length} quiet bands found`);

/*
  Cuts are chosen by walking down the board, not by dividing it up.

  Evenly spaced targets asked for a cut at a particular height and took
  whatever was nearest, which works until a stretch of the board has no
  quiet row within reach - this one has such a stretch around the app
  preview and the colour swatches, where three targets in a row had to be
  forced through content. Walking instead: once a piece is tall enough,
  take the next good gap; only force a cut if the piece would otherwise
  grow past the maximum. The pieces come out less even and every one of
  them lands in a gap the layout already has.
*/
const MIN = Math.round(1400 * scale);
const MAX = Math.round(3000 * scale);

const cuts = [0];
let forced = 0;
let at = 0;

while (meta.height - at > MAX) {
  const lo = at + MIN;
  const hi = at + MAX;
  let best = null;
  for (const [a, b] of runs) {
    const mid = Math.round((a + b) / 2);
    if (mid < lo || mid > hi) continue;
    /* longest gap wins, with a nudge towards the far end so pieces do not
       all come out at the minimum */
    const score = (b - a) * 3 + (mid - lo) / 60;
    if (!best || score > best.score) best = { y: mid, score, len: b - a + 1 };
  }
  if (best) {
    at = best.y;
  } else {
    console.warn(`  nothing quiet between ${Math.round(lo / scale)} and ${Math.round(hi / scale)} (design px) - forcing a cut`);
    at = hi;
    forced++;
  }
  cuts.push(at);
}

/*
  The tail joins the piece above it rather than becoming a runt.

  The walk stops when what is left is under MAX, which can leave a few
  hundred pixels as a piece of its own - a 3kb file and a network round
  trip for a sliver of the closing frame.
*/
if (cuts.length > 1 && meta.height - cuts[cuts.length - 1] < MIN) cuts.pop();
cuts.push(meta.height);

await rm(DIR, { recursive: true, force: true });
await mkdir(DIR, { recursive: true });

const out = [];
for (let i = 0; i < cuts.length - 1; i++) {
  const top = cuts[i];
  const height = cuts[i + 1] - top;
  const name = `s${String(i).padStart(2, "0")}`;
  const info2 = await sharp(src, { limitInputPixels: false })
    .extract({ left: 0, top, width: meta.width, height })
    .resize({ width: WIDTH })
    .webp({ quality: 82 })
    .toFile(`${DIR}/${name}.webp`);
  out.push({
    file: `${name}.webp`,
    cutAt: Math.round(top / scale),
    written: `${info2.width}x${info2.height}`,
    kb: Math.round(info2.size / 1024),
  });
}

console.table(out);
const covered = cuts[cuts.length - 1] - cuts[0];
console.log(forced ? `${forced} cut(s) had to be forced through content` : "every cut landed in a gap");
console.log(
  `${out.length} pieces, ${out.reduce((n, o) => n + o.kb, 0)}kb total, covering ${covered} of ${meta.height} source rows`,
);
if (covered !== meta.height) {
  console.error("the pieces do not cover the whole board");
  process.exit(1);
}
