/*
  The Mike Tyson stills: strip the Webflow designer chrome, then WebP them.

  These were captured out of the Webflow designer rather than off the live
  site, so every one of them carries furniture that is not the design: a
  "Project not Connected" pill bottom-left, a "Made in Webflow" badge
  bottom-right, and on some frames a "1.00" zoom chip top-left. Shipping
  those to a portfolio is shipping somebody else's UI inside your case study.

  The bottom band is DETECTED rather than assumed. Sixteen of the seventeen
  wide captures carry the badges and one does not — it was cropped before it
  reached me — and a blind crop would have quietly eaten 52px of real design
  off that one frame. The badge is a white box on pages that are otherwise
  near-black, so mean brightness in the bottom-right corner separates the two
  cases cleanly with nothing to tune.

  The side inset is uniform, because it is not a detection problem: 100px
  either edge is flat dark canvas gutter on every wide capture, and taking it
  symmetrically removes the zoom chip without leaving the frame visibly
  off-centre.

  `ticket design.png` is portrait artwork rather than a browser capture, so
  it is passed through with none of the above applied.
*/
import sharp from "sharp";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

/*
  Sources are outside the repo. Pass the folder as the first argument:

    node scripts/mike-tyson-stills.mjs "$USERPROFILE/OneDrive/Pictures/Screenshots"

  That is where these were captured — note Pictures is redirected to OneDrive
  on this machine, so C:\Users\<you>\Pictures is empty and looking there will
  wrongly suggest the originals are gone.
*/
const SRC = process.argv[2] ?? "public/projects/mike tyson";
const OUT = "public/projects/mike-tyson";
const MAX_W = 1600;

/* source file -> the name the case study will ask for. Explicit, for the
   same reason the video script is: "homepage -date reveal ui.png" has a
   space before the hyphen and cannot survive being slugged. */
const NAMES = {
  "hero.png": "home-hero",
  "hero (2).png": "home-hero-alt",
  "Screenshot 2026-08-08 120012.png": "home-hero-cursor",
  "navbar.png": "navbar",
  "homepage - about mti.png": "home-about",
  "homepage -date reveal ui.png": "home-date-reveal",
  "homepage - live stream.png": "home-live-stream",
  "homepage -event details.png": "home-event-details",
  "homepage - highlights.png": "home-highlights",
  "homepage - footer.png": "home-footer",
  "about page.png": "about-page",
  "vision page.png": "vision",
  "dates of event.png": "event-dates",
  "ticket design.png": "ticket-design",
  "donation page.png": "donation",
  "fighter registration page hero.png": "registration-hero",
  "registration form.png": "registration-form",
  "sponsorship packages.png": "sponsorship-packages",
};

/* the badge row, and the inset that clears the zoom chip */
const BADGE_H = 52;
const SIDE = 100;
/* a capture, rather than a piece of artwork */
const WIDE = 1800;

/*
  Is there a "Made in Webflow" badge sitting in the bottom-right?

  It is white-on-blue over a near-black page, so its corner averages far
  brighter than the same corner of a clean frame. 70 on 0-255 sits well
  above the darkest real content that has appeared there (a lit footer rule
  measures in the twenties) and well below the badge itself.
*/
async function hasBadge(file, w, h) {
  const box = {
    left: Math.max(0, w - 230),
    top: Math.max(0, h - BADGE_H),
    width: Math.min(210, w),
    height: Math.min(BADGE_H - 4, h),
  };
  /*
    Materialise the crop before measuring it.

    `sharp(file).extract(box).stats()` reads clean and does not work:
    stats() measures the INPUT image, not the pipeline, so every region of
    every frame came back with byte-identical means and the detector said
    "no badge" seventeen times in a row. Round-tripping through a buffer is
    what makes the crop real.
  */
  const cropped = await sharp(file).extract(box).toBuffer();
  const { channels } = await sharp(cropped).stats();
  const mean = channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
  return mean > 70;
}

await mkdir(OUT, { recursive: true });

const found = await readdir(SRC);
const missing = Object.keys(NAMES).filter((f) => !found.includes(f));
if (missing.length) {
  throw new Error(`Named in NAMES but not on disk:\n  ${missing.join("\n  ")}`);
}

let before = 0;
let after = 0;

for (const [file, name] of Object.entries(NAMES)) {
  const from = path.join(SRC, file);
  const to = path.join(OUT, `${name}.webp`);

  const srcBytes = (await stat(from)).size;
  before += srcBytes;

  const { width: w, height: h } = await sharp(from).metadata();
  let pipe = sharp(from);
  let note = "artwork, untouched";

  if (w >= WIDE) {
    const badge = await hasBadge(from, w, h);
    const box = {
      left: SIDE,
      top: 0,
      width: w - SIDE * 2,
      height: h - (badge ? BADGE_H : 0),
    };
    pipe = pipe.extract(box);
    note = badge ? "chrome cropped" : "no badge, sides only";
  }

  await pipe.resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 82 }).toFile(to);

  const outBytes = (await stat(to)).size;
  after += outBytes;
  const kb = (b) => `${Math.round(b / 1024)}KB`;
  console.log(`${name.padEnd(24)} ${kb(srcBytes).padStart(7)} -> ${kb(outBytes).padStart(7)}  (${note})`);
}

const mb = (b) => (b / 1048576).toFixed(1);
console.log(`\ntotal ${mb(before)}MB -> ${mb(after)}MB`);
