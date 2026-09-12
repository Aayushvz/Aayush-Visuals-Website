"use client";

import { useEffect, useRef } from "react";

/*
  The error code, as three objects that came loose.

  The homepage opens on a canvas you can throw things around, and this is
  the same idea at the other end of the site: the code is not printed on the
  page, it is lying on it. Grab a numeral and it follows the pointer; let go
  while moving and it keeps going, bounces off the edges of the stage and
  knocks the other two out of the way.

  DOM rather than canvas, deliberately. Three elements is nothing to move,
  the numerals stay real text in the site's own display face (so they are
  crisp at any pixel ratio and legible to a screen reader through the
  heading beside them), and there is no per-frame clearRect keeping a
  compositor layer permanently dirty.

  The loop PARKS. Air resistance brings everything to a stop, and once the
  fastest body is below REST with nobody holding one, the rAF stops being
  requested at all. A page that idles at zero frames is the difference
  between a toy and a battery drain, and on this project a canvas that
  redrew forever also hung the screenshot tool.
*/

type Body = {
  el: HTMLElement;
  /* centre, in stage pixels */
  x: number;
  y: number;
  /* pixels per 60fps frame, scaled by dt so the feel is frame-rate free */
  vx: number;
  vy: number;
  /* degrees, and degrees per frame */
  a: number;
  va: number;
  r: number;
};

/* air resistance per frame. High enough that a throw carries across the
   stage, low enough that nothing drifts for a quarter of a minute. */
const DAMP = 0.988;
const SPIN_DAMP = 0.975;
/* walls give back three quarters of what they take */
const WALL = 0.76;
/* below this the body is asleep, and when they all are the loop stops */
const REST = 0.04;

/* where the three start, as fractions of the stage, with the drift that
   carries them in. Fixed rather than random: an entrance that composes
   differently on every load is a page that never looks the way it was
   designed, and these three positions were chosen to clear the copy. */
const SEED: [number, number, number, number][] = [
  [0.18, 0.26, 0.9, 0.55],
  [0.5, 0.72, -0.55, -0.8],
  [0.83, 0.3, -0.75, 0.7],
];

