"use client";

import { useEffect, useRef } from "react";
import "./studio.css";

/*
  A hero synthesised from eight references rather than traced from one.

  What they all share: a single enormous display wordmark doing all the
  work, a flat saturated field, and small satellites - badges, pill labels,
  speech bubbles, doodles - orbiting it. What differs is only texture and
  shape language.

  The load-bearing idea here is borrowed from the two-tone liquid ones: the
  ground is split by an organic boundary, and the wordmark sits ACROSS it,
  so the letters change colour where they cross. That is one drawn idea
  rather than a pile of decoration, and everything else is tuned to stay
  out of its way.

  How the two-tone type works: the wordmark is rendered twice, in the two
  ground colours, stacked exactly. The top copy is clipped to the same path
  that draws the cream blob, using clipPathUnits="objectBoundingBox" so
  both are expressed in the same 0-1 space and cannot drift apart at any
  viewport size. Edit BLOB once and both follow.
*/

/* normalised (0-1) so the blob and the clip can share it */
/* The boundary has to cross the MIDDLE of the wordmark, not sit above it.
   Too high and the type is entirely ink-on-cream and the whole two-tone
   idea is invisible; this waves between 0.38 and 0.64, which cuts through
   the letters of both lines. */
const BLOB =
  "M0,0.58 C0.13,0.45 0.25,0.66 0.39,0.60 C0.53,0.53 0.57,0.37 0.71,0.41 C0.85,0.45 0.93,0.61 1,0.51 L1,1 L0,1 Z";

function Badge() {
  return (
    <div className="stBadge" aria-hidden>
      <svg viewBox="0 0 120 120" className="stBadge__ring">
        <defs>
          <path id="stBadgePath" d="M60,60 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0" fill="none" />
        </defs>
        <text className="stBadge__text">
          <textPath href="#stBadgePath" startOffset="0">
            PORTFOLIO 2026 &nbsp;&bull;&nbsp; PRODUCT DESIGN &nbsp;&bull;&nbsp;
          </textPath>
        </text>
      </svg>
      <span className="stBadge__dot" />
    </div>
  );
}

/* the flat doodles: a star with a face, and a flower */
function Star() {
  return (
    <svg className="stDoodle stDoodle--star" viewBox="0 0 100 100" aria-hidden>
      <path
        fill="#e8834a"
        d="M50 2 L60 32 L92 20 L72 47 L98 62 L66 66 L72 97 L50 74 L28 97 L34 66 L2 62 L28 47 L8 20 L40 32 Z"
      />
      <path d="M38 50 q5 6 10 0" stroke="#231a12" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M56 50 q5 6 10 0" stroke="#231a12" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M44 62 q8 8 16 0" stroke="#231a12" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Flower() {
  return (
    <svg className="stDoodle stDoodle--flower" viewBox="0 0 100 100" aria-hidden>
      <g fill="#f4c543">
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={i} cx="50" cy="24" rx="9" ry="25" transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="11" fill="#e8834a" />
    </svg>
  );
}

export default function StudioHero({ displayClass }: { displayClass: string }) {
  const stageRef = useRef<HTMLElement>(null);

  /* The satellites drift a few pixels against the pointer. Parallax, not
     pursuit: it should read as depth, not as the page chasing the mouse. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        stage.style.setProperty("--px", tx.toFixed(3));
        stage.style.setProperty("--py", ty.toFixed(3));
      });
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      stage.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="stStage" ref={stageRef}>
      {/* the clip the two-tone wordmark uses - same path as the blob */}
      <svg className="stDefs" aria-hidden>
        <defs>
          <clipPath id="stBlobClip" clipPathUnits="objectBoundingBox">
            <path d={BLOB} />
          </clipPath>
        </defs>
      </svg>

      {/* the squiggle, behind everything */}
      {/* `slice`, not `none`: stretching the viewBox to the stage also
          stretches the stroke, and on a portrait screen a 46px accent line
          becomes a 4x-thick band. Cropping keeps it a line. */}
      <svg className="stSquiggle" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path
          d="M-40 210 C 210 90, 320 300, 560 215 S 930 95, 1240 175"
          fill="none"
          stroke="#f4c543"
          strokeWidth="46"
          strokeLinecap="round"
        />
      </svg>

      {/* the cream half */}
      <svg className="stBlob" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
        <path d={BLOB} fill="#f2ede6" />
      </svg>

      <div className={`stWord ${displayClass}`}>
        <h1 className="srOnly">Aayush Visuals - product designer and design engineer</h1>

        {/* copy one: cream, reads against the purple ground */}
        <div className="stWord__layer stWord__layer--base" aria-hidden>
          <span className="stWord__line">AAYUSH</span>
          <span className="stWord__line stWord__line--b">VISUALS</span>
        </div>

        {/* copy two: ink, clipped to the blob, so letters flip colour as
            they cross the boundary */}
        <div className="stWord__layer stWord__layer--cut" aria-hidden>
          <span className="stWord__line">AAYUSH</span>
          <span className="stWord__line stWord__line--b">VISUALS</span>
        </div>
      </div>

      <Badge />
      <Star />
      <Flower />

      <span className="stPill stPill--a">product design</span>
      <span className="stPill stPill--b">design engineering</span>
      <span className="stPill stPill--c">india</span>

      <div className="stBubble" aria-hidden>
        <span>open for work</span>
      </div>

      {/* grain, over everything */}
      <div className="stGrain" aria-hidden />
    </section>
  );
}
