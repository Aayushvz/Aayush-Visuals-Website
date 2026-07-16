"use client";

import { useEffect, useRef, useState } from "react";

/*
  Full-screen preloader — shown once on fresh page load (2.5 s),
  then exits with an upward wipe. Writes a sessionStorage flag so
  the heavy load is skipped within the same browser session.
*/

export default function Preloader() {
  const [phase, setPhase] = useState<"loading" | "exit" | "done">("loading");
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Skip on subsequent navigations within the same session
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("pl_seen")) {
      setPhase("done");
      return;
    }

    const HOLD = 2400;
    const EXIT = 700;

    // Counter animation
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / HOLD, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (countRef.current) {
        countRef.current.textContent = Math.floor(eased * 100)
          .toString()
          .padStart(2, "0");
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const exitTimer = setTimeout(() => setPhase("exit"), HOLD);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("pl_seen", "1");
    }, HOLD + EXIT);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`preloader${phase === "exit" ? " preloader--exit" : ""}`}
      aria-hidden
    >
      {/* Faint pixel grid texture */}
      <div className="preloader__grid" aria-hidden />

      {/* Logo */}
      <div className="preloader__center">
        <div className="preloader__logo">
          <span className="preloader__word">aayush</span>
          <sup className="preloader__sup">YZ</sup>
        </div>
        <p className="preloader__tag">Portfolio / 2026</p>
      </div>

      {/* Percentage counter */}
      <div className="preloader__counter">
        <span ref={countRef} className="preloader__count">00</span>
        <span className="preloader__pct">%</span>
      </div>

      {/* Progress bar */}
      <div className="preloader__bar" aria-hidden>
        <div className="preloader__fill" />
      </div>
    </div>
  );
}
