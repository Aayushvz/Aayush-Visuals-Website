/*
  Team logos.

  Each side has a mascot mark in the style of an esports or franchise logo:
  a head built from flat, angular facets, a dark keyline around the whole
  silhouette, and one hot accent (the panther's eyes, the falcon's beak).
  Facets rather than gradients because a logo has to hold at 40px on a
  scoreboard as well as at 160px on a card, and flat planes survive
  shrinking where soft shading turns to mud.

  Colours come from the side's palette: `field` is the primary, `emblem`
  the light partner. The shadow planes are the primary under a translucent
  dark layer, so a third colour never has to be passed in.

  Drawn on a 200x200 grid.
*/

type CrestProps = {
  /** the side's brand colour */
  field: string;
  /** the lighter partner */
  emblem: string;
  className?: string;
};

const INK = "#0a0722";
const SHADE = "rgba(8, 4, 30, 0.45)";

export function PantherCrest({ field, emblem, className }: CrestProps) {
  return (
    <svg viewBox="0 0 200 200" className={`crest crest--panther ${className ?? ""}`} aria-hidden focusable="false">
      {/* the silhouette, keyline first */}
      <path
        d="M36 26 72 50 100 44 128 50 164 26 162 78 176 106 152 142 128 170 100 182 72 170 48 142 24 106 38 78Z"
        fill={field}
        stroke={INK}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      {/* ears: the inner ear in the light colour */}
      <path d="M46 42 68 56 52 74Z" fill={emblem} />
      <path d="M154 42 132 56 148 74Z" fill={emblem} />
      {/* the shadow planes down the sides of the face */}
      <path d="M38 78 24 106 48 142 66 124 58 100Z" fill={SHADE} />
      <path d="M162 78 176 106 152 142 134 124 142 100Z" fill={SHADE} />
      <path d="M72 170 100 182 128 170 116 156 100 162 84 156Z" fill={SHADE} />
      {/* the lit plane down the brow */}
      <path d="M100 48 122 84 100 118 78 84Z" fill={emblem} opacity="0.55" />
      {/* brows, heavy and angled down to the nose */}
      <path d="M46 86 90 94 86 102 50 96Z" fill={INK} />
      <path d="M154 86 110 94 114 102 150 96Z" fill={INK} />
      {/* eyes */}
      <path d="M56 99 86 104 80 115 62 110Z" fill="#d7ff3d" />
      <path d="M144 99 114 104 120 115 138 110Z" fill="#d7ff3d" />
      <path d="M71 101 75 102 73 113 70 112Z" fill={INK} />
      <path d="M129 101 125 102 127 113 130 112Z" fill={INK} />
      {/* the muzzle */}
      <path d="M78 130 100 120 122 130 118 154 100 164 82 154Z" fill={emblem} />
      <path d="M100 120 122 130 118 154 100 164Z" fill={SHADE} opacity="0.5" />
      {/* nose and mouth */}
      <path d="M88 126 112 126 100 140Z" fill={INK} />
      <path d="M100 140 100 148 M100 148 88 154 M100 148 112 154" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* fangs */}
      <path d="M89 153 95 152 92 163Z" fill="#fff" />
      <path d="M111 153 105 152 108 163Z" fill="#fff" />
    </svg>
  );
}

export function FalconCrest({ field, emblem, className }: CrestProps) {
  return (
    <svg viewBox="0 0 200 200" className={`crest crest--falcon ${className ?? ""}`} aria-hidden focusable="false">
      {/* swept feathers behind the head, drawn first so the head sits on them */}
      <path
        d="M58 70 14 70 44 90 8 104 42 116 12 140 50 140 60 118Z"
        fill={emblem}
        stroke={INK}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      {/* the head */}
      <path
        d="M46 154 40 112 54 70 82 42 118 34 150 46 170 70 182 94 170 118 158 106 148 112 140 126 128 154 112 180 78 182Z"
        fill={field}
        stroke={INK}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      {/* the lit crown */}
      <path d="M82 42 118 34 150 46 112 66 84 80Z" fill={emblem} opacity="0.6" />
      {/* shadow down the back of the neck */}
      <path d="M46 154 40 112 60 118 76 150 78 182Z" fill={SHADE} />
      {/* the beak: gold, hooked, with its lower edge in shadow */}
      <path d="M146 70 170 70 182 94 170 118 160 102 146 98Z" fill="#ffc83d" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M160 102 170 118 182 94 172 96Z" fill="#c9861a" />
      {/* the brow ridge, heavy over the eye */}
      <path d="M104 66 150 60 144 72 110 76Z" fill={INK} />
      {/* eye */}
      <circle cx="130" cy="84" r="10" fill="#fff5cc" stroke={INK} strokeWidth="4" />
      <circle cx="132" cy="84" r="4.5" fill={INK} />
      {/* the falcon's tear mark, running down from the eye */}
      <path d="M120 94 136 96 126 134 112 124Z" fill={INK} />
      {/* a pale chest plane */}
      <path d="M128 154 112 180 92 164 114 134Z" fill={emblem} opacity="0.7" />
    </svg>
  );
}

export function Crest({
  id,
  field,
  emblem,
  className,
}: CrestProps & { id: "panthers" | "falcons" }) {
  const C = id === "panthers" ? PantherCrest : FalconCrest;
  return <C field={field} emblem={emblem} className={className} />;
}
