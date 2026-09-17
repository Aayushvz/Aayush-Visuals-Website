"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Block, Draft } from "./types";
import { buildClauses, documentMeta, PLACEHOLDER, PLACEHOLDER_TEXT } from "./clauses";
import { DISCLAIMER } from "./render-md";

/* splits on the sentinel (never on visible text, so a user's own "--" can
   never be mistaken for an unfilled field) and renders PLACEHOLDER_TEXT,
   the sentinel's display form, so an unfilled value reads as muted rather
   than as text the reader might mistake for a real term */
function withPlaceholders(text: string) {
  return text.split(PLACEHOLDER).map((part, i, all) => (
    <Fragment key={i}>
      {part}
      {i < all.length - 1 && <span className="cgDoc__ph">{PLACEHOLDER_TEXT}</span>}
    </Fragment>
  ));
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case "para":
      return <p className="cgDoc__p">{withPlaceholders(b.text)}</p>;
    case "subhead":
      return <h3 className="cgDoc__sub">{b.text}</h3>;
    case "list":
      return (
        <ul className="cgDoc__ul">
          {b.items.map((i, k) => <li key={k}>{withPlaceholders(i)}</li>)}
        </ul>
      );
    case "table":
      return (
        <table className="cgDoc__kv"><tbody>
          {b.rows.map((r, k) => (
            <tr key={k}>
              <th scope="row">{r[0]}</th>
              <td>{withPlaceholders(r[1])}</td>
            </tr>
          ))}
        </tbody></table>
      );
    case "ledger":
      return (
        <table className="cgDoc__ledger">
          <thead><tr>{b.head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
          <tbody>
            {b.rows.map((r, k) => (
              <tr key={k}>{r.map((c, j) => <td key={j}>{withPlaceholders(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    case "signature":
      return (
        <div className="cgDoc__sign">
          {["For the Designer", "For the Client"].map((who) => (
            <div key={who}>
              <p className="cgDoc__signWho">{who}</p>
              <p className="cgDoc__signLine">Name</p>
              <p className="cgDoc__signLine">Date</p>
            </div>
          ))}
        </div>
      );
  }
}

export default function DocPaper({ draft }: { draft: Draft }) {
  const clauses = buildClauses(draft);
  const reduce = useReducedMotion();

  return (
    <article className="cgDoc" id="cg-doc">
      <h1 className="cgDoc__title">Service<br />Agreement</h1>

      <table className="cgDoc__meta"><tbody>
        {documentMeta(draft).map(([k, val]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{withPlaceholders(val)}</td>
          </tr>
        ))}
      </tbody></table>

      {clauses.map((c, i) => (
        <motion.section
          key={c.id}
          id={`cg-c-${c.id}`}
          className="cgDoc__clause"
          layout={reduce ? false : "position"}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="cgDoc__num">{String(i + 1).padStart(2, "0")}.</p>
          <h2 className="cgDoc__h">{c.title}</h2>
          {c.blocks.map((b, k) => <BlockView b={b} key={k} />)}
        </motion.section>
      ))}

      <p className="cgDoc__disclaimer">{DISCLAIMER}</p>
    </article>
  );
}
