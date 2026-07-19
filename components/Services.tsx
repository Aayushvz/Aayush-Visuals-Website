"use client";

import { useEffect, useRef } from "react";

// Exact sequence of 6 unique service card images
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

  useEffect(() => {
    // Only initialize 3D Framer carousel physics on desktop screens (>768px)
    if (window.innerWidth <= 768) return;

    const carousel = carouselRef.current;
    if (!carousel) return;

    /* ------------------------------------------------------------------
       Exact Framer "3D Look" physics engine:
       SENSITIVITY = 2 -> target = dragStart + deltaPx * (2 / 10)
       spring: STIFFNESS 600, DAMPING 100, MASS 1
    ------------------------------------------------------------------ */
    const SENSITIVITY = 2;
    const STIFFNESS = 600;
    const DAMPING = 100;
    const MASS = 1;

    let target = 0;
    let current = 0;
    let springVel = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartRotation = 0;

    let lastTime = performance.now();
    let frameId = 0;

    function renderLoop(now: number) {
      let dt = Math.min((now - lastTime) / 1000, 0.064);
      lastTime = now;

      // Sub-step integration for stiffness stability
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        const accel = (STIFFNESS * (target - current) - DAMPING * springVel) / MASS;
        springVel += accel * h;
        current += springVel * h;
      }

      if (carousel) {
        carousel.style.transform = `rotateY(${current}deg)`;
      }

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
      dragStartRotation = target;
    }

    function drag(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      const dx = pointerX(e) - dragStartX;
      target = dragStartRotation + dx * (SENSITIVITY / 10);
    }

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      carousel?.classList.remove("dragging");
    }

    const onMouseDown = (e: MouseEvent) => startDrag(e);
    const onMouseMove = (e: MouseEvent) => drag(e);
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => startDrag(e);
    const onTouchMove = (e: TouchEvent) => drag(e);
    const onTouchEnd = () => endDrag();

    // Wheel support for trackpads
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        target -= e.deltaX * 0.4;
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
    <section className="services-section" id="services">
      {/* Header Section */}
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

      {/* Desktop 3D Framer Carousel (Hidden on Phone View) */}
      <div className="services-viewport services-viewport--desktop">
        <div className="services-wrapper">
          <div className="services-carousel" id="carousel" ref={carouselRef}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="services-arm"
                style={{ transform: `rotateY(${90 + i * 30}deg)` }}
              >
                {/* Left Card Slot */}
                <div className="services-card" style={{ transform: `rotateY(90deg)` }}>
                  <img
                    src={allCards[i].image}
                    alt={allCards[i].title}
                    className="services-card__img"
                    draggable={false}
                  />
                </div>

                {/* Right Card Slot */}
                <div className="services-card" style={{ transform: `rotateY(-90deg)` }}>
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

      {/* Mobile On-Scroll Card Stacking Animation (Hidden on Desktop) */}
      <div className="services-mobile-stack">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="services-mobile-card"
            style={{
              top: `calc(120px + ${index * 16}px)`,
              zIndex: index + 1,
            }}
          >
            <img
              src={service.image}
              alt={service.title}
              className="services-card__img"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
