# 3D Logo Hero (Zhu-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `/test/zhu` page replicating the guillaumezhu.com hero in the site purple, with Aayush's slash-and-dot logo as a real 3D object (satin at rest, glass on hover).

**Architecture:** One React Three Fiber canvas inside a rounded DOM frame renders, back to front: a shader gradient plane, the name "aayush / visuals" as a canvas-texture plane, and the extruded logo (bar + separate dot). DOM carries the frame, nav, scroll lines and visually hidden real text. Logo outlines come from a pure, tested geometry module.

**Tech Stack:** Next.js 16, React 19.2, three 0.186, @react-three/fiber 9, @react-three/drei 10, node:test.

## Global Constraints

- Route `/test/zhu`, `robots: { index: false, follow: false }`.
- Name text: "aayush" / "visuals"; Aeonik (`var(--font-aeonik)`); colour `#ece6f5`.
- Palette: indigo `#1e0b4f`, violet `#7c3aed`, lilac `#a78bfa`, satin lilac `#c4b5fd`, hot streak `#ff3d8b`, page blush `#f4e5de`.
- Logo measurements (2000px PNG): bar bottom x 318-736 at y 1426, top x 844-1262 at y 445, top-left corner radius 150; dot centre (1345, 1183) r 243; bbox x 318-1589, y 445-1426.
- three / r3f / drei imported only under `components/test/zhu/`, loaded via `next/dynamic` with `ssr: false`.
- prefers-reduced-motion: no float, springs or intro; glass hover still works.
- No em dashes in copy or comments.

## File Structure

- `components/test/zhu/markGeometry.ts` - pure outline maths (no three)
- `components/test/zhu/markGeometry.test.ts` - node:test
- `components/test/zhu/Backdrop.tsx` - gradient shader plane
- `components/test/zhu/NameType.tsx` - name as canvas texture plane
- `components/test/zhu/Mark.tsx` - extrusion, satin/glass crossfade, springs, hover
- `components/test/zhu/Scene.tsx` - Canvas, camera, lights, environment, pointer state
- `components/test/zhu/ZhuHero.tsx` - frame, nav, scroll lines, hidden text, dynamic Scene, poster + no-WebGL fallback
- `components/test/zhu/zhu.css` - styles, prefix `zh`
- `app/test/zhu/page.tsx` - route
- `package.json` - deps + test glob

### Task 1: Dependencies and the tested logo geometry

**Files:** Modify `package.json`; Create `components/test/zhu/markGeometry.ts`, `components/test/zhu/markGeometry.test.ts`

**Interfaces - Produces:**
`type Pt = [number, number]`;
`markOutline(): { bar: Pt[]; dot: { cx: number; cy: number; r: number } }` - bar is a closed polygon (rounded corner sampled as points), all in units where the mark is 1 tall, centred on its bbox centre, y up.

- [ ] Step 1: `npm i three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 && npm i -D @types/three`; add `"components/test/zhu/**/*.test.ts"` to the `test` script glob.
- [ ] Step 2: write `markGeometry.test.ts` asserting: bar y range is [-0.5, 0.5]; bottom edge width = 418/981; dot r = 243/981; the first bar point is on the left edge 150px (normalised) below the top; every point lies within x [-0.65, 0.65].
- [ ] Step 3: run `npm test`, expect FAIL (module missing).
- [ ] Step 4: implement `markOutline()` per the measurements (rounded corner = quadratic through the TL vertex, 10 samples).
- [ ] Step 5: run `npm test`, expect PASS.

### Task 2: Scene layers (Backdrop, NameType, Mark, Scene)

**Interfaces - Consumes:** `markOutline()`. **Produces:** `default export Scene({ reduced: boolean, entered: boolean })`.

- [ ] Backdrop: fullscreen plane, ShaderMaterial uniforms `uTime`, `uMouse` (vec2 -1..1); fbm noise mixing indigo/violet/lilac, a magenta streak band offset by `uMouse`, grain.
- [ ] NameType: canvas 2048 wide, two lines, Aeonik weight 400 after `document.fonts.ready`, `#ece6f5`; plane sized to the camera's view width x 0.82; z = 0.
- [ ] Mark: `THREE.Shape` from `bar` and `circle(dot)`; `ExtrudeGeometry` depth 0.22 x barWidth, bevelSize 0.06 x barWidth, bevelSegments 6; per shape a satin `meshPhysicalMaterial` (color `#a78bfa`, roughness 0.35, clearcoat 0.6, transparent) and a drei `MeshTransmissionMaterial` mesh (thickness = depth, chromaticAberration 0.06, transparent); hover (onPointerOver/Out on the bar or dot) drives `mix` 0..1 lerped over ~0.5s: satin opacity 1-mix, glass opacity mix. Group at z = 0.15 so the bar weaves with the name, tilt base rotation (x -0.15, y 0.35, z -0.05). useFrame: idle bob (8s) + spring toward pointer tilt (max 12deg); dot group uses a looser spring (stiffness half) toward the same target plus a small trailing offset. Intro: group scale.z 0.01 -> 1 when `entered`.
- [ ] Scene: `<Canvas dpr={[1,2]} camera={{ position: [0,0,5], fov: 35 }}>`, ambient + key directional + magenta rim point light (`#ff3d8b`), drei `Environment preset="studio"`; renders Backdrop, NameType, Mark; pauses (`frameloop="never"`) when `document.hidden`.

### Task 3: Page shell, fallbacks and route

- [ ] `ZhuHero.tsx`: `.zh` page (blush), `.zh-frame` rounded inset card 100svh minus 40px; nav pill (Home `/`, Journey `/about`, Projects `/work`, Experiments `/playground`, Contact `/contact`) + `LogoMark` top-left; six scroll lines bottom-left; visually hidden `<h1>Aayush Visuals</h1>`; CSS gradient poster under the canvas; `next/dynamic(() => import("./Scene"), { ssr: false })`; WebGL check -> fallback renders HTML name + flat SVG mark; `entered` set on `preloader:done` (or immediately when no `.ldr`).
- [ ] `app/test/zhu/page.tsx` with noindex metadata.
- [ ] `zhu.css`: frame radius 24px, inset 20px, nav pill frosted (`backdrop-filter: blur(18px)`, white 12% fill), phone rules.

### Task 4: Verify

- [ ] `npx tsc --noEmit`, `npm test`.
- [ ] Browser: desktop, tablet, phone; hover-to-glass; cursor tilt + dot lag; console clean; `/`, `/about`, `/playground` network has no three chunk.
