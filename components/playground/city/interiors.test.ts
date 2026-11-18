import { test } from "node:test";
import assert from "node:assert/strict";
import { itemSolid, VENUES, type Item, type Venue } from "./interiors.ts";
import { DISCOVERIES } from "./world.ts";

/*
  Venue data, checked the way the generator and the engine read it.

  Every failure here is one a player meets as furniture floating in the
  road or a worker standing inside a desk, and none of it is visible from
  a screenshot of one building.

  The block interior is 7x7 tiles (PITCH 12 minus a 3-tile road and the
  pavement ring), row 0 is the back wall, and the bottom row is the
  shopfront the street walks past.
*/

const SPAN = 7;
const venues = Object.entries(VENUES) as Array<[string, Venue]>;

const occupies = (it: Item, tx: number, ty: number) =>
  tx >= it.x && tx < it.x + (it.w ?? 1) && ty >= it.y && ty < it.y + (it.h ?? 1);

const solidAt = (v: Venue, tx: number, ty: number) =>
  v.items.some((it) => itemSolid(it) && occupies(it, tx, ty));

test("every project building has a venue behind its façade", () => {
  for (const d of DISCOVERIES) {
    assert.ok(VENUES[d.id], `no venue for "${d.id}"`);
  }
  assert.equal(venues.length, DISCOVERIES.length);
});

test("nothing spills out of the block", () => {
  for (const [id, v] of venues) {
    for (const it of v.items) {
      assert.ok(it.x >= 0 && it.y >= 0, `${id}: ${it.k} starts outside the block`);
      assert.ok(it.x + (it.w ?? 1) <= SPAN, `${id}: ${it.k} overhangs into the street`);
      assert.ok(it.y + (it.h ?? 1) <= SPAN, `${id}: ${it.k} overhangs the shopfront`);
    }
  }
});

test("the shopfront row stays clear so the door is reachable", () => {
  for (const [id, v] of venues) {
    for (let tx = 0; tx < SPAN; tx++) {
      assert.ok(!solidAt(v, tx, SPAN - 1), `${id}: the front row is blocked at ${tx}`);
    }
  }
});

test("solid furniture never overlaps other solid furniture", () => {
  for (const [id, v] of venues) {
    const solids = v.items.filter(itemSolid);
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i];
        const b = solids[j];
        const hit =
          a.x < b.x + (b.w ?? 1) &&
          b.x < a.x + (a.w ?? 1) &&
          a.y < b.y + (b.h ?? 1) &&
          b.y < a.y + (a.h ?? 1);
        assert.ok(!hit, `${id}: ${a.k} and ${b.k} occupy the same tiles`);
      }
    }
  }
});

test("workers stand on the floor, not inside the furniture", () => {
  for (const [id, v] of venues) {
    for (const w of v.workers) {
      assert.ok(w.x >= 0 && w.x < SPAN && w.y >= 0 && w.y < SPAN, `${id}: a worker is outside the block`);
      assert.ok(!solidAt(v, w.x, w.y), `${id}: a worker is standing inside a solid item`);
    }
  }
});

/* the point of the whole change: a building should look occupied */
test("every venue is staffed", () => {
  for (const [id, v] of venues) {
    assert.ok(v.workers.length >= 1, `${id} is empty`);
  }
  const total = venues.reduce((n, [, v]) => n + v.workers.length, 0);
  assert.ok(total >= 12, `only ${total} people across ${venues.length} buildings`);
});

test("the work people are doing matches somewhere they could do it", () => {
  const needs: Record<string, string[]> = {
    lift: ["weights", "bench"],
    type: ["desk", "counter", "monitor"],
    paint: ["easel", "desk"],
    serve: ["counter", "table"],
  };
  for (const [id, v] of venues) {
    for (const w of v.workers) {
      const wanted = needs[w.doing];
      if (!wanted) continue;
      const has = v.items.some((it) => wanted.includes(it.k));
      assert.ok(has, `${id}: someone is "${w.doing}" with no ${wanted.join(" or ")} in the room`);
    }
  }
});

test("each building has its own look", () => {
  const floors = new Set(venues.map(([, v]) => v.pal.floor));
  assert.ok(floors.size >= 6, `only ${floors.size} distinct floors across ${venues.length} buildings`);
  for (const [id, v] of venues) {
    assert.ok(v.name.length > 0, `${id} has no name`);
    assert.ok(v.items.length >= 4, `${id} has only ${v.items.length} things in it`);
  }
});
