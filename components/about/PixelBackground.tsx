"use client";

import { useEffect, useRef } from "react";

/*
  Procedural Pixel Environment — Portrait-matched tones
  ------------------------------------------------------
  Uses the same color palette as the portrait renderer:
    Deep charcoal-purple #141118 → Muted lavender #7c6a96 → Cream #f4f1ea
  
  Larger, more numerous formations with slow independent drift.
  Same 7px cell / 6px square grid as portrait.
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

// Portrait color palette stops (resting):
// Stop 0: Deep charcoal-purple  (20, 17, 24)
// Stop 1: Muted lavender        (124, 106, 150)
// Stop 2: Warm cream            (244, 241, 234)
// For background we use the darker end of this palette — stops 0 to 1
// with a few pixels reaching into stop 2 territory for highlights

function bgColor(intensity: number): [number, number, number] {
  // intensity 0..1 maps through the portrait palette
  // 0.0 = deep charcoal-purple, 0.5 = muted lavender, 1.0 = warm cream
  if (intensity < 0.6) {
    const t = intensity / 0.6;
    return [
      20 + t * (124 - 20),
      17 + t * (106 - 17),
      24 + t * (150 - 24),
    ];
  } else {
    const t = (intensity - 0.6) / 0.4;
    return [
      124 + t * (244 - 124),
      106 + t * (241 - 106),
      150 + t * (234 - 150),
    ];
  }
}

type Layer = {
  scale: number;      // noise zoom — smaller = larger formations
  speedX: number;     // drift X
  speedY: number;     // drift Y
  zSeed: number;      // unique Z slice
  threshold: number;  // noise cutoff
  opacity: number;    // base alpha
  toneMin: number;    // min intensity for bgColor
  toneMax: number;    // max intensity for bgColor
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

    // 7 layers — larger formations, more coverage, portrait-matched tones
    const layers: Layer[] = [
      // Deep charcoal-purple base — very large, very slow
      { scale: 0.003, speedX: 0.004, speedY: 0.003, zSeed: 3.7,  threshold: 0.28, opacity: 0.40, toneMin: 0.00, toneMax: 0.08 },
      // Dark purple undertone — large
      { scale: 0.005, speedX: 0.006, speedY: 0.004, zSeed: 15.2, threshold: 0.32, opacity: 0.35, toneMin: 0.05, toneMax: 0.18 },
      // Charcoal-lavender mid-dark
      { scale: 0.007, speedX: 0.009, speedY: 0.006, zSeed: 31.8, threshold: 0.36, opacity: 0.30, toneMin: 0.12, toneMax: 0.28 },
      // Muted mid-tone
      { scale: 0.010, speedX: 0.012, speedY: 0.008, zSeed: 48.5, threshold: 0.40, opacity: 0.25, toneMin: 0.20, toneMax: 0.40 },
      // Lavender atmospheric
      { scale: 0.014, speedX: 0.016, speedY: 0.011, zSeed: 67.3, threshold: 0.44, opacity: 0.20, toneMin: 0.30, toneMax: 0.52 },
      // Light lavender detail
      { scale: 0.020, speedX: 0.020, speedY: 0.014, zSeed: 82.1, threshold: 0.50, opacity: 0.16, toneMin: 0.42, toneMax: 0.62 },
      // Cream highlights — finest, rarest
      { scale: 0.028, speedX: 0.024, speedY: 0.017, zSeed: 99.4, threshold: 0.58, opacity: 0.12, toneMin: 0.55, toneMax: 0.78 },
    ];

    // Portrait suppression center
    const portraitCX = 0.28;
    const portraitCY = 0.62;

    // Pre-allocate color cache to avoid per-frame string creation
    const colorCache = new Map<number, string>();
    function getColor(r: number, g: number, b: number): string {
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

      // Base — matches portrait deep shadow
      ctx.fillStyle = "#0e0c12";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        const ny = cellY / H;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;
          const nx2 = cellX / W;

          // Density mask — suppress near portrait, boost toward edges
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

          // Evaluate layers dark → bright, first visible wins
          for (const layer of layers) {
            const driftX = t * layer.speedX;
            const driftY = t * layer.speedY;

            const sampleX = (cellX + mx * 14) * layer.scale + driftX;
            const sampleY = (cellY + my * 14) * layer.scale + driftY;

            const n = fbm(sampleX, sampleY, layer.zSeed);
            const nv = (n + 1) * 0.5;

            const thresh = layer.threshold + (1 - mask) * 0.35;

            if (nv <= thresh) continue;

            const intensity = Math.min(1, (nv - thresh) / (1 - thresh));
            const tone = layer.toneMin + intensity * (layer.toneMax - layer.toneMin);
            const [r, g, b] = bgColor(tone);
            const ri = Math.round(r), gi = Math.round(g), bi = Math.round(b);

            ctx.globalAlpha = layer.opacity * (0.45 + intensity * 0.55);
            ctx.fillStyle = getColor(ri, gi, bi);
            ctx.fillRect(cellX, cellY, SQ, SQ);
            break;
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
