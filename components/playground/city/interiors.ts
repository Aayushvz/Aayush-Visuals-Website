/*
  City of Creators — what is inside each building.

  The eight project buildings are not sealed boxes with a door that opens
  a dialog. Their roofs are cut away, so walking down the street you can
  see a studio actually being a studio: desks, monitors, people at them.
  The building IS the exhibit.

  Layouts are in local tile coordinates inside the block's 7x7 interior,
  so a venue drops straight into the city grid. Furniture is painted with
  canvas primitives at render time rather than baked into the atlas,
  which is why eight venues can each have their own palette for free: the
  same desk drawn in the gym's browns and the festival's magentas is two
  different desks, at no cost in memory or download.
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
  | "bench"
  | "weights"
  | "crate"
  | "easel"
  | "screen";

export type Item = {
  k: Kind;
  /** local tile coords inside the venue */
  x: number;
  y: number;
  w?: number;
  h?: number;
  c?: string;
  pass?: boolean;
};

/** a person at work, animated in place */
export type Worker = {
  x: number;
  y: number;
  variant: number;
  /** what they are doing: changes how they bob */
  doing: "type" | "lift" | "paint" | "idle" | "serve";
};

export type VenuePalette = {
  floor: string;
  floorAlt: string;
  wall: string;
  wallTrim: string;
  accent: string;
  accent2: string;
  wood: string;
};

export type Venue = {
  name: string;
  pal: VenuePalette;
  items: Item[];
  workers: Worker[];
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
  "bench",
  "weights",
  "crate",
  "easel",
]);

export const itemSolid = (it: Item) => !it.pass && SOLID_KINDS.has(it.k);

/* ── palettes, one mood per building ─────────────────────────────── */

