/*
  City of Creators — the tileset, drawn in code.

  Every tile, prop and hero frame is painted into one offscreen canvas at
  boot, then blitted from there. No sprite sheet is downloaded, so the
  experiment adds no asset weight and nothing needs licensing — but it is
  still real pixel art: a fixed 16px grid, a locked palette, pixels placed
  deliberately.

  `drawTile` and `drawProp` are the only things that know how anything
  looks, so dropping in a bought tileset later means changing this file
  and nothing else.
*/

export const TILE = 16;

/* One palette for the whole city. Warm-neutral ground, cool glass, and
   two accents (hero red, discovery cyan) that nothing else uses. */
export const PAL = {
  road: "#2e2f3d",
  roadDark: "#262732",
  line: "#d6c98a",
  kerb: "#6a6b7c",
  kerbLite: "#7d7e90",
  walk: "#8d8e9e",
  walkLite: "#9a9bab",
  grass: "#3f7a4a",
  grassLite: "#4b8d55",
  grassDark: "#346340",
  trunk: "#5a3d2b",
  leafA: "#2f6b3c",
  leafB: "#3e8a4c",
  glass: "#6fd3e0",
  glassLit: "#a9f0f6",
  glassDark: "#2b5f6b",
  door: "#4a3426",
  hero1: "#d6273c",
  hero2: "#8f1726",
  hero3: "#2a3f8f",
  hero4: "#1b2a63",
  heroEye: "#eef4ff",
  skin: "#c98f63",
  cyan: "#59e8ff",
} as const;

/* Three façade materials, so a street is not one repeated building. Each
   is {light, base, dark, trim} and the generator picks one per building. */
export const MATERIALS = [
  { base: "#8a5a4a", dark: "#6f4639", lite: "#9c6a58", trim: "#b08670" }, // brick
  { base: "#6f7384", dark: "#595d6d", lite: "#828799", trim: "#9aa0b2" }, // concrete
  { base: "#4b6b74", dark: "#3a555d", lite: "#5d808a", trim: "#7fa3ad" }, // slate
  { base: "#7d6a86", dark: "#64546c", lite: "#917d9b", trim: "#ab97b4" }, // plum
] as const;

export type TileId =
  | "road"
  | "road_h"
  | "road_v"
  | "zebra_h"
  | "zebra_v"
  | "walk"
  | "kerb_n"
  | "kerb_s"
  | "grass"
  | "tree"
  | `roof${0 | 1 | 2 | 3}`
  | `roof_n${0 | 1 | 2 | 3}`
  | "void"
  /* façades: material index is appended, e.g. fac_wall0 */
  | `fac_wall${0 | 1 | 2 | 3}`
  | `fac_win${0 | 1 | 2 | 3}`
  | `fac_door${0 | 1 | 2 | 3}`
  | `fac_shop${0 | 1 | 2 | 3}`;

export const SOLID = (id: TileId): boolean =>
  id === "tree" ||
  id.startsWith("roof") ||
  id === "void" ||
  id.startsWith("fac_");

type Ctx = CanvasRenderingContext2D;

const px = (c: Ctx, x: number, y: number, w: number, h: number, fill: string) => {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
};

/* deterministic speckle: textured, but identical every frame and reload */
function speckle(c: Ctx, ox: number, oy: number, colour: string, seed: number, n: number) {
  c.fillStyle = colour;
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const x = s % TILE;
    s = (s * 1664525 + 1013904223) >>> 0;
    const y = s % TILE;
    c.fillRect(ox + x, oy + y, 1, 1);
  }
}

/* ── tiles ───────────────────────────────────────────────────────── */

