# Design System — Aayush Visuals

The single source of truth for how this site looks and moves. Tokens live as
CSS custom properties at the top of [`app/globals.css`](app/globals.css); this
document explains what they are and how to use them. There is **no Tailwind and
no CSS-in-JS** — styling is hand-authored CSS in `globals.css`, referenced by
BEM-ish class names on components.

---

## 1. Foundations

- **Styling:** one global stylesheet, `app/globals.css`. Components carry class
  names (e.g. `.capCard`, `.services-heading`); all rules live in `globals.css`.
- **Tokens:** CSS variables on `:root`. Global tokens are fixed. Only the
  `--hero-*` and `--glass-*` tokens react to `html[data-theme]`, so the
  light/dark toggle **art-directs the hero and floating glass chrome only** —
  everything below the hero keeps the fixed light look with the purple accent.
- **Units:** `clamp()` for anything fluid (type, insets, section heights). Avoid
  fixed px for layout that must breathe across viewports.

---

## 2. Color

### Global palette (fixed, styles everything below the hero)

| Token | Value | Use |
|---|---|---|
| `--cream` | `#f2ede6` | Primary page background |
| `--ink` | `#1f1f1f` | Primary text |
| `--ink-soft` | `rgba(31,31,31,.14)` | Hairlines, dividers |
| `--dot` | `rgba(31,31,31,.16)` | Dotted grid |
| `--purple` | `#7c3aed` | **Brand accent** (CTAs, links, active) |
| `--purple-soft` | `#a78bfa` | Soft accent, glows, status dots |
| `--purple-mid` | `#6d28d9` | Hover state for purple |
| `--orange` | `#e8834a` | Rare secondary accent |
| `--bridge-dark` / `--dark` | `#1a1a1a` / `#232323` | Dark sections |
| `--faded` | `#c9c2b4` | Muted lines on cream |
| `--card-hover` | `#faf7f1` | Card hover fill |

### Hero + glass (theme-reactive: `:root` = dark default, `[data-theme="light"]`)

`--hero-bg`, `--hero-fg`, `--hero-fg-2`, `--hero-brand`, `--hero-line`,
`--hero-grid-line`, `--heroCard-*`, and the Apple-glass set `--glass-bg`,
`--glass-fg`, `--glass-border`, `--glass-highlight`, `--glass-shadow`. The
navbar/mobile-nav pills also sample the section beneath them and swap
light/dark chrome independently (see `components/useSurfaceTone.ts`).

### Contrast rule

Body text ≥ 4.5:1 against its background; large/bold text ≥ 3:1. Muted grays on
cream must still clear 4.5:1 — bias toward `--ink` when in doubt.

---

## 3. Typography

Three families, loaded via `next/font` (self-hosted, zero external requests):

| Variable | Family | Loaded via | Role |
|---|---|---|---|
| `--font-general` → `--font-primary` | **General Sans** (400/500/600/700) | `next/font/local`, `public/fonts/*.woff2` | Body + all UI, headings |
| `--font-serif` | **Instrument Serif** (400, +italic) | `next/font/google` | Hero identity lockup, display accents |
| `--font-archivo` | **Archivo** (variable width) | `next/font/google` | Hero name lockup |
| — | `ui-monospace, SF Mono` | system | Counters, technical labels, `AV·0X` marks |

**Weights:** 400 body, 500 UI labels, **600 headings/emphasis** (the site
deliberately prefers 600 over 800 — keep display weight ≤ 600). 700 only for
small bold marks.

**Type scale** (fluid, ≥1.25 ratio, `clamp(min, vw, max)`):

| Role | Approx clamp |
|---|---|
| Display / section heading | `clamp(36px, 5vw, 64px)` … up to `72px` for section titles |
| Sub-heading | `clamp(26px, 3.2vw, 46px)` |
| Body | `15–17px` (base `17px`, `line-height: 1.5`) |
| Small / meta | `13–14px` |
| Micro / mono label | `10–12px`, `letter-spacing: 0.1–0.3em`, uppercase |

**Rules:** display letter-spacing ≥ `-0.04em`; `text-wrap: balance` on h1–h3;
cap body line length ~65–75ch.

