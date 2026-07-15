"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment — Unified Grid & Portrait Colors
  -------------------------------------------------------------
  Combines continuous density with 8 drifting noise layers.
  Uses the exact portrait image colors:
    - Deep charcoal purple: rgb(20, 17, 24)
    - Muted lavender: rgb(124, 106, 150)
    - Warm cream: rgb(244, 241, 234)
  
  Format:
    - Large cloud sizes (lower scales)
    - Increased number of clouds/layers (8 layers)
    - Low opacity for subtle digital fog effect
    - Grid cell size: 7px cell, 6px square
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
    pnoise(x * 2, y * 2, z) * 0.25 +
    pnoise(x * 4, y * 4, z) * 0.125 +
    pnoise(x * 8, y * 8, z) * 0.0625
  ) / 0.9375;
}

const CELL = 7;
const SQ = CELL - 1;

// Image animation colors:
// Stop 0: Deep charcoal purple (20, 17, 24)
// Stop 1: Muted lavender       (124, 106, 150)
// Stop 2: Warm cream           (244, 241, 234)
function getLayerColor(intensity: number): [number, number, number] {
  if (intensity < 0.6) {
    const t = intensity / 0.6;
    return [
      20 + t * (124 - 20),
      17 + t * (106 - 17),
      24 + t * (150 - 24)
    ];
  } else {
    const t = (intensity - 0.6) / 0.4;
    return [
      124 + t * (244 - 124),
      106 + t * (241 - 106),
      150 + t * (234 - 150)
    ];
  }
}

type Layer = {
  scale: number;      // scale factor (smaller = larger cloud size)
  speedX: number;
  speedY: number;
  zSeed: number;
  threshold: number;  // lower = more dense coverage
  opacity: number;    // transparency (subtle)
  toneIntensity: number; // 0 (charcoal) to 1 (cream)
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
      tmx = (e.clientX / window.innerWidth) - 0.5;
      tmy = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    resize();

    // 8 layers — larger sizes (lower scales) and higher number of layers
    const layers: Layer[] = [
      // Deep undertones (charcoal-purple, very large, slow)
      { scale: 0.002, speedX: 0.005, speedY: 0.003, zSeed: 3.7,  threshold: 0.28, opacity: 0.32, toneIntensity: 0.02 },
      { scale: 0.003, speedX: 0.007, speedY: 0.005, zSeed: 12.1, threshold: 0.32, opacity: 0.28, toneIntensity: 0.08 },
      { scale: 0.004, speedX: 0.010, speedY: 0.007, zSeed: 24.5, threshold: 0.36, opacity: 0.24, toneIntensity: 0.16 },
      // Lavender midtones (larger cloud sizes)
      { scale: 0.006, speedX: 0.012, speedY: 0.009, zSeed: 38.9, threshold: 0.40, opacity: 0.20, toneIntensity: 0.28 },
      { scale: 0.008, speedX: 0.015, speedY: 0.011, zSeed: 53.4, threshold: 0.44, opacity: 0.18, toneIntensity: 0.40 },
      { scale: 0.011, speedX: 0.018, speedY: 0.013, zSeed: 67.2, threshold: 0.48, opacity: 0.15, toneIntensity: 0.52 },
      // Light lavender details
      { scale: 0.015, speedX: 0.022, speedY: 0.016, zSeed: 81.6, threshold: 0.52, opacity: 0.12, toneIntensity: 0.64 },
      // Cream highlight touches (fastest, sparsest)
      { scale: 0.020, speedX: 0.026, speedY: 0.019, zSeed: 95.3, threshold: 0.56, opacity: 0.08, toneIntensity: 0.76 },
    ];

    // Portrait suppression center
    const portraitCX = 0.28;
    const portraitCY = 0.62;

    // Color string cache to optimize rendering performance
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

      ctx.clearRect(0, 0, W, H);

      // Base black background matches portrait shadow stop
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

          // Portrait suppression mask (40% suppression around portrait)
          const dpx = nx2 - portraitCX;
          const dpy = ny - portraitCY;
          const portraitDist = Math.sqrt(dpx * dpx + dpy * dpy);
          const vcx = nx2 - 0.5;
          const vcy = ny - 0.5;
          const centerDist = Math.sqrt(vcx * vcx + vcy * vcy);

          let mask = 1.0;
          if (portraitDist < 0.40) {
            const f = portraitDist / 0.40;
            mask = f * f;
          }
          if (centerDist > 0.30) {
            mask = Math.min(1.0, mask + (centerDist - 0.30) * 0.5);
          }

          // Render layers — darkest/largest to brightest/smallest
          for (const layer of layers) {
            const driftX = t * layer.speedX;
            const driftY = t * layer.speedY;

            // Parallax offset applied to grid coordinates
            const sampleX = (cellX + mx * 12) * layer.scale + driftX;
            const sampleY = (cellY + my * 12) * layer.scale + driftY;

            const n = fbm(sampleX, sampleY, layer.zSeed);
            const nv = (n + 1) * 0.5;

            // Shift threshold based on the suppression mask
            const thresh = layer.threshold + (1 - mask) * 0.35;

            if (nv <= thresh) continue;

            const intensity = Math.min(1, (nv - thresh) / (1 - thresh));
            const tone = layer.toneIntensity + intensity * 0.12;
            const [r, g, b] = getLayerColor(Math.min(1, tone));
            const ri = Math.round(r), gi = Math.round(g), bi = Math.round(b);

            ctx.globalAlpha = layer.opacity * (0.45 + intensity * 0.55);
            ctx.fillStyle = getCachedColor(ri, gi, bi);
            ctx.fillRect(cellX, cellY, SQ, SQ);
            break; // Topmost visible layer handles this pixel grid cell
          }
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
