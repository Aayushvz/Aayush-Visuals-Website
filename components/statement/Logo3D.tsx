"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/*
  A tool logo as a solid object: the logo's own SVG shapes, extruded with a
  soft bevel and lit like a studio render, each piece keeping its brand
  colour (Figma's five pieces stay five colours). It sways slowly in 3D.

  One small canvas per logo, inside the tile Statement already lays out, so
  placement, entrance and scroll parallax all stay in CSS. Built to be cheap:
  the canvas mounts only once the tile is near the viewport, renders only
  while it is on screen, and the geometry is made once.
*/

/* the marks, as plain SVG (same drawings as the flat fallbacks in
   Statement.tsx) */
const SVGS: Record<string, string> = {
  figma: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">
    <path d="M12 0H6a6 6 0 0 0 0 12h6V0Z" fill="#F24E1E"/>
    <path d="M12 0h6a6 6 0 0 1 0 12h-6V0Z" fill="#FF7262"/>
    <path d="M12 12H6a6 6 0 0 0 0 12h6V12Z" fill="#A259FF"/>
    <path d="M18 24a6 6 0 1 0 0-12h-6v6a6 6 0 0 0 6 6Z" fill="#1ABCFE"/>
    <path d="M12 24H6a6 6 0 1 0 6 6v-6Z" fill="#0ACF83"/></svg>`,
  framer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M4 0h16v8h-8ZM4 8h8l8 8H4ZM4 16h8v8Z" fill="#F2EDE6"/></svg>`,
  claude: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#D97757">
    <rect x="10.8" y="1" width="2.4" height="22" rx="1.2"/>
    <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(45 12 12)"/>
    <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(90 12 12)"/>
    <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(135 12 12)"/></g></svg>`,
  vector: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M14.65 3H22v14.7L14.65 3z" fill="#FF2200"/>
    <path d="M9.35 3H2v14.7L9.35 3z" fill="#FA0F00"/>
    <path d="M12 8.7L19.7 21H15.4L12 15.6L8.6 21H4.3L12 8.7z" fill="#ED1C24"/></svg>`,
};

/* resting turn per logo (x, y), so they don't all face the same way */
const POSE: Record<string, [number, number]> = {
  figma: [0.22, -0.55],
  framer: [0.18, 0.5],
  claude: [0.3, -0.4],
  vector: [0.2, 0.5],
};

/* thickness and bevel, as a share of the logo's largest side */
const DEPTH = 0.13;
const BEVEL = 0.025;

type Part = { geo: THREE.ExtrudeGeometry; color: string };

function build(svg: string): Part[] {
  const data = new SVGLoader().parse(svg);
  /* sample every shape, flipping y (SVG is y-down) */
  const flat: { pts: THREE.Vector2[]; holes: THREE.Vector2[][]; color: string }[] = [];
  data.paths.forEach((path) => {
    const fill = (path.userData?.style as { fill?: string } | undefined)?.fill;
    if (!fill || fill === "none") return;
    SVGLoader.createShapes(path).forEach((shape) => {
      const flip = (v: THREE.Vector2) => new THREE.Vector2(v.x, -v.y);
      flat.push({
        pts: shape.getPoints(36).map(flip),
        holes: shape.holes.map((h) => h.getPoints(36).map(flip)),
        color: fill,
      });
    });
  });
  const box = new THREE.Box2();
  flat.forEach((f) => f.pts.forEach((p) => box.expandByPoint(p)));
  const size = box.getSize(new THREE.Vector2());
  const centre = box.getCenter(new THREE.Vector2());
  const max = Math.max(size.x, size.y) || 1;

  return flat.map((f, i) => {
    const shape = new THREE.Shape(f.pts);
    f.holes.forEach((h) => shape.holes.push(new THREE.Path(h)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: max * DEPTH,
      bevelEnabled: true,
      bevelThickness: max * BEVEL,
      bevelSize: max * BEVEL * 0.8,
      bevelSegments: 5,
      curveSegments: 24,
    });
    /* centred and normalised to a unit-sized logo; overlapping pieces (the
       Claude bars) are nudged apart in z so their faces never flicker */
    geo.translate(-centre.x, -centre.y, -(max * DEPTH) / 2 + i * max * 0.002);
    geo.scale(1 / max, 1 / max, 1 / max);
    geo.computeVertexNormals();
    return { geo, color: f.color };
  });
}

function Model({ id, phase, still }: { id: string; phase: number; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => build(SVGS[id]), [id]);
  const mats = useMemo(
    () =>
      parts.map(
        (p) =>
          new THREE.MeshPhysicalMaterial({
            color: p.color,
            roughness: 0.42,
            clearcoat: 0.35,
            clearcoatRoughness: 0.4,
          }),
      ),
    [parts],
  );
  useEffect(
    () => () => {
      parts.forEach((p) => p.geo.dispose());
      mats.forEach((m) => m.dispose());
    },
    [parts, mats],
  );

  const [bx, by] = POSE[id] ?? [0.2, 0.4];
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    if (still) {
      g.rotation.set(bx, by, 0);
      return;
    }
    const t = state.clock.elapsedTime + phase;
    g.rotation.set(bx + Math.sin(t * 0.42) * 0.09, by + Math.sin(t * 0.55) * 0.3, Math.sin(t * 0.33) * 0.04);
    g.position.y = Math.sin(t * 0.8) * 0.035;
  });

  return (
    <group ref={group}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={mats[i]} />
      ))}
    </group>
  );
}

export default function Logo3D({
  id,
  phase = 0,
  onReady,
}: {
  id: string;
  phase?: number;
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = wrap.current;
    if (!el) return;
    /* mount when the tile is within a screen of the viewport */
    const nearIo = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          nearIo.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    /* and only draw frames while it is actually on screen */
    const visIo = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    nearIo.observe(el);
    visIo.observe(el);
    return () => {
      nearIo.disconnect();
      visIo.disconnect();
    };
  }, []);

  return (
    <div className="toolTile__3d" ref={wrap} aria-hidden>
      {near && (
        <Canvas
          flat
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [0, 0, 2.7], fov: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          onCreated={() => onReady?.()}
        >
          <hemisphereLight args={["#ffffff", "#2a2a33", 0.9]} />
          <directionalLight position={[2.2, 3, 4]} intensity={1.9} />
          <directionalLight position={[-3, -1.5, 2]} intensity={0.45} color="#c9d4ff" />
          <Model id={id} phase={phase} still={still} />
        </Canvas>
      )}
    </div>
  );
}
