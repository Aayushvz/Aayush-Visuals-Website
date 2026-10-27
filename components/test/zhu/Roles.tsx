"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ORBIT, RISE, smooth, type ScrollState } from "./scroll";

/*
  The two roles the scroll arrives at, after the reference's "art director"
  and "creative developer":

    product / designer  - lower left, lines right-aligned
    design / engineer   - upper right, lines left-aligned

  Each is a two-line Aeonik label on a plane turned 90deg to face the
  camera's END position (it orbits round to look along +x), staggered in
  depth so they part in parallax as the camera arrives. They fade in over
  p 0.72 -> 0.9. Sizes are the reference's, scaled to this camera's orbit.
*/

const INK = "#ece6f5";

function paintRole(lines: [string, string], align: "left" | "right", family: string) {
  const W = 2048,
    H = 760;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = INK;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  /* the bigger of: what fits two lines in the height, what fits the width */
  let size = 300;
  g.font = `400 ${size}px ${family}`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  size = Math.min(Math.floor((size * W * 0.98) / widest), Math.floor(H / 1.95));
  g.font = `400 ${size}px ${family}`;
  const lead = size * 0.92;
  const x = align === "left" ? W * 0.01 : W * 0.99;
  const base1 = (H - lead) / 2 + size * 0.32;
  g.fillText(lines[0], x, base1);
  g.fillText(lines[1], x, base1 + lead);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: H / W };
}

/* positions in the camera's end view (looking +x, screen-right = +z) */
const K = ORBIT / 6;
/* the reference's role art does not fill its plane; ours does, so the
   planes are 55% of its size */
const SHRINK = 0.55;
/* each role's ALIGNED edge is pinned this far out from the mark's centre
   (screen-left for product/designer, screen-right for design/engineer),
   so neither ever sits over the logo */
const CLEAR = 0.82;
const ROLES = [
  { lines: ["product", "designer"] as [string, string], align: "right" as const, x: 1 * K, y: RISE - 0.75 * K, edge: -CLEAR, width: 5.5 * 0.85 * K },
  { lines: ["design", "engineer"] as [string, string], align: "left" as const, x: -1 * K, y: RISE + 0.5 * K, edge: CLEAR, width: 5.5 * 0.6 * K },
];

export default function Roles({ scroll }: { scroll: React.MutableRefObject<ScrollState> }) {
  const { viewport } = useThree();
  const [family, setFamily] = useState<string | null>(null);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

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

  const painted = useMemo(() => (family ? ROLES.map((r) => paintRole(r.lines, r.align, family)) : null), [family]);
  useEffect(() => () => painted?.forEach((p) => p.tex.dispose()), [painted]);

  useFrame(() => {
    const o = smooth(scroll.current.p, 0.72, 0.9);
    mats.current.forEach((m) => {
      if (!m) return;
      m.opacity = o;
      m.visible = o > 0.002;
    });
  });

  if (!painted) return null;
  /* narrower frames pull the roles in, as the reference does */
  const aspect = viewport.width / viewport.height;
  const e = Math.min(1, aspect / 1.6);
  /* portrait: there is no room either side, so the roles part vertically
     instead, clear of the mark above and below */
  const tall = aspect < 0.8;
  const yOf = (r: (typeof ROLES)[number]) => (tall ? (r.align === "right" ? RISE - 1.05 : RISE + 0.6) : r.y);

  return (
    <>
      {ROLES.map((r, i) => (
        <mesh
          key={r.lines.join(" ")}
          position={[r.x, yOf(r),(r.edge + (r.align === "right" ? -1 : 1) * ((r.width * SHRINK) / 2)) * e]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[r.width * SHRINK * e, r.width * SHRINK * e * painted[i].aspect, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            map={painted[i].tex}
            transparent
            depthWrite={false}
            toneMapped={false}
            opacity={0}
          />
        </mesh>
      ))}
    </>
  );
}
