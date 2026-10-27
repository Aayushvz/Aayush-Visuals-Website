import { test } from "node:test";
import assert from "node:assert/strict";
import { markOutline } from "./markGeometry.ts";

/* the logo PNG's bounding box height, the unit everything is scaled by */
const H = 981;
const close = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

test("the bar spans exactly one unit tall, centred on zero", () => {
  const { bar } = markOutline();
  const ys = bar.map((p) => p[1]);
  assert.ok(close(Math.min(...ys), -0.5));
  assert.ok(close(Math.max(...ys), 0.5));
});

test("the bar's bottom edge is 418px wide in logo units", () => {
  const { bar } = markOutline();
  const bottom = bar.filter((p) => close(p[1], -0.5)).map((p) => p[0]);
  assert.equal(bottom.length, 2);
  assert.ok(close(Math.max(...bottom) - Math.min(...bottom), 418 / H));
});

test("the dot is a circle of radius 243px in logo units", () => {
  const { dot } = markOutline();
  assert.ok(close(dot.r, 243 / H));
});

test("the rounded corner starts on the left edge, 150px below the top", () => {
  const { bar } = markOutline();
  /* bar starts at the end of the rounding on the left (slanted) edge */
  const [, y0] = bar[0];
  assert.ok(y0 < 0.5 && y0 > 0.5 - 0.2, `first point y ${y0}`);
});

test("everything stays inside the mark's own box", () => {
  const { bar, dot } = markOutline();
  for (const [x, y] of bar) {
    assert.ok(x >= -0.66 && x <= 0.66, `x ${x}`);
    assert.ok(y >= -0.5 - 1e-9 && y <= 0.5 + 1e-9, `y ${y}`);
  }
  assert.ok(dot.cx + dot.r <= 0.66 && dot.cy - dot.r >= -0.5 - 1e-3);
});
