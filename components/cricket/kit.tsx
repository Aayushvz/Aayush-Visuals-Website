import type { ReactNode } from "react";
import type { Contact } from "./engine";

/*
  The game kit's drawn pieces - the shapes CSS cannot cut cleanly with a
  proper outline: a hex badge, a ribbon with notched tails, a star. Each is
  an SVG with a navy stroke, so it carries the same 3px outline as every
  button and panel in kit.css. Colour comes from a `tone` that maps to the
  kit's palette, so no call site ever names a hex value.
*/

export type Tone = "blue" | "green" | "yellow" | "purple" | "red" | "navy" | "team" | "gold";

/* ---------- hex badge: levels, results, team marks ---------- */
export function Hex({
  children,
  tone = "blue",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`g-hex g-tone--${tone} ${className}`}>
      <svg viewBox="0 0 100 110" aria-hidden focusable="false">
        <path
          className="g-hex__lip"
          d="M50 8 91 31v48L50 102 9 79V31z"
          transform="translate(0 6)"
        />
        <path className="g-hex__face" d="M50 8 91 31v48L50 102 9 79V31z" />
        <path className="g-hex__shine" d="M50 18 81 36v10L50 28 19 46V36z" />
      </svg>
      <span className="g-hex__text">{children}</span>
    </span>
  );
}

/* ---------- ribbon: headings that hang across a panel's top edge ---------- */
export function Ribbon({
  children,
  tone = "red",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`g-ribbon g-tone--${tone} ${className}`}>
      <svg className="g-ribbon__tails" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path className="g-ribbon__tail" d="M2 12h26v26H2l8-13z" />
        <path className="g-ribbon__tail" d="M198 12h-26v26h26l-8-13z" />
      </svg>
      <span className="g-ribbon__body">{children}</span>
    </span>
  );
}

/* ---------- the over, as six numbered pips ----------

   Each pip is a small chunky tile. A ball to come shows its number on grey,
   the one in hand is white with a pulsing yellow ring, and a bowled ball
   takes the colour of what happened: blue for a run, green four, yellow six,
   red wicket, slate for a dot. */
const MARK: Record<Contact, string> = { dot: "•", single: "1", four: "4", six: "6", wicket: "W" };

export function Pips({
  log,
  live,
  total = 6,
  className = "",
}: {
  log: Contact[];
  live: number;
  total?: number;
  className?: string;
}) {
  return (
    <span className={`g-pips ${className}`} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const c = log[i];
        const state = c ? `is-${c}` : i === live ? "is-live" : "is-todo";
        return (
          <i key={i} className={`g-pip ${state}`}>
            {c ? MARK[c] : i + 1}
          </i>
        );
      })}
    </span>
  );
}

/* ---------- stars, for the scorecard's rating ---------- */
export function Stars({ earned, total = 3 }: { earned: number; total?: number }) {
  return (
    <span className="g-stars" aria-label={`${earned} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 100 96"
          className={`g-star ${i < earned ? "is-on" : ""}`}
          style={{ animationDelay: `${0.25 + i * 0.18}s` }}
          aria-hidden
          focusable="false"
        >
          <path d="M50 6l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 37l30-4z" />
          <path className="g-star__shine" d="M50 18l8 17 17 2-5 5-13-2-7-14z" />
        </svg>
      ))}
    </span>
  );
}

/* ---------- a switch ---------- */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span className="g-toggle" data-on={on || undefined} aria-hidden>
      <i />
    </span>
  );
}

/* ---------- small icons in the kit's own style ---------- */
export function BallIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`g-ico ${className}`} aria-hidden focusable="false">
      <circle cx="20" cy="20" r="16" fill="#e8423a" stroke="#1b1d3a" strokeWidth="3.5" />
      <path d="M11 9c5 6 5 16 0 22M29 9c-5 6-5 16 0 22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2.5 3" />
      <ellipse cx="14" cy="13" rx="4" ry="2.4" fill="#fff" opacity="0.55" transform="rotate(-30 14 13)" />
    </svg>
  );
}

export function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`g-ico ${className}`} aria-hidden focusable="false">
      <path d="M23 3 8 23h11l-3 14 16-21H21z" fill="#fac602" stroke="#1b1d3a" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M21 9l-7 10h4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/* ---------- the burst: the comic-book ground behind full-screen menus ----------

   Jagged rays exploding from the centre, a halftone wash and a few speed
   streaks: the energy of a fighting-game select screen, in one colour
   family per screen. The rays are generated once at module load from a
   fixed seed, so every visit draws the same burst and the server and the
   browser agree on the markup. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function burstPaths(seed: number, count: number, jag: boolean) {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.2;
    const w = 0.05 + r() * 0.07;
    const inner = 10 + r() * 14;
    const outer = 95 + r() * 30;
    const p = (ang: number, rad: number) =>
      `${(50 + Math.cos(ang) * rad).toFixed(2)} ${(50 + Math.sin(ang) * rad).toFixed(2)}`;
    if (jag) {
      /* a lightning spike: out, kick sideways, out again to a point */
      const mid = inner + (outer - inner) * (0.45 + r() * 0.15);
      out.push(
        `M${p(a - w * 0.5, inner)}L${p(a - w, mid)}L${p(a - w * 0.1, mid + 3)}L${p(a, outer)}L${p(a + w * 0.4, mid - 4)}L${p(a + w * 1.1, mid - 2)}L${p(a + w * 0.5, inner)}Z`
      );
    } else {
      out.push(`M${p(a - w * 0.3, inner)}L${p(a - w, outer)}L${p(a + w, outer)}L${p(a + w * 0.3, inner)}Z`);
    }
  }
  return out;
}

const RAYS_BIG = burstPaths(7, 18, true);
const RAYS_SMALL = burstPaths(31, 26, false);

export function Burst({ tone, className = "" }: { tone: "blue" | "purple" | "yellow" | "red"; className?: string }) {
  return (
    <div className={`g-burst g-burst--${tone} ${className}`} aria-hidden>
      <svg className="g-burst__rays" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" focusable="false">
        <g className="g-burst__far">
          {RAYS_SMALL.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="g-burst__near">
          {RAYS_BIG.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      <span className="g-burst__dots" />
      <span className="g-burst__streak g-burst__streak--a" />
      <span className="g-burst__streak g-burst__streak--b" />
      <span className="g-burst__glow" />
    </div>
  );
}

/* ============ the hit stamp ============

   The shot receipt keeps the previous kit's stamp - a rounded warning
   triangle carrying the runs, a torn paper sticker with the verdict, and
   the points in a fire brush - because it is the one moment that should
   feel different from the menu furniture around it: it is a hit landing,
   and it is styled like one. Its CSS lives in kit.css under "hit stamp". */
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
