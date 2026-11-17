import * as THREE from "three";
import { clamp01 } from "./progress.ts";

export type ActId = "ridge" | "chasm" | "forge" | "finale";
export type Act = { id: ActId; from: number; to: number };

/* 3 / 4 / 4 / 2 of the 13 screens. */
export const ACTS: readonly Act[] = [
  { id: "ridge", from: 0, to: 3 / 13 },
  { id: "chasm", from: 3 / 13, to: 7 / 13 },
  { id: "forge", from: 7 / 13, to: 11 / 13 },
  { id: "finale", from: 11 / 13, to: 1 },
] as const;

/** A boundary belongs to the act it opens, so the last act owns p === 1. */
export function actAt(p: number): Act {
  const q = clamp01(p);
  for (let i = ACTS.length - 1; i >= 0; i--) {
    if (q >= ACTS[i].from) return ACTS[i];
  }
  return ACTS[0];
}

/** 0 at the start of the current act, 1 at its end. */
export function actProgress(p: number): number {
  const act = actAt(p);
  return clamp01((clamp01(p) - act.from) / (act.to - act.from));
}

/*
  The journey, as world-space control points.

  y falls the whole way — the test asserts it never rises, because a camera
  that bobs upward mid-fall breaks the one promise the page makes: scroll
  direction is world direction. The x wander is what keeps the fall from
  reading as an elevator, and the final two points pull back and up-range
  into the chamber where the cards assemble.
*/
const CONTROL_POINTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 62, 46], //  surfacing out of the cloud sea
  [0, 57, 24], //  the ridge
  [1, 54, 4], //   approaching the gate
  [0, 50, -8], //  through the gate — the fall starts
  [4, 30, -16], // chasm, first wall
  [-5, 8, -20], // past the turbine
  [3, -16, -22],
  [-3, -38, -18],
  [0, -54, -8], // the forge floor
  [0, -57, 14], // pulling back
  /* the tail keeps sinking rather than levelling off. Two points at the
     same height made the spline dip below them and climb back — a 0.018
     unit rise, invisible but enough to break the descent's one promise.
     It also settles the camera as the cards rise into the chamber. */
  [0, -60, 34], // the chamber
];

export function makeCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.5
  );
}

export function cameraAt(
  curve: THREE.CatmullRomCurve3,
  p: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return curve.getPointAt(clamp01(p), out);
}

/*
  Look ahead along the curve, never at the camera's own position. Near p=1
  the lookahead would clamp onto the camera itself and the matrix would go
  NaN, so the last stretch extrapolates along the final tangent instead.
*/
const LOOKAHEAD = 0.035;
const tangent = new THREE.Vector3();

export function lookAtAt(
  curve: THREE.CatmullRomCurve3,
  p: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const q = clamp01(p);
  if (q + LOOKAHEAD <= 1) return curve.getPointAt(q + LOOKAHEAD, out);
  curve.getPointAt(1, out);
  curve.getTangentAt(1, tangent);
  return out.addScaledVector(tangent, LOOKAHEAD * curve.getLength());
}
