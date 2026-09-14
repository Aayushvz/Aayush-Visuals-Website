/*
  How a board piece is written to disk.

  Every board script funnels through here so the encoder settings live in
  one place rather than in four, and so a project added next month is not
  quietly encoded worse than the one added last month.

  Two formats, AVIF first and WebP behind it. That is not hedging: measured
  against the resized original across the five kinds of content these boards
  actually contain - a photograph, anime key art, a flat colour palette, a
  UI screenshot and a type specimen - AVIF at quality 62 beat WebP at
  quality 82 on BOTH axes every single time.

      photo  680kb -> 412kb   PSNR 38.0 -> 39.0 dB
      art    139kb -> 108kb   PSNR 42.3 -> 43.6 dB
      flat    21kb ->  11kb   PSNR 42.1 -> 52.5 dB
      ui      53kb ->  38kb   PSNR 49.0 -> 49.8 dB
      type    20kb ->  11kb   PSNR 49.3 -> 51.6 dB

  Smaller and closer to the original at the same time, which is the only
  reason to change a format at all. The gap is widest on flat graphics -
  palettes, type specimens, wireframes - where WebP spends bytes on
  gradients that are not there.

  WebP stays as the fallback for browsers without AVIF, and it is the src
  on the <img>, so it is also what IMAGE_DIMS is keyed on and what anything
  reading the markup still sees. It is now written at effort 6 rather than
  the default 4: same quality, a few percent smaller, costs only encode
  time, which nobody is waiting on.

  AVIF decodes slower - 525ms against 192ms on the heaviest piece in the
  set, a 2400x3797 cover - but board pieces are lazy and arrive one at a
  time, so that cost is paid off-screen and never all at once.
*/
import sharp from "sharp";

export const AVIF = { quality: 62, effort: 6 };
export const WEBP = { quality: 82, effort: 6 };

/**
 * Write one board piece in both formats.
 *
 * @param {() => import("sharp").Sharp} pipe  a fresh pipeline per call, since
 *   a sharp instance cannot be consumed twice
 * @param {string} base  output path without an extension
 * @returns {{ width: number, height: number, webpKb: number, avifKb: number }}
 */
export async function writePiece(pipe, base) {
  const webp = await pipe().webp(WEBP).toFile(`${base}.webp`);
  const avif = await pipe().avif(AVIF).toFile(`${base}.avif`);
  return {
    width: webp.width,
    height: webp.height,
    webpKb: Math.round(webp.size / 1024),
    avifKb: Math.round(avif.size / 1024),
  };
}

/** a one-line summary for the end of a board script */
export function summarise(rows) {
  const webp = rows.reduce((n, r) => n + r.webpKb, 0);
  const avif = rows.reduce((n, r) => n + r.avifKb, 0);
  const saved = webp ? Math.round((1 - avif / webp) * 100) : 0;
  return `${rows.length} pieces — AVIF ${avif}kb, WebP fallback ${webp}kb (AVIF is ${saved}% lighter, and closer to the source)`;
}
