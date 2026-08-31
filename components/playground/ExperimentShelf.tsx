"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import PageLink from "@/components/PageLink";
import { EXPERIMENTS, SOON } from "./experiments";
import { SlotCover } from "./covers";

/*
  The shelf, set as a store.

  A storefront grid is the right frame for this section for one reason: a
  playground is a list of things you can go and use, and the cover-first,
  kind-then-title-then-status card is the format everybody can already read
  without instructions. So the layout borrows the grammar of a game store -
  a filter bar, a four-up row, portrait box art - and swaps the money for
  the thing that actually matters here, which is whether you can play it now.

  Two rules keep it from turning into a wall of identical tiles:

  - Weight comes from content, not from span. Every cell is the same size,
    the way a store row is, but the live card carries real art, a badge, a
    play affordance and full contrast, while a vacant slot is dark, dashed
    and quiet. The eye lands on the live one immediately without the grid
    having to break rhythm to make that happen.
  - Vacant slots stay honest. They are not skeletons, they are not teasers
    with invented titles; they are labelled empty and say what kind of thing
    is meant to land there.

  All of it reads off EXPERIMENTS and SOON, so a new toy is still a one-file
  change.
*/

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Playable now" },
  { id: "soon", label: "In the workshop" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

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

/* the badge mark on a first release - a struck spark rather than a star,
   because a star in a portfolio reads as a rating nobody gave */
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.6l2.1 5.8 5.8 2.1-5.8 2.1L12 18.4l-2.1-5.8L4.1 10.5l5.8-2.1z" />
    </svg>
  );
}

export default function ExperimentShelf() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  /* One predicate over both lists. A vacant slot is searchable by the kind of
     thing meant to land in it, because that hint is the only text it has. */
  const { live, soon } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (...fields: string[]) =>
      !q || fields.some((f) => f.toLowerCase().includes(q));
    return {
      live: filter === "soon" ? [] : EXPERIMENTS.filter((e) => hit(e.title, e.kind)),
      soon: filter === "live" ? [] : SOON.filter((s) => hit(s.hint, s.kind)),
    };
  }, [query, filter]);

  const reduce = useReducedMotion();

  /*
    Entrance lives on the card rather than in the global [data-reveal] system,
    and it has to. Reveals.tsx queries the document once on mount and observes
    what it finds; anything React adds later is never observed, so it keeps
    opacity:0 forever. Every keystroke in the search field remounts this list,
    which would blank the shelf permanently the first time someone typed and
    cleared. framer re-runs initial -> animate on each mount instead, so a card
    is correct however it arrived. Same values as ProjectCard on /work.
  */
  const enter = (i: number) =>
    reduce
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.32,
            ease: [0.22, 1, 0.36, 1] as const,
            delay: Math.min(i, 6) * 0.04,
          },
        };

  return (
    <section className="pgShelf" id="experiments">
      <div className="pgShelf__inner">
        {/* Same header grammar as /work: the title on the left, a mono count
            and a short paragraph answering it on the right, then one row of
            controls under both. The two index pages should open the same way. */}
        <header className="pgShelf__head" data-reveal>
          <h2 className="pgShelf__title">
            Experiments<span className="pgShelf__dot">.</span>
          </h2>
          <div className="pgShelf__intro">
            {/* a count, not a date range - the honest at-a-glance fact about a
                shelf is how much of it you can actually play */}
            <span className="pgShelf__meta">
              ({String(EXPERIMENTS.length).padStart(2, "0")} playable)
            </span>
            {/* Sized to the same character count as the /work blurb on
                purpose. The header is bottom-aligned, so this column's height
                is what sets the heading's baseline - let it wrap to two lines
                where /work wraps to three and the two titles stop landing on
                the same line. */}
            <p className="pgShelf__desc">
              Games, toys and sketches I build to try an idea out. None of it
              is client work, and none of it has to justify itself.
            </p>
          </div>
        </header>

        <div className="pgControls" data-reveal>
          <label className="pgSearch">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="m14 14 3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              className="pgSearch__input"
              placeholder="Search experiments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search experiments"
            />
          </label>

          <div
            className="pgFilters"
            role="tablist"
            aria-label="Filter experiments by availability"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`pgChip${filter === f.id ? " pgChip--active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="pgGrid">
          {live.map((e, i) => (
            <motion.li key={e.id} className="pgCard" {...enter(i)}>
              <PageLink
                href={e.href}
                className="pgCard__link"
                aria-label={`${e.title}. ${e.cta}.`}
              >
                <div className="pgCard__art">
                  <e.cover />

                  {/*
                    Affordance only, and aria-hidden for that reason: it says
                    the same thing the link's own label already says, and a
                    screen reader does not need to be told twice. The card's
                    real copy is below, where a pointer is not a prerequisite
                    for reading it.
                  */}
                  <span className="pgCard__play" aria-hidden>
                    <span>{e.cta}</span>
                    <span className="pgCard__playArrow">
                      <ArrowIcon />
                    </span>
                  </span>

                  <span className="pgCard__index" aria-hidden>
                    {e.index}
                  </span>
                </div>

                <div className="pgCard__meta">
                  <span className="pgCard__kind">{e.kind}</span>
                  <h3 className="pgCard__title">{e.title}</h3>
                  <div className="pgCard__status">
                    {e.flag ? (
                      <span className="pgCard__flag">
                        <span className="pgCard__flagIcon" aria-hidden>
                          <SparkIcon />
                        </span>
                        {e.flag}
                      </span>
                    ) : null}
                    <span className="pgCard__price">{e.meta}</span>
                  </div>
                </div>
              </PageLink>
            </motion.li>
          ))}

          {/* vacant slots: same footprint, no link, and labelled as empty
              rather than dressed up as content that is on its way */}
          {soon.map((s, i) => (
            <motion.li
              key={s.index}
              className="pgCard pgCard--soon"
              {...enter(live.length + i)}
            >
              <div className="pgCard__art">
                <SlotCover index={s.index} />
              </div>
              <div className="pgCard__meta">
                <span className="pgCard__kind">{s.kind}</span>
                <h3 className="pgCard__title">{s.hint}</h3>
                <div className="pgCard__status">
                  <span className="pgCard__price">Not yet</span>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>

        {live.length === 0 && soon.length === 0 ? (
          <p className="pgEmpty">No experiments found.</p>
        ) : null}
      </div>
    </section>
  );
}
