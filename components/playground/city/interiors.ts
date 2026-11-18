/*
  City of Creators — the rooms behind the doors.

  Each discovery building opens into its own interior with its own
  palette, furniture and resident. A door that opens a dialog box is a
  website wearing a game; a door you walk through is a game.

  Furniture is painted with canvas primitives at render time rather than
  baked into the sprite atlas. That is the whole reason eight rooms can
  each have their own mood for free: the same sofa drawn with the Legal
  Archive's greys and with the Festival Hall's magentas is two different
  sofas, at no extra cost in memory or download.
*/

export const TILE = 16;

export type Kind =
  | "rug"
  | "sofa"
  | "chair"
  | "table"
  | "desk"
  | "shelf"
  | "plant"
  | "lamp"
  | "arcade"
  | "monitor"
  | "counter"
  | "bed"
  | "crate"
  | "poster"
  | "window"
  | "plinth";

export type Item = {
  k: Kind;
  /** tile coords, top-left */
  x: number;
  y: number;
  /** size in tiles; defaults to 1x1 */
  w?: number;
  h?: number;
  /** override colour, otherwise the room's accent */
  c?: string;
  /** can the hero walk through it */
  pass?: boolean;
};

export type RoomPalette = {
  floor: string;
  floorAlt: string;
  wall: string;
  wallTrim: string;
  accent: string;
  accent2: string;
  wood: string;
};

export type Room = {
  name: string;
  /** the line the resident says */
  greeting: string;
  w: number;
  h: number;
  pal: RoomPalette;
  items: Item[];
  /** where the project plinth stands; walking into it opens the work */
  plinth: { x: number; y: number };
  /** the resident, drawn with the NPC sprite */
  npc?: { x: number; y: number; variant: number; name: string };
};

const SOLID_KINDS: ReadonlySet<Kind> = new Set<Kind>([
  "sofa",
  "chair",
  "table",
  "desk",
  "shelf",
  "plant",
  "arcade",
  "counter",
  "bed",
  "crate",
  "plinth",
]);

export const itemSolid = (it: Item) => !it.pass && SOLID_KINDS.has(it.k);

/* ── palettes, one per room's mood ───────────────────────────────── */

const P = {
  lounge: {
    floor: "#c9a071", floorAlt: "#bd9365", wall: "#e3d3b8", wallTrim: "#8a6a4a",
    accent: "#c4633f", accent2: "#5f8f6a", wood: "#8a5a3a",
  },
  studio: {
    floor: "#7f8aa6", floorAlt: "#76819b", wall: "#cdd6e6", wallTrim: "#56607a",
    accent: "#3f7fae", accent2: "#53b0a0", wood: "#6b5a46",
  },
  archive: {
    floor: "#9a9387", floorAlt: "#918a7e", wall: "#d8d2c4", wallTrim: "#6a6458",
    accent: "#55606e", accent2: "#8d7a56", wood: "#6f5a42",
  },
  arcadeHall: {
    floor: "#3a3350", floorAlt: "#342e49", wall: "#241f38", wallTrim: "#5a4f7d",
    accent: "#e0455f", accent2: "#49c6e8", wood: "#4a3f63",
  },
  festival: {
    floor: "#6b4a7a", floorAlt: "#634471", wall: "#3d2a4a", wallTrim: "#9a6ab0",
    accent: "#e05fa0", accent2: "#f0c04a", wood: "#5a3f6a",
  },
  gym: {
    floor: "#4a4038", floorAlt: "#443a33", wall: "#2f2924", wallTrim: "#7a6450",
    accent: "#d6a23f", accent2: "#b5503a", wood: "#5f4a36",
  },
  brand: {
    floor: "#d9d4cc", floorAlt: "#cfcac1", wall: "#f0ece4", wallTrim: "#a8a299",
    accent: "#2f6fe0", accent2: "#f0b33f", wood: "#8a7f70",
  },
  ops: {
    floor: "#2f4440", floorAlt: "#2a3e3a", wall: "#1f2e2c", wallTrim: "#4e7068",
    accent: "#4fc48a", accent2: "#d6c45a", wood: "#46392f",
  },
} satisfies Record<string, RoomPalette>;

