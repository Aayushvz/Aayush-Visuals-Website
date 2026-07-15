"use client";

import { useEffect, useRef } from "react";

/*
  Living ASCII portrait — canvas renderer, no CSS fakery.

  Pipeline: PNG → alpha-bbox crop → two luminance samplings (a coarse
  resting grid and a 2× fine grid) → character mapping onto the ramp
  " .:-=+*%#@░▒▓█" (brightness → density, block glyphs at the top end,
  which is what gives the reference its mosaic read) → glyph-atlas
  blitting per frame.

  Motion systems:
    · signal noise — every ~90ms a scattered subset of cells drifts one
      ramp step, so the surface renders continuously, never static;
    · breathing   — the resting cell size wanders a few percent every
      ~2.5s and the grid resamples;
    · spotlight   — the hover interaction. The cursor does NOT reveal the
      photo: it locally REBUILDS the portrait at double resolution.
      Inside a feathered radius the coarse glyphs dissolve and the fine
      grid fades in, sharper and brighter; outside stays soft and sparse.
      Radius and position are lerped every frame, so entering, moving and
      leaving are all continuous — on leave the coarse field rebuilds as
      the radius eases to zero.

  Perf: glyphs pre-rendered to atlases (one per resolution) and blitted
  with drawImage — zero per-frame fillText; the fine pass only touches
  the spotlight's bounding box; redraws only happen when state actually
  changed; DPR capped at 2; everything dies with the component on route
  leave.
*/

const RAMP = [" ", ".", ":", "-", "=", "+", "*", "%", "#", "@", "░", "▒", "▓", "█"];
const BASE_CELL = 11; // resting (coarse) cell, css px
const SHIMMER_MS = 90;
const BREATH_MS = 2500;
const ATLAS_FONT = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';

