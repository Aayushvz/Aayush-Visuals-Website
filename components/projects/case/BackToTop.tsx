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

  /*
    Visible after a screenful, and stood down again at the very end.

    The footer dock carries a back-to-top button of its own, so at the bottom
    of the page both were on screen at once, side by side, doing the same
    thing. A floating control exists to reach what is out of reach; when the
    real one is right there it is just clutter.

    The first attempt watched the footer with an IntersectionObserver and
    never showed the button at all, because the footer is `position: sticky`
    on these pages: it is in the viewport for the whole parallax, so "footer
    visible" is true almost everywhere. Distance from the end of the document
    is the honest measure of the same thing, and it costs no second listener
    since the scroll handler is already here.
  */
  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      const remaining =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      const next = past && remaining > window.innerHeight * 0.5;
      if (next === shownRef.current) return;
      shownRef.current = next;
      setShown(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const visible = shown;

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
      data-shown={visible}
      onClick={toTop}
      /* hidden from the tab order until it is actually on screen, so a
         keyboard reader at the top of the page does not land on a control
         they cannot see */
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
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
