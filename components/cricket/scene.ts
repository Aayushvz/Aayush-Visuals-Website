/*
  The world: a day match, drawn back to front.

  The batter is the one exception to what follows: it blits the approved
  character art (see batterSprites.ts), falling back to the procedural figure
  while those frames load. Everything else below is still hand-authored
  canvas — flat fills, heavy outlines and bold
  colour, closer to a vector poster than to a render. Everything that does
  not move between frames — the crowd, the clouds, the mown stripes, the
  fielders — is computed once per resize and replayed, because generating
  several thousand crowd dots inside the draw loop would cost more than the
  rest of the frame put together.

  The stands go one step further and cache their PIXELS, not just their
  geometry: see bakeStands. Positioning the dots once was never the
  expensive half — filling them was.

  Randomness is seeded. An unseeded crowd re-rolls every frame and the
  entire stand boils, which is the single fastest way to make a static
  background look broken.
*/

import { batterFrame, IDLE_H, type BatterAction } from "./batterSprites";
import {
  bowlerFrame,
  IDLE_H as BOWLER_IDLE_H,
  type BowlerPose,
} from "./bowlerSprites";
import {
  fielderFrame,
  IDLE_HIPS_H as FIELDER_IDLE_H,
  type FielderPose,
} from "./fielderSprites";
import type { TeamKit } from "./spriteKit";
import { wicketPose, type WicketState } from "./wicket";

export type Scene = ReturnType<typeof buildScene>;

/** deterministic PRNG, so the same stadium is drawn every frame */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CROWD_COLOURS = [
  "#ffd93d", "#ffb703", "#e63946", "#f4a261", "#4361ee",
  "#3a86ff", "#ffffff", "#f1faee", "#8ecae6", "#e76f51",
];

export function buildScene(w: number, h: number) {
  const rnd = mulberry32(20260804);
  const horizon = h * 0.44;
  const cx = w / 2;

  /* ---- crowd ---- */
  const standTop = h * 0.17;
  const standBottom = horizon - h * 0.02;
  const rows = Math.max(10, Math.round(h * 0.055));
  const crowd: { x: number; y: number; r: number; c: string }[] = [];
  /* vertical gangways, so the bank of colour has structure rather than
     being an even wash of dots across the whole width */
  const aisles = [0.19, 0.5, 0.81];
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const y = standTop + (standBottom - standTop) * t;
    /* nearer rows sit lower, are bigger and are spaced wider */
    const size = 1.1 + t * 2.2;
    const step = size * 2.5;
    const bow = (1 - t) * h * 0.05;
    for (let x = -step; x < w + step; x += step) {
      if (rnd() < 0.12) continue; /* empty seats break up the banding */
      if (aisles.some((a) => Math.abs(x / w - a) < 0.012)) continue;
      /* a darker tier break every few rows reads as a deck division */
      if (row % 7 === 3 && rnd() < 0.75) continue;
      const dip = Math.sin((x / w) * Math.PI) * bow;
      crowd.push({
        x: x + (rnd() - 0.5) * step * 0.6,
        y: y - dip + (rnd() - 0.5) * size,
        r: size * (0.7 + rnd() * 0.5),
        c: CROWD_COLOURS[(rnd() * CROWD_COLOURS.length) | 0],
      });
    }
  }

  /* ---- clouds ---- */
  const clouds = Array.from({ length: 5 }, (_, i) => ({
    x: rnd() * w,
    y: h * 0.04 + rnd() * h * 0.1,
    s: 0.6 + rnd() * 0.9,
    speed: 0.004 + rnd() * 0.008,
    seed: i,
  }));

  /*
    ---- fielders, kept off the pitch and out of the ball's line ----

    A portrait phone gets four, not eight, and they stand further apart.

    The ring is drawn in a frame that is roughly half as wide and twice as
    tall, so the desktop spread lands as a crowd stacked either side of the
    pitch — figures overlapping each other and, worse, overlapping the line
    the ball travels down, which is the one thing on this screen a player
    has to track. Four positions that read as a real field (slip, mid off,
    mid on, one deep) leave the corridor clear.

    They are also drawn larger. At this width a desktop-scale figure is
    about 14px of character, which is a smudge rather than a fielder.
  */
  const portrait = w / h < 0.72;
  const fielders = (
    portrait
      ? [
          /*
            Two, and both below the horizon.

            The y here is not a screen fraction — it is fed through
            `horizon + (h - horizon) * (y - 0.5) * 0.9`, so anything under
            0.5 resolves ABOVE the horizon line and the figure is painted
            standing in the crowd rather than on the grass. A slip at 0.45
            and a deep fielder at 0.36 did exactly that.

            They are cut rather than pushed down the field: portrait has
            room for the bowler and a pair without crowding the corridor
            the ball travels down, and that corridor is the whole reason
            the field was thinned for this frame in the first place.
          */
          { x: 0.2, y: 0.6 }, /* mid off */
          { x: 0.82, y: 0.62 }, /* mid on */
        ]
      : [
          { x: 0.16, y: 0.62 }, { x: 0.31, y: 0.55 }, { x: 0.72, y: 0.56 },
          { x: 0.87, y: 0.63 }, { x: 0.24, y: 0.78 }, { x: 0.8, y: 0.8 },
          { x: 0.42, y: 0.53 }, { x: 0.6, y: 0.52 },
        ]
  ).map((f) => ({
    x: f.x * w,
    y: horizon + (h - horizon) * (f.y - 0.5) * 0.9,
    s: portrait ? 1.16 : 1,
  }));

  return {
    w, h, horizon, cx, crowd, clouds, fielders, standTop,
    /* filled in by the first paintStadium — see bakeStands */
    stands: null as HTMLCanvasElement | null,
  };
}

/* ============ perspective ============ */

/*
  How tall a person standing at screen-y should be drawn. ONE function, used
  by the bowler, the fielders and the stumps.

  This exists because every figure used to carry its own scale formula, and
  three independent formulas cannot agree. The fielders were computing
  roughly 25px where the bowler at a similar depth computed 130 — a sixfold
  disagreement, which read as a field of insects around a normal-sized
  bowler.

  Depth runs 0 at the horizon to 1 at the near crease, and height runs from
  5% to 45% of the frame. Those two numbers are the entire perspective model
  and they are deliberately shallow: true linear perspective over a 20m
  pitch would put the bowler at a tenth of the batsman's height, which is
  geometrically right and looks like a mistake. Every cricket game
  compresses this. What matters is that everyone compresses it identically.
*/
export function depthAt(s: Scene, y: number) {
  return Math.max(0, Math.min(1, (y - s.horizon) / (s.h - s.horizon)));
}

export function personHeight(s: Scene, y: number) {
  return s.h * (0.05 + depthAt(s, y) * 0.4);
}

/*
  Stump height against the batter's.

  Geometrically a wicket is 0.71m to a 1.8m player, which is 0.39 — and that
  measured correct and read too tall on screen, twice. The reason is that the
  batter is drawn crouched into his stance rather than standing upright, so
  his sprite is roughly three quarters of his real height while the stumps
  are full height. Comparing against the drawn figure rather than the real
  one is what makes them agree, and 0.27 is that same wicket measured against
  a man bent over a bat.
*/
const STUMP_RATIO = 0.27;

/* ============ painting ============ */

