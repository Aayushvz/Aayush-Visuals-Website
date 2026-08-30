"use client";

import { useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import { Game } from "./engine/Game";
import { ambience } from "./audio/Ambience";
import "./pond.css";

/*
  Lotus Pond, mounted into the site.

  The game itself is untouched engine code under components/pond - a low-res
  canvas, a ten-layer parallax scene, a frog with an idle-behaviour scheduler,
  and a fully synthesised soundscape. This file is only the shell it used to
  get from index.html: it owns the canvas node, boots the Game against it, and
  hands the two pieces of non-canvas UI - the info panel and the boot label -
  to React instead of to getElementById.

  Three things this shell has to do that the standalone build did not:

  - Tear down. In a Vite app the page unloading was the teardown; here the
    pond is one route inside a client-side router, so Game.destroy() has to
    give back the resize/visibility/pointerup listeners and close the audio
    graph. Browsers cap AudioContexts per document, so leaking one per visit
    eventually leaves the pond silent.
  - Survive a double mount. React's dev StrictMode mounts effects twice, and
    two Games on one canvas is two rAF loops fighting over one buffer.
    Constructing in the effect and destroying in its cleanup handles it.
  - Never render on the server. The engine reaches for window at construction
    (the renderer sizes off innerWidth), so the parent loads this with
    ssr: false rather than this file guarding every access.
*/

export default function LotusPond() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [bugs, setBugs] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(
      canvas,
      () => setReady(true),
      /* the loop calls this every frame; React bails out of a set to the same
         value, so this is a comparison and not 60 renders a second */
      (n) => setBugs(n)
    );

    /* "m" still toggles mute from anywhere, and the button below is the same
       state, so the panel has to hear about it rather than own it */
    ambience.onMuteChange = setMuted;
    setMuted(ambience.isMuted);

    game.start();
    return () => game.destroy();
  }, []);

  return (
    <div className="pond">
      <canvas className="pond__stage" ref={canvasRef} />

      {/*
        The info card. It was a fixed DOM widget in the original; here it is
        the same glass card, plus one addition the standalone build had no use
        for - a way back to the playground, since this pond is now a room in
        a larger site rather than the whole tab.
      */}
      <div className={`pond__panel${ready ? " pond__panel--ready" : ""}`}>
        <div className="pond__title">Lotus Pond</div>
        <div className="pond__sub">Aayush&rsquo;s pet frog</div>
        <p className="pond__desc">
          Catch coding bugs and help the pond flourish. Click a bug and the
          frog hops the lily pads to reach it.
        </p>
        <div className="pond__row">
          <span className="pond__bugs">
            Bugs fixed <b>{bugs}</b>
          </span>
          <button
            type="button"
            className={`pond__mute${muted ? " pond__mute--off" : ""}`}
            onClick={() => ambience.toggleMute()}
            aria-pressed={muted}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            title="Sound on / off (m)"
          >
            {muted ? "off" : "on"}
          </button>
        </div>
      </div>

      <PageLink className="pond__leave" href="/playground">
        <span className="pond__leaveArrow" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M19 12H6M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Leave the pond
      </PageLink>

      {/* the quiet loading state, faded out once the first frame paints */}
      <div className={`pond__boot${ready ? " pond__boot--gone" : ""}`}>
        · lotus pond ·
      </div>
    </div>
  );
}
