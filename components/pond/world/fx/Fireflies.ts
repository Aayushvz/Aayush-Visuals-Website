// Fireflies drifting over the pond — the pond's living light. How many are lit is
// driven by `progress.lushness`, so the air fills with warm motes as the frog
// catches more bugs. Each is a cheap additive glow with a bright core, wandering
// on its own non-repeating noise so the swarm never looks mechanical. The pool is
// fixed; only the first `activeN` are drawn, so growth costs nothing to allocate.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { disc } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { snoise1 } from "../../anim/noise";
import { flicker } from "../../anim/oscillate";
import { clamp01, lerp, damp } from "../../anim/math";
import { C } from "../../config/theme";

interface Fly {
  hx: number; // home, slowly drifting
  hy: number;
  seed: number;
  r: number; // glow radius
}

export class Fireflies implements SceneElement {
  private readonly flies: Fly[] = [];
  private readonly max = 16;
  private activeF = 4; // eased actual count for smooth fade-in

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {}

  relayout(): void {
    this.flies.length = 0;
  }

  private build(): void {
    const { w, h } = this.layout;
    for (let i = 0; i < this.max; i++) {
      this.flies.push({
        hx: this.rng.range(w * 0.08, w * 0.92),
        hy: this.rng.range(h * 0.3, h * 0.72),
        seed: this.rng.range(0, 100),
        r: this.rng.range(2.4, 4),
      });
    }
  }

  update(world: World): void {
    if (this.flies.length === 0) this.build();
    // Target count scales with how alive the pond feels.
    const target = lerp(3, this.max, clamp01(world.progress.lushness));
    this.activeF = damp(this.activeF, target, 0.02, world.dt);
    const { w, h } = this.layout;
    for (const f of this.flies) {
      // Homes wander slowly so the constellation reshapes over time.
      f.hx += snoise1(world.t * 0.05 + f.seed) * 6 * world.dt;
      f.hy += snoise1(world.t * 0.04 + f.seed + 20) * 4 * world.dt;
      f.hx = Math.max(w * 0.05, Math.min(w * 0.95, f.hx));
      f.hy = Math.max(h * 0.26, Math.min(h * 0.76, f.hy));
    }
  }

  render(world: World): void {
    const { ctx, t } = world;
    const n = Math.round(this.activeF);
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter"; // additive — glows pool warmly
    for (let i = 0; i < n && i < this.flies.length; i++) {
      const f = this.flies[i];
      // Gentle per-fly wander around the home point.
      const x = f.hx + snoise1(t * 0.6 + f.seed) * 10 + Math.sin(t * 1.3 + f.seed) * 3;
      const y = f.hy + snoise1(t * 0.5 + f.seed + 7) * 7 + Math.sin(t * 1.1 + f.seed * 2) * 2;
      const glow = flicker(t, f.seed, 0.35); // occasionally dims out
      const rx = Math.round(x);
      const ry = Math.round(y);
      // Layered warm halo (additive) → a soft orb, not a hard dot.
      disc(ctx, rx, ry, f.r * 1.7, withAlpha(C.firefly, glow * 0.1));
      disc(ctx, rx, ry, f.r, withAlpha(C.firefly, glow * 0.22));
      disc(ctx, rx, ry, f.r * 0.5, withAlpha(C.fireflyCore, glow * 0.5));
      disc(ctx, rx, ry, 1.5, withAlpha(C.fireflyCore, glow));
    }
    ctx.globalCompositeOperation = prev;
  }
}
