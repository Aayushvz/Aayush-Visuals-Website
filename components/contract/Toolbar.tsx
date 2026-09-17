"use client";

import { useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import type { Skin } from "./types";

type Props = {
  pct: number;
  theme: "light" | "dark";
  onTheme: () => void;
  skin: Skin;
  onSkin: (s: Skin) => void;
  onPrint: () => void;
  onWord: () => void;
  onMarkdown: () => void;
};

const SKINS: { id: Skin; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "editorial", label: "Editorial" },
  { id: "plain", label: "Plain" },
];

const R = 9;
const C = 2 * Math.PI * R;

export default function Toolbar({
  pct, theme, onTheme, skin, onSkin, onPrint, onWord, onMarkdown,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="cgBar">
      <PageLink href="/playground" className="cgBar__back">
        <span aria-hidden>&larr;</span> Playground
      </PageLink>
      <span className="cgBar__title">Service Agreement</span>
      <span className="cgBar__spacer" />

      <span className="cgRing">
        <svg className="cgRing__svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <circle className="cgRing__track" cx="12" cy="12" r={R} fill="none" strokeWidth="2" />
          <circle
            className="cgRing__fill"
            cx="12" cy="12" r={R} fill="none" strokeWidth="2" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
          />
        </svg>
        <span className="cgRing__text" aria-live="polite">{pct}% complete</span>
      </span>

      <span className="cgSeg" role="group" aria-label="Document skin">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="cgSeg__btn"
            aria-pressed={skin === s.id}
            onClick={() => onSkin(s.id)}
          >
            {s.label}
          </button>
        ))}
      </span>

      <button
        type="button"
        className="cgGhost"
        onClick={onTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "○" : "●"}
      </button>

      <div ref={wrap} style={{ position: "relative" }}>
        <button
          type="button"
          className="cgPrimary"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          Export <span aria-hidden>&#9662;</span>
        </button>
        {open && (
          <div className="cgMenu" role="menu">
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onPrint(); }}>
              Save as PDF
              <span className="cgMenu__hint">Opens the print dialog, A4</span>
            </button>
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onWord(); }}>
              Word (.doc)
              <span className="cgMenu__hint">Editable in Word, Pages, Docs</span>
            </button>
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onMarkdown(); }}>
              Markdown (.md)
              <span className="cgMenu__hint">Plain text</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
