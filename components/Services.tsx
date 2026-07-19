"use client";

import { useEffect, useRef } from "react";

// Exact sequence of 6 unique service cards
const services = [
  { id: "uiux", title: "UI/UX Design", image: "/services/ui-ux.png" },
  { id: "graphic", title: "Graphic Design", image: "/services/graphic-design.png" },
  { id: "brand", title: "Brand Building", image: "/services/brand-building.png" },
  { id: "video", title: "Video Production", image: "/services/video-production.png" },
  { id: "website", title: "Website Development", image: "/services/website-development.png" },
  { id: "product", title: "Product Design", image: "/services/product-design.png" },
];

const allCards = [...services, ...services]; // 12 cards total across 6 arms

export default function Services() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const section = sectionRef.current;
    if (!carousel || !section) return;
    /* narrowed aliases: hoisted closures below don't keep the null guard */
    const carouselEl: HTMLDivElement = carousel;
    const sectionEl: HTMLElement = section;

    /* ------------------------------------------------------------------
       Exact Framer "3D Look" physics engine:
       SENSITIVITY = 2 -> target = dragStart + deltaPx * (2 / 10)
       spring: STIFFNESS 600, DAMPING 85, MASS 1

       One position system: target = scrollRot + dragOffset.
       - scrollRot: pinned-scroll progress mapped onto one logical
         sequence (6 unique cards x 30deg = -180deg). UI/UX faces center
         at rotation 0, so the sequence starts and ends composed.
       - dragOffset: manual drag + horizontal wheel, infinite both ways,
         with velocity-based release momentum.
       Both feed the same spring, so scroll and drag can never produce a
       position jump.
    ------------------------------------------------------------------ */
    const SENSITIVITY = 2;
    const STIFFNESS = 600;
    const DAMPING = 85;
    const MASS = 1;
    const SEQUENCE_DEG = -180; // one full pass of the 6 unique cards

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 901px)");

    let scrollRot = 0;
    let dragOffset = 0;
    let current = 0;
    let springVel = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;

    // release-momentum velocity tracking (deg/s, low-pass filtered)
    let lastMoveX = 0;
    let lastMoveT = 0;
    let dragVel = 0;

    let lastTime = performance.now();
    let frameId = 0;

    function renderLoop(now: number) {
      let dt = Math.min((now - lastTime) / 1000, 0.064);
      lastTime = now;

      // Pinned scroll -> rotation. Reading the rect each frame keeps the
      // mapping correct through resize without extra listeners; outside
      // the pinned range it clamps to the sequence ends, so reverse
      // scrolling deterministically retraces the exact same path.
      if (desktop.matches && !reduceMotion.matches) {
        const span = sectionEl.offsetHeight - window.innerHeight;
        if (span > 0) {
          const top = sectionEl.getBoundingClientRect().top;
          const p = Math.min(1, Math.max(0, -top / span));
          scrollRot = SEQUENCE_DEG * p;
        }
      } else {
        scrollRot = 0;
      }

      const target = scrollRot + dragOffset;

      // Sub-step integration for stiffness stability
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        const accel = (STIFFNESS * (target - current) - DAMPING * springVel) / MASS;
        springVel += accel * h;
        current += springVel * h;
      }

      carouselEl.style.transform = `rotateY(${current}deg)`;

      frameId = requestAnimationFrame(renderLoop);
    }
    frameId = requestAnimationFrame(renderLoop);

    function pointerX(e: MouseEvent | TouchEvent) {
      return "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
    }

    function startDrag(e: MouseEvent | TouchEvent) {
      isDragging = true;
      carousel?.classList.add("dragging");
      dragStartX = pointerX(e);
      dragStartOffset = dragOffset;
      lastMoveX = dragStartX;
      lastMoveT = performance.now();
      dragVel = 0;
    }

    function drag(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      const x = pointerX(e);
      dragOffset = dragStartOffset + (x - dragStartX) * (SENSITIVITY / 10);

      const t = performance.now();
      const dtMs = t - lastMoveT;
      if (dtMs > 0) {
        const instVel = ((x - lastMoveX) * (SENSITIVITY / 10)) / (dtMs / 1000);
        dragVel = dragVel * 0.8 + instVel * 0.2;
        lastMoveX = x;
        lastMoveT = t;
      }
    }

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      carousel?.classList.remove("dragging");

      // Momentum: project release velocity into extra travel through the
      // same spring (smooth deceleration, no separate animation system).
      // A stale velocity (pointer paused before release) carries nothing.
      if (performance.now() - lastMoveT < 80) {
        const MOMENTUM = 0.14; // seconds of projected glide
        const MAX_CARRY = 90; // deg, keeps flicks composed
        const carry = Math.max(-MAX_CARRY, Math.min(MAX_CARRY, dragVel * MOMENTUM));
        dragOffset += carry;
      }
      dragVel = 0;
    }

    const onMouseDown = (e: MouseEvent) => startDrag(e);
    const onMouseMove = (e: MouseEvent) => drag(e);
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => startDrag(e);
    const onTouchMove = (e: TouchEvent) => drag(e);
    const onTouchEnd = () => endDrag();

    // Wheel support for trackpads (horizontal swipes only; vertical wheel
    // stays with the page so the pinned scroll owns it)
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        dragOffset -= e.deltaX * 0.4;
      }
    };

    carousel.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    carousel.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frameId);
      carousel.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      carousel.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      carousel.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <section className="services-section" id="services" ref={sectionRef}>
      {/* Sticky stage: on desktop the section pins for one 6-card scroll
          sequence while the driver height above provides the scroll room;
          on mobile / reduced motion this wrapper is display:contents */}
      <div className="services-pin">
      {/* Header Section with About section font sizing & weights */}
      <div className="services-header" data-reveal>
        <h2 className="services-heading">Every Services Clicked.</h2>
        <p className="services-desc">
          Branding, UI/UX, graphic design &amp; video editing to help your brand stand out.
        </p>

        <a href="#contact" className="services-cta">
          <span className="services-cta__icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          Book a Service
        </a>
      </div>

      {/* 3D Framer Carousel Full-Width Viewport (No side fades, corner-to-corner animation) */}
      <div className="services-viewport">
        <div className="services-wrapper">
          <div className="services-carousel" id="carousel" ref={carouselRef}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="services-arm"
                style={{ transform: `rotateY(${90 + i * 30}deg)` }}
              >
                {/* Left Card Slot */}
                <div
                  className="services-card"
                  style={{ transform: `rotateY(90deg)` }}
                >
                  <img
                    src={allCards[i].image}
                    alt={allCards[i].title}
                    className="services-card__img"
                    draggable={false}
                  />
                </div>

                {/* Right Card Slot */}
                <div
                  className="services-card"
                  style={{ transform: `rotateY(-90deg)` }}
                >
                  <img
                    src={allCards[i + 6].image}
                    alt={allCards[i + 6].title}
                    className="services-card__img"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end .services-pin */}
    </section>
  );
}
