"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CricketGame from "./CricketGame";
import Opening from "./Opening";
import StadiumBackdrop from "./StadiumBackdrop";
import TeamSelect from "./TeamSelect";
import { isSkippable, type Stage } from "./flow";
import { opponentOf, teamVars, type Team } from "./teams";
import { preloadBatter } from "./batterSprites";
import { preloadBowler } from "./bowlerSprites";
import { preloadFielder } from "./fielderSprites";
import { unlockAudio } from "./sound";
import { useAssets } from "./useAssets";
/* gamekit first: it defines the tokens and primitives the other two
   stylesheets override for their own surfaces */
import "./gamekit.css";
import "./cricket.css";
import "./stages.css";

/*
  The shell.

  This owns which stage you are on and nothing else. The match itself is
  still CricketGame, untouched — it mounts when the innings starts and keeps
  its own ball-level phase machine. Wrapping rather than absorbing it means
  the 760 lines of gameplay in there did not have to be rewritten to gain an
  opening screen, and can keep being worked on independently.

  Two things are deliberately global to the experience:

  - The stadium canvas. It mounts once, before the opening, and stays up
    through team selection so the camera can fly in and then hold. Every
    screen is a layer over a scene that never stops running, which is what
    makes the transitions read as cuts rather than as navigation.

  - The team's palette. Chosen once, written to CSS variables on the root
    element here, and inherited by everything below.
*/

const STORE_KEY = "dpl.team";

export default function CricketExperience() {
  const [stage, setStage] = useState<Stage>("opening");
  const [team, setTeam] = useState<Team | null>(null);
  const [reduced, setReduced] = useState(false);
  /*
    The gate is read here too, not just in Opening.

    Escape, Enter and the Skip button all jump straight past the title card,
    and a loading gate that only guards the button is not a gate — it is a
    suggestion. The hook is safe to call twice: the sprite preloads are
    idempotent, so the second caller only adds a progress poller.
  */
  const { ready: assetsReady } = useAssets();
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* Motion preference, watched rather than read once: someone can change it
     mid-session and every animation below reads this one flag. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  /*
    The document is cream.

    globals.css paints `body` with --cream for the whole portfolio, and the
    game is a dark full-bleed scene sitting on top of it. Any gap between
    the two — a canvas that has not sized yet, a viewport taller than the
    shell for one frame during a resize — shows up as a white rectangle
    rather than as nothing, because the page underneath is a light site.

    Marking the document rather than styling `.dpl` harder is the fix that
    holds: a child cannot repaint its own body, and every "make the shell
    cover everything" approach is one layout edge case away from failing
    again.
  */
  useEffect(() => {
    document.documentElement.classList.add("dpl-page");
    return () => document.documentElement.classList.remove("dpl-page");
  }, []);

  const advance = useCallback((to: Stage) => setStage(to), []);

  const start = useCallback(() => {
    /* the first real gesture is the only place a browser will let us open
       an AudioContext, so the whole sound design hangs off this click */
    unlockAudio();
    advance("select");
  }, [advance]);

  const pick = useCallback(
    (t: Team) => {
      setTeam(t);
      /*
        Start pulling the chosen side's artwork now, during the settle
        animation and the walk out to the middle. That is roughly a second
        of cover, which is most of what the first ball needs — and the
        renderer falls back to the procedural figure for anything still in
        flight, so a slow connection costs fidelity rather than an empty
        crease. Only the picked team's frames are fetched.
      */
      /* the FIELDING side is the opposition, so that is the kit the
         bowler and the ring need — not the one just chosen. The striker is
         the other way round: he is the side just picked. */
      const other = opponentOf(t.id).id;
      preloadBowler(other);
      preloadFielder(other);
      preloadBatter(t.id);
      try {
        localStorage.setItem(STORE_KEY, t.id);
      } catch {
        /* private mode; the pick simply will not be remembered */
      }
      /* the broadcast intro is Phase 2 — until it exists, a chosen side
         goes straight out to the middle rather than through a stage that
         would sit there empty */
      advance("innings");
    },
    [advance]
  );

  /* Skip: Escape, or the button. Only bound on stages that have something
     to skip, so Escape stays free during the innings for the game's own
     handlers. */
  const skip = useCallback(() => {
    if (stage === "opening" && assetsReady) start();
  }, [stage, start, assetsReady]);

  useEffect(() => {
    if (!isSkippable(stage)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, skip]);

  const preMatch = stage === "opening" || stage === "select";

  return (
    <div
      ref={rootRef}
      className="dpl"
      data-stage={stage}
      style={team ? teamVars(team) : undefined}
    >
      {/* the stadium runs behind every pre-match screen. It unmounts once
          the innings begins, because CricketGame brings its own canvas and
          two full-frame render loops is a waste of a phone's battery. */}
      {preMatch && <StadiumBackdrop settled={stage !== "opening"} reduced={reduced} />}

      {stage === "opening" && <Opening onStart={start} reduced={reduced} />}

      {stage === "select" && <TeamSelect onPick={pick} reduced={reduced} />}

      {stage === "innings" && (
        <CricketGame
          /* remount on a side change: the game owns a full ball-level
             machine and a canvas scene keyed to the opposition kit, and
             re-running that from a prop change would be a second code path
             for something the key already does correctly */
          key={team?.id ?? "default"}
          team={team ? team.id : "falcons"}
          opponent={team ? opponentOf(team.id).id : "panthers"}
          onSwitchTeam={() => advance("select")}
        />
      )}

      {/* the skip only exists once there is something to skip to */}
      {stage === "opening" && assetsReady && (
        <button type="button" className="stgSkip" onClick={skip}>
          Skip intro
        </button>
      )}
    </div>
  );
}
