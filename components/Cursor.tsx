"use client";

import { useEffect, useRef } from "react";
import { PROJECT_CURSOR_LABEL } from "./projects/ProjectCursor";

/*
  Custom cursor for fine-pointer devices. The dot tracks the pointer 1:1;
  the ring trails it via rAF lerp. Rendered with mix-blend-mode: difference
  so it stays legible over both hero themes and the light sections below.
  Disabled on touch devices and for reduced-motion users.

  Over a project tile the ring morphs into a "View Project" pill instead of
  scaling up as a plain circle — the tile itself never shows a button, the
  cursor carries the CTA.
*/
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
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
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      // Project tiles win over every other state; cards over drag; links/buttons are interactive.
      const project = !!t?.closest?.('[data-cursor="project"]');
      const card = !project && !!t?.closest?.('[data-cursor="card"]');
      const interactive = !project && (card || !!t?.closest?.("a, button"));
      const draggable = !project && !interactive && !!t?.closest?.('[data-cursor="drag"]');
      ring.classList.toggle("cursorRing--project", project);
      ring.classList.toggle("cursorRing--active", interactive);
      ring.classList.toggle("cursorRing--drag", draggable);
    };

    const onDown = () => ring.classList.add("cursorRing--down");
    const onUp = () => ring.classList.remove("cursorRing--down");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden>
      <div ref={dotRef} className="cursorDot" />
      <div ref={ringRef} className="cursorRing">
        <i />
        <span className="cursorRing__cta">
          <span className="cursorRing__ctaText">{PROJECT_CURSOR_LABEL}</span>
          <span className="cursorRing__ctaArrow">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
              <path
                d="M3.5 8h9m0 0L8.5 4M12.5 8 8.5 12"
                stroke="currentColor"
                strokeWidth="1.5"
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
