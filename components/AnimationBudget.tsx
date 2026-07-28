"use client";

import { useEffect } from "react";

/*
  Animation budget — the single biggest scroll-cost saver on this site.

  The page runs ~28 infinite CSS animations (aurora curtains, starfield
  twinkles, drifting gradients, the logo marquee, the footer sea scene,
  floating portraits/tiles...). Without this, every one of them keeps
  ticking while you're reading a completely different section, so the
  compositor is doing full-page animation work on every frame no matter
  where you are. That's what makes scrolling feel heavy.

  This marks any section that isn't near the viewport with `anim-idle`,
  and CSS pauses the animations inside it (see `.anim-idle` in
  globals.css). Nothing is removed or restyled — `animation-play-state`
  just freezes them mid-keyframe and they resume on the way back in, so
  there is zero visual difference for anything the user can actually see.

  The 300px rootMargin means work restarts slightly before a section
  scrolls into view, so nothing ever pops in mid-freeze.
*/
export default function AnimationBudget() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("anim-idle", !e.isIntersecting);
        }
      },
      { rootMargin: "300px 0px" }
    );

    /* re-scan after route changes: sections are swapped by the App Router
       without this component unmounting. Debounced — re-observing is
       idempotent, so this only needs to settle eventually, and it must
       never turn into per-mutation work of its own. */
    const scan = () => {
      document
        .querySelectorAll("section, footer, [data-anim-scope]")
        .forEach((el) => io.observe(el));
    };
    scan();

    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        scan();
      }, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (pending) window.clearTimeout(pending);
    };
  }, []);

  return null;
}
