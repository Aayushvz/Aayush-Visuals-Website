"use client";

import { useEffect } from "react";

/*
  Warms the cache for Selected Works' heaviest asset while the pinned Skills
  scene is still on screen.

  One tile is an animated WebP (288 frames, ~1.5MB) — 75% of the whole
  section's payload. It's natively lazy-loaded, so its download only started
  as you arrived, and the tile popped in a beat later. Skills is ~4700px
  tall, so the moment you enter it there's a long runway to fetch this in
  the background, and the file itself is untouched.

  Only that one tile is worth this: every other cover is 49–102KB and
  already arrives in time on its own. Which row it happens to sit in makes
  no difference — the caller picks by weight, not position.
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
        /*
          An Image() cannot warm a video — it would just fail to decode and
          the loop would still download cold when the tile arrives. Videos
          are fetched instead, which populates the same HTTP cache the
          <video> element then resolves from.
        */
        if (/\.(webm|mp4)$/i.test(src)) {
          fetch(src, { mode: "no-cors" }).catch(() => {
            /* a warm-up that fails costs nothing; the tile still loads */
          });
        } else {
          const warm = new Image();
          warm.decoding = "async";
          warm.src = src;
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(skills);

    return () => io.disconnect();
  }, [src]);

  return null;
}