export function drawTile(c: Ctx, id: TileId, ox: number, oy: number) {
  if (id.startsWith("fac_")) return drawFacade(c, id, ox, oy);
  if (id.startsWith("roof")) return drawRoof(c, id, Number(id[id.length - 1]) || 0, ox, oy);

  switch (id) {
    case "road":
    case "road_h":
    case "road_v": {
      px(c, ox, oy, TILE, TILE, PAL.road);
      speckle(c, ox, oy, PAL.roadDark, 7, 16);
      if (id === "road_h") px(c, ox + 2, oy + 7, 10, 2, PAL.line);
      if (id === "road_v") px(c, ox + 7, oy + 2, 2, 10, PAL.line);
      break;
    }
    case "zebra_h": {
      px(c, ox, oy, TILE, TILE, PAL.road);
      for (let x = 1; x < TILE; x += 5) px(c, ox + x, oy, 3, TILE, "#c9cbd8");
      break;
    }
    case "zebra_v": {
      px(c, ox, oy, TILE, TILE, PAL.road);
      for (let y = 1; y < TILE; y += 5) px(c, ox, oy + y, TILE, 3, "#c9cbd8");
      break;
    }
    case "walk": {
      px(c, ox, oy, TILE, TILE, PAL.walk);
      speckle(c, ox, oy, PAL.walkLite, 11, 10);
      /* slab seams are what make this read as pavement and not grey */
      px(c, ox, oy, TILE, 1, PAL.kerb);
      px(c, ox, oy, 1, TILE, PAL.kerb);
      break;
    }
    case "kerb_n": {
      px(c, ox, oy, TILE, TILE, PAL.walk);
      speckle(c, ox, oy, PAL.walkLite, 13, 8);
      px(c, ox, oy + 12, TILE, 4, PAL.kerb);
      px(c, ox, oy + 12, TILE, 1, PAL.kerbLite);
      break;
    }
    case "kerb_s": {
      px(c, ox, oy, TILE, TILE, PAL.walk);
      speckle(c, ox, oy, PAL.walkLite, 19, 8);
      px(c, ox, oy, TILE, 4, PAL.kerb);
      px(c, ox, oy + 3, TILE, 1, PAL.kerbLite);
      break;
    }
    case "grass": {
      px(c, ox, oy, TILE, TILE, PAL.grass);
      speckle(c, ox, oy, PAL.grassLite, 17, 20);
      speckle(c, ox, oy, PAL.grassDark, 29, 9);
      break;
    }
    case "tree": {
      px(c, ox, oy, TILE, TILE, PAL.grass);
      speckle(c, ox, oy, PAL.grassDark, 31, 9);
      px(c, ox + 7, oy + 10, 2, 5, PAL.trunk);
      px(c, ox + 5, oy + 1, 6, 1, PAL.leafA);
      px(c, ox + 3, oy + 2, 10, 2, PAL.leafB);
      px(c, ox + 2, oy + 4, 12, 3, PAL.leafB);
      px(c, ox + 3, oy + 7, 10, 2, PAL.leafA);
      px(c, ox + 5, oy + 9, 6, 1, PAL.leafA);
      px(c, ox + 4, oy + 3, 3, 1, "#58a566");
      break;
    }

    case "void":
    default:
      px(c, ox, oy, TILE, TILE, "#14141c");
      break;
  }
}

/*
  Roofs, tinted per building material.

  Every roof being the same grey was what made a block of separate
  buildings read as one slab from above. Tinting each to its own façade
  tells you where one building stops and the next begins, which is most of
  what makes a city block look like a city block.
*/
const ROOFS = [
  { base: "#55495a", seam: "#453b4a", lip: "#6d5f73" },
  { base: "#4a4e63", seam: "#3d4154", lip: "#656a82" },
  { base: "#3f5560", seam: "#33454e", lip: "#55707d" },
  { base: "#4e4659", seam: "#403949", lip: "#675d74" },
] as const;

function drawRoof(c: Ctx, id: string, m: number, ox: number, oy: number) {
  const r = ROOFS[m] ?? ROOFS[1];
  px(c, ox, oy, TILE, TILE, r.base);
  for (let y = 2; y < TILE; y += 5) px(c, ox, oy + y, TILE, 1, r.seam);
  speckle(c, ox, oy, r.seam, 53 + m, 8);
  if (id.startsWith("roof_n")) {
    /* the parapet along the far edge: one bright line is the whole
       difference between a flat slab and a building with height */
    px(c, ox, oy, TILE, 3, r.lip);
    px(c, ox, oy + 3, TILE, 1, "#262a36");
  }
}

