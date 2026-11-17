"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { fogColorAt } from "./palette";
import type { DescentProgress } from "./useDescentScroll";

/*
  Fog, background and the two lights, all driven off progress.

  The colour arc itself lives in palette.ts so it can be unit-tested; this
  component only applies it. Scene background and fog share one Color
  instance rather than allocating per frame.
*/
export default function Atmosphere({
  progress,
}: {
  progress: React.RefObject<DescentProgress>;
}) {
  const scene = useThree((s) => s.scene);
  const key = useRef(new THREE.Color("#cdbb92"));
  const fog = useRef(new THREE.Fog(key.current, 18, 180));
  const gold = useRef<THREE.DirectionalLight>(null);
  const under = useRef<THREE.DirectionalLight>(null);

  if (scene.fog !== fog.current) {
    scene.fog = fog.current;
    scene.background = key.current;
  }

  useFrame(() => {
    const p = progress.current.p;
    fogColorAt(p, key.current);
    fog.current.color.copy(key.current);

    /* the dawn light dies as you fall; the forge takes over from below */
    if (gold.current) gold.current.intensity = 1.5 * (1 - Math.min(1, p / 0.55));
    if (under.current) under.current.intensity = 0.25 + 1.5 * Math.max(0, (p - 0.45) / 0.55);
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight ref={gold} position={[26, 70, 34]} intensity={1.5} color="#ffd79a" />
      <directionalLight ref={under} position={[-10, -70, -6]} intensity={0.25} color="#ff7a2f" />
    </>
  );
}
