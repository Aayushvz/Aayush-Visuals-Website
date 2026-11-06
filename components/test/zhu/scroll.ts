/*
  The hero's scroll state, shared from the DOM (ZhuHero measures it) into the
  3D scene (camera rig, name, roles, mark) through one mutable object, so a
  scroll never re-renders React.

    p - progress through the pinned hero, 0..1
    v - scroll velocity, px/s (feeds the spin boost)

  Choreography, all keyed off p (after the reference):
    camera orbits 90deg round the mark and rises RISE units
    name fades out           p 0.2 -> 0.4
    roles fade in            p 0.72 -> 0.9
*/

export type ScrollState = { p: number; v: number };

/* world units the camera (and the mark) rise over the pin */
export const RISE = 5;
/* camera orbit radius; matches the camera's start distance */
export const ORBIT = 5;

/* the canvas camera's field of view (Scene.tsx) */
export const FOV = 35;

/*
  The frame's size in world units at the camera's RESTING distance (ORBIT),
  whatever the camera is doing. Sizes must come from this, not from R3F's
  viewport: that is measured at the camera's current distance, which grows
  as the scroll swings it out and up - so a resize mid-scroll (a phone's
  browser bar hiding) re-sized the name and mark far too big, and they
  stayed that way on the way back up.
*/
export const restViewport = (size: { width: number; height: number }) => {
  const height = 2 * ORBIT * Math.tan(((FOV / 2) * Math.PI) / 180);
  return { width: height * (size.width / Math.max(1, size.height)), height };
};

export const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
