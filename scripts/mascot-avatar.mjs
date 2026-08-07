/*
  Crop the mascot down to a profile picture.

  The source is a 2021px square with the figure sitting low and small in
  frame — dropped into a 34px chip as-is it reads as a beige blob, because
  most of what survives the downscale is hoodie.

  The crop is measured, not eyeballed: the alpha channel gives the figure's
  real bounds, and the head's own horizontal extent is measured across the
  band just below the hair line rather than assumed to be centred (it is
  not — the pose leans). The square is then anchored on the head with a
  little air above and enough below to keep the shoulders reading.
*/
import sharp from "sharp";

const SRC = "public/cricket/mascot.png";
const OUT = "public/cricket/mascot.webp";
const SIZE = 320;

const img = sharp(SRC);
const { width: W, height: H } = await img.metadata();
const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const A = (x, y) => data[(y * W + x) * 4 + 3];
const rowHas = (y) => {
  for (let x = 0; x < W; x += 2) if (A(x, y) > 24) return true;
  return false;
};

/* the figure's vertical extent */
let top = 0;
while (top < H && !rowHas(top)) top++;
let bottom = H - 1;
while (bottom > top && !rowHas(bottom)) bottom--;
const figH = bottom - top;

/* the head's horizontal extent, measured a fifth of the way down the
   figure — below the hair's flyaway spikes, above the shoulders */
const probe = Math.round(top + figH * 0.2);
let hl = 0;
while (hl < W && A(hl, probe) <= 24) hl++;
let hr = W - 1;
while (hr > hl && A(hr, probe) <= 24) hr--;
const headCx = (hl + hr) / 2;

/* a square about the head: the face runs roughly 0.36 of the figure's
   height, and the crop takes a bit more so the chip is not all chin */
const side = Math.round(figH * 0.46);
let left = Math.round(headCx - side / 2);
let topCrop = Math.round(top - side * 0.06);

/* never sample outside the canvas */
left = Math.max(0, Math.min(W - side, left));
topCrop = Math.max(0, Math.min(H - side, topCrop));

await sharp(SRC)
  .extract({ left, top: topCrop, width: side, height: side })
  .resize(SIZE, SIZE, { fit: "cover" })
  .webp({ quality: 90 })
  .toFile(OUT);

console.log(JSON.stringify({
  source: { W, H },
  figure: { top, bottom, height: figH },
  head: { left: hl, right: hr, centre: Math.round(headCx), probeRow: probe },
  crop: { left, top: topCrop, side },
  out: `${OUT} @ ${SIZE}px`,
}, null, 2));
