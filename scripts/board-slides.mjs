/*
  Build a case-study board from slides that are already separate files.

  The other two board scripts solve a different problem. layover-board reads
  section frames out of a Figma file; board-sections hunts for quiet rows in
  one enormous raster. This one is for a board that arrives as what it
  already is: one export per slide, numbered.

  All it has to do is order them numerically, hold the order, and get the
  weight down. Numeric order matters more than it looks - a lexicographic
  sort puts slide 10 between 1 and 2, which silently reorders the argument
  and is exactly the kind of thing nobody notices until the page is live.

  Weight is the point of keeping them separate. Moon Store's twelve slides
  are 4x exports, 7680px wide and 50MB of PNG between them. At 2400 they
  cover a 1440 window at 1.67x, and because each piece is lazy a reader
  downloads the slides they scroll to rather than the whole deck.

  Usage:
    node scripts/board-slides.mjs <dir> <prefix> <project> <count>

  Example:
    node scripts/board-slides.mjs ~/Downloads behance_img_ moon-store 12
*/
import sharp from "sharp";
import { mkdir, rm, stat } from "node:fs/promises";

const WIDTH = 2400;

const [, , dir, prefix, project, countArg] = process.argv;
if (!dir || !prefix || !project || !countArg) {
  console.error("usage: node scripts/board-slides.mjs <dir> <prefix> <project> <count>");
  process.exit(1);
}

const COUNT = Number(countArg);
const DIR = `public/projects/${project}/board`;

/* numeric, not lexicographic: 1..12, never 1, 10, 11, 12, 2 */
const slides = Array.from({ length: COUNT }, (_, i) => ({
  n: i + 1,
  src: `${dir}/${prefix}${i + 1}.png`,
}));

for (const s of slides) {
  await stat(s.src).catch(() => {
    console.error(`missing: ${s.src}`);
    process.exit(1);
  });
}

await rm(DIR, { recursive: true, force: true });
await mkdir(DIR, { recursive: true });

const out = [];
for (const s of slides) {
  const meta = await sharp(s.src, { limitInputPixels: false }).metadata();
  const name = `s${String(s.n - 1).padStart(2, "0")}`;
  const info = await sharp(s.src, { limitInputPixels: false })
    /* withoutEnlargement, because a slide exported smaller than the rest
       should stay its own size rather than be upscaled to match */
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`${DIR}/${name}.webp`);
  out.push({
    slide: s.n,
    file: `${name}.webp`,
    source: `${meta.width}x${meta.height}`,
    written: `${info.width}x${info.height}`,
    kb: Math.round(info.size / 1024),
  });
}

console.table(out);
const total = out.reduce((n, o) => n + o.kb, 0);
const widest = out.filter((o) => Number(o.written.split("x")[0]) < WIDTH);
console.log(`${out.length} slides, ${total}kb total - lazy, so a reader fetches the ones they reach`);
if (widest.length) {
  console.log(
    `note: ${widest.map((o) => o.file).join(", ")} came in under ${WIDTH}px and were left at source size`,
  );
}
