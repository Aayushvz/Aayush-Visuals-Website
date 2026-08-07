"use client";

import { useRef } from "react";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export type LowPowerMode = {
  lowPower: boolean;
  reducedMotion: boolean;
  pointerFine: boolean;
};

const DEFAULT_MODE: LowPowerMode = {
  lowPower: false,
  reducedMotion: false,
  pointerFine: true,
};

function readMode(): LowPowerMode {
  const nav = navigator as NavigatorWithHints;
  const lowPower =
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointerFine = window.matchMedia("(pointer: fine)").matches;
  return { lowPower, reducedMotion, pointerFine };
}

/*
  Device-capability signal shared by the About page's heavy canvases
  (PixelBackground, AsciiPortrait). Computed once per mount and cached in
  a ref — read as a one-time gate, not live state, matching how Hero.tsx
  already treats pointer/reduced-motion checks.
*/
export function useLowPowerMode(): LowPowerMode {
  const ref = useRef<LowPowerMode | null>(null);
  if (ref.current === null) {
    ref.current = typeof window === "undefined" ? DEFAULT_MODE : readMode();
  }
  return ref.current;
}
