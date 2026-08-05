/*
  The world: a day match, drawn back to front.

  All of it is hand-authored canvas. There are no images to load, which is
  the constraint that shaped the style: flat fills, heavy outlines and bold
  colour, closer to a vector poster than to a render. Everything that does
  not move between frames — the crowd, the clouds, the mown stripes, the
  fielders — is computed once per resize and replayed, because generating
  four thousand crowd dots inside the draw loop would cost more than the
  rest of the frame put together.

  Randomness is seeded. An unseeded crowd re-rolls every frame and the
  entire stand boils, which is the single fastest way to make a static
  background look broken.
*/

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

  /* ---- fielders, kept off the pitch and out of the ball's line ---- */
  const fielders = [
    { x: 0.16, y: 0.62 }, { x: 0.31, y: 0.55 }, { x: 0.72, y: 0.56 },
    { x: 0.87, y: 0.63 }, { x: 0.24, y: 0.78 }, { x: 0.8, y: 0.8 },
    { x: 0.42, y: 0.53 }, { x: 0.6, y: 0.52 },
  ].map((f) => ({ x: f.x * w, y: horizon + (h - horizon) * (f.y - 0.5) * 0.9, s: 1 }));

  return { w, h, horizon, cx, crowd, clouds, fielders, standTop };
}

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

export function paintStadium(ctx: CanvasRenderingContext2D, s: Scene) {
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

  /* mown stripes converge on the vanishing point */
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, w, h - horizon);
  ctx.clip();
  for (let i = -9; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * w * 0.02, horizon);
    ctx.lineTo(cx + i * w * 0.42, h + 40);
    ctx.lineTo(cx + (i + 1) * w * 0.42, h + 40);
    ctx.lineTo(cx + (i + 1) * w * 0.02, horizon);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
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
export function paintBowler(ctx: CanvasRenderingContext2D, s: Scene, t: number) {
  const { h, horizon, cx } = s;
  const sc = h * 0.00055 * 90;
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

export function paintBatter(ctx: CanvasRenderingContext2D, s: Scene, swing: number, now: number) {
  const { w, h, cx } = s;
  /* scale off width as well as height: sizing purely by height renders a
     helmet a third of the screen tall on a narrow phone canvas */
  const u = Math.min(h, w * 1.35);
  const x = cx - w * 0.1;
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

  ctx.fillStyle = KIT.white;
  ctx.font = Math.round(headR * 1.25) + "px var(--ckt-display), Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("07", x, shoulderY + u * 0.085);
  ctx.textAlign = "left";

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
}

export function paintFielders(ctx: CanvasRenderingContext2D, s: Scene) {
  for (const f of s.fielders) {
    const sc = ((f.y - s.horizon) * 0.07 + s.h * 0.018) * Math.min(1, s.w / 700);
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
