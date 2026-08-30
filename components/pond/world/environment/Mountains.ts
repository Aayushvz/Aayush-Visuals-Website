// Three ridgelines fading back into haze. Generated from layered value noise so
// every visit gets a slightly different horizon, then baked once. Far ridges sit
// higher and hazier; the near hills are darker and calmer.

import { StaticLayer } from "../../render/StaticLayer";
import { fbm1 } from "../../anim/noise";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";

export class Mountains extends StaticLayer {
  private readonly seeds: number[];

  constructor(
    private readonly layout: PondLayout,
    rng: Random
  ) {
    super();
    this.seeds = [rng.range(0, 999), rng.range(0, 999), rng.range(0, 999)];
  }

  protected paint(cx: CanvasRenderingContext2D, _world: World): void {
    const { waterlineY } = this.layout;

    // Far ridge, then a haze band over its feet, then mid and near ridges.
    this.ridge(cx, this.seeds[0], waterlineY - 14, 30, 0.012, C.mtnFar);

    const mist = cx.createLinearGradient(0, waterlineY - 26, 0, waterlineY);
    mist.addColorStop(0, withAlpha(C.mtnMist, 0));
    mist.addColorStop(1, withAlpha(C.mtnMist, 0.4));
    cx.fillStyle = mist;
    cx.fillRect(0, waterlineY - 26, this.layout.w, 26);

    this.ridge(cx, this.seeds[1], waterlineY - 8, 18, 0.017, C.mtnMid);
    this.ridge(cx, this.seeds[2], waterlineY - 2, 10, 0.026, C.mtnNear);
  }

  private ridge(
    cx: CanvasRenderingContext2D,
    seed: number,
    lowY: number,
    amp: number,
    freq: number,
    color: string
  ): void {
    const { w, waterlineY } = this.layout;
    cx.fillStyle = color;
    for (let x = 0; x < w; x++) {
      const n = fbm1(x * freq + seed, 4) * 0.5 + 0.5; // [0,1]
      const top = Math.round(lowY - n * amp);
      cx.fillRect(x, top, 1, waterlineY - top + 2);
    }
  }
}
