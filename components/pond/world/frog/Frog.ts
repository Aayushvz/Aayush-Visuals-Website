// The mascot. It rides the hero lily pad, watches the pointer (and any nearby
// bug), and idles through a little vocabulary of behaviours — blink, look around,
// croak, stretch, yawn, scratch, wave — chosen on gentle random timers. Left
// alone it dozes off; a poke wakes it with a startled croak. Click a bug and the
// frog aims, tongue-snaps it out of the air, and gulps it down — nudging the
// pond's lushness up. All state lives here; drawing is handled by `drawFrog`, so
// this file is pure behaviour (the frog's "AI system").

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import type { LilyPads } from "../environment/LilyPads";
import type { Pad } from "../environment/LilyPads";
import type { Bugs } from "../bugs/Bugs";
import { bob, osc01 } from "../../anim/oscillate";
import { clamp, clamp01, lerp, smoothstep, damp } from "../../anim/math";
import { linear, easeInOutQuad } from "../../anim/easing";
import { Tween } from "../../anim/Tween";
import { restPose, drawFrog, type FrogPose } from "./FrogPose";
import { fillRect } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";

/** What the frog needs from anything it can eat. `Bug` matches structurally. */
export interface Catchable {
  x: number;
  y: number;
  alive: boolean;
  caught: boolean;
  targeted: boolean;
  markCaught(): void;
}

/** Where the frog sends the little flourishes of a catch. The Scene wires this
 *  to the particle pool and the water so the frog stays decoupled from both. */
export interface Effects {
  sparkle(x: number, y: number, count: number): void;
  heart(x: number, y: number): void;
  ripple(x: number, y: number, strength: number): void;
  splash(intensity: number): void;
}

type CatchPhase = "aim" | "shoot" | "retract" | "gulp";
const CATCH_DUR: Record<CatchPhase, number> = { aim: 0.16, shoot: 0.13, retract: 0.16, gulp: 0.5 };

// How far the tongue can reach from the current pad; beyond this the frog hops
// across lily pads to get closer. Also the cap on hops before it just lashes out.
const TONGUE_REACH = 4.6; // × body half-width
const MAX_HOPS = 4;

type Behaviour = "lookAround" | "croak" | "stretch" | "yawn" | "scratch" | "wave";

// Relative odds of each idle behaviour when the timer fires.
const WEIGHTS: Record<Behaviour, number> = {
  lookAround: 3,
  croak: 1.4,
  scratch: 1.2,
  stretch: 1,
  yawn: 0.8,
  wave: 0.5,
};

const DURATION: Record<Behaviour, number> = {
  lookAround: 1.8,
  croak: 1.4,
  scratch: 1.6,
  stretch: 2.2,
  yawn: 2.6,
  wave: 1.8,
};

const REST_SMILE = 0.3;
const SLEEP_AFTER = 24; // seconds of no pointer movement → doze off

const hump = (k: number): number => Math.sin(Math.PI * clamp01(k));

export class Frog implements SceneElement {
  private readonly pose: FrogPose = restPose();

  // Anchor (stage-space) refreshed each frame; hitTest reads last frame's.
  private ax = 0;
  private ay = 0;
  private bw = 12;

  // Behaviour scheduler.
  private behaviour: Behaviour | null = null;
  private readonly clock = new Tween();
  private nextIn: number;

  // Blinking runs on its own timer so it can punctuate any behaviour.
  private readonly blinkClock = new Tween();
  private blinkIn: number;
  private blinkVal = 0;
  private doubleBlink = false;

  // Gaze + attention.
  private lookX = 0;
  private lookY = -0.05;
  private glanceX = 0;
  private glanceY = 0;
  private overrideGaze = false;
  private cursorNear = false;

  // Sleep / idle tracking.
  private asleep = false;
  private idle = 0;
  private lastPx = 0;
  private lastPy = 0;

  // Catching a bug.
  private catchBug: Catchable | null = null;
  private catchPhase: CatchPhase | null = null;
  private catchT = 0;
  private catchTX = 0; // contact point captured at tongue impact
  private catchTY = 0;

  // Phase-5 flourishes.
  private croakBig = false; // this croak is a double-click "big" croak
  private crossT = 0; // seconds left cross-eyed (a butterfly is perched)

