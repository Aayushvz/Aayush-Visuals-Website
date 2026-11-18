import { MATERIALS, SOLID, type PropId, type TileId } from "./tiles.ts";
import { itemSolid, VENUES, type Venue } from "./interiors.ts";

/*
  Downtown, generated as buildings rather than as tiles.

  The first version decided every tile independently, which is why it read
  as a diagram: windows landed at random, so no building had floors or
  bays. Here each block is divided into building footprints first, and a
  building then stamps its own façade — a regular grid of windows on a
  storey pitch, shops at street level, one door, a parapet along the roof.
  Regularity is what the eye reads as architecture.

  Deterministic throughout: the same city on every visit.
*/

export const MAP_W = 72;
export const MAP_H = 56;

const PITCH = 12; // block pitch, including the road
const ROAD_W = 3;

export type Cell = { id: TileId; solid: boolean };

export type Prop = { id: PropId; tx: number; ty: number };

export type Car = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  colour: string;
  speed: number;
};

export type Npc = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  variant: number;
  t: number;
};

export type Discovery = {
  id: string;
  title: string;
  tx: number;
  ty: number;
  label: string;
};

/** a building whose roof is cut away so the street can see inside */
export type PlacedVenue = {
  id: string;
  venue: Venue;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** is this world-pixel point inside a solid piece of venue furniture */
export function venueSolidAt(v: PlacedVenue, px: number, py: number): boolean {
  const tx = Math.floor(px / 16) - v.x0;
  const ty = Math.floor(py / 16) - v.y0;
  if (tx < 0 || ty < 0 || tx > v.x1 - v.x0 || ty > v.y1 - v.y0) return false;
  return v.venue.items.some(
    (it) =>
      itemSolid(it) &&
      tx >= it.x &&
      tx < it.x + (it.w ?? 1) &&
      ty >= it.y &&
      ty < it.y + (it.h ?? 1)
  );
}

export type World = {
  w: number;
  h: number;
  cells: Cell[];
  props: Prop[];
  venues: PlacedVenue[];
  cars: Car[];
  npcs: Npc[];
  discoveries: Discovery[];
  spawn: { x: number; y: number };
};

const idx = (x: number, y: number) => y * MAP_W + x;

const h2 = (x: number, y: number, s: number) => {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

const onRoad = (v: number) => v % PITCH < ROAD_W;

export function buildWorld(discoveries: Discovery[]): World {
  const cells: Cell[] = new Array(MAP_W * MAP_H);
  const props: Prop[] = [];
  const venues: PlacedVenue[] = [];
  const cars: Car[] = [];
  const npcs: Npc[] = [];

  const set = (x: number, y: number, id: TileId) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    cells[idx(x, y)] = { id, solid: SOLID(id) };
  };

  /* ── ground: roads, crossings, pavement ─────────────────────────── */
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const rx = onRoad(x);
      const ry = onRoad(y);
      let id: TileId;

      if (rx || ry) {
        const junction = rx && ry;
        /* crossings sit just off each junction, where they really are */
        const nearJunctionX = x % PITCH === ROAD_W;
        const nearJunctionY = y % PITCH === ROAD_W;
        if (!junction && ry && nearJunctionX) id = "zebra_v";
        else if (!junction && rx && nearJunctionY) id = "zebra_h";
        else if (junction) id = "road";
        else if (rx) id = x % PITCH === 1 ? "road_v" : "road";
        else id = y % PITCH === 1 ? "road_h" : "road";
      } else {
        const ix = x % PITCH;
        const iy = y % PITCH;
        const onEdge = ix === ROAD_W || iy === ROAD_W || ix === PITCH - 1 || iy === PITCH - 1;
        if (onEdge) id = iy === ROAD_W ? "kerb_n" : iy === PITCH - 1 ? "kerb_s" : "walk";
        else id = "walk";
      }
      cells[idx(x, y)] = { id, solid: SOLID(id) };
    }
  }

  /* ── blocks: parks and buildings ────────────────────────────────── */
  const blocksX = Math.floor(MAP_W / PITCH);
  const blocksY = Math.floor(MAP_H / PITCH);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      /* the interior of the block, inside its pavement ring */
      const x0 = bx * PITCH + ROAD_W + 1;
      const y0 = by * PITCH + ROAD_W + 1;
      const x1 = bx * PITCH + PITCH - 2;
      const y1 = by * PITCH + PITCH - 2;
      if (x1 >= MAP_W || y1 >= MAP_H) continue;

      /*
        A block holding one of the eight projects is built as a venue
        instead of a building: no roof, so the street sees the studio or
        the gym and the people in it. That is the exhibit — there is no
        separate interior to walk into.
      */
      const owner = discoveries.find(
        (d) => d.tx >= x0 - 1 && d.tx <= x1 + 1 && d.ty >= y0 - 1 && d.ty <= y1 + 1
      );
      if (owner && VENUES[owner.id]) {
        makeVenue(set, venues, VENUES[owner.id], owner.id, x0, y0, x1, y1);
        continue;
      }

      if (h2(bx, by, 9) > 0.8) {
        makePark(set, props, x0, y0, x1, y1, bx, by);
        continue;
      }

      /* split the block into one or two buildings so the street has a
         rhythm of widths rather than one slab per block */
      const split = h2(bx, by, 21) > 0.45;
      if (split) {
        const cut = x0 + 2 + Math.floor(h2(bx, by, 33) * (x1 - x0 - 3));
        makeBuilding(set, props, x0, y0, cut, y1, bx * 7 + by);
        makeBuilding(set, props, cut + 1, y0, x1, y1, bx * 13 + by * 3 + 1);
      } else {
        makeBuilding(set, props, x0, y0, x1, y1, bx * 5 + by * 11);
      }
    }
  }

  /* ── street furniture along the kerbs ───────────────────────────── */
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = cells[idx(x, y)];
      if (!c || (c.id !== "kerb_n" && c.id !== "kerb_s" && c.id !== "walk")) continue;
      const r = h2(x, y, 77);
      if (r > 0.955) props.push({ id: "lamp", tx: x, ty: y });
      else if (r > 0.945) props.push({ id: "bench", tx: x, ty: y });
      else if (r > 0.938) props.push({ id: "bin", tx: x, ty: y });
      else if (r > 0.932) props.push({ id: "hydrant", tx: x, ty: y });
      else if (r > 0.924) props.push({ id: "planter", tx: x, ty: y });
    }
  }

  /* ── traffic: one car per road lane, looping ────────────────────── */
  const CAR_COLOURS = ["#c7503f", "#3f6fae", "#d6b45a", "#4f9e76", "#b9bcc8", "#8a5fae"];
  for (let b = 0; b < blocksY; b++) {
    const lane = b * PITCH + 1;
    if (lane >= MAP_H) continue;
    for (let n = 0; n < 2; n++) {
      const east = n === 0;
      cars.push({
        x: (h2(b, n, 5) * MAP_W * 16) | 0,
        y: (lane + (east ? 0 : 1)) * 16 + 8,
        dx: east ? 1 : -1,
        dy: 0,
        colour: CAR_COLOURS[(b * 2 + n) % CAR_COLOURS.length],
        speed: 26 + h2(b, n, 7) * 18,
      });
    }
  }
  for (let b = 0; b < blocksX; b++) {
    const lane = b * PITCH + 1;
    if (lane >= MAP_W) continue;
    cars.push({
      x: (lane + (b % 2)) * 16 + 8,
      y: (h2(b, 3, 11) * MAP_H * 16) | 0,
      dx: 0,
      dy: b % 2 === 0 ? 1 : -1,
      colour: CAR_COLOURS[(b + 3) % CAR_COLOURS.length],
      speed: 24 + h2(b, 2, 13) * 16,
    });
  }

  /* ── pedestrians on the pavement ────────────────────────────────── */
  for (let i = 0; i < 26; i++) {
    const bx = Math.floor(h2(i, 1, 17) * blocksX);
    const by = Math.floor(h2(i, 2, 19) * blocksY);
    const horiz = h2(i, 3, 23) > 0.5;
    const tx = bx * PITCH + ROAD_W + (horiz ? 1 + Math.floor(h2(i, 4, 29) * 6) : 0);
    const ty = by * PITCH + ROAD_W + (horiz ? 0 : 1 + Math.floor(h2(i, 5, 31) * 6));
    if (tx >= MAP_W || ty >= MAP_H) continue;
    const c = cells[idx(tx, ty)];
    if (!c || c.solid) continue;
    npcs.push({
      x: tx * 16 + 8,
      y: ty * 16 + 10,
      dx: horiz ? (h2(i, 6, 37) > 0.5 ? 1 : -1) : 0,
      dy: horiz ? 0 : h2(i, 7, 41) > 0.5 ? 1 : -1,
      variant: i % 4,
      t: h2(i, 8, 43) * 10,
    });
  }

  /* ── discoveries: carve a guaranteed doorway ────────────────────── */
  /* the pavement in front of every project building is always clear, so
     the door can be reached no matter what the generator did */
  for (const d of discoveries) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = d.tx + dx;
      if (x < 0 || x >= MAP_W) continue;
      const y = d.ty + 1;
      if (y < MAP_H) cells[idx(x, y)] = { id: "walk", solid: false };
    }
  }

  const world: World = {
    w: MAP_W,
    h: MAP_H,
    cells,
    props,
    venues,
    cars,
    npcs,
    discoveries,
    spawn: { x: 0, y: 0 },
  };
  world.spawn = findSpawn(world, ROAD_W, ROAD_W + 2);
  return world;
}

