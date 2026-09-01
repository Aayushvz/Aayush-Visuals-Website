"use client";

import { useEffect, useRef, useState } from "react";
import TornEdge from "./TornEdge";
import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionValueEvent,
  useInView,
} from "framer-motion";

/*
  Capabilities — the "skills deck". Six credit-card skill designs live
  inside a 3D holographic wallet. The pinned section (desktop AND mobile,
  pulled up 100vh under Process for the slide-away parallax) deals cards
  out of the wallet slot as you scroll — desktop into a symmetric
  constellation, mobile into a tidy 2x3 grid above the wallet. Every card
  is shown complete (exact 2150x1350 ratio, contained, never cropped).
  Tapping the wallet throws all remaining cards out; tapping again
  collects them; scrolling always regains control afterwards. On mobile
  the wallet shakes periodically while cards remain inside. Backdrop:
  cursor-reactive deep-space nebula, two-layer parallax starfield, and
  slow aurora curtains (no streaks, no glare).
*/

type Card = { slug: string; title: string };

const CARDS: Card[] = [
  { slug: "product-design", title: "Product Design" },
  { slug: "ui-ux-design", title: "UI/UX Design" },
  { slug: "design-systems", title: "Design Systems" },
  { slug: "brand-identity", title: "Brand Identity" },
  { slug: "creative-development", title: "Creative Development" },
  { slug: "motion-design", title: "Motion Design" },
];

/* desktop: symmetric 3+3 constellation around the centred wallet */
const SCATTER_DESKTOP = [
  { fx: -0.9, fy: -0.7, r: -5 },
  { fx: 0.9, fy: -0.7, r: 5 },
  { fx: -0.92, fy: 0.02, r: -4 },
  { fx: 0.92, fy: 0.02, r: 4 },
  { fx: -0.88, fy: 0.72, r: -4 },
  { fx: 0.88, fy: 0.72, r: 4 },
];

/* mobile: tidy 2x3 grid filling the area above the bottom wallet */
const SCATTER_MOBILE = [
  { fx: -0.72, fy: -1.0, r: -3 },
  { fx: 0.72, fy: -1.0, r: 3 },
  { fx: -0.72, fy: -0.44, r: 2 },
  { fx: 0.72, fy: -0.44, r: -2 },
  { fx: -0.72, fy: 0.12, r: -2 },
  { fx: 0.72, fy: 0.12, r: 3 },
];

/* tucked-in layout (option B): 4 cards fanned so their tops peek above the
   rim, 2 nested lower behind them. dx = fan spread, rz = tilt, peek = px the
   top rises above the wallet rim, z = stack order (centre cards forward). */
const CLOSED_SCALE = 0.92;
const CLOSED = [
  { dx: -1.5, rz: -9, peek: 42, z: 3 },
  { dx: -0.5, rz: -3, peek: 54, z: 5 },
  { dx: 0.5, rz: 3, peek: 54, z: 6 },
  { dx: 1.5, rz: 9, peek: 42, z: 4 },
  { dx: -0.32, rz: -2, peek: 18, z: 1 },
  { dx: 0.32, rz: 2, peek: 18, z: 2 },
];

/*
  Pin timeline.

  The section follows Statement in ordinary flow now - no pull-up, no panel
  sliding away on top - so its scroll span begins the moment the pane pins.

  Measured in scrolls, where one scroll is one viewport:

    1.0  dwell    closed wallet, the reader takes the scene in
     |   deal A   cards 1-3 out together
    1.0  gap      the first three are read
     |   deal B   cards 4-6 out together
    0.5  tail     all six held, then the section releases

  One scroll to the first three, one more to the next three, half a scroll
  held. Note the tail is measured from the deal's TRIGGER, and both deals
  fire on a spring with a stagger, so the cards keep settling for roughly
  half a second after it: the stillness you actually see at the end is a
  little under half a scroll.

  The three segments are given in vh rather than derived from a single
  `beat`, because they are no longer all the same length: the dwell and the
  tail are half a scroll each and the gap between the two deals is a full
  one. Change any of them and `total` must change with it.

  `total` must match `min-height` on `.capabilities--pinned` in globals.css
  (and the phone override in the max-width: 640px block). `pin` is the
  sticky pane's own 100vh, which useScroll's "end end" offset subtracts.
  total = pin + dwell + gap + tail.
*/
const TIMELINE_DESKTOP = { total: 350, pin: 100, dwell: 100, gap: 100, tail: 50 };
/* same rhythm, shorter strides - a swipe covers less ground than a wheel */
const TIMELINE_MOBILE = { total: 300, pin: 100, dwell: 80, gap: 80, tail: 40 };

