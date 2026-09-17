import Image from "next/image";

/*
  Cover art.

  A store shelf is only as good as its box art, and the old tile put a flat
  vector badge on a flat dark square, which is a logo on a background rather
  than a cover. These are built as layered art instead: a lit room, a subject
  standing in it, and a title lockup burned into the bottom of the frame the
  way a real key art plate works.

  Drawn rather than photographed on purpose. A raster cover would be one more
  image to ship, would need a 2x and a 3x, and would go stale the moment the
  game's palette moved. Everything here is gradients, one masked dot field
  and one sprite the game already loads, so it is sharp at any card size and
  costs almost nothing over the sprite itself.
*/

export function DplCover() {
  return (
    <div className="dplCover">
      {/* the night, and the floodlights standing in it */}
      <div className="dplCover__sky" />
      <i className="dplCover__beam dplCover__beam--l" />
      <i className="dplCover__beam dplCover__beam--r" />
      <div className="dplCover__crowd" />
      <div className="dplCover__bloom" />
      <div className="dplCover__pitch" />

      {/*
        The shot itself. A cover for a cricket game has to show the ball
        leaving, not a player standing: the dashed arc is the whole story of
        the game (one over, six balls) in a mark you read before the title.
      */}
      <svg
        className="dplCover__arc"
        viewBox="0 0 300 400"
        fill="none"
        aria-hidden
        focusable="false"
        preserveAspectRatio="none"
      >
        <path
          d="M168 168 C214 118, 256 76, 300 44"
          stroke="rgba(196, 181, 253, 0.5)"
          strokeWidth="2"
          strokeDasharray="7 9"
          strokeLinecap="round"
        />
        <circle cx="276" cy="60" r="17" fill="rgba(167, 139, 250, 0.18)" />
        <circle cx="276" cy="60" r="8" fill="#a78bfa" />
        <circle cx="273.5" cy="57" r="2.6" fill="rgba(255,255,255,0.85)" />
      </svg>

      <Image
        className="dplCover__figure"
        src="/cricket/falcons/batter/six-2.webp"
        alt=""
        width={142}
        height={399}
        sizes="(max-width: 640px) 44vw, (max-width: 1100px) 30vw, 300px"
      />

      <div className="dplCover__scrim" />

      {/* the lockup, and nothing else. A tagline under the title is the
          first thing to go on box art: the card already says what this is
          on the line underneath it. */}
      <div className="dplCover__lock">
        <span className="dplCover__name">
          Design
          <br />
          Premier
          <br />
          League
        </span>
      </div>
    </div>
  );
}

