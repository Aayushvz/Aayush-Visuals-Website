/*
  Converts the cut sprite PNGs to WebP.

  These are the game's whole art payload and they are pathological for PNG:
  186 frames of soft-shaded character art with an alpha channel. PNG stores
  that losslessly with a palette it cannot exploit, which is why a 100x200
  figure costs 50KB.

  Quality is chosen per file rather than fixed. Lossy WebP is dramatically
  smaller, but it does one thing badly that matters here — it can fringe the
  alpha edge, and every one of these sprites is a cut-out sitting on grass
  where a halo shows. So each frame is encoded both ways and the lossless
  copy is kept whenever lossy is not meaningfully smaller, which lets the
  simple flat-shaded frames go lossy and keeps the ones with fine edge
  detail exact.

  Run with --dry to see the numbers without touching anything.
*/

import sharp from "sharp";
import { readdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "public", "cricket");
const DRY = process.argv.includes("--dry");

/* q=92 is where character art stops showing banding in the shaded areas.
   Below about 85 the jersey gradients posterise. */
const QUALITY = 92;
/* keep the lossless copy unless lossy saves at least this much — a 5%
   saving is not worth any risk of an alpha fringe */
const WORTH_IT = 0.25;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".png")) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
let pngTotal = 0;
let webpTotal = 0;
let lossyCount = 0;

for (const f of files) {
  const src = await readFile(f);
  pngTotal += src.length;

  const [lossy, lossless] = await Promise.all([
    sharp(src).webp({ quality: QUALITY, alphaQuality: 100, effort: 6 }).toBuffer(),
    sharp(src).webp({ lossless: true, effort: 6 }).toBuffer(),
  ]);

  const useLossy = lossy.length < lossless.length * (1 - WORTH_IT);
  const chosen = useLossy ? lossy : lossless;
  if (useLossy) lossyCount++;
  webpTotal += chosen.length;

  if (!DRY) {
    await writeFile(f.replace(/\.png$/, ".webp"), chosen);
    await unlink(f);
  }
}

const pct = (1 - webpTotal / pngTotal) * 100;
console.log(
  `${files.length} frames\n` +
    `  PNG   ${(pngTotal / 1024 / 1024).toFixed(2)} MB\n` +
    `  WebP  ${(webpTotal / 1024 / 1024).toFixed(2)} MB   (${pct.toFixed(1)}% smaller)\n` +
    `  ${lossyCount} lossy, ${files.length - lossyCount} lossless` +
    (DRY ? "\n  (dry run — nothing written)" : "")
);
