# About page perf optimization (low-end devices)

## Problem

The `/about` page runs sluggish on low-end devices — heaviest while idle on the hero
(no scrolling, no interaction) and during hover/pointer interaction with the portrait.

Root cause: two full-viewport `<canvas>` components in the hero run unthrottled
`requestAnimationFrame` loops that never stop, even after the user scrolls past the
hero and the canvases are off-screen.

- **`components/about/PixelBackground.tsx`** — every frame, it walks the full grid
  (viewport ÷ 10px cells, ~20k+ cells at common desktop sizes) against all 10 ambient
  cloud layers, running 3 Perlin-noise samples per cell per layer (`fbm`), plus a
  per-pixel spring-physics update for the magnetic cursor-ripple effect on the
  starfield. None of this is gated by visibility, tab focus, `prefers-reduced-motion`,
  or device capability.
- **`components/about/AsciiPortrait.tsx`** — every frame it redraws its entire
  luminance grid (viewport ÷ 7px cells) purely to drive a subtle per-cell flicker
  (`Math.random()` per cell, per frame). On hover it additionally redraws a second,
  4×-denser grid for the spotlight effect. Same lack of gating.

Everything else on the page is already in good shape:
- `StatusBar.tsx` batches scroll/pointer updates through a single RAF and writes
  directly to refs (no re-render).
- `Testimonials.tsx` already pauses its interval on `document.hidden` and checks
  `prefers-reduced-motion` for its exit animation; its motion is GPU-composited
  transforms via Framer Motion, not per-frame canvas redraws.
- `AnimationBudget.tsx` (mounted globally) already freezes off-screen CSS animations
  site-wide via `animation-play-state`, but this doesn't touch raw canvas RAF loops,
  which is why the two canvases above are the exception to an otherwise well-budgeted
  page.

## Goals

- Stop paying the full per-frame cost of both canvases when they're not visible
  (scrolled past, tab hidden).
- On detected low-end/low-power devices, run a visibly-lighter version of each
  effect — same general look, cheaper math — rather than only micro-optimizing the
  full-fidelity path.
- Respect `prefers-reduced-motion`, matching the convention already used in
  `Hero.tsx` (`matchMedia("(prefers-reduced-motion: reduce)")`, `matchMedia("(pointer: fine)")`).
- No visual regression on capable desktop/laptop hardware — the full-fidelity effect
  is unchanged there.

## Non-goals

- No changes to `StatusBar.tsx`, `Testimonials.tsx`, page layout, or CSS — they're
  not part of the problem.
- No move to `OffscreenCanvas`/Web Workers or a WebGL rewrite. That would genuinely
  cut main-thread cost further, but `OffscreenCanvas` support is itself spotty on
  some of the exact low-end/older devices this work targets, and it's a much larger
  architectural lift than this problem needs.
- No attempt to reproduce a specific low-end device in this environment; verification
  is via Chrome DevTools CPU throttling, not a physical device lab.

## Design

### Shared detection: `useLowPowerMode()`

New hook: `components/about/useLowPowerMode.ts`. Computed once on mount (no
polling), returns:

```ts
{
  lowPower: boolean;      // navigator.hardwareConcurrency <= 4
                          // || navigator.deviceMemory <= 4
                          // || navigator.connection?.saveData
  reducedMotion: boolean; // matchMedia("(prefers-reduced-motion: reduce)").matches
  pointerFine: boolean;   // matchMedia("(pointer: fine)").matches
}
```

Both canvases call this hook so "low-end" means the same thing in both places.
Values are read once into refs inside each component's existing setup `useEffect`
(they don't need to react live to a change mid-session — matches how `Hero.tsx`
already treats these signals as a one-time gate, not live state).

### `PixelBackground.tsx`

1. **Pause when not visible.** Wrap the canvas element in an `IntersectionObserver`
   (same idea as `AnimationBudget.tsx`'s off-screen freeze, applied here to the RAF
   loop directly since this is raw canvas, not CSS animation) and stop calling
   `requestAnimationFrame` when the hero scrolls out of view. Also pause on
   `document.visibilitychange` (`document.hidden`), matching the pattern already in
   `Testimonials.tsx`. Resume from wherever `t`/`dt` naturally continue — no need to
   reset animation state on resume.
2. **`lowPower` tier:**
   - Cloud layers: 10 → 4 (drop the smallest/most subtle ones first, keep the ones
     that define the overall shape).
   - `CELL` (grid resolution): increase so fewer cells are evaluated — this is a
     quadratic win since cost scales with `cols × rows`.
   - `dpr` cap: 1 instead of 2.
3. **`reducedMotion`:** skip the magnetic-ripple spring physics entirely (no
   per-pixel `dx/dy/vx/vy` update) — render only the static/breathing starfield and
   ambient clouds, no cursor reactivity.
4. **`!pointerFine`:** don't attach `pointermove`/`pointerleave` listeners at all —
   the ripple effect can never trigger via touch, so there's no reason to track
   pointer position or pay for the hit-testing loop on phones.

### `AsciiPortrait.tsx`

1. **Same pause treatment** as `PixelBackground` — `IntersectionObserver` +
   `document.hidden`, stop the RAF loop when off-screen or the tab isn't active.
2. **`lowPower` tier:**
   - Throttle the flicker redraw to every 3rd frame instead of every frame (the
     flicker is a slow, subtle effect — dropping to ~20fps for it is not visible,
     the current "redraw every frame" is spending 3x the necessary work for what it
     visually produces).
   - Increase `BASE_CELL` so the resting grid has fewer cells.
3. **`!pointerFine`:** skip building/maintaining the fine 2× spotlight grid
   (`lumF`/`alpF`) and its per-frame draw branch entirely — it's a hover-only
   effect, unreachable on touch, so touch devices (the common low-end case) never
   pay for it at all.

## Testing / verification

No unit tests — this is runtime rendering behavior. Verification is manual, via
Chrome DevTools:

1. Open `/about` with Performance panel recording, CPU throttled 4x, then 6x.
2. Capture ~5s idle on the hero (no interaction) before and after the change,
   compare scripting time and dropped frames.
3. Capture ~5s of scrolling from hero through the rest of the page before and
   after, confirm the canvases' RAF work drops to ~0 once they're off-screen
   (visible in the Performance panel's main-thread breakdown).
4. Manually confirm, at normal (unthrottled) speed, that the effects still look
   the same as before this change on a normal desktop viewport — no visible
   regression in cloud drift, starfield twinkle, ripple, or portrait flicker.
5. Toggle `prefers-reduced-motion` in DevTools rendering tab and confirm the
   ripple/spotlight-driven motion stops while the static starfield/portrait remain.
