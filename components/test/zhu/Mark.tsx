"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import { markOutline } from "./markGeometry";
import { RISE, type ScrollState } from "./scroll";

/*
  Aayush's mark in 3D: the slanted bar and the dot, extruded with soft
  bevels from the measured outlines (markGeometry.ts).

  Two layers, the way the reference builds its logo:
    satin - the solid body, lilac-to-violet satin (per-vertex gradient)
    glass - a copy of the same geometry drawn on top with a glass shader.
            It samples the scene rendered WITHOUT the mark (an FBO this
            component fills each frame), wobbles it with noise, splits the
            colour slightly and adds a cool fresnel tint, so it reads as
            looking through glass.

  Hover (on an invisible box round the whole mark, so a spinning, edge-on
  mark does not flicker) eases a progress value to 1. The glass does not
  fade in: it DISSOLVES in, an organic noise threshold sweeping across the
  surface. Clicking while hovered sends a glowing ripple ring out from the
  click point.

  Motion: it opens face-on, reading as the logo, and holds there while the
  extrusion grows from flat; then a slow spin eases in about a slightly
  tilted axis, with a float, cursor tilt through springs, and the dot on a
  looser spring so it trails. Drag it to turn it yourself (with inertia);
  the auto spin eases back in after you let go. Reduced motion: still,
  face-on; hover glass and drag still work.

  This component also owns the render: useFrame priority 1 renders the scene
  into the FBO with the mark hidden, then renders it to the screen.
*/

/* the mark's gradient, from the backdrop's own palette: its violet at the
   foot, the magenta streak (softened to orchid) through the middle, its
   lilac at the head */
const VIOLET = new THREE.Color("#6d28d9");
const ORCHID = new THREE.Color("#b54ee6");
const LILAC = new THREE.Color("#c4a6ff");
/* a faint self-glow in the backdrop's tone, which rises over the scroll as
   the field brightens from indigo to lilac, so the mark keeps its place in
   the gradient rather than going dark against it */
const GLOW_START = new THREE.Color("#3b1a8f");
const GLOW_END = new THREE.Color("#8b5cf6");
const MAX_TILT = (10 * Math.PI) / 180;
/* the resting pose: face-on like the logo, with just enough turn to show
   the bar's edge */
const BASE = new THREE.Euler(-0.05, 0.2, 0);
const SPIN_AXIS = new THREE.Vector3(0.2, 1, 0.1).normalize();
const SPIN_SPEED = 0.2; // rad/s, as the reference
/* the intro holds the logo face-on this long before the spin eases in */
const HOLD = 1.8;
/* drag: radians per pixel, and how fast a flick's inertia dies */
const DRAG_RATE = 0.008;
const DRAG_DECAY = 3;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

function gradientize(geo: THREE.BufferGeometry, yMin: number, yMax: number) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - yMin) / (yMax - yMin), 0, 1);
    if (t < 0.5) c.copy(VIOLET).lerp(ORCHID, t / 0.5);
    else c.copy(ORCHID).lerp(LILAC, (t - 0.5) / 0.5);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
}

function useMarkGeometry() {
  return useMemo(() => {
    const { bar, dot } = markOutline();
    const barW = 418 / 981;
    const depth = 0.22 * barW;
    const bevel = 0.06 * barW;
    const opts: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 48,
    };
    const barGeo = new THREE.ExtrudeGeometry(new THREE.Shape(bar.map(([x, y]) => new THREE.Vector2(x, y))), opts);
    barGeo.translate(0, 0, -depth / 2);
    const dotShape = new THREE.Shape();
    dotShape.absarc(0, 0, dot.r, 0, Math.PI * 2, false);
    const dotGeo = new THREE.ExtrudeGeometry(dotShape, opts);
    dotGeo.translate(0, 0, -depth / 2);
    gradientize(barGeo, -0.5, 0.5);
    gradientize(dotGeo, -0.5 - dot.cy, 0.5 - dot.cy);
    barGeo.computeVertexNormals();
    dotGeo.computeVertexNormals();
    return { barGeo, dotGeo, dot, depth };
  }, []);
}

/* ---------- the glass layer ---------- */

const glassVert = /* glsl */ `
  uniform float uSurfaceOffset;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec4 vScreen;
  void main() {
    vec4 world = modelMatrix * vec4(position + normal * uSurfaceOffset, 1.0);
    vPosition = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vScreen = projectionMatrix * viewMatrix * world;
    gl_Position = vScreen;
  }
`;

