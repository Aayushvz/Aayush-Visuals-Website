"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lockScroll } from "@/lib/scrollLock";

/*
  Full-screen entrance preloader, mounted once in the root layout so it runs
  on every fresh document load and never on in-app navigation.

  A giant "aayush" rises from the bottom edge, then the role pills drop from
  above and land on the tops of the letters and on each other. Nothing here
  is a physics engine: each pill's resting place is solved once from the real
  glyph outlines (a height map built from canvas text metrics), its fall is
  simulated once with gravity and a lossy bounce, and the result is played as
  a WAAPI keyframe track, so the motion runs on the compositor while the page
  underneath is still busy hydrating.
*/

type Role = {
  label: string;
  /* landing point across the wordmark, 0 = left edge, 1 = right edge */
  x: number;
  /* resting angle, degrees clockwise */
  rot: number;
  /* dropped on narrow screens, where eight pills bury a small wordmark */
  wide?: boolean;
  /* a phone's own landing spot: its pills are wide against a small word,
     so the desktop spots stack them into a staircase instead of a pile */
  nx?: number;
  nrot?: number;
};

/* fall order: the ones that land on letters first, the stackers after */
const ROLES: Role[] = [
  { label: "Product Designer", x: 0.13, rot: -7, nx: 0.27, nrot: -5 },
  { label: "UI/UX", x: 0.34, rot: 9, nx: 0.93, nrot: -12 },
  { label: "Dashboard Design", x: 0.52, rot: -21, nx: 0.66, nrot: 7 },
  { label: "Design Systems", x: 0.7, rot: 13, wide: true },
  { label: "Brand Identity", x: 0.88, rot: -31, nx: 0.7, nrot: -13 },
  { label: "Interaction Design", x: 0.24, rot: 176, wide: true },
  { label: "Design Engineer", x: 0.62, rot: -5, nx: 0.34, nrot: 176 },
  { label: "Motion Design", x: 0.43, rot: 11, wide: true },
];

/* matches the stylesheet's phone breakpoint */
const NARROW = "(max-width: 640px)";

const WORD = "aayush";

/* timing, ms */
const WORD_RISE = 900;
const FIRST_DROP = 520;
const DROP_STAGGER = 105;
const HOLD_AFTER_SETTLE = 480;
const EXIT = 850;
const REDUCED_HOLD = 900;
const REDUCED_FADE = 300;

/* the strong ease-out and the site's own in-out */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_INOUT = "cubic-bezier(0.76, 0, 0.24, 1)";

/* Routes that own their own opening; see the /cricket note in globals.css */
const SILENT_ROUTES = ["/cricket"];

const COL = 3; // height-map column width, px

/*
  A pill is a capsule: a segment of length len with radius r, rotated by a.
  bottom(dx) / top(dx) give the lowest / highest point of its outline at a
  horizontal offset dx from its centre, or null where it has no outline.
*/
function capsuleProfile(w: number, h: number, deg: number) {
  const r = h / 2;
  const len = Math.max(0, w - h);
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const steps = 24;
  const reach = (len / 2) * Math.abs(ca) + r;
  const probe = (dx: number, dir: 1 | -1): number | null => {
    let best: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = -len / 2 + (len * i) / steps;
      const px = t * ca;
      const d = dx - px;
      if (Math.abs(d) > r) continue;
      const y = t * sa + dir * Math.sqrt(r * r - d * d);
      if (best === null || (dir === 1 ? y > best : y < best)) best = y;
    }
    return best;
  };
  return {
    reach,
    bottom: (dx: number) => probe(dx, 1),
    top: (dx: number) => probe(dx, -1),
  };
}

/* one fall: gravity, a lossy bounce or two, sampled at 60fps */
function simulateFall(fromY: number, toY: number, vh: number) {
  const g = 2.8 * vh; // px/s^2, scaled to the screen so every size feels alike
  const restitution = 0.38;
  const dt = 1 / 60;
  const ys: number[] = [];
  let y = fromY;
  let v = 0;
  let impactAt = -1;
  for (let i = 0; i < 240; i++) {
    ys.push(y);
    v += g * dt;
    y += v * dt;
    if (y >= toY) {
      y = toY;
      if (impactAt < 0) impactAt = ys.length;
      v = -v * restitution;
      if (Math.abs(v) < 0.09 * vh) {
        ys.push(toY);
        break;
      }
    }
  }
  return { ys, impactAt };
}

