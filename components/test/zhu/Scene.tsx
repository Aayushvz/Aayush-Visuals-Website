"use client";

import { useCallback, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import Backdrop from "./Backdrop";
import NameType from "./NameType";
import Mark from "./Mark";
import Roles from "./Roles";
import { ORBIT, RISE, type ScrollState } from "./scroll";

/*
  The hero's one canvas: a 360deg backdrop round everything, the name at
  z 0, the mark straddling it, and the two roles off to the side where the
  scroll's camera orbit ends. Lit by a studio-style environment built from
  Lightformers (no HDR download), a key light, and a hot magenta rim that
  echoes the backdrop's streak.

  Loaded only on /test/zhu via next/dynamic, so three.js never reaches the
  other routes.
*/

/*
  The scroll choreography's camera, after the reference: it orbits 90deg
  round the mark (ending on its side, looking along +x) while rising RISE
  units, always looking at the mark's height. Eased a touch so a wheel's
  steps read as one glide.
*/
/*
  The key light and the magenta rim ride along with the camera: lit from
  fixed spots, the face the camera ends on (after the 90deg orbit) was in
  shadow and read as a dull plum against the bright end gradient. Placed in
  camera space they light every view the way they light the first one.
*/
function CameraRig({ scroll }: { scroll: React.MutableRefObject<ScrollState> }) {
  const p = useRef(0);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  useFrame((state, dt) => {
    p.current += (scroll.current.p - p.current) * Math.min(1, dt * 10);
    const a = -p.current * Math.PI * 0.5;
    const y = p.current * RISE;
    const fx = Math.sin(a), fz = Math.cos(a); // toward the camera
    const rx = Math.cos(a), rz = -Math.sin(a); // camera right
    state.camera.position.set(fx * ORBIT, y, fz * ORBIT);
    state.camera.lookAt(0, y, 0);
    /* the original spots, (3, 4, 5) and (-3.2, -1.2, 1.5), in camera space */
    key.current?.position.set(rx * 3 + fx * 5, y + 4, rz * 3 + fz * 5);
    key.current?.target.position.set(0, y, 0);
    key.current?.target.updateMatrixWorld();
    rim.current?.position.set(-rx * 3.2 + fx * 1.5, y - 1.2, -rz * 3.2 + fz * 1.5);
  });
  return (
    <>
      <directionalLight ref={key} intensity={1.6} color="#fff6ff" />
      <pointLight ref={rim} intensity={18} distance={9} color="#ff3d8b" />
    </>
  );
}

/*
  The load gate. The first frames after mount are wrong - the Lightformer
  environment and shaders are still compiling, so the satin reads flat and
  pale, and the name is not painted yet. Once the name is in, wait a few
  rendered frames, then report ready: the canvas fades in over the CSS
  poster and the intro starts from there.
*/
function ReadyGate({ armed, onReady }: { armed: boolean; onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (!armed || done.current) return;
    if (++frames.current >= 8) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

function Content({
  reduced,
  entered,
  scroll,
  onReady,
}: {
  reduced: boolean;
  entered: boolean;
  scroll: React.MutableRefObject<ScrollState>;
  onReady: () => void;
}) {
  const [named, setNamed] = useState(false);
  const [ready, setReady] = useState(false);
  const nameIn = useCallback(() => setNamed(true), []);
  const allIn = useCallback(() => {
    setReady(true);
    onReady();
  }, [onReady]);
  const { viewport } = useThree();
  const phone = viewport.width < viewport.height;
  /* sized off the frame HEIGHT, like the reference: the two-line name block
     is ~0.42 H (font ~0.266 H), never wider than 80% of the frame (88% on
     phones); the mark stands ~0.3 H, smaller than the name block */
  /* 1.2x the reference's letter size, at the user's request */
  /* phones (after the reference's phone view): the name fills the width -
     the font asks for more than fits, so the 88% width cap decides - and
     the mark stands tall through both lines */
  const fontSize = viewport.height * (phone ? 0.2 : 0.32);
  /* phones, smaller on request: the name to 72% of the width (was 88%),
     the mark to ~0.4 W (was ~0.62 W) */
  const maxWidth = viewport.width * (phone ? 0.72 : 0.84);
  const markScale = phone ? Math.min(viewport.height * 0.2, viewport.width * 0.4) : Math.min(viewport.height * 0.3, viewport.width * 0.3);
  return (
    <>
      <Backdrop reduced={reduced} />
      <CameraRig scroll={scroll} />
      <NameType fontSize={fontSize} maxWidth={maxWidth} scroll={scroll} onReady={nameIn} entered={entered && ready} />
      <Mark scale={markScale} reduced={reduced} entered={entered && ready} scroll={scroll} />
      <ReadyGate armed={named} onReady={allIn} />
      <Roles scroll={scroll} />
    </>
  );
}

export default function Scene({
  reduced,
  entered,
  scroll,
  onShown,
}: {
  reduced: boolean;
  entered: boolean;
  scroll: React.MutableRefObject<ScrollState>;
  /* the lit scene is on screen (the loader waits for this to hand off) */
  onShown?: () => void;
}) {
  const [shown, setShown] = useState(false);
  const show = useCallback(() => {
    setShown(true);
    onShown?.();
  }, [onShown]);
  return (
    <Canvas
      className={`zh-canvas${shown ? " is-ready" : ""}`}
      dpr={[1, 2]}
      /* size from the layout box (offsetWidth/Height), not the on-screen
         rect: the frame's exit squeeze is a CSS scale, and measuring through
         it shrank the canvas, which the scale then shrank again - the poster
         showed along the right and bottom edges as the hero scrolled away */
      resize={{ offsetSize: true, scroll: false }}
      camera={{ position: [0, 0, 5], fov: 35 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.35} />
      {/* The mark reflects the hero's OWN backdrop: the same 360deg gradient
          shader, rendered into the environment cube (live, so its drift and
          streak move in the reflections too), plus one soft white strip for
          a highlight. So the mark's colour always comes from the field it
          sits in, shifting as it turns - as the reference's does - rather
          than a fixed paint that fights it. */}
      <Environment resolution={128} frames={reduced ? 1 : Infinity}>
        <Backdrop reduced={reduced} />
        <Lightformer form="rect" intensity={1.6} position={[0, 4, 3]} scale={[8, 1.5, 1]} color="#ffffff" />
      </Environment>
      <Content reduced={reduced} entered={entered} scroll={scroll} onReady={show} />
    </Canvas>
  );
}
