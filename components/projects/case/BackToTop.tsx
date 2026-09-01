"use client";

import { useEffect, useRef, useState } from "react";

/*
  A way out of a long page.

  It appears only once the reader is a screen past the top, because a control
  offering to return you to where you already are is noise. The threshold is
  a viewport rather than a fixed pixel count so it behaves the same on a
  phone as on a desktop.

  The scroll listener is passive and does no layout reads: it compares
  scrollY against a number, and only touches the DOM when the answer changes.
  Everything visual is a CSS transition on one data attribute, so nothing
  here runs per frame.
*/
export default function BackToTop() {
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > window.innerHeight * 0.9;
      if (next === shownRef.current) return;
      shownRef.current = next;
      setShown(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className="csTop"
      data-shown={shown}
      onClick={toTop}
      /* hidden from the tab order until it is actually on screen, so a
         keyboard reader at the top of the page does not land on a control
         they cannot see */
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      Top
    </button>
  );
}
