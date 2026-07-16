"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageLink from "./PageLink";

/*
  White "About / Impact" section — the bridge between the dark draggable
  hero and the rest of the portfolio. Purple appears only as a small brand
  accent (card dot, cursor-proximity glow, hover states) — the section itself
  is white/off-white.

  Structure:

  .about (white, rises over the pinned hero via the aboutStage
          margin-top:-100vh panel mechanic, then pins for the Statement)
    ├── .about__steps   (five flat, sharp-cornered white bands anchored to
    │     the panel's top edge — a stepped skyline, centre tallest — whose
    │     heights grow linearly with this section's own scroll progress, so
    │     the silhouette starts flush and spreads apart as the panel rises —
    │     self-contained rAF loop, writes only its own CSS var, never
    │     touches Hero.tsx's drag state)
    └── .about__inner (clips; everything lives here)
          ├── DotField        (canvas micro-dot grid — near-invisible grey/
          │     purple glow that only shows near the cursor)
          └── .about__content (padded in from the global .rails ruler frame)
                ├── marker + heading
                └── .about__grid → AboutIdentityCard + StatsComposition
*/

type Stat = {
  value: number;
  suffix: string;
  label: string;
  desc: string;
  duration: number;
};

const STATS: Stat[] = [
  {
    value: 5,
    suffix: "+",
    label: "years creating",
    desc: "Designing across product, interaction, visual systems, and motion.",
    duration: 1000,
  },
  {
    value: 30,
    suffix: "+",
    label: "projects shipped",
    desc: "From product interfaces and websites to complete digital experiences.",
    duration: 1300,
  },
  {
    value: 35,
    suffix: "+",
    label: "collaborations",
    desc: "Working across teams, startups, communities, and ambitious projects.",
    duration: 1450,
  },
  {
    value: 99,
    suffix: "%",
    label: "craft obsession",
    desc: "A constant push toward clearer interactions, stronger systems, and thoughtful details.",
    duration: 1650,
  },
];

function useCountUp(active: boolean, target: number, duration: number, delayMs: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const startTimer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, [active, target, duration, delayMs]);

  return value;
}

function StatItem({ stat, index, active }: { stat: Stat; index: number; active: boolean }) {
  const value = useCountUp(active, stat.value, stat.duration, index * 130);
  return (
    <div className={`aboutStat aboutStat--${index}`} data-reveal>
      <div className="aboutStat__row">
        <span className="aboutStat__num">
          {value}
          {stat.suffix}
        </span>
        <span className="aboutStat__label">{stat.label}</span>
      </div>
      <span className="aboutStat__rule" aria-hidden />
      <p className="aboutStat__desc">{stat.desc}</p>
    </div>
  );
}

const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const cardChild = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function AboutIdentityCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${(-py * 3.4).toFixed(2)}deg) rotateY(${(px * 3.4).toFixed(2)}deg) translateY(-4px)`;
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <motion.div
      className="aboutCard"
      ref={cardRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      variants={cardStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
    >
      <motion.span className="aboutCard__dot" variants={cardChild} aria-hidden />
      {/* Deliberate negative space below the copy — the card reads as a tall
          editorial object, per the approved reference. If a portrait is ever
          added, it belongs in this quiet zone. */}
      <motion.h3 className="aboutCard__name" variants={cardChild}>
        I&rsquo;m Aayush Raj
      </motion.h3>
      <motion.p className="aboutCard__desc" variants={cardChild}>
        I&rsquo;m a product designer and builder focused on turning complex problems into
        clear, intuitive digital experiences. I work across product thinking, interaction
        design, visual systems, and prototyping, from early ideas to polished, usable
        products.
      </motion.p>
      <motion.div variants={cardChild}>
        <PageLink href="/about" className="aboutCard__cta">
          About me
        </PageLink>
      </motion.div>
    </motion.div>
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
  const [statsActive, setStatsActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setStatsActive(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(section);

    const steps = stepsRef.current;
    if (!steps || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => io.disconnect();
    }

    // Stepped-band transition progress, driven purely by this section's own
    // scroll position — independent of the hero's rAF loop, so it can't
    // touch drag/grid/ruler state. Linear (scrub-true): each band's height
    // above the panel's top edge is its max height × p, so the skyline
    // starts nearly flush and spreads apart as the panel rises — matching
    // the live-site recording frame for frame.
    let raf = 0;
    const loop = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, 1 - r.top / vh));
      steps.style.setProperty("--transP", p.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      io.disconnect();
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
          <div className="about__marker" data-reveal>
            <span className="about__markerNum">02</span>
            <span className="about__markerLabel">About</span>
          </div>
          <h2 className="about__heading" data-reveal>
            From problem
            <br />
            to product.
          </h2>

          <div className="about__grid">
            <div className="about__cardCol">
              <AboutIdentityCard />
            </div>
            <div className="about__stats">
              {STATS.map((s, i) => (
                <StatItem key={s.label} stat={s} index={i} active={statsActive} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
