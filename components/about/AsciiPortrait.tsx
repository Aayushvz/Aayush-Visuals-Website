"use client";

import { useEffect, useRef } from "react";

/*
  Living Pixel-Halftone Portrait — canvas renderer, no CSS/font fakery.
  Draws vector squares directly onto the canvas. The size and opacity of
  the squares are driven by the source image's processed luminance grid.
  
  Hover spotlight dynamically REBUILDS the portrait locally at 2× grid
  resolution and switches the color to your soft purple accent shade.
  
  Background grid covers the entire canvas, reacting seamlessly to the spotlight.
*/

const BASE_CELL = 7; // Grid resolution (resting size), in CSS px. A bit smaller makes the face much more high-res and detailed!

type Props = {
  src: string;
  onHoverChange?: (hovering: boolean) => void;
};

const getInset = () => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  return Math.max(44, Math.min(132, vw * 0.09));
};

const lerpColor = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) => {
  return {
    r: Math.round(r1 + (r2 - r1) * t),
    g: Math.round(g1 + (g2 - g1) * t),
    b: Math.round(b1 + (b2 - b1) * t)
  };
};

// Grayscale and purple palette color lookup stops to avoid blurriness and create deep shadows
const getPixelColor = (l: number, isHover: boolean) => {
  let r = 0, g = 0, b = 0;
  if (!isHover) {
    // Coarse resting stops:
    // Stop 0 (Deep charcoal purple shadow): #141118 (20, 17, 24)
    // Stop 1 (Muted lavender midtone): #7c6a96 (124, 106, 150)
    // Stop 2 (Warm cream highlight): #f4f1ea (244, 241, 234)
    if (l < 0.5) {
      const t = l / 0.5;
      ({ r, g, b } = lerpColor(20, 17, 24, 124, 106, 150, t));
    } else {
      const t = (l - 0.5) / 0.5;
      ({ r, g, b } = lerpColor(124, 106, 150, 244, 241, 234, t));
    }
  } else {
    // Fine spotlight stops:
    // Stop 0 (Deep black purple shadow): #12091f (18, 9, 31)
    // Stop 1 (Rich violet midtone): #6d28d9 (109, 40, 217)
    // Stop 2 (Bright lavender highlight): #a78bfa (167, 139, 250)
    if (l < 0.5) {
      const t = l / 0.5;
      ({ r, g, b } = lerpColor(18, 9, 31, 109, 40, 217, t));
    } else {
      const t = (l - 0.5) / 0.5;
      ({ r, g, b } = lerpColor(109, 40, 217, 167, 139, 250, t));
    }
  }
  return `rgb(${r},${g},${b})`;
};

