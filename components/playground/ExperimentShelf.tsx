"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  { id: "all", label: "Everything" },
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

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
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

/*
  The filter control.

  A native <select> would be two lines and would also be the one element on
  the page that renders as an operating-system widget in the middle of a
  drawn layout, so it is a button and a listbox instead. Everything a select
  gives away for free is put back by hand: roving focus on the arrows, Home
  and End, Escape to close back onto the button, and a click anywhere else
  to dismiss.
*/
function FilterMenu({
  value,
  onChange,
}: {
  value: FilterId;
  onChange: (v: FilterId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();

  const current = FILTERS.find((f) => f.id === value) ?? FILTERS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const commit = (i: number) => {
    onChange(FILTERS[i].id);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setActive(FILTERS.findIndex((f) => f.id === value));
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % FILTERS.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + FILTERS.length) % FILTERS.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(FILTERS.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(active);
    }
  };

  return (
    <div className="pgFilter" ref={rootRef} onKeyDown={onKey}>
      <span className="pgFilter__label" id={`${listId}-label`}>
        Show
      </span>
      <button
        ref={btnRef}
        type="button"
        className="pgFilter__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${listId}-label ${listId}-value`}
        onClick={() => {
          setActive(FILTERS.findIndex((f) => f.id === value));
          setOpen((o) => !o);
        }}
      >
        <span id={`${listId}-value`}>{current.label}</span>
        <span className="pgFilter__chev" data-open={open || undefined}>
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <ul className="pgFilter__list" id={listId} role="listbox" tabIndex={-1}>
          {FILTERS.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                role="option"
                aria-selected={f.id === value}
                className="pgFilter__option"
                data-active={i === active || undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                {f.label}
                <span className="pgFilter__tick" aria-hidden>
                  {f.id === value ? "•" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ExperimentShelf() {
  const [filter, setFilter] = useState<FilterId>("all");

  const live = filter === "soon" ? [] : EXPERIMENTS;
  const soon = filter === "live" ? [] : SOON;

  return (
    <section className="pgShelf" id="experiments">
      {/* section-local rails: the global fixed .rails would run over the
          dark hero above, so this section carries its own pair. They are the
          only structure on this ground - the ruled grid stays in the hero,
          where it is the room the toy sits in; under the covers it was just
          texture competing with them. */}
      <div className="pgRails" aria-hidden />

      <div className="pgShelf__inner">
        {/* one heading, one control, one rule. Everything else this section
            used to say is said better by the grid underneath it. */}
        <header className="pgShelf__head" data-reveal>
          <h2 className="pgShelf__title">Experiments</h2>
          <FilterMenu value={filter} onChange={setFilter} />
        </header>

        <ul className="pgGrid">
          {live.map((e) => (
            <li key={e.id} className="pgCard" data-reveal>
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
            </li>
          ))}

          {/* vacant slots: same footprint, no link, and labelled as empty
              rather than dressed up as content that is on its way */}
          {soon.map((s) => (
            <li key={s.index} className="pgCard pgCard--soon" data-reveal>
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
