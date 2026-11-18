import { test } from "node:test";
import assert from "node:assert/strict";
import { itemSolid, ROOMS, type Item, type Room } from "./interiors.ts";
import { DISCOVERIES } from "./world.ts";

/*
  Room data, checked the way the engine reads it.

  Every failure here is one a player meets as a soft-lock or a dead end,
  and none of them is visible from a screenshot: a plinth inside a sofa, a
  doorway blocked by a bookcase, a resident standing in a wall.
*/

const rooms = Object.entries(ROOMS);

const occupies = (it: Item, tx: number, ty: number) =>
  tx >= it.x && tx < it.x + (it.w ?? 1) && ty >= it.y && ty < it.y + (it.h ?? 1);

const solidAt = (room: Room, tx: number, ty: number) =>
  room.items.some((it) => itemSolid(it) && occupies(it, tx, ty));

test("every discovery has a room behind its door", () => {
  for (const d of DISCOVERIES) {
    assert.ok(ROOMS[d.id], `no interior for "${d.id}"`);
  }
  assert.equal(rooms.length, DISCOVERIES.length);
});

test("rooms are big enough to walk around in", () => {
  for (const [id, r] of rooms) {
    assert.ok(r.w >= 12, `${id} is only ${r.w} wide`);
    assert.ok(r.h >= 10, `${id} is only ${r.h} tall`);
  }
});

test("every item sits inside its room", () => {
  for (const [id, r] of rooms) {
    for (const it of r.items) {
      assert.ok(it.x >= 0 && it.y >= 0, `${id}: ${it.k} is off the top-left`);
      assert.ok(it.x + (it.w ?? 1) <= r.w, `${id}: ${it.k} overhangs the right wall`);
      assert.ok(it.y + (it.h ?? 1) <= r.h, `${id}: ${it.k} overhangs the floor`);
    }
  }
});

/* the engine treats rows 0-1 as wall and blocks them, so furniture the
   player is meant to reach cannot live there */
test("nothing solid is buried in the wall band", () => {
  for (const [id, r] of rooms) {
    for (const it of r.items) {
      if (!itemSolid(it)) continue;
      assert.ok(it.y + (it.h ?? 1) > 2, `${id}: ${it.k} is entirely inside the wall`);
    }
  }
});

test("the plinth is reachable, not inside the furniture", () => {
  for (const [id, r] of rooms) {
    const { x, y } = r.plinth;
    assert.ok(x >= 0 && x < r.w && y >= 2 && y < r.h, `${id}: plinth is outside the room`);
    assert.ok(!solidAt(r, x, y), `${id}: plinth is inside a solid item`);
    /* and you have to be able to stand next to it */
    const open = [
      [x, y + 1],
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
    ].filter(([ax, ay]) => ax >= 0 && ax < r.w && ay >= 2 && ay < r.h && !solidAt(r, ax, ay));
    assert.ok(open.length > 0, `${id}: plinth is walled in on every side`);
  }
});

/* the way out is the bottom-centre two tiles (drawRoomShell), and the
   hero spawns one row above it */
test("the doorway out is never blocked", () => {
  for (const [id, r] of rooms) {
    const doorX = Math.floor(r.w / 2);
    for (const tx of [doorX - 1, doorX]) {
      assert.ok(!solidAt(r, tx, r.h - 1), `${id}: doorway tile ${tx} is blocked`);
      assert.ok(!solidAt(r, tx, r.h - 2), `${id}: the spawn tile above the door is blocked`);
    }
  }
});

test("residents stand on the floor, not inside the furniture", () => {
  for (const [id, r] of rooms) {
    if (!r.npc) continue;
    const { x, y } = r.npc;
    assert.ok(x >= 0 && x < r.w && y >= 2 && y < r.h, `${id}: ${r.npc.name} is outside the room`);
    assert.ok(!solidAt(r, x, y), `${id}: ${r.npc.name} is standing inside a solid item`);
  }
});

test("solid furniture never overlaps other solid furniture", () => {
  for (const [id, r] of rooms) {
    const solids = r.items.filter(itemSolid);
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i];
        const b = solids[j];
        const hit =
          a.x < b.x + (b.w ?? 1) &&
          b.x < a.x + (a.w ?? 1) &&
          a.y < b.y + (b.h ?? 1) &&
          b.y < a.y + (a.h ?? 1);
        assert.ok(!hit, `${id}: ${a.k} and ${b.k} are in the same place`);
      }
    }
  }
});

test("each room has its own look and its own line", () => {
  const floors = new Set<string>();
  for (const [id, r] of rooms) {
    assert.ok(r.name.length > 0, `${id} has no name`);
    assert.ok(r.greeting.length > 0, `${id} has nothing to say`);
    floors.add(r.pal.floor);
  }
  /* at least six distinct floor colours across eight rooms — the brief
     was a different vibe per building, not one room repainted */
  assert.ok(floors.size >= 6, `only ${floors.size} distinct floors across ${rooms.length} rooms`);
});