/* ── the eight rooms ─────────────────────────────────────────────── */

export const ROOMS: Record<string, Room> = {
  pond: {
    name: "Diorama Studio",
    greeting: "Careful, the frog is working.",
    w: 18, h: 13, pal: P.lounge,
    items: [
      { k: "rug", x: 5, y: 5, w: 8, h: 5, c: "#5f8f6a" },
      { k: "sofa", x: 5, y: 4, w: 4, h: 2 },
      { k: "table", x: 7, y: 7, w: 3, h: 2 },
      { k: "chair", x: 11, y: 7 },
      { k: "shelf", x: 2, y: 2, w: 3, h: 1 },
      { k: "plant", x: 15, y: 3 },
      { k: "plant", x: 2, y: 10 },
      { k: "lamp", x: 14, y: 8, pass: true },
      { k: "window", x: 12, y: 1, w: 3, h: 1, pass: true },
      { k: "poster", x: 6, y: 1, w: 2, h: 1, pass: true },
    ],
    plinth: { x: 9, y: 10 },
    npc: { x: 11, y: 5, variant: 2, name: "Keeper" },
  },

  cat: {
    name: "Ops Tower",
    greeting: "Twenty-two languages, one chatbot.",
    w: 18, h: 13, pal: P.ops,
    items: [
      { k: "desk", x: 4, y: 4, w: 4, h: 2 },
      { k: "monitor", x: 5, y: 4, pass: true },
      { k: "monitor", x: 6, y: 4, pass: true },
      { k: "desk", x: 11, y: 4, w: 4, h: 2 },
      { k: "monitor", x: 12, y: 4, pass: true },
      { k: "chair", x: 5, y: 6 },
      { k: "chair", x: 12, y: 6 },
      { k: "shelf", x: 2, y: 2, w: 2, h: 1 },
      { k: "crate", x: 15, y: 9 },
      { k: "plant", x: 2, y: 9 },
      { k: "window", x: 8, y: 1, w: 3, h: 1, pass: true },
    ],
    plinth: { x: 9, y: 9 },
    npc: { x: 12, y: 7, variant: 0, name: "Operator" },
  },

  invoice: {
    name: "Finance Row",
    greeting: "No signup. Nothing leaves your browser.",
    w: 16, h: 12, pal: P.brand,
    items: [
      { k: "counter", x: 3, y: 4, w: 6, h: 2 },
      { k: "chair", x: 4, y: 7 },
      { k: "chair", x: 6, y: 7 },
      { k: "desk", x: 11, y: 4, w: 3, h: 2 },
      { k: "monitor", x: 12, y: 4, pass: true },
      { k: "shelf", x: 2, y: 2, w: 3, h: 1 },
      { k: "plant", x: 13, y: 9 },
      { k: "poster", x: 8, y: 1, w: 2, h: 1, pass: true },
      { k: "window", x: 11, y: 1, w: 2, h: 1, pass: true },
    ],
    plinth: { x: 8, y: 9 },
    npc: { x: 5, y: 6, variant: 1, name: "Clerk" },
  },

  contract: {
    name: "Legal Archive",
    greeting: "Scope, payment terms, revisions. All of it.",
    w: 18, h: 13, pal: P.archive,
    items: [
      { k: "shelf", x: 2, y: 2, w: 4, h: 1 },
      { k: "shelf", x: 8, y: 2, w: 4, h: 1 },
      { k: "shelf", x: 14, y: 2, w: 2, h: 1 },
      { k: "shelf", x: 2, y: 6, w: 3, h: 1 },
      { k: "desk", x: 7, y: 6, w: 4, h: 2 },
      { k: "chair", x: 8, y: 8 },
      { k: "crate", x: 14, y: 7 },
      { k: "crate", x: 15, y: 9 },
      { k: "lamp", x: 6, y: 5, pass: true },
      { k: "window", x: 12, y: 1, w: 2, h: 1, pass: true },
    ],
    plinth: { x: 13, y: 10 },
    npc: { x: 9, y: 9, variant: 3, name: "Archivist" },
  },

  dpl: {
    name: "The Stadium",
    greeting: "Six balls. One over. Pick a side.",
    w: 18, h: 13, pal: P.arcadeHall,
    items: [
      { k: "arcade", x: 4, y: 3 },
      { k: "arcade", x: 6, y: 3 },
      { k: "arcade", x: 8, y: 3 },
      { k: "arcade", x: 12, y: 3 },
      { k: "arcade", x: 14, y: 3 },
      { k: "rug", x: 5, y: 7, w: 8, h: 4, c: "#49c6e8" },
      { k: "sofa", x: 6, y: 6, w: 3, h: 2 },
      { k: "table", x: 10, y: 8, w: 2, h: 2 },
      { k: "poster", x: 2, y: 1, w: 2, h: 1, pass: true },
      { k: "poster", x: 10, y: 1, w: 2, h: 1, pass: true },
      { k: "plant", x: 16, y: 9 },
    ],
    plinth: { x: 9, y: 11 },
    npc: { x: 12, y: 7, variant: 0, name: "Scorer" },
  },

  yantra: {
    name: "Festival Hall",
    greeting: "Half a million visits came through here.",
    w: 20, h: 13, pal: P.festival,
    items: [
      { k: "rug", x: 4, y: 4, w: 11, h: 6, c: "#e05fa0" },
      { k: "counter", x: 3, y: 2, w: 5, h: 2 },
      { k: "sofa", x: 10, y: 3, w: 4, h: 2 },
      { k: "table", x: 8, y: 7, w: 3, h: 2 },
      { k: "chair", x: 6, y: 7 },
      { k: "chair", x: 12, y: 7 },
      { k: "lamp", x: 16, y: 4, pass: true },
      { k: "plant", x: 17, y: 8 },
      { k: "plant", x: 2, y: 8 },
      { k: "poster", x: 14, y: 1, w: 3, h: 1, pass: true },
    ],
    plinth: { x: 10, y: 10 },
    npc: { x: 5, y: 5, variant: 3, name: "Stagehand" },
  },

  "mike-tyson-invitational": {
    name: "Iron Forge Gym",
    greeting: "The brand hits as hard as the card.",
    w: 18, h: 13, pal: P.gym,
    items: [
      { k: "rug", x: 4, y: 4, w: 9, h: 6, c: "#b5503a" },
      { k: "crate", x: 2, y: 3 },
      { k: "crate", x: 3, y: 3 },
      { k: "crate", x: 2, y: 4 },
      { k: "bed", x: 14, y: 7, w: 2, h: 3 },
      { k: "shelf", x: 6, y: 2, w: 4, h: 1 },
      { k: "counter", x: 13, y: 2, w: 4, h: 2 },
      { k: "plant", x: 2, y: 10 },
      { k: "poster", x: 11, y: 1, w: 2, h: 1, pass: true },
    ],
    plinth: { x: 8, y: 10 },
    npc: { x: 9, y: 6, variant: 1, name: "Coach" },
  },

  dropby: {
    name: "Brand House",
    greeting: "An identity built to live outdoors.",
    w: 18, h: 12, pal: P.studio,
    items: [
      { k: "desk", x: 3, y: 4, w: 5, h: 2 },
      { k: "monitor", x: 4, y: 4, pass: true },
      { k: "monitor", x: 6, y: 4, pass: true },
      { k: "chair", x: 4, y: 6 },
      { k: "chair", x: 6, y: 6 },
      { k: "shelf", x: 11, y: 2, w: 4, h: 1 },
      { k: "sofa", x: 11, y: 6, w: 4, h: 2 },
      { k: "table", x: 12, y: 9, w: 2, h: 1 },
      { k: "plant", x: 2, y: 9 },
      { k: "window", x: 8, y: 1, w: 3, h: 1, pass: true },
      { k: "poster", x: 2, y: 1, w: 2, h: 1, pass: true },
    ],
    plinth: { x: 9, y: 9 },
    npc: { x: 13, y: 8, variant: 2, name: "Designer" },
  },
};