/*
  One building.

  Top row is a parapet, the rows below it are roof, and the bottom row is
  the façade you actually see from a top-down camera — storeys of windows
  on a fixed pitch with a shopfront at ground level and one door.
*/
function makeBuilding(
  set: (x: number, y: number, id: TileId) => void,
  props: Prop[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: number
) {
  if (x1 - x0 < 2 || y1 - y0 < 2) return;
  const m = Math.floor(h2(x0, y0, seed) * MATERIALS.length) as 0 | 1 | 2 | 3;

  /*
    Three kinds, so a street has a skyline instead of a row of identical
    slabs. A tower takes the whole block and carries a double parapet and
    a crowded roof; a low-rise pulls back from the kerb, leaving a yard
    you can walk into, and fills its street level with shops.
  */
  const roll = h2(x0, y0, seed + 41);
  const kind: "tower" | "mid" | "low" = roll > 0.72 ? "tower" : roll > 0.34 ? "mid" : "low";

  /* a low-rise gives back its northern tiles as yard */
  const top = kind === "low" ? Math.min(y0 + 2, y1 - 2) : y0;
  if (kind === "low") {
    for (let y = y0; y < top; y++) {
      for (let x = x0; x <= x1; x++) {
        set(x, y, h2(x, y, seed + 53) > 0.84 ? "tree" : "walk");
      }
    }
  }

  const doorX = x0 + 1 + Math.floor(h2(x0, y1, seed + 3) * Math.max(1, x1 - x0 - 1));
  const hasShops = kind === "low" ? true : kind === "mid" ? h2(x0, y0, seed + 9) > 0.45 : false;
  const parapet = kind === "tower" ? 2 : 1;
  /* a tower shows two storeys of window above the street, a low-rise none */
  const storeys = kind === "tower" ? 2 : kind === "mid" ? 1 : 0;
  const acDensity = kind === "tower" ? 0.35 : 0.6;

  for (let y = top; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const fromBottom = y1 - y;

      if (y < top + parapet) {
        set(x, y, `roof_n${m}` as TileId);
      } else if (fromBottom > storeys) {
        set(x, y, `roof${m}` as TileId);
        if ((x - x0) % 3 === 1 && (y - top) % 3 === 2 && h2(x, y, seed + 17) > acDensity) {
          props.push({ id: "ac", tx: x, ty: y });
        }
      } else if (fromBottom > 0) {
        /* upper storeys: windows on a two-tile bay */
        set(x, y, ((x - x0) % 2 === 0 ? `fac_win${m}` : `fac_wall${m}`) as TileId);
      } else {
        if (x === doorX) set(x, y, `fac_door${m}` as TileId);
        else if (hasShops && (x - x0) % 2 === 1) set(x, y, `fac_shop${m}` as TileId);
        else set(x, y, ((x - x0) % 2 === 0 ? `fac_win${m}` : `fac_wall${m}`) as TileId);
      }
    }
  }
}

