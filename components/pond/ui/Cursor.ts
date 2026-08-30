// A soft firefly-like cursor. The system pointer is hidden (cursor: none), so
// this stands in — a warm-cool glow that makes clicking feel like touching the
// pond rather than operating a UI.

import type { SceneElement } from "../engine/types";
import type { World } from "../engine/World";
import { disc } from "../render/pixels";
import { withAlpha } from "../render/color";
import { osc01 } from "../anim/oscillate";
import { C } from "../config/theme";

export class Cursor implements SceneElement {
  render(world: World): void {
    const { input, ctx, t } = world;
    if (!input.present) return;

    const x = Math.round(input.x);
    const y = Math.round(input.y);
    const pulse = 0.7 + 0.3 * osc01(t, 1.6);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const r = 6 * pulse;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(C.cursorGlow, 0.6));
    g.addColorStop(1, withAlpha(C.cursorGlow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    disc(ctx, x, y, input.down ? 1 : 0, C.fireflyCore);
  }
}