type Props = {
  src: string;
  onHoverChange?: (hovering: boolean) => void;
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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    let cell = BASE_CELL;
    let cellTarget = BASE_CELL;
    let cols = 0, rows = 0;
    let lumC: Float32Array = new Float32Array(0);
    let alpC: Float32Array = new Float32Array(0);
    let colsF = 0, rowsF = 0;
    let lumF: Float32Array = new Float32Array(0);
    let alpF: Float32Array = new Float32Array(0);
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true })!;

    /* glyph atlases */
    const atlasC = document.createElement("canvas");
    const atlasF = document.createElement("canvas");
    let atlasCellC = 0;
    let atlasCellF = 0;

    /* spotlight */
    let bx = 0, by = 0, btx = 0, bty = 0;
    let br = 0, brTarget = 0;
    let hovering = false;

    /* signal noise */
    let jitter = new Map<number, number>();
    let lastShimmer = 0;
    let lastBreath = 0;
    let needsDraw = true;

    const buildAtlas = (target: HTMLCanvasElement, cellPx: number, color: string) => {
      const s = Math.max(3, Math.round(cellPx)) * dpr;
      target.width = s * RAMP.length;
      target.height = s;
      const a = target.getContext("2d")!;
      a.clearRect(0, 0, target.width, target.height);
      a.fillStyle = color;
      a.font = `${Math.ceil(s * 1.02)}px ${ATLAS_FONT}`;
      a.textAlign = "center";
      a.textBaseline = "middle";
      RAMP.forEach((ch, i) => {
        if (ch !== " ") a.fillText(ch, i * s + s / 2, s * 0.54);
      });
      return Math.max(3, Math.round(cellPx));
    };

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
        const a = data[i * 4 + 3] / 255;
        alp[i] = a;
        lum[i] =
          ((0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) /
            255) *
          a;
      }
      return { lum, alp };
    };

    const resample = () => {
      if (!img || !W || !H) return;
      cols = Math.max(8, Math.floor(W / cell));
      rows = Math.max(8, Math.floor(H / cell));
      ({ lum: lumC, alp: alpC } = sampleGrid(cols, rows));
      colsF = cols * 2;
      rowsF = rows * 2;
      ({ lum: lumF, alp: alpF } = sampleGrid(colsF, rowsF));
      atlasCellC = buildAtlas(atlasC, cell, "#f4f1ea");
      atlasCellF = buildAtlas(atlasF, cell / 2, "#a78bfa");
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
        const s = Math.min(W / swc, H / shc);
        iw = swc * s;
        ih = shc * s;
        ix = (W - iw) / 2;
        iy = H - ih; // figure stands on the frame's bottom edge
        resample();
      }
    };

    const rampIdx = (l: number, boost: number) => {
      let idx = Math.round(Math.pow(l, 0.78) * (RAMP.length - 1) * (0.98 + boost * 0.25));
      return Math.max(0, Math.min(RAMP.length - 1, idx));
    };

    const falloff = (cx: number, cy: number) => {
      if (br < 0.5) return 0;
      const d = Math.hypot(cx - bx, cy - by);
      if (d >= br) return 0;
      const f = 1 - d / br;
      return f * f * (3 - 2 * f); // smoothstep feather
    };

    const draw = () => {
      if (!img || !cols) return;
      ctx.clearRect(0, 0, W, H);
      const c = cell;
      const acC = atlasCellC * dpr;
      const acF = atlasCellF * dpr;

      /* coarse resting field — dissolves inside the spotlight */
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (alpC[i] < 0.3) continue;
          let idx = rampIdx(lumC[i], 0);
          if (alpC[i] > 0.6) idx = Math.max(1, idx);
          const j = jitter.get(i);
          if (j) idx = Math.max(1, Math.min(RAMP.length - 1, idx + j));
          if (idx === 0) continue;
          const f = falloff(x * c + c / 2, y * c + c / 2);
          const a = (0.26 + lumC[i] * 0.58) * (1 - f);
          if (a < 0.015) continue;
          ctx.globalAlpha = a;
          ctx.drawImage(atlasC, idx * acC, 0, acC, acC, x * c, y * c, c, c);
        }
      }

      /* fine spotlight field — double resolution, brighter, only the
         brush's bounding box is walked */
      if (br > 0.5) {
        const cf = c / 2;
        const x0 = Math.max(0, Math.floor((bx - br) / cf));
        const x1 = Math.min(colsF - 1, Math.ceil((bx + br) / cf));
        const y0 = Math.max(0, Math.floor((by - br) / cf));
        const y1 = Math.min(rowsF - 1, Math.ceil((by + br) / cf));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * colsF + x;
            if (alpF[i] < 0.3) continue;
            const f = falloff(x * cf + cf / 2, y * cf + cf / 2);
            if (f < 0.02) continue;
            let idx = rampIdx(lumF[i], f);
            if (alpF[i] > 0.6) idx = Math.max(1, idx);
            if (idx === 0) continue;
            const a = (0.34 + lumF[i] * 0.66) * f;
            if (a < 0.015) continue;
            ctx.globalAlpha = a;
            ctx.drawImage(atlasF, idx * acF, 0, acF, acF, x * cf, y * cf, cf, cf);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed) return;

      if (!reduced && now - lastShimmer > SHIMMER_MS) {
        lastShimmer = now;
        jitter = new Map();
        const n = Math.floor(cols * rows * 0.014);
        for (let k = 0; k < n; k++) {
          jitter.set(
            Math.floor(Math.random() * cols * rows),
            Math.random() > 0.5 ? 1 : -1
          );
        }
        needsDraw = true;
      }

      if (!reduced && now - lastBreath > BREATH_MS) {
        lastBreath = now;
        cellTarget = BASE_CELL * (0.88 + Math.random() * 0.18);
      }
      if (Math.abs(cellTarget - cell) > 0.02) {
        cell += (cellTarget - cell) * 0.06;
        if (Math.abs(Math.floor(W / cell) - cols) >= 1) resample();
        needsDraw = true;
      }

      const rk = reduced ? 1 : 0.16;
      bx += (btx - bx) * rk;
      by += (bty - by) * rk;
      br += (brTarget - br) * (reduced ? 1 : 0.11);
      if (
        Math.abs(brTarget - br) > 0.4 ||
        (br > 0.5 && (Math.abs(btx - bx) > 0.4 || Math.abs(bty - by) > 0.4))
      ) {
        needsDraw = true;
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
        brTarget = Math.min(W, H) * 0.38;
        hoverCb.current?.(true);
      }
    };
    const onPointerLeave = () => {
      hovering = false;
      brTarget = 0;
      hoverCb.current?.(false);
    };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerdown", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("pointercancel", onPointerLeave, { passive: true });

    const ro = new ResizeObserver(layout);
    ro.observe(wrap);

    const image = new Image();
    image.src = src;
    image.decode().then(() => {
      if (destroyed) return;
      // crop to the figure's alpha bounding box (the PNG carries wide
      // transparent margins) — scanned once at low res
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
          if (pd[(y * scanW + x) * 4 + 3] > 24) {
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
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerLeave);
    };
  }, [src]);

  return (
    <div className="aboutPage__portrait" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="aboutPage__portraitCanvas"
        aria-label="ASCII portrait of Aayush Raj"
        role="img"
      />
    </div>
  );
}
