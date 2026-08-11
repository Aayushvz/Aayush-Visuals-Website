"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    id: 0,
    quote:
      "Aayush delivered a complex conversational UI for a national grievance platform under tight deadlines. The care for accessibility across 22 language variants was genuinely impressive.",
    name: "Priya Sharma",
    role: "Senior Manager, GovTech",
    company: "KPMG India",
    companyShort: "KPMG",
    avatar: null,
    linkedin: null,
  },
  {
    id: 1,
    quote:
      "From our very first call, Aayush grasped the LayOver product vision completely. He translated it into an interface our users love navigating, shipping 20+ screens with total consistency.",
    name: "Rahul Menon",
    role: "Co-founder",
    company: "LayOver",
    companyShort: "LAYOVER",
    avatar: null,
    linkedin: null,
  },
  {
    id: 2,
    quote:
      "The Iron Forge identity Aayush built became the soul of our entire platform. Every screen felt powerful, considered, and completely true to what the brand stands for.",
    name: "James Holt",
    role: "Brand Director",
    company: "Mike Tyson Invitational",
    companyShort: "MTI",
    avatar: null,
    linkedin: null,
  },
  {
    id: 3,
    quote:
      "Aayush defined our entire visual identity and delivered a platform that held up under 500k+ visits without a hiccup. Exceptional craft and real design leadership.",
    name: "Krish Iyer",
    role: "Chairperson",
    company: "Riviera, VIT",
    companyShort: "RIVIERA",
    avatar: null,
    linkedin: null,
  },
  {
    id: 4,
    quote:
      "Running a 75-member design team while shipping consistently high-quality work is rare. Aayush did exactly that and raised the bar for every person on the team.",
    name: "Arjun Mehta",
    role: "President",
    company: "E-Cell, VIT",
    companyShort: "E-CELL",
    avatar: null,
    linkedin: null,
  },
];

// Stack positions per depth level: 0 = active/front, higher = further back
const STACK = [
  { x: 0,  y: 0,  rotate: 0,    scale: 1,    opacity: 1    }, // 0: active
  { x: 10, y: 11, rotate: 2.8,  scale: 0.97, opacity: 1    }, // 1: second
  { x: -8, y: 20, rotate: -3.8, scale: 0.94, opacity: 0.92 }, // 2: third
  { x: 5,  y: 27, rotate: 1.5,  scale: 0.91, opacity: 0    }, // 3: hidden
  { x: 0,  y: 32, rotate: 0,    scale: 0.88, opacity: 0    }, // 4: hidden
];

const SPRING      = { type: "spring" as const, stiffness: 130, damping: 22, mass: 0.85 };
const EXIT_SPRING = { type: "spring" as const, stiffness: 80,  damping: 18, mass: 1.1  };

/* `hideHeader` used to gate the big "05" section index. The index is gone from
   both pages now, so the prop had nothing left to switch. */