/*
  Lotus Pond's cover.

  The game is pixel art, so the cover is drawn on a pixel grid too rather than
  in the smooth gradients the cricket cover uses - a cover that does not look
  like the thing behind it is a lie the first click exposes. Every colour here
  is lifted from the game's own palette (components/pond/config/theme.ts): the
  night sky ramp, the moon, the layered hills, the teal water and the moon's
  path across it, a lily pad and the frog sitting on it.

  One SVG on a 60x80 grid with shape-rendering: crispEdges, scaled to whatever
  the card is. That keeps it sharp at any size, ships nothing, and means the
  cover is authored in the same units as the game.
*/
export function PondCover() {
  /* the sky ramp, drawn as bands so it reads as dithered dusk rather than a
     CSS gradient pretending to be pixel art */
  const sky: [number, number, string][] = [
    [0, 9, "#0b1022"],
    [9, 7, "#141a34"],
    [16, 7, "#1e2348"],
    [23, 6, "#2a2b55"],
    [29, 5, "#3b3f6b"],
    [34, 4, "#574a6e"],
    [38, 3, "#7c5872"],
    [41, 3, "#3f5d70"],
  ];

  return (
    <div className="pondCover">
      <svg
        className="pondCover__art"
        viewBox="0 0 60 80"
        shapeRendering="crispEdges"
        aria-hidden
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
      >
        {sky.map(([y, h, fill]) => (
          <rect key={y} x="0" y={y} width="60" height={h} fill={fill} />
        ))}

        {/* stars, thinning out toward the horizon glow */}
        {[
          [6, 4], [14, 7], [23, 3], [31, 8], [39, 5], [47, 3],
          [52, 9], [9, 13], [27, 15], [44, 12], [56, 6], [19, 20],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#c7d2f2" />
        ))}

        {/* the moon, the pond's only light source */}
        <circle cx="43" cy="13" r="8" fill="#aebbe0" opacity="0.16" />
        <circle cx="43" cy="13" r="5" fill="#f5eccb" />
        <circle cx="45" cy="12" r="1" fill="#e4d8ad" />
        <circle cx="41" cy="15" r="1" fill="#e4d8ad" />

        {/* hills, far to near */}
        <path d="M0 34 L11 26 L20 32 L29 25 L40 33 L50 27 L60 33 L60 44 L0 44 Z" fill="#242c50" />
        <path d="M0 38 L9 32 L18 37 L27 31 L37 38 L47 33 L60 39 L60 46 L0 46 Z" fill="#1c2344" />
        <path d="M0 42 L13 37 L24 42 L36 37 L48 42 L60 38 L60 47 L0 47 Z" fill="#161c38" />

        {/* water */}
        <rect x="0" y="44" width="60" height="8" fill="#0e1b30" />
        <rect x="0" y="52" width="60" height="10" fill="#123049" />
        <rect x="0" y="62" width="60" height="18" fill="#164a54" />

        {/* the moon's reflection, broken into a wobbling path */}
        {[
          [41, 46, 5], [40, 49, 7], [42, 52, 4], [39, 55, 8],
          [41, 58, 5], [38, 61, 9], [41, 65, 6], [39, 69, 8],
        ].map(([x, y, w]) => (
          <rect key={y} x={x} y={y} width={w} height="1" fill="#b3bfe0" opacity="0.42" />
        ))}

        {/* shimmer glints */}
        {[[8, 50, 3], [17, 57, 4], [5, 64, 5], [24, 68, 3], [50, 72, 4]].map(
          ([x, y, w]) => (
            <rect key={`g${y}`} x={x} y={y} width={w} height="1" fill="#54a0a6" opacity="0.5" />
          )
        )}

        {/* the hero lily pad, with the notch every pad has */}
        <ellipse cx="24" cy="64" rx="14" ry="4" fill="#1f3f2e" />
        <ellipse cx="24" cy="63" rx="14" ry="4" fill="#2f5a3f" />
        <ellipse cx="24" cy="62" rx="11" ry="3" fill="#437052" />
        <path d="M24 62 L34 59 L34 65 Z" fill="#1f3f2e" />

        {/* a second pad, further out */}
        <ellipse cx="48" cy="70" rx="9" ry="3" fill="#1f3f2e" />
        <ellipse cx="48" cy="69" rx="9" ry="3" fill="#2f5a3f" />

        {/* lotus blooms on the bank */}
        <g>
          <rect x="8" y="58" width="1" height="4" fill="#437052" />
          <circle cx="8.5" cy="57" r="2" fill="#e79ab0" />
          <circle cx="8.5" cy="56.6" r="1" fill="#f6d98a" />
          <rect x="54" y="63" width="1" height="4" fill="#437052" />
          <circle cx="54.5" cy="62" r="1.6" fill="#f4bcca" />
        </g>

        {/*
          The frog, sitting on the hero pad. Drawn at the game's own scale -
          eight pixels of body, two eyes, a belly and a cheek blush - because
          the whole appeal of this thing is that it is small and hand-placed.
        */}
        <g>
          {/* body */}
          <rect x="19" y="53" width="10" height="8" fill="#7cbf74" />
          <rect x="18" y="55" width="1" height="5" fill="#5f9d5c" />
          <rect x="29" y="55" width="1" height="5" fill="#5f9d5c" />
          <rect x="20" y="52" width="8" height="1" fill="#9bd68c" />
          {/* belly */}
          <rect x="21" y="58" width="6" height="3" fill="#f2ead0" />
          <rect x="21" y="61" width="6" height="1" fill="#dfcfa8" />
          {/* legs, tucked */}
          <rect x="17" y="59" width="3" height="2" fill="#5f9d5c" />
          <rect x="28" y="59" width="3" height="2" fill="#5f9d5c" />
          {/* eyes */}
          <rect x="19" y="50" width="4" height="4" fill="#7cbf74" />
          <rect x="25" y="50" width="4" height="4" fill="#7cbf74" />
          <rect x="20" y="51" width="2" height="2" fill="#232f3a" />
          <rect x="26" y="51" width="2" height="2" fill="#232f3a" />
          <rect x="20" y="51" width="1" height="1" fill="#eaf2ff" />
          <rect x="26" y="51" width="1" height="1" fill="#eaf2ff" />
          {/* cheek + mouth */}
          <rect x="18" y="56" width="2" height="1" fill="#e79ab0" opacity="0.7" />
          <rect x="22" y="56" width="4" height="1" fill="#3a4a3f" />
        </g>

        {/* fireflies, the thing that multiplies as you play */}
        {[[12, 44], [37, 41], [52, 50], [30, 47], [45, 57]].map(([x, y]) => (
          <g key={`f${x}`}>
            <circle cx={x} cy={y} r="2" fill="#ffe9a3" opacity="0.18" />
            <rect x={x} y={y} width="1" height="1" fill="#ffe9a3" />
          </g>
        ))}
      </svg>

      <div className="pondCover__scrim" />

      <div className="pondCover__lock">
        <span className="pondCover__name">
          Lotus
          <br />
          Pond
        </span>
      </div>
    </div>
  );
}

