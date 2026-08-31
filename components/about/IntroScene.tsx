"use client";

import type { CSSProperties } from "react";
import ScrollScene from "./ScrollScene";
import { SCENE } from "./scene.config";
import { GENERAL, STATS, CURRENT } from "./cards.data";
import "./info-cards.css";

/*
  The first section after the hero — ONE section containing two compositions.

  The lead block (rule, chapter label, paragraph, portrait, body column) rises
  in, rests, and then lifts away while the three info panels are already
  rising from below. That overlap is the point: in the reference both are on
  screen together mid-transition, which is what makes it read as one continuous
  scene rather than as two sections stacked. They were split before, and it
  showed.

  Layout and choreography both come from scene.config.ts and are handed to CSS
  as custom properties here, so the stylesheets hold no magic numbers.
*/

const L = SCENE.layout;
const T = SCENE.type;
const M = SCENE.motion;

/* px measured at the 1918 reference width, expressed so the type scales with
   the viewport and then stops rather than being right at exactly one size */
const fluid = (px: number, min: number, max: number) =>
  `clamp(${min}px, ${((px / 1918) * 100).toFixed(3)}vw, ${max}px)`;

/* a window as two CSS numbers: start, and 1/length so CSS can divide */
const win = ([a, b]: readonly [number, number]) => ({ a, span: b - a });

export default function IntroScene({
  sectionRef,
}: {
  sectionRef?: (el: HTMLElement | null) => void;
}) {
  const leadIn = win(M.leadIn);
  const leadOut = win(M.leadOut);
  const cardsIn = win(M.cardsIn);
  const cardsOut = win(M.cardsOut);

  const vars = {
    /* composition */
    "--scn-rule-l": `${L.ruleLeft}%`,
    "--scn-rule-r": `${100 - L.ruleRight}%`,
    "--scn-label-l": `${L.labelLeft}%`,
    "--scn-content-l": `${L.contentLeft}%`,
    "--scn-content-w": `${L.contentRight - L.contentLeft}%`,
    "--scn-img": `${L.imageShare}%`,
    "--scn-gap": `${L.columnGap}%`,
    "--scn-img-ratio": L.imageRatio,
    /* type */
    "--scn-lead": fluid(T.leadSize, 21, 34),
    "--scn-lead-lh": `${T.leadLeading}`,
    "--scn-body": fluid(T.bodySize, 13.5, 18),
    "--scn-body-lh": `${T.bodyLeading}`,
    "--scn-label": fluid(T.labelSize, 11, 15),
    /* motion */
    "--scn-rise": `${M.rise}svh`,
    "--scn-cards-rise": `${M.cardsRise}svh`,
    "--scn-lift": `${M.lift}svh`,
    "--scn-lift-x": `${M.liftX}vw`,
    "--scn-cards-rise-x": `${M.cardsRiseX}vw`,
    "--scn-imglag": `${M.imageLag}svh`,
    /* windows */
    "--w-lead-in-a": `${leadIn.a}`,
    "--w-lead-in-s": `${leadIn.span}`,
    "--w-lead-out-a": `${leadOut.a}`,
    "--w-lead-out-s": `${leadOut.span}`,
    "--w-cards-in-a": `${cardsIn.a}`,
    "--w-cards-in-s": `${cardsIn.span}`,
    "--w-cards-out-a": `${cardsOut.a}`,
    "--w-cards-out-s": `${cardsOut.span}`,
  } as CSSProperties;

  return (
    <div ref={sectionRef}>
      <ScrollScene className="scn--intro" id="ch-01">
        <div className="scnIntro" style={vars}>
          {/* ---------- composition one: the lead block ---------- */}
          <div className="scnIntro__stage">
            <span className="scnIntro__rule" aria-hidden />

            <span className="scnIntro__label">
              <i className="scnIntro__dot" aria-hidden />
              The designer
            </span>

            <div className="scnIntro__content">
              <p className="scnIntro__lead">
                Curiosity. Craft. Stubbornness. A refusal to ship anything I
                would not use myself. These are the things that turned a
                fifteen-year-old making YouTube thumbnails into a product
                designer building for millions of people.
              </p>

              <div className="scnIntro__row">
                <figure className="scnIntro__figure">
                  {/* 407x450 source, and the frame is 274x299 at the reference
                      width — near enough the same ratio that object-fit crops
                      almost nothing off it */}
                  <img
                    className="scnIntro__img"
                    src="/about/portrait-suit.webp"
                    alt="Aayush Raj"
                    width={407}
                    height={450}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 900px) 60vw, 15vw"
                  />
                </figure>

                <div className="scnIntro__body">
                  <p>
                    I started in computer science and learned how software
                    actually gets built before I learned how it should look.
                    That order turned out to be the useful one: every interface
                    I draw is one I already know how to make, and every system I
                    hand over is one an engineer can pick up without a meeting.
                  </p>
                  <p>
                    Since then, across a national government platform, a global
                    boxing brand and a festival with half a million visitors,
                    the job has stayed the same. Understand the constraint, then
                    make the obvious thing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- composition two: the info panels ----------
              Same scene, later window. It is already rising while the block
              above is still on its way out. */}
          <div className="cards">
            <div className="cards__row">
              <article className="card card--general" style={{ "--k": 0 } as CSSProperties}>
                <span className="card__tab">
                  <i className="card__dot" aria-hidden />
                  {GENERAL.label}
                </span>
                <div className="card__body">
                  <div className="card__portrait">
                    <img
                      src={GENERAL.portrait.src}
                      alt={GENERAL.portrait.alt}
                      loading="lazy"
                      decoding="async"
                      sizes="20vw"
                    />
                  </div>
                  {GENERAL.rows.map((r) => (
                    <div className="card__field" key={r.k}>
                      <span className="card__k">{r.k}</span>
                      <span className="card__big">{r.v}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card card--stats" style={{ "--k": 1 } as CSSProperties}>
                <span className="card__tab">
                  <i className="card__dot" aria-hidden />
                  {STATS.label}
                </span>
                <div className="card__body">
                  {STATS.rows.map((r) => (
                    <div className="card__field" key={r.k}>
                      <span className="card__k">{r.k}</span>
                      <span className="card__big card__big--num">{r.v}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card card--current" style={{ "--k": 2 } as CSSProperties}>
                <span className="card__tab">
                  <i className="card__dot" aria-hidden />
                  {CURRENT.label}
                </span>
                <div className="card__body">
                  <div className="card__field">
                    <span className="card__k">Role</span>
                    <span className="card__role">{CURRENT.role}</span>
                  </div>

                  <div className="card__field">
                    <span className="card__k">Built with</span>
                    <span className="card__pair">
                      {CURRENT.stack[0]}
                      <i className="card__slash" aria-hidden />
                      {CURRENT.stack[1]}
                    </span>
                  </div>

                  <div className="card__field">
                    <span className="card__k">Latest</span>
                    <div className="card__shot">
                      <img
                        src={CURRENT.highlight.src}
                        alt={CURRENT.highlight.alt}
                        loading="lazy"
                        decoding="async"
                        sizes="20vw"
                      />
                    </div>
                    <span className="card__caption">
                      {CURRENT.highlight.caption}
                    </span>
                  </div>

                  <div className="card__field">
                    <span className="card__k">Status</span>
                    <span className="card__status">{CURRENT.status}</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </ScrollScene>
    </div>
  );
}