/* ── painting ────────────────────────────────────────────────────── */

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, x: number, y: number, w: number, h: number, f: string) => {
  c.fillStyle = f;
  c.fillRect(x, y, w, h);
};

/** the floor and the wall band along the top */
export function drawRoomShell(c: Ctx, room: Room) {
  const { pal, w, h } = room;
  const WALL = 2; // tiles of wall at the top

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < WALL) {
        px(c, x * TILE, y * TILE, TILE, TILE, pal.wall);
        /* panel seams, so the wall is not a flat field */
        px(c, x * TILE, y * TILE, 1, TILE, pal.wallTrim);
      } else {
        /* boards, alternating, with a seam every tile */
        px(c, x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? pal.floor : pal.floorAlt);
        px(c, x * TILE, y * TILE + TILE - 1, TILE, 1, "rgba(0,0,0,0.12)");
      }
    }
  }

  /* skirting: the line that makes the wall meet the floor */
  px(c, 0, WALL * TILE - 4, w * TILE, 4, pal.wallTrim);
  px(c, 0, WALL * TILE - 4, w * TILE, 1, "rgba(255,255,255,0.22)");

  /* the doorway back out, bottom centre */
  const dx = Math.floor(w / 2) * TILE;
  px(c, dx - TILE, (h - 1) * TILE, TILE * 2, TILE, "#1a1420");
  px(c, dx - TILE, (h - 1) * TILE, TILE * 2, 3, pal.wallTrim);
}

