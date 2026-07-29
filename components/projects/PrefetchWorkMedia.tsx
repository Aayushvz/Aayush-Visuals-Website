"use client";

import { useEffect } from "react";

/*
  Warms the cache for Selected Works' heaviest asset while the pinned Skills
  scene is still on screen.

  The first tile is an animated WebP (288 frames, ~1.5MB) — 75% of the whole
  section's payload. It's natively lazy-loaded, so its download only started
  as you arrived, and the tile popped in a beat later. Skills is ~4700px
  tall, so the moment you enter it there's a long runway to fetch this in
  the background, and the file itself is untouched.

  Only the first row is worth this: every other cover is 49–102KB and
  already arrives in time on its own.
*/
export default function PrefetchWorkMedia({ src }: { src: string }) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    /* honour a metered or explicitly reduced-data connection — this is an
       optimisation, never something to spend someone's data cap on */
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (conn?.saveData) return;

    const skills = document.querySelector("#capabilities");
    if (!skills) return;

    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((e) => e.isIntersecting)) return;
        done = true;
        io.disconnect();
        /* a bare Image() is enough to populate the HTTP cache; the real
           <img> in the tile then resolves from it instantly */
        const warm = new Image();
        warm.decoding = "async";
        warm.src = src;
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(skills);

    return () => io.disconnect();
  }, [src]);

  return null;
}
