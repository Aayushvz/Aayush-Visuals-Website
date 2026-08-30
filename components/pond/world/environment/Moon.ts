// A calm pale moon. Full disc with a faint terminator shade for roundness, a
// couple of soft maria, and a breathing halo. It barely moves — the whole point
// is that it feels like it's always been there.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import { disc } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { osc01 } from "../../anim/oscillate";
import { C } from "../../config/theme";

export class Moon implements SceneElement {
  constructor(private readonly layout: PondLayout) {}

  render(world: World): void {
    const { ctx, t } = world;
    const { x, y, r } = this.layout.moon;

    // Breathing halo (drawn additively for a gentle bloom).
    const pulse = 0.5 + 0.5 * osc01(t, 7.5);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
    halo.addColorStop(0, withAlpha(C.moon, 0.16 + 0.06 * pulse));
    halo.addColorStop(1, withAlpha(C.moon, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.restore();

    // Body.
    disc(ctx, x, y, r, C.moon);
    // Terminator shade on the lower-left for a hint of volume.
    disc(ctx, x - r * 0.32, y + r * 0.34, r * 0.82, C.moonShade);
    disc(ctx, x, y, r * 0.9, C.moon);

    // A few soft maria so it isn't a flat coin.
    disc(ctx, x + r * 0.22, y - r * 0.18, Math.max(1, r * 0.16), C.moonSea);
    disc(ctx, x - r * 0.3, y + r * 0.12, Math.max(1, r * 0.12), C.moonSea);
    disc(ctx, x + r * 0.05, y + r * 0.4, Math.max(1, r * 0.1), C.moonSea);

    // Top-right rim highlight.
    disc(ctx, x + r * 0.4, y - r * 0.42, Math.max(1, r * 0.14), C.starBright);
  }
}
