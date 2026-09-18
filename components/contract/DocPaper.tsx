"use client";

import { Fragment } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, FocusEvent as ReactFocusEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Block, Draft, DocStyle, Overrides } from "./types";
import { buildClauses, documentMeta, isClauseEdited, listItemOverrideKey, PLACEHOLDER, PLACEHOLDER_TEXT } from "./clauses";
import { DISCLAIMER } from "./render-md";
import { DEFAULT_DOC_STYLE } from "./useDocStyle";
import { LockIcon } from "./icons";

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

/* Enter never inserts the browser's own <div>/<br> into one of these
   fields: every editable block here (a para, a subhead, one list item)
   is a single block of text, not a place to start a new paragraph, and
   letting Enter through would fill the underlying override with markup
   this route has no renderer for. Leaving the field (Tab, Escape, or
   clicking elsewhere) is how editing one block ends. */
function preventEnter(e: ReactKeyboardEvent) {
  if (e.key === "Enter") e.preventDefault();
}

/*
  A block made editable in place.

  contentEditable over a textarea per block: the edited text has to sit
  inside the same element the read-only view already uses (.cgDoc__p,
  .cgDoc__sub, the <li> itself) so it inherits the exact same typography,
  wrapping and print output with no separate sizing/line-height rules to
  keep in sync, and so the print path's "renders the live DOM" claim
  (see the report) is actually true - a <textarea> prints as a boxed
  form control, not flowing text, and would need its own suppression.

  Text only, never innerHTML, in both directions: the DOM starts from
  plain strings (withPlaceholders' spans are the one exception, and are
  never fed back - see below), and reading it back on blur uses
  `textContent`, never `innerHTML`, so a paste can add characters but
  never markup. Edits are committed on blur rather than on every
  keystroke on purpose: this element's children are still the ordinary
  React-rendered content (`withPlaceholders(text)`), and re-rendering an
  actively-focused contentEditable with new children is what resets the
  caret to the start in most browsers. Not touching the commit callback
  until the field is no longer focused sidesteps that entirely; nothing
  the user types is lost, since the browser owns the DOM in between.
*/
function EditableBlock({
  as: Tag, className, text, ariaLabel, multiline, onCommit,
}: {
  as: "p" | "h3" | "li";
  className?: string;
  text: string;
  ariaLabel: string;
  multiline?: boolean;
  onCommit: (text: string) => void;
}) {
  const handleBlur = (e: ReactFocusEvent<HTMLElement>) => {
    onCommit(e.currentTarget.textContent ?? "");
  };
  const props = {
    className: className ? `${className} cgDoc__editable` : "cgDoc__editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: "textbox" as const,
    "aria-multiline": Boolean(multiline),
    "aria-label": ariaLabel,
    onBlur: handleBlur,
    onKeyDown: preventEnter,
    children: withPlaceholders(text),
  };
  if (Tag === "p") return <p {...props} />;
  if (Tag === "h3") return <h3 {...props} />;
  return <li {...props} />;
}

/* the quiet "not editable here" cue on table/ledger/signature blocks
   while editing (Task 2): these three are computed from the form, chiefly
   money, and buildClauses already ignores an override on them (see the
   comment above LIST_ITEM_STRIDE in clauses.ts), so offering an edit
   affordance here would invite a change that silently does nothing. Only
   rendered while editMode is on; off, these blocks are the same plain
   elements they have always been, with nothing wrapping them. */
function Locked({ editMode, label, children }: { editMode: boolean; label: string; children: React.ReactNode }) {
  if (!editMode) return <>{children}</>;
  return (
    <div className="cgDoc__locked">
      <p className="cgDoc__lockBadge"><LockIcon /> {label}</p>
      {children}
    </div>
  );
}

