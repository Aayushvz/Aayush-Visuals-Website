"use client";

import { useEffect, useState } from "react";
import { preloadBatter } from "./batterSprites";
import { preloadBowler } from "./bowlerSprites";
import { preloadFielder } from "./fielderSprites";
import { preloadKeeper } from "./keeperSprites";
import { kitProgress } from "./spriteKit";
import { TEAMS } from "./teams";

/*
  Hold the opening screen until the match can actually be played.

  Before this, sprites were fetched when a side was picked and the renderer
  fell back to procedural figures for whatever had not landed — so on a slow
  connection the first over was played by stick men that turned into
  characters mid-ball. Fetching everything up front and waiting is the
  honest trade: a few seconds on a screen that is already a title card,
  against a match that looks finished from the first delivery.

  Both teams are loaded, not just one. The pick happens after this gate, and
  a player who waited through a loading bar should not then wait again
  because they chose the side that was not cached.

  Progress is polled rather than pushed. The underlying loader hands back no
  events, and an interval that reads a counter is both simpler than wiring
  listeners through it and immune to a frame that neither loads nor errors.
*/

/** images the gate waits on that are not sprite frames */
const EXTRA = ["/cricket/mascot.webp"];

export function useAssets() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    for (const t of TEAMS) {
      preloadBowler(t.id);
      preloadFielder(t.id);
      preloadKeeper(t.id);
      preloadBatter(t.id);
    }

    let extraDone = 0;
    for (const src of EXTRA) {
      const img = new Image();
      const tick = () => {
        extraDone++;
      };
      img.onload = tick;
      /* an error still counts: the bar must never wait on a file that is
         not coming, and the game degrades fine without any one image */
      img.onerror = tick;
      img.src = src;
    }

    /*
      A floor on how long this can take.

      Sprite frames can stall behind a dead connection with `complete` never
      flipping, and a loading bar that never fills is worse than a game that
      starts a little rough — the renderer's procedural fallback exists for
      exactly this. Eight seconds, then play regardless.
    */
    const started = performance.now();
    const CAP = 8000;

    const id = window.setInterval(() => {
      if (!alive) return;
      const { loaded, total } = kitProgress();
      const done = loaded + extraDone;
      const all = total + EXTRA.length;
      const p = all === 0 ? 1 : Math.min(1, done / all);
      const timedOut = performance.now() - started > CAP;

      setProgress(timedOut ? 1 : p);
      if (p >= 1 || timedOut) {
        setReady(true);
        window.clearInterval(id);
      }
    }, 90);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { progress, ready };
}
