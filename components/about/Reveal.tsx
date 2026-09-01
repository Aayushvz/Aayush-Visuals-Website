"use client";

import {
  Children,
  createElement,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/*
  The About story's scroll engine.

  This is scroll-SCRUBBED, not trigger-once, and that distinction is the whole
  behaviour. A triggered reveal fires when an element arrives and is then done
  forever; a scrubbed one is tied continuously to scroll position, so content
  enters as you come to it and leaves as you go past. That is what makes a long
  page feel like it is being narrated rather than like a list that fades in.

  Every element publishes two numbers and nothing else:

    --rv-in   0 → 1   as it rises from the bottom edge into its resting place
    --rv-out  0 → 1   as it continues up and off the top

  All the actual motion lives in about-story.css, composed from those two. The
  split matters: JS decides *where you are*, CSS decides *what that looks like*,
  so retuning the choreography never means touching this file.

  What keeps it cheap, given the page also runs two full-screen canvases:

  - ONE rAF loop for the whole page, not one per element.
  - The loop only runs while something is actually on screen. An
    IntersectionObserver adds and removes elements from the active set, so
    scrolled-past content costs nothing at all.
  - The loop parks itself when scrolling stops and wakes on the next scroll.
  - Writes are skipped unless the value moved by more than a thousandth, which
    is what stops a settled element re-writing the same string every frame.
  - Only custom properties are written, and they only ever feed transform and
    opacity, so nothing here can trigger layout.
*/

export type RevealDirection = "left" | "right" | "up" | "down" | "none";

/* ---- the shared engine ------------------------------------------------- */

type Tracked = {
  el: HTMLElement;
  /* fraction of the viewport the entrance is spread over */
  enterSpan: number;
  exitSpan: number;
  /* pushes this element's window later, which is how a group staggers */
  offset: number;
  lastIn: number;
  lastOut: number;
  /* filled by read(), applied by write() */
  nextIn: number;
  nextOut: number;
};

const active = new Set<Tracked>();
/* element -> its record, so the observer callback is a lookup rather than a
   linear scan that allocates a fresh array every time it fires */
const byEl = new WeakMap<Element, Tracked>();
let raf = 0;
let io: IntersectionObserver | null = null;
let reduced = false;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/*
  Reads and writes are deliberately kept in separate passes.

  Doing rect-read then style-write per element, in a loop, is the classic
  layout-thrash shape: each write dirties style, and the next element's
  getBoundingClientRect() then has to flush it before it can answer. With
  dozens of tracked elements that is dozens of forced synchronous layouts in a
  single frame — precisely the jank this system exists to avoid.

  So `read` gathers every rect first and `write` applies every result after.
  One layout flush per frame instead of one per element.
*/
function read(t: Tracked, vh: number) {
  const r = t.el.getBoundingClientRect();

  /*
    Entrance: 0 while the element's top is still below the fold, 1 once it has
    risen `enterSpan` of a viewport above that. The offset delays the window,
    which is how a staggered group stays choreographed while being driven by
    one shared clock.
  */
  const rise = vh - r.top - vh * t.offset;
  t.nextIn = clamp01(rise / (vh * t.enterSpan));

  /*
    Exit: begins only once the element's bottom passes the top third of the
    screen, so content leaves after you have had a chance to read it rather
    than starting to fade the moment it stops rising.
  */
  const exitDist = vh * t.exitSpan;
  t.nextOut = clamp01((exitDist - r.bottom) / exitDist);
}

function write(t: Tracked) {
  /* the threshold is what stops a settled element re-writing the same string
     on every frame for as long as it is on screen */
  if (Math.abs(t.nextIn - t.lastIn) > 0.001) {
    t.lastIn = t.nextIn;
    t.el.style.setProperty("--rv-in", t.nextIn.toFixed(3));
  }
  if (Math.abs(t.nextOut - t.lastOut) > 0.001) {
    t.lastOut = t.nextOut;
    t.el.style.setProperty("--rv-out", t.nextOut.toFixed(3));
  }
}

function measure(t: Tracked) {
  read(t, window.innerHeight || 1);
  write(t);
}

/*
  The loop genuinely parks.

  Keeping a rAF alive for as long as anything tracked is on screen would mean
  this page never stops doing work while the About story is in view — on a page
  that already runs two full-screen canvases, that is a real cost for nothing,
  since a scrubbed value cannot change unless the scroll position does.

  So the loop counts frames in which the scroll position has not moved and
  stops after a few. A couple of settling frames rather than one, because
  momentum scrolling can report the same offset briefly mid-glide.
*/
let lastY = -1;
let idle = 0;

function frame() {
  const vh = window.innerHeight || 1;
  for (const t of active) read(t, vh);
  for (const t of active) write(t);

  const y = window.scrollY;
  idle = y === lastY ? idle + 1 : 0;
  lastY = y;

  raf = active.size && idle < 3 ? requestAnimationFrame(frame) : 0;
}

function wake() {
  if (reduced) return;
  /*
    Reset the idle counter FIRST, before the early return.

    If a scroll arrives while the loop is already running but part-way through
    its parking countdown, returning early would leave that countdown intact —
    the loop parks a frame or two later and the values freeze mid-transition,
    even though the user is still scrolling. Bumping idle here means any scroll
    keeps the loop alive whether or not it needed restarting.
  */
  idle = 0;
  if (raf || !active.size) return;
  raf = requestAnimationFrame(frame);
}

/* One listener for the page, not one per element. Passive, and it does no
   work of its own beyond restarting a loop that is usually already running. */
let bound = false;
function bindWake() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", wake, { passive: true });
}

