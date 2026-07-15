"use client";

import { useEffect, useRef } from "react";

/*
  Pixel Starfield Background
  -----------------------------------------------------------------------
  Mimics the reference: dark canvas with tiny scattered square pixels,
  very low opacity, random distribution with denser clusters in certain
  regions (matching the portrait area). No blobs, no clouds, no movement.
  
  Only animation: extremely slow per-pixel opacity breathing (fade in/out).
  
  Grid cells: 6px squares with 1px gap, randomly placed based on a
  seeded probability map. Denser near the portrait zone (right on desktop,
  bottom on mobile).
*/

const CELL = 6;   // square pixel size
const GAP  = 1;   // gap between pixels
const SQ   = CELL - GAP; // 5px drawn square

// Seeded PRNG — gives deterministic random layout on every resize
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

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

    // Pointer for hover spotlight
    let lpx = -9999, lpy = -9999;
    const SPOT_R = 160;

    const onPointerMove = (e: PointerEvent) => { lpx = e.clientX; lpy = e.clientY; };
    const onPointerLeave = () => { lpx = -9999; lpy = -9999; };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    // Static pixel array (recalculated on resize)
    type Pixel = {
      x: number; y: number;        // canvas position
      baseOp: number;              // resting opacity (0.02–0.12)
      phase: number;               // sine phase offset
      freq: number;                // sine frequency (very slow)
    };
    let pixels: Pixel[] = [];

    const buildPixels = () => {
      pixels = [];
      const rng = mulberry32(0xdeadbeef); // deterministic seed

      const isMobile = W <= 900;
      // Portrait cluster centre — right half on desktop, bottom-centre on mobile
      const clusterX = isMobile ? W * 0.5  : W * 0.72;
      const clusterY = isMobile ? H * 0.75 : H * 0.60;
      const clusterR = isMobile ? Math.min(W, H) * 0.55 : Math.min(W, H) * 0.50;

      // Secondary sparse cluster (upper-left in reference)
      const cluster2X = isMobile ? W * 0.15 : W * 0.15;
      const cluster2Y = isMobile ? H * 0.55 : H * 0.65;
      const cluster2R = clusterR * 0.45;

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const px = col * CELL;
          const py = row * CELL;

          // Distance from primary cluster (portrait zone)
          const d1 = Math.hypot(px - clusterX, py - clusterY);
          const d2 = Math.hypot(px - cluster2X, py - cluster2Y);

          // Primary cluster density: very dense near portrait, sparse far
          const t1 = Math.max(0, 1 - d1 / clusterR);
          const probCluster = t1 * t1 * 0.80; // up to 80% probability at centre

          // Secondary cluster density
          const t2 = Math.max(0, 1 - d2 / cluster2R);
          const probCluster2 = t2 * t2 * 0.45;

          // Sparse global field — ~4% chance anywhere
          const probGlobal = 0.04;

          const prob = Math.max(probGlobal, probCluster, probCluster2);

          if (rng() < prob) {
            // Opacity scales with cluster density + slight global random
            const densityFactor = Math.max(t1, t2 * 0.5, 0.1);
            const baseOp = 0.025 + densityFactor * 0.10 + rng() * 0.04;

            pixels.push({
              x: px,
              y: py,
              baseOp: Math.min(baseOp, 0.18),
              phase: rng() * Math.PI * 2,
              freq: 0.08 + rng() * 0.25,   // very slow: 0.08–0.33 rad/s
            });
          }
        }
      }
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPixels();
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Pure dark background
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      // Draw pixels with slow opacity breathing
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];

        // Sine fade: oscillates between 0 and 1
        const sine = (Math.sin(t * p.freq + p.phase) + 1) * 0.5;
        let op = p.baseOp * (0.3 + sine * 0.7); // min 30% of baseOp

        // Hover spotlight: boost nearby pixels
        const hd = Math.hypot(p.x - lpx, p.y - lpy);
        if (hd < SPOT_R) {
          const hf = 1 - hd / SPOT_R;
          const boost = hf * hf * (3 - 2 * hf); // smooth-step
          op = Math.min(op + boost * 0.06, 0.28);
        }

        if (op < 0.005) continue;

        ctx.globalAlpha = op;
        // Colour: very dark grey, near-neutral but very slightly warm
        ctx.fillStyle = "#c8c4d0";
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
