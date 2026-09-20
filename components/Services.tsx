"use client";

import { useEffect, useRef } from "react";
import ExtCta from "./ExtCta";
import TornEdge from "./TornEdge";
import { SERVICES as services } from "./services.data";

const allCards = [...services, ...services]; // 12 cards total across 6 arms

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  /*
    3D scroll physics and drag, on every screen.

    There used to be a second, phone-only mechanism here - six cards stacking
    into a pile as you scrolled - and a matching block of markup for it. It is
    gone. The carousel is the section's idea, and a phone is where most people
    meet it; showing them a different, smaller idea meant the one thing worth
    seeing was the one thing they never saw.

    Nothing about the physics is width-dependent any more. What differs on a
    phone is geometry, and geometry lives in CSS: a tighter radius and a larger
    card, so the front of the ring fills the screen instead of eight cards
    sharing it. See the carousel's mobile block in globals.css.
  */
  useEffect(() => {
    const section = sectionRef.current;
    const carousel = carouselRef.current;
    if (!section || !carousel) return;

    /* ------------------------------------------------------------------
       Framer 3D Physics Engine:
       Combines cumulative drag offset & page scroll rotation seamlessly
    ------------------------------------------------------------------ */
    const SENSITIVITY = 2;
    const STIFFNESS = 600;
    const DAMPING = 100;
    const MASS = 1;

    let dragOffset = 0;
    let initialDragOffset = 0;
    let current = 0;
    let springVel = 0;

    let isDragging = false;
    let dragStartX = 0;

    let lastTime = performance.now();
    let frameId = 0;

    /* This loop reads layout (getBoundingClientRect + offsetHeight) and
       writes a transform on every frame. Left unconditional it forces a
       synchronous layout ~60x a second for the entire life of the page,
       even while the carousel is several screens away — one of the
       largest always-on costs on the site. Park it unless the section is
       actually near the viewport; scroll/drag wake it again. */
    let visible = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(section);

    let snapOnResume = true;

    function wake() {
      if (frameId) return;
      lastTime = performance.now();
      /* the spring didn't track scroll while parked, so land directly on
         the current target instead of visibly winding to catch up */
      snapOnResume = true;
      frameId = requestAnimationFrame(renderLoop);
    }

    function renderLoop(now: number) {
      frameId = 0;
      if (!visible) return;

      const dt = Math.min((now - lastTime) / 1000, 0.064);
      lastTime = now;

      let scrollRotation = 0;
      if (section) {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const totalScrollable = section.offsetHeight - vh;

        if (totalScrollable > 0) {
          const scrolled = -rect.top;
          const scrollProgress = Math.max(0, Math.min(1, scrolled / totalScrollable));
          // Start at 0deg (UI/UX centered) and rotate 150deg across vertical scroll
          scrollRotation = scrollProgress * -150;
        }
      }

      // Total target angle combines cumulative drag + vertical scroll
      const target = dragOffset + scrollRotation;

      if (snapOnResume) {
        snapOnResume = false;
        current = target;
        springVel = 0;
      } else {
        const steps = Math.max(1, Math.ceil(dt / 0.008));
        const h = dt / steps;
        for (let s = 0; s < steps; s++) {
          const accel = (STIFFNESS * (target - current) - DAMPING * springVel) / MASS;
          springVel += accel * h;
          current += springVel * h;
        }
      }

      if (carousel) {
        carousel.style.transform = `rotateY(${current}deg)`;
      }

      frameId = requestAnimationFrame(renderLoop);
    }
    wake();

    function point(e: MouseEvent | TouchEvent) {
      const t = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
      return t
        ? { x: t.clientX, y: t.clientY }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    }

    /*
      A finger on this carousel is ambiguous in a way a mouse never is: the
      same gesture that spins the ring is also the one that scrolls the page
      past it. Dragging unconditionally on touch traps the reader inside the
      section - the old code sidestepped that by refusing to drag below 768px
      at all, which is no longer an option now that the phone HAS the carousel.

      So the axis is decided once, on the first few pixels of movement, and
      then held for the rest of the gesture. Past the threshold it is a spin
      and we take the event; below it, or if the finger went vertical, we never
      call preventDefault and the page scrolls exactly as it would have.
      `touch-action: pan-y` on the wrapper tells the compositor the same thing,
      so vertical scrolling stays on the fast path instead of waiting to learn
      what this handler intends.
    */
    const AXIS_LOCK_PX = 8;
    let axis: "x" | "y" | null = null;
    let dragStartY = 0;

    function startDrag(e: MouseEvent | TouchEvent) {
      const p = point(e);
      isDragging = true;
      /* a mouse press on a grab cursor is already a commitment; only touch
         has to prove which way it is going */
      axis = "touches" in e ? null : "x";
      if (axis === "x") carousel?.classList.add("dragging");
      dragStartX = p.x;
      dragStartY = p.y;
      initialDragOffset = dragOffset;
    }

    function drag(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      const p = point(e);
      const dx = p.x - dragStartX;

      if (axis === null) {
        const dy = p.y - dragStartY;
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") {
          /* hand the gesture back to the page and stay out of the way until
             the finger lifts */
          isDragging = false;
          return;
        }
        carousel?.classList.add("dragging");
        /* the lock threshold is slack, not travel - counting it would make
           the ring jump by 8px the moment it engages */
        dragStartX = p.x;
        initialDragOffset = dragOffset;
        return;
      }

      if (e.cancelable) e.preventDefault();
      dragOffset = initialDragOffset + dx * (SENSITIVITY / 10);
      wake();
    }

    function endDrag() {
      if (!isDragging && axis !== "y") return;
      isDragging = false;
      axis = null;
      carousel?.classList.remove("dragging");
    }

    const onMouseDown = (e: MouseEvent) => startDrag(e);
    const onMouseMove = (e: MouseEvent) => drag(e);
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => startDrag(e);
    const onTouchMove = (e: TouchEvent) => drag(e);
    const onTouchEnd = () => endDrag();

    carousel.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(frameId);
      io.disconnect();
      carousel.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      carousel.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <section className="services-section" id="services" ref={sectionRef}>
      {/* Services follows the dark Statement panel now, so it inherits the
          seam that used to belong to Skills: Statement's dark torn down into
          this cream one, dot grid and all. */}
      <TornEdge fill="#1a1a1a" dots />

      {/* The sticky 3D carousel stage, on every screen */}
      <div className="services-pin">
        <div className="services-header" data-reveal>
          <h2 className="services-heading">
            The Skills Deck<span className="services-heading__dot">.</span>
          </h2>
          <p className="services-desc">
            Product, UI/UX, branding, web, motion and everything in between.
          </p>

          <ExtCta href="#contact">Work with me</ExtCta>
        </div>

        <div className="services-wrapper">
          <div className="services-carousel" id="carousel" ref={carouselRef}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="services-arm"
                style={{ transform: `rotateY(${90 + i * 30}deg)` }}
              >
                <div className="services-card" style={{ transform: `rotateY(90deg)` }}>
                  <img
                    src={allCards[i].image}
                    alt={allCards[i].title}
                    className="services-card__img"
                    /* NOT lazy. This section is already held back twice
                       over - `ssr: false` keeps it out of the HTML and
                       DeferUntilNear keeps it unmounted until it is a
                       viewport and a half away - so by the time these tags
                       exist the card is nearly on screen. A third gate only
                       delays six files totalling ~200KB, and it delays them
                       worst right here, where the cards stand at
                       rotateY(90deg) with backface-visibility hidden and the
                       lazy heuristic has almost no projected area to judge. */
                    decoding="async"
                    draggable={false}
                  />
                </div>

                <div className="services-card" style={{ transform: `rotateY(-90deg)` }}>
                  <img
                    src={allCards[i + 6].image}
                    alt={allCards[i + 6].title}
                    className="services-card__img"
                    /* not lazy - see the note on the card above */
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
