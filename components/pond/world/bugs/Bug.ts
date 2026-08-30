// The little pests. Each kind flies its own way and wears its own tiny sprite,
// but they share one entity so the swarm can treat them uniformly. A bug is
// `Catchable`: the frog aims its tongue at `x,y`, calls `markCaught()` on
// contact, then drags the bug in by writing `x,y` before setting `alive = false`.
//
// Kinds (a programmer's bestiary): null-pointer mosquito, memory-leak dragonfly,
// merge-conflict beetle, syntax beetle, 404 moth, infinite-loop beetle.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse, disc, px, fillRect } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { clamp } from "../../anim/math";
import { C } from "../../config/theme";

export type BugKind =
  | "mosquito"
  | "dragonfly"
  | "merge"
  | "syntax"
  | "moth"
  | "loop";

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const SIZE: Record<BugKind, number> = {
  mosquito: 0.75,
  dragonfly: 1.3,
  merge: 1.0,
  syntax: 1.05,
  moth: 1.15,
  loop: 1.0,
};

const FLAP: Record<BugKind, number> = {
  mosquito: 34,
  dragonfly: 20,
  merge: 16,
  syntax: 16,
  moth: 11,
  loop: 18,
};

// The programming-bug each critter stands for — shown in the hover tooltip.
const NAMES: Record<BugKind, string> = {
  mosquito: "Null Pointer",
  dragonfly: "Memory Leak",
  merge: "Merge Conflict",
  syntax: "Syntax Beetle",
  moth: "404 Bug",
  loop: "Infinite Loop",
};

export class Bug implements SceneElement {
  x: number;
  y: number;
  alive = true;
  caught = false;
  targeted = false;

  private t: number;
  private readonly seed: number;
  private readonly s: number;
  private vx = 0;
  private vy = 0;
  private alpha = 1;

