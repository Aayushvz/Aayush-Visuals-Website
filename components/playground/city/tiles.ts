/*
  City of Creators — the tileset, drawn in code.

  Every tile and every frame of the hero is painted into one offscreen
  canvas when the game boots, then blitted from there. No sprite sheet is
  downloaded, which means the experiment adds no asset weight to the site
  and nothing has to be licensed — but it is still real pixel art: a fixed
  16px grid, a locked palette, and pixels placed deliberately rather than
  CSS shapes pretending to be sprites.

  Everything here is swappable. `drawTile` is the only thing that knows how
  a tile looks, so dropping in a real tileset later means changing this
  file and nothing else.
*/

export const TILE = 16;

/* One palette for the whole city, so every tile belongs to the same world.
   Picked warm-neutral for the ground and cool for the glass, with two
   accents (the hero's red, the discovery cyan) that nothing else uses. */
export const PAL = {
  road: "#2e2f3d",
  roadDark: "#262732",
  line: "#d6c98a",
  kerb: "#6a6b7c",
  walk: "#8d8e9e",
  walkLite: "#9a9bab",
  grass: "#3f7a4a",
  grassLite: "#4b8d55",
  grassDark: "#346340",
  trunk: "#5a3d2b",
  leafA: "#2f6b3c",
  leafB: "#3e8a4c",
  brickA: "#8a5a4a",
  brickB: "#7a4e40",
  brickC: "#9a6a56",
  concreteA: "#6f7384",
  concreteB: "#5f6374",
  glass: "#6fd3e0",
  glassLit: "#a9f0f6",
  glassDark: "#2b5f6b",
  roofA: "#4a4e63",
  roofB: "#3d4154",
  door: "#4a3426",
  shadow: "rgba(12,12,20,0.35)",
  hero1: "#d6273c", // suit red
  hero2: "#8f1726", // red shade
  hero3: "#2a3f8f", // suit blue
  hero4: "#1b2a63", // blue shade
  heroEye: "#eef4ff",
  skin: "#c98f63",
  cyan: "#59e8ff",
} as const;

export type TileId =
  | "road_h"
  | "road_v"
  | "road"
  | "walk"
  | "kerb_n"
  | "grass"
  | "tree"
  | "wall"
  | "window"
  | "door"
  | "roof"
  | "void";

export const SOLID: ReadonlySet<TileId> = new Set<TileId>([
  "tree",
  "wall",
  "window",
  "roof",
  "void",
]);

/* ── pixel helpers ───────────────────────────────────────────────── */

type Ctx = CanvasRenderingContext2D;

const px = (c: Ctx, x: number, y: number, w: number, h: number, fill: string) => {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
};

/* deterministic speckle so a tile looks textured but never changes
   between frames or reloads */
function speckle(c: Ctx, ox: number, oy: number, colour: string, seed: number, n: number) {
  c.fillStyle = colour;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const x = s % TILE;
    s = (s * 1664525 + 1013904223) >>> 0;
    const y = s % TILE;
    c.fillRect(ox + x, oy + y, 1, 1);
  }
}

/* ── the tiles ───────────────────────────────────────────────────── */

