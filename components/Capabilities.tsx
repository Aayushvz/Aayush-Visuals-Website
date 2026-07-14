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
const SCATTER_DESKTOP = [
  { fx: -0.85, fy: -0.58, r: -8 },  // 0: Product Design (top-left)
  { fx: -0.6, fy: 0.22, r: 6 },     // 1: Interface Design (bottom-left-center)
  { fx: -1.02, fy: 0.26, r: -6 },   // 2: Design Systems (bottom-left-left)
  { fx: 0.92, fy: -0.65, r: -8 },   // 3: Brand Identity (top-right)
  { fx: 0.68, fy: -0.12, r: -7 },   // 4: Web Experiences (middle-right)
  { fx: 0.96, fy: 0.58, r: -7 },    // 5: Motion Design (bottom-right-right)
  { fx: 0.64, fy: 0.42, r: 6 },     // 6: Creative Development (bottom-right-center)
];

const SCATTER_MOBILE = [
  { fx: -0.85, fy: -0.52, r: -10 }, // 0: Product Design (top-left, tilted left)
  { fx: -0.82, fy: 0.58, r: -8 },   // 1: Interface Design (bottom-left, tilted left)
  { fx: 0.85, fy: -0.25, r: 8 },    // 2: Design Systems (middle-right, tilted right)
  { fx: -0.2, fy: -0.48, r: -6 },   // 3: Brand Identity (center-top-left, tilted left)
  { fx: 0.42, fy: -0.72, r: -5 },   // 4: Web Experiences (top-center-right, tilted left)
  { fx: 0.82, fy: 0.62, r: -6 },    // 5: Motion Design (bottom-right, tilted left)
  { fx: -0.05, fy: 0.72, r: -4 },   // 6: Creative Development (bottom-center, tilted left)
];

export default function Capabilities() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [half, setHalf] = useState({ w: 380, h: 240 });
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const topZ = useRef(10);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      // subtract an (approx) card half-size so the spread scales down on
      // narrow canvases and cards never cross the rulers
      const cw = Math.min(83, r.width * 0.11);
      const ch = Math.min(105, r.height * 0.14);
      const mobile = r.width < 640;
      setIsMobile(mobile);
      
      const scaleX = mobile ? 1.2 : 1;
      const scaleY = mobile ? 1.15 : 1;
      setHalf({ 
        w: Math.max(40, r.width / 2 - cw - 12) * scaleX, 
        h: Math.max(80, r.height / 2 - ch - 12) * scaleY 
      });
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
    open: (i: number) => {
      const coord = isMobile ? SCATTER_MOBILE[i] : SCATTER_DESKTOP[i];
      return {
        x: coord.fx * half.w,
        y: coord.fy * half.h,
        rotate: coord.r,
        scale: 1,
        opacity: 1,
        transition: reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 300, damping: 22, mass: 0.9 },
      };
    },
  };

  return (
    <section
      className="capabilities"
      id="capabilities"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        if (!isHovered) setIsHovered(true);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: "relative" }}
    >
      {/* Subtle mouse-following spotlight glow (replaces individual dot hover triggers) */}
      {!reduce && isHovered && (
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(235, 226, 255, 0.08) 0%, rgba(139, 92, 246, 0.03) 45%, transparent 70%)",
            filter: "blur(28px)",
            pointerEvents: "none",
            zIndex: 1,
            x: mousePos.x - 220,
            y: mousePos.y - 220,
          }}
        />
      )}

      {/* drifting bokeh field — 5 circular dots moving in random directions (no hover handlers) */}
      <div className="capOrbs" aria-hidden>
        {[
          { id: 1, x: [0, 20, -15, 10, -25, 0], y: [0, -10, 20, -25, 15, 0], scale: [1, 1.15, 1], dur: 14, size: 90, left: "6%", top: "16%" },
          { id: 2, x: [0, -12, 25, -8, 18, 0], y: [0, 18, -10, 22, -15, 0], scale: [1, 1.2, 1], dur: 17, size: 46, left: "22%", top: "68%", opacity: 0.26 },
          { id: 3, x: [0, 15, -20, 12, -8, 0], y: [0, -15, 18, -10, 25, 0], scale: [1, 1.1, 1], dur: 12, size: 34, left: "44%", top: "8%", opacity: 0.2 },
          { id: 4, x: [0, -25, 15, -12, 20, 0], y: [0, 10, -22, 18, -10, 0], scale: [1, 1.25, 1], dur: 20, size: 110, right: "8%", top: "24%" },
          { id: 5, x: [0, 18, -10, 25, -15, 0], y: [0, -20, 12, -28, 15, 0], scale: [1, 1.15, 1], dur: 16, size: 60, right: "24%", bottom: "12%", opacity: 0.28 },
        ].map((orb) => (
          <motion.span
            key={orb.id}
            className={`capOrb capOrb--${orb.id}`}
            style={{
              position: "absolute",
              width: orb.size,
              height: orb.size,
              left: orb.left,
              top: orb.top,
              right: orb.right,
              bottom: orb.bottom,
              opacity: orb.opacity ?? 0.34,
              pointerEvents: "none",
            }}
            animate={reduce ? undefined : {
              x: orb.x,
              y: orb.y,
              scale: orb.scale,
            }}
            transition={{
              duration: orb.dur,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Vertical side rails (matching statement section rails) */}
      <div className="capRails" aria-hidden>
        <span className="capRail capRail--left" />
        <span className="capRail capRail--right" />
      </div>

      <div className="capabilities__canvas" ref={canvasRef}>
        {/* the holo vault / card-holder, centred */}
        <motion.div
          className={`wallet${open ? " wallet--open" : ""}`}
          animate={
            reduce
              ? undefined
              : open
              ? { scale: 0.94, x: 0, rotate: 0 }
              : { scale: 1, x: [0, -3, 3, -3, 3, 0], rotate: [0, -1, 1, -1, 1, 0] }
          }
          transition={
            open
              ? { type: "spring", stiffness: 260, damping: 24 }
              : { duration: 0.4, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }
          }
          onClick={() => setOpen(!open)}
          style={{ cursor: "pointer" }}
        >
          <span className="wallet__body">
            <span className="wallet__peek wallet__peek--a" aria-hidden />
            <span className="wallet__peek wallet__peek--b" aria-hidden />
            <span className="wallet__peek wallet__peek--c" aria-hidden />
            <span className="wallet__pocket" aria-hidden>
              <span className="wallet__actionBtn" aria-hidden>
                {open ? "Collect" : "Open"}
              </span>
              <span className="wallet__emboss" aria-hidden>
                aayush<sup>vz</sup> · skills
              </span>
              <span className="wallet__chip" aria-hidden />
              <span className="wallet__dot" aria-hidden />
            </span>
          </span>
          <span className="wallet__hint">{open ? "" : "TAP TO OPEN"}</span>
        </motion.div>

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
              <div className="capCard__art" aria-hidden />
            </motion.article>
          ))}
        </motion.div>
      </div>

      {/* Footer text — OUTSIDE the canvas, pinned to section bottom */}
      <div className="capabilities__footer">
        <h2 className="capabilities__footerTitle">Skills</h2>
        <p className="capabilities__footerSub">Hold the wallet to reveal</p>
      </div>
    </section>
  );
}
