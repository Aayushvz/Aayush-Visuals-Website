"use client";

import { useEffect, useRef, useState } from "react";

/*
  Live telemetry bar pinned to the page bottom — the About page's
  instrument panel. Scroll % and cursor coordinates mutate DOM text
  directly through refs (no React re-render per pointer event); only the
  1 Hz clock and the status word go through state.

  LEFT    SCRL <scroll %>   CRSR <x> <y>
  CENTER  02 — ABOUT
  RIGHT   <IST clock> IST   STATUS <live status>
*/

export type AboutStatus =
  | "OPEN FOR FULL-TIME OFFERS"
  | "ASCII ACTIVE"
  | "AVAILABLE"
  | "SCROLLING";

export default function StatusBar({
  status,
  section,
  visible = true,
}: {
  status: AboutStatus;
  section: string;
  /** the bar belongs to the hero; the page hides it once the hero leaves */
  visible?: boolean;
}) {
  const scrlRef = useRef<HTMLSpanElement>(null);
  const crsrRef = useRef<HTMLSpanElement>(null);
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    /* The bar is hidden once the hero leaves, and a clock nobody can see does
       not need to keep re-rendering the component every second for the rest
       of the page. It reads the real time again the moment it comes back, so
       nothing is stale on return - the same "park when idle" rule the scroll
       loops on this page already follow. */
    if (!visible) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    let raf = 0;
    let cx = 0;
    let cy = 0;
    let dirty = false;

    const write = () => {
      raf = 0;
      if (!dirty) return;
      dirty = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (scrlRef.current) scrlRef.current.textContent = p.toFixed(2);
      if (crsrRef.current) crsrRef.current.textContent = `${cx} ${cy}`;
    };

    const onMove = (e: PointerEvent) => {
      cx = Math.round(e.clientX);
      cy = Math.round(e.clientY);
      dirty = true;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const onScroll = () => {
      dirty = true;
      if (!raf) raf = requestAnimationFrame(write);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    dirty = true;
    write();

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* one row of bordered cells, per the Figma: SCRL | CRSR | 02 — ABOUT
     (flexible centre) | STATUS | THEME | IST — keys grey, values purple */
  return (
    <footer
      className={`aboutPage__bar${visible ? "" : " aboutPage__bar--hidden"}`}
      aria-label="Page telemetry"
      aria-hidden={!visible}
    >
      <span className="aboutPage__barCell aboutPage__barCell--scrl">
        <span className="aboutPage__barKey">SCRL</span>
        <span className="aboutPage__barVal" ref={scrlRef}>
          0.00
        </span>
      </span>
      <span className="aboutPage__barCell aboutPage__barCell--crsr">
        <span className="aboutPage__barKey">CRSR</span>
        <span className="aboutPage__barVal" ref={crsrRef}>
          0 0
        </span>
      </span>

      <span className="aboutPage__barCell aboutPage__barCell--section">
        <span className="aboutPage__barSection" key={section}>{section}</span>
      </span>

      <span className="aboutPage__barCell aboutPage__barCell--status">
        <span className="aboutPage__barKey">STATUS</span>
        <span className="aboutPage__barVal aboutPage__barVal--status" key={status}>
          {status}
        </span>
      </span>
      <span className="aboutPage__barCell aboutPage__barCell--theme">
        <span className="aboutPage__barKey">THEME</span>
        <span className="aboutPage__barVal aboutPage__barVal--cream">DARK</span>
      </span>
      <span className="aboutPage__barCell aboutPage__barCell--time">
        <span className="aboutPage__barKey">IST</span>
        <span className="aboutPage__barVal">{time}</span>
      </span>
    </footer>
  );
}
