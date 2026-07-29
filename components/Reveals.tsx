"use client";

import { useEffect } from "react";

export default function Reveals() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
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
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
