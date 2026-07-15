"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment — Combined Hybrid Renderer with Hover Spotlight
  ----------------------------------------------------------------------------
  Combines:
    1. Continuous infinite pixel field (digital fog) for overall movement.
    2. Localized dithered cloud clusters for dense organic formations.
    3. Interactive hover spotlight that increases density and brightens pixels
       locally around the pointer on the unified grid.
  
  Renders both on a unified 7px cell / 6px square grid using a 4x4 Bayer dither matrix
  and the portrait color palette:
    - Deep charcoal purple: rgb(20, 17, 24)
    - Muted lavender: rgb(124, 106, 150)
    - Warm cream: rgb(244, 241, 234)
*/

// Perlin noise
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
  return (
    pnoise(x, y, z) * 0.5 +
    pnoise(x * 2, y * 2, z) * 0.3 +
    pnoise(x * 4, y * 4, z) * 0.2
  );
}

const CELL = 7;
const SQ = CELL - 1;

// 4x4 Bayer Ordered Dither Matrix
const BAYER_4x4 = [
  [ 0.0625, 0.5625, 0.1875, 0.6875 ],
  [ 0.8125, 0.3125, 0.9375, 0.4375 ],
  [ 0.2500, 0.7500, 0.1250, 0.6250 ],
  [ 1.0000, 0.5000, 0.8750, 0.3750 ]
];

// Color mapping matching image stops
function getDitherColor(intensity: number): [number, number, number] {
  if (intensity < 0.55) {
    const t = intensity / 0.55;
    return [
      20 + t * (124 - 20),
      17 + t * (106 - 17),
      24 + t * (150 - 24)
    ];
  } else {
    const t = (intensity - 0.55) / 0.45;
    return [
      124 + t * (244 - 124),
      106 + t * (241 - 106),
      150 + t * (234 - 150)
    ];
  }
}

