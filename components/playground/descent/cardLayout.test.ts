import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { descentCards, type ExperimentSource } from "./cards.ts";
import {
  CARD_HALF_WIDTH,
  CARD_SIDE_OFFSET,
  FINALE_FROM,
  finaleBlend,
  finalePosition,
  restPosition,
  viewDirection,
} from "./cardLayout.ts";
import { cameraAt, makeCurve } from "./path.ts";

const FIXTURE: ExperimentSource[] = [
  { id: "dpl", title: "DPL", kind: "Browser game", href: "/dpl", blurb: "x" },
  { id: "cat", title: "Cat", kind: "Toy", href: "/cat", blurb: "x" },
  { id: "pond", title: "Pond", kind: "Sketch", href: "/pond", blurb: "x" },
  { id: "invoice", title: "Invoice", kind: "Tool", href: "/invoice", blurb: "x" },
  { id: "contract", title: "Contract", kind: "Tool", href: "/contract", blurb: "x" },
];

const cards = descentCards(FIXTURE);
const curve = makeCurve();

const rests = () => cards.map((c, i) => restPosition(curve, c, i, new THREE.Vector3()));
const finals = () => cards.map((_, i) => finalePosition(i, cards.length, new THREE.Vector3()));

test("a card on the way down hangs beside the path, not on it", () => {
  const eye = new THREE.Vector3();
  cards.forEach((c, i) => {
    const at = restPosition(curve, c, i, new THREE.Vector3());
    cameraAt(curve, c.stop, eye);
    const sideways = Math.abs(at.x - eye.x);
    assert.ok(sideways >= CARD_SIDE_OFFSET - 0.01, `${c.id} is only ${sideways} to the side`);
  });
});

test("consecutive cards hang on opposite sides", () => {
  const xs = rests().map((v, i) => Math.sign(v.x - cameraAt(curve, cards[i].stop, new THREE.Vector3()).x));
  for (let i = 1; i < xs.length; i++) {
    assert.notEqual(xs[i], xs[i - 1], `cards ${i - 1} and ${i} are on the same side`);
  }
});

test("no two cards share the same patch of air on the way down", () => {
  const ps = rests();
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      assert.ok(
        ps[i].distanceTo(ps[j]) > CARD_HALF_WIDTH * 2,
        `${cards[i].id} and ${cards[j].id} overlap (${ps[i].distanceTo(ps[j]).toFixed(1)})`
      );
    }
  }
});

test("the finale ring holds every card without overlap", () => {
  const ps = finals();
  assert.equal(ps.length, 8);
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      assert.ok(
        ps[i].distanceTo(ps[j]) > CARD_HALF_WIDTH * 1.4,
        `ring positions ${i} and ${j} overlap (${ps[i].distanceTo(ps[j]).toFixed(1)})`
      );
    }
  }
});

/*
  The whole point of the finale. If the ring is behind the camera the big
  reveal reveals an empty room, and nothing about the scene would look
  broken enough to notice while building it.
*/
test("every card in the finale is in front of the camera, not behind it", () => {
  const eye = cameraAt(curve, 1, new THREE.Vector3());
  const fwd = viewDirection(curve, 1, new THREE.Vector3());
  finals().forEach((p, i) => {
    const toCard = p.clone().sub(eye).normalize();
    assert.ok(toCard.dot(fwd) > 0.3, `card ${i} sits at dot ${toCard.dot(fwd).toFixed(2)}`);
  });
});

test("the finale ring is close enough to read but not in the lens", () => {
  const eye = cameraAt(curve, 1, new THREE.Vector3());
  finals().forEach((p, i) => {
    const d = p.distanceTo(eye);
    assert.ok(d > 6, `card ${i} is ${d.toFixed(1)} away — inside the near plane`);
    assert.ok(d < 70, `card ${i} is ${d.toFixed(1)} away — lost in the fog`);
  });
});

test("the blend holds at rest until the finale, then reaches 1", () => {
  assert.equal(finaleBlend(0), 0);
  assert.equal(finaleBlend(FINALE_FROM), 0);
  assert.equal(finaleBlend(1), 1);
  assert.ok(finaleBlend((FINALE_FROM + 1) / 2) > 0.4);
  assert.ok(finaleBlend(2) <= 1);
  assert.ok(finaleBlend(-1) === 0);
});

test("no card is still gathering when the journey ends", () => {
  /* at p=1 the blend must be exactly 1, or a card is left hanging
     part-way between its wall and the ring */
  assert.equal(finaleBlend(1), 1);
});
