"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXPERIMENTS, type Preview } from "../experiments";
import { ENTRIES, type SphereEntry } from "./entries";
import { BrowserShot, DEMOS, Reel } from "./demos";
import "../covers.css";
import "./sphere.css";

/*
  /playground - a ball of experiments, after guillaumezhu.com/playground.

  The previews sit on the OUTSIDE of a sphere, each card facing outward
  along its normal, and the viewer looks at the ball from the front. The
  card nearest the viewer is the featured one; its neighbours fall away
  around the curve, and the far side is hidden by backface culling.

  Input:
    drag   - hold and drag (mouse, pen or touch) to spin the ball freely;
             let go with speed and it keeps turning, then slows.
    wheel  - spins it too (vertical and horizontal deltas).
    keys   - arrow keys step to the next card on that side.
    click  - the front card opens its experiment; any other card is
             turned to the front.
    rest   - once it slows, the nearest card glides dead centre and its
             caption (title, then "kind · year") fades in under it.

  Maths: orientation is one 3x3 rotation matrix in CSS coordinates (y down,
  z toward the viewer). Drag premultiplies small screen-space rotations;
  the snap rotates the front card's world normal onto +z a fraction per
  frame. The stage gets the matrix as matrix3d; each card's own transform
  (rotateY(lon) rotateX(lat) translateZ(R)) only changes during the intro.

  Proportions measured off the reference: card 4:3, sphere radius 2.65
  card widths, stage pushed back 0.522 R, perspective 2.8 viewport widths.

  Cards tile the whole ball (see SLOTS below), entries repeating so every
  view is full; the featured one sits in front. Cards are either an animated demo (./demos) or the
  live product in a browser window (BrowserShot: a real recording or a real
  capture). Loops and videos only run on cards turned toward the viewer
  (.is-live).
*/

type M3 = number[]; // row-major 3x3
type V3 = [number, number, number];

/*
  The ball is tiled all the way round, so whichever way it is turned the
  view is full of cards - no empty band, no bare poles. SLOTS points are
  spread evenly over the sphere (a Fibonacci lattice, at least ~35deg
  apart, more than a card's ~22deg angular width, so nothing overlaps), with the first
  one dead ahead for the featured card. Entries repeat to fill them: each
  slot, nearest the front first, takes the entry whose other copies are
  FARTHEST from it, so twins are never neighbours and the view at rest
  holds as many different projects as fit.
*/
const FEATURED_ID = "invoice";
const SLOTS = 26;
const START = 0;

const mul = (a: M3, b: M3): M3 => {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
};
const apply = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/* Rodrigues; matches CSS rotate3d in CSS coordinates */
const rot = (u: V3, a: number): M3 => {
  const l = Math.hypot(u[0], u[1], u[2]) || 1;
  const [x, y, z] = [u[0] / l, u[1] / l, u[2] / l];
  const c = Math.cos(a),
    s = Math.sin(a),
    t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
};
const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/* re-orthonormalise so thousands of small multiplies do not drift */
const clean = (m: M3): M3 => {
  let a: V3 = [m[0], m[3], m[6]];
  let b: V3 = [m[1], m[4], m[7]];
  const la = Math.hypot(...a);
  a = [a[0] / la, a[1] / la, a[2] / la];
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  b = [b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]];
  const lb = Math.hypot(...b);
  b = [b[0] / lb, b[1] / lb, b[2] / lb];
  const c: V3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]];
};
const css = (m: M3) =>
  `matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`;

