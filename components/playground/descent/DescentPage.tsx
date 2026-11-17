"use client";

import { EXPERIMENTS } from "../experiments";
import { descentCards } from "./cards";
import "./descent.css";

/*
  The DOM half of the descent, and the whole page until the canvas lands.

  This markup is not a fallback bolted on afterwards — it is the page. The
  canvas, when it arrives, is decorative and aria-hidden; everything a
  reader, a crawler or a keyboard needs is here, in order, as real links.

  EXPERIMENTS is passed into descentCards rather than imported by it: that
  module is unit-tested, and experiments.ts reaches into ./covers, which is
  JSX the test runner cannot parse. Passing it here keeps the card list
  testable and still lets TypeScript check the shape at this call site.
*/
export default function DescentPage() {
  const cards = descentCards(EXPERIMENTS);

  return (
    <div className="descent">
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
    </div>
  );
}
