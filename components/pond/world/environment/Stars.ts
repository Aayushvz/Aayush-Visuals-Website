// A field of stars that breathe. Positions are seeded once (kept above the
// horizon); each frame every star twinkles on its own slow phase, and a rare few
// are bright enough to earn a tiny cross of light.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { osc01 } from "../../anim/oscillate";
import { px } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";

interface Star {
  x: number; // fraction of width
  y: number; // fraction of horizon height
  period: number;
  phase: number;
  base: number; // baseline brightness
  bright: boolean;
}

interface Shoot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

export class Stars implements SceneElement {
  private stars: Star[] = [];
  private shoot: Shoot | null = null;
  private nextShootAt = 300; // reward for lingering: first streak after ~5 min

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {
    this.build();
  }

  private launchShoot(): void {
    const { w, waterlineY } = this.layout;
    const fromLeft = this.rng.chance(0.5);
    const speed = this.rng.range(180, 260);
    this.shoot = {
      x: fromLeft ? this.rng.range(0, w * 0.3) : this.rng.range(w * 0.7, w),
      y: this.rng.range(waterlineY * 0.05, waterlineY * 0.4),
      vx: (fromLeft ? 1 : -1) * speed,
      vy: this.rng.range(40, 90),
      age: 0,
      life: this.rng.range(0.7, 1.1),
    };
  }

  update(world: World): void {
    if (!this.shoot && world.t >= this.nextShootAt) {
      this.launchShoot();
      this.nextShootAt = world.t + this.rng.range(60, 150); // then now and then
    }
    if (this.shoot) {
      const s = this.shoot;
      s.age += world.dt;
      s.x += s.vx * world.dt;
      s.y += s.vy * world.dt;
      if (s.age >= s.life) this.shoot = null;
    }
  }

  private build(): void {
    const count = 90;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: this.rng.next(),
        y: this.rng.range(0.02, 0.82), // only in the sky band
        period: this.rng.range(2.2, 6.5),
        phase: this.rng.next(),
        base: this.rng.range(0.25, 0.7),
        bright: this.rng.chance(0.14),
      });
    }
  }

  relayout(): void {
    // Positions are fractional, so nothing to rebuild — but reseeding would go here.
  }

  render(world: World): void {
    const { ctx, t } = world;
    const { w, waterlineY } = this.layout;
    const skyH = waterlineY;

    for (const s of this.stars) {
      const x = Math.round(s.x * w);
      const y = Math.round(s.y * skyH);
      const tw = s.base + (1 - s.base) * osc01(t, s.period, s.phase);
      const color = s.bright ? C.starBright : C.star;
      px(ctx, x, y, withAlpha(color, tw));

      if (s.bright && tw > 0.72) {
        const a = (tw - 0.72) / 0.28;
        const arm = withAlpha(C.starBright, a * 0.5);
        px(ctx, x - 1, y, arm);
        px(ctx, x + 1, y, arm);
        px(ctx, x, y - 1, arm);
        px(ctx, x, y + 1, arm);
      }
    }

    // A shooting star: a bright head trailing a fading tail.
    if (this.shoot) {
      const s = this.shoot;
      const fade = 1 - s.age / s.life;
      const ul = Math.hypot(s.vx, s.vy) || 1;
      const nx = s.vx / ul;
      const ny = s.vy / ul;
      for (let i = 1; i < 11; i++) {
        const d = i * 2.2;
        const a = fade * (1 - i / 11) * 0.85;
        px(ctx, Math.round(s.x - nx * d), Math.round(s.y - ny * d), withAlpha(C.star, a));
      }
      const hx = Math.round(s.x);
      const hy = Math.round(s.y);
      px(ctx, hx, hy, withAlpha(C.starBright, fade));
      px(ctx, hx - 1, hy, withAlpha(C.starBright, fade * 0.5));
      px(ctx, hx + 1, hy, withAlpha(C.starBright, fade * 0.5));
      px(ctx, hx, hy - 1, withAlpha(C.starBright, fade * 0.5));
    }
  }
}
