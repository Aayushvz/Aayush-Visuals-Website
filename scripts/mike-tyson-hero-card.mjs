/*
  Convert the Mike Tyson hero-card still to WebP.

  This is the card that floats in the homepage hero drag canvas (CARDS in
  components/Hero.tsx), not the project card's cover — that one is
  public/projects/mike-tyson-poster.webp and comes out of
  scripts/mike-tyson-cover.mjs. They are the same mockup shot but not the
  same frame: the poster is a 960x748 crop crimped to the card box, and this
  one is the wider 1374x874 composition with the whole pile of gloves in it.
  Keeping them separate means re-cutting the project cover can never quietly
  change what the hero is holding.

    public/projects/mike-tyson-hero-card.webp

  The source is cropped before it is scaled. The 1374x874 master frames the
  laptop small inside a lot of backdrop, which is fine at poster size and
  useless on a card a hundred pixels wide — the screen it exists to show is
  the first thing that disappears. CROP takes it to 1212x777, the same shot
  with the dead grey at the top and right taken off, which puts the laptop
  across most of the frame. 1212:777 is also what Hero.tsx sizes the card to
  (244x156); change one and change the other or object-fit re-crops it.

  760 wide is deliberate. The hero card draws under 250px CSS at any
  viewport — around 124px at 1512 once the world's --spread scale is applied —
  so 760 is comfortably past 2x for a retina screen and still a fraction of
  the source.

  Usage:
    node scripts/mike-tyson-hero-card.mjs "C:/Users/<you>/Downloads/<file>.png"
*/
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);

const SRC = process.argv[2];
if (!SRC) {
  throw new Error("Pass the source image: node scripts/mike-tyson-hero-card.mjs <file.png>");
}

const OUT = "public/projects/mike-tyson-hero-card.webp";

/* w:h:x:y against the 1374x874 master. Derived by matching two fixed points
   on the laptop between the master and the tighter reference — the base's
   bottom-left corner and the screen's top-right — which came out the same
   distance apart in both, so the reference is a straight crop of this file
   rather than a re-render. */
const CROP = "1212:777:98:35";

const kb = (b) => (b / 1024).toFixed(0);
const srcBytes = (await stat(SRC)).size;

/* 84 rather than the cover's 82: this frame is mostly a smooth grey backdrop
   and black leather, and both band before anything else does. */
await run(
  ffmpeg,
  ["-y", "-i", SRC, "-vf", `crop=${CROP},scale=760:-2`, "-quality", "84", OUT],
  { maxBuffer: 1 << 26 }
);

const outBytes = (await stat(OUT)).size;
console.log(
  `${kb(srcBytes)}KB -> ${kb(outBytes)}KB ` +
  `(${Math.round((1 - outBytes / srcBytes) * 100)}% off) -> ${OUT}`
);
