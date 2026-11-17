# The Descent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-scroll `/playground` sphere with a scroll-driven 3D descent — ridge, chasm, lava forge — that reveals 8 project cards along the way and assembles them into one constellation at the bottom.

**Architecture:** One `<Canvas>` fixed behind a tall DOM column. Scroll produces a single damped `0..1` progress value held in a ref; camera, fog, lights and card positions are pure functions of it. All geometry is generated in code. Every piece of math that makes the journey work lives in a pure module with unit tests, so the untestable part is only the pixels.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, `@react-three/fiber` 9, `@react-three/drei` 10, `three` 0.186, `node:test` for unit tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-descent-experiments-page-design.md`

## Global Constraints

- **No new npm dependencies.** Not GSAP, not Lenis, not a noise library. Anything needed is written or already present.
- **No new binary assets.** All geometry generated in code. Reuse the posters and videos already in `/public/playground`.
- **Budget: under 60 KB gzipped of new JS** for the `/playground` route. Measured at the end of Tasks 6, 8 and 10.
- **Frame rate: 60fps desktop, 45+ mid-range phone.**
- **Progress never lives in React state.** It is a ref read inside `useFrame`. Nothing re-renders on scroll.
- **Native scroll only.** No scroll hijacking, no virtualised scroller.
- **The sphere is not deleted.** `components/playground/sphere/` stays in the repo, unmounted.
- **Reuse the repo's existing perf machinery:** `LoopGate` pattern from `components/test/zhu/Scene.tsx`, `hasWebGL()` from `lib/webgl.ts`, `useLowPowerMode()` from `components/about/useLowPowerMode.ts`, `compileAsync`, and the lazy-video pattern from `components/projects/case/CaseVideo.tsx`.
- **Tests run with `npm test`** (node's built-in runner, importing `.ts` directly). Follow `components/test/zhu/markGeometry.test.ts` for style.

## File Structure

| File | Responsibility |
| --- | --- |
| `components/playground/descent/progress.ts` | Pure: scroll position → damped `0..1`. No DOM, no three. |
| `components/playground/descent/path.ts` | Pure: act boundaries, camera curve, lookAt targets. |
| `components/playground/descent/quality.ts` | Pure: device signals → quality tier numbers. |
| `components/playground/descent/terrain.ts` | Pure: seeded noise → height fields for ridge and chasm. |
| `components/playground/descent/cards.ts` | Pure: the two data files → 8 ordered card descriptors with stops. |
| `components/playground/descent/useDescentScroll.ts` | Hook: wires `progress.ts` to a rAF loop and a ref. |
| `components/playground/descent/DescentPage.tsx` | Page shell: DOM column, entry gate, fallback switch. |
| `components/playground/descent/Scene.tsx` | `<Canvas>`, camera rig, LoopGate, tier plumbing. |
| `components/playground/descent/Terrain.tsx` | Ridge and chasm meshes from `terrain.ts`. |
| `components/playground/descent/Atmosphere.tsx` | Fog colour arc, cloud sea, particles. |
| `components/playground/descent/Forge.tsx` | Lava floor, emissive rivers, embers. |
| `components/playground/descent/Props.tsx` | Instanced scaffolding, pipes, lamps; the three hero objects. |
| `components/playground/descent/CardAnchors.tsx` | 3D panels; publishes screen positions. |
| `components/playground/descent/CardLayer.tsx` | DOM card overlay and the know-more panel. |
| `components/playground/descent/ChapterRail.tsx` | Act numeral and progress ticks. |
| `components/playground/descent/descent.css` | All styling for the DOM layers. |
| `components/playground/PlaygroundPageClient.tsx` | **Modify:** mount `DescentPage` instead of `PlaygroundSphere`. |
| `package.json` | **Modify:** add the descent test glob. |

The spec's file list named `useDescentScroll.ts` as one unit; it is split here into a pure `progress.ts` (testable) and the hook that drives it (not testable without a DOM). Same for `path.ts`, which keeps all its math pure so the curve can be asserted on.

---

### Task 1: Scroll progress math

**Files:**
- Create: `components/playground/descent/progress.ts`
- Create: `components/playground/descent/progress.test.ts`
- Modify: `package.json` (test glob)

**Interfaces:**
- Consumes: nothing.
- Produces: `DESCENT_SCREENS: number`, `clamp01(x: number): number`, `descentHeight(vh: number): number`, `rawProgress(scrollY: number, vh: number): number`, `damp(current: number, target: number, lambda: number, dt: number): number`.

- [ ] **Step 1: Add the test glob so new tests actually run**

In `package.json`, change the `test` script to add the third glob:

```json
"test": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test \"components/contract/**/*.test.ts\" \"components/test/zhu/**/*.test.ts\" \"components/playground/descent/**/*.test.ts\""
```

- [ ] **Step 2: Write the failing test**

Create `components/playground/descent/progress.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp01, damp, descentHeight, rawProgress, DESCENT_SCREENS } from "./progress.ts";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test("the page is 13 screens tall", () => {
  assert.equal(DESCENT_SCREENS, 13);
  assert.equal(descentHeight(800), 10400);
});

test("clamp01 pins outside the unit range", () => {
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(0.4), 0.4);
  assert.equal(clamp01(9), 1);
});

test("progress is 0 at the top and 1 at the bottom of the travel", () => {
  const vh = 800;
  const travel = descentHeight(vh) - vh;
  assert.ok(close(rawProgress(0, vh), 0));
  assert.ok(close(rawProgress(travel, vh), 1));
  assert.ok(close(rawProgress(travel / 2, vh), 0.5));
});

test("progress clamps past the ends instead of overshooting", () => {
  assert.equal(rawProgress(-200, 800), 0);
  assert.equal(rawProgress(999999, 800), 1);
});

test("progress never divides by zero on a degenerate viewport", () => {
  const p = rawProgress(100, 0);
  assert.ok(Number.isFinite(p), `got ${p}`);
});

test("damp moves toward the target without overshooting it", () => {
  let v = 0;
  for (let i = 0; i < 200; i++) v = damp(v, 1, 6, 1 / 60);
  assert.ok(v > 0.99 && v <= 1, `settled at ${v}`);
});

test("damp is frame-rate independent", () => {
  let slow = 0;
  slow = damp(slow, 1, 6, 1 / 30);

  let fast = 0;
  fast = damp(fast, 1, 6, 1 / 60);
  fast = damp(fast, 1, 6, 1 / 60);

  assert.ok(close(slow, fast, 1e-9), `30fps ${slow} vs 60fps ${fast}`);
});

