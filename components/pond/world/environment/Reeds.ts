// Cattail reeds along the banks. Each stalk bends on its own gusting sway so the
// whole stand ripples like there's a light wind. Configurable so the same class
// serves the dim reeds far back and the taller, lit reeds up front.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { sway } from "../../anim/oscillate";
import { fillEllipse } from "../../render/pixels";
import { C } from "../../config/theme";

export interface ReedConfig {
  /** Horizontal band [from,to] as fractions of width to scatter across. */
  band: [number, number];
  count: number;
  /** Reed height range as a fraction of the water height. */
  heightFrac: [number, number];
  amp: number; // sway amplitude in px
  lit: boolean;
  cattailChance: number;
}

interface Reed {
  x: number;
  base: number;
  height: number;
  amp: number;
  period: number;
  seed: number;
  cattail: boolean;
  width: number;
}

export class Reeds implements SceneElement {
  private reeds: Reed[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly cfg: ReedConfig
  ) {}

  relayout(): void {
    this.reeds = [];
  }

  private build(): void {
    const { w, h, waterlineY } = this.layout;
    const waterH = h - waterlineY;
    this.reeds = [];
    for (let i = 0; i < this.cfg.count; i++) {
      const fx = this.cfg.band[0] + this.rng.next() * (this.cfg.band[1] - this.cfg.band[0]);
      this.reeds.push({
        x: Math.round(fx * w),
        base: waterlineY + this.rng.range(2, Math.max(4, waterH * 0.25)),
        height: this.rng.range(this.cfg.heightFrac[0], this.cfg.heightFrac[1]) * waterH,
        amp: this.cfg.amp * this.rng.range(0.7, 1.2),
        period: this.rng.range(3.2, 5.5),
        seed: this.rng.range(0, 100),
        cattail: this.rng.chance(this.cfg.cattailChance),
        width: this.cfg.lit ? 2 : 1,
      });
    }
    this.reeds.sort((a, b) => a.base - b.base);
  }

  render(world: World): void {
    if (this.reeds.length === 0) this.build();
    const { ctx, t } = world;
    for (const r of this.reeds) this.drawReed(ctx, t, r);
  }

  private drawReed(ctx: CanvasRenderingContext2D, t: number, r: Reed): void {
    const bend = sway(t, r.period, r.amp, r.seed);
    const seg = Math.max(6, Math.round(r.height));
    const bodyCol = this.cfg.lit ? C.reedMid : C.reedDark;
    const litCol = C.reedLit;

    let tipX = r.x;
    let tipY = r.base - r.height;
    for (let i = 0; i <= seg; i++) {
      const f = i / seg; // 0 base → 1 tip
      const y = Math.round(r.base - f * r.height);
      const x = Math.round(r.x + bend * f * f);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x, y, r.width, 1);
      // Lit edge catches the moon on the windward side.
      if (this.cfg.lit && f > 0.15) {
        ctx.fillStyle = litCol;
        ctx.fillRect(x + (bend >= 0 ? r.width : -1), y, 1, 1);
      }
      tipX = x;
      tipY = y;
    }

    // Slender blades springing from mid-height.
    this.blade(ctx, r, t, 0.55, 1);
    this.blade(ctx, r, t, 0.68, -1);

    // Cattail seed head near the tip.
    if (r.cattail) {
      fillEllipse(ctx, tipX + (bend >= 0 ? 1 : 0), tipY + 4, 2, 4, C.cattail);
      ctx.fillStyle = C.cattailLit;
      ctx.fillRect(tipX - 1 + (bend >= 0 ? 1 : 0), tipY + 2, 1, 4);
    } else {
      // A soft reed tip.
      ctx.fillStyle = C.reedTip;
      ctx.fillRect(tipX, tipY - 1, r.width, 2);
    }
  }

  private blade(
    ctx: CanvasRenderingContext2D,
    r: Reed,
    t: number,
    at: number,
    dir: number
  ): void {
    const startY = r.base - r.height * at;
    const bend = sway(t, r.period * 1.1, r.amp * 0.8, r.seed + dir);
    const len = r.height * 0.28;
    ctx.fillStyle = this.cfg.lit ? C.reedLit : C.reedMid;
    for (let i = 0; i < len; i++) {
      const f = i / len;
      const x = r.x + dir * i * 0.9 + bend * f;
      const y = startY - i * 0.7;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
