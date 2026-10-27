"use client";

import { useEffect, useRef } from "react";
import Wordmark, { Glyph } from "./Wordmark";
import { ink } from "./glyphs";
import { nibHull, type Pt } from "./nib";
import "./visuals.css";

/*
  Aayush Visuals - poster hero, set entirely in its own face.

  Two colours, nothing else: paper lilac and pen violet. The frame is held by
  giant cropped letterforms from the same nib face as the lockup, so the
  background is not decoration, it is the alphabet at a scale where you can
  see the pen working - the swell at a foot, the hairline of an upstroke.

  The lockup writes itself on load, stroke by stroke, in the order the pen
  would take. After that the cursor IS the pen: a nib at the face's own
  angle, leaving ink on the paper (beneath the letterforms) that dries and
  fades. The same nibHull() that built the alphabet draws the trail.

  Under prefers-reduced-motion: no writing animation, no parallax, no pen.
*/

type Giant = { k: string; cls: string; depth: number };

const GIANTS: Giant[] = [
  { k: "A", cls: "vz-g--A", depth: 0.5 },
  { k: "l", cls: "vz-g--l", depth: 0.9 },
  { k: "uI", cls: "vz-g--u", depth: 0.6 },
  { k: "dot", cls: "vz-g--dot", depth: 1.4 },
  { k: "iI", cls: "vz-g--i", depth: 0.8 },
  { k: "a", cls: "vz-g--a", depth: 0.55 },
  { k: "S", cls: "vz-g--S", depth: 0.7 },
];

const INK_LIFE = 1800; // ms an ink mark stays before it has fully dried away

export default function VisualsHero() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current,
      cv = canvas.current,
      nib = pen.current;
    if (!el || !cv || !nib) return;
    /* the entrance (giants settling, the lockup writing itself) waits for
       the site preloader to lift - otherwise it plays behind the overlay */
    const go = () => el.classList.add("vz--go");
    const w = window as Window & { __preloaderDone?: boolean };
    if (w.__preloaderDone || !document.querySelector(".ldr")) go();
    window.addEventListener("preloader:done", go);
    const failsafe = window.setTimeout(go, 7500);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce) {
      go();
      return () => {
        window.removeEventListener("preloader:done", go);
        window.clearTimeout(failsafe);
      };
    }

    /* ---- parallax ---- */
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;

    /* ---- pen ---- */
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      cv.width = el.clientWidth * dpr;
      cv.height = el.clientHeight * dpr;
    };
    fit();
    window.addEventListener("resize", fit);

    type Mark = { poly: Pt[]; t: number };
    const marks: Mark[] = [];
    let last: Pt | null = null;
    let px = -999,
      py = -999;
    const scale = Math.max(0.09, Math.min(0.14, el.clientWidth / 11000));

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      if (!fine || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const p: Pt = [e.clientX - r.left, e.clientY - r.top];
      px = p[0];
      py = p[1];
      const over = (e.target as HTMLElement).closest("a, button");
      el.classList.toggle("vz--link", !!over);
      if (over) {
        last = null;
        return;
      }
      if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 400) {
        marks.push({ poly: nibHull(last, p, scale), t: performance.now() });
      }
      last = p;
    };
    const onLeave = () => {
      last = null;
      px = py = -999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      el.style.setProperty("--mx", cx.toFixed(4));
      el.style.setProperty("--my", cy.toFixed(4));

      nib.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(-20deg)`;

      if (ctx) {
        const now = performance.now();
        while (marks.length && now - marks[0].t > INK_LIFE) marks.shift();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = getComputedStyle(el).getPropertyValue("--vz-ink").trim() || "#7c3aed";
        /* marks are batched into a few alpha levels and each level is ONE
           fill, so overlapping stamps union instead of stacking into bands */
        const LEVELS = 10;
        const paths: Path2D[] = Array.from({ length: LEVELS }, () => new Path2D());
        const used = new Array(LEVELS).fill(false);
        for (const m of marks) {
          const age = (now - m.t) / INK_LIFE;
          /* wet for the first third, then dries off */
          const a = age < 0.35 ? 1 : 1 - (age - 0.35) / 0.65;
          const lv = Math.min(LEVELS - 1, Math.floor(a * LEVELS));
          const p = paths[lv];
          m.poly.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
          p.closePath();
          used[lv] = true;
        }
        paths.forEach((p, lv) => {
          if (!used[lv]) return;
          ctx.globalAlpha = (lv + 1) / LEVELS;
          ctx.fill(p, "nonzero");
        });
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    el.classList.add("vz--pen");

    return () => {
      window.removeEventListener("preloader:done", go);
      window.clearTimeout(failsafe);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", fit);
      el.removeEventListener("pointerleave", onLeave);
      el.classList.remove("vz--pen");
    };
  }, []);

  return (
    <section className="vz" ref={root} aria-label="Aayush Visuals">
      {/* ink lives on the paper, under the letterforms */}
      <canvas className="vz-ink" ref={canvas} aria-hidden />

      <div className="vz-giants" aria-hidden>
        {GIANTS.map((g) => (
          <div
            key={g.cls}
            className={`vz-g ${g.cls}`}
            style={
              {
                "--d": g.depth,
                /* every giant shares one unit scale, so they read as one alphabet */
                "--gh": (ink(g.k).y1 - ink(g.k).y0).toFixed(1),
              } as React.CSSProperties
            }
          >
            <Glyph k={g.k} className="vz-g__svg" />
          </div>
        ))}
      </div>

      <header className="vz-top">
        <span className="vz-meta">Portfolio, 2026</span>
        <nav className="vz-nav" aria-label="Primary">
          <a href="/#works">Work</a>
          <a href="/about">Journey</a>
          <a href="/contact">Contact</a>
        </nav>
        <span className="vz-meta vz-meta--r">
          <i aria-hidden /> Taking new projects
        </span>
      </header>

      <h1 className="vz-mark">
        <Wordmark className="vz-mark__svg" />
      </h1>

      <footer className="vz-bottom">
        <span className="vz-meta">Product designer and design engineer</span>
        <span className="vz-meta vz-hint">Set in a typeface drawn with one pen. Move to write.</span>
        <span className="vz-meta vz-meta--r">Vellore, India</span>
      </footer>

      <div className="vz-pen" ref={pen} aria-hidden />
    </section>
  );
}
