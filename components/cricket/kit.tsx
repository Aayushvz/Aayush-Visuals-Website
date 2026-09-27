import type { ReactNode } from "react";
import type { Contact } from "./engine";

/*
  The game kit's drawn pieces: the ones CSS cannot cut on its own.

  The rest of the kit - plates, stickers, tape, the brush lettering, the
  buttons - is plain CSS in kit.css. These three are SVG because they are
  shapes rather than boxes: a rounded triangle, a ring that fills, and a row
  of slots whose state is data.
*/

/* ---------- the triangle badge ----------

   The rounded warning-sign triangle from the HUD reference, carrying a
   number or a short tag. Two fills: the side's own colour for anything
   that identifies a team, fire for anything that was just earned. */
export function TriBadge({
  children,
  tone = "team",
  className = "",
}: {
  children: ReactNode;
  tone?: "team" | "fire" | "out";
  className?: string;
}) {
  return (
    <span className={`k-tri k-tri--${tone} ${className}`}>
      <svg viewBox="0 0 100 90" aria-hidden focusable="false">
        <path
          className="k-tri__body"
          d="M50 5c4.2 0 7.3 2.2 9.5 6l34.7 61c3.8 6.6-.9 13-8.4 13H14.2c-7.5 0-12.2-6.4-8.4-13l34.7-61c2.2-3.8 5.3-6 9.5-6z"
        />
        <path
          className="k-tri__rim"
          d="M50 17.5 83.5 76h-67z"
        />
      </svg>
      <span className="k-tri__text">{children}</span>
    </span>
  );
}

/* ---------- the ring gauge ----------

   A thick ring that fills with fire, a dark core with the value in it. The
   reference's CHARGING / FULL dial; here it is the level, filling with XP. */
export function Gauge({
  value,
  children,
  className = "",
}: {
  /** 0..1 */
  value: number;
  children: ReactNode;
  className?: string;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const v = Math.max(0.02, Math.min(1, value));
  return (
    <span className={`k-gauge ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false">
        <defs>
          <linearGradient id="kFire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffc233" />
            <stop offset="0.5" stopColor="#ff6a13" />
            <stop offset="1" stopColor="#e8261f" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" className="k-gauge__rim" />
        <circle cx="50" cy="50" r={r} className="k-gauge__track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="k-gauge__fill"
          strokeDasharray={`${c * v} ${c}`}
          transform="rotate(-90 50 50)"
        />
        <circle cx="50" cy="50" r="27" className="k-gauge__core" />
      </svg>
      <span className="k-gauge__text">{children}</span>
    </span>
  );
}

/* ---------- the ball slots ----------

   The over as six cards in a rack - the reference's ability slots. A ball
   still to come is a dark slot, the one in hand is dark with a fire edge,
   and a bowled ball turns over to paper with the scorer's mark on it. */
const MARK: Record<Contact, string> = { dot: "•", single: "1", four: "4", six: "6", wicket: "W" };

export function BallSlots({
  log,
  live,
  total = 6,
  className = "",
}: {
  log: Contact[];
  /** index of the ball in hand, or -1 */
  live: number;
  total?: number;
  className?: string;
}) {
  return (
    <span className={`k-slots ${className}`} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const c = log[i];
        const state = c ? `is-${c}` : i === live ? "is-live" : "is-todo";
        return (
          <i key={i} className={`k-slot ${state}`}>
            <b>{c ? MARK[c] : ""}</b>
          </i>
        );
      })}
    </span>
  );
}