export function drawTile(c: Ctx, id: TileId, ox: number, oy: number) {
  switch (id) {
    case "road":
    case "road_h":
    case "road_v": {
      px(c, ox, oy, TILE, TILE, PAL.road);
      speckle(c, ox, oy, PAL.roadDark, 7, 18);
      if (id === "road_h") px(c, ox, oy + 7, 10, 2, PAL.line);
      if (id === "road_v") px(c, ox + 7, oy, 2, 10, PAL.line);
      break;
    }
    case "walk": {
      px(c, ox, oy, TILE, TILE, PAL.walk);
      speckle(c, ox, oy, PAL.walkLite, 11, 14);
      /* slab seams — what makes it read as pavement rather than grey */
      px(c, ox, oy, TILE, 1, PAL.kerb);
      px(c, ox, oy, 1, TILE, PAL.kerb);
      break;
    }
    case "kerb_n": {
      px(c, ox, oy, TILE, TILE, PAL.walk);
      speckle(c, ox, oy, PAL.walkLite, 13, 12);
      px(c, ox, oy + 12, TILE, 4, PAL.kerb);
      px(c, ox, oy + 12, TILE, 1, PAL.walkLite);
      break;
    }
    case "grass": {
      px(c, ox, oy, TILE, TILE, PAL.grass);
      speckle(c, ox, oy, PAL.grassLite, 17, 22);
      speckle(c, ox, oy, PAL.grassDark, 29, 10);
      break;
    }
    case "tree": {
      px(c, ox, oy, TILE, TILE, PAL.grass);
      speckle(c, ox, oy, PAL.grassDark, 31, 10);
      px(c, ox + 7, oy + 9, 2, 6, PAL.trunk);
      /* canopy as stacked rows, widest in the middle — a circle drawn with
         arc() on a 16px grid turns to mush */
      px(c, ox + 5, oy + 1, 6, 1, PAL.leafA);
      px(c, ox + 3, oy + 2, 10, 2, PAL.leafB);
      px(c, ox + 2, oy + 4, 12, 3, PAL.leafB);
      px(c, ox + 3, oy + 7, 10, 2, PAL.leafA);
      px(c, ox + 5, oy + 9, 6, 1, PAL.leafA);
      px(c, ox + 4, oy + 3, 3, 1, "#58a566");
      break;
    }
    case "wall": {
      px(c, ox, oy, TILE, TILE, PAL.brickA);
      /* brick courses, offset every other row */
      for (let r = 0; r < TILE; r += 4) {
        px(c, ox, oy + r, TILE, 1, PAL.brickB);
        const off = (r / 4) % 2 === 0 ? 0 : 4;
        for (let b = off; b < TILE; b += 8) px(c, ox + b, oy + r, 1, 4, PAL.brickB);
      }
      speckle(c, ox, oy, PAL.brickC, 41, 8);
      break;
    }
    case "window": {
      px(c, ox, oy, TILE, TILE, PAL.brickA);
      for (let r = 0; r < TILE; r += 4) px(c, ox, oy + r, TILE, 1, PAL.brickB);
      px(c, ox + 3, oy + 3, 10, 10, PAL.glassDark);
      px(c, ox + 4, oy + 4, 8, 8, PAL.glass);
      /* the highlight is the whole trick — glass without it is a flat square */
      px(c, ox + 4, oy + 4, 4, 3, PAL.glassLit);
      px(c, ox + 8, oy + 8, 1, 1, PAL.glassLit);
      break;
    }
    case "door": {
      px(c, ox, oy, TILE, TILE, PAL.brickA);
      for (let r = 0; r < TILE; r += 4) px(c, ox, oy + r, TILE, 1, PAL.brickB);
      px(c, ox + 4, oy + 2, 8, 14, PAL.door);
      px(c, ox + 5, oy + 3, 6, 12, "#5d4231");
      px(c, ox + 9, oy + 9, 1, 2, PAL.line);
      break;
    }
    case "roof": {
      px(c, ox, oy, TILE, TILE, PAL.roofA);
      for (let r = 2; r < TILE; r += 5) px(c, ox, oy + r, TILE, 1, PAL.roofB);
      speckle(c, ox, oy, PAL.roofB, 53, 10);
      break;
    }
    case "void":
    default:
      px(c, ox, oy, TILE, TILE, "#14141c");
      break;
  }
}

export const TILE_ORDER: TileId[] = [
  "road",
  "road_h",
  "road_v",
  "walk",
  "kerb_n",
  "grass",
  "tree",
  "wall",
  "window",
  "door",
  "roof",
  "void",
];

/* ── the hero ────────────────────────────────────────────────────── */

/*
  An original masked hero: red torso, deep-blue legs and arms, white mask
  lenses. Deliberately not any existing character's costume — no spider
  motif, no web pattern, no logo.

  12x16, drawn as a pixel map so the sprite is edited by eye rather than by
  arithmetic. ' ' is transparent.
    R/r red + shade, B/b blue + shade, E eyes, S skin, K outline
*/
const HERO_DOWN = [
  "            ",
  "    KKKK    ",
  "   KRRRRK   ",
  "   REEEER   ",
  "   REEEER   ",
  "   KRRRRK   ",
  "   BRRRRB   ",
  "  BBRRRRBB  ",
  "  BBRRRRBB  ",
  "  BBrrrrBB  ",
  "   bBBBBb   ",
  "   BB  BB   ",
  "   BB  BB   ",
  "   bb  bb   ",
  "   KK  KK   ",
  "            ",
];

