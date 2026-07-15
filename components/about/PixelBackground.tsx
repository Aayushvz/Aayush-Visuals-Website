"use client";

import { useEffect, useRef } from "react";

/*
  Pixel Starfield + Drifting Cloud Layers Background
  -----------------------------------------------------------------------
  Combines:
    1. Static scattered pixel starfield (seeded, deterministic layout)
    2. 8 large drifting noise cloud layers that slowly morph and drift
    3. Coherent hover animation: a "reveal lens" — when you hover, nearby
       pixels get revealed at higher resolution and shift toward #A78BFA
       purple, as if the cursor is a magnifying glass peering into the
       digital substrate. The reveal radius is generous (200px) and has a
       warm bloom that creates a soft glow at the centre of the spotlight.
       
  Design rationale: The hover doesn't feel random — it feels like you're
  peering deeper into the engineering grid, exposing the hidden structure.
  The purple accent ties it to the brand palette. The clouds give organic
  depth and movement without being distracting.
*/

// ---- Perlin noise ----
const PERM = new Uint8Array([
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,189,138,234,14,95,121,53,45,224,222,250,254,
  164,198,172,182,29,107,241,120,30,81,125,58,114,248,84,185,15,44,186,162,191,
  124,6,150,127,0,0,18,22,254,99,85,121,229,111,172,3,191,243,115,85,34,30,55,
  173,156,50,26,127,12,221,114,209,8,132,222,70,141,196,135,17,205,50,80,244,
  77,220,95,201,140,35,43,39,120,24,190,197,144,48,206,238,101,17,147,136,12,
  77,246,94,213,248,168,17,172,239,24,120,247,21,121,128,167,81,223,109,85,21,
  241,206,122,230,196
]);
const P = new Uint8Array(512);
for (let i = 0; i < 256; i++) { P[i] = PERM[i]; P[256 + i] = PERM[i]; }

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function nlerp(t: number, a: number, b: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function pnoise(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = P[X]+Y, AA = P[A]+Z, AB = P[A+1]+Z, B = P[X+1]+Y, BA = P[B]+Z, BB = P[B+1]+Z;
  return nlerp(w,
    nlerp(v, nlerp(u, grad(P[AA],x,y,z), grad(P[BA],x-1,y,z)),
             nlerp(u, grad(P[AB],x,y-1,z), grad(P[BB],x-1,y-1,z))),
    nlerp(v, nlerp(u, grad(P[AA+1],x,y,z-1), grad(P[BA+1],x-1,y,z-1)),
             nlerp(u, grad(P[AB+1],x,y-1,z-1), grad(P[BB+1],x-1,y-1,z-1))));
}
function fbm(x: number, y: number, z: number) {
  return pnoise(x, y, z) * 0.5 + pnoise(x*2, y*2, z) * 0.3 + pnoise(x*4, y*4, z) * 0.2;
}

// ---- Seeded PRNG ----
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- Constants ----
const CELL = 10;
const GAP = 2;
const SQ = CELL - GAP;

// 4×4 Bayer dither threshold matrix
const BAYER = [
  [0.0625, 0.5625, 0.1875, 0.6875],
  [0.8125, 0.3125, 0.9375, 0.4375],
  [0.2500, 0.7500, 0.1250, 0.6250],
  [1.0000, 0.5000, 0.8750, 0.3750]
];

type Cloud = {
  scale: number; speedX: number; speedY: number;
  zSeed: number; cx: number; cy: number;
  radius: number; parallax: number;
  maxIntensity: number; opacity: number;
};

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let destroyed = false;
    let raf = 0;

    // Pointer tracking
    let px = -9999, py = -9999, lpx = -9999, lpy = -9999;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const SPOT_R = 200;

    const onPointerMove = (e: PointerEvent) => {
      px = e.clientX; py = e.clientY;
      tmx = (e.clientX / window.innerWidth) - 0.5;
      tmy = (e.clientY / window.innerHeight) - 0.5;
    };
    const onPointerLeave = () => { px = -9999; py = -9999; };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    // Static starfield
    type Pixel = { x: number; y: number; baseOp: number; phase: number; freq: number };
    let pixels: Pixel[] = [];

    const buildPixels = () => {
      pixels = [];
      const rng = mulberry32(0xdeadbeef);
      const clusterX = W > 900 ? W * 0.72 : W * 0.5;
      const clusterY = W > 900 ? H * 0.60 : H * 0.75;
      const clusterR = Math.min(W, H) * 0.50;
      const cluster2X = W * 0.15;
      const cluster2Y = W > 900 ? H * 0.65 : H * 0.55;
      const cluster2R = clusterR * 0.45;
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * CELL, cy = row * CELL;
          const d1 = Math.hypot(cx - clusterX, cy - clusterY);
          const d2 = Math.hypot(cx - cluster2X, cy - cluster2Y);
          const t1 = Math.max(0, 1 - d1 / clusterR);
          const t2 = Math.max(0, 1 - d2 / cluster2R);
          const prob = Math.max(0.04, t1 * t1 * 0.80, t2 * t2 * 0.45);
          if (rng() < prob) {
            const df = Math.max(t1, t2 * 0.5, 0.1);
            pixels.push({
              x: cx, y: cy,
              baseOp: Math.min(0.025 + df * 0.10 + rng() * 0.04, 0.18),
              phase: rng() * Math.PI * 2,
              freq: 0.08 + rng() * 0.25
            });
          }
        }
      }
    };

    // 10 cloud layers — large, slow, organic fog
    const clouds: Cloud[] = [
      { scale: 0.003,  speedX: 0.006,  speedY: 0.004,  zSeed: 10.3, cx: 0.15, cy: 0.20, radius: 520, parallax: 6,  maxIntensity: 0.45, opacity: 0.16 },
      { scale: 0.004,  speedX: 0.009,  speedY: 0.006,  zSeed: 28.7, cx: 0.85, cy: 0.15, radius: 480, parallax: 10, maxIntensity: 0.55, opacity: 0.13 },
      { scale: 0.002,  speedX: 0.004,  speedY: 0.003,  zSeed: 45.1, cx: 0.50, cy: 0.55, radius: 600, parallax: 8,  maxIntensity: 0.35, opacity: 0.18 },
      { scale: 0.005,  speedX: 0.012,  speedY: 0.008,  zSeed: 63.4, cx: 0.08, cy: 0.80, radius: 400, parallax: 16, maxIntensity: 0.55, opacity: 0.11 },
      { scale: 0.0035, speedX: 0.008,  speedY: 0.005,  zSeed: 81.9, cx: 0.92, cy: 0.75, radius: 450, parallax: 12, maxIntensity: 0.48, opacity: 0.14 },
      { scale: 0.0045, speedX: 0.011,  speedY: 0.007,  zSeed: 33.6, cx: 0.60, cy: 0.10, radius: 420, parallax: 14, maxIntensity: 0.52, opacity: 0.12 },
      { scale: 0.0025, speedX: 0.005,  speedY: 0.004,  zSeed: 57.2, cx: 0.35, cy: 0.45, radius: 550, parallax: 7,  maxIntensity: 0.40, opacity: 0.16 },
      { scale: 0.006,  speedX: 0.015,  speedY: 0.010,  zSeed: 89.4, cx: 0.75, cy: 0.85, radius: 380, parallax: 18, maxIntensity: 0.60, opacity: 0.10 },
      { scale: 0.0028, speedX: 0.007,  speedY: 0.005,  zSeed: 14.8, cx: 0.42, cy: 0.72, radius: 500, parallax: 9,  maxIntensity: 0.42, opacity: 0.15 },
      { scale: 0.0032, speedX: 0.010,  speedY: 0.006,  zSeed: 72.1, cx: 0.68, cy: 0.38, radius: 460, parallax: 11, maxIntensity: 0.50, opacity: 0.13 },
    ];

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPixels();
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Colour helpers
    const BASE_R = 200, BASE_G = 196, BASE_B = 208; // cool grey
    const HOVER_R = 167, HOVER_G = 139, HOVER_B = 250; // #A78BFA

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      // Smooth pointer lerp
      if (px < -1000) {
        lpx += (-9999 - lpx) * 0.08;
        lpy += (-9999 - lpy) * 0.08;
      } else {
        lpx += (px - lpx) * 0.08;
        lpy += (py - lpy) * 0.08;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      // 1. Draw cloud layers on the grid
      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;

          // Hover lens — smooth-step falloff
          const hd = Math.hypot(cellX - lpx, cellY - lpy);
          let hoverBlend = 0;
          if (hd < SPOT_R) {
            const hf = 1 - hd / SPOT_R;
            hoverBlend = hf * hf * (3 - 2 * hf);
          }

          // Cloud density accumulation
          let cloudD = 0;
          let cloudOp = 0.08;

          for (const cloud of clouds) {
            const driftX = t * cloud.speedX;
            const driftY = t * cloud.speedY;
            const pmx = mx * cloud.parallax;
            const pmy = my * cloud.parallax;
            const ccx = cloud.cx * W + pmx;
            const ccy = cloud.cy * H + pmy;

            const dx = cellX - ccx;
            const dy = cellY - ccy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cloud.radius) {
              const falloff = 1 - dist / cloud.radius;
              const n = fbm(
                (cellX + pmx) * cloud.scale + driftX,
                (cellY + pmy) * cloud.scale + driftY,
                cloud.zSeed
              );
              const nv = (n + 1) * 0.5;
              const density = falloff * nv * cloud.maxIntensity;

              if (density > cloudD) {
                cloudD = density;
                cloudOp = cloud.opacity;
              }
            }
          }

          // Hover boosts cloud density
          if (hoverBlend > 0) {
            cloudD = Math.min(1.0, cloudD + hoverBlend * 0.12);
          }

          if (cloudD <= 0.01) continue;

          // Bayer dither
          if (cloudD < BAYER[gy % 4][gx % 4]) continue;

          // Colour: lerp from grey base toward #A78BFA under the spotlight
          const r = Math.round(BASE_R + (HOVER_R - BASE_R) * hoverBlend);
          const g = Math.round(BASE_G + (HOVER_G - BASE_G) * hoverBlend);
          const b = Math.round(BASE_B + (HOVER_B - BASE_B) * hoverBlend);

          const op = Math.min(0.30, cloudOp * (0.4 + cloudD * 0.6) + hoverBlend * 0.08);
          ctx.globalAlpha = op;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(cellX, cellY, SQ, SQ);
        }
      }

      // 2. Draw static starfield pixels (on top of clouds, with breathing)
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        const sine = (Math.sin(t * p.freq + p.phase) + 1) * 0.5;
        let op = p.baseOp * (0.3 + sine * 0.7);

        // Hover: boost and colour shift
        const hd = Math.hypot(p.x - lpx, p.y - lpy);
        let hoverBlend = 0;
        if (hd < SPOT_R) {
          const hf = 1 - hd / SPOT_R;
          hoverBlend = hf * hf * (3 - 2 * hf);
          op = Math.min(op + hoverBlend * 0.10, 0.35);
        }

        if (op < 0.005) continue;

        const r = Math.round(BASE_R + (HOVER_R - BASE_R) * hoverBlend);
        const g = Math.round(BASE_G + (HOVER_G - BASE_G) * hoverBlend);
        const b = Math.round(BASE_B + (HOVER_B - BASE_B) * hoverBlend);

        ctx.globalAlpha = op;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(p.x, p.y, SQ, SQ);
      }

      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed) return;
      draw(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