export function drawItem(c: Ctx, it: Item, pal: RoomPalette) {
  const x = it.x * TILE;
  const y = it.y * TILE;
  const w = (it.w ?? 1) * TILE;
  const h = (it.h ?? 1) * TILE;
  const accent = it.c ?? pal.accent;

  /* a contact shadow under anything that stands on the floor */
  if (itemSolid(it)) {
    px(c, x + 2, y + h - 3, w - 4, 4, "rgba(0,0,0,0.2)");
  }

  switch (it.k) {
    case "rug":
      px(c, x, y, w, h, accent);
      px(c, x + 3, y + 3, w - 6, h - 6, "rgba(255,255,255,0.1)");
      px(c, x, y, w, 2, "rgba(0,0,0,0.18)");
      px(c, x, y + h - 2, w, 2, "rgba(0,0,0,0.18)");
      break;

    case "sofa":
      px(c, x, y + 4, w, h - 4, accent);
      px(c, x, y, w, 6, shade(accent, -0.22)); // back
      px(c, x + 2, y + 7, w - 4, h - 10, shade(accent, 0.16)); // cushions
      for (let i = 1; i < (it.w ?? 1); i++) px(c, x + i * TILE, y + 7, 1, h - 10, shade(accent, -0.3));
      px(c, x, y + 4, 4, h - 6, shade(accent, -0.12)); // arms
      px(c, x + w - 4, y + 4, 4, h - 6, shade(accent, -0.12));
      break;

    case "chair":
      px(c, x + 3, y + 5, 10, 9, accent);
      px(c, x + 3, y + 1, 10, 5, shade(accent, -0.22));
      px(c, x + 4, y + 14, 2, 2, pal.wood);
      px(c, x + 10, y + 14, 2, 2, pal.wood);
      break;

    case "table":
      px(c, x + 1, y + 2, w - 2, h - 6, pal.wood);
      px(c, x + 1, y + 2, w - 2, 2, shade(pal.wood, 0.2));
      px(c, x + 2, y + h - 4, 3, 4, shade(pal.wood, -0.3));
      px(c, x + w - 5, y + h - 4, 3, 4, shade(pal.wood, -0.3));
      break;

    case "desk":
      px(c, x, y + 3, w, h - 6, pal.wood);
      px(c, x, y + 3, w, 2, shade(pal.wood, 0.22));
      px(c, x + 1, y + h - 3, 3, 3, shade(pal.wood, -0.35));
      px(c, x + w - 4, y + h - 3, 3, 3, shade(pal.wood, -0.35));
      break;

    case "shelf":
      px(c, x, y, w, h, pal.wood);
      px(c, x, y, w, 2, shade(pal.wood, 0.2));
      /* books: a run of coloured spines is instantly a bookshelf */
      for (let i = 0; i < w - 4; i += 3) {
        const t = (i * 7919) % 5;
        px(c, x + 2 + i, y + 4, 2, h - 7, [accent, pal.accent2, "#c7b07a", "#7a8aa6", "#b5705f"][t]);
      }
      break;

    case "plant":
      px(c, x + 4, y + 9, 8, 6, pal.wood);
      px(c, x + 4, y + 9, 8, 2, shade(pal.wood, 0.2));
      px(c, x + 5, y + 3, 6, 6, pal.accent2);
      px(c, x + 3, y + 5, 3, 3, shade(pal.accent2, -0.15));
      px(c, x + 10, y + 5, 3, 3, shade(pal.accent2, -0.15));
      px(c, x + 7, y + 1, 3, 3, shade(pal.accent2, 0.18));
      break;

    case "lamp":
      px(c, x + 7, y + 6, 2, 9, "#3b3f4e");
      px(c, x + 4, y + 2, 8, 5, "#f0d9a0");
      px(c, x + 5, y + 7, 6, 1, "rgba(255,230,160,0.7)");
      break;

    case "arcade":
      px(c, x + 2, y + 2, 12, 14, shade(accent, -0.3));
      px(c, x + 3, y + 4, 10, 6, "#101420");
      px(c, x + 4, y + 5, 8, 4, pal.accent2);
      px(c, x + 4, y + 11, 3, 2, "#e0455f");
      px(c, x + 9, y + 11, 3, 2, "#f0c04a");
      px(c, x + 2, y + 2, 12, 2, shade(accent, 0.2));
      break;

    case "monitor":
      px(c, x + 3, y + 2, 10, 7, "#20242e");
      px(c, x + 4, y + 3, 8, 5, pal.accent2);
      px(c, x + 4, y + 3, 4, 2, "rgba(255,255,255,0.3)");
      px(c, x + 7, y + 9, 2, 2, "#20242e");
      px(c, x + 5, y + 11, 6, 1, "#20242e");
      break;

    case "counter":
      px(c, x, y + 2, w, h - 4, accent);
      px(c, x, y + 2, w, 3, shade(accent, 0.22));
      px(c, x, y + h - 4, w, 2, shade(accent, -0.3));
      for (let i = 1; i < (it.w ?? 1); i++) px(c, x + i * TILE, y + 5, 1, h - 9, shade(accent, -0.2));
      break;

    case "bed":
      px(c, x + 1, y + 1, w - 2, h - 2, pal.wood);
      px(c, x + 2, y + 4, w - 4, h - 6, accent);
      px(c, x + 2, y + 2, w - 4, 4, "#e8e4da"); // pillow
      break;

    case "crate":
      px(c, x + 2, y + 3, 12, 12, pal.wood);
      px(c, x + 2, y + 3, 12, 2, shade(pal.wood, 0.22));
      px(c, x + 2, y + 8, 12, 1, shade(pal.wood, -0.3));
      px(c, x + 7, y + 3, 2, 12, shade(pal.wood, -0.3));
      break;

    case "poster":
      px(c, x + 1, y + 2, w - 2, h - 5, "#1a1420");
      px(c, x + 2, y + 3, w - 4, h - 7, accent);
      px(c, x + 3, y + 4, Math.max(2, (w - 6) / 2), 2, "rgba(255,255,255,0.4)");
      break;

    case "window":
      px(c, x, y + 1, w, h - 3, "#2a3550");
      px(c, x + 2, y + 3, w - 4, h - 7, "#7fc3e0");
      px(c, x + 2, y + 3, (w - 4) / 2, (h - 7) / 2, "#a9e0f0");
      for (let i = 1; i < (it.w ?? 1); i++) px(c, x + i * TILE, y + 1, 2, h - 3, "#2a3550");
      break;

    case "plinth":
      px(c, x + 2, y + 6, 12, 9, shade(pal.wallTrim, -0.1));
      px(c, x + 1, y + 4, 14, 3, pal.wallTrim);
      px(c, x + 3, y + 1, 10, 4, "#59e8ff");
      break;
  }
}

/** lighten (t > 0) or darken (t < 0) a hex colour */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (t >= 0) {
    r += (255 - r) * t;
    g += (255 - g) * t;
    b += (255 - b) * t;
  } else {
    r *= 1 + t;
    g *= 1 + t;
    b *= 1 + t;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
