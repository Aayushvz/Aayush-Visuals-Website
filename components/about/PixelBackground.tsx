"use client";

import { useEffect, useRef } from "react";

/*
  Premium Monochrome Pixel-Cloud Background
  -----------------------------------------
  Layer 1: Solid nearly black (#090909) with a soft radial vignette.
  Layer 2: Giant atmospheric pixel clouds generated organically using noise fields (metaballs).
           Dithered edges dissolving to black. Grayscale only. Custom cell grid per cloud.
  Layer 3: Monochrome digital sensor noise (2% opacity).
  Layer 4: Soft radial depth glows behind the clouds.
  Parallax: Mouse-driven subtle depth offsets per cloud.
*/

type BlobNode = {
  phaseX: number;
  phaseY: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  r: number; // radius
};

type Cloud = {
  pixelSize: number;
  baseOpacity: number;
  parallax: number; // max offset in px
  centerX: number; // normalized 0-1
  centerY: number; // normalized 0-1
  nodes: BlobNode[];
};

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    let destroyed = false;
    let raf = 0;

    // Mouse coordinates for parallax
    let mx = 0;
    let my = 0;
    let targetMx = 0;
    let targetMy = 0;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Mouse move handler
    const onPointerMove = (e: PointerEvent) => {
      // Normalize mouse between -0.5 and 0.5
      targetMx = (e.clientX / window.innerWidth) - 0.5;
      targetMy = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Pre-render a 256x256 digital grain noise texture to save drawing cycles
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const grainCtx = grainCanvas.getContext("2d")!;
    const grainImgData = grainCtx.createImageData(256, 256);
    for (let i = 0; i < grainImgData.data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      grainImgData.data[i] = val;
      grainImgData.data[i + 1] = val;
      grainImgData.data[i + 2] = val;
      grainImgData.data[i + 3] = 6; // ~2.3% opacity
    }
    grainCtx.putImageData(grainImgData, 0, 0);
    const grainPattern = ctx.createPattern(grainCanvas, "repeat")!;

    // Define 4 distinct pixel clouds with organic metaball nodes
    const clouds: Cloud[] = [
      {
        pixelSize: 10,
        baseOpacity: 0.12,
        parallax: 6,
        centerX: 0.25,
        centerY: 0.3,
        nodes: [
          { phaseX: 0, phaseY: 2.1, freqX: 0.04, freqY: 0.05, ampX: 80, ampY: 70, r: 240 },
          { phaseX: 1.5, phaseY: 0.5, freqX: 0.03, freqY: 0.06, ampX: 90, ampY: 100, r: 280 },
          { phaseX: 3.1, phaseY: 1.8, freqX: 0.05, freqY: 0.03, ampX: 70, ampY: 80, r: 220 }
        ]
      },
      {
        pixelSize: 8,
        baseOpacity: 0.18,
        parallax: 12,
        centerX: 0.75,
        centerY: 0.4,
        nodes: [
          { phaseX: 0.5, phaseY: 0, freqX: 0.05, freqY: 0.04, ampX: 100, ampY: 80, r: 220 },
          { phaseX: 2.2, phaseY: 1.2, freqX: 0.04, freqY: 0.05, ampX: 80, ampY: 90, r: 250 },
          { phaseX: 4.1, phaseY: 3.0, freqX: 0.03, freqY: 0.03, ampX: 110, ampY: 70, r: 200 }
        ]
      },
      {
        pixelSize: 6,
        baseOpacity: 0.26,
        parallax: 18,
        centerX: 0.35,
        centerY: 0.7,
        nodes: [
          { phaseX: 1.1, phaseY: 2.5, freqX: 0.06, freqY: 0.05, ampX: 70, ampY: 60, r: 180 },
          { phaseX: 2.8, phaseY: 0.9, freqX: 0.05, freqY: 0.07, ampX: 60, ampY: 80, r: 210 },
          { phaseX: 0.2, phaseY: 3.8, freqX: 0.04, freqY: 0.04, ampX: 80, ampY: 70, r: 170 }
        ]
      },
      {
        pixelSize: 4,
        baseOpacity: 0.36,
        parallax: 24,
        centerX: 0.8,
        centerY: 0.8,
        nodes: [
          { phaseX: 2.0, phaseY: 1.0, freqX: 0.07, freqY: 0.06, ampX: 50, ampY: 50, r: 130 },
          { phaseX: 0.5, phaseY: 3.2, freqX: 0.06, freqY: 0.05, ampX: 60, ampY: 45, r: 150 },
          { phaseX: 3.5, phaseY: 0.2, freqX: 0.05, freqY: 0.08, ampX: 40, ampY: 60, r: 120 }
        ]
      }
    ];

    const draw = (timeSec: number) => {
      // Lerp mouse coordinates for ultra-smooth parallax
      mx += (targetMx - mx) * 0.08;
      my += (targetMy - my) * 0.08;

      ctx.clearRect(0, 0, W, H);

      // ----------------------------------------------------
      // LAYER 1 — BASE & VIGNETTE
      // ----------------------------------------------------
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      const vignette = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.85);
      vignette.addColorStop(0, "rgba(255, 255, 255, 0.025)");
      vignette.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // ----------------------------------------------------
      // LAYER 4 — DEPTH (SOFT RADIAL GLOWS BEHIND CLOUDS)
      // ----------------------------------------------------
      clouds.forEach((cloud, idx) => {
        const px = mx * cloud.parallax;
        const py = my * cloud.parallax;
        const cx = cloud.centerX * W + px;
        const cy = cloud.centerY * H + py;

        const glowSize = Math.max(250, W * (0.18 + idx * 0.08));
        const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowSize);
        glow.addColorStop(0, `rgba(60, 60, 60, ${0.11 - idx * 0.02})`);
        glow.addColorStop(0.6, `rgba(20, 20, 20, ${0.03 - idx * 0.007})`);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      });

      // ----------------------------------------------------
      // LAYER 2 — PIXEL CLOUD SYSTEM
      // ----------------------------------------------------
      clouds.forEach((cloud) => {
        const pSize = cloud.pixelSize;
        const px = mx * cloud.parallax;
        const py = my * cloud.parallax;

        // Calculate absolute center for this cloud frame
        const ccx = cloud.centerX * W + px;
        const ccy = cloud.centerY * H + py;

        // Calculate absolute positions of the moving nodes
        const activeNodes = cloud.nodes.map((node) => {
          const nx = ccx + Math.sin(timeSec * node.freqX + node.phaseX) * node.ampX;
          const ny = ccy + Math.cos(timeSec * node.freqY + node.phaseY) * node.ampY;
          return { x: nx, y: ny, r: node.r };
        });

        // Determine bounding box around all nodes to save rendering computations
        let minX = W, maxX = 0, minY = H, maxY = 0;
        activeNodes.forEach((node) => {
          minX = Math.min(minX, node.x - node.r);
          maxX = Math.max(maxX, node.x + node.r);
          minY = Math.min(minY, node.y - node.r);
          maxY = Math.max(maxY, node.y + node.r);
        });

        // Align bounding box to pixel grid
        const startX = Math.max(0, Math.floor(minX / pSize) * pSize);
        const endX = Math.min(W, Math.ceil(maxX / pSize) * pSize);
        const startY = Math.max(0, Math.floor(minY / pSize) * pSize);
        const endY = Math.min(H, Math.ceil(maxY / pSize) * pSize);

        // Draw squares inside bounding box matching noise density
        for (let y = startY; y < endY; y += pSize) {
          for (let x = startX; x < endX; x += pSize) {
            const cellCenterValX = x + pSize / 2;
            const cellCenterValY = y + pSize / 2;

            // Calculate metaball density sum at this cell
            let density = 0;
            activeNodes.forEach((node) => {
              const dist = Math.hypot(cellCenterValX - node.x, cellCenterValY - node.y);
              if (dist < node.r) {
                // Smooth weight falloff curve
                const f = 1 - dist / node.r;
                density += f * f * (3 - 2 * f);
              }
            });

            // If density matches threshold, render the square cell
            // We introduce a tiny dither offset based on coordinates to make edges look beautifully organic
            const dither = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.15;
            if (density > 0.32 + dither) {
              const alphaScale = Math.min(1.0, (density - 0.3) * 1.5);
              const op = cloud.baseOpacity * alphaScale;

              // Determine monochrome color tone based on density (Stop 0: Dark gray to Stop 2: Almost white)
              let grayTone = 45; // Dark gray base #2d2d2d
              if (density > 0.7) {
                grayTone = Math.round(45 + (density - 0.7) * 230); // interpolates up to #e0e0e0
              } else if (density > 0.4) {
                grayTone = Math.round(45 + (density - 0.4) * 80); // interpolates up to #7d7d7d
              }
              const clampTone = Math.max(0, Math.min(240, grayTone));

              ctx.globalAlpha = op;
              ctx.fillStyle = `rgb(${clampTone},${clampTone},${clampTone})`;
              // Exact crisp square
              ctx.fillRect(x, y, pSize, pSize);
            }
          }
        }
      });

      ctx.globalAlpha = 1;

      // ----------------------------------------------------
      // LAYER 3 — DIGITAL GRAIN (SUBTLE MONOCHROME NOISE)
      // ----------------------------------------------------
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W, H);
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
        zIndex: 5, // Behind text/nav/portrait
        pointerEvents: "none",
        display: "block"
      }}
    />
  );
}
