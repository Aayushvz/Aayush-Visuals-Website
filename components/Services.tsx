"use client";

import { useEffect, useRef } from "react";
import ExtCta from "./ExtCta";
import TornEdge from "./TornEdge";

// Exact sequence of 6 unique service card images
const services = [
  { id: "uiux", title: "UI/UX Design", image: "/services/ui-ux.webp" },
  { id: "graphic", title: "Graphic Design", image: "/services/graphic-design.webp" },
  { id: "brand", title: "Brand Building", image: "/services/brand-building.webp" },
  { id: "video", title: "Video Production", image: "/services/video-production.webp" },
  { id: "website", title: "Website Development", image: "/services/website-development.webp" },
  { id: "product", title: "Product Design", image: "/services/product-design.webp" },
];

const allCards = [...services, ...services]; // 12 cards total across 6 arms

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const deckCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Desktop 3D Scroll Physics & Bi-directional Drag Interaction (UNTOUCHED DESKTOP LOGIC)
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
      if (section && window.innerWidth > 768) {
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

      if (carousel && window.innerWidth > 768) {
        carousel.style.transform = `rotateY(${current}deg)`;
      }

      frameId = requestAnimationFrame(renderLoop);
    }
    wake();

    function pointerX(e: MouseEvent | TouchEvent) {
      return "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
    }

    function startDrag(e: MouseEvent | TouchEvent) {
      if (window.innerWidth <= 768) return;
      isDragging = true;
      carousel?.classList.add("dragging");
      dragStartX = pointerX(e);
      initialDragOffset = dragOffset;
    }

    function drag(e: MouseEvent | TouchEvent) {
      if (!isDragging || window.innerWidth <= 768) return;
      if (e.cancelable) e.preventDefault();
      const dx = pointerX(e) - dragStartX;
      dragOffset = initialDragOffset + dx * (SENSITIVITY / 10);
      wake();
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

  // 2. ISOLATED Mobile-Only On-Scroll Sequential Card Deck Stacking
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = deckCardRefs.current;
    const N = services.length;

    const handleScroll = () => {
      if (window.innerWidth > 768) return;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const totalScrollable = section.offsetHeight - vh;

      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

      // Card 0 (UI/UX) is the initial base card visible at start
      // Cards 1..5 (Graphic, Brand, Video, Website, Product) rise sequentially from below
      for (let i = 0; i < N; i++) {
        const card = cards[i];
        if (!card) continue;

        if (i === 0) {
          const depth = Math.max(0, (progress - 0.1) / 0.9);
          const stackScale = Math.max(0.86, 1 - depth * 0.1);
          const stackY = -depth * 18;
          card.style.transform = `translate3d(-50%, calc(-50% + ${stackY}px), 0) scale(${stackScale})`;
          card.style.opacity = "1";
        } else {
          const segStart = ((i - 1) / 5) * 0.80;
          const segEnd = segStart + 0.16;

          if (progress < segStart) {
            // Positioned below viewport waiting to rise
            card.style.transform = `translate3d(-50%, calc(-50% + 110vh), 0) scale(0.92)`;
            card.style.opacity = "0";
          } else if (progress >= segStart && progress <= segEnd) {
            // Rising smoothly upward onto the deck on scroll
            const p = (progress - segStart) / (segEnd - segStart);
            const yOffset = (1 - p) * 110;
            const scale = 0.92 + p * 0.08;
            const rot = (1 - p) * (i % 2 === 0 ? 4 : -4);
            card.style.transform = `translate3d(-50%, calc(-50% + ${yOffset}vh), 0) scale(${scale}) rotate(${rot}deg)`;
            card.style.opacity = `${p}`;
          } else {
            // Stacked in the deck; stays pinned while newer cards stack over it
            const depth = progress - segEnd;
            const stackScale = Math.max(0.86, 1 - depth * 0.08);
            const stackY = -depth * 18;
            const rot = (i % 2 === 0 ? 1 : -1) * Math.min(2, depth * 5);
            card.style.transform = `translate3d(-50%, calc(-50% + ${stackY}px), 0) scale(${stackScale}) rotate(${rot}deg)`;
            card.style.opacity = "1";
          }
        }
      }
    };

    /* rAF-throttled: handleScroll reads layout and then writes transforms
       for six cards, so running it per scroll event (which can fire many
       times between frames) was pure duplicated work */
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          handleScroll();
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="services-section" id="services" ref={sectionRef}>
      {/* Services follows the dark Statement panel now, so it inherits the
          seam that used to belong to Skills: Statement's dark torn down into
          this cream one, dot grid and all. */}
      <TornEdge fill="#1a1a1a" dots />

      {/* Desktop Sticky 3D Carousel Stage (PROTECTED UNTOUCHED DESKTOP) */}
      <div className="services-pin">
        <div className="services-header" data-reveal>
          <h2 className="services-heading">The full deck.</h2>
          <p className="services-desc">
            Product, UI/UX, branding, web and video. The disciplines I actually
            work in, not a menu.
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
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>

                <div className="services-card" style={{ transform: `rotateY(-90deg)` }}>
                  <img
                    src={allCards[i + 6].image}
                    alt={allCards[i + 6].title}
                    className="services-card__img"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ISOLATED Mobile Sticky On-Scroll Card Deck Stacking Stage */}
      <div className="services-mobile-deck">
        <div className="services-header services-header--mobile">
          <h2 className="services-heading">The full deck.</h2>
          <p className="services-desc">
            Product, UI/UX, branding, web and video. The disciplines I actually
            work in, not a menu.
          </p>

          <ExtCta href="#contact">Work with me</ExtCta>
        </div>

        <div className="services-deck-stage">
          {services.map((service, index) => (
            <div
              key={service.id}
              ref={(el) => {
                deckCardRefs.current[index] = el;
              }}
              className="services-deck-card"
              style={{ zIndex: index + 1 }}
            >
              <img
                src={service.image}
                alt={service.title}
                className="services-card__img"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
