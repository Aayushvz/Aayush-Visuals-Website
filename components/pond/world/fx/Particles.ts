// A small, capped particle pool for the fleeting sparkle of a catch: warm
// twinkles that puff out where the tongue snaps a bug, and a little heart that
// rises from the frog as it gulps. Deliberately tiny and allocation-light — the
// pool is a fixed budget so it can never tax weak hardware, and everything is a
// cheap fade on transform/alpha.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import { fillRect, px } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { clamp01 } from "../../anim/math";
import { easeOutCubic, easeOutBack } from "../../anim/easing";
import { C } from "../../config/theme";

type Kind = "sparkle" | "heart";

interface P {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  seed: number;
  warm: boolean;
}

// A chubby 5×5 heart, drawn cell-by-cell.
const HEART: ReadonlyArray<readonly [number, number]> = [
  [-1, -2], [1, -2],
  [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
  [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
  [-1, 1], [0, 1], [1, 1],
  [0, 2],
];

export class Particles implements SceneElement {
  private readonly pool: P[] = [];
  private readonly max = 90;

  constructor(private readonly rng: { range(a: number, b: number): number; chance(p: number): boolean }) {}

  private take(): P | null {
    if (this.pool.length >= this.max) return null;
    const p: P = { kind: "sparkle", x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, seed: 0, warm: true };
    this.pool.push(p);
    return p;
  }

  /** A puff of twinkles bursting from a point (a snapped bug). */
  sparkle(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.take();
      if (!p) return;
      const a = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(8, 26);
      p.kind = "sparkle";
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 10; // bias upward
      p.age = 0;
      p.life = this.rng.range(0.4, 0.8);
      p.seed = this.rng.range(0, 10);
      p.warm = this.rng.chance(0.6);
    }
  }

  /** A single heart that floats up (a satisfied gulp). */
  heart(x: number, y: number): void {
    const p = this.take();
    if (!p) return;
    p.kind = "heart";
    p.x = x;
    p.y = y;
    p.vx = this.rng.range(-4, 4);
    p.vy = this.rng.range(-20, -14);
    p.age = 0;
    p.life = 1.1;
    p.seed = this.rng.range(0, 10);
    p.warm = true;
  }

  update(world: World): void {
    const dt = world.dt;
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.pool.splice(i, 1);
        continue;
      }
      if (p.kind === "sparkle") {
        p.vx *= 1 - 2 * dt; // drag
        p.vy = p.vy * (1 - 2 * dt) + 6 * dt; // ease out, drift down late
      } else {
        p.vy += 5 * dt; // heart eases its rise
        p.x += Math.sin(world.t * 3 + p.seed) * 8 * dt; // gentle sway
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(world: World): void {
    const { ctx } = world;
    for (const p of this.pool) {
      const k = p.age / p.life;
      if (p.kind === "sparkle") this.drawSparkle(ctx, p, k, world.t);
      else this.drawHeart(ctx, p, k);
    }
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, p: P, k: number, t: number): void {
    const fade = 1 - easeOutCubic(k);
    const twk = 0.5 + 0.5 * Math.sin(t * 20 + p.seed);
    const a = clamp01(fade * (0.5 + 0.5 * twk));
    if (a < 0.04) return;
    const col = p.warm ? C.firefly : C.cursorGlow;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    // a soft 4-point twinkle
    ctx.fillStyle = withAlpha(col, a * 0.5);
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillRect(x, y - 1, 1, 3);
    px(ctx, x, y, withAlpha(C.fireflyCore, a));
  }

  private drawHeart(ctx: CanvasRenderingContext2D, p: P, k: number): void {
    const pop = k < 0.25 ? easeOutBack()(k / 0.25) : 1; // spring in
    const fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    const a = clamp01(fade);
    if (a < 0.04 || pop <= 0.05) return;
    const cell = Math.max(1, Math.round(pop));
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = withAlpha(C.heart, a);
    for (const [cx, cy] of HEART) {
      fillRect(ctx, x + cx * cell, y + cy * cell, cell, cell, withAlpha(C.heart, a));
    }
    // a tiny highlight
    px(ctx, x - cell, y - cell, withAlpha(C.petalLit, a));
  }
}
