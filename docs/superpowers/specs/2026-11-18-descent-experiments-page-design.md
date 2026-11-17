# The Descent — design

**Status:** approved design, not yet planned
**Page:** `/playground` (the "Experiments" entry in the nav)
**Date:** 2026-11-18

## 1. What this is

A scroll-driven 3D journey that replaces the current `/playground` page. The
visitor falls from a mountain ridge, through a chasm, into a lava forge.
Projects reveal themselves one at a time along the way, and at the bottom all
of them assemble into one constellation.

The theme is a game world in the language of Arcane: Piltover's gold and pale
blue at the top, Zaun's toxic green and violet in the middle, ember orange at
the bottom.

## 2. Decisions already taken

These were settled before this document and are not open questions.

| Decision | Choice | Why |
| --- | --- | --- |
| The existing sphere | Replaced | The sphere (`components/playground/sphere/`, ~1,900 lines) is a no-scroll page; a scroll journey cannot be added to it. The code stays in the repo unmounted, exactly as `ExperimentShelf` was left. |
| The world | The Descent | Scroll direction equals world direction. That is what makes a scroll journey feel physical rather than like a slideshow. It also yields mountains, lava and the Piltover-to-Zaun axis in one arc. |
| Geometry source | Generated in code | ~60 KB of JS and zero asset bytes. See §9. |
| Audio | None | An ambient loop costs more bytes than the entire JS budget. Can be added later as a lazy fetch behind a toggle. |

## 3. References

