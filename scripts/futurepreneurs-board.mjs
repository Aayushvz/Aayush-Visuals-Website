/*
  The Futurepreneurs Behance board, as one file.

  Exported from Figma at 2x (frame 2008:331, 1925x12354 on the canvas, so
  3850x24709 of PNG and 29MB of it) and brought down to the 1600px the rest
  of this project's captures use. Nothing is cropped, nothing is rearranged:
  the board is the deliverable and it ships whole.

  It fits in a single WebP, which is the only reason this is not a strip.
  The format tops out at 16383px a side and 1600 wide puts this at 10,269
  tall - Meal Maestro's case study needed 18 slices at 22,306. Worth
  re-checking if the board ever grows.

  Usage: node scripts/futurepreneurs-board.mjs <exported-png>
*/
import sharp from "sharp";
import { writePiece } from "./lib/board-encode.mjs";

const WIDTH = 1600;
const LIMIT = 16383;
/* no extension: writePiece appends .avif and .webp */
const OUT = "public/projects/futurepreneurs/board";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/futurepreneurs-board.mjs <exported-png>");
  process.exit(1);
}

const meta = await sharp(src, { limitInputPixels: false }).metadata();
const height = Math.round((meta.height / meta.width) * WIDTH);
console.log(`source ${meta.width}x${meta.height} -> ${WIDTH}x${height}`);

if (height > LIMIT) {
  console.error(`${height}px exceeds WebP's ${LIMIT}px limit - this needs slicing into a strip`);
  process.exit(1);
}

const info = await writePiece(
  () => sharp(src, { limitInputPixels: false }).resize({ width: WIDTH }),
  OUT,
);

console.log(
  `wrote ${OUT}.avif and ${OUT}.webp  ${info.width}x${info.height}  ` +
    `AVIF ${info.avifKb}kb, WebP fallback ${info.webpKb}kb`,
);
