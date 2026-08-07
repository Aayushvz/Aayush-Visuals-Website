# About Page Perf Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the `/about` page's two hero canvases (`PixelBackground`, `AsciiPortrait`) from burning CPU forever on low-end devices — pause them when off-screen/tab-hidden, and run a cheaper version of each effect when the device signals it's low-power or has no fine pointer.

**Architecture:** One new shared hook (`useLowPowerMode`) computes device-capability signals once per mount. Both canvas components read it and use the signals to (a) skip attaching pointer listeners / spring physics / the fine spotlight grid when there's no fine pointer or `prefers-reduced-motion` is set, (b) reduce grid resolution / cloud-layer count / redraw frequency when the device looks low-power, and (c) pause their `requestAnimationFrame` loop entirely via `IntersectionObserver` + `visibilitychange` when off-screen or the tab isn't active.

**Tech Stack:** Next.js (App Router) client components, plain Canvas 2D (no libraries), TypeScript strict mode. No test runner exists in this repo — verification is `npx tsc --noEmit` per task plus a final manual Chrome DevTools pass (matches the spec's own verification plan, which is manual for the same reason: this is runtime rendering behavior, not unit-testable logic).

## Global Constraints

- No new dependencies — implement with the browser APIs already used elsewhere in this codebase (`matchMedia`, `IntersectionObserver`, `requestAnimationFrame`).
- No visual regression on capable desktop/laptop hardware — full-fidelity path must render identically to today.
- Only `components/about/PixelBackground.tsx`, `components/about/AsciiPortrait.tsx`, and the new `components/about/useLowPowerMode.ts` are in scope. Do not touch `StatusBar.tsx`, `Testimonials.tsx`, page layout, or CSS.
- Device-capability signals (`lowPower`, `reducedMotion`, `pointerFine`) are read once per mount, not polled or reacted to live — matches the existing one-time-gate convention in `components/Hero.tsx`.
- TypeScript strict mode is on; `navigator.deviceMemory` / `navigator.connection` are non-standard and not in the `dom` lib typings, so they need an explicit narrow type cast, not `any`.

---

### Task 1: Shared `useLowPowerMode` hook

**Files:**
- Create: `components/about/useLowPowerMode.ts`

**Interfaces:**
- Produces: `useLowPowerMode(): { lowPower: boolean; reducedMotion: boolean; pointerFine: boolean }` — a hook that both `PixelBackground.tsx` (Task 2) and `AsciiPortrait.tsx` (Task 3) import and call once at the top of their component body.

- [ ] **Step 1: Create the hook file**

```ts
"use client";

import { useRef } from "react";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export type LowPowerMode = {
  lowPower: boolean;
  reducedMotion: boolean;
  pointerFine: boolean;
};

const DEFAULT_MODE: LowPowerMode = {
  lowPower: false,
  reducedMotion: false,
  pointerFine: true,
};

function readMode(): LowPowerMode {
  const nav = navigator as NavigatorWithHints;
  const lowPower =
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointerFine = window.matchMedia("(pointer: fine)").matches;
  return { lowPower, reducedMotion, pointerFine };
}

/*
  Device-capability signal shared by the About page's heavy canvases
  (PixelBackground, AsciiPortrait). Computed once per mount and cached in
  a ref — read as a one-time gate, not live state, matching how Hero.tsx
  already treats pointer/reduced-motion checks.
*/
export function useLowPowerMode(): LowPowerMode {
  const ref = useRef<LowPowerMode | null>(null);
  if (ref.current === null) {
    ref.current = typeof window === "undefined" ? DEFAULT_MODE : readMode();
  }
  return ref.current;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit code 0 (this repo has no test runner or lint config — a clean strict-mode typecheck is the available automated gate for a pure-logic file like this one; the hook's actual behavior gets exercised live once Tasks 2–3 wire it into the canvases).

- [ ] **Step 3: Commit**

```bash
git add components/about/useLowPowerMode.ts
git commit -m "$(cat <<'EOF'
Add useLowPowerMode hook for About page canvas perf gating

Computes hardwareConcurrency/deviceMemory/saveData, prefers-reduced-motion,
and pointer:fine once per mount so PixelBackground and AsciiPortrait can
agree on one definition of "low-end" instead of each doing their own checks.
EOF
)"
```

---

### Task 2: Gate `PixelBackground.tsx` behind visibility, motion, and device tier

**Files:**
- Modify: `components/about/PixelBackground.tsx` (full-file rewrite — see below)

**Interfaces:**
- Consumes: `useLowPowerMode()` from `components/about/useLowPowerMode.ts` (Task 1) — `{ lowPower, reducedMotion, pointerFine }`.
- Produces: no change to the component's external interface — still `export default function PixelBackground()`, no props, renders one `<canvas>`.

This file goes from running its `requestAnimationFrame` loop unconditionally forever to: (a) pausing via `IntersectionObserver` + `visibilitychange` when off-screen/tab-hidden, (b) using 4 cloud layers instead of 10, a 16px grid cell instead of 10px, and `dpr` capped at 1 instead of 2 when `lowPower` is true, and (c) skipping the magnetic-ripple pointer listeners and per-pixel spring physics entirely when `!pointerFine || reducedMotion` — rendering only the static/breathing starfield in that case.

- [ ] **Step 1: Replace the file's full contents**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useLowPowerMode } from "./useLowPowerMode";

/*
  Pixel Starfield + Drifting Cloud Layers Background
  -----------------------------------------------------------------------
  Combines:
    1. Static scattered pixel starfield (seeded, deterministic layout)
    2. Large drifting noise cloud layers that slowly morph and drift,
       purely ambient — not cursor-reactive
    3. Magnetic ripple hover: each nearby starfield pixel is a tiny spring
       body. The cursor repels pixels within its radius (stronger the
       closer they are), and every pixel constantly springs back toward
       its rest position with damping, so the grid visibly pushes away
       from the cursor and settles back with a soft, physical wobble once
       it leaves — instead of a static reveal/magnifying lens. Displaced
       pixels also tint toward the brand purple in proportion to how far
       they've been pushed, so the ripple reads clearly against the grey
       resting state.

  Perf gating (see useLowPowerMode): the ripple + pointer tracking is
  skipped entirely without a fine pointer or under prefers-reduced-motion
  (it can never trigger via touch anyway), the grid/cloud/dpr are scaled
  down on low-power devices, and the whole rAF loop pauses via
  IntersectionObserver + document.hidden once the hero is off-screen.
*/

// ---- Perlin noise ----
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
  return pnoise(x, y, z) * 0.5 + pnoise(x*2, y*2, z) * 0.3 + pnoise(x*4, y*4, z) * 0.2;
}

// ---- Seeded PRNG ----
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 4×4 Bayer dither threshold matrix
const BAYER = [
  [0.0625, 0.5625, 0.1875, 0.6875],
  [0.8125, 0.3125, 0.9375, 0.4375],
  [0.2500, 0.7500, 0.1250, 0.6250],
  [1.0000, 0.5000, 0.8750, 0.3750]
];

type Cloud = {
  scale: number; speedX: number; speedY: number;
  zSeed: number; cx: number; cy: number;
  radius: number; parallax: number;
  maxIntensity: number; opacity: number;
};

// magnetic ripple tuning
const RIPPLE_R = 210;
const PUSH_POWER = 1800;
const SPRING_K = 95;
const DAMPING = 0.86;
const MAX_DISPLACE = 15;

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { lowPower, reducedMotion, pointerFine } = useLowPowerMode();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rippleEnabled = pointerFine && !reducedMotion;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 2);
    const CELL = lowPower ? 16 : 10;
    const GAP = 2;
    const SQ = CELL - GAP;

    let W = 0, H = 0;
    let destroyed = false;
    let raf = 0;
    let lastT = 0;
    let running = false;
    let intersecting = false;

    // Pointer tracking
    let px = -9999, py = -9999, lpx = -9999, lpy = -9999;
    let mx = 0, my = 0, tmx = 0, tmy = 0;

    const onPointerMove = (e: PointerEvent) => {
      px = e.clientX; py = e.clientY;
      tmx = (e.clientX / window.innerWidth) - 0.5;
      tmy = (e.clientY / window.innerHeight) - 0.5;
    };
    const onPointerLeave = () => { px = -9999; py = -9999; };
    if (rippleEnabled) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    // Static starfield — each pixel is also a tiny spring body for the
    // magnetic ripple (dx/dy = current displacement, vx/vy = velocity)
    type Pixel = {
      x: number; y: number; baseOp: number; phase: number; freq: number;
      dx: number; dy: number; vx: number; vy: number;
    };
    let pixels: Pixel[] = [];

    const buildPixels = () => {
      pixels = [];
      const rng = mulberry32(0xdeadbeef);
      const clusterX = W > 900 ? W * 0.72 : W * 0.5;
      const clusterY = W > 900 ? H * 0.60 : H * 0.75;
      const clusterR = Math.min(W, H) * 0.50;
      const cluster2X = W * 0.15;
      const cluster2Y = W > 900 ? H * 0.65 : H * 0.55;
      const cluster2R = clusterR * 0.45;
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * CELL, cy = row * CELL;
          const d1 = Math.hypot(cx - clusterX, cy - clusterY);
          const d2 = Math.hypot(cx - cluster2X, cy - cluster2Y);
          const t1 = Math.max(0, 1 - d1 / clusterR);
          const t2 = Math.max(0, 1 - d2 / cluster2R);
          const prob = Math.max(0.0, t1 * t1 * 0.80, t2 * t2 * 0.45);
          if (rng() < prob) {
            const df = Math.max(t1, t2 * 0.5, 0.1);
            pixels.push({
              x: cx, y: cy,
              baseOp: Math.min(0.025 + df * 0.10 + rng() * 0.04, 0.18),
              phase: rng() * Math.PI * 2,
              freq: 0.08 + rng() * 0.25,
              dx: 0, dy: 0, vx: 0, vy: 0,
            });
          }
        }
      }
    };

    // Ambient fog layers. Full set for capable devices; a smaller,
    // still-spread-out subset on low-power ones (quadratic cost per layer).
    const ALL_CLOUDS: Cloud[] = [
      { scale: 0.003,  speedX: 0.006,  speedY: 0.004,  zSeed: 10.3, cx: 0.15, cy: 0.20, radius: 520, parallax: 6,  maxIntensity: 0.45, opacity: 0.16 },
      { scale: 0.004,  speedX: 0.009,  speedY: 0.006,  zSeed: 28.7, cx: 0.85, cy: 0.15, radius: 480, parallax: 10, maxIntensity: 0.55, opacity: 0.13 },
      { scale: 0.002,  speedX: 0.004,  speedY: 0.003,  zSeed: 45.1, cx: 0.50, cy: 0.55, radius: 600, parallax: 8,  maxIntensity: 0.35, opacity: 0.18 },
      { scale: 0.005,  speedX: 0.012,  speedY: 0.008,  zSeed: 63.4, cx: 0.08, cy: 0.80, radius: 400, parallax: 16, maxIntensity: 0.55, opacity: 0.11 },
      { scale: 0.0035, speedX: 0.008,  speedY: 0.005,  zSeed: 81.9, cx: 0.92, cy: 0.75, radius: 450, parallax: 12, maxIntensity: 0.48, opacity: 0.14 },
      { scale: 0.0045, speedX: 0.011,  speedY: 0.007,  zSeed: 33.6, cx: 0.60, cy: 0.10, radius: 420, parallax: 14, maxIntensity: 0.52, opacity: 0.12 },
      { scale: 0.0025, speedX: 0.005,  speedY: 0.004,  zSeed: 57.2, cx: 0.35, cy: 0.45, radius: 550, parallax: 7,  maxIntensity: 0.40, opacity: 0.16 },
      { scale: 0.006,  speedX: 0.015,  speedY: 0.010,  zSeed: 89.4, cx: 0.75, cy: 0.85, radius: 380, parallax: 18, maxIntensity: 0.60, opacity: 0.10 },
      { scale: 0.0028, speedX: 0.007,  speedY: 0.005,  zSeed: 14.8, cx: 0.42, cy: 0.72, radius: 500, parallax: 9,  maxIntensity: 0.42, opacity: 0.15 },
      { scale: 0.0032, speedX: 0.010,  speedY: 0.006,  zSeed: 72.1, cx: 0.68, cy: 0.38, radius: 460, parallax: 11, maxIntensity: 0.50, opacity: 0.13 },
    ];
    // Indices 0/2/4/7 keep spread across all four quadrants + center.
    const clouds = lowPower ? [ALL_CLOUDS[0], ALL_CLOUDS[2], ALL_CLOUDS[4], ALL_CLOUDS[7]] : ALL_CLOUDS;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPixels();
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Colour helpers
    const BASE_R = 200, BASE_G = 196, BASE_B = 208; // cool grey
    const HOVER_R = 167, HOVER_G = 139, HOVER_B = 250; // #A78BFA
    const BASE_FILL = `rgb(${BASE_R},${BASE_G},${BASE_B})`;

    const draw = (t: number, dt: number) => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      // Smooth pointer lerp (still used as the ripple's push origin)
      if (px < -1000) {
        lpx += (-9999 - lpx) * 0.08;
        lpy += (-9999 - lpy) * 0.08;
      } else {
        if (lpx < -1000) {
          lpx = px;
          lpy = py;
        }
        lpx += (px - lpx) * 0.08;
        lpy += (py - lpy) * 0.08;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      // 1. Draw ambient cloud layers on the grid — no cursor reactivity
      for (let gy = 0; gy < rows; gy++) {
        const cellY = gy * CELL;
        for (let gx = 0; gx < cols; gx++) {
          const cellX = gx * CELL;

          let cloudD = 0;
          let cloudOp = 0.08;

          for (const cloud of clouds) {
            const driftX = t * cloud.speedX;
            const driftY = t * cloud.speedY;
            const pmx = mx * cloud.parallax;
            const pmy = my * cloud.parallax;
            const ccx = cloud.cx * W + pmx;
            const ccy = cloud.cy * H + pmy;

            const dx = cellX - ccx;
            const dy = cellY - ccy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cloud.radius) {
              const falloff = 1 - dist / cloud.radius;
              const n = fbm(
                (cellX + pmx) * cloud.scale + driftX,
                (cellY + pmy) * cloud.scale + driftY,
                cloud.zSeed
              );
              const nv = (n + 1) * 0.5;
              const density = falloff * nv * cloud.maxIntensity;

              if (density > cloudD) {
                cloudD = density;
                cloudOp = cloud.opacity;
              }
            }
          }

          if (cloudD <= 0.01) continue;

          // Bayer dither
          if (cloudD < BAYER[gy % 4][gx % 4]) continue;

          const op = Math.min(0.30, cloudOp * (0.4 + cloudD * 0.6));
          ctx.globalAlpha = op;
          ctx.fillStyle = `rgb(${BASE_R},${BASE_G},${BASE_B})`;
          ctx.fillRect(cellX, cellY, SQ, SQ);
        }
      }

      // 2. Starfield pixels — magnetic ripple spring physics (when enabled)
      //    + breathing. Without a fine pointer / under reduced motion, the
      //    spring physics never runs and dx/dy stay 0 — only the cheap
      //    breathing-opacity term applies.
      const pushOriginActive = rippleEnabled && lpx > -1000;
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];

        if (rippleEnabled) {
          if (pushOriginActive) {
            const rdx = p.x - lpx;
            const rdy = p.y - lpy;
            const dist = Math.hypot(rdx, rdy);
            if (dist < RIPPLE_R && dist > 0.01) {
              const falloff = 1 - dist / RIPPLE_R;
              const push = falloff * falloff * PUSH_POWER * dt;
              p.vx += (rdx / dist) * push;
              p.vy += (rdy / dist) * push;
            }
          }

          p.vx += -p.dx * SPRING_K * dt;
          p.vy += -p.dy * SPRING_K * dt;
          p.vx *= DAMPING;
          p.vy *= DAMPING;
          p.dx += p.vx * dt;
          p.dy += p.vy * dt;

          const dmag0 = Math.hypot(p.dx, p.dy);
          if (dmag0 > MAX_DISPLACE) {
            const k = MAX_DISPLACE / dmag0;
            p.dx *= k;
            p.dy *= k;
          }
        }

        const sine = (Math.sin(t * p.freq + p.phase) + 1) * 0.5;
        let op = p.baseOp * (0.3 + sine * 0.7);

        if (!rippleEnabled) {
          if (op < 0.005) continue;
          ctx.globalAlpha = op;
          ctx.fillStyle = BASE_FILL;
          ctx.fillRect(p.x, p.y, SQ, SQ);
          continue;
        }

        const dmag = Math.hypot(p.dx, p.dy);
        const tint = Math.min(1, dmag / MAX_DISPLACE);
        op = Math.min(op + tint * 0.16, 0.4);
        if (op < 0.005) continue;

        const r = Math.round(BASE_R + (HOVER_R - BASE_R) * tint);
        const g = Math.round(BASE_G + (HOVER_G - BASE_G) * tint);
        const b = Math.round(BASE_B + (HOVER_B - BASE_B) * tint);

        ctx.globalAlpha = op;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(p.x + p.dx, p.y + p.dy, SQ, SQ);
      }

      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed || !running) return;
      const tSec = now / 1000;
      const dt = lastT ? Math.min(0.05, tSec - lastT) : 1 / 60;
      lastT = tSec;
      draw(tSec, dt);
      raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (running || destroyed) return;
      running = true;
      lastT = 0;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const syncRunning = () => {
      if (intersecting && !document.hidden) startLoop();
      else stopLoop();
    };

    const io = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0]?.isIntersecting ?? false;
        syncRunning();
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", syncRunning);

    return () => {
      destroyed = true;
      stopLoop();
      io.disconnect();
      document.removeEventListener("visibilitychange", syncRunning);
      window.removeEventListener("resize", resize);
      if (rippleEnabled) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [lowPower, reducedMotion, pointerFine]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit code 0

- [ ] **Step 3: Manual smoke check in the dev server**

Run: `npm run dev`, open `http://localhost:3000/about` in a normal (unthrottled) desktop browser window with a mouse.

