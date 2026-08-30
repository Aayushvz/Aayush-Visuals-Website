// Base for backdrops that don't animate (sky, mountains, bamboo). They paint
// themselves once into an offscreen buffer and then blit it every frame — so a
// slow machine spends almost nothing redrawing the distant scenery. The buffer
// repaints only when the window resizes or the scene explicitly invalidates it.

import type { SceneElement } from "../engine/types";
import type { World } from "../engine/World";

class OffscreenBuffer {
  readonly canvas = document.createElement("canvas");
  readonly ctx = this.canvas.getContext("2d")!;
  private w = -1;
  private h = -1;

  /** Size the buffer; returns true if it changed (and so must repaint). */
  fit(w: number, h: number): boolean {
    if (this.w === w && this.h === h) return false;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
    return true;
  }
}

export abstract class StaticLayer implements SceneElement {
  private readonly buf = new OffscreenBuffer();
  private dirty = true;

  /** Called by the Scene on resize so the backdrop repaints at the new size. */
  relayout(): void {
    this.dirty = true;
  }

  render(world: World): void {
    const resized = this.buf.fit(world.width, world.height);
    if (resized || this.dirty) {
      this.buf.ctx.clearRect(0, 0, world.width, world.height);
      this.paint(this.buf.ctx, world);
      this.dirty = false;
    }
    world.ctx.drawImage(this.buf.canvas, 0, 0);
  }

  /** Subclasses paint the backdrop into the offscreen context. */
  protected abstract paint(cx: CanvasRenderingContext2D, world: World): void;
}
