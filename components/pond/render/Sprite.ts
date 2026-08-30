// Hand-authored pixel sprites. A sprite is written as a grid of characters, each
// mapped to a palette colour (space = transparent). We bake it once into an
// offscreen canvas, then blit it every frame — the readable data stays in the
// source, the runtime cost is a single drawImage.

import { parseHex } from "./color";

export type Palette = Record<string, string | null | undefined>;

export interface DrawOpts {
  flipX?: boolean;
  /** Multiplied into the current context alpha. */
  alpha?: number;
}

export class Sprite {
  readonly w: number;
  readonly h: number;
  private readonly base: HTMLCanvasElement;
  private flipped?: HTMLCanvasElement;

  private constructor(base: HTMLCanvasElement) {
    this.base = base;
    this.w = base.width;
    this.h = base.height;
  }

  /** Compile a character grid + palette into a baked sprite. */
  static from(rows: readonly string[], palette: Palette): Sprite {
    const h = rows.length;
    let w = 0;
    for (const r of rows) if (r.length > w) w = r.length;
    w = Math.max(1, w);

    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext("2d")!;
    const img = cx.createImageData(w, h);
    const d = img.data;

    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const hex = palette[ch];
        if (!hex) continue; // undefined / null / '' → transparent
        const { r, g, b, a } = parseHex(hex);
        const i = (y * w + x) * 4;
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = a;
      }
    }
    cx.putImageData(img, 0, 0);
    return new Sprite(cv);
  }

  private getFlipped(): HTMLCanvasElement {
    if (this.flipped) return this.flipped;
    const cv = document.createElement("canvas");
    cv.width = this.w;
    cv.height = this.h;
    const cx = cv.getContext("2d")!;
    cx.translate(this.w, 0);
    cx.scale(-1, 1);
    cx.drawImage(this.base, 0, 0);
    this.flipped = cv;
    return cv;
  }

  /** Draw with the top-left corner at (x,y). */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, opts?: DrawOpts): void {
    const src = opts?.flipX ? this.getFlipped() : this.base;
    if (opts?.alpha != null && opts.alpha < 1) {
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = prev * opts.alpha;
      ctx.drawImage(src, Math.round(x), Math.round(y));
      ctx.globalAlpha = prev;
    } else {
      ctx.drawImage(src, Math.round(x), Math.round(y));
    }
  }

  /** Draw centred on (cx,cy). */
  drawCentered(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    opts?: DrawOpts
  ): void {
    this.draw(ctx, cx - this.w / 2, cy - this.h / 2, opts);
  }
}
