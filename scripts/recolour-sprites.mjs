/*
  Produces a second team's kit from the first team's sprites.

  The alternative was asking for every pose to be redrawn in blue — 58
  frames, twice the art, and two sets that drift apart the moment either is
  touched up. A measured hue remap gets the same result from one source of
  truth.

  It works here because the palettes do not overlap. A hue histogram of the
  cut sprites (scripts/probe-hue.mjs) shows three populations:

    240-300   the kit          35-45% of opaque pixels
     10-50    skin and the bat 10-20%
     any      near-grey        28-51%  (blacks, whites, pads, shoes)

  Only the first band is touched. Skin is nowhere near it, and everything
  desaturated is skipped outright, which is what protects the whites in the
  shoes, the ball, the jersey lettering and the grey trousers — a blanket
  hue-rotate filter would tint all of those and turn the player's face blue.

  The remap is a compression, not a rotation. Rotating -47 degrees would
  send the darkest kit shadows to cyan and leave the highlights violet. This
  maps the whole purple span onto the narrower blue span, so the shading
  stays coherent and the kit reads as one colour.
*/

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];

if (!SRC || !OUT) {
  console.error("usage: node scripts/recolour-sprites.mjs <src-dir> <out-dir>");
  process.exit(1);
}

/*
  The two kits' hue bands. Panthers purple was measured off the cut sprites;
  Falcons blue is read from the kit sheet — #1D4ED8 (224), #2563EB (221),
  #3B82F6 (217), #60A5FA (213).

  Direction matters because the sheets did not all arrive in the same kit:
  the bowler and fielder were drawn in purple, the wicketkeeper in blue. So
  this runs both ways, and `--to=` says which kit is being produced.
*/
const PANTHERS = [235, 305];
const FALCONS = [201, 231];

const TARGET = (process.argv.find((a) => a.startsWith("--to=")) || "--to=falcons")
  .split("=")[1];
if (TARGET !== "falcons" && TARGET !== "panthers") {
  console.error(`--to must be "falcons" or "panthers", got "${TARGET}"`);
  process.exit(1);
}
const FROM = TARGET === "falcons" ? PANTHERS : FALCONS;
const TO = TARGET === "falcons" ? FALCONS : PANTHERS;

/*
  The Falcons kit is a brighter, cleaner blue than the Panthers' near-black
  purple, so going that way carries a small lift and coming back undoes it.
  Kept modest — pushed further and the shadows flatten and the figure loses
  its form.
*/
const SAT_GAIN = TARGET === "falcons" ? 1.09 : 1 / 1.09;
const LUM_GAIN = TARGET === "falcons" ? 1.07 : 1 / 1.07;
/* below this there is no meaningful hue to move, and touching it would tint
   the greys */
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
    if (s < SAT_FLOOR || h < FROM[0] || h > FROM[1]) continue;

    const k = (h - FROM[0]) / (FROM[1] - FROM[0]);
    const nh = TO[0] + k * (TO[1] - TO[0]);
    const [r, g, b] = hslToRgb(
      nh,
      clamp(s * SAT_GAIN, 0, 1),
      clamp(l * LUM_GAIN, 0, 1)
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
  `${files.length} frames  ${path.basename(SRC)} -> ${path.basename(OUT)}  ` +
    `(${((touchedTotal / opaqueTotal) * 100).toFixed(1)}% of opaque pixels recoloured)`
);
