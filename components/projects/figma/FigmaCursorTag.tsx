"use client";

import { useEffect, useRef } from "react";

/*
  The name tag riding the page's collaborator cursor — a Figma multiplayer
  cursor carries its owner's label; here the "owner" is whoever's viewing.
  Only the label lives here: the arrow itself is a real CSS cursor (see
  figma-project.css) so it never lags the pointer and survives with JS off.
  The tag is allowed to trail, easing in behind it like Figma's own does.
*/
export default function FigmaCursorTag() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const K = reduced ? 1 : 0.18;

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    let placed = false;

    const tick = () => {
      const dx = x - tx;
      const dy = y - ty;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        tx = x;
        ty = y;
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        raf = 0;
        return;
      }
      tx += dx * K;
      ty += dy * K;
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!placed) {
        placed = true;
        tx = x;
        ty = y;
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        el.classList.add("is-live");
      }
      wake();
    };

    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget === null) el.classList.remove("is-live");
    };
    const onOver = () => {
      if (placed) el.classList.add("is-live");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerover", onOver);
    };
  }, []);

  return (
    <div ref={ref} className="figp-tag" aria-hidden="true">
      Aayush
    </div>
  );
}
