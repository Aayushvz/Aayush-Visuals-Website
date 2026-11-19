"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LogoMark from "@/components/LogoMark";
import { EXPERIMENTS } from "../experiments";
import { descentCards } from "../descent/cards";
import { CityAudio } from "./audio";
import { CityEngine, type GameState } from "./engine";
import { DISCOVERIES, type Discovery } from "./world";
import GameBoy from "./GameBoy";
import "./city.css";

/*
  Playground City — Interactive open-world pixel portfolio.

  Hosts all 8 projects and experiments in a living pixel-art city with:
  - Day & Night lighting simulation
  - Tactile retro Game Boy console drawer for music and direct work access
  - Polished streets with vehicle variants and realistic character design
*/

type CityExperienceProps = {
  initialSound?: boolean;
  initialGameBoy?: boolean;
};

export default function CityExperience({
  initialSound = true,
  initialGameBoy = false,
}: CityExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CityEngine | null>(null);
  const [hud, setHud] = useState<GameState | null>(null);
  const [open, setOpen] = useState<Discovery | null>(null);
  const [gameBoyOpen, setGameBoyOpen] = useState(initialGameBoy);
  const [muted, setMuted] = useState(!initialSound);
  const audioRef = useRef<CityAudio | null>(null);

  const cards = useMemo(() => descentCards(EXPERIMENTS), []);
  const cardFor = useCallback(
    (id: string) => cards.find((c) => c.id === id) ?? null,
    [cards]
  );

  const fit = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const scale = r.width < 520 ? 2 : r.width < 700 ? 2 : 3;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    cv.dataset.scale = String(scale);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    fit();
    const audio = new CityAudio();
    audio.init();
    if (!initialSound) {
      audio.setMuted(true);
    }
    audioRef.current = audio;

    const engine = new CityEngine({
      canvas: cv,
      onState: setHud,
      onEnter: (d) => {
        engine.paused = true;
        setGameBoyOpen(false);
        audio.discover();
        setOpen(d);
      },
      onToggleGameBoy: () => {
        setGameBoyOpen((prev) => {
          const next = !prev;
          if (next && open) {
            closePanel();
          }
          if (engineRef.current) engineRef.current.paused = next;
          audioRef.current?.playSelect();
          return next;
        });
      },
    });

    engine.audio = audio;
    engineRef.current = engine;
    engine.start();

    /*
      Lock the document for as long as the city is open.

      The canvas is a fixed layer, but the page underneath it can still
      rubber-band on a touch drag, and what shows through the gap is the
      site's own light background — a white band down the edge of a
      night city. Scoped CSS cannot reach <html>, so it is set here and
      put back verbatim on unmount.
    */
    const root = document.documentElement;
    const prev = {
      overflow: root.style.overflow,
      overscroll: root.style.overscrollBehavior,
      background: root.style.background,
      scheme: root.style.colorScheme,
    };
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    root.style.background = "#0a0c1e";
    root.style.colorScheme = "dark";

    window.addEventListener("resize", fit);
    return () => {
      root.style.overflow = prev.overflow;
      root.style.overscrollBehavior = prev.overscroll;
      root.style.background = prev.background;
      root.style.colorScheme = prev.scheme;
      window.removeEventListener("resize", fit);
      engine.destroy();
      audio.destroy();
      audioRef.current = null;
      engineRef.current = null;
    };
  }, [fit]);

  const closePanel = useCallback(() => {
    const e = engineRef.current;
    if (e && open) {
      e.markFound(open.id);
      e.paused = false;
    }
    setOpen(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  const toggleGameBoy = () => {
    setGameBoyOpen((prev) => {
      const next = !prev;
      if (next && open) {
        closePanel();
      }
      if (engineRef.current) engineRef.current.paused = next;
      audioRef.current?.playSelect();
      return next;
    });
  };

  const isDay = hud?.isDay ?? false;
  const found = hud?.found.length ?? 0;
  const card = open ? cardFor(open.id) : null;

  return (
    <div className={`coc ${isDay ? "is-day" : "is-night"}`}>
      <div className="coc__stage">
        <canvas className="coc__canvas" ref={canvasRef} />

        {/* Top Navbar Header — Two HUD Pills on Desktop, Single Unified Frame on Mobile */}
        <header className="coc__navBar">
          {/* Left HUD: aayushvz logo, district, and explored count */}
          <div className="coc__hud coc__hud--tl">
            <a href="/" className="coc__logoLink" aria-label="Aayush Visuals, Home" title="Home">
              <LogoMark className="coc__logoMark" />
            </a>
            <span className="coc__divider" aria-hidden="true" />
            <span className="coc__district">{hud?.district ?? "Downtown"}</span>
            <span className="coc__found">
              {found} / {DISCOVERIES.length} explored
            </span>
          </div>

          {/* Right HUD: Exit icon, Game Boy icon, Sound icon, Nightmode icon, Contact button */}
          <div className="coc__hud coc__hud--tr">
            {/* Exit Icon */}
            <a
              className="coc__iconBtn coc__iconBtn--exit"
              href="/"
              aria-label="Exit to home"
              title="Exit to home"
            >
              <svg
                viewBox="0 0 16 16"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
                <path d="M10 11l3-3-3-3" />
                <path d="M13 8H5" />
              </svg>
            </a>

            {/* Game Boy Icon */}
            <button
              className={`coc__iconBtn coc__iconBtn--gb ${gameBoyOpen ? "is-active" : ""}`}
              onClick={toggleGameBoy}
              aria-label="Open Game Boy controller"
              title="Open Game Boy controller [G]"
            >
              <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
                <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="#d9dbdf" stroke="#101424" strokeWidth="0.8" />
                <rect x="3.8" y="2.8" width="8.4" height="5.2" rx="0.5" fill="#4a5568" />
                <rect x="5.2" y="3.6" width="5.6" height="3.6" fill="#9bbc0f" />
                <circle cx="4.4" cy="4.2" r="0.4" fill="#e63946" />
                <path d="M4.5 10.5h3m-1.5-1.5v3" stroke="#1a202c" strokeWidth="1" strokeLinecap="square" />
                <circle cx="10.8" cy="10" r="0.7" fill="#d6273c" />
                <circle cx="9.6" cy="11.2" r="0.7" fill="#1e40af" />
              </svg>
            </button>

            {/* Sound Toggle Icon */}
            <button
              className={`coc__iconBtn coc__iconBtn--sound ${!muted ? "is-active" : ""}`}
              onClick={() => {
                const m = !muted;
                setMuted(m);
                audioRef.current?.setMuted(m);
              }}
              aria-pressed={!muted}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              title={muted ? "Turn sound on [M]" : "Turn sound off [M]"}
            >
              <svg
                viewBox="0 0 16 16"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor" stroke="none" />
                {muted ? (
                  <>
                    <path d="M11 6l3 4" />
                    <path d="M14 6l-3 4" />
                  </>
                ) : (
                  <>
                    <path d="M11.5 5.5c1 1.2 1 3.8 0 5" />
                    <path d="M13.5 3.5c2 2.5 2 6.5 0 9" />
                  </>
                )}
              </svg>
            </button>

            {/* Night / Day Mode Icon */}
            <button
              className="coc__iconBtn coc__iconBtn--day"
              onClick={() => {
                engineRef.current?.toggleDayNight();
                audioRef.current?.playSelect();
              }}
              aria-label={isDay ? "Switch to Night mode" : "Switch to Day mode"}
              title={isDay ? "Switch to Night mode [T]" : "Switch to Day mode [T]"}
            >
              <span className="coc__dayEmoji" aria-hidden="true">
                {isDay ? "☀️" : "🌙"}
              </span>
            </button>

            {/* Normal Contact Button */}
            <a
              className="coc__contactBtn"
              href="/contact"
              aria-label="Contact Aayush"
            >
              Contact
            </a>
          </div>
        </header>

        {/* Bottom Left Floating Game Boy Access Button (Icon with Outline Only, No Box Frame) */}
        <button
          className={`coc__bottomGameBoyBtn ${gameBoyOpen ? "is-active" : ""}`}
          onClick={toggleGameBoy}
          aria-label="Toggle Game Boy console"
          title="Toggle Spidey Tracker Game Boy [G]"
        >
          <span className="coc__bottomGameBoyIcon" aria-hidden="true">
            <svg viewBox="0 0 32 50" width="58" height="90" fill="none">
              {/* Outer Game Boy Chassis with Beveled Bottom-Right Corner & Crisp Red Outline */}
              <path
                d="M 4.5 1.5 L 27.5 1.5 A 3 3 0 0 1 30.5 4.5 L 30.5 41 L 24.5 48.5 L 4.5 48.5 A 3 3 0 0 1 1.5 45.5 L 1.5 4.5 A 3 3 0 0 1 4.5 1.5 Z"
                fill="#a81726"
                stroke="#e62838"
                strokeWidth="1.6"
              />
              {/* Top Bezel Highlight & Ridge */}
              <line x1="4.5" y1="3.5" x2="27.5" y2="3.5" stroke="#ff4d5e" strokeWidth="0.8" opacity="0.65" />
              <line x1="4.5" y1="4.8" x2="27.5" y2="4.8" stroke="#78101a" strokeWidth="0.6" />

              {/* Screen Bezel */}
              <rect x="4" y="6.5" width="24" height="18.5" rx="2" fill="#161f33" stroke="#0a0e1c" strokeWidth="0.8" />
              {/* LCD Display */}
              <rect x="6.8" y="8.5" width="18.4" height="13.2" rx="1" fill="#38bdf8" />
              {/* Power LED Indicator */}
              <circle cx="5.4" cy="12.5" r="0.8" fill="#ef4444" />
              {/* Spidey Tracker Mask Logo on Top Bezel */}
              <circle cx="16" cy="7.6" r="0.7" fill="#ef4444" />

              {/* D-Pad */}
              <rect x="6" y="31" width="7.5" height="3.2" rx="0.6" fill="#111827" stroke="#000000" strokeWidth="0.4" />
              <rect x="8.15" y="28.85" width="3.2" height="7.5" rx="0.6" fill="#111827" stroke="#000000" strokeWidth="0.4" />
              <circle cx="9.75" cy="32.6" r="0.8" fill="#1f2937" />

              {/* B & A Slanted Action Buttons */}
              <circle cx="21" cy="34" r="2.3" fill="#2563eb" stroke="#0f172a" strokeWidth="0.6" />
              <circle cx="26.2" cy="31.2" r="2.3" fill="#dc2626" stroke="#0f172a" strokeWidth="0.6" />

              {/* Select & Start Pill Buttons */}
              <rect x="9.5" y="41" width="4.5" height="1.6" rx="0.8" fill="#334155" transform="rotate(-25 11.75 41.8)" />
              <rect x="15.8" y="41" width="4.5" height="1.6" rx="0.8" fill="#334155" transform="rotate(-25 18.05 41.8)" />

              {/* Speaker Grill Slots */}
              <line x1="22" y1="43.5" x2="26" y2="43.5" stroke="#6b1019" strokeWidth="0.8" />
              <line x1="23" y1="45.5" x2="27" y2="45.5" stroke="#6b1019" strokeWidth="0.8" />
            </svg>
          </span>
        </button>

        {/* Interaction Prompt (Tappable on mobile to interact!) */}
        {hud?.nearby && !open && !gameBoyOpen ? (
          <div
            className="coc__prompt"
            onClick={() => engineRef.current?.interact()}
            role="button"
            tabIndex={0}
            aria-label={`Enter ${hud.nearby.label}`}
          >
            <kbd>E</kbd>
            <span>{hud.nearby.label}</span>
          </div>
        ) : null}

        {/* Mobile touch controls */}
        <button
          className="coc__touch coc__touch--act"
          onClick={() => engineRef.current?.interact()}
          aria-label="Interact"
        >
          E
        </button>
        <Stick engineRef={engineRef} />

        {/* Mobile Right-Bottom Action Stack (from bottom to top: Minimap -> Game Boy -> Day/Night -> Sound) */}
        <div className="coc__mobileActions" aria-label="Mobile Controls">
          {/* Sound Toggle (Top) */}
          <button
            className={`coc__mobileBtn coc__mobileBtn--sound ${!muted ? "is-active" : ""}`}
            onClick={() => {
              const m = !muted;
              setMuted(m);
              audioRef.current?.setMuted(m);
            }}
            aria-pressed={!muted}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            title={muted ? "Turn sound on" : "Turn sound off"}
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor" stroke="none" />
              {muted ? (
                <>
                  <path d="M11 6l3 4" />
                  <path d="M14 6l-3 4" />
                </>
              ) : (
                <>
                  <path d="M11.5 5.5c1 1.2 1 3.8 0 5" />
                  <path d="M13.5 3.5c2 2.5 2 6.5 0 9" />
                </>
              )}
            </svg>
          </button>

          {/* Darkmode / Lightmode Toggle (Middle) */}
          <button
            className="coc__mobileBtn coc__mobileBtn--day"
            onClick={() => {
              engineRef.current?.toggleDayNight();
              audioRef.current?.playSelect();
            }}
            aria-label={isDay ? "Switch to Night mode" : "Switch to Day mode"}
            title={isDay ? "Switch to Night mode" : "Switch to Day mode"}
          >
            <span className="coc__dayEmoji" aria-hidden="true">
              {isDay ? "☀️" : "🌙"}
            </span>
          </button>

          {/* Game Boy Button (Bottom, directly above minimap) */}
          <button
            className={`coc__mobileBtn coc__mobileBtn--gb ${gameBoyOpen ? "is-active" : ""}`}
            onClick={toggleGameBoy}
            aria-label="Toggle Game Boy console"
            title="Toggle Game Boy console [G]"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
              <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="#d9dbdf" stroke="#101424" strokeWidth="0.8" />
              <rect x="3.8" y="2.8" width="8.4" height="5.2" rx="0.5" fill="#4a5568" />
              <rect x="5.2" y="3.6" width="5.6" height="3.6" fill="#9bbc0f" />
              <circle cx="4.4" cy="4.2" r="0.4" fill="#e63946" />
              <path d="M4.5 10.5h3m-1.5-1.5v3" stroke="#1a202c" strokeWidth="1" strokeLinecap="square" />
              <circle cx="10.8" cy="10" r="0.7" fill="#d6273c" />
              <circle cx="9.6" cy="11.2" r="0.7" fill="#1e40af" />
            </svg>
          </button>
        </div>

        {/* Discovery Detail Side Panel (Docked on Right Side, No Blurry Fog) */}
        {open ? (
          <>
            <div
              className="coc__panelBackdrop"
              onClick={closePanel}
              aria-hidden="true"
            />
            <aside
              className="coc__panel"
              role="dialog"
              aria-label={open.title}
              onClick={(e) => {
                if (e.target === e.currentTarget) closePanel();
              }}
            >
              <div
                className="coc__panelInner"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="coc__panelClose"
                  onClick={closePanel}
                  aria-label="Close project panel"
                  title="Close [Esc]"
                >
                  ✕
                </button>
                <div className="coc__panelHeader">
                  <span className="coc__panelBadge">📍 {open.label}</span>
                  <span className="coc__panelDistrict">Downtown Studio</span>
                </div>
                <h2 className="coc__panelTitle">{card?.title ?? open.title}</h2>
                {card?.poster ? (
                  <div className="coc__panelShotWrap">
                    <img className="coc__panelShot" src={card.poster} alt={card.title} />
                  </div>
                ) : null}
                {card?.kind ? <p className="coc__panelKind">{card.kind}</p> : null}
                <p className="coc__panelBlurb">{card?.blurb}</p>
                <div className="coc__panelActions">
                  {card?.href ? (
                    <a className="coc__btn coc__btn--go" href={card.href} target="_blank" rel="noopener noreferrer">
                      Open Project ↗
                    </a>
                  ) : null}
                  <button type="button" className="coc__btn coc__btn--back" onClick={closePanel}>
                    Back to City
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : null}

        {/* Interactive Game Boy Drawer */}
        <GameBoy
          isOpen={gameBoyOpen}
          onClose={() => {
            setGameBoyOpen(false);
            if (engineRef.current) engineRef.current.paused = false;
          }}
          audio={audioRef.current}
          discoveries={DISCOVERIES}
          found={hud?.found ?? []}
          isDay={isDay}
          onToggleDay={() => engineRef.current?.toggleDayNight()}
          onWarp={(tx, ty) => engineRef.current?.teleportTo(tx, ty)}
          onOpenWork={(id) => {
            const d = DISCOVERIES.find((x) => x.id === id);
            if (d && engineRef.current) {
              engineRef.current.paused = true;
              audioRef.current?.discover();
              setOpen(d);
            }
          }}
          district={hud?.district ?? "Downtown"}
        />
      </div>
    </div>
  );
}

/* ── touch stick ─────────────────────────────────────────────────── */

function Stick({ engineRef }: { engineRef: React.RefObject<CityEngine | null> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const move = (e: React.PointerEvent) => {
    const el = base.current;
    const eng = engineRef.current;
    if (!el || !eng) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, max);
    const nx = (dx / len) * (clamped / max);
    const ny = (dy / len) * (clamped / max);
    eng.stick = { x: nx, y: ny };
    setKnob({ x: (dx / len) * clamped, y: (dy / len) * clamped });
  };

  const end = () => {
    const eng = engineRef.current;
    if (eng) eng.stick = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      className="coc__touch coc__touch--stick"
      ref={base}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span
        className="coc__knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