Expected, visually compared against the page before this change:
- The starfield + drifting cloud background still renders behind the hero portrait/text.
- Moving the mouse over the hero still produces the magnetic ripple (pixels near the cursor push away and tint purple, then spring back).
- Scrolling down past the hero, then back up, doesn't show any visual glitch (canvas resumes cleanly).

- [ ] **Step 4: Commit**

```bash
git add components/about/PixelBackground.tsx
git commit -m "$(cat <<'EOF'
Gate PixelBackground's canvas loop behind visibility, motion, and device tier

The starfield/cloud canvas ran an unthrottled rAF loop forever, evaluating
Perlin noise across the full grid x 10 cloud layers every frame even after
scrolling past the hero. Now it pauses via IntersectionObserver +
document.hidden when off-screen, skips the pointer-driven ripple physics
entirely without a fine pointer or under prefers-reduced-motion (it could
never trigger via touch anyway), and runs a smaller grid/cloud count/dpr
on devices useLowPowerMode flags as low-power.
EOF
)"
```

---

### Task 3: Gate `AsciiPortrait.tsx` behind visibility, motion, and device tier

**Files:**
- Modify: `components/about/AsciiPortrait.tsx` (full-file rewrite — see below)

**Interfaces:**
- Consumes: `useLowPowerMode()` from `components/about/useLowPowerMode.ts` (Task 1) — `{ lowPower, pointerFine }` (this component has no reduced-motion-specific behavior beyond what skipping the hover path already gives it, since the ambient flicker is the same subtle motion regardless).
- Produces: no change to the component's external interface — still `export default function AsciiPortrait({ src, onHoverChange }: Props)`.

