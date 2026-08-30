// A gentle darkening toward the edges. Focuses the eye on the pond and gives the
// whole frame that quiet, lamplit, editorial feeling. One cached radial fill.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";

export class Vignette implements SceneElement {
  private grad: CanvasGradient | null = null;
  private gw = -1;
  private gh = -1;

  render(world: World): void {
    const { ctx, width: w, height: h } = world;
    if (!this.grad || this.gw !== w || this.gh !== h) {
      const cx = w / 2;
      const cy = h * 0.52;
      const r = Math.hypot(w, h) * 0.62;
      const g = ctx.createRadialGradient(cx, cy, r * 0.42, cx, cy, r);
      g.addColorStop(0, withAlpha(C.skyDeep, 0));
      g.addColorStop(0.7, withAlpha(C.skyDeep, 0.12));
      g.addColorStop(1, withAlpha(C.skyDeep, 0.55));
      this.grad = g;
      this.gw = w;
      this.gh = h;
    }
    ctx.fillStyle = this.grad;
    ctx.fillRect(0, 0, w, h);
  }
}
