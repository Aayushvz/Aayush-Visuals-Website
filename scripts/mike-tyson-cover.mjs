/*
  Convert the Mike Tyson card cover to WebM, and cut its poster.

  This is the loop on the project CARD, not the clips inside the case study
  (those are scripts/mike-tyson-webm.mjs). Two files come out and both are
  named in projectData.ts:

    public/projects/mike-tyson-bg.webm      bgVideoUrl, the loop
    public/projects/mike-tyson-poster.webp  cover, and the video's poster

  The source is a 2800x2180 H.264 master, ~22MB. Nothing about that belongs
  on a page: the card renders a few hundred pixels wide, so the master is
  roughly nine times the pixels anyone sees and eighty times the bytes.

  960 wide is the size the existing asset shipped at and the size the card
  frame draws at on a retina screen. The source is 2800x2180 (DAR 140:109),
  so 960 lands on 748 and the poster keeps the dimensions already recorded
  in components/projects/imageDims.ts. If you re-encode at a different
  width, update that file too or the card will reserve the wrong box and
  shift on load.

  20fps, down from the source's 24. This plays muted and looping behind a
  card as texture, not as footage anyone reads frame by frame, and a sixth
  of the frames is a sixth of the bytes for something nobody will catch.

  The clip is silent by design (-an): it plays muted, so an audio track is
  bytes nobody can ever hear.

  Usage:
    node scripts/mike-tyson-cover.mjs "C:/Users/<you>/Downloads/<file>.mp4"
*/
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);

const SRC = process.argv[2];
if (!SRC) throw new Error("Pass the source video: node scripts/mike-tyson-cover.mjs <file.mp4>");

const WEBM = "public/projects/mike-tyson-bg.webm";
const POSTER = "public/projects/mike-tyson-poster.webp";

/*
  CRF 33 rather than the 36 the case-study clips use. Those are screen
  recordings of flat UI, which is the best case VP9 has. This one is a
  composed cover with motion and gradients across the whole frame, and at 36
  the gradients band visibly. 33 is roughly a third more bytes for a card
  that is one of the first things on the page.

  -row-mt 1 puts tile rows on separate threads; without it VP9 uses about one
  core. -cpu-used 2 is the slow-but-not-absurd end: about twice the encode
  time for a real drop in size, which is the right trade for something
  encoded once and served forever.

  -g 40 is a keyframe every two seconds at 20fps. The loop restarts
  constantly, and a long GOP means the first frame after a wrap has to be
  decoded from a long way back.
*/
const VIDEO = [
  "-vf", "fps=20,scale=960:-2",
  "-c:v", "libvpx-vp9",
  "-crf", "33",
  "-b:v", "0",
  "-row-mt", "1",
  "-cpu-used", "2",
  "-deadline", "good",
  "-g", "40",
  "-an",
];

const mb = (b) => (b / 1048576).toFixed(2);
const srcBytes = (await stat(SRC)).size;

process.stdout.write(`encoding ${mb(srcBytes)}MB … `);
const t0 = Date.now();
await run(ffmpeg, ["-y", "-i", SRC, ...VIDEO, WEBM], { maxBuffer: 1 << 26 });
const outBytes = (await stat(WEBM)).size;
console.log(
  `${mb(outBytes)}MB (${Math.round((1 - outBytes / srcBytes) * 100)}% off, ` +
  `${Math.round((Date.now() - t0) / 1000)}s)`
);

/*
  The poster is what fills the card until the loop has decoded, and it is
  also `cover` — the still used wherever the card is rendered without motion
  (reduced motion, the /work list). Frame zero of a rendered cover is often a
  fade-in from black, so take it a second in.
*/
await run(ffmpeg, [
  "-y", "-ss", "1", "-i", SRC,
  "-frames:v", "1",
  "-vf", "scale=960:-2",
  "-quality", "82",
  POSTER,
], { maxBuffer: 1 << 26 });

console.log(`poster ${mb((await stat(POSTER)).size)}MB -> ${POSTER}`);
