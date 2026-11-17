import type { LowPowerMode } from "@/components/about/useLowPowerMode";

export type Tier = {
  /** segments per side of each terrain plane */
  terrainSegments: number;
  /** ember particle count in the forge */
  embers: number;
  /** volumetric light shafts through the chasm */
  shafts: boolean;
  /** grain + vignette pass */
  post: boolean;
  maxDpr: number;
  shadows: boolean;
};

const HIGH: Tier = {
  terrainSegments: 128,
  embers: 1400,
  shafts: true,
  post: true,
  maxDpr: 1.75,
  shadows: true,
};

const LOW: Tier = {
  terrainSegments: 48,
  embers: 300,
  shafts: false,
  post: false,
  maxDpr: 1.25,
  shadows: false,
};

/*
  Reduced motion is deliberately not a tier. A frozen 3D scene is still a
  3D scene, and someone who asked for less motion does not want a camera
  flown at them slowly — they get the flat card list instead (DescentPage).
  The test pins that so nobody "helpfully" adds a reduced-motion tier here.
*/
export function tierFor(mode: LowPowerMode, portrait: boolean): Tier {
  const base = mode.lowPower ? LOW : HIGH;
  if (!portrait) return base;
  return {
    ...base,
    terrainSegments: Math.round(base.terrainSegments * 0.7),
    embers: Math.round(base.embers * 0.55),
    shafts: false,
  };
}
