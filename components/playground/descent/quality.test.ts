import { test } from "node:test";
import assert from "node:assert/strict";
import { tierFor } from "./quality.ts";

const high = { lowPower: false, reducedMotion: false, pointerFine: true };
const low = { lowPower: true, reducedMotion: false, pointerFine: false };

test("a low-power device gets strictly less of everything", () => {
  const a = tierFor(high, false);
  const b = tierFor(low, false);
  assert.ok(b.terrainSegments < a.terrainSegments);
  assert.ok(b.embers < a.embers);
  assert.equal(b.post, false);
  assert.equal(b.shafts, false);
  assert.equal(b.shadows, false);
});

test("low power caps the pixel ratio at 1.25", () => {
  assert.ok(tierFor(low, false).maxDpr <= 1.25);
  assert.ok(tierFor(high, false).maxDpr > 1.25);
});

test("portrait costs less than landscape on the same device", () => {
  const land = tierFor(high, false);
  const port = tierFor(high, true);
  assert.ok(port.terrainSegments <= land.terrainSegments);
  assert.ok(port.embers <= land.embers);
});

test("every tier is still drawable", () => {
  for (const mode of [high, low]) {
    for (const portrait of [false, true]) {
      const t = tierFor(mode, portrait);
      assert.ok(t.terrainSegments >= 24, `too coarse: ${t.terrainSegments}`);
      assert.ok(t.embers >= 0);
      assert.ok(t.maxDpr >= 1);
    }
  }
});

test("reduced motion does not change the tier — it bypasses the canvas entirely", () => {
  const moving = tierFor(high, false);
  const still = tierFor({ ...high, reducedMotion: true }, false);
  assert.deepEqual(still, moving);
});
