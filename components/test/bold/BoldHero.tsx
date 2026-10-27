"use client";

import { useEffect, useRef, useState } from "react";
import "./bold.css";

/*
  Poster hero.

  Three layers, back to front:
    1. Field   - flat electric violet with giant cropped letterforms
                 ("aa" + an italic serif "V") in a near tone, so the brand
                 name is the texture rather than a logo in a corner.
    2. Shards  - glass triangles drifting on their own float, nudged by
                 the cursor at different depths.
    3. Copy    - a condensed three-line headline; the last line drops to
                 ink so the sentence lands on it.

  Chrome sits on the frame edges: logo, menu pill, CTA pill, a cycling
  work reel bottom-left, a rotating scroll badge bottom-right.

  Motion is one rAF loop writing two CSS vars (--mx, --my) on the root.
  Under prefers-reduced-motion the loop never starts and every keyframe
  is switched off in CSS.
*/

const SHARDS = [
  // x, y in % of stage; s = size px; r = base rotation; d = parallax depth
  { x: 6, y: 18, s: 210, r: -18, d: 0.6 },
  { x: 22, y: 62, s: 150, r: 24, d: 1.2 },
  { x: 30, y: 10, s: 120, r: 160, d: 0.9 },
  { x: 47, y: 22, s: 190, r: 188, d: 1.5 },
  { x: 66, y: 8, s: 110, r: 40, d: 0.7 },
  { x: 72, y: 46, s: 170, r: -12, d: 1.1 },
  { x: 86, y: 18, s: 230, r: 72, d: 0.5 },
  { x: 88, y: 68, s: 140, r: 210, d: 1.3 },
  { x: 54, y: 78, s: 130, r: 12, d: 0.8 },
  { x: 12, y: 86, s: 180, r: -40, d: 1.0 },
];

const REEL = [
  { src: "/hero/futurepreneurs.webp", label: "Futurepreneurs" },
  { src: "/hero/fuzion.webp", label: "Fuzion identity" },
  { src: "/hero/food-app.webp", label: "Meal Maestro" },
  { src: "/hero/poster-design.webp", label: "Poster design" },
  { src: "/hero/app-interface.webp", label: "Poster campaign" },
];

function Shard({ s }: { s: (typeof SHARDS)[number] }) {
  return (
    <div
      className="bh-shard"
      style={
        {
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.s,
          height: s.s,
          "--r": `${s.r}deg`,
          "--d": s.d,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <div className="bh-shard__float">
        <svg viewBox="0 0 100 100" className="bh-shard__svg">
          <defs>
            <linearGradient id={`g${s.x}${s.y}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".42" />
              <stop offset=".55" stopColor="#c9b8ff" stopOpacity=".12" />
              <stop offset="1" stopColor="#fff" stopOpacity=".04" />
            </linearGradient>
          </defs>
          <polygon points="50,6 96,90 4,90" fill={`url(#g${s.x}${s.y})`} />
          <polygon
            points="50,6 96,90 4,90"
            fill="none"
            stroke="#ff7ad9"
            strokeOpacity=".55"
            strokeWidth=".8"
            transform="translate(.9 .6)"
          />
          <polygon
            points="50,6 96,90 4,90"
            fill="none"
            stroke="#fff"
            strokeOpacity=".75"
            strokeWidth=".7"
          />
        </svg>
      </div>
    </div>
  );
}

export default function BoldHero() {
  const root = useRef<HTMLElement>(null);
  const [reel, setReel] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--mx", cx.toFixed(4));
      el.style.setProperty("--my", cy.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    const id = window.setInterval(() => setReel((r) => (r + 1) % REEL.length), 2600);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="bh" ref={root} aria-label="Aayush Visuals">
      {/* 1. Field */}
      <div className="bh-field" aria-hidden>
        <span className="bh-giant bh-giant--a">aa</span>
        <span className="bh-giant bh-giant--v">V</span>
        <span className="bh-giant bh-giant--dot" />
        <span className="bh-giant bh-giant--y">y</span>
      </div>

      {/* 2. Shards */}
      <div className="bh-shards">
        {SHARDS.map((s, i) => (
          <Shard key={i} s={s} />
        ))}
      </div>

      {/* Chrome: top */}
      <header className="bh-top">
        <a href="/" className="bh-logo">
          aayush<sup>vz</sup>
        </a>
        <button className="bh-menu" type="button">
          <span className="bh-menu__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          Menu
        </button>
        <a href="/contact" className="bh-cta">
          Start a project
        </a>
      </header>

      {/* 3. Copy */}
      <div className="bh-center">
      <h1 className="bh-title">
        <span className="bh-line">
          <span style={{ "--i": 0 } as React.CSSProperties}>Bold ideas</span>
        </span>
        <span className="bh-line">
          <span style={{ "--i": 1 } as React.CSSProperties}>deserve</span>
        </span>
        <span className="bh-line bh-line--ink">
          <span style={{ "--i": 2 } as React.CSSProperties}>better design</span>
        </span>
      </h1>
      <p className="bh-sub">
        Aayush Raj · UI/UX, product design and design engineering · Vellore, India
      </p>
      </div>

      {/* Chrome: bottom */}
      <a href="/#works" className="bh-reel" aria-label="See selected work">
        <span className="bh-reel__tag">
          <i aria-hidden /> Selected work
        </span>
        <span className="bh-reel__frame">
          {REEL.map((r, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={r.src}
              src={r.src}
              alt=""
              className={i === reel ? "is-on" : ""}
              draggable={false}
            />
          ))}
        </span>
        <span className="bh-reel__meta">
          <b>{REEL[reel].label}</b>
          <span>
            {String(reel + 1).padStart(2, "0")} / {String(REEL.length).padStart(2, "0")}
          </span>
        </span>
      </a>

      <a href="/#works" className="bh-plus" aria-label="More work">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </a>

      <div className="bh-scroll" aria-hidden>
        <svg viewBox="0 0 100 100">
          <defs>
            <path id="bh-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text>
            <textPath href="#bh-circle">Scroll · Scroll · Scroll · Scroll ·</textPath>
          </text>
        </svg>
        <span className="bh-scroll__arrow">↓</span>
      </div>
    </section>
  );
}
