"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import { markOutline } from "./markGeometry";
import type { ScrollState } from "./scroll";
import "./zhu.css";

/*
  /test/zhu - the guillaumezhu.com hero, in the Aayush Visuals purple.

  DOM: the rounded inset frame, the nav pill, the wordmark, the scroll
  lines, and the real (visually hidden) name for search and screen readers.
  3D: one canvas (Scene) - flowing backdrop, the name drawn in-scene, and
  the extruded logo mark that weaves through it and turns to glass on hover.

  The canvas is client-only and code-split, so three.js loads here and
  nowhere else. A CSS gradient poster sits under it while it loads; without
  WebGL the poster stays and the name + a flat SVG mark are shown instead.
*/

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const NAV = [
  { label: "Home", href: "/" },
  { label: "Journey", href: "/about" },
  { label: "Projects", href: "/work" },
  { label: "Experiments", href: "/playground" },
  { label: "Contact", href: "/contact" },
];

/* the same measured outline as the 3D mark, as a flat SVG for the fallback */
function FlatMark({ className }: { className?: string }) {
  const { bar, dot } = markOutline();
  const pts = bar.map(([x, y]) => `${x.toFixed(4)},${(-y).toFixed(4)}`).join(" ");
  return (
    <svg className={className} viewBox="-0.66 -0.52 1.32 1.04" aria-hidden focusable="false">
      <polygon points={pts} fill="currentColor" />
      <circle cx={dot.cx} cy={-dot.cy} r={dot.r} fill="currentColor" />
    </svg>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/*
  `embedded` is the homepage form: no own nav or logo (the site's Navbar and
  MobileNav are already there), no trailing spacer, a <div> rather than
  <main>, and one extra screen on the pin so the whole sequence finishes
  before the About panel rises over the held frame.
*/
export default function ZhuHero({ embedded = false }: { embedded?: boolean }) {
  const [gl, setGl] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(false);
  const [entered, setEntered] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLElement>(null);
  const scroll = useRef<ScrollState>({ p: 0, v: 0 });

  /*
    The pin, after the reference: the hero holds for --zh-pin px of scroll
    (3500, 2800 on touch) while p runs 0 -> 1 and drives the 3D scene. Past
    the pin the frame squeezes (x 0.96, y 0.9) as it scrolls away.
  */
  useEffect(() => {
    const st = stage.current,
      fr = frame.current;
    if (!st || !fr) return;
    let lastY = window.scrollY,
      lastT = performance.now(),
      raf = 0,
      idle = 0;
    const measure = () => {
      raf = 0;
      const r = st.getBoundingClientRect();
      /* the pin length itself (--zh-pin), not the stage height: embedded,
         the stage carries one more screen after the pin for the hand-off */
      const pin = Math.max(1, parseFloat(getComputedStyle(st).getPropertyValue("--zh-pin")) || 3500);
      const passed = -r.top;
      scroll.current.p = Math.min(1, Math.max(0, passed / pin));
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      scroll.current.v = ((window.scrollY - lastY) / dt) * 1000;
      lastY = window.scrollY;
      lastT = now;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => (scroll.current.v = 0), 120);
      const exitLen = Math.min(850, Math.max(500, window.innerHeight * 0.85));
      const e = Math.min(1, Math.max(0, (passed - pin) / exitLen));
      const ease = e * e; // power2.in, like the reference
      fr.style.transform = e > 0 ? `scale(${1 - 0.04 * ease}, ${1 - 0.1 * ease})` : "";
      /* the page's side rails stay off over the hero (globals.css), until
         the panel after it has covered half the screen */
      document.documentElement.classList.toggle("in-zh-hero", passed < pin + window.innerHeight * 0.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.documentElement.classList.remove("in-zh-hero");
    };
  }, []);

  useEffect(() => {
    setGl(hasWebGL());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    /* the intro waits for the site preloader, if there is one */
    const w = window as Window & { __preloaderDone?: boolean };
    const go = () => setEntered(true);
    if (w.__preloaderDone || !document.querySelector(".ldr")) go();
    window.addEventListener("preloader:done", go);
    const failsafe = window.setTimeout(go, 7500);
    return () => {
      window.removeEventListener("preloader:done", go);
      window.clearTimeout(failsafe);
    };
  }, []);

  const Wrap = embedded ? "div" : "main";
  return (
    <Wrap className={`zh${embedded ? " zh--embedded" : ""}`}>
      <div className="zh-stage" ref={stage}>
      <div className="zh-pin">
      <section className="zh-frame" ref={frame} aria-labelledby="zh-title" data-surface="glass">
        {/* the homepage already has its h1 */}
        {embedded ? (
          <p id="zh-title" className="zh-sr">
            Aayush Visuals
          </p>
        ) : (
          <h1 id="zh-title" className="zh-sr">
            Aayush Visuals
          </h1>
        )}
        <p className="zh-sr">Product designer and design engineer.</p>

        {/* poster: the backdrop's palette in CSS, under the canvas */}
        <div className="zh-poster" aria-hidden />
        {gl && <Scene reduced={reduced} entered={entered} scroll={scroll} />}
        {gl === false && (
          <div className="zh-fallback" aria-hidden>
            <span className="zh-fallback__name">
              aayush
              <br />
              visuals
            </span>
            <FlatMark className="zh-fallback__mark" />
          </div>
        )}

        {!embedded && (
        <Link href="/" className="zh-logo" aria-label="Aayush Visuals, home">
          <LogoMark className="zh-logo__svg" />
        </Link>

        )}
        {!embedded && (
        <nav className="zh-nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="zh-nav__link">
              {n.label}
            </Link>
          ))}
        </nav>
        )}

        <div className="zh-scroll" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={i === 0 ? "is-active" : undefined} />
          ))}
        </div>
      </section>
      </div>
      </div>
      {/* room to scroll past the pin; the frame squeezes away over it */}
      {!embedded && <div className="zh-after" aria-hidden />}
    </Wrap>
  );
}
