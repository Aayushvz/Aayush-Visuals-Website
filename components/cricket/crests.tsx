/*
  Team crests.

  These replace the emoji mascots the cards used to carry. Emoji were
  never really placeholders here — they were the whole identity of a card
  that is otherwise asking to be read as a collectible, and they render as
  a different drawing on every platform, at a weight nobody chose, with no
  way to tint them to the side's colours. The design checklist has a flat
  rule about it: icons are SVG, not emoji.

  Both crests are built on one shield so the two sides read as belonging
  to the same league — the field colour and the emblem inside it are the
  only things that change. The shield carries a gold rim because gold is
  this kit's "earned" colour everywhere else too, and a crest is the one
  piece of a team card that should look like it was awarded.

  Drawn on a 100x110 grid at a single weight. No gradients inside the
  emblem itself: at the size a card shows this, gradient detail turns to
  mud, and a flat silhouette is what survives.
*/

type CrestProps = {
  /** the side's brand colour — fills the shield's field */
  field: string;
  /** the lighter partner, used for the emblem so it lifts off the field */
  emblem: string;
  className?: string;
};

const SHIELD =
  "M50 3 L92 12 C94.2 12.5 95 14 95 16 V56 C95 82 76 98.5 50 107 C24 98.5 5 82 5 56 V16 C5 14 5.8 12.5 8 12 Z";

/*
  The rim is one path drawn twice — once thick in gold as the outer edge,
  once as the clipped field on top. Stroking a single shape beats nesting
  two scaled copies, which never keeps an even margin around a shield's
  point.
*/
function Shield({
  field,
  children,
  title,
}: {
  field: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <svg viewBox="0 0 100 110" role="img" aria-label={title} className="crest">
      <defs>
        <linearGradient id={`crestRim-${title}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe071" />
          <stop offset="50%" stopColor="#ffc32e" />
          <stop offset="100%" stopColor="#e08a12" />
        </linearGradient>
        <linearGradient id={`crestField-${title}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={field} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0d1f52" />
        </linearGradient>
      </defs>

      {/* the plate, then the rim over it, so the gold edge is never cut by
          the field's own antialiasing */}
      <path d={SHIELD} fill={`url(#crestField-${title})`} />
      <path
        d={SHIELD}
        fill="none"
        stroke={`url(#crestRim-${title})`}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {/* the highlight across the shield's upper half, matching the panels */}
      <path
        d="M50 3 L92 12 C94.2 12.5 95 14 95 16 V44 C72 54 28 54 5 44 V16 C5 14 5.8 12.5 8 12 Z"
        fill="#ffffff"
        opacity="0.1"
      />
      {children}
    </svg>
  );
}

/* --- Pixel Panthers ---------------------------------------------------
   A panther head squared off to the grid. The brief for this side is
   "every pixel matters", so the silhouette is deliberately built from
   straight cuts and right angles rather than the curves a big-cat crest
   would normally use — the shape argues the same thing the card's copy
   does. */
export function PantherCrest({ field, emblem, className }: CrestProps) {
  return (
    <span className={className}>
      <Shield field={field} title="Panthers">
        <g fill={emblem}>
          {/* ears */}
          <path d="M26 34 L38 30 L36 44 Z" />
          <path d="M74 34 L62 30 L64 44 Z" />
          {/* skull */}
          <path d="M30 38 H70 L74 58 L64 76 H36 L26 58 Z" />
        </g>
        {/* eyes — cut out of the skull rather than drawn on it, so the
            silhouette stays one solid shape */}
        <g fill="#0d1f52">
          <path d="M34 50 L45 53 L43 60 L34 57 Z" />
          <path d="M66 50 L55 53 L57 60 L66 57 Z" />
        </g>
        {/* muzzle */}
        <path d="M44 64 H56 L53 71 H47 Z" fill="#0d1f52" />
        {/* whisker rule, the one straight highlight */}
        <path d="M38 68 H30 M62 68 H70" stroke={emblem} strokeWidth="2.5" strokeLinecap="square" />
      </Shield>
    </span>
  );
}

/* --- Flow Falcons -----------------------------------------------------
   A falcon in profile, all swept diagonals. This side's argument is speed
   and flow, so every line in the emblem leans forward; nothing in it is
   vertical. */
export function FalconCrest({ field, emblem, className }: CrestProps) {
  return (
    <span className={className}>
      <Shield field={field} title="Falcons">
        <g fill={emblem}>
          {/* swept crown and nape */}
          <path d="M28 32 L66 38 L72 52 L58 50 L46 74 L34 68 L30 52 Z" />
          {/* beak, hooked down past the jaw line */}
          <path d="M66 50 L84 54 L74 62 L64 58 Z" />
          {/* the trailing crest feather */}
          <path d="M28 32 L20 46 L31 44 Z" />
        </g>
        {/* eye, and the brow bar that gives a falcon its scowl */}
        <circle cx="60" cy="47" r="4" fill="#0d1f52" />
        <path d="M50 40 L70 44" stroke="#0d1f52" strokeWidth="3.5" strokeLinecap="round" />
      </Shield>
    </span>
  );
}

/** Pick a crest by team id, so callers never switch on it themselves. */
export function Crest({
  id,
  field,
  emblem,
  className,
}: CrestProps & { id: "panthers" | "falcons" }) {
  const C = id === "panthers" ? PantherCrest : FalconCrest;
  return <C field={field} emblem={emblem} className={className} />;
}
