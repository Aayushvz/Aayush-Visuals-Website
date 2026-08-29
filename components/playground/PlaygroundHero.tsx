"use client";

import { useEffect, useRef } from "react";
import { LIVE_COUNT } from "./experiments";

/*
  PlaygroundHero.

  The one drawn idea on this page: the word PLAYGROUND is not type sitting
  on a background, it is a floor. A handful of balls fall into the hero,
  land on the wordmark's top edge, roll along it and drop off the ends onto
  the bottom of the section. You can pick any of them up and throw it.

  Everything else in the hero is quiet on purpose (mono meta rows, one book
  weight paragraph) so the toy is the only thing asking for attention.

  Three things keep this cheap:

  - The loop SLEEPS. Once every ball has settled and nobody is pointing at
    the hero, the rAF is cancelled and the canvas holds its last frame. A
    canvas that clears and redraws forever keeps its compositor layer
    permanently invalid, which costs power on an idle tab and is a known
    way to hang headless capture.
  - It pauses entirely when the hero scrolls off screen.
  - Under prefers-reduced-motion nothing moves at all: the balls are placed
    at rest on the surfaces they would have fallen onto, drawn once.
*/

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /* the purple seamed one is the cricket ball, the rest are thin outlines */
  seam: boolean;
  spin: number;
  a: number;
  sleeping: boolean;
};

const GRAV = 0.42;
const REST = 0.62; /* bounce energy kept on a wall hit */
const ROLL = 0.988; /* horizontal drag while rolling on a surface */
const AIR = 0.998;
const SLEEP_V = 0.12; /* below this, and grounded, a ball stops simulating */

/* radii as a fraction of the hero's short side, so the toy scales with the
   section instead of being seven fixed pixel sizes that look wrong on a phone */
const SIZES = [0.052, 0.03, 0.038, 0.024, 0.044, 0.027, 0.034];

