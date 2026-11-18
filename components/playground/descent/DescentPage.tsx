"use client";

import { useMemo } from "react";
import { useLowPowerMode } from "@/components/about/useLowPowerMode";
import { EXPERIMENTS } from "../experiments";
import { descentCards } from "./cards";
import WorldBackdrop from "./WorldBackdrop";
import { useDescentScroll } from "./useDescentScroll";
import "./descent.css";

/*
  /playground: the card shelf, with a world behind it.

  The cards are the page — real links, real headings, in order, readable
  with no JS and no WebGL. The backdrop is decorative and aria-hidden: it
  cross-fades valley to falls to cave to forge as you scroll, with its
  layers parallaxing for depth.

  There was a three.js version of this. It cost more and looked worse,
  because the look of a 3D scene comes from its assets and we have none.
  Four SVG scenes at ~10KB beat it outright.

  EXPERIMENTS is passed into descentCards rather than imported by it:
  that module is unit-tested, and experiments.ts reaches into ./covers,
  which is JSX the test runner cannot parse.
*/
export default function DescentPage() {
  const cards = useMemo(() => descentCards(EXPERIMENTS), []);
  const mode = useLowPowerMode();
  const progress = useDescentScroll();

  return (
    <div className="descent descent--world">
      {/* reduced motion keeps the first scene, still, with no parallax */}
      {mode.reducedMotion ? (
        <div className="world world--still" aria-hidden />
      ) : (
        <WorldBackdrop progress={progress} />
      )}

      <header className="descent__intro">
        <p className="descent__eyebrow">Experiments</p>
        <h1 className="descent__title">Things I made
          <br />
          because I wanted to
        </h1>
        <p className="descent__lede">
          No brief, no client, no deadline. A cricket game, a pond that
          answers the mouse, two tools I got tired of paying for.
        </p>
        <p className="descent__cue">Scroll</p>
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
    </div>
  );
}
