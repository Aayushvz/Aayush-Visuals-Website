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
  paintBigScreen,
  paintFloodlights,
  paintStrikerWicket,
  paintStumps,
} from "./scene";
import type { Scene } from "./scene";
import { breakWicket, STANDING, type WicketState } from "./wicket";
import type { TeamKit } from "./spriteKit";
import { preloadBatter, type BatterAction } from "./batterSprites";
import { comboFor, extendsCombo, pickReward, XP_FOR, xpLabel, type Combo } from "./rewards";
import { levelFor, readProgress, writeProgress } from "./progress";
import RewardCard, { type RewardShout } from "./RewardCard";
import ComboPill from "./ComboPill";
import XpBar from "./XpBar";
import Avatar from "./Avatar";
import Ticker from "./Ticker";
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

/*
  `opponent` is the side in the field, which is the OTHER team — you bat
  for the side you picked, so the bowler and the ring wear the opposition
  kit. It defaults to the Panthers so the component still stands up on its
  own outside the match flow.

  `team` is the side you picked, and the striker at the crease wears it. It
  used to be missing entirely: the batter loaded from a single shared folder
  of blue frames while every other figure on the field was already per-team,
  so a Panthers player batted in the Falcons kit against Falcons bowlers.
  The two defaults are opposites for the same standalone reason as above.
*/
export default function CricketGame({
  team = "falcons",
  opponent = "panthers",
  onSwitchTeam,
}: {
  team?: TeamKit;
  opponent?: TeamKit;
  /** hands control back to the shell's team-selection stage */
  onSwitchTeam?: () => void;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  /* what the stadium's big screen is showing, kept in a ref so the paint
     loop can read it without being restarted on every run scored */
  const boardRef = useRef<{ shout: string | null; quote: string }>({
    shout: null,
    quote: "Six balls. One innings.",
  });
  const [menuOpen, setMenuOpen] = useState(false);

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
  const runUpStartRef = useRef(0);
  const runUpMsRef = useRef(1200);
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
  /* which batting animation the current swing plays. resolveShot runs at the
     moment of the swing, so the outcome is already known when the animation
     starts — no need to guess and correct. */
  const swingActionRef = useRef<BatterAction>("defend");
  /* the striker's wicket: standing, or the instant it was broken. Held in
     a ref because the fall is animated by the loop, and a state update per
     frame of it would re-render the HUD for nine hundred milliseconds. */
  const wicketRef = useRef<WicketState>(STANDING);

  /* ---- reward layer ---- */
  const [shout, setShout] = useState<RewardShout | null>(null);
  const [combo, setCombo] = useState<Combo | null>(null);
  const comboRef = useRef(0);
  const [xp, setXp] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  /* what this over alone earned, for the summary card */
  const overXpRef = useRef(0);
  const [overXp, setOverXp] = useState(0);
  const [boundaries, setBoundaries] = useState({ fours: 0, sixes: 0 });
  const shoutIdRef = useRef(0);
  const shoutTimerRef = useRef<number | null>(null);

  /* XP carries across overs, so it loads from storage rather than starting
     at zero every visit */
  useEffect(() => {
    setXp(readProgress().xp);
  }, []);

  useEffect(() => {
    return () => {
      if (shoutTimerRef.current) window.clearTimeout(shoutTimerRef.current);
    };
  }, []);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /* start fetching the batter's frames immediately — they need to be decoded
     before the first ball, not on the first swing */
  useEffect(() => {
    preloadBatter(team);
  }, [team]);

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
      wicketRef.current = STANDING;
      setLast(null);
      setBallIdx(index);
      setPhaseBoth("runup");

      const delay = reducedRef.current ? 700 : runUpDelay();
      /* the run-up's own clock, so the nine-phase delivery cycle can be
         driven by real progress toward the release rather than by a loop
         that has no idea when the ball is due */
      runUpStartRef.current = performance.now();
      runUpMsRef.current = delay;
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

      /* ---- reward, combo and XP, before the wicket early-return so a
         dismissal still gets its card and its XP ---- */
      const { headline, reward } = pickReward(result.contact);
      const gained = XP_FOR[result.contact];

      shoutIdRef.current += 1;
      setShout({
        id: shoutIdRef.current,
        contact: result.contact,
        headline,
        reward,
        xp: gained,
        xpLabel: xpLabel(result.contact),
      });
      if (shoutTimerRef.current) window.clearTimeout(shoutTimerRef.current);
      shoutTimerRef.current = window.setTimeout(() => setShout(null), 1900);

      comboRef.current = extendsCombo(result.contact) ? comboRef.current + 1 : 0;
      setCombo(comboFor(comboRef.current));

      setXp((prev) => {
        const next = prev + gained;
        if (levelFor(next) > levelFor(prev)) {
          setLevelUp(levelFor(next));
          window.setTimeout(() => setLevelUp(null), 2200);
        }
        writeProgress(next);
        return next;
      });
      overXpRef.current += gained;
      setOverXp(overXpRef.current);
      if (result.contact === "four") setBoundaries((b) => ({ ...b, fours: b.fours + 1 }));
      if (result.contact === "six") setBoundaries((b) => ({ ...b, sixes: b.sixes + 1 }));

      if (result.contact === "wicket") {
        /* the ball's own line decides which way the timber goes, so the
           bails follow the delivery rather than always flying the same way */
        wicketRef.current = breakWicket(
          performance.now(),
          deliveryRef.current.swing * 6 + aimRef.current * 0.35
        );
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
    /* a six gets the lofted follow-through, a four the horizontal drive;
       everything else — including the ball that takes the stumps — plays the
       compact defensive shot */
    swingActionRef.current =
      result.contact === "six" ? "six" : result.contact === "four" ? "drive" : "defend";

    if (result.contact !== "wicket") {
      shotRef.current = {
        at: performance.now(),
        dir: result.direction,
        power: result.runs >= 6 ? 1 : result.runs >= 4 ? 0.75 : 0.45,
      };
    }
    finishBall(result);
  }, [finishBall]);

  /* native share sheet where the device has one, clipboard everywhere else */
  const [shared, setShared] = useState(false);
  const share = useCallback(async () => {
    const text = `I scored ${score} off ${out ? ballIdx + 1 : BALLS} in Six Balls — aayushvisuals.com/cricket`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      /* dismissed the sheet, or clipboard blocked — nothing to recover */
    }
  }, [score, out, ballIdx]);

  const start = useCallback(() => {
    unlockAudio();
    setScore(0);
    setPlots([]);
    setOut(false);
    setLast(null);
    /* per-over counters reset; lifetime XP deliberately does not */
    setShout(null);
    setCombo(null);
    comboRef.current = 0;
    overXpRef.current = 0;
    setOverXp(0);
    setBoundaries({ fours: 0, sixes: 0 });
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
      /* towers before the stands, so they rise out of the roofline rather
         than standing on top of the crowd */
      paintFloodlights(ctx, scene);
      paintStadium(ctx, scene);
      /*
        The board reads the score through a ref, not through the closure.

        This loop is started once and runs for the life of the innings; a
        value captured from render would be frozen at whatever it was when
        the effect ran, and the screen would sit on 0-0 all over. The ref is
        written on every state change below.
      */
      paintBigScreen(ctx, scene, boardRef.current, now);
      paintField(ctx, scene);
      paintFielders(ctx, scene, now, opponent);
      paintStumps(ctx, scene, phase === "resolved" && swungRef.current && trailRef.current.length === 0);

      /* the bowler only exists between the run-up and release */
      /*
        The run-up covers 0 to 0.72 of the delivery cycle — 0.72 is where
        the sprite reaches `release`, so the arm comes over exactly as the
        ball is let go rather than at some point near it. The remaining
        follow-through and recovery play out over the ball's flight.

        This used to be `0.5 + sin(now / 120) * 0.25`, which oscillated
        between 0.25 and 0.75 forever. That was fine when the bowler was
        two rectangles and the number only drove a stride, but against a
        nine-pose cycle it jitters between two frames in the middle and
        never plays the bound, the follow-through or the recovery.
      */
      if (phase === "runup") {
        const k = clamp((now - runUpStartRef.current) / runUpMsRef.current, 0, 1);
        paintBowler(ctx, scene, k * 0.72, opponent);
      } else if (phase === "flight") {
        const since = now - releaseAtRef.current;
        paintBowler(ctx, scene, 0.72 + clamp(since / 620, 0, 1) * 0.28, opponent);
      }

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
      /* the delivery's own line, so the stroke is played at the ball rather
         than at the same patch of turf six times an over */
      paintBatter(
        ctx,
        scene,
        swingAnimRef.current,
        now,
        swingActionRef.current,
        team,
        deliveryRef.current.swing
      );
      /* after the batter on purpose — the camera is behind the striker's
         stumps, so they are the nearest thing in frame and his pads pass
         behind them */
      paintStrikerWicket(ctx, scene, now, wicketRef.current);
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

  /*
    Dismiss the menu on an outside click or Escape.

    Escape is bound at capture so it closes the menu before the game's own
    key handling sees it — otherwise the same press that shuts the popover
    would also fall through to the match.
  */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [menuOpen]);

  /*
    Mirror the score into the ref the paint loop reads.

    During render, not in an effect: the canvas is repainted every frame
    regardless, so the board picks this up on the next tick either way, and
    an effect would just add a commit's worth of lag between the run being
    scored and the stadium showing it.
  */
  /*
    The board carries the commentary, not the score.

    The HUD bar sits directly above it showing runs, balls and strike rate;
    a board repeating those is a board saying nothing. What had nowhere to
    live was the shot's own story, which used to be thrown over the middle
    of the pitch on a card. While a shout is live the board shows it with
    the studio line beneath; between deliveries it idles on whatever the
    commentary is currently saying.
  */
  /*
    The board goes dark behind a card.

    `idle` and `over` are the two phases that put a full dialog over the
    pitch, and the board's idle line is the same sentence the intro card
    leads with — so the screen said "Six balls. One innings." twice, once
    on the stadium screen and once on the panel covering it. A real board
    is not showing copy while play is stopped either; it is off.

    Blanked rather than skipped so the panel, its casing and the gantry
    still paint. An unlit screen is part of the stadium; a missing one is
    a hole in it.
  */
  const cardUp = phase === "idle" || phase === "over";

  boardRef.current = {
    shout: cardUp ? null : shout ? shout.headline : null,
    quote: cardUp
      ? ""
      : shout
        ? shout.reward.line
        : last
          ? last.commentary
          : phase === "flight"
            ? "Watch it."
            : phase === "runup"
              ? "In his run-up."
              : "Six balls. One innings.",
  };

  const delivery = OVER[ballIdx];
  const ballsFaced = out || phase === "over" ? (out ? ballIdx + 1 : BALLS) : ballIdx;
  const finalVerdict = verdict(score, out ? ballIdx + 1 : BALLS, out);
  /* runs per hundred balls, the standard cricket figure */
  const strikeRate = ballsFaced > 0 ? Math.round((score / ballsFaced) * 100) : 0;

  return (
    <div className="ckt" data-phase={phase}>
      <div className="ckt-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="ckt-canvas" aria-hidden="true" />
      </div>

      <PageLink className="ckt-glass ckt-brand" href="/">
        <Avatar className="ckt-brand__face" />
        <span className="ckt-brand__name">Aayush VZ</span>
      </PageLink>

      <div className="ckt-glass ckt-board" role="status" aria-live="polite">
        <span className="ckt-score">
          <Ticker value={score} reduced={reduced} />
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
          <span className="ckt-meta-label">Strike rate</span>
          <span className="ckt-meta-value">
            <Ticker value={strikeRate} reduced={reduced} />
          </span>
        </span>
        <span className="ckt-divider" aria-hidden="true" />
        <span className="ckt-meta">
          <span className="ckt-meta-label">Bowling</span>
          <span className="ckt-meta-value">{phase === "idle" ? "TO COME" : delivery.label}</span>
        </span>
      </div>


      <div className="ckt-controls">
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

        {/*
          Everything that changes the match rather than the moment lives
          behind the gear: restarting and switching sides both throw away
          an over in progress, and one mis-tap next to "leave" would do it
          silently. Sound stays outside because it is the one control
          people reach for mid-ball.
        */}
        <div className="ckt-menu" ref={menuRef}>
          <button
            type="button"
            className="ckt-icon"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Match settings"
            title="Settings"
          >
            <GearIcon />
          </button>

          {menuOpen && (
            <div className="ckt-glass ckt-menu__panel" role="menu">
              <p className="gk-head ckt-menu__head">Match</p>

              {/*
                Resume, first and on its own.

                The menu is full-screen now, so the gear that opened it is
                no longer obviously the thing that closes it — at that
                scale it reads as chrome, not as a toggle. Every pause
                screen worth copying puts "continue" at the top of the
                list, and it is the option most people reaching this screen
                actually want.
              */}
              <button
                type="button"
                className="ckt-menu__item ckt-menu__item--resume"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <ResumeIcon />
                Resume
              </button>

              <button
                type="button"
                className="ckt-menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  start();
                }}
              >
                <ReplayIcon />
                {phase === "idle" ? "Start the over" : "Restart the over"}
              </button>

              <button
                type="button"
                className="ckt-menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSwitchTeam?.();
                }}
              >
                <SwapIcon />
                Switch side
              </button>

              <button
                type="button"
                className="ckt-menu__item"
                role="menuitem"
                aria-pressed={muted}
                onClick={toggleMute}
              >
                {muted ? <MutedIcon /> : <SoundIcon />}
                {muted ? "Sound off" : "Sound on"}
              </button>

              <span className="ckt-menu__rule" aria-hidden />

              <PageLink className="ckt-menu__item" href="/playground" role="menuitem">
                <CloseIcon />
                Leave the game
              </PageLink>
            </div>
          )}
        </div>

        <PageLink className="ckt-icon" href="/playground" aria-label="Leave the game">
          <CloseIcon />
        </PageLink>
      </div>

      {phase !== "over" && <RewardCard shout={shout} reduced={reduced} />}
      {/*
        One transient overlay at a time.

        The receipt and the streak chip occupy the same slot now, and both
        are triggered by the same event — a shot that scored. Showing them
        together stacked two cards on one spot; the receipt wins while it is
        up, and the streak returns underneath it a second later, which also
        reads better as a sequence than as a pile.
      */}
      {phase !== "over" && !shout && <ComboPill combo={combo} reduced={reduced} />}

      {/*
        Bottom-left is a stack, not two absolutely-positioned panels.

        Both used to be pinned to the same corner with their own offsets,
        which is fine exactly until one of them changes height — and the
        commentary does, every ball, because the timing bar appears under
        it after a shot. They overlapped. A flow column owns the corner and
        the panels are ordinary blocks inside it, so their heights can
        never collide.
      */}
      <div className="ckt-dock">
        <div className="ckt-glass ckt-say">
        <Avatar className="ckt-say__face" />
        <div className="ckt-say__body">
        {/*
          The bubble wraps the SPEECH only — the commentary and the timing
          readout for the ball it describes. The level meter below is a
          sibling, not a child: the mascot is not saying your XP total, and
          when the meter was inside the bubble its medal (which hangs on a
          negative margin) punched straight out through the bubble's edge.
        */}
        <div className="gk-bubble ckt-say__speech">
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

          {/*
            The level meter shares the commentary panel rather than taking
            a second one below it. They are always read together — what
            just happened, and what it earned you — and two panels for one
            thought is what made this corner crowded enough to collide in
            the first place. It sits outside the bubble, though: see the
            note on the speech wrapper above.
          */}
          <XpBar xp={xp} levelUp={levelUp} reduced={reduced} />
        </div>
        </div>
      </div>

      <div className="ckt-glass ckt-wheel">
        <span className="ckt-wheel-label">Wagon wheel</span>
        <Wagon plots={plots} />
      </div>

      {phase === "idle" && (
        <div className="ckt-glass ckt-card">
          <span className="gk-stars ckt-card__crown" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <h1 className="gk-ribbon ckt-card__banner">
            <span>Six balls.</span>
            <span className="ckt-card__bannerGold">One innings.</span>
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

      {/*
        The innings summary gets a ground of its own rather than floating
        over the pitch.

        A card over live play reads as an interruption you will come back
        from. The over is finished — there is nothing behind it to return
        to — so the pitch is covered and the summary sits on a surface
        built for it. Its own element rather than a pseudo on the card,
        because it has to paint BELOW the card and a pseudo-element cannot
        escape its own parent's stacking context.
      */}
      {phase === "over" && <div className="ckt-outro" aria-hidden />}

      {phase === "over" && (
        <div className="ckt-glass ckt-card">
          <span className="gk-stars ckt-card__crown" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <p className="gk-head">{out ? "Over ended early" : "Over complete"}</p>
          <h2 className="ckt-title ckt-title--result">{finalVerdict.title}</h2>
          <p className="ckt-final">
            {score} <span>off {out ? ballIdx + 1 : BALLS}</span>
          </p>
          <p className="ckt-rule">{finalVerdict.note}</p>

          <dl className="cktSummary">
            {[
              ["Strike rate", String(strikeRate)],
              ["Fours", String(boundaries.fours)],
              ["Sixes", String(boundaries.sixes)],
              ["Wickets lost", out ? "1" : "0"],
            ].map(([k, v]) => (
              <div className="cktSummary__cell" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <div className="cktSummary__xp">
            {/* awarded, not measured, so it takes the stub rather than
                sitting as another line of text — see .gk-ticket */}
            <span className="gk-ticket cktSummary__xpEarned">+{overXp} Creative XP</span>
            <XpBar xp={xp} levelUp={null} reduced={reduced} />
          </div>

          {/*
            Two ranked controls, then a link. The comps put the replay in
            gold and the share in blue rather than making both the green
            "go" — green in this kit means starting play, and neither of
            these does that. Gold outranks blue because replaying is what
            almost everyone reaching this card wants next.
          */}
          <div className="ckt-actions">
            <button type="button" className="ckt-cta ckt-cta--gold" onClick={start}>
              Play again
            </button>
            <button type="button" className="ckt-cta ckt-cta--blue" onClick={share}>
              <ShareIcon />
              {shared ? "Copied" : "Share score"}
            </button>
          </div>

          {/*
            The way out of the game is a control now, not a ruled caption.

            It was styled as a section header, which made the one link that
            leaves for the actual portfolio the quietest thing on the card —
            below even the run-out summary. It gets a cap of its own, sized
            like the two above it but in the panel's own navy so it still
            ranks third rather than competing with replay and share.
          */}
          <PageLink className="ckt-cta ckt-cta--ghost ckt-outLink" href="/work">
            See the actual work
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </PageLink>
        </div>
      )}

      {/*
        The phone's whole input, in one thumb-sized object.

        A phone has no space bar and no arrow keys, and the desktop
        affordance — tap anywhere on the pitch — is invisible: nothing on
        screen says the stadium is a button. So portrait gets an explicit
        dock at the bottom, inside the thumb arc, with the timing rail
        directly above the control it belongs to.

        It is one button, not the five in the reference. The engine has one
        input: a swing, timed. Five labelled shot types would be five
        controls doing the same thing, which is worse than one honest one.
      */}
      <div className="cktTap" data-live={phase === "flight" || phase === "runup"}>
        <div className="cktTap__rail" aria-hidden>
          <span className="cktTap__zone cktTap__zone--early">Early</span>
          <span className="cktTap__zone cktTap__zone--perfect">Perfect</span>
          <span className="cktTap__zone cktTap__zone--late">Late</span>
        </div>

        <button
          type="button"
          className="cktTap__btn"
          onClick={phase === "idle" || phase === "over" ? start : swing}
          disabled={phase === "over"}
        >
          {phase === "idle" ? "Tap to play" : "Play shot"}
        </button>
      </div>

      <p className="ckt-hint">
        {reduced ? "Reduced motion is on" : "Arrow keys aim · Space plays the shot"}
      </p>
    </div>
  );
}

/* the settings gear, and the two actions only it exposes */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008.4 19.3a1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.04 15a1.7 1.7 0 00-1.56-1.03H2.4a2 2 0 110-4h.09A1.7 1.7 0 004.04 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 008.4 4.7 1.7 1.7 0 009.43 3.14V3a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9v.09a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09A1.7 1.7 0 0019.4 15z" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11a9 9 0 1 1 2.6 6.4" />
      <path d="M3 4.5V11h6.5" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h13l-3.4-3.4M20 16H7l3.4 3.4" />
    </svg>
  );
}

/* share, for the secondary action on the result card */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" />
    </svg>
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

/* the resume chevron. Solid, not stroked, because it reads as "play" at
   the size the pause list sets its glyphs — a stroked triangle at 0.58em
   loses its point. */
function ResumeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 4.2l10 5.8-10 5.8z" fill="currentColor" />
    </svg>
  );
}


