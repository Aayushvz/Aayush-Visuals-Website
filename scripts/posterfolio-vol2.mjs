/*
  The Posterfolio Vol 2 plates.

  Not a board: this project is laid out as a page rather than shown as an
  exported deck, so the posters come in as individual plates that the
  PosterVolume renderer places full-bleed between its text blocks.

  Source is the Behance gallery export, whose filenames are hashes with the
  same SEO phrase repeated across all of them, so the mapping from file to
  poster lives here and nowhere else. It was read off the images, not
  guessed from the order.

  Usage: node scripts/posterfolio-vol2.mjs <behance-export-dir>
*/
import sharp from "sharp";
import { mkdir, rm } from "node:fs/promises";
import { writePiece, summarise } from "./lib/board-encode.mjs";

const DIR = "public/projects/posterfolio-vol2";
const WIDTH = 2400;

/* [output name, file prefix, what it shows] */
const PLATES = [
  ["breaking-you-single", "030", "one Breaking You poster on a dark ribbed wall"],
  ["breaking-you-street", "031", "three Breaking You posters in a street window"],
  ["cursed-room", "032", "Cursed in a dark room beside two vases"],
  ["cursed-print", "035", "Cursed as a print, lit on red"],
  ["shattered-print", "036", "Shattered Bonds as a booklet on red"],
  ["shattered-desk", "039", "Shattered Bonds framed on a desk"],
  ["sukoon-jungle", "033", "Sukoon standing in wet jungle"],
  ["reciprocate-wall", "037", "four Reciprocate posters along a curved wall"],
  ["peace-night", "038", "Long For Peace as a lightbox at night"],
  ["all-plates", "034", "the whole set laid out together"],
];

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/posterfolio-vol2.mjs <behance-export-dir>");
  process.exit(1);
}

const { readdir } = await import("node:fs/promises");
const files = await readdir(src);
const find = (p) => {
  const hits = files.filter((f) => f.startsWith(p + "-"));
  if (hits.length !== 1) {
    console.error(`${p}: expected one file, found ${hits.length}`);
    process.exit(1);
  }
  return `${src}/${hits[0]}`;
};

await rm(DIR, { recursive: true, force: true });
await mkdir(DIR, { recursive: true });

const out = [];
for (const [name, prefix, what] of PLATES) {
  const file = find(prefix);
  const meta = await sharp(file, { limitInputPixels: false }).metadata();
  const info = await writePiece(
    () =>
      sharp(file, { limitInputPixels: false }).resize({
        width: WIDTH,
        withoutEnlargement: true,
      }),
    `${DIR}/${name}`,
  );
  out.push({
    file: name,
    from: prefix,
    source: `${meta.width}x${meta.height}`,
    written: `${info.width}x${info.height}`,
    avifKb: info.avifKb,
    webpKb: info.webpKb,
    shows: what,
  });
}

console.table(out);
console.log(summarise(out));