export function paintSky(ctx: CanvasRenderingContext2D, s: Scene, now: number) {
  const { w, h, horizon } = s;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#1b8bd8");
  sky.addColorStop(0.55, "#48b6ec");
  sky.addColorStop(1, "#a8e4f7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  /* sun, high right */
  const sun = ctx.createRadialGradient(w * 0.82, h * 0.04, 0, w * 0.82, h * 0.04, h * 0.3);
  sun.addColorStop(0, "rgba(255,247,200,0.85)");
  sun.addColorStop(0.4, "rgba(255,236,150,0.18)");
  sun.addColorStop(1, "rgba(255,236,150,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, horizon);

  /* clouds drift, wrapping rather than popping */
  for (const c of s.clouds) {
    const x = (c.x + now * c.speed) % (w + 240) - 120;
    puff(ctx, x, c.y, c.s * (w * 0.05));
  }
}

function puff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.5, r * 0.62, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.75, y + r * 0.12, r * 0.72, r * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.8, y + r * 0.16, r * 0.62, r * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.15, y - r * 0.36, r * 0.68, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/*
  ---- the stands, painted once and then replayed as a bitmap ----

  Everything above the horizon is fixed for the life of a scene: the bowl,
  the roof, the towers, seven and a half thousand crowd dots and the
  hoardings. Painting it live cost 15-21ms of a 16ms frame at 1280x720 —
  around thirty times every other painter in this file added together, and
  on its own the difference between the game running and the game crawling.
  Blitting it back is 0.8ms.

  The dots were always seeded so the stand would not boil between frames.
  This is the other half of that: if the pixels cannot change, they should
  not be recomputed.

  Two things the bake has to get right:

  - Resolution. It reads the scale off the caller's current transform,
    because the two callers disagree about what a scene unit is. The match
    paints under a devicePixelRatio transform and hands buildScene CSS
    pixels; the fly-in hands it device pixels and paints under a camera zoom
    that starts at 1.28. Baking at a flat 1x would have shipped a soft
    stadium on every retina phone.
  - Extent. The band stops at the horizon, which is where the last thing
    drawn here — the bottom edge of the hoardings — ends. The floodlight
    glow is the only mark that reaches for more room and it resolves to
    0.35h, still clear of it. A full-frame cache would have cost more than
    twice the memory and twice the fill rate to carry empty pixels.

  Nothing invalidates it, because nothing needs to: the cache hangs off the
  Scene, and a Scene is rebuilt from scratch on every resize.
*/
function bakeStands(ctx: CanvasRenderingContext2D, s: Scene): HTMLCanvasElement | null {
  const t = ctx.getTransform();
  /* hypot rather than `t.a`, so the fly-in's roll does not read as a
     shrunken camera and bake a blurry stand */
  const scale = Math.max(1, Math.min(3, Math.hypot(t.a, t.b)));

  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(s.w * scale));
  cv.height = Math.max(1, Math.round(s.horizon * scale));
  const bctx = cv.getContext("2d");
  if (!bctx) return null;
  bctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawStands(bctx, s);
  return cv;
}

export function paintStadium(ctx: CanvasRenderingContext2D, s: Scene) {
  s.stands ??= bakeStands(ctx, s);
  /* no 2D context for the offscreen canvas is not a case worth a fallback
     path in theory — but it is one line, and the alternative is a stadium
     with no crowd in it */
  if (!s.stands) {
    drawStands(ctx, s);
    return;
  }
  ctx.drawImage(s.stands, 0, 0, s.w, s.horizon);
}

function drawStands(ctx: CanvasRenderingContext2D, s: Scene) {
  const { w, h, horizon, standTop, cx } = s;

  /* the bowl: a dark band the crowd sits on */
  ctx.beginPath();
  ctx.moveTo(0, standTop + h * 0.02);
  ctx.quadraticCurveTo(cx, standTop - h * 0.05, w, standTop + h * 0.02);
  ctx.lineTo(w, horizon);
  ctx.lineTo(0, horizon);
  ctx.closePath();
  const bowl = ctx.createLinearGradient(0, standTop, 0, horizon);
  bowl.addColorStop(0, "#243046");
  bowl.addColorStop(1, "#141c2b");
  ctx.fillStyle = bowl;
  ctx.fill();

  /* roof canopy */
  ctx.beginPath();
  ctx.moveTo(-10, standTop + h * 0.035);
  ctx.quadraticCurveTo(cx, standTop - h * 0.06, w + 10, standTop + h * 0.035);
  ctx.lineTo(w + 10, standTop + h * 0.012);
  ctx.quadraticCurveTo(cx, standTop - h * 0.085, -10, standTop + h * 0.012);
  ctx.closePath();
  ctx.fillStyle = "#eef2f6";
  ctx.fill();
  ctx.strokeStyle = "rgba(20,28,43,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* floodlight towers */
  for (const fx of [w * 0.12, w * 0.88]) {
    ctx.fillStyle = "#cfd8e3";
    ctx.fillRect(fx - 2, standTop - h * 0.02, 4, h * 0.06);
    ctx.fillStyle = "#f7fbff";
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        ctx.fillRect(fx - 13 + i * 9, standTop - h * 0.075 + j * 7, 7, 5);
    const glow = ctx.createRadialGradient(fx, standTop - h * 0.05, 0, fx, standTop - h * 0.05, h * 0.16);
    glow.addColorStop(0, "rgba(255,255,255,0.4)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(fx - h * 0.2, standTop - h * 0.22, h * 0.4, h * 0.4);
  }

  /* the crowd itself */
  for (const p of s.crowd) {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* sponsor hoardings ring the ground and give the horizon a hard edge */
  const boardH = h * 0.038;
  const boardY = horizon - boardH;
  /* block count follows width: eight boards on a phone leaves 40px each and
     the sponsor names collide into noise */
  const palette = ["#e63946", "#ffd93d", "#1d3557", "#2a9d8f"];
  const count = Math.max(3, Math.round(w / 190));
  const blocks = Array.from({ length: count }, (_, i) => palette[i % palette.length]);
  const bw = w / blocks.length;
  blocks.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * bw, boardY, bw + 1, boardH);
  });
  if (bw > 110) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `${Math.round(boardH * 0.46)}px var(--ckt-display), Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    blocks.forEach((_, i) => {
      ctx.fillText(i % 2 === 0 ? "AAYUSH VISUALS" : "SIX BALLS", i * bw + bw / 2, boardY + boardH / 2);
    });
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function paintField(ctx: CanvasRenderingContext2D, s: Scene) {
  const { w, h, horizon, cx } = s;

  const turf = ctx.createLinearGradient(0, horizon, 0, h);
  turf.addColorStop(0, "#2f8f43");
  turf.addColorStop(0.5, "#3aa551");
  turf.addColorStop(1, "#256e34");
  ctx.fillStyle = turf;
  ctx.fillRect(0, horizon, w, h - horizon);

  /*
    Mown stripes, converging on the vanishing point.

    These were already here at 0.055 alpha, which is close enough to
    invisible that the outfield read as one flat green — the single biggest
    difference from the reference art, where the banding is the first thing
    the eye lands on. They are strong bands now, and there are more of them
    (14 wedges rather than 9) because a real square is mown in narrower
    passes than the old spacing implied.

    Light and dark alternate as washes over the turf gradient rather than as
    flat colours, so the field still darkens toward the camera the way grass
    does; two solid greens would have flattened the depth the gradient buys.
  */
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, w, h - horizon);
  ctx.clip();
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * w * 0.013, horizon);
    ctx.lineTo(cx + i * w * 0.3, h + 40);
    ctx.lineTo(cx + (i + 1) * w * 0.3, h + 40);
    ctx.lineTo(cx + (i + 1) * w * 0.013, horizon);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(190,255,190,0.15)" : "rgba(0,60,10,0.14)";
    ctx.fill();
  }
  ctx.restore();

  /* boundary rope */
  ctx.beginPath();
  ctx.moveTo(-20, horizon + h * 0.035);
  ctx.quadraticCurveTo(cx, horizon - h * 0.01, w + 20, horizon + h * 0.035);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  /* the square, a paler patch the strip sits on */
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.055, horizon + h * 0.05);
  ctx.lineTo(cx + w * 0.055, horizon + h * 0.05);
  ctx.lineTo(cx + w * 0.42, h);
  ctx.lineTo(cx - w * 0.42, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(214,196,140,0.28)";
  ctx.fill();

  /* the strip */
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.026, horizon + h * 0.055);
  ctx.lineTo(cx + w * 0.026, horizon + h * 0.055);
  ctx.lineTo(cx + w * 0.23, h);
  ctx.lineTo(cx - w * 0.23, h);
  ctx.closePath();
  const strip = ctx.createLinearGradient(0, horizon, 0, h);
  strip.addColorStop(0, "#c8ad74");
  strip.addColorStop(1, "#e2cb96");
  ctx.fillStyle = strip;
  ctx.fill();

  /* creases */
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  crease(ctx, cx, horizon + h * 0.075, w * 0.045);
  crease(ctx, cx, h * 0.9, w * 0.19);
}

function crease(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number) {
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
}

/* ---- figures ---- */

function outline(ctx: CanvasRenderingContext2D, lw: number) {
  ctx.strokeStyle = "#1b2430";
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, wdt: number, fill: string) {
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1b2430";
  ctx.lineWidth = wdt + 2.4;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = fill;
  ctx.lineWidth = wdt;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/* the bowler, far away. `t` is 0 at the top of the run-up and 1 at release. */
/*
  The delivery cycle, as a timeline rather than nine equal slices.

  A run-up is not evenly paced and cutting `t` into ninths makes it look
  like one: the approach is most of the elapsed time, and the business end —
  plant, rotation, release — is over in a fraction of it. These weights are
  where each pose gives way to the next, and the gap between `plant` at 0.52
  and `release` at 0.72 is deliberately tight because that is the part the
  eye actually reads as speed.
*/
const CYCLE: { at: number; pose: BowlerPose }[] = [
  { at: 0.0, pose: "start" },
  { at: 0.08, pose: "runup" },
  { at: 0.26, pose: "accelerate" },
  { at: 0.42, pose: "bound" },
  { at: 0.54, pose: "plant" },
  { at: 0.64, pose: "rotate" },
  { at: 0.72, pose: "release" },
  { at: 0.82, pose: "follow" },
  { at: 0.92, pose: "recover" },
];

function cyclePose(t: number): BowlerPose {
  let pose: BowlerPose = "start";
  for (const step of CYCLE) {
    if (t >= step.at) pose = step.pose;
    else break;
  }
  return pose;
}

/*
  The sprite bowler.

  Returns false if the artwork has not decoded yet, and the vector figure
  below draws instead — so the first ball of a session is never bowled by an
  invisible man.

  Two details carry most of the believability:

  - The figure GROWS through the run-up. He starts near the horizon and
    finishes at the crease, and a constant scale reads as a paper cutout
    sliding down the screen rather than a person running at you.
  - `release` is swapped for the delivery's own pose. The sheet has eight of
    them, and a yorker released from the same arm position as a bouncer is
    the tell that gives away a canned animation.
*/
function paintBowlerSprite(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  t: number,
  team: TeamKit,
  variation?: BowlerPose
): boolean {
  const { w, h, horizon, cx } = s;

  let pose = cyclePose(t);
  /* the variation only replaces the instant of release, never the approach */
  if (variation && (pose === "release" || pose === "rotate")) pose = variation;

  const frame = bowlerFrame(team, pose);
  if (!frame) return false;
  const { img, meta } = frame;

  /*
    He runs in, and the run-up is a real journey down the screen rather than
    a figure jogging on the spot.

    RUN_FROM is well behind the far stumps and RUN_TO is in front of them,
    which is where a bowler actually releases — the front foot lands past
    the popping crease, not at it. Because he travels, the shared
    perspective does the growth for free: he more than doubles in height
    between the first step and the delivery stride, and nothing here has to
    know that.

    The old version moved him h*0.028 in total — about 25px — and scaled him
    by a hand-tuned `grow` factor that had no relationship to where he was
    standing. That is why he read as hovering.
  */
  /*
    The bowling crease, derived from where paintStumps actually puts the
    stumps rather than guessed — the two used to be independent numbers and
    the bowler drifted past his own wicket.
  */
  const creaseDepth = depthAt(s, horizon + h * 0.075);

  /* his mark, well back from the stumps. The run-up is long because that is
     what a fast bowler's run-up is; the previous version started barely
     behind the crease and had nowhere to accelerate. */
  const RUN_FROM = creaseDepth * 0.1;
  /* release just BEHIND the crease. Real bowlers land the front foot past
     it — that is what a no-ball is — but on this camera any part of him
     past the white line reads as running at the batsman, so the line wins
     over the rule book. */
  const RELEASE_AT = creaseDepth * 0.93;
  /* the follow-through plays out with almost no ground gained, and still
     stops short of the line */
  const FOLLOW_TO = creaseDepth * 0.99;

  /*
    Two segments, because the run-up and the follow-through are different
    movements. `t` reaches 0.72 at the instant of release (see the cycle
    table above), so that is where one ends and the other begins — the ball
    leaves the hand exactly as he arrives at the crease rather than somewhere
    near it.
  */
  let travel: number;
  if (t <= 0.72) {
    const k = t / 0.72;
    /* smoothstep: slowest at the mark, fastest into the bound */
    travel = RUN_FROM + (RELEASE_AT - RUN_FROM) * (k * k * (3 - 2 * k));
  } else {
    const k = (t - 0.72) / 0.28;
    /* decelerating out of the action, not accelerating into the pitch */
    travel = RELEASE_AT + (FOLLOW_TO - RELEASE_AT) * (1 - (1 - k) * (1 - k));
  }
  /*
    The hard stop.

    Everything above is tuned constants, and tuned constants are exactly what
    let him wander over the line twice already: change the cycle timing or
    the crease position and the arithmetic quietly drifts past it again. This
    is the guarantee rather than the intention — whatever the maths upstream
    produces, his feet cannot be past the bowling crease. Nothing downstream
    needs to trust the tuning.
  */
  travel = Math.min(travel, creaseDepth);

  const baseline = horizon + (h - horizon) * travel;

  /*
    The bowler takes the same portrait trim as the batter and the ring.

    He never had a portrait bump — perspective alone sized him — but on a
    tall narrow canvas that still lands him larger in the frame than the
    others, and the three have to move together or the field stops reading
    as one depth. 0.8 is the pass applied across all three figures.
  */
  const targetH = personHeight(s, baseline) * (s.w / s.h < 0.72 ? 0.8 : 1);
  const scale = targetH / BOWLER_IDLE_H;
  const dw = meta.w * scale;
  const dh = meta.h * scale;

  /* contact shadow, squashed and faded — it sells the ground plane, and it
     shrinks as he leaves it at the bound */
  const air = pose === "bound" ? 0.45 : 1;
  /*
    Beside the stumps, not through them — and only just.

    He was drawn at `cx`, the pitch's centre line, which is exactly where
    the bowler's wicket stands, so the run-up walked him straight over it.

    The offset is a fraction of his own DRAWN width, not of the viewport.
    Viewport width was the first attempt and it was wrong twice over: it
    ignores perspective, so the same number that clears the stumps up close
    throws him halfway to the rope at distance, and it ignores how big he
    actually is. Half his width plus a hair is what "next to the stumps"
    means at any depth. BOWLER_OFFSET is the one number to turn.
  */
  const bowlerX = cx + dw * BOWLER_OFFSET + BOWLER_NUDGE;

  ctx.beginPath();
  ctx.ellipse(bowlerX, baseline, dw * 0.3 * air, dh * 0.035 * air, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(20,44,26,${0.32 * air})`;
  ctx.fill();

  /* anchored on the feet, not the frame centre — see bowlerSprites.ts. The
     bound frame's anchor sits at 0.90, and centring it would throw him a
     third of his own width sideways for one frame. */
  ctx.drawImage(img, bowlerX - meta.ax * dw, baseline - dh, dw, dh);
  return true;
}