test("damp with a zero delta does not move", () => {
  assert.equal(damp(0.25, 1, 6, 0), 0.25);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find module `./progress.ts`.

- [ ] **Step 4: Write the implementation**

Create `components/playground/descent/progress.ts`:

```ts
/*
  Scroll to progress, with no DOM and no three in sight so it can be tested.

  The whole journey is one number: `p` in [0, 1]. Everything downstream —
  camera, fog, cards — is a pure function of it.
*/

/* 13 screens: 3 ridge, 4 chasm, 4 forge, 2 finale. The pacing is deliberate;
   ORVAE spends 2 screens per chapter and that patience is most of why it
   reads as cinematic rather than rushed. */
export const DESCENT_SCREENS = 13;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const descentHeight = (vh: number): number => vh * DESCENT_SCREENS;

/** Where we are in the scrollable travel, 0 at the top, 1 at the bottom. */
export function rawProgress(scrollY: number, vh: number): number {
  const travel = Math.max(1, descentHeight(vh) - vh);
  return clamp01(scrollY / travel);
}

/*
  Exponential damping toward a target.

  `1 - exp(-lambda * dt)` rather than a plain lerp factor: a plain lerp is
  tied to frame rate, so the same scroll feels twice as fast at 120Hz as at
  60Hz. This form gives the same result for one 1/30s step as for two
  1/60s steps, which the test asserts.
*/
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 114 existing tests plus 8 new ones, 122 total, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add components/playground/descent/progress.ts components/playground/descent/progress.test.ts package.json
git commit -m "descent: scroll progress math"
```

---

### Task 2: The camera path

**Files:**
- Create: `components/playground/descent/path.ts`
- Create: `components/playground/descent/path.test.ts`

**Interfaces:**
- Consumes: `clamp01` from `./progress.ts`.
- Produces: `ACTS: readonly Act[]` where `Act = { id: ActId; from: number; to: number }` and `ActId = "ridge" | "chasm" | "forge" | "finale"`; `actAt(p: number): Act`; `actProgress(p: number): number`; `makeCurve(): THREE.CatmullRomCurve3`; `cameraAt(curve, p, out: THREE.Vector3): THREE.Vector3`; `lookAtAt(curve, p, out: THREE.Vector3): THREE.Vector3`.

- [ ] **Step 1: Write the failing test**

Create `components/playground/descent/path.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ACTS, actAt, actProgress, cameraAt, lookAtAt, makeCurve } from "./path.ts";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test("the acts tile the whole journey with no gaps or overlaps", () => {
  assert.equal(ACTS[0].from, 0);
  assert.equal(ACTS[ACTS.length - 1].to, 1);
  for (let i = 1; i < ACTS.length; i++) {
    assert.equal(ACTS[i].from, ACTS[i - 1].to, `gap before act ${i}`);
  }
});

test("the acts are the 3/4/4/2 screen split", () => {
  assert.deepEqual(
    ACTS.map((a) => a.id),
    ["ridge", "chasm", "forge", "finale"]
  );
  assert.ok(close(ACTS[0].to, 3 / 13));
  assert.ok(close(ACTS[1].to, 7 / 13));
  assert.ok(close(ACTS[2].to, 11 / 13));
});

test("actAt finds the act for any progress, ends included", () => {
  assert.equal(actAt(0).id, "ridge");
  assert.equal(actAt(0.1).id, "ridge");
  assert.equal(actAt(0.4).id, "chasm");
  assert.equal(actAt(0.7).id, "forge");
  assert.equal(actAt(0.95).id, "finale");
  assert.equal(actAt(1).id, "finale");
});

test("a boundary belongs to the act it opens", () => {
  assert.equal(actAt(3 / 13).id, "chasm");
  assert.equal(actAt(7 / 13).id, "forge");
});

test("actProgress runs 0 to 1 inside each act", () => {
  assert.ok(close(actProgress(0), 0));
  assert.ok(close(actProgress(3 / 13), 0));
  assert.ok(close(actProgress(1), 1));
  const mid = (3 / 13 + 7 / 13) / 2;
  assert.ok(close(actProgress(mid), 0.5));
});

test("the camera only ever goes down", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  let last = Infinity;
  for (let i = 0; i <= 200; i++) {
    const y = cameraAt(curve, i / 200, out).y;
    assert.ok(y <= last + 1e-6, `rose at p=${i / 200}: ${y} > ${last}`);
    last = y;
  }
});

test("the descent actually covers ground", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  const top = cameraAt(curve, 0, out).clone();
  const bottom = cameraAt(curve, 1, out).clone();
  assert.ok(top.y - bottom.y > 50, `only fell ${top.y - bottom.y}`);
});

test("the camera always looks somewhere other than where it is", () => {
  const curve = makeCurve();
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  for (let i = 0; i <= 50; i++) {
    const p = i / 50;
    cameraAt(curve, p, pos);
    lookAtAt(curve, p, look);
    assert.ok(pos.distanceTo(look) > 0.5, `degenerate lookAt at p=${p}`);
  }
});

test("positions are finite everywhere, including the exact ends", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  for (const p of [0, 1e-9, 0.5, 1 - 1e-9, 1]) {
    const v = cameraAt(curve, p, out);
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `NaN at ${p}`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find module `./path.ts`.

- [ ] **Step 3: Write the implementation**

Create `components/playground/descent/path.ts`:

```ts
import * as THREE from "three";
import { clamp01 } from "./progress";

export type ActId = "ridge" | "chasm" | "forge" | "finale";
export type Act = { id: ActId; from: number; to: number };

/* 3 / 4 / 4 / 2 of the 13 screens. */
export const ACTS: readonly Act[] = [
  { id: "ridge", from: 0, to: 3 / 13 },
  { id: "chasm", from: 3 / 13, to: 7 / 13 },
  { id: "forge", from: 7 / 13, to: 11 / 13 },
  { id: "finale", from: 11 / 13, to: 1 },
] as const;

/** A boundary belongs to the act it opens, so the last act owns p === 1. */
export function actAt(p: number): Act {
  const q = clamp01(p);
  for (let i = ACTS.length - 1; i >= 0; i--) {
    if (q >= ACTS[i].from) return ACTS[i];
  }
  return ACTS[0];
}

/** 0 at the start of the current act, 1 at its end. */
export function actProgress(p: number): number {
  const act = actAt(p);
  return clamp01((clamp01(p) - act.from) / (act.to - act.from));
}

/*
  The journey, as world-space control points.

  y falls the whole way — the test asserts it never rises, because a camera
  that bobs upward mid-fall breaks the one promise the page makes: scroll
  direction is world direction. The x wander is what keeps the fall from
  reading as an elevator, and the final two points pull back and up-range
  into the chamber where the cards assemble.
*/
const CONTROL_POINTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 62, 46], //  surfacing out of the cloud sea
  [0, 57, 24], //  the ridge
  [1, 54, 4], //   approaching the gate
  [0, 50, -8], //  through the gate — the fall starts
  [4, 30, -16], // chasm, first wall
  [-5, 8, -20], // past the turbine
  [3, -16, -22],
  [-3, -38, -18],
  [0, -54, -8], // the forge floor
  [0, -58, 14], // pulling back
  [0, -58, 34], // the chamber
];

export function makeCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.5
  );
}

export function cameraAt(curve: THREE.CatmullRomCurve3, p: number, out: THREE.Vector3): THREE.Vector3 {
  return curve.getPointAt(clamp01(p), out);
}

/*
  Look ahead along the curve, never at the camera's own position. Near p=1
  the lookahead would clamp onto the camera itself and the matrix would go
  NaN, so the last stretch extrapolates along the final tangent instead.
*/
const LOOKAHEAD = 0.035;
const tangent = new THREE.Vector3();

