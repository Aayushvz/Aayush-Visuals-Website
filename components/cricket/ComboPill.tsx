"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Combo } from "./rewards";

/*
  The streak indicator. Present only while a streak is live, so its arrival is
  itself the signal that something is going right; a permanently-mounted "×0"
  would be noise.

  Keyed on count so each escalation re-plays the pop rather than silently
  swapping the number.
*/
export default function ComboPill({
  combo,
  reduced,
}: {
  combo: Combo | null;
  reduced: boolean;
}) {
  return (
    <AnimatePresence>
      {combo && (
        <motion.div
          key={combo.count}
          className="cktCombo ckt-glass"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: -12 }}
          animate={
            reduced
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  transition: { type: "spring", stiffness: 520, damping: 18 },
                }
          }
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: -8 }}
        >
          <span className="cktCombo__icon" aria-hidden>
            {combo.icon}
          </span>
          <span className="cktCombo__label">{combo.label}</span>
          <span className="cktCombo__count">×{combo.count}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