/*
  A venue: the block interior becomes an open room.

  The back row is wall, the rest is walkable floor, and the furniture is
  what the engine draws on top. Nothing here is solid at the tile level —
  the furniture carries its own collision through venueSolidAt — which is
  what lets the hero walk in off the street and around the desks.
*/
function makeVenue(
  set: (x: number, y: number, id: TileId) => void,
  venues: PlacedVenue[],
  venue: Venue,
  id: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      /* "grass" is the only non-solid non-road ground tile, and the venue
         floor is painted over it anyway, so it is just a walkable base */
      set(x, y, "grass");
    }
  }
  venues.push({ id, venue, x0, y0, x1, y1 });
}

function makePark(
  set: (x: number, y: number, id: TileId) => void,
  props: Prop[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bx: number,
  by: number
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (edge && h2(x, y, 61) > 0.72) set(x, y, "tree");
      else if (h2(x, y, 67) > 0.88) set(x, y, "tree");
      else set(x, y, "grass");
    }
  }
  const mx = Math.floor((x0 + x1) / 2);
  const my = Math.floor((y0 + y1) / 2);
  set(mx, my, "grass");
  props.push({ id: "bench", tx: mx, ty: my });
  if (h2(bx, by, 71) > 0.5) props.push({ id: "lamp", tx: mx + 1, ty: my - 1 });
}

