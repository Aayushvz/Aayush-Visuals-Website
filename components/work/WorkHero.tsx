"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from "framer-motion";
import { PROJECTS } from "@/components/projects/projectData";

/*
  WorkHero — the choreographed hero of the /work page. It is ONE section
  that moves through four animation states, not four stacked sections:

    1. INTRO      "Creative Projects" fades/lifts into the centre.
    2. SPLIT      the two words separate to opposite sides (transform only).
    3. STACK      an art-directed stack of project cards enters the centre.
    4. SCROLL     the pinned stage hands card progression to scroll.

  The deck is a vertical CONVEYOR. Each card's slot is a signed offset from
  the front card (-3..+3 for 7 projects): the front sits centre, recent cards
  peek ABOVE, upcoming cards peek BELOW - so the stack is visible at both the
  top and bottom edges. Advancing flows the whole stack upward one slot with a
  spring, so cards physically rise OVER each other (no fade-cut). Because a
  7-card cycle fills 7 slots, the card leaving the top must reappear at the
  bottom; that single card is snapped (not tweened through centre) while it is
  at its faint extreme, so the wrap is invisible and the flow stays clean.

  Behind everything sits the homepage hero's dotted grid (theme-reactive):
  dark theme -> dark ground + near-white text, light theme -> cream + ink.

  Only transform + opacity animate (GPU); `front` updates at most ~1x/sec or
  per scroll-step, never per frame, so React does not re-render on scroll.
*/

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 240, damping: 28, mass: 0.9 } as const;
const N = PROJECTS.length;

/* signed-offset slots: 0 = front, negative = above (recent), positive = below
   (upcoming). Symmetric peek, 3 layers each side, scale + opacity fall off. */
type Slot = { y: number; s: number; o: number };
const SLOTS: Record<number, Slot> = {
  0: { y: 0, s: 1.0, o: 1 },
  1: { y: 28, s: 0.95, o: 1 },
  2: { y: 52, s: 0.9, o: 0.78 },
  3: { y: 73, s: 0.86, o: 0.32 },
  4: { y: 90, s: 0.82, o: 0 },
  5: { y: 105, s: 0.78, o: 0 },
  6: { y: 118, s: 0.74, o: 0 },
  7: { y: 130, s: 0.70, o: 0 },
  [-1]: { y: -28, s: 0.95, o: 1 },
  [-2]: { y: -52, s: 0.9, o: 0.78 },
  [-3]: { y: -73, s: 0.86, o: 0.32 },
  [-4]: { y: -90, s: 0.82, o: 0 },
  [-5]: { y: -105, s: 0.78, o: 0 },
  [-6]: { y: -118, s: 0.74, o: 0 },
  [-7]: { y: -130, s: 0.70, o: 0 },
};

/* Mobile-specific slots: extreme scaling and vertical fanning, fully opaque */
const MOBILE_SLOTS: Record<number, Slot> = {
  0: { y: 0, s: 1.0, o: 1 },
  1: { y: 65, s: 0.85, o: 1 },
  2: { y: 120, s: 0.70, o: 1 },
  3: { y: 165, s: 0.55, o: 1 },
  4: { y: 200, s: 0.40, o: 0 },
  5: { y: 230, s: 0.30, o: 0 },
  6: { y: 250, s: 0.20, o: 0 },
  7: { y: 265, s: 0.10, o: 0 },
  [-1]: { y: -65, s: 0.85, o: 1 },
  [-2]: { y: -120, s: 0.70, o: 1 },
  [-3]: { y: -165, s: 0.55, o: 1 },
  [-4]: { y: -200, s: 0.40, o: 0 },
  [-5]: { y: -230, s: 0.30, o: 0 },
  [-6]: { y: -250, s: 0.20, o: 0 },
  [-7]: { y: -265, s: 0.10, o: 0 },
};

const HIDDEN_ENTER: Slot = { y: 63, s: 0.9, o: 0 };
const MOBILE_HIDDEN_ENTER: Slot = { y: 100, s: 0.85, o: 0 };

/* map a card index to its signed offset from the front (-floor(N/2)..) */
function signedOffset(i: number, front: number) {
  let d = (((i - front) % N) + N) % N; // 0..N-1
  if (d > N / 2) d -= N; // wrap the far half to the negative (above) side
  return d;
}

type Phase = "enter" | "split" | "stack" | "cycling";

/* progress below this "top zone" belongs to autoplay; above it, scroll drives */
const ENGAGE = 0.02;

