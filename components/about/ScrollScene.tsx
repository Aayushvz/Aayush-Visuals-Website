"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { SCENE } from "./scene.config";
import "./scroll-scene.css";

/*
  A pinned, scroll-scrubbed scene.

  The section is taller than the screen; the thing you actually see is one
  viewport tall and sticks to the top while the section scrolls past behind it.
  That gap between the section's height and the sticky child's height IS the
  timeline — the composition is driven by how far through the section you are,
  not by whether it happens to be visible.

  Progress is published as a single number on the sticky element:

    --p   0 -> 1   raw position through the scene

  and every block inside remaps its own window off that in CSS. Keeping the
  windows in the stylesheet is what lets two compositions overlap — the lead
  block can still be leaving while the cards are already arriving — without
  this file knowing either of them exists.

  Because --p is a pure function of scroll offset, scrolling back up runs the
  whole thing in reverse for free: no state to unwind, no "has played" flag,
  and no way for a composition to end up stranded.

  Cost control, on a page that already runs two canvases:

  - One rAF loop, and it parks as soon as the scroll position stops changing.
  - One passive scroll listener that does nothing but wake the loop.
  - The loop only runs while the scene is anywhere near the viewport.
  - Reads happen before writes, so a frame costs one layout flush, not two.
  - Under prefers-reduced-motion the scene is pinned open at its resting
    state and the loop never starts.
*/

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function ScrollScene({
  children,
  className = "",
  length = SCENE.motion.length,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** scene height in viewport multiples; the extra over 1 is the timeline */
  length?: number;
  id?: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* park mid-scene: both compositions fully arrived, neither leaving */
      sticky.style.setProperty("--p", "0.32");
      return;
    }

    let raf = 0;
    let idle = 0;
    let lastY = -1;
    let near = false;
    let lastP = -1;

    const apply = () => {
      const r = section.getBoundingClientRect();
      /*
        Progress spans the APPROACH as well as the pin.

        Measuring only the pinned stretch (from the section's top hitting the
        viewport top) meant progress sat at 0 for the whole viewport of scroll
        it takes the section to arrive — and since the blocks are invisible at
        p = 0, that showed as a full screen of blank page between the marquee
        and this section.

        So 0 is the moment the section's top reaches the bottom of the screen,
        and 1 is the moment its bottom leaves the top. The pin therefore begins
        partway through, at viewportHeight / sectionHeight, and the blocks can
        start arriving before it.
      */
      const vh = window.innerHeight;
      const total = Math.max(1, r.height);
      const p = clamp01((vh - r.top) / total);
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;

      /* One number, and only one. Every window in the scene is remapped off
         --p in CSS, so adding or retiming a block never touches this file. */
      sticky.style.setProperty("--p", p.toFixed(4));
    };

    const frame = () => {
      apply();
      const y = window.scrollY;
      idle = y === lastY ? idle + 1 : 0;
      lastY = y;
      raf = near && idle < 3 ? requestAnimationFrame(frame) : 0;
    };

    const wake = () => {
      /* the idle counter is reset before the early return, so a scroll that
         arrives mid-countdown keeps the loop alive rather than being ignored */
      idle = 0;
      if (raf || !near) return;
      raf = requestAnimationFrame(frame);
    };

    /* only spend frames while the scene is in play */
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) wake();
        else apply();
      },
      { rootMargin: "20% 0px 20% 0px", threshold: 0 }
    );
    io.observe(section);

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    apply();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
    };
  }, [length]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`scn ${className}`.trim()}
      style={{ "--scn-len": `${length * 100}svh` } as CSSProperties}
    >
      <div className="scn__sticky" ref={stickyRef}>
        {children}
      </div>
    </section>
  );
}
