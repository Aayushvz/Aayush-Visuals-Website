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
          title={c.title}
          layout={reduce ? false : "position"}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {String(i + 1).padStart(2, "0")}
          <span className="cgRail__tip">{c.title}</span>
        </motion.a>
      ))}
    </nav>
  );
}
