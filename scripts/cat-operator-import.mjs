/*
  One-off importer for the CAT Operator Assistant case study.
  Every source is a full-screen browser capture (1917x1078), so each one is
  cropped to the app itself (no tab bar, no Windows taskbar), converted to
  WebP and written into public/projects/cat-operator-assistant/.
  Run: node scripts/cat-operator-import.mjs
*/
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = "C:\\Users\\aayus\\Downloads\\images";
const OUT_DIR = "public/projects/cat-operator-assistant";
const APP = { left: 0, top: 110, width: 1917, height: 908 };

// [source timestamp, output filename]
const JOBS = [
  ["105016", "home-fault.webp"],
  ["105029", "home-telemetry.webp"],
  ["105057", "home-wait.webp"],
  ["105111", "tasks-today.webp"],
  ["105122", "tasks-jobtime.webp"],
  ["105131", "tasks-accuracy.webp"],
  ["105143", "safety.webp"],
  ["105153", "learn-controls.webp"],
  ["105207", "learn-videos-a.webp"],
  ["105222", "learn-videos-b.webp"],
  ["105232", "learn-habits-b.webp"],
  ["105239", "learn-habits-a.webp"],
  ["105249", "machine-health.webp"],
  ["105255", "machine-parts.webp"],
  ["105303", "profile.webp"],
  ["105310", "settings.webp"],
  ["105324", "sos-sent.webp"],
  ["105331", "moving-lock.webp"],
  ["105343", "fleet-a.webp"],
  ["105355", "fleet-b.webp"],
  ["105406", "night-mode.webp"],
  ["105432", "signin-who.webp"],
  ["105441", "signin-pin.webp"],
  ["105456", "signin-belt.webp"],
  ["105510", "loader-splash.webp"],
];

const COVER_SRC = "C:\\Users\\aayus\\Downloads\\cat dashboard cover image.png";
const COVER_OUT = "public/projects/cat-operator-assistant-cover.webp";

/* the folder is regenerated whole, so a renamed screen never leaves its old
   file behind */
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let before = 0;
let after = 0;
for (const [stamp, outName] of JOBS) {
  const src = path.join(SRC_DIR, `Screenshot 2026-09-24 ${stamp}.png`);
  const buf = fs.readFileSync(src);
  before += buf.length;
  const data = await sharp(buf)
    .extract(APP)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  after += data.length;
  fs.writeFileSync(path.join(OUT_DIR, outName), data);
  console.log(`${(buf.length / 1024).toFixed(0).padStart(5)}KB -> ${(data.length / 1024).toFixed(0).padStart(4)}KB   ${outName}`);
}

const cover = await sharp(fs.readFileSync(COVER_SRC))
  .resize({ width: 1400, withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toBuffer();
fs.writeFileSync(COVER_OUT, cover);

console.log(`\nTOTAL: ${(before / 1048576).toFixed(2)}MB -> ${(after / 1048576).toFixed(2)}MB`);
