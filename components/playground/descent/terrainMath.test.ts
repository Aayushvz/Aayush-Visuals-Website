import { test } from "node:test";
import assert from "node:assert/strict";
import { chasmWallOffsets, heightField, makeNoise2D } from "./terrainMath.ts";

test("noise is in [-1, 1] and deterministic for a seed", () => {
  const a = makeNoise2D(7);
  const b = makeNoise2D(7);
  for (let i = 0; i < 500; i++) {
    const x = i * 0.37;
    const y = i * 0.11;
    const v = a(x, y);
    assert.ok(v >= -1 && v <= 1, `noise out of range: ${v}`);
    assert.equal(v, b(x, y), "same seed disagreed with itself");
  }
});

test("different seeds give different terrain", () => {
  const a = makeNoise2D(1);
  const b = makeNoise2D(2);
  let same = 0;
  for (let i = 0; i < 200; i++) if (a(i * 0.3, i * 0.7) === b(i * 0.3, i * 0.7)) same++;
  assert.ok(same < 20, `seeds produced ${same}/200 identical samples`);
});

test("the height field has one value per vertex", () => {
  const segments = 32;
  const h = heightField({ segments, size: 100, seed: 3, amplitude: 10 });
  assert.equal(h.length, (segments + 1) * (segments + 1));
});

test("heights stay inside the amplitude and are never NaN", () => {
  const h = heightField({ segments: 48, size: 200, seed: 9, amplitude: 14 });
  for (const v of h) {
    assert.ok(Number.isFinite(v), "NaN height");
    assert.ok(Math.abs(v) <= 14 + 1e-6, `height ${v} exceeded amplitude`);
  }
});

test("the height field is deterministic", () => {
  const o = { segments: 24, size: 80, seed: 5, amplitude: 6 };
  assert.deepEqual(Array.from(heightField(o)), Array.from(heightField(o)));
});

test("the terrain is not flat", () => {
  const h = heightField({ segments: 48, size: 200, seed: 11, amplitude: 14 });
  const min = Math.min(...h);
  const max = Math.max(...h);
  assert.ok(max - min > 2, `terrain is flat: range ${max - min}`);
});

test("chasm wall offsets are one per step and stay inside the radius", () => {
  const steps = 60;
  const radius = 18;
  const off = chasmWallOffsets({ steps, seed: 2, radius });
  assert.equal(off.length, steps);
  for (const v of off) {
    assert.ok(Number.isFinite(v));
    assert.ok(v > 0 && v <= radius, `offset ${v} outside (0, ${radius}]`);
  }
});

test("the chasm never pinches shut on the camera", () => {
  const off = chasmWallOffsets({ steps: 120, seed: 4, radius: 18 });
  for (const v of off) assert.ok(v >= 6, `wall closed to ${v}, camera would clip`);
});
