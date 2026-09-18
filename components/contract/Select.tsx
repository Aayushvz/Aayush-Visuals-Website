"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

/*
  A hand-built replacement for the native <select>, used everywhere this
  route offers a fixed list of options (currency, entity type, the three
  font pickers in SidePanel).

  Why this exists at all: a native <select>'s open popup is drawn by the
  operating system, not the page, so its list, highlight colour and
  scrollbar are outside CSS's reach entirely - the Windows-blue highlight
  a user sees there cannot be restyled from here no matter how the closed
  control is styled. The only real fix is to stop using the native popup
  and draw the list ourselves.

  The interaction model follows the one existing popup this same route
  already had to solve stacking/dismissal for: Toolbar.tsx's Export menu
  (outside mousedown, a document Escape listener, roving arrow keys over
  a ref array, focus returned to the trigger on close). There is no
  select-like popup anywhere in components/playground to draw from - its
  filter row is a plain tablist, and the closest thing to a roving-focus
  picker there (ExperimentShelf's chips) is a single-select tablist, not a
  listbox - so this borrows Toolbar's pattern instead, which already lives
  in this same file family and already had to answer the exact stacking
  question (see .cgBar's z-index comment in contract.css).

  ARIA: role="combobox" on the trigger button (the "select-only combobox"
  shape - no aria-autocomplete, since there is no text to type into the
  trigger itself), role="listbox" on the popup, role="option" per item.
  Real DOM focus never leaves the trigger while open; the highlighted
  option is communicated via aria-activedescendant, which is the pattern
  screen readers expect for a closed-text, list-of-choices control like
  this one. Options themselves are not part of the tab order.

  Positioning is position: fixed, measured off the trigger's own
  getBoundingClientRect and re-measured on scroll/resize while open. Fixed
  is what lets the popup escape every ancestor's overflow: FormPanel's
  accordion body sets overflow: hidden on itself while animating open
  (AccordionPanel in FormPanel.tsx), and .cgCol--form scrolls independently
  of the page - an absolutely positioned popup anchored inside either would
  be clipped exactly the way the native calendar/listbox currently is not
  reachable by CSS. z-index: 50 (see contract.css) is deliberately above
  both .cgBar (40) and .cgSide (30, see contract.css's own comment on why
  .cgBar needed 40) so the popup is never trapped under the docked or
  overlaid side panel regardless of which field opened it.
*/

export type SelectOption = { value: string; label: string };

type Rect = { top: number; left: number; width: number; maxHeight: number };

type Props = {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  "aria-label"?: string;
};

const GAP = 4;
const VIEWPORT_MARGIN = 12;
const TYPEAHEAD_RESET_MS = 600;

export default function Select({ id, value, options, onChange, "aria-label": ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeAhead = useRef<{ buf: string; timer: ReturnType<typeof setTimeout> | null }>({
    buf: "",
    timer: null,
  });

  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options.find((o) => o.value === value) ?? options[0];

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - GAP - VIEWPORT_MARGIN;
    setRect({
      top: r.bottom + GAP,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(120, spaceBelow),
    });
  };

  const openList = () => {
    if (options.length === 0) return;
    measure();
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const closeList = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const commit = (i: number) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    closeList(true);
  };

  useEffect(() => {
    if (!open) return;
    measure();

    const onScrollOrResize = () => measure();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      closeList(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeList(true);
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* keep the highlighted option visible as arrow keys move past the edge
     of the popup's own scroll area */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex))}`);
    el?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  const runTypeAhead = (char: string) => {
    if (options.length === 0) return;
    const ref = typeAhead.current;
    if (ref.timer) clearTimeout(ref.timer);
    ref.buf += char.toLowerCase();

    const search = (buf: string) => {
      const startFrom = (activeIndex + 1) % options.length;
      for (let k = 0; k < options.length; k++) {
        const idx = (startFrom + k) % options.length;
        if (options[idx].label.toLowerCase().startsWith(buf)) return idx;
      }
      return -1;
    };

    let found = search(ref.buf);
    if (found === -1 && ref.buf !== char.toLowerCase()) {
      /* the accumulated buffer no longer matches anything - start a fresh
         search on just the latest key, same as a native <select> */
      ref.buf = char.toLowerCase();
      found = search(ref.buf);
    }
    if (found !== -1) setActiveIndex(found);
    ref.timer = setTimeout(() => {
      ref.buf = "";
    }, TYPEAHEAD_RESET_MS);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        closeList(true);
        break;
      case "Tab":
        closeList(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          e.preventDefault();
          runTypeAhead(e.key);
        }
        break;
    }
  };

  return (
    <div className="cgSelect" ref={wrapRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className="cgInput cgSelect__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? closeList(true) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="cgSelect__value">{current?.label ?? ""}</span>
        <ChevronDownIcon className="cgSelect__chevron" />
      </button>

      {open && rect && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="cgSelect__popup"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            maxHeight: rect.maxHeight,
          }}
        >
          {options.map((o, i) => (
            <div
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={o.value === value}
              data-active={i === activeIndex}
              className="cgSelect__option"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => commit(i)}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
