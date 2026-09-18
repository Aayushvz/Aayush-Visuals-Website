"use client";

import { useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import LogoMark from "@/components/LogoMark";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  MoonIcon,
  PanelIcon,
  PrinterIcon,
  RotateCcwIcon,
  SunIcon,
} from "./icons";

type Props = {
  pct: number;
  theme: "light" | "dark";
  onTheme: () => void;
  sideOpen: boolean;
  onToggleSide: () => void;
  onReset: () => void;
  onPrint: () => void;
  onWord: () => void;
  onMarkdown: () => void;
  /* while Edit content (see EditBar.tsx) is on, Save becomes the page's
     one filled control and Export has to drop to a ghost to keep it that
     way - see the filled-control comment on EditBar itself */
  editMode: boolean;
};

const R = 9;
const C = 2 * Math.PI * R;

export default function Toolbar({
  pct, theme, onTheme, sideOpen, onToggleSide, onReset, onPrint, onWord, onMarkdown, editMode,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* menu-button pattern: the trigger's aria-haspopup/aria-expanded and the
     panel's role="menu"/"menuitem" promise a keyboard contract, so opening,
     arrowing and closing all have to actually move focus rather than just
     toggling visibility */
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
      <PageLink
        href="/playground"
        className="cgBar__back"
        aria-label="aayush vz, back to playground"
      >
        <ArrowLeftIcon />
        <LogoMark className="cgBar__logo" />
      </PageLink>
      <span className="cgBar__title">Contract Generator</span>
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

      {/* only meaningful between 1100 and 1535px: below that the tab
         strip owns switching between form and preview and the panel is
         not offered at all; at 1536 and up the panel is its own grid
         column and always visible, so this toggle is hidden by CSS at
         both ends and only shown in the gap where the panel is an
         overlay */}
      <button
        type="button"
        id="cg-side-toggle"
        className="cgGhost cgBar__sideToggle"
        aria-expanded={sideOpen}
        aria-controls="cg-side-panel"
        aria-label={sideOpen ? "Close panel" : "Open panel"}
        onClick={onToggleSide}
      >
        <PanelIcon />
      </button>

      {/* moved here from the form panel's footer: sitting next to Export
         makes it much easier to hit by accident than it was at the foot
         of a scrolled panel, so the label stays visible rather than
         shrinking to a bare icon, and the aria-label spells out the
         consequence rather than repeating the visible text */}
      <button
        type="button"
        className="cgBar__reset"
        onClick={onReset}
        aria-label="Reset all fields and hand-edited text to their defaults"
      >
        <RotateCcwIcon /> Reset
      </button>

      <button
        type="button"
        className="cgGhost"
        onClick={onTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <div ref={wrap} style={{ position: "relative" }}>
        <button
          type="button"
          ref={triggerRef}
          className={editMode ? "cgGhostLabel" : "cgPrimary"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          Export <ChevronDownIcon />
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
                <item.Icon className="cgMenu__icon" />
                <span className="cgMenu__itemText">
                  {item.label}
                  <span className="cgMenu__hint">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