export default function PlaygroundHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const word = wordRef.current;
    if (!canvas || !host || !word) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    /* the wordmark's box in canvas space, refreshed on every resize */
    let shelf = { x: 0, y: 0, w: 0, h: 0 };
    let balls: Ball[] = [];

    let raf = 0;
    let running = false;
    let visible = true;
    let held: Ball | null = null;
    let heldPrev = { x: 0, y: 0 };

    const ink = "rgba(244, 241, 234, 0.34)";
    const inkStrong = "rgba(244, 241, 234, 0.62)";
    const purple = "#8b5cf6";

    /* ---- layout ---------------------------------------------------- */

    /*
      Fit the wordmark to the measure.

      A clamp()ed vw font-size can only ever be approximately right: the rail
      inset clamps at both ends, the scrollbar eats width, and the glyph
      advance depends on which face actually loaded. Any of those turns "fills
      the column" into either a clipped final letter or a dead gap. So the CSS
      clamp is only the pre-hydration guess, and this measures the real thing:
      set a known probe size, read the natural advance, scale to the column.

      It matters more here than it would on a normal headline, because this
      wordmark is the level geometry - the balls land on its box.
    */
    const titleEl = word.parentElement as HTMLElement | null;
    const inner = host.querySelector(".pgHero__inner") as HTMLElement | null;

    const fitTitle = () => {
      if (!titleEl || !inner) return;
      const cs = getComputedStyle(inner);
      const avail =
        inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail <= 0) return;
      titleEl.style.fontSize = "100px";
      const natural = word.getBoundingClientRect().width;
      if (!natural) {
        titleEl.style.fontSize = "";
        return;
      }
      titleEl.style.fontSize = `${Math.max(28, (avail / natural) * 100)}px`;
    };

    const measure = () => {
      fitTitle();
      const b = host.getBoundingClientRect();
      const wb = word.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = b.width;
      h = b.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /*
        Inset the shelf from the glyph box. A text bounding box includes the
        font's ascent and descent, so its top edge sits noticeably above the
        cap line and balls would appear to hover. Dropping the top by a
        fraction of the box height lands them on the letters.
      */
      shelf = {
        x: wb.left - b.left,
        y: wb.top - b.top + wb.height * 0.3,
        w: wb.width,
        h: Math.max(2, wb.height * 0.52),
      };
    };

    const shortSide = () => Math.min(w, h);

    const seed = () => {
      const s = shortSide();
      balls = SIZES.map((f, i) => {
        const r = Math.max(9, f * s);
        /* half start above the shelf so they land on the word, half start
           in the gap below it so the floor gets used too */
        const onWord = i % 2 === 0;
        const x = w * (0.1 + 0.13 * i) + (i % 3) * 18;
        const y = onWord
          ? shelf.y - r - (60 + i * 46)
          : shelf.y + shelf.h + r + 20 + (i % 3) * 14;
        return {
          x: Math.min(w - r - 4, Math.max(r + 4, x)),
          y,
          vx: reduced ? 0 : (i % 2 ? -1 : 1) * (0.4 + (i % 3) * 0.25),
          vy: 0,
          r,
          seam: i === 0,
          spin: 0,
          a: 0,
          sleeping: false,
        };
      });

      if (reduced) {
        /* place everything at rest instead of simulating a fall */
        for (const b of balls) {
          const overWord = b.x > shelf.x && b.x < shelf.x + shelf.w;
          const restY = b.y < shelf.y && overWord ? shelf.y - b.r : h - b.r - 2;
          b.y = restY;
          b.vx = 0;
          b.sleeping = true;
        }
      }
    };

    /* ---- simulation -------------------------------------------------- */

    const collideWalls = (b: Ball) => {
      if (b.x - b.r < 0) {
        b.x = b.r;
        b.vx = Math.abs(b.vx) * REST;
      } else if (b.x + b.r > w) {
        b.x = w - b.r;
        b.vx = -Math.abs(b.vx) * REST;
      }
      if (b.y + b.r > h) {
        b.y = h - b.r;
        b.vy = -Math.abs(b.vy) * REST;
        b.vx *= ROLL;
      } else if (b.y - b.r < 0) {
        b.y = b.r;
        b.vy = Math.abs(b.vy) * REST;
      }
    };

    /*
      Circle against the wordmark's rectangle, resolved on the axis of least
      penetration. Approaching from the top is the common case and the one
      that has to look right, so the vertical branch also applies rolling
      drag; the side branches just push the ball back out.
    */
    const collideShelf = (b: Ball) => {
      if (shelf.w <= 0) return;
      const cx = Math.max(shelf.x, Math.min(b.x, shelf.x + shelf.w));
      const cy = Math.max(shelf.y, Math.min(b.y, shelf.y + shelf.h));
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy > b.r * b.r) return;

      const fromTop = b.y < shelf.y + shelf.h / 2;
      const penY = fromTop ? shelf.y - (b.y + b.r) : shelf.y + shelf.h - (b.y - b.r);
      const fromLeft = b.x < shelf.x + shelf.w / 2;
      const penX = fromLeft ? shelf.x - (b.x + b.r) : shelf.x + shelf.w - (b.x - b.r);

      if (Math.abs(penY) <= Math.abs(penX)) {
        b.y += penY;
        b.vy = -b.vy * REST;
        b.vx *= ROLL;
      } else {
        b.x += penX;
        b.vx = -b.vx * REST;
      }
    };

    /* Pair response. Seven balls is 21 pairs, which is nothing, so the
       naive double loop is the right call here. */
    const collidePairs = () => {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = a.r + b.r;
          if (d === 0 || d >= min) continue;
          const nx = dx / d;
          const ny = dy / d;
          const push = (min - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel > 0) continue;
          const imp = -(1 + 0.5) * rel * 0.5;
          a.vx -= imp * nx;
          a.vy -= imp * ny;
          b.vx += imp * nx;
          b.vy += imp * ny;
          a.sleeping = false;
          b.sleeping = false;
        }
      }
    };

    const step = () => {
      for (const b of balls) {
        if (b === held || b.sleeping) continue;
        b.vy += GRAV;
        b.vx *= AIR;
        b.x += b.vx;
        b.y += b.vy;
        collideWalls(b);
        collideShelf(b);
        b.spin = b.vx / Math.max(1, b.r);
        b.a += b.spin;
      }
      collidePairs();

      /* settle test: grounded, slow, and not being thrown */
      for (const b of balls) {
        if (b === held) continue;
        const onFloor = b.y + b.r >= h - 0.8;
        const onShelf =
          Math.abs(b.y + b.r - shelf.y) < 1.2 &&
          b.x > shelf.x - b.r &&
          b.x < shelf.x + shelf.w + b.r;
        if ((onFloor || onShelf) && Math.abs(b.vy) < 1 && Math.abs(b.vx) < SLEEP_V) {
          b.vx = 0;
          b.vy = 0;
          b.sleeping = true;
        }
      }
    };

    /* ---- paint -------------------------------------------------------- */

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of balls) {
        if (b.seam) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = purple;
          ctx.fill();
          /* the seam, so it reads as a cricket ball and not a purple dot */
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.a);
          ctx.beginPath();
          ctx.ellipse(0, 0, b.r * 0.66, b.r * 0.95, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
          ctx.lineWidth = 1.1;
          ctx.setLineDash([b.r * 0.28, b.r * 0.2]);
          ctx.stroke();
          ctx.restore();
          ctx.setLineDash([]);
          continue;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = b === held ? inkStrong : ink;
        ctx.lineWidth = 1.25;
        ctx.stroke();
        /* one tick mark so rotation is legible on an empty outline */
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.beginPath();
        ctx.moveTo(0, -b.r);
        ctx.lineTo(0, -b.r * 0.55);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.25;
        ctx.stroke();
        ctx.restore();
      }
    };

    /* ---- loop, with a real off switch ---------------------------------- */

    const allAsleep = () => !held && balls.every((b) => b.sleeping);

    const frame = () => {
      step();
      draw();
      if (allAsleep()) {
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (reduced || running || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    /* ---- pointer ------------------------------------------------------- */

    const local = (e: PointerEvent) => {
      const b = host.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };

    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const p = local(e);
      let best: Ball | null = null;
      let bestD = Infinity;
      for (const b of balls) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.r + 14 && d < bestD) {
          best = b;
          bestD = d;
        }
      }
      if (!best) return;
      held = best;
      held.sleeping = false;
      heldPrev = { x: p.x, y: p.y };
      canvas.classList.add("pgHero__toys--holding");
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      /* a grab is a deliberate gesture on a canvas that otherwise lets the
         page scroll straight past it, so only then is the default suppressed */
      e.preventDefault();
      wake();
    };

    const onMove = (e: PointerEvent) => {
      if (reduced) return;
      const p = local(e);

      if (held) {
        held.x = p.x;
        held.y = p.y;
        held.vx = p.x - heldPrev.x;
        held.vy = p.y - heldPrev.y;
        heldPrev = { x: p.x, y: p.y };
        wake();
        return;
      }

      /* a passing cursor only disturbs what it actually touches, so moving
         across the hero does not restart the whole simulation */
      for (const b of balls) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.r + 26) {
          const k = (b.r + 26 - d) / (b.r + 26);
          b.vx += ((b.x - p.x) / (d || 1)) * k * 2.2;
          b.vy += ((b.y - p.y) / (d || 1)) * k * 2.2 - 0.6;
          b.sleeping = false;
          wake();
        }
      }
    };

    const release = (e?: PointerEvent) => {
      if (!held) return;
      /* cap the throw so a fast flick cannot tunnel a ball out of the box */
      held.vx = Math.max(-38, Math.min(38, held.vx));
      held.vy = Math.max(-38, Math.min(38, held.vy));
      held = null;
      canvas.classList.remove("pgHero__toys--holding");
      if (e) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
      wake();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    /* ---- lifecycle ----------------------------------------------------- */

    measure();
    seed();
    draw();
    if (!reduced) wake();

    /* the fitted size depends on which face actually loaded, so refit once
       the real one is in rather than leaving the wordmark, and therefore the
       collision box, sized to the fallback */
    let dead = false;
    document.fonts?.ready.then(() => {
      if (dead) return;
      measure();
      for (const b of balls) b.sleeping = false;
      draw();
      if (!reduced) wake();
    });

    const ro = new ResizeObserver(() => {
      const prev = { w, h };
      measure();
      if (!prev.w || !prev.h) {
        seed();
      } else {
        /* keep the toys where they are proportionally rather than dropping
           a fresh set every time a mobile browser bar hides */
        const sx = w / prev.w;
        const sy = h / prev.h;
        const s = shortSide();
        balls.forEach((b, i) => {
          b.x *= sx;
          b.y *= sy;
          b.r = Math.max(9, SIZES[i] * s);
          b.sleeping = false;
        });
      }
      draw();
      if (!reduced) wake();
    });
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          running = false;
        } else if (!reduced && !allAsleep()) {
          wake();
        }
      },
      { threshold: 0 }
    );
    io.observe(host);

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
    };
  }, []);

  return (
    <section className="pgHero" ref={hostRef}>
      <div className="pgHero__inner">
        <div className="pgHero__meta">
          <span className="pgHero__metaItem">
            <i className="pgHero__node" aria-hidden />
            Playground
          </span>
          <span className="pgHero__metaItem pgHero__metaItem--end">
            Unbriefed work, ongoing
          </span>
        </div>

        <h1 className="pgHero__title">
          <span className="pgHero__word" ref={wordRef}>
            Playground
          </span>
        </h1>

        <div className="pgHero__foot">
          <p className="pgHero__note">
            A room for the things nobody asked for. Half-finished toys,
            interface experiments, and one cricket game that got out of hand.
            It only gets messier from here.
          </p>
          <div className="pgHero__count">
            <span className="pgHero__countNum">
              {String(LIVE_COUNT).padStart(2, "0")}
            </span>
            <span className="pgHero__countLabel">
              live
              <br />
              experiment{LIVE_COUNT === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/*
        Above the type on purpose: the balls have to be able to sit on the
        wordmark's edge, and a ball drawn behind the letters reads as a
        background pattern rather than as an object resting on them.
      */}
      <canvas className="pgHero__toys" ref={canvasRef} aria-hidden />

      <p className="pgHero__hint" aria-hidden>
        Grab one. Throw it.
      </p>
    </section>
  );
}
