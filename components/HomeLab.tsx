"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import { EXPERIMENTS, type Experiment } from "@/components/playground/experiments";
import { Logo } from "@/components/playground/logos";

/*
  The homepage's experiments row: every live entry from the playground, as
  a sideways-scrolling row of program-style cards (after a tennis-academy
  reference). Each card is a coloured panel - two tag pills, a logo badge,
  a big two-line name, one line of context - over the experiment's cover,
  shown without its title lettering, with a frosted call to action on the
  art.

  The first card carries the highlight colour, the rest sit on a quiet
  stone ground and pick up their own theme tint on hover. Everything reads
  off EXPERIMENTS, so a new experiment appears here the moment it lands on
  the playground.
*/

const isExternal = (href: string) => /^https?:\/\//.test(href);

function CardLink({
  href,
  className,
  children,
  label,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  label: string;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer" aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <PageLink href={href} className={className} aria-label={label}>
      {children}
    </PageLink>
  );
}

function Arrow({ dir = 1 }: { dir?: 1 | -1 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={dir === -1 ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LabCard({ e, featured }: { e: Experiment; featured: boolean }) {
  const Cover = e.cover;
  return (
    <li
      className={`labCard${featured ? " labCard--featured" : ""}`}
      style={
        {
          "--t-accent": e.theme.accent,
          "--t-on-accent": e.theme.onAccent,
          "--t-light": e.theme.light,
        } as React.CSSProperties
      }
    >
      <CardLink
        href={e.href}
        className="labCard__link"
        label={`${e.title}. ${e.tagline} ${e.cta}.`}
      >
        <div className="labCard__panel">
          <div className="labCard__top">
            <ul className="labCard__pills">
              {e.tags.slice(0, 2).map((t) => (
                <li key={t.label} className="labCard__pill">
                  {t.label}
                </li>
              ))}
            </ul>
            <span className="labCard__badge" aria-hidden>
              <Logo id={e.id} />
            </span>
          </div>
          <h3 className="labCard__title">{e.title}</h3>
          <p className="labCard__text">{e.tagline}</p>
        </div>

        <div className="labCard__art">
          <div className="labCard__cover">
            <Cover />
          </div>
          <span className="labCard__cta" aria-hidden>
            <span className="labCard__ctaLabel">{e.cta}</span>
            <span className="labCard__ctaKey">
              <Arrow />
            </span>
          </span>
        </div>
      </CardLink>
    </li>
  );
}

/*
  The last card: the way through to the rest of the playground, after a
  dot-matrix "downloads" card reference. A light frame holds a dark LED
  screen with the live count set large and a bar of lit dots rising from
  its floor; under it, a purple tile with an arrow and the label.

  The dots are one SVG in grid units - every cell drawn dim, then the lit
  ones over them - so they stay square at any card size. The bars are
  seeded, so the server and the client draw the same ones.
*/
const DOT_COLS = 34;
const DOT_ROWS = 30;

function dotBars() {
  let t = 7;
  const rand = () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
  const lit: [number, number][] = [];
  for (let c = 0; c < DOT_COLS; c++) {
    const h = 3 + Math.floor(rand() * 8);
    for (let k = 0; k < h; k++) {
      if (rand() < 0.92 - k * 0.08) lit.push([c, DOT_ROWS - 1 - k]);
    }
    if (rand() < 0.4) lit.push([c, DOT_ROWS - 2 - h - Math.floor(rand() * 2)]);
  }
  return lit;
}

const LIT = dotBars();

function MoreCard({ count }: { count: number }) {
  return (
    <li className="labCard labCard--more">
      <PageLink
        href="/playground"
        className="labCard__link labMore"
        aria-label={`View more tools. All ${count} experiments on the playground.`}
      >
        <div className="labMore__screen">
          <svg
            className="labMore__dots"
            viewBox={`0 0 ${DOT_COLS} ${DOT_ROWS}`}
            preserveAspectRatio="xMidYMax slice"
            aria-hidden
          >
            {Array.from({ length: DOT_COLS * DOT_ROWS }, (_, i) => (
              <rect
                key={i}
                x={(i % DOT_COLS) + 0.22}
                y={Math.floor(i / DOT_COLS) + 0.22}
                width=".56"
                height=".56"
                className="labMore__dim"
              />
            ))}
            <g className="labMore__lit">
              {LIT.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x + 0.22} y={y + 0.22} width=".56" height=".56" />
              ))}
            </g>
          </svg>
          <span className="labMore__label">Experiments</span>
          <span className="labMore__count">
            {String(count).padStart(2, "0")}.
          </span>
        </div>

        <div className="labMore__foot">
          {/* the tile: corner ticks framing a ringed disc, the arrow at its
              centre. The arrow is drawn twice so hover can send one out
              along its own diagonal and bring the other in behind it */}
          <span className="labMore__tile" aria-hidden>
            <span className="labMore__ticks" />
            <span className="labMore__disc">
              <span className="labMore__arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </span>
              <span className="labMore__arrow labMore__arrow--next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </span>
            </span>
          </span>
          <span className="labMore__text">
            <span className="labMore__src">Playground</span>
            <span className="labMore__title">View more tools</span>
            <span className="labMore__meta">.GAMES .TOOLS .TOYS</span>
          </span>
        </div>
      </PageLink>
    </li>
  );
}