---

## 4. Spacing & layout

- **Rulers:** the fixed side rails sit at `--page-rail-inset:
  clamp(14px, 5vw, 78px)`. Content stays clear of them at
  `--page-content-inset: clamp(44px, 9vw, 132px)`.
- **Grid:** `--grid-size: 20.28px` for the dotted background grid.
- **Rhythm:** vary vertical spacing for rhythm (generous section separation,
  tight groupings). Section vertical padding is typically `clamp(48px, 8vh, …)`.
- **z-index:** semantic, low numbers. Section stacking uses 1–3; pinned stages
  and glass chrome use higher scoped values (navbar 90, mobile nav 96). No 9999.

---

## 5. Motion

Motion is part of the build, not an afterthought. Library: **framer-motion**
(springs, scroll, drag) + CSS keyframes for ambient loops. Lenis is not used;
scroll is native.

- **Standard easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint feel) —
  the default for transitions across the whole site.
- **Spring (deal / scatter / drag):** `type: "spring", stiffness ~230–260,
  damping ~26, mass ~0.9`.
- **Pop / node reveal:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — an intentional,
  contained overshoot reserved for small element entrances (chips, nodes). Not
  for large layout moves.
- **Ambient loops:** slow (12–42s), `ease-in-out`, GPU-only (transform/opacity/
  filter). Nebula, aurora curtains, starfield, wallet float.
- **Reduced motion:** every animation has a `@media (prefers-reduced-motion:
  reduce)` path — pins disable, loops stop, reveals become instant. Non-optional.

---

## 6. Section patterns (reusable)

The homepage is a scroll narrative. Two patterns recur:

1. **Pinned scroll driver + sticky stage.** A tall section (e.g. `min-height:
   350–550vh`) contains a `position: sticky; top: 0; height: 100vh` stage.
   Scroll progress (`useScroll`, offset `["start start","end end"]`) drives the
   interaction (Process cards, Services carousel, Skills wallet deal). Reduced
   motion / small screens drop the pin.
2. **Parallax pull-up.** A section is pulled up `margin-top: -100vh` beneath the
   previous one (which carries a higher `z-index`) so the previous panel slides
   away to reveal it (Process → Skills).

Side **rails** (`.rails`, `.capRails`, `.aboutRulers`) are the connective visual
language — thin vertical lines at `--page-rail-inset`.

---

## 7. Component inventory

Home: `Hero`, `About`, `Statement`, `Process`, `Capabilities` (Skills wallet
deck), `ProjectsSection`, `Services` (3D card carousel), `Testimonials`,
`HomeContact`, `Footer`, `Navbar` / `MobileNav` (surface-tone-aware).
About page: `about/AboutPageClient` + `AsciiPortrait`, `PixelBackground`,
`StatusBar`, `Testimonials`. Shared: `Cursor`, `ThemeToggle`, `PageLink`
(cinematic route transition), `LogoStrip`, `useSurfaceTone`.

---

## 8. Standing conventions

- **No em dashes** in any visible copy — use hyphens, commas, or restructure.
- **Minimal / thin-outline default** — prefer restrained, outline, semi-bold
  (≤600) over heavy/filled. No gradient text, no side-stripe accents, no
  glassmorphism-by-default, no tiny uppercase eyebrows on every section.
- Cards only when they're the right affordance; never nested cards.
- Interactive images (drag/3D transforms) stay raw `<img>`; static images can
  use `next/image`.

---

## 9. Image guidelines

- **Format:** WebP for all raster. Keep alpha where needed. Vector → SVG.
- **Size to display:** never ship a 2150px asset for a 240px slot. Target ~2×
  the largest rendered size.
- **Tool:** [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs) (sharp)
  — add new assets to its job table, run `node scripts/optimize-images.mjs`, it
  resizes + converts + prints a rename map. Then update references to `.webp`.
- **Animated WebP** (e.g. `mike-tyson-bg.webp`) must be re-encoded with
  `sharp(buf, { animated: true, limitInputPixels: false })` — a normal convert
  flattens it to one frame.
- Current budget: total `public/` raster ≈ 3.3 MB (was 24 MB).
