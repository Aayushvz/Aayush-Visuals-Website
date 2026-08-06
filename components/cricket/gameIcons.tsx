/*
  The kit's icon set.

  Small, single-purpose glyphs for the stat strips and dashboards. Drawn on
  a 24-grid at a 2px stroke (or as solid fills where the reference kit uses
  a filled shape), so they sit at the same visual weight as each other no
  matter which panel they land in.

  Kept together in one file rather than inlined at each call site because
  the stat strip, the result summary and the HUD all want the same three or
  four shapes, and three copies of a path is how a set drifts out of
  alignment.
*/

type IconProps = { className?: string };

/** timing — the window a shot has to land in */
export function CrosshairIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path
        d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** reward — the multiplier a perfect shot pays */
export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M12 2.6l2.9 6.05 6.6.86-4.85 4.6 1.23 6.56L12 17.5l-5.88 3.17 1.23-6.56L2.5 9.51l6.6-.86z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** power — how often the side clears the rope */
export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M13.5 2L4 13.2h6.1L9.4 22 20 10.4h-6.4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M7 3h10v6a5 5 0 01-10 0z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4.5v2A3.5 3.5 0 007.6 10.5M17 5h2.5v2a3.5 3.5 0 01-3.1 3.5M12 14v4M8.5 21h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** the ball, used wherever a count of deliveries is shown */
export function BallIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path
        d="M12 3.4c2.4 2.2 3.7 5.2 3.7 8.6S14.4 18.4 12 20.6"
        fill="none"
        stroke="#0d1f52"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.6 4.1c2 2.1 3.1 4.8 3.1 7.9s-1.1 5.8-3.1 7.9"
        fill="none"
        stroke="#0d1f52"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M12 10.5v6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="6.8" r="1.6" fill="currentColor" />
    </svg>
  );
}
