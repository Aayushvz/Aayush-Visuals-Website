"use client";

import { useEffect } from "react";

export default function Reveals() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        });
      },
      /*
        Fire just BEFORE an element scrolls into view, not after.

        threshold 0.2 meant an element only revealed once a fifth of it was
        already on screen — on the 813px project tiles that was 163px of
        scroll after they first appeared. The 0.35s fade then ran while the
        page kept moving (a normal flick covers ~700px in that time), so
        content was visibly still fading in by the time you were looking at
        it. threshold 0 drops the penalty on tall elements, and the positive
        bottom rootMargin gives the transition a head start below the fold
        so it has settled by the time the element arrives.
      */
      { threshold: 0, rootMargin: "0px 0px 12% 0px" }
    );
    const track = (root: ParentNode) => {
      root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    };
    track(document);

    /*
      Sections that arrive after this runs still have to be picked up.

      The query above is a single snapshot of the document, which was true
      enough while every section was in the first render. The homepage now
      mounts its heavy below-fold sections on approach, and their headings,
      subtitles and calls to action are marked `data-reveal` like any other:
      unobserved, they never get `revealed` and simply never appear, leaving
      a section of bare cards with no text around them.

      Watching for added nodes keeps the engine honest about a document that
      grows. Re-observing an element the observer already has is a no-op, so
      the overlap with the initial pass costs nothing.
    */
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches("[data-reveal]")) io.observe(node);
          track(node);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
