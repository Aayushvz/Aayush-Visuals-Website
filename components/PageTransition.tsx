"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/*
  Full-screen page-to-page transition: a circle in the exact preloader
  brand color grows from the nav link the user actually clicked, fully
  engulfs the screen, the real Aayush Visuals mark appears at its center
  for a beat while the route swaps invisibly underneath, then the mark
  fades and the same circle shrinks back into the point it grew from -
  revealing the destination page there.

  PageLink.tsx dispatches a "page-transition" CustomEvent carrying the
  click origin and href; this component owns all the timing, including
  the actual router.push, so the destination is never visible until the
  circle has fully covered the screen.
*/

const EXPAND_MS = 500; // must match .pageWipe__circle's transition-duration
const HOLD_MS = 250; // fully covered pause the route swap happens inside
const SHRINK_MS = 500; // same transition, reversed
const LOGO_IN_AT = 320; // ms into the expand, once mostly covered
const LOGO_OUT_LEAD = 150; // ms before the shrink starts

type Origin = { x: number; y: number; r: number };

export default function PageTransition() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [covered, setCovered] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, r: 0 });
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    function onStart(e: Event) {
      const detail = (e as CustomEvent<{ href: string; x: number; y: number }>).detail;
      if (!detail) return;
      clearAll();

      const { innerWidth: w, innerHeight: h } = window;
      const corners: Array<[number, number]> = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ];
      const r = Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - detail.x, cy - detail.y)));

      setOrigin({ x: detail.x, y: detail.y, r });
      setLogoVisible(false);
      setCovered(false);
      setActive(true);

      // lock scroll for the (brief) duration of the wipe, without letting
      // the vanished scrollbar shift layout
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const prevOverflow = document.body.style.overflow;
      const prevPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      const unlockScroll = () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      };

      // let the uncovered (scale 0) frame paint before animating to covered
      schedule(() => setCovered(true), 20);

      schedule(() => setLogoVisible(true), LOGO_IN_AT);
      schedule(() => router.push(detail.href), EXPAND_MS);
      schedule(() => setLogoVisible(false), EXPAND_MS + HOLD_MS - LOGO_OUT_LEAD);
      schedule(() => setCovered(false), EXPAND_MS + HOLD_MS);
      schedule(() => {
        setActive(false);
        unlockScroll();
      }, EXPAND_MS + HOLD_MS + SHRINK_MS + 60);
      // failsafe — the site must never stay locked behind this overlay
      schedule(() => {
        setCovered(false);
        setActive(false);
        unlockScroll();
      }, 4000);
    }

    window.addEventListener("page-transition", onStart as EventListener);
    return () => {
      window.removeEventListener("page-transition", onStart as EventListener);
      clearAll();
    };
  }, [router]);

  if (!active) return null;

  return (
    <div className="pageWipe" aria-hidden role="presentation">
      <div
        className={`pageWipe__circle${covered ? " pageWipe__circle--covered" : ""}`}
        style={{
          left: origin.x,
          top: origin.y,
          width: origin.r * 2,
          height: origin.r * 2,
          marginLeft: -origin.r,
          marginTop: -origin.r,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`pageWipe__mark${logoVisible ? " pageWipe__mark--visible" : ""}`}
        src="/logos/av-logo.webp"
        alt=""
        draggable={false}
      />
    </div>
  );
}
