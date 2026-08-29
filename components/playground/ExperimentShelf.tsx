"use client";

import Image from "next/image";
import PageLink from "@/components/PageLink";
import { EXPERIMENTS, SOON } from "./experiments";

/*
  The shelf.

  One live experiment right now, so this is deliberately NOT a three-up grid
  of equal tiles: a grid with one thing in it and two ghosts reads as a page
  that failed to load. Instead the live entry takes a full-width editorial
  row with real weight, and the vacant slots sit underneath as thin outlined
  strips that are honest about being empty.

  When a second experiment lands it just goes in EXPERIMENTS and takes over
  the next slot. Nothing here needs restructuring for that.
*/

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}

export default function ExperimentShelf() {
  return (
    <section className="pgShelf" id="experiments">
      {/* section-local rails: the global fixed .rails would run over the
          dark hero above, so this section carries its own pair */}
      <div className="pgRails" aria-hidden />

      <div className="pgShelf__inner">
        <header className="pgShelf__head" data-reveal>
          <h2 className="pgShelf__title">Experiments</h2>
          <p className="pgShelf__lede">
            Built for no client, on no deadline, to answer a question I had.
            Everything here is playable or readable right now.
          </p>
        </header>

        <ol className="pgShelf__list">
          {EXPERIMENTS.map((e) => (
            <li key={e.id} className="pgItem" data-reveal>
              <PageLink href={e.href} className="pgItem__link" aria-label={`${e.title}. ${e.cta}.`}>
                <span className="pgItem__index">{e.index}</span>

                <div className="pgItem__body">
                  <div className="pgItem__titleRow">
                    <h3 className="pgItem__title">{e.title}</h3>
                    <span className="pgItem__year">{e.year}</span>
                  </div>
                  <p className="pgItem__blurb">{e.blurb}</p>

                  <dl className="pgItem__specs">
                    {e.specs.map((s) => (
                      <div key={s.k} className="pgItem__spec">
                        <dt className="pgItem__specK">{s.k}</dt>
                        <dd className="pgItem__specV">{s.v}</dd>
                      </div>
                    ))}
                  </dl>

                  <span className="pgItem__cta">
                    <span className="pgItem__ctaText">{e.cta}</span>
                    <span className="pgItem__ctaArrow" aria-hidden>
                      <ArrowIcon />
                    </span>
                  </span>
                </div>

                <div className="pgItem__art" aria-hidden>
                  {e.logo ? (
                    <div className="pgItem__artImg pgItem__logo">
                      <e.logo />
                    </div>
                  ) : e.art ? (
                    <Image
                      src={e.art.src}
                      alt=""
                      width={640}
                      height={640}
                      sizes="(max-width: 640px) 46vw, (max-width: 900px) 34vw, 180px"
                      className="pgItem__artImg"
                    />
                  ) : null}
                  <span className="pgItem__artGlow" />
                </div>
              </PageLink>
            </li>
          ))}

          {/* vacant slots: outlined, unlinked, and labelled as empty rather
              than dressed up as content that is on its way */}
          {SOON.map((s) => (
            <li key={s.index} className="pgSlot" data-reveal>
              <span className="pgSlot__index">{s.index}</span>
              <span className="pgSlot__label">{s.hint}</span>
              <span className="pgSlot__mark" aria-hidden>
                +
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
