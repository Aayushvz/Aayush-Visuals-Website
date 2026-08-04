"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import { OVER, clamp, resolveShot, runUpDelay, verdict } from "./engine";
import type { Delivery, ShotResult } from "./engine";
import { isMuted, playCrowd, playHit, playRelease, playStumps, setMuted, unlockAudio } from "./sound";
import {
  buildScene,
  paintBatter,
  paintBowler,
  paintField,
  paintFielders,
  paintForegroundGrass,
  paintSky,
  paintStadium,
  paintStumps,
} from "./scene";
import type { Scene } from "./scene";
import "./cricket.css";

/*
  A one-over batting game.

  Two halves that deliberately do not share a rendering strategy. The pitch,
  the ball and its trail live on a canvas driven by one requestAnimationFrame
  loop, because they change every frame and the DOM is the wrong tool for
  that. Everything a person reads — score, commentary, the wagon wheel, the
  result — is real DOM and SVG, so it stays selectable, translatable and
  legible to a screen reader.

  Game state lives in refs rather than React state. The loop reads it sixty
  times a second and a setState per frame would re-render the HUD sixty
  times a second to display numbers that mostly have not changed. React
  state is used only where the UI genuinely changes: the ball number, the
  score, the last result and the phase.
*/

type Phase = "idle" | "runup" | "flight" | "resolved" | "over";

/** where a scoring shot went, for the wagon wheel */
type Plot = { direction: number; runs: number };

const BALLS = OVER.length;