type Timeline = typeof TIMELINE_DESKTOP;

/* the two scroll fractions where a group of three lands */
function dealPoints(t: Timeline) {
  const span = t.total - t.pin;
  return {
    a: t.dwell / span,
    b: (t.dwell + t.gap) / span,
    /* where a wallet click parks the scroll so the next real scroll input
       carries on from the right place: just past each trigger, so scrolling
       back the other way re-crosses it and reverses naturally */
    afterB: (t.dwell + t.gap + t.tail * 0.5) / span,
    beforeA: (t.dwell * 0.5) / span,
  };
}

function countRevealed(p: number, d: ReturnType<typeof dealPoints>) {
  if (p >= d.b) return CARDS.length;
  if (p >= d.a) return 3;
  return 0;
}

/*
  Each beat deals three cards in index order, and both scatters alternate
  sides by row (0 left, 1 right, 2 left...), so a beat zigzags across the
  wallet: left, right, left — then right, left, right. The cards arrive
  50ms apart (see the spring delay below), so the zigzag reads as a hand
  dealing across the scene rather than three cards appearing at once.
*/

/* deterministic starfield layers (no hydration mismatch) */
const FAR_STARS = [
  { l: 5, t: 14, s: 1.5, d: 0 }, { l: 13, t: 66, s: 1.5, d: 1.4 },
  { l: 21, t: 32, s: 2, d: 2.2 }, { l: 28, t: 84, s: 1.5, d: 0.7 },
  { l: 36, t: 9, s: 1.5, d: 1.9 }, { l: 45, t: 47, s: 2, d: 2.7 },
  { l: 52, t: 18, s: 1.5, d: 1 }, { l: 59, t: 76, s: 1.5, d: 1.6 },
  { l: 67, t: 30, s: 2, d: 2.4 }, { l: 74, t: 62, s: 1.5, d: 0.4 },
  { l: 82, t: 12, s: 1.5, d: 1.2 }, { l: 89, t: 42, s: 2, d: 2.9 },
  { l: 95, t: 78, s: 1.5, d: 0.8 }, { l: 9, t: 92, s: 1.5, d: 2 },
];

const NEAR_STARS = [
  { l: 16, t: 22, s: 3, d: 0.5 }, { l: 31, t: 71, s: 2.5, d: 1.8 },
  { l: 48, t: 12, s: 3, d: 2.6 }, { l: 64, t: 86, s: 2.5, d: 0.9 },
  { l: 77, t: 26, s: 3, d: 1.3 }, { l: 91, t: 58, s: 2.5, d: 2.1 },
  { l: 6, t: 52, s: 3, d: 1.6 }, { l: 55, t: 94, s: 2.5, d: 0.2 },
];

