// The nearest layer: out-of-focus leaf masses that frame the corners, and a few
// petals drifting through. It rides the strongest parallax, so it swings widest
// as the camera breathes — selling the depth of the little box. The blur is
// faked with soft, stacked translucency rather than a real (expensive) blur.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { sway } from "../../anim/oscillate";
import { TAU } from "../../anim/math";
import { C } from "../../config/theme";

interface Leaf {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
}

interface Petal {
  x: number;
  y: number;
  vy: number;
  drift: number;
  seed: number;
  spin: number;
  lit: boolean;
}

export class Foreground implements SceneElement {
  private leaves: Leaf[] = [];
  private petals: Petal[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {}

  relayout(): void {
    this.leaves = [];
  }

  private build(): void {
    const { w, h } = this.layout;
    this.leaves = [];
    // Top corners get heavy foliage framing the scene.
    this.clump(-30, -25, 5, w);
    this.clump(w + 30, -28, 4, w);
    void h;

    if (this.petals.length === 0) {
      for (let i = 0; i < 4; i++) this.petals.push(this.spawnPetal(true));
    }
  }

  private clump(ox: number, oy: number, n: number, w: number): void {
    const spread = w * 0.16;
    for (let i = 0; i < n; i++) {
      this.leaves.push({
        x: ox + this.rng.spread(spread),
        y: oy + this.rng.spread(spread * 0.7),
        rx: this.rng.range(10, 20),
        ry: this.rng.range(7, 13),
        seed: this.rng.range(0, 100),
      });
    }
  }

  private spawnPetal(scatter: boolean): Petal {
    const { w, h } = this.layout;
    return {
      x: this.rng.range(0, w),
      y: scatter ? this.rng.range(0, h) : -4,
      vy: this.rng.range(6, 12),
      drift: this.rng.range(6, 14),
      seed: this.rng.range(0, 100),
      spin: this.rng.range(2, 4),
      lit: this.rng.chance(0.5),
    };
  }

  update(world: World): void {
    const dt = world.dt;
    const { h, w } = this.layout;
    for (const p of this.petals) {
      p.y += p.vy * dt;
      p.x += Math.sin(world.t / p.spin + p.seed) * p.drift * dt;
      if (p.y > h + 6 || p.x < -8 || p.x > w + 8) {
        Object.assign(p, this.spawnPetal(false));
      }
    }
  }

  render(world: World): void {
    if (this.leaves.length === 0) this.build();
    const { ctx, t } = world;

    // Leaf masses: a soft dark halo, then the body, swaying subtly as a whole.
    for (const lf of this.leaves) {
      const bx = lf.x + sway(t, 6.5, 3, lf.seed);
      const by = lf.y + sway(t, 8, 1.5, lf.seed + 5);
      fillEllipse(ctx, bx, by, lf.rx + 3, lf.ry + 3, withAlpha(C.foliageFg, 0.45));
      fillEllipse(ctx, bx, by, lf.rx, lf.ry, C.foliageFg);
      fillEllipse(ctx, bx - lf.rx * 0.3, by - lf.ry * 0.3, lf.rx * 0.5, lf.ry * 0.4, withAlpha(C.foliageFgLit, 0.5));
    }

    // Drifting petals — tiny, tumbling, catching a little light.
    for (const p of this.petals) {
      const col = p.lit ? C.petalLit : C.petal;
      const phase = (t / p.spin + p.seed) % 1;
      const wide = Math.abs(Math.sin(phase * TAU)) > 0.5;
      ctx.fillStyle = withAlpha(col, 0.9);
      if (wide) {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      }
    }
  }
}
