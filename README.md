# Aayush Visuals — Portfolio

A cinematic single-scroll portfolio for **Aayush Raj** (product designer &
design engineer). Built as a scroll narrative: each section is a pinned,
scroll-driven moment rather than a static block.

> **New here?** Read [`DESIGN.md`](DESIGN.md) for the design system (colors,
> type, motion, section patterns, conventions) before changing anything visual.
> The two docs together are meant to give any developer or AI model full
> context fast.

---

## Stack

- **Next.js 16** (App Router) + **React 19**, TypeScript
- **framer-motion** — springs, `useScroll`, drag physics
- **cobe** — the WebGL globe
- **Plain CSS** — one stylesheet, `app/globals.css`. No Tailwind, no CSS-in-JS.
- **next/font** — General Sans (self-hosted local), Instrument Serif, Archivo
- Deploys on Vercel from `main`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the build
```

There is no separate lint/test script; correctness is checked with
`npx tsc --noEmit` and by driving the app in a browser.

> **Heads-up (`AGENTS.md`):** this repo runs a newer Next.js whose APIs may
> differ from training data. When in doubt, check
> `node_modules/next/dist/docs/` before writing framework code.

---

## Architecture

```
app/
  layout.tsx      # fonts (next/font), <html> theme-init script, metadata
  page.tsx        # homepage: the ordered section stack
  about/page.tsx  # about route -> components/about/AboutPageClient
  globals.css     # ALL styling + design tokens (:root)
components/
  Hero, About, Statement, Process, Capabilities (Skills wallet),
  ProjectsSection, Services (3D carousel), Testimonials, HomeContact, Footer
  Navbar / MobileNav (surface-tone aware), Cursor, ThemeToggle, PageLink
  useSurfaceTone.ts        # samples the section under the nav -> light/dark pill
  about/                   # About page + AsciiPortrait, PixelBackground, StatusBar
  projects/                # project data + tiles + modal/preview
public/
  fonts/          # self-hosted General Sans woff2 (400/500/600/700)
  skills/ services/ projects/ logos/ about/   # optimized WebP assets
scripts/
  optimize-images.mjs      # sharp-based asset optimizer (see DESIGN.md §9)
```

### Homepage order (`app/page.tsx`)

`Hero → About → Statement → Process → Capabilities (Skills) → ProjectsSection →
Services → Testimonials → HomeContact → Footer`, with the shared `Footer`
revealed by a parallax sticky-footer at the end.

### Two recurring section mechanics

1. **Pinned scroll driver + sticky stage** — a tall section holds a
   `sticky; height:100vh` stage; `useScroll` progress scrubs the interaction
   (Process, Services, Skills). Disabled under reduced-motion / on small screens.
2. **Parallax pull-up** — a section is pulled up `margin-top:-100vh` under the
   previous (higher-z) one, which slides away to reveal it (Process → Skills).

See [`DESIGN.md` §6](DESIGN.md) for details.

---

## Conventions (please follow)

- **No em dashes** in visible copy — hyphens/commas/restructure instead.
- **Minimal, thin-outline, semi-bold (≤600)** default. Avoid heavy/filled,
  gradient text, side-stripe accents, decorative glassmorphism, per-section
  uppercase eyebrows.
- Styling goes in `app/globals.css` with BEM-ish class names; keep the existing
  comment structure and token usage.
- **Motion is required, and so is its reduced-motion fallback.** Standard easing
  `cubic-bezier(0.22, 1, 0.36, 1)`; springs ~`{stiffness 240, damping 26}`.
- Reference files as paths; commits describe the *why*.

## Images (performance)

All raster assets are **WebP, sized to display** (a card shown at 240px is not a
2150px file). Full public raster budget ≈ **3.3 MB** (was 24 MB).

To add or change an image:

1. Drop the source in the right `public/` folder.
2. Add it to the job table in [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs).
3. `node scripts/optimize-images.mjs` — it resizes, converts to WebP, and prints
   an old→new rename map.
4. Update references to the `.webp` path.
5. Animated WebP must be re-encoded with `{ animated: true }` (see DESIGN.md §9).

Interactive images (drag / 3D transforms — Skills deck, Services carousel) stay
raw `<img>`; static images may use `next/image` (AVIF/WebP + lazy-load are
enabled in `next.config.ts`).

---

## Performance notes

- Fonts are **self-hosted** via `next/font` — no external font requests.
- `next.config.ts` enables `compress`, AVIF/WebP for `next/image`, and
  `optimizePackageImports: ["framer-motion"]`.
- Ambient animations are GPU-only (transform/opacity/filter) and pause under
  reduced-motion.