/* façade tiles carry their material index as the last character */
function drawFacade(c: Ctx, id: string, ox: number, oy: number) {
  const m = MATERIALS[Number(id[id.length - 1]) as 0 | 1 | 2 | 3] ?? MATERIALS[0];
  px(c, ox, oy, TILE, TILE, m.base);
  speckle(c, ox, oy, m.dark, 71, 7);

  if (id.startsWith("fac_wall")) {
    px(c, ox, oy, TILE, 1, m.lite);
    return;
  }

  if (id.startsWith("fac_win")) {
    px(c, ox + 3, oy + 3, 10, 9, "#2a2f3c");
    px(c, ox + 4, oy + 4, 8, 7, PAL.glass);
    px(c, ox + 4, oy + 4, 4, 3, PAL.glassLit); // the highlight does the work
    px(c, ox + 3, oy + 12, 10, 1, m.trim); // sill
    return;
  }

  if (id.startsWith("fac_shop")) {
    /* street level: a wide lit window and an awning over it */
    px(c, ox, oy + 1, TILE, 3, "#b4495a");
    px(c, ox, oy + 4, TILE, 1, "#8c3545");
    px(c, ox + 1, oy + 6, 14, 9, "#2a2f3c");
    px(c, ox + 2, oy + 7, 12, 7, "#ffd79a");
    px(c, ox + 2, oy + 7, 5, 3, "#fff0c9");
    return;
  }

  /* fac_door */
  px(c, ox + 3, oy + 2, 10, 14, "#2a2f3c");
  px(c, ox + 4, oy + 3, 8, 13, PAL.door);
  px(c, ox + 4, oy + 3, 8, 2, m.trim);
  px(c, ox + 10, oy + 9, 1, 2, "#e8d49a");
}

export const TILE_ORDER: TileId[] = [
  "road",
  "road_h",
  "road_v",
  "zebra_h",
  "zebra_v",
  "walk",
  "kerb_n",
  "kerb_s",
  "grass",
  "tree",
  "roof0",
  "roof_n0",
  "roof1",
  "roof_n1",
  "roof2",
  "roof_n2",
  "roof3",
  "roof_n3",
  "void",
  "fac_wall0",
  "fac_win0",
  "fac_door0",
  "fac_shop0",
  "fac_wall1",
  "fac_win1",
  "fac_door1",
  "fac_shop1",
  "fac_wall2",
  "fac_win2",
  "fac_door2",
  "fac_shop2",
  "fac_wall3",
  "fac_win3",
  "fac_door3",
  "fac_shop3",
];

/* ── props ───────────────────────────────────────────────────────── */

export type PropId = "lamp" | "bench" | "bin" | "hydrant" | "planter" | "ac";

export const PROP_ORDER: PropId[] = ["lamp", "bench", "bin", "hydrant", "planter", "ac"];

function drawProp(c: Ctx, id: PropId, ox: number, oy: number) {
  switch (id) {
    case "lamp":
      px(c, ox + 7, oy + 4, 2, 12, "#3b3f4e");
      px(c, ox + 5, oy + 2, 6, 3, "#4c5162");
      px(c, ox + 6, oy + 3, 4, 1, "#ffe9b0");
      break;
    case "bench":
      px(c, ox + 2, oy + 7, 12, 3, "#7a5436");
      px(c, ox + 2, oy + 5, 12, 2, "#8d6240");
      px(c, ox + 3, oy + 10, 2, 3, "#3b3f4e");
      px(c, ox + 11, oy + 10, 2, 3, "#3b3f4e");
      break;
    case "bin":
      px(c, ox + 5, oy + 6, 6, 9, "#434858");
      px(c, ox + 4, oy + 5, 8, 2, "#565c6e");
      px(c, ox + 6, oy + 8, 1, 5, "#363a47");
      break;
    case "hydrant":
      px(c, ox + 6, oy + 7, 4, 8, "#b23a3a");
      px(c, ox + 5, oy + 6, 6, 2, "#cf4a4a");
      px(c, ox + 4, oy + 9, 8, 2, "#cf4a4a");
      break;
    case "planter":
      px(c, ox + 3, oy + 9, 10, 6, "#6b5340");
      px(c, ox + 3, oy + 8, 10, 2, "#7e624c");
      px(c, ox + 5, oy + 4, 6, 5, PAL.leafB);
      px(c, ox + 6, oy + 3, 4, 2, PAL.leafA);
      break;
    case "ac":
      px(c, ox + 4, oy + 6, 8, 7, "#7a8092");
      px(c, ox + 5, oy + 7, 6, 5, "#5d6373");
      px(c, ox + 6, oy + 8, 4, 3, "#8e95a8");
      break;
  }
}