function observer() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const t = byEl.get(entry.target);
        if (!t) continue;
        if (entry.isIntersecting) active.add(t);
        else {
          active.delete(t);
          /* settle whatever it was mid-way through, so an element that leaves
             the observer's range never freezes half-transparent */
          measure(t);
        }
      }
      wake();
    },
    /* generous margins: an element must be tracked slightly before it is
       visible, or its entrance would begin already part-way through */
    { rootMargin: "40% 0px 40% 0px", threshold: 0 }
  );
  return io;
}

function track(t: Tracked) {
  byEl.set(t.el, t);
  bindWake();
  observer().observe(t.el);
  /* seed it immediately so nothing is invisible before the first scroll */
  measure(t);
}

function untrack(t: Tracked) {
  observer().unobserve(t.el);
  byEl.delete(t.el);
  active.delete(t);
}

/* ---- the component ------------------------------------------------------ */

export type RevealProps = {
  children?: ReactNode;
  /** Which side the element travels in from. Default "up". */
  direction?: RevealDirection;
  /** Stagger, as a fraction of a viewport. Pushes this element's window later. */
  delay?: number;
  /** How much of a viewport the entrance is spread over. Lower = snappier. */
  enterSpan?: number;
  /** How much of a viewport the exit is spread over. */
  exitSpan?: number;
  /** How far it travels on the way in, in px. */
  distance?: number;
  /** How far it rises on the way out, in px. */
  exitDistance?: number;
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

function offsets(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "left":
      return { x: `${-distance}px`, y: "0px" };
    case "right":
      return { x: `${distance}px`, y: "0px" };
    case "down":
      return { x: "0px", y: `${-distance}px` };
    case "up":
      return { x: "0px", y: `${distance}px` };
    default:
      return { x: "0px", y: "0px" };
  }
}

export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  enterSpan = 0.34,
  exitSpan = 0.3,
  distance = 46,
  exitDistance = 90,
  as = "div",
  className = "",
  style,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* fail open: with motion off, or without the APIs, the content simply is
       where it belongs. Nothing on this page may depend on the loop running. */
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      el.style.setProperty("--rv-in", "1");
      el.style.setProperty("--rv-out", "0");
      return;
    }

    const t: Tracked = {
      el,
      enterSpan,
      exitSpan,
      offset: delay,
      lastIn: -1,
      lastOut: -1,
      nextIn: 0,
      nextOut: 0,
    };
    track(t);
    wake();
    return () => untrack(t);
  }, [delay, enterSpan, exitSpan]);

  const { x, y } = offsets(direction, distance);

  return createElement(
    as,
    {
      ref,
      className: `rv ${className}`.trim(),
      style: {
        ...style,
        "--rv-x": x,
        "--rv-y": y,
        "--rv-exit": `${exitDistance}px`,
      } as CSSProperties,
      ...rest,
    },
    children
  );
}

