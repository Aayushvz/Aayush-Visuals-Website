import { SOLID, type TileId } from "./tiles";

/*
  Downtown, generated from a block plan rather than hand-authored.

  A 60x44 tile grid of city blocks: roads on an 11-tile pitch, pavement
  inside the kerbs, buildings filling the blocks with a park where a
  building would otherwise be. Generated means the district can grow by
  changing three numbers instead of editing thousands of cells, and it is
  deterministic, so the city is the same on every visit.

  Districts 02-05 from the brief are not here yet. This is Downtown only,
  playable end to end, which is the thing worth proving first.
*/

export const MAP_W = 60;
export const MAP_H = 44;

/** road pitch: a road every N tiles, in both directions */
const PITCH = 11;
const ROAD_W = 3;

export type Cell = { id: TileId; solid: boolean };

export type Discovery = {
  /** matches an experiment id from the playground data */
  id: string;
  title: string;
  /** tile coords of the doorway the player walks up to */
  tx: number;
  ty: number;
  label: string;
};

export type World = {
  w: number;
  h: number;
  cells: Cell[];
  discoveries: Discovery[];
  spawn: { x: number; y: number };
};

const idx = (x: number, y: number) => y * MAP_W + x;

/* deterministic hash — same city every load, no RNG state to thread */
const h2 = (x: number, y: number, s: number) => {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

const onRoad = (v: number) => v % PITCH < ROAD_W;

export function buildWorld(discoveries: Discovery[]): World {
  const cells: Cell[] = new Array(MAP_W * MAP_H);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const rx = onRoad(x);
      const ry = onRoad(y);
      let id: TileId;

      if (rx || ry) {
        /* centre lane of each road carries the markings */
        const midX = x % PITCH === 1;
        const midY = y % PITCH === 1;
        id = rx && ry ? "road" : rx ? (midX ? "road_v" : "road") : midY ? "road_h" : "road";
      } else {
        const ix = x % PITCH;
        const iy = y % PITCH;
        const edge = ix === ROAD_W || iy === ROAD_W || ix === PITCH - 1 || iy === PITCH - 1;

        if (edge) {
          id = iy === ROAD_W ? "kerb_n" : "walk";
        } else {
          /* one block in five is a park */
          const bx = Math.floor(x / PITCH);
          const by = Math.floor(y / PITCH);
          const park = h2(bx, by, 9) > 0.78;
          if (park) {
            id = h2(x, y, 3) > 0.76 ? "tree" : "grass";
          } else {
            /* building: ground floor gets windows and the odd door, upper
               rows are roof so blocks read as volumes from above */
            const inner = iy - ROAD_W;
            if (inner <= 1) id = "roof";
            else if (inner === PITCH - ROAD_W - 3) id = h2(x, y, 5) > 0.82 ? "door" : "window";
            else id = h2(x, y, 7) > 0.62 ? "window" : "wall";
          }
        }
      }

      cells[idx(x, y)] = { id, solid: SOLID.has(id) };
    }
  }

  /* carve a doorway in front of every discovery so it is always reachable,
     and make the two tiles around it walkable pavement */
  for (const d of discoveries) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = d.tx + dx;
        const y = d.ty + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        cells[idx(x, y)] = { id: dy === 0 && dx === 0 ? "door" : "walk", solid: false };
      }
    }
  }

  const world: World = {
    w: MAP_W,
    h: MAP_H,
    cells,
    discoveries,
    spawn: { x: 0, y: 0 },
  };
  world.spawn = findSpawn(world, ROAD_W, ROAD_W + 2);
  return world;
}

/*
  Walk outwards from a preferred tile until an open one turns up.

  The first version of this just hardcoded a tile it believed was
  pavement; the block maths put it one column inside the building line and
  the hero spawned sealed inside a brick wall, unable to move in any
  direction. Searching means the map layout can change freely without ever
  reintroducing that.
*/
function findSpawn(world: World, px: number, py: number): { x: number; y: number } {
  for (let r = 0; r < Math.max(MAP_W, MAP_H); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = px + dx;
        const y = py + dy;
        const c = cellAt(world, x, y);
        if (c && !c.solid) return { x: x * 16 + 8, y: y * 16 + 8 };
      }
    }
  }
  return { x: 24, y: 24 };
}

export function cellAt(world: World, tx: number, ty: number): Cell | null {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return null;
  return world.cells[idx(tx, ty)];
}

/** True when a world-pixel point is inside something solid. */
export function solidAt(world: World, px: number, py: number): boolean {
  const c = cellAt(world, Math.floor(px / 16), Math.floor(py / 16));
  return c === null || c.solid;
}

/*
  Where each experiment lives in Downtown.

  Spread across different blocks so finding them means actually walking the
  city rather than circling one street. Ids match the playground data, so a
  discovery opens the real project.
*/
export const DISCOVERIES: Discovery[] = [
  { id: "pond", title: "Lotus Pond", tx: 16, ty: 9, label: "Diorama Studio" },
  { id: "cat", title: "CAT Operator Assistant", tx: 38, ty: 9, label: "Ops Tower" },
  { id: "invoice", title: "Invoice Generator", tx: 5, ty: 20, label: "Finance Row" },
  { id: "contract", title: "Contract Generator Tool", tx: 27, ty: 20, label: "Legal Archive" },
  { id: "dpl", title: "Design Premier League", tx: 49, ty: 20, label: "The Stadium" },
  { id: "yantra", title: "Yantra", tx: 16, ty: 31, label: "Festival Hall" },
  { id: "mike-tyson-invitational", title: "Mike Tyson Invitational", tx: 38, ty: 31, label: "Iron Forge Gym" },
  { id: "dropby", title: "DropBy", tx: 27, ty: 42, label: "Brand House" },
];
