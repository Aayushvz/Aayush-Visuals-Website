"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PromoToast, { type Promo } from "@/components/PromoToast";

/*
  Decides which notification card shows, and when. Mounted once in the root
  layout; the cards themselves are built on the server (components/promos).

  When a card appears
  - On arrival, homepage only: 2s after it is ready (after the entrance
    preloader on a first load), always the most recent project, and again
    whenever the visitor comes back up to the hero.
  - Every other page keeps its hero clear: nothing at all until the
    visitor has scrolled past it (HERO_SCREENS), then that page's opening
    card 2s later, and the rules below from there.
  - While reading: on the about and work pages, another one after the
    visitor has kept scrolling for a while - at least GAP_MS since the last
    card left and a screen and a half of scrolling since.
  - When idle: after IDLE_MS with no scroll, pointer, key or touch.

  What keeps it from being annoying
  - One card at a time, and at most CAP per page view (the homepage's
    return-to-hero card aside).
  - Never a card for the page you are already on.
  - Cards not yet seen this visit are preferred; the same one does not
    come back on the same page.
  - Once the visitor starts scrolling, a card stays SCROLL_CLOSE_MS more so
    it can still be read, then drifts away on its own.

  It only runs on the pages where a nudge makes sense: home, about, work
  and the playground. The games, tools and contact page are left alone.
  On a phone, where a card covers far more of the screen, it narrows
  further to the about page and the case studies only.
*/

const ENTRY_DELAY_MS = 2000;
/* how far a visitor must scroll on a non-home page before any card can
   appear: past the hero, which on these pages runs a little over a screen */
const HERO_SCREENS = 1.2;
const SCROLL_CLOSE_MS = 4500;
const IDLE_MS = 18000;
const GAP_MS = 45000;
const GAP_SCREENS = 1.5;
const CAP = 3;
const SEEN_KEY = "promos-seen";

type Kind = "home" | "about" | "work" | "case" | "playground";

function kindOf(path: string): Kind | null {
  if (path === "/") return "home";
  if (path === "/about") return "about";
  if (path === "/work") return "work";
  if (path.startsWith("/work/")) return "case";
  if (path === "/playground") return "playground";
  return null;
}

/* the card each page opens with */
const ENTRY: Record<Kind, string> = {
  home: "recent",
  about: "work",
  work: "playground",
  case: "playground",
  playground: "contact",
};

/* on a phone, only these pages get cards at all */
const PHONE_KINDS = new Set<Kind>(["about", "case"]);
const PHONE_QUERY = "(max-width: 760px)";

/* the pages where a reader scrolling on gets further cards */
const PERIODIC = new Set<Kind>(["about", "work", "case"]);

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* storage blocked: nothing to remember with */
  }
}

type Current = { promo: Promo; phase: "shown" | "leaving" | "fading" };

/* is the visitor below the hero right now? */
function pastHero() {
  return window.scrollY >= window.innerHeight * HERO_SCREENS;
}

