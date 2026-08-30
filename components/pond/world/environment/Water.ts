// The pond surface. A cached depth gradient for the plane, then everything that
// makes water feel wet, layered on top each frame: a bright waterline, drifting
// shimmer glints, a wobbling reflection of the moon, and a pool of
// expanding ripples. `spawnRipple` is public so bugs, fish, petals and the
// cursor can all disturb the surface in later phases.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { withAlpha } from "../../render/color";
import { ring } from "../../render/pixels";
import { snoise1 } from "../../anim/noise";
import { osc01 } from "../../anim/oscillate";
import { clamp01 } from "../../anim/math";
import { C } from "../../config/theme";

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  age: number;
  life: number;
  strength: number;
}

interface Streak {
  y: number; // fraction of water height
  len: number;
  speed: number;
  phase: number;
  period: number;
}

const OVER = 10;

export class Water implements SceneElement {
  private ripples: Ripple[] = [];
  private streaks: Streak[] = [];
  private nextAmbient = 3;

  // Cached base plane.
  private grad: CanvasGradient | null = null;
  private gradW = -1;
  private gradH = -1;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {
    this.buildStreaks();
  }

  relayout(): void {
    this.grad = null;
    this.buildStreaks();
  }

  private buildStreaks(): void {
    this.streaks = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      this.streaks.push({
        y: this.rng.range(0.08, 0.95),
        len: this.rng.range(6, 22),
        speed: this.rng.range(3, 9) * (this.rng.chance(0.5) ? 1 : -1),
        phase: this.rng.next(),
        period: this.rng.range(3, 7),
      });
    }
  }

  /** Disturb the surface. Anything touching water calls this. */
  spawnRipple(x: number, y: number, strength = 1): void {
    if (this.ripples.length > 10) this.ripples.shift();
    this.ripples.push({
      x,
      y,
      r: 1,
      maxR: 6 + strength * 10,
      age: 0,
      life: 1.1 + strength * 0.9,
      strength,
    });
  }

  update(world: World): void {
    const { dt, t } = world;

    // Occasional ambient disturbance — a fish nosing the surface somewhere.
    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0) {
      this.nextAmbient = this.rng.range(2.5, 6);
      const { w, waterlineY, h } = this.layout;
      const x = this.rng.range(w * 0.15, w * 0.85);
      const y = this.rng.range(waterlineY + 8, h - 6);
      this.spawnRipple(x, y, this.rng.range(0.2, 0.6));
    }

    for (const r of this.ripples) {
      r.age += dt;
      const k = r.age / r.life;
      r.r = r.maxR * (1 - Math.pow(1 - k, 2)); // eases outward
    }
    this.ripples = this.ripples.filter((r) => r.age < r.life);
    void t;
  }

  render(world: World): void {
    const ctx = world.ctx;
    const { w, h, waterlineY, moon } = this.layout;
    const waterH = h - waterlineY;

    // ── Base plane (cached gradient) ───────────────────────────────────
    if (!this.grad || this.gradW !== w || this.gradH !== h) {
      const g = ctx.createLinearGradient(0, waterlineY, 0, h);
      g.addColorStop(0, C.waterDeep);
      g.addColorStop(0.35, C.waterMid);
      g.addColorStop(1, C.waterNear);
      this.grad = g;
      this.gradW = w;
      this.gradH = h;
    }
    ctx.fillStyle = this.grad;
    ctx.fillRect(-OVER, waterlineY, w + OVER * 2, waterH + OVER);

    // ── Waterline: a soft reflected horizon that bleeds down into the water,
    //    so sky and pond feel like one continuous scene rather than two halves.
    ctx.fillStyle = withAlpha(C.waterHi2, 0.4);
    ctx.fillRect(-OVER, waterlineY, w + OVER * 2, 1);
    const reflH = 9;
    for (let i = 1; i <= reflH; i++) {
      const f = 1 - i / reflH;
      ctx.fillStyle = withAlpha(C.horizonPink, 0.2 * f);
      ctx.fillRect(-OVER, waterlineY + i, w + OVER * 2, 1);
      if (i <= 4) {
        ctx.fillStyle = withAlpha(C.waterHi2, 0.06 * f);
        ctx.fillRect(-OVER, waterlineY + i, w + OVER * 2, 1);
      }
    }

    // ── Reflection (drawn dim, before shimmer) ─────────────────────────
    this.reflection(world, moon.x, waterlineY + 1, waterH * 0.62, C.moonPath, 0.5, moon.r * 0.55, moon.r * 0.85, 1);

    // ── Drifting shimmer glints ────────────────────────────────────────
    for (const s of this.streaks) {
      const y = Math.round(waterlineY + 3 + s.y * (waterH - 4));
      const x = (((s.speed * world.t + s.phase * w) % (w + 40)) + w + 40) % (w + 40) - 20;
      const a = 0.06 + 0.14 * osc01(world.t, s.period, s.phase);
      ctx.fillStyle = withAlpha(C.waterHi, a);
      ctx.fillRect(Math.round(x), y, Math.round(s.len), 1);
      ctx.fillStyle = withAlpha(C.waterHi2, a * 0.6);
      ctx.fillRect(Math.round(x + s.len * 0.3), y, Math.round(s.len * 0.3), 1);
    }

    // ── Ripples ────────────────────────────────────────────────────────
    for (const r of this.ripples) {
      const k = r.age / r.life;
      const a = (1 - k) * 0.5 * clamp01(r.strength + 0.3);
      ring(ctx, r.x, r.y, r.r, withAlpha(C.waterHi2, a));
      if (r.r > 4) ring(ctx, r.x, r.y, r.r - 3, withAlpha(C.waterHi, a * 0.5));
    }
  }

  /** A tapering, wobbling column of reflected light on the water. */
  private reflection(
    world: World,
    cx: number,
    topY: number,
    len: number,
    color: string,
    peak: number,
    wobble: number,
    baseHalf: number,
    speed: number
  ): void {
    const ctx = world.ctx;
    const t = world.t;
    const rows = Math.floor(len);
    for (let i = 0; i < rows; i++) {
      const d = i / rows;
      const shimmer = 0.55 + 0.45 * (snoise1(i * 0.6 + t * (2.2 * speed)) * 0.5 + 0.5);
      const a = peak * (1 - d) * (1 - d) * shimmer;
      if (a < 0.03) continue;
      const off = snoise1(i * 0.3 + t * 1.1 * speed) * wobble * (0.4 + d);
      const half = Math.max(1, baseHalf * (1 - d * 0.75));
      ctx.fillStyle = withAlpha(color, a);
      ctx.fillRect(Math.round(cx + off - half), topY + i, Math.round(half * 2), 1);
    }
  }
}
