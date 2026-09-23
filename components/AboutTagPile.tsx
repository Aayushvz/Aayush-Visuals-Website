"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import PageLink from "./PageLink";
import { CHIPS, PILLS } from "./aboutTags";

/*
  The tag pile, as a physics toy.

  The tags arrive one after another in the arrangement the reference lays
  out, sit there for a beat, and then fall: gravity comes on, they drop, and
  they stack up along the bottom of the band. After that they are objects -
  they can be picked up, dragged, and thrown, and they knock each other
  around when they land.

  Three things decide how this is built.

  It is matter-js rather than hand-rolled. The pile only reads as a pile if
  the tags collide with EACH OTHER, not just with the floor; without that
  they all come to rest on the same line, overlapping, which is the thing
  this was meant to fix. Rotating rounded rectangles resting on each other is
  exactly the problem a rigid-body solver exists for, and it is loaded
  dynamically, on approach, so it stays out of the first-load bundle.

  The world is the BAND, not the section. The band starts below the last line
  of text, so nothing in here can ever cover a word: the floor is the bottom
  of the section, the walls sit just outside the viewport, and a tag thrown
  hard stays in the box. That is a deliberate limit on the toy rather than an
  oversight - text that a reader has to fish a pill off is worse than a toy
  with a ceiling.

  The DOM is the renderer. There is no canvas: each tag is the same element
  it was before, and the loop writes a transform onto it every frame. That
  keeps the pills as real text - selectable, searchable, and in the case of
  the one that is a link, clickable - which a canvas would have thrown away.
*/

type Item = {
  label?: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  rot: number;
  bg: string;
  href?: string;
  size?: number;
  phone?: { x: number; y: number; rot: number };
  chip: boolean;
};

const ITEMS: Item[] = [
  ...PILLS.map((p) => ({ ...p, chip: false })),
  ...CHIPS.map((c) => ({ ...c, chip: true })),
];

/* one tag lands every so often, then the whole set is left alone for a beat
   before the floor gives way */
const POP_STEP = 70;
const POP_MS = 420;
const DWELL_MS = 900;

/* a drag under this many pixels is a click, so the one pill that is a link
   still behaves like one */
const CLICK_SLOP = 6;

/* px per step; a flick can leave at most this fast, or a hard throw puts a
   tag through the wall before the solver sees it */
const MAX_THROW = 32;