This file goes from redrawing its full grid every single frame forever to: (a) pausing via `IntersectionObserver` + `visibilitychange` when off-screen/tab-hidden, (b) a coarser grid cell (10px instead of 7px) and redrawing only every 3rd frame when `lowPower` is true, and (c) skipping the fine 2×-resolution spotlight grid's setup *and* its hover listeners entirely when `!pointerFine` — the spotlight can never trigger via touch anyway.

- [ ] **Step 1: Replace the file's full contents**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useLowPowerMode } from "./useLowPowerMode";

/*
  Living Pixel-Halftone Portrait — canvas renderer, no CSS/font fakery.
  Draws vector squares directly onto the canvas. The size and opacity of
  the squares are driven by the source image's processed luminance grid.
  
  Hover spotlight dynamically REBUILDS the portrait locally at 2× grid
  resolution and switches the color to your soft purple accent shade.
  
  Background grid covers the entire canvas, reacting seamlessly to the spotlight.

  Perf gating (see useLowPowerMode): the fine spotlight grid and its
  pointer listeners are skipped entirely without a fine pointer (hover
  can't happen via touch), the resting grid is coarser and its per-frame
  flicker redraw is throttled to every 3rd frame on low-power devices, and
  the whole rAF loop pauses via IntersectionObserver + document.hidden
  once the portrait is off-screen.
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
    // Fine spotlight stops centered around #A78BFA
    // Stop 0 (Shadow): #7561AF (117, 97, 175) -> darker version of #A78BFA
    // Stop 1 (Midtone): #a78bfa (167, 139, 250)
    // Stop 2 (Highlight): #f4f1ea (244, 241, 234)
    if (l < 0.4) {
      const t = l / 0.4;
      ({ r, g, b } = lerpColor(117, 97, 175, 167, 139, 250, t));
    } else {
      const t = (l - 0.4) / 0.6;
      ({ r, g, b } = lerpColor(167, 139, 250, 244, 241, 234, t));
    }
  }
  return `rgb(${r},${g},${b})`;
};

export default function AsciiPortrait({ src, onHoverChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverCb = useRef(onHoverChange);
  hoverCb.current = onHoverChange;
  const { lowPower, pointerFine } = useLowPowerMode();

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
    let running = false;
    let intersecting = false;
    let imageReady = false;
    let frame = 0;

    /* figure draw rect + source alpha-bbox crop */
    let ix = 0, iy = 0, iw = 0, ih = 0;
    let sxc = 0, syc = 0, swc = 0, shc = 0;

    /* two sampling grids: coarse (resting) and fine (spotlight, 2×,
       skipped entirely without a fine pointer — it can never be reached) */
    const cell = lowPower ? 10 : BASE_CELL;
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

    /* spotlight */
    let bx = 0, by = 0, btx = 0, bty = 0;
    let br = 0, brTarget = 0;
    let hovering = false;

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
        
        if (red > 235 && green > 235 && blue > 235) {
          a = 0;
        }

        alp[i] = a;
        
        let l = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        if (a > 0) {
          l = (l - 0.08) / 0.84;
          l = Math.max(0, Math.min(1, l));
          l = Math.pow(l, 0.72);
        }

        lum[i] = l * a;
      }
      return { lum, alp };
    };

    const resample = () => {
      if (!img || !W || !H) return;
      cols = Math.max(8, Math.floor(W / cell));
      rows = Math.max(8, Math.floor(H / cell));

      bgNoise = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const rand = Math.random();
        if (rand < 0.65) bgNoise[i] = 0;
        else if (rand < 0.92) bgNoise[i] = 0.06 + Math.random() * 0.08;
        else bgNoise[i] = 0.15 + Math.random() * 0.12;
      }

      ({ lum: lumC, alp: alpC } = sampleGrid(cols, rows));

      if (pointerFine) {
        colsF = cols * 2;
        rowsF = rows * 2;
        ({ lum: lumF, alp: alpF } = sampleGrid(colsF, rowsF));
      } else {
        colsF = 0;
        rowsF = 0;
        lumF = new Float32Array(0);
        alpF = new Float32Array(0);
      }
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
          const s = (H * 0.76 * 1.1) / shc;
          iw = swc * s;
          ih = shc * s;
          // figure centred in the RIGHT 45% zone — text owns the left (Figma)
          ix = inset + gridW * 0.55 + (gridW * 0.45 - iw) / 2;
          iy = H - ih;
        } else {
          // mobile: portrait fills the hero like a background — full viewport
          // width, starting just below the role/meta text so it bleeds down
          // and overlaps the name text at the bottom (Juba-style layout).
          const s = (W * 1.4) / swc;
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
      return f * f * (3 - 2 * f);
    };

    const draw = (timeMs: number) => {
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
          
          let size = c - 1.0;
          let opacity = 0;
          let colorVal = 0;

          if (alpC[i] >= 0.3) {
            // Face pixel
            colorVal = lumC[i];
            
            // Subtle pixel-level refresh/flicker (CRT scanline drift + tiny noise)
            const flicker = (Math.sin(timeMs * 0.0012 + x * 0.28 + y * 0.42) * 0.015) + (Math.random() - 0.5) * 0.012;
            
            opacity = (0.08 + colorVal * 0.72) * (1 - f);
            opacity = Math.max(0, Math.min(1, opacity + flicker));

            if (opacity < 0.01) continue;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = getPixelColor(colorVal, false);
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          }
        }
      }

      /* 2. Fine Spotlight Hover overlay (Lavender tone base palette, 2x resolution increase!) */
      if (br > 0.5 && pointerFine) {
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

            let size = cf - 0.6;
            let opacity = 0;
            let colorVal = 0;

            if (alpF[i] >= 0.3) {
              // Detailed face pixel
              colorVal = lumF[i];
              
              // Subtle pixel-level refresh/flicker
              const flicker = (Math.sin(timeMs * 0.0012 + x * 0.15 + y * 0.22) * 0.012) + (Math.random() - 0.5) * 0.008;

              opacity = (0.12 + colorVal * 0.78) * f;
              opacity = Math.max(0, Math.min(1, opacity + flicker));

              if (opacity < 0.01) continue;
              ctx.globalAlpha = opacity;
              ctx.fillStyle = getPixelColor(colorVal, true);
              ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
            }
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed || !running) return;

      const ease = 0.15;
      bx += (btx - bx) * ease;
      by += (bty - by) * ease;
      br += (brTarget - br) * ease;

      frame++;
      // Full grid redraw is only needed to drive the subtle flicker — on
      // low-power devices that's throttled to ~20fps (every 3rd rAF tick),
      // which reads identically since the flicker itself is slow and subtle.
      if (!lowPower || frame % 3 === 0) {
        draw(now);
      }

      raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (running || destroyed || !imageReady) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const syncRunning = () => {
      if (intersecting && !document.hidden && imageReady) startLoop();
      else stopLoop();
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

    if (pointerFine) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave, { passive: true });
      window.addEventListener("pointercancel", onPointerLeave, { passive: true });
    }

    const io = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0]?.isIntersecting ?? false;
        syncRunning();
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", syncRunning);

    const ro = new ResizeObserver(layout);
    ro.observe(wrap);
    layout(); // explicit initial call — ResizeObserver may not fire in StrictMode double-effect

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
      imageReady = true;
      syncRunning();
    });

    return () => {
      destroyed = true;
      stopLoop();
      io.disconnect();
      document.removeEventListener("visibilitychange", syncRunning);
      ro.disconnect();
      if (pointerFine) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerdown", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("pointercancel", onPointerLeave);
      }
    };
  }, [src, lowPower, pointerFine]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit code 0

