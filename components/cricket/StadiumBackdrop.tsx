"use client";

import { useEffect, useRef } from "react";
import {
  buildScene,
  paintField,
  paintForegroundGrass,
  paintSky,
  paintStadium,
  paintStumps,
  type Scene,
} from "./scene";

/*
  The stadium, running behind the opening, team selection and the broadcast
  intro — every stage before a ball is bowled.

  It reuses scene.ts wholesale. That file already knows how to draw this
  ground and it is the same ground the match is played on, so drawing it a
  second way here would guarantee the two drift apart the first time either
  is touched.

  What this adds is the camera. scene.ts paints a fixed viewpoint; the fly-in
  is a transform applied to the whole context before any of it runs, which
  is why none of those functions had to learn about a camera to get one.

  The fly-in is a 5.5s ease from a high, wide, slightly-rolled view down to
  the pitch. The curve is the important part: `easeOutExpo` covers most of
  the distance in the first second and then creeps, which is how a real
  camera crane behaves and why a linear zoom always reads as a PowerPoint
  transition.
*/

const FLY_MS = 5500;

/* Strong deceleration. Almost all the travel is spent in the first third,
   leaving a long, near-static settle that the title can land against. */
function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

type Props = {
  /** true once the visitor has started — the camera holds at the pitch */
  settled: boolean;
  reduced: boolean;
};

export default function StadiumBackdrop({ settled, reduced }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const sceneRef = useRef<Scene | null>(null);
  const startRef = useRef(0);
  const settledRef = useRef(settled);

  useEffect(() => {
    settledRef.current = settled;
  }, [settled]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = () => {
      const b = cv.getBoundingClientRect();
      const w = Math.max(1, Math.round(b.width * dpr));
      const h = Math.max(1, Math.round(b.height * dpr));
      if (cv.width === w && cv.height === h) return;
      cv.width = w;
      cv.height = h;
      sceneRef.current = buildScene(w, h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const s = sceneRef.current;
      if (!s) return;
      if (!startRef.current) startRef.current = now;

      const w = cv.width;
      const h = cv.height;

      /*
        Reduced motion gets the destination, not the journey. Someone who
        has asked the OS to stop moving things does not want a five-second
        crane shot, but they should still see the same stadium.
      */
      const raw = reduced ? 1 : Math.min(1, (now - startRef.current) / FLY_MS);
      const k = easeOutExpo(raw);

      /* wide and high, easing to the framing scene.ts was composed for */
      const zoom = 1.28 - 0.28 * k;
      const lift = (1 - k) * h * 0.075;
      /* a degree and a half of roll that levels out — just enough to feel
         hand-held rather than mechanical, and gone by the time it matters */
      const roll = (1 - k) * 0.026;
      /* a slow drift that never stops, so the shot is never quite frozen
         even after the fly-in has landed */
      const drift = Math.sin(now / 6400) * w * 0.004 * (settledRef.current ? 0.5 : 1);

      ctx.save();
      ctx.translate(w / 2 + drift, h / 2 + lift);
      ctx.rotate(roll);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      paintSky(ctx, s, now);
      paintStadium(ctx, s);
      paintField(ctx, s);
      paintStumps(ctx, s, false);
      paintForegroundGrass(ctx, s);

      ctx.restore();

      /*
        A vignette and a cinematic wash, applied AFTER the camera so they
        stay locked to the frame rather than swimming with the zoom. This is
        what stops the overlay text sitting on a bright pitch and losing its
        contrast at the edges.
      */
      const vig = ctx.createRadialGradient(
        w / 2, h * 0.46, h * 0.16,
        w / 2, h * 0.5, h * 0.86
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      /* the fly-in starts nearly black and lifts as the camera arrives */
      if (raw < 1) {
        ctx.fillStyle = `rgba(6, 8, 14, ${(1 - k) * 0.72})`;
        ctx.fillRect(0, 0, w, h);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduced]);

  return <canvas ref={cvRef} className="stgBack" aria-hidden />;
}
