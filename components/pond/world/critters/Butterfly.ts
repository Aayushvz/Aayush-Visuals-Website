// A friendly visitor (not a pest — you can't catch it). Every so often a
// butterfly flutters in from the edge, settles on the frog's snout for a few
// seconds — crossing its eyes as it tries to watch it — then drifts away. It
// tracks the frog through a tiny interface so it stays decoupled from the Frog.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse, px } from "../../render/pixels";
import { C } from "../../config/theme";

/** What the butterfly needs from the frog. `Frog` matches structurally. */
export interface Perchable {
  headPoint(): { x: number; y: number };
  crossEye(seconds: number): void;
}

type State = "away" | "incoming" | "perched" | "leaving";

export class Butterfly implements SceneElement {
  private state: State = "away";
  private x = 0;
  private y = 0;
  private tx = 0;
  private ty = 0;
  private wait: number;
  private perch = 0;
  private readonly seed: number;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly frog: Perchable
  ) {
    this.wait = rng.range(14, 30); // first visit not too far off
    this.seed = rng.range(0, 100);
  }

  private startVisit(): void {
    const { w, h } = this.layout;
    const fromLeft = this.rng.chance(0.5);
    this.x = fromLeft ? -10 : w + 10;
    this.y = this.rng.range(h * 0.15, h * 0.4);
    this.state = "incoming";
  }

  private pickExit(): void {
    const { w, h } = this.layout;
    this.tx = this.rng.chance(0.5) ? -20 : w + 20;
    this.ty = this.rng.range(h * 0.08, h * 0.34);
  }

  private approach(dt: number, t: number, speed: number): void {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * speed * dt + Math.sin(t * 8 + this.seed) * 12 * dt;
    this.y += (dy / d) * speed * dt + Math.cos(t * 7 + this.seed) * 10 * dt;
  }

  update(world: World): void {
    const { dt, t } = world;
    switch (this.state) {
      case "away":
        if ((this.wait -= dt) <= 0) this.startVisit();
        break;
      case "incoming": {
        const hp = this.frog.headPoint();
        this.tx = hp.x;
        this.ty = hp.y - 2;
        this.approach(dt, t, 58);
        if (Math.hypot(this.x - this.tx, this.y - this.ty) < 3) {
          this.state = "perched";
          this.perch = this.rng.range(3, 5);
        }
        break;
      }
      case "perched": {
        const hp = this.frog.headPoint();
        this.x = hp.x + Math.sin(t * 1.5) * 1;
        this.y = hp.y - 2 + Math.sin(t * 2) * 0.5;
        this.frog.crossEye(0.4); // keep the frog cross-eyed while perched
        if ((this.perch -= dt) <= 0) {
          this.state = "leaving";
          this.pickExit();
        }
        break;
      }
      case "leaving": {
        this.approach(dt, t, 70);
        const { w } = this.layout;
        if (this.x < -16 || this.x > w + 16) {
          this.state = "away";
          this.wait = this.rng.range(22, 48);
        }
        break;
      }
    }
  }

  render(world: World): void {
    if (this.state === "away") return;
    const { ctx, t } = world;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    // Perched wings beat slower and rest more closed.
    const hz = this.state === "perched" ? 6 : 13;
    const open = (this.state === "perched" ? 0.4 : 0.5) + 0.5 * Math.abs(Math.sin(t * hz + this.seed));
    const wx = 3.4 * open;

    // Upper + lower wings, two hues.
    fillEllipse(ctx, x - wx, y - 1, wx, 2.4, C.butterflyA);
    fillEllipse(ctx, x + wx, y - 1, wx, 2.4, C.butterflyA);
    fillEllipse(ctx, x - wx * 0.85, y + 1.4, wx * 0.8, 1.7, C.butterflyB);
    fillEllipse(ctx, x + wx * 0.85, y + 1.4, wx * 0.8, 1.7, C.butterflyB);
    // Body + antennae.
    fillEllipse(ctx, x, y, 1, 3, C.butterflyBody);
    px(ctx, x - 1, y - 4, C.butterflyBody);
    px(ctx, x + 1, y - 4, C.butterflyBody);
  }
}