export function cellAt(world: World, tx: number, ty: number): Cell | null {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return null;
  return world.cells[idx(tx, ty)];
}

export function solidAt(world: World, px: number, py: number): boolean {
  const c = cellAt(world, Math.floor(px / 16), Math.floor(py / 16));
  return c === null || c.solid;
}

/*
  Walk outwards until an open tile turns up.

  The first version hardcoded a tile it believed was pavement; the block
  maths put it inside the building line and the hero spawned sealed in a
  brick wall, unable to move at all. Searching means the layout can change
  freely without ever bringing that back.
*/
function findSpawn(world: World, px: number, py: number): { x: number; y: number } {
  for (let r = 0; r < Math.max(MAP_W, MAP_H); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const c = cellAt(world, px + dx, py + dy);
        if (c && !c.solid) return { x: (px + dx) * 16 + 8, y: (py + dy) * 16 + 8 };
      }
    }
  }
  return { x: 24, y: 24 };
}

/* Where each experiment lives. Spread across blocks so finding them means
   walking the city rather than circling one street. Each sits on the
   street-level row of a block, which is the façade row. */
export const DISCOVERIES: Discovery[] = [
  { id: "pond", title: "Lotus Pond", tx: 7, ty: 10, label: "Diorama Studio" },
  { id: "cat", title: "CAT Operator Assistant", tx: 31, ty: 10, label: "Ops Tower" },
  { id: "invoice", title: "Invoice Generator", tx: 55, ty: 10, label: "Finance Row" },
  { id: "contract", title: "Contract Generator Tool", tx: 19, ty: 22, label: "Legal Archive" },
  { id: "dpl", title: "Design Premier League", tx: 43, ty: 22, label: "The Stadium" },
  { id: "yantra", title: "Yantra", tx: 7, ty: 34, label: "Festival Hall" },
  { id: "mike-tyson-invitational", title: "Mike Tyson Invitational", tx: 31, ty: 34, label: "Iron Forge Gym" },
  { id: "dropby", title: "DropBy", tx: 55, ty: 46, label: "Brand House" },
];
