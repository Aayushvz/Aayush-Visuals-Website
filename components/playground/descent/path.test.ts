import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ACTS, actAt, actProgress, cameraAt, lookAtAt, makeCurve } from "./path.ts";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test("the acts tile the whole journey with no gaps or overlaps", () => {
  assert.equal(ACTS[0].from, 0);
  assert.equal(ACTS[ACTS.length - 1].to, 1);
  for (let i = 1; i < ACTS.length; i++) {
    assert.equal(ACTS[i].from, ACTS[i - 1].to, `gap before act ${i}`);
  }
});

test("the acts are the 3/4/4/2 screen split", () => {
  assert.deepEqual(
    ACTS.map((a) => a.id),
    ["ridge", "chasm", "forge", "finale"]
  );
  assert.ok(close(ACTS[0].to, 3 / 13));
  assert.ok(close(ACTS[1].to, 7 / 13));
  assert.ok(close(ACTS[2].to, 11 / 13));
});

test("actAt finds the act for any progress, ends included", () => {
  assert.equal(actAt(0).id, "ridge");
  assert.equal(actAt(0.1).id, "ridge");
  assert.equal(actAt(0.4).id, "chasm");
  assert.equal(actAt(0.7).id, "forge");
  assert.equal(actAt(0.95).id, "finale");
  assert.equal(actAt(1).id, "finale");
});

test("a boundary belongs to the act it opens", () => {
  assert.equal(actAt(3 / 13).id, "chasm");
  assert.equal(actAt(7 / 13).id, "forge");
});

test("actProgress runs 0 to 1 inside each act", () => {
  assert.ok(close(actProgress(0), 0));
  assert.ok(close(actProgress(3 / 13), 0));
  assert.ok(close(actProgress(1), 1));
  const mid = (3 / 13 + 7 / 13) / 2;
  assert.ok(close(actProgress(mid), 0.5));
});

test("the camera only ever goes down", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  let last = Infinity;
  for (let i = 0; i <= 200; i++) {
    const y = cameraAt(curve, i / 200, out).y;
    assert.ok(y <= last + 1e-6, `rose at p=${i / 200}: ${y} > ${last}`);
    last = y;
  }
});

test("the descent actually covers ground", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  const top = cameraAt(curve, 0, out).clone();
  const bottom = cameraAt(curve, 1, out).clone();
  assert.ok(top.y - bottom.y > 50, `only fell ${top.y - bottom.y}`);
});

test("the camera always looks somewhere other than where it is", () => {
  const curve = makeCurve();
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  for (let i = 0; i <= 50; i++) {
    const p = i / 50;
    cameraAt(curve, p, pos);
    lookAtAt(curve, p, look);
    assert.ok(pos.distanceTo(look) > 0.5, `degenerate lookAt at p=${p}`);
  }
});

test("positions are finite everywhere, including the exact ends", () => {
  const curve = makeCurve();
  const out = new THREE.Vector3();
  for (const p of [0, 1e-9, 0.5, 1 - 1e-9, 1]) {
    const v = cameraAt(curve, p, out);
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `NaN at ${p}`);
  }
});
