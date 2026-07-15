"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment — Hybrid Approach
  -----------------------------------------------
  Combines a continuous density field with multiple drifting noise layers.
  Each layer has its own gray tone, scale, speed, and Z-seed, creating
  the multi-tonal atmospheric look of the reference.
  
  Same 7px cell / 6px square grid as the portrait renderer.
  Monochrome only. No purple, no glow, no blur.
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

// Each layer drifts independently and has its own gray tone
type Layer = {
  scale: number;
  speedX: number;
  speedY: number;
  zSeed: number;
  gray: number;       // base gray value 0-255
  threshold: number;  // noise cutoff
  opacity: number;    // base alpha
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

    // 5 layers — each with a different gray tone, scale, speed, and density
    // Deepest/darkest layers are large and slow; brightest layers are finer and faster
    const layers: Layer[] = [
      // Dark black undertone — large, slow, dense
      { scale: 0.005, speedX: 0.006, speedY: 0.004, zSeed: 3.7,  gray: 22,  threshold: 0.32, opacity: 0.35 },
      // Dark gray mid-layer
      { scale: 0.008, speedX: 0.010, speedY: 0.007, zSeed: 18.4, gray: 45,  threshold: 0.40, opacity: 0.28 },
      // Mid gray atmospheric layer
      { scale: 0.012, speedX: 0.015, speedY: 0.011, zSeed: 41.9, gray: 75,  threshold: 0.46, opacity: 0.22 },
      // Light gray detail layer
      { scale: 0.018, speedX: 0.020, speedY: 0.014, zSeed: 67.3, gray: 110, threshold: 0.52, opacity: 0.18 },
      // Brightest highlights — finest, fastest
      { scale: 0.025, speedX: 0.025, speedY: 0.018, zSeed: 93.8, gray: 155, threshold: 0.58, opacity: 0.14 },
    ];

    // Portrait suppression center
    const portraitCX = 0.28;
    const portraitCY = 0.62;

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      ctx.clearRect(0, 0, W, H);

      // Base black
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      // Pre-compute density mask per cell (portrait suppression + corner boost)
      // This is shared across all layers
      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        const ny = cellY / H;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;
          const nx2 = cellX / W;

          // Distance from portrait center
          const dpx = nx2 - portraitCX;
          const dpy = ny - portraitCY;
          const portraitDist = Math.sqrt(dpx * dpx + dpy * dpy);

          // Distance from viewport center
          const vcx = nx2 - 0.5;
          const vcy = ny - 0.5;
          const centerDist = Math.sqrt(vcx * vcx + vcy * vcy);

          // Density mask
          let mask = 1.0;
          if (portraitDist < 0.42) {
            const f = portraitDist / 0.42;
            mask = f * f;
          }
          if (centerDist > 0.32) {
            mask = Math.min(1.0, mask + (centerDist - 0.32) * 0.4);
          }

          // Evaluate each layer — composite darkest to brightest
          for (const layer of layers) {
            const driftX = t * layer.speedX;
            const driftY = t * layer.speedY;

            const sampleX = (cellX + mx * 12) * layer.scale + driftX;
            const sampleY = (cellY + my * 12) * layer.scale + driftY;

            const n = fbm(sampleX, sampleY, layer.zSeed);
            const nv = (n + 1) * 0.5;

            // Raise threshold where mask is low (near portrait)
            const thresh = layer.threshold + (1 - mask) * 0.35;

            if (nv <= thresh) continue;

            // Intensity drives subtle alpha variation
            const intensity = Math.min(1, (nv - thresh) / (1 - thresh));
            const g = layer.gray;

            ctx.globalAlpha = layer.opacity * (0.5 + intensity * 0.5);
            ctx.fillStyle = `rgb(${g},${g},${g})`;
            ctx.fillRect(cellX, cellY, SQ, SQ);
            break; // Only draw one layer per cell — topmost visible wins
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
