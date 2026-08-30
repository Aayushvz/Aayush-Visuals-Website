// The shared per-frame blackboard. Every system and scene element reads its
// context (time, size, input) and services (rng, camera) from here rather than
// through a tangle of parameters. Progression state lives here too so later
// phases can drive how lush the pond looks without rewiring anything.

import { Camera } from "./Camera";
import type { Input } from "./Input";
import { Random } from "./Random";

export interface Progress {
  /** Bugs the frog has caught. Surfaced in the UI later. */
  bugsResolved: number;
  /**
   * How alive the pond feels, 0..1. Drives flower bloom, firefly counts,
   * colour richness. Phase 5 grows it; for now it sits at a calm baseline so
   * the environment already has something to read.
   */
  lushness: number;
}

export class World {
  /** Total elapsed seconds. */
  t = 0;
  /** Clamped delta seconds for this frame. */
  dt = 0;
  /** Internal buffer size in virtual pixels. */
  width = 0;
  height = 0;

  /** Set at the top of each render pass. */
  ctx!: CanvasRenderingContext2D;

  readonly rng: Random;
  readonly camera: Camera;

  readonly progress: Progress = { bugsResolved: 0, lushness: 0.32 };

  constructor(readonly input: Input, seed?: number) {
    this.rng = new Random(seed);
    this.camera = new Camera();
  }
}
