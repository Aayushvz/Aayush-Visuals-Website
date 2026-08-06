import sharp from "sharp";

const SRC = process.argv[2];
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => {
  const i = (y * W + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};

console.log(`${W}x${H}`);
console.log("corners:", px(0, 0), px(W - 1, 0), px(0, H - 1), px(W - 1, H - 1));
console.log("inset  :", px(6, 6), px(W - 7, 6), px(6, H - 7), px(W - 7, H - 7));

/* the true background is whatever colour dominates the image */
const hist = new Map();
for (let y = 0; y < H; y += 2) {
  for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4;
    /* quantise to 8 levels per channel so near-identical greys group */
    const k = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
}
const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
const total = (W / 2) * (H / 2);
console.log("\nmost common colours (quantised, x8):");
for (const [k, n] of top) {
  const [r, g, b] = k.split(",").map((v) => Number(v) * 8);
  console.log(`  rgb(${r},${g},${b})  ${((n / total) * 100).toFixed(1)}%`);
}

/* horizontal slice through the middle of the first figure row */
const y = Math.floor(H * 0.2);
let runs = [];
let cur = null;
for (let x = 0; x < W; x++) {
  const [r, g, b] = px(x, y);
  const light = r > 195 && g > 195 && b > 195 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
  if (!cur || cur.light !== light) {
    cur = { light, from: x, to: x };
    runs.push(cur);
  } else cur.to = x;
}
console.log(`\nrow y=${y}: ${runs.length} runs; non-light spans (candidate figures):`);
console.log(
  runs.filter((r) => !r.light && r.to - r.from > 20).map((r) => `${r.from}-${r.to}`).join("  ")
);
