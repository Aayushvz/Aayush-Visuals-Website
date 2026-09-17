"use client";

import { useEffect, useRef, useState } from "react";
import { GROUPS, isFilled, type Field } from "./schema";
import type { Draft, Skin, Toggles } from "./types";
import {
  DownloadIcon,
  FileTextIcon,
  PrinterIcon,
  XIcon,
} from "./icons";

/*
  The fourth column. Three of its four blocks are things the previous
  three columns used to own: the skin picker lived in the toolbar, the
  clause toggles lived at the bottom of the form. They moved here rather
  than being copied, so Toolbar and FormPanel no longer render them at
  all (see those files). Readiness is new: the reference this route
  otherwise follows has no answer for "what's left", so this is the
  one block built from scratch rather than relocated.

  Layout: a real grid column at >= 1280px (.cgGrid gets a fourth track),
  an overlay everywhere below that (see contract.css's .cgSide rules).
  `open` and `onClose` only matter for the overlay case; at >= 1280 the
  panel is always visible and CSS ignores them.
*/

const SKIN_INFO: { id: Skin; label: string; hint: string }[] = [
  { id: "studio", label: "Studio", hint: "The house look" },
  { id: "editorial", label: "Editorial", hint: "A serif display with generous leading" },
  { id: "plain", label: "Plain", hint: "The most compact, built for legal reading" },
];

/* moved out of FormPanel wholesale, not copied: FormPanel no longer
   renders a clauses group or this array at all */
const TOGGLE_LABELS: { name: keyof Toggles; label: string; hint: string }[] = [
  { name: "attribution", label: "Attribution & Portfolio Rights", hint: "Lets you publish the work" },
  { name: "confidentiality", label: "Confidentiality & Non-Solicitation", hint: "Two year NDA, six month non-solicit" },
  { name: "warranties", label: "Warranties & Liability", hint: "Caps your liability at the fee" },
  { name: "termination", label: "Termination & Suspension", hint: "Kill fee and hold terms" },
  { name: "lateFee", label: "Late payment charge", hint: "A sub clause inside Fees, not its own section" },
];

type Props = {
  draft: Draft;
  setToggle: (name: keyof Toggles, value: boolean) => void;
  skin: Skin;
  onSkin: (s: Skin) => void;
  onPrint: () => void;
  onWord: () => void;
  onMarkdown: () => void;
  onJumpToField: (field: keyof Draft) => void;
  open: boolean;
  onClose: () => void;
};

/* whether the panel is currently docked as its own grid column (>=1280px)
   rather than an overlay; only affects focus/inert handling, the layout
   itself is CSS's job. Starts false so server and first client paint
   agree, then corrects itself on mount like the route's theme default. */
function useIsDocked(): boolean {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setDocked(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return docked;
}

export default function SidePanel({
  draft, setToggle, skin, onSkin, onPrint, onWord, onMarkdown, onJumpToField, open, onClose,
}: Props) {
  const docked = useIsDocked();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayVisible = !docked && open;

  /* closing hands focus back to the toolbar toggle that opened the
     overlay, the same return-focus contract Toolbar's own Export menu
     keeps for its trigger */
  const handleClose = () => {
    onClose();
    document.getElementById("cg-side-toggle")?.focus();
  };

  useEffect(() => {
    if (!overlayVisible) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayVisible]);

  const missing: Field[] = [];
  for (const g of GROUPS) {
    for (const f of g.fields) {
      if (f.required && !isFilled(draft[f.name])) missing.push(f);
    }
  }

  const exportItems: {
    id: string;
    label: string;
    hint: string;
    Icon: typeof PrinterIcon;
    run: () => void;
  }[] = [
    { id: "pdf", label: "Save as PDF", hint: "Opens the print dialog, A4", Icon: PrinterIcon, run: onPrint },
    { id: "word", label: "Word (.doc)", hint: "Editable in Word, Pages, Docs", Icon: FileTextIcon, run: onWord },
    { id: "md", label: "Markdown (.md)", hint: "Plain text", Icon: DownloadIcon, run: onMarkdown },
  ];

  return (
    <>
      <div
        id="cg-side-panel"
        className="cgSide"
        ref={panelRef}
        tabIndex={-1}
        aria-label="Document panel"
        inert={!docked && !open ? true : undefined}
      >
        {!docked && (
          <div className="cgSide__header">
            <p className="cgSide__title">Panel</p>
            <button
              type="button"
              className="cgGhost cgSide__close"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <XIcon />
            </button>
          </div>
        )}

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Skin</p>
          <div className="cgSide__radiogroup" role="radiogroup" aria-label="Document skin">
            {SKIN_INFO.map((s, i) => (
              <SkinRow
                key={s.id}
                skin={s}
                selected={skin === s.id}
                onSelect={() => onSkin(s.id)}
                onArrow={(dir) => {
                  const next = (i + dir + SKIN_INFO.length) % SKIN_INFO.length;
                  onSkin(SKIN_INFO[next].id);
                }}
              />
            ))}
          </div>
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Clauses</p>
          {TOGGLE_LABELS.map((t) => (
            <label className="cgSwitch" key={t.name}>
              <input
                type="checkbox"
                checked={draft.toggles[t.name]}
                onChange={(e) => setToggle(t.name, e.target.checked)}
              />
              <span className="cgSwitch__track" aria-hidden />
              <span className="cgSwitch__text">
                {t.label}
                <span className="cgSwitch__hint">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Readiness</p>
          {missing.length === 0 ? (
            <p className="cgSide__ready">Every required field is filled.</p>
          ) : (
            <>
              <p className="cgSide__readyCount">
                {missing.length} required field{missing.length === 1 ? "" : "s"} left
              </p>
              <ul className="cgSide__missing">
                {missing.map((f) => (
                  <li key={String(f.name)}>
                    <button
                      type="button"
                      className="cgSide__missingBtn"
                      onClick={() => onJumpToField(f.name)}
                    >
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Export</p>
          <div className="cgSide__exportList">
            {exportItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cgSide__exportRow"
                onClick={item.run}
              >
                <item.Icon className="cgSide__exportIcon" />
                <span className="cgSide__exportText">
                  {item.label}
                  <span className="cgSide__exportHint">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {overlayVisible && (
        <button
          type="button"
          className="cgSide__backdrop"
          aria-label="Close panel"
          onClick={handleClose}
        />
      )}
    </>
  );
}

/*
  One row of the skin radiogroup. Arrow keys move and select in one step
  (the native <input type="radio"> behaviour this role="radio" markup is
  standing in for), so only the checked row is ever in the tab order.
*/
function SkinRow({
  skin, selected, onSelect, onArrow,
}: {
  skin: { id: Skin; label: string; hint: string };
  selected: boolean;
  onSelect: () => void;
  onArrow: (dir: 1 | -1) => void;
}) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onArrow(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onArrow(-1);
    }
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      className="cgSide__skinRow"
      data-selected={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className="cgSide__skinName">{skin.label}</span>
      <span className="cgSide__skinHint">{skin.hint}</span>
    </button>
  );
}
