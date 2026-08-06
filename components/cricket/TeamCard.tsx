"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { teamVars, type Team } from "./teams";
import { Crest } from "./crests";

/*
  A team card.

  The screen comps put this back to what the card always said — playstyle,
  abbreviation, crest, name, identity, motto, perk, one control — and paint
  the whole panel in the side's own colour rather than the league blue. That
  second part is the real idea: two identical blue cards make choosing a
  side a reading exercise, and two differently-coloured ones make it a
  glance. The team's palette drives the rim, the face and the button
  through the kit's own tokens, so nothing here special-cases a team.

  The card is not itself a button. It has a primary action inside it, and
  nesting a button in a button is invalid markup that hands a screen reader
  one target where there is one action and a lot of description.

  The pointer effects survive from the original: one reading per frame
  written to CSS custom properties, React never re-rendering on move. See
  flush() for why that shape matters.
*/

const MAX_TILT = 7;
const MAX_MAGNET = 8;

type Props = {
  team: Team;
  selected: boolean;
  /** dims and pulls back the other card once a choice is made */
  dimmed: boolean;
  onChoose: (team: Team) => void;
  reduced: boolean;
  index: number;
};

export default function TeamCard({
  team,
  selected,
  dimmed,
  onChoose,
  reduced,
  index,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const [hot, setHot] = useState(false);

  /* one write per frame, no matter how many pointer events arrived */
  const flush = useCallback(() => {
    rafRef.current = 0;
    const el = ref.current;
    const p = pending.current;
    if (!el || !p) return;

    el.style.setProperty("--px", p.x.toFixed(4));
    el.style.setProperty("--py", p.y.toFixed(4));
    /* y drives rotateX and is negated: pointer near the top should tip the
       card's top edge away from you, which is a negative rotateX */
    el.style.setProperty("--tilt-x", `${(0.5 - p.y) * MAX_TILT * 2}deg`);
    el.style.setProperty("--tilt-y", `${(p.x - 0.5) * MAX_TILT * 2}deg`);
    el.style.setProperty("--mag-x", `${(p.x - 0.5) * MAX_MAGNET * 2}px`);
    el.style.setProperty("--mag-y", `${(p.y - 0.5) * MAX_MAGNET * 2}px`);
    /* the sheen travels roughly twice the pointer's distance so it sweeps
       fully off the card at the edges rather than stalling mid-face */
    el.style.setProperty("--shine", `${p.x * 160 - 30}%`);
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      pending.current = {
        x: (e.clientX - b.left) / b.width,
        y: (e.clientY - b.top) / b.height,
      };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
    },
    [flush, reduced]
  );

  /* Returning to rest is a CSS transition, not a second animation loop:
     clearing the properties lets the class's own easing carry it home. */
  const rest = useCallback(() => {
    setHot(false);
    const el = ref.current;
    if (!el) return;
    for (const p of ["--tilt-x", "--tilt-y", "--mag-x", "--mag-y"]) {
      el.style.removeProperty(p);
    }
    el.style.setProperty("--shine", "50%");
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const c = team.colours;

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => !reduced && setHot(true)}
      onPointerLeave={rest}
      className={[
        "tcard",
        `tcard--${team.playstyle}`,
        hot ? "is-hot" : "",
        selected ? "is-picked" : "",
        dimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...teamVars(team), "--stagger": `${index * 110}ms` } as React.CSSProperties}
    >
      <div className="gk-panel tcard__panel">
        <div className="gk-panel__face tcard__face">
          {/* the sunburst behind the crest — the kit's way of saying "this
              is the hero of the panel" without adding another border */}
          <span className="tcard__rays" aria-hidden />

          {/* holographic sheen. A hard-edged band, because a soft blur
              reads as a gradient rather than as light on a surface. */}
          <span className="tcard__holo" aria-hidden />

          <div className="tcard__top">
            <span className="tcard__style">{team.playstyle}</span>
            <span className="tcard__abbr">{team.abbr}</span>
          </div>

          <Crest id={team.id} field={c.primary} emblem={c.light} className="tcard__crest" />

          <div className="tcard__body">
            <h3 className="tcard__name">{team.name}</h3>
            <p className="tcard__identity">{team.identity}</p>
            <p className="tcard__motto">&ldquo;{team.motto}&rdquo;</p>
          </div>

          {/* the ruled break, dotted at each end. It is the one piece of
              chrome separating the side's identity from what picking it
              actually does, which are two different kinds of claim. */}
          <span className="tcard__sep" aria-hidden />

          <p className="tcard__perk">{team.perk}</p>

          <button
            type="button"
            className="gk-btn gk-btn--block tcard__cta"
            onClick={() => onChoose(team)}
            aria-pressed={selected}
          >
            {selected ? "Locked in" : "Choose side"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* the glow pooled under the card, which is what actually sells the
          lift — a shadow alone reads as flat paper */}
      <span className="tcard__pool" aria-hidden style={{ background: c.primary }} />
    </div>
  );
}
