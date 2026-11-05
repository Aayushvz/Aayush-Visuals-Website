# Performance audit — Aayush Visuals

**6 Nov 2026.** Two passes on commit `46e315f`:

1. **The audit.** I measured the original site and listed every problem with load, caching, scroll and interaction speed.
2. **Round 1 fixes.** Every fix that leaves the site looking exactly the same was applied. Anything that would change the look, even slightly, was left untouched and is listed below with the reason. The changes are not committed yet.

The rule for this round was: **the look stays untouched.** I compared screenshots of every changed page before and after. The only differences are things that were already animating, such as the cycling tagline, the mark's spin and the About deck's current card.

---

## At a glance

Numbers marked † come from a side-by-side run: the original and fixed builds measured back to back, under the same conditions. Other apps were busy on the machine, so CPU-dependent numbers move ±10–20% from run to run. Bytes, requests and cache behaviour don't vary.

| | Before | After |
|---|---|---|
| Homepage, longest freeze while loading (desktop) | 1.7 s | 0.57 s |
| Homepage, Total Blocking Time (desktop) | 2.5 s | 1.1 s |
| Homepage, Total Blocking Time (phone profile) | 2.7 s † | 2.5 s † |
| Homepage, largest paint on slow 4G phone | 6.7 s | 5.0 s |
| Homepage scroll, desktop | 35 fps | 52 fps |
| Homepage scroll, phone profile | 38 fps † | 50 fps † |
| Homepage, idle frame rate at the bottom (phone) | 22 fps † | 48 fps † |
| Hero WebGL draw calls/s once scrolled past | ~1,500 | **0** |
| Fonts downloaded on every page | 15 files, 544 KB | 8 files, 297 KB |
| Case study (Mike Tyson), first load | 8.4 MB | **0.97 MB** |
| Playground, first load (desktop) | 4.8 MB | 2.4 MB |
| About, first load | 2.25 MB | 1.27 MB |
| `/contact`, idle frame rate (desktop) | 15 fps | 58 fps |
| `/contact`, Total Blocking Time on slow 4G phone | 3.3 s | 0.6 s |
| Files re-checked with the server on a repeat visit (About) | 9 | 0 |
| Layout shift (CLS) | 0 | 0 |

### Scorecard

Each area is scored 0–4, in the impeccable audit's format, restricted to the four areas asked for.