export default function AboutTagPile() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);

  /*
    Where the band starts, measured rather than guessed.

    The pile used to be a fixed share of the viewport, which put its top edge
    115px above the last line of text on a 1900x866 window and dropped a
    green pill straight through "across product thinking". The only number
    that cannot do that is the bottom of the text itself.
  */
  useEffect(() => {
    const wrap = wrapRef.current;
    const section = wrap?.closest(".about") as HTMLElement | null;
    if (!wrap || !section) return;

    let raf = 0;
    const place = () => {
      raf = 0;
      const now = section.querySelector(".aboutNow");
      if (!now) return;
      const top = now.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
      section.style.setProperty("--pile-top", `${Math.round(top + 26)}px`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };

    /* measured now, not next frame. A layout read inside an effect is
       already after layout, and waiting for rAF leaves the band at its
       fallback for a frame - or forever, if frames are not being served,
       which is exactly what happens in a backgrounded tab. */
    place();
    const ro = new ResizeObserver(schedule);
    ro.observe(section);
    if (document.fonts?.ready) document.fonts.ready.then(schedule);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const section = wrap?.closest(".about") as HTMLElement | null;
    if (!wrap || !section) return;
    /* reduced motion keeps the arrangement the stylesheet already draws:
       no fall, no throw, nothing that moves on its own */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dead = false;
    let teardown = () => {};

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void begin();
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(section);

    async function begin() {
      const mod = await import("matter-js");
      if (dead || !wrap) return;
      /*
        matter-js is CommonJS, and how a dynamic import of it resolves is up
        to the bundler: Node's ESM interop hands back { default: {...} } with
        no named exports at all, so destructuring Engine off the namespace
        gives undefined and the whole pile quietly never starts. Checked, it
        does exactly that. Taking default when it is there costs nothing and
        works whichever way the bundler decides.
      */
      const M = (mod as unknown as { default?: typeof mod }).default ?? mod;
      const { Engine, Bodies, Body, Composite } = M;

      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      if (!W || !H) return;

      const engine = Engine.create();
      engine.gravity.y = 1;

      /*
        Walls just outside the frame, so a tag can come to rest half off the
        edge the way the reference's do, and a thick floor so nothing can
        tunnel through it at speed.

        The overhang is a share of the width rather than a fixed 52px: that
        is 3.6% of a 1425 desktop and 13% of a 390 phone, and at 13% the
        chips - which are circles, and roll - ended up outside the screen.
        Replayed at 390, four of the five finished beyond the edge.
      */
      const edge = Math.min(52, W * 0.04);
      const T = 240;
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + T / 2, W + 800, T, { isStatic: true }),
        /*
          A lid, and the reason for it is the text above.

          The band is only as tall as the room left under the last line, and
          on a short phone that is less than a deep pile needs: at twenty
          tags the pile was taller than the band and simply kept stacking
          upward, straight over the statement. Thinning the phone set fixes
          this instance; the lid makes it structural, so no count, no throw
          and no window shape can ever put a tag on a word.
        */
        Bodies.rectangle(W / 2, -4 - T / 2, W + 800, T, { isStatic: true }),
        Bodies.rectangle(-edge - T / 2, H / 2, T, H * 4, { isStatic: true }),
        Bodies.rectangle(W + edge + T / 2, H / 2, T, H * 4, { isStatic: true }),
      ]);

      type Live = {
        body: Matter.Body;
        el: HTMLElement;
        w: number;
        h: number;
        born: number;
      };
      const live: Live[] = [];

      els.current.forEach((el, i) => {
        if (!el) return;
        /* the phone drops most of the set; a hidden element has no size and
           would seed a zero-width body sitting in the corner */
        if (getComputedStyle(el).display === "none") return;
        const item = ITEMS[i];
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!w || !h) return;
        const r = el.getBoundingClientRect();
        const wr = wrap!.getBoundingClientRect();
        const x = r.left - wr.left + r.width / 2;
        const y = r.top - wr.top + r.height / 2;

        const opts = {
          restitution: 0.22,
          friction: 0.45,
          frictionAir: 0.012,
          density: 0.0014,
        };
        const body = item.chip
          ? Bodies.circle(x, y, h / 2, opts)
          : /* chamfered to the pill's own radius, so they roll off each
               other at the ends instead of catching on square corners */
            Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: h / 2 } });
        Body.setAngle(body, (item.rot * Math.PI) / 180);
        /*
          A pill cannot be allowed to spin, because a pill is a word.

          Left free they tumble, and one landed reading bottom-to-top with
          REFRAMING PROBLEMS upside down, which is the one thing a label must
          never do. Infinite inertia locks the angle where it was set, so
          every pill keeps the tilt it was drawn at through the fall, the
          landing and any throw. It also stacks far more tidily, which is
          what lets the pile fill the band rather than sprawl across it.

          The chips keep their inertia. They are circles with a glyph in the
          middle and nothing to read upside down, and their rolling is most
          of what stops the pile looking like a shelf.
        */
        if (!item.chip) Body.setInertia(body, Infinity);
        Body.setStatic(body, true);
        Composite.add(engine.world, body);
        live.push({ body, el, w, h, born: live.length * POP_STEP });
      });

      if (!live.length) return;

      /* hidden BEFORE the class lands, or there is one frame where the
         stylesheet's arrangement is gone and the loop has not yet written a
         transform, and every tag paints in the corner */
      live.forEach((l) => {
        l.el.style.opacity = "0";
      });
      wrap!.classList.add("aboutTags--live");

      const t0 = performance.now();
      const releaseAt = t0 + (live.length - 1) * POP_STEP + POP_MS + DWELL_MS;
      let released = false;
      let raf = 0;
      let running = true;

      /* out-and-back overshoot on the way in, so a tag lands rather than
         simply appears */
      const pop = (p: number) => {
        const c = 1.7;
        const u = p - 1;
        return 1 + (c + 1) * u * u * u + c * u * u;
      };

      const frame = (now: number) => {
        raf = 0;
        if (dead) return;

        if (!released && now >= releaseAt) {
          released = true;
          live.forEach((l) => Body.setStatic(l.body, false));
        }

        Engine.update(engine, 1000 / 60);

        for (const l of live) {
          const age = now - t0 - l.born;
          const p = Math.max(0, Math.min(1, age / POP_MS));
          const s = p <= 0 ? 0 : pop(p);
          l.el.style.opacity = String(Math.min(1, p * 2));
          l.el.style.transform =
            `translate3d(${(l.body.position.x - l.w / 2).toFixed(1)}px, ` +
            `${(l.body.position.y - l.h / 2).toFixed(1)}px, 0) ` +
            `rotate(${l.body.angle.toFixed(4)}rad) scale(${s.toFixed(3)})`;
        }

        if (running) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      /* the panel is pinned for a long stretch of the page; stop solving
         while it is nowhere near the viewport */
      const vis = new IntersectionObserver(
        ([e]) => {
          running = e.isIntersecting;
          if (running && !raf) raf = requestAnimationFrame(frame);
        },
        { rootMargin: "200px 0px" },
      );
      vis.observe(section!);

      /*
        Drag and throw.

        Carried kinematically: the held tag goes static so it shoves the
        others aside instead of being shoved, and on release it is handed the
        speed of the last pointer move. The pointer's own delta is the
        velocity - matter's step is a frame, so the two are the same unit.
      */
      type Drag = {
        l: Live;
        id: number;
        px: number;
        py: number;
        vx: number;
        vy: number;
        moved: number;
        caught: boolean;
      };
      let drag: Drag | null = null;

      const onDown = (l: Live) => (e: PointerEvent) => {
        if (e.button !== 0 || !released) return;
        drag = { l, id: e.pointerId, px: e.clientX, py: e.clientY, vx: 0, vy: 0, moved: 0, caught: false };
        Body.setStatic(l.body, true);
        l.el.classList.add("aboutTags__held");
      };

      const onMove = (e: PointerEvent) => {
        if (!drag) return;
        const dx = e.clientX - drag.px;
        const dy = e.clientY - drag.py;
        drag.px = e.clientX;
        drag.py = e.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        drag.vx = dx;
        drag.vy = dy;
        /*
          Capture is taken HERE, once the pointer has actually travelled,
          and never on pointerdown. That is the whole reason the About Me
          pill navigates.

          While an element holds the pointer, the click that follows is
          fired AT THE CAPTURING ELEMENT - and the capturing element is the
          pill <span>, whose <a> is a child, not an ancestor. A click on the
          span therefore runs no anchor activation and no React onClick on
          the link, so the pill swallowed every tap in silence: no error, no
          navigation, nothing to see. Capturing on pointerdown meant that
          happened on every single tap, drag or not.

          Nothing else needs the capture that early: pointermove and
          pointerup are bound to the window, so a drag is tracked with or
          without it. It earns its place only once a drag is real, where it
          keeps a pointer that leaves the window from stranding the tag.
        */
        if (!drag.caught && drag.moved > CLICK_SLOP) {
          drag.caught = true;
          try {
            drag.l.el.setPointerCapture(drag.id);
          } catch {}
        }
        Body.setPosition(drag.l.body, {
          x: drag.l.body.position.x + dx,
          y: drag.l.body.position.y + dy,
        });
      };

      const onUp = (e: PointerEvent) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        d.l.el.classList.remove("aboutTags__held");
        if (d.caught) {
          try {
            d.l.el.releasePointerCapture(e.pointerId);
          } catch {}
        }
        Body.setStatic(d.l.body, false);
        const clamp = (v: number) => Math.max(-MAX_THROW, Math.min(MAX_THROW, v));
        Body.setVelocity(d.l.body, { x: clamp(d.vx), y: clamp(d.vy) });
        Body.setAngularVelocity(d.l.body, clamp(d.vx) * 0.012);
        /* a real drag must not also count as a click on the link pill */
        if (d.moved > CLICK_SLOP) {
          const swallow = (ev: Event) => {
            ev.preventDefault();
            ev.stopPropagation();
          };
          d.l.el.addEventListener("click", swallow, { capture: true, once: true });
          setTimeout(() => d.l.el.removeEventListener("click", swallow, true), 0);
        }
      };

      const downs = live.map((l) => {
        const h = onDown(l);
        l.el.addEventListener("pointerdown", h);
        return { el: l.el, h };
      });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      teardown = () => {
        cancelAnimationFrame(raf);
        vis.disconnect();
        downs.forEach(({ el, h }) => el.removeEventListener("pointerdown", h));
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      };
    }

    return () => {
      dead = true;
      io.disconnect();
      teardown();
    };
  }, []);

  return (
    <div className="aboutTags" ref={wrapRef}>
      {ITEMS.map((it, i) => {
        const style = {
          background: it.bg,
          "--x": `${it.x}%`,
          "--y": `${it.y}%`,
          "--rot": `${it.rot}deg`,
          ...(it.chip ? { "--size": `${it.size}em` } : null),
          ...(it.phone
            ? {
                "--px": `${it.phone.x}%`,
                "--py": `${it.phone.y}%`,
                "--prot": `${it.phone.rot}deg`,
              }
            : null),
        } as CSSProperties;
        const off = it.phone ? "" : " aboutTags__off";
        const ref = (el: HTMLElement | null) => {
          els.current[i] = el;
        };

        if (it.chip) {
          return (
            <span
              key={`c${i}`}
              ref={ref}
              aria-hidden
              className={`aboutTags__chip${off}`}
              style={style}
            >
              {it.icon}
            </span>
          );
        }

        const body = (
          <>
            <span className="aboutTags__label">{it.label}</span>
            <span className="aboutTags__icon" aria-hidden>
              {it.icon}
            </span>
          </>
        );
        return (
          <span
            key={it.label}
            ref={ref}
            aria-hidden={it.href ? undefined : true}
            className={`aboutTags__pill${it.href ? " aboutTags__pill--link" : ""}${off}`}
            style={style}
          >
            {it.href ? (
              <PageLink href={it.href} className="aboutTags__link">
                {body}
              </PageLink>
            ) : (
              body
            )}
          </span>
        );
      })}
    </div>
  );
}
