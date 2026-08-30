// The frog is drawn procedurally from a small bag of pose numbers rather than a
// stack of sprite frames — that's what lets one little body blink, look around,
// puff its throat, yawn, stretch and wave from continuous values. `drawFrog`
// reads a pose and paints it; the AI in `Frog.ts` is the only thing that writes
// one. Everything snaps to the virtual-pixel grid so it stays crisp pixel art.

import { fillEllipse, fillRect, px, disc } from "../../render/pixels";
import { withAlpha, mix } from "../../render/color";
import { clamp01, lerp } from "../../anim/math";
import { C } from "../../config/theme";

export interface FrogPose {
  /** Upper eyelid sweep from a quick blink, 0 open → 1 shut. */
  blink: number;
  /** Sustained sleepy droop of the lids, 0 open → 1 shut. */
  lid: number;
  /** Pupil offset, each roughly [-1,1]. */
  eyeX: number;
  eyeY: number;
  /** Mouth gape for yawns/croaks, 0 closed → 1 wide. */
  mouth: number;
  /** Mouth curve, -1 frown → 0 flat → 1 grin. */
  smile: number;
  /** Throat pouch inflation, 0 slack → 1 full puff. */
  throat: number;
  /** Whole-body tilt, [-1,1]. */
  lean: number;
  /** Vertical squash/stretch of the body, 1 = neutral. */
  squashY: number;
  /** Arm raise per side, 0 resting → 1 up by the head. */
  armL: number;
  armR: number;
  /** Sideways swing of a raised right hand (for waving). */
  armWave: number;
  /** Body lift in virtual pixels (croak hop / stretch), + = up. */
  bounce: number;
  /** Tongue extension toward the target, 0 in-mouth → 1 at the target. */
  tongue: number;
  /** Tongue tip target, in the same space as the frog's draw origin. */
  tongueX: number;
  tongueY: number;
  /** Cross-eyed convergence, 0 normal → 1 fully crossed (a butterfly landed). */
  cross: number;
}

export const restPose = (): FrogPose => ({
  blink: 0,
  lid: 0,
  eyeX: 0,
  eyeY: -0.05,
  mouth: 0,
  smile: 0.3,
  throat: 0.12,
  lean: 0,
  squashY: 1,
  armL: 0,
  armR: 0,
  armWave: 0,
  bounce: 0,
  tongue: 0,
  tongueX: 0,
  tongueY: 0,
  cross: 0,
});

// Pre-mixed tints so the hot path never parses hex.
const EYE_BASE = mix(C.frogEyeHi, C.frogBody, 0.24); // pale, not stark white
const SHADOW = "#0a1512";

/** A tapered rounded segment (upper arm, forearm or finger) drawn as a run of
 *  discs so limbs read as soft, chunky pixel shapes rather than thin sticks. */
const capsule = (
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r0: number,
  r1: number,
  color: string
): void => {
  const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disc(ctx, Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), Math.max(0.6, r0 + (r1 - r0) * t), color);
  }
};

interface ArmGeom {
  cx: number;
  cy: number;
  bodyCx: number;
  bodyCy: number;
  bodyW: number;
  bodyH: number;
  bw: number;
  bh: number;
}

/**
 * One articulated arm: shoulder → elbow → hand with three splayed fingers.
 * `raise` blends between a hand resting on the pad (0) and an arm lifted up-and-
 * out beside the head (1); `wave` swings a raised hand sideways. Drawn in two
 * passes (shade underlay, then body) so it keeps a clean outline over the body.
 */
