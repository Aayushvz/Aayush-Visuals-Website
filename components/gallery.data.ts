/*
  The gallery's contents, in one place.

  The gallery is a honeycomb of square tiles around the logo, so every
  picture is cropped to a square; `focus` is the object-position that keeps
  the subject in frame when a portrait or a wide shot is cut down to one.

  The order is the tiles' order, reading the honeycomb row by row:
    row above      two tiles
    middle row     two, the logo, two
    row below      two tiles
  so the first and last pictures are the ones the two floating labels point
  at (see `label`).
*/

export type GalleryItem = {
  src: string;
  alt: string;
  /** object-position for the square crop */
  focus?: string;
  /** a short floating tag pointing at this tile, like a cursor label */
  label?: string;
};

export const GALLERY: GalleryItem[] = [
  {
    src: "/gallery/riviera-group.webp",
    alt: "On the main stage with the crew",
    focus: "50% 50%",
    label: "Riviera crew",
  },
  {
    src: "/gallery/riviera-portrait.webp",
    alt: "Backstage, festival week",
    focus: "50% 25%",
  },
  {
    src: "/gallery/hills-profile.webp",
    alt: "Looking out over the hills outside Vellore",
    focus: "45% 50%",
  },
  {
    src: "/gallery/grass-selfie.webp",
    alt: "Lying on the grass between sessions",
    focus: "50% 35%",
  },
  {
    src: "/gallery/suit-campus.webp",
    alt: "On campus, festival week",
    focus: "50% 30%",
  },
  {
    src: "/gallery/campus-lawn.webp",
    alt: "On the lawn outside Gandhi Block, VIT Vellore",
    focus: "55% 60%",
  },
  {
    src: "/gallery/riviera-badge.webp",
    alt: "A crew pass and a token of appreciation",
    focus: "50% 55%",
  },
  {
    src: "/gallery/crowd-pink.webp",
    alt: "In the crowd on closing night",
    focus: "40% 45%",
    label: "Closing night",
  },
];
