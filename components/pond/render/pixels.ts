// Low-level pixel drawing. Everything snaps to the virtual-pixel grid so nothing
// shimmers, and the primitives stay allocation-free for the render hot path.

import { mix } from "./color";

type Ctx = CanvasRenderingContext2D;

export const fillRect = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
};

export const px = (ctx: Ctx, x: number, y: number, color: string): void => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, 1);
};

export const hline = (
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  color: string
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, Math.max(1, len | 0), 1);
};

export const vline = (
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  color: string
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, Math.max(1, len | 0));
};

/** Filled circle on the pixel grid (midpoint fill by horizontal spans). */
export const disc = (
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string
): void => {
  ctx.fillStyle = color;
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    ctx.fillRect((cx - dx) | 0, (cy + dy) | 0, dx * 2 + 1, 1);
  }
};

/** Filled ellipse on the pixel grid, by horizontal spans. */
export const fillEllipse = (
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string
): void => {
  if (rx < 0.5 || ry < 0.5) return;
  ctx.fillStyle = color;
  const ry2 = ry * ry;
  for (let dy = -ry; dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ry2)));
    ctx.fillRect((cx - dx) | 0, (cy + dy) | 0, dx * 2 + 1, 1);
  }
};

/** One-pixel-thick circle outline — used for expanding ripples later. */
export const ring = (
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string
): void => {
  if (r < 1) return;
  ctx.fillStyle = color;
  const seg = Math.max(8, Math.round(r * 4));
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    ctx.fillRect((cx + Math.cos(a) * r) | 0, (cy + Math.sin(a) * r) | 0, 1, 1);
  }
};

/**
 * Vertical gradient rendered one pixel-row at a time, interpolating between the
 * given colour stops. At the low internal resolution each row is a chunky
 * upscaled band, so it still reads as pixel art — but the smooth interpolation
 * avoids the harsh two-colour stripes a hard snap would give. `stops` are
 * [offset0..1, hexColor].
 */
export const bandGradient = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: ReadonlyArray<readonly [number, string]>
): void => {
  for (let row = 0; row < h; row++) {
    const tt = h <= 1 ? 0 : row / (h - 1);
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (tt >= stops[s][0] && tt <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const k = (tt - lo[0]) / span;
    ctx.fillStyle = mix(lo[1], hi[1], k);
    ctx.fillRect(x | 0, (y + row) | 0, w | 0, 1);
  }
};
