import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp01, damp, descentHeight, rawProgress, DESCENT_SCREENS } from "./progress.ts";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test("the page is 13 screens tall", () => {
  assert.equal(DESCENT_SCREENS, 13);
  assert.equal(descentHeight(800), 10400);
});

test("clamp01 pins outside the unit range", () => {
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(0.4), 0.4);
  assert.equal(clamp01(9), 1);
});

test("progress is 0 at the top and 1 at the bottom of the travel", () => {
  const vh = 800;
  const travel = descentHeight(vh) - vh;
  assert.ok(close(rawProgress(0, vh), 0));
  assert.ok(close(rawProgress(travel, vh), 1));
  assert.ok(close(rawProgress(travel / 2, vh), 0.5));
});

test("progress clamps past the ends instead of overshooting", () => {
  assert.equal(rawProgress(-200, 800), 0);
  assert.equal(rawProgress(999999, 800), 1);
});

test("progress never divides by zero on a degenerate viewport", () => {
  const p = rawProgress(100, 0);
  assert.ok(Number.isFinite(p), `got ${p}`);
});

test("damp moves toward the target without overshooting it", () => {
  let v = 0;
  for (let i = 0; i < 200; i++) v = damp(v, 1, 6, 1 / 60);
  assert.ok(v > 0.99 && v <= 1, `settled at ${v}`);
});

test("damp is frame-rate independent", () => {
  let slow = 0;
  slow = damp(slow, 1, 6, 1 / 30);

  let fast = 0;
  fast = damp(fast, 1, 6, 1 / 60);
  fast = damp(fast, 1, 6, 1 / 60);

  assert.ok(close(slow, fast, 1e-9), `30fps ${slow} vs 60fps ${fast}`);
});

test("damp with a zero delta does not move", () => {
  assert.equal(damp(0.25, 1, 6, 0), 0.25);
});