function BlockView({
  b, clauseId, blockIndex, editMode, onEditBlock,
}: {
  b: Block;
  clauseId: string;
  blockIndex: number;
  editMode: boolean;
  onEditBlock: (clauseId: string, key: number, text: string) => void;
}) {
  switch (b.kind) {
    case "para":
      return editMode ? (
        <EditableBlock
          as="p"
          className="cgDoc__p"
          text={b.text}
          ariaLabel="Edit paragraph"
          multiline
          onCommit={(text) => onEditBlock(clauseId, blockIndex, text)}
        />
      ) : (
        <p className="cgDoc__p">{withPlaceholders(b.text)}</p>
      );
    case "subhead":
      return editMode ? (
        <EditableBlock
          as="h3"
          className="cgDoc__sub"
          text={b.text}
          ariaLabel="Edit heading"
          onCommit={(text) => onEditBlock(clauseId, blockIndex, text)}
        />
      ) : (
        <h3 className="cgDoc__sub">{b.text}</h3>
      );
    case "list":
      return (
        <ul className="cgDoc__ul">
          {b.items.map((item, k) =>
            editMode ? (
              <EditableBlock
                key={k}
                as="li"
                text={item}
                ariaLabel={`Edit list item ${k + 1}`}
                multiline
                onCommit={(text) => onEditBlock(clauseId, listItemOverrideKey(blockIndex, k), text)}
              />
            ) : (
              <li key={k}>{withPlaceholders(item)}</li>
            ),
          )}
        </ul>
      );
    case "table":
      return (
        <Locked editMode={editMode} label="Set from the form, not editable here">
          <table className="cgDoc__kv"><tbody>
            {b.rows.map((r, k) => (
              <tr key={k}>
                <th scope="row">{r[0]}</th>
                <td>{withPlaceholders(r[1])}</td>
              </tr>
            ))}
          </tbody></table>
        </Locked>
      );
    case "ledger":
      return (
        <Locked editMode={editMode} label="Calculated from Total Fee and Advance %, not editable here">
          <table className="cgDoc__ledger">
            <thead><tr>{b.head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j}>{withPlaceholders(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </Locked>
      );
    case "signature":
      return (
        <Locked editMode={editMode} label="Not editable here">
          <div className="cgDoc__sign">
            {["For the Designer", "For the Client"].map((who) => (
              <div key={who}>
                <p className="cgDoc__signWho">{who}</p>
                <p className="cgDoc__signLine">Name</p>
                <p className="cgDoc__signLine">Date</p>
              </div>
            ))}
          </div>
        </Locked>
      );
  }
}

/* Every field here is "" by default (see DEFAULT_DOC_STYLE), and an
   unset field must leave the skin's own value alone rather than paint
   over it with some hardcoded fallback. Inline style is what makes
   that precedence work for free: a custom property set inline on this
   element beats any class selector targeting the same element,
   whatever that selector's specificity, so simply omitting a key here
   when the user has not chosen a value lets the skin's own
   `.cgShell[data-cg-skin=...] .cgDoc { --cg-doc-display: ... }` rule
   apply untouched. Only keys the user has actually set are written. */
function docStyleVars(style: DocStyle): CSSProperties {
  const vars: Record<string, string> = {};
  if (style.accent) vars["--cg-doc-accent"] = style.accent;
  if (style.heading) vars["--cg-doc-heading-color"] = style.heading;
  if (style.background) vars["--cg-doc-bg"] = style.background;
  if (style.text) vars["--cg-doc-fg"] = style.text;
  if (style.titleFont) vars["--cg-doc-display"] = style.titleFont;
  if (style.headingFont) vars["--cg-doc-h"] = style.headingFont;
  if (style.bodyFont) vars["--cg-doc-body"] = style.bodyFont;
  return vars as CSSProperties;
}

export default function DocPaper({
  draft, style = DEFAULT_DOC_STYLE, logo = null, overrides = {},
  editMode = false, onEditBlock, onRevertClause,
}: {
  draft: Draft;
  style?: DocStyle;
  logo?: string | null;
  /* the effective overrides for THIS render: ContractGenerator passes
     the persisted store alone outside edit mode, and the persisted
     store merged with the current session's unsaved edits while editing
     (see mergeOverrides in useOverrides.ts and the comment on
     pendingOverrides in ContractGenerator.tsx) - DocPaper itself does
     not know or care which case it is in, it only ever renders one
     Overrides object */
  overrides?: Overrides;
  editMode?: boolean;
  onEditBlock?: (clauseId: string, key: number, text: string) => void;
  onRevertClause?: (clauseId: string) => void;
}) {
  const clauses = buildClauses(draft, overrides);
  const reduce = useReducedMotion();

  return (
    <article className="cgDoc" id="cg-doc" style={docStyleVars(style)}>
      {/* above the title, sized modestly by .cgDoc__logo; decorative
          (the title text already states what the document is), so an
          empty alt takes it out of the accessibility tree rather than
          announcing an unlabelled image */}
      {logo && <img src={logo} alt="" className="cgDoc__logo" />}
      <h1 className="cgDoc__title">Service<br />Agreement</h1>

      <table className="cgDoc__meta"><tbody>
        {documentMeta(draft).map(([k, val]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{withPlaceholders(val)}</td>
          </tr>
        ))}
      </tbody></table>

      {clauses.map((c, i) => {
        const edited = isClauseEdited(c.id, overrides);
        return (
          <motion.section
            key={c.id}
            id={`cg-c-${c.id}`}
            className="cgDoc__clause"
            layout={reduce ? false : "position"}
            transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cgDoc__numRow">
              <p className="cgDoc__num">{String(i + 1).padStart(2, "0")}.</p>
              {edited && (
                <span className="cgDoc__edited">
                  edited
                  <button
                    type="button"
                    className="cgDoc__editedRevert"
                    onClick={() => onRevertClause?.(c.id)}
                    aria-label={`Revert clause ${i + 1}, ${c.title}, to the generated text`}
                  >
                    Revert
                  </button>
                </span>
              )}
            </div>
            <h2 className="cgDoc__h">{c.title}</h2>
            {c.blocks.map((b, k) => (
              <BlockView
                b={b}
                key={k}
                clauseId={c.id}
                blockIndex={k}
                editMode={editMode}
                onEditBlock={onEditBlock ?? (() => {})}
              />
            ))}
          </motion.section>
        );
      })}

      <p className="cgDoc__disclaimer">{DISCLAIMER}</p>
    </article>
  );
}