const glassFrag = /* glsl */ `
  uniform sampler2D uScene;
  uniform float uTime;
  uniform float uHover;
  uniform float uRevealEdge;
  uniform float uNoiseScale;
  uniform float uDistort;
  uniform float uSplit;
  uniform float uFresnelPower;
  uniform vec3 uClickPoint;
  uniform float uClickTime;
  uniform float uClick;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec4 vScreen;

  float h3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float n3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), uFresnelPower);

    /* the dissolve: glass appears where slow organic noise falls under the
       hover progress, with a soft edge, so it spreads in blotches */
    float organic = n3(vPosition * uNoiseScale + vec3(0.0, uTime * 0.1, 0.0));
    float reveal = smoothstep(1.0 - uHover, 1.0 - uHover + uRevealEdge, organic);

    /* the click ripple: rings travelling out from the click point */
    float d = distance(vPosition, uClickPoint);
    float mask = 1.0 - smoothstep(0.0, 1.2, d);
    float warp = (n3(vPosition * uNoiseScale * 8.0 + vec3(0.0, uTime * 0.35, 4.2)) - 0.5) * 0.05;
    float ring = sin((d + warp) * 20.0 - (uTime - uClickTime) * 7.0);
    float wave = ring * mask * uClick * uHover;
    float line = smoothstep(0.99, 1.0, abs(ring));
    float halo = smoothstep(0.9, 1.0, abs(ring));

    vec2 uv = vScreen.xy / vScreen.w * 0.5 + 0.5;
    vec2 dir = vec2(
      n3(vPosition * 2.0 + vec3(uTime * 0.1, 0.0, 0.0)) - 0.5,
      n3(vPosition * 2.0 + vec3(12.4, uTime * 0.1, 7.8)) - 0.5);
    /* lensing: like a thick pane, the view bends harder toward the rim, along
       the surface's screen-space normal */
    vec2 sn = (viewMatrix * vec4(n, 0.0)).xy;
    vec2 lens = -sn * pow(fresnel, 1.6) * 0.045;
    vec2 offset = (dir * uDistort + lens) * reveal * uHover + normalize(dir + 1e-4) * wave * 0.02;
    vec2 split = normalize(offset + 1e-4) * uSplit * (1.0 + halo * mask * uClick * 2.0) * reveal * uHover;

    /* a soft frost: a small ring of taps round the refracted point, each
       colour-split, averaged */
    vec3 col = vec3(0.0);
    for (int k = 0; k < 6; k++) {
      float ang = float(k) * 1.0472;
      vec2 o = offset + vec2(cos(ang), sin(ang)) * 0.0045;
      col += vec3(
        texture2D(uScene, uv + o + split).r,
        texture2D(uScene, uv + o).g,
        texture2D(uScene, uv + o - split).b);
    }
    col /= 6.0;

    /* Apple-style dark glass: what is behind reads a little darker and
       richer through the pane, with a faint smoky violet body tint */
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.22);
    col *= 0.78;
    col = mix(col, vec3(0.07, 0.05, 0.14), 0.16 + 0.1 * fresnel);

    /* the crisp rim: a thin bright line only at the true silhouette (very
       high fresnel), so a mark seen at a glancing angle does not wash out
       white; plus a soft inner sheen from the top */
    float rim = smoothstep(0.86, 0.99, fresnel);
    col += vec3(0.95, 0.93, 1.0) * rim * 0.45;
    col += vec3(1.0) * pow(max(n.y, 0.0), 6.0) * 0.08;

    col += vec3(0.85, 0.95, 1.0) * (line * 0.8 + halo * 0.15) * mask * uClick * uHover * 0.6;

    gl_FragColor = vec4(col, reveal * uHover);
    /* no tone-mapping / colour-space step here: the FBO already holds
       display-ready colour, and converting it again washed the glass out
       to a pale milky film */
  }
`;

type Spring = { x: number; y: number; vx: number; vy: number };
const step = (s: Spring, tx: number, ty: number, k: number, damp: number) => {
  s.vx = (s.vx + (tx - s.x) * k) * damp;
  s.vy = (s.vy + (ty - s.y) * k) * damp;
  s.x += s.vx;
  s.y += s.vy;
};