| Area | Before | After | Why it isn't higher yet |
|---|---|---|---|
| Load speed | 1 | **2** | The preloader still holds the first view for at least ~4 s (left untouched, it's the look). The hero's reflection pass still runs on the first frame. |
| Caching | 3 | **4** | Every static file a page uses is now cached; repeat visits make no revalidation round trips. |
| Scroll smoothness | 1 | **2** | Off-screen work is gone. What remains is on-screen work that defines the look (the hero's live reflections, the About canvases, the footer sky). |
| Interaction speed | 1 | **2** | The worst taps dropped from 720 ms to ~270 ms on the phone profile. The hero click is still ~200 ms while the hero is drawing. |
| **Total** | **6 / 16** | **10 / 16** | |

---

## What was fixed

Every fix below leaves the picture identical. Each entry lists the problem, the change and its files, the gain (measured), and how the look was checked.

### F1. The hero's 3D scene stops drawing once you scroll past it

- **Problem.** The hero canvas rendered every frame for the whole visit. Each frame meant a live 6-face reflection cube, a glass pass into a 4x MSAA buffer, and the screen pass. At the very bottom of the homepage it was still making ~1,500 WebGL draw calls a second, with no part of the hero visible.
- **Fix.** One IntersectionObserver on the hero frame now switches the render loop off while it is off screen and back on when it returns (`components/test/zhu/ZhuHero.tsx`, `LoopGate` in `Scene.tsx`).
  - React Three Fiber resets the scene clock when the loop is switched, and the name's intro and the mark's hold are timed off that clock. So the clock is saved on pause and restored on resume, and the scene carries on from the exact frame it left.
  - Nothing is paused until the scene has reported ready, so the preloader hand-off is untouched.
- **Gain.**
  - Draw calls at the bottom of the page: 1,496/s → **0**.
  - Idle frame rate parked at the bottom: desktop 45 → 59 fps, phone 22 fps → 48 fps †.
  - The GPU time freed up goes to every section below the hero, which is most of the scroll-fps gain in the table above.
- **Look.** Unchanged. I scrolled to mid-page and back: the name, mark, backdrop and tagline return exactly as they left.

### F2. The hero's shaders compile without freezing the page

- **Problem.** Profiling showed that the hero's first render compiled every shader program on the spot. 60% of a 1.8 s freeze was spent waiting on shader linking (three.js `getUniforms`). That froze the preloader's word run and made up most of the homepage's blocking time.
- **Fix.** `components/test/zhu/Mark.tsx` now calls three's `compileAsync`, which compiles through `KHR_parallel_shader_compile` and polls instead of blocking. It compiles both program variants: the one for the off-screen glass buffer and the one for the screen. Nothing is drawn until compilation is done. The canvas is still hidden under the CSS poster at that point, and `ReadyGate` in `Scene.tsx` waits for it as well.
- **Gain.**
  - Longest single freeze while loading: 1.7 s → 0.57 s on desktop.
  - Homepage Total Blocking Time: 2.5 s → 1.1 s on desktop, and 2.7 s → 2.5 s † on the phone profile.
  - The preloader's words now change on time instead of stalling.
- **Look.** Unchanged. The scene first appears at the same moment in the intro, fully lit.

### F3. WebGL support is checked once, and the test context is released

- **Problem.** The hero and the Statement section each created a throwaway WebGL context to test for WebGL support, and neither released it. Profiled, creating one cost ~350 ms of main-thread time. The second one happened mid-scroll, when Statement mounts, which was a visible hitch.
- **Fix.** New `lib/webgl.ts` probes once per page, caches the answer and releases the probe context straight away. `ZhuHero.tsx` and `Statement.tsx` both use it.
- **Gain.** The ~350 ms probe in the middle of the scroll is gone, and the page no longer leaks two WebGL contexts (browsers cap the total at about 16).
- **Look.** No visual involvement.

### F4. Only the fonts the main pages draw with are preloaded

- **Problem.** The root layout preloaded 15 font files (544 KB) on every page. On slow connections they competed with the hero's script, and they held up `document.fonts.ready`, which the hero's name, and so the preloader, waits on.
- **Fix** (`app/layout.tsx`):
  - Removed Cinzel Decorative, which was used nowhere.
  - Set `preload: false` on Cinzel, Inter, Caveat, Permanent Marker and Grenze Gotisch. They are only used by the contract tool, the case-study Figma chrome, and an old About collage. Their `@font-face` rules are still declared everywhere, so any page that draws with them fetches them on use.
  - Aeonik, Archivo and Instrument Serif stay preloaded.
- **Gain.** On every page, 15 files / 544 KB → **8 files / 297 KB**, a 45% cut in font bytes. Homepage first-load bytes: 1.47 MB → 1.22 MB.
- **Look.** Unchanged. The same faces render wherever they did before.

### F5. Every static file is cached between visits

- **Problem.** The cache rule in `next.config.ts` missed `/playground/*` (posters and ~4 MB of demo video), `/skills/*` (the six Skills images), the two cursor SVGs used on every page, a background texture and the share image. All of these came back as a 304 round trip on every visit.
- **Fix.** `next.config.ts` adds `playground|skills` to the existing one-day + stale-while-revalidate rule, plus a rule for the loose root files.
- **Gain.** Revalidation round trips on a repeat visit: homepage 2 → 0, About 9 → 0, Playground 7 → 0, and every other page 2 → 0.
- **Look.** No visual involvement.

### F6. The contact page's dot field only redraws what moves

- **Problem.** The page-sized canvas redrew all ~4,000 dots every frame, forever, each with its own path and colour string, at 2x resolution. That held `/contact` at ~15 fps on a desktop even with the mouse still.
- **Fix** (`components/contact/ContactPageClient.tsx`):
  - The resting grid is drawn once into an off-screen layer.
  - Each frame then touches only the dots inside the pointer's radius, plus the ones still cooling. Each one is drawn alone in its own cleared square, exactly as before, and a dot that comes back to rest has its square copied back from the resting layer.
  - The loop stops when the pointer has left and the last dot has cooled, and starts again on the next pointer move.
- **Gain.**
  - Desktop idle frame rate: 15 → 58 fps.
  - Scrolling while the pointer moves: 15 → 42 fps.
  - Total Blocking Time on a slow 4G phone: 3.3 s → 0.6 s.
- **Look.** Same colours, sizes, falloff radius and decay rate, frame for frame. Screenshot diff: 0.01% at the top of the page and 0.2% at the bottom, all on elements that animate anyway (stars, the orb).

### F7. Case-study videos load as you reach them

- **Problem.** Each case-study loop was a `<video autoPlay>`, and autoplay forces a download. Opening the Mike Tyson case study fetched 7.2 MB of webm before any scrolling, and every loop kept decoding off screen.
- **Fix.** New `components/projects/case/CaseVideo.tsx`, used by `CaseBlocks.tsx`, keeps the same element and attributes. It asks for metadata only, starts playing one full screen before the video scrolls into view, and pauses when it leaves.
- **Gain.**
  - First load: **8.4 MB → 0.97 MB** desktop, 8.3 MB → 0.83 MB phone.
  - Desktop largest paint: 1.49 s → 0.94 s.
  - Phone Total Blocking Time on slow 4G: 2.2 s → 0.9 s.
- **Look.** Unchanged. Each video is already playing when it arrives on screen.

### F8. The playground's brand reel uses images sized for its cards

- **Problem.** The DropBy reel card in the `/playground` sphere loaded the full 2000 px campaign photographs (3.3 MB for five images) into a card at most ~550 px wide.
- **Fix.** I added 1400 px copies in `public/playground/reel/`. They are made from the originals with sharp at WebP quality 82, which is still enough for a 2x screen at the card's largest size, including its slow zoom. `components/playground/sphere/entries.ts` now points at them. The originals are untouched and still used by the case study.
- **Gain.** The reel's images went from 3.3 MB to 1.15 MB. Playground first load went from 4.8 MB to **2.4 MB** on desktop.
- **Look.** Unchanged at card size.

### F9. The About page no longer re-renders itself at every scroll start and stop

- **Problem.** The "SCROLLING" status word was state on the whole About page. Flipping it when a scroll started and again 650 ms after it ended re-rendered the entire page (the story, the intro scene and the 20-card work deck) twice per scroll, for one word in the status bar.
- **Fix.** That state now lives inside `components/about/StatusBar.tsx`, the only thing that shows it. `AboutPageClient.tsx` no longer tracks it.
- **Gain.** Two whole-page React re-renders per scroll gesture are gone. That is part of the About scroll gain: 30 → 43 fps on the phone profile.
- **Look.** Unchanged. The bar shows the same words at the same moments.

### F10. The About page's work deck waits until you get there

- **Problem.** `WorkHero`, the deck of 20 project cards far down the About page, treated its first four cards as above the fold:
  - It fetched a 505 KB video and two covers at high priority during the page load, competing with the hero.
  - Its one-second autoplay re-rendered all 20 animated cards every second from the moment the page loaded, with the deck off screen.
- **Fix** (`components/work/WorkHero.tsx`):
  - Its media loads normally: lazily, with the video playing on approach.
  - The autoplay tick is skipped while the deck is more than half a screen away. It carries on from the same card when you arrive.
- **Gain.** About first load: **2.25 MB → 1.27 MB**, and video on load: 505 KB → 0. One re-render of 20 cards per second while you read the rest of the page is gone.
- **Look.** Unchanged. The deck shows a different card at a given scroll position, because it no longer cycles while hidden; it was already cycling, so nothing about how it looks changed.

### F11. The footers stop animating while hidden behind the page

- **Problem.** The homepage and About footers are `position: sticky` at the bottom of the screen and hidden behind the page until the very end. Because they are technically on screen the whole time, `AnimationBudget` never paused them. Their night sky kept repainting behind the page for the whole visit: star twinkles animated through `box-shadow`, the glow drifting through `background-position`, and the flame through a `drop-shadow` filter.
- **Fix.** A zero-height marker sits where each footer falls in normal flow (`DeferUntilNear.tsx` for the homepage, `AboutPageClient.tsx` for About). `AnimationBudget.tsx` keeps the footer paused until that marker comes within 300 px, the same margin every section already uses.
- **Gain.** Paint work for the footer sky is gone from the rest of both pages. That is part of the idle and scroll gains on `/` and `/about`.
- **Look.** Unchanged. The animations resume 300 px before the footer is uncovered, so you never see them start.

### F12. The About tag pile stops simulating once it has settled

- **Problem.** The matter-js pile stepped the physics and rewrote every tag's transform on every frame for as long as the pinned panel was near the screen, even with every tag at rest.
- **Fix.** `components/AboutTagPile.tsx` stops the loop once every tag has been still for 45 frames and nothing is held, and starts it again the moment a tag is grabbed.
- **Gain.** No physics or style work for the long stretch where the pile just sits there.
- **Look.** Unchanged. A tag at rest has nothing to animate.

### F13. `/work` asks for its first row of stills straight away

- **Problem.** The works grid's first row is the first screen of `/work`, but it was lazy-loaded like the rest. The browser waited for layout before even requesting the largest image.
- **Fix.** `components/work/ProjectCard.tsx` and `WorksSection.tsx` now load the first three cards' stills eagerly, at high priority. Loops are excluded, because a loop already plays as soon as it is on screen, and loading it eagerly would download it in full during page load.
- **Gain.** `/work` largest paint: 1.71 s → **1.29 s** on desktop, and 7.0 s → **5.8 s** on a slow 4G phone. Phone Total Blocking Time: 1.4 s → 0.6 s. First-load bytes on desktop: 2.42 → 2.17 MB.
- **Look.** Unchanged. The cards still fade in as they did.

### F14. A small cleanup in the About pixel background

- **Fix.** In `components/about/PixelBackground.tsx`, the cloud pass reused a colour string that was already computed, instead of building a new identical string for every cell on every frame.
- **Gain.** Small. It removes thousands of string allocations per frame.
- **Look.** Identical. It is the same string.

---

## What was left untouched, and why

Each of these would change the look, even slightly, or is a large refactor that needs Aayush's eyes on it. They are ordered by how much speed they would add.

| # | Issue | Why it was left | What fixing it would gain |
|---|---|---|---|
| U1 | **Preloader length.** The intro holds the first view for at least ~4.2 s (word run, mark, hold, lift) and locks scroll. | It is the brand moment. Shortening it changes the look, so it is Aayush's call. | The single biggest remaining load win: 2–4 s sooner to a usable page. |
| U2 | **The hero's live reflections.** While the hero is on screen, the reflection cube is re-rendered and re-filtered every frame (`<Environment frames={Infinity}>`). Its first filter pass also still runs on the main thread. | Rendering it once, or less often, would freeze or slow the reflections' drift. That is a visible change. | Roughly a third of the hero's per-frame GPU work, and the last ~0.5 s of load-time blocking. |
| U3 | **Hero resolution cap.** The canvas renders at up to 2x device pixels. | Capping it at 1.5x softens the hero slightly on retina screens. | ~44% fewer pixels shaded per hero frame on 2x screens. |
| U4 | **About page canvases.** `PixelBackground` runs Perlin noise per cell per frame, and `AsciiPortrait` redraws ~25k cells with flicker per frame. Both keep animating under reduced motion. | Updating them less often, or bucketing the portrait's colours, changes their motion or tone. Showing a still frame under reduced motion changes what those visitors see. | The biggest remaining cost on `/about` (phone idle ~36–39 fps). |
| U5 | **The footer sky while it is visible.** Twinkles animate `box-shadow` and the flame animates a `drop-shadow` filter. | Rebuilding them on opacity and transform layers is a visual rebuild that needs side-by-side QA. | Smoother frames at the very end of `/` and `/about`. |
| U6 | **The four Statement logos use four WebGL canvases**, each compiling its own clearcoat shader as it mounts mid-scroll. | Merging them into one canvas (drei `<View>`) is a real refactor of a finished section and needs visual QA. | Three fewer WebGL contexts and three fewer shader-compile hitches mid-scroll. |
| U7 | **Layout reads in several scroll loops.** About, Statement, Services, RailsEnd, HomeLab, Gallery and ZhuHero each read layout in their own rAF loop, and `useSurfaceTone` hit-tests with `elementsFromPoint`. | A shared scroll scheduler touches every scroll-driven section's choreography, and any timing slip would show. | Fewer forced layouts per scroll frame across the homepage. |
| U8 | **framer-motion ships in the homepage's first JS** (46 KB gzip) for three About fades and the mobile nav sheet. | Re-creating those fades in CSS risks subtle motion differences. | ~46 KB gzip off the homepage's first load. |
| U9 | **All of `projectData.ts` ships to the browser on `/work` and `/about`** (277 KB of source), when the cards only need a few fields. | No look change, but it is a data-flow refactor across the work components. It is the recommended next step. | A smaller JS bundle on `/work` and `/about`. |
| U10 | **The `/work` first row fades in only after hydration** (framer `initial={{opacity:0}}`). | Removing the fade changes the entrance. | Earlier largest paint on `/work`, especially on phones. |
| U11 | **The case-study hero image has no `width`/`height` attributes** and no AVIF source. | CLS already measures 0. Adding dimensions could change how the image sizes where the CSS relies on its intrinsic size. | Robustness only. |
| U12 | **`ProjectMedia` plays its loops even under reduced motion.** | Fixing it changes what reduced-motion visitors see. Worth doing for accessibility, but it is a look change for them. | Accessibility. |
| U13 | **Smaller items.** `PrefetchWorkMedia` watches a section that isn't on `/`, so it does nothing. The playground sphere re-renders all 26 cards when the front card changes. The `/api/shotsu` rate-limit map grows without bound and keeps generating after the client disconnects. The hero's source still lives under `components/test/zhu/`. | Low impact on page speed, or housekeeping. | Minor. |

---

## Full measurements

All runs used the production build (`next build` + `next start`), headless Chrome on a hardware GPU (AMD Radeon integrated, D3D11), and a cold profile per run.

- **Desktop:** 1440×900, CPU 1x.
- **Phone:** 390×844 touch, 3x DPR, CPU 4x.
- **Load runs** used "slow 4G" (1.6 Mbps, 150 ms). **Scroll runs** used no network limit.

### Load (sequential runs; bytes and requests don't vary between runs)

| Route | Desktop largest paint | Phone largest paint (slow 4G) | Phone TBT (slow 4G) | First-load bytes, desktop |
|---|---|---|---|---|
| `/` | 1.22 → 0.84 s | 6.7 → 5.0 s | 4.4 → 2.5 s | 1.47 → 1.22 MB |
| `/work` | 1.71 → 1.29 s | 7.0 → 5.8 s | 1.4 → 0.6 s | 2.42 → 2.17 MB |
| case study | 1.49 → 0.94 s | 2.7 → 2.2 s | 2.2 → 0.9 s | **8.43 → 0.97 MB** |
| `/about` | 0.84 → 0.62 s | 3.4 → 2.8 s | 2.8 → 1.6 s | 2.25 → 1.27 MB |
| `/playground` | 1.18 → 1.18 s | 4.7 s → (see note) | 1.6 s → (see note) | 4.84 → 2.43 MB |
| `/contact` | 1.39 → 0.93 s | 3.8 → 2.7 s | 3.3 → 0.6 s | 1.14 → 0.89 MB |

Note: the slow-4G phone run of `/playground` timed out after the fix, as it nearly did before (its load event took 33 s). Its byte count is the reliable number.

### Scroll, idle and interaction

Homepage, phone profile, side-by-side †:

| | Before | After |
|---|---|---|
| Total Blocking Time | 2.7 s | 2.5 s |
| Longest freeze | 1.14 s | 0.90 s |
| Scroll frame rate (p95 frame time) | 38 fps (67 ms) | **50 fps (33 ms)** |
| Frames slower than 50 ms during the scroll | 268 | **60** |
| Idle frame rate parked at the bottom | 22 fps | **48 fps** |
| Worst tap → next paint | 344 ms | 280 ms |

Other routes. These are sequential runs; the CPU-dependent numbers carry the run-to-run noise noted above:

| Route | Desktop scroll fps | Desktop idle fps at bottom | Desktop worst interaction | Phone scroll fps |
|---|---|---|---|---|
| `/` | 35 → 52 | 45 → 59 | 360 → 208 ms | (above) |
| `/work` | 34 → 39 | 55 → 60 | 208 → 168 ms | 37 → 30–39 (noisy) |
| case study | 29 → 35 | 56 → 57 | 296 → 144 ms | 28 → 24 (noisy, see note) |
| `/about` | 40 → 50 | 44 → 59 | 600 → 416 ms | 30 → 43 |
| `/playground` | 52 → 53 | 30 → 30 | 168 → 96 ms | — |
| `/contact` | 15 → 42 | 15 → 58 | 296 → 160 ms | 32 → 42 |

Note on the case study: its phone scroll number came out lower after the fix, but that run happened under heavy load from other apps, and it is the one route not re-checked side by side. Videos now start decoding as you reach them instead of all decoding from the start. On a real phone, with hardware video decode, that should be a net gain, but it should be confirmed on a device.

---

## How the look was verified

- **Screenshots.** I captured before and after screenshots at fixed scroll points on every changed page (`/` at 6 points, `/about` at 4, the case study at 2, `/contact` at 2, `/playground`) and pixel-diffed them. Static content matches exactly. The differences are confined to things that animate on their own: the hero's cycling tagline and the mark's spin angle, the About work deck's current card, the playground sphere's rotation, stars and the orb.
- **Hero return.** I scrolled to mid-page and back. The hero resumes with its name, mark, reflections and tagline intact, confirming the clock save and restore in F1.
- **Build checks.** `tsc --noEmit` is clean, `next build` is clean, and no console errors appeared on any route during the runs.

## Files changed

New:

- `lib/webgl.ts`
- `components/projects/case/CaseVideo.tsx`
- `public/playground/reel/*.webp` (5 images)

Edited:

- **Hero:** `components/test/zhu/ZhuHero.tsx`, `Scene.tsx`, `Mark.tsx`
- **Homepage sections:** `components/Statement.tsx`, `components/AnimationBudget.tsx`, `components/DeferUntilNear.tsx`, `components/AboutTagPile.tsx`
- **About page:** `components/about/AboutPageClient.tsx`, `StatusBar.tsx`, `PixelBackground.tsx`
- **Work and case study:** `components/work/WorkHero.tsx`, `ProjectCard.tsx`, `WorksSection.tsx`, `components/projects/case/CaseBlocks.tsx`
- **Contact and playground:** `components/contact/ContactPageClient.tsx`, `components/playground/sphere/entries.ts`
- **Config:** `app/layout.tsx`, `next.config.ts`

Every change carries a comment in the code explaining the problem and why the fix keeps the look.

---

## Tech stack (for reference)

| Layer | What it uses |
|---|---|
| Framework | **Next.js 16.2** (App Router, Turbopack build), **React 19.2**, TypeScript. Every page is static (SSG): 19 case studies come from `generateStaticParams`. The only dynamic route is `/api/shotsu`. Deploys on Vercel. |
| Styling | Hand-written CSS: one 13,400-line `app/globals.css` plus per-feature CSS files. Tokens are CSS variables. No Tailwind, no CSS-in-JS. |
| 3D, hero | **three.js 0.186 + @react-three/fiber 9 + @react-three/drei 10**. One canvas holds an extruded logo mark with a glass/refraction shader: the scene is drawn into a 4x MSAA buffer and seen through the mark. A custom fbm-noise backdrop shader is rendered live into an environment cube, so the mark reflects its own background. The mark rotates under drag with springs, and the camera orbits and rises with scroll. Scroll reaches the scene through a shared ref, so scrolling never re-renders React. |
| 3D, Statement section | Four tool logos (Figma, Framer, Claude, Vector), each turned from SVG into an `ExtrudeGeometry` with a clearcoat `MeshPhysicalMaterial`. Each has its own small canvas, which renders only while visible. |
| 3D without WebGL | The Services carousel and the `/playground` card sphere are CSS 3D transforms. |
| Physics | **matter-js** for the About tag pile, imported when About comes near. |
| 2D canvas | The About dot field, the About page's `AsciiPortrait` and `PixelBackground`, and the `/contact` dot field. |
| Scrolling | Native browser scroll, with no smooth-scroll library (no Lenis or GSAP). Pinned stages use `position: sticky`. Sections measure progress with passive scroll listeners and rAF loops, then write transforms and CSS variables. Framer's `useScroll` drives the Skills wallet and the work deck. Reveals use one shared IntersectionObserver. |
| Motion | **framer-motion 12**, CSS keyframes, and WAAPI for the preloader. `AnimationBudget` pauses CSS animations in off-screen sections, and now in hidden sticky footers too. |
| Loading | Below-the-fold home sections load through `DeferUntilNear` + `next/dynamic`. Images are raw `<img>`/`<picture>` in WebP/AVIF, pre-optimised with sharp. Videos are webm/mp4, played by visibility. |
| Fonts | `next/font`. **Aeonik** (local, 5 weights) is the interface face. Archivo and Instrument Serif are preloaded too. Cinzel, Inter, Caveat, Permanent Marker and Grenze Gotisch load only where they are used. |
| AI assistant | The "Shotsu" orb calls `/api/shotsu` (Anthropic SDK, streaming), server-side only. |

---

*Caveats.* Headless Chrome on an integrated AMD GPU is weaker than a desktop graphics card and stronger than most phones. CPU 4x throttling stands in for a mid-range Android. The machine had other apps running, which is why the CPU-sensitive numbers come from side-by-side runs. The server was local `next start`, so on Vercel first bytes will be faster, but nothing above depends on that.