export function lookAtAt(curve: THREE.CatmullRomCurve3, p: number, out: THREE.Vector3): THREE.Vector3 {
  const q = clamp01(p);
  if (q + LOOKAHEAD <= 1) return curve.getPointAt(q + LOOKAHEAD, out);
  curve.getPointAt(1, out);
  curve.getTangentAt(1, tangent);
  return out.addScaledVector(tangent, LOOKAHEAD * curve.getLength());
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 9 new tests, 131 total, 0 failures.

If "the camera only ever goes down" fails, a control point's `y` is above its predecessor's, or Catmull-Rom is overshooting between two close points. Fix by adjusting the offending `y` in `CONTROL_POINTS`, not by loosening the test.

- [ ] **Step 5: Commit**

```bash
git add components/playground/descent/path.ts components/playground/descent/path.test.ts
git commit -m "descent: camera path and act boundaries"
```

---

### Task 3: Quality tiers

**Files:**
- Create: `components/playground/descent/quality.ts`
- Create: `components/playground/descent/quality.test.ts`

**Interfaces:**
- Consumes: `LowPowerMode` type from `components/about/useLowPowerMode.ts`.
- Produces: `Tier = { terrainSegments: number; embers: number; shafts: boolean; post: boolean; maxDpr: number; shadows: boolean }`; `tierFor(mode: LowPowerMode, portrait: boolean): Tier`.

- [ ] **Step 1: Write the failing test**

Create `components/playground/descent/quality.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tierFor } from "./quality.ts";

const high = { lowPower: false, reducedMotion: false, pointerFine: true };
const low = { lowPower: true, reducedMotion: false, pointerFine: false };

test("a low-power device gets strictly less of everything", () => {
  const a = tierFor(high, false);
  const b = tierFor(low, false);
  assert.ok(b.terrainSegments < a.terrainSegments);
  assert.ok(b.embers < a.embers);
  assert.equal(b.post, false);
  assert.equal(b.shafts, false);
  assert.equal(b.shadows, false);
});

test("low power caps the pixel ratio at 1.25", () => {
  assert.ok(tierFor(low, false).maxDpr <= 1.25);
  assert.ok(tierFor(high, false).maxDpr > 1.25);
});

test("portrait costs less than landscape on the same device", () => {
  const land = tierFor(high, false);
  const port = tierFor(high, true);
  assert.ok(port.terrainSegments <= land.terrainSegments);
  assert.ok(port.embers <= land.embers);
});

test("every tier is still drawable", () => {
  for (const mode of [high, low]) {
    for (const portrait of [false, true]) {
      const t = tierFor(mode, portrait);
      assert.ok(t.terrainSegments >= 24, `too coarse: ${t.terrainSegments}`);
      assert.ok(t.embers >= 0);
      assert.ok(t.maxDpr >= 1);
    }
  }
});

test("reduced motion does not change the tier — it bypasses the canvas entirely", () => {
  const moving = tierFor(high, false);
  const still = tierFor({ ...high, reducedMotion: true }, false);
  assert.deepEqual(still, moving);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find module `./quality.ts`.

- [ ] **Step 3: Write the implementation**

Create `components/playground/descent/quality.ts`:

```ts
import type { LowPowerMode } from "@/components/about/useLowPowerMode";

export type Tier = {
  /** segments per side of each terrain plane */
  terrainSegments: number;
  /** ember particle count in the forge */
  embers: number;
  /** volumetric light shafts through the chasm */
  shafts: boolean;
  /** grain + vignette pass */
  post: boolean;
  maxDpr: number;
  shadows: boolean;
};

const HIGH: Tier = {
  terrainSegments: 128,
  embers: 1400,
  shafts: true,
  post: true,
  maxDpr: 1.75,
  shadows: true,
};

const LOW: Tier = {
  terrainSegments: 48,
  embers: 300,
  shafts: false,
  post: false,
  maxDpr: 1.25,
  shadows: false,
};

/*
  Reduced motion is deliberately not a tier. A frozen 3D scene is still a
  3D scene, and someone who asked for less motion does not want a camera
  flown at them slowly — they get the flat card list instead (DescentPage).
  The test pins that so nobody "helpfully" adds a reduced-motion tier here.
*/
export function tierFor(mode: LowPowerMode, portrait: boolean): Tier {
  const base = mode.lowPower ? LOW : HIGH;
  if (!portrait) return base;
  return {
    ...base,
    terrainSegments: Math.round(base.terrainSegments * 0.7),
    embers: Math.round(base.embers * 0.55),
    shafts: false,
  };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 5 new tests, 136 total, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add components/playground/descent/quality.ts components/playground/descent/quality.test.ts
git commit -m "descent: quality tiers"
```

---

### Task 4: Terrain generation

**Files:**
- Create: `components/playground/descent/terrain.ts`
- Create: `components/playground/descent/terrain.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `makeNoise2D(seed: number): (x: number, y: number) => number`; `heightField(opts: { segments: number; size: number; seed: number; amplitude: number; octaves?: number }): Float32Array`; `chasmWallOffsets(opts: { steps: number; seed: number; radius: number }): Float32Array`.

- [ ] **Step 1: Write the failing test**

Create `components/playground/descent/terrain.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chasmWallOffsets, heightField, makeNoise2D } from "./terrain.ts";

test("noise is in [-1, 1] and deterministic for a seed", () => {
  const a = makeNoise2D(7);
  const b = makeNoise2D(7);
  for (let i = 0; i < 500; i++) {
    const x = i * 0.37;
    const y = i * 0.11;
    const v = a(x, y);
    assert.ok(v >= -1 && v <= 1, `noise out of range: ${v}`);
    assert.equal(v, b(x, y), "same seed disagreed with itself");
  }
});

test("different seeds give different terrain", () => {
  const a = makeNoise2D(1);
  const b = makeNoise2D(2);
  let same = 0;
  for (let i = 0; i < 200; i++) if (a(i * 0.3, i * 0.7) === b(i * 0.3, i * 0.7)) same++;
  assert.ok(same < 20, `seeds produced ${same}/200 identical samples`);
});

test("the height field has one value per vertex", () => {
  const segments = 32;
  const h = heightField({ segments, size: 100, seed: 3, amplitude: 10 });
  assert.equal(h.length, (segments + 1) * (segments + 1));
});

test("heights stay inside the amplitude and are never NaN", () => {
  const h = heightField({ segments: 48, size: 200, seed: 9, amplitude: 14 });
  for (const v of h) {
    assert.ok(Number.isFinite(v), "NaN height");
    assert.ok(Math.abs(v) <= 14 + 1e-6, `height ${v} exceeded amplitude`);
  }
});

test("the height field is deterministic", () => {
  const o = { segments: 24, size: 80, seed: 5, amplitude: 6 };
  assert.deepEqual(Array.from(heightField(o)), Array.from(heightField(o)));
});

test("the terrain is not flat", () => {
  const h = heightField({ segments: 48, size: 200, seed: 11, amplitude: 14 });
  const min = Math.min(...h);
  const max = Math.max(...h);
  assert.ok(max - min > 2, `terrain is flat: range ${max - min}`);
});

test("chasm wall offsets are one per step and stay inside the radius", () => {
  const steps = 60;
  const radius = 18;
  const off = chasmWallOffsets({ steps, seed: 2, radius });
  assert.equal(off.length, steps);
  for (const v of off) {
    assert.ok(Number.isFinite(v));
    assert.ok(v > 0 && v <= radius, `offset ${v} outside (0, ${radius}]`);
  }
});

test("the chasm never pinches shut on the camera", () => {
  const off = chasmWallOffsets({ steps: 120, seed: 4, radius: 18 });
  for (const v of off) assert.ok(v >= 6, `wall closed to ${v}, camera would clip`);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find module `./terrain.ts`.

- [ ] **Step 3: Write the implementation**

Create `components/playground/descent/terrain.ts`:

```ts
/*
  All the geometry in this page is generated here rather than loaded.

  The reference for this page (ORVAE) ships 14.9 MB of hand-modelled glTF.
  This whole site's homepage is 1.22 MB, so that was never on the table —
  which means the landscape has to come from a function. Value noise with a
  few octaves, flat-shaded, reads as deliberate low-poly rather than as
  cheap, and costs nothing to download.
*/

/* A small integer hash — deterministic, no dependency, good enough for
   terrain. Not for anything that needs real randomness. */
function hash2(seed: number, x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  /* >>> 0 then scale to [-1, 1] */
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth value noise in [-1, 1]. */
export function makeNoise2D(seed: number): (x: number, y: number) => number {
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = fade(x - xi);
    const ty = fade(y - yi);
    const a = lerp(hash2(seed, xi, yi), hash2(seed, xi + 1, yi), tx);
    const b = lerp(hash2(seed, xi, yi + 1), hash2(seed, xi + 1, yi + 1), tx);
    return lerp(a, b, ty);
  };
}

export type HeightFieldOptions = {
  segments: number;
  size: number;
  seed: number;
  amplitude: number;
  octaves?: number;
};

/*
  One height per vertex of a (segments + 1)^2 grid.

  Octave amplitudes are normalised by their own sum, so the result is
  guaranteed to stay inside `amplitude` no matter how many octaves are
  added later. The test asserts that, because a terrain that quietly
  exceeds its amplitude is a terrain that pokes through the camera path.
*/
export function heightField(opts: HeightFieldOptions): Float32Array {
  const { segments, size, seed, amplitude, octaves = 4 } = opts;
  const noise = makeNoise2D(seed);
  const side = segments + 1;
  const out = new Float32Array(side * side);

  let norm = 0;
  for (let o = 0; o < octaves; o++) norm += 1 / 2 ** o;

  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const u = (i / segments) * size * 0.04;
      const v = (j / segments) * size * 0.04;
      let sum = 0;
      for (let o = 0; o < octaves; o++) {
        const f = 2 ** o;
        sum += noise(u * f, v * f) / f;
      }
      out[j * side + i] = (sum / norm) * amplitude;
    }
  }
  return out;
}