export default function Mark({
  scale,
  reduced,
  entered,
  scroll,
}: {
  scale: number;
  reduced: boolean;
  entered: boolean;
  scroll: React.MutableRefObject<ScrollState>;
}) {
  const { barGeo, dotGeo, dot } = useMarkGeometry();
  const { gl, scene, camera } = useThree();
  const fbo = useFBO({ samples: 4 });

  const root = useRef<THREE.Group>(null);
  const spinG = useRef<THREE.Group>(null);
  const barG = useRef<THREE.Group>(null);
  const dotG = useRef<THREE.Group>(null);
  const markMeshes = useRef<THREE.Mesh[]>([]);

  const hovered = useRef(false);
  const hover = useRef(0);
  const click = useRef(0);
  const depthScale = useRef(reduced ? 1 : 0.02);
  const barS = useRef<Spring>({ x: 0, y: 0, vx: 0, vy: 0 });
  /* scroll speed briefly spins the mark faster, then settles (reference) */
  const boost = useRef(0);
  const rise = useRef(0);
  const dotS = useRef<Spring>({ x: 0, y: 0, vx: 0, vy: 0 });
  /* 0 -> 1: the auto spin's share, held at 0 through the intro and while
     the user is turning the mark */
  const spinRate = useRef(0);
  const enteredAt = useRef<number | null>(null);
  /* drag-to-rotate */
  const dragging = useRef(false);
  const dragVel = useRef({ x: 0, y: 0 }); // rad/s about world y / x
  const pending = useRef({ x: 0, y: 0 }); // rad, accumulated since last frame
  const last = useRef({ x: 0, y: 0, t: 0 });
  const moved = useRef(0);

  const satin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.34,
        clearcoat: 0.6,
        clearcoatRoughness: 0.22,
        envMapIntensity: 0.9,
      }),
    [],
  );
  const glass = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glassVert,
        fragmentShader: glassFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        /* the glass sits on the satin body's own surface: without a depth
           bias the two z-fight at glancing angles (speckles, satin showing
           through as a milky film). Offset it toward the camera so it
           always wins the depth test where it is revealed */
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -8,
        uniforms: {
          uScene: { value: null },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uRevealEdge: { value: 0.1 },
          uNoiseScale: { value: 2 },
          uDistort: { value: 0.025 },
          uSplit: { value: 0.0045 },
          uFresnelPower: { value: 1.2 },
          uSurfaceOffset: { value: 0.003 },
          uClickPoint: { value: new THREE.Vector3(999, 999, 999) },
          uClickTime: { value: -10 },
          uClick: { value: 0 },
        },
      }),
    [],
  );

  /* dev only: force the glass state, and count hover hits, for QA */
  const forced = useRef<number | null>(null);
  const hits = useRef(0);
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const w = window as Window & { __zh?: { glass: (v: number | null) => void; hits: () => number } };
    w.__zh = { glass: (v) => (forced.current = v), hits: () => hits.current };
  }

  /* priority 1: this frame callback takes over rendering */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const u = glass.uniforms;
    u.uTime.value = t;

    hover.current = THREE.MathUtils.damp(hover.current, forced.current ?? (hovered.current ? 1 : 0), 4.5, dt);
    u.uHover.value = hover.current;
    click.current = THREE.MathUtils.damp(click.current, 0, 3.5, dt);
    u.uClick.value = click.current;

    /* the glow follows the backdrop's brightening over the scroll */
    const sp = scroll.current.p;
    satin.emissive.copy(GLOW_START).lerp(GLOW_END, sp);
    satin.emissiveIntensity = 0.08 + 0.12 * sp;

    if (entered) depthScale.current = THREE.MathUtils.damp(depthScale.current, 1, reduced ? 100 : 2.6, dt);

    /* the turn the user drags in, then its inertia */
    const sg = spinG.current;
    if (sg) {
      const pd = pending.current;
      if (dragging.current) {
        if (dt > 0) {
          dragVel.current.x = THREE.MathUtils.lerp(dragVel.current.x, pd.x / dt, 0.5);
          dragVel.current.y = THREE.MathUtils.lerp(dragVel.current.y, pd.y / dt, 0.5);
        }
        sg.rotateOnWorldAxis(Y_AXIS, pd.x);
        sg.rotateOnWorldAxis(X_AXIS, pd.y);
      } else {
        const k = Math.exp(-DRAG_DECAY * dt);
        dragVel.current.x *= k;
        dragVel.current.y *= k;
        sg.rotateOnWorldAxis(Y_AXIS, dragVel.current.x * dt);
        sg.rotateOnWorldAxis(X_AXIS, dragVel.current.y * dt);
      }
      pd.x = pd.y = 0;
    }

    if (entered && enteredAt.current === null) enteredAt.current = t;
    const held = enteredAt.current === null || t - enteredAt.current < HOLD;
    const flick = Math.hypot(dragVel.current.x, dragVel.current.y);
    const spinTarget = held || dragging.current || flick > 0.3 ? 0 : 1;
    spinRate.current = THREE.MathUtils.damp(spinRate.current, spinTarget, spinTarget ? 0.9 : 6, dt);

    if (!reduced) {
      step(barS.current, -state.pointer.y * MAX_TILT, state.pointer.x * MAX_TILT, 0.06, 0.8);
      step(dotS.current, -state.pointer.y * MAX_TILT, state.pointer.x * MAX_TILT, 0.026, 0.88);
      boost.current = Math.max(boost.current, Math.min(1, Math.abs(scroll.current.v) / 2000) * 2.5);
      boost.current = THREE.MathUtils.damp(boost.current, 0, 1.5, dt);
      spinG.current?.rotateOnAxis(SPIN_AXIS, (SPIN_SPEED * spinRate.current + boost.current) * dt);
    }

    const r = root.current;
    if (r) {
      r.scale.set(scale, scale, scale * depthScale.current);
      /* rides up with the camera over the pin, so it stays centred */
      rise.current += (scroll.current.p * RISE - rise.current) * Math.min(1, dt * 10);
      r.position.y = rise.current + (reduced ? 0 : Math.sin((t / 8) * Math.PI * 2) * 0.04);
    }
    barG.current?.rotation.set(BASE.x + barS.current.x, BASE.y + barS.current.y, BASE.z);
    dotG.current?.rotation.set(BASE.x + dotS.current.x, BASE.y + dotS.current.y, BASE.z);

    /* the scene behind the mark, for the glass to look through */
    markMeshes.current.forEach((m) => (m.visible = false));
    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    markMeshes.current.forEach((m) => (m.visible = true));
    gl.setRenderTarget(null);
    u.uScene.value = fbo.texture;
    gl.render(scene, camera);
  }, 1);

  /* drag-to-rotate: once a press lands on the mark, the window follows the
     pointer (so a drag can leave the box). On touch the canvas is
     touch-action: pan-y, so a sideways swipe turns the mark and a vertical
     one still scrolls the page (the browser cancels the pointer) */
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current.x = e.clientX;
      last.current.y = e.clientY;
      moved.current += Math.abs(dx) + Math.abs(dy);
      pending.current.x += dx * DRAG_RATE;
      pending.current.y += dy * DRAG_RATE;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = hovered.current ? "grab" : "";
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
    };
  }, []);

  /* hover + click are read off an invisible box round the whole mark */
  const enter = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === "touch") return;
    hits.current++;
    hovered.current = true;
    if (!dragging.current) document.body.style.cursor = "grab";
  };
  const leave = () => {
    hovered.current = false;
    if (!dragging.current) document.body.style.cursor = "";
  };
  const press = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = true;
    moved.current = 0;
    last.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now() };
    dragVel.current = { x: 0, y: 0 };
    if (e.pointerType !== "touch") document.body.style.cursor = "grabbing";
    if (e.pointerType === "touch") hovered.current = true; // touch: glass while held
    if (hover.current > 0.75 || e.pointerType === "touch") {
      glass.uniforms.uClickPoint.value.copy(e.point);
      glass.uniforms.uClickTime.value = glass.uniforms.uTime.value;
      click.current = 1;
    }
  };
  const release = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === "touch") hovered.current = false;
  };

  const keep = (m: THREE.Mesh | null) => {
    if (m && !markMeshes.current.includes(m)) markMeshes.current.push(m);
  };

  return (
    <group ref={root} position={[0, 0, 0.05]}>
      <group ref={spinG}>
        <group ref={barG}>
          <mesh ref={keep} geometry={barGeo} material={satin} renderOrder={1} />
          <mesh ref={keep} geometry={barGeo} material={glass} renderOrder={2} />
        </group>
        <group ref={dotG}>
          <group position={[dot.cx, dot.cy, 0]}>
            <mesh ref={keep} geometry={dotGeo} material={satin} renderOrder={1} />
            <mesh ref={keep} geometry={dotGeo} material={glass} renderOrder={2} />
          </group>
        </group>
      </group>
      <mesh onPointerOver={enter} onPointerOut={leave} onPointerDown={press} onPointerUp={release}>
        <boxGeometry args={[1.35, 1.1, 0.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