const P = {
  studio: {
    floor: "#c9a071", floorAlt: "#bd9365", wall: "#e3d3b8", wallTrim: "#8a6a4a",
    accent: "#c4633f", accent2: "#5f8f6a", wood: "#8a5a3a",
  },
  ops: {
    floor: "#2f4440", floorAlt: "#2a3e3a", wall: "#1f2e2c", wallTrim: "#4e7068",
    accent: "#4fc48a", accent2: "#d6c45a", wood: "#46392f",
  },
  office: {
    floor: "#d9d4cc", floorAlt: "#cfcac1", wall: "#f0ece4", wallTrim: "#a8a299",
    accent: "#2f6fe0", accent2: "#f0b33f", wood: "#8a7f70",
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
  design: {
    floor: "#7f8aa6", floorAlt: "#76819b", wall: "#cdd6e6", wallTrim: "#56607a",
    accent: "#3f7fae", accent2: "#53b0a0", wood: "#6b5a46",
  },
} satisfies Record<string, VenuePalette>;

/*
  Eight venues, laid out inside a 7-wide, 7-tall block interior.

  Row 0 is the back wall. The bottom row is the shopfront the street
  sees, so nothing solid goes there or the doorway would be blocked.
*/
export const VENUES: Record<string, Venue> = {
  pond: {
    name: "Diorama Studio (Peter's Lab)",
    pal: {
      floor: "#c98f68",
      floorAlt: "#ba8059",
      wall: "#2a1e28",
      wallTrim: "#d6273c",
      accent: "#d6273c",
      accent2: "#38bdf8",
      wood: "#7c4a2a",
    },
    items: [
      { k: "rug", x: 1, y: 3, w: 4, h: 3, c: "#d6273c" },
      { k: "easel", x: 1, y: 2 },
      { k: "easel", x: 5, y: 2 },
      { k: "desk", x: 2, y: 1, w: 3, h: 1 },
      { k: "monitor", x: 3, y: 1, pass: true },
      { k: "plant", x: 6, y: 4 },
      { k: "shelf", x: 0, y: 5, w: 2, h: 1 },
    ],
    workers: [
      { x: 2, y: 2, variant: 2, doing: "paint" },
      { x: 5, y: 3, variant: 0, doing: "idle" },
    ],
  },

  cat: {
    name: "Ops Tower (Oscorp Core)",
    pal: {
      floor: "#1c2a38",
      floorAlt: "#162230",
      wall: "#0d1822",
      wallTrim: "#00ff9d",
      accent: "#00ff9d",
      accent2: "#38bdf8",
      wood: "#243b50",
    },
    items: [
      { k: "desk", x: 0, y: 1, w: 3, h: 1 },
      { k: "monitor", x: 0, y: 1, pass: true },
      { k: "monitor", x: 2, y: 1, pass: true },
      { k: "desk", x: 4, y: 1, w: 3, h: 1 },
      { k: "monitor", x: 5, y: 1, pass: true },
      { k: "screen", x: 3, y: 0, w: 1, h: 1, pass: true },
      { k: "chair", x: 1, y: 3 },
      { k: "chair", x: 5, y: 3 },
      { k: "crate", x: 6, y: 5 },
    ],
    workers: [
      { x: 1, y: 2, variant: 0, doing: "type" },
      { x: 5, y: 2, variant: 3, doing: "type" },
    ],
  },

  invoice: {
    name: "Finance Row (Daily Bugle)",
    pal: {
      floor: "#452d32",
      floorAlt: "#3b252a",
      wall: "#25161a",
      wallTrim: "#ff4d5a",
      accent: "#ff3b48",
      accent2: "#ffd780",
      wood: "#6e3a2c",
    },
    items: [
      { k: "counter", x: 1, y: 4, w: 5, h: 1 },
      { k: "desk", x: 1, y: 1, w: 2, h: 1 },
      { k: "monitor", x: 1, y: 1, pass: true },
      { k: "desk", x: 4, y: 1, w: 2, h: 1 },
      { k: "monitor", x: 4, y: 1, pass: true },
      { k: "shelf", x: 0, y: 2, w: 1, h: 1 },
      { k: "plant", x: 6, y: 2 },
    ],
    workers: [
      { x: 2, y: 2, variant: 1, doing: "type" },
      { x: 4, y: 5, variant: 2, doing: "serve" },
    ],
  },

  contract: {
    name: "Legal Archive (Nelson & Murdock)",
    pal: P.archive,
    items: [
      { k: "shelf", x: 0, y: 1, w: 3, h: 1 },
      { k: "shelf", x: 4, y: 1, w: 3, h: 1 },
      { k: "shelf", x: 0, y: 3, w: 2, h: 1 },
      { k: "shelf", x: 5, y: 3, w: 2, h: 1 },
      { k: "desk", x: 2, y: 4, w: 3, h: 1 },
      { k: "lamp", x: 5, y: 4, pass: true },
      { k: "crate", x: 0, y: 5 },
    ],
    workers: [{ x: 3, y: 5, variant: 3, doing: "type" }],
  },

  dpl: {
    name: "The Stadium (Marvel Arcade)",
    pal: P.arcadeHall,
    items: [
      { k: "arcade", x: 0, y: 1 },
      { k: "arcade", x: 1, y: 1 },
      { k: "arcade", x: 2, y: 1 },
      { k: "arcade", x: 4, y: 1 },
      { k: "arcade", x: 5, y: 1 },
      { k: "arcade", x: 6, y: 1 },
      { k: "rug", x: 1, y: 3, w: 5, h: 3, c: "#49c6e8" },
      { k: "sofa", x: 2, y: 4, w: 3, h: 1 },
    ],
    workers: [
      { x: 1, y: 2, variant: 0, doing: "idle" },
      { x: 5, y: 2, variant: 1, doing: "idle" },
    ],
  },

  yantra: {
    name: "Festival Hall (Midtown Science)",
    pal: P.festival,
    items: [
      { k: "rug", x: 1, y: 2, w: 5, h: 4, c: "#e05fa0" },
      { k: "counter", x: 0, y: 1, w: 3, h: 1 },
      { k: "screen", x: 4, y: 0, w: 2, h: 1, pass: true },
      { k: "sofa", x: 4, y: 2, w: 3, h: 1 },
      { k: "table", x: 2, y: 4, w: 2, h: 1 },
      { k: "lamp", x: 6, y: 4, pass: true },
      { k: "plant", x: 0, y: 5 },
    ],
    workers: [
      { x: 1, y: 2, variant: 3, doing: "serve" },
      { x: 5, y: 4, variant: 2, doing: "idle" },
    ],
  },

  "mike-tyson-invitational": {
    name: "Iron Forge (Spider Training Gym)",
    pal: P.gym,
    items: [
      { k: "rug", x: 1, y: 2, w: 5, h: 4, c: "#b5503a" },
      { k: "weights", x: 0, y: 1 },
      { k: "weights", x: 1, y: 1 },
      { k: "weights", x: 5, y: 1 },
      { k: "weights", x: 6, y: 1 },
      { k: "bench", x: 2, y: 3, w: 2, h: 1 },
      { k: "bench", x: 4, y: 5, w: 2, h: 1 },
      { k: "crate", x: 6, y: 4 },
    ],
    workers: [
      { x: 2, y: 2, variant: 1, doing: "lift" },
      { x: 5, y: 3, variant: 0, doing: "lift" },
    ],
  },

  dropby: {
    name: "Brand House (Suit Atelier)",
    pal: P.design,
    items: [
      { k: "desk", x: 0, y: 1, w: 3, h: 1 },
      { k: "monitor", x: 0, y: 1, pass: true },
      { k: "monitor", x: 2, y: 1, pass: true },
      { k: "easel", x: 5, y: 1 },
      { k: "sofa", x: 4, y: 4, w: 3, h: 1 },
      { k: "table", x: 1, y: 4, w: 2, h: 1 },
      { k: "plant", x: 6, y: 2 },
      { k: "shelf", x: 0, y: 5, w: 2, h: 1 },
    ],
    workers: [
      { x: 1, y: 2, variant: 2, doing: "type" },
      { x: 5, y: 2, variant: 1, doing: "paint" },
    ],
  },
};

/* ── painting ────────────────────────────────────────────────────── */

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, x: number, y: number, w: number, h: number, f: string) => {
  c.fillStyle = f;
  c.fillRect(x, y, w, h);
};