export default function WorkHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const [phase, setPhase] = useState<Phase>("enter");
  const [inView, setInView] = useState(false);
  const [front, setFront] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const frontRef = useRef(0);
  const engaged = useRef(false);
  const base = useRef({ p: 0, index: 0 });
  const prevOffset = useRef<Record<string, number>>({});
  useEffect(() => {
    frontRef.current = front;
  }, [front]);

  /* entrance flag: flip on next frame so the CSS transition actually plays */
  useEffect(() => {
    const id = requestAnimationFrame(() => setInView(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* time-based choreography (states 1-3). Reduced motion jumps to the end. */
  useEffect(() => {
    if (reduce) {
      setPhase("cycling");
      return;
    }
    const timers = [
      window.setTimeout(() => setPhase("split"), 1500),
      window.setTimeout(() => setPhase("stack"), 2040),
      window.setTimeout(() => setPhase("cycling"), 2560),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /* autoplay: the whole stack flows up one slot (~1s). It reads the live scroll
     value each tick, so it self-pauses the moment the user scrolls past the top
     zone and resumes when they return - never latched. */
  useEffect(() => {
    if (reduce || phase !== "cycling") return;
    const id = window.setInterval(() => {
      if (scrollYProgress.get() > ENGAGE) return; // scroll owns the deck now
      setFront((f) => (f + 1) % N);
    }, 1000);
    return () => window.clearInterval(id);
  }, [reduce, phase, scrollYProgress]);

  /* once past the top zone, scroll drives the deck. The base (progress + card)
     is captured on entry so the handoff from autoplay is jump-free, and ~4
     cards advance before the tall wrapper runs out and the pin releases. */
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduce || phase !== "cycling") return;
    if (p <= ENGAGE) {
      engaged.current = false;
      return;
    }
    if (!engaged.current) {
      engaged.current = true;
      base.current = { p, index: frontRef.current };
    }
    const b = base.current;
    const step = Math.max(0.06, (1 - b.p) / 4.5);
    const raw = b.index + Math.floor((p - b.p) / step);
    const next = ((raw % N) + N) % N;
    if (next !== frontRef.current) setFront(next);
  });

  const entered = phase === "stack" || phase === "cycling";

  return (
    <section className="workHero" ref={sectionRef}>
      <div className="workHero__pin" data-phase={phase} data-in={inView ? "true" : "false"}>
        {/* homepage-hero dotted grid, theme-reactive, nested h*v edge fade */}
        <div className="workHero__grid" aria-hidden>
          <div className="workHero__gridV">
            <div className="workHero__gridPattern" />
          </div>
        </div>

        <motion.div
          className="workHero__scrollPrompt"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: entered ? 0.6 : 0, y: entered ? 0 : 15 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          aria-hidden
        >
          <span className="workHero__scrollText">Scroll</span>
          <svg
            className="workHero__scrollArrow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16m-6-6l6 6 6-6" />
          </svg>
        </motion.div>

        <h1 className="workHero__srHeading">Creative Projects</h1>

        <div className="workHero__heading" aria-hidden>
          <span className="workHero__word workHero__word--left">Creative</span>
          <span className="workHero__word workHero__word--right">Projects</span>
        </div>

        <div className="workHero__stack" aria-hidden={!entered}>
          {PROJECTS.map((p, i) => {
            const d = signedOffset(i, front);
            const activeSlots = isMobile ? MOBILE_SLOTS : SLOTS;
            const activeHidden = isMobile ? MOBILE_HIDDEN_ENTER : HIDDEN_ENTER;
            const slot =
              !entered
                ? activeHidden
                : activeSlots[d] ?? (d > 0 ? activeSlots[3] : activeSlots[-3]);
            /* the one card that jumped across the seam (top -> bottom) is
               snapped so it never slides through the centre of the stack */
            const prev = prevOffset.current[p.id];
            const wrapped =
              prev !== undefined && Math.abs(d - prev) > Math.floor(N / 2) - 1;
            prevOffset.current[p.id] = d;
            return (
              <motion.article
                key={p.id}
                className="workHero__card"
                style={{ zIndex: 100 - Math.abs(d) }}
                initial={false}
                animate={{ y: slot.y, scale: slot.s, opacity: slot.o }}
                transition={
                  wrapped
                    ? { duration: 0 }
                    : { y: SPRING, scale: SPRING, opacity: { duration: 0.5, ease: EASE } }
                }
              >
                <img
                  className="workHero__cardImg"
                  src={p.cover}
                  alt={p.title}
                  loading={i < 4 ? "eager" : "lazy"}
                  fetchPriority={i < 2 ? "high" : "auto"}
                  draggable={false}
                />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
