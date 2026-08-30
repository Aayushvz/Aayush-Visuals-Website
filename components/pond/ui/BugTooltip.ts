// A small pixel-art tooltip naming the bug under the cursor (or the one the frog
// is about to eat). The Scene points it at a bug each frame; it eases in and out
// so names appear and vanish softly. Drawn in the overlay layer in screen space,
// so it rides on top of everything and ignores parallax.

import type { SceneElement } from "../engine/types";
import type { World } from "../engine/World";
import { withAlpha } from "../render/color";
import { clamp } from "../anim/math";

const BG = "#0e1826";
const BORDER = "#7fb0c0";
const TEXT = "#eaf5f2";

export class BugTooltip implements SceneElement {
  private text = "";
  private tx = 0; // screen-space anchor (the bug)
  private ty = 0;
  private shown = false;
  private alpha = 0;

  /** Aim at a bug: its name and its screen position. */
  set(text: string, x: number, y: number): void {
    this.text = text;
    this.tx = x;
    this.ty = y;
    this.shown = true;
  }

  clear(): void {
    this.shown = false;
  }

  update(world: World): void {
    const target = this.shown ? 1 : 0;
    this.alpha += (target - this.alpha) * Math.min(1, world.dt * 12);
  }

  render(world: World): void {
    if (this.alpha < 0.03 || !this.text) return;
    const { ctx, width } = world;

    ctx.save();
    ctx.font = '7px ui-monospace, "SFMono-Regular", Menlo, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = Math.ceil(ctx.measureText(this.text).width);
    const boxW = tw + 8;
    const boxH = 11;
    const cx = clamp(this.tx, boxW / 2 + 2, width - boxW / 2 - 2);
    const by = Math.max(2, Math.round(this.ty - 13 - boxH));
    const bx = Math.round(cx - boxW / 2);

    ctx.globalAlpha = this.alpha;

    // Little pointer toward the bug.
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.moveTo(cx - 3, by + boxH - 0.5);
    ctx.lineTo(cx + 3, by + boxH - 0.5);
    ctx.lineTo(cx, by + boxH + 3);
    ctx.closePath();
    ctx.fill();

    // Body + thin border.
    ctx.fillStyle = withAlpha(BG, 0.9);
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = withAlpha(BORDER, 0.55);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    // Name.
    ctx.fillStyle = TEXT;
    ctx.fillText(this.text, cx, by + boxH / 2 + 0.5);
    ctx.restore();
  }
}