export default function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const topZ = useRef(50);
  const clickTimer = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const walletBodyRef = useRef<HTMLSpanElement>(null);
  const [desktop, setDesktop] = useState(true);
  /* scrollRevealed is the single source of truth for how many cards are
     out — always a live function of scrollYProgress (see the
     useMotionValueEvent below), in BOTH scroll directions. There is no
     separate "override" state that shadows it: the wallet click doesn't
     fake a different visual state, it moves the *actual* scroll position
     to where the deal would finish, and this same handler picks that up
     like any other scroll. That's what makes it reversible for free —
     scrolling back up naturally decreases scrollRevealed again. */
  const [scrollRevealed, setScrollRevealed] = useState(0);
  /* purely cosmetic: which direction the wallet was just clicked, so the
     cards' stagger delay (below) can tell a click-triggered reveal from a
     scroll-driven one. Auto-clears; never gates what revealed count is. */
  const [clickDirection, setClickDirection] = useState<null | "all" | "none">(null);
  /* walletTop: the wallet body's top edge relative to the canvas centre;
     cardH: a card's untransformed height — both drive the tucked-in peeks */
  const [half, setHalf] = useState({ w: 450, h: 260, walletTop: 0, cardH: 0 });

  const pinned = !reduce;
  /* The aurora blobs are four viewport-sized layers under a 105px blur,
     animating scale — every frame re-rasterizes that blur. framer drives
     them from JS, so the CSS `.anim-idle` pause can't reach them; this
     stops them outright whenever the section is away from the viewport. */
  const inView = useInView(sectionRef, { margin: "300px 0px" });

  /* cursor-reactive nebula + starfield parallax (motion values — no
     re-render per mousemove) */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 42, damping: 18, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 42, damping: 18, mass: 0.6 });
  const nebulaX = useTransform(smx, (v) => v * 42);
  const nebulaY = useTransform(smy, (v) => v * 30);
  const nearX = useTransform(smx, (v) => v * -26);
  const nearY = useTransform(smy, (v) => v * -18);
  const farX = useTransform(smx, (v) => v * -11);
  const farY = useTransform(smy, (v) => v * -8);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 641px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!pinned) setScrollRevealed(CARDS.length);
  }, [pinned]);

  useEffect(() => {
    return () => {
      if (clickTimer.current) window.clearTimeout(clickTimer.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      const cw = Math.min(122, r.width * 0.12);
      const ch = Math.min(78, r.height * 0.12);
      const body = walletBodyRef.current;
      const card = canvas.querySelector<HTMLElement>(".capCard");
      const walletTop = body
        ? body.getBoundingClientRect().top - (r.top + r.height / 2)
        : 0;
      setHalf({
        w: Math.max(60, r.width / 2 - cw - 14),
        h: Math.max(80, r.height / 2 - ch - 14),
        walletTop,
        cardH: card ? card.offsetHeight : 0,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [desktop]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const deal = dealPoints(desktop ? TIMELINE_DESKTOP : TIMELINE_MOBILE);
  // single, always-on, bidirectional mapping from scroll progress to reveal
  // count — no gating, no "already done" flag. Scrolling up naturally
  // decreases n again, which is exactly the reverse/collect animation.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    const n = countRevealed(p, deal);
    setScrollRevealed((prev) => (prev === n ? prev : n));
  });

  const revealed = scrollRevealed;
  const allOut = revealed === CARDS.length;

  const onWalletClick = () => {
    if (!pinned) return;
    const sectionEl = sectionRef.current;
    const revealing = !allOut;

    // cosmetic stagger flag for the transition below, auto-clears once the
    // click-triggered spring has had time to settle
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
    setClickDirection(revealing ? "all" : "none");
    clickTimer.current = window.setTimeout(() => setClickDirection(null), 900);

    // instant visual feedback — matches exactly what the scroll-position
    // sync below will settle on, so there's nothing to reconcile later
    setScrollRevealed(revealing ? CARDS.length : 0);

    // sync the *actual* scroll position to where this reveal state would
    // naturally live on the timeline. Because the section is pinned, this
    // is visually seamless (the same pinned canvas fills the viewport
    // either way) — but it means the next real scroll input picks up
    // exactly where the click left off, in either direction, instead of
    // crossing several viewports of "dead" pre-deal scroll distance.
    if (!sectionEl) return;
    const rect = sectionEl.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const range = sectionEl.offsetHeight - window.innerHeight;
    if (range <= 0) return;
    const targetP = revealing ? Math.min(1, deal.afterB) : Math.max(0, deal.beforeA);
    window.scrollTo({ top: top + targetP * range, behavior: "instant" });
  };

  /* wallet idle motion: desktop floats; mobile shakes for attention while
     cards remain inside, floats once everything is out */
  const liftAnimate = reduce
    ? undefined
    : !desktop && !allOut
      ? { y: [0, -6, 0], rotate: [0, -2.4, 2.4, -2.4, 2.4, 0] }
      : { y: [0, -6, 0], rotate: 0 };
  const liftTransition =
    !desktop && !allOut
      ? { duration: 0.6, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" as const }
      : { duration: 6, repeat: Infinity, ease: "easeInOut" as const };

  const wallet = (
    <div
      className="wallet"
      role="button"
      tabIndex={0}
      aria-label={allOut ? "Collect the skill cards" : "Reveal the skill cards"}
      onClick={onWalletClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onWalletClick();
        }
      }}
    >
      <motion.span className="wallet__lift" animate={liftAnimate} transition={liftTransition}>
        <span className="wallet__body" ref={walletBodyRef}>
          <span className="wallet__slot" aria-hidden />
          <span className="wallet__pocket" aria-hidden>
            <span className="wallet__emboss" aria-hidden>
              aayush<sup>vz</sup> · skills
            </span>
            <span className="wallet__chip" aria-hidden />
            <span className="wallet__dot" aria-hidden />
          </span>
          <span className="wallet__edge" aria-hidden />
        </span>
      </motion.span>
      <span className="wallet__shadow" aria-hidden />
      <span className="wallet__count">
        {String(Math.min(revealed, CARDS.length)).padStart(2, "0")} / 06
      </span>
    </div>
  );

  const scatter = desktop ? SCATTER_DESKTOP : SCATTER_MOBILE;

  return (
    <section
      className={`capabilities${pinned ? " capabilities--pinned" : ""}`}
      id="capabilities"
      ref={sectionRef}
    >
      {/* Skills follows the cream Process panel now, so the tear carries
          cream down into this dark one. No dot grid: that texture is
          light-on-dark and there is no dark fill here to carry. */}
      <TornEdge fill="var(--cream)" />

      {/* Side rails, hoisted OUT of the sticky pane. Inside it they were
          trapped in its stacking context and the torn edge painted straight
          over them, breaking the line at the seam; out here they outrank the
          tear and run unbroken through it. One set, not two aligned ones -
          doubling a 1px line at 0.38 just makes that stretch brighter. */}
      <div className="capRails" aria-hidden>
        <span className="capRail capRail--left" />
        <span className="capRail capRail--right" />
      </div>

      <div
        className="capabilities__pin"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
          my.set(((e.clientY - r.top) / r.height) * 2 - 1);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
      >
        {/* ---- deep-space backdrop: nebula + aurora curtains + starfield ---- */}
        <div className="capAurora" aria-hidden>
          <motion.div className="capNebula" style={reduce ? undefined : { x: nebulaX, y: nebulaY }}>
            {[
              { c: "capAuroraBlob--a", x: [0, 70, -50, 0], y: [0, -55, 40, 0], s: [1, 1.16, 0.95, 1], dur: 26 },
              { c: "capAuroraBlob--b", x: [0, -60, 50, 0], y: [0, 45, -60, 0], s: [1, 0.92, 1.18, 1], dur: 31 },
              { c: "capAuroraBlob--c", x: [0, 55, -70, 0], y: [0, -40, 30, 0], s: [1, 1.22, 1, 1], dur: 23 },
              { c: "capAuroraBlob--d", x: [0, -50, 40, 0], y: [0, 60, -35, 0], s: [1, 1.12, 0.94, 1], dur: 35 },
            ].map((b, i) => (
              <motion.span
                key={i}
                className={`capAuroraBlob ${b.c}`}
                animate={reduce || !inView ? undefined : { x: b.x, y: b.y, scale: b.s }}
                transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </motion.div>

          {/* aurora borealis curtains — slow wavering light bands */}
          {!reduce && (
            <>
              <span className="capCurtain capCurtain--a" />
              <span className="capCurtain capCurtain--b" />
            </>
          )}

          <motion.div className="capStars capStars--far" style={reduce ? undefined : { x: farX, y: farY }}>
            {FAR_STARS.map((st, i) => (
              <span
                key={i}
                className="capStar"
                style={{ left: `${st.l}%`, top: `${st.t}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }}
              />
            ))}
          </motion.div>
          <motion.div className="capStars capStars--near" style={reduce ? undefined : { x: nearX, y: nearY }}>
            {NEAR_STARS.map((st, i) => (
              <span
                key={i}
                className="capStar capStar--near"
                style={{ left: `${st.l}%`, top: `${st.t}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }}
              />
            ))}
          </motion.div>
        </div>



        <div className="capabilities__canvas" ref={canvasRef}>
          {wallet}
          {CARDS.map((card, i) => {
            const open = i < revealed;
            const s = scatter[i];
            const c = CLOSED[i];
            /* closed: real cards tucked into the tilted sleeve — 4 fanned so
               their tops peek above the rim, 2 nested lower behind them. Each
               card reads top→bottom as crisp top (above rim) → colour dimmed
               through the frosted upper pocket → hidden behind the lower
               pocket. rotateX matches the wallet's 3D tilt so they sit in it. */
            const target = open
              ? { x: s.fx * half.w, y: s.fy * half.h, rotate: s.r, rotateX: 0, scale: 1 }
              : half.cardH > 0
                ? {
                    x: c.dx * 40,
                    y: half.walletTop - c.peek + (half.cardH * CLOSED_SCALE) / 2,
                    rotate: c.rz,
                    rotateX: 11,
                    scale: CLOSED_SCALE,
                  }
                : { x: c.dx * 30, y: 24, rotate: c.rz, rotateX: 0, scale: 0.7 };
            return (
              <motion.article
                key={card.slug}
                className="capCard"
                style={{ zIndex: open ? 40 + i : c.z }}
                animate={target}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        stiffness: 230,
                        damping: 26,
                        mass: 0.9,
                        /* A click throws all six, so it staggers across all
                           six. A scroll beat deals three, so it staggers
                           within the group only (0 / 50 / 100ms) — enough
                           that they zigzag left-right-left instead of
                           teleporting in together, short enough that the
                           three still read as one gesture. */
                        delay:
                          clickDirection === "all" ? i * 0.06 : (i % 3) * 0.05,
                      }
                }
                /*
                  Handling the card is a desktop-only affordance.

                  A mouse has a spare gesture; a thumb does not. Six dealt
                  cards cover most of the pinned canvas on a phone, and the
                  section is driven entirely by scroll — so a drag there is
                  competing with the one input the section runs on, and
                  winning, because the deck sits between the thumb and the
                  page. (`.capCard` also carries `touch-action: none`, undone
                  for phones in the max-width: 640px block.)

                  whileHover and the z-lift go with it rather than being left
                  behind as orphans: hover on touch fires from a tap and has
                  nothing to fire on release, so it strands a card at 1.06,
                  and re-stacking the deck on tap is only meaningful when
                  something is about to be pulled out of it.
                */
                drag={desktop && open && !reduce}
                dragConstraints={canvasRef}
                dragElastic={0.12}
                dragMomentum
                whileHover={desktop && open ? { scale: 1.06 } : undefined}
                onPointerDown={
                  desktop
                    ? (e) => {
                        /* lift the grabbed card above its siblings, but never
                           above the wallet (z 100) — cap below it so it tucks
                           behind */
                        (e.currentTarget as HTMLElement).style.zIndex = String(
                          Math.min(90, ++topZ.current)
                        );
                      }
                    : undefined
                }
              >
                <img
                  className="capCard__img"
                  src={`/skills/${card.slug}.webp`}
                  alt={card.title}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </motion.article>
            );
          })}
        </div>

        {/* footer */}
        <div className="capabilities__footer">
          <h2 className="capabilities__footerTitle">Skills</h2>
          <p className="capabilities__footerSub">
            {!pinned
              ? "The disciplines I carry"
              : desktop
                ? "Scroll to deal · tap the wallet to collect"
                : allOut
                  ? "Tap the wallet to collect"
                  : "Tap the wallet to reveal skills"}
          </p>
        </div>
      </div>
    </section>
  );
}