const T = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
/* the card's own frame on the sphere: rotateY(lon) then rotateX(lat) */
const frameOf = (lon: number, lat: number): M3 => mul(rot([0, 1, 0], lon), rot([1, 0, 0], lat));
/* the orientation that shows a card face-on AND upright: M . C = I */
const uprightFor = (c: { lon: number; lat: number }): M3 => T(frameOf(c.lon, c.lat));
/* move m a fraction k of the way to target along the shortest rotation */
const toward = (m: M3, target: M3, k: number): [M3, number] => {
  const d = mul(target, T(m));
  const cos = Math.max(-1, Math.min(1, (d[0] + d[4] + d[8] - 1) / 2));
  const ang = Math.acos(cos);
  if (ang < 1e-4) return [target, 0];
  const axis: V3 = [d[7] - d[5], d[2] - d[6], d[3] - d[1]];
  if (Math.hypot(...axis) < 1e-9) return [target, 0];
  return [mul(rot(axis, ang * k), m), ang];
};

type Card = { entry: SphereEntry; home: number; preview: Preview; n: V3; lon: number; lat: number };

function buildCards(): Card[] {
  const order = [...ENTRIES].sort((a, b) => Number(b.id === FEATURED_ID) - Number(a.id === FEATURED_ID));
  /* Fibonacci lattice about +z (CSS coordinates: +z toward the viewer, +y
     DOWN), the half-step variant (pinning points ON the poles squeezes
     them to 18deg), then turned so point 0 sits exactly at +z, the front */
  const golden = Math.PI * (3 - Math.sqrt(5));
  const raw: V3[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const z = 1 - (2 * i + 1) / SLOTS;
    const r = Math.sqrt(1 - z * z);
    raw.push([r * Math.cos(i * golden), r * Math.sin(i * golden), z]);
  }
  const p0 = raw[0];
  /* axis p0 x z: turns p0 onto +z (checked numerically against rot()) */
  const toFront = rot([p0[1], -p0[0], 0], Math.acos(p0[2]));
  const pts = raw.map((v) => apply(toFront, v));
  pts[0] = [0, 0, 1];
  /* fill nearest-the-front first: the featured entry at the front, then
     each slot takes the entry whose nearest existing copy is farthest
     away (ties: the entry used least, then list order) */
  const copies: V3[][] = order.map(() => []);
  const homes: number[] = [];
  pts.forEach((n, i) => {
    let pick = 0;
    if (i > 0) {
      let bestD = -Infinity,
        bestUses = Infinity;
      order.forEach((_, h) => {
        const near = copies[h].reduce((m, c) => Math.min(m, Math.acos(Math.max(-1, Math.min(1, c[0] * n[0] + c[1] * n[1] + c[2] * n[2])))), Math.PI * 2);
        const uses = copies[h].length;
        if (near > bestD + 1e-6 || (Math.abs(near - bestD) <= 1e-6 && uses < bestUses)) {
          bestD = near;
          bestUses = uses;
          pick = h;
        }
      });
    }
    copies[pick].push(n);
    homes.push(pick);
  });
  return pts.map((n, i) => ({
    entry: order[homes[i]],
    home: homes[i],
    preview: order[homes[i]].preview,
    n,
    lon: Math.atan2(n[0], n[2]),
    lat: Math.asin(-n[1]),
  }));
}

/* the reference's --card-width breakpoints (phone a little larger) */
function cardWidth(vw: number, vh: number) {
  const c = (a: number, v: number, b: number) => Math.min(Math.max(v, a), b);
  if (vw <= 500) return c(150, vw * 0.44, 200);
  if (vw <= 1400 && vh <= 360) return c(185, vh * 0.62, 250);
  if (vw >= 1024 && vw <= 1400) return c(307, vw * 0.0872 + 218, 340);
  if (vw <= 1400) return c(260, vw * 0.3, 380);
  return c(340, vw * 0.2, 440);
}