const drawArm = (
  ctx: CanvasRenderingContext2D,
  side: number,
  raise: number,
  wave: number,
  g: ArmGeom
): void => {
  const { cx, cy, bodyCx, bodyCy, bodyW, bodyH, bw, bh } = g;
  const sx = bodyCx + side * bodyW * 0.8; // shoulder
  const sy = bodyCy + bodyH * 0.02;

  // Resting: arm hangs to a hand on the pad in front.
  const restEx = sx + side * bw * 0.16;
  const restEy = sy + bh * 0.5;
  const restHx = cx + side * bw * 0.5;
  const restHy = cy - bh * 0.04;
  // Raised: elbow out and up, hand high and clear of the head (+ wave swing).
  const upEx = sx + side * bw * 0.72;
  const upEy = sy - bh * 0.28;
  const upHx = sx + side * bw * 0.5 + wave * bw * 0.55;
  const upHy = sy - bh * 1.15;

  const ex = lerp(restEx, upEx, raise);
  const ey = lerp(restEy, upEy, raise);
  const hx = lerp(restHx, upHx, raise);
  const hy = lerp(restHy, upHy, raise);

  // Wrist direction, for fanning the fingers.
  let dx = hx - ex;
  let dy = hy - ey;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;
  const fingers = [-0.6, 0, 0.6];
  const fLen = bw * 0.34;
  const palmR = bw * 0.22;

  // Pass 1: shade underlay (slightly fatter) for a uniform outline.
  capsule(ctx, sx, sy, ex, ey, 3, 2.5, C.frogBodyShade);
  capsule(ctx, ex, ey, hx, hy, 2.5, 2, C.frogBodyShade);
  disc(ctx, Math.round(hx), Math.round(hy), palmR + 0.8, C.frogBodyShade);
  for (const a of fingers) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    capsule(ctx, hx, hy, hx + (dx * ca - dy * sa) * fLen, hy + (dx * sa + dy * ca) * fLen, 1.9, 1.1, C.frogBodyShade);
  }
  // Pass 2: body fill.
  capsule(ctx, sx, sy, ex, ey, 2.3, 1.9, C.frogBody);
  capsule(ctx, ex, ey, hx, hy, 1.9, 1.5, C.frogBody);
  for (const a of fingers) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    capsule(ctx, hx, hy, hx + (dx * ca - dy * sa) * fLen, hy + (dx * sa + dy * ca) * fLen, 1.3, 0.7, C.frogBody);
  }
  disc(ctx, Math.round(hx), Math.round(hy), palmR, C.frogBody);
  fillEllipse(ctx, hx - 1, hy - 1, palmR * 0.5, palmR * 0.4, C.frogBodyLit);
};

