"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/*
  Capabilities — a "skills wallet". A tactile card-holder sits centred and
  closed; click it and the skill cards spring out one-by-one into a loose,
  readable scatter you can drag and throw around (bounded to the canvas, so
  nothing leaves the rulers). A gather control pulls them back into the
  wallet and re-closes it. framer-motion drives the spring pop-out and the
  drag/throw physics; no scroll-jacking — normal vertical scroll.
*/

type Cap = { category: string; title: string };

const CAPS: Cap[] = [
  { category: "Product", title: "Product Design" },
  { category: "UI / UX", title: "Interface Design" },
  { category: "System", title: "Design Systems" },
  { category: "Brand", title: "Brand Identity" },
  { category: "Website", title: "Web Experiences" },
  { category: "Motion", title: "Motion Design" },
  { category: "Creative", title: "Creative Development" },
];

/* loose, readable spread — fractions of the canvas half-extent. Every card
   keeps |fx| ≥ 0.5 so the whole centre column stays clear: scattered cards
   never land on the holder (and z-order keeps them under it even when
   dragged across). r = resting rotation. */
const SCATTER = [
  { fx: -0.82, fy: -0.55, r: -7 },
  { fx: -0.56, fy: 0.02, r: 5 },
  { fx: -0.8, fy: 0.6, r: -5 },
  { fx: 0.82, fy: -0.55, r: 7 },
  { fx: 0.56, fy: -0.02, r: -6 },
  { fx: 0.85, fy: 0.52, r: 6 },
  { fx: 0.52, fy: 0.78, r: 3 },
];

export default function Capabilities() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [half, setHalf] = useState({ w: 380, h: 240 });
  const topZ = useRef(10);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      // subtract an (approx) card half-size so the spread scales down on
      // narrow canvases and cards never cross the rulers
      const cw = Math.min(112, r.width * 0.11);
      const ch = Math.min(140, r.height * 0.14);
      setHalf({ w: Math.max(40, r.width / 2 - cw - 12), h: Math.max(80, r.height / 2 - ch - 12) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // reduced motion: reveal the spread immediately, no burst
  useEffect(() => {
    if (reduce) setOpen(true);
  }, [reduce]);

  const container: Variants = {
    closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
    open: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
  };

  const cardVariants: Variants = {
    closed: {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 0.55,
      opacity: 0,
      transition: reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 320, damping: 30 },
    },
    open: (i: number) => ({
      x: SCATTER[i].fx * half.w,
      y: SCATTER[i].fy * half.h,
      rotate: SCATTER[i].r,
      scale: 1,
      opacity: 1,
      transition: reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 22, mass: 0.9 },
    }),
  };

  return (
    <section className="capabilities" id="capabilities">
      {/* drifting bokeh field — the violet scene from the reference clip */}
      <div className="capOrbs" aria-hidden>
        <span className="capOrb capOrb--1" />
        <span className="capOrb capOrb--2" />
        <span className="capOrb capOrb--3" />
        <span className="capOrb capOrb--4" />
        <span className="capOrb capOrb--5" />
        <span className="capOrb capOrb--6" />
        <span className="capOrb capOrb--7" />
      </div>

      <div className="capabilities__canvas" ref={canvasRef}>
        {/* the holo vault / card-holder, centred; scattered cards render
            BELOW it in z, so nothing ever covers the holder */}
        <motion.button
          type="button"
          className={`wallet${open ? " wallet--open" : ""}`}
          aria-label={open ? "Skills issued" : "Open skills wallet"}
          aria-expanded={open}
          onClick={() => !open && setOpen(true)}
          animate={reduce ? undefined : open ? { scale: 0.94 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <span className="wallet__body">
            <span className="wallet__peek wallet__peek--a" aria-hidden />
            <span className="wallet__peek wallet__peek--b" aria-hidden />
            <span className="wallet__peek wallet__peek--c" aria-hidden />
            <span className="wallet__pocket" aria-hidden>
              <span className="wallet__chip" aria-hidden />
              <span className="wallet__emboss" aria-hidden>
                aayush<sup>vz</sup> · skills
              </span>
              <span className="wallet__dot" aria-hidden />
            </span>
          </span>
          <span className="wallet__hint">{open ? "" : "Tap to open"}</span>
        </motion.button>

        {/* the scattered skill cards */}
        <motion.div
          className="capCards"
          initial="closed"
          animate={open ? "open" : "closed"}
          variants={container}
          style={{ pointerEvents: open ? "auto" : "none" }}
        >
          {CAPS.map((cap, i) => (
            <motion.article
              key={cap.title}
              className="capCard"
              custom={i}
              variants={cardVariants}
              drag={open && !reduce}
              dragConstraints={canvasRef}
              dragElastic={0.14}
              dragMomentum
              whileHover={open ? { scale: 1.04 } : undefined}
              whileTap={{ cursor: "grabbing" }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).style.zIndex = String(++topZ.current);
              }}
            >
              <span className="capCard__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="capCard__category">{cap.category}</span>
              <h3 className="capCard__title">{cap.title}</h3>
              {/* artwork slot — drop the final square image here later */}
              <div className="capCard__art" aria-hidden />
            </motion.article>
          ))}
        </motion.div>

        {/* collect / reset — sits ON the holder's pocket face (a sibling
            overlay, since a button can't nest inside the wallet button) */}
        <button
          type="button"
          className={`capGather${open && !reduce ? " capGather--show" : ""}`}
          onClick={() => setOpen(false)}
          aria-label="Collect the skill cards back into the holder"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
            <path
              d="M10 4v9m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Collect
        </button>
      </div>
    </section>
  );
}
