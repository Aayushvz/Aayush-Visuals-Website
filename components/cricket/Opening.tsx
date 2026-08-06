"use client";

import { useCallback, useEffect, useRef } from "react";

/*
  The opening title card.

  The stadium is already on screen behind this — the camera fly-in is the
  canvas layer's job, not a video and not a background image here. This
  component owns only what sits over it: the sting, and the one control.

  The staging is a broadcast cold open. Kicker, then title, then subtitle,
  then the button, each 180–280ms behind the last. That cadence is the whole
  effect: everything arriving at once reads as a web page, and everything
  arriving slowly reads as a loading screen.
*/

type Props = {
  onStart: () => void;
  reduced: boolean;
};

/* --- hover particles ---------------------------------------------------

   A pooled emitter on its own canvas. Pooled because the alternative is
   allocating a fresh object per spark at 60fps, which hands the garbage
   collector a steady drip of work and shows up as a stutter exactly when
   someone is hovering the most important button on the page.

   The pool is fixed at 48. Sparks past that are dropped rather than grown
   into, so the cost of this effect has a hard ceiling no matter how long
   someone waves their pointer around. */

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  hue: number;
  live: boolean;
};

const POOL = 48;

function makePool(): Spark[] {
  return Array.from({ length: POOL }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, hue: 44, live: false,
  }));
}

export default function Opening({ onStart, reduced }: Props) {
  const sparkRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const poolRef = useRef<Spark[]>(makePool());
  const rafRef = useRef(0);
  const hotRef = useRef(false);
  const lastRef = useRef(0);

  const spawn = useCallback((w: number, h: number) => {
    const pool = poolRef.current;
    for (const s of pool) {
      if (s.live) continue;
      /* emit from the button's silhouette rather than its centre, so the
         sparks look shed by the edge instead of sprayed from a point */
      const a = Math.random() * Math.PI * 2;
      const rx = w * 0.32, ry = h * 0.3;
      s.x = w / 2 + Math.cos(a) * rx * (0.75 + Math.random() * 0.35);
      s.y = h / 2 + Math.sin(a) * ry * (0.75 + Math.random() * 0.35);
      s.vx = Math.cos(a) * (0.15 + Math.random() * 0.5);
      s.vy = Math.sin(a) * (0.15 + Math.random() * 0.4) - 0.35;
      s.max = 620 + Math.random() * 620;
      s.life = s.max;
      s.r = 0.8 + Math.random() * 1.9;
      s.hue = 38 + Math.random() * 18;
      s.live = true;
      return;
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    const cv = sparkRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      const b = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(b.width * dpr));
      cv.height = Math.max(1, Math.round(b.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    const step = (t: number) => {
      rafRef.current = requestAnimationFrame(step);
      const dt = Math.min(48, t - (lastRef.current || t));
      lastRef.current = t;

      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);

      if (hotRef.current && Math.random() < 0.55) spawn(w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const s of poolRef.current) {
        if (!s.live) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.live = false;
          continue;
        }
        s.x += s.vx * dt * 0.06 * dpr;
        s.y += s.vy * dt * 0.06 * dpr;
        /* they rise and slow — embers, not confetti */
        s.vy -= 0.0006 * dt;
        s.vx *= 0.995;

        const k = s.life / s.max;
        /* fade in over the first 15% then out, so nothing pops into being */
        const a = k > 0.85 ? (1 - k) / 0.15 : k / 0.85;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr * (0.6 + k * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 92%, ${62 + k * 18}%, ${a * 0.85})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduced, spawn]);

  return (
    <div className="stg stg--pass">
      <div className="stgOpen">
        <p className="stgOpen__kicker">Aayush Raj presents</p>

        <h1 className="stgOpen__title">
          Design
          <br />
          Premier League
        </h1>

        <p className="stgOpen__sub">Play your portfolio</p>

        <button
          ref={btnRef}
          type="button"
          className="stgStart"
          onClick={onStart}
          onPointerEnter={() => (hotRef.current = true)}
          onPointerLeave={() => (hotRef.current = false)}
          onFocus={() => (hotRef.current = true)}
          onBlur={() => (hotRef.current = false)}
        >
          {!reduced && (
            <canvas ref={sparkRef} className="stgStart__spark" aria-hidden />
          )}
          <span className="stgStart__ring" aria-hidden />
          <span className="stgStart__body">
            Take the field
            <svg
              className="stgStart__arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