/**
 * Paint the frog. `(cx, cy)` is where it meets the pad (bottom-centre of the
 * body); `bw` is the body half-width the rest of the anatomy scales from.
 */
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bw: number,
  p: FrogPose
): void {
  const bh = bw * 0.8;
  const sq = p.squashY;
  const bodyW = bw * (1 + (1 - sq) * 0.5); // widen as it squashes (volume-ish)
  const bodyH = bh * sq;
  const seatY = cy;
  const bodyCx = cx + p.lean * bw * 0.12;
  const bodyCy = seatY - bodyH * 0.82 - p.bounce;

  // ── Contact shadow on the pad ──────────────────────────────────────────
  fillEllipse(ctx, cx, seatY + 1, bodyW * 1.05 * (1 - p.bounce * 0.03), bh * 0.3, withAlpha(SHADOW, 0.32));

  // ── Back haunches, tucked behind the body ──────────────────────────────
  for (const side of [-1, 1]) {
    fillEllipse(ctx, bodyCx + side * bodyW * 0.84, bodyCy + bodyH * 0.42, bodyW * 0.4, bodyH * 0.5, C.frogBodyShade);
  }

  // ── Front feet peeking out at the waterline ────────────────────────────
  for (const side of [-1, 1]) {
    const fx = cx + side * bw * 0.58;
    const fy = seatY - 2;
    fillEllipse(ctx, fx, fy, bw * 0.3, bw * 0.15, C.frogBodyShade);
    fillEllipse(ctx, fx, fy - 1, bw * 0.24, bw * 0.11, C.frogBody);
    px(ctx, Math.round(fx - bw * 0.16), Math.round(fy), C.frogBodyShade);
    px(ctx, Math.round(fx + bw * 0.16), Math.round(fy), C.frogBodyShade);
  }

  // ── Body, belly, top light ─────────────────────────────────────────────
  fillEllipse(ctx, bodyCx, bodyCy, bodyW, bodyH, C.frogBody);
  fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.34, bodyW * 0.6, bodyH * 0.5, C.frogBelly);
  fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.5, bodyW * 0.5, bodyH * 0.28, C.frogBellyShade);
  fillEllipse(ctx, bodyCx - bodyW * 0.16, bodyCy - bodyH * 0.34, bodyW * 0.5, bodyH * 0.34, C.frogBodyLit);

  // ── Throat pouch ───────────────────────────────────────────────────────
  if (p.throat > 0.04) {
    const th = p.throat;
    fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.6, bodyW * 0.34 * (0.7 + th * 0.6), bodyH * 0.3 * (0.5 + th), C.frogBelly);
  }

  // ── Face geometry ──────────────────────────────────────────────────────
  const eyeSpread = bodyW * 0.5;
  const eyeY = bodyCy - bodyH * 0.48;
  const eyeR = bw * 0.34;
  const my = bodyCy + bodyH * 0.2; // mouth centre

  // Cheeks (soft blush).
  for (const side of [-1, 1]) {
    fillEllipse(ctx, bodyCx + side * bodyW * 0.5, my - 1, bw * 0.16, bw * 0.1, withAlpha(C.frogCheek, 0.5));
  }

  // Nostrils.
  px(ctx, Math.round(bodyCx - bw * 0.14), Math.round(eyeY + eyeR * 1.15), C.frogBodyShade);
  px(ctx, Math.round(bodyCx + bw * 0.14), Math.round(eyeY + eyeR * 1.15), C.frogBodyShade);

  // Mouth.
  if (p.mouth > 0.06) {
    const openH = p.mouth * bodyH * 0.5;
    const mw = bodyW * 0.6;
    fillRect(ctx, bodyCx - mw * 0.7, my - openH * 0.2, mw * 1.4, 1, C.frogMouth);
    fillEllipse(ctx, bodyCx, my + openH * 0.4, mw * 0.66, openH, C.frogMouth);
    fillEllipse(ctx, bodyCx, my + openH * 0.7, mw * 0.4, openH * 0.5, withAlpha(C.frogCheek, 0.85));
  } else {
    const mw = bodyW * 0.6;
    const amp = bw * 0.2 * p.smile;
    ctx.fillStyle = C.frogMouth;
    for (let x = -mw; x <= mw; x++) {
      const r = x / mw;
      const yy = my + amp * (1 - r * r);
      ctx.fillRect(Math.round(bodyCx + x), Math.round(yy), 1, 1);
    }
  }

  // Eyes (mound → pale ball → pupil → glint → lid).
  const lidClose = clamp01(Math.max(p.blink, p.lid));
  for (const side of [-1, 1]) {
    const ex = bodyCx + side * eyeSpread;
    fillEllipse(ctx, ex, eyeY, eyeR * 1.15, eyeR * 1.15, C.frogBody);
    fillEllipse(ctx, ex - eyeR * 0.2, eyeY - eyeR * 0.28, eyeR * 0.66, eyeR * 0.56, C.frogBodyLit);
    fillEllipse(ctx, ex, eyeY, eyeR, eyeR, EYE_BASE);

    // Cross-eyed converges each pupil toward the nose (and a touch down).
    const conv = -side * p.cross * eyeR * 0.5;
    const ppx = ex + p.eyeX * eyeR * 0.42 + conv;
    const ppy = eyeY + p.eyeY * eyeR * 0.42 + p.cross * eyeR * 0.2;
    const pr = eyeR * 0.6;
    fillEllipse(ctx, ppx, ppy, pr, pr * 1.05, C.frogEye);
    fillRect(ctx, ppx - pr * 0.5, ppy - pr * 0.55, Math.max(1, eyeR * 0.3), Math.max(1, eyeR * 0.3), C.frogEyeHi);

    if (lidClose > 0.02) {
      const lidY = eyeY - eyeR + 2 * eyeR * lidClose; // bottom edge of the lid
      fillEllipse(ctx, ex, lidY - eyeR, eyeR * 1.2, eyeR, C.frogBody);
      fillRect(ctx, ex - eyeR, lidY, eyeR * 2, 1, C.frogBodyShade);
    }
  }

  // ── Arms / hands, so a raised hand reads in front of the face ─────────
  const geom: ArmGeom = { cx, cy: seatY, bodyCx, bodyCy, bodyW, bodyH, bw, bh };
  drawArm(ctx, -1, p.armL, 0, geom);
  drawArm(ctx, 1, p.armR, p.armWave, geom);

  // ── Tongue last of all — it shoots from the mouth toward a bug ─────────
  if (p.tongue > 0.01) {
    const mx = bodyCx;
    const mtY = my + bodyH * 0.05;
    const tipX = lerp(mx, p.tongueX, p.tongue);
    const tipY = lerp(mtY, p.tongueY, p.tongue);
    capsule(ctx, mx, mtY, tipX, tipY, 2.2, 1.7, C.frogTongue);
    capsule(ctx, mx, mtY, tipX, tipY, 1.1, 0.7, C.frogTongueLit);
    disc(ctx, Math.round(tipX), Math.round(tipY), 2.2, C.frogTongue);
    disc(ctx, Math.round(tipX), Math.round(tipY), 1.1, C.frogTongueLit);
  }
}
