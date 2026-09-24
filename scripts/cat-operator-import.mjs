/*
  One-off importer for the CAT Operator Assistant case study.
  Converts the source screenshots to WebP, resized to a sane display width,
  and writes them into public/projects/cat-operator-assistant/.
  Run: node scripts/cat-operator-import.mjs
*/
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = "C:\\Users\\aayus\\cat-operator-assistant\\screenshots";
const OUT_DIR = "public/projects/cat-operator-assistant";

fs.mkdirSync(OUT_DIR, { recursive: true });

// [source filename, output filename, max width]
const JOBS = [
  ["01-signin-who.png", "signin-who.webp", 1600],
  ["02-signin-pin.png", "signin-pin.webp", 1600],
  ["03-signin-belt-off.png", "signin-belt-off.webp", 1600],
  ["04-signin-belt-on.png", "signin-belt-on.webp", 1600],
  [
    "C:\\Users\\aayus\\Downloads\\Screenshot 2026-09-24 105900.png",
    "home-parked.webp",
    1600,
    { left: 0, top: 110, width: 1917, height: 908 },
  ],
  // a full-screen browser capture: crop off the tab bar and the Windows taskbar
  [
    "C:\\Users\\aayus\\Downloads\\Screenshot 2026-09-24 105029.png",
    "home-both-panels.webp",
    1600,
    { left: 0, top: 110, width: 1917, height: 908 },
  ],
  ["26-home-show-parts.png", "home-show-parts.webp", 1600],
  ["11-loader-splash.png", "loader-splash.webp", 1600],
  ["14-tasks-today.png", "tasks-today.webp", 1600],
  ["15-tasks-jobtime.png", "tasks-jobtime.webp", 1600],
  ["16-safety-safety.png", "safety-safety.webp", 1600],
  ["17-safety-reports.png", "safety-reports.webp", 1600],
  ["18-learn-controls.png", "learn-controls.webp", 1600],
  ["19-learn-videos-a.png", "learn-videos-a.webp", 1600],
  ["19-learn-videos-b.png", "learn-videos-b.webp", 1600],
  ["20-learn-habits-a.png", "learn-habits-a.webp", 1600],
  ["20-learn-habits-b.png", "learn-habits-b.webp", 1600],
  ["21-machine-3d-a.png", "machine-3d-a.webp", 1600],
  ["21-machine-3d-b.png", "machine-3d-b.webp", 1600],
  ["25-fleet-a.png", "fleet-a.webp", 1600],
  ["25-fleet-b.png", "fleet-b.webp", 1600],
  ["23-profile.png", "profile.webp", 1600],
  ["24-settings.png", "settings.webp", 1600],
];

const COVER_SRC = "C:\\Users\\aayus\\Downloads\\cat dashboard cover image.png";
const COVER = [COVER_SRC, "public/projects/cat-operator-assistant-cover.webp", 1400];

let totalBefore = 0;
let totalAfter = 0;

for (const [srcName, outName, width, crop] of JOBS) {
  const src = path.isAbsolute(srcName) ? srcName : path.join(SRC_DIR, srcName);
  const out = path.join(OUT_DIR, outName);
  const buf = fs.readFileSync(src);
  totalBefore += buf.length;
  const img = sharp(buf);
  if (crop) img.extract(crop);
  const data = await img
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  totalAfter += data.length;
  fs.writeFileSync(out, data);
  console.log(`${(buf.length / 1024).toFixed(0).padStart(5)}KB -> ${(data.length / 1024).toFixed(0).padStart(4)}KB   ${out}`);
}

{
  const [src, outPath, width] = COVER;
  const buf = fs.readFileSync(src);
  const data = await sharp(buf)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  fs.writeFileSync(outPath, data);
  console.log(`cover -> ${outPath}`);
}

console.log(`\nTOTAL: ${(totalBefore / 1048576).toFixed(2)}MB -> ${(totalAfter / 1048576).toFixed(2)}MB`);
