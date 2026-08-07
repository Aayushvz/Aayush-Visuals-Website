"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Contact } from "./engine";
import type { Reward } from "./rewards";

/*
  The per-ball reward. Two lines: the cricket event, then the studio joke.

  Tiered rather than uniform — a six gets a bigger card, a particle burst and
  a brighter glow than a single, so the scoreboard moving by one doesn't feel
  the same as clearing the rope. Without tiering every ball reads identically
  and the reward stops meaning anything.
*/

export type RewardShout = {
  /** bumped per ball so a repeat outcome still re-triggers the animation */
  id: number;
  contact: Contact;
  headline: string;
  reward: Reward;
  xp: number;
  xpLabel: string;
};

const SPARKS = 10;

/* what the shot was worth, as the figure a scorer would write */
function runsFor(c: Contact): string {
  return c === "six" ? "6" : c === "four" ? "4" : c === "single" ? "1" : c === "dot" ? "0" : "W";
}

/* and what it was, in one word */
const VERDICT: Record<Contact, string> = {
  six: "Maximum",
  four: "Boundary",
  single: "Worked away",
  dot: "No run",
  wicket: "Bowled",
};

export default function RewardCard({
  shout,
  reduced,
}: {
  shout: RewardShout | null;
  reduced: boolean;
}) {
  const big = shout?.contact === "six" || shout?.contact === "four";

  return (
    <AnimatePresence mode="wait">
      {shout && (
        <motion.div
          key={shout.id}
          className={`cktReward cktReward--${shout.contact}${big ? " cktReward--big" : ""}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.72, y: 14 }}
          animate={
            reduced
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 460, damping: 17, mass: 0.7 },
                }
          }
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -10 }}
          aria-live="polite"
        >
          {/*
            The mechanics, not the story.

            The shout and the studio line moved to the stadium's big screen,
            which is where a crowd hears about a shot. What was left with
            nowhere to go was the part a player needs at speed and precisely:
            what it scored and what it earned. Two readouts, no prose — this
            is now a receipt, and the board is the celebration.
          */}
          <span className="cktReward__runs">{runsFor(shout.contact)}</span>
          <span className="cktReward__verdict">{VERDICT[shout.contact]}</span>
          <span className="cktReward__xp">
            +{shout.xp} {shout.xpLabel}
          </span>

          {/* boundaries throw sparks; a dot shouldn't celebrate itself */}
          {!reduced && big && (
            <span className="cktReward__sparks" aria-hidden>
              {Array.from({ length: SPARKS }, (_, i) => {
                const a = (i / SPARKS) * Math.PI * 2;
                return (
                  <motion.i
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: Math.cos(a) * 78,
                      y: Math.sin(a) * 58,
                      scale: 0.3,
                    }}
                    transition={{ duration: 0.72, ease: "easeOut" }}
                  />
                );
              })}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
