"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { teamVars, type Team } from "./teams";
import { Crest } from "./crests";
import { TriBadge } from "./kit";

/*
  A team card: a black plate from the game kit (kit.css) with the side's
  colour splashed behind its crest, its short name in the triangle badge,
  its playstyle on a sticker, and three bars that show what picking it does
  to the engine - the perk line says it, the bars let you compare it at a
  glance across the two cards. The side's palette arrives as CSS variables
  (teamVars), so nothing here special-cases a team.

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

  const short = team.name.split(" ").pop();

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => !reduced && setHot(true)}
      onPointerLeave={rest}
      className={[
        "pk-card",
        `pk-card--${team.playstyle}`,
        hot ? "is-hot" : "",
        selected ? "is-picked" : "",
        dimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...teamVars(team), "--stagger": `${index * 110}ms` } as React.CSSProperties}
    >
      <div className="k-lift pk-card__lift">
        <div className="k-plate pk-card__plate">
          {/* the side's short name, huge and faint, as the plate's own print */}
          <span className="pk-card__ghost" aria-hidden>
            {team.abbr}
          </span>
          <span className="pk-card__splash" aria-hidden />

          <div className="pk-card__top">
            <TriBadge tone="team" className="pk-card__tri">
              {team.abbr}
            </TriBadge>
            <span className="k-sticker k-tape pk-card__style">
              <span className="k-stamp">DPL</span>
              {team.playstyle}
            </span>
          </div>

          <Crest id={team.id} field={c.primary} emblem={c.light} className="pk-card__crest" />

          <h3 className="k-brush k-brush--white pk-card__name">{team.name}</h3>
          <p className="pk-card__identity">
            {team.identity} <span aria-hidden>·</span> <em>&ldquo;{team.motto}&rdquo;</em>
          </p>

          <dl className="pk-bars">
            {team.ratings.map((r) => (
              <div className="pk-bars__row" key={r.label}>
                <dt className="k-label">{r.label}</dt>
                <dd aria-label={`${r.value} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <i key={i} className={i < r.value ? "is-on" : ""} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>

          <p className="pk-card__perk">{team.perk}</p>

          <button
            type="button"
            className="k-btn k-btn--fire pk-card__cta"
            onClick={() => onChoose(team)}
            aria-pressed={selected}
          >
            {selected ? "Locked in" : `Pick the ${short}`}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {selected && (
        <span className="k-brush pk-card__stamp" aria-hidden>
          Locked in!
        </span>
      )}
    </div>
  );
}
