"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import CardAnchors, { type ScreenMap } from "./CardAnchors";
import Terrain from "./Terrain";
import type { DescentCard } from "./cards";
import { cameraAt, lookAtAt, makeCurve } from "./path";
import type { Tier } from "./quality";
import type { DescentProgress } from "./useDescentScroll";

/*
  The render loop runs only while the page is actually being looked at.

  components/test/zhu/Scene.tsx gates its loop on an IntersectionObserver,
  because the hero canvas scrolls away and the rest of the homepage carries
  on beneath it. That does not transfer here: this canvas is position:fixed
  and covers the viewport for the whole page, so it is *always*
  intersecting and the observer would never once fire.

  What is worth gating on instead is whether the tab is frontmost. A
  backgrounded tab still runs rAF in some browsers, and a 3D scene drawing
  into a tab nobody is looking at is the same waste the audit measured on
  the hero.

  The clock is saved and restored across the pause for the same reason as
  the hero: R3F's setFrameloop resets clock.elapsedTime, and anything timed
  off it would otherwise jump when the tab comes back.
*/
function LoopGate({ live }: { live: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);
  const saved = useRef<number | null>(null);

  useEffect(() => {
    if (!live) {
      saved.current = clock.elapsedTime;
      setFrameloop("never");
    } else if (saved.current !== null) {
      setFrameloop("always");
      clock.elapsedTime = saved.current;
      saved.current = null;
    }
  }, [live, clock, setFrameloop]);

  return null;
}

/* The camera rides the curve. Both vectors are allocated once and written
   into every frame — a new Vector3 per frame is 60 allocations a second
   for the whole visit. */
function Rig({ progress }: { progress: React.RefObject<DescentProgress> }) {
  const curve = useMemo(() => makeCurve(), []);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const p = progress.current.p;
    cameraAt(curve, p, pos.current);
    lookAtAt(curve, p, look.current);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}

export default function DescentScene({
  cards,
  progress,
  screens,
  tier,
}: {
  cards: DescentCard[];
  progress: React.RefObject<DescentProgress>;
  screens: React.RefObject<ScreenMap>;
  tier: Tier;
}) {
  const [live, setLive] = useState(true);

  useEffect(() => {
    const onVisibility = () => setLive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className="descent__canvas" aria-hidden>
      <Canvas
        dpr={[1, tier.maxDpr]}
        camera={{ fov: 52, near: 0.5, far: 420 }}
        gl={{ antialias: !tier.post, powerPreference: "high-performance" }}
      >
        <LoopGate live={live} />
        <Rig progress={progress} />
        <Atmosphere progress={progress} />
        <Terrain segments={tier.terrainSegments} />
        <CardAnchors cards={cards} progress={progress} screens={screens} />
      </Canvas>
    </div>
  );
}
