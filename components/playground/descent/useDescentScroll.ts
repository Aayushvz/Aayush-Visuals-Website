"use client";

import { useEffect, useRef } from "react";
import { damp, rawProgress } from "./progress";

export type DescentProgress = { p: number };

/*
  Scroll to a damped progress value, in a ref.

  Deliberately not React state: this updates every frame, and a setState
  per frame would re-render the whole page sixty times a second. The scene
  reads `.p` inside useFrame; nothing above it ever re-renders.
*/
export function useDescentScroll() {
  const ref = useRef<DescentProgress>({ p: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let target = rawProgress(window.scrollY, window.innerHeight);
    ref.current.p = target;

    const onScroll = () => {
      target = rawProgress(window.scrollY, window.innerHeight);
    };

    const tick = (now: number) => {
      /* clamped: a backgrounded tab can hand back a delta of many seconds,
         which would snap the camera instead of easing it */
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ref.current.p = damp(ref.current.p, target, 7, dt);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}
