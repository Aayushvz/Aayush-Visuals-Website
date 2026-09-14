/*
  The Layover case-study board, one file per section.

  The board is Figma frame 222:6942, 1600x22434 - far past WebP's
  16383px-per-side limit, so it could never have been one file. But the
  format is not the reason it is twelve: it is that nobody should download
  twenty-two thousand pixels of case study to read the first screen of it.
  Each piece is lazy, so a reader fetches the section they have scrolled to
  and nothing else.

  The pieces are the board's OWN sections. Figma lists twelve contiguous
  child frames whose heights sum to exactly 22434, so no piece ever
  straddles a boundary: a reader waiting on an image is waiting on one
  section of the argument, not on the bottom half of a sentence.

  Each is exported separately at 2x rather than cut out of one big raster,
  because a whole-frame export cannot be 2x. Figma clamps any export to
  32768px on its long side, so "2x" of a 22434-tall frame comes back as
  2338x32768 - 1.46x, and short of the width we want. Exported one section
  at a time nothing comes near the clamp and every piece is a true 3200px.

  Output is 2400 wide: the board runs full-bleed, so it is displayed at the
  window's own width, and 2400 covers a 1440 window at 1.67x without
  serving a 3200px file to do it. Downscaled from 3200, never up.

  Usage: node scripts/layover-board.mjs <dir-of-2x-section-pngs>
*/
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { writePiece, summarise } from "./lib/board-encode.mjs";

const DIR = "public/projects/layover/board";
const WIDTH = 2400;
const SOURCE_SCALE = 2;

/* Figma frame 222:6942's children, in order, with the heights it reports in
   design pixels. The export of each should be exactly twice this. */
const SECTIONS = [
  ["00-cover", 1350, "00 — COVER"],
  ["01-problem", 1708, "01 — THE PROBLEM"],
  ["02-insight", 1180, "02 — THE INSIGHT"],
  ["03-prep-time", 1377, "03 — PREP TIME"],
  ["04-traveller", 4091, "04 — THE TRAVELLER"],
  ["05-counter", 3806, "05 — THE COUNTER"],
  ["06-onboarding", 1474, "06 — ONBOARDING"],
  ["07-operator", 2754, "07 — THE OPERATOR"],
  ["08-brand", 2066, "08 — BRAND"],
  ["09-explorations", 1171, "09 — EXPLORATIONS"],
  ["10-reflection", 893, "10 — REFLECTION"],
  ["11-close", 564, "11 — CLOSE"],
];

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/layover-board.mjs <dir-of-2x-section-pngs>");
  process.exit(1);
}

await mkdir(DIR, { recursive: true });

const out = [];
let bad = 0;

for (const [name, h, label] of SECTIONS) {
  const file = `${src}/${name}.png`;
  const meta = await sharp(file, { limitInputPixels: false }).metadata();

  /* the export has to actually be the section it claims to be, at the scale
     it claims to be: a silently clamped or mis-selected node would
     otherwise stack into the board without anyone noticing */
  if (meta.height !== h * SOURCE_SCALE) {
    console.error(
      `  ${name}: expected ${h * SOURCE_SCALE}px tall at ${SOURCE_SCALE}x, got ${meta.height}`,
    );
    bad++;
  }

  const info = await writePiece(
    () => sharp(file, { limitInputPixels: false }).resize({ width: WIDTH }),
    `${DIR}/${name}`,
  );

  out.push({
    file: name,
    source: `${meta.width}x${meta.height}`,
    written: `${info.width}x${info.height}`,
    avifKb: info.avifKb,
    webpKb: info.webpKb,
    section: label,
  });
}

console.table(out);
console.log(summarise(out) + " — and lazy, so a reader downloads the sections they reach");
if (bad) {
  console.error(`${bad} piece(s) were not the size Figma reports for that frame`);
  process.exit(1);
}
