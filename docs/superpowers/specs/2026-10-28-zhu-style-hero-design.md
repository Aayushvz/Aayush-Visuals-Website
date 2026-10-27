# 3D logo hero, after guillaumezhu.com, in the Aayush Visuals purple

Date: 2026-10-28. Status: approved in brainstorming, awaiting spec review.

## Goal

A new page that replicates the composition and feel of the guillaumezhu.com hero
(rounded inset frame, flowing gradient, huge name type, a glossy 3D monogram
passing through the name, frosted nav pill, stacked scroll lines) in the site's
purple theme, with Aayush's own logo built as a real 3D object.

The homepage and every existing page stay untouched.

## Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Route | `/test/zhu`, `robots: noindex`, like the other `/test` pages |
| Name text | "aayush / visuals", two lines |
| 3D object | Aayush's logo mark: slanted bar with one rounded corner + a dot |
| Motion | Faithful to the reference (float + cursor tilt) plus a "living dot" that follows the bar through a looser spring |
| Material | Satin lilac-to-violet plastic at rest; turns to refracting glass on hover |
| Background | Purple with one hot magenta streak |
| Build | React Three Fiber + drei, loaded only on this page |

## The logo geometry

Measured from the supplied 2000x2000 PNG (white on transparent). The shape is
two primitives, so it is rebuilt exactly in code rather than traced.

- **Bar**: parallelogram, horizontal width 418px, leaning 28.4deg from vertical
  (left edge moves 0.54px left per 1px down).
  - bottom edge: x 318 to 736 at y 1426
  - top edge: x 844 to 1262 at y 445
  - top-left corner rounded, radius ~150px; the other three corners sharp
- **Dot**: circle, centre (1345, 1183), radius 243px.

Coordinates are normalised to the mark's bounding box (x 318-1589, y 445-1426)
and the shape is centred on its own centroid before extrusion.

## Composition

- **Frame**: hero is a rounded card (radius ~24px) inset ~20px from the
  viewport, on the site blush (`#f4e5de`), filling 100svh.
- **Nav**: real links Home, Journey, Projects, Experiments, Contact in a frosted
  translucent pill, top centre. The `LogoMark` wordmark sits top-left. No
  language toggle.
- **Name**: "aayush" / "visuals", huge, centred, Aeonik, soft off-white
  `#ece6f5`.
- **Mark**: about 40% of the name's cap height, tilted ~15deg in 3D, placed so
  the bar passes in front of some letters and behind others; the dot hovers
  just off the bar.
- **Scroll lines**: six thin lines bottom-left, the active one longer.
- **Phone**: frame keeps its inset, name ~18vw and stacked tighter, mark scaled
  down and centred. Touch: glass while a finger is down.

## The 3D mark

- **Geometry** (`Mark.tsx`): two `THREE.Shape`s from the measurements above,
  extruded with `ExtrudeGeometry` (depth ~22% of bar width, bevel size ~6%,
  bevelSegments 6) so all edges are soft. The dot is a separate extruded circle
  (a thick coin), same depth.
- **Satin (rest)**: `MeshPhysicalMaterial`, colour gradient lilac `#c4b5fd` to
  violet `#7c3aed` (vertex colours by height), roughness ~0.35, clearcoat 0.6.
  Lighting: soft environment, a key light, and a warm magenta rim light
  (`#ff3d8b`) that echoes the background streak.
- **Glass (hover)**: drei `MeshTransmissionMaterial`, violet tint, thickness
  matching the extrusion, slight chromatic aberration. As built: ONE drei
  transmission material per shape whose glass amount (its `_transmission`
  uniform) animates 0 (satin) to 1 (glass) over ~0.5s, instead of two
  crossfading meshes - same look, half the meshes, no transparency sorting.
  `backside` is off (its back-face pass rendered the refraction buffer
  black). Hover is detected by raycasting the bar and dot.
- **Motion**:
  - idle float: gentle bob and sway, ~8s cycle
  - cursor tilt: up to ~12deg toward the pointer, critically damped spring
  - living dot: its own position/rotation spring with lower stiffness, so it
    trails the bar and settles a beat later
- **Intro**: after `preloader:done` (or immediately if there is no preloader),
  the mark's extrusion depth scales from 0 to full while the name fades up.
- **Reduced motion**: static tilted mark, no float, springs or intro; hover
  glass still works.

## Background

`Backdrop.tsx`: a full-frame plane at the back of the scene with a custom
fragment shader: slow flowing noise blending deep indigo `#1e0b4f`, electric
violet `#7c3aed` and lilac `#a78bfa`, with one magenta-pink streak `#ff3d8b`
that drifts and leans toward the cursor. Fine film grain on top.

## Why the name is drawn inside the scene

Glass in WebGL can only refract what WebGL renders, so "aayush visuals" is drawn
in the scene (`NameType.tsx`) so the glass hover visibly bends it. It is
rendered to a canvas texture using the page's already-loaded Aeonik font
(after `document.fonts.ready`) on a plane sized to the frame; drei `Text`
is not used because it cannot load the site's `.woff2` Aeonik files. The real text is also present in the DOM,
visually hidden, for search engines and screen readers. Depth ordering in the
scene gives the "through the name" weave for free.

## Files

- `app/test/zhu/page.tsx` - route, metadata (noindex)
- `components/test/zhu/ZhuHero.tsx` - frame, nav, scroll lines, hidden text,
  loads the canvas client-side only (`next/dynamic`, `ssr: false`) with a CSS
  gradient poster while it loads
- `components/test/zhu/Scene.tsx` - canvas, camera, lights, environment
- `components/test/zhu/Mark.tsx` - logo geometry, materials, hover, springs
- `components/test/zhu/Backdrop.tsx` - gradient shader plane
- `components/test/zhu/NameType.tsx` - in-scene name
- `components/test/zhu/zhu.css` - page styles (prefix `zh`)

New dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, imported
only from `components/test/zhu`, so other routes do not bundle them.

## Fallbacks and performance

- No WebGL: the same composition in HTML/CSS with a flat 2D SVG of the mark
  over a CSS gradient.
- Device pixel ratio capped at 2; the render loop pauses when the tab is
  hidden.
- Canvas sized to the frame, not the window, so the inset border is real DOM.

## Testing

- Desktop, tablet and phone widths in the browser preview.
- Hover-to-glass on desktop, press-to-glass on touch; cursor tilt and the
  dot's lag.
- Reduced motion path.
- Console clean; confirm `/`, `/about`, `/playground` do not load the three.js
  chunks.

## Out of scope

- Replacing the live homepage hero.
- The reference's language toggle and loader.
- A Blender-authored `.glb` (the shapes are built in code; can be exported
  later if hand-tuning is wanted).
