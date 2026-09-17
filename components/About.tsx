"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import PageLink from "./PageLink";
import AboutTagPile from "./AboutTagPile";

const EASE = [0.22, 1, 0.36, 1] as const;

/*
  The About panel - the bridge between the dark draggable hero and the rest
  of the portfolio, and the one place on the home page that says who this is
  in the first person.

  It is laid out as a single centred statement with a pile of tags settling
  under it, which is a composition that only works if it is allowed to be
  mostly empty: a greeting, one large serif sentence, one line of detail,
  and then colour arriving all at once at the bottom edge. Everything that
  used to compete with that sentence - a dark bio card, four counting stats,
  a section marker - is gone rather than rearranged.

  Structure:

  .about (white, rises over the pinned hero via the aboutStage
          margin-top:-100vh panel mechanic, then pins for the Statement)
    |- .about__steps   (five flat, sharp-cornered white bands anchored to
    |    the panel's top edge - a stepped skyline, centre tallest - whose
    |    heights grow linearly with this section's own scroll progress, so
    |    the silhouette starts flush and spreads apart as the panel rises -
    |    self-contained rAF loop, writes only its own CSS var, never
    |    touches Hero.tsx's drag state)
    \- .about__inner (clips; everything lives here)
         |- DotField      (canvas micro-dot grid - near-invisible grey/
         |    purple glow that only shows near the cursor)
         |- .about__content (the greeting, the statement, the detail line)
         \- .aboutTags    (the pile, pinned to the bottom edge and cut off
              by it, so the field reads as continuing past the fold)
*/

/*
  The greeting.

  A name, a face and two words, set small directly above a very large
  sentence. The size gap is the whole device: it reads as somebody saying
  hello before making a claim, which is what stops the claim sounding like a
  slogan.
*/
function Greeting() {
  return (
    <motion.p
      className="aboutHi"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <span>Hello</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="aboutHi__face" src="/about/avatar.webp" alt="" width={112} height={112} />
      <span>I&rsquo;m Aayush</span>
    </motion.p>
  );
}

function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.closest(".about") as HTMLElement | null;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !section || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GAP = 26;
    const RADIUS = 160;
    const DECAY = 0.9;

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    const pointer = { x: -9999, y: -9999, active: false };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      heat = new Float32Array(cols * rows);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    const setPointer = (clientX: number, clientY: number) => {
      const rect = section.getBoundingClientRect();
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.active = true;
    };
    const onMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    };
    const onLeave = () => {
      pointer.active = false;
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    section.addEventListener("touchmove", onTouch, { passive: true });
    section.addEventListener("touchend", onLeave, { passive: true });
    section.addEventListener("touchcancel", onLeave, { passive: true });

    // Nearly invisible grey by default — small enough that it never
    // competes with text; only a soft purple brand-accent glow near the
    // pointer makes it read as intentional.
    const paintStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(31, 31, 31, 0.05)";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          ctx.beginPath();
          ctx.arc(x * GAP, y * GAP, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const cleanup = () => {
      ro.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("touchmove", onTouch);
      section.removeEventListener("touchend", onLeave);
      section.removeEventListener("touchcancel", onLeave);
    };

    if (reduced) {
      paintStatic();
      return cleanup;
    }

    // Pause the draw loop while the section is off-screen.
    let visible = false;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(section);

    let raf = 0;
    function draw() {
      if (!visible) {
        raf = 0;
        return;
      }
      ctx!.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const px = x * GAP;
          const py = y * GAP;
          if (pointer.active) {
            const d = Math.hypot(px - pointer.x, py - pointer.y);
            if (d < RADIUS) {
              const falloff = Math.pow(1 - d / RADIUS, 1.6);
              if (falloff > heat[i]) heat[i] = falloff;
            }
          }
          const hv = heat[i];
          heat[i] = hv > 0.003 ? hv * DECAY : 0;

          // Base dots stay ink-grey and near-invisible; heat blends them
          // toward the brand purple, so the interaction itself is the
          // section's only real dose of purple.
          const base = 0.045 + hv * 0.02;
          const purple = hv * 0.34;
          const r = 1 + hv * 0.85;
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${Math.round(31 + hv * 93)}, ${Math.round(31 + hv * 27)}, ${Math.round(
            31 + hv * 206
          )}, ${(base + purple).toFixed(3)})`;
          ctx!.arc(px, py, r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      cleanup();
    };
  }, []);

  return <canvas className="about__dots" ref={canvasRef} aria-hidden />;
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const steps = stepsRef.current;
    if (!steps || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Stepped-band transition progress, driven purely by this section's own
    // scroll position — independent of the hero's rAF loop, so it can't
    // touch drag/grid/ruler state. Linear (scrub-true): each band's height
    // above the panel's top edge is its max height × p, so the skyline
    // starts nearly flush and spreads apart as the panel rises — matching
    // the live-site recording frame for frame.
    /* Parked unless the panel is near the viewport. Unconditional, this
       loop forced a synchronous layout (getBoundingClientRect) 60x a second
       for the entire life of the page, long after the bands finished
       animating — dead weight under every later section's scrolling. */
    let raf = 0;
    /* true for the first frames so the bands get a --transP before the
       observer's first async callback; parked immediately after if the
       panel is off-screen. */
    let visible = true;
    let lastP = "";

    const loop = () => {
      raf = 0;
      if (!visible) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, 1 - r.top / vh)).toFixed(4);
      if (p !== lastP) {
        lastP = p;
        steps.style.setProperty("--transP", p);
      }
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const bandIo = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        wake();
      },
      { rootMargin: "200px 0px" }
    );
    bandIo.observe(section);

    return () => {
      bandIo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="about" id="about" ref={sectionRef}>
      <div className="about__steps" ref={stepsRef} aria-hidden>
        <span className="about__step about__step--l2" />
        <span className="about__step about__step--l1" />
        <span className="about__step about__step--c" />
        <span className="about__step about__step--r1" />
        <span className="about__step about__step--r2" />
      </div>

      <div className="about__inner">
        <DotField />

        <div className="about__content">
          <Greeting />

          {/*
            The line breaks are authored rather than left to the measure.
            A sentence set this large is a shape before it is a sentence, and
            letting it wrap on its own puts the break wherever the window
            happens to be wide - the three-line stack, with the short last
            line, is the composition. Below 900px it falls back to wrapping,
            where the shape stops being readable anyway.
          */}
          <motion.h2
            className="aboutSay"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.72, delay: 0.06, ease: EASE }}
          >
            I turn <em>complex problems</em>{" "}
            <br />
            into products that{" "}
            <br />
            <em>feel obvious.</em>
          </motion.h2>

          <motion.p
            className="aboutNow"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
          >
            Working across <b>product thinking</b>, interaction{" "}
            <br />
            design, <b>visual systems</b> and prototyping.
          </motion.p>
        </div>

        <AboutTagPile />
      </div>
    </section>
  );
}
