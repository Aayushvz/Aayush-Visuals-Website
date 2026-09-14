/*
  Divide a case-study board into sections that can load one at a time.

  Some boards arrive as a stack of labelled section frames and can simply be
  exported one frame at a time - Layover's does, and scripts/layover-board
  reads its boundaries straight out of the file. This is for the others: a
  single flat canvas of overlapping elements, with no children to export and
  no boundary list anywhere. Meal Maestro's and IP&TT Cell's are both that.

  The cuts have to be found in the picture instead. A row with no edge
  anywhere along it has nothing crossing it - no text, no card, no mockup -
  so cutting there cannot split a sentence or slice a phone in half. The
  test is the biggest step between neighbouring samples rather than the
  row's total range, because total range rejects a row crossing a
  full-width gradient band, and a gradient is the safest thing there is to
  cut through.

  Cuts are chosen by walking down rather than by dividing up: once a piece
  is tall enough, take the next good gap, and force one only if the piece
  would otherwise grow past the maximum. Evenly spaced targets ask for a cut
  at a fixed height and take whatever is nearest, which fails wherever a
  stretch of board has no gap within reach.

  Why cut at all: nobody should download a whole case study to read the
  first screen of it. Every piece is lazy, so a reader fetches the sections
  they reach.

  Usage:
    node scripts/board-sections.mjs <exported-png> <project> <design-width>

  Example:
    node scripts/board-sections.mjs board.png meal-maestro 1920
*/
import sharp from "sharp";
import { mkdir, rm } from "node:fs/promises";
import { writePiece, summarise } from "./lib/board-encode.mjs";

const WIDTH = 2400;
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

const [, , src, project, designWidth] = process.argv;
if (!src || !project || !designWidth) {
  console.error("usage: node scripts/board-sections.mjs <exported-png> <project> <design-width>");
  process.exit(1);
}
const DIR = `public/projects/${project}/board`;
const DESIGN_W = Number(designWidth);

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
  const info2 = await writePiece(
    () =>
      sharp(src, { limitInputPixels: false })
        .extract({ left: 0, top, width: meta.width, height })
        .resize({ width: WIDTH }),
    `${DIR}/${name}`,
  );
  out.push({
    file: name,
    cutAt: Math.round(top / scale),
    written: `${info2.width}x${info2.height}`,
    avifKb: info2.avifKb,
    webpKb: info2.webpKb,
  });
}

console.table(out);
const covered = cuts[cuts.length - 1] - cuts[0];
console.log(forced ? `${forced} cut(s) had to be forced through content` : "every cut landed in a gap");
console.log(`${summarise(out)}, covering ${covered} of ${meta.height} source rows`);
if (covered !== meta.height) {
  console.error("the pieces do not cover the whole board");
  process.exit(1);
}