function Media({ preview, entry }: { preview: Preview; entry: SphereEntry }) {
  if (preview.type === "reel")
    return (
      <span className="pgs-card__visual">
        <Reel images={preview.images} accent={entry.accent} />
      </span>
    );
  if (preview.type === "browser")
    return (
      <span className="pgs-card__visual">
        <BrowserShot
          url={preview.url}
          video={preview.video}
          poster={preview.poster}
          image={preview.image}
          aspect={preview.aspect}
          accent={entry.accent}
        />
      </span>
    );
  if (preview.type === "video")
    return (
      <video
        className="pgs-card__visual"
        src={preview.src}
        poster={preview.poster}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-hidden
      />
    );
  if (preview.type === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pgs-card__visual" src={preview.src} alt="" draggable={false} decoding="async" />;
  const Demo = preview.type === "demo" ? DEMOS[entry.id] : undefined;
  if (Demo)
    return (
      <span className="pgs-card__visual">
        <Demo />
      </span>
    );
  const Cover = EXPERIMENTS.find((e) => e.id === entry.id)?.cover;
  if (!Cover) return null;
  return (
    <span className="pgs-card__visual pgs-cover">
      <span className="pgs-cover__plate">
        <Cover />
      </span>
    </span>
  );
}

export default function PlaygroundSphere() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLAnchorElement | null)[]>([]);
  const cards = useMemo(buildCards, []);
  const [front, setFront] = useState(START);
  const [settled, setSettled] = useState(false);

  const s = useRef({
    m: I3 as M3,
    vx: 0, // angular velocity about screen Y, rad per frame
    vy: 0, // about screen X
    dragging: false,
    moved: 0,
    target: -1, // card being turned to, or -1 = nearest
    front: START,
    settled: false,
    spread: 0.16,
    tSpread: 0.16,
    scale: 0.9,
    R: 900,
    raf: 0,
    reduce: false,
  });
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const el = root.current,
      st = stage.current;
    if (!el || !st) return;
    const S = s.current;
    S.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    S.m = uprightFor(cards[START]);

    const layout = () => {
      const vw = window.innerWidth,
        vh = window.innerHeight;
      const W = cardWidth(vw, vh);
      S.R = W * 2.65;
      const P = vw * 2.8;
      el.style.setProperty("--cw", `${W}px`);
      el.style.setProperty("--P", `${P}px`);
      /* the front card's on-screen scale, so the caption sits under it */
      el.style.setProperty("--front-scale", String(P / (P - S.R * (1 - 0.522))));
      kick.current();
    };

    const frame = () => {
      S.raf = 0;
      let busy = false;

      /* coast after a throw or a wheel flick */
      if (!S.dragging && (Math.abs(S.vx) > 1e-5 || Math.abs(S.vy) > 1e-5)) {
        S.m = mul(mul(rot([0, 1, 0], S.vx), rot([1, 0, 0], -S.vy)), S.m);
        const f = S.reduce ? 0 : 0.935;
        S.vx *= f;
        S.vy *= f;
        busy = true;
      }

      let best = -2,
        bi = 0;
      const world: V3[] = cards.map((c, i) => {
        const w = apply(S.m, c.n);
        if (w[2] > best) {
          best = w[2];
          bi = i;
        }
        return w;
      });

      /* snap: once nearly still, glide the chosen card onto the front */
      let snapLeft = Infinity;
      if (!S.dragging && Math.abs(S.vx) < 0.004 && Math.abs(S.vy) < 0.004) {
        const idx = S.target >= 0 ? S.target : bi;
        const [next, left] = toward(S.m, uprightFor(cards[idx]), S.reduce ? 1 : S.target >= 0 ? 0.11 : 0.09);
        snapLeft = left;
        S.m = next;
        if (left > 0.0006) busy = true;
        else S.target = -1;
      }
      S.m = clean(S.m);

      /* intro: the ball inflates from a cluster */
      S.spread += (S.tSpread - S.spread) * (S.reduce ? 1 : 0.055);
      S.scale += ((S.tSpread >= 1 ? 1 : 0.9) - S.scale) * (S.reduce ? 1 : 0.055);
      if (Math.abs(S.tSpread - S.spread) > 0.0005) busy = true;

      st.style.transform = `translate3d(0,0,${(-S.R * 0.522).toFixed(2)}px) scale(${S.scale.toFixed(4)}) ${css(S.m)}`;
      cards.forEach((c, i) => {
        const node = cardEls.current[i];
        if (!node) return;
        node.style.transform = `rotateY(${c.lon}rad) rotateX(${c.lat}rad) translateZ(${(S.R * S.spread).toFixed(2)}px)`;
        const z = world[i][2];
        /* fade toward the rim so cards never read as slivers edge-on */
        node.style.opacity = String(Math.max(0, Math.min(1, (z + 0.05) / 0.35)) * Math.min(1, S.spread * 1.3));
        node.style.visibility = z < -0.08 ? "hidden" : "visible";
        const live = z > 0.5;
        node.classList.toggle("is-live", live);
        /* recordings only decode while their card faces the viewer */
        const vid = node.querySelector("video");
        if (vid) {
          if (live && vid.paused) vid.play().catch(() => {});
          else if (!live && !vid.paused) vid.pause();
        }
      });

      if (bi !== S.front) {
        S.front = bi;
        /* a card arriving at the front plays its recording from the top, so
           a story (DPL: start screen, team pick, play) always reads in order */
        const fv = cardEls.current[bi]?.querySelector("video");
        if (fv) {
          fv.currentTime = 0;
          fv.play().catch(() => {});
        }
        setFront(bi);
      }
      /* the caption (and click-to-open) don't wait for the motion's long
         exponential tails - the coast, the snap and the intro inflate all
         creep on for a second or two - only for the snap to have the card
         nearly upright, about 2 degrees out */
      const now = !S.dragging && S.spread > 0.9 && (!busy || snapLeft < 0.035);
      if (now !== S.settled) {
        S.settled = now;
        setSettled(now);
      }
      if (busy || S.dragging) S.raf = requestAnimationFrame(frame);
    };
    kick.current = () => {
      if (!S.raf) S.raf = requestAnimationFrame(frame);
    };

    /* ---- hold and drag: mouse, pen or touch ---- */
    let lx = 0,
      ly = 0,
      lt = 0,
      id = -1;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      id = e.pointerId;
      S.dragging = true;
      S.moved = 0;
      S.target = -1;
      S.vx = S.vy = 0;
      lx = e.clientX;
      ly = e.clientY;
      lt = performance.now();
      el.classList.add("is-holding");
      kick.current();
    };
    const onMove = (e: PointerEvent) => {
      if (!S.dragging || e.pointerId !== id) return;
      const dx = e.clientX - lx,
        dy = e.clientY - ly;
      const now = performance.now();
      const dt = Math.max(8, now - lt);
      lx = e.clientX;
      ly = e.clientY;
      lt = now;
      S.moved += Math.abs(dx) + Math.abs(dy);
      if (S.moved > 6 && !el.classList.contains("is-dragging")) {
        el.classList.add("is-dragging");
        try {
          el.setPointerCapture(id);
        } catch {}
      }
      /* radians per px chosen so the front surface tracks the pointer */
      const k = 1 / (S.R * 0.9);
      S.m = mul(mul(rot([0, 1, 0], dx * k), rot([1, 0, 0], -dy * k)), S.m);
      S.vx = (dx * k * 16) / dt;
      S.vy = (dy * k * 16) / dt;
      kick.current();
    };
    const onUp = (e: PointerEvent) => {
      if (!S.dragging || e.pointerId !== id) return;
      S.dragging = false;
      el.classList.remove("is-holding", "is-dragging");
      if (performance.now() - lt > 90) S.vx = S.vy = 0; // held still before letting go
      const cap = 0.09;
      S.vx = Math.max(-cap, Math.min(cap, S.vx));
      S.vy = Math.max(-cap, Math.min(cap, S.vy));
      kick.current();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      S.target = -1;
      const unit = e.deltaMode === 1 ? 16 : 1;
      const cap = 0.06;
      S.vx = Math.max(-cap, Math.min(cap, S.vx - e.deltaX * unit * 0.00045));
      S.vy = Math.max(-cap, Math.min(cap, S.vy - e.deltaY * unit * 0.00045));
      kick.current();
    };

    /* arrows step through every entry in order (right/down next, left/up
       previous), turning to whichever copy of it is nearest the front */
    const onKey = (e: KeyboardEvent) => {
      const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
      if (!step) return;
      e.preventDefault();
      const entries = Math.max(...cards.map((c) => c.home)) + 1;
      const from = cards[S.target >= 0 ? S.target : S.front].home;
      const want = (from + step + entries) % entries;
      let best = -2,
        bi = S.front;
      cards.forEach((c, i) => {
        if (c.home !== want) return;
        const z = apply(S.m, c.n)[2];
        if (z > best) {
          best = z;
          bi = i;
        }
      });
      S.target = bi;
      S.vx = S.vy = 0;
      kick.current();
    };

    /* intro after the site preloader lifts */
    const enter = () => {
      S.tSpread = 1;
      kick.current();
    };
    const w = window as Window & { __preloaderDone?: boolean; __pgsSettle?: () => void };
    if (S.reduce) S.spread = S.tSpread = 1;
    if (S.reduce || w.__preloaderDone || !document.querySelector(".ldr")) enter();
    window.addEventListener("preloader:done", enter);
    const failsafe = setTimeout(enter, 7500);

    /* dev only: finish every animation now, for QA in a preview pane that
       runs no animation frames */
    if (process.env.NODE_ENV !== "production")
      w.__pgsSettle = () => {
        const r = S.reduce;
        S.reduce = true;
        S.spread = S.tSpread = 1;
        S.scale = 1;
        for (let i = 0; i < 3; i++) {
          cancelAnimationFrame(S.raf);
          frame();
        }
        S.reduce = r;
        cancelAnimationFrame(S.raf);
        S.raf = 0;
      };

    layout();
    window.addEventListener("resize", layout);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(S.raf);
      S.raf = 0;
      clearTimeout(failsafe);
      window.removeEventListener("preloader:done", enter);
      window.removeEventListener("resize", layout);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  }, [cards]);

  const onCardClick = (e: React.MouseEvent, i: number) => {
    const S = s.current;
    if (S.moved > 6) {
      e.preventDefault();
      return;
    }
    if (i !== S.front || !S.settled) {
      e.preventDefault();
      S.target = i;
      S.vx = S.vy = 0;
      kick.current();
    }
  };

  const exp = cards[front].entry;
  const external = (href: string) => /^https?:/.test(href);

  return (
    <section
      className="pgs"
      ref={root}
      tabIndex={0}
      aria-label="Experiments. Drag, scroll or use the arrow keys to browse."
    >
      <h1 className="pgs-sr">Playground</h1>
      <div className="pgs__container">
        <div className="pgs__stage" ref={stage}>
          {cards.map((c, i) => (
            <a
              key={i}
              ref={(n) => {
                cardEls.current[i] = n;
              }}
              className={`pgs-card${i === front ? " is-front" : ""}`}
              href={c.entry.href}
              target={external(c.entry.href) ? "_blank" : undefined}
              rel={external(c.entry.href) ? "noopener noreferrer" : undefined}
              tabIndex={-1}
              aria-hidden
              draggable={false}
              onClick={(e) => onCardClick(e, i)}
            >
              <Media preview={c.preview} entry={c.entry} />
            </a>
          ))}
        </div>
      </div>

      <div className={`pgs__caption${settled ? " is-visible" : ""}`} aria-live="polite">
        <a
          className="pgs__title"
          href={exp.href}
          target={external(exp.href) ? "_blank" : undefined}
          rel={external(exp.href) ? "noopener noreferrer" : undefined}
          tabIndex={settled ? 0 : -1}
        >
          {exp.title}
        </a>
        <p className="pgs__meta">
          {exp.kind} · {exp.year}
        </p>
      </div>

      <nav className="pgs-sr" aria-label="All experiments and projects">
        <ul>
          {ENTRIES.map((e) => (
            <li key={e.id}>
              <a href={e.href}>
                {e.title}, {e.kind}, {e.year}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