/*
  How far right of the stumps the bowler stands.

  Two terms on purpose. BOWLER_OFFSET is a multiple of his own drawn width,
  which is what keeps "just beside the wicket" meaning the same thing at
  any depth. BOWLER_NUDGE is a flat pixel trim on top for fine-tuning by
  eye — the scene is built in CSS pixels (CricketGame's resize hands
  buildScene the CSS box and puts the dpr in the transform), so a pixel
  here really is a pixel on screen.
*/
const BOWLER_OFFSET = 0.34;
const BOWLER_NUDGE = 6;

export function paintBowler(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  t: number,
  team: TeamKit = "panthers",
  variation?: BowlerPose
) {
  if (paintBowlerSprite(ctx, s, t, team, variation)) return;

  /* the same offset the sprite path takes — see paintBowlerSprite. If the
     fallback figure stayed on the centre line he would jump sideways the
     moment the artwork finished loading. `sc` is this figure's own unit,
     so the shift is expressed against it for the same reason. */
  const { h, horizon, cx: pitchCx } = s;
  const sc = h * 0.00055 * 90;
  /* the vector figure runs about 0.68 * sc wide, so the same "half my own
     width plus a hair" the sprite path uses lands here as this */
  const cx = pitchCx + sc * 0.68 * BOWLER_OFFSET + BOWLER_NUDGE;
  const y = horizon + h * 0.055 - t * h * 0.012;
  const stride = Math.sin(t * Math.PI * 6) * sc * 0.5;
  const armAngle = t < 0.75 ? -0.6 : -0.6 + ((t - 0.75) / 0.25) * 3.4;

  /* legs */
  limb(ctx, cx, y, cx - stride, y + sc * 1.15, sc * 0.3, "#1d3557");
  limb(ctx, cx, y, cx + stride, y + sc * 1.15, sc * 0.3, "#1d3557");
  /* torso */
  ctx.beginPath();
  ctx.roundRect(cx - sc * 0.34, y - sc * 0.95, sc * 0.68, sc * 1.05, sc * 0.2);
  ctx.fillStyle = "#f4f7fa";
  ctx.fill();
  outline(ctx, 2);
  /* bowling arm sweeps over the top */
  const ax = cx + Math.cos(armAngle) * sc * 0.95;
  const ay = y - sc * 0.8 + Math.sin(armAngle) * sc * 0.95;
  limb(ctx, cx, y - sc * 0.8, ax, ay, sc * 0.24, "#f0d2b4");
  /* head */
  ctx.beginPath();
  ctx.arc(cx, y - sc * 1.2, sc * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#f0d2b4";
  ctx.fill();
  outline(ctx, 2);
}

/*
  The batter, over the shoulder, cropped at the thigh by the bottom edge.

  The swing is four phases rather than one rotation, because a single sweep
  from A to B reads as a windscreen wiper. A real shot lifts the bat first,
  accelerates down through the line, then decelerates high over the
  shoulder, and the head stays still the whole time while the shoulders
  turn under it. `batAngle` is that shape, and the body rotation is driven
  off the same number so the two can never desync.

  `swing` runs 0 (stance) to 1 (follow through). `now` drives the idle bat
  tap, which stops the figure being a statue between deliveries.
*/
const KIT = {
  shirt: "#1e5bb8",
  shirtLit: "#3b82d6",
  trim: "#ff9933",
  white: "#f7fafc",
  skin: "#c98b5e",
  helmet: "#14315c",
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ease(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/* radians from "pointing right"; larger means further behind the body */
function batAngle(e: number) {
  if (e < 0.18) return lerp(1.2, 1.85, ease(e / 0.18)); /* backlift */
  if (e < 0.55) return lerp(1.85, -0.5, ease((e - 0.18) / 0.37)); /* down the line */
  return lerp(-0.5, -1.75, ease((e - 0.55) / 0.45)); /* high finish */
}

/*
  The batter is the approved character art when it has loaded, and the
  procedural figure below until then — the crease is never empty, even on the
  very first ball of a cold load.

  `line` is where the delivery is, as a fraction of canvas width either side
  of the pitch's centre line — the same number ballAt uses to place the ball.
  It is what lets the shot be played AT something. Without it the figure
  plays the identical stroke to a yorker on middle and a ball drifting down
  leg, which is the tell that the batter is an animation rather than a player.
*/
export function paintBatter(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  swing: number,
  now: number,
  action: BatterAction = "defend",
  team: TeamKit = "panthers",
  line = 0
) {
  if (paintBatterSprite(ctx, s, swing, now, action, team, line)) return;
  paintBatterVector(ctx, s, swing, now, line);
}

/*
  Where the striker stands, and why it is to the RIGHT of the stumps.

  The camera sits behind the striker's wicket looking down the pitch, so the
  screen is mirrored against the familiar bowler's-arm broadcast angle: what
  is the off side there is the leg side here.

  The sheet is a left-hander's. Every frame's foot anchor sits at or right of
  centre (see batterSprites.ts), which puts the bat off the player's left in
  the backlift, through the line and into the follow through. A left-hander
  stands with his legs on his own leg side, and from this camera that is
  screen right of the middle stump.

  Standing him screen LEFT — which is where this was — put the whole swing
  arc on the far side of his body from the ball. Every delivery arrives on or
  about the centre line, so the bat travelled away from it on all six balls
  of the over, the defensive stroke covered nothing, and the commentary
  called it playing down the wrong line because that is exactly what it was.
*/
const BATTER_OFFSET = 0.1;

/*
  How much of the delivery's line the batter covers.

  Not 1: matching the ball exactly means the bat is never beaten and the
  figure slides across the crease like it is on rails. A shade over half
  reads as a player moving to the pitch of it and still being squared up by
  the one that does most — which is the game the timing windows are already
  playing.
*/
const REACH = 0.55;

/** idle ping-pong: 0-1-2-1 reads as shifting weight; 0-1-2-0 snaps back */
const IDLE_CYCLE = [0, 1, 2, 1];
const IDLE_MS = 700;

function paintBatterSprite(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  swing: number,
  now: number,
  action: BatterAction,
  team: TeamKit,
  line: number
) {
  const { w, h, cx } = s;
  const u = Math.min(h, w * 1.35);
  /* the reach is eased in with the swing rather than applied flat, so he
     moves to the ball as he plays it instead of teleporting onto the line
     the instant the shot is triggered */
  const x = cx + w * BATTER_OFFSET + line * w * REACH * ease(swing);

  const idle = swing <= 0;
  const frame = idle
    ? batterFrame(team, "idle", IDLE_CYCLE[Math.floor(now / IDLE_MS) % IDLE_CYCLE.length])
    : batterFrame(team, action, swing < 0.34 ? 0 : swing < 0.68 ? 1 : 2);
  if (!frame) return false;

  const { img, meta } = frame;
  /* match the procedural figure's footprint exactly, so swapping between the
     two is invisible: that one runs from h*0.315 above the floor plus the
     head, which is sized off u */
  /*
    Portrait puts the batter at roughly the lower third of the frame.

    The desktop figure is sized as a fraction of canvas height, which on a
    tall narrow canvas leaves him small and stranded in the middle — the
    camera reads as being in the stands rather than over his shoulder. The
    bump is applied to the height only; the baseline is unchanged, so he
    grows downward out of frame and crops at the thigh the way the shot
    was always composed to.
  */
  const targetH = (h * 0.315 + u * 0.13) * (w / h < 0.72 ? 1.07 : 1);
  const scale = targetH / IDLE_H;
  const dw = meta.w * scale;
  const dh = meta.h * scale;
  const baseline = h * 0.995 + (idle ? Math.sin(now / 900) * u * 0.003 : 0);

  ctx.beginPath();
  ctx.ellipse(x, h * 0.985, u * 0.09, u * 0.018, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(24,58,32,0.3)";
  ctx.fill();

  /* anchored on the feet, not the frame centre — see batterSprites.ts */
  ctx.drawImage(img, x - meta.ax * dw, baseline - dh, dw, dh);
  return true;
}

function paintBatterVector(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  swing: number,
  now: number,
  line: number
) {
  const { w, h, cx } = s;
  /* scale off width as well as height: sizing purely by height renders a
     helmet a third of the screen tall on a narrow phone canvas */
  const u = Math.min(h, w * 1.35);
  /* the same footprint the sprite takes, so the fallback swapping out for
     the artwork mid-over does not jump across the crease */
  const x = cx + w * BATTER_OFFSET + line * w * REACH * ease(swing);
  const headR = u * 0.053;
  const shoulderY = h * 0.685;
  /* neck length is what stops the helmet reading as a ball balanced on a box */
  const neckY = shoulderY - headR * 0.5;
  const headY = neckY - headR * 0.95;
  const shoulderW = u * 0.098;
  const e = ease(swing);
  /* between balls the bat taps; during the shot the tap is gone */
  const tap = swing > 0 ? 0 : Math.sin(now / 260) * u * 0.006;
  const rot = -0.42 * e; /* shoulders turn through the shot */
  const padTop = shoulderY + u * 0.15;

  /*
    Mirrored about the player's own centre line, because everything below
    this was authored as a right-hander — the grip pivots off the right
    shoulder and batAngle measures from "pointing right".

    Reflecting the finished figure is the honest version of the fix. The
    alternative was negating a pivot, an elbow kick, a shoulder rotation and
    an angle sweep by hand and hoping the four stayed in agreement, when the
    one thing that has to be true is that this figure and the sprite play the
    same way round. Only the jersey number is exempt, and it cancels the
    reflection locally where it is drawn.
  */
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(-1, 1);
  ctx.translate(-x, 0);

  /* ---- shadow ---- */
  ctx.beginPath();
  ctx.ellipse(x + u * 0.03, h * 0.985, u * 0.16, u * 0.026, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(24,58,32,0.3)";
  ctx.fill();

  /* ---- pads, outside the rotation so the legs stay planted ---- */
  const pads: [number, number][] = [
    [x - shoulderW * 0.78, u * 0.082],
    [x + shoulderW * 0.1, u * 0.082],
  ];
  for (const [px, pw] of pads) {
    ctx.beginPath();
    ctx.roundRect(px, padTop, pw, h - padTop + 20, u * 0.016);
    ctx.fillStyle = KIT.white;
    ctx.fill();
    outline(ctx, 3);
    ctx.strokeStyle = "rgba(26,40,56,0.4)";
    ctx.lineWidth = 1.6;
    for (let i = 1; i <= 3; i++) {
      const sy = padTop + i * u * 0.045;
      ctx.beginPath();
      ctx.moveTo(px + 2, sy);
      ctx.lineTo(px + pw - 2, sy);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.translate(x, shoulderY);
  ctx.rotate(rot);
  ctx.translate(-x, -shoulderY);

  /* ---- shirt ---- */
  /* neck, drawn before the shirt so the collar overlaps it */
  ctx.beginPath();
  ctx.roundRect(x - headR * 0.34, neckY - headR * 0.7, headR * 0.68, headR * 1.1, headR * 0.2);
  ctx.fillStyle = KIT.skin;
  ctx.fill();
  outline(ctx, 3);

  /* Sloped shoulders that taper to the waist. Straight sides read as a
     barrel; the taper is most of what makes it read as a torso. */
  const shirtPath = () => {
    ctx.beginPath();
    ctx.moveTo(x - shoulderW, shoulderY + headR * 0.15);
    ctx.quadraticCurveTo(x - shoulderW * 0.92, neckY - headR * 0.1, x - headR * 0.42, neckY - headR * 0.2);
    ctx.quadraticCurveTo(x, neckY + headR * 0.12, x + headR * 0.42, neckY - headR * 0.2);
    ctx.quadraticCurveTo(x + shoulderW * 0.92, neckY - headR * 0.1, x + shoulderW, shoulderY + headR * 0.15);
    ctx.lineTo(x + shoulderW * 0.86, padTop + u * 0.02);
    ctx.lineTo(x - shoulderW * 0.86, padTop + u * 0.02);
    ctx.closePath();
  };
  shirtPath();
  ctx.fillStyle = KIT.shirt;
  ctx.fill();
  outline(ctx, 3.5);

  /* yoke and trim, so the kit reads as a kit rather than a blue box */
  ctx.save();
  shirtPath();
  ctx.clip();
  ctx.fillStyle = KIT.shirtLit;
  ctx.fillRect(x - shoulderW * 1.2, neckY - headR * 0.3, shoulderW * 2.4, headR * 0.62);
  ctx.fillStyle = KIT.trim;
  ctx.fillRect(x - shoulderW * 1.2, neckY + headR * 0.42, shoulderW * 2.4, u * 0.008);
  ctx.restore();

  /* the one thing that must not reflect — see the mirror above */
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(-1, 1);
  ctx.translate(-x, 0);
  ctx.fillStyle = KIT.white;
  ctx.font = Math.round(headR * 1.25) + "px var(--ckt-display), Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("07", x, shoulderY + u * 0.085);
  ctx.textAlign = "left";
  ctx.restore();

  /* ---- arm to the grip ---- */
  const pivotX = x + shoulderW * 0.66;
  const pivotY = shoulderY + headR * 0.5;
  const angle = batAngle(e);
  const reach = u * 0.105;
  const gripX = pivotX + Math.cos(angle) * reach;
  const gripY = pivotY + Math.sin(angle) * reach + tap;
  /*
    Two segments, not one. A single skin-coloured bar from shoulder to grip
    is the same width, colour and angle as a bat, and at a glance that is
    exactly what it reads as. Sleeve to the elbow, forearm to the glove, with
    the elbow kicked slightly out of the straight line so the arm bends.
  */
  const shoulderX = x - shoulderW * 0.55;
  const elbowX = (shoulderX + gripX) / 2 - (gripY - pivotY) * 0.16;
  const elbowY = (pivotY + gripY) / 2 + (gripX - shoulderX) * 0.16;
  limb(ctx, shoulderX, pivotY, elbowX, elbowY, u * 0.032, KIT.shirt);
  limb(ctx, elbowX, elbowY, gripX, gripY, u * 0.022, KIT.skin);
  /* cuff, so the sleeve ends somewhere rather than just stopping */
  ctx.beginPath();
  ctx.arc(elbowX, elbowY, u * 0.018, 0, Math.PI * 2);
  ctx.fillStyle = KIT.shirtLit;
  ctx.fill();
  outline(ctx, 2.2);

  ctx.restore();

  /* ---- helmet: outside the rotation, because the head stays still ---- */
  ctx.beginPath();
  ctx.arc(x, headY, headR, Math.PI * 0.84, Math.PI * 2.22);
  ctx.closePath();
  ctx.fillStyle = KIT.helmet;
  ctx.fill();
  outline(ctx, 3.5);
  ctx.beginPath();
  ctx.ellipse(x, headY - headR * 0.52, headR * 1.02, headR * 0.3, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = "#0e2447";
  ctx.fill();
  outline(ctx, 2.4);
  ctx.beginPath();
  ctx.ellipse(x, headY + headR * 0.44, headR * 0.9, headR * 0.42, 0, 0, Math.PI);
  ctx.fillStyle = "#0b1e3c";
  ctx.fill();
  ctx.strokeStyle = "#cfd8e3";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.72, headY + headR * 0.4 + i * headR * 0.17);
    ctx.lineTo(x + headR * 0.72, headY + headR * 0.4 + i * headR * 0.17);
    ctx.stroke();
  }

  /* ---- bat, drawn last so it passes in front of the body ---- */
  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(angle - Math.PI * 0.5);
  ctx.beginPath();
  ctx.roundRect(-u * 0.011, -u * 0.042, u * 0.022, u * 0.076, u * 0.005);
  ctx.fillStyle = "#2f2118";
  ctx.fill();
  outline(ctx, 2.5);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.011, -u * 0.03 + i * u * 0.015);
    ctx.lineTo(u * 0.011, -u * 0.03 + i * u * 0.015);
    ctx.stroke();
  }
  /* blade with a shoulder taper and a face seam */
  ctx.beginPath();
  ctx.moveTo(-u * 0.018, u * 0.03);
  ctx.lineTo(u * 0.018, u * 0.03);
  ctx.lineTo(u * 0.026, u * 0.062);
  ctx.lineTo(u * 0.026, u * 0.176);
  ctx.quadraticCurveTo(u * 0.026, u * 0.19, u * 0.012, u * 0.19);
  ctx.lineTo(-u * 0.012, u * 0.19);
  ctx.quadraticCurveTo(-u * 0.026, u * 0.19, -u * 0.026, u * 0.176);
  ctx.lineTo(-u * 0.026, u * 0.062);
  ctx.closePath();
  ctx.fillStyle = "#e3b478";
  ctx.fill();
  outline(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(0, u * 0.07);
  ctx.lineTo(0, u * 0.182);
  ctx.strokeStyle = "rgba(90,62,38,0.35)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = KIT.trim;
  ctx.fillRect(-u * 0.016, u * 0.095, u * 0.032, u * 0.03);
  ctx.restore();

  /* ---- gloves on the grip ---- */
  for (const off of [-0.016, 0.012]) {
    const gx = gripX + Math.cos(angle - Math.PI * 0.5) * u * off;
    const gy = gripY + Math.sin(angle - Math.PI * 0.5) * u * off;
    ctx.beginPath();
    ctx.arc(gx, gy, u * 0.021, 0, Math.PI * 2);
    ctx.fillStyle = KIT.white;
    ctx.fill();
    outline(ctx, 2.5);
  }

  /* closes the left-hander's mirror opened at the top */
  ctx.restore();
}

/*
  What a fielder does between deliveries.

  Six poses, cycled slowly and — crucially — out of phase with each other.
  Eight figures sharing one clock is worse than eight statues: they adjust
  their caps in perfect unison and the whole ring reads as a single object
  blinking. Each fielder gets its own offset and its own slightly different
  period, taken from its index, so the ring never resynchronises.

  `idleBack` is in the rotation on purpose. A ring where everyone faces the
  bat looks staged; a couple of players half-turned is what a real field
  looks like between balls.
*/
const IDLE_POSES: FielderPose[] = [
  "idleHips",
  "idleArms",
  "idleHands",
  "idleCrouch",
  "idleCap",
  "idleBack",
];

/** roughly four seconds a pose, varied per fielder so nothing lines up */
function idlePoseFor(index: number, now: number): FielderPose {
  const period = 3600 + (index % 5) * 540;
  const offset = index * 1234;
  return IDLE_POSES[Math.floor((now + offset) / period) % IDLE_POSES.length];
}

/*
  Draws one fielder from the character art. Returns false while the frames
  are still decoding so the caller can fall back to the procedural figure.

  `sc` is the procedural figure's own scale, and the sprite is matched to it
  rather than given a scale of its own — that is what keeps the swap
  invisible when the artwork finishes loading mid-over, and what keeps the
  ring's sense of depth, since `sc` already grows with distance down the
  screen.
*/
function paintFielderSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  targetH: number,
  team: TeamKit,
  pose: FielderPose
): boolean {
  const frame = fielderFrame(team, pose);
  if (!frame) return false;
  const { img, meta } = frame;

  const scale = targetH / FIELDER_IDLE_H;
  const dw = meta.w * scale;
  const dh = meta.h * scale;

  ctx.beginPath();
  ctx.ellipse(x, y + targetH * 0.014, dw * 0.26, dh * 0.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,44,26,0.28)";
  ctx.fill();

  ctx.drawImage(img, x - meta.ax * dw, y - dh, dw, dh);
  return true;
}

/*
  The striker's wicket, standing between the camera and the batter.

  Drawn AFTER the batter, which looks wrong written down and is right on
  screen: the camera sits behind the striker's stumps looking down the
  pitch, so the stumps are the nearest object in the frame and the batter's
  legs pass behind them. Painting them first would put a batter's pads over
  his own wicket.

  Everything is sized off `personHeight` at the same y the batter stands on,
  so the wicket cannot drift out of proportion with him — the two are locked
  together by construction rather than by a pair of matching constants.
*/
export function paintStrikerWicket(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  now: number,
  state: WicketState
) {
  const { h, cx } = s;
  const batterH = personHeight(s, h * 0.995);

  /*
    Sized and placed against the batter, not against the canvas.

    Height first: a real wicket is 0.71m against a 1.8m player, so it reaches
    the thigh — not the chest. An earlier pass multiplied that by 1.45 to
    account for the stumps sitting on a nearer camera plane than the batter,
    which was defensible arithmetic and far too big on screen. The ratio is
    now used straight.

    Position second: the striker does not stand in front of his stumps, he
    stands beside them, which is exactly why he can be bowled at all. Putting
    the wicket on his own centre line was the reason it cut through his body.
    Offsetting it to the off side both fixes the overlap and is where the
    thing actually is.
  */
  const stumpH = batterH * STUMP_RATIO;
  const unit = stumpH;
  /*
    The middle stump sits on the pitch centre line, full stop. An earlier
    pass offset the wicket from the batter to stop the two intersecting,
    which cured the overlap and put the stumps somewhere a wicket has never
    been. The batter stands to one side of centre already, so anchoring to
    the pitch rather than to him separates them for the right reason.
  */
  const x = cx;
  /* the crease the batter's feet stand on, so the wicket cannot float */
  const baseY = h * 0.995;
  const gap = unit * 0.3;
  const rw = Math.max(2, unit * 0.062);

  const pose = wicketPose(state, now, unit);

  /* dust at the base, under everything */
  if (pose.dust > 0) {
    ctx.save();
    ctx.globalAlpha = pose.dust * 0.5;
    ctx.fillStyle = "#cbb894";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = unit * (0.18 + (1 - pose.dust) * 0.55);
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * r * 1.5,
        baseY - Math.abs(Math.sin(a)) * r * 0.35,
        unit * 0.17, unit * 0.09, 0, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  /* shadow the three cast on the crease */
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#2b3a24";
  ctx.beginPath();
  ctx.ellipse(x, baseY, unit * 0.62, unit * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* stumps, each hinging about its own base */
  for (let i = 0; i < 3; i++) {
    const sx = x + (i - 1) * gap;
    ctx.save();
    ctx.translate(sx, baseY);
    ctx.rotate(pose.lean[i]);
    const grad = ctx.createLinearGradient(-rw, 0, rw, 0);
    grad.addColorStop(0, "#c9a227");
    grad.addColorStop(0.42, "#f2dd9a");
    grad.addColorStop(1, "#b3892c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-rw, -unit, rw * 2, unit, rw);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,40,10,0.55)";
    ctx.lineWidth = Math.max(1, rw * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  /*
    Bails last, over the tops.

    Length is the stump gap plus an overhang at each end, so each bail
    visibly rests ON the two stumps it spans instead of floating between
    them. Exactly `gap` long would meet the stump centres and leave the
    joint looking like a butt weld; the overhang is what reads as a bail
    sitting in a groove.
  */
  const bailLen = gap + rw * 2.2;
  for (const b of pose.bails) {
    ctx.save();
    ctx.translate(x + b.x, baseY + b.y);
    ctx.rotate(b.rot);
    ctx.fillStyle = "#f6e6b4";
    ctx.strokeStyle = "rgba(60,40,10,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-bailLen / 2, -rw * 0.7, bailLen, rw * 1.4, rw * 0.7);
    ctx.fill();
    ctx.stroke();
    /* the turned spigot at each end, the detail that stops a bail reading
       as a plain lozenge at this size */
    ctx.fillStyle = "#e2cf99";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * bailLen * 0.34, 0, rw * 0.34, rw * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function paintFielders(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  now = 0,
  team: TeamKit = "panthers"
) {
  /*
    Painted far to near. Without this, a fielder at the boundary can be drawn
    over one standing at mid-off, which reads as a depth error even when
    every size is right.
  */
  const order = s.fielders
    .map((f, i) => ({ f, i }))
    .sort((a, b) => a.f.y - b.f.y);

  for (const { f, i } of order) {
    /* f.s is the portrait bump — perspective sets the base height, this
       scales it so four figures on a narrow screen read as characters
       rather than as marks */
    const targetH = personHeight(s, f.y) * f.s;
    if (paintFielderSprite(ctx, f.x, f.y, targetH, team, idlePoseFor(i, now)))
      continue;
    /* the procedural figure measures about 1.4 * sc from foot to crown */
    paintFielderVector(ctx, f.x, f.y, targetH / 1.4);
  }
}

function paintFielderVector(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  sc: number
) {
  {
    const f = { x: fx, y: fy };
    limb(ctx, f.x, f.y, f.x - sc * 0.3, f.y + sc, sc * 0.24, "#1d3557");
    limb(ctx, f.x, f.y, f.x + sc * 0.3, f.y + sc, sc * 0.24, "#1d3557");
    ctx.beginPath();
    ctx.roundRect(f.x - sc * 0.32, f.y - sc * 0.9, sc * 0.64, sc * 0.95, sc * 0.18);
    ctx.fillStyle = "#f4f7fa";
    ctx.fill();
    outline(ctx, 1.6);
    ctx.beginPath();
    ctx.arc(f.x, f.y - sc * 1.12, sc * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "#f0d2b4";
    ctx.fill();
    outline(ctx, 1.6);
  }
}

/* stumps at the bowler's end, small and far */
export function paintStumps(ctx: CanvasRenderingContext2D, s: Scene, knocked: boolean) {
  const { h, horizon, cx } = s;
  const y = horizon + h * 0.075;
  const sh = h * 0.05;
  ctx.strokeStyle = "#fffaf0";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    const lean = knocked ? i * 6 : 0;
    ctx.beginPath();
    ctx.moveTo(cx + i * 7, y);
    ctx.lineTo(cx + i * 7 + lean, y - sh);
    ctx.stroke();
  }
  if (!knocked) {
    ctx.beginPath();
    ctx.moveTo(cx - 8, y - sh - 2);
    ctx.lineTo(cx + 8, y - sh - 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffd93d";
    ctx.stroke();
  }
}

/*
  A soft dark band along the bottom edge: out-of-focus grass in front of the
  camera. The first version drew literal triangular blades, which at this
  scale read as a saw blade rather than as turf. Rounded tufts of varying
  height, plus a gradient, do the depth job without the serration.
*/
export function paintForegroundGrass(ctx: CanvasRenderingContext2D, s: Scene) {
  const { w, h } = s;
  const band = h * 0.035;

  const g = ctx.createLinearGradient(0, h - band * 2, 0, h);
  g.addColorStop(0, "rgba(20,70,34,0)");
  g.addColorStop(1, "rgba(16,58,28,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - band * 2, w, band * 2);

  ctx.fillStyle = "#154d24";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 30; x += 26) {
    const tip = h - band * (0.5 + ((x * 37) % 13) / 13);
    ctx.quadraticCurveTo(x + 8, tip, x + 26, h - band * 0.25);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

/* ============ the big screen ============

   The stadium's replay board, standing above the far stand on the pitch's
   centre line, carrying the branding and the live score.

   It is painted as its own pass after the stands rather than inside
   paintStadium, for two reasons. It is the only part of the stadium that
   changes between frames for a reason other than the clock — it needs the
   score, and paintStadium is deliberately state-free. And drawing it last
   means it sits over the crowd it is mounted in front of without the stand
   loop needing to know it exists.

   Everything is derived from the scene's own stand geometry, so the board
   stays bolted to the same place at any frame shape: the phone gets a
   narrower board in the same spot rather than a desktop board cropped.
*/

/* the canvas cannot read `var(--ckt-display)`, so the display face is
   named directly here. Anton is loaded by the route's layout; the fallbacks
   matter because a canvas silently draws in the default serif if the family
   is missing, which on a scoreboard is very obvious. */
const DISPLAY_STACK = 'Anton, Impact, "Arial Narrow", sans-serif';
/* the shout face — loud for one second, and reserved for exactly that.
   Bungee is loaded by the route's layout alongside Anton. */
const SHOUT_STACK = 'Bungee, Anton, Impact, sans-serif';

/* the status bar's own height plus its inset, in CSS pixels. The board is
   pushed clear of this rather than of a fraction of canvas height, because
   the bar is a fixed-size object and a percentage only clears it at the
   window size it was tuned on. */
const HUD_BAR_CLEARANCE = 104;

export type Board = {
  /** the loud word — SIX!, FOUR!, OUT! — or null between deliveries */
  shout: string | null;
  /** the design-studio line under it, or the idle prompt */
  quote: string;
};

export function paintBigScreen(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  b: Board,
  now: number
) {
  const { w, h, cx, standTop } = s;

  /*
    Sized off the stand band, not the canvas. The board reads as an object
    in the stadium only while its proportions hold against the thing it is
    mounted on — tie it to canvas width and it becomes a billboard on a
    phone and a postage stamp on a monitor.
  */
  /*
    Portrait gets a much bigger board, and sits it lower.

    `min(w * 0.34, h * 0.42)` is a landscape rule: on a narrow tall frame the
    width term wins by a mile and the board comes out about 127px on a
    375px screen — a postage stamp carrying a punchline nobody can read. In
    portrait the board is the only thing on that band of screen, so it can
    have most of the width.
  */
  /*
    Portrait numbers are measured off the reference, not guessed.

    On an 862x1856 frame the board runs x 128->720 and y 337->682: 69% of
    the width, an aspect of 0.58, and a top edge at 18.2% of the height.
    Three passes of nudging a width fraction never converged because two of
    the three were wrong at once — it was too wide AND too squat AND too
    high, and moving one at a time just traded faults.
  */
  const portrait = w / h < 0.72;
  const bw = portrait ? w * 0.69 : Math.min(w * 0.34, h * 0.42);
  const bh = bw * (portrait ? 0.58 : 0.42);
  const bx = cx - bw / 2;
  /*
    Below the HUD, always.

    It used to hang at `standTop - bh * 0.52`, which put its top edge under
    the status bar — the bar is drawn in the DOM above this canvas, so the
    board lost its own headline. The position is now whichever is lower:
    where the stand wants it, or clear of the bar.
  */
  /* portrait pins the top edge to the measured fraction; landscape keeps
     the stand-relative rule, clamped clear of the HUD bar */
  /*
    Anchored by its BOTTOM edge in portrait, not its top.

    The complaint every time was that the board sat on the field covers —
    which is a statement about where its lower edge lands, and the board is
    not just the panel: the coloured hoarding strip hangs under it to
    bh * 1.23. Pinning the top meant that total height pushed the bottom
    wherever it liked, so each lift moved the panel and left the strip
    still on the grass.

    Now the assembly's bottom is placed at 0.375h — comfortably above the
    ground-level sponsor boards, which sit just under the horizon at 0.44h —
    and the top follows from however tall the board happens to be. Clamped
    so it can never ride up under the status bar.
  */
  const assemblyH = bh * 1.23;
  const by = portrait
    ? Math.max(HUD_BAR_CLEARANCE, h * 0.375 - assemblyH)
    : Math.max(standTop - bh * 0.52, HUD_BAR_CLEARANCE);

  /* --- the gantry it stands on --- */
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(cx - bw * 0.06, by + bh, bw * 0.12, Math.max(0, standTop + h * 0.09 - (by + bh)));

  /*
    --- the casing ---

    Black, like the panel it holds. This is the surround that shows as a
    band above and below the screen, so a navy casing around a black screen
    does not read as trim — it reads as the screen still being blue at the
    edges. The gold uprights are the only colour the unit keeps, and they
    are what stops the whole assembly disappearing into the stand behind it.
  */
  const r = bh * 0.09;
  ctx.beginPath();
  ctx.roundRect(bx - bw * 0.035, by - bh * 0.05, bw * 1.07, bh * 1.13, r);
  ctx.fillStyle = "#20242c";
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, bw * 0.012);
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  ctx.fillStyle = "#f5b81f";
  ctx.fillRect(bx - bw * 0.025, by, bw * 0.045, bh);
  ctx.fillRect(bx + bw * 0.98, by, bw * 0.045, bh);

  /* --- the panel --- */
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, r * 0.7);
  ctx.fillStyle = "#191d24";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, r * 0.7);
  ctx.clip();

  /*
    --- the stage the words stand on ---

    Flat and dark, deliberately.

    This carried a radial wash and a slowly rotating fan of sixteen rays,
    on the theory that the type should look lit from behind rather than
    printed on a rectangle. On the board at its real size that reads as
    pattern, not backlight: the rays are wide enough at the rim to cross
    the text at an angle and the whole panel competes with the one thing it
    exists to display, which is a line of commentary that changes every
    ball.

    A real stadium LED is black when it is not lit. The words are white
    display type at 14% of the board height with relief under them — they
    have all the separation they need from black, and none of the rays'
    cost. The confetti below stays, because that fires for about a second
    when something is worth celebrating and is the whole point when it does.

    Left as a fill rather than deleted outright so the panel's own rounding
    and clip still apply, and so this stays the single place the screen's
    background is decided.
  */
  /*
    Off-black, not black.

    A true #000 panel reads as a hole cut in the canvas rather than as a
    screen mounted in a stand — there is nothing darker on the field for it
    to sit against, so it stops being an object. A slightly blue-lifted
    charcoal keeps it clearly the darkest thing in the frame while still
    catching the stadium's own colour temperature.
  */
  ctx.fillStyle = "#191d24";
  ctx.fillRect(bx, by, bw, bh);

  /* confetti — only while something is being celebrated */
  if (b.shout) {
    const bits = ["#ff4d5e", "#ffc32e", "#4ade80", "#5aa2ff", "#ffffff"];
    for (let i = 0; i < 22; i++) {
      /* deterministic scatter: a hash of the index, so the pieces sit in
         the same places every shout instead of flickering frame to frame */
      const n = Math.sin(i * 127.1) * 43758.5453;
      const fx = bx + (n - Math.floor(n)) * bw;
      const m = Math.sin(i * 311.7) * 24634.6345;
      const fy = by + (m - Math.floor(m)) * bh;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(i * 1.7 + now / 900);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = bits[i % bits.length];
      ctx.fillRect(-bh * 0.018, -bh * 0.03, bh * 0.036, bh * 0.06);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* --- the words --- */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (b.shout) {
    ctx.font = `${Math.round(bh * 0.25)}px ${SHOUT_STACK}`;
    reliefText(ctx, b.shout, cx, by + bh * 0.4, bw * 0.9, {
      top: "#fff3c4",
      mid: "#ffc32e",
      low: "#e08a12",
    });

    ctx.font = `${Math.round(bh * 0.12)}px ${DISPLAY_STACK}`;
    reliefText(ctx, b.quote, cx, by + bh * 0.74, bw * 0.88, {
      top: "#ffffff",
      mid: "#ffffff",
      low: "#d4d4d4",
    });
  } else {
    ctx.font = `${Math.round(bh * 0.14)}px ${DISPLAY_STACK}`;
    reliefText(ctx, b.quote, cx, by + bh * 0.5, bw * 0.88, {
      top: "#ffffff",
      mid: "#ffffff",
      low: "#d4d4d4",
    });
  }
  ctx.restore();

  /* --- the hoarding strip under the board --- */
  const sy = by + bh * 1.1;
  const sh = bh * 0.13;
  const cols = ["#c9202e", "#f5b81f", "#1b7a4a", "#1b3f7a"];
  const cw = (bw * 1.07) / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(bx - bw * 0.035 + i * cw, sy, cw, sh);
  }
}

/*
  Draw a word the way the reference does: a hard dark outline, a vertical
  gradient fill, and a drop beneath it so the letters stand off the panel.

  The outline is what makes it survive the busy background — gold type
  straight onto a lit blue burst has nothing separating it from the rays,
  and the whole point of the burst is that it is bright. Stroke first, fill
  second: stroking over the fill eats half the letterform's weight.

  It also guarantees the line fits the board.

  Canvas will happily run a string straight off the edge of its panel, and
  these lines are authored copy of varying length — "No notes. None." beside
  "Client's nephew redesigned it." The font shrinks until it fits rather
  than the string being clipped, because a punchline with its last two words
  cut off is worse than a slightly smaller punchline.
*/
function reliefText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  ramp: { top: string; mid: string; low: string }
) {
  const base = parseFloat(ctx.font);
  let size = base;
  while (size > base * 0.55 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = ctx.font.replace(/^[\d.]+px/, `${size}px`);
  }

  const drop = Math.max(2, size * 0.07);

  /* the shadow the letters cast onto the panel. Neutral, like the panel:
     the navy this used to be was invisible against a blue board and became
     a blue halo the moment the board went black. */
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, x, y + drop * 1.6, maxW);

  /* the outline */
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size * 0.17);
  ctx.strokeStyle = "#000000";
  ctx.strokeText(text, x, y, maxW);

  /* and the fill, top-lit like every other surface in the kit */
  const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
  g.addColorStop(0, ramp.top);
  g.addColorStop(0.55, ramp.mid);
  g.addColorStop(1, ramp.low);
  ctx.fillStyle = g;
  ctx.fillText(text, x, y, maxW);
}


/* ============ floodlights ============

   Two towers, drawn after the sky and before the stands so they rise out
   of the roofline the way they do in the reference art rather than sitting
   on top of the crowd.

   The bloom is a radial gradient, not a shadowBlur: shadowBlur on a lamp
   this size is one of the most expensive things a 2D context can be asked
   for, and this runs every frame of every ball.
*/
export function paintFloodlights(ctx: CanvasRenderingContext2D, s: Scene) {
  const { w, h, standTop } = s;

  /* pulled in from the edge so the towers frame the board rather than
     clinging to the corners, and scaled off the stand band so they keep
     their proportion against the stadium at any frame shape */
  for (const side of [-1, 1] as const) {
    const x = w / 2 + side * w * 0.36;
    const headW = Math.min(w * 0.1, h * 0.13);
    const headH = headW * 0.6;
    /* the head sits well above the roofline and the mast runs all the way
       down into the stand — it was starting at standTop - 14% and ending at
       standTop + 5%, which is a stub, so the lamp read as floating */
    const headY = standTop - h * 0.2;

    /* the mast, tapering into the stand */
    ctx.beginPath();
    ctx.moveTo(x - headW * 0.07, headY + headH);
    ctx.lineTo(x + headW * 0.07, headY + headH);
    ctx.lineTo(x + headW * 0.12, standTop + h * 0.05);
    ctx.lineTo(x - headW * 0.12, standTop + h * 0.05);
    ctx.closePath();
    ctx.fillStyle = "#4a5d7e";
    ctx.fill();

    /* the head, then the bloom OVER it — behind the head it was being
       covered by the very thing it is supposed to be glowing from, which is
       why the lamps read as flat grey grids */

    /* the head, and its grid of lamps */
    ctx.beginPath();
    ctx.roundRect(x - headW / 2, headY, headW, headH, headW * 0.06);
    ctx.fillStyle = "#5b6f92";
    ctx.fill();

    /* the glow, additive, on top of the lit head */
    const g = ctx.createRadialGradient(x, headY + headH / 2, headW * 0.1, x, headY + headH / 2, headW * 1.6);
    g.addColorStop(0, "rgba(228,244,255,0.55)");
    g.addColorStop(0.4, "rgba(190,225,255,0.2)");
    g.addColorStop(1, "rgba(190,225,255,0)");

    const cols = 4;
    const rows = 3;
    const pad = headW * 0.07;
    const cw = (headW - pad * 2) / cols;
    const ch = (headH - pad * 2) / rows;
    ctx.fillStyle = "#f2f9ff";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.roundRect(
          x - headW / 2 + pad + c * cw + cw * 0.12,
          headY + pad + r * ch + ch * 0.12,
          cw * 0.76,
          ch * 0.76,
          cw * 0.12
        );
        ctx.fill();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(x - headW * 1.6, headY + headH / 2 - headW * 1.6, headW * 3.2, headW * 3.2);
    ctx.restore();
  }
}
