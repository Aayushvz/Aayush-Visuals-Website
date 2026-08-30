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
