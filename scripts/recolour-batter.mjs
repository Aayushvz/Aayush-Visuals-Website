/*
  Produces both teams' batter kits from the one batter sheet.

  This is the same idea as recolour-sprites.mjs and deliberately NOT the same
  numbers, which is why it is a separate file rather than a flag on that one.

  That script was tuned against the bowler and fielder sheets, whose kit
  occupies a broad, dark, desaturated band — median hue 219, saturation 0.37,
  luminance 0.16 for the Falcons. It compresses that wide span onto an
  equally wide target span, and it has to, or the shadows and the highlights
  land on different colours.

  The batter sheet is a different drawing. Its kit is a tight, bright,
  heavily saturated blue: hue runs 207-229 with a median of 225, saturation
  0.73, luminance 0.52. Feeding that through the bowler mapping sends the
  median to 291 and the player comes out magenta, because a 22-degree source
  band stretched across a 70-degree target band is not a compression at all.

  So the batter gets a rotation instead of a compression. The source span is
  narrow enough that every pixel in it lands inside the destination band
  without the ends fanning out, which is exactly the condition the other
  script cannot rely on.

  What is left alone is the same in both: skin and the bat sit at hue 20-40,
  nowhere near the kit, and anything below the saturation floor is skipped so
  the whites in the pads, gloves, shoes and the jersey lettering stay white.
*/

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];

if (!SRC || !OUT) {
  console.error("usage: node scripts/recolour-batter.mjs <src-dir> <out-dir> --to=<team>");
  process.exit(1);
}

const TARGET = (process.argv.find((a) => a.startsWith("--to=")) || "--to=panthers")
  .split("=")[1];
if (TARGET !== "falcons" && TARGET !== "panthers") {
  console.error(`--to must be "falcons" or "panthers", got "${TARGET}"`);
  process.exit(1);
}

/* the batter sheet's own kit band, measured off the twelve cut frames */
const SRC_MEDIAN = 225;

/*
  Where each side's kit actually sits, measured off that team's bowler frames
  rather than taken from the brand hex. The brand colour is one swatch; the
  sheet is a shaded drawing, and the median of what was painted is the honest
  target for matching a second character to it.
*/
const TEAM_MEDIAN = { panthers: 272, falcons: 219 };

/*
  The Panthers kit is a deeper violet than the batter sheet's bright blue.
  Held to a slight darkening only — pushed further and the flat cel shading
  the sheet is drawn in collapses into a single muddy tone.
*/
const LUM_GAIN = { panthers: 0.93, falcons: 1 };
const SAT_GAIN = { panthers: 1, falcons: 1 };

const SHIFT = TEAM_MEDIAN[TARGET] - SRC_MEDIAN;

/* the kit band, generous at both ends so the darkest shadow and the
   brightest rim light travel with the rest of the jersey */
const BAND = [196, 240];
/* below this there is no meaningful hue to move, and touching it would tint
   the greys and the jersey lettering */
const SAT_FLOOR = 0.16;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue(h + 1 / 3) * 255),
    Math.round(hue(h) * 255),
    Math.round(hue(h - 1 / 3) * 255),
  ];
}

const clamp = (n, a, b) => (n < a ? a : n > b ? b : n);

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));

let touchedTotal = 0;
let opaqueTotal = 0;

for (const f of files) {
  const { data, info } = await sharp(path.join(SRC, f))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let touched = 0;
  let opaque = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    opaque++;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < SAT_FLOOR || h < BAND[0] || h > BAND[1]) continue;

    const [r, g, b] = hslToRgb(
      h + SHIFT,
      clamp(s * SAT_GAIN[TARGET], 0, 1),
      clamp(l * LUM_GAIN[TARGET], 0, 1)
    );
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
    touched++;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, f));

  touchedTotal += touched;
  opaqueTotal += opaque;
}

console.log(
  `${files.length} frames  -> ${TARGET}  (hue ${SHIFT > 0 ? "+" : ""}${SHIFT}, ` +
    `${((touchedTotal / opaqueTotal) * 100).toFixed(1)}% of opaque pixels recoloured)`
);
