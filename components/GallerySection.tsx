"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GALLERY } from "./gallery.data";

/*
  The gallery as a honeycomb of tiles around the logo.

  Square tiles with soft corners sit in offset rows, like cells: the logo
  in the middle, the photographs packed around it, and beyond them empty
  dashed tiles that carry the pattern outward and fade away, so the
  cluster reads as the lit part of a larger field. Two cursor labels point
  at tiles, the way collaborators' cursors do in a shared canvas.

  The photographs sit in greyscale and come into colour on hover. A click
  opens the full picture, uncropped, in a lightbox that steps with the
  arrow keys.

  Everything is laid out on one grid: a tile's place is (col, row) in tile
  steps from the centre, and odd rows sit half a step over.
*/

type Cell = { col: number; row: number };

/* the eight photo slots, in the order of gallery.data.ts */
const PHOTO_CELLS: Cell[] = [
  { col: -0.5, row: -1 },
  { col: 0.5, row: -1 },
  { col: -2, row: 0 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
  { col: -0.5, row: 1 },
  { col: 0.5, row: 1 },
];

/* the empty field around them: every other cell out to the edge */
const GHOST_CELLS: Cell[] = (() => {
  const taken = new Set([...PHOTO_CELLS, { col: 0, row: 0 }].map((c) => `${c.col},${c.row}`));
  const out: Cell[] = [];
  for (let row = -2; row <= 2; row++) {
    const odd = Math.abs(row) % 2 === 1;
    for (let i = -4; i <= 4; i++) {
      const col = odd ? i + 0.5 : i;
      if (odd && i === 4) continue;
      if (!taken.has(`${col},${row}`)) out.push({ col, row });
    }
  }
  return out;
})();

const at = (c: Cell) =>
  ({ "--col": c.col, "--row": c.row }) as React.CSSProperties;

export default function GallerySection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  /* the tiles pop in, from the logo outward, the first time the section
     comes into view */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + GALLERY.length) % GALLERY.length)),
    []
  );

  /* lightbox keys, and the page held still behind it */
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, step]);

  const current = open === null ? null : GALLERY[open];

  return (
    <section
      className={`gallery${shown ? " gallery--shown" : ""}`}
      id="gallery"
      ref={sectionRef}
      aria-labelledby="gallery-heading"
    >
      <div className="gallery__head">
        <h2 className="gallery__title" id="gallery-heading">
          Off the clock<span className="gallery__dot">.</span>
        </h2>
        <p className="gallery__sub">Concerts, campus and the afternoons in between.</p>
      </div>

      <div className="gallery__hive">
        <div className="gallery__field" aria-hidden>
          {GHOST_CELLS.map((c) => (
            <span key={`${c.col},${c.row}`} className="galleryGhost" style={at(c)} />
          ))}
        </div>

        {/* the logo at the centre */}
        <span className="galleryTile galleryTile--logo" style={at({ col: 0, row: 0 })} aria-hidden>
          <span className="galleryTile__mark" />
        </span>

        {GALLERY.map((item, i) => {
          const cell = PHOTO_CELLS[i];
          return (
            <button
              key={item.src}
              type="button"
              className="galleryTile"
              style={{ ...at(cell), "--d": `${80 + Math.hypot(cell.col, cell.row) * 90}ms` } as React.CSSProperties}
              onClick={() => setOpen(i)}
              aria-label={`Open photo: ${item.alt}`}
            >
              <img
                className="galleryTile__img"
                src={item.src}
                alt=""
                style={{ objectPosition: item.focus }}
                /* eight small files, already warmed by HomeDeferred */
                loading="eager"
                decoding="async"
                draggable={false}
              />
              {item.label ? (
                <span
                  className={`galleryTag ${cell.col < 0 ? "galleryTag--left" : "galleryTag--right"}`}
                  aria-hidden
                >
                  <svg className="galleryTag__cursor" viewBox="0 0 24 24">
                    <path d="M4 3l16 7-7 2.2L10.8 20z" />
                  </svg>
                  <span className="galleryTag__pill">{item.label}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* in a portal on the body: the homepage's parallax wrapper is
          transformed, which would pin a fixed overlay to it, not the screen */}
      {current && typeof document !== "undefined" ? createPortal(
        <div
          className="galleryBox"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={() => setOpen(null)}
        >
          <figure className="galleryBox__figure" onClick={(e) => e.stopPropagation()}>
            <img className="galleryBox__img" src={current.src} alt={current.alt} />
            <figcaption className="galleryBox__cap">
              {current.alt}
              <span className="galleryBox__count">
                {(open ?? 0) + 1} / {GALLERY.length}
              </span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="galleryBox__btn galleryBox__btn--close"
            aria-label="Close"
            onClick={() => setOpen(null)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <button
            type="button"
            className="galleryBox__btn galleryBox__btn--prev"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5.5 8.5 12l6.5 6.5" />
            </svg>
          </button>
          <button
            type="button"
            className="galleryBox__btn galleryBox__btn--next"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5.5 15.5 12 9 18.5" />
            </svg>
          </button>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
