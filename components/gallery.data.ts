/*
  The gallery's contents, in one place.

  Every item carries its own `w` and `ratio` because the row is a set of
  photographs, not a grid of tiles: portraits and landscapes forced to a
  common height would either crop the portraits to nothing or leave the
  landscapes swimming in empty space. The ratios here are the files' real
  proportions, so nothing is squeezed.

  `drop` is how far the item hangs below the top of the track, as a fraction
  of the tallest card. It is what stops the row reading as a filmstrip: the
  eye follows a line that rises and falls rather than a ruler.

  The order alternates BOTH orientation and subject. Three landscapes in a
  row read as one long band, and the festival pictures bunched together read
  as one event rather than a year. Five of the eight are from the same
  festival, so by pigeonhole one adjacent pair is unavoidable - it is placed
  where the two frames look least alike (a wide crowd beside a close
  portrait).
*/

export type GalleryItem = {
  src: string;
  alt: string;
  /** card width in px at the reference scale */
  w: number;
  /** the picture's own proportions, width / height */
  ratio: string;
  /** 0 = flush with the top of the track, 1 = one full drop down */
  drop: number;
};

export const GALLERY: GalleryItem[] = [
  {
    src: "/gallery/riviera-group.webp",
    alt: "On the main stage with the crew",
    w: 460,
    ratio: "16 / 9",
    drop: 0.16,
  },
  {
    src: "/gallery/grass-selfie.webp",
    alt: "Lying on the grass between sessions",
    w: 260,
    ratio: "9 / 16",
    drop: 0.1,
  },
  {
    src: "/gallery/suit-campus.webp",
    alt: "On campus, festival week",
    /* the supplied crop is 407px wide, so the card is held near that: at a
       larger width a high-DPI screen would be upscaling it */
    w: 280,
    ratio: "407 / 450",
    drop: 0.04,
  },
  {
    src: "/gallery/campus-lawn.webp",
    alt: "On the lawn outside Gandhi Block, VIT Vellore",
    w: 460,
    ratio: "16 / 9",
    drop: 0.4,
  },
  {
    src: "/gallery/riviera-badge.webp",
    alt: "A crew pass and a token of appreciation",
    w: 260,
    ratio: "9 / 16",
    drop: 0.08,
  },
  {
    src: "/gallery/hills-profile.webp",
    alt: "Looking out over the hills outside Vellore",
    w: 340,
    ratio: "1 / 1",
    drop: 0.36,
  },
  {
    src: "/gallery/crowd-pink.webp",
    alt: "In the crowd on closing night",
    w: 460,
    ratio: "16 / 9",
    drop: 0.32,
  },
  {
    src: "/gallery/riviera-portrait.webp",
    alt: "Backstage, festival week",
    w: 300,
    ratio: "3 / 4",
    drop: 0,
  },
];
