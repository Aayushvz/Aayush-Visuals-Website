/*
  Convert the Mike Tyson screen recordings to WebM, and cut a poster for each.

  The recordings arrive as 1920x870 MP4 straight out of the capture tool —
  142MB across six files, which is not a thing you put on a web page. They
  are browser-viewport captures of mostly-static UI, which is the best case
  VP9 has: long runs of identical pixels between the moments where something
  actually scrolls.

  Names are mapped explicitly rather than derived. The sources are called
  things like "Mike Tyson Fighter Registration pagee.mp4" — a typo, a
  capital, a trailing space — and slugging that automatically produces a name
  that changes the day somebody renames the file. The map is the contract:
  the case study references `fighter-registration.webm` and this file is
  where that promise is kept.

  Every clip is silent by design. They play muted and looping on the page, so
  the audio track is bytes nobody will ever hear (-an).

  Each clip also gets a WebP poster from one second in. Frame zero of a
  screen recording is usually a half-painted page or a white flash, and the
  poster is what the reader looks at until the loop is decoded and the
  element scrolls into view — on this page most readers never see anything
  else, because a clip only starts once it is on screen.
*/
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);

/*
  The sources are NOT in the repo, deliberately — 142MB of MP4 under public/
  would be served. They live wherever the captures were saved; pass the
  folder as the first argument:

    node scripts/mike-tyson-webm.mjs "C:/Users/<you>/Downloads"

  The recordings were last seen in Downloads, and the matching stills in
  OneDrive\Pictures\Screenshots (Pictures is redirected to OneDrive on this
  machine, which is worth knowing before concluding a file is gone).
*/
const SRC = process.argv[2] ?? "public/projects/mike tyson";
const OUT = "public/projects/mike-tyson";

/* source file -> the name the case study will ask for */
const NAMES = {
  "mike tyson homepage .mp4": "homepage",
  "mike tyson about page.mp4": "about",
  "mike tyson Tickets page.mp4": "tickets",
  "Mike tyson sponsorship page.mp4": "sponsorship",
  "Mike Tyson Fighter Registration pagee.mp4": "fighter-registration",
  "mike tyson donation page.mp4": "donation",
};

/*
  1280 wide, which is half a retina column on this page and the width the
  browser mockup renders at. The sources are 1920: keeping that would triple
  the pixel count to serve a frame nobody sees at native size.

  CRF 36 is higher than you would use on camera footage and correct here.
  Flat UI has no grain for the encoder to spend bits on, and the artefacts
  CRF punishes first — banding in gradients, mush in fast motion — are not
  what these clips are made of. `-cpu-used 2` is the slow-but-not-absurd end
  of VP9: roughly twice the encode time of the default for a meaningful drop
  in size, which is the right trade for something encoded once and served
  forever.

  `-row-mt 1` puts the tile rows on separate threads. Without it VP9 uses
  about one core and this script takes the afternoon.
*/
const VIDEO = [
  "-vf", "scale=1280:-2",
  "-c:v", "libvpx-vp9",
  "-crf", "36",
  "-b:v", "0",
  "-row-mt", "1",
  "-cpu-used", "2",
  "-deadline", "good",
  /* a keyframe every two seconds: the loop restarts constantly, and a long
     GOP means the first frame after a wrap is decoded from a long way back */
  "-g", "60",
  "-an",
];

await mkdir(OUT, { recursive: true });

const found = (await readdir(SRC)).filter((f) => f.endsWith(".mp4"));
const missing = Object.keys(NAMES).filter((f) => !found.includes(f));
if (missing.length) {
  /* fail loudly rather than silently shipping a case study with holes: a
     renamed source should stop the build, not produce a page with five
     clips and no explanation for the sixth */
  throw new Error(`These sources are named in NAMES but not on disk:\n  ${missing.join("\n  ")}`);
}
const extra = found.filter((f) => !NAMES[f]);
if (extra.length) console.warn(`! not converted (no name mapped): ${extra.join(", ")}`);

let before = 0;
let after = 0;

for (const [file, name] of Object.entries(NAMES)) {
  const from = path.join(SRC, file);
  const webm = path.join(OUT, `${name}.webm`);
  const poster = path.join(OUT, `${name}-poster.webp`);

  const srcBytes = (await stat(from)).size;
  before += srcBytes;

  process.stdout.write(`${name} … `);
  const t0 = Date.now();

  await run(ffmpeg, ["-y", "-i", from, ...VIDEO, webm], { maxBuffer: 1 << 26 });
  await run(ffmpeg, [
    "-y", "-ss", "1", "-i", from,
    "-frames:v", "1",
    "-vf", "scale=1280:-2",
    "-quality", "82",
    poster,
  ], { maxBuffer: 1 << 26 });

  const outBytes = (await stat(webm)).size;
  after += outBytes;

  const mb = (b) => (b / 1048576).toFixed(1);
  console.log(
    `${mb(srcBytes)}MB -> ${mb(outBytes)}MB ` +
    `(${Math.round((1 - outBytes / srcBytes) * 100)}% off, ${Math.round((Date.now() - t0) / 1000)}s)`
  );
}

const mb = (b) => (b / 1048576).toFixed(1);
console.log(`\ntotal ${mb(before)}MB -> ${mb(after)}MB`);
