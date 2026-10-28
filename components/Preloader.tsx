"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lockScroll } from "@/lib/scrollLock";
import { markOutline } from "@/components/test/zhu/markGeometry";

/*
  Full-screen entrance preloader, mounted once in the root layout so it runs
  on every fresh document load and never on in-app navigation.

  One small word in the middle: "Aayush", said in a run of scripts (Hindi,
  Japanese, Korean, Tamil, Bengali, Russian, Chinese), landing back
  on the Latin; then the slash-and-dot logo, flat, and the sheet lifts away.
  On the homepage it waits (briefly) for the 3D hero to report its lit scene
  is up ("zh:ready") before lifting, so it never opens onto a blank canvas.

  Two looks, to compare (?ldr=dark / ?ldr=light, light by default):
    light - white paper; the words start black and, word by word, take on
            the hero's gradient (indigo, violet, magenta), the last name and
            the logo fully in it
    dark  - deep indigo, lilac-white words, a white logo

  Everything that moves is opacity and transform on WAAPI, so it runs on the
  compositor while the page underneath is still hydrating.

  Contract with the rest of the site: scroll is locked while it shows; when
  the page is revealed it sets window.__preloaderDone and dispatches
  "preloader:done", which the heroes wait on. An 8s failsafe guarantees the
  site never stays locked behind it.
*/

/* "Aayush" around the world, ending where it started */
const NAMES = [
  "Aayush",
  "आयुष",
  "アーユシュ",
  "아유시",
  "ஆயுஷ்",
  "আয়ুষ",
  "Аюш",
  "阿尤什",
  "Aayush",
];

/* timing, ms */
const FIRST_HOLD = 560;
const STEP = 190;
const LAST_HOLD = 640;
const FADE = 90;
/* the hero gets this long past the words to report ready before we open */
const READY_GRACE = 2500;
const MARK_IN = 450;
const MARK_HOLD = 420;
const LIFT = 850;
const REDUCED_HOLD = 700;
const REDUCED_FADE = 300;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_INOUT = "cubic-bezier(0.76, 0, 0.24, 1)";

/* Routes that own their own opening; see the /cricket note in globals.css */
const SILENT_ROUTES = ["/cricket"];

/* the slash-and-dot, flat, from the same measured outline as the 3D mark */
function Mark({ className, gradient }: { className?: string; gradient: boolean }) {
  const { bar, dot } = markOutline();
  const pts = bar.map(([x, y]) => `${x.toFixed(4)},${(-y).toFixed(4)}`).join(" ");
  const fill = gradient ? "url(#ldr-mark-grad)" : "currentColor";
  return (
    <svg className={className} viewBox="-0.66 -0.52 1.32 1.04" aria-hidden focusable="false">
      {gradient && (
        <defs>
          {/* the hero's gradient, across the whole mark */}
          <linearGradient id="ldr-mark-grad" x1="-0.6" y1="0.5" x2="0.6" y2="-0.5" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b1590" />
            <stop offset="0.55" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#ff3d8b" />
          </linearGradient>
        </defs>
      )}
      <polygon points={pts} fill={fill} />
      <circle cx={dot.cx} cy={-dot.cy} r={dot.r} fill={fill} />
    </svg>
  );
}

export default function Preloader() {
  const pathname = usePathname();
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  /* the look: light unless ?ldr=dark (read once, client side) */
  const [light, setLight] = useState(true);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ldr") === "dark") setLight(false);
  }, []);

  /* frozen at mount: this belongs to the document load, not the route */
  const [silent] = useState(() =>
    SILENT_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`)),
  );

  useEffect(() => {
    if (silent) return;
    const root = rootRef.current;
    if (!root) return;

    const W = window as Window & { __preloaderDone?: boolean; __zhReady?: boolean };
    const unlockScroll = lockScroll();
    const timers: number[] = [];
    const anims: Animation[] = [];
    let announced = false;
    let finished = false;

    /* the page is being revealed: the heroes start their intros now */
    const announce = () => {
      if (announced) return;
      announced = true;
      W.__preloaderDone = true;
      window.dispatchEvent(new Event("preloader:done"));
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      announce();
      unlockScroll();
      setDone(true);
    };
    /* the site must never stay locked behind this overlay */
    timers.push(window.setTimeout(finish, 8000));

    const words = Array.from(root.querySelectorAll<HTMLElement>(".ldr__name"));
    const hero = () => document.querySelector<HTMLElement>(".zh-frame");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("ldr--static");
      timers.push(
        window.setTimeout(() => {
          announce();
          root.classList.add("ldr--fade");
        }, REDUCED_HOLD),
        window.setTimeout(finish, REDUCED_HOLD + REDUCED_FADE),
      );
      return () => {
        timers.forEach(clearTimeout);
        unlockScroll();
      };
    }

    /* the words: each fades and lifts in, holds, and fades and lifts out */
    let t = 0;
    words.forEach((w, i) => {
      const hold = i === 0 ? FIRST_HOLD : i === words.length - 1 ? LAST_HOLD : STEP;
      const f = Math.min(0.3, FADE / hold);
      anims.push(
        w.animate(
          [
            { opacity: 0, transform: "translateY(0.12em)", easing: EASE },
            { opacity: 1, transform: "translateY(0)", offset: f },
            { opacity: 1, transform: "translateY(0)", offset: 1 - f, easing: "ease-in" },
            { opacity: 0, transform: "translateY(-0.12em)" },
          ],
          { duration: hold, delay: t, fill: "both" },
        ),
      );
      t += hold;
    });

    /* the sheet lifts away */
    const lift = () => {
      if (finished) return;
      announce();
      const a = root.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], {
        duration: LIFT,
        easing: EASE_INOUT,
        fill: "forwards",
      });
      anims.push(a);
      a.onfinish = finish;
      /* a background tab can stall the animation clock; the timer can't be */
      timers.push(window.setTimeout(finish, LIFT + 60));
    };

    /* on the homepage, lift only once the 3D hero is lit (or after a grace) */
    const liftWhenReady = () => {
      if (!document.querySelector(".zh-frame") || W.__zhReady) return lift();
      const go = () => {
        window.removeEventListener("zh:ready", go);
        lift();
      };
      window.addEventListener("zh:ready", go);
      timers.push(window.setTimeout(go, READY_GRACE));
    };

    /* after the words: the logo, then the lift */
    timers.push(
      window.setTimeout(() => {
        const m = markRef.current;
        if (m)
          anims.push(
            m.animate(
              [
                { opacity: 0, transform: "scale(0.9)" },
                { opacity: 1, transform: "scale(1)" },
              ],
              { duration: MARK_IN, easing: EASE, fill: "both" },
            ),
          );
        timers.push(window.setTimeout(liftWhenReady, MARK_IN + MARK_HOLD));
      }, t),
    );

    return () => {
      finished = true;
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      unlockScroll();
    };
  }, [silent]);

  if (silent || done) return null;

  return (
    <div ref={rootRef} className={`preloader ldr ldr--${light ? "light" : "dark"}`} aria-hidden role="presentation">
      <div className="ldr__stage">
        {NAMES.map((n, i) => (
          <span
            key={i}
            className="ldr__name"
            /* 0 -> 1 along the run: how far into the gradient this word is */
            style={{ "--t": (i / (NAMES.length - 1)).toFixed(3) } as React.CSSProperties}
          >
            {n}
          </span>
        ))}
        <div ref={markRef} className="ldr__mark">
          <Mark gradient={light} />
        </div>
      </div>
    </div>
  );
}