export default function Testimonials() {
  const n = TESTIMONIALS.length;

  // order[0] = front card's index in TESTIMONIALS
  const [order, setOrder]          = useState<number[]>(() => Array.from({ length: n }, (_, i) => i));
  const [exitingId, setExitingId]  = useState<number | null>(null);
  const [exitDir, setExitDir]      = useState<1 | -1>(1);
  const [busy, setBusy]            = useState(false);
  const pausedRef                  = useRef(false);
  const reducedRef                 = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onVis = () => { pausedRef.current = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const advance = useCallback(
    (dir: 1 | -1 = 1) => {
      if (busy) return;
      setBusy(true);
      setExitDir(dir);
      setExitingId(order[0]);
      setOrder((prev) => {
        if (dir === 1) {
          const [first, ...rest] = prev;
          return [...rest, first];
        }
        const last = prev[prev.length - 1];
        return [last, ...prev.slice(0, -1)];
      });
      setTimeout(() => { setExitingId(null); setBusy(false); }, 1100);
    },
    [busy, order],
  );

  const goTo = useCallback(
    (targetIdx: number) => {
      if (busy || order[0] === targetIdx) return;
      setBusy(true);
      setExitDir(1);
      setExitingId(order[0]);
      setOrder((prev) => [targetIdx, ...prev.filter((i) => i !== targetIdx)]);
      setTimeout(() => { setExitingId(null); setBusy(false); }, 1100);
    },
    [busy, order],
  );

  // Auto-play
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!pausedRef.current) advance(1);
      timer = setTimeout(tick, 4600);
    };
    timer = setTimeout(tick, 4600);
    return () => clearTimeout(timer);
  }, [advance]);

  return (
    <section
      className="testi"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* Header */}
      <div className="testi__header">
        <h2 className="testi__title">
          Trusted by founders,
          <br />
          backed by results.
        </h2>
        <p className="testi__subtitle">Results that speak through the people I&apos;ve worked with.</p>
      </div>

      {/* Scene: grid bg + strap + navRow */}
      <div className="testi__scene">
        <div className="testi__grid" aria-hidden />

        {/* Hanging strap */}
        <div className="testi__strap" aria-hidden>
          <div className="testi__strapLine" />
          <div className="testi__strapClip" />
        </div>

        {/* Nav row: prev arrow | card stack | next arrow */}
        <div className="testi__navRow">
          <button
            className="testi__nav testi__nav--prev"
            onClick={() => advance(-1)}
            aria-label="Previous testimonial"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Card stack */}
          <div className="testi__stack">
            {/* Rendered back-to-front; explicit zIndex handles stacking */}
            {[...order].reverse().map((tIdx) => {
              const pos       = order.indexOf(tIdx);
              const isExiting = exitingId === tIdx;
              const t         = TESTIMONIALS[tIdx];
              const isActive  = pos === 0 && !isExiting;

              const exitX      = exitDir === 1 ? 340 : -340;
              const animTarget = isExiting
                ? reducedRef.current
                  ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }
                  : { x: exitX, y: 90, rotate: exitDir === 1 ? 22 : -22, scale: 0.86, opacity: 0 }
                : STACK[Math.min(pos, STACK.length - 1)];

              return (
                <motion.div
                  key={tIdx}
                  className={`testi__card${isActive ? " testi__card--active" : ""}`}
                  initial={false}
                  animate={animTarget}
                  transition={isExiting ? EXIT_SPRING : SPRING}
                  style={{ transformOrigin: "top center", zIndex: isExiting ? 20 : 10 - pos }}
                  drag={isActive ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.08}
                  whileDrag={{ cursor: "grabbing" }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) advance(1);
                    else if (info.offset.x > 80) advance(-1);
                  }}
                >
                  {/* Card top row */}
                  <div className="testi__cardHead">
                    <span className="testi__company">{t.companyShort}</span>
                    <div className="testi__dots" role="tablist" aria-label="Testimonials">
                      {TESTIMONIALS.map((_, di) => (
                        <button
                          key={di}
                          role="tab"
                          aria-selected={order[0] === di}
                          className={`testi__dot${order[0] === di ? " testi__dot--on" : ""}`}
                          onClick={() => goTo(di)}
                          tabIndex={isActive ? 0 : -1}
                          aria-label={`Testimonial ${di + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quote body */}
                  <div className="testi__body">
                    <span className="testi__qMark" aria-hidden>&ldquo;</span>
                    <p className="testi__quote">{t.quote}</p>
                  </div>

                  {/* Card footer */}
                  <div className="testi__cardFoot">
                    <div className="testi__person">
                      <div className="testi__avatar" aria-hidden>
                        <span>{t.name.charAt(0)}</span>
                      </div>
                      <div className="testi__personInfo">
                        <p className="testi__pName">{t.name}</p>
                        <p className="testi__pRole">{t.role}&nbsp;&middot;&nbsp;{t.company}</p>
                      </div>
                    </div>
                    {t.linkedin && (
                      <a
                        href={t.linkedin}
                        className="testi__li"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t.name} on LinkedIn`}
                        tabIndex={isActive ? 0 : -1}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            className="testi__nav testi__nav--next"
            onClick={() => advance(1)}
            aria-label="Next testimonial"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