/* ---------------- wagon wheel ---------------- */

/*
  The wagon wheel.

  It used to be a hairline arc, three dotted spokes and a dot — which on an
  over where nothing had been scored yet was an empty panel with a label on
  it, the deadest thing on screen. The problem was that it drew the CHART
  and not the GROUND: a wagon wheel is recognisable because it sits on a
  field, and without one there is nothing to look at until a shot lands.

  So the ground is drawn first — a green field wedge, the 30-yard ring, the
  boundary rope and a pitch strip at the origin — and the shots are plotted
  on top of it. It reads as a miniature of the pitch behind it even at
  zero shots, and every line added afterwards lands somewhere meaningful
  rather than in empty space.
*/
function Wagon({ plots }: { plots: Plot[] }) {
  return (
    <svg
      className="ckt-wagon"
      viewBox="0 0 120 68"
      aria-label={
        plots.length
          ? `Wagon wheel, ${plots.length} scoring shots`
          : "Wagon wheel, no scoring shots yet"
      }
    >
      <defs>
        {/* the outfield, lit from the batter's end so the far boundary sits
            back — the same top-down light every surface in this kit uses */}
        <linearGradient id="wagonField" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2f7d3f" />
          <stop offset="100%" stopColor="#1c5a2b" />
        </linearGradient>
      </defs>

      {/* the field itself */}
      <path d="M6 62 A54 54 0 0 1 114 62 Z" className="ckt-wagon-field" />

      {/* the mown ring inside the rope, and the 30-yard circle */}
      <path d="M20 62 A40 40 0 0 1 100 62" className="ckt-wagon-ring" />
      <path d="M38 62 A22 22 0 0 1 82 62" className="ckt-wagon-ring" />

      {/* the three sightlines, kept but quieter now the field carries the
          shape — they exist to separate off side, straight and leg */}
      <line x1="60" y1="62" x2="60" y2="12" className="ckt-wagon-grid" />
      <line x1="60" y1="62" x2="21" y2="35" className="ckt-wagon-grid" />
      <line x1="60" y1="62" x2="99" y2="35" className="ckt-wagon-grid" />

      {/* the rope */}
      <path d="M6 62 A54 54 0 0 1 114 62" className="ckt-wagon-edge" />

      {/* the strip the striker is standing on */}
      <rect x="57" y="53" width="6" height="9" rx="1" className="ckt-wagon-pitch" />

      {plots.map((p, i) => {
        /* -1..1 maps across a half circle, straight down the ground at 0 */
        const angle = -Math.PI / 2 + p.direction * (Math.PI / 2) * 0.92;
        /* a six clears the rope, a four reaches it, a single dies inside
           the ring — the length is the runs, not decoration */
        const len = p.runs >= 6 ? 56 : p.runs >= 4 ? 48 : 26;
        const x2 = 60 + Math.cos(angle) * len;
        const y2 = 62 + Math.sin(angle) * len;
        return (
          <g key={i} className={`ckt-wagon-shot ckt-wagon-shot--${p.runs}`}>
            <line x1="60" y1="62" x2={x2} y2={y2} />
            {/* boundaries get a landing mark; singles do not, or the chart
                fills up with dots that all look like fours */}
            {p.runs >= 4 && <circle cx={x2} cy={y2} r="2.4" />}
          </g>
        );
      })}

      <circle cx="60" cy="62" r="2.4" className="ckt-wagon-pin" />
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