export default function LooseGlyphs({ chars }: { chars: string[] }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const els = Array.from(
      stage.querySelectorAll<HTMLElement>(".errGlyph"),
    );
    if (!els.length) return;

    /*
      Reduced motion gets the objects, not the physics.

      Laying them out in a static row and refusing the drag is the honest
      reading of the preference: the page still says what it has to say with
      the same three numerals, it just never moves them.
    */
    if (reduce) {
      stage.dataset.still = "true";
      return;
    }

    let w = 0;
    let h = 0;
    /*
      Whether the three have ever been laid out against a real stage.

      The site opens behind a preloader, so the first measurement this
      component gets can be of a box with no size in it. Every seed position
      then multiplies out to zero, the clamp pins all three to the left wall,
      and the resize that arrives with the real width only ever remapped what
      was already there. Placing is deferred until there is something to
      place against.
    */
    let placed = false;
    const bodies: Body[] = els.map((el, i) => ({
      el,
      x: 0,
      y: 0,
      vx: SEED[i % SEED.length][2],
      vy: SEED[i % SEED.length][3],
      a: (i - 1) * 5,
      va: 0,
      r: 0,
    }));

    /*
      Geometry is measured here and never inside the loop.

      Reading offsetWidth next to a style write is what forces a synchronous
      layout on every frame; the loop below only ever writes.
    */
    const measure = (place: boolean) => {
      const rect = stage.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const seed = place && w > 1 && h > 1;
      if (seed) placed = true;
      bodies.forEach((b, i) => {
        /*
          offsetWidth, not getBoundingClientRect.

          The rect of a ROTATED element is the axis-aligned box around the
          rotated shape, which is bigger than the element. Measuring that
          every resize fed each body a slightly larger radius than the last,
          the three pushed each other apart on the next frame, and all of
          them ended up clamped against the walls. offsetWidth is a layout
          value and transforms cannot touch it.
        */
        const bw = b.el.offsetWidth;
        const bh = b.el.offsetHeight;
        /* a circle inside the glyph's box rather than around it: a numeral
           is mostly air at the corners, and a tight radius makes contact
           look like contact rather than like two bubbles meeting */
        b.r = Math.max(28, Math.min(bw, bh) * 0.46);
        if (seed) {
          const [fx, fy] = SEED[i % SEED.length];
          b.x = fx * w;
          b.y = fy * h;
        }
        if (w > 1 && h > 1) {
          b.x = Math.min(w - b.r, Math.max(b.r, b.x));
          b.y = Math.min(h - b.r, Math.max(b.r, b.y));
        }
      });
    };

    const draw = () => {
      for (const b of bodies) {
        b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-50%, -50%) rotate(${b.a}deg)`;
      }
    };

    measure(true);
    draw();

    /* ---- the loop ---- */

    let raf = 0;
    let last = 0;
    const held = new Map<number, { body: Body; dx: number; dy: number }>();

    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(2.5, (now - last) / 16.667) : 1;
      last = now;

      for (const b of bodies) {
        if (isHeld(b)) continue;

        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;

        const d = Math.pow(DAMP, dt);
        b.vx *= d;
        b.vy *= d;
        b.va *= Math.pow(SPIN_DAMP, dt);

        /* edges. The spin a wall imparts comes from the tangential
           component, so a numeral clipping the floor sideways rolls. */
        if (b.x - b.r < 0) {
          b.x = b.r;
          b.vx = Math.abs(b.vx) * WALL;
          b.va -= b.vy * 0.05;
        } else if (b.x + b.r > w) {
          b.x = w - b.r;
          b.vx = -Math.abs(b.vx) * WALL;
          b.va += b.vy * 0.05;
        }
        if (b.y - b.r < 0) {
          b.y = b.r;
          b.vy = Math.abs(b.vy) * WALL;
          b.va += b.vx * 0.05;
        } else if (b.y + b.r > h) {
          b.y = h - b.r;
          b.vy = -Math.abs(b.vy) * WALL;
          b.va -= b.vx * 0.05;
        }
      }

      /* three bodies, so every pair every frame is three checks */
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          collide(bodies[i], bodies[j]);
        }
      }

      draw();

      /* park once everything has settled and nobody is holding one */
      let fastest = 0;
      for (const b of bodies) {
        fastest = Math.max(fastest, Math.abs(b.vx), Math.abs(b.vy));
      }
      if (held.size || fastest > REST) {
        raf = requestAnimationFrame(step);
      } else {
        for (const b of bodies) {
          b.vx = 0;
          b.vy = 0;
          b.va = 0;
        }
        last = 0;
      }
    };

    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(step);
      }
    };

    function isHeld(b: Body) {
      for (const h of held.values()) if (h.body === b) return true;
      return false;
    }

    function collide(a: Body, b: Body) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const overlap = a.r + b.r - dist;
      if (overlap <= 0) return;

      const nx = dx / dist;
      const ny = dy / dist;

      /* separate first, so the next frame does not see them still inside
         each other and double the impulse */
      const push = overlap / 2;
      const aHeld = isHeld(a);
      const bHeld = isHeld(b);
      if (!aHeld) {
        a.x -= nx * (bHeld ? overlap : push);
        a.y -= ny * (bHeld ? overlap : push);
      }
      if (!bHeld) {
        b.x += nx * (aHeld ? overlap : push);
        b.y += ny * (aHeld ? overlap : push);
      }

      /* equal masses, so an elastic hit is just a swap of the velocity
         along the normal */
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel > 0) return;
      const imp = -rel * 0.86;
      if (!aHeld) {
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        a.va -= imp * 0.5;
      }
      if (!bHeld) {
        b.vx += imp * nx;
        b.vy += imp * ny;
        b.va += imp * 0.5;
      }
    }

    /* ---- picking one up ---- */

    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(
        ".errGlyph",
      );
      if (!el) return;
      const body = bodies.find((b) => b.el === el);
      if (!body) return;

      const rect = stage.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      held.set(e.pointerId, { body, dx: body.x - px, dy: body.y - py });
      body.vx = 0;
      body.vy = 0;
      el.dataset.held = "true";
      /* the one you are holding comes to the front and stays there, so a
         throw never passes behind the numeral it just hit */
      els.forEach((n) => (n.style.zIndex = n === el ? "3" : "2"));
      /* a synthetic pointer event has an id the browser will not capture */
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable; the window listeners below still track it */
      }
      e.preventDefault();
      wake();
    };

    const onMove = (e: PointerEvent) => {
      const grip = held.get(e.pointerId);
      if (!grip) return;
      const rect = stage.getBoundingClientRect();
      const nx = e.clientX - rect.left + grip.dx;
      const ny = e.clientY - rect.top + grip.dy;
      const b = grip.body;
      /* the velocity a release inherits is simply how far it moved this
         frame, which is what makes a flick feel like a flick */
      b.vx = nx - b.x;
      b.vy = ny - b.y;
      b.x = Math.min(w - b.r, Math.max(b.r, nx));
      b.y = Math.min(h - b.r, Math.max(b.r, ny));
      b.va += (nx - b.x - b.vx) * 0.01;
      wake();
    };

    const onUp = (e: PointerEvent) => {
      const grip = held.get(e.pointerId);
      if (!grip) return;
      held.delete(e.pointerId);
      delete grip.body.el.dataset.held;
      /* a throw that leaves at pointer speed is uncatchable; three quarters
         reads as the same gesture and stays on the stage */
      grip.body.vx *= 0.75;
      grip.body.vy *= 0.75;
      grip.body.va += grip.body.vx * 0.25;
      wake();
    };

    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const ro = new ResizeObserver(() => {
      /* the first resize that arrives with a real box is the one that gets
         to compose the scene, however late it is */
      if (!placed) {
        measure(true);
        draw();
        wake();
        return;
      }
      /* after that, keep them where they are relative to the box rather than
         resetting the composition every time a phone's address bar collapses */
      const prevW = w;
      const prevH = h;
      measure(false);
      if (prevW && prevH) {
        for (const b of bodies) {
          b.x = Math.min(w - b.r, Math.max(b.r, (b.x / prevW) * w));
          b.y = Math.min(h - b.r, Math.max(b.r, (b.y / prevH) * h));
        }
      }
      draw();
    });
    ro.observe(stage);

    wake();

    return () => {
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [chars]);

  return (
    <div className="errStage" ref={stageRef} aria-hidden>
      {chars.map((c, i) => (
        <span className="errGlyph" key={`${c}-${i}`}>
          {c}
        </span>
      ))}
    </div>
  );
}
