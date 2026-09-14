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
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";

const WIDTH = 2400;

const [, , dir, prefix, project, countArg] = process.argv;
/* prefix may legitimately be "" - exports numbered 1.png..14.png with no
   stem at all are common, so it is checked for presence, not for truth */
if (!dir || prefix === undefined || !project || !countArg) {
  console.error("usage: node scripts/board-slides.mjs <dir> <prefix> <project> <count>");
  process.exit(1);
}

const COUNT = Number(countArg);
const DIR = `public/projects/${project}/board`;

/* One export set can mix formats - a set arrived as .jpg with a single
   .jpeg in the middle of it - so the extension is resolved per slide
   rather than assumed across the set. */
const EXT = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

/*
  And it refuses to guess when more than one matches.

  Two different boards were exported into the same folder under the same
  prefix, one as .png and the next as .jpg. Picking the first extension in
  the list built an entire project out of the previous project's slides,
  and every check downstream passed, because the pieces were real images of
  the right shape. A wrong board is not a broken board - nothing later in
  the pipeline can catch it, so it has to be caught here.
*/
const slides = Array.from({ length: COUNT }, (_, i) => {
  const n = i + 1;
  const hits = EXT.map((e) => `${dir}/${prefix}${n}${e}`).filter((p) => existsSync(p));
  if (!hits.length) {
    console.error(`missing: ${dir}/${prefix}${n} with any of ${EXT.join(" ")}`);
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`ambiguous: ${hits.length} files match slide ${n} -`);
    for (const h of hits) console.error(`  ${h}`);
    console.error("move the set you want into a folder of its own, or rename it");
    process.exit(1);
  }
  return { n, src: hits[0] };
});

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