export default function AsciiPortrait({ src, onHoverChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverCb = useRef(onHoverChange);
  hoverCb.current = onHoverChange;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    let img: HTMLImageElement | null = null;
    let raf = 0;
    let destroyed = false;

    /* figure draw rect + source alpha-bbox crop */
    let ix = 0, iy = 0, iw = 0, ih = 0;
    let sxc = 0, syc = 0, swc = 0, shc = 0;

    /* two sampling grids: coarse (resting) and fine (spotlight, 2×) */
    const cell = BASE_CELL;
    let cols = 0, rows = 0;
    let lumC: Float32Array = new Float32Array(0);
    let alpC: Float32Array = new Float32Array(0);
    let colsF = 0, rowsF = 0;
    let lumF: Float32Array = new Float32Array(0);
    let alpF: Float32Array = new Float32Array(0);
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true })!;

    /* background noise grid mapping */
    let bgNoise: Float32Array = new Float32Array(0);

    /* diagonal sweep wave of light */
    let wavePos = -0.3;
    const waveWidth = 0.18;
    const waveAmp = 0.28;
    let waveActive = true;
    let lastWaveTime = 0;

    /* spotlight */
    let bx = 0, by = 0, btx = 0, bty = 0;
    let br = 0, brTarget = 0;
    let hovering = false;

    let needsDraw = true;

    const sampleGrid = (c: number, r: number) => {
      sampler.width = c;
      sampler.height = r;
      sctx.clearRect(0, 0, c, r);
      sctx.drawImage(
        img!,
        sxc, syc, swc, shc,
        (ix / W) * c,
        (iy / H) * r,
        (iw / W) * c,
        (ih / H) * r
      );
      const data = sctx.getImageData(0, 0, c, r).data;
      const lum = new Float32Array(c * r);
      const alp = new Float32Array(c * r);
      for (let i = 0; i < c * r; i++) {
        const red = data[i * 4];
        const green = data[i * 4 + 1];
        const blue = data[i * 4 + 2];
        let a = data[i * 4 + 3] / 255;
        
        // Treat solid white/near-white as transparent
        if (red > 235 && green > 235 && blue > 235) {
          a = 0;
        }

        alp[i] = a;
        
        // Boost contrast and brightness for face recognition
        let l = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        if (a > 0) {
          l = (l - 0.08) / 0.84; // stretch contrast
          l = Math.max(0, Math.min(1, l));
          l = Math.pow(l, 0.72); // gamma midtone boost
        }

        lum[i] = l * a;
      }
      return { lum, alp };
    };

    const resample = () => {
      if (!img || !W || !H) return;
      cols = Math.max(8, Math.floor(W / cell));
      rows = Math.max(8, Math.floor(H / cell));
      
      // Initialize a persistent dithered background noise grid (varying tones, only created on window resize)
      bgNoise = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const rand = Math.random();
        if (rand < 0.65) bgNoise[i] = 0; // black
        else if (rand < 0.92) bgNoise[i] = 0.06 + Math.random() * 0.08; // dark gray
        else bgNoise[i] = 0.15 + Math.random() * 0.12; // light gray
      }

      ({ lum: lumC, alp: alpC } = sampleGrid(cols, rows));
      colsF = cols * 2;
      rowsF = rows * 2;
      ({ lum: lumF, alp: alpF } = sampleGrid(colsF, rowsF));
      needsDraw = true;
    };

    const layout = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.round(r.width);
      H = Math.round(r.height);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (img) {
        const inset = getInset();
        const gridW = W - inset * 2;
        if (W > 900) {
          // Desktop: center the portrait in the left 45% of the viewport width
          const s = (H * 0.76) / shc; // scale to fit height nicely
          iw = swc * s;
          ih = shc * s;
          ix = inset + (gridW * 0.45 - iw) / 2;
          iy = H - ih;
        } else {
          // Mobile: center horizontally at the bottom of the screen
          const s = Math.min(W * 0.78, H * 0.52) / shc;
          iw = swc * s;
          ih = shc * s;
          ix = (W - iw) / 2;
          iy = H - ih;
        }
        resample();
      }
    };

    const falloff = (cx: number, cy: number) => {
      if (br < 0.5) return 0;
      const d = Math.hypot(cx - bx, cy - by);
      if (d >= br) return 0;
      const f = 1 - d / br;
      return f * f * (3 - 2 * f); // smoothstep
    };

    const draw = () => {
      if (!img || !cols) return;
      ctx.clearRect(0, 0, W, H);
      
      const c = cell;
      const cf = c / 2;

      /* 1. Coarse background and resting state (Cream tone base palette) */
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const cx = x * c + c / 2;
          const cy = y * c + c / 2;
          const f = falloff(cx, cy);
          
          let size = c - 1.0; // uniform square size to align perfectly with background
          let opacity = 0;
          let colorVal = 0;

          // Calculate diagonal sweep boost
          const diag = (x / cols + y / rows) / 2;
          const dWave = Math.abs(diag - wavePos);
          let waveBoost = 0;
          if (dWave < waveWidth) {
            const t = dWave / waveWidth;
            waveBoost = waveAmp * (1 - t * t * (3 - 2 * t)); // smoothstep wave envelope
          }

          if (alpC[i] >= 0.3) {
            // Face pixel
            const l = lumC[i];
            colorVal = Math.max(0, Math.min(1, l + waveBoost));
            opacity = (0.08 + colorVal * 0.72) * (1 - f);
          } else {
            // Background screen grid (matching pixel size exactly, completely solid/static)
            colorVal = Math.max(0, Math.min(1, bgNoise[i] + waveBoost * 0.7));
            opacity = 0.45 * (1 - f); // darker background shade
          }

          if (opacity < 0.01) continue;
          ctx.globalAlpha = opacity;
          ctx.fillStyle = getPixelColor(colorVal, false);
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        }
      }

      /* 2. Fine Spotlight Hover overlay (Lavender tone base palette, 2x resolution increase!) */
      if (br > 0.5) {
        const x0 = Math.max(0, Math.floor((bx - br) / cf));
        const x1 = Math.min(colsF - 1, Math.ceil((bx + br) / cf));
        const y0 = Math.max(0, Math.floor((by - br) / cf));
        const y1 = Math.min(rowsF - 1, Math.ceil((by + br) / cf));

        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * colsF + x;
            const cx = x * cf + cf / 2;
            const cy = y * cf + cf / 2;
            const f = falloff(cx, cy);
            if (f < 0.02) continue;

            let size = cf - 0.6; // uniform fine square size
            let opacity = 0;
            let colorVal = 0;

            // Map to corresponding coarse cell index for matching background noise and wave sweeps
            const cxIdx = Math.floor(x / 2);
            const cyIdx = Math.floor(y / 2);
            const cIdx = cyIdx * cols + cxIdx;

            // Calculate diagonal sweep boost
            const diag = (cxIdx / cols + cyIdx / rows) / 2;
            const dWave = Math.abs(diag - wavePos);
            let waveBoost = 0;
            if (dWave < waveWidth) {
              const t = dWave / waveWidth;
              waveBoost = waveAmp * (1 - t * t * (3 - 2 * t));
            }

            if (alpF[i] >= 0.3) {
              // Detailed face pixel
              const l = lumF[i];
              colorVal = Math.max(0, Math.min(1, l + waveBoost));
              opacity = (0.12 + colorVal * 0.78) * f;
            } else {
              // Spotlighted background screen grid (matching fine pixel size)
              const bgN = (cIdx >= 0 && cIdx < cols * rows) ? bgNoise[cIdx] : 0;
              colorVal = Math.max(0, Math.min(1, bgN + waveBoost * 0.7));
              opacity = 0.5 * f;
            }

            if (opacity < 0.01) continue;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = getPixelColor(colorVal, true);
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed) return;

      // Lerp spotlight radius and coords
      const ease = 0.15;
      bx += (btx - bx) * ease;
      by += (bty - by) * ease;
      br += (brTarget - br) * ease;
      if (Math.abs(br - brTarget) > 0.1 || (brTarget > 0 && Math.hypot(bx - btx, by - bty) > 0.5)) {
        needsDraw = true;
      }

      // Diagonal wave sweep physics (100% path-directed movement, no random flicker)
      if (waveActive) {
        wavePos += 0.0035; // slow diagonal glide speed
        if (wavePos > 1.35) {
          waveActive = false;
          lastWaveTime = now;
        }
        needsDraw = true;
      } else {
        if (now - lastWaveTime > 5500) { // sweep every 5.5 seconds
          waveActive = true;
          wavePos = -0.3; // reset off-screen left
        }
      }

      if (needsDraw) {
        needsDraw = false;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    const onPointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      btx = e.clientX - r.left;
      bty = e.clientY - r.top;
      if (!hovering) {
        hovering = true;
        bx = btx;
        by = bty;
        brTarget = Math.min(W, H) * 0.35;
        hoverCb.current?.(true);
      }
    };
    const onPointerLeave = () => {
      hovering = false;
      brTarget = 0;
      hoverCb.current?.(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("pointercancel", onPointerLeave, { passive: true });

    const ro = new ResizeObserver(layout);
    ro.observe(wrap);

    const image = new Image();
    image.src = src;
    image.decode().then(() => {
      if (destroyed) return;
      const probe = document.createElement("canvas");
      const scanW = 160;
      const scanH = Math.max(1, Math.round((image.height / image.width) * scanW));
      probe.width = scanW;
      probe.height = scanH;
      const pctx = probe.getContext("2d", { willReadFrequently: true })!;
      pctx.drawImage(image, 0, 0, scanW, scanH);
      const pd = pctx.getImageData(0, 0, scanW, scanH).data;
      let minX = scanW, minY = scanH, maxX = 0, maxY = 0;
      for (let y = 0; y < scanH; y++) {
        for (let x = 0; x < scanW; x++) {
          const idx = (y * scanW + x) * 4;
          const rVal = pd[idx];
          const gVal = pd[idx + 1];
          const bVal = pd[idx + 2];
          let aVal = pd[idx + 3];
          
          if (rVal > 235 && gVal > 235 && bVal > 235) {
            aVal = 0;
          }

          if (aVal > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const kx = image.width / scanW;
      const ky = image.height / scanH;
      sxc = Math.max(0, (minX - 1) * kx);
      syc = Math.max(0, (minY - 1) * ky);
      swc = Math.min(image.width - sxc, (maxX - minX + 3) * kx);
      shc = Math.min(image.height - syc, (maxY - minY + 3) * ky);
      if (swc <= 0 || shc <= 0) {
        sxc = 0; syc = 0; swc = image.width; shc = image.height;
      }
      img = image;
      layout();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      destroyed = true;
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointercancel", onPointerLeave);
    };
  }, [src]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
