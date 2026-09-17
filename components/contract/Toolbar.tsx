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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* menu-button pattern: the trigger's aria-haspopup/aria-expanded and the
     panel's role="menu"/"menuitem" promise a keyboard contract, so opening,
     arrowing and closing all have to actually move focus rather than just
     toggling visibility */
  const exportItems: { id: string; label: string; hint: string; run: () => void }[] = [
    { id: "pdf", label: "Save as PDF", hint: "Opens the print dialog, A4", run: onPrint },
    { id: "word", label: "Word (.doc)", hint: "Editable in Word, Pages, Docs", run: onWord },
    { id: "md", label: "Markdown (.md)", hint: "Plain text", run: onMarkdown },
  ];

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const chooseItem = (run: () => void) => {
    closeMenu();
    run();
  };

  useEffect(() => {
    if (!open) return;
    /* on open, focus moves into the menu rather than staying on the trigger */
    itemRefs.current[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    if (items.length === 0) return;
    const current = items.findIndex((el) => el === document.activeElement);
    const focusAt = (i: number) => items[i]?.focus();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(current === -1 ? 0 : (current + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(items.length - 1);
        break;
      default:
        break;
    }
  };

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
          ref={triggerRef}
          className="cgPrimary"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          Export <span aria-hidden>&#9662;</span>
        </button>
        {open && (
          <div className="cgMenu" role="menu" onKeyDown={onMenuKeyDown}>
            {exportItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="cgMenu__item"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={() => chooseItem(item.run)}
              >
                {item.label}
                <span className="cgMenu__hint">{item.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