/* ---- per-character display type ---------------------------------------- */

/*
  A heading split into one element per character, each on its own slightly
  later window, so the line assembles letter by letter as it rises.

  It is the reference's signature move and the reason its display type reads as
  choreography rather than as a block sliding up. Two details make it work
  rather than look like a gimmick:

  - The stagger is tiny and the span is wide, so at any moment neighbouring
    characters are only a few percent apart. A large stagger turns a word into
    a xylophone.
  - Spaces are rendered as real spaces outside the animated spans, so the
    browser can still break the line normally and the word never loses its
    kerning to a wall of inline-blocks.

  The full string is exposed to assistive tech via aria-label, and the split
  characters are hidden from it — otherwise a screen reader reads the heading
  one letter at a time.
*/
export function SplitDisplay({
  lines,
  className = "",
  as = "h2",
  enterSpan = 0.42,
}: {
  /** One string per rendered line. Kept as an array rather than a newline-
      delimited string so the copy never depends on escape sequences. */
  lines: string[];
  className?: string;
  as?: keyof HTMLElementTagNameMap;
  enterSpan?: number;
}) {
  /* the stagger is a fraction of the heading's own progress, so it is
     normalised here: index 0 -> 0, last character -> 1, whatever the length */
  const total = lines.join("").replace(/ /g, "").length;
  const span = Math.max(1, total - 1);
  let n = 0;

  return (
    <Reveal
      as={as}
      className={`abSplit ${className}`.trim()}
      direction="none"
      enterSpan={enterSpan}
      aria-label={lines.join(" ")}
    >
      {lines.map((line, li) => (
        <span className="abSplit__line" key={li} aria-hidden>
          {[...line].map((chpar, ci) =>
            chpar === " " ? (
              " "
            ) : (
              <span
                className="abSplit__char"
                key={ci}
                style={{ "--i": n++ / span } as CSSProperties}
              >
                {chpar}
              </span>
            )
          )}
        </span>
      ))}
    </Reveal>
  );
}

/* ---- groups and images -------------------------------------------------- */

export type RevealGroupProps = Omit<RevealProps, "delay"> & {
  stagger?: number;
  delay?: number;
  childAs?: keyof HTMLElementTagNameMap;
  childClassName?: string;
};

export function RevealGroup({
  children,
  stagger = 0.04,
  delay = 0,
  as = "div",
  childAs = "div",
  childClassName = "",
  className = "",
  style,
  ...revealProps
}: RevealGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return createElement(
    as,
    { className, style },
    items.map((child, i) =>
      createElement(
        Reveal,
        {
          key: i,
          as: childAs,
          className: childClassName,
          delay: delay + i * stagger,
          ...revealProps,
        },
        child
      )
    )
  );
}

export type RevealImageProps = {
  src: string;
  alt: string;
  direction?: RevealDirection;
  delay?: number;
  distance?: number;
  enterSpan?: number;
  exitSpan?: number;
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  sizes?: string;
};

/*
  The two-layer image reveal, matching the measured behaviour: the frame comes
  up from just under full size while the picture inside it settles down from
  well over it. The counter-scale is what gives the image depth on the way in —
  it reads as the photograph coming to rest inside a window, rather than as a
  rectangle sliding up the page. Both numbers are driven off --rv-in in CSS.
*/
export function RevealImage({
  src,
  alt,
  direction = "up",
  delay = 0,
  distance = 56,
  enterSpan = 0.4,
  exitSpan = 0.3,
  ratio,
  className = "",
  style,
  loading = "lazy",
  sizes = "(max-width: 760px) 92vw, 46vw",
}: RevealImageProps) {
  return (
    <Reveal
      direction={direction}
      delay={delay}
      distance={distance}
      enterSpan={enterSpan}
      exitSpan={exitSpan}
      className={`rvImg ${className}`.trim()}
      style={{ ...style, ...(ratio ? { aspectRatio: ratio } : null) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rvImg__img"
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        sizes={sizes}
      />
    </Reveal>
  );
}
