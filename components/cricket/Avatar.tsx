/*
  The commentator's portrait.

  The commentary panel used to be a paragraph in a box. The comp gives it a
  face, and the face is doing real work: it is what marks the line as
  someone talking rather than as UI text, which is the difference between
  "No shot, and that is the stumps" reading as commentary and reading as an
  error message.

  Drawn rather than photographed, in the game's own palette, so it costs no
  request and re-tints with the rest of the kit.
*/

export default function Avatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <defs>
        <clipPath id="avClip">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="30" fill="#12408f" />

      <g clipPath="url(#avClip)">
        {/* shoulders */}
        <path d="M4 64c0-14 12-21 28-21s28 7 28 21z" fill="#1f66c4" />
        <path d="M26 45h12v10a6 6 0 0 1-12 0z" fill="#e8b088" />

        {/* head */}
        <ellipse cx="32" cy="30" rx="15" ry="16.5" fill="#f0bd93" />

        {/* hair, swept and blocky — it reads at 44px, a soft one does not */}
        <path d="M16 27c0-11 7-16 16-16s16 5 16 16c0-6-5-8-9-7-5 1-8 3-14 2-5-1-8 1-9 5z" fill="#1a1a22" />

        {/* glasses: two rounded squares and a bridge */}
        <g fill="none" stroke="#0f1b3d" strokeWidth="2">
          <rect x="20" y="26" width="11" height="9" rx="3" />
          <rect x="33" y="26" width="11" height="9" rx="3" />
          <path d="M31 30.5h2" />
        </g>
        <g fill="#ffffff" opacity="0.28">
          <rect x="21" y="27" width="9" height="7" rx="2" />
          <rect x="34" y="27" width="9" height="7" rx="2" />
        </g>

        {/* the smile */}
        <path
          d="M27 39c1.6 2 3.2 3 5 3s3.4-1 5-3"
          fill="none"
          stroke="#8a4b32"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* the rim last, so the clip never eats it */}
      <circle cx="32" cy="32" r="30" fill="none" stroke="#7cc4ff" strokeWidth="4" />
    </svg>
  );
}
