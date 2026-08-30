// Lotus blooms resting on the water. Drawn procedurally as radiating petal rings
// so they can open with the pond's `lushness` — closed-ish now, fuller as the
// ecosystem flourishes in the progression phase. They bob on the same slow water
// rhythm as the pads.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse, disc } from "../../render/pixels";
import { bob } from "../../anim/oscillate";
import { TAU, lerp } from "../../anim/math";
import { C } from "../../config/theme";

interface Bloom {
  x: number;
  y: number;
  size: number;
  petals: number;
  period: number;
  phase: number;
  white: boolean;
  rot: number;
  /** Catches at which this bloom appears — one new lotus per bug eaten. */
  revealAt: number;
  /** Eased 0→1 reveal scale. */
  grow: number;
}

// Lotuses open on the water from the start; then one more blooms per bug caught.
const STARTER_BLOOMS = 2;

export class Flowers implements SceneElement {
  private blooms: Bloom[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly count = 4
  ) {}

  relayout(): void {
    this.blooms = [];
  }

  private build(bugsFixed: number): void {
    const { w, h, waterlineY } = this.layout;
    const waterH = h - waterlineY;
    this.blooms = [];
    for (let i = 0; i < this.count; i++) {
      const depth = this.rng.range(0.3, 1);
      const revealAt = i < STARTER_BLOOMS ? 0 : i - STARTER_BLOOMS + 1;
      this.blooms.push({
        x: Math.round(this.rng.range(w * 0.12, w * 0.88)),
        y: Math.round(waterlineY + waterH * (0.3 + depth * 0.6)),
        size: lerp(5, 9, depth) * this.rng.range(0.85, 1.15),
        petals: this.rng.chance(0.5) ? 6 : 5,
        period: this.rng.range(4, 6.5),
        phase: this.rng.next(),
        white: this.rng.chance(0.3),
        rot: this.rng.range(0, TAU),
        revealAt,
        grow: bugsFixed >= revealAt ? 1 : 0,
      });
    }
    this.blooms.sort((a, b) => a.y - b.y);
  }

  render(world: World): void {
    const bugsFixed = world.progress.bugsResolved;
    if (this.blooms.length === 0) this.build(bugsFixed);
    const { ctx, t, dt } = world;
    const open = lerp(0.55, 1, world.progress.lushness);

    for (const b of this.blooms) {
      const target = bugsFixed >= b.revealAt ? 1 : 0;
      b.grow += (target - b.grow) * Math.min(1, dt * 3.5);
      if (b.grow < 0.02) continue;

      const size = b.size * b.grow; // the whole bloom scales in as it appears
      const dy = bob(t, b.period, 0.9, b.phase);
      const cx = b.x;
      const cy = Math.round(b.y + dy);
      const petalCol = b.white ? C.lotusWhite : C.lotusPink;
      const petalLit = b.white ? C.lotusWhite : C.lotusPinkLit;
      const petalDeep = b.white ? C.lotusWhiteShade : C.lotusPinkDeep;
      const ringR = size * open;

      // Outer petal ring.
      for (let k = 0; k < b.petals; k++) {
        const a = b.rot + (k / b.petals) * TAU;
        const pxp = cx + Math.cos(a) * ringR;
        const pyp = cy + Math.sin(a) * ringR * 0.5; // flattened, top-down
        fillEllipse(ctx, Math.round(pxp), Math.round(pyp), Math.max(1, size * 0.5), Math.max(1, size * 0.34), petalDeep);
        fillEllipse(ctx, Math.round(pxp), Math.round(pyp - 0.5), Math.max(1, size * 0.36), Math.max(1, size * 0.26), petalCol);
      }
      // Inner petal ring, offset half a step.
      for (let k = 0; k < b.petals; k++) {
        const a = b.rot + ((k + 0.5) / b.petals) * TAU;
        const pxp = cx + Math.cos(a) * ringR * 0.5;
        const pyp = cy + Math.sin(a) * ringR * 0.28;
        fillEllipse(ctx, Math.round(pxp), Math.round(pyp), Math.max(1, size * 0.32), Math.max(1, size * 0.24), petalLit);
      }
      // Warm core.
      disc(ctx, cx, cy, Math.max(1, Math.round(size * 0.3)), C.lotusCore);
    }
  }
}
