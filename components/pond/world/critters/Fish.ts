// Fish that arc up out of the pond and flop back with a splash. They surface on
// their own every so often — the pond should feel inhabited — and a couple of
// quick taps on the water will also coax one up (the Scene calls `jump`). Ripples
// are pushed back out through a callback so this stays decoupled from the Water.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse, px } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";

type Ripple = (x: number, y: number, strength: number) => void;

interface Jumper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  surfaceY: number;
  s: number;
  age: number;
}

const GRAV = 300;

export class Fish implements SceneElement {
  private readonly jumpers: Jumper[] = [];
  private nextJump: number;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly ripple: Ripple
  ) {
    this.nextJump = rng.range(2, 6); // first one soon after arriving
  }

  /** Pick a spot out on the open water and send a fish up. */
  private ambientJump(): void {
    const { w, h, waterlineY } = this.layout;
    const x = this.rng.range(w * 0.12, w * 0.88);
    const y = this.rng.range(waterlineY + (h - waterlineY) * 0.35, h - 10);
    this.jump(x, y);
  }

  /** Send a fish arcing out of the water at (x, surfaceY). */
  jump(x: number, surfaceY: number): void {
    if (this.jumpers.length >= 2) return; // never a frenzy
    this.jumpers.push({
      x,
      y: surfaceY,
      vx: this.rng.spread(34),
      vy: -this.rng.range(120, 168),
      surfaceY,
      s: this.rng.range(0.9, 1.3),
      age: 0,
    });
    this.ripple(x, surfaceY, 0.7);
  }

  update(world: World): void {
    const dt = world.dt;

    // Fish surface on their own, on a gentle random timer.
    if ((this.nextJump -= dt) <= 0) {
      this.nextJump = this.rng.range(5, 12);
      this.ambientJump();
    }

    for (let i = this.jumpers.length - 1; i >= 0; i--) {
      const j = this.jumpers[i];
      j.age += dt;
      j.vy += GRAV * dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      if (j.vy > 0 && j.y >= j.surfaceY) {
        this.ripple(j.x, j.surfaceY, 0.85); // splashdown
        this.jumpers.splice(i, 1);
      }
    }
  }

  render(world: World): void {
    const { ctx } = world;
    for (const j of this.jumpers) {
      const ang = Math.atan2(j.vy, j.vx);
      ctx.save();
      ctx.translate(j.x, j.y);
      ctx.rotate(ang);
      const s = j.s;
      // body
      fillEllipse(ctx, 0, 0, 5 * s, 2.4 * s, C.fish);
      fillEllipse(ctx, 1 * s, 0.6 * s, 3.4 * s, 1.3 * s, C.fishShade);
      fillEllipse(ctx, -0.5 * s, -0.4 * s, 2.2 * s, 1 * s, C.fishSpot);
      // tail fan behind
      fillEllipse(ctx, -5.4 * s, -1.4 * s, 1.8 * s, 1 * s, C.fishShade);
      fillEllipse(ctx, -5.4 * s, 1.4 * s, 1.8 * s, 1 * s, C.fishShade);
      // dorsal
      fillEllipse(ctx, -0.5 * s, -2.2 * s, 1.6 * s, 0.9 * s, C.fishShade);
      // eye near the head
      px(ctx, Math.round(3.4 * s), Math.round(-0.6 * s), C.butterflyBody);
      ctx.restore();
      // a little water bead trailing at the peak
      if (j.vy > -20 && j.vy < 20) px(ctx, Math.round(j.x), Math.round(j.y + 6 * s), withAlpha(C.waterHi, 0.6));
    }
  }
}
