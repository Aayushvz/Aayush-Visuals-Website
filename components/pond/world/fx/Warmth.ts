// A whisper of warmth that grows with the pond's lushness. As the frog catches
// bugs, a soft golden wash pools over the centre of the scene (additive, capped
// low) so the whole picture reads warmer and more alive the further you get —
// the colour-richness half of the progression, alongside the fireflies. One
// cheap radial fill per frame; alpha tracks `lushness`.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import { withAlpha } from "../../render/color";
import { clamp01, lerp } from "../../anim/math";
import { C } from "../../config/theme";

export class Warmth implements SceneElement {
  render(world: World): void {
    const lush = clamp01(world.progress.lushness);
    const a = lerp(0.0, 0.14, lush); // baseline-invisible → gently warm
    if (a < 0.005) return;
    const { ctx, width: w, height: h } = world;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.hypot(w, h) * 0.55;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, withAlpha(C.warmth, a));
    g.addColorStop(1, withAlpha(C.warmth, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
