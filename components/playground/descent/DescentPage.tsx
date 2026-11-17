"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLowPowerMode } from "@/components/about/useLowPowerMode";
import { hasWebGL } from "@/lib/webgl";
import { EXPERIMENTS } from "../experiments";
import type { ScreenMap } from "./CardAnchors";
import CardLayer from "./CardLayer";
import { descentCards } from "./cards";
import { DESCENT_SCREENS } from "./progress";
import { tierFor } from "./quality";
import { useDescentScroll } from "./useDescentScroll";
import "./descent.css";

/*
  The descent.

  The DOM below is not a fallback bolted on afterwards — it is the page.
  The canvas is decorative and aria-hidden; everything a reader, a crawler
  or a keyboard needs is here, in order, as real links. Three separate
  paths stay on it permanently: no WebGL, reduced motion, and no JS.

  EXPERIMENTS is passed into descentCards rather than imported by it: that
  module is unit-tested, and experiments.ts reaches into ./covers, which is
  JSX the test runner cannot parse. Passing it here keeps the card list
  testable and still lets TypeScript check the shape at this call site.
*/

/* kept out of the first load: the people who only ever get the flat page
   should not pay for three.js to reach them */
const DescentScene = dynamic(() => import("./Scene"), { ssr: false });

export default function DescentPage() {
  const cards = useMemo(() => descentCards(EXPERIMENTS), []);
  const mode = useLowPowerMode();
  const progress = useDescentScroll();
  /* written by the scene each frame, read by the overlay each frame —
     a plain Map rather than state, for the same reason progress is */
  const screens = useRef<ScreenMap>(new Map());
  const [portrait, setPortrait] = useState(false);
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    setPortrait(window.innerHeight > window.innerWidth);
    /* both reduced motion and absent WebGL stay on the flat page. A frozen
       3D scene is still a 3D scene, and someone who asked for less motion
       does not want a camera flown at them slowly. */
    setImmersive(!mode.reducedMotion && hasWebGL());
  }, [mode.reducedMotion]);

  const tier = tierFor(mode, portrait);

  return (
    <div className={immersive ? "descent descent--3d" : "descent"}>
      {immersive ? (
        <>
          <DescentScene cards={cards} progress={progress} screens={screens} tier={tier} />
          <CardLayer cards={cards} screens={screens} />
        </>
      ) : null}

      <header className="descent__intro">
        <p className="descent__eyebrow">Experiments</p>
        <h1 className="descent__title">The Descent</h1>
        <p className="descent__lede">
          Unbriefed work — interface toys, canvas sketches, a browser game and
          three projects that went all the way.
        </p>
      </header>

      <ol className="descent__list">
        {cards.map((c) => (
          <li className="descent__item" key={c.id}>
            <a className="descent__card" href={c.href}>
              {c.poster ? (
                <img
                  className="descent__poster"
                  src={c.poster}
                  alt=""
                  width={640}
                  height={400}
                  loading="lazy"
                />
              ) : null}
              <span className="descent__kind">{c.kind}</span>
              <span className="descent__cardTitle">{c.title}</span>
              <span className="descent__blurb">{c.blurb}</span>
            </a>
          </li>
        ))}
      </ol>

      {/* the scroll the journey is measured against. Only in immersive
          mode — on the flat page the cards are the content and a 13-screen
          void under them would be nonsense. */}
      {immersive ? (
        <div
          className="descent__spacer"
          style={{ height: `${DESCENT_SCREENS * 100}svh` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