export default function CricketGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [ballIdx, setBallIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [last, setLast] = useState<ShotResult | null>(null);
  const [out, setOut] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* --- loop-owned state: never triggers a render --- */
  const phaseRef = useRef<Phase>("idle");
  const deliveryRef = useRef<Delivery>(OVER[0]);
  const releaseAtRef = useRef(0);
  const swungRef = useRef(false);
  /** -1 (leg side) to 1 (off side); pointer, touch or arrow keys all feed it */
  const aimRef = useRef(0);
  /** the struck ball's flight, so the shot can be watched rather than cut to */
  const shotRef = useRef<{ at: number; dir: number; power: number } | null>(null);
  const trailRef = useRef<{ x: number; y: number; r: number }[]>([]);
  const shakeRef = useRef(0);
  const rafRef = useRef(0);
  const reducedRef = useRef(false);
  /* the static world, rebuilt only when the canvas resizes */
  const sceneRef = useRef<Scene | null>(null);
  /* 0 = stance, 1 = full follow through; eased toward on contact */
  const swingAnimRef = useRef(0);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      reducedRef.current = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* ---------------- the over ---------------- */

  const bowl = useCallback(
    (index: number) => {
      const delivery = OVER[index];
      deliveryRef.current = delivery;
      swungRef.current = false;
      shotRef.current = null;
      trailRef.current = [];
      swingAnimRef.current = 0;
      setLast(null);
      setBallIdx(index);
      setPhaseBoth("runup");

      const delay = reducedRef.current ? 700 : runUpDelay();
      window.setTimeout(() => {
        /* the player may have left, or restarted, during the run-up */
        if (phaseRef.current !== "runup") return;
        releaseAtRef.current = performance.now();
        setPhaseBoth("flight");
        playRelease();
      }, delay);
    },
    [setPhaseBoth]
  );

  const finishBall = useCallback(
    (result: ShotResult) => {
      setLast(result);
      setPhaseBoth("resolved");

      if (result.contact === "wicket") {
        playStumps();
        setOut(true);
        window.setTimeout(() => setPhaseBoth("over"), 1500);
        return;
      }

      const quality =
        result.contact === "six" ? 1 : result.contact === "four" ? 0.72 : result.contact === "single" ? 0.4 : 0.16;
      playHit({ quality });
      if (result.runs >= 4) playCrowd(result.contact === "six" ? 1 : 0.55);

      setScore((s) => s + result.runs);
      if (result.runs > 0) setPlots((p) => [...p, { direction: result.direction, runs: result.runs }]);
      if (result.contact === "six" && !reducedRef.current) shakeRef.current = 1;

      const next = ballIdx + 1;
      window.setTimeout(() => {
        if (next >= BALLS) setPhaseBoth("over");
        else bowl(next);
      }, 1600);
    },
    [ballIdx, bowl, setPhaseBoth]
  );

  /*
    A swing. Only meaningful in flight; anywhere else it is either the
    button that starts the over or an idle click on the pitch.
  */
  const swing = useCallback(() => {
    unlockAudio();

    if (phaseRef.current === "idle" || phaseRef.current === "over") return;
    if (phaseRef.current !== "flight" || swungRef.current) return;

    swungRef.current = true;
    swingAnimRef.current = 0.0001;
    const delivery = deliveryRef.current;
    const ideal = releaseAtRef.current + delivery.travelMs;
    const offset = performance.now() - ideal;
    const result = resolveShot(delivery, offset, aimRef.current);

    if (result.contact !== "wicket") {
      shotRef.current = {
        at: performance.now(),
        dir: result.direction,
        power: result.runs >= 6 ? 1 : result.runs >= 4 ? 0.75 : 0.45,
      };
    }
    finishBall(result);
  }, [finishBall]);

  const start = useCallback(() => {
    unlockAudio();
    setScore(0);
    setPlots([]);
    setOut(false);
    setLast(null);
    bowl(0);
  }, [bowl]);

  /* ---------------- input ---------------- */

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const readAim = (clientX: number) => {
      const r = stage.getBoundingClientRect();
      aimRef.current = clamp(((clientX - r.left) / r.width) * 2 - 1, -1, 1);
    };

    const onPointerMove = (e: PointerEvent) => readAim(e.clientX);
    const onPointerDown = (e: PointerEvent) => {
      /* the whole pitch is the bat, but the controls sitting on top of it
         are not: without this, pressing "Bat again" also plays a shot at
         whatever the next ball turns out to be */
      if ((e.target as HTMLElement)?.closest("button, a")) return;
      readAim(e.clientX);
      swing();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        aimRef.current = clamp(aimRef.current - 0.18, -1, 1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowRight") {
        aimRef.current = clamp(aimRef.current + 0.18, -1, 1);
        e.preventDefault();
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        /* the start and replay buttons handle their own Enter/Space */
        if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
        e.preventDefault();
        swing();
      }
    };

    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [swing]);

  /*
    A ball that arrives and is ignored is out, not a free pass. Checked on a
    timer rather than in the draw loop so it still fires if the tab is
    backgrounded mid-delivery and rAF stops.
  */
  useEffect(() => {
    if (phase !== "flight") return;
    const d = deliveryRef.current;
    const id = window.setTimeout(() => {
      if (phaseRef.current === "flight" && !swungRef.current) {
        swungRef.current = true;
        finishBall(resolveShot(d, null, 0));
      }
    }, d.travelMs + d.windows.contact + 40);
    return () => window.clearTimeout(id);
  }, [phase, finishBall]);

  /* ---------------- rendering ---------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const r = stage.getBoundingClientRect();
      /* capped: a 3x phone display gains nothing here and costs fill rate */
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sceneRef.current = buildScene(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const scene = sceneRef.current;
      if (!scene) return;
      const d = deliveryRef.current;
      const phase = phaseRef.current;
      const horizon = scene.horizon;
      const batY = h * 0.86;
      const cx = scene.cx;

      ctx.save();
      if (shakeRef.current > 0.01) {
        const s = shakeRef.current * 8;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        shakeRef.current *= 0.88;
      }

      paintSky(ctx, scene, now);
      paintStadium(ctx, scene);
      paintField(ctx, scene);
      paintFielders(ctx, scene);
      paintStumps(ctx, scene, phase === "resolved" && swungRef.current && trailRef.current.length === 0);

      /* the bowler only exists between the run-up and release */
      if (phase === "runup") paintBowler(ctx, scene, 0.5 + Math.sin(now / 120) * 0.25);
      else if (phase === "flight") paintBowler(ctx, scene, 1);

      if (phase === "flight" || (phase === "resolved" && !shotRef.current)) {
        const p = clamp((now - releaseAtRef.current) / d.travelMs, 0, 1.12);
        const pos = ballAt(p, d, w, h, horizon, batY, cx);
        pushTrail(trailRef.current, pos, reducedRef.current);
        paintTrail(ctx, trailRef.current);
        paintBall(ctx, pos);
      }

      if (shotRef.current) {
        const st = shotRef.current;
        const t = clamp((now - st.at) / 900, 0, 1);
        const x = cx + st.dir * w * 0.95 * t;
        const y = batY - Math.sin(t * Math.PI) * h * (0.4 + st.power * 0.45) - t * h * 0.22;
        const r = 14 * (1 - t * 0.8);
        pushTrail(trailRef.current, { x, y, r }, reducedRef.current);
        paintTrail(ctx, trailRef.current);
        if (t < 1) paintBall(ctx, { x, y, r });
      }

      /* the batter eases into the follow through, then holds it */
      if (swingAnimRef.current > 0) swingAnimRef.current = Math.min(1, swingAnimRef.current + 0.11);
      paintBatter(ctx, scene, swingAnimRef.current, now);
      paintAim(ctx, w, batY, cx, aimRef.current, phase === "flight");
      paintForegroundGrass(ctx, scene);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  useEffect(() => setMutedState(isMuted()), []);

  const delivery = OVER[ballIdx];
  const finalVerdict = verdict(score, out ? ballIdx + 1 : BALLS, out);

  return (
    <div className="ckt">
      <div className="ckt-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="ckt-canvas" aria-hidden="true" />
      </div>

      <PageLink className="ckt-glass ckt-brand" href="/">
        Aayush Visuals
      </PageLink>

      <div className="ckt-glass ckt-board" role="status" aria-live="polite">
        <span className="ckt-score">
          {score}
          <span className="ckt-score-sub">{out ? "-1" : "-0"}</span>
        </span>
        <span className="ckt-divider" aria-hidden="true" />
        <span className="ckt-meta">
          <span className="ckt-meta-label">Balls</span>
          <span className="ckt-meta-value">
            {out || phase === "over" ? BALLS : ballIdx + (phase === "idle" ? 0 : 1)}/{BALLS}
          </span>
        </span>
        <span className="ckt-divider" aria-hidden="true" />
        <span className="ckt-meta">
          <span className="ckt-meta-label">Bowling</span>
          <span className="ckt-meta-value">{phase === "idle" ? "TO COME" : delivery.label}</span>
        </span>
      </div>

      <div className="ckt-glass ckt-controls">
        <button
          type="button"
          className="ckt-icon"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          title={muted ? "Sound off" : "Sound on"}
        >
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
        <PageLink className="ckt-icon" href="/work" aria-label="Leave the game">
          <CloseIcon />
        </PageLink>
      </div>

      {last && phase !== "over" && (
        <p className={`ckt-shout ckt-shout--${last.contact}`}>
          {last.contact === "six" && "SIX"}
          {last.contact === "four" && "FOUR"}
          {last.contact === "single" && `${last.runs}`}
          {last.contact === "dot" && "DOT"}
          {last.contact === "wicket" && "OUT"}
        </p>
      )}

      <div className="ckt-glass ckt-say">
        <p className="ckt-commentary">
          {last
            ? last.commentary
            : phase === "flight"
              ? "Watch it."
              : phase === "runup"
                ? "In his run-up."
                : phase === "idle"
                  ? "Middle and leg, and settle in."
                  : ""}
        </p>

        {last && last.contact !== "wicket" && (
          <p className="ckt-timing">
            <span
              className="ckt-timing-bar"
              style={
                {
                  "--ckt-off": `${clamp(last.offset / delivery.windows.contact, -1, 1) * 50 + 50}%`,
                } as React.CSSProperties
              }
            >
              <i />
            </span>
            <span className="ckt-timing-label">
              {Math.abs(last.offset) <= delivery.windows.perfect
                ? "Perfect"
                : last.offset < 0
                  ? `${Math.round(-last.offset)}ms early`
                  : `${Math.round(last.offset)}ms late`}
            </span>
          </p>
        )}
      </div>

      <div className="ckt-glass ckt-wheel">
        <span className="ckt-wheel-label">Wagon wheel</span>
        <Wagon plots={plots} />
      </div>

      {phase === "idle" && (
        <div className="ckt-glass ckt-card">
          <p className="ckt-kicker">Face one over</p>
          <h1 className="ckt-title">
            Six balls.
            <br />
            One innings.
          </h1>
          <p className="ckt-rule">
            Click, tap or press Space as the ball reaches you. Time it well for runs, and where
            you aim decides where it goes. Get out and the over ends there.
          </p>
          <div className="ckt-actions">
            <button type="button" className="ckt-cta" onClick={start}>
              Take guard
            </button>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="ckt-glass ckt-card">
          <p className="ckt-kicker">{out ? "Over ended early" : "Over complete"}</p>
          <h2 className="ckt-title ckt-title--result">{finalVerdict.title}</h2>
          <p className="ckt-final">
            {score} <span>off {out ? ballIdx + 1 : BALLS}</span>
          </p>
          <p className="ckt-rule">{finalVerdict.note}</p>
          <div className="ckt-actions">
            <button type="button" className="ckt-cta" onClick={start}>
              Bat again
            </button>
            <PageLink className="ckt-link" href="/work">
              See the actual work
            </PageLink>
          </div>
        </div>
      )}

      <p className="ckt-hint">
        {reduced ? "Reduced motion is on" : "Arrow keys aim · Space plays the shot"}
      </p>
    </div>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 8v4h3l4 3V5L7 8H4Z" fill="currentColor" />
      <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.8 5.2a6.8 6.8 0 0 1 0 9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 8v4h3l4 3V5L7 8H4Z" fill="currentColor" />
      <path d="M13.5 8l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}


/* ---------------- wagon wheel ---------------- */

function Wagon({ plots }: { plots: Plot[] }) {
  return (
    <svg className="ckt-wagon" viewBox="0 0 120 66" aria-label={`Wagon wheel, ${plots.length} scoring shots`}>
      <path d="M4 62 A56 56 0 0 1 116 62" className="ckt-wagon-edge" />
      <line x1="60" y1="62" x2="60" y2="10" className="ckt-wagon-grid" />
      <line x1="60" y1="62" x2="14" y2="30" className="ckt-wagon-grid" />
      <line x1="60" y1="62" x2="106" y2="30" className="ckt-wagon-grid" />
      {plots.map((p, i) => {
        /* -1..1 maps across a half circle, straight down the ground at 0 */
        const angle = (-Math.PI / 2) + p.direction * (Math.PI / 2) * 0.92;
        const len = p.runs >= 6 ? 54 : p.runs >= 4 ? 46 : 28;
        return (
          <line
            key={i}
            x1="60"
            y1="62"
            x2={60 + Math.cos(angle) * len}
            y2={62 + Math.sin(angle) * len}
            className={`ckt-wagon-shot ckt-wagon-shot--${p.runs}`}
          />
        );
      })}
      <circle cx="60" cy="62" r="2" className="ckt-wagon-pin" />
    </svg>
  );
}

/* ---------------- canvas painting ---------------- */

function ballAt(
  p: number,
  d: Delivery,
  w: number,
  h: number,
  horizon: number,
  batY: number,
  cx: number
) {
  /* depth accelerates: the ball eats the last third of the pitch fast, which
     is what makes a yorker feel like a yorker */
  const depth = Math.pow(clamp(p, 0, 1.12), 1.7);
  const arriveY = batY - h * 0.24 * d.bounce;
  const pitchAt = 0.62;

  let y = horizon + (arriveY - horizon) * depth;
  if (p < pitchAt) y += Math.sin((p / pitchAt) * Math.PI) * h * 0.03;
  else y -= Math.sin(((p - pitchAt) / (1 - pitchAt)) * Math.PI) * h * 0.07 * d.bounce;

  const x = cx + d.swing * w * Math.pow(clamp(p, 0, 1), 1.4);
  const r = 2.5 + 11 * depth;
  return { x, y, r };
}

function pushTrail(trail: { x: number; y: number; r: number }[], pos: { x: number; y: number; r: number }, reduced: boolean) {
  if (reduced) {
    trail.length = 0;
    return;
  }
  trail.push({ ...pos });
  if (trail.length > 14) trail.shift();
}

function paintTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number; r: number }[]) {
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = (i / trail.length) * 0.32;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * (0.35 + (i / trail.length) * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,240,225,${a})`;
    ctx.fill();
  }
}

function paintBall(ctx: CanvasRenderingContext2D, pos: { x: number; y: number; r: number }) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, pos.r + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,120,60,0.16)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
  ctx.fillStyle = "#e2452a";
  ctx.fill();

  /* the seam, so spin reads as spin rather than a sliding dot */
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, pos.r * 0.32, pos.r, 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(0.6, pos.r * 0.12);
  ctx.stroke();
}

/* the guide showing where the shot is aimed, only while a ball is live */
function paintAim(ctx: CanvasRenderingContext2D, w: number, batY: number, cx: number, aim: number, live: boolean) {
  const x = cx + aim * w * 0.42;
  ctx.globalAlpha = live ? 0.55 : 0.22;
  ctx.beginPath();
  ctx.moveTo(cx, batY);
  ctx.lineTo(x, batY - 46);
  ctx.strokeStyle = "#f6e7c8";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
