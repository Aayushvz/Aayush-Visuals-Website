import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { FOG_STOPS, fogColorAt } from "./palette.ts";

const hex = (p: number) => fogColorAt(p, new THREE.Color()).getHexString();

test("the stops run forward from 0 to 1", () => {
  assert.equal(FOG_STOPS[0][0], 0);
  assert.equal(FOG_STOPS[FOG_STOPS.length - 1][0], 1);
  for (let i = 1; i < FOG_STOPS.length; i++) {
    assert.ok(FOG_STOPS[i][0] > FOG_STOPS[i - 1][0], `stop ${i} is not after ${i - 1}`);
  }
});

test("the ends are exactly the first and last stop", () => {
  assert.equal(hex(0), "cdbb92");
  assert.equal(hex(1), "2a0d06");
});

test("progress outside the range clamps instead of extrapolating", () => {
  assert.equal(hex(-5), hex(0));
  assert.equal(hex(99), hex(1));
});

test("each stop is hit exactly at its own progress", () => {
  for (const [p, c] of FOG_STOPS) {
    assert.equal(hex(p), c.replace("#", ""), `stop at p=${p}`);
  }
});

test("the colour is finite everywhere, never NaN", () => {
  const out = new THREE.Color();
  for (let i = 0; i <= 500; i++) {
    fogColorAt(i / 500, out);
    assert.ok(
      Number.isFinite(out.r) && Number.isFinite(out.g) && Number.isFinite(out.b),
      `NaN at p=${i / 500}`
    );
  }
});

test("the arc actually travels — the ends are nothing like each other", () => {
  const top = fogColorAt(0, new THREE.Color());
  const bottom = fogColorAt(1, new THREE.Color());
  const dist = Math.abs(top.r - bottom.r) + Math.abs(top.g - bottom.g) + Math.abs(top.b - bottom.b);
  assert.ok(dist > 0.8, `the fog barely changes: ${dist.toFixed(2)}`);
});

test("the colour never jumps between neighbouring frames", () => {
  const prev = new THREE.Color();
  const cur = new THREE.Color();
  fogColorAt(0, prev);
  for (let i = 1; i <= 1000; i++) {
    fogColorAt(i / 1000, cur);
    const step =
      Math.abs(cur.r - prev.r) + Math.abs(cur.g - prev.g) + Math.abs(cur.b - prev.b);
    assert.ok(step < 0.05, `fog jumped ${step.toFixed(3)} at p=${i / 1000}`);
    prev.copy(cur);
  }
});
