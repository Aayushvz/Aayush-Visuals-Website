// A tiny one-shot animation clock. Behaviours (the frog's croak, yawn, stretch…)
// start one, feed it `dt`, and read back an eased 0→1 progress, then shape their
// own pose curves from it. Reusable, allocation-free, no per-frame garbage.

import type { Easing } from "./easing";
import { linear } from "./easing";

export class Tween {
  private t = 0;
  private dur = 1;
  private ease: Easing = linear;
  /** True while the tween is still running. */
  active = false;
  /** Eased progress from the most recent `update` (0..1). */
  k = 0;

  /** (Re)start the clock. Returns `this` for chaining. */
  start(dur: number, ease: Easing = linear): this {
    this.t = 0;
    this.dur = Math.max(1e-4, dur);
    this.ease = ease;
    this.active = true;
    this.k = 0;
    return this;
  }

  /** Advance by `dt` seconds; returns eased progress. Deactivates at the end. */
  update(dt: number): number {
    if (!this.active) return this.k;
    this.t += dt;
    const raw = this.t >= this.dur ? 1 : this.t / this.dur;
    this.k = this.ease(raw);
    if (raw >= 1) this.active = false;
    return this.k;
  }

  get done(): boolean {
    return !this.active;
  }
}
