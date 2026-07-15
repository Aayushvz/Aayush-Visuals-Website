"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment Background
  ----------------------------------------
  Unified pixel grid matching the portrait renderer (7px cell, 6px square).
  
  Uses Ken Perlin's Improved Noise to generate organic cloud formations.
  Edges dissolve strictly by density reduction — no blur, no glow, no opacity gradients.
  Monochrome grayscale only. No purple.
  Parallax mouse tracking for depth.
*/

// Ken Perlin's Improved Noise
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
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
  const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(w,
    lerp(v, lerp(u, grad(P[AA], x, y, z), grad(P[BA], x-1, y, z)),
            lerp(u, grad(P[AB], x, y-1, z), grad(P[BB], x-1, y-1, z))),
    lerp(v, lerp(u, grad(P[AA+1], x, y, z-1), grad(P[BA+1], x-1, y, z-1)),
            lerp(u, grad(P[AB+1], x, y-1, z-1), grad(P[BB+1], x-1, y-1, z-1))));
}

// Fractal Brownian Motion for richer cloud shapes
function fbm(x: number, y: number, z: number, octaves: number) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise(x * freq, y * freq, z) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max; // normalized to roughly [-1, 1]
}

const CELL = 7;       // Exact same grid as portrait BASE_CELL
const SQ = CELL - 1;  // 6px square with 1px gap — matches portrait exactly

type Cloud = {
  scale: number;      // noise zoom
  speed: number;      // drift speed
  seed: number;       // unique Z coord in noise space
  brightness: number; // grayscale tone 0-255
  threshold: number;  // noise cutoff — higher = sparser
  cx: number;         // center X normalized 0-1
  cy: number;         // center Y normalized 0-1
  radius: number;     // cloud extent in px
  parallax: number;   // mouse offset multiplier
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

    // 7 clouds with varied properties for depth and atmosphere
    const clouds: Cloud[] = [
      { scale: 0.008, speed: 0.018, seed: 10.3, brightness: 55,  threshold: 0.38, cx: 0.20, cy: 0.25, radius: 380, parallax: 4  },
      { scale: 0.012, speed: 0.025, seed: 37.7, brightness: 75,  threshold: 0.42, cx: 0.80, cy: 0.20, radius: 340, parallax: 8  },
      { scale: 0.006, speed: 0.012, seed: 62.1, brightness: 45,  threshold: 0.35, cx: 0.50, cy: 0.60, radius: 440, parallax: 6  },
      { scale: 0.015, speed: 0.030, seed: 88.4, brightness: 95,  threshold: 0.46, cx: 0.12, cy: 0.78, radius: 280, parallax: 14 },
      { scale: 0.010, speed: 0.020, seed: 24.9, brightness: 65,  threshold: 0.40, cx: 0.88, cy: 0.72, radius: 320, parallax: 10 },
      { scale: 0.014, speed: 0.022, seed: 53.6, brightness: 85,  threshold: 0.44, cx: 0.55, cy: 0.12, radius: 300, parallax: 12 },
      { scale: 0.007, speed: 0.015, seed: 79.2, brightness: 50,  threshold: 0.36, cx: 0.35, cy: 0.45, radius: 400, parallax: 5  },
    ];

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;

      ctx.clearRect(0, 0, W, H);

      // Layer 1 — solid near-black with subtle vignette
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
      vig.addColorStop(0, "rgba(20, 20, 20, 0.08)");
      vig.addColorStop(0.6, "rgba(0, 0, 0, 0)");
      vig.addColorStop(1, "rgba(0, 0, 0, 0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Compute grid dimensions
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      // Layer 2 — procedural Perlin noise pixel clouds on unified grid
      for (const cloud of clouds) {
        const px = mx * cloud.parallax;
        const py = my * cloud.parallax;
        const ccx = cloud.cx * W + px;
        const ccy = cloud.cy * H + py;
        const R = cloud.radius;
        const Rsq = R * R;

        // Bounding box in grid coordinates
        const gx0 = Math.max(0, Math.floor((ccx - R) / CELL));
        const gx1 = Math.min(cols - 1, Math.ceil((ccx + R) / CELL));
        const gy0 = Math.max(0, Math.floor((ccy - R) / CELL));
        const gy1 = Math.min(rows - 1, Math.ceil((ccy + R) / CELL));

        const driftX = t * cloud.speed * 5;
        const driftY = t * cloud.speed * 3.7;
        const b = cloud.brightness;

        ctx.fillStyle = `rgb(${b},${b},${b})`;

        for (let gy = gy0; gy <= gy1; gy++) {
          const py2 = gy * CELL;
          for (let gx = gx0; gx <= gx1; gx++) {
            const px2 = gx * CELL;

            // Distance from cloud center
            const dx = px2 - ccx;
            const dy = py2 - ccy;
            const dSq = dx * dx + dy * dy;
            if (dSq >= Rsq) continue;

            // Radial falloff — controls density at edges
            const distNorm = Math.sqrt(dSq) / R;
            const falloff = 1 - distNorm;

            // Sample Perlin noise with drift animation
            const n = fbm(
              (px2 + driftX) * cloud.scale,
              (py2 + driftY) * cloud.scale,
              cloud.seed,
              3
            );
            // Normalize from [-1,1] to [0,1]
            const nv = (n + 1) * 0.5;

            // Density = noise * radial falloff
            // Pixels only appear where density exceeds threshold
            // This makes edges dissolve by having fewer pixels drawn
            const density = nv * falloff;
            if (density <= cloud.threshold) continue;

            // Vary opacity slightly based on density for tonal depth
            const opScale = Math.min(1, (density - cloud.threshold) * 3.5);
            ctx.globalAlpha = 0.15 + opScale * 0.25;
            ctx.fillRect(px2, py2, SQ, SQ);
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
