// Wall-clock for the game loop. Produces a clamped delta so a backgrounded tab
// (or a slow frame) never teleports the simulation, and tracks total elapsed
// time that every oscillator reads from.

export class Clock {
  /** Total elapsed seconds since start. */
  elapsed = 0;
  /** Seconds since the previous frame, clamped. */
  delta = 0;

  private last = performance.now() / 1000;
  private readonly maxDelta: number;

  constructor(maxDelta = 1 / 15) {
    this.maxDelta = maxDelta;
  }

  tick(now: number): void {
    const nowS = now / 1000;
    let dt = nowS - this.last;
    this.last = nowS;
    if (dt < 0) dt = 0;
    if (dt > this.maxDelta) dt = this.maxDelta; // avoid huge catch-up jumps
    this.delta = dt;
    this.elapsed += dt;
  }
}
