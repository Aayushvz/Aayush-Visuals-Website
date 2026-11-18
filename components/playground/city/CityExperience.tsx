"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXPERIMENTS } from "../experiments";
import { descentCards } from "../descent/cards";
import { CityAudio } from "./audio";
import { CityEngine, type GameState } from "./engine";
import { DISCOVERIES, type Discovery } from "./world";
import "./city.css";

/*
  City of Creators — the shell around the game.

  The engine owns the frame; this owns everything the visitor reads. The
  two meet at `onState`, which fires only when the HUD's content actually
  changes (the nearby building, the found count), never per frame.

  The engine is constructed on START, not on mount, so arriving at the
  route costs nothing until the visitor asks to play — and `destroy()` on
  unmount takes the loop and every listener with it.
*/

type Phase = "intro" | "playing";

export default function CityExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CityEngine | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState<GameState | null>(null);
  const [open, setOpen] = useState<Discovery | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<CityAudio | null>(null);

  /* the real project copy, reused from the playground data so a discovery
     shows the actual experiment rather than a stub */
  const cards = useMemo(() => descentCards(EXPERIMENTS), []);
  const cardFor = useCallback(
    (id: string) => cards.find((c) => c.id === id) ?? null,
    [cards]
  );

  /* size the backing store to the element so pixels stay square */
  const fit = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const scale = r.width < 700 ? 2 : 3;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    cv.dataset.scale = String(scale);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const cv = canvasRef.current;
    if (!cv) return;

    fit();
    /* built here, not on mount: an AudioContext created before a user
       gesture is born suspended and never recovers on some browsers */
    const audio = new CityAudio();
    audio.init();
    audioRef.current = audio;

    const engine = new CityEngine({
      canvas: cv,
      onState: setHud,
      onEnter: (d) => {
        engine.paused = true;
        audio.discover();
        setOpen(d);
      },
    });
    engine.audio = audio;
    engineRef.current = engine;
    engine.start();

    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      engine.destroy();
      audio.destroy();
      audioRef.current = null;
      engineRef.current = null;
    };
  }, [phase, fit]);

  const closePanel = useCallback(() => {
    const e = engineRef.current;
    if (e && open) {
      e.markFound(open.id);
      e.paused = false;
    }
    setOpen(null);
  }, [open]);

  /* Escape closes the panel; the engine stays paused until it does */
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  const found = hud?.found.length ?? 0;
  const card = open ? cardFor(open.id) : null;

  return (
    <div className="coc">
      {phase === "intro" ? (
        <div className="coc__intro">
          <p className="coc__kicker">Aayush Visuals — Playground</p>
          <h1 className="coc__title">City of Creators</h1>
          <p className="coc__sub">An open world. Endless discoveries.</p>
          <p className="coc__body">
            Explore the city and find the eight things I built. They are
            hidden in the buildings, marked with a beacon.
          </p>
          <div className="coc__actions">
            <button className="coc__btn coc__btn--go" onClick={() => setPhase("playing")}>
              Start exploring
            </button>
            <a className="coc__btn" href="/playground">
              Back to Playground
            </a>
          </div>
          <dl className="coc__keys">
            <div><dt>WASD</dt><dd>Move</dd></div>
            <div><dt>Shift</dt><dd>Sprint</dd></div>
            <div><dt>E</dt><dd>Enter a building</dd></div>
            <div><dt>Esc</dt><dd>Close</dd></div>
          </dl>
        </div>
      ) : (
        <div className="coc__stage">
          <canvas className="coc__canvas" ref={canvasRef} />

          <div className="coc__hud coc__hud--tl">
            <span className="coc__district">{hud?.district ?? "Downtown"}</span>
            <span className="coc__found">{found} / {DISCOVERIES.length} found</span>
          </div>

          <div className="coc__hud coc__hud--tr">
            <button
              className="coc__sound"
              onClick={() => {
                const m = !muted;
                setMuted(m);
                audioRef.current?.setMuted(m);
              }}
              aria-pressed={muted}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
            <a className="coc__exit" href="/playground">
              Exit
            </a>
          </div>

          {hud?.nearby && !open ? (
            <div className="coc__prompt">
              <kbd>E</kbd>
              <span>{hud.nearby.label}</span>
            </div>
          ) : null}

          <button
            className="coc__touch coc__touch--act"
            onClick={() => engineRef.current?.interact()}
            aria-label="Interact"
          >
            E
          </button>
          <Stick engineRef={engineRef} />

          {open ? (
            <div className="coc__panel" role="dialog" aria-label={open.title}>
              <div className="coc__panelInner">
                <p className="coc__panelKicker">{open.label} — discovery</p>
                <h2 className="coc__panelTitle">{card?.title ?? open.title}</h2>
                {card?.poster ? (
                  <img className="coc__panelShot" src={card.poster} alt="" />
                ) : null}
                <p className="coc__panelKind">{card?.kind}</p>
                <p className="coc__panelBlurb">{card?.blurb}</p>
                <div className="coc__panelActions">
                  {card?.href ? (
                    <a className="coc__btn coc__btn--go" href={card.href}>
                      Open the real thing
                    </a>
                  ) : null}
                  <button className="coc__btn" onClick={closePanel}>
                    Back to the city
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
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
