// The night sky: a banded dusk gradient from deep navy down to a mauve breath of
// warmth at the horizon, plus a soft cool halo pooled around the moon. Static, so
// it bakes into an offscreen buffer once.

import { StaticLayer } from "../../render/StaticLayer";
import { bandGradient } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";

export class Sky extends StaticLayer {
  constructor(private readonly layout: PondLayout) {
    super();
  }

  protected paint(cx: CanvasRenderingContext2D, _world: World): void {
    const { w, waterlineY, moon } = this.layout;
    const bottom = waterlineY + 6; // sky only needs to reach just under the waterline

    bandGradient(cx, 0, 0, w, bottom, [
      [0.0, C.skyDeep],
      [0.26, C.skyHigh],
      [0.48, C.skyMid],
      [0.66, C.skyLow],
      [0.8, C.skyHorizon],
      [0.9, C.skyGlow],
      [1.0, C.horizonPink],
    ]);

    // Cool halo around the moon, then a faint warm lift right at the horizon.
    const halo = cx.createRadialGradient(
      moon.x,
      moon.y,
      0,
      moon.x,
      moon.y,
      moon.r * 7
    );
    halo.addColorStop(0, withAlpha(C.moonHalo, 0.28));
    halo.addColorStop(0.5, withAlpha(C.moonHalo, 0.08));
    halo.addColorStop(1, withAlpha(C.moonHalo, 0));
    cx.fillStyle = halo;
    cx.fillRect(0, 0, w, bottom);

    const glow = cx.createLinearGradient(0, waterlineY - 26, 0, waterlineY);
    glow.addColorStop(0, withAlpha(C.horizonPink, 0));
    glow.addColorStop(1, withAlpha(C.horizonPink, 0.35));
    cx.fillStyle = glow;
    cx.fillRect(0, waterlineY - 26, w, 26);
  }
}
