/*
  Builds a labelled contact sheet from a directory of cut frames.

  This exists purely to check the cut by eye. The cutter reports numbers —
  34 boxes, these sizes, at these coordinates — and numbers cannot tell you
  that box 12 is a yorker and box 13 is a slower ball, or that box 22 lost
  an arm. Rendering every frame at a readable size with its index stamped on
  it makes the mapping from index to pose a thing you can read off rather
  than infer.

  Checkerboard behind each cell, so a frame that kept a grey rectangle of
  background instead of going transparent is immediately obvious.
*/

import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = process.argv[2];
const OUT = process.argv[3];
const COLS = Number(process.argv[4] || 9);
const CELL = Number(process.argv[5] || 168);

if (!DIR || !OUT) {
  console.error("usage: node scripts/contact-sheet.mjs <frame-dir> <out.png> [cols] [cell]");
  process.exit(1);
}

const files = (await readdir(DIR))
  .filter((f) => f.endsWith(".png"))
  .sort();

const rows = Math.ceil(files.length / COLS);
const LABEL = 20;
const CH = CELL + LABEL;
const W = COLS * CELL;
const H = rows * CH;

/* checkerboard, drawn once and tiled by the composite below */
const checker = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <pattern id="c" width="16" height="16" patternUnits="userSpaceOnUse">
         <rect width="16" height="16" fill="#2a2d34"/>
         <rect width="8" height="8" fill="#343841"/>
         <rect x="8" y="8" width="8" height="8" fill="#343841"/>
       </pattern>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#c)"/>
   </svg>`
);

const layers = [{ input: checker, top: 0, left: 0 }];
const labels = [];

for (let i = 0; i < files.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const buf = await readFile(path.join(DIR, files[i]));
  const m = await sharp(buf).metadata();

  /* fit inside the cell without upscaling past 1:1 — a 60px frame blown up
     to 168 would look smoother than it is and hide edge artefacts */
  const scale = Math.min(1, (CELL - 16) / m.width, (CELL - 16) / m.height);
  const w = Math.max(1, Math.round(m.width * scale));
  const h = Math.max(1, Math.round(m.height * scale));
  const resized = await sharp(buf).resize(w, h).png().toBuffer();

  layers.push({
    input: resized,
    left: col * CELL + Math.round((CELL - w) / 2),
    top: row * CH + LABEL + Math.round((CELL - LABEL - h) / 2) + 8,
  });

  labels.push(
    `<rect x="${col * CELL}" y="${row * CH}" width="${CELL}" height="${LABEL}" fill="#111318"/>
     <text x="${col * CELL + 6}" y="${row * CH + 14}" font-family="monospace" font-size="12" fill="#9fe870">${i}</text>
     <text x="${col * CELL + 30}" y="${row * CH + 14}" font-family="monospace" font-size="11" fill="#8b93a7">${m.width}x${m.height}</text>
     <rect x="${col * CELL}" y="${row * CH}" width="${CELL}" height="${CH}" fill="none" stroke="#4b515e" stroke-width="1"/>`
  );
}

layers.push({
  input: Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${labels.join("")}</svg>`
  ),
  top: 0,
  left: 0,
});

const out = await sharp({
  create: { width: W, height: H, channels: 4, background: "#1b1e24" },
})
  .composite(layers)
  .png()
  .toBuffer();

await writeFile(OUT, out);
console.log(`${files.length} frames -> ${OUT}  (${W}x${H}, ${COLS} cols)`);