  // Per-kind scratch state.
  private timer = 0;
  private dir = 1;
  private ang: number;
  private cxc = 0;
  private cyc = 0;
  private radius = 0;
  private paused = false;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    readonly kind: BugKind,
    x: number,
    y: number
  ) {
    this.x = x;
    this.y = y;
    this.s = SIZE[kind];
    this.seed = rng.range(0, 1000);
    this.t = rng.range(0, 10);
    this.ang = rng.range(0, Math.PI * 2);
    const b = this.bounds();
    this.cxc = clamp(x, b.minX + 20, b.maxX - 20);
    this.cyc = clamp(y, b.minY + 12, b.maxY - 12);
    this.radius = rng.range(14, 30);
    this.vx = rng.spread(30);
    this.vy = rng.spread(20);
  }

  private bounds(): Bounds {
    const { w, h } = this.layout;
    return { minX: w * 0.06, maxX: w * 0.94, minY: h * 0.32, maxY: h * 0.84 };
  }

  /** The programming bug this critter represents (for the tooltip). */
  get name(): string {
    return NAMES[this.kind];
  }

  /** Frog contact: freeze flight; the frog now owns our position. */
  markCaught(): void {
    this.caught = true;
  }

  update(world: World): void {
    const { dt } = world;
    this.t += dt;
    if (this.caught) return;

    const b = this.bounds();
    const t = this.t;

    switch (this.kind) {
      case "mosquito": {
        // Erratic darting — new random heading several times a second.
        if ((this.timer -= dt) <= 0) {
          this.timer = this.rng.range(0.1, 0.34);
          this.vx = this.rng.spread(70);
          this.vy = this.rng.spread(52);
        }
        this.x += this.vx * dt + Math.sin(t * 40 + this.seed) * 9 * dt;
        this.y += this.vy * dt + Math.cos(t * 33 + this.seed) * 7 * dt;
        this.bounce(b);
        break;
      }
      case "dragonfly": {
        // Long gliding passes that gently curve.
        this.ang += Math.sin(t * 0.7 + this.seed) * 1.4 * dt;
        this.x += Math.cos(this.ang) * 62 * dt;
        this.y += Math.sin(this.ang) * 30 * dt;
        this.wrapX(b);
        if (this.y < b.minY || this.y > b.maxY) {
          this.ang = -this.ang;
          this.y = clamp(this.y, b.minY, b.maxY);
        }
        break;
      }
      case "merge": {
        // Two minds: sudden reversals, never settling (a conflict).
        if ((this.timer -= dt) <= 0) {
          this.timer = this.rng.range(0.4, 0.9);
          this.dir *= -1;
          this.vy = this.rng.spread(24);
        }
        this.x += this.dir * 34 * dt;
        this.y += this.vy * dt + Math.sin(t * 3 + this.seed) * 7 * dt;
        this.bounce(b);
        break;
      }
      case "syntax": {
        // Steady crawl through the air, punctuated by error-stutters.
        if ((this.timer -= dt) <= 0) {
          this.paused = this.rng.chance(0.35);
          this.timer = this.rng.range(0.5, 1.2);
          if (!this.paused) {
            this.vx = this.rng.spread(26);
            this.vy = this.rng.spread(16);
          }
        }
        if (!this.paused) {
          this.x += this.vx * dt + Math.sin(t * 18 + this.seed) * 2 * dt;
          this.y += this.vy * dt;
        }
        this.bounce(b);
        break;
      }
      case "moth": {
        // Fluttery drift toward the moonlight, blinking in and out (404).
        const toL = Math.sign(this.layout.moon.x - this.x || 1);
        this.x += (toL * 16 + Math.sin(t * 5 + this.seed) * 10) * dt;
        this.y += Math.sin(t * 12 + this.seed) * 16 * dt + Math.sin(t * 0.6) * 6 * dt;
        this.wrapX(b);
        this.y = clamp(this.y, b.minY, b.maxY);
        const base = 0.55 + 0.45 * Math.sin(t * 2.2 + this.seed);
        this.alpha = Math.sin(t * 0.5 + this.seed) > 0.88 ? base * 0.15 : base;
        break;
      }
      case "loop": {
        // Round and round, forever, on a slowly wandering centre.
        this.ang += 2.4 * dt;
        this.cxc += Math.sin(t * 0.3 + this.seed) * 8 * dt;
        this.cyc += Math.cos(t * 0.24 + this.seed) * 5 * dt;
        this.cxc = clamp(this.cxc, b.minX + this.radius, b.maxX - this.radius);
        this.cyc = clamp(this.cyc, b.minY + this.radius * 0.6, b.maxY - this.radius * 0.6);
        this.x = this.cxc + Math.cos(this.ang) * this.radius;
        this.y = this.cyc + Math.sin(this.ang) * this.radius * 0.6;
        break;
      }
    }
  }

  private bounce(b: Bounds): void {
    if (this.x < b.minX) {
      this.x = b.minX;
      this.vx = Math.abs(this.vx);
      this.dir = 1;
    } else if (this.x > b.maxX) {
      this.x = b.maxX;
      this.vx = -Math.abs(this.vx);
      this.dir = -1;
    }
    if (this.y < b.minY) {
      this.y = b.minY;
      this.vy = Math.abs(this.vy);
    } else if (this.y > b.maxY) {
      this.y = b.maxY;
      this.vy = -Math.abs(this.vy);
    }
  }

  private wrapX(b: Bounds): void {
    const pad = 14;
    if (this.x < b.minX - pad) this.x = b.maxX + pad;
    else if (this.x > b.maxX + pad) this.x = b.minX - pad;
  }

  /** Is a stage-space point close enough to click this bug? */
  hitTest(sx: number, sy: number): boolean {
    const r = Math.max(8, 7 * this.s);
    return Math.hypot(sx - this.x, sy - this.y) <= r;
  }

  render(world: World): void {
    const { ctx, t } = world;
    const prevA = ctx.globalAlpha;
    if (this.alpha < 1) ctx.globalAlpha = prevA * this.alpha;

    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const s = this.s;
    const flap = Math.abs(Math.sin(t * FLAP[this.kind] + this.seed));

    // A faint halo so bugs read as catchable against the dark water.
    if (!this.targeted) fillEllipse(ctx, x, y, 6 * s, 5 * s, withAlpha(C.bugGlow, 0.09));
    else fillEllipse(ctx, x, y, 7 * s, 6 * s, withAlpha(C.frogTongueLit, 0.16));

    switch (this.kind) {
      case "mosquito":
        this.drawMosquito(ctx, x, y, s, flap);
        break;
      case "dragonfly":
        this.drawDragonfly(ctx, x, y, s, flap);
        break;
      case "merge":
        this.drawMerge(ctx, x, y, s, flap);
        break;
      case "syntax":
        this.drawSyntax(ctx, x, y, s, flap);
        break;
      case "moth":
        this.drawMoth(ctx, x, y, s, flap);
        break;
      case "loop":
        this.drawLoop(ctx, x, y, s, flap);
        break;
    }

    ctx.globalAlpha = prevA;
  }

  // ── Per-kind pixel art ──────────────────────────────────────────────────

  private wing(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
    fillEllipse(ctx, x, y, Math.max(1, rx), Math.max(0.6, ry), color);
  }

  private drawMosquito(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    const wr = withAlpha(C.bugWing, 0.5);
    this.wing(ctx, x - 2 * s, y - 1, 2.4 * s, 0.6 + flap * 1.4, wr);
    this.wing(ctx, x + 2 * s, y - 1, 2.4 * s, 0.6 + flap * 1.4, wr);
    fillEllipse(ctx, x, y, 1.4 * s, 2.2 * s, C.bugMosquito);
    px(ctx, x, y - Math.round(2.2 * s), C.bugLeg);
    // dangling legs
    fillRect(ctx, x - 2 * s, y + 2 * s, 1, 2, C.bugLeg);
    fillRect(ctx, x + 2 * s, y + 2 * s, 1, 2, C.bugLeg);
  }

  private drawDragonfly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    const wr = withAlpha(C.bugDragonflyLit, 0.55);
    const wy = 0.7 + flap * 1.2;
    this.wing(ctx, x - 3.4 * s, y - 1, 3.6 * s, wy, wr);
    this.wing(ctx, x + 3.4 * s, y - 1, 3.6 * s, wy, wr);
    this.wing(ctx, x - 3 * s, y + 1, 3 * s, wy * 0.8, wr);
    this.wing(ctx, x + 3 * s, y + 1, 3 * s, wy * 0.8, wr);
    fillEllipse(ctx, x, y, 1.5 * s, 4.4 * s, C.bugDragonfly);
    fillEllipse(ctx, x, y - 3.6 * s, 1.6 * s, 1.6 * s, C.bugDragonflyLit);
    px(ctx, x - 1, Math.round(y - 4 * s), C.bugLeg);
    px(ctx, x + 1, Math.round(y - 4 * s), C.bugLeg);
  }

  private drawMerge(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    const wr = withAlpha(C.bugWing, 0.4);
    this.wing(ctx, x - 3 * s, y - 1, 2.6 * s, 0.6 + flap, wr);
    this.wing(ctx, x + 3 * s, y - 1, 2.6 * s, 0.6 + flap, wr);
    // Two half-shells that don't agree, with a dark seam between them.
    disc(ctx, x - Math.round(1.6 * s), y, 2.6 * s, C.bugMergeA);
    disc(ctx, x + Math.round(1.6 * s), y, 2.6 * s, C.bugMergeB);
    fillRect(ctx, x, y - 2.4 * s, 1, 4.8 * s, C.bugLeg);
    fillEllipse(ctx, x, y - 3 * s, 1.4 * s, 1.4 * s, C.bugSyntaxDark);
  }

  private drawSyntax(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    const wr = withAlpha(C.bugWing, 0.38);
    this.wing(ctx, x - 3 * s, y - 1, 2.6 * s, 0.5 + flap * 0.9, wr);
    this.wing(ctx, x + 3 * s, y - 1, 2.6 * s, 0.5 + flap * 0.9, wr);
    fillEllipse(ctx, x, y, 3 * s, 3.4 * s, C.bugSyntax);
    fillRect(ctx, x, y - 3 * s, 1, 6 * s, C.bugSyntaxDark); // elytra split
    fillEllipse(ctx, x, y - 3.2 * s, 1.7 * s, 1.5 * s, C.bugSyntaxDark);
    px(ctx, x - Math.round(1.4 * s), y, C.bugSyntaxDark);
    px(ctx, x + Math.round(1.4 * s), y, C.bugSyntaxDark);
  }

  private drawMoth(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    const wr = 0.5 + flap * 1.6;
    fillEllipse(ctx, x - 3 * s, y, 3.4 * s, wr, C.bugMoth);
    fillEllipse(ctx, x + 3 * s, y, 3.4 * s, wr, C.bugMoth);
    fillEllipse(ctx, x - 3 * s, y + 1, 1.4 * s, wr * 0.5, C.bugMothDark);
    fillEllipse(ctx, x + 3 * s, y + 1, 1.4 * s, wr * 0.5, C.bugMothDark);
    fillEllipse(ctx, x, y, 1.3 * s, 2.6 * s, C.bugMothDark);
    px(ctx, x - 1, Math.round(y - 2.6 * s), C.bugLeg);
    px(ctx, x + 1, Math.round(y - 2.6 * s), C.bugLeg);
  }

  private drawLoop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
    // A faint ghost of the orbit it's stuck in.
    for (let i = 1; i <= 3; i++) {
      const a = this.ang - i * 0.5;
      const gx = this.cxc + Math.cos(a) * this.radius;
      const gy = this.cyc + Math.sin(a) * this.radius * 0.6;
      disc(ctx, Math.round(gx), Math.round(gy), 1.2 * s, withAlpha(C.bugLoop, 0.12 * (4 - i)));
    }
    const wr = withAlpha(C.bugWing, 0.4);
    this.wing(ctx, x - 3 * s, y - 1, 2.6 * s, 0.6 + flap, wr);
    this.wing(ctx, x + 3 * s, y - 1, 2.6 * s, 0.6 + flap, wr);
    fillEllipse(ctx, x, y, 2.8 * s, 3.2 * s, C.bugLoop);
    fillEllipse(ctx, x - 0.6 * s, y - 0.8 * s, 1.5 * s, 1.6 * s, C.bugLoopLit);
    fillEllipse(ctx, x, y - 3 * s, 1.5 * s, 1.4 * s, C.bugSyntaxDark);
  }
}