const HERO_UP = [
  "            ",
  "    KKKK    ",
  "   KRRRRK   ",
  "   RRRRRR   ",
  "   RRRRRR   ",
  "   KRRRRK   ",
  "   BRRRRB   ",
  "  BBRRRRBB  ",
  "  BBRRRRBB  ",
  "  BBrrrrBB  ",
  "   bBBBBb   ",
  "   BB  BB   ",
  "   BB  BB   ",
  "   bb  bb   ",
  "   KK  KK   ",
  "            ",
];

const HERO_SIDE = [
  "            ",
  "    KKKK    ",
  "   KRRRRK   ",
  "   RREEER   ",
  "   RREEER   ",
  "   KRRRRK   ",
  "    RRRRB   ",
  "   BRRRRBB  ",
  "   BRRRRBB  ",
  "   BrrrrB   ",
  "    BBBB    ",
  "    BBBB    ",
  "    BB B    ",
  "    bb b    ",
  "    KK K    ",
  "            ",
];

const HERO_COLS: Record<string, string> = {
  R: PAL.hero1,
  r: PAL.hero2,
  B: PAL.hero3,
  b: PAL.hero4,
  E: PAL.heroEye,
  S: PAL.skin,
  K: "#1a1420",
};

export const HERO_W = 12;
export const HERO_H = 16;

/*
  Walk frames come from shifting the legs a pixel rather than from three
  hand-drawn sheets: at 12x16 that is the whole of a walk cycle, and it
  keeps the sprite editable as one picture.
*/
function paintHero(c: Ctx, map: string[], ox: number, oy: number, legPhase: number, flip: boolean) {
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === " ") continue;
      const colour = HERO_COLS[ch];
      if (!colour) continue;
      /* rows 11+ are legs */
      let dx = x;
      if (y >= 11 && legPhase !== 0) {
        const left = x < HERO_W / 2;
        dx = x + (left ? legPhase : -legPhase);
      }
      const fx = flip ? HERO_W - 1 - dx : dx;
      c.fillStyle = colour;
      c.fillRect(ox + fx, oy + y, 1, 1);
    }
  }
}

export type HeroDir = "down" | "up" | "left" | "right";
export const HERO_DIRS: HeroDir[] = ["down", "up", "left", "right"];
export const HERO_FRAMES = 4;

/** Column/row of a hero frame inside the atlas, in tile units. */
export function heroFrameIndex(dir: HeroDir, frame: number): number {
  return HERO_DIRS.indexOf(dir) * HERO_FRAMES + (frame % HERO_FRAMES);
}

/* ── the atlas ───────────────────────────────────────────────────── */

export type Atlas = {
  canvas: HTMLCanvasElement;
  /** y offset in px where hero frames start */
  heroRowY: number;
};

/**
 * Paints every tile and hero frame once. Row 0 is tiles in TILE_ORDER;
 * row 1 is the 16 hero frames (4 directions x 4 walk frames).
 */
export function buildAtlas(): Atlas {
  const cols = Math.max(TILE_ORDER.length, HERO_DIRS.length * HERO_FRAMES);
  const canvas = document.createElement("canvas");
  canvas.width = cols * TILE;
  canvas.height = TILE * 2;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("city: no 2d context for the atlas");
  c.imageSmoothingEnabled = false;

  TILE_ORDER.forEach((id, i) => drawTile(c, id, i * TILE, 0));

  const legPhases = [0, 1, 0, -1];
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const map = dir === "down" ? HERO_DOWN : dir === "up" ? HERO_UP : HERO_SIDE;
      const ox = (d * HERO_FRAMES + f) * TILE + 2;
      paintHero(c, map, ox, TILE, legPhases[f], dir === "left");
    }
  });

  return { canvas, heroRowY: TILE };
}

export const tileAtlasIndex = (id: TileId): number => Math.max(0, TILE_ORDER.indexOf(id));