The structure is the one every scroll-driven 3D site converges on, confirmed
by reading ORVAE (https://orvae.undreamstudio.com/) chapter by chapter: one
continuous world, one camera flown along a path by scroll, DOM text per beat.

Measured from ORVAE, and informing this design:

- **Pacing.** 7,680px of scroll over a 768px viewport: 10 screens for 5
  chapters, 2 full screens per chapter. Patience is most of why it reads as
  cinematic.
- **An entry gate.** Nothing renders until the visitor clicks "Enter". It
  hides the load.
- **"Know more"** expands detail in place rather than navigating away.
- **One hero object per chapter** rather than detail spread evenly.
- **A chapter rail** down the right edge as the progress indicator.
- **Its cost: 16.17 MB total, 14.9 MB of it hand-modelled glTF geometry.**
  This site's entire homepage first load is 1.22 MB. That weight is the thing
  this design deliberately does not buy.

Other references: Northvane (code-generated eroded terrain), Ridgeline
(baking detail onto lighter meshes), Codrops' Blender camera-path tutorial
(one normalized 0-to-1 value driving the camera).

## 4. Architecture

One `<Canvas>` fixed behind a tall scrollable DOM column. Scroll produces a
single normalized progress value `p` in [0, 1]. Camera, fog colour, lights,
card positions and reveals are all pure functions of `p`. There are no
per-element scroll triggers.

**No new dependencies.** Not GSAP, not Lenis. `components/test/zhu/scroll.ts`
already has this exact pattern — a `ScrollState` ref plus a `smooth()` damped
lerp, read inside `useFrame` — and it is reused here. This also avoids the
mobile friction reported for Lenis + ScrollTrigger + R3F stacks, and keeps
native scroll on phones, which is always smoother than hijacked scroll.

Progress is held in a ref and never in React state. Nothing re-renders on
scroll; `useFrame` reads the ref.

## 5. The camera path

A `THREE.CatmullRomCurve3` built from roughly 10 control points, defined in
code. No Blender export, no model file.

- Position: `curve.getPointAt(p)`
- Orientation: `curve.getPointAt(p + lookahead)`, blended toward a per-stop
  target so the camera turns to face each card as it passes and returns to
  the path afterwards.

## 6. The journey

13 screens of scroll (~1300vh), divided:

| Act | Screens | `p` | What happens |
| --- | --- | --- | --- |
| I — The Ridge | 3 | 0 to 0.23 | Surface from a cloud sea onto a gilded ridge at dawn. Title resolves from drifting hex particles. Two reveals as the camera moves: a distant spire range resolving out of the fog, then a flight of hex shards crossing the frame. Ends by flying **through** the hextech gate, which triggers the fall. |
| II — The Chasm | 4 | 0.23 to 0.54 | The camera tips over and falls. Walls close in; scaffolding, pipes and lamps rush past. Fog lerps gold to toxic green to violet. **3 cards** on the walls. |
| III — The Forge | 4 | 0.54 to 0.85 | Landing in lava. Emissive rivers, rising embers, heat haze. **5 cards**. |
| Finale | 2 | 0.85 to 1 | The camera pulls back into a wide chamber and all 8 cards fly in and assemble into one constellation over the lava. |

**Hero object per act**, rather than evenly distributed detail:

- Ridge: the hextech gate the camera passes through
- Chasm: a vast suspended turbine the camera spirals past
- Forge: a molten core hanging above the lava

## 7. The cards

8 cards, read from the existing data: 5 experiments in
`components/playground/experiments.ts` (dpl, cat, pond, invoice, contract)
and 3 projects in `components/playground/sphere/entries.ts` (yantra,
mike-tyson-invitational, dropby). Adding an experiment to those files adds it
to the journey; no position is hardcoded to an id.

**The frame is 3D, the content is DOM.** Each card has a beveled hextech
panel in the scene, so it is lit, occluded and fogged like everything else.
Its poster, title and link live in one `position: fixed` overlay, positioned
each frame by projecting the panel's world position to screen space.

Eight matrix projections per frame is negligible, and it buys crisp text at
any DPR, real `<a>` elements, real keyboard focus and real SEO — none of
which `<Html transform>` gives cheaply.

**Video rule.** Only the card nearest the camera plays its `.mp4`; every
other card shows its `.webp` poster. Eight simultaneous videos would kill any
phone. `components/projects/case/CaseVideo.tsx` already has the pattern.

**Know more.** Clicking a card expands a panel in place with the `blurb` and
`stats` already present in the data, and closes back to the same scroll
position. The card's `href` remains a real link for anyone who wants the
actual thing.

## 8. Chrome

- **Entry gate.** A curtain over a still frame: "ENTER THE DESCENT". Nothing
  renders until it is clicked. It hides the load, it is where `compileAsync`
  runs (the F2 shader-compile freeze fix from the perf audit), and it is the
  door to the flat version for reduced-motion and no-WebGL visitors.
- **Chapter rail.** Act numeral and progress ticks down the right edge. On
  phones it degrades to a hairline progress bar.

## 9. The look, at 60 KB

None of the look can come from modelled detail, so it comes from light and
air:

- Flat-shaded faceted terrain from seeded noise — low-poly reads as
  deliberate style, not as cheapness
- Fog as the main instrument: it hides draw distance, separates layers, and
  carries the colour arc
- Emissive everything — lava rivers, hextech edges, lamp cores
- Volumetric light shafts through the chasm scaffolding
- Silhouette over detail: big simple shapes against bright fog
- Grain and vignette on desktop only

Reference points are Monument Valley and Inside, not ORVAE's sculpted
realism.

## 10. Budget

| | Target |
| --- | --- |
| New npm dependencies | none |
| New binary assets | none |
| New JS, gzipped | < 60 KB |
| Reused assets | the posters and videos already in `/public/playground` |
| Frame rate | 60fps desktop, 45+ on a mid-range phone |

Terrain comes from a seeded noise function, repeated props from
`InstancedMesh`, embers from `Points`. The only runtime-generated texture is
a small noise map.

## 11. Performance

The repo's existing machinery, all of it reused:

- **`LoopGate`** (`components/test/zhu/Scene.tsx`) — the render loop stops
  when the canvas is off screen. The audit measured this as the single
  biggest win on the homepage hero.
- **`compileAsync`** before first paint, behind the entry gate.
- **`hasWebGL()`** (`lib/webgl.ts`) — one cached probe, no leaked contexts.
- **`useLowPowerMode()`** (`components/about/useLowPowerMode.ts`) — drives a
  quality tier: terrain segment count, particle count, postprocessing on or
  off, `dpr={[1, low ? 1.25 : 1.75]}`.
- **Fog as LOD** — far geometry is never drawn.

## 12. Phone, fallbacks, accessibility

Portrait widens the FOV, narrows the path, and moves cards to a full-width
stack in the lower third. Native scroll throughout; no hijacking.

Three paths land on the same flat version — **no WebGL**,
**`prefers-reduced-motion`**, and **no JS**: the DOM column renders as a
normal scrolling list of the same 8 cards over a static gradient. The canvas
is `aria-hidden`; the real content is real HTML with headings and links.

## 13. Files

```
components/playground/descent/
  DescentPage.tsx      page shell, entry gate, fallback switch
  useDescentScroll.ts  scroll to smoothed progress (ref, no per-frame state)
  path.ts              camera curve, act boundaries, lookAt targets
  Scene.tsx            Canvas, LoopGate/ReadyGate, quality tier
  Terrain.tsx          ridge and chasm walls
  Forge.tsx            lava, rivers, embers
  Props.tsx            instanced scaffolding, pipes, lamps
  Atmosphere.tsx       fog arc, cloud sea, particles
  CardAnchors.tsx      3D panels and screen projection
  CardLayer.tsx        DOM card overlay, know-more panel
  ChapterRail.tsx      progress indicator
  descent.css
```

`PlaygroundPageClient.tsx` mounts `DescentPage` instead of
`PlaygroundSphere`. The sphere files stay, unmounted.

## 14. Build order

Each stage ends somewhere it could be left standing.

1. **Skeleton** — scroll to progress, camera path, terrain, fog arc. No
   cards. Proves smoothness before anything is built on it.
2. **Cards** — panels, projection, reveals, the finale assembly.
3. **Art pass** — lava, embers, hextech detail, the intro, hero objects.
4. **Hardening** — entry gate, fallbacks, reduced motion, mobile tuning, and
   measured frame rates.

## 15. Risks

- **This becomes the heaviest page on the site.** The budget in §10 is the
  control; it is checked at the end of each stage, not at the end of the
  project.
- **Phone frame rates cannot be verified from here.** They need testing on a
  real device by the site's owner.
- **Visual verification is limited.** The browser pane paints the existing 3D
  hero unreliably, so look-and-feel needs the owner's eyes at each stage.
- **Scope.** Four stages of real work, not an afternoon.

## 16. Out of scope

- Audio
- Replacing anything outside `/playground`
- Deleting the sphere code
- Modelled or downloaded 3D assets
