"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { smooth, type ScrollState } from "./scroll";
import * as THREE from "three";

/*
  "aayush / visuals" drawn INTO the 3D scene, so the glass mark can refract
  it. Painted to a canvas texture with the page's own Aeonik (read off the
  next/font CSS variable once fonts are ready), then mapped to a plane at
  z = 0.

  alphaTest means only the letters write depth: the mark, which straddles
  this plane, is hidden behind letters and shows through the gaps, which is
  the "passing through the name" weave.

  The real text lives in the DOM (visually hidden) for search and screen
  readers; this is the picture of it.
*/

const LINES = ["aayush", "visuals"];
const INK = "#ece6f5";

function paint(family: string) {
  const W = 2048,
    H = 1180;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = INK;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  /* size the type so the longer line fills ~96% of the canvas width */
  const trial = 400;
  g.font = `400 ${trial}px ${family}`;
  const widestTrial = Math.max(...LINES.map((l) => g.measureText(l).width));
  const size = Math.floor((trial * W * 0.96) / widestTrial);
  g.font = `400 ${size}px ${family}`;
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-0.02 * size}px`;
  const lead = size * 0.86;
  const asc = size * 0.72;
  const top = (H - (asc + lead)) / 2 + asc;
  LINES.forEach((l, i) => g.fillText(l, W / 2, top + i * lead));
  /* the longest line as drawn, at the final size (measuring it at the trial
     size understated it, so the width cap barely held) */
  const widest = Math.max(...LINES.map((l) => g.measureText(l).width));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  /* `size` and `widest` are canvas px; the caller turns them into world units */
  /* the top of the first line's ascenders, as a fraction of the canvas
     height - lets the page place things just above the name */
  const topFrac = (H - (asc + lead)) / 2 / H;
  return { tex, aspect: H / W, size, widest, W, topFrac };
}

/*
  Sized by LETTER SIZE, not width, like the reference: its two-line name
  block is ~0.42 of the frame height (font size ~0.266 H), capped so the
  longest line never passes `maxWidth`. Matching width instead made the
  6-letter "aayush" far taller than the 9-letter "guillaume".
*/
export default function NameType({
  fontSize,
  maxWidth,
  scroll,
  onReady,
  entered = true,
}: {
  fontSize: number;
  maxWidth: number;
  scroll: React.MutableRefObject<ScrollState>;
  /* called once the name is painted in the real font */
  onReady?: () => void;
  /* the hero has come in: the name fades in a beat after the mark has
     risen out of the loader, so the loader's last frame is the mark alone */
  entered?: boolean;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const enteredAt = useRef<number | null>(null);
  /* fades out over p 0.2 -> 0.4 as the camera swings away. alphaTest scales
     with the fade, so the letters keep writing depth (the weave) while they
     are visible, and the plane drops out entirely once gone */
  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    const now = state.clock.elapsedTime;
    if (entered && enteredAt.current === null) enteredAt.current = now;
    const intro = enteredAt.current === null ? 0 : smooth(now - enteredAt.current, 0.55, 1.35);
    const o = intro * (1 - smooth(scroll.current.p, 0.2, 0.4));
    m.opacity = o;
    m.alphaTest = 0.5 * o;
    m.visible = o > 0.002;
  });
  const [family, setFamily] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      const v = getComputedStyle(document.documentElement).getPropertyValue("--font-aeonik").trim();
      setFamily(v || "system-ui, sans-serif");
    });
    return () => {
      alive = false;
    };
  }, []);

  const painted = useMemo(() => (family ? paint(family) : null), [family]);
  useEffect(() => () => painted?.tex.dispose(), [painted]);
  useEffect(() => {
    if (painted) onReady?.();
  }, [painted, onReady]);

  /* plane width that renders the type at `fontSize` world units ... */
  let w = painted ? (fontSize * painted.W) / painted.size : 0;
  /* ... unless that makes the longest line wider than allowed */
  if (painted) {
    const lineW = (painted.widest * w) / painted.W;
    if (lineW > maxWidth) w *= maxWidth / lineW;
  }

  /* publish the name's top edge, in px from the frame's top at the resting
     camera, as --zh-name-top on the frame: the DOM tagline above the name
     (ZhuHero) is placed from it */
  const { viewport, size, gl } = useThree();
  useEffect(() => {
    if (!painted) return;
    const planeH = w * painted.aspect;
    const yTop = planeH * (0.5 - painted.topFrac);
    const px = ((viewport.height / 2 - yTop) / viewport.height) * size.height;
    const frame = gl.domElement.closest(".zh-frame") as HTMLElement | null;
    frame?.style.setProperty("--zh-name-top", `${px.toFixed(1)}px`);
  }, [painted, w, viewport.height, size.height, gl]);

  if (!painted) return null;
  return (
    /* the name never occludes the mark: it writes no depth and draws
       first (renderOrder 0; the mark's materials are in the same
       transparent pass at 1 and 2), so the mark always sits over it */
    <mesh position={[0, 0, 0]} scale={[w, w * painted.aspect, 1]} renderOrder={0}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={mat}
        map={painted.tex}
        transparent
        alphaTest={0.5}
        depthWrite={false}
        toneMapped={false}
        opacity={1}
      />
    </mesh>
  );
}
