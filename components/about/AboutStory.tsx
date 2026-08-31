"use client";

import type { ReactNode } from "react";
import Reveal, { RevealImage, SplitDisplay } from "./Reveal";
import { DISCIPLINES, FORMATION, MILESTONES } from "./story";
import WorkHero from "@/components/work/WorkHero";
import "./about-story.css";

/*
  The About story: everything below the hero.

  Structured as seven acts rather than seven sections. The distinction is
  whether the page has a shape you read through or a stack you scroll past,
  and it comes down to two rules held across the whole sequence:

  - No two acts share a composition. A wide image over a quote, then a run of
    year rows on a pinboard, then a pure-typography act with no image at all,
    then the project deck, then one line alone on the page. The rhythm is the
    story.
  - Direction carries meaning. Content in an act arrives from the side its
    composition leans away from, and consecutive acts alternate, so scrolling
    feels like the page is being dealt to you rather than fading in place.

  Every act is built from the same three primitives in Reveal.tsx, so adding
  an eighth is composition work, not animation work.
*/

/* The act's header: a hairline, a dot, a label. Lifted straight from the
   editorial convention of numbering chapters — it tells you where you are in
   a long page without a progress bar. */
function ActLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <Reveal direction="left" className="abLabel" distance={22} enterSpan={0.28}>
      <span className="abLabel__rule" aria-hidden />
      <span className="abLabel__text">
        <i className="abLabel__dot" aria-hidden />
        <span className="abLabel__n">{n}</span>
        {children}
      </span>
    </Reveal>
  );
}

type Props = {
  /** Hands each act's root back to the page so the status bar can track it. */
  sectionRef: (i: number) => (el: HTMLElement | null) => void;
};

export default function AboutStory({ sectionRef }: Props) {
  return (
    <>
      {/* ================= 02 · BEGINNINGS =================
          Flipped: the image leads from the left and takes the top of the act,
          the quote answers it from the right. The formation rows then run
          full width, which stops the act resolving into two neat columns. */}
      <section id="ch-02" className="abAct abAct--beginnings" ref={sectionRef(2)}>
        <div className="abAct__inner">
          <ActLabel n="02">Beginnings</ActLabel>

          <div className="abBegin">
            <RevealImage
              direction="left"
              distance={56}
              ratio="16 / 10"
              className="abBegin__wide"
              src="/about/collage-portrait.webp"
              alt="Aayush Raj at work"
              sizes="(max-width: 900px) 92vw, 54vw"
            />

            <div className="abBegin__quote">
              <Reveal
                as="blockquote"
                direction="right"
                delay={0.1}
                distance={44}
                className="abQuote"
              >
                &ldquo;I came to design through code, and I never really left
                either one.&rdquo;
              </Reveal>
              <Reveal
                as="p"
                direction="right"
                delay={0.2}
                className="abBody abBegin__body"
              >
                I started in computer science, which meant I learned how
                software gets built before I learned how it should look. That
                order turned out to be the useful one. Every interface I draw is
                one I already know how to make, and every system I hand over is
                one an engineer can actually pick up.
              </Reveal>
            </div>
          </div>

          <ul className="abFormation">
            {FORMATION.map((f, i) => (
              <Reveal
                as="li"
                key={f.place}
                direction="up"
                delay={0.06 * i}
                distance={26}
                className="abFormation__row"
              >
                <span className="abFormation__year">{f.year}</span>
                <span className="abFormation__place">{f.place}</span>
                <span className="abFormation__gave">{f.gave}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/*
  Acts three through seven live below the sticky banner, inside the wrapper
  that slides over it. Split into a second component purely so the page can
  put the banner between them without either half knowing about it.
*/
export function AboutStoryLower({ sectionRef }: Props) {
  return (
    <>
      {/* ================= 03 · JOURNEY =================
          Milestones. The year is the loudest thing on the row and the image
          side alternates down the list, so the eye zig-zags rather than
          running down a single column of cards. */}
      <section id="ch-03" className="abAct abAct--journey" ref={sectionRef(3)}>
        <div className="abAct__inner">
          <ActLabel n="03">The journey</ActLabel>

          {/* The act's loud heading, set at the same scale as the index-page
              titles on /work and /playground so the three read as one family.
              It takes the h2, and the display line below it drops to a <p>:
              SplitDisplay renders an h2 by default, and two of them in one
              section would be two competing section headings in the outline
              rather than a heading and its standfirst. */}
          <Reveal as="h2" direction="up" distance={34} className="abActTitle">
            Journey<span className="abActTitle__dot">.</span>
          </Reveal>

          <SplitDisplay as="p" lines={["Six years, one long", "accident"]} />

          <ol className="abJourney">
            {MILESTONES.map((m, i) => {
              /* the side the picture sits on, flipped every other row */
              const imageRight = i % 2 === 0;
              return (
                <li
                  className={`abMile ${imageRight ? "abMile--imgRight" : "abMile--imgLeft"}`}
                  key={`${m.year}-${m.title}`}
                >
                  <Reveal
                    direction={imageRight ? "left" : "right"}
                    className="abMile__text"
                    distance={38}
                  >
                    <span className="abMile__year">{m.year}</span>
                    <h3 className="abMile__org">{m.title}</h3>
                    <p className="abMile__copy">{m.copy}</p>
                  </Reveal>

                  {m.image ? (
                    <RevealImage
                      direction={imageRight ? "right" : "left"}
                      delay={0.1}
                      distance={48}
                      ratio="5 / 4"
                      className="abMile__img"
                      src={m.image.src}
                      alt={m.image.alt}
                      sizes="(max-width: 900px) 92vw, 42vw"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ================= 04 · WHAT I DO =================
          No image, on purpose. After a long alternating run of pictures the
          page needs a flat stretch of pure type, or the image rhythm stops
          registering as rhythm at all. */}
      <section id="ch-04" className="abAct abAct--craft" ref={sectionRef(4)}>
        <div className="abAct__inner">
          <ActLabel n="04">What I do</ActLabel>

          <SplitDisplay lines={["Five disciplines,", "one job"]} />

          <ul className="abCraft">
            {DISCIPLINES.map((d, i) => (
              <Reveal
                as="li"
                key={d.index}
                direction="left"
                delay={0.05 * i}
                distance={30}
                className="abCraft__row"
              >
                <span className="abCraft__n">{d.index}</span>
                <h3 className="abCraft__title">{d.title}</h3>
                <p className="abCraft__copy">{d.copy}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= 05 · SELECTED WORK =================
          The choreographed deck that used to open /work. It lives here now:
          the story has just said what he does, and the natural next beat is
          showing it rather than describing it again. The front card is a live
          link into that project, and the CTA leads to the full grid. */}
      <section className="abAct--work" ref={sectionRef(5)} id="ch-05">
        <WorkHero />
      </section>

    </>
  );
}
