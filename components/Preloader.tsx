"use client";

import { useEffect, useState } from "react";

/*
  Full-screen entrance preloader — mounted once in the root layout, so it
  runs on every fresh document load/reload but never remounts during
  in-app navigation (app/template.tsx only swaps the route's <main>).

  Two phases, one continuous animation:
  PHASE 1 — a retro system-initialization interface (cycling status
  commands on the left, a center percentage counter, a secondary note on
  the right) runs over the flat brand-color background.
  PHASE 2 — once the counter reaches 100%, the terminal UI dissolves and
  the logo + wordmark reveal in its place (the two panels already meet at
  the exact vertical center, sharing the same brand color — no seam is
  visible until they move). After a brief hold, the panels physically
  split apart — top up, bottom down — on cubic-bezier(0.76,0,0.24,1),
  revealing the homepage that has been rendered underneath the whole time.
*/

type Stage =
  | "bootClosed"
  | "boot"
  | "bootExit"
  | "brandEnter"
  | "brandHold"
  | "split"
  | "done";

const WORD = "aayush visuals";

const COMMANDS = [
  "// LOADING VISUAL SYSTEMS...",
  "// SYNCING CREATIVE ARCHIVE...",
  "// FETCHING SELECTED WORKS...",
  "// CALIBRATING INTERACTIONS...",
  "// INITIALIZING AAYUSH VISUALS...",
  "// READY TO CREATE...",
];

function indexForPercent(p: number) {
  if (p < 15) return 0;
  if (p < 30) return 1;
  if (p < 50) return 2;
  if (p < 68) return 3;
  if (p < 88) return 4;
  return 5;
}

// Irregular progression on purpose — reads like a real init process
// ticking along, not a linear CSS counter. Each tuple is [percent, delay
// in ms since the previous step].
const PERCENT_STEPS: Array<[percent: number, delay: number]> = [
  [0, 100],
  [4, 150],
  [9, 140],
  [16, 170],
  [24, 160],
  [37, 200],
  [49, 180],
  [63, 210],
  [74, 170],
  [86, 190],
  [94, 150],
  [98, 120],
  [100, 110],
];

const BOOT_ENTER = 100; // terminal begins appearing
const BOOT_HOLD_MS = 150; // hold on 100% before the terminal dissolves
const BOOT_EXIT_MS = 250; // terminal fades away
const BRAND_ENTER_MS = 300; // logo + wordmark fade in
const BRAND_HOLD_MS = 450; // calm brand moment before the split
const SPLIT_MS = 700; // must match the transform transition-duration in CSS
const REDUCED_HOLD_MS = 260;
const REDUCED_FADE_MS = 260;

export default function Preloader() {
  const [stage, setStage] = useState<Stage>("bootClosed");
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const clearAll = () => timers.forEach(clearTimeout);

    // Lock scroll without letting the vanished scrollbar shift layout.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const finish = () => {
      setStage("done");
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      clearAll();
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Skip the terminal sequence entirely — straight to a quick,
      // static brand moment, then a plain fade instead of a split.
      schedule(() => setStage("brandHold"), BOOT_ENTER);
      schedule(() => setStage("split"), BOOT_ENTER + REDUCED_HOLD_MS);
      schedule(finish, BOOT_ENTER + REDUCED_HOLD_MS + REDUCED_FADE_MS);
    } else {
      schedule(() => setStage("boot"), BOOT_ENTER);

      let t = BOOT_ENTER;
      for (const [p, delay] of PERCENT_STEPS) {
        t += delay;
        schedule(() => setPercent(p), t);
      }

      const bootExitAt = t + BOOT_HOLD_MS;
      const brandEnterAt = bootExitAt + BOOT_EXIT_MS;
      const brandHoldAt = brandEnterAt + BRAND_ENTER_MS;
      const splitAt = brandHoldAt + BRAND_HOLD_MS;
      const finishAt = splitAt + SPLIT_MS;

      schedule(() => setStage("bootExit"), bootExitAt);
      schedule(() => setStage("brandEnter"), brandEnterAt);
      schedule(() => setStage("brandHold"), brandHoldAt);
      schedule(() => setStage("split"), splitAt);
      schedule(finish, finishAt);
    }
    // failsafe — the site must never stay locked behind this overlay,
    // no matter what else goes wrong above.
    schedule(finish, reduced ? 1600 : 6000);

    return () => {
      clearAll();
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  if (stage === "done") return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const className = [
    "preloader",
    stage === "split" && !reducedMotion ? "preloader--split" : "",
    stage === "split" && reducedMotion ? "preloader--fade" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showBoot = stage === "bootClosed" || stage === "boot" || stage === "bootExit";
  const bootClass = [
    stage !== "bootClosed" ? " bootLoader--visible" : "",
    stage === "bootExit" ? " bootLoader--exit" : "",
  ].join("");

  const brandedClass =
    stage === "brandEnter" || stage === "brandHold" || stage === "split"
      ? " preloader__brand--visible"
      : "";

  const activeIndex = indexForPercent(percent);
  const percentLabel = `( ${String(percent).padStart(2, "0")}% )`;

  return (
    <div className={className} aria-hidden role="presentation">
      {showBoot && (
        <div className={`bootLoader${bootClass}`}>
          <div className="bootLoader__commands">
            {COMMANDS.map((cmd, i) => (
              <div
                key={cmd}
                className={`bootLoader__cmd${i === activeIndex ? " bootLoader__cmd--active" : ""}`}
              >
                {cmd}
              </div>
            ))}
          </div>
          <div className="bootLoader__percent">{percentLabel}</div>
          <div className="bootLoader__aside">
            <p>// LOADING THE PIXELS.</p>
            <p>// THE GOOD ONES TAKE</p>
            <p>
              // A LITTLE LONGER
              <span className="bootLoader__cursor" aria-hidden>
                _
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="preloader__panel preloader__panel--top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/av%20logo%20png.png"
          alt="Aayush Visuals"
          draggable={false}
          className={`preloader__logo${brandedClass}`}
        />
      </div>
      <div className="preloader__panel preloader__panel--bottom">
        <div className={`preloader__word${brandedClass}`}>{WORD}</div>
      </div>
    </div>
  );
}
