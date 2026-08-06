import sharp from "sharp";

/* Hue histogram of the opaque pixels in a sprite, so a recolour can target
   the kit and leave skin, whites and blacks alone. */

const SRC = process.argv[2];
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

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

const buckets = new Array(36).fill(0);
const desat = { grey: 0, total: 0 };
const bySat = new Map();

for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] < 128) continue;
  desat.total++;
  const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
  if (s < 0.16) { desat.grey++; continue; }
  buckets[Math.floor(h / 10) % 36]++;
  const k = Math.floor(h / 10) * 10;
  if (!bySat.has(k)) bySat.set(k, { n: 0, s: 0, l: 0 });
  const e = bySat.get(k);
  e.n++; e.s += s; e.l += l;
}

console.log(`${SRC.split(/[\\/]/).pop()}  ${desat.total} opaque px, ${((desat.grey / desat.total) * 100).toFixed(1)}% near-grey`);
console.log("hue     count   %     avg sat  avg lum");
[...bySat.entries()]
  .sort((a, b) => b[1].n - a[1].n)
  .slice(0, 10)
  .forEach(([h, e]) => {
    console.log(
      `${String(h).padStart(3)}-${String(h + 10).padEnd(3)} ${String(e.n).padStart(6)}  ${((e.n / desat.total) * 100).toFixed(1).padStart(4)}%  ` +
        `${(e.s / e.n).toFixed(2)}     ${(e.l / e.n).toFixed(2)}`
    );
  });