/* ── the hero ────────────────────────────────────────────────────── */

/*
  An original masked hero: red torso, deep-blue legs and arms, white mask
  lenses. Deliberately not any existing character's costume — no spider
  motif, no web pattern, no logo.
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

/* a citizen: same build, swappable colours, so the street is populated
   without a second sprite sheet */
const NPC_DOWN = [
  "            ",
  "    KKKK    ",
  "   KSSSSK   ",
  "   SSSSSS   ",
  "   SKSSKS   ",
  "   KSSSSK   ",
  "   CCCCCC   ",
  "  CCCCCCCC  ",
  "  CCCCCCCC  ",
  "  CCccccCC  ",
  "   cPPPPc   ",
  "   PP  PP   ",
  "   PP  PP   ",
  "   pp  pp   ",
  "   KK  KK   ",
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

function paintSprite(
  c: Ctx,
  map: string[],
  ox: number,
  oy: number,
  legPhase: number,
  flip: boolean,
  cols: Record<string, string>
) {
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === " ") continue;
      const colour = cols[ch];
      if (!colour) continue;
      let dx = x;
      /* rows 11+ are legs: shifting them a pixel is the whole walk cycle
         at this size, and keeps the sprite editable as one picture */
      if (y >= 11 && legPhase !== 0) dx = x + (x < HERO_W / 2 ? legPhase : -legPhase);
      const fx = flip ? HERO_W - 1 - dx : dx;
      c.fillStyle = colour;
      c.fillRect(ox + fx, oy + y, 1, 1);
    }
  }
}

export type HeroDir = "down" | "up" | "left" | "right";
export const HERO_DIRS: HeroDir[] = ["down", "up", "left", "right"];
export const HERO_FRAMES = 4;

export function heroFrameIndex(dir: HeroDir, frame: number): number {
  return HERO_DIRS.indexOf(dir) * HERO_FRAMES + (frame % HERO_FRAMES);
}

/* four citizen palettes */
const NPC_COLS = [
  { C: "#3f6fae", c: "#32598b", P: "#3b3f4e", p: "#2e313d" },
  { C: "#b4604a", c: "#8f4a39", P: "#4a4036", p: "#3a3229" },
  { C: "#4f9e76", c: "#3d7c5c", P: "#3b3f4e", p: "#2e313d" },
  { C: "#9a6fae", c: "#7a578b", P: "#2f3443", p: "#242836" },
].map((o) => ({ ...o, S: PAL.skin, K: "#1a1420" }));

export const NPC_VARIANTS = NPC_COLS.length;

/* ── the atlas ───────────────────────────────────────────────────── */

export type Atlas = {
  canvas: HTMLCanvasElement;
  heroRowY: number;
  propRowY: number;
  npcRowY: number;
};

export function buildAtlas(): Atlas {
  const cols = Math.max(TILE_ORDER.length, HERO_DIRS.length * HERO_FRAMES, PROP_ORDER.length);
  const canvas = document.createElement("canvas");
  canvas.width = cols * TILE;
  canvas.height = TILE * 4;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("city: no 2d context for the atlas");
  c.imageSmoothingEnabled = false;

  TILE_ORDER.forEach((id, i) => drawTile(c, id, i * TILE, 0));

  const legPhases = [0, 1, 0, -1];
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const map = dir === "down" ? HERO_DOWN : dir === "up" ? HERO_UP : HERO_SIDE;
      paintSprite(c, map, (d * HERO_FRAMES + f) * TILE + 2, TILE, legPhases[f], dir === "left", HERO_COLS);
    }
  });

  PROP_ORDER.forEach((id, i) => drawProp(c, id, i * TILE, TILE * 2));

  NPC_COLS.forEach((cols2, v) => {
    for (let f = 0; f < 2; f++) {
      paintSprite(c, NPC_DOWN, (v * 2 + f) * TILE + 2, TILE * 3, f === 0 ? 1 : -1, false, cols2);
    }
  });

  return { canvas, heroRowY: TILE, propRowY: TILE * 2, npcRowY: TILE * 3 };
}

export const tileAtlasIndex = (id: TileId): number => Math.max(0, TILE_ORDER.indexOf(id));
export const propAtlasIndex = (id: PropId): number => Math.max(0, PROP_ORDER.indexOf(id));
