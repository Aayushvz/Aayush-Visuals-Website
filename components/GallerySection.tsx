"use client";

import { useEffect, useRef } from "react";
import { GALLERY } from "./gallery.data";

/*
  A horizontal gallery driven by vertical scroll, on the site's light ground.

  The section is taller than the screen and the thing you see is one viewport
  pinned to the top; the difference between those two heights is the track's
  travel. Scrolling down moves the row left to right. There are no arrows and
  no slide index: the page's own scroll is the only control, so there is
  nothing to learn and nothing that can disagree with where you are.

  Travel is measured, not guessed. The row's width depends on the pictures'
  own aspects and on the viewport, so JS reads it and publishes two numbers:

    --gal-travel   how far the track has to move, in px
    --p            0 -> 1, how far through the section you are

  CSS composes the transform from those. The section's height is 100svh plus
  the travel, which makes the mapping one-to-one: a pixel of vertical scroll
  is a pixel of horizontal movement, so the row never feels geared.

  Nothing is cropped to a common height - each card carries its own width and
  aspect from gallery.data.ts and hangs at its own depth, so the row reads as
  photographs laid on a surface rather than a filmstrip.

  Under reduced motion the pin is abandoned entirely and the row becomes an
  ordinary side-scroller, because a section that moves sideways on its own
  while you scroll down is exactly what that setting is asking us not to do.
*/

export default function GallerySection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!section || !pin || !track) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.dataset.static = "true";
      return;
    }

    let raf = 0;
    let idle = 0;
    let near = false;
    let lastP = -1;
    let travel = 0;
    /* cached in measure(): both are constant between resizes, and reading
       them per frame is a forced layout on every frame of every scroll */
    let span = 0;

    /* The row's width is a function of the pictures AND the window it runs
       in. That window is the viewport element, inset to the page's rulers -
       measuring against the full window width would overshoot by both
       insets and scroll the row further than it has to go. */
    const measure = () => {
      const view = track.parentElement;
      const visible = view ? view.clientWidth : window.innerWidth;
      travel = Math.max(0, Math.round(track.scrollWidth - visible));
      section.style.setProperty("--gal-travel", `${travel}px`);
      /* the section's height depends on the travel just set, so this has to
         be read after it - and only here, never in the frame loop */
      span = section.offsetHeight - window.innerHeight;
    };

    /* One rect read per frame and nothing else. Everything this needs beyond
       the section's position is cached, so a scroll frame costs a single
       layout flush rather than one per property. */
    const apply = () => {
      if (span <= 0) return;
      const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / span));
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;
      pin.style.setProperty("--p", p.toFixed(4));
    };

    const frame = () => {
      apply();
      idle = near ? idle + 1 : 3;
      raf = near && idle < 4 ? requestAnimationFrame(frame) : 0;
    };

    const wake = () => {
      idle = 0;
      if (raf || !near) return;
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      measure();
      lastP = -1;
      wake();
    };

    /* only spend frames while the section is anywhere near the viewport */
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        /* will-change promotes the track to its own compositor layer, and
           the track is a very wide strip of large photographs. Holding that
           layer for the life of the page costs real memory for a section
           most visitors are nowhere near, so it is granted on approach and
           surrendered on the way out. */
        section.dataset.near = near ? "true" : "false";
        if (near) wake();
        else apply();
      },
      { rootMargin: "20% 0px 20% 0px", threshold: 0 }
    );
    io.observe(section);

    measure();
    apply();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    /* the cards are images: the row's width is not final until they have
       laid out, and a late load would otherwise leave the travel short */
    const ro = new ResizeObserver(onResize);
    ro.observe(track);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section className="gallery" id="gallery" ref={sectionRef} aria-labelledby="gallery-heading">
      <div className="gallery__pin" ref={pinRef}>
        <div className="gallery__head" data-reveal>
          <h2 className="gallery__title" id="gallery-heading">
            Off the clock<span className="gallery__dot">.</span>
          </h2>
          <p className="gallery__sub">
            Concerts, campus, and the afternoons in between.
          </p>
        </div>

        <div className="gallery__viewport">
          <ul className="gallery__track" ref={trackRef}>
            {GALLERY.map((item) => (
              <li
                className="galleryItem"
                key={item.src}
                style={
                  {
                    "--w": `${item.w}px`,
                    "--ratio": item.ratio,
                    "--drop": item.drop,
                  } as React.CSSProperties
                }
              >
                <figure className="galleryItem__frame">
                  <img
                    className="galleryItem__img"
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
