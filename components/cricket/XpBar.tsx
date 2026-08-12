"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LEVEL_STEP, levelFor, levelFraction } from "./progress";
import { BoltIcon } from "./gameIcons";

/*
  Level and XP. The fill is a spring rather than a linear tween so gaining XP
  has some weight to it.

  A level-up mid-over would otherwise be invisible — the bar just wraps to
  near-zero and reads as a loss — so crossing the threshold fires an explicit
  flourish.

  The level now sits on a gold medallion beside the meter rather than as a
  line of text above it, which is the arcade kit's own arrangement: the
  number you have earned is an object, the progress toward the next one is
  a track. It also fixes a real legibility problem — "LVL 7" set at 0.68rem
  was the smallest type in the game and the thing a player checks most.
*/
export default function XpBar({
  xp,
  levelUp,
  reduced,
}: {
  xp: number;
  /** set when this over crossed a level boundary; drives the flourish */
  levelUp: number | null;
  reduced: boolean;
}) {
  const level = levelFor(xp);
  const frac = levelFraction(xp);
  const intoLevel = Math.round(frac * LEVEL_STEP);

  return (
    <div className="cktXp" aria-label={`Level ${level}, ${intoLevel} of ${LEVEL_STEP} XP`}>
      <span className="gk-star cktXp__medal" aria-hidden>
        {level}
      </span>

      <div className="cktXp__meter">
        <div className="cktXp__top">
          <span className="cktXp__label">Level {level}</span>
          <span className="cktXp__count">
            {intoLevel}/{LEVEL_STEP}
          </span>
        </div>

        <div className="gk-meter gk-pips cktXp__track">
          <motion.div
            className="gk-meter__fill cktXp__fill"
            initial={false}
            animate={{ width: `${Math.max(2, frac * 100)}%` }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 130, damping: 22, mass: 0.8 }
            }
          />
        </div>
      </div>

      <AnimatePresence>
        {levelUp !== null && (
          <motion.span
            key={levelUp}
            className="cktXp__up"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.8 }}
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 500, damping: 16 } }
            }
            exit={{ opacity: 0, y: -8 }}
          >
            {/* an SVG bolt, not the emoji this used to carry: the emoji
                rendered as a different drawing per platform and could not be
                tinted to sit on a gold plate */}
            <BoltIcon className="cktXp__upIcon" />
            Level {levelUp}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
