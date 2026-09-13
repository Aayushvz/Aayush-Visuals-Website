/*
  Replace a cropped case-study capture with a re-exported one.

  Four of Mike Tyson's captures were cropped at the left after they were
  taken: every intact capture in that project has exactly 94px of left
  gutter and those four have 0-3px, which is the site's own margin missing.
  No CSS can put it back, so the files themselves have to be replaced.

  This takes whatever comes out of a screenshot tool - png, jpg, anything
  sharp reads - normalises it to the width the other captures use, writes
  the webp, and then checks the result actually has its gutter back rather
  than assuming it does.

  Usage:
    node scripts/replace-capture.mjs <source> <target-name> [--width 1600]

  Example:
    node scripts/replace-capture.mjs ~/Downloads/hero.png home-hero.webp
*/
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DIR = "public/projects/mike-tyson";
const [, , src, name, ...rest] = process.argv;

if (!src || !name) {
  console.error("usage: node scripts/replace-capture.mjs <source> <target.webp> [--width 1600]");
  process.exit(1);
}

const widthArg = rest.indexOf("--width");
const WIDTH = widthArg >= 0 ? Number(rest[widthArg + 1]) : 1600;
const out = path.join(DIR, name);

/* the same measurement used to find the problem: walk in from each edge
   until a bright pixel appears. An intact capture of this site has ~94px of
   dark gutter on the left; a cropped one has none. */
async function gutters(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const bright = (x, y) => {
    const i = (y * info.width + x) * ch;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 140;
  };
  const colLit = (x) => {
    for (let y = 0; y < info.height; y += 3) if (bright(x, y)) return true;
    return false;
  };
  let left = 0;
  while (left < info.width / 2 && !colLit(left)) left++;
  let right = 0;
  while (right < info.width / 2 && !colLit(info.width - 1 - right)) right++;
  return { width, height, left, right };
}

const before = await gutters(src).catch(() => null);

await sharp(src)
  .resize({ width: WIDTH, withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile(out);

const after = await gutters(out);

console.log(`wrote ${out}`);
console.log(`  source gutters : left ${before?.left ?? "?"}  right ${before?.right ?? "?"}`);
console.log(`  written        : ${after.width}x${after.height}, left ${after.left}, right ${after.right}`);
console.log(
  after.left >= 8
    ? "  OK - the left gutter is present, so nothing is cut off this side"
    : "  STILL CROPPED - the source itself has no left margin; re-take it with the full window",
);
console.log(`\nnow update IMAGE_DIMS: "/projects/mike-tyson/${name}": [${after.width}, ${after.height}],`);
