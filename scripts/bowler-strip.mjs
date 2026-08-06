/*
  Renders the delivery cycle as a filmstrip, using the SAME maths the canvas
  renderer uses.

  A contact sheet of the nine frames proves they exist. This proves they
  animate: the perspective growth and the foot anchoring are applied here
  exactly as paintBowlerSprite applies them, so if the bowler is going to
  slide sideways at the bound or pop in scale at the release, it shows up
  in this strip rather than in the game.
*/

import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TEAM = process.argv[2] || "panthers";
const REPO = path.resolve(import.meta.dirname, "..");
const DIR = path.join(REPO, "public", "cricket", TEAM, "bowler");

/* mirrors scene.ts */
const CYCLE = [
  { at: 0.0, pose: "start" },
  { at: 0.08, pose: "runup" },
  { at: 0.26, pose: "accelerate" },
  { at: 0.42, pose: "bound" },
  { at: 0.54, pose: "plant" },
  { at: 0.64, pose: "rotate" },
  { at: 0.72, pose: "release" },
  { at: 0.82, pose: "follow" },
  { at: 0.92, pose: "recover" },
];

const meta = JSON.parse(
  await readFile(path.join(REPO, "components", "cricket", "bowlerSprites.ts"), "utf8")
    .then((s) => {
      const body = s.slice(s.indexOf("BOWLER_FRAMES"), s.indexOf("];", s.indexOf("BOWLER_FRAMES")));
      const out = {};
      for (const m of body.matchAll(/(\w+):\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+),\s*ax:\s*([\d.]+)\s*\}/g)) {
        out[m[1]] = { w: +m[2], h: +m[3], ax: +m[4] };
      }
      return JSON.stringify(out);
    })
);

const IDLE_H = 196; /* the reference pose height from the module */

/* a stage roughly the shape of the game's canvas region the bowler occupies */
const CELL_W = 150;
const H = 900; /* pretend canvas height, matching the game's backing store */
const STRIP_H = 260;

const layers = [];
const labels = [];

for (let i = 0; i < CYCLE.length; i++) {
  const { at, pose } = CYCLE[i];
  const m = meta[pose];
  if (!m) throw new Error(`no metadata for ${pose}`);

  const grow = 0.72 + at * 0.46;
  const targetH = H * 0.15 * grow;
  const scale = targetH / IDLE_H;
  const dw = Math.max(1, Math.round(m.w * scale));
  const dh = Math.max(1, Math.round(m.h * scale));

  const buf = await sharp(path.join(DIR, `${pose}.png`)).resize(dw, dh).png().toBuffer();

  /* the cell's own centre stands in for the crease line, so a frame whose
     anchor is off-centre visibly leans away from it */
  const creaseX = i * CELL_W + CELL_W / 2;
  const baseY = STRIP_H - 40 + Math.round(at * 26); /* the travel down-screen */

  layers.push({
    input: buf,
    left: Math.round(creaseX - m.ax * dw),
    top: Math.round(baseY - dh),
  });

  labels.push(
    `<line x1="${creaseX}" y1="0" x2="${creaseX}" y2="${STRIP_H}" stroke="#3d4657" stroke-width="1" stroke-dasharray="3 4"/>
     <line x1="${i * CELL_W}" y1="${baseY}" x2="${(i + 1) * CELL_W}" y2="${baseY}" stroke="#9fe870" stroke-width="1" opacity="0.5"/>
     <text x="${i * CELL_W + 6}" y="14" font-family="monospace" font-size="11" fill="#9fe870">${pose}</text>
     <text x="${i * CELL_W + 6}" y="27" font-family="monospace" font-size="10" fill="#7b8496">t=${at.toFixed(2)} ${dw}x${dh}</text>
     <line x1="${(i + 1) * CELL_W}" y1="0" x2="${(i + 1) * CELL_W}" y2="${STRIP_H}" stroke="#2a2f3a" stroke-width="1"/>`
  );
}

const W = CYCLE.length * CELL_W;
layers.push({
  input: Buffer.from(`<svg width="${W}" height="${STRIP_H}" xmlns="http://www.w3.org/2000/svg">${labels.join("")}</svg>`),
  top: 0,
  left: 0,
});

const out = path.join(
  process.env.TEMP || "/tmp",
  `bowler-strip-${TEAM}.png`
);
await sharp({ create: { width: W, height: STRIP_H, channels: 4, background: "#191d25" } })
  .composite(layers)
  .png()
  .toFile(out);

console.log(out);
