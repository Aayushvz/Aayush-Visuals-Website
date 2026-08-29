"use client";

import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";

/*
  Aayush Visuals hero — one draggable world with per-card interaction.

  HeroViewport (.hero, sticky, clips)
    ├── GridFadeMask (.heroGridFade → __v — stationary nested h/v masks;
    │     their product fades all four edges and corners hardest)
    │     └── MovingGrid (.heroGridFade__pattern — receives the SAME
    │           transform as the world each frame) └── GridTrail
    ├── FixedRulerFrame (.heroRuler — viewport-aligned editorial ruler:
    │     rails + connected horizontal segments + labels; draws inward on
    │     load, fades out during world drag, fades back after settle)
    └── HeroWorld (.heroWorld — whole-canvas translate3d ONLY)
          ├── Typography (.hero__mark)
          └── Card layers: .heroCard → __drag (lerped target/rendered
                drag + velocity rotation) → __inner (hover tilt)
*/

const EASE = [0.22, 1, 0.36, 1] as const;
const DRAG_THRESHOLD = 6;
const TRAIL_MAX = 12;
const TRAIL_LIFE_MS = 3400;

/*
  These cards render at 188-244px wide, but the raw framerusercontent.com
  exports are the original uploads — up to 6000x4000px (5.7MB) for what's a
  ~30KB thumbnail on screen. That's several MB of unnecessary download plus
  main-thread decode/rasterize cost on every one of these actively-dragged,
  entrance-animated cards, all happening at once on hero mount.

  Framer's own asset CDN honours a `scale-down-to` query param (constrains
  the longest edge, keeps aspect ratio, same format) — no re-upload, no
  layout change needed since .heroCard__inner img is width/height:100% +
  object-fit:cover already. 600px covers 2-3x retina at this display size
  with room to spare for the object-fit crop.
*/
function framerAsset(src: string, maxEdge = 600) {
  return src.includes("framerusercontent.com") ? `${src}?scale-down-to=${maxEdge}` : src;
}

type Card = {
  src: string;
  alt: string;
  w: number;
  h: number;
  /** offset from world centre, px (desktop scale) */
  ox: number;
  oy: number;
  rot: number;
  /** part of the dedicated mobile composition (original phone reference) */
  mobile?: boolean;
};

const CARDS: Card[] = [
  { src: "https://framerusercontent.com/images/N58AblVGhS8d8WNbem75fnZJY.png", alt: "Poster design", w: 188, h: 280, ox: -372, oy: -326, rot: -2.5, mobile: true },
  { src: "https://framerusercontent.com/images/KHhJ7tm0Ianbz8NKexmRBTUtE.png", alt: "Futurepreneurs website", w: 188, h: 182, ox: -586, oy: -174, rot: 1.5 },
  { src: "https://framerusercontent.com/images/c9Tsm6LX1MRlsqu10te7mVmJpww.png", alt: "Automotive photography", w: 188, h: 280, ox: 394, oy: -279, rot: 2, mobile: true },
  { src: "https://framerusercontent.com/images/lixbhVQGtaJ1VnQKjv0GZQPzjwA.png", alt: "Food app interface", w: 188, h: 242, ox: 526, oy: -364, rot: -1.5 },
  { src: "https://framerusercontent.com/images/oo2KOi0T0T3Gc7mMJ6T4qgnqPqE.png", alt: "App interface", w: 188, h: 216, ox: 307, oy: 183, rot: 1 },
  { src: "https://framerusercontent.com/images/j7nFLyPw7Z0AjwVk2UBXI0pvmzM.png", alt: "Controller design", w: 188, h: 238, ox: -558, oy: 385, rot: -2 },
  /*
    Mike Tyson takes the slot the E-Summit laptop held; that card is gone
    rather than moved.

    244 is 1.3x the 188 every other card is set to, and the only one off that
    module. The shot is a mockup rather than a flat screenshot, so at the
    common width the screen it exists to show reads as a smudge. 156 is the
    frame's own 1212:777 — the height follows the image, not the slot, or
    object-fit re-crops what the source was already cropped to.

    `mobile` stays with the slot, not the image: it marks which cards belong
    to the phone composition, which is a fact about position.
  */
  { src: "/projects/mike-tyson-hero-card.webp", alt: "Mike Tyson Invitational website", w: 244, h: 156, ox: -326, oy: 145, rot: 1.5, mobile: true },
  { src: "https://framerusercontent.com/images/Kc86yKh4qp4oDdDwiBYEWKdRZ4.png", alt: "Fuzion poster", w: 188, h: 232, ox: 530, oy: 266, rot: -1, mobile: true },
];

function DragIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 1.5 L12.5 4.5 H7.5 Z M10 18.5 L7.5 15.5 H12.5 Z M1.5 10 L4.5 7.5 V12.5 Z M18.5 10 L15.5 12.5 V7.5 Z"
        fill="currentColor"
      />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

/*
  Purple grid-cell hover trail. Cell derived mathematically from the moving
  pattern's rect; state updates only on cell change; max TRAIL_MAX cells,
  each with timeout expiry. Per-cell intensity = recency × distance from the
  current pointer cell, exposed as --cellMax for the fade keyframes.
*/
function GridTrail({ patternRef }: { patternRef: React.RefObject<HTMLDivElement | null> }) {
  const [cells, setCells] = useState<{ x: number; y: number; key: number }[]>([]);
  const gsRef = useRef(20.28);
  const lastCell = useRef({ x: NaN, y: NaN });
  const keyRef = useRef(0);
  const timeouts = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pattern = patternRef.current;
    const hero = pattern?.closest(".hero");
    if (!pattern || !hero) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsRef.current = parseFloat(getComputedStyle(pattern).backgroundSize) || 20.28;
    const mark = hero.querySelector(".hero__mark");
    const timeoutsMap = timeouts.current;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (e.buttons !== 0) return; // card or canvas drag in progress
      if (hero.classList.contains("hero--dragging")) return;
      if (window.scrollY > 40) return; // leaving the hero — pause the trail

      const gs = gsRef.current;
      const pr = pattern.getBoundingClientRect();
      const cx = Math.floor((e.clientX - pr.left) / gs);
      const cy = Math.floor((e.clientY - pr.top) / gs);
      if (cx === lastCell.current.x && cy === lastCell.current.y) return;

      // Empty grid only: never over cards, UI controls, or the title block.
      const t = e.target as Element | null;
      if (t?.closest?.("[data-draggable-card], a, button")) return;
      if (mark) {
        const mr = mark.getBoundingClientRect();
        if (
          e.clientX >= mr.left &&
          e.clientX <= mr.right &&
          e.clientY >= mr.top &&
          e.clientY <= mr.bottom
        )
          return;
      }

      lastCell.current = { x: cx, y: cy };
      const key = keyRef.current++;
      setCells((prev) =>
        [...prev.filter((c) => !(c.x === cx && c.y === cy)), { x: cx, y: cy, key }].slice(
          -TRAIL_MAX
        )
      );
      timeoutsMap.set(
        key,
        setTimeout(() => {
          timeoutsMap.delete(key);
          setCells((prev) => prev.filter((c) => c.key !== key));
        }, TRAIL_LIFE_MS)
      );
    };

    hero.addEventListener("pointermove", onMove as EventListener, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", onMove as EventListener);
      timeoutsMap.forEach((t) => clearTimeout(t));
      timeoutsMap.clear();
    };
  }, [patternRef]);

  const gs = gsRef.current;
  const cur = cells[cells.length - 1];
  return (
    <>
      {cells.map((c, i) => {
        // recency (position in trail) × distance from the current cell
        const recency = Math.pow((i + 1) / cells.length, 0.75);
        const dist = cur ? Math.hypot(c.x - cur.x, c.y - cur.y) : 0;
        const intensity = recency * (1 / (1 + dist * 0.14));
        return (
          <span
            key={c.key}
            className="gridTrail__cell"
            style={
              {
                left: c.x * gs,
                top: c.y * gs,
                width: gs,
                height: gs,
                "--cellMax": `calc(var(--trail-max) * ${intensity.toFixed(3)})`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
}

function ProjectCard({
  card,
  index,
  tiltEnabled,
}: {
  card: Card;
  index: number;
  tiltEnabled: boolean;
}) {
  const cardEl = useRef<HTMLDivElement>(null);
  const dragEl = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const tiltRaf = useRef(0);
  /*
    Smooth drag: pointer writes a clamped TARGET; a per-card rAF loop lerps
    the RENDERED position toward it (k = 0.28 — immediate but lightly
    weighted) and derives a tiny velocity rotation (±2.5° max) that eases
    back to neutral. The loop keeps running briefly after release until the
    card settles exactly at the release target. No inertia, no free-fall.
  */
  const drag = useRef({
    tX: 0,
    tY: 0,
    rX: 0,
    rY: 0,
    baseX: 0,
    baseY: 0,
    startX: 0,
    startY: 0,
    spread: 1,
    rot: 0,
    pressed: false,
    dragging: false,
    raf: 0,
  });

  useEffect(() => {
    const d = drag.current;
    const t = tiltRaf;
    return () => {
      cancelAnimationFrame(d.raf);
      cancelAnimationFrame(t.current);
    };
  }, []);

  const applyTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = inner.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(tiltRaf.current);
    tiltRaf.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${(-py * 5.5).toFixed(2)}deg) rotateY(${(px * 5.5).toFixed(2)}deg) scale(1.045)`;
    });
  };

  const resetTilt = () => {
    cancelAnimationFrame(tiltRaf.current);
    if (inner.current) inner.current.style.transform = "";
  };

  const renderLoop = () => {
    const d = drag.current;
    const el = dragEl.current;
    if (!el) {
      d.raf = 0;
      return;
    }
    d.rX += (d.tX - d.rX) * 0.28;
    d.rY += (d.tY - d.rY) * 0.28;
    const targetRot = Math.max(-2.5, Math.min(2.5, (d.tX - d.rX) * 0.06));
    d.rot += (targetRot - d.rot) * 0.22;
    el.style.transform = `translate3d(${d.rX.toFixed(2)}px, ${d.rY.toFixed(2)}px, 0) rotate(${d.rot.toFixed(3)}deg)`;
    const settled =
      !d.pressed &&
      Math.abs(d.tX - d.rX) < 0.3 &&
      Math.abs(d.tY - d.rY) < 0.3 &&
      Math.abs(d.rot) < 0.05;
    if (settled) {
      d.rX = d.tX;
      d.rY = d.tY;
      d.rot = 0;
      el.style.transform = `translate3d(${d.tX.toFixed(2)}px, ${d.tY.toFixed(2)}px, 0)`;
      d.raf = 0;
      return;
    }
    d.raf = requestAnimationFrame(renderLoop);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Cards accept touch too (touch-action: pan-y keeps vertical page
    // scrolling native — horizontal moves become a card drag). The WORLD
    // drag stays mouse-only, so empty-grid touches always scroll the page.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const d = drag.current;
    d.pressed = true;
    d.dragging = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.baseX = d.tX;
    d.baseY = d.tY;
    const hero = e.currentTarget.closest(".hero");
    d.spread = hero
      ? parseFloat(getComputedStyle(hero as Element).getPropertyValue("--spread")) || 1
      : 1;
    try {
      dragEl.current?.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;

    if (d.pressed && !d.dragging) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
        d.dragging = true;
        resetTilt();
        const el = cardEl.current;
        if (el) {
          // last-interacted card stays on top of its siblings
          document
            .querySelectorAll(".heroCard--top")
            .forEach((n) => n.classList.remove("heroCard--top"));
          el.classList.add("heroCard--top", "heroCard--dragging");
        }
      }
    }

    if (d.dragging) {
      // Clamp in world space: the card centre may roam ±72% of the viewport
      // from the world centre, so with the world's own ±30% pan every card
      // stays recoverable (well over a third of it reachable).
      const limX = window.innerWidth * 0.72;
      const limY = window.innerHeight * 0.72;
      const bx = card.ox * d.spread;
      const by = card.oy * d.spread;
      d.tX = Math.min(limX - bx, Math.max(-limX - bx, d.baseX + e.clientX - d.startX));
      d.tY = Math.min(limY - by, Math.max(-limY - by, d.baseY + e.clientY - d.startY));
      if (!d.raf) d.raf = requestAnimationFrame(renderLoop);
      return;
    }

    if (tiltEnabled && !d.pressed) applyTilt(e);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.pressed) return;
    d.pressed = false;
    d.dragging = false;
    cardEl.current?.classList.remove("heroCard--dragging");
    try {
      dragEl.current?.releasePointerCapture(e.pointerId);
    } catch {}
    // The render loop keeps running until the card settles at the release
    // target — a tiny smooth settle, no inertia.
  };

  const onPointerLeave = () => {
    if (!drag.current.dragging) resetTilt();
  };

  return (
    <motion.div
      ref={cardEl}
      className={`heroCard heroCard--c${index} ${card.mobile ? "" : "heroCard--mHide"}`}
      data-draggable-card
      style={
        {
          width: card.w,
          height: card.h,
          "--ox": `${card.ox}px`,
          "--oy": `${card.oy}px`,
          "--rot": `${card.rot}deg`,
        } as React.CSSProperties
      }
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: 0.85 + index * 0.07,
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
    >
      <div
        className="heroCard__drag"
        ref={dragEl}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
      >
        <div className="heroCard__inner" ref={inner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={framerAsset(card.src)} alt={card.alt} draggable={false} loading="eager" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const gridFadeRef = useRef<HTMLDivElement>(null);
  const gridPatternRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTiltEnabled(fine && !reduced);

    const world = worldRef.current;
    const hero = heroRef.current;
    const gridPattern = gridPatternRef.current;
    const ruler = rulerRef.current;
    if (!world || !hero) return;

    /* --- single world transform: drag (clamped, lerped) + scroll response --- */
    const pos = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const start = { x: 0, y: 0 };
    let dragging = false;
    let scrollP = 0;
    let raf = 0;
    let rulerTimer: ReturnType<typeof setTimeout> | undefined;
    const lerpK = reduced ? 1 : 0.14;

    const clamp = (v: number, m: number) => Math.min(m, Math.max(-m, v));

    const onPointerDown = (e: PointerEvent) => {
      // Mouse only: touch keeps native vertical page scrolling.
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      // Card presses belong to the card's own drag layer, not the world.
      if ((e.target as Element).closest?.("[data-draggable-card]")) return;
      dragging = true;
      start.x = e.clientX - target.x;
      start.y = e.clientY - target.y;
      try {
        world.setPointerCapture(e.pointerId);
      } catch {}
      hero.classList.add("hero--dragging");
      // ruler dissolves while the world moves (world drag only)
      clearTimeout(rulerTimer);
      ruler?.classList.add("heroRuler--hidden");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      target.x = clamp(e.clientX - start.x, window.innerWidth * 0.3);
      target.y = clamp(e.clientY - start.y, window.innerHeight * 0.3);
      wake();
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      hero.classList.remove("hero--dragging");
      try {
        world.releasePointerCapture(e.pointerId);
      } catch {}
      // No free-fall: the lerp below settles the world at the release target.
      // Let it settle briefly, then fade the ruler back in (no full replay).
      clearTimeout(rulerTimer);
      rulerTimer = setTimeout(() => ruler?.classList.remove("heroRuler--hidden"), 200);
    };

    const onDblClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.("[data-draggable-card]")) return;
      target.x = 0;
      target.y = 0;
      wake();
    };

    const onScroll = () => {
      wake();
      scrollP = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      // the standalone theme switcher is hero-only: fade it once the panel
      // has mostly covered the hero (reuses this handler — no new observer)
      document.documentElement.classList.toggle(
        "past-hero",
        window.scrollY > window.innerHeight * 0.6
      );
    };

    let lastT = "";

    const loop = () => {
      raf = 0;
      pos.x += (target.x - pos.x) * lerpK;
      pos.y += (target.y - pos.y) * lerpK;
      // linear parallax exit: the world rides up at a fraction of scroll
      // speed while the white About surface covers it — no fade, no scale,
      // the hero stays fully alive behind the incoming panel (matches the
      // live-site recording).
      const py = pos.y - scrollP * (window.innerHeight || 0) * 0.38;
      const t = `translate3d(${pos.x.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
      // skip the writes when nothing moved — assigning an identical
      // transform still invalidates style for three elements every frame
      if (t !== lastT) {
        lastT = t;
        world.style.transform = t;
        // grid pattern pans with the world; its fade mask stays put
        if (gridPattern) gridPattern.style.transform = t;
        if (ruler) ruler.style.transform = `translate3d(0, ${py.toFixed(2)}px, 0)`;
      }
      // park the loop once the world has settled and the hero is scrolled
      // well out of view — otherwise this rAF keeps running for the entire
      // length of the page. Any scroll or pointer input wakes it again.
      const settled =
        Math.abs(target.x - pos.x) < 0.05 && Math.abs(target.y - pos.y) < 0.05;
      if (settled && !dragging && window.scrollY > window.innerHeight * 1.2) return;
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    world.addEventListener("pointerdown", onPointerDown);
    world.addEventListener("pointermove", onPointerMove);
    world.addEventListener("pointerup", endDrag);
    world.addEventListener("pointercancel", endDrag);
    world.addEventListener("dblclick", onDblClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(loop);

    return () => {
      world.removeEventListener("pointerdown", onPointerDown);
      world.removeEventListener("pointermove", onPointerMove);
      world.removeEventListener("pointerup", endDrag);
      world.removeEventListener("pointercancel", endDrag);
      world.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("past-hero");
      clearTimeout(rulerTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="heroStage">
      <MotionConfig reducedMotion="user">
        <section ref={heroRef} className="hero" id="top">
          {/* stationary nested h/v fade masks; the pattern inside pans */}
          <div className="heroGridFade" ref={gridFadeRef} aria-hidden>
            <div className="heroGridFade__v">
              <div className="heroGridFade__pattern" ref={gridPatternRef}>
                <GridTrail patternRef={gridPatternRef} />
              </div>
            </div>
          </div>

          {/* viewport-aligned editorial ruler frame (behind the world) */}
          <div className="heroRuler" ref={rulerRef} aria-hidden>
            <span className="heroRuler__rail heroRuler__rail--left" />
            <span className="heroRuler__rail heroRuler__rail--right" />
            <div className="heroRuler__row">
              <span className="heroRuler__seg heroRuler__seg--outerLeft" />
              <span className="heroRuler__label heroRuler__label--left">
                Product Designer
              </span>
              <span className="heroRuler__seg heroRuler__seg--innerLeft" />
              <span className="heroRuler__spacer" />
              <span className="heroRuler__seg heroRuler__seg--innerRight" />
              <span className="heroRuler__label heroRuler__label--right">
                Based in India
              </span>
              <span className="heroRuler__seg heroRuler__seg--outerRight" />
            </div>
          </div>

          <div className="heroWorld" ref={worldRef}>
            <div className="hero__mark">
              <motion.span
                className="hero__mobileLabel hero__mobileLabel--top"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.72, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
              >
                Product Designer
              </motion.span>
              <span className="hero__line">
                <motion.span
                  className="hero__aayush"
                  initial={{ y: "112%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.15, duration: 0.9, ease: EASE }}
                >
                  aayush
                </motion.span>
              </span>
              <span className="hero__line hero__line--visuals">
                <motion.span
                  className="hero__visuals"
                  initial={{ y: "112%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
                >
                  Visuals
                </motion.span>
              </span>
              <motion.span
                className="hero__mobileLabel hero__mobileLabel--bottom"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.72, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
              >
                Based in India
              </motion.span>
            </div>

            <motion.div
              className="hero__hint"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.6, ease: EASE }}
            >
              <DragIcon />
              <span>DRAG TO MOVE</span>
            </motion.div>

            <motion.div
              className="hero__pins"
              aria-hidden
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.3, type: "spring", stiffness: 220, damping: 20 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={framerAsset(
                  "https://framerusercontent.com/images/ekk0XlnOygglnIHWYDruVrstJNQ.png",
                  350
                )}
                alt=""
                draggable={false}
              />
            </motion.div>

            {CARDS.map((card, i) => (
              <ProjectCard key={card.src} card={card} index={i} tiltEnabled={tiltEnabled} />
            ))}
          </div>
        </section>
      </MotionConfig>
    </div>
  );
}
