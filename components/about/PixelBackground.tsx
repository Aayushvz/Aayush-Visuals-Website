"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment Background
  --------------------------------------
  - solid black background (#090909) with a radial vignette
  - 6-8 pixel clouds procedurally generated using Ken Perlin's Improved Noise
  - Edges dissolve into black strictly by density reduction (no opacity gradients, no blur, no glow)
  - Monochrome grayscale palette only
  - Parallax mouse drifting
  - requestAnimationFrame rendering at 60 FPS
*/

// Ken Perlin's Improved Noise implementation
class ImprovedNoise {
  p: Int32Array;
  constructor() {
    this.p = new Int32Array(256 * 2);
    const permutation = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233, 7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,
      136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,135,130,116,188,189,138,1,14,95,91,121,53,45,224,222,250,
      254,164,198,172,182,29,130,241,120,30,81,125,58,114,248,84,185,15,44,186,162,191,124,6,150,248,0,0,18,22,254,99,85,121,229,111,172,3,
      191,243,115,85,34,30,55,173,156,50,26,127,12,221,114,209,8,132,222,70,141,196,135,17,205,50,80,244,77,220,95,201,140,35,43,39,120,
      24,190,197,144,48,206,238,101,17,147,136,12,77,246,94,213,248,168,17,172,239,24,120,247,21,121,128,167,81,223,109,85,21,241,206,122,230,196
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[256 + i] = permutation[i];
    }
  }

  noise(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z,
          B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
                                                 this.grad(this.p[BA], x - 1, y, z)),
                                     this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                                                 this.grad(this.p[BB], x - 1, y - 1, z))),
                         this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                                                 this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                                     this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                                                 this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
  }

  fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }

  grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

type Cloud = {
  pixelSize: number;
  scale: number; // noise scale zoom factor
  speed: number; // drift speed multiplier
  seed: number; // unique Z coordinate in noise space
  brightness: number; // grayscale color tone (40-200)
  opacity: number; // constant square opacity
  radius: number; // absolute boundary box radius
  centerX: number; // normalized coordinate X
  centerY: number; // normalized coordinate Y
  parallax: number; // parallax offset speed
};

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noiseSolver = new ImprovedNoise();
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

    const onPointerMove = (e: PointerEvent) => {
      // Normalize mouse offset between -0.5 and 0.5
      targetMx = (e.clientX / window.innerWidth) - 0.5;
      targetMy = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Define 7 independent procedural pixel clouds
    const clouds: Cloud[] = [
      { pixelSize: 8, scale: 0.012, speed: 0.04, seed: 15.2, brightness: 120, opacity: 0.28, radius: 260, centerX: 0.22, centerY: 0.30, parallax: 8 },
      { pixelSize: 6, scale: 0.018, speed: 0.03, seed: 42.8, brightness: 150, opacity: 0.22, radius: 310, centerX: 0.78, centerY: 0.25, parallax: 14 },
      { pixelSize: 10, scale: 0.009, speed: 0.02, seed: 73.1, brightness: 100, opacity: 0.20, radius: 360, centerX: 0.45, centerY: 0.65, parallax: 18 },
      { pixelSize: 4, scale: 0.024, speed: 0.05, seed: 91.5, brightness: 180, opacity: 0.32, radius: 210, centerX: 0.15, centerY: 0.80, parallax: 26 },
      { pixelSize: 6, scale: 0.015, speed: 0.035, seed: 28.3, brightness: 140, opacity: 0.26, radius: 290, centerX: 0.85, centerY: 0.75, parallax: 16 },
      { pixelSize: 8, scale: 0.020, speed: 0.025, seed: 57.6, brightness: 110, opacity: 0.18, radius: 240, centerX: 0.58, centerY: 0.15, parallax: 10 },
      { pixelSize: 10, scale: 0.011, speed: 0.018, seed: 84.9, brightness: 90, opacity: 0.14, radius: 280, centerX: 0.30, centerY: 0.48, parallax: 12 }
    ];

    const draw = (timeSec: number) => {
      // Lerp mouse coordinate values for fluid parallax transitions
      mx += (targetMx - mx) * 0.08;
      my += (targetMy - my) * 0.08;

      ctx.clearRect(0, 0, W, H);

      // ----------------------------------------------------
      // LAYER 1 — BASE & SUBTLE VIGNETTE
      // ----------------------------------------------------
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, W, H);

      const vignette = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.85);
      vignette.addColorStop(0, "rgba(255, 255, 255, 0.015)");
      vignette.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // ----------------------------------------------------
      // LAYER 2 — PROCEDURAL PERLIN PIXEL CLOUDS
      // ----------------------------------------------------
      clouds.forEach((cloud) => {
        const pSize = cloud.pixelSize;
        const px = mx * cloud.parallax;
        const py = my * cloud.parallax;

        // Calculate absolute center for this cloud
        const ccx = cloud.centerX * W + px;
        const ccy = cloud.centerY * H + py;
        const R = cloud.radius;

        // Bounding box for this cloud
        const startX = Math.max(0, Math.floor((ccx - R) / pSize) * pSize);
        const endX = Math.min(W, Math.ceil((ccx + R) / pSize) * pSize);
        const startY = Math.max(0, Math.floor((ccy - R) / pSize) * pSize);
        const endY = Math.min(H, Math.ceil((ccy + R) / pSize) * pSize);

        // Drift offset over time
        const driftX = timeSec * cloud.speed * 8;
        const driftY = timeSec * cloud.speed * 6;

        ctx.globalAlpha = cloud.opacity;
        ctx.fillStyle = `rgb(${cloud.brightness},${cloud.brightness},${cloud.brightness})`;

        for (let y = startY; y < endY; y += pSize) {
          for (let x = startX; x < endX; x += pSize) {
            // Distance from cloud center (normalized 0 to 1)
            const dx = x - ccx;
            const dy = y - ccy;
            const distSq = dx * dx + dy * dy;
            const Rsq = R * R;

            if (distSq >= Rsq) continue;

            const distNorm = Math.sqrt(distSq) / R;
            // Radial weight falloff (reaches 0 at the boundary radius edges)
            const falloff = 1 - distNorm;

            // SampleKen Perlin Noise: inputs scaled & animated by drift
            // noise() returns [-1, 1], normalize to [0, 1]
            const noiseVal = (noiseSolver.noise(x * cloud.scale + driftX, y * cloud.scale + driftY, cloud.seed) + 1.0) / 2.0;

            // Density envelope fades out pixels towards the boundary edges
            const density = noiseVal * falloff;

            // Threshold checks: edges dissolve because fewer pixels are drawn, NOT due to blur/opacity gradients
            if (density > 0.44) {
              // Crisp monochrome square
              ctx.fillRect(x, y, pSize, pSize);
            }
          }
        }
      });

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
        zIndex: 5, // Behind typography, nav, and portrait layers
        pointerEvents: "none",
        display: "block"
      }}
    />
  );
}