export default function HomeLab() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [pinned, setPinned] = useState(false);
  /* how far the row travels sideways, and the still stretches either side
     of that travel. The section is one screen plus all three tall */
  const [dist, setDist] = useState(0);
  const [hold, setHold] = useState({ lead: 0, tail: 0 });
  const [edge, setEdge] = useState({ start: true, end: false });

  /* the server renders the plain swipeable strip (it has no viewport to
     size a pin against); the pin takes over once the page is live, on
     every screen size */
  useEffect(() => {
    setPinned(true);
  }, []);

  /*
    Pinned mode. The section is one screen plus the row's overflow tall;
    its inner stage is sticky, so it locks to the viewport while the page
    scrolls through that extra height, and the scroll progress through it
    becomes the row's sideways offset. When the last card is in view the
    stage unpins and the page carries on to the next section.
  */
  useEffect(() => {
    if (!pinned) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let d = 0;
    /* A beat of stillness after the stage locks, before the row starts to
       move, so the section visibly settles first; and a shorter one after
       the last card, before the page carries on */
    let lead = 0;
    let tail = 0;
    let raf = 0;

    /* travel = how far the last card sits past the row's right edge, plus
       the row's own right inset, so the last card stops at the same margin
       the first one starts at (scrollWidth leaves that padding out) */
    const measure = () => {
      const last = track.lastElementChild as HTMLElement | null;
      if (!last) return;
      const prev = track.style.transform;
      track.style.transform = "none";
      const pr = parseFloat(getComputedStyle(track).paddingRight) || 0;
      d = Math.max(0, last.getBoundingClientRect().right + pr - track.getBoundingClientRect().right);
      track.style.transform = prev;
      lead = Math.round(window.innerHeight * 0.18);
      tail = Math.round(window.innerHeight * 0.1);
      setDist(d);
      setHold({ lead, tail });
    };

    /*
      On a phone the row moves in card-sized steps rather than continuously:
      the scroll is split into one segment per step, each card rests fully
      aligned for most of its segment and glides to the next in the middle
      third. A continuous slide on a narrow screen spends most of its time
      with a card sliced in half at the edge; this way it almost never does.
    */
    const stepped = () => window.innerWidth <= 760;
    const ease = (t: number) => t * t * (3 - 2 * t);
    const offset = (p: number) => {
      if (!stepped() || d <= 0) return p * d;
      const card = track.querySelector<HTMLElement>(".labCard");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const unit = card ? card.offsetWidth + gap : d;
      const stops: number[] = [];
      for (let x = 0; x < d - 1; x += unit) stops.push(x);
      stops.push(d);
      const segs = stops.length - 1;
      if (segs <= 0) return 0;
      const t = p * segs;
      const k = Math.min(Math.floor(t), segs - 1);
      const f = Math.min(Math.max((t - k - 0.33) / 0.34, 0), 1);
      return stops[k] + (stops[k + 1] - stops[k]) * ease(f);
    };

    const update = () => {
      raf = 0;
      const top = section.getBoundingClientRect().top;
      const p = d > 0 ? Math.min(Math.max((-top - lead) / d, 0), 1) : 0;
      track.style.transform = `translate3d(${(-offset(p)).toFixed(1)}px, 0, 0)`;
      setEdge((prev) => {
        const next = { start: p <= 0.001, end: p >= 0.999 };
        return prev.start === next.start && prev.end === next.end ? prev : next;
      });
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    /* Re-measure whenever the row itself changes size, not only on window
       resize: on a phone the first measurement can land before fonts and
       the final layout settle, and a stale travel stops the row short of
       its last card. Once the page has fully loaded, measure once more. */
    const ro = new ResizeObserver(onResize);
    ro.observe(track);
    window.addEventListener("load", onResize);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      track.style.transform = "";
    };
  }, [pinned]);

  /* swipe mode: the arrows follow the strip's own scroll position */
  useEffect(() => {
    if (pinned) return;
    const t = trackRef.current;
    if (!t) return;
    const sync = () =>
      setEdge({
        start: t.scrollLeft <= 4,
        end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4,
      });
    sync();
    t.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      t.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [pinned]);

  /* one card (plus its gap) per press. Pinned, that means scrolling the
     page by the same amount, since page scroll is what drives the row */
  const step = useCallback(
    (dir: 1 | -1) => {
      const t = trackRef.current;
      const section = sectionRef.current;
      const card = t?.querySelector<HTMLElement>(".labCard");
      if (!t || !card || !section) return;
      const gap = parseFloat(getComputedStyle(t).columnGap) || 0;
      const unit = card.offsetWidth + gap;

      if (!pinned) {
        t.scrollBy({ left: dir * unit, behavior: "smooth" });
        return;
      }
      const sectionTop =
        section.getBoundingClientRect().top + window.scrollY + hold.lead;
      const current = Math.min(Math.max(window.scrollY - sectionTop, 0), dist);
      /* snap to the card grid so repeated presses land on whole cards */
      const target = Math.min(
        Math.max((Math.round(current / unit) + dir) * unit, 0),
        dist,
      );
      window.scrollTo({ top: sectionTop + target, behavior: "smooth" });
    },
    [pinned, dist, hold.lead],
  );

  return (
    <section
      className={`lab${pinned ? " lab--pinned" : ""}`}
      id="experiments"
      aria-labelledby="lab-heading"
      ref={sectionRef}
      style={
        pinned
          ? { height: `calc(100svh + ${dist + hold.lead + hold.tail}px)` }
          : undefined
      }
    >
      <div className="lab__stage">
        <div className="lab__head">
          <div>
            <span className="lab__kicker" data-reveal>
              Side projects
            </span>
            <h2 className="display lab__title" id="lab-heading" data-reveal>
              Experimental tools
              <br />
              and toys I have built
            </h2>
          </div>
          <div className="lab__nav">
            <button
              type="button"
              className="lab__arrow"
              aria-label="Previous experiments"
              onClick={() => step(-1)}
              disabled={edge.start}
            >
              <Arrow dir={-1} />
            </button>
            <button
              type="button"
              className="lab__arrow"
              aria-label="Next experiments"
              onClick={() => step(1)}
              disabled={edge.end}
            >
              <Arrow />
            </button>
          </div>
        </div>

        <ul className="lab__track" ref={trackRef}>
          {EXPERIMENTS.map((e, i) => (
            <LabCard key={e.id} e={e} featured={i === 0} />
          ))}
          <MoreCard count={EXPERIMENTS.length} />
        </ul>
      </div>
    </section>
  );
}