  // Living on the pads: which pad it's on, a constant body size, and the
  // hop-travel state used to reach far bugs.
  private pad: Pad | null = null;
  private frogScale = 0; // fixed from the hero pad, so the frog never resizes
  private travelBug: Catchable | null = null;
  private traveling = false;
  private hopping = false;
  private hopsDone = 0;
  private readonly hopClock = new Tween();
  private hopFromX = 0;
  private hopFromY = 0;
  private hopTo: Pad | null = null;
  private hopH = 0;
  private landed = false; // one-shot guard for landing effects

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly lily: LilyPads,
    private readonly bugs: Bugs,
    private readonly fx: Effects
  ) {
    this.nextIn = rng.range(1.5, 3);
    this.blinkIn = rng.range(2, 5);
    // Seed a fallback anchor so a first-frame poke has something to test.
    const { w, h, waterlineY } = layout;
    this.ax = Math.round(w * 0.46);
    this.ay = Math.round(waterlineY + (h - waterlineY) * 0.72);
  }

  get busy(): boolean {
    return this.catchPhase !== null || this.traveling;
  }

  // ── Interaction hooks (Scene routes pointer events here) ────────────────

  /** Is the stage-space point on the frog? */
  hitTest(sx: number, sy: number): boolean {
    const dx = sx - this.ax;
    const dy = sy - (this.ay - this.bw * 0.7);
    const rx = this.bw * 1.35;
    const ry = this.bw * 1.15;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  /** A tap on the frog: wake, startle, and croak. */
  poke(): void {
    if (this.busy) return; // don't interrupt a catch or a hop
    this.wake();
    this.pose.lid = 0;
    this.pose.blink = 0;
    this.start("croak");
    this.pose.bounce = this.bw * 0.4; // an immediate little jump
    this.fx.ripple(this.ax, this.ay, 0.4); // a nudge on the water
  }

  /** Go after a clicked bug: lash the tongue if it's near, else hop the pads
   *  toward it first. Ignored if already catching or hopping. */
  catch(bug: Catchable): void {
    if (this.busy) return;
    this.wake();
    this.behaviour = null;
    bug.targeted = true;
    this.hopsDone = 0;
    if (this.reachable(bug)) {
      this.startCatch(bug);
    } else {
      this.travelBug = bug;
      this.traveling = true;
      this.hopping = false;
      this.overrideGaze = true;
    }
  }

  private reachable(bug: Catchable): boolean {
    return Math.hypot(bug.x - this.ax, bug.y - this.ay) <= this.bw * TONGUE_REACH;
  }

  private startCatch(bug: Catchable): void {
    this.traveling = false;
    this.travelBug = null;
    this.catchBug = bug;
    this.overrideGaze = true;
    this.catchPhase = "aim";
    this.catchT = 0;
  }

  /** Double-tap: a full-bodied croak with a bigger hop and stronger ripples. */
  bigCroak(): void {
    if (this.busy) return;
    this.wake();
    this.pose.lid = 0;
    this.croakBig = true;
    this.start("croak");
    this.pose.bounce = this.bw * 0.7;
    this.fx.ripple(this.ax, this.ay, 1);
    this.fx.ripple(this.ax, this.ay + this.bw * 0.4, 0.7);
  }

  /** A butterfly has perched on the frog's snout — go cross-eyed for a while. */
  crossEye(seconds: number): void {
    this.wake();
    this.crossT = Math.max(this.crossT, seconds);
  }

  /** True while dozing — the Scene draws floating "z"s. */
  get sleeping(): boolean {
    return this.asleep;
  }

  /** Top-of-head point in stage space (a butterfly's landing spot). */
  headPoint(): { x: number; y: number } {
    return { x: this.ax, y: this.ay - this.bw * 1.55 };
  }

  // ── Simulation ──────────────────────────────────────────────────────────

  update(world: World): void {
    const { dt, t, input, camera } = world;

    const a = this.computeAnchor(t);
    this.ax = a.x;
    this.ay = a.y;
    this.bw = a.scale;

    // Pointer in stage space (this layer's parallax is 1.0).
    const curX = input.x + camera.x;
    const curY = input.y + camera.y;
    const moved = Math.hypot(input.x - this.lastPx, input.y - this.lastPy);
    this.lastPx = input.x;
    this.lastPy = input.y;
    if (input.present && moved > 0.5) {
      this.idle = 0;
      if (this.asleep) this.wake();
    } else {
      this.idle += dt;
    }

    // Where to look: an active glance wins, else the pointer if it's close,
    // else a slow idle wander.
    const dx = curX - this.ax;
    const dy = curY - (this.ay - this.bw);
    this.cursorNear = input.present && Math.hypot(dx, dy) < this.bw * 9;
    if (this.overrideGaze) {
      this.lookX = this.glanceX;
      this.lookY = this.glanceY;
    } else if (this.cursorNear) {
      this.lookX = clamp(dx / (this.bw * 6), -1, 1);
      this.lookY = clamp(dy / (this.bw * 6), -0.7, 0.7);
    } else {
      // Watch the nearest bug if one is drifting about, else wander idly.
      const head = this.ay - this.bw;
      const bug = this.bugs.nearest(this.ax, head, this.bw * 13);
      if (bug) {
        this.lookX = clamp((bug.x - this.ax) / (this.bw * 7), -1, 1);
        this.lookY = clamp((bug.y - head) / (this.bw * 7), -0.8, 0.5);
      } else {
        this.lookX = Math.sin(t * 0.4) * 0.15;
        this.lookY = -0.05 + Math.sin(t * 0.27 + 1) * 0.1;
      }
    }

    // Drift to sleep after a long undisturbed spell (never mid-action).
    if (!this.asleep && !this.behaviour && !this.catchPhase && !this.traveling && this.idle > SLEEP_AFTER) {
      this.asleep = true;
    }

    // Catching / travelling override idle behaviour entirely.
    this.relax(dt);
    if (this.catchPhase) {
      this.updateCatch(dt, world);
    } else if (this.traveling) {
      this.updateTravel(dt, world);
    } else if (this.behaviour) {
      const k = this.clock.update(dt);
      this.apply(this.behaviour, k, t);
      if (this.clock.done) this.end();
    } else if (!this.asleep) {
      this.nextIn -= dt;
      if (this.nextIn <= 0) this.pick();
    }

    // Always-on breathing, folded on top of whatever the behaviour set.
    const breath = osc01(t, this.asleep ? 5.5 : 3.4);
    this.pose.squashY *= 1 - 0.03 * breath;
    this.pose.throat = Math.max(this.pose.throat, (this.asleep ? 0.16 : 0.12) + 0.08 * breath);

    // Blink (skipped while asleep — the lids are already shut).
    this.updateBlink(dt);
    if (!this.asleep) this.pose.blink = Math.max(this.pose.blink, this.blinkVal);
    else this.pose.lid = damp(this.pose.lid, 1, 0.0002, dt);

    // Ease the pupils to the gaze target; a nearby pointer lifts a small smile.
    this.pose.eyeX = damp(this.pose.eyeX, this.lookX, 0.0009, dt);
    this.pose.eyeY = damp(this.pose.eyeY, this.lookY, 0.0009, dt);
    if (this.cursorNear && !this.asleep) this.pose.smile = Math.max(this.pose.smile, 0.5);

    // A perched butterfly crosses the eyes and keeps the frog awake.
    if (this.crossT > 0) {
      this.crossT -= dt;
      this.pose.cross = 1;
      this.pose.smile = Math.max(this.pose.smile, 0.4);
      this.idle = 0;
    }
  }

  /** Relax every channel a behaviour might have pushed back toward rest. */
  private relax(dt: number): void {
    const p = this.pose;
    p.smile = damp(p.smile, REST_SMILE, 0.002, dt);
    p.lean = damp(p.lean, 0, 0.002, dt);
    p.armL = damp(p.armL, 0, 0.003, dt);
    p.armR = damp(p.armR, 0, 0.003, dt);
    p.armWave = damp(p.armWave, 0, 0.001, dt);
    p.mouth = damp(p.mouth, 0, 0.001, dt);
    p.throat = damp(p.throat, 0, 0.004, dt);
    p.squashY = damp(p.squashY, 1, 0.002, dt);
    p.bounce = damp(p.bounce, 0, 0.001, dt);
    if (!this.asleep) p.lid = damp(p.lid, 0, 0.002, dt);
    p.cross = damp(p.cross, 0, 0.004, dt);
    p.blink = 0; // reapplied from the blink clock after behaviours run
    p.tongue = 0; // only the catch sequence extends it (written after relax)
  }

  private pick(): void {
    // Waving is only worth it when there's someone to wave at.
    let total = 0;
    const keys = Object.keys(WEIGHTS) as Behaviour[];
    for (const k of keys) total += k === "wave" && !this.cursorNear ? 0 : WEIGHTS[k];
    let r = this.rng.next() * total;
    let chosen: Behaviour = "lookAround";
    for (const k of keys) {
      const w = k === "wave" && !this.cursorNear ? 0 : WEIGHTS[k];
      if ((r -= w) <= 0) {
        chosen = k;
        break;
      }
    }
    this.start(chosen);
  }

  private start(b: Behaviour): void {
    this.behaviour = b;
    this.clock.start(DURATION[b], linear);
    if (b === "lookAround") {
      this.glanceX = this.rng.range(-1, 1);
      this.glanceY = this.rng.range(-0.5, 0.5);
      this.overrideGaze = true;
    }
  }

  private end(): void {
    this.behaviour = null;
    this.overrideGaze = false;
    this.croakBig = false;
    this.nextIn = this.rng.range(2.4, 5.5);
  }

  private wake(): void {
    this.asleep = false;
    this.idle = 0;
  }

  // ── Catching ─────────────────────────────────────────────────────────────

  /** Mouth position in stage space, matching drawFrog's geometry. */
  private mouthPoint(): { x: number; y: number } {
    const p = this.pose;
    const bodyH = this.bw * 0.8 * p.squashY;
    const bodyCy = this.ay - bodyH * 0.82 - p.bounce;
    return { x: this.ax + p.lean * this.bw * 0.12, y: bodyCy + bodyH * 0.25 };
  }

  private toPhase(next: CatchPhase): void {
    this.catchPhase = next;
    this.catchT = 0;
  }

  /** Aim → shoot the tongue → retract (bug rides the tip) → gulp it down. */
  private updateCatch(dt: number, world: World): void {
    const p = this.pose;
    const bug = this.catchBug;
    this.catchT += dt;

    // Lock gaze and lean onto the prey (or the last contact point).
    const locked = this.catchPhase === "retract" || this.catchPhase === "gulp";
    const aimX = locked || !bug ? this.catchTX : bug.x;
    const aimY = locked || !bug ? this.catchTY : bug.y;
    const head = this.ay - this.bw;
    this.glanceX = clamp((aimX - this.ax) / (this.bw * 6), -1, 1);
    this.glanceY = clamp((aimY - head) / (this.bw * 6), -1, 0.6);
    p.lean = clamp((aimX - this.ax) / (this.bw * 4), -1, 1) * 0.32;

    const k = clamp01(this.catchT / CATCH_DUR[this.catchPhase as CatchPhase]);
    switch (this.catchPhase) {
      case "aim":
        p.mouth = smoothstep(0, 1, k) * 0.5;
        p.tongue = 0;
        if (k >= 1) this.toPhase("shoot");
        break;

      case "shoot":
        p.mouth = 0.62;
        if (bug) {
          p.tongueX = bug.x;
          p.tongueY = bug.y;
        }
        p.tongue = k;
        if (k >= 1) {
          if (bug) {
            this.catchTX = bug.x;
            this.catchTY = bug.y;
            bug.markCaught();
            this.fx.sparkle(bug.x, bug.y, 6); // a puff where it's snapped
          }
          this.toPhase("retract");
        }
        break;

      case "retract": {
        p.mouth = 0.45;
        p.tongueX = this.catchTX;
        p.tongueY = this.catchTY;
        p.tongue = 1 - k;
        const m = this.mouthPoint(); // bug rides the shrinking tongue tip
        if (bug) {
          bug.x = lerp(m.x, this.catchTX, p.tongue);
          bug.y = lerp(m.y, this.catchTY, p.tongue);
        }
        if (k >= 1) {
          if (bug) bug.alive = false;
          this.catchBug = null;
          world.progress.bugsResolved++;
          world.progress.lushness = clamp01(world.progress.lushness + 0.06);
          const mo = this.mouthPoint(); // a heart floats up as it gulps
          this.fx.heart(mo.x, mo.y - this.bw * 0.6);
          this.fx.sparkle(mo.x, mo.y, 3);
          this.fx.ripple(this.ax, this.ay, 0.5);
          this.toPhase("gulp");
        }
        break;
      }

      case "gulp": {
        p.tongue = 0;
        const swell = Math.sin(Math.PI * k);
        p.throat = 0.3 + 0.6 * swell; // the bug goes down
        p.mouth = (1 - smoothstep(0, 0.4, k)) * 0.4;
        p.smile = 0.6;
        p.lid = Math.max(p.lid, 0.35 * swell); // a satisfied squint
        p.bounce = this.bw * 0.06 * swell;
        if (k >= 1) {
          this.catchPhase = null;
          this.overrideGaze = false;
          this.nextIn = this.rng.range(1.2, 2.6);
        }
        break;
      }
    }
  }

  /** Shape the pose for one behaviour from its linear progress `k`. */
  private apply(b: Behaviour, k: number, t: number): void {
    const p = this.pose;
    switch (b) {
      case "lookAround":
        p.lean = this.glanceX * 0.25 * hump(k);
        break;

      case "croak": {
        // Two throat pulses with a matching mouth flap and a small hop; a "big"
        // croak (double-tap) puffs harder and hops higher.
        const pulse = Math.min(1, 0.55 * hump(clamp01(k / 0.5)) + 0.55 * hump(clamp01((k - 0.4) / 0.6)));
        const big = this.croakBig;
        p.throat = Math.min(1, (0.25 + 0.75 * pulse) * (big ? 1.35 : 1));
        p.mouth = 0.18 * pulse * (big ? 1.5 : 1);
        p.bounce = this.bw * (big ? 0.2 : 0.12) * pulse;
        p.smile = 0.5;
        break;
      }

      case "yawn": {
        const o = hump(k);
        p.mouth = smoothstep(0, 1, o);
        p.lid = 0.25 + 0.7 * o; // eyes squeeze shut at the peak
        p.lean = -0.18 * o;
        p.smile = 0.2;
        break;
      }

      case "stretch": {
        let sq = 1;
        let bnc = 0;
        let arm = 0;
        let lid = 0;
        if (k < 0.28) {
          const u = smoothstep(0, 1, k / 0.28);
          sq = lerp(1, 0.82, u); // crouch / anticipate
          arm = 0.2 * u;
          lid = 0.3 * u;
        } else if (k < 0.6) {
          const u = smoothstep(0, 1, (k - 0.28) / 0.32);
          sq = lerp(0.82, 1.15, u); // reach up
          bnc = Math.sin(Math.PI * u) * this.bw * 0.14;
          arm = lerp(0.2, 1, u);
          lid = lerp(0.3, 0.6, u);
        } else {
          const u = smoothstep(0, 1, (k - 0.6) / 0.4);
          sq = lerp(1.15, 1, u); // settle
          arm = lerp(1, 0, u);
          lid = lerp(0.6, 0, u);
        }
        p.squashY = sq;
        p.bounce = bnc;
        p.armL = arm;
        p.armR = arm;
        p.lid = Math.max(p.lid, lid);
        break;
      }

      case "scratch": {
        const r = hump(k);
        p.armR = 0.78 * smoothstep(0, 1, r); // hand up by the cheek, not overhead
        p.armWave = r > 0.25 ? Math.sin(t * 26) * 0.3 : 0; // quick side-to-side scratch
        p.lean = 0.2 * r;
        p.lid = Math.max(p.lid, 0.25 * r);
        break;
      }

      case "wave": {
        const r = smoothstep(0, 1, hump(k));
        p.armR = r;
        p.armWave = Math.sin(t * 9) * 0.9 * r;
        p.smile = 0.6;
        break;
      }
    }
  }

  private updateBlink(dt: number): void {
    if (this.asleep) {
      this.blinkVal = 0;
      return;
    }
    if (!this.blinkClock.active && (this.blinkIn -= dt) <= 0) {
      this.blinkClock.start(0.16, linear);
      this.blinkIn = this.rng.range(2.4, 5.6);
      this.doubleBlink = this.rng.chance(0.22);
    }
    if (this.blinkClock.active) {
      const k = this.blinkClock.update(dt);
      this.blinkVal = Math.sin(Math.PI * k);
      if (this.blinkClock.done && this.doubleBlink) {
        this.doubleBlink = false;
        this.blinkClock.start(0.16, linear);
      }
    } else {
      this.blinkVal = 0;
    }
  }

  // ── Travelling the pond, pad by pad ──────────────────────────────────────

  /** Between hops, decide: reach the bug, give up hopping, or hop closer. */
  private updateTravel(dt: number, world: World): void {
    const bug = this.travelBug;
    if (!bug || !bug.alive) {
      this.endTravel();
      return;
    }
    // Keep eyes and lean on the target the whole way.
    const head = this.ay - this.bw;
    this.glanceX = clamp((bug.x - this.ax) / (this.bw * 6), -1, 1);
    this.glanceY = clamp((bug.y - head) / (this.bw * 6), -1, 0.6);
    this.pose.lean = clamp((bug.x - this.ax) / (this.bw * 4), -1, 1) * 0.22;

    if (this.hopping) {
      this.advanceHop(dt, world);
      return;
    }
    if (this.reachable(bug) || this.hopsDone >= MAX_HOPS) {
      this.startCatch(bug);
      return;
    }
    const next = this.planHop(bug, world.t);
    if (!next) {
      this.startCatch(bug); // no stepping stone gets closer — lash from here
      return;
    }
    this.beginHop(next);
  }

  /** The grown pad that gets meaningfully closer to the bug (or null). */
  private planHop(bug: Catchable, t: number): Pad | null {
    const curD = Math.hypot(bug.x - this.ax, bug.y - this.ay);
    let best: Pad | null = null;
    let bestD = curD - 4; // require real progress
    for (const p of this.lily.pads) {
      if (p === this.pad || p.grow < 0.6) continue;
      const pp = this.padPos(p, t);
      const d = Math.hypot(bug.x - pp.x, bug.y - pp.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private beginHop(pad: Pad): void {
    this.hopping = true;
    this.landed = false;
    this.hopFromX = this.ax;
    this.hopFromY = this.ay;
    this.hopTo = pad;
    this.hopH = this.bw * 1.5; // arc height
    this.hopClock.start(0.6, linear);
  }

  /** Crouch → spring → arc → land squash, moving pad-to-pad. The body arcs via
   *  `bounce` (shadow stays on the water); the anchor glides horizontally. */
  private advanceHop(dt: number, world: World): void {
    const k = this.hopClock.update(dt);
    const p = this.pose;
    const to = this.hopTo ? this.padPos(this.hopTo, world.t) : { x: this.hopFromX, y: this.hopFromY };

    const e = easeInOutQuad(clamp01((k - 0.15) / 0.7));
    this.ax = Math.round(lerp(this.hopFromX, to.x, e));
    this.ay = Math.round(lerp(this.hopFromY, to.y, e));

    if (k < 0.15) {
      p.squashY = lerp(1, 0.72, smoothstep(0, 1, k / 0.15)); // crouch
      p.bounce = 0;
    } else if (k < 0.82) {
      const u = (k - 0.15) / 0.67; // flight: stretch + parabolic arc
      p.squashY = 1.14;
      p.bounce = Math.sin(Math.PI * u) * this.hopH;
    } else {
      const u = (k - 0.82) / 0.18; // land squash, then settle
      p.squashY = lerp(0.7, 1, smoothstep(0, 1, u));
      p.bounce = 0;
      if (!this.landed && u > 0.1 && this.hopTo) {
        this.landed = true;
        this.pad = this.hopTo;
        this.lily.bounce(this.hopTo);
        this.fx.ripple(to.x, to.y + this.bw * 0.4, 0.6);
        this.fx.splash(0.4); // a soft plip as it lands
      }
    }

    if (this.hopClock.done) {
      this.hopping = false;
      this.hopsDone++;
      if (this.hopTo) this.pad = this.hopTo;
      this.hopTo = null;
    }
  }

  private endTravel(): void {
    this.traveling = false;
    this.hopping = false;
    this.travelBug = null;
    this.hopTo = null;
    this.overrideGaze = false;
  }

  // ── Placement ────────────────────────────────────────────────────────────

  /*
    The pond has been rebuilt at a new size.

    LilyPads.relayout() throws its pads away and builds new ones, so every Pad
    this frog is holding — the one it is sitting on, and the one it is hopping
    towards — is now an orphan carrying coordinates for the old buffer. Keeping
    them means the frog sits somewhere that no longer exists: go from a tall
    window to a short one and its pad's y lands past the bottom edge, and the
    frog simply vanishes from the pond.

    So drop the references, cancel anything in flight, and let resolvePad()
    seat it on the new hero pad. frogScale is re-derived for the same reason —
    it is deliberately fixed for the session so the frog never resizes between
    pads, but a new buffer means a new hero pad and a new right answer.

    Nothing needed this before: the standalone build was one canvas in one tab,
    where a resize was rare and a lost frog was a refresh away. Here the pond
    is a route, and on a phone the address bar collapsing fires a resize on
    the first scroll.
  */
  relayout(): void {
    this.pad = null;
    this.hopTo = null;
    this.hopping = false;
    this.traveling = false;
    this.travelBug = null;
    this.frogScale = 0;
  }

  private resolvePad(): void {
    if (this.frogScale === 0) {
      const hp = this.lily.heroPad();
      if (hp) this.frogScale = clamp(hp.rx * 0.6, 9, 20);
    }
    if (!this.pad) this.pad = this.lily.heroPad() ?? null;
  }

  /** A pad's seat point, riding its bob and any landing dip. */
  private padPos(pad: Pad, t: number): { x: number; y: number } {
    const dy = bob(t, pad.period, 1.1, pad.phase);
    return { x: pad.x, y: Math.round(pad.y + dy + pad.press - pad.ry * 0.2) };
  }

  /** Where the frog sits — its current pad (mid-hop, the caller overrides). */
  private computeAnchor(t: number): { x: number; y: number; scale: number } {
    this.resolvePad();
    const scale = this.frogScale || 14;
    if (this.pad) {
      const p = this.padPos(this.pad, t);
      return { x: p.x, y: p.y, scale };
    }
    const { w, h, waterlineY } = this.layout;
    return {
      x: Math.round(w * 0.46),
      y: Math.round(waterlineY + (h - waterlineY) * 0.72),
      scale,
    };
  }

  render(world: World): void {
    // Draw at the anchor the update pass resolved (incl. any mid-hop arc).
    drawFrog(world.ctx, this.ax, this.ay, this.bw, this.pose);
    if (this.asleep) this.drawZzz(world);
  }

  /** Little "z"s drifting up from the head while it naps. */
  private drawZzz(world: World): void {
    const { ctx, t } = world;
    const hx = this.ax + this.bw * 0.7;
    const hy = this.ay - this.bw * 1.4;
    for (let i = 0; i < 2; i++) {
      const cyc = (t * 0.45 + i * 0.5) % 1; // 0→1 rising
      const a = cyc < 0.15 ? cyc / 0.15 : 1 - (cyc - 0.15) / 0.85;
      if (a <= 0.02) continue;
      const zx = Math.round(hx + cyc * this.bw * 0.5 + Math.sin(cyc * 6) * 1.2);
      const zy = Math.round(hy - cyc * this.bw * 1.7);
      this.zGlyph(ctx, zx, zy, i === 0 ? 2 : 1, withAlpha(C.frogEyeHi, clamp01(a) * 0.85));
    }
  }

  private zGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
    const cell = (cx: number, cy: number): void => fillRect(ctx, x + cx * s, y + cy * s, s, s, color);
    cell(0, 0); cell(1, 0); cell(2, 0); cell(3, 0); // top bar
    cell(2, 1); cell(1, 2); // diagonal
    cell(0, 3); cell(1, 3); cell(2, 3); cell(3, 3); // bottom bar
  }
}
