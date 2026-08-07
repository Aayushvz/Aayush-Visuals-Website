/*
  Convert the Futurepreneurs case-study exports to WebP.

  The frames come out of Figma at 2x PNG — 3MB apiece for the mockup
  sections, which is fine as a master and absurd to serve. Capped at 1600px
  wide because that is what the other case studies use and what the page
  layout tops out at; anything past it is bytes nobody sees.

  Re-runnable: it skips a PNG whose WebP is already newer, so adding one
  more export does not re-encode the set.
*/
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIR = "public/projects/futurepreneurs";
const MAX_W = 1600;

const files = (await readdir(DIR)).filter((f) => f.endsWith(".png"));
const out = [];

for (const f of files) {
  const src = path.join(DIR, f);
  const dst = src.replace(/\.png$/, ".webp");

  const fresh = await stat(dst).then((d) => d.mtimeMs, () => 0);
  const srcT = (await stat(src)).mtimeMs;
  if (fresh > srcT) {
    out.push({ file: f, skipped: true });
    continue;
  }

  const meta = await sharp(src).metadata();
  const info = await sharp(src)
    .resize({ width: Math.min(MAX_W, meta.width), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(dst);

  out.push({
    file: path.basename(dst),
    from: `${meta.width}x${meta.height}`,
    to: `${info.width}x${info.height}`,
    kb: Math.round(info.size / 1024),
  });
}

console.table(out);