- [ ] **Step 3: Manual smoke check in the dev server**

Run: `npm run dev` (if not already running from Task 2), open `http://localhost:3000/about` in a normal (unthrottled) desktop browser window with a mouse.

Expected, visually compared against the page before this change:
- The portrait renders in the hero, same crop/position/palette as before.
- Hovering over the portrait still triggers the fine purple spotlight that follows the cursor.
- The `StatusBar` at the bottom still flips to "ASCII ACTIVE" while hovering (confirms `onHoverChange` still fires).
- Scrolling past the hero and back doesn't show any visual glitch.

- [ ] **Step 4: Commit**

```bash
git add components/about/AsciiPortrait.tsx
git commit -m "$(cat <<'EOF'
Gate AsciiPortrait's canvas loop behind visibility, motion, and device tier

The portrait canvas redrew its entire grid every single frame forever,
purely to drive a subtle flicker, and built + redrew a second 2x-density
grid for a hover spotlight that can never be reached via touch. Now it
pauses via IntersectionObserver + document.hidden when off-screen, skips
the fine spotlight grid and its listeners entirely without a fine pointer,
and throttles the flicker redraw to every 3rd frame plus uses a coarser
resting grid on devices useLowPowerMode flags as low-power.
EOF
)"
```

---

### Task 4: Manual perf verification (Chrome DevTools CPU throttle)

