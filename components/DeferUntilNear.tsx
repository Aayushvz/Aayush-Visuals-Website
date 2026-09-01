"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
  Mounts its children only once they are close to the viewport.

  The homepage hydrates every section at load, and the heavy ones below the
  fold - a 3D carousel, a scroll-driven photo track - spend main-thread time
  on mount that the visitor cannot see the result of. That time lands in Total
  Blocking Time, which is the metric this page scores worst on. Holding those
  sections until they are approaching moves that work off the critical path.

  Two details make this safe rather than merely faster:

  - The placeholder reserves the section's height, so the page below does not
    jump when the real thing arrives. Without it this trade would buy Total
    Blocking Time with Cumulative Layout Shift, which is currently 0.001 and
    worth keeping.
  - It mounts a viewport and a half early, so the work happens off screen and
    the content has time to lay out before it is looked at.

  THE RESERVATION IS HELD UNTIL REAL CONTENT ARRIVES, NOT UNTIL WE DECIDE TO
  SHOW IT. These two moments are not the same, and the gap between them is a
  network round trip: the children here are `next/dynamic` imports, which
  render nothing at all until their chunk has been fetched. An earlier version
  dropped the reserved height as soon as the observer fired, which left the
  wrapper empty AND unreserved for the length of that fetch - the page
  collapsed by the full height of the section and sprang back when the chunk
  landed. Measured on a production build, that was two layout shifts of 1.0,
  the largest a single shift can be. Holding the reservation until the child
  has actually put an element in the DOM closes that window.

  The reservation is then released, rather than kept forever, because it is an
  estimate in viewport units and the real sections are not: the gallery's
  height is one viewport plus however far its row has to travel, which shrinks
  as the window gets wider. On a wide screen a permanent reservation would
  leave a screen or more of dead space below it.

  It fails OPEN. Without IntersectionObserver, or before the effect runs on a
  browser that never gets there, the children render normally - a section of
  the site must never depend on this working.
*/

export default function DeferUntilNear({
  children,
  /** reserved before the real section arrives, so nothing jumps */
  minHeight,
  rootMargin = "150% 0px",
}: {
  children: ReactNode;
  minHeight: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  /* whether the child has actually rendered, which is later than `shown` */
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        /* one-way: once a section is up it stays up, so scrolling back and
           forth past it never pays the mount cost twice */
        io.disconnect();
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (!shown || filled) return;
    const el = ref.current;
    if (!el) return;
    /* the chunk may already be cached, in which case the child is there in
       the same commit and there is nothing to wait for */
    if (el.firstElementChild) {
      setFilled(true);
      return;
    }
    if (typeof MutationObserver === "undefined") {
      setFilled(true);
      return;
    }
    const mo = new MutationObserver(() => {
      if (el.firstElementChild) {
        setFilled(true);
        mo.disconnect();
      }
    });
    mo.observe(el, { childList: true });
    return () => mo.disconnect();
  }, [shown, filled]);

  return (
    <div ref={ref} style={filled ? undefined : { minHeight }}>
      {shown ? children : null}
    </div>
  );
}
