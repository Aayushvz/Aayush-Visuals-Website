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

/*
  The posters themselves, four-by-five, as they appear in the gallery.

  These are the work; the plates below are the same posters photographed
  in situ. The gallery holds nineteen of these - four of Breaking You and
  three each of the rest - and the file names give nothing away, so the
  mapping was read off the images.

  1200px because they are shown in a grid three across, not full-bleed: at
  a 1440 window that is about 350px a poster, so 1200 is already better
  than three times what a retina screen asks for.
*/
const POSTER_WIDTH = 1200;
const POSTERS = [
  ["breaking-you-1", "001", "Breaking You on red, the halftone headline breaking apart across the top"],
  ["breaking-you-2", "002", "Breaking You on white, the halftone mark in red"],
  ["breaking-you-3", "003", "Breaking You on black, the halftone mark in red"],
  ["breaking-you-4", "004", "Breaking You on white, the halftone mark in black"],
  ["cursed-1", "005", "Cursed, a figure pressing a hand through fogged glass"],
  ["cursed-2", "006", "Cursed set small in red on white, reading even the mirror feels unfamiliar now"],
  ["cursed-3", "007", "Cursed set in white on deep red"],
  ["shattered-1", "008", "Shattered Bonds, Stitch the Silence, on white with two figures pulling a thread"],
  ["shattered-2", "009", "Shattered Bonds, Stitch the Silence, on red"],
  ["shattered-3", "010", "Shattered Bonds, Stitch the Silence, on pale grey"],
  ["sukoon-1", "011", "Sukoon in English over Hindi, two glowing figures on a horizon"],
  ["sukoon-2", "012", "Sukoon in English, the figures against a dark sky"],
  ["sukoon-3", "013", "Sukoon set in Hindi, the figures against a dark sky"],
  ["reciprocate-1", "014", "Reciprocate on red, a figure standing with head bowed"],
  ["reciprocate-2", "015", "Reciprocate on white, the figure in black"],
  ["reciprocate-3", "016", "Reciprocate on black, the figure in red"],
  ["peace-1", "017", "Long For Peace on blue, a tulip opening across the sheet"],
  ["peace-2", "018", "Long For Peace, the bloom filling the frame"],
  ["peace-3", "019", "Long For Peace laid among real flowers"],
];

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
for (const [name, prefix, what] of POSTERS) {
  const file = find(prefix);
  const meta = await sharp(file, { limitInputPixels: false }).metadata();
  const info = await writePiece(
    () =>
      sharp(file, { limitInputPixels: false }).resize({
        width: POSTER_WIDTH,
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
    shows: what.slice(0, 40),
  });
}

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
