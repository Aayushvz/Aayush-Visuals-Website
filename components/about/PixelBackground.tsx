"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Field Background
  ----------------------------------
  One continuous infinite noise field across the entire viewport.
  Density varies organically — dense toward edges/corners, sparse near portrait.
  No individual clouds, blobs, or shapes. Just atmospheric pixel density.
  Same 7px cell / 6px square grid as the portrait renderer.
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
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }
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
  return lerp(w,
    lerp(v, lerp(u, grad(P[AA],x,y,z), grad(P[BA],x-1,y,z)),
            lerp(u, grad(P[AB],x,y-1,z), grad(P[BB],x-1,y-1,z))),
    lerp(v, lerp(u, grad(P[AA+1],x,y,z-1), grad(P[BA+1],x-1,y,z-1)),
            lerp(u, grad(P[AB+1],x,y-1,z-1), grad(P[BB+1],x-1,y-1,z-1))));
}

// 4-octave fBm for rich organic density
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

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      ctx.clearRect(0, 0, W, H);

      // Base
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      // Subtle vignette
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
      vig.addColorStop(0, "rgba(18, 18, 18, 0.06)");
      vig.addColorStop(0.55, "rgba(0, 0, 0, 0)");
      vig.addColorStop(1, "rgba(0, 0, 0, 0.5)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // One continuous procedural pixel field
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      // Portrait center (left 45% column, vertically centered-low)
      const portraitCX = W * 0.28;
      const portraitCY = H * 0.62;

      // Noise scale and drift
      const scale = 0.009;
      const drift = t * 0.012;

      // Parallax offset — entire field shifts subtly with mouse
      const px = mx * 10;
      const py = my * 10;

      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;

          // --- Density mask ---
          // Distance from portrait center (normalized 0-1 across viewport diagonal)
          const dpx = (cellX - portraitCX) / W;
          const dpy = (cellY - portraitCY) / H;
          const portraitDist = Math.sqrt(dpx * dpx + dpy * dpy);

          // Distance from viewport center (normalized)
          const vcx = (cellX / W) - 0.5;
          const vcy = (cellY / H) - 0.5;
          const centerDist = Math.sqrt(vcx * vcx + vcy * vcy);

          // Density mask: suppress near portrait, allow everywhere else,
          // increase toward corners
          // portraitDist < 0.2 → heavily suppressed
          // portraitDist 0.2-0.45 → gradual transition
          // corners (centerDist > 0.5) → boosted
          let mask = 1.0;

          // Suppress around portrait
          if (portraitDist < 0.45) {
            const f = portraitDist / 0.45;
            mask = f * f; // quadratic ramp — smooth suppression
          }

          // Boost toward corners
          if (centerDist > 0.35) {
            const cornerBoost = (centerDist - 0.35) * 1.2;
            mask = Math.min(1.0, mask + cornerBoost * 0.3);
          }

          // Sample continuous noise field
          const nx = (cellX + px) * scale + drift;
          const ny = (cellY + py) * scale + drift * 0.7;
          const n = fbm(nx, ny, 3.7);

          // Normalize noise from [-1,1] to [0,1]
          const nv = (n + 1) * 0.5;

          // Apply mask to threshold — lower mask = higher threshold = sparser
          const threshold = 0.52 + (1 - mask) * 0.3;

          if (nv <= threshold) continue;

          // Brightness varies with noise intensity — deeper areas darker
          const intensity = (nv - threshold) / (1 - threshold);
          const gray = Math.round(30 + intensity * 90);

          ctx.globalAlpha = 0.12 + intensity * 0.28;
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
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