/*
  Contract Generator's cover.

  The other two covers mirror a scene - a stadium, a pond at night. This one
  mirrors a document, because that is the whole product: type into a form on
  the left, watch a page assemble itself on the right. So the cover is that
  page, standing upright on a dark ground the way box art plants its subject
  in a room. Hairline rules stand in for clause text the way the arc stood in
  for the six on the cricket cover - a reading of the thing rather than the
  thing itself, legible at card size - and one violet mark sits where a
  signature goes, because that is the single moment the tool is building
  toward.

  Drawn, not photographed, same as the other two: the ground is a gradient,
  the page is an SVG rect with a hairline border, and the rules and the
  signature are vector paths. Nothing here is a raster asset. The paper and
  its rules borrow the shelf's own ink tokens (`--pg-fg`, `--pg-mute`,
  `--pg-faint`, `--pg-hair`) rather than inventing a second grayscale, and the
  signature is `--pg-accent` - the same violet the rest of the shelf already
  uses for its one accent colour.
*/
export function ContractCover() {
  /* body rules: two short paragraphs with a gap between them, each line a
     little narrower or wider than its neighbour so the block reads as
     ragged-right text instead of a bar chart. x is constant (rules are
     left-aligned, like real copy); y and width vary. */
  const rules: [number, number][] = [
    [84, 118], [99, 100], [114, 124], [129, 90],
    [152, 112], [167, 96], [182, 120], [197, 104],
    [220, 108], [235, 88],
  ];

  return (
    <div className="contractCover">
      {/* the ground the page stands on, lit low and slightly warm behind
          it so the sheet reads as the one lit thing in the frame */}
      <div className="contractCover__ground" />
      <div className="contractCover__glow" />

      <svg
        className="contractCover__sheet"
        viewBox="0 0 300 400"
        aria-hidden
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="contractCover__page">
          <rect
            className="contractCover__paper"
            x="66"
            y="28"
            width="168"
            height="326"
            rx="4"
          />

          {/* the heading rule - the one line heavy enough to read as a
              title rather than body copy */}
          <rect
            className="contractCover__rule contractCover__rule--head"
            x="92"
            y="58"
            width="84"
            height="7"
            rx="2"
          />

          {/* clause text, standing in for itself */}
          {rules.map(([y, w]) => (
            <rect
              key={y}
              className="contractCover__rule contractCover__rule--body"
              x="92"
              y={y}
              width={w}
              height="4"
              rx="1.5"
            />
          ))}

          {/* the signature line, and the one mark a person makes on this
              page rather than the tool */}
          <rect
            className="contractCover__rule contractCover__rule--sig"
            x="92"
            y="270"
            width="76"
            height="1.5"
          />
          <path
            className="contractCover__mark"
            d="M97 262 C104 251, 112 268, 120 256 S 136 246, 144 258 S 160 250, 166 259"
            fill="none"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      <div className="contractCover__scrim" />

      <div className="contractCover__lock">
        <span className="contractCover__name">
          Contract
          <br />
          Generator
        </span>
      </div>
    </div>
  );
}

/*
  The vacant cover.

  Same footprint and the same darkness as a real one, so the row keeps its
  rhythm, but with nothing in it and no pretend title. An empty slot that
  looks like a card still loading is worse than one that plainly says it is
  empty, so this says it.
*/
export function SlotCover({ index }: { index: string }) {
  return (
    <div className="slotCover">
      <div className="slotCover__grid" />
      <span className="slotCover__index">{index}</span>
      <span className="slotCover__plus" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
