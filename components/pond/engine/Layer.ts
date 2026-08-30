// A parallax layer: a named bucket of scene elements that all share a depth.
// On render it shifts by the camera offset scaled by its parallax factor, so
// far layers barely move and foreground leaves swing wide — independent motion
// per layer, as the brief asks.

import type { SceneElement } from "./types";
import type { World } from "./World";

export class Layer {
  readonly items: SceneElement[] = [];

  constructor(
    readonly name: string,
    /** 0 = pinned/distant, 1 = moves with the world, >1 = nearer than subject. */
    readonly parallax: number
  ) {}

  add<T extends SceneElement>(item: T): T {
    this.items.push(item);
    return item;
  }

  update(world: World): void {
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.update && it.alive !== false) it.update(world);
    }
    // Reap dead elements (cheap swap-free filter, runs rarely).
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].alive === false) items.splice(i, 1);
    }
  }

  render(world: World): void {
    const { ctx, camera } = world;
    ctx.save();
    // Snap to whole virtual pixels so nothing shimmers sub-pixel.
    ctx.translate(
      Math.round(-camera.x * this.parallax),
      Math.round(-camera.y * this.parallax)
    );
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].alive !== false) items[i].render(world);
    }
    ctx.restore();
  }
}