type Cloud = {
  scale: number;
  speedX: number;
  speedY: number;
  zSeed: number;
  cx: number;
  cy: number;
  radius: number;
  parallax: number;
  maxIntensity: number;
  opacity: number;
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
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let px = -2000, py = -2000, lpx = -2000, lpy = -2000;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      tmx = (e.clientX / window.innerWidth) - 0.5;
      tmy = (e.clientY / window.innerHeight) - 0.5;
    };

    const onPointerLeave = () => {
      px = -2000;
      py = -2000;
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    resize();

    // 8 drifting clouds with large sizes (low scales) and portrait-matched attributes
    const clouds: Cloud[] = [
      { scale: 0.003, speedX: 0.006, speedY: 0.004, zSeed: 10.3, cx: 0.15, cy: 0.20, radius: 480, parallax: 6,  maxIntensity: 0.65, opacity: 0.28 },
      { scale: 0.004, speedX: 0.009, speedY: 0.006, zSeed: 28.7, cx: 0.85, cy: 0.15, radius: 450, parallax: 10, maxIntensity: 0.80, opacity: 0.24 },
      { scale: 0.002, speedX: 0.004, speedY: 0.003, zSeed: 45.1, cx: 0.50, cy: 0.55, radius: 580, parallax: 8,  maxIntensity: 0.50, opacity: 0.32 },
      { scale: 0.005, speedX: 0.012, speedY: 0.008, zSeed: 63.4, cx: 0.08, cy: 0.80, radius: 380, parallax: 16, maxIntensity: 0.90, opacity: 0.20 },
      { scale: 0.0035,speedX: 0.008, speedY: 0.005, zSeed: 81.9, cx: 0.92, cy: 0.75, radius: 420, parallax: 12, maxIntensity: 0.70, opacity: 0.26 },
      { scale: 0.0045,speedX: 0.011, speedY: 0.007, zSeed: 33.6, cx: 0.60, cy: 0.10, radius: 400, parallax: 14, maxIntensity: 0.85, opacity: 0.22 },
      { scale: 0.0025,speedX: 0.005, speedY: 0.004, zSeed: 57.2, cx: 0.35, cy: 0.45, radius: 520, parallax: 7,  maxIntensity: 0.55, opacity: 0.30 },
      { scale: 0.006, speedX: 0.015, speedY: 0.010, zSeed: 89.4, cx: 0.75, cy: 0.85, radius: 360, parallax: 18, maxIntensity: 0.95, opacity: 0.18 }
    ];

    // Portrait suppression coordinates
    const portraitCX = 0.28;
    const portraitCY = 0.62;

    const colorCache = new Map<number, string>();
    function getCachedColor(r: number, g: number, b: number): string {
      const key = (r << 16) | (g << 8) | b;
      let c = colorCache.get(key);
      if (!c) {
        c = `rgb(${r},${g},${b})`;
        colorCache.set(key, c);
      }
      return c;
    }

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      // Smooth pointer tracking interpolation
      if (px < -1000) {
        lpx += (-2000 - lpx) * 0.08;
        lpy += (-2000 - lpy) * 0.08;
      } else {
        lpx += (px - lpx) * 0.08;
        lpy += (py - lpy) * 0.08;
      }

      ctx.clearRect(0, 0, W, H);

      // Deep dark background
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        const ny = cellY / H;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;
          const nx2 = cellX / W;

          // Portrait suppression mask
          const dpx = nx2 - portraitCX;
          const dpy = ny - portraitCY;
          const portraitDist = Math.sqrt(dpx * dpx + dpy * dpy);
          let mask = 1.0;
          if (portraitDist < 0.42) {
            const f = portraitDist / 0.42;
            mask = f * f;
          }

          // Pointer hover spotlight math
          const hdx = cellX - lpx;
          const hdy = cellY - lpy;
          const hoverDist = Math.sqrt(hdx * hdx + hdy * hdy);
          const spotlightRadius = 220;
          let hoverBoost = 0;
          if (hoverDist < spotlightRadius) {
            const hf = 1 - hoverDist / spotlightRadius;
            hoverBoost = hf * hf * (3 - 2 * hf); // smoothstep envelope
          }

          // 1. Baseline continuous infinite noise field (slow, morphing digital fog)
          const baseScale = 0.007;
          const baseDriftX = t * 0.008;
          const baseDriftY = t * 0.006;
          const baseN = fbm(
            (cellX + mx * 10) * baseScale + baseDriftX,
            (cellY + my * 10) * baseScale + baseDriftY,
            7.3
          );
          const baseNv = (baseN + 1) * 0.5;
          // Very low density baseline
          const baseDensity = Math.max(0, baseNv - 0.46) * 0.28;

          // 2. Cloud clusters density
          let clusterD = 0;
          let activeOpacity = 0.12;

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

              if (density > clusterD) {
                clusterD = density;
                activeOpacity = cloud.opacity;
              }
            }
          }

          // Combine baseline fog and cluster density
          let finalD = Math.max(baseDensity, clusterD);

          // Boost density within the hover spotlight region
          if (hoverBoost > 0) {
            finalD = Math.min(1.0, finalD + hoverBoost * 0.35);
          }

          // Apply portrait suppression mask
          finalD *= mask;

          if (finalD <= 0.01) continue;

          // Bayer 4x4 Dithering Check
          const ditherThreshold = BAYER_4x4[gy % 4][gx % 4];
          if (finalD < ditherThreshold) continue;

          // Interpolated color stops (boosted locally in spotlight to cream highlights)
          const toneVal = Math.min(1.0, finalD + hoverBoost * 0.18);
          const [r, g, b] = getDitherColor(toneVal);
          const ri = Math.round(r), gi = Math.round(g), bi = Math.round(b);

          // Set opacity (hover spotlight brightens and solidifies the pixels)
          const baseOpacity = finalD === baseDensity ? 0.08 : activeOpacity;
          const op = Math.min(0.85, baseOpacity * (0.4 + finalD * 0.6) + hoverBoost * 0.38);

          ctx.globalAlpha = op;
          ctx.fillStyle = getCachedColor(ri, gi, bi);
          ctx.fillRect(cellX, cellY, SQ, SQ);
        }
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
        display: "block"
      }}
    />
  );
}
