"use client";

import { useRef } from "react";
import { FileTextIcon, PaletteIcon } from "./icons";

type Tab = "form" | "preview" | "design";

/*
  The phone-width replacement for the old top .cgTabs strip, and the side
  panel's only entry point below 1100px (see SidePanel's useIsMobileNav
  and contract.css's matching @media block). "preview"/"form" keep the
  exact string values ContractGenerator's tab state already used, so the
  data-cg-tab CSS driving the >=1100px form/preview split is untouched;
  "design" is the new third stop, and its label here ("Document") does
  not have to match the older top-strip label ("Preview") it replaces -
  this is a new control, not a reskin of the old one.

  Three real <button role="tab">s in one role="tablist", roving tabindex
  (only the active tab sits in the page's own tab order) with
  ArrowLeft/Right moving AND selecting in one step - the same
  automatic-activation contract SkinRow's radiogroup already uses
  elsewhere in this route, applied to a tablist instead of a radiogroup.
  Home/End jump to the first/last tab.
*/

const TABS: { id: Tab; label: string }[] = [
  { id: "form", label: "Form" },
  { id: "preview", label: "Document" },
  { id: "design", label: "Design" },
];

const R = 8;
const C = 2 * Math.PI * R;

type Props = {
  tab: Tab;
  onTab: (t: Tab) => void;
  /* the completion ring, relocated from the toolbar (see Toolbar.tsx's
     own .cgRing, hidden at this width in contract.css) - it doubles as
     the Form tab's own icon rather than sitting beside a separate one,
     since a plain "form" glyph would carry no information a progress
     ring does not already carry better */
  pct: number;
};

export default function MobileTabBar({ tab, onTab, pct }: Props) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number, focus: boolean) => {
    const wrapped = (index + TABS.length) % TABS.length;
    onTab(TABS[wrapped].id);
    if (focus) itemRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        select(i + 1, true);
        break;
      case "ArrowLeft":
        e.preventDefault();
        select(i - 1, true);
        break;
      case "Home":
        e.preventDefault();
        select(0, true);
        break;
      case "End":
        e.preventDefault();
        select(TABS.length - 1, true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="cgMobileTabs" role="tablist" aria-label="View">
      {TABS.map((t, i) => {
        const selected = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="cgMobileTabs__tab"
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="cgMobileTabs__iconWrap">
              {t.id === "form" && (
                <svg
                  className="cgRing__svg cgMobileTabs__ring"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle className="cgRing__track" cx="12" cy="12" r={R} fill="none" strokeWidth="2" />
                  <circle
                    className="cgRing__fill"
                    cx="12" cy="12" r={R} fill="none" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C - (C * pct) / 100}
                  />
                </svg>
              )}
              {t.id === "preview" && <FileTextIcon className="cgMobileTabs__icon" />}
              {t.id === "design" && <PaletteIcon className="cgMobileTabs__icon" />}
            </span>
            <span className="cgMobileTabs__label">{t.label}</span>
            {t.id === "form" && (
              <span className="cgMobileTabs__pct" aria-live="polite">{pct}% complete</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
