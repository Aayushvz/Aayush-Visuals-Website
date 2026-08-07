/*
  Convert the Posterfolio set to WebP and give it stable names.

  The exports arrive as Behance hashes (05c24b230279421.688fb4803c60a.png),
  which are unusable in code: nothing about `1b8b46...` says which poster it
  is, and re-exporting one changes its name. They are renamed to a sorted
  sequence so the data file can reference poster-01..NN and stay readable.

  1200px wide because these are gallery tiles three to a row, not full-bleed
  hero art — at 158MB of source the ceiling is what matters, not the floor.
*/
import sharp from "sharp";
import { readdir, rename, unlink } from "node:fs/promises";
import path from "node:path";

const DIR = "public/projects/posterfolio";
const MAX_W = 1200;

const src = (await readdir(DIR))
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .sort();

let n = 0;
let before = 0;
let after = 0;

for (const f of src) {
  n += 1;
  const from = path.join(DIR, f);
  const name = `poster-${String(n).padStart(2, "0")}.webp`;
  const to = path.join(DIR, name);

  const meta = await sharp(from).metadata();
  const info = await sharp(from)
    .resize({ width: Math.min(MAX_W, meta.width), withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(to);

  before += meta.size ?? 0;
  after += info.size;
  await unlink(from);
  console.log(`${name}  ${meta.width}x${meta.height} -> ${info.width}x${info.height}  ${Math.round(info.size / 1024)}KB`);
}

console.log(`\n${n} posters, ${Math.round(after / 1024 / 1024 * 10) / 10}MB total`);