export default function PromoManager({ promos }: { promos: Promo[] }) {
  const pathname = usePathname() || "/";
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const pageKind = kindOf(pathname);
  const kind = pageKind && (!phone || PHONE_KINDS.has(pageKind)) ? pageKind : null;
  const [current, setCurrent] = useState<Current | null>(null);

  /* live values the timers read without re-subscribing */
  const currentRef = useRef<Current | null>(null);
  currentRef.current = current;
  const page = useRef({
    count: 0,
    shown: new Set<string>(),
    lastClosedAt: 0,
    scrolledSinceClose: 0,
    lastScrollAt: 0,
    lastActivityAt: 0,
    /* false until the visitor has started reading; nothing shows before */
    started: false,
    /* the homepage opens with a card over its hero on purpose */
    homeLike: false,
    /* the last moment the visitor themselves moved the page (wheel, touch,
       keys, a press on the scrollbar), as opposed to a scripted jump */
    inputAt: 0,
  });

  const pickNext = useCallback((): Promo | undefined => {
    const seen = readSeen();
    const open = promos.filter(
      (p) => p.href !== pathname && !page.current.shown.has(p.id),
    );
    return open.find((p) => !seen.has(p.id)) ?? open[0];
  }, [promos, pathname]);

  const show = useCallback((promo: Promo | undefined, counted = true) => {
    if (!promo || currentRef.current) return;
    /* Never over a hero. Checked at the moment of showing, against where
       the visitor actually is, not how far the page has moved: a route
       change jumps the scroll back to the top, and that jump must not read
       as someone reading on. */
    if (!page.current.homeLike && !pastHero()) return;
    const pg = page.current;
    if (counted && pg.count >= CAP) return;
    if (counted) pg.count += 1;
    pg.shown.add(promo.id);
    const seen = readSeen();
    seen.add(promo.id);
    writeSeen(seen);
    setCurrent({ promo, phase: "shown" });
  }, []);

  const dismiss = useCallback((phase: "leaving" | "fading") => {
    setCurrent((c) => (c && c.phase === "shown" ? { ...c, phase } : c));
  }, []);

  /* once it has played its exit, take it off and start the quiet period */
  useEffect(() => {
    if (!current || current.phase === "shown") return;
    const t = window.setTimeout(
      () => {
        setCurrent(null);
        const pg = page.current;
        pg.lastClosedAt = performance.now();
        pg.scrolledSinceClose = 0;
        pg.lastActivityAt = performance.now();
      },
      current.phase === "fading" ? 700 : 400,
    );
    return () => window.clearTimeout(t);
  }, [current]);

  /* a new page: reset the counts and schedule its opening card */
  useEffect(() => {
    setCurrent(null);
    const now = performance.now();
    page.current = {
      count: 0,
      shown: new Set(),
      lastClosedAt: now,
      scrolledSinceClose: 0,
      lastScrollAt: 0,
      lastActivityAt: now,
      started: kind === "home",
      homeLike: kind === "home",
      inputAt: 0,
    };
    if (!kind) return;

    let timer = 0;
    const start = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const entryId = ENTRY[kind];
        const entry = promos.find((p) => p.id === entryId && p.href !== pathname);
        /* the homepage always opens with the recent project; elsewhere an
           opener already seen this visit gives way to one that is not */
        if (kind === "home" || (entry && !readSeen().has(entry.id))) show(entry);
        else show(pickNext());
      }, ENTRY_DELAY_MS);
    };

    /* the homepage opens with a card on its own; any other page waits
       for the visitor to start reading before it says anything */
    const onFirstScroll = () => {
      /* below the hero, and brought there by the visitor's own scrolling */
      if (!pastHero() || performance.now() - page.current.inputAt > 1000) return;
      window.removeEventListener("scroll", onFirstScroll);
      const pg = page.current;
      pg.started = true;
      pg.lastActivityAt = performance.now();
      start();
    };

    const w = window as Window & { __preloaderDone?: boolean };
    const preloading = !!document.querySelector(".preloader") && !w.__preloaderDone;
    if (kind !== "home") window.addEventListener("scroll", onFirstScroll, { passive: true });
    else if (preloading) window.addEventListener("preloader:done", start, { once: true });
    else start();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("preloader:done", start);
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, [kind, pathname, promos, show, pickNext]);

  /* scrolling while a card is up: give it SCROLL_CLOSE_MS more, then let
     it drift away. A nudge under 40px does not count */
  useEffect(() => {
    if (!current || current.phase !== "shown") return;
    const from = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      if (timer || Math.abs(window.scrollY - from) < 40) return;
      timer = window.setTimeout(() => dismiss("fading"), SCROLL_CLOSE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [current, dismiss]);

  /* activity, scroll distance, the idle and reading triggers, and the
     homepage's return to the hero - one listener set and one ticker */
  useEffect(() => {
    if (!kind) return;
    let lastY = window.scrollY;
    let away = window.scrollY > window.innerHeight * 0.6;
    let heroTimer = 0;

    const activity = () => {
      page.current.lastActivityAt = performance.now();
    };
    const input = () => {
      page.current.inputAt = performance.now();
      activity();
    };

    const onScroll = () => {
      const y = window.scrollY;
      const pg = page.current;
      pg.scrolledSinceClose += Math.abs(y - lastY);
      pg.lastScrollAt = performance.now();
      lastY = y;
      activity();

      if (kind === "home") {
        if (y > window.innerHeight * 0.6) {
          away = true;
          window.clearTimeout(heroTimer);
          heroTimer = 0;
        } else if (away && y < window.innerHeight * 0.3 && !heroTimer && !currentRef.current) {
          heroTimer = window.setTimeout(() => {
            heroTimer = 0;
            away = false;
            const recent = promos.find((p) => p.id === ENTRY.home);
            /* the return-to-hero card does not use up the page's allowance */
            if (recent) {
              page.current.shown.delete(recent.id);
              show(recent, false);
            }
          }, ENTRY_DELAY_MS);
        }
      }
    };

    const tick = window.setInterval(() => {
      if (currentRef.current) return;
      const pg = page.current;
      const now = performance.now();
      if (!pg.started || pg.count >= CAP) return;

      /* idle on one screen long enough */
      if (now - pg.lastActivityAt >= IDLE_MS && now - pg.lastClosedAt >= 8000) {
        pg.lastActivityAt = now;
        show(pickNext());
        return;
      }

      /* still reading: scrolling now, and far enough and long enough since
         the last card */
      if (
        PERIODIC.has(kind) &&
        now - pg.lastScrollAt < 1500 &&
        now - pg.lastClosedAt >= GAP_MS &&
        pg.scrolledSinceClose >= window.innerHeight * GAP_SCREENS
      ) {
        show(pickNext());
      }
    }, 1000);

    const opts = { passive: true } as const;
    window.addEventListener("scroll", onScroll, opts);
    window.addEventListener("pointermove", activity, opts);
    window.addEventListener("pointerdown", input, opts);
    window.addEventListener("keydown", input);
    window.addEventListener("touchstart", input, opts);
    window.addEventListener("touchmove", input, opts);
    window.addEventListener("wheel", input, opts);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(heroTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", activity);
      window.removeEventListener("pointerdown", input);
      window.removeEventListener("keydown", input);
      window.removeEventListener("touchstart", input);
      window.removeEventListener("touchmove", input);
      window.removeEventListener("wheel", input);
    };
  }, [kind, promos, show, pickNext]);

  if (!current) return null;

  return (
    <PromoToast
      key={current.promo.id}
      promo={current.promo}
      phase={current.phase}
      onClose={() => dismiss("leaving")}
      onFollow={() => dismiss("leaving")}
    />
  );
}