export default function Preloader() {
  const pathname = usePathname();
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /* frozen at mount: this belongs to the document load, not the route */
  const [silent] = useState(() =>
    SILENT_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`)),
  );

  useEffect(() => {
    if (silent) return;
    const root = rootRef.current;
    const word = wordRef.current;
    const base = baseRef.current;
    if (!root || !word || !base) return;

    const unlockScroll = lockScroll();
    const timers: number[] = [];
    const anims: Animation[] = [];
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      unlockScroll();
      setDone(true);
      /* anything timed from the moment the site becomes usable (the recent
         project popup on the homepage) listens for this */
      (window as Window & { __preloaderDone?: boolean }).__preloaderDone = true;
      window.dispatchEvent(new Event("preloader:done"));
    };
    /* the site must never stay locked behind this overlay */
    timers.push(window.setTimeout(finish, 7000));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      const vw = window.innerWidth;
      /* floored: gravity scales with this, and a zero-height frame would
         leave every pill hanging in the air until the failsafe */
      const vh = Math.max(window.innerHeight, 400);
      const rootBox = root.getBoundingClientRect();
      const baseline = base.getBoundingClientRect().top - rootBox.top;

      /* the letters' tops, from real glyph metrics in the loaded face */
      const ctx = document.createElement("canvas").getContext("2d");
      const cols = Math.ceil(vw / COL) + 1;
      const surface = new Float64Array(cols).fill(Infinity);
      if (ctx) {
        const cs = getComputedStyle(word);
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        word.querySelectorAll<HTMLSpanElement>(".ldr__char").forEach((span) => {
          const m = ctx.measureText(span.textContent ?? "");
          const left = span.getBoundingClientRect().left - rootBox.left;
          const inkL = left - m.actualBoundingBoxLeft;
          const inkR = left + m.actualBoundingBoxRight;
          const top = baseline - m.actualBoundingBoxAscent;
          /* round shoulders: pills settle a touch into a bowl's curve */
          const inset = (inkR - inkL) * 0.07;
          for (let x = inkL + inset; x <= inkR - inset; x += COL) {
            const c = Math.round(x / COL);
            if (c >= 0 && c < cols) surface[c] = Math.min(surface[c], top);
          }
        });
      }
      /* anywhere without a letter, the floor is the bottom of the screen */
      for (let c = 0; c < cols; c++) if (!isFinite(surface[c])) surface[c] = vh;

      const wordBox = word.getBoundingClientRect();
      const span = {
        left: wordBox.left - rootBox.left,
        width: wordBox.width,
      };

      let lastSettle = 0;
      const pills = pillRefs.current;
      const narrow = window.matchMedia(NARROW).matches;
      ROLES.forEach((role, i) => {
        const el = pills[i];
        if (!el || el.offsetParent === null) return; // hidden on this width
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const rot = narrow ? (role.nrot ?? role.rot) : role.rot;
        const fx = narrow ? (role.nx ?? role.x) : role.x;
        const prof = capsuleProfile(w, h, rot);
        /* never let a pill hang off the screen edge */
        const edge = 12 + prof.reach;
        const cx = Math.min(vw - edge, Math.max(edge, span.left + span.width * fx));

        /* rest where the capsule's underside first touches anything */
        let restY = Infinity;
        const c0 = Math.floor((cx - prof.reach) / COL);
        const c1 = Math.ceil((cx + prof.reach) / COL);
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || c >= cols) continue;
          const b = prof.bottom(c * COL - cx);
          if (b === null) continue;
          restY = Math.min(restY, surface[c] - b);
        }
        if (!isFinite(restY)) restY = vh - h;
        /* it becomes part of the floor for the pills that follow */
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || c >= cols) continue;
          const t = prof.top(c * COL - cx);
          if (t !== null) surface[c] = Math.min(surface[c], restY + t);
        }

        const delay = FIRST_DROP + i * DROP_STAGGER;
        const place = (x: number, y: number, a: number) =>
          `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${a.toFixed(2)}deg)`;

        if (reduced) {
          el.style.transform = place(cx, restY, rot);
          return;
        }

        /* seeded per pill so every load looks the same */
        const seed = Math.sin((i + 1) * 12.9898) * 43758.5453;
        const rnd = seed - Math.floor(seed);
        const fromY = -h - 40 - rnd * vh * 0.25;
        const drift = (rnd - 0.5) * 60;
        const spin = (i % 2 ? 1 : -1) * (35 + rnd * 45);
        const { ys, impactAt } = simulateFall(fromY, restY, vh);
        const n = ys.length - 1;
        const frames = ys.map((y, k) => {
          const pre = Math.min(1, k / Math.max(1, impactAt));
          const post = impactAt > 0 && k > impactAt ? (k - impactAt) / 60 : 0;
          /* spin eases out into the landing, then a small damped rock */
          const ease = 1 - Math.pow(1 - pre, 3);
          const rock = post > 0 ? Math.sign(spin) * 7 * Math.exp(-6 * post) * Math.cos(20 * post) : 0;
          const a = rot + spin * (1 - ease) + rock;
          const x = cx + drift * (1 - ease);
          return { transform: place(x, y, a), offset: k / n };
        });
        const duration = (n / 60) * 1000;
        const anim = el.animate(frames, {
          duration,
          delay,
          fill: "both",
          easing: "linear",
        });
        anims.push(anim);
        lastSettle = Math.max(lastSettle, delay + duration);
      });

      if (reduced) {
        root.classList.add("ldr--static");
        timers.push(
          window.setTimeout(() => root.classList.add("ldr--fade"), REDUCED_HOLD),
          window.setTimeout(finish, REDUCED_HOLD + REDUCED_FADE),
        );
        if (countRef.current) countRef.current.textContent = "100";
        return;
      }

      anims.push(
        word.animate(
          [
            { transform: "translateY(55%)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: WORD_RISE, easing: EASE_OUT, fill: "both" },
        ),
      );

      /* the counter tracks the whole sequence, and lands on 100 as the last
         pill does */
      const start = performance.now();
      const total = Math.max(lastSettle, WORD_RISE);
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / total);
        if (countRef.current) countRef.current.textContent = String(Math.round(p * 100));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      timers.push(
        window.setTimeout(() => {
          const out = root.animate(
            [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
            { duration: EXIT, easing: EASE_INOUT, fill: "forwards" },
          );
          out.onfinish = finish;
          /* a background tab can stall the animation clock; the timer can't be */
          timers.push(window.setTimeout(finish, EXIT + 60));
        }, total + HOLD_AFTER_SETTLE),
      );
    };

    /* measure only once the real face is in: fallback metrics would land
       every pill at the wrong height */
    let started = false;
    const go = () => {
      if (started || finished) return;
      started = true;
      run();
    };
    /* fonts.ready alone can resolve before a face that is not yet in use has
       even started loading, so ask for the two faces this screen measures */
    const face = (el: Element) => {
      const cs = getComputedStyle(el);
      return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    };
    const firstPill = pillRefs.current.find(Boolean);
    Promise.all([
      document.fonts.load(face(word), WORD),
      firstPill ? document.fonts.load(face(firstPill), "Product Designer") : null,
    ])
      .then(() => document.fonts.ready)
      .then(go, go);
    timers.push(window.setTimeout(go, 1200));

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      unlockScroll();
    };
  }, [silent]);

  if (silent || done) return null;

  return (
    <div ref={rootRef} className="preloader ldr" aria-hidden role="presentation">
      <div className="ldr__top">
        <span>&copy;2026 Aayush Visuals</span>
        <span className="ldr__count">
          Loading <span ref={countRef}>0</span>%
        </span>
      </div>

      <div ref={wordRef} className="ldr__word">
        {WORD.split("").map((ch, i) => (
          <span className="ldr__char" key={i}>
            {ch}
          </span>
        ))}
        {/* a zero-height inline box sits on the baseline, which is the one
            line of the wordmark the DOM will not measure for us */}
        <span ref={baseRef} className="ldr__base" />
      </div>

      {ROLES.map((role, i) => (
        <span
          key={role.label}
          ref={(el) => {
            pillRefs.current[i] = el;
          }}
          className={`ldr__pill${role.wide ? " ldr__pill--wide" : ""}`}
        >
          {role.label}
        </span>
      ))}
    </div>
  );
}
