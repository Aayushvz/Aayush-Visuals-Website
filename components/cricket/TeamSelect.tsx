"use client";

import { Fragment, useCallback, useState } from "react";
import TeamCard from "./TeamCard";
import { AVMark, Burst, Hex } from "./kit";
import { TEAMS, type Team } from "./teams";

/*
  Pick a side.

  The important behaviour here is that choosing is not instant. Clicking a
  card starts a 900ms beat: the chosen card lifts and settles, the other one
  desaturates and falls back, and only then does the stage advance. The
  brief calls this out specifically ("NO instant switch") and it is the
  difference between a selection screen and a radio button.

  The delay is held here rather than in the parent because this component
  owns the animation that fills it. A parent that knew the number would have
  to be kept in sync with the CSS by hand.
*/

const SETTLE_MS = 900;

type Props = {
  onPick: (team: Team) => void;
  reduced: boolean;
};

export default function TeamSelect({ onPick, reduced }: Props) {
  const [picked, setPicked] = useState<Team | null>(null);
  /* the side under the pointer or focus, for the footer's explanation */
  const [hint, setHint] = useState<Team | null>(null);

  const choose = useCallback(
    (team: Team) => {
      /* a second click during the settle would fire onPick twice and push
         the stage machine two steps forward */
      if (picked) return;
      setPicked(team);
      /* reduced motion skips the celebration but not the decision — the
         beat collapses rather than the flow changing shape */
      window.setTimeout(() => onPick(team), reduced ? 160 : SETTLE_MS);
    },
    [picked, onPick, reduced]
  );

  const shown = picked ?? hint;

  return (
    <div className="pk">
      <Burst tone="blue" />

      {/* the menu frame: where you are, and a footer that explains */}
      <header className="g-crumb pk__crumb">
        <span className="g-crumb__mark">
          <AVMark />
        </span>
        <span className="g-crumb__trail">
          <span className="g-crumb__home">Design Premier League</span>
          <span className="g-crumb__sep" aria-hidden>
            ›
          </span>
          <b>Pick a side</b>
        </span>
      </header>

      <div className="pk__main">
        <div className="pk__cards">
          {TEAMS.map((team, i) => (
            <Fragment key={team.id}>
              {i === 1 && (
                <span className="pk__vs" aria-hidden>
                  <Hex tone="red">VS</Hex>
                </span>
              )}
              <TeamCard
                team={team}
                index={i}
                reduced={reduced}
                selected={picked?.id === team.id}
                dimmed={!!picked && picked.id !== team.id}
                onChoose={choose}
                onHint={setHint}
              />
            </Fragment>
          ))}
        </div>
      </div>

      <footer className="g-foot pk__foot" aria-live="polite">
        {picked
          ? `${picked.name}, locked in. Walking out to the middle...`
          : shown
            ? `${shown.name}: ${shown.perk}`
            : "Two philosophies, one over. Pick the side you play like."}
      </footer>
    </div>
  );
}
