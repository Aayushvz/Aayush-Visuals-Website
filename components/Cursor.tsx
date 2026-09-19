"use client";

import { useEffect, useRef } from "react";
import { PROJECT_CURSOR_LABEL } from "./projects/ProjectCursor";
import ArrowUpRight from "./projects/ArrowUpRight";

/*
  Custom cursor for fine-pointer devices. A small pixel-art gem tracks the
  pointer 1:1 and is the only thing visible at rest. Disabled on touch
  devices and for reduced-motion users.

  Two special states, both hosted on the trailing ring, because the tile
  itself never shows a button and the cursor carries the CTA:

  - `project`, a cream pill reading "View project". The /work index and
    the case-study pages use it, where the name is already on the page.
  - `work`, the homepage reel's pill, which names the project it is over
    and the kind of work it is. The reel's caption sits below the cover,
    so a pointer resting on the artwork is not reading it.

  The `work` pill's text is written straight to the DOM through refs
  rather than through state. This runs on pointerover, which fires for
  every element boundary the pointer crosses on the page; routing that
  through React would re-render the whole cursor on each one.
*/
export default function Cursor() {
  const dotRef = useRef<HTMLImageElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);

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

    /* The pointer fires many times per frame on a high-polling mouse. Both
       the dot (1:1) and the ring (lerped) are written once per frame from
       the loop instead, so a fast flick costs one style write each, not a
       dozen. */
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      wake();
    };

    const loop = () => {
      raf = 0;
      dot.style.transform = `translate(${tx}px, ${ty}px)`;
      rx += (tx - rx) * 0.24;
      ry += (ty - ry) * 0.24;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      /* Park once the ring has caught up with the pointer. Idle, this loop
         was re-rendering an unchanged transform 60x a second forever. */
      if (Math.abs(tx - rx) < 0.1 && Math.abs(ty - ry) < 0.1) {
        rx = tx;
        ry = ty;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const title = titleRef.current;
    const sub = subRef.current;
    /* the last values written, so crossing between two elements inside the
       same card does not rewrite identical text on every boundary */
    let shownTitle = "";

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;

      const work = t?.closest?.("[data-cursor='work']") as HTMLElement | null;
      if (work && title && sub) {
        const nextTitle = work.dataset.cursorTitle ?? "";
        if (nextTitle !== shownTitle) {
          shownTitle = nextTitle;
          title.textContent = nextTitle;
          sub.textContent = work.dataset.cursorSub ?? "";
        }
      } else {
        shownTitle = "";
      }
      ring.classList.toggle("cursorRing--work", !!work);

      /* a card is never both, and checking work first means a reel tile
         cannot also light the generic pill behind it */
      const project = !work && !!t?.closest?.('[data-cursor="project"]');
      ring.classList.toggle("cursorRing--project", project);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    wake();

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

        {/* the reel's pill: arrow, then the project's name over its
            category. Both lines are filled in by onOver. */}
        <span className="cursorRing__work">
          <span className="cursorRing__workArrow">
            <ArrowUpRight />
          </span>
          <span className="cursorRing__workText">
            <span className="cursorRing__workTitle" ref={titleRef} />
            <span className="cursorRing__workSub" ref={subRef} />
          </span>
        </span>
      </div>
    </div>
  );
}
