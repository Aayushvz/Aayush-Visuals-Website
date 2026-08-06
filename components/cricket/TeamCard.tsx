"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { teamVars, type Team } from "./teams";

/*
  A collectible trading card.

  Six effects are stacked here and they are all driven by ONE pointer
  reading per frame, written to CSS custom properties on the card element:

    --px / --py   pointer position inside the card, 0..1
    --tilt-x/y    the rotation that position implies, in degrees
    --mag-x/y     the magnetic nudge toward the pointer, in px
    --shine       where the holographic sweep sits, 0..100%

  Doing it this way matters. The naive version sets six inline styles from
  six handlers and re-renders React on every mousemove, which is a state
  update per pixel of pointer travel. Here the pointer writes to the DOM
  directly inside a rAF, React never re-renders while you move, and CSS
  does all six transforms in the compositor.

  The tilt is intentionally small (8deg). Cards that flop 25 degrees look
  impressive in isolation and cheap on a page — the effect should read as
  the card having weight and a surface, not as a novelty.
*/

const MAX_TILT = 8;
const MAX_MAGNET = 10;

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
  const ref = useRef<HTMLButtonElement | null>(null);
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
    (e: React.PointerEvent<HTMLButtonElement>) => {
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
    <button
      ref={ref}
      type="button"
      onPointerMove={onMove}
      onPointerEnter={() => !reduced && setHot(true)}
      onPointerLeave={rest}
      onBlur={rest}
      onClick={() => onChoose(team)}
      aria-pressed={selected}
      aria-label={`Choose ${team.name}. ${team.identity}. ${team.perk}`}
      className={[
        "tcard",
        hot ? "is-hot" : "",
        selected ? "is-picked" : "",
        dimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...teamVars(team), "--stagger": `${index * 110}ms` } as React.CSSProperties}
    >
      {/* the rarity border: a conic sweep behind the card face, masked to a
          1.5px ring by the face sitting on top of it */}
      <span className="tcard__rarity" aria-hidden />

      <span className="tcard__face">
        {/* holographic sheen — a hard-edged band, because a soft blur reads
            as a gradient rather than as light on a surface */}
        <span className="tcard__holo" aria-hidden />

        {/* floating motes. Six is enough to read as atmosphere; more and
            they start to look like dust on the screen. */}
        <span className="tcard__motes" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </span>

        <span className="tcard__top">
          <span className="tcard__style">{team.playstyle}</span>
          <span className="tcard__abbr">{team.abbr}</span>
        </span>

        <span className="tcard__mascot" aria-hidden>
          {team.mascot}
        </span>

        <span className="tcard__body">
          <span className="tcard__name">{team.name}</span>
          <span className="tcard__identity">{team.identity}</span>
          <span className="tcard__motto">“{team.motto}”</span>
        </span>

        <span className="tcard__perk">{team.perk}</span>

        <span className="tcard__cta" aria-hidden>
          <span>{selected ? "Selected" : "Choose side"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </span>
      </span>

      {/* the glow pooled under the card, which is what actually sells the
          lift — a shadow alone reads as flat paper */}
      <span className="tcard__pool" aria-hidden style={{ background: c.primary }} />
    </button>
  );
}
