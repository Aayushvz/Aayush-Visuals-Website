"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import { OVER, clamp, resolveShot, runUpDelay, verdict } from "./engine";
import type { Contact, Delivery, ShotResult } from "./engine";
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
  paintHoardings,
  paintStrikerWicket,
  paintStumps,
} from "./scene";
import type { Board, Scene } from "./scene";
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
import { createClock } from "./clock";
import { teamById } from "./teams";
import { AVMark, BoltIcon, Burst, Pips, Ribbon, Stars, Toggle } from "./kit";
import { Crest } from "./crests";
import "./kit.css";
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
  const boardRef = useRef<Board>({
    shout: null,
    quote: "Six balls. One innings.",
    score: null,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  /* the pause menu's footer line, for whichever tile is highlighted */
  const [pauseHint, setPauseHint] = useState("Jump straight back in, right where you left off.");
  /* the match's own time: see clock.ts. One per mounted match. */
  const [clock] = useState(createClock);

  const [phase, setPhase] = useState<Phase>("idle");
  const [ballIdx, setBallIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [plots, setPlots] = useState<Plot[]>([]);
  /* every ball's outcome in order, for the over tracker */
  const [overLog, setOverLog] = useState<Contact[]>([]);
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

  useEffect(() => () => clock.dispose(), [clock]);

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
      runUpStartRef.current = clock.now();
      runUpMsRef.current = delay;
      clock.setTimeout(() => {
        /* the player may have left, or restarted, during the run-up */
        if (phaseRef.current !== "runup") return;
        releaseAtRef.current = clock.now();
        setPhaseBoth("flight");
        playRelease();
      }, delay);
    },
    [setPhaseBoth, clock]
  );

  const finishBall = useCallback(
    (result: ShotResult) => {
      setLast(result);
      setOverLog((l) => [...l, result.contact]);
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
      clock.clearTimeout(shoutTimerRef.current);
      shoutTimerRef.current = clock.setTimeout(() => setShout(null), 1900);

      comboRef.current = extendsCombo(result.contact) ? comboRef.current + 1 : 0;
      setCombo(comboFor(comboRef.current));

      setXp((prev) => {
        const next = prev + gained;
        if (levelFor(next) > levelFor(prev)) {
          setLevelUp(levelFor(next));
          clock.setTimeout(() => setLevelUp(null), 2200);
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
          clock.now(),
          deliveryRef.current.swing * 6 + aimRef.current * 0.35
        );
        playStumps();
        setOut(true);
        clock.setTimeout(() => setPhaseBoth("over"), 1500);
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
      clock.setTimeout(() => {
        if (next >= BALLS) setPhaseBoth("over");
        else bowl(next);
      }, 1600);
    },
    [ballIdx, bowl, setPhaseBoth, clock]
  );

  /*
    A swing. Only meaningful in flight; anywhere else it is either the
    button that starts the over or an idle click on the pitch.
  */
  const swing = useCallback(() => {
    unlockAudio();

    if (clock.paused) return;
    if (phaseRef.current === "idle" || phaseRef.current === "over") return;
    if (phaseRef.current !== "flight" || swungRef.current) return;

    swungRef.current = true;
    swingAnimRef.current = 0.0001;
    const delivery = deliveryRef.current;
    const ideal = releaseAtRef.current + delivery.travelMs;
    const offset = clock.now() - ideal;
    const result = resolveShot(delivery, offset, aimRef.current);
    /* a six gets the lofted follow-through, a four the horizontal drive;
       everything else — including the ball that takes the stumps — plays the
       compact defensive shot */
    swingActionRef.current =
      result.contact === "six" ? "six" : result.contact === "four" ? "drive" : "defend";

    if (result.contact !== "wicket") {
      shotRef.current = {
        at: clock.now(),
        dir: result.direction,
        power: result.runs >= 6 ? 1 : result.runs >= 4 ? 0.75 : 0.45,
      };
    }
    finishBall(result);
  }, [finishBall, clock]);

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
    setOverLog([]);
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
      if (clock.paused) return;
      /* Escape pauses; the pause screen's own handler takes it from there */
      if (e.key === "Escape") {
        setMenuOpen(true);
        return;
      }
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
  }, [swing, clock]);

  /*
    A ball that arrives and is ignored is out, not a free pass. Checked on a
    timer rather than in the draw loop so it still fires if the tab is
    backgrounded mid-delivery and rAF stops.
  */
  useEffect(() => {
    if (phase !== "flight") return;
    const d = deliveryRef.current;
    const id = clock.setTimeout(() => {
      if (phaseRef.current === "flight" && !swungRef.current) {
        swungRef.current = true;
        finishBall(resolveShot(d, null, 0));
      }
    }, d.travelMs + d.windows.contact + 40);
    return () => clock.clearTimeout(id);
  }, [phase, finishBall, clock]);

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

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const scene = sceneRef.current;
      if (!scene) return;
      /* game time, not frame time: it stands still while the match is
         paused, and so does everything drawn from it */
      const now = clock.now();
      const paused = clock.paused;
      const d = deliveryRef.current;
      const phase = phaseRef.current;
      const horizon = scene.horizon;
      const batY = h * 0.86;
      const cx = scene.cx;

      ctx.save();
      if (shakeRef.current > 0.01 && !paused) {
        const s = shakeRef.current * 8;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        shakeRef.current *= 0.88;
      }

      paintSky(ctx, scene, now);
      /* towers before the stands, so they rise out of the roofline rather
         than standing on top of the crowd */
      paintFloodlights(ctx, scene);
      paintStadium(ctx, scene);
      paintHoardings(ctx, scene, now, reducedRef.current);
      /*
        The board reads the score through a ref, not through the closure.

        This loop is started once and runs for the life of the innings; a
        value captured from render would be frozen at whatever it was when
        the effect ran, and the screen would sit on 0-0 all over. The ref is
        written on every state change below.
      */
      paintBigScreen(ctx, scene, boardRef.current, now, reducedRef.current);
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
        if (!paused) pushTrail(trailRef.current, pos, reducedRef.current);
        paintTrail(ctx, trailRef.current);
        paintBall(ctx, pos);
      }

      if (shotRef.current) {
        const st = shotRef.current;
        const t = clamp((now - st.at) / 900, 0, 1);
        const x = cx + st.dir * w * 0.95 * t;
        const y = batY - Math.sin(t * Math.PI) * h * (0.4 + st.power * 0.45) - t * h * 0.22;
        const r = 14 * (1 - t * 0.8);
        if (!paused) pushTrail(trailRef.current, { x, y, r }, reducedRef.current);
        paintTrail(ctx, trailRef.current);
        if (t < 1) paintBall(ctx, { x, y, r });
      }

      /* the batter eases into the follow through, then holds it */
      if (swingAnimRef.current > 0 && !paused) swingAnimRef.current = Math.min(1, swingAnimRef.current + 0.11);
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
  }, [clock]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  useEffect(() => setMutedState(isMuted()), []);

  /*
    The pause screen stops the match.

    Opening it freezes the game clock, so the ball in the air, the run-up,
    the gap before the next delivery and any card waiting to clear all hold
    exactly where they are, and closing it picks every one of them up with
    the time it had left.
  */
  useEffect(() => {
    if (menuOpen) clock.pause();
    else clock.resume();
  }, [menuOpen, clock]);

  /* a match left running in a background tab pauses itself: coming back to
     a wicket you never saw fall is not a fair way to lose one */
  useEffect(() => {
    const onVis = () => {
      const p = phaseRef.current;
      if (document.hidden && (p === "runup" || p === "flight" || p === "resolved")) {
        setMenuOpen(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /*
    Close on a click outside the panel, and the pause screen's keys.

    Bound at capture so Escape closes the screen before the game's own key
    handling sees it - otherwise the press that resumes would also reach
    the match and open the screen again.
  */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        e.stopPropagation();
        setMenuOpen(false);
      } else if (k === "r" && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation();
        setMenuOpen(false);
        start();
      } else if (k === "m" && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation();
        toggleMute();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  });

  /*
    Mirror the score into the ref the paint loop reads.

    During render, not in an effect: the canvas is repainted every frame
    regardless, so the board picks this up on the next tick either way, and
    an effect would just add a commit's worth of lag between the run being
    scored and the stadium showing it.
  */
  /*
    The board carries the commentary, with the score in a slim header row.

    The body is the shot's own story, which used to be thrown over the
    middle of the pitch on a card: while a shout is live the board shows it
    with the studio line beneath, and between deliveries it idles on
    whatever the commentary is currently saying. The header is what makes
    it a stadium scoreboard rather than a caption box - one line, small,
    under the league badge.
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
    /* the screen's header row, the same figures the HUD bar shows: a real
       ground's screen carries the score whatever the broadcast overlays */
    score: cardUp
      ? null
      : {
          runs: score,
          wickets: out ? 1 : 0,
          balls: out ? BALLS : ballIdx + 1,
          of: BALLS,
        },
  };

  const delivery = OVER[ballIdx];
  const ballsFaced = out || phase === "over" ? (out ? ballIdx + 1 : BALLS) : ballIdx;
  const finalVerdict = verdict(score, out ? ballIdx + 1 : BALLS, out);
  /* runs per hundred balls, the standard cricket figure */
  const strikeRate = ballsFaced > 0 ? Math.round((score / ballsFaced) * 100) : 0;

  const side = teamById(team);
  const rival = teamById(opponent);
  const commentary = last
    ? last.commentary
    : phase === "flight"
      ? "Watch it."
      : phase === "runup"
        ? "In his run-up."
        : phase === "idle"
          ? "Middle and leg, and settle in."
          : "";
  /* the ball in hand, for the tracker's live pip and the pause screen */
  const live = phase === "runup" || phase === "flight" ? ballIdx : -1;
  const ballsShown = out || phase === "over" ? ballsFaced : Math.min(BALLS, ballIdx + (phase === "idle" ? 0 : 1));

  /* the timing meter's perfect band, as a share of the half-window either
     side of the ideal - the engine's own numbers, drawn */
  const perfectPct = (delivery.windows.perfect / delivery.windows.contact) * 50;

  const level = levelFor(xp);
  /* three stars, on the runs: a real over rewards a real total */
  const stars = score >= 24 ? 3 : score >= 12 ? 2 : score >= 4 ? 1 : 0;

  return (
    <div className="ckt" data-phase={phase} data-paused={menuOpen || undefined}>
      <div className="ckt-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="ckt-canvas" aria-hidden="true" />
      </div>

      {/* ---- top left: the player card ---- */}
      <PageLink className="hud-id" href="/">
        <span className="hud-id__frame">
          <Avatar className="hud-id__face" />
        </span>
        <span className="hud-id__text">
          <span className="g-title hud-id__name">Aayush VZ</span>
          <span className="hud-id__rank">
            <span>Level</span>
            <b>{level}</b>
          </span>
        </span>
      </PageLink>

      {/*
        ---- top centre: the scoreboard ----

        A navy panel with the batting side's tile, the total in big outlined
        numerals, the over as six numbered pips, the strike rate, and the
        delivery on a chip at the end - inside the board, because anything
        hanging below it lands on the stadium screen.
      */}
      <div
        className="hud-bug"
        role="status"
        aria-live="polite"
        aria-label={`${side.name} ${score} for ${out ? 1 : 0}, ball ${Math.max(1, ballsShown)} of ${BALLS}`}
      >
        <div className="g-panel hud-bug__panel">
          <span className="hud-bug__team" title={side.name}>
                  <Crest id={team} field={side.colours.primary} emblem={side.colours.light} className="hud-bug__logo" />
                  <span className="sr-only">{side.abbr}</span>
                </span>
          <span className="g-title hud-bug__score">
            <Ticker value={score} reduced={reduced} />
            <small>/{out ? 1 : 0}</small>
          </span>
          <Pips log={overLog} live={live} className="hud-bug__pips" />
          <span className="hud-bug__sr">
            <span>SR</span>
            <b>
              <Ticker value={strikeRate} reduced={reduced} />
            </b>
          </span>
          <span className="hud-bug__ball">{phase === "idle" ? "To come" : delivery.label}</span>
        </div>
        {/* phones hang the timing rail under the bar, off the bottom of
          the screen where the bat button lives */}
        <span className="hud-bug__rail" data-live={phase === "flight" || phase === "runup"} aria-hidden>
          <span className="cktTap__zone cktTap__zone--early">Early</span>
          <span className="cktTap__zone cktTap__zone--perfect">Perfect</span>
          <span className="cktTap__zone cktTap__zone--late">Late</span>
        </span>
      </div>

      {/* ---- top right: sound, pause, leave ---- */}
      <div className="hud-ctrl">
        <button
          type="button"
          className="g-icon hud-btn--sound"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          title={muted ? "Sound off (M)" : "Sound on (M)"}
        >
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
        <button
          type="button"
          className="g-icon g-tone--yellow"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label="Pause the match"
          title="Pause (Esc)"
        >
          <PauseIcon />
        </button>
        <PageLink className="g-icon g-tone--red" href="/playground" aria-label="Leave the game" title="Leave the game">
          <CloseIcon />
        </PageLink>
      </div>

      {phase !== "over" && <RewardCard shout={shout} reduced={reduced} />}
      {/* the receipt and the streak share one slot: the receipt wins while
          it is up, and the streak returns under it a second later */}
      {phase !== "over" && !shout && <ComboPill combo={combo} reduced={reduced} />}

      {/*
        ---- bottom left: commentary, timing, level ----

        A dark glass panel: who is talking and what they said, how the last
        shot's timing landed on a traffic-light meter, and the level strip.
        On a phone the same panel becomes a slim strip above the bat button,
        and the level strip steps out (see cricket.css).
      */}
      <div className="g-glass hud-com">
        <div className="hud-com__head">
          <span className="hud-com__face">
            <Avatar />
          </span>
          <span className="g-label">Commentary</span>
          <span className="hud-com__live" aria-hidden>
            Live
          </span>
        </div>
        <p className="hud-com__line">{commentary}</p>

        {last && last.contact !== "wicket" && (
          <div className="hud-timing">
            <span
              className="hud-timing__track"
              style={
                {
                  "--ckt-off": `${clamp(last.offset / delivery.windows.contact, -1, 1) * 50 + 50}%`,
                  "--ckt-perfect": `${perfectPct}%`,
                } as React.CSSProperties
              }
              aria-hidden
            >
              <i />
            </span>
            <span
              className="hud-timing__label"
              data-grade={
                Math.abs(last.offset) <= delivery.windows.perfect
                  ? "good"
                  : Math.abs(last.offset) <= delivery.windows.contact * 0.7
                    ? "near"
                    : "miss"
              }
            >
              {Math.abs(last.offset) <= delivery.windows.perfect
                ? "Perfect"
                : last.offset < 0
                  ? `${Math.round(-last.offset)}ms early`
                  : `${Math.round(last.offset)}ms late`}
            </span>
          </div>
        )}

        <div className="hud-com__xp">
          <XpBar xp={xp} levelUp={levelUp} reduced={reduced} />
        </div>
      </div>

      {/* ---- bottom right: the wagon wheel ---- */}
      <div className="g-glass hud-wheel">
        <div className="hud-wheel__head">
          <span className="g-label">Wagon wheel</span>
          <span className="hud-wheel__runs">{score} runs</span>
        </div>
        <Wagon plots={plots} />
        <WheelKey plots={plots} />
      </div>

      {/* ---- the start card ---- */}
      {phase === "idle" && (
        <div className="g-panel ckt-card" role="dialog" aria-labelledby="ckt-intro-title">
          <div className="ckt-card__match">
            <span className="ckt-card__side">
              <Crest id={team} field={side.colours.primary} emblem={side.colours.light} className="ckt-card__logo" />
              <b>{side.abbr}</b>
            </span>
            <span className="ckt-card__vs">vs</span>
            <span className="ckt-card__side ckt-card__side--opp">
              <b>{rival.abbr}</b>
              <Crest id={opponent} field={rival.colours.primary} emblem={rival.colours.light} className="ckt-card__logo" />
            </span>
          </div>
          <h1 className="g-title ckt-card__title" id="ckt-intro-title">
            Six balls.
            <em>One innings.</em>
          </h1>
          <p className="ckt-card__body">
            Play the shot as the ball reaches you. Timing decides the runs, your aim decides
            where it goes, and a wicket ends the over.
          </p>
          <ul className="ckt-keys" aria-label="Controls">
            <li>
              <kbd className="g-key">Space</kbd>
              <span>Shot</span>
            </li>
            <li>
              <kbd className="g-key">←</kbd>
              <kbd className="g-key">→</kbd>
              <span>Aim</span>
            </li>
            <li>
              <kbd className="g-key">Esc</kbd>
              <span>Pause</span>
            </li>
          </ul>
          <button type="button" className="g-btn ckt-card__go" onClick={start}>
            <PlayIcon />
            Take guard
          </button>
        </div>
      )}

      {/*
        ---- the scorecard ----

        One card, two columns on a wide screen: the result on the left
        (verdict, stars, the total, the over ball by ball), the numbers on
        the right (stats, where the runs went, XP) with the two actions
        under both. Sized to fit the viewport outright, so it never scrolls;
        on a phone it becomes one tight column.
      */}
      {phase === "over" && (
        <div className="ckt-over" role="dialog" aria-labelledby="ckt-over-title">
          <Burst tone={out ? "red" : "yellow"} />

          <header className="g-crumb ckt-over__crumb">
            <span className="g-crumb__mark">
              <AVMark />
            </span>
            <span className="g-crumb__trail">
              <span className="g-crumb__home">Design Premier League</span>
              <span className="g-crumb__sep" aria-hidden>
                ›
              </span>
              <b>Scorecard</b>
            </span>
          </header>

          <div className="ckt-over__main">
            <div className="g-panel ckt-over__card">
              <div className="ckt-over__hero">
                <div className="ckt-over__top">
                  <Ribbon tone={out ? "red" : "green"}>{out ? "Out" : "Over complete"}</Ribbon>
                  <Stars earned={stars} />
                </div>
                <h2 className="g-title ckt-over__verdict" id="ckt-over-title">
                  {finalVerdict.title}
                </h2>
                <p className="ckt-over__runs">
                  <b className="g-num">{score}</b>
                  <span>
                    off {out ? ballIdx + 1 : BALLS}
                    <small>{out ? "1 wicket" : "not out"}</small>
                  </span>
                </p>
                <Pips log={overLog} live={-1} className="ckt-over__pips" />
              </div>

              <div className="ckt-over__side">
                <dl className="ckt-stats">
                  {(
                    [
                      ["Strike rate", String(strikeRate)],
                      ["Fours", String(boundaries.fours)],
                      ["Sixes", String(boundaries.sixes)],
                      ["Wickets", out ? "1" : "0"],
                    ] as const
                  ).map(([k, v]) => (
                    <div className="ckt-stats__cell" key={k}>
                      <dt className="g-label">{k}</dt>
                      <dd className="g-num">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="ckt-over__wheel">
                  <Wagon plots={plots} />
                  <WheelKey plots={plots} />
                </div>

                <div className="ckt-over__xp">
                  <span className="g-pill">
                    <BoltIcon />+{overXp} XP
                  </span>
                  <XpBar xp={xp} levelUp={null} reduced={reduced} />
                </div>
              </div>

              <div className="ckt-over__actions">
                <button type="button" className="g-btn" onClick={start}>
                  <ReplayIcon />
                  Play again
                </button>
                <button type="button" className="g-btn g-btn--ghost" onClick={share}>
                  <ShareIcon />
                  {shared ? "Copied" : "Share"}
                </button>
              </div>
            </div>

          </div>

          <footer className="g-foot ckt-over__foot">
            <span>{finalVerdict.note}</span>
            <PageLink className="g-btn g-tone--navy ckt-over__out" href="/work">
              See the real work
              <ArrowIcon />
            </PageLink>
          </footer>
        </div>
      )}

      {/*
        ---- the pause screen ----

        A console options menu: the match is frozen behind it (see the clock
        effect above), four big tiles for the four things you can do, and a
        footer that explains whichever one you are on.
      */}
      {menuOpen && (
        <div className="ckt-pause" role="dialog" aria-modal="true" aria-labelledby="ckt-pause-title">
          <Burst tone="purple" />
          <div className="ckt-pause__frame" ref={menuRef}>
            <header className="g-crumb ckt-pause__crumb">
              <span className="g-crumb__mark">
                <AVMark />
              </span>
              <span className="g-crumb__trail">
                <span className="g-crumb__home">{side.name}</span>
                <span className="g-crumb__sep" aria-hidden>
                  ›
                </span>
                <b id="ckt-pause-title">Paused</b>
              </span>
            </header>

            <div className="ckt-pause__state">
              <span className="g-panel ckt-pause__score">
                <span className="hud-bug__team" title={side.name}>
                  <Crest id={team} field={side.colours.primary} emblem={side.colours.light} className="hud-bug__logo" />
                  <span className="sr-only">{side.abbr}</span>
                </span>
                <b className="g-title">
                  {score}/{out ? 1 : 0}
                </b>
                <Pips log={overLog} live={live} />
              </span>
            </div>

            <div className="ckt-pause__grid">
              <button
                type="button"
                className="g-tile g-tone--green"
                onClick={() => setMenuOpen(false)}
                onFocus={() => setPauseHint("Jump straight back in, right where you left off.")}
                onPointerEnter={() => setPauseHint("Jump straight back in, right where you left off.")}
                autoFocus
              >
                <span className="g-tile__icon">
                  <ResumeIcon />
                </span>
                <span className="g-tile__label">Resume</span>
                <kbd className="g-key g-tile__meta">Esc</kbd>
              </button>
              <button
                type="button"
                className="g-tile g-tone--yellow"
                onClick={() => {
                  setMenuOpen(false);
                  start();
                }}
                onFocus={() => setPauseHint("Wipe the scoreboard and face all six balls again.")}
                onPointerEnter={() => setPauseHint("Wipe the scoreboard and face all six balls again.")}
              >
                <span className="g-tile__icon">
                  <ReplayIcon />
                </span>
                <span className="g-tile__label">{phase === "idle" ? "Start" : "Restart"}</span>
                <kbd className="g-key g-tile__meta">R</kbd>
              </button>
              <button
                type="button"
                className="g-tile g-tone--purple"
                onClick={() => {
                  setMenuOpen(false);
                  onSwitchTeam?.();
                }}
                onFocus={() => setPauseHint("Swap to the other side. This over will not count.")}
                onPointerEnter={() => setPauseHint("Swap to the other side. This over will not count.")}
              >
                <span className="g-tile__icon">
                  <SwapIcon />
                </span>
                <span className="g-tile__label">Switch side</span>
              </button>
              <button
                type="button"
                className="g-tile g-tone--blue"
                aria-pressed={!muted}
                onClick={toggleMute}
                onFocus={() => setPauseHint("Crowd, bat and stumps. Turn the ground up or down.")}
                onPointerEnter={() => setPauseHint("Crowd, bat and stumps. Turn the ground up or down.")}
              >
                <span className="g-tile__icon">{muted ? <MutedIcon /> : <SoundIcon />}</span>
                <span className="g-tile__label">Sound</span>
                <span className="g-tile__meta">
                  <Toggle on={!muted} />
                </span>
              </button>
            </div>

            <footer className="g-foot ckt-pause__foot">
              <span aria-live="polite">{pauseHint}</span>
              <PageLink className="g-btn g-tone--red ckt-pause__leave" href="/playground">
                <CloseIcon />
                Leave
              </PageLink>
            </footer>
          </div>
        </div>
      )}

      {/*
        The phone's whole input, in one thumb-sized control: a phone has no
        space bar, and nothing on screen says the stadium is a button. The
        timing rail sits directly above the control it belongs to.
      */}
      <div className="cktTap" data-live={phase === "flight" || phase === "runup"}>
        <div className="cktTap__rail" aria-hidden>
          <span className="cktTap__zone cktTap__zone--early">Early</span>
          <span className="cktTap__zone cktTap__zone--perfect">Perfect</span>
          <span className="cktTap__zone cktTap__zone--late">Late</span>
        </div>

        <button
          type="button"
          className="g-btn cktTap__btn"
          onClick={phase === "idle" || phase === "over" ? start : swing}
          disabled={phase === "over"}
        >
          {phase === "idle" ? "Play!" : "Swing!"}
        </button>
      </div>

      <p className="ckt-hint">
        {reduced ? "Reduced motion is on" : "Arrow keys aim · Space plays the shot · Esc pauses"}
      </p>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="3.4" height="12" rx="1" />
      <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 3.8l10.5 6.2L6 16.2z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}

/* the pause screen's actions */
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
/* how many of each scoring shot, under the wheel */
function WheelKey({ plots }: { plots: Plot[] }) {
  const n = (r: number) => plots.filter((p) => (r === 1 ? p.runs < 4 : p.runs === r)).length;
  return (
    <span className="wheel-key">
      <span>
        <i className="k1" />
        1s <b>{n(1)}</b>
      </span>
      <span>
        <i className="k4" />
        4s <b>{n(4)}</b>
      </span>
      <span>
        <i className="k6" />
        6s <b>{n(6)}</b>
      </span>
    </span>
  );
}

function Wagon({ plots }: { plots: Plot[] }) {
  /* one gradient per wheel: two wheels can be mounted at once (HUD and
     scorecard), and a gradient inside a hidden SVG paints nothing for the
     other one that refers to it by a shared id */
  const fieldId = `wagonField${useId().replace(/:/g, "")}`;
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
        <linearGradient id={fieldId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2f7d3f" />
          <stop offset="100%" stopColor="#1c5a2b" />
        </linearGradient>
      </defs>

      {/* the field itself */}
      <path d="M6 62 A54 54 0 0 1 114 62 Z" className="ckt-wagon-field" fill={`url(#${fieldId})`} />

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
