"use client";

import { useCallback, useState } from "react";
import TeamCard from "./TeamCard";
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

  return (
    <div className="stg">
      <div className="stgPick">
        <div className="stgPick__head">
          <h2 className="stgPick__title">Choose your side</h2>
          <p className="stgPick__hint">
            {picked ? "Locked in" : "Two philosophies. One over."}
          </p>
        </div>

        <div className="stgPick__cards">
          {TEAMS.map((team, i) => (
            <TeamCard
              key={team.id}
              team={team}
              index={i}
              reduced={reduced}
              selected={picked?.id === team.id}
              dimmed={!!picked && picked.id !== team.id}
              onChoose={choose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