/*
  How far the chasm wall sits from the centre line at each step down.

  Clamped to a floor of 6 world units: the camera flies down the middle,
  and a wall that wanders inside that radius would clip straight through
  the near plane. The test pins the floor.
*/
export function chasmWallOffsets(opts: { steps: number; seed: number; radius: number }): Float32Array {
  const { steps, seed, radius } = opts;
  const noise = makeNoise2D(seed);
  const out = new Float32Array(steps);
  const FLOOR = 6;
  for (let i = 0; i < steps; i++) {
    const n = (noise(i * 0.18, 0) + 1) / 2; /* 0..1 */
    out[i] = FLOOR + n * (radius - FLOOR);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 8 new tests, 144 total, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add components/playground/descent/terrain.ts components/playground/descent/terrain.test.ts
git commit -m "descent: generated terrain"
```

---

### Task 5: The card list

**Files:**
- Create: `components/playground/descent/cards.ts`
- Create: `components/playground/descent/cards.test.ts`
- Read first: `components/playground/experiments.ts`, `components/playground/sphere/entries.ts`

**Interfaces:**
- Consumes: `EXPERIMENTS` from `components/playground/experiments.ts`, the sphere entry list from `components/playground/sphere/entries.ts`, `ACTS`/`actAt` from `./path.ts`.
- Produces: `DescentCard = { id: string; title: string; kind: string; href: string; blurb: string; poster?: string; video?: string; act: "chasm" | "forge"; stop: number }`; `descentCards(): DescentCard[]`.

- [ ] **Step 1: Read the two data files**

Before writing anything, open `components/playground/experiments.ts` and `components/playground/sphere/entries.ts` and note the exact exported names and field names. The 5 experiments are `dpl`, `cat`, `pond`, `invoice`, `contract`; the 3 extra projects in `entries.ts` are `yantra`, `mike-tyson-invitational`, `dropby`. Use the real field names from those files — do not invent them.

- [ ] **Step 2: Write the failing test**

Create `components/playground/descent/cards.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { descentCards } from "./cards.ts";
import { ACTS } from "./path.ts";

const act = (id: string) => ACTS.find((a) => a.id === id)!;

test("there are 8 cards: 5 experiments and 3 projects", () => {
  const cards = descentCards();
  assert.equal(cards.length, 8);
  assert.equal(cards.filter((c) => c.act === "chasm").length, 3);
  assert.equal(cards.filter((c) => c.act === "forge").length, 5);
});

test("every card carries the fields the overlay needs", () => {
  for (const c of descentCards()) {
    assert.ok(c.id, "missing id");
    assert.ok(c.title, `${c.id}: missing title`);
    assert.ok(c.href, `${c.id}: missing href`);
    assert.ok(c.kind, `${c.id}: missing kind`);
    assert.ok(c.blurb, `${c.id}: missing blurb`);
  }
});

test("ids are unique", () => {
  const ids = descentCards().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("stops run strictly forward down the journey", () => {
  const stops = descentCards().map((c) => c.stop);
  for (let i = 1; i < stops.length; i++) {
    assert.ok(stops[i] > stops[i - 1], `stop ${i} (${stops[i]}) not after ${stops[i - 1]}`);
  }
});

test("every stop sits inside its own act, clear of the boundaries", () => {
  for (const c of descentCards()) {
    const a = act(c.act);
    assert.ok(c.stop > a.from, `${c.id} at ${c.stop} is before ${c.act} opens`);
    assert.ok(c.stop < a.to, `${c.id} at ${c.stop} is after ${c.act} ends`);
  }
});

test("no card lands in the finale — the finale is where they all reassemble", () => {
  for (const c of descentCards()) {
    assert.ok(c.stop < act("finale").from, `${c.id} strays into the finale`);
  }
});

test("the list is stable across calls", () => {
  assert.deepEqual(descentCards(), descentCards());
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find module `./cards.ts`.

- [ ] **Step 4: Write the implementation**

Create `components/playground/descent/cards.ts`. Map from the real data files — adjust the field reads to whatever those files actually export, keeping the output shape below exactly as the test expects:

```ts
import { EXPERIMENTS } from "@/components/playground/experiments";
import { ACTS } from "./path";

export type DescentCard = {
  id: string;
  title: string;
  kind: string;
  href: string;
  blurb: string;
  poster?: string;
  video?: string;
  act: "chasm" | "forge";
  stop: number;
};

/*
  Which cards hang in the chasm and which wait in the forge.

  Order is the journey's order, not the shelf's: the three on the chasm
  walls are the ones that read at speed while the camera is falling, and
  the five in the forge are the ones worth stopping at.
*/
const CHASM_IDS = ["pond", "cat", "invoice"] as const;
const FORGE_IDS = ["dpl", "contract", "yantra", "mike-tyson-invitational", "dropby"] as const;

/* The three portfolio projects live in sphere/entries.ts rather than
   experiments.ts. Rather than importing the sphere's own shape here and
   coupling the two, their card copy is declared directly — they are a
   fixed set of three, and the case studies they link to are not going to
   be renamed by an edit to the playground data. */
const PROJECT_CARDS: Record<string, { title: string; kind: string; href: string; blurb: string; poster?: string; video?: string }> = {
  yantra: {
    title: "Yantra",
    kind: "Product design",
    href: "/work/yantra",
    blurb: "A festival platform, designed end to end.",
    poster: "/playground/yantra-live.webp",
    video: "/playground/yantra-live.mp4",
  },
  "mike-tyson-invitational": {
    title: "Mike Tyson Invitational",
    kind: "UI/UX design",
    href: "/work/mike-tyson-invitational",
    blurb: "The Iron Forge brand as a ticketing and fight-card interface.",
    poster: "/playground/mike-tyson-live.webp",
    video: "/playground/mike-tyson-live.mp4",
  },
  dropby: {
    title: "DropBy",
    kind: "Brand identity",
    href: "/work/dropby",
    blurb: "An identity built to live out in the world.",
    poster: "/playground/reel/dropby-statement.webp",
  },
};

/** Evenly spaced inside the act, inset from both boundaries. */
function stopsFor(actId: "chasm" | "forge", count: number): number[] {
  const act = ACTS.find((a) => a.id === actId)!;
  const span = act.to - act.from;
  const inset = span * 0.14;
  const usable = span - inset * 2;
  if (count === 1) return [act.from + span / 2];
  return Array.from({ length: count }, (_, i) => act.from + inset + (usable * i) / (count - 1));
}

export function descentCards(): DescentCard[] {
  const chasmStops = stopsFor("chasm", CHASM_IDS.length);
  const forgeStops = stopsFor("forge", FORGE_IDS.length);

  const fromExperiment = (id: string) => {
    const e = EXPERIMENTS.find((x) => x.id === id);
    if (!e) throw new Error(`descentCards: no experiment "${id}"`);
    return { title: e.title, kind: e.kind, href: e.href, blurb: e.blurb };
  };

  const build = (id: string, act: "chasm" | "forge", stop: number): DescentCard => {
    const base = PROJECT_CARDS[id] ?? fromExperiment(id);
    return { id, act, stop, ...base };
  };

  return [
    ...CHASM_IDS.map((id, i) => build(id, "chasm", chasmStops[i])),
    ...FORGE_IDS.map((id, i) => build(id, "forge", forgeStops[i])),
  ];
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 7 new tests, 151 total, 0 failures.

If "every card carries the fields the overlay needs" fails for an experiment, the field name read in `fromExperiment` does not match `experiments.ts`. Fix the read, not the test.

- [ ] **Step 6: Commit**

```bash
git add components/playground/descent/cards.ts components/playground/descent/cards.test.ts
git commit -m "descent: card list and stops"
```

---

### Task 6: The flat page — shippable with no 3D at all

This task replaces the sphere with a working, accessible, fully styled page. No canvas yet. If the project stopped here, `/playground` would still be a better page than a broken one, and this is the exact markup the no-WebGL, reduced-motion and no-JS visitors get forever.

**Files:**
- Create: `components/playground/descent/DescentPage.tsx`
- Create: `components/playground/descent/descent.css`
- Modify: `components/playground/PlaygroundPageClient.tsx`

**Interfaces:**
- Consumes: `descentCards()` from `./cards.ts`, `DESCENT_SCREENS` from `./progress.ts`.
- Produces: `DescentPage` (default export).

- [ ] **Step 1: Write the page**

Create `components/playground/descent/DescentPage.tsx`:

```tsx
"use client";

import { descentCards } from "./cards";
import "./descent.css";

/*
  The DOM half of the descent, and the whole page until Task 7 adds the
  canvas behind it.

  This markup is not a fallback bolted on afterwards — it is the page.
  The canvas is decorative and `aria-hidden`; everything a reader, a
  crawler or a keyboard needs is here, in order, as real links.
*/
export default function DescentPage() {
  const cards = descentCards();

  return (
    <div className="descent">
      <header className="descent__intro">
        <p className="descent__eyebrow">Experiments</p>
        <h1 className="descent__title">The Descent</h1>
        <p className="descent__lede">
          Unbriefed work — interface toys, canvas sketches, a browser game and
          three projects that went all the way.
        </p>
      </header>

      <ol className="descent__list">
        {cards.map((c) => (
          <li className="descent__item" key={c.id}>
            <a className="descent__card" href={c.href}>
              {c.poster ? (
                <img className="descent__poster" src={c.poster} alt="" width={640} height={400} loading="lazy" />
              ) : null}
              <span className="descent__kind">{c.kind}</span>
              <span className="descent__cardTitle">{c.title}</span>
              <span className="descent__blurb">{c.blurb}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `components/playground/descent/descent.css`. Use the site's existing tokens where they exist; these are the page's own:

```css
/*
  The descent's DOM layer. Act colours are declared here as tokens so the
  canvas (Task 7) and the DOM read from one palette: Piltover gold at the
  top, Zaun green and violet through the middle, ember orange at the floor.
*/
.descent {
  --dsc-gold: #e7b55c;
  --dsc-sky: #9ec6e8;
  --dsc-green: #5ff0b0;
  --dsc-violet: #7c3aed;
  --dsc-ember: #ff7a2f;
  --dsc-ink: #f2ece1;
  --dsc-bg: #0b0a12;

  position: relative;
  background: linear-gradient(180deg, #141326 0%, #0f1a18 48%, #1b0d08 100%);
  color: var(--dsc-ink);
  min-height: 100svh;
  padding: clamp(80px, 12vh, 160px) var(--page-content-inset) 20vh;
}

.descent__eyebrow {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--dsc-gold);
}

.descent__title {
  margin: 0 0 18px;
  font-size: clamp(44px, 8vw, 110px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.descent__lede {
  margin: 0;
  max-width: 46ch;
  font-size: clamp(15px, 1.2vw, 18px);
  line-height: 1.6;
  color: rgba(242, 236, 225, 0.72);
}

.descent__list {
  list-style: none;
  margin: clamp(48px, 10vh, 120px) 0 0;
  padding: 0;
  display: grid;
  gap: clamp(14px, 2vw, 26px);
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
}

.descent__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: clamp(14px, 1.6vw, 22px);
  border: 1px solid rgba(231, 181, 92, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.3s ease, transform 0.3s ease, background 0.3s ease;
}

.descent__card:hover,
.descent__card:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(231, 181, 92, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.descent__poster {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 10px;
}

.descent__kind {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--dsc-green);
}

.descent__cardTitle {
  font-size: clamp(17px, 1.5vw, 21px);
  font-weight: 600;
}

.descent__blurb {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(242, 236, 225, 0.66);
  text-wrap: pretty;
}
```

- [ ] **Step 3: Mount it**

In `components/playground/PlaygroundPageClient.tsx`, swap the import and the mounted component, and update the file's comment so it stops describing the sphere:

```tsx
"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import DescentPage from "./descent/DescentPage";

/*
  /playground shell: the site's nav, mobile nav and cursor around the
  descent (descent/DescentPage.tsx).

  The earlier rig-card shelf (ExperimentShelf + playground.css) and the
  playground sphere (sphere/PlaygroundSphere.tsx) are no longer mounted
  but are left in place.
*/
export default function PlaygroundPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <main>
        <DescentPage />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no TypeScript output, 151 tests pass.

- [ ] **Step 5: Verify the page in the browser**

Start the dev server with the `preview_start` tool (config name `portfolio-dev`), then:

Run: `curl -s -o /dev/null -w '%{http_code}\n' --max-time 120 http://localhost:3000/playground`
Expected: `200`

Then in the browser tool, navigate to `http://localhost:3000/playground` and evaluate:

```js
JSON.stringify({
  cards: document.querySelectorAll('.descent__card').length,
  hrefs: [...document.querySelectorAll('.descent__card')].every(a => a.getAttribute('href')),
  h1: document.querySelector('h1')?.textContent,
  sphere: document.querySelectorAll('canvas').length,
})
```

Expected: `cards: 8`, `hrefs: true`, `h1: "The Descent"`, `sphere: 0`.

Read console messages in a **fresh tab** (an existing tab's console buffer carries stale errors from earlier servers) and confirm no errors.

- [x] **Step 6: Measure the budget baseline**

Next 16.2.10 no longer prints a "First Load JS" column, and there is no
`app-build-manifest.json` to read, so the budget is measured as bytes the
browser actually downloads from a production build. That is also directly
comparable to the 1.13 MB of JS measured on ORVAE.

1. Stop the dev server (`next build` and `next dev` fight over `.next`).
2. `npm run build`
3. `preview_start` the `portfolio-prod` config (added to `.claude/launch.json`).
4. Load `/playground` and evaluate:

```js
const r = performance.getEntriesByType('resource');
const js = r.filter(x => /\.js(\?|$)/.test(x.name));
const sum = a => a.reduce((t, x) => t + (x.encodedBodySize || 0), 0);
JSON.stringify({ scripts: js.length, jsKB: +(sum(js) / 1024).toFixed(1), allKB: +(sum(r) / 1024).toFixed(1) });
```

**Measured baseline, 2026-11-18: 327.5 KB of JS across 13 scripts; 670.9 KB
total page weight.** Tasks 8 and 10 compare against this; the budget allows
growth of 60 KB, so **JS must stay under 387.5 KB**.

- [ ] **Step 7: Commit**

```bash
git add components/playground/descent/DescentPage.tsx components/playground/descent/descent.css components/playground/PlaygroundPageClient.tsx
git commit -m "descent: the flat page, replacing the sphere"
```

---

### Task 7: The skeleton — canvas, camera, terrain, fog

The first 3D task. Prove the journey is smooth before anything is built on it.

**Files:**
- Create: `components/playground/descent/Scene.tsx`
- Create: `components/playground/descent/Terrain.tsx`
- Create: `components/playground/descent/Atmosphere.tsx`
- Create: `components/playground/descent/useDescentScroll.ts`
- Modify: `components/playground/descent/DescentPage.tsx`
- Modify: `components/playground/descent/descent.css`
- Read first: `components/test/zhu/Scene.tsx` (for `LoopGate`), `components/test/zhu/ZhuHero.tsx`

**Interfaces:**
- Consumes: `rawProgress`, `damp`, `DESCENT_SCREENS` from `./progress.ts`; `makeCurve`, `cameraAt`, `lookAtAt`, `actAt` from `./path.ts`; `tierFor` from `./quality.ts`; `heightField` from `./terrain.ts`; `hasWebGL` from `@/lib/webgl`; `useLowPowerMode` from `@/components/about/useLowPowerMode`.
- Produces: `useDescentScroll(): React.MutableRefObject<{ p: number }>`; `DescentScene` (default export of `Scene.tsx`, props `{ progress: React.MutableRefObject<{ p: number }>; tier: Tier }`).

- [ ] **Step 1: Read the existing LoopGate**

Open `components/test/zhu/Scene.tsx` and read `LoopGate` and `ReadyGate`. They stop the render loop when the canvas is off screen — the audit's F1 fix, the single biggest win on the homepage hero. Copy the approach rather than inventing a new one.

- [ ] **Step 2: Write the scroll hook**

Create `components/playground/descent/useDescentScroll.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import { damp, rawProgress } from "./progress";

export type DescentProgress = { p: number };

/*
  Scroll to a damped progress value, in a ref.

  Deliberately not React state: this updates every frame, and a setState
  per frame would re-render the whole page sixty times a second. The scene
  reads `.p` inside useFrame; nothing above it ever re-renders.
*/
export function useDescentScroll() {
  const ref = useRef<DescentProgress>({ p: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let target = rawProgress(window.scrollY, window.innerHeight);
    ref.current.p = target;

    const onScroll = () => {
      target = rawProgress(window.scrollY, window.innerHeight);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ref.current.p = damp(ref.current.p, target, 7, dt);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}
```

- [ ] **Step 3: Write the terrain mesh**

Create `components/playground/descent/Terrain.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { heightField } from "./terrain";

/*
  The ridge at the top and the chasm walls below it, both displaced from
  generated height fields. Flat shading is doing the art direction: a
  faceted surface reads as a deliberate low-poly style rather than as a
  smooth surface that failed.
*/
function displaced(segments: number, size: number, seed: number, amplitude: number) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const h = heightField({ segments, size, seed, amplitude });
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, h[i]);
  geo.computeVertexNormals();
  return geo;
}

export default function Terrain({ segments }: { segments: number }) {
  const ridge = useMemo(() => displaced(segments, 240, 11, 16), [segments]);
  const floor = useMemo(() => displaced(segments, 200, 23, 9), [segments]);

  return (
    <group>
      <mesh geometry={ridge} rotation={[-Math.PI / 2, 0, 0]} position={[0, 40, 0]}>
        <meshStandardMaterial color="#6b6075" flatShading roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -64, 0]}>
        <meshStandardMaterial color="#2b1410" flatShading roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 4: Write the atmosphere**

Create `components/playground/descent/Atmosphere.tsx`:

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { DescentProgress } from "./useDescentScroll";

/*
  Fog is the main instrument on this page. It hides draw distance, it
  separates the layers, and it carries the whole colour arc — Piltover
  gold, Zaun green, then ember — so the acts read even before any of their
  geometry is recognisable.
*/
const STOPS: Array<[number, string]> = [
  [0, "#cdbb92"],
  [0.23, "#8fa0a8"],
  [0.45, "#2f5f52"],
  [0.62, "#2a1b44"],
  [0.85, "#4a1a0e"],
  [1, "#2a0d06"],
];

const a = new THREE.Color();
const b = new THREE.Color();

export function fogColorAt(p: number, out: THREE.Color): THREE.Color {
  let i = 0;
  while (i < STOPS.length - 2 && p > STOPS[i + 1][0]) i++;
  const [p0, c0] = STOPS[i];
  const [p1, c1] = STOPS[i + 1];
  const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
  a.set(c0);
  b.set(c1);
  return out.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
}

export default function Atmosphere({ progress }: { progress: React.MutableRefObject<DescentProgress> }) {
  const { scene } = useThree();
  const fog = useRef(new THREE.Fog("#cdbb92", 20, 170));
  const key = useRef(new THREE.Color());

  if (scene.fog !== fog.current) scene.fog = fog.current;

  useFrame(() => {
    const p = progress.current.p;
    fogColorAt(p, key.current);
    fog.current.color.copy(key.current);
    scene.background = key.current.clone();
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 60, 30]} intensity={1.4} color="#ffd79a" />
      <directionalLight position={[-16, -30, -10]} intensity={0.7} color="#4affc0" />
    </>
  );
}
```

- [ ] **Step 5: Write the scene**

Create `components/playground/descent/Scene.tsx`:

```tsx
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import Terrain from "./Terrain";
import { cameraAt, lookAtAt, makeCurve } from "./path";
import type { Tier } from "./quality";
import type { DescentProgress } from "./useDescentScroll";

/*
  The render loop runs only while the canvas is on screen.

  Copied from components/test/zhu/Scene.tsx, where the perf audit measured
  this as the single biggest saving on the site: without it, a canvas keeps
  issuing draw calls for the whole visit no matter where the reader is.
*/
function LoopGate({ el }: { el: HTMLElement | null }) {
  const { invalidate, setFrameloop } = useThree() as unknown as {
    invalidate: () => void;
    setFrameloop: (m: "always" | "never" | "demand") => void;
  };

  useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        setFrameloop(e.isIntersecting ? "always" : "never");
        if (e.isIntersecting) invalidate();
      },
      { rootMargin: "120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, invalidate, setFrameloop]);

  return null;
}

function Rig({ progress }: { progress: React.MutableRefObject<DescentProgress> }) {
  const curve = useMemo(() => makeCurve(), []);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const p = progress.current.p;
    cameraAt(curve, p, pos.current);
    lookAtAt(curve, p, look.current);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}

export default function DescentScene({
  progress,
  tier,
}: {
  progress: React.MutableRefObject<DescentProgress>;
  tier: Tier;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  return (
    <div className="descent__canvas" ref={setHost} aria-hidden>
      <Canvas
        dpr={[1, tier.maxDpr]}
        camera={{ fov: 52, near: 0.5, far: 400 }}
        gl={{ antialias: !tier.post, powerPreference: "high-performance" }}
      >
        <LoopGate el={host} />
        <Rig progress={progress} />
        <Atmosphere progress={progress} />
        <Terrain segments={tier.terrainSegments} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 6: Mount the canvas behind the DOM column**

In `DescentPage.tsx`, add the canvas behind the content, the tall spacer that creates the scroll, and the three gates that send people to the flat version. Replace the component body with:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLowPowerMode } from "@/components/about/useLowPowerMode";
import { hasWebGL } from "@/lib/webgl";
import { descentCards } from "./cards";
import { DESCENT_SCREENS } from "./progress";
import { tierFor } from "./quality";
import { useDescentScroll } from "./useDescentScroll";
import "./descent.css";

/* The scene is the heavy half: keep it out of the page's first load so
   the flat version costs nothing extra to the people who only get that. */
const DescentScene = dynamic(() => import("./Scene"), { ssr: false });

export default function DescentPage() {
  const cards = descentCards();
  const mode = useLowPowerMode();
  const progress = useDescentScroll();
  const [portrait, setPortrait] = useState(false);
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    setPortrait(window.innerHeight > window.innerWidth);
    /* reduced motion and absent WebGL both stay on the flat page */
    setImmersive(!mode.reducedMotion && hasWebGL());
  }, [mode.reducedMotion]);

  const tier = tierFor(mode, portrait);

  return (
    <div className={`descent ${immersive ? "descent--3d" : ""}`}>
      {immersive ? <DescentScene progress={progress} tier={tier} /> : null}

      {/* …the existing header and <ol> from Task 6, unchanged… */}

      {immersive ? (
        <div className="descent__spacer" style={{ height: `${DESCENT_SCREENS * 100}svh` }} aria-hidden />
      ) : null}
    </div>
  );
}
```

Keep the `<header>` and `<ol>` markup from Task 6 exactly as it is. In immersive mode they will be repositioned by CSS in Task 8; for now they simply sit over the canvas.

- [ ] **Step 7: Add the canvas styles**

Append to `descent.css`:

```css
.descent__canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.descent__canvas canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.descent--3d {
  background: #0b0a12;
}

/* in immersive mode the DOM column sits above the scene */
.descent--3d .descent__intro,
.descent--3d .descent__list {
  position: relative;
  z-index: 1;
}

.descent__spacer {
  pointer-events: none;
}
```

- [ ] **Step 8: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no TypeScript output, 151 tests pass.

- [ ] **Step 9: Verify in the browser**

Start the dev server and open `/playground` in a **fresh tab**. Evaluate:

```js
JSON.stringify({
  canvas: document.querySelectorAll('canvas').length,
  scrollScreens: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
  cards: document.querySelectorAll('.descent__card').length,
})
```

Expected: `canvas: 1`, `scrollScreens` ≈ 13–14, `cards: 8`.

Then scroll to roughly 25%, 55% and 90% of the page and take a screenshot at each. The scene paints slowly in the browser pane, so wait several seconds before each capture and retry rather than concluding it is broken. Confirm: the camera is lower at each stop, and the fog has shifted gold → green → ember.

Check console errors in that fresh tab: expected none.

- [ ] **Step 10: Show the owner**

Send the three screenshots. This is the first point where the look is real, and the spec records that visual verification needs the owner's eyes. Ask specifically whether the fall reads as a fall.

- [ ] **Step 11: Commit**

```bash
git add components/playground/descent/
git commit -m "descent: camera path, terrain and fog arc"
```

---

### Task 8: The cards in the world

**Files:**
- Create: `components/playground/descent/CardAnchors.tsx`
- Create: `components/playground/descent/CardLayer.tsx`
- Modify: `components/playground/descent/Scene.tsx`, `DescentPage.tsx`, `descent.css`
- Read first: `components/projects/case/CaseVideo.tsx`

**Interfaces:**
- Consumes: `descentCards()`, `DescentCard` from `./cards.ts`; `makeCurve`, `cameraAt` from `./path.ts`.
- Produces: `anchorPositions(curve, card): THREE.Vector3` (exported from `CardAnchors.tsx` for reuse by the finale); `CardLayer` (default export, props `{ progress; screens: React.MutableRefObject<Map<string, { x: number; y: number; z: number }>> }`).

- [ ] **Step 1: Place a 3D panel per card**

Create `components/playground/descent/CardAnchors.tsx`. Each card gets a beveled panel offset from the camera path at its own `stop`, alternating left and right so the fall has rhythm. Each frame, project the panel's world position to normalised screen space and write it into the shared `screens` map — one `Map` write per card per frame, no React state:

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { descentCards, type DescentCard } from "./cards";
import { cameraAt, makeCurve } from "./path";
import type { DescentProgress } from "./useDescentScroll";

export type ScreenMap = Map<string, { x: number; y: number; z: number }>;

/** A panel sits beside the path at its stop, alternating side. */
export function anchorPosition(curve: THREE.CatmullRomCurve3, card: DescentCard, i: number): THREE.Vector3 {
  const base = cameraAt(curve, card.stop, new THREE.Vector3());
  const side = i % 2 === 0 ? -1 : 1;
  return base.add(new THREE.Vector3(side * 7.5, 1.5, -3));
}

export default function CardAnchors({
  progress,
  screens,
}: {
  progress: React.MutableRefObject<DescentProgress>;
  screens: React.MutableRefObject<ScreenMap>;
}) {
  const { camera, size } = useThree();
  const curve = useMemo(() => makeCurve(), []);
  const cards = useMemo(() => descentCards(), []);
  const anchors = useMemo(() => cards.map((c, i) => anchorPosition(curve, c, i)), [cards, curve]);
  const v = useRef(new THREE.Vector3());

  useFrame(() => {
    for (let i = 0; i < cards.length; i++) {
      v.current.copy(anchors[i]).project(camera);
      screens.current.set(cards[i].id, {
        x: (v.current.x * 0.5 + 0.5) * size.width,
        y: (-v.current.y * 0.5 + 0.5) * size.height,
        /* z > 1 means behind the camera — the overlay hides those */
        z: v.current.z,
      });
    }
  });

  return (
    <group>
      {cards.map((c, i) => (
        <mesh key={c.id} position={anchors[i]}>
          <boxGeometry args={[6, 3.8, 0.25]} />
          <meshStandardMaterial
            color="#13121c"
            emissive={c.act === "chasm" ? "#5ff0b0" : "#ff7a2f"}
            emissiveIntensity={0.45}
            flatShading
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Write the DOM overlay**

Create `components/playground/descent/CardLayer.tsx`. One `position: fixed` layer; each card is transformed to its projected point each frame by a rAF loop reading the same map. Only the nearest card plays its video — the rule from the spec, and the same discipline as `CaseVideo.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { descentCards } from "./cards";
import type { ScreenMap } from "./CardAnchors";

export default function CardLayer({ screens }: { screens: React.MutableRefObject<ScreenMap> }) {
  const cards = descentCards();
  const refs = useRef(new Map<string, HTMLLIElement>());
  const [open, setOpen] = useState<string | null>(null);
  const [nearest, setNearest] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      let bestId: string | null = null;
      let bestZ = Infinity;

      for (const [id, el] of refs.current) {
        const s = screens.current.get(id);
        if (!s) continue;
        const visible = s.z < 1;
        el.style.opacity = visible ? "1" : "0";
        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%)`;
        el.style.pointerEvents = visible ? "auto" : "none";
        if (visible && s.z < bestZ) {
          bestZ = s.z;
          bestId = id;
        }
      }

      setNearest((prev) => (prev === bestId ? prev : bestId));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screens]);

  return (
    <ul className="descent__layer">
      {cards.map((c) => (
        <li
          className="descent__float"
          key={c.id}
          ref={(el) => {
            if (el) refs.current.set(c.id, el);
            else refs.current.delete(c.id);
          }}
        >
          {c.video && nearest === c.id ? (
            <video className="descent__media" src={c.video} poster={c.poster} muted loop playsInline autoPlay />
          ) : c.poster ? (
            <img className="descent__media" src={c.poster} alt="" loading="lazy" />
          ) : null}
          <span className="descent__kind">{c.kind}</span>
          <a className="descent__cardTitle" href={c.href}>
            {c.title}
          </a>
          <button className="descent__more" type="button" onClick={() => setOpen(open === c.id ? null : c.id)}>
            {open === c.id ? "Close" : "Know more"}
          </button>
          {open === c.id ? <p className="descent__blurb">{c.blurb}</p> : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Wire both into the page**

In `Scene.tsx`, accept a `screens` ref prop and render `<CardAnchors progress={progress} screens={screens} />` inside the `<Canvas>`. In `DescentPage.tsx`, create the map once with `useRef<ScreenMap>(new Map())`, pass it to both `DescentScene` and `CardLayer`, and render `<CardLayer screens={screens} />` only in immersive mode — the flat `<ol>` stays as it is for everyone else.

- [ ] **Step 4: Style the overlay**

Append to `descent.css`:

```css
.descent__layer {
  position: fixed;
  inset: 0;
  z-index: 2;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

.descent__float {
  position: absolute;
  top: 0;
  left: 0;
  width: min(300px, 72vw);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(231, 181, 92, 0.3);
  border-radius: 14px;
  background: rgba(11, 10, 18, 0.72);
  backdrop-filter: blur(10px);
  opacity: 0;
  transition: opacity 0.4s ease;
  will-change: transform;
}

.descent__media {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 9px;
}

.descent__more {
  align-self: flex-start;
  padding: 6px 12px;
  font: inherit;
  font-size: 12px;
  color: var(--dsc-gold);
  background: transparent;
  border: 1px solid rgba(231, 181, 92, 0.4);
  border-radius: 999px;
  cursor: pointer;
}

/* in immersive mode the flat list is replaced by the floating layer */
.descent--3d .descent__list {
  display: none;
}

@media (orientation: portrait) {
  .descent__float {
    width: min(86vw, 360px);
  }
}
```

- [ ] **Step 5: The finale**

In `CardAnchors.tsx`, blend each anchor toward a constellation position once `p` passes the finale boundary (`ACTS[3].from`, 11/13). Compute the constellation as a ring in front of the final camera position, and lerp with `actProgress(p)` so the cards fly in as the finale opens:

```tsx
/* inside useFrame, before projecting */
const p = progress.current.p;
if (p >= ACTS[3].from) {
  const t = actProgress(p);
  const ring = finalePosition(i, cards.length); /* precomputed ring, see below */
  anchors[i].lerpVectors(restPositions[i], ring, t);
}
```

with, at module level:

```tsx
/* a ring in the chamber, facing the camera's final position */
function finalePosition(i: number, n: number): THREE.Vector3 {
  const a = (i / n) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * 13, -52 + Math.sin(a) * 7, 10);
}
```

Keep `restPositions` as the untouched array from Step 1 so the lerp always starts from the same place rather than compounding.

- [ ] **Step 6: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: clean, 151 tests pass.

- [ ] **Step 7: Verify in the browser**

In a fresh tab at `/playground`, scroll to roughly 35% and evaluate:

```js
const f = [...document.querySelectorAll('.descent__float')];
JSON.stringify({
  floats: f.length,
  visible: f.filter(e => getComputedStyle(e).opacity === '1').length,
  videos: document.querySelectorAll('.descent__float video').length,
  positioned: f.some(e => e.style.transform.includes('translate3d')),
})
```

Expected: `floats: 8`, `visible` between 1 and 3, **`videos: 1` at most** (the nearest-card rule — more than one is a bug), `positioned: true`.

Scroll to 95% and screenshot: all 8 cards should be arranged in the ring.

- [ ] **Step 8: Measure the budget**

Stop the dev server, then run `npm run build` and compare the `/playground` First Load JS against the Task 6 baseline. Expected: **under 60 KB of growth**. If it is over, say so rather than continuing — the budget is a constraint, not an aspiration.

- [ ] **Step 9: Commit**

```bash
git add components/playground/descent/
git commit -m "descent: project cards and the finale assembly"
```

---

### Task 9: The art pass

**Files:**
- Create: `components/playground/descent/Forge.tsx`
- Create: `components/playground/descent/Props.tsx`
- Create: `components/playground/descent/ChapterRail.tsx`
- Modify: `Scene.tsx`, `DescentPage.tsx`, `descent.css`

**Interfaces:**
- Consumes: `chasmWallOffsets` from `./terrain.ts`; `ACTS`, `actAt`, `actProgress` from `./path.ts`; `Tier` from `./quality.ts`.
- Produces: `Forge` (default export, props `{ tier: Tier; progress }`), `Props` (default export, props `{ tier: Tier }`), `ChapterRail` (default export, props `{ progress }`).

- [ ] **Step 1: The forge**

`Forge.tsx`: a dark floor plane at `y = -64` with emissive rivers, and `tier.embers` ember particles as a single `<points>` drifting upward. Animate the embers by writing into the position attribute inside `useFrame` and setting `needsUpdate` — one buffer, no per-particle objects. Rivers are emissive strips with `emissiveIntensity` pulsing slowly on `Math.sin(clock.elapsedTime)`.

- [ ] **Step 2: The props**

`Props.tsx`: one `<instancedMesh>` for scaffolding beams and one for lamps, placed down the chasm using `chasmWallOffsets({ steps: 60, seed: 4, radius: 18 })` so they hug the walls the terrain already defines. Set each instance's matrix once in a `useLayoutEffect` — never per frame. Lamps are small emissive spheres in Zaun green.

Add the three hero objects, each a handful of primitives:
- **The gate** at the ridge (`y ≈ 50`): two tall boxes and a torus arch, gold emissive edges.
- **The turbine** in the chasm (`y ≈ 10`): a large torus plus radial boxes, rotating slowly.
- **The core** above the lava (`y ≈ -50`): an icosahedron with high emissive intensity and a slow pulse.

- [ ] **Step 3: The chapter rail**

`ChapterRail.tsx`: a fixed element on the right edge showing the act numeral (I–IV) and a tick per act, filling with `actProgress`. It reads progress from the same ref in a rAF loop and writes `style.transform` / `textContent` directly — **no React state per frame**. On portrait it collapses to a 2px progress bar pinned to the top.

- [ ] **Step 4: Typecheck, test, verify**

Run: `npx tsc --noEmit && npm test` — clean, 151 pass.

In the browser, screenshot at 10%, 40%, 70% and 95%. Confirm each act has its hero object visible and the rail numeral matches the act.

- [ ] **Step 5: Show the owner and commit**

Send the four screenshots before committing; this is the task where the look either lands or does not.

```bash
git add components/playground/descent/
git commit -m "descent: forge, props, hero objects and the chapter rail"
```

---

### Task 10: Hardening

**Files:**
- Modify: `DescentPage.tsx`, `Scene.tsx`, `descent.css`, `app/playground/page.tsx`

- [ ] **Step 1: The entry gate**

In `DescentPage.tsx`, hold the canvas behind a curtain until the visitor clicks. The curtain is a real `<button>` reading "Enter the descent", with a second, quieter button that opts into the flat version. Only on the first click does `immersive` become true. This hides the load and is where shaders get compiled.

- [ ] **Step 2: Compile shaders before the first frame**

In `Scene.tsx`, before revealing the canvas, call three's `compileAsync` on the scene and camera, and keep the curtain up until it resolves. This is the audit's F2 fix: without it the first render compiles every program on the main thread and freezes the page. Read `components/test/zhu/Mark.tsx` for the existing usage.

- [ ] **Step 3: Confirm every fallback path**

Verify all four by hand in a fresh tab:

| Path | How to force it | Expected |
| --- | --- | --- |
| Reduced motion | `resize_window` with the browser tool, or OS setting | flat `<ol>`, no `<canvas>` |
| No WebGL | temporarily `return false` from `hasWebGL()` | flat `<ol>`, no `<canvas>` |
| No JS | `curl -s http://localhost:3000/playground \| grep -c descent__card` | 8 |
| Low power | force `lowPower: true` in `useLowPowerMode` | canvas renders, `dpr` capped |

Undo the two temporary edits afterwards.

- [ ] **Step 4: Phone layout**

Test at 390×844 with `resize_window` (`preset: "mobile"`), reload so the device gates re-run, and confirm: cards are a full-width stack in the lower third, the rail is a hairline bar, scroll is native and smooth, and nothing overflows horizontally.

- [ ] **Step 5: Final budget and frame rate**

Stop the dev server, run `npm run build`, and record the `/playground` First Load JS against the Task 6 baseline. **Under 60 KB of growth or the task is not done.**

Then measure frame rate with the browser pane **displayed** (a hidden pane stops compositing and the numbers are meaningless):

```js
await new Promise(r => {
  let n = 0; const t0 = performance.now();
  const f = () => { if (++n < 120) requestAnimationFrame(f); else r(); };
  requestAnimationFrame(f);
  window.__fps = () => (n / ((performance.now() - t0) / 1000)).toFixed(1);
});
window.__fps()
```

Record the number. Desktop target is 60.

- [ ] **Step 6: Hand the phone test to the owner**

Phone frame rates cannot be measured from here. Ask the owner to open the page on a real phone and report whether the fall is smooth, and state plainly that this number is unverified until they do.

- [ ] **Step 7: Update the page metadata**

In `app/playground/page.tsx`, update the `description` so it describes the descent rather than the shelf, keeping the existing `title`, `alternates` and `openGraph` structure intact.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "descent: entry gate, fallbacks and mobile hardening"
git push origin main
```

---

## Self-Review

**Spec coverage.** §4 architecture → Tasks 1, 7. §5 camera path → Task 2. §6 three acts and the finale → Tasks 2, 7, 8. §7 cards, the 3D/DOM split, the video rule, know-more → Tasks 5, 8. §8 entry gate and chapter rail → Tasks 9, 10. §9 the look → Tasks 7, 9. §10 budget → measured in Tasks 6, 8, 10. §11 perf machinery → LoopGate in Task 7, `compileAsync` in Task 10, `hasWebGL`/`useLowPowerMode` in Tasks 3, 7. §12 phone, fallbacks, accessibility → Tasks 6, 10. §13 files → the File Structure table. §14 build order → Tasks 6–10 in that order.

**Known gap, accepted:** the spec's volumetric light shafts (§9) are carried by `tier.shafts` but have no implementation step; they are the first thing to cut if Task 9 runs long, and the flag already exists to switch them off.

**Type consistency.** `DescentProgress` is `{ p: number }` throughout. `Tier` field names are identical in `quality.ts`, `Scene.tsx`, `Terrain.tsx` and `Forge.tsx`. `ScreenMap` is defined once in `CardAnchors.tsx` and imported by `CardLayer.tsx`. `DescentCard.stop` and `.act` are produced in Task 5 and consumed unchanged in Task 8. `actAt`/`actProgress`/`ACTS` keep one spelling everywhere.
