// Owns the canvas and the low-resolution backing store. Everything draws into
// a small internal buffer (chunky "virtual pixels"); the browser upscales it
// with nearest-neighbour, which is what gives us crisp, authentic pixel art and
// keeps the fill-rate tiny on slow hardware.

import { clamp } from "../anim/math";

export interface RendererOptions {
  /** Preferred internal height in virtual pixels — drives pixel chunkiness. */
  targetHeight?: number;
  /**
   * Fewest virtual pixels the buffer may be across. The pond is a wide
   * diorama, and sizing the pixel purely off height means a portrait phone
   * gets a very narrow buffer — at 375x812 the original picked a 4px pixel
   * and left 94 virtual pixels of width, which crops the scene down to a
   * close-up of the frog with the hills and most of the pond off-screen.
   * Letting width veto the choice keeps the whole composition on screen.
   */
  minWidth?: number;
  minPixelSize?: number;
  maxPixelSize?: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Internal buffer size in virtual pixels. */
  width = 0;
  height = 0;
  /** Device pixels per virtual pixel (the CSS upscale factor). */
  pixelSize = 1;

  private readonly targetHeight: number;
  private readonly minWidth: number;
  private readonly minPx: number;
  private readonly maxPx: number;
  private onResizeCbs: Array<(w: number, h: number) => void> = [];

  constructor(canvas: HTMLCanvasElement, opts: RendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    this.targetHeight = opts.targetHeight ?? 232;
    this.minWidth = opts.minWidth ?? 300;
    this.minPx = opts.minPixelSize ?? 2;
    this.maxPx = opts.maxPixelSize ?? 6;

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  onResize(cb: (w: number, h: number) => void): void {
    this.onResizeCbs.push(cb);
  }

  /** Hand the window listener back. See Game.destroy(). */
  destroy(): void {
    window.removeEventListener("resize", this.resize);
    this.onResizeCbs = [];
  }

  private resize = (): void => {
    const winW = Math.max(1, window.innerWidth);
    const winH = Math.max(1, window.innerHeight);

    // Choose a virtual pixel size so the internal height lands near target,
    // but never so large that the buffer ends up narrower than the scene needs.
    // On a landscape window height decides, as it always did; on a portrait
    // phone width is the binding constraint and takes over.
    const byHeight = Math.round(winH / this.targetHeight);
    const byWidth = Math.floor(winW / this.minWidth);
    const px = clamp(Math.min(byHeight, byWidth), this.minPx, this.maxPx);
    this.pixelSize = px;
    this.width = Math.max(1, Math.ceil(winW / px));
    this.height = Math.max(1, Math.ceil(winH / px));

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // CSS scales the small buffer up to fill the whole window.
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = "top";

    for (const cb of this.onResizeCbs) cb(this.width, this.height);
  };

  /** Blank the buffer to a solid colour before composing a frame. */
  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
