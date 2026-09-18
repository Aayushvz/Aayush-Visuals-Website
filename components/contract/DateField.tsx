"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

/*
  A hand-built replacement for <input type="date">, for the same reason as
  Select.tsx: the native control's calendar popup is OS chrome, not page
  content, so no amount of CSS on the closed box reaches the Windows-blue
  highlight inside it.

  The stored value never changes shape: it stays the plain ISO "YYYY-MM-DD"
  string Draft already keeps (see types.ts and DEFAULT_DRAFT in schema.ts).
  formatDate in format.ts still does every bit of display formatting that
  reaches the document itself; this component only ever reads/writes the
  ISO string and has its own tiny, local month/weekday formatter for the
  popup's own header, kept out of format.ts entirely so that file and its
  tests stay untouched.

  Same popup mechanics as Select.tsx: position: fixed measured off the
  toggle button's own rect (so FormPanel's accordion overflow:hidden and
  .cgCol--form's own scrolling can never clip it), re-measured on
  scroll/resize while open, z-index: 50 to clear .cgSide (30) and .cgBar
  (40) - see contract.css and the comment in Select.tsx for why those two
  numbers specifically.

  The grid follows the roving-tabindex model already used once in this
  route (SidePanel.tsx's SkinRow radiogroup): one day is ever tabbable at a
  time, arrow keys move real DOM focus to the next cell and update which
  one that is, rather than faking focus with aria-activedescendant the way
  Select.tsx does. A day grid needs actual per-cell focus for arrow
  navigation to make sense to a screen reader user the way a listbox's
  activedescendant does not.
*/

type Props = {
  id: string;
  value: string;
  onChange: (iso: string) => void;
};

type Rect = { top: number; left: number; width: number };

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_FMT = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const POPUP_WIDTH = 288;
const POPUP_HEIGHT_ESTIMATE = 340;
const GAP = 4;
const VIEWPORT_MARGIN = 8;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da);
  /* rejects "2026-02-31": Date silently rolls invalid days into the next
     month, so a round trip that does not land back on the same numbers
     means the input was never a real calendar date */
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/* Date's own setMonth() overflows into the following month whenever the
   current day-of-month does not exist in the target month (31 Jan + 1
   month lands on 3 March, silently skipping February) - clamp to the
   target month's real length instead, matching how PageUp/PageDown
   behave in every date picker this one is standing in for. */
function addMonths(d: Date, n: number): Date {
  const total = d.getMonth() + n;
  const year = d.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const daysInTarget = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(d.getDate(), daysInTarget));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/* six full weeks, Monday first, so every month renders the same fixed
   grid shape and switching months never reflows the popup's height */
