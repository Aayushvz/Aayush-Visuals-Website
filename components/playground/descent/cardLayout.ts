import * as THREE from "three";
import type { DescentCard } from "./cards.ts";
import { ACTS, cameraAt, lookAtAt } from "./path.ts";

/*
  Where each card sits in the world, both on the way down and once they
  all gather at the bottom.

  Pure, and tested, because the two failure modes here are invisible until
  they are embarrassing: a card parked behind the camera during the finale
  (so the big reveal reveals nothing), and two cards occupying the same
  patch of air (so one is a sliver behind the other).
*/

/** Half-width of a card panel in world units; panels are 6 x 3.8. */
export const CARD_HALF_WIDTH = 3;

/** How far to the side of the flight path a card hangs. */
export const CARD_SIDE_OFFSET = 7.5;

/** Where the cards gather once the camera reaches the chamber. */
export const FINALE_CENTRE = new THREE.Vector3(0, -62, 52);
export const FINALE_RADIUS = 13;

/** The progress at which the finale starts gathering them in. */
export const FINALE_FROM = ACTS[ACTS.length - 1].from;

const tmp = new THREE.Vector3();

/*
  On the way down: beside the path at the card's own stop, alternating
  side so the fall has a rhythm rather than a column of cards down one
  wall. Lifted slightly and pushed back so the camera passes them rather
  than flying into them.
*/
export function restPosition(
  curve: THREE.CatmullRomCurve3,
  card: DescentCard,
  index: number,
  out: THREE.Vector3
): THREE.Vector3 {
  cameraAt(curve, card.stop, out);
  const side = index % 2 === 0 ? -1 : 1;
  return out.add(tmp.set(side * CARD_SIDE_OFFSET, 1.5, -3));
}

/*
  The finale: a ring in the chamber, in front of where the camera ends up.

  Started at -90 degrees so the first card sits at the top of the ring and
  they read clockwise from there, rather than the first one landing off to
  the right for no reason.
*/
export function finalePosition(index: number, count: number, out: THREE.Vector3): THREE.Vector3 {
  const a = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return out.set(
    FINALE_CENTRE.x + Math.cos(a) * FINALE_RADIUS,
    FINALE_CENTRE.y + Math.sin(a) * FINALE_RADIUS * 0.55,
    FINALE_CENTRE.z
  );
}

/** 0 before the finale, ramping to 1 as the cards gather. */
export function finaleBlend(p: number): number {
  if (p <= FINALE_FROM) return 0;
  const t = (p - FINALE_FROM) / (1 - FINALE_FROM);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** The camera's forward direction at progress `p`. */
export function viewDirection(
  curve: THREE.CatmullRomCurve3,
  p: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const eye = cameraAt(curve, p, new THREE.Vector3());
  lookAtAt(curve, p, out);
  return out.sub(eye).normalize();
}
