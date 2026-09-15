/*
  Pull a project cover from Behance at full resolution.

  Behance shows a cover at 808x632 and nothing larger: every other size
  token on that CDN path 404s. But `original` serves the file as uploaded -
  4096px and up - and the cover is a CROP of it, with the crop written into
  the filename. `Y3JvcCwzNDU1LDI3MDIsMCww` is base64 for "crop,3455,2702,0,0",
  which is width, height, x, y in the original's own pixels. So the 808 image
  is reproducible at any size: take the original, apply that rectangle, scale.

  That matters because a cover is the biggest thing in a case study's first
  screen - the hero renders it at up to 1100 CSS px - and 808px of source
  would be under 1x there before a retina screen asked for anything.

  The crop is then PROVEN rather than trusted: the script downscales its own
  crop to 808x632 and measures it against the 808 Behance actually serves.
  A mis-read rectangle would still produce a plausible-looking image of
  exactly the right shape, and nothing downstream could catch it, so it is
  checked here against the only reference that exists.

  Usage: node scripts/behance-cover.mjs <hash.token.ext> <out-name> [width]
*/
import sharp from "sharp";

const CDN = "https://mir-s3-cdn-cf.behance.net/projects";
const DIR = "public/projects";
const DEFAULT_WIDTH = 1600;
/* what Behance serves, and so what the crop is checked against */
const REF = [808, 632];
/* Compared through a blur, because the question is whether the RECTANGLE is
   right, not whether sharp's resampler agrees with Behance's. Measured
   sharp, a correct crop of a dense poster collage reads 28 dB - the two
   downscalers simply disagree about high-frequency detail - while a wrong
   rectangle and a correct one are indistinguishable at that number. Blurred,
   resampling noise disappears and only geometry is left: a correct crop
   lands in the 40s, a rectangle off by so much as a poster falls to single
   digits. */
const BLUR = 3;
const MIN_PSNR = 34;

const [, , file, name, widthArg] = process.argv;
if (!file || !name) {
  console.error("usage: node scripts/behance-cover.mjs <hash.token.ext> <out-name> [width]");
  process.exit(1);
}
const WIDTH = Number(widthArg || DEFAULT_WIDTH);

/* the middle segment of the filename, e.g. hash.<token>.png */
const token = file.split(".")[1];
const decoded = Buffer.from(token, "base64").toString("utf8");
const m = /^crop,(\d+),(\d+),(\d+),(\d+)$/.exec(decoded);
if (!m) {
  console.error(`cannot read a crop out of "${decoded}"`);
  process.exit(1);
}
const [, cw, ch, cx, cy] = m.map(Number);

const get = async (size) => {
  const res = await fetch(`${CDN}/${size}/${file}`);
  if (!res.ok) throw new Error(`${size}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const [original, reference] = await Promise.all([get("original"), get("max_808")]);
const meta = await sharp(original, { limitInputPixels: false }).metadata();

/* an upload smaller than its own crop rectangle is possible - Behance
   re-encodes some originals - so the rectangle is clamped rather than
   assumed to fit, and the clamp is reported */
const left = Math.min(cx, meta.width - 1);
const top = Math.min(cy, meta.height - 1);
const width = Math.min(cw, meta.width - left);
const height = Math.min(ch, meta.height - top);
const clamped = width !== cw || height !== ch;

const crop = () =>
  sharp(original, { limitInputPixels: false }).extract({ left, top, width, height });

/* both sides forced to three channels in the same space: a PNG that decodes
   RGBA against a WebP that decodes RGB walks out of phase after one pixel
   and reads as total destruction */
const flat = (pipe) =>
  pipe.blur(BLUR).removeAlpha().toColourspace("srgb").raw().toBuffer();
const [mine, theirs] = await Promise.all([
  flat(crop().resize({ width: REF[0], height: REF[1], fit: "fill" })),
  flat(sharp(reference).resize({ width: REF[0], height: REF[1], fit: "fill" })),
]);
let sum = 0;
for (let i = 0; i < mine.length; i++) {
  const d = mine[i] - theirs[i];
  sum += d * d;
}
const psnr = 10 * Math.log10(255 * 255 / (sum / mine.length));

const out = `${DIR}/${name}.webp`;
const info = await crop()
  .resize({ width: WIDTH, withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toFile(out);

console.log(`original   ${meta.width}x${meta.height}`);
console.log(`crop       ${width}x${height} at ${left},${top}${clamped ? `  (clamped from ${cw}x${ch})` : ""}`);
console.log(`matches    ${psnr.toFixed(1)} dB against the 808 Behance serves`);
console.log(`wrote      ${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)}kb`);

if (psnr < MIN_PSNR) {
  console.error(`\nthat is not the same picture - the crop is wrong, nothing was verified`);
  process.exit(1);
}