function buildWeeks(monthAnchor: Date): Date[][] {
  const first = startOfMonth(monthAnchor);
  const dow = (first.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  let cursor = addDays(first, -dow);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function DateField({ id, value, onChange }: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => fromIso(value) ?? new Date());
  const [focusedIso, setFocusedIso] = useState<string>(() => toIso(fromIso(value) ?? new Date()));
  const [rect, setRect] = useState<Rect | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popupId = useId();

  useEffect(() => setText(value), [value]);

  const measure = () => {
    const el = toggleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - GAP - VIEWPORT_MARGIN;
    const openUpward = spaceBelow < POPUP_HEIGHT_ESTIMATE && r.top > POPUP_HEIGHT_ESTIMATE;
    const top = openUpward ? r.top - POPUP_HEIGHT_ESTIMATE - GAP : r.bottom + GAP;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, r.right - POPUP_WIDTH),
      window.innerWidth - POPUP_WIDTH - VIEWPORT_MARGIN,
    );
    setRect({ top: Math.max(VIEWPORT_MARGIN, top), left, width: POPUP_WIDTH });
  };

  const openCal = () => {
    const base = fromIso(value) ?? new Date();
    setMonthAnchor(base);
    setFocusedIso(toIso(base));
    measure();
    setOpen(true);
  };

  const closeCal = (focusBack: boolean) => {
    setOpen(false);
    if (focusBack) toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    measure();
    const onScrollOrResize = () => measure();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      closeCal(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCal(true);
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

  /* roving tabindex: whichever cell is "focused" gets real DOM focus once
     it exists in this month's grid, mirroring SidePanel's SkinRow pattern */
  useEffect(() => {
    if (!open) return;
    cellRefs.current.get(focusedIso)?.focus();
  }, [open, focusedIso, monthAnchor]);

  const commitText = (raw: string) => {
    const d = fromIso(raw);
    if (d) onChange(toIso(d));
  };

  const pick = (d: Date) => {
    const iso = toIso(d);
    onChange(iso);
    setText(iso);
    closeCal(true);
  };

  const moveFocused = (deltaDays: number) => {
    const cur = fromIso(focusedIso) ?? new Date();
    const next = addDays(cur, deltaDays);
    setFocusedIso(toIso(next));
    if (next.getMonth() !== monthAnchor.getMonth() || next.getFullYear() !== monthAnchor.getFullYear()) {
      setMonthAnchor(next);
    }
  };

  const moveMonth = (deltaMonths: number) => {
    const cur = fromIso(focusedIso) ?? monthAnchor;
    const next = addMonths(cur, deltaMonths);
    setFocusedIso(toIso(next));
    setMonthAnchor(next);
  };

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        moveFocused(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        moveFocused(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocused(-7);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocused(7);
        break;
      case "PageUp":
        e.preventDefault();
        moveMonth(e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        e.preventDefault();
        moveMonth(e.shiftKey ? 12 : 1);
        break;
      case "Escape":
        e.preventDefault();
        closeCal(true);
        break;
      default:
        /* Enter/Space are left to the day <button>'s own native
           activation (it already calls pick() via onClick), so they are
           not handled a second time here - see the comment on
           .cgCal__day below for why intercepting them too would risk a
           double commit */
        break;
    }
  };

  const weeks = buildWeeks(monthAnchor);
  const selectedIso = fromIso(value) ? toIso(fromIso(value) as Date) : "";
  const todayIso = toIso(new Date());

  return (
    <div className="cgDate" ref={wrapRef}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="cgInput cgDate__input"
        placeholder="YYYY-MM-DD"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commitText(e.target.value);
        }}
        onBlur={() => setText(value)}
      />
      <button
        type="button"
        ref={toggleRef}
        className="cgGhost cgDate__toggle"
        aria-haspopup="grid"
        aria-expanded={open}
        aria-controls={popupId}
        aria-label="Choose a date"
        onClick={() => (open ? closeCal(true) : openCal())}
      >
        <CalendarIcon />
      </button>

      {open && rect && (
        <div
          id={popupId}
          className="cgCal"
          style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
        >
          <div className="cgCal__head">
            <button
              type="button"
              className="cgGhost cgCal__nav"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeftIcon />
            </button>
            <span className="cgCal__month" aria-live="polite">{MONTH_FMT.format(monthAnchor)}</span>
            <button
              type="button"
              className="cgGhost cgCal__nav"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="cgCal__weekdays" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w} className="cgCal__weekday">{w}</span>
            ))}
          </div>

          <div
            className="cgCal__grid"
            role="grid"
            aria-label={MONTH_FMT.format(monthAnchor)}
            onKeyDown={onGridKeyDown}
          >
            {weeks.map((week, wi) => (
              <div className="cgCal__row" role="row" key={wi}>
                {week.map((day) => {
                  const iso = toIso(day);
                  const inMonth = day.getMonth() === monthAnchor.getMonth();
                  const isSelected = iso === selectedIso;
                  const isFocused = iso === focusedIso;
                  return (
                    <button
                      type="button"
                      role="gridcell"
                      key={iso}
                      ref={(el) => {
                        if (el) cellRefs.current.set(iso, el);
                        else cellRefs.current.delete(iso);
                      }}
                      className="cgCal__day"
                      data-outside={!inMonth || undefined}
                      data-today={iso === todayIso || undefined}
                      aria-selected={isSelected}
                      aria-label={DAY_FMT.format(day)}
                      tabIndex={isFocused ? 0 : -1}
                      onClick={() => pick(day)}
                      onFocus={() => setFocusedIso(iso)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
