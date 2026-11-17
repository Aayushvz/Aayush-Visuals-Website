import * as THREE from "three";
import { clamp01 } from "./progress.ts";

/*
  The colour arc, which is the page's main instrument.

  Fog does the art direction here: it hides draw distance, separates the
  layers, and carries the journey from Piltover's gold through Zaun's
  green and violet to the forge's ember. The acts read from colour alone,
  before any of their geometry is recognisable.

  Kept pure and out of the component so it can be asserted on — a fog
  colour that goes NaN mid-scroll turns the whole screen black, and that
  is not something to find out by looking.
*/
export const FOG_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "#cdbb92"], //    cloud sea, dawn gold
  [0.23, "#8fa0a8"], // the ridge, cold and pale
  [0.45, "#2f5f52"], // falling, Zaun green rising
  [0.62, "#2a1b44"], // deep chasm, violet
  [0.85, "#4a1a0e"], // the forge glow
  [1, "#2a0d06"], //    the chamber floor
];

const a = new THREE.Color();
const b = new THREE.Color();

/** The fog colour at progress `p`, written into `out`. */
export function fogColorAt(p: number, out: THREE.Color): THREE.Color {
  const q = clamp01(p);
  let i = 0;
  while (i < FOG_STOPS.length - 2 && q > FOG_STOPS[i + 1][0]) i++;
  const [p0, c0] = FOG_STOPS[i];
  const [p1, c1] = FOG_STOPS[i + 1];
  const t = p1 === p0 ? 0 : clamp01((q - p0) / (p1 - p0));
  a.set(c0);
  b.set(c1);
  return out.copy(a).lerp(b, t);
}
