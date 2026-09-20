"use client";

import { useEffect, useRef } from "react";
import { PROJECT_CURSOR_LABEL } from "./projects/ProjectCursor";
import ArrowUpRight from "./projects/ArrowUpRight";

/*
  Custom cursor for fine-pointer devices. A pixel-art arrow tracks the
  pointer 1:1 over ordinary page content, and swaps to a pointing hand
  over anything clickable or while the button is down. Disabled on touch
  devices and for reduced-motion users.

  BOTH ARTWORKS ARE ALWAYS IN THE DOM, swapped by opacity rather than by
  rewriting src. Swapping src would ask the browser for a file on the
  first click of a session, and a cursor that blinks out for a frame on
  mousedown is worse than no swap at all.

  They do not share a hotspot. The arrow points from its own top-left
  corner, but the hand points from its fingertip, which sits about a third
  of the way across its artboard. Each is therefore offset by its own
  measured hotspot in CSS, so the two land on the same pixel and pressing
  does not make the cursor jump sideways.

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
  const dotRef = useRef<HTMLDivElement>(null);
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

    /*
      What counts as clickable.

      Written as a selector rather than a duck-typed check (has an onclick,
      is focusable, ...) because `closest` can then answer the whole
      question in one call per pointerover, and because the list is the
      documentation: if something should show the hand and does not, it
      belongs here.

      :disabled is excluded deliberately. A greyed-out submit is the one
      button on a page that must NOT invite the click.
    */
    const CLICKABLE = [
      "a[href]",
      "button:not(:disabled)",
      "input:not(:disabled)",
      "select:not(:disabled)",
      "textarea:not(:disabled)",
      "summary",
      "label[for]",
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      /* the reel and the project tiles, which are links already, plus
         anything else that opts in by marking itself for the cursor */
      "[data-cursor]",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    /* The hand is shown for either reason, so neither may clobber the
       other: releasing the mouse over a link has to leave the hand up,
       and moving off a link mid-drag has to leave it up too. */
    let overClickable = false;
    let pressed = false;
    const syncHand = () =>
      dot.classList.toggle("cursorDot--hand", overClickable || pressed);

    const title = titleRef.current;
    const sub = subRef.current;
    /* the last values written, so crossing between two elements inside the
       same card does not rewrite identical text on every boundary */
    let shownTitle = "";

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;

      overClickable = !!t?.closest?.(CLICKABLE);
      syncHand();

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
      /*
        The dot stands down while the named card is under the pointer.

        That state already draws the project's name and discipline in a panel
        at the hotspot, and the dot's own artwork - the purple hand or arrow -
        sits right behind it. Two cursors in one place, one of them obscuring
        the label the other exists to show.

        Only this state. The plain "View project" pill on the case studies is
        a small mark that the dot reads as the pointer FOR, and the dot is the
        pointer everywhere else on the site, so it is hidden here and nowhere
        else.
      */
      dot.classList.toggle("cursorDot--muted", !!work);

      /* a card is never both, and checking work first means a reel tile
         cannot also light the generic pill behind it */
      const project = !work && !!t?.closest?.('[data-cursor="project"]');
      ring.classList.toggle("cursorRing--project", project);
    };

    const down = () => {
      pressed = true;
      syncHand();
    };
    /* pointercancel as well as pointerup: a press that turns into a drag
       the browser takes over, or a touch that becomes a scroll, never
       sends pointerup, and the hand would stay stuck down. blur covers
       releasing the button after alt-tabbing away. */
    const up = () => {
      pressed = false;
      syncHand();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    window.addEventListener("blur", up);
    wake();

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden>
      {/* the wrapper is the hotspot itself, a zero-size point at the
          pointer; each artwork hangs off it by its own offset */}
      <div ref={dotRef} className="cursorDot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="cursorDot__art cursorDot__arrow"
          src="/cursor-pointer.svg"
          alt=""
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="cursorDot__art cursorDot__hand"
          src="/cursor-click.svg"
          alt=""
          draggable={false}
        />
      </div>
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
