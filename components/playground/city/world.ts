import { MATERIALS, SOLID, type PropId, type TileId } from "./tiles";

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

export type World = {
  w: number;
  h: number;
  cells: Cell[];
  props: Prop[];
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
  for (const d of discoveries) {
    set(d.tx, d.ty, "fac_door0");
    cells[idx(d.tx, d.ty)] = { id: "fac_door0", solid: false };
    for (let dx = -1; dx <= 1; dx++) set(d.tx + dx, d.ty + 1, "walk");
  }

  const world: World = {
    w: MAP_W,
    h: MAP_H,
    cells,
    props,
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
  const doorX = x0 + 1 + Math.floor(h2(x0, y1, seed + 3) * Math.max(1, x1 - x0 - 1));
  const hasShops = h2(x0, y0, seed + 9) > 0.45;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y === y0) {
        set(x, y, `roof_n${m}` as TileId);
      } else if (y < y1 - 1) {
        set(x, y, `roof${m}` as TileId);
        /* plant kit on the roof, on a grid so it reads as equipment */
        if ((x - x0) % 3 === 1 && (y - y0) % 3 === 2 && h2(x, y, seed + 17) > 0.55) {
          props.push({ id: "ac", tx: x, ty: y });
        }
      } else if (y === y1 - 1) {
        /* upper storey: windows on a two-tile bay */
        set(x, y, ((x - x0) % 2 === 0 ? `fac_win${m}` : `fac_wall${m}`) as TileId);
      } else {
        /* street level */
        if (x === doorX) set(x, y, `fac_door${m}` as TileId);
        else if (hasShops && (x - x0) % 2 === 1) set(x, y, `fac_shop${m}` as TileId);
        else set(x, y, ((x - x0) % 2 === 0 ? `fac_win${m}` : `fac_wall${m}`) as TileId);
      }
    }
  }
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
