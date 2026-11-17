"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { DescentCard } from "./cards";
import { finaleBlend, finalePosition, restPosition } from "./cardLayout";
import { makeCurve } from "./path";
import type { DescentProgress } from "./useDescentScroll";

export type ScreenPoint = {
  x: number;
  y: number;
  /** NDC depth; > 1 means the panel is behind the camera */
  z: number;
  /** world-space distance from the camera, in scene units */
  dist: number;
  /** 0 on the way down, 1 once the cards have gathered in the chamber */
  finale: number;
};
export type ScreenMap = Map<string, ScreenPoint>;

/*
  The cards' presence in the world: one lit panel each, and the screen
  position the DOM overlay needs in order to sit on top of it.

  The panel is here and the content is in the DOM on purpose. A panel in
  the scene is lit, occluded and fogged like everything else, so the cards
  belong to the world; but the text stays DOM, which means crisp type at
  any pixel ratio, real links, real focus order and real SEO. Projecting
  eight world positions to screen space is eight matrix multiplies a
  frame, which is nothing.
*/
export default function CardAnchors({
  cards,
  progress,
  screens,
}: {
  cards: DescentCard[];
  progress: React.RefObject<DescentProgress>;
  screens: React.RefObject<ScreenMap>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const curve = useMemo(() => makeCurve(), []);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  /* computed once: the resting spot for each card beside the path, and
     the ring position it flies to in the chamber */
  const rest = useMemo(
    () => cards.map((c, i) => restPosition(curve, c, i, new THREE.Vector3())),
    [cards, curve]
  );
  const ring = useMemo(
    () => cards.map((_, i) => finalePosition(i, cards.length, new THREE.Vector3())),
    [cards]
  );

  const world = useRef(new THREE.Vector3());
  const ndc = useRef(new THREE.Vector3());

  useFrame(() => {
    const p = progress.current.p;
    const blend = finaleBlend(p);
    const map = screens.current;

    for (let i = 0; i < cards.length; i++) {
      /* lerp from the untouched rest array every frame rather than
         accumulating, so the gather is reversible on the way back up */
      world.current.copy(rest[i]).lerp(ring[i], blend);

      const mesh = meshes.current[i];
      if (mesh) {
        mesh.position.copy(world.current);
        mesh.lookAt(camera.position);
      }

      /*
        Distance matters as much as depth here. A DOM card is the same
        size however far away its panel is, so without this a card
        eighty units down the chasm would hang at full size beside a
        panel the size of a full stop. The overlay fades it out instead.
      */
      const dist = world.current.distanceTo(camera.position);

      ndc.current.copy(world.current).project(camera);
      map.set(cards[i].id, {
        x: (ndc.current.x * 0.5 + 0.5) * size.width,
        y: (-ndc.current.y * 0.5 + 0.5) * size.height,
        /* z > 1 means behind the camera; the overlay hides those */
        z: ndc.current.z,
        dist,
        finale: blend,
      });
    }
  });

  return (
    <group>
      {cards.map((c, i) => (
        <mesh
          key={c.id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={rest[i]}
        >
          <boxGeometry args={[6, 3.8, 0.25]} />
          <meshStandardMaterial
            color="#13121c"
            emissive={c.act === "chasm" ? "#5ff0b0" : "#ff7a2f"}
            emissiveIntensity={0.5}
            flatShading
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
