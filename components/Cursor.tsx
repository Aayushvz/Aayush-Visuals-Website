"use client";

import { useEffect, useRef } from "react";
import { PROJECT_CURSOR_LABEL } from "./projects/ProjectCursor";

/*
  Custom cursor for fine-pointer devices. A small pixel-art gem tracks the
  pointer 1:1 and is the only thing visible at rest. Disabled on touch
  devices and for reduced-motion users.

  Its only special state: over a project tile the trailing ring morphs
  into a "View Project" pill — the tile itself never shows a button, the
  cursor carries the CTA.
*/
export default function Cursor() {
  const dotRef = useRef<HTMLImageElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add("has-cursor");

    let tx = -100;
    let ty = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    const loop = () => {
      rx += (tx - rx) * 0.24;
      ry += (ty - ry) * 0.24;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const project = !!t?.closest?.('[data-cursor="project"]');
      ring.classList.toggle("cursorRing--project", project);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={dotRef}
        className="cursorDot"
        src="/cursor-gem-16.png"
        alt=""
        draggable={false}
      />
      <div ref={ringRef} className="cursorRing">
        <span className="cursorRing__cta">
          <span className="cursorRing__ctaText">{PROJECT_CURSOR_LABEL}</span>
          <span className="cursorRing__ctaArrow">
            <svg viewBox="0 0 16 16" width="9" height="9" fill="none" aria-hidden>
              <path
                d="M5 3l5 5-5 5M9 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </div>
    </div>
  );
}