/** lighten (t > 0) or darken (t < 0) a hex colour */
export function shade(hex: string, t: number): string {
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

/** the cutaway floor, in world pixels */
export function drawVenueFloor(c: Ctx, v: Venue, ox: number, oy: number, w: number, h: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = ox + x * TILE;
      const wy = oy + y * TILE;
      if (y === 0) {
        px(c, wx, wy, TILE, TILE, v.pal.wall);
        px(c, wx, wy, 1, TILE, v.pal.wallTrim);
        px(c, wx, wy + TILE - 3, TILE, 3, v.pal.wallTrim);
      } else {
        px(c, wx, wy, TILE, TILE, (x + y) % 2 ? v.pal.floor : v.pal.floorAlt);
        px(c, wx, wy + TILE - 1, TILE, 1, "rgba(0,0,0,0.1)");
      }
    }
  }
}

export function drawItem(c: Ctx, it: Item, pal: VenuePalette, ox: number, oy: number) {
  const x = ox + it.x * TILE;
  const y = oy + it.y * TILE;
  const w = (it.w ?? 1) * TILE;
  const h = (it.h ?? 1) * TILE;
  const accent = it.c ?? pal.accent;

  if (itemSolid(it)) px(c, x + 2, y + h - 3, w - 4, 4, "rgba(0,0,0,0.2)");

  switch (it.k) {
    case "rug":
      px(c, x, y, w, h, accent);
      px(c, x + 3, y + 3, w - 6, h - 6, "rgba(255,255,255,0.1)");
      px(c, x, y, w, 2, "rgba(0,0,0,0.18)");
      px(c, x, y + h - 2, w, 2, "rgba(0,0,0,0.18)");
      break;

    case "sofa":
      px(c, x, y + 4, w, h - 4, accent);
      px(c, x, y, w, 6, shade(accent, -0.22));
      px(c, x + 2, y + 7, w - 4, h - 10, shade(accent, 0.16));
      px(c, x, y + 4, 4, h - 6, shade(accent, -0.12));
      px(c, x + w - 4, y + 4, 4, h - 6, shade(accent, -0.12));
      break;

    case "chair":
      px(c, x + 3, y + 5, 10, 9, accent);
      px(c, x + 3, y + 1, 10, 5, shade(accent, -0.22));
      break;

    case "table":
      px(c, x + 1, y + 2, w - 2, h - 6, pal.wood);
      px(c, x + 1, y + 2, w - 2, 2, shade(pal.wood, 0.2));
      break;

    case "desk":
      px(c, x, y + 3, w, h - 6, pal.wood);
      px(c, x, y + 3, w, 2, shade(pal.wood, 0.22));
      px(c, x + 1, y + h - 3, 3, 3, shade(pal.wood, -0.35));
      px(c, x + w - 4, y + h - 3, 3, 3, shade(pal.wood, -0.35));
      break;

    case "shelf":
      px(c, x, y + 2, w, h - 4, pal.wood);
      px(c, x, y + 2, w, 2, shade(pal.wood, 0.2));
      for (let i = 0; i < w - 4; i += 3) {
        const t = (i * 7919) % 5;
        px(c, x + 2 + i, y + 5, 2, h - 9, [accent, pal.accent2, "#c7b07a", "#7a8aa6", "#b5705f"][t]);
      }
      break;

    case "plant":
      px(c, x + 4, y + 9, 8, 6, pal.wood);
      px(c, x + 5, y + 3, 6, 6, pal.accent2);
      px(c, x + 3, y + 5, 3, 3, shade(pal.accent2, -0.15));
      px(c, x + 10, y + 5, 3, 3, shade(pal.accent2, -0.15));
      px(c, x + 7, y + 1, 3, 3, shade(pal.accent2, 0.18));
      break;

    case "lamp":
      px(c, x + 7, y + 6, 2, 9, "#3b3f4e");
      px(c, x + 4, y + 2, 8, 5, "#f0d9a0");
      break;

    case "arcade":
      px(c, x + 2, y + 2, 12, 13, shade(accent, -0.3));
      px(c, x + 3, y + 4, 10, 6, "#101420");
      px(c, x + 4, y + 5, 8, 4, pal.accent2);
      px(c, x + 4, y + 11, 3, 2, "#e0455f");
      px(c, x + 9, y + 11, 3, 2, "#f0c04a");
      px(c, x + 2, y + 2, 12, 2, shade(accent, 0.2));
      break;

    case "monitor":
      px(c, x + 3, y + 1, 10, 7, "#20242e");
      px(c, x + 4, y + 2, 8, 5, pal.accent2);
      px(c, x + 4, y + 2, 4, 2, "rgba(255,255,255,0.3)");
      break;

    case "screen":
      px(c, x + 1, y + 3, w - 2, h - 7, "#101420");
      px(c, x + 2, y + 4, w - 4, h - 9, pal.accent2);
      px(c, x + 3, y + 5, (w - 6) / 2, 2, "rgba(255,255,255,0.4)");
      break;

    case "counter":
      px(c, x, y + 2, w, h - 4, accent);
      px(c, x, y + 2, w, 3, shade(accent, 0.22));
      px(c, x, y + h - 4, w, 2, shade(accent, -0.3));
      break;

    case "bench":
      px(c, x + 1, y + 5, w - 2, 5, shade(pal.wood, -0.1));
      px(c, x + 1, y + 4, w - 2, 2, pal.wood);
      px(c, x + 2, y + 10, 2, 4, "#3b3f4e");
      px(c, x + w - 4, y + 10, 2, 4, "#3b3f4e");
      break;

    case "weights":
      px(c, x + 2, y + 6, 12, 3, "#5a5f6e");
      px(c, x + 1, y + 4, 3, 7, "#2b2f3a");
      px(c, x + 12, y + 4, 3, 7, "#2b2f3a");
      px(c, x + 4, y + 12, 8, 3, shade(accent, -0.2));
      break;

    case "crate":
      px(c, x + 2, y + 4, 12, 11, pal.wood);
      px(c, x + 2, y + 4, 12, 2, shade(pal.wood, 0.22));
      px(c, x + 7, y + 4, 2, 11, shade(pal.wood, -0.3));
      break;

    case "easel":
      px(c, x + 7, y + 7, 2, 8, pal.wood);
      px(c, x + 4, y + 12, 8, 2, pal.wood);
      px(c, x + 3, y + 1, 10, 9, "#efe7d6");
      px(c, x + 4, y + 2, 8, 7, accent);
      px(c, x + 5, y + 4, 4, 3, pal.accent2);
      break;
  }
}
