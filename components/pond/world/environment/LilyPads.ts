// Lily pads drifting on the surface. Each is a flattened disc with a radial slit,
// a rim and a top highlight, bobbing gently and dipping on a spring when the frog
// lands. One large "hero" pad sits low and centre — where the frog starts before
// it goes hopping.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse } from "../../render/pixels";
import { bob } from "../../anim/oscillate";
import { TAU } from "../../anim/math";
import { C } from "../../config/theme";

export interface Pad {
  x: number;
  y: number;
  rx: number;
  ry: number;
  period: number;
  phase: number;
  slit: number; // angle of the notch
  hero: boolean;
  /** Catches at which this pad appears (0 = always) — one per two bugs eaten. */
  revealAt: number;
  /** Eased 0→1 reveal scale — pops in when it's revealed. */
  grow: number;
  /** Springy vertical dip (+down) from a frog landing, and its velocity. */
  press: number;
  pressV: number;
}

// Pads present from the start (besides the hero); the rest unfurl as the pond
// flourishes — one more per PADS_PER_BUG bugs eaten. Pads are big, so they grow
// half as fast as the lotuses; the pond fills in without getting crowded.
const STARTER_PADS = 4;
const PADS_PER_BUG = 2;

export class LilyPads implements SceneElement {
  readonly pads: Pad[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly count = 6
  ) {}

  relayout(): void {
    this.pads.length = 0;
  }

  /** The big centre-low pad the frog sits on. Undefined until first built. */
  heroPad(): Pad | undefined {
    return this.pads.find((p) => p.hero);
  }

  /** A frog just landed here — give the pad a springy little dip. */
  bounce(pad: Pad): void {
    pad.pressV += 44;
  }

  private build(bugsFixed: number): void {
    const { w, h, waterlineY } = this.layout;
    const waterH = h - waterlineY;
    this.pads.length = 0;

    // Hero pad: large, low, slightly left of centre — always present.
    this.pads.push({
      x: Math.round(w * 0.46),
      y: Math.round(waterlineY + waterH * 0.72),
      rx: Math.round(Math.min(w * 0.12, 30)),
      ry: 0,
      period: this.rng.range(4.5, 6),
      phase: this.rng.next(),
      slit: this.rng.range(-0.5, 0.5),
      hero: true,
      revealAt: 0,
      grow: 1,
      press: 0,
      pressV: 0,
    });

    for (let i = 0; i < this.count; i++) {
      const depth = this.rng.next(); // 0 far → 1 near
      const y = waterlineY + waterH * (0.12 + depth * 0.8);
      const rx = (7 + depth * 17) * this.rng.range(0.8, 1.2);
      // Starters are here from the off; the rest reveal every other bug.
      const revealAt = i < STARTER_PADS ? 0 : (i - STARTER_PADS + 1) * PADS_PER_BUG;
      this.pads.push({
        x: Math.round(this.rng.range(w * 0.08, w * 0.92)),
        y: Math.round(y),
        rx: Math.round(rx),
        ry: 0,
        period: this.rng.range(3.5, 6.5),
        phase: this.rng.next(),
        slit: this.rng.range(0, TAU),
        hero: false,
        revealAt,
        grow: bugsFixed >= revealAt ? 1 : 0,
        press: 0,
        pressV: 0,
      });
    }
    for (const p of this.pads) p.ry = Math.max(2, Math.round(p.rx * 0.42));
    this.pads.sort((a, b) => a.y - b.y); // paint far→near
  }

  render(world: World): void {
    const bugsFixed = world.progress.bugsResolved;
    if (this.pads.length === 0) this.build(bugsFixed);
    const { ctx, t, dt } = world;

    for (const p of this.pads) {
      // Ease the reveal toward its target (1 once it has been revealed).
      const target = bugsFixed >= p.revealAt ? 1 : 0;
      p.grow += (target - p.grow) * Math.min(1, dt * 3.5);
      if (p.grow < 0.02) continue;

      const rx = Math.max(1, Math.round(p.rx * p.grow));
      const ry = Math.max(1, Math.round(p.ry * p.grow));
      // Spring any landing dip back to rest (a little wobble under the frog).
      p.pressV += (-p.press * 420 - p.pressV * 9) * dt;
      p.press += p.pressV * dt;
      const dy = bob(t, p.period, 1.1, p.phase);
      const cx = p.x;
      const cy = Math.round(p.y + dy + p.press);

      // Rim (slightly larger dark disc) then the pad body and top light.
      fillEllipse(ctx, cx, cy, rx + 1, ry + 1, C.padRim);
      fillEllipse(ctx, cx, cy, rx, ry, C.padBase);
      fillEllipse(ctx, cx - Math.round(rx * 0.18), cy - 1, Math.round(rx * 0.72), Math.round(ry * 0.6), C.padLit);

      this.drawSlit(ctx, cx, cy, p, rx);
    }
  }

  private drawSlit(ctx: CanvasRenderingContext2D, cx: number, cy: number, p: Pad, rx: number): void {
    // Dark wedge from the rim toward the centre — the lily pad's signature notch.
    const dx = Math.cos(p.slit);
    const dy = Math.sin(p.slit) * 0.42;
    ctx.fillStyle = C.padDark;
    for (let i = 0; i < rx; i++) {
      const x = cx + dx * i;
      const y = cy + dy * i;
      const wdt = Math.max(1, Math.round((1 - i / rx) * 2));
      ctx.fillRect(Math.round(x) - (wdt >> 1), Math.round(y), wdt, 1);
    }
  }
}
