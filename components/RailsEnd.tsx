"use client";

import { useEffect, useRef } from "react";

/*
  Where the homepage's side rails stop.

  They belong to the framed half of the page: the hero, About and the
  Statement panel all sit inside a frame, and the hairlines are that frame.
  From The Skills Deck down, every section sets its own edges instead, a
  pinned 3D carousel, a collage of rounded cards, a torn-edge pane, a
  full-bleed gallery, and a pair of lines ruled over the top of them reads
  as chrome nobody switched off rather than as a frame.

  This renders a zero-height marker at that boundary and toggles
  `past-rails` on the document element, the same idiom Hero already uses
  for `past-hero`.

  WHY A SCROLL HANDLER AND NOT AN INTERSECTIONOBSERVER

  The observer version of this shipped broken. An observer against a
  one-pixel band at the top of the viewport fires exactly twice, once each
  way, which is elegant and is the whole problem: the state between those
  two events is whatever the FIRST callback decided, and that callback
  fires at mount, while the Preloader is still up and the deferred sections
  below have not reserved their heights yet. Measure the marker then and it
  can read as already passed, which switches the rails off at load and
  leaves them off, because the next event does not arrive until you scroll
  down past the deck and come back.

  A scroll handler has no such memory. Every frame that moves re-asks the
  question, so a bad measurement at mount survives exactly until the first
  scroll rather than for the whole visit. The cost is one cached rect read
  per animation frame, coalesced through rAF, which is what Hero already
  pays for `past-hero`.
*/
export default function RailsEnd() {
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = markRef.current;
    if (!el) return;

    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      frame = 0;
      root.classList.toggle("past-rails", el.getBoundingClientRect().top <= 0);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    /* the deferred sections below settle their heights after mount, which
       moves this marker; re-ask once everything has loaded rather than
       trusting the measurement taken under the Preloader */
    window.addEventListener("load", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      /* leaving the homepage must not leave the flag behind: /about draws
         its own rails off the same element */
      root.classList.remove("past-rails");
    };
  }, []);

  return <div className="railsEnd" ref={markRef} aria-hidden />;
}
