// A gentle diorama camera. It never really travels — it drifts by a couple of
// virtual pixels on a slow noise path and leans a touch toward the cursor, so
// the parallax layers separate and the scene reads as a lit 3D box (FEZ-ish)
// rather than a flat picture.

import { damp } from "../anim/math";
import { fbm1 } from "../anim/noise";
import type { Input } from "./Input";

export class Camera {
  /** Current offset in virtual pixels — layers multiply this by parallax. */
  x = 0;
  y = 0;

  private tx = 0;
  private ty = 0;

  constructor(
    private readonly driftAmp = 3.2,
    private readonly pointerAmp = 5.0
  ) {}

  update(t: number, dt: number, input: Input): void {
    // Slow, non-repeating wander.
    const driftX = fbm1(t * 0.05, 3) * this.driftAmp;
    const driftY = fbm1(t * 0.04 + 40, 3) * this.driftAmp * 0.6;

    // Lean toward the pointer when it's on screen (eased, so it never snaps).
    const leanX = input.present ? input.nx * this.pointerAmp : 0;
    const leanY = input.present ? input.ny * this.pointerAmp * 0.5 : 0;

    this.tx = driftX + leanX;
    this.ty = driftY + leanY;

    this.x = damp(this.x, this.tx, 0.0015, dt);
    this.y = damp(this.y, this.ty, 0.0015, dt);
  }
}
