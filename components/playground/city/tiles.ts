/*
  City of Creators — the tileset, drawn in code.

  Every tile, prop and hero frame is painted into an offscreen canvas at
  boot, then blitted from there. No external sprite sheet is needed, so
  the experience ships instant and crisp on high-DPI displays.
  
  Supports both Day and Night modes with rich architectural palettes,
  polished road markings, vehicle variants, and a realistic protagonist.
*/

export const TILE = 16;

/* Night palette */
export const PAL_NIGHT = {
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

/* Day palette */
export const PAL_DAY = {
  road: "#3c3e4c",
  roadDark: "#31333e",
  line: "#f7ec84",
  kerb: "#9ea3b2",
  kerbLite: "#b6bcc9",
  walk: "#cbd0db",
  walkLite: "#dfe3ec",
  grass: "#4fa85c",
  grassLite: "#64c472",
  grassDark: "#3c8647",
  trunk: "#694732",
  leafA: "#397e47",
  leafB: "#4ea85b",
  glass: "#a5dfeb",
  glassLit: "#e2f7fc",
  glassDark: "#64abb8",
  door: "#5a4132",
  hero1: "#d6273c",
  hero2: "#8f1726",
  hero3: "#2a3f8f",
  hero4: "#1b2a63",
  heroEye: "#eef4ff",
  skin: "#f2c19e",
  cyan: "#59e8ff",
} as const;

export const PAL = PAL_NIGHT;

/* Four façade materials */
export const MATERIALS = [
  { base: "#8a5a4a", dark: "#6f4639", lite: "#9c6a58", trim: "#b08670" }, // brick
  { base: "#6f7384", dark: "#595d6d", lite: "#828799", trim: "#9aa0b2" }, // concrete
  { base: "#4b6b74", dark: "#3a555d", lite: "#5d808a", trim: "#7fa3ad" }, // slate
  { base: "#7d6a86", dark: "#64546c", lite: "#917d9b", trim: "#ab97b4" }, // plum
] as const;

export const MATERIALS_DAY = [
  { base: "#a86c5a", dark: "#855444", lite: "#bc7c68", trim: "#cca48f" }, // warm brick
  { base: "#848a9c", dark: "#6c7283", lite: "#9ea4b6", trim: "#b2b8c9" }, // clean modern concrete
  { base: "#597e88", dark: "#45646d", lite: "#6d95a0", trim: "#93b8c2" }, // teal slate
  { base: "#967fa0", dark: "#7b6584", lite: "#ab93b5", trim: "#c5b1ce" }, // lavender stone
] as const;

export type TileId =
  | "road"
  | "road_h"
  | "road_v"
  | "road_arrow_up"
  | "road_arrow_down"
  | "road_arrow_left"
  | "road_arrow_right"
  | "road_manhole"
  | "road_drain"
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

export function drawTile(c: Ctx, id: TileId, ox: number, oy: number, isDay = false) {
  const pal = isDay ? PAL_DAY : PAL_NIGHT;
  const mats = isDay ? MATERIALS_DAY : MATERIALS;

  if (id.startsWith("fac_")) return drawFacade(c, id, ox, oy, isDay, mats, pal);
  if (id.startsWith("roof")) return drawRoof(c, id, Number(id[id.length - 1]) || 0, ox, oy, isDay, mats);

  switch (id) {
    case "road":
    case "road_h":
    case "road_v":
    case "road_arrow_up":
    case "road_arrow_down":
    case "road_arrow_left":
    case "road_arrow_right":
    case "road_manhole":
    case "road_drain": {
      px(c, ox, oy, TILE, TILE, pal.road);
      speckle(c, ox, oy, pal.roadDark, 6, 12);
      if (id === "road_h") {
        // Continuous dashed yellow center divider
        px(c, ox + 3, oy + 7, 10, 2, isDay ? "#facc15" : "#eab308");
        px(c, ox + 3, oy + 6, 10, 1, isDay ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)");
      } else if (id === "road_v") {
        // Continuous dashed yellow center divider
        px(c, ox + 7, oy + 3, 2, 10, isDay ? "#facc15" : "#eab308");
        px(c, ox + 6, oy + 3, 1, 10, isDay ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)");
      } else if (id === "road_arrow_up") {
        // Northbound lane arrow (centered in driving lane)
        px(c, ox + 7, oy + 3, 2, 9, "#ffffff");
        px(c, ox + 6, oy + 5, 4, 1, "#ffffff");
        px(c, ox + 5, oy + 6, 6, 1, "#ffffff");
      } else if (id === "road_arrow_down") {
        // Southbound lane arrow (centered in driving lane)
        px(c, ox + 7, oy + 4, 2, 9, "#ffffff");
        px(c, ox + 6, oy + 10, 4, 1, "#ffffff");
        px(c, ox + 5, oy + 9, 6, 1, "#ffffff");
      } else if (id === "road_arrow_left") {
        // Westbound lane arrow (centered in driving lane)
        px(c, ox + 3, oy + 7, 9, 2, "#ffffff");
        px(c, ox + 5, oy + 6, 1, 4, "#ffffff");
        px(c, ox + 6, oy + 5, 1, 6, "#ffffff");
      } else if (id === "road_arrow_right") {
        // Eastbound lane arrow (centered in driving lane)
        px(c, ox + 4, oy + 7, 9, 2, "#ffffff");
        px(c, ox + 10, oy + 6, 1, 4, "#ffffff");
        px(c, ox + 9, oy + 5, 1, 6, "#ffffff");
      } else if (id === "road_manhole") {
        // Heavy iron sewer cover with concentric waffle ribs
        const baseCol = isDay ? "#4b5563" : "#1f2937";
        const ribCol = isDay ? "#6b7280" : "#111827";
        px(c, ox + 4, oy + 4, 8, 8, baseCol);
        px(c, ox + 5, oy + 3, 6, 10, baseCol);
        px(c, ox + 3, oy + 5, 10, 6, baseCol);
        px(c, ox + 6, oy + 6, 4, 4, ribCol);
        px(c, ox + 7, oy + 5, 2, 6, ribCol);
        px(c, ox + 5, oy + 7, 6, 2, ribCol);
      } else if (id === "road_drain") {
        // Curb stormwater grate
        px(c, ox + 2, oy + 1, 12, 5, isDay ? "#374151" : "#111827");
        for (let i = 3; i < 13; i += 2) px(c, ox + i, oy + 2, 1, 4, "#030712");
      }
      break;
    }
    case "zebra_h": {
      px(c, ox, oy, TILE, TILE, pal.road);
      speckle(c, ox, oy, pal.roadDark, 6, 6);
      for (let x = 1; x < TILE; x += 5) {
        px(c, ox + x, oy + 1, 3, TILE - 2, isDay ? "#ffffff" : "#e2e8f0");
        if (isDay) px(c, ox + x, oy + TILE - 2, 3, 1, "rgba(0,0,0,0.25)");
      }
      break;
    }
    case "zebra_v": {
      px(c, ox, oy, TILE, TILE, pal.road);
      speckle(c, ox, oy, pal.roadDark, 6, 6);
      for (let y = 1; y < TILE; y += 5) {
        px(c, ox + 1, oy + y, TILE - 2, 3, isDay ? "#ffffff" : "#e2e8f0");
        if (isDay) px(c, ox + TILE - 2, oy + y, 1, 3, "rgba(0,0,0,0.25)");
      }
      break;
    }
    case "walk": {
      px(c, ox, oy, TILE, TILE, pal.walk);
      speckle(c, ox, oy, pal.walkLite, 11, 12);
      /* slab seams */
      px(c, ox, oy, TILE, 1, pal.kerb);
      px(c, ox, oy, 1, TILE, pal.kerb);
      if (isDay) {
        px(c, ox + 1, oy + 1, TILE - 1, 1, "rgba(255,255,255,0.45)");
        px(c, ox + 1, oy + 1, 1, TILE - 1, "rgba(255,255,255,0.45)");
      }
      break;
    }
    case "kerb_n": {
      px(c, ox, oy, TILE, TILE, pal.walk);
      speckle(c, ox, oy, pal.walkLite, 13, 8);
      px(c, ox, oy + 12, TILE, 4, pal.kerb);
      px(c, ox, oy + 12, TILE, 1, pal.kerbLite);
      if (isDay) px(c, ox, oy + 15, TILE, 1, "rgba(0,0,0,0.18)");
      break;
    }
    case "kerb_s": {
      px(c, ox, oy, TILE, TILE, pal.walk);
      speckle(c, ox, oy, pal.walkLite, 19, 8);
      px(c, ox, oy, TILE, 4, pal.kerb);
      px(c, ox, oy + 3, TILE, 1, pal.kerbLite);
      if (isDay) px(c, ox, oy + 4, TILE, 1, "rgba(0,0,0,0.15)");
      break;
    }
    case "grass": {
      px(c, ox, oy, TILE, TILE, pal.grass);
      speckle(c, ox, oy, pal.grassLite, 17, 24);
      speckle(c, ox, oy, pal.grassDark, 29, 12);
      break;
    }
    case "tree": {
      px(c, ox, oy, TILE, TILE, pal.grass);
      speckle(c, ox, oy, pal.grassDark, 31, 9);
      /* tree shadow */
      px(c, ox + 5, oy + 12, 8, 3, isDay ? "rgba(20,40,25,0.3)" : "rgba(10,20,15,0.4)");
      /* trunk */
      px(c, ox + 7, oy + 9, 2, 6, pal.trunk);
      /* foliage */
      px(c, ox + 5, oy + 1, 6, 2, pal.leafA);
      px(c, ox + 3, oy + 3, 10, 4, pal.leafB);
      px(c, ox + 4, oy + 7, 8, 3, pal.leafA);
      if (isDay) {
        px(c, ox + 4, oy + 2, 4, 2, pal.grassLite);
        px(c, ox + 5, oy + 4, 5, 2, pal.grassLite);
      }
      break;
    }
    case "void": {
      px(c, ox, oy, TILE, TILE, isDay ? "#222530" : "#0d0e14");
      break;
    }
  }
}

function drawRoof(
  c: Ctx,
  id: string,
  matIdx: number,
  ox: number,
  oy: number,
  isDay: boolean,
  mats: typeof MATERIALS_DAY | typeof MATERIALS
) {
  const m = mats[matIdx % mats.length];
  const north = id.startsWith("roof_n");
  const base = north ? m.dark : m.base;
  px(c, ox, oy, TILE, TILE, base);
  speckle(c, ox, oy, m.lite, matIdx * 19 + 7, 10);
  speckle(c, ox, oy, m.dark, matIdx * 23 + 13, 8);

  /* parapet edge */
  if (north) {
    px(c, ox, oy, TILE, 2, m.trim);
    px(c, ox, oy + 2, TILE, 1, m.lite);
  } else {
    /* rooftop asphalt gravel line */
    px(c, ox, oy + 7, TILE, 1, m.dark);
  }
}

function drawFacade(
  c: Ctx,
  id: string,
  ox: number,
  oy: number,
  isDay: boolean,
  mats: typeof MATERIALS_DAY | typeof MATERIALS,
  pal: typeof PAL_DAY | typeof PAL_NIGHT
) {
  const mIdx = Number(id[id.length - 1]) || 0;
  const m = mats[mIdx % mats.length];
  px(c, ox, oy, TILE, TILE, m.base);
  speckle(c, ox, oy, m.dark, mIdx * 11 + 3, 8);
  speckle(c, ox, oy, m.lite, mIdx * 17 + 5, 6);

  /* storey banding */
  px(c, ox, oy, TILE, 1, m.trim);

  if (id.startsWith("fac_wall")) {
    /* brick texture lines */
    px(c, ox, oy + 5, TILE, 1, m.dark);
    px(c, ox, oy + 10, TILE, 1, m.dark);
  } else if (id.startsWith("fac_win")) {
    /* window with sill and frame */
    px(c, ox + 3, oy + 3, 10, 10, m.dark);
    px(c, ox + 4, oy + 4, 8, 8, isDay ? pal.glassLit : pal.glass);
    /* window cross bar */
    px(c, ox + 7, oy + 4, 2, 8, m.dark);
    px(c, ox + 4, oy + 7, 8, 2, m.dark);
    /* sill */
    px(c, ox + 2, oy + 13, 12, 2, m.trim);
    if (isDay) px(c, ox + 4, oy + 4, 3, 3, "#ffffff");
  } else if (id.startsWith("fac_door")) {
    /* entrance door with transom */
    px(c, ox + 3, oy + 3, 10, 13, m.dark);
    px(c, ox + 4, oy + 4, 8, 12, pal.door);
    px(c, ox + 5, oy + 5, 6, 3, isDay ? pal.glassLit : pal.glassDark);
    px(c, ox + 10, oy + 10, 2, 2, isDay ? "#e2c070" : "#d8b456"); // brass knob
  } else if (id.startsWith("fac_shop")) {
    /* shopfront glass with awning header */
    px(c, ox + 1, oy + 2, 14, 2, m.trim);
    px(c, ox + 2, oy + 4, 12, 11, isDay ? pal.glassLit : pal.glass);
    px(c, ox + 1, oy + 15, 14, 1, m.dark);
    if (isDay) {
      /* awning stripes */
      for (let s = 1; s < 15; s += 3) px(c, ox + s, oy + 2, 1, 2, "#e63946");
    }
  }
}

/* ── props ───────────────────────────────────────────────────────── */

export type PropId =
  | "lamp"
  | "bench"
  | "bin"
  | "hydrant"
  | "planter"
  | "ac"
  | "watertower"
  | "dish"
  | "solar"
  | "vending"
  | "traffic_light"
  | "spider_web"
  | "spidey_graffiti";

export const PROP_ORDER: PropId[] = [
  "lamp",
  "bench",
  "bin",
  "hydrant",
  "planter",
  "ac",
  "watertower",
  "dish",
  "solar",
  "vending",
  "traffic_light",
  "spider_web",
  "spidey_graffiti",
];

export function drawProp(c: Ctx, id: PropId, ox: number, oy: number, isDay = false) {
  const pal = isDay ? PAL_DAY : PAL_NIGHT;

  switch (id) {
    case "lamp":
      px(c, ox + 7, oy + 3, 2, 13, "#3d4250");
      px(c, ox + 6, oy + 15, 4, 1, "#2b2e38");
      px(c, ox + 6, oy + 2, 4, 2, isDay ? "#9da4b8" : "#fff6d9");
      if (!isDay) px(c, ox + 5, oy + 1, 6, 1, "#ffe28a");
      break;
    case "bench":
      px(c, ox + 2, oy + 6, 12, 3, "#7a5438");
      px(c, ox + 2, oy + 10, 12, 3, "#63432b");
      px(c, ox + 3, oy + 13, 2, 3, "#262934");
      px(c, ox + 11, oy + 13, 2, 3, "#262934");
      break;
    case "bin":
      px(c, ox + 5, oy + 7, 6, 8, "#3f4657");
      px(c, ox + 4, oy + 6, 8, 2, "#50586d");
      px(c, ox + 6, oy + 8, 4, 1, "#262b37");
      break;
    case "hydrant":
      px(c, ox + 6, oy + 7, 4, 8, "#b23a3a");
      px(c, ox + 5, oy + 6, 6, 2, "#cf4a4a");
      px(c, ox + 4, oy + 9, 8, 2, "#cf4a4a");
      break;
    case "planter":
      px(c, ox + 3, oy + 9, 10, 6, "#6b5340");
      px(c, ox + 3, oy + 8, 10, 2, "#7e624c");
      px(c, ox + 5, oy + 4, 6, 5, pal.leafB);
      px(c, ox + 6, oy + 3, 4, 2, pal.leafA);
      if (isDay) {
        px(c, ox + 6, oy + 4, 2, 2, "#e63946"); // red flower in day!
        px(c, ox + 9, oy + 5, 2, 2, "#f4a261"); // orange flower!
      }
      break;
    case "ac":
      px(c, ox + 4, oy + 6, 8, 7, "#7a8092");
      px(c, ox + 5, oy + 7, 6, 5, "#5d6373");
      px(c, ox + 6, oy + 8, 4, 3, "#8e95a8");
      break;
    case "watertower":
      /* rooftop cedar water tower */
      px(c, ox + 4, oy + 2, 8, 7, "#7a5538");
      px(c, ox + 5, oy + 1, 6, 2, "#5a3d25");
      px(c, ox + 4, oy + 4, 8, 1, "#444"); // metal hoops
      px(c, ox + 4, oy + 7, 8, 1, "#444");
      px(c, ox + 4, oy + 9, 2, 6, "#333"); // leg
      px(c, ox + 10, oy + 9, 2, 6, "#333"); // leg
      px(c, ox + 5, oy + 12, 6, 1, "#444"); // brace
      break;
    case "dish":
      /* satellite dish */
      px(c, ox + 7, oy + 8, 2, 7, "#6c7283");
      px(c, ox + 3, oy + 3, 8, 6, "#8c94a6");
      px(c, ox + 4, oy + 4, 6, 4, "#505663");
      px(c, ox + 8, oy + 4, 4, 2, "#ccd2df"); // receiver
      break;
    case "solar":
      /* solar panel bank */
      px(c, ox + 2, oy + 5, 12, 8, "#253b5c");
      px(c, ox + 3, oy + 6, 10, 6, "#18263d");
      px(c, ox + 2, oy + 8, 12, 1, "#45689c"); // grid lines
      px(c, ox + 6, oy + 5, 1, 8, "#45689c");
      px(c, ox + 10, oy + 5, 1, 8, "#45689c");
      break;
    case "vending":
      /* Japanese-style street drinks vending machine */
      px(c, ox + 4, oy + 3, 8, 12, "#3a6bc4");
      px(c, ox + 5, oy + 4, 6, 5, isDay ? "#b8d9f8" : "#8ab9e8"); // illuminated glass
      px(c, ox + 5, oy + 6, 2, 1, "#e63946"); // can
      px(c, ox + 8, oy + 6, 2, 1, "#2a9d8f"); // can
      px(c, ox + 5, oy + 11, 6, 3, "#1f2a40"); // slot
      break;
    case "traffic_light":
      /* traffic signal post */
      px(c, ox + 7, oy + 5, 2, 11, "#333842");
      px(c, ox + 5, oy + 1, 6, 8, "#1a1c22");
      px(c, ox + 6, oy + 2, 2, 2, "#e63946"); // Red
      px(c, ox + 6, oy + 4, 2, 2, "#f4a261"); // Yellow
      px(c, ox + 6, oy + 6, 2, 2, "#2ec4b6"); // Green
      break;
    case "spider_web":
      /* translucent corner spider web */
      px(c, ox, oy, 12, 1, isDay ? "rgba(255,255,255,0.75)" : "rgba(220,235,255,0.7)");
      px(c, ox, oy, 1, 12, isDay ? "rgba(255,255,255,0.75)" : "rgba(220,235,255,0.7)");
      px(c, ox + 3, oy + 3, 6, 1, isDay ? "rgba(255,255,255,0.5)" : "rgba(200,220,255,0.5)");
      px(c, ox + 3, oy + 3, 1, 6, isDay ? "rgba(255,255,255,0.5)" : "rgba(200,220,255,0.5)");
      px(c, ox + 6, oy + 6, 4, 1, isDay ? "rgba(255,255,255,0.4)" : "rgba(180,210,255,0.4)");
      px(c, ox + 6, oy + 6, 1, 4, isDay ? "rgba(255,255,255,0.4)" : "rgba(180,210,255,0.4)");
      for (let i = 0; i < 11; i++) {
        px(c, ox + i, oy + i, 1, 1, isDay ? "rgba(255,255,255,0.85)" : "rgba(230,240,255,0.85)");
      }
      break;
    case "spidey_graffiti":
      /* Spider-Man mask street art painted on wall */
      px(c, ox + 4, oy + 4, 8, 8, "#d6273c");
      px(c, ox + 3, oy + 5, 10, 6, "#d6273c");
      px(c, ox + 4, oy + 6, 3, 3, "#101424");
      px(c, ox + 9, oy + 6, 3, 3, "#101424");
      px(c, ox + 5, oy + 6, 2, 2, "#ffffff");
      px(c, ox + 9, oy + 6, 2, 2, "#ffffff");
      px(c, ox + 7, oy + 5, 2, 6, "#9e1626");
      break;
  }
}

/* ── Realistic Spider-Man Hero Sprite (Matching Reference) ── */

export const HERO_CELL_W = 18;
export const HERO_CELL_H = 22;
export const HERO_W = 16;
export const HERO_H = 18;

/*
  Classic Spider-Man Sprite (16x18 compact superhero chibi):
  - Bold black outlines with expressive white almond eye lenses and red brow bridge
  - Bright superhero red cowl and deep royal blue suit
  - Chest spider emblem and web details
  - High red boots with black soles
*/

const HERO_DOWN = [
  "     KKKKKK     ",
  "   KKRRRRRRKK   ",
  "  KKRKKRRKKRKK  ",
  "  KRKEEKKEEKRK  ",
  "  KREEEKKEEERK  ",
  "  KKREEKKREERKK ",
  "   KKRRRRRRKK   ",
  "    KRRRRRRK    ",
  "   KKBBRRBbKK   ",
  "  KKBBBRSSRBbKK ",
  "  KKBBBRSSRBbKK ",
  "   KKRRRRRRKK   ",
  "   KBBBBBBBBK   ",
  "   KBB    BBK   ",
  "   KbB    BbK   ",
  "   KRR    RRK   ",
  "   KRR    RRK   ",
  "  KKKK    KKKK  ",
];

const HERO_UP = [
  "     KKKKKK     ",
  "   KKRRRRRRKK   ",
  "  KKRRKRRKRRKK  ",
  "  KRRRRKKRRRRK  ",
  "  KRRRRRRRRRRK  ",
  "  KKRRKRRKRRKK  ",
  "   KKRRRRRRKK   ",
  "    KRRRRRRK    ",
  "   KKBBRRRRBBKK ",
  "  KKBBBRRRRBbKK ",
  "  KKBBBRRRRBbKK ",
  "   KKRRRRRRKK   ",
  "   KBBBBBBBBK   ",
  "   KBB    BBK   ",
  "   KbB    BbK   ",
  "   KRR    RRK   ",
  "   KRR    RRK   ",
  "  KKKK    KKKK  ",
];

const HERO_SIDE = [
  "     KKKKKK     ",
  "   KKRRRRRRKK   ",
  "  KKRKKRRRRRKK  ",
  "  KRKEEKKRRRRK  ",
  "  KREEEKKRRRRK  ",
  "  KKREEKKRRRKK  ",
  "   KKRRRRRRKK   ",
  "    KRRRRRRK    ",
  "   KKBBRRRRKK   ",
  "  KKBBBRSSRK    ",
  "  KKBBBRSSRK    ",
  "   KKRRRRRKK    ",
  "    KBBBBBKK    ",
  "    KBB  BBK    ",
  "    KbB  BbK    ",
  "    KRR  RRK    ",
  "    KRR  RRK    ",
  "   KKKK  KKKK   ",
];

const HERO_COLS: Record<string, string> = {
  K: "#0f1118",
  R: "#e62838",
  r: "#a81624",
  B: "#1d4ed8",
  b: "#172554",
  E: "#ffffff",
  e: "#dbeafe",
  S: "#0f1118",
};

/* Walk-cycle animation sprite drawer */
function paintHeroSprite(
  c: Ctx,
  map: string[],
  ox: number,
  oy: number,
  frame: number,
  flip: boolean
) {
  // 4 frames: 0: idle, 1: left forward, 2: passing, 3: right forward
  const legShift = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const armShift = frame === 1 ? -1 : frame === 3 ? 1 : 0;

  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === " ") continue;
      const colour = HERO_COLS[ch];
      if (!colour) continue;

      let dx = x;
      // Leg animation (rows 13+)
      if (y >= 13) {
        if (x < 8) dx += legShift;
        else dx -= legShift;
      }
      // Arm animation (rows 8-10)
      else if (y >= 8 && y <= 10 && (x <= 3 || x >= 12)) {
        if (x <= 3) dx += armShift;
        else dx -= armShift;
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

export function heroFrameIndex(dir: HeroDir, frame: number): number {
  return HERO_DIRS.indexOf(dir) * HERO_FRAMES + (frame % HERO_FRAMES);
}

/* Citizens (NPCs): Directional multi-frame sprites with diverse outfits */
export const NPC_CELL_W = 14;
export const NPC_CELL_H = 18;

const NPC_DOWN = [
  "   hhhhhh   ",
  "  hHHHHHHh  ",
  "  hHhhhhHh  ",
  "   sSSSSSs  ",
  "   sEesEe   ",
  "   ssssss   ",
  "   CCCCCC   ",
  "  aCCCCCCCCa",
  "  aCCCCCCCCa",
  "  aACcccCAa ",
  "   cPPPPc   ",
  "   PP  PP   ",
  "   PP  PP   ",
  "   pp  pp   ",
  "   KK  KK   ",
  "   WW  WW   ",
];

const NPC_UP = [
  "   hhhhhh   ",
  "  hHHHHHHh  ",
  "  hHHHHHHh  ",
  "  hHHHHHHh  ",
  "   ssssss   ",
  "   ssssss   ",
  "   CCCCCC   ",
  "  aCCCCCCCCa",
  "  aCCCCCCCCa",
  "  aACcccCAa ",
  "   cPPPPc   ",
  "   PP  PP   ",
  "   PP  PP   ",
  "   pp  pp   ",
  "   KK  KK   ",
  "   WW  WW   ",
];

const NPC_SIDE = [
  "    hhhhh   ",
  "   hHHHHHh  ",
  "   hHhhhH   ",
  "    sSSSs   ",
  "    sEe     ",
  "    sssss   ",
  "   CCCCCa   ",
  "   CCCCCCa  ",
  "   CCCCCCa  ",
  "   cCCCC    ",
  "   cPPc     ",
  "   PPPP     ",
  "   PPPP     ",
  "   pppp     ",
  "   KKKK     ",
  "   WWWW     ",
];

export const NPC_COLS = [
  // 1. Spidey Fan: Crimson hoodie, dark jeans, warm peach skin, brunette hair
  { C: "#dc2626", c: "#991b1b", P: "#1e3a5f", p: "#172554", H: "#451a03", h: "#78350f", S: "#fed7aa", s: "#fdba74", a: "#fdba74", A: "#dc2626", E: "#ffffff", e: "#0f172a", K: "#0f172a", W: "#f8fafc" },
  // 2. Tech Lead: Navy blazer, khaki chinos, black hair, golden skin
  { C: "#1e3a8a", c: "#1e293b", P: "#d97706", p: "#b45309", H: "#0f172a", h: "#334155", S: "#fcd34d", s: "#f59e0b", a: "#f59e0b", A: "#1e3a8a", E: "#ffffff", e: "#0f172a", K: "#78350f", W: "#fef3c7" },
  // 3. Artsy Hipster: Mustard knit sweater, olive beanie, dark jeans, fair skin
  { C: "#ca8a04", c: "#a16207", P: "#334155", p: "#1e293b", H: "#365314", h: "#4d7c0f", S: "#ffedd5", s: "#fed7aa", a: "#fed7aa", A: "#ca8a04", E: "#ffffff", e: "#1e293b", K: "#422006", W: "#ffffff" },
  // 4. Cyberpunk Teen: Violet jacket, cyan hair, black cargo, deep bronze skin
  { C: "#9333ea", c: "#7e22ce", P: "#18181b", p: "#09090b", H: "#06b6d4", h: "#22d3ee", S: "#b45309", s: "#92400e", a: "#92400e", A: "#9333ea", E: "#ffffff", e: "#09090b", K: "#18181b", W: "#06b6d4" },
  // 5. Peter Parker Casual: Plaid flannel, blue denim, messy brown hair
  { C: "#b91c1c", c: "#991b1b", P: "#2563eb", p: "#1d4ed8", H: "#382417", h: "#5c3d2e", S: "#fed7aa", s: "#fdba74", a: "#fdba74", A: "#b91c1c", E: "#ffffff", e: "#0f172a", K: "#1e293b", W: "#ffffff" },
  // 6. Urban Creator: Emerald sweater, dark brown pants, curly black hair, rich deep brown skin
  { C: "#059669", c: "#047857", P: "#451a03", p: "#290d04", H: "#171717", h: "#262626", S: "#78350f", s: "#592308", a: "#592308", A: "#059669", E: "#ffffff", e: "#000000", K: "#171717", W: "#f1f5f9" },
  // 7. Daily Bugle Reporter: Camel trench coat, fedora, grey trousers, slate hair
  { C: "#b45309", c: "#92400e", P: "#475569", p: "#334155", H: "#475569", h: "#64748b", S: "#ffedd5", s: "#fed7aa", a: "#fed7aa", A: "#b45309", E: "#ffffff", e: "#0f172a", K: "#292524", W: "#e2e8f0" },
  // 8. Streetwear Student: Pastel teal tee, purple sneakers, warm beige skin, brunette hair
  { C: "#0d9488", c: "#0f766e", P: "#3f3f46", p: "#27272a", H: "#451a03", h: "#5c2a12", S: "#fde047", s: "#eab308", a: "#eab308", A: "#0d9488", E: "#ffffff", e: "#18181b", K: "#7c3aed", W: "#fdf4ff" },
];

export const NPC_VARIANTS = NPC_COLS.length;

/* ── the atlas ───────────────────────────────────────────────────── */

export type Atlas = {
  canvas: HTMLCanvasElement;
  heroRowY: number;
  propRowY: number;
  npcRowY: number;
  isDay: boolean;
};

export const TILE_ORDER: TileId[] = [
  "road",
  "road_h",
  "road_v",
  "road_arrow_up",
  "road_arrow_down",
  "road_arrow_left",
  "road_arrow_right",
  "road_manhole",
  "road_drain",
  "zebra_h",
  "zebra_v",
  "walk",
  "kerb_n",
  "kerb_s",
  "grass",
  "tree",
  "roof0",
  "roof1",
  "roof2",
  "roof3",
  "roof_n0",
  "roof_n1",
  "roof_n2",
  "roof_n3",
  "void",
  "fac_wall0",
  "fac_wall1",
  "fac_wall2",
  "fac_wall3",
  "fac_win0",
  "fac_win1",
  "fac_win2",
  "fac_win3",
  "fac_door0",
  "fac_door1",
  "fac_door2",
  "fac_door3",
  "fac_shop0",
  "fac_shop1",
  "fac_shop2",
  "fac_shop3",
];

export function buildAtlas(isDay = false): Atlas {
  const cols = Math.max(
    TILE_ORDER.length,
    HERO_DIRS.length * HERO_FRAMES,
    PROP_ORDER.length
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    cols * TILE,
    HERO_DIRS.length * HERO_FRAMES * HERO_CELL_W,
    NPC_COLS.length * 6 * NPC_CELL_W + 30
  );
  canvas.height = TILE * 2 + HERO_CELL_H + NPC_CELL_H + 30;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("city: no 2d context for the atlas");
  c.imageSmoothingEnabled = false;

  // Row 0: Tiles (16px high)
  TILE_ORDER.forEach((id, i) => drawTile(c, id, i * TILE, 0, isDay));

  // Row 1: Props (16px high)
  const propRowY = TILE + 2;
  PROP_ORDER.forEach((id, i) => drawProp(c, id, i * TILE, propRowY, isDay));

  // Row 2: Hero (HERO_CELL_H high, 22px)
  const heroRowY = propRowY + TILE + 4;
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const map = dir === "down" ? HERO_DOWN : dir === "up" ? HERO_UP : HERO_SIDE;
      const ox = (d * HERO_FRAMES + f) * HERO_CELL_W + 1;
      paintHeroSprite(c, map, ox, heroRowY, f, dir === "left");
    }
  });

  // Row 3: NPCs (8 diverse variants × 3 directions × 2 walking frames)
  const npcRowY = heroRowY + HERO_CELL_H + 6;
  const NPC_MAPS = [NPC_DOWN, NPC_UP, NPC_SIDE];
  NPC_COLS.forEach((cols2, v) => {
    NPC_MAPS.forEach((map, dir) => {
      for (let f = 0; f < 2; f++) {
        const ox = (v * 6 + dir * 2 + f) * NPC_CELL_W + 1;
        for (let y = 0; y < map.length; y++) {
          const row = map[y];
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === " ") continue;
            const colour = (cols2 as Record<string, string>)[ch];
            if (!colour) continue;
            let dx = x;
            // Realistic walking stride for stepping frame
            if (f === 1 && y >= 11) {
              if (dir === 2) {
                dx += y >= 14 ? 1 : 0;
              } else {
                dx += x < 6 ? 1 : -1;
              }
            }
            c.fillStyle = colour;
            c.fillRect(ox + dx, npcRowY + y, 1, 1);
          }
        }
      }
    });
  });

  return { canvas, heroRowY, propRowY, npcRowY, isDay };
}

export const tileAtlasIndex = (id: TileId): number => Math.max(0, TILE_ORDER.indexOf(id));
export const propAtlasIndex = (id: PropId): number => Math.max(0, PROP_ORDER.indexOf(id));
