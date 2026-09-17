"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Draft } from "./types";
import { buildClauses } from "./clauses";

export default function ClauseRail({ draft }: { draft: Draft }) {
  const clauses = buildClauses(draft);
  const reduce = useReducedMotion();

  return (
    <nav className="cgRail" aria-label="Contract sections">
      {clauses.map((c, i) => (
        <motion.a
          key={c.id}
          href={`#cg-c-${c.id}`}
          className="cgRail__item"
          layout={reduce ? false : "position"}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* numbering is array position, not stored data, so it keeps
             renumbering whenever an optional clause is toggled off and
             buildClauses returns a shorter array */}
          <span className="cgRail__num">{String(i + 1).padStart(2, "0")}</span>
          <span className="cgRail__title">{c.title}</span>
        </motion.a>
      ))}
    </nav>
  );
}
