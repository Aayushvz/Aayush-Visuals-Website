"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { heightField } from "./terrainMath";

/*
  The ridge at the top and the forge floor at the bottom, both displaced
  from generated height fields.

  Flat shading is doing the art direction: a faceted surface reads as a
  deliberate low-poly style, where a smoothed one would just read as a
  surface that failed. Nothing here is loaded — see terrainMath.ts for why.
*/
function displaced(segments: number, size: number, seed: number, amplitude: number) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const h = heightField({ segments, size, seed, amplitude });
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, h[i]);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export default function Terrain({ segments }: { segments: number }) {
  const ridge = useMemo(() => displaced(segments, 240, 11, 16), [segments]);
  const floor = useMemo(() => displaced(segments, 220, 23, 9), [segments]);

  /* geometry is generated, so it has to be disposed by hand when the tier
     changes — three does not track what it did not create */
  useMemo(() => {
    return () => {
      ridge.dispose();
      floor.dispose();
    };
  }, [ridge, floor]);

  return (
    <group>
      <mesh geometry={ridge} rotation={[-Math.PI / 2, 0, 0]} position={[0, 42, 6]}>
        <meshStandardMaterial color="#6b6075" flatShading roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -68, 6]}>
        <meshStandardMaterial color="#2b1410" flatShading roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
