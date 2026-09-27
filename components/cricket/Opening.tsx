"use client";

import { useCallback, useEffect, useRef } from "react";
import { AVMark, LeagueCrest } from "./kit";
import { Crest } from "./crests";
import { TEAMS } from "./teams";
import { useAssets } from "./useAssets";

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
  /* the match does not begin until it can be played properly — see
     useAssets for why both sides are fetched before the pick screen */
  const { progress, ready } = useAssets();
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
    /*
      Watch the button, not the canvas.

      fit() writes the canvas's backing store, and stages.css now guarantees
      that writing it cannot change the canvas's layout box — see the note on
      .stgStart__spark for the replaced-element rule that made it able to.
      Observing the element whose size this element is derived *from* means
      the loop cannot close even if that guarantee is ever edited away: the
      only thing that can trigger a refit is the button actually resizing.
    */
    const ro = new ResizeObserver(fit);
    ro.observe(cv.parentElement ?? cv);

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

  const [a, b] = TEAMS;

  return (
    <div className="stg stg--pass">
      <div className="op">
        <p className="op__presents">
          <AVMark />
          Aayush Visuals presents
        </p>

        <LeagueCrest className="op__crest" />

        {/* the title, the tag and the matchup stand on a big league shield:
            navy, outlined, with a gold inner line and the two sides'
            colours meeting down the middle */}
        <div className="op__plate">
          <svg className="op__shield" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden focusable="false">
            <defs>
              <linearGradient id="opShieldFace" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3c62c8" />
                <stop offset="0.5" stopColor="#2445a6" />
                <stop offset="1" stopColor="#182f7d" />
              </linearGradient>
              <linearGradient id="opShieldGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe45c" />
                <stop offset="1" stopColor="#d18f00" />
              </linearGradient>
            </defs>
            <path
              d="M200 10 L386 34 V168 C386 230 300 268 200 292 C100 268 14 230 14 168 V34 Z"
              fill="#1b1d3a"
              transform="translate(0 8)"
            />
            <path
              d="M200 10 L386 34 V168 C386 230 300 268 200 292 C100 268 14 230 14 168 V34 Z"
              fill="url(#opShieldFace)"
              stroke="#1b1d3a"
              strokeWidth="6"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M14 34 L200 10 V292 C100 268 14 230 14 168 Z" fill="#7c3aed" opacity="0.28" />
            <path
              d="M200 26 L372 48 V166 C372 220 292 254 200 276 C108 254 28 220 28 166 V48 Z"
              fill="none"
              stroke="url(#opShieldGold)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M200 10 L386 34 V60 L200 38 L14 60 V34 Z" fill="#fff" opacity="0.12" />
          </svg>

        <h1 className="op__title">
          <span className="op__l1">Design</span>
          <span className="op__l2">Premier</span>
          <span className="op__l3">League</span>
        </h1>

        <p className="op__tag">Play the portfolio</p>

        <p className="op__match" aria-label={`${a.name} versus ${b.name}`}>
          <span className="op__side">
            <Crest id={a.id} field={a.colours.primary} emblem={a.colours.light} />
            {a.abbr}
          </span>
          <em>vs</em>
          <span className="op__side">
            {b.abbr}
            <Crest id={b.id} field={b.colours.primary} emblem={b.colours.light} />
          </span>
        </p>
        </div>

        {/* the bar stands in for the button until the match has loaded:
            the screen only ever shows the control that is currently true */}
        {!ready ? (
          <div
            className="op__load"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Loading the match"
          >
            <span className="op__loadLabel">
              Warming up <b>{Math.round(progress * 100)}%</b>
            </span>
            <span className="g-bar">
              <span className="g-bar__fill" style={{ display: "block", width: `${Math.max(4, progress * 100)}%` }} />
            </span>
          </div>
        ) : (
          <button
            ref={btnRef}
            type="button"
            className="g-btn op__go"
            onClick={onStart}
            onPointerEnter={() => (hotRef.current = true)}
            onPointerLeave={() => (hotRef.current = false)}
            onFocus={() => (hotRef.current = true)}
            onBlur={() => (hotRef.current = false)}
          >
            {!reduced && <canvas ref={sparkRef} className="op__spark" aria-hidden />}
            Take the field
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
