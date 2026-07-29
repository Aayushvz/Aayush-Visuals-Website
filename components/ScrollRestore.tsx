"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { takeRestore } from "@/lib/navOrigin";

/*
  Applies a scroll position armed by a project page's back control (see
  lib/navOrigin.ts) once the destination route has laid out.

  Timing is why this is invisible: PageTransition covers the whole screen,
  pushes the route at 500ms and only uncovers 250ms later, so this lands
  inside that covered window. It also runs on the reduced-motion path, where
  PageLink pushes directly and PageTransition never mounts.

  Deliberately scheduled with setTimeout rather than requestAnimationFrame.
  rAF doesn't run at all in a backgrounded or non-compositing tab, which
  would consume the pending restore and then silently never apply it. The
  repeats also outlast any late scroll adjustment the browser makes on its
  own after a route change — all still under the wipe, so nothing is seen.
*/
const RETRY_MS = [0, 40, 120, 260, 500];

export default function ScrollRestore() {
  const pathname = usePathname();

  useEffect(() => {
    const pending = takeRestore();
    if (!pending) return;
    /* the armed restore belongs to the page that armed it */
    if (pending.path !== pathname) return;

    const timers: number[] = [];
    let landed = false;

    const apply = () => {
      const section = document.getElementById(pending.sectionId);
      if (!section) return; // not laid out yet — a later retry will catch it
      const top = section.getBoundingClientRect().top + window.scrollY;
      /* `behavior: "instant"` is required, not stylistic: html carries
         scroll-behavior:smooth, so a plain scrollTo would animate a
         ~10,000px journey instead of jumping straight there */
      window.scrollTo({ top: top + pending.offset, left: 0, behavior: "instant" });
      landed = true;
    };

    for (const ms of RETRY_MS) {
      timers.push(window.setTimeout(apply, ms));
    }
    /* one last attempt well after the wipe, purely so a slow-laying-out page
       still ends up in the right place rather than at the top */
    timers.push(
      window.setTimeout(() => {
        if (!landed) apply();
      }, 900)
    );

    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  return null;
}
