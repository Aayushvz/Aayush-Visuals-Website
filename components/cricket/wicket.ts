/*
  The striker's wicket: three stumps, two bails, and what happens to them.

  Kept out of scene.ts because this is the one thing on the field with
  state. Everything else there is a pure function of the frame — give it a
  scene and a time and it paints. A wicket that has been hit has to remember
  that it was hit, and for how long, or the bails reset to level every frame.

  The simulation is deliberately not a physics engine. Five rigid bodies for
  a third of a second do not need broad-phase collision or a solver; they
  need to look right, and looking right here means three things:

  - the bails leave FAST and early, then tumble. They weigh 5g against a
    700g stump, so they are gone before the stumps have meaningfully moved.
  - the struck stump rotates about its base rather than sliding. A stump is
    driven into the ground; it hinges out of the socket, it does not skid.
  - the two it did not hit lean away a beat later and less far, because they
    are only catching the shoulder of the one that was hit.

  Gravity is expressed in screen heights per second squared rather than
  m/s^2, so the whole thing scales with the canvas and a phone does not get
  a slower wicket than a desktop.
*/

export type WicketState = {
  /** performance.now() when the ball hit, or 0 while the wicket stands */
  hitAt: number;
  /** -1 to 1, which side the ball came through — decides which way it all goes */
  dir: number;
};

export const STANDING: WicketState = { hitAt: 0, dir: 0 };

/** the moment a delivery breaks the wicket */
export function breakWicket(now: number, dir: number): WicketState {
  return { hitAt: now, dir: Math.max(-1, Math.min(1, dir)) };
}

/* the fall is over in well under a second — a wicket is a violent, brief
   event, and a slow collapse reads as comedy */
const FALL_MS = 900;

type Bail = { x: number; y: number; rot: number; gone: boolean };

/*
  Where each piece is at `t` seconds after the strike.

  Returned as plain numbers so the painter stays a painter: it receives
  positions and draws them, and every decision about how a wicket falls
  lives in this one function where it can be tuned without touching canvas
  code.
*/
export function wicketPose(state: WicketState, now: number, unit: number) {
  const standing = state.hitAt === 0;
  const ms = standing ? 0 : now - state.hitAt;
  const t = Math.min(1, ms / FALL_MS);
  const secs = ms / 1000;
  const dir = state.dir || 0.35;

  /* screen-space gravity, scaled to the wicket's own size */
  const g = unit * 9.5;

  /*
    Bails. Launched up and out along the ball's line, then ballistic. The
    initial speed is high and the arc is shallow — a bail is flicked, not
    lobbed, and it travels several stump-heights before it lands.
  */
  const bails: Bail[] = [-1, 1].map((side, i) => {
    if (standing) {
      return { x: side * unit * 0.34, y: -unit * 1.02, rot: 0, gone: false };
    }
    /* the far bail from the impact leaves marginally later and slower */
    const lag = side * dir > 0 ? 0 : 0.035;
    const s = Math.max(0, secs - lag);
    const speed = unit * (side * dir > 0 ? 3.4 : 2.6);
    const vx = dir * speed + side * unit * 0.7;
    const vy = -unit * 3.1;
    return {
      x: side * unit * 0.34 + vx * s,
      y: -unit * 1.02 + vy * s + 0.5 * g * s * s,
      /* spin scales with how hard it left, so the near bail tumbles faster */
      rot: s * (side * dir > 0 ? 15 : 11) * (dir >= 0 ? 1 : -1),
      gone: s > 0,
    };
  });

  /*
    Stumps, as a lean angle each. The middle one takes the ball, so it goes
    first and furthest; the outer two are shouldered aside and lag by about
    a tenth of a second, which is what stops the three of them moving like a
    single painted object.
  */
  const ease = (k: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const lean = [
    ease((t - 0.08) / 0.8) * dir * 0.5,
    ease(t / 0.7) * dir * 1.18,
    ease((t - 0.1) / 0.85) * dir * 0.42,
  ].map((a) => (standing ? 0 : a));

  return {
    standing,
    t,
    bails,
    lean,
    /* dust puffs at the base, brief and low */
    dust: standing ? 0 : Math.max(0, 1 - t / 0.45),
  };
}

/** whether the fall has finished, so callers can stop redrawing it */
export function wicketSettled(state: WicketState, now: number) {
  return state.hitAt !== 0 && now - state.hitAt > FALL_MS;
}