**Files:** none — this task produces no code changes on its own. If a check below fails, go back and adjust the relevant constant in Task 2 or Task 3's file (e.g. push `CELL`/`cell` larger, drop another cloud layer, throttle the flicker further) and commit that follow-up fix before re-running this task's checks.

- [ ] **Step 1: Baseline recording on `main` (or `git stash` this branch's commits)**

```bash
git log --oneline -5
```

Note the commit hash immediately before Task 1's commit — this is the "before" state to compare against. You can check it out in a second worktree, or just record the "after" numbers below and compare qualitatively against how the page felt during Task 1's initial exploration (unthrottled idle-on-hero CPU usage from the continuous rAF loops was the entire premise of this plan).

- [ ] **Step 2: Idle-on-hero, throttled**

In Chrome DevTools on `http://localhost:3000/about`:
1. Performance panel → gear icon → CPU: 4x slowdown.
2. Start recording, wait 5 seconds without touching the mouse or scrolling (stay on the hero), stop recording.
3. In the summary, check "Scripting" time and look for dropped frames / long tasks in the flame chart.

Expected: scripting time during this idle window is low and mostly flat — no large blocks of continuous canvas work. (Compare against how it looked before this plan's changes, where both canvases were redrawing full grids every frame regardless of idleness.)

- [ ] **Step 3: Scroll-past-hero, throttled**

Same throttle setting. Start recording, scroll from the top of `/about` down past the Education/Experience sections and back up, stop recording.

Expected: once the hero (and its two canvases) scroll out of the viewport, their rAF work disappears from the flame chart — confirms the `IntersectionObserver` pause is working. Scrolling itself should feel smoother than before, since the canvases aren't competing for main-thread time while off-screen.

- [ ] **Step 4: `prefers-reduced-motion` check**

In DevTools → Rendering tab (Cmd/Ctrl+Shift+P → "Show Rendering") → Emulate CSS media feature `prefers-reduced-motion` → `reduce`. Reload `/about`.

Expected: the pixel background's magnetic ripple no longer follows the cursor (only the static/breathing starfield and ambient clouds remain), matching the spec's requirement. The portrait's ambient flicker is unaffected (it's not gated by reduced-motion, only by low-power/visibility, per the design).

- [ ] **Step 5: 6x throttle sanity pass**

Repeat Step 2 and Step 3 at CPU 6x slowdown (closer to a genuinely low-end device). Confirm nothing errors in the console and the page remains usable (scrolling doesn't fully freeze), even if not perfectly smooth — 6x is an aggressive floor, not a guarantee of 60fps.

- [ ] **Step 6: Record the outcome**

No commit needed unless Step 2/3/5 surfaced a problem requiring a follow-up fix (see this task's file note above). If everything checks out, this task is complete — report the before/after scripting-time comparison from Step 2 back to whoever requested this work.
