/*
  Cricket: rules, tuning and outcome resolution.

  Everything that decides how the game FEELS lives in this file and nothing
  else does any of it. Timing windows, ball speeds and swing are the numbers
  that need three or four rounds of playtesting, and hunting them through a
  600-line component is how tuning stops happening.

  No React, no canvas, no DOM. Pure functions over plain data, so the whole
  rule set can be reasoned about (and later tested) on its own.
*/

/** how well the shot connected, worst to best */
export type Contact = "wicket" | "dot" | "single" | "four" | "six";

export type Delivery = {
  id: number;
  /** shown on the scoreboard before the ball */
  label: string;
  bowler: string;
  /** ms from release to the moment the ball is on the bat */
  travelMs: number;
  /** sideways drift across the pitch, in canvas-width fractions. +right */
  swing: number;
  /** 0 = skids on, 1 = climbs at the head. Drives the arc's height. */
  bounce: number;
  /**
    Half-widths in ms around the perfect moment. Each band contains the one
    before it, so ordering is guaranteed: perfect < good < ok < contact.
    Miss `contact` entirely and you have played down the wrong line.
  */
  windows: { perfect: number; good: number; ok: number; contact: number };
  /** commentary when it goes right */
  praise: string;
};

/*
  One over, and it is a shape rather than six random balls: two to learn the
  timing on, a spinner that makes direction matter, a slower ball placed
  exactly where your rhythm is strongest, then the two hardest. Ball six is
  the one people replay for.

  Windows tighten from 300ms of contact down to 170. The floor is deliberate:
  human reaction is roughly 250ms, but the ball is visible for its whole
  flight, so this is an anticipation test rather than a reflex one. Below
  about 150ms it stops being readable and starts being a coin toss.
*/
export const OVER: Delivery[] = [
  {
    id: 1,
    label: "Loosener",
    bowler: "Right arm medium",
    travelMs: 1450,
    swing: 0.02,
    bounce: 0.35,
    windows: { perfect: 75, good: 135, ok: 210, contact: 300 },
    praise: "Middled. That is the sound you play for.",
  },
  {
    id: 2,
    label: "On a length",
    bowler: "Right arm medium",
    travelMs: 1280,
    swing: -0.05,
    bounce: 0.4,
    windows: { perfect: 68, good: 122, ok: 190, contact: 275 },
    praise: "Leans into it and the field never moves.",
  },
  {
    id: 3,
    label: "Off spin",
    bowler: "Right arm off break",
    travelMs: 1350,
    swing: 0.11,
    bounce: 0.5,
    windows: { perfect: 62, good: 112, ok: 175, contact: 255 },
    praise: "Reads the drift early and goes with the turn.",
  },
  {
    id: 4,
    label: "Slower ball",
    bowler: "Off cutter",
    travelMs: 1620,
    swing: -0.07,
    bounce: 0.45,
    windows: { perfect: 58, good: 105, ok: 165, contact: 240 },
    praise: "Waits. Waits. Then hits it into the crowd.",
  },
  {
    id: 5,
    label: "Bouncer",
    bowler: "Right arm fast",
    travelMs: 1050,
    swing: 0.04,
    bounce: 0.95,
    windows: { perfect: 50, good: 92, ok: 145, contact: 205 },
    praise: "Rides the bounce and helps it on its way.",
  },
  {
    id: 6,
    label: "Yorker",
    bowler: "Right arm fast",
    travelMs: 940,
    swing: -0.03,
    bounce: 0.06,
    windows: { perfect: 44, good: 80, ok: 128, contact: 170 },
    praise: "Dug out and sent away. Nothing better than that.",
  },
];

/** ms of stillness before release, so the over can't be played on a count */
export function runUpDelay() {
  return 900 + Math.random() * 700;
}

export type ShotResult = {
  contact: Contact;
  runs: number;
  /** signed ms: negative is early, positive is late */
  offset: number;
  /** -1 (fine leg) to 1 (third man), where the ball actually went */
  direction: number;
  commentary: string;
};

/*
  Resolve a swing. `offset` is how far from perfect the input landed and
  `aim` is where the pointer was, both already measured by the caller.

  Direction is nudged toward the timing error rather than taken purely from
  aim: a late shot squares up and goes behind square, an early one comes
  across the line. It is a small thing that makes mistimed shots look
  mistimed instead of just scoring less.
*/
export function resolveShot(
  delivery: Delivery,
  offset: number | null,
  aim: number
): ShotResult {
  const w = delivery.windows;

  /* no shot offered at all */
  if (offset === null) {
    return {
      contact: "wicket",
      runs: 0,
      offset: 0,
      direction: 0,
      commentary: "No shot, and that is the stumps. Playing for the over never works.",
    };
  }

  const early = offset < 0;
  const magnitude = Math.abs(offset);
  const skew = clamp(offset / w.contact, -1, 1) * 0.45;
  const direction = clamp(aim + skew, -1, 1);

  if (magnitude <= w.perfect) {
    return { contact: "six", runs: 6, offset, direction, commentary: delivery.praise };
  }
  if (magnitude <= w.good) {
    return {
      contact: "four",
      runs: 4,
      offset,
      direction,
      commentary: "Timed well enough to beat the field. Four.",
    };
  }
  if (magnitude <= w.ok) {
    return {
      contact: "single",
      runs: 1,
      offset,
      direction,
      commentary: early ? "A touch early, worked away for one." : "A shade late, but off the middle enough. One.",
    };
  }
  if (magnitude <= w.contact) {
    return {
      contact: "dot",
      runs: 0,
      offset,
      direction,
      commentary: early ? "Through the shot far too early. Beaten." : "Late on it, and it dies off the splice.",
    };
  }
  return {
    contact: "wicket",
    runs: 0,
    offset,
    direction,
    commentary: early
      ? "Miles early. Spooned straight up and taken."
      : "Nowhere near it. Through the gate and the bails are off.",
  };
}

/*
  End-of-over verdict. Getting out ends the over, so a high score off few
  balls should still read as better than the same score off all six.
*/
export function verdict(runs: number, ballsFaced: number, out: boolean) {
  if (!out && runs >= 30) return { title: "Once in a generation", note: "Thirty or more without giving a chance. That is a highlight reel." };
  if (runs >= 24) return { title: "Finisher", note: "Four an over is a scoreboard problem for somebody else." };
  if (runs >= 16) return { title: "Proper player", note: "Picked the right balls and put them away." };
  if (runs >= 8) return { title: "Getting set", note: "Some timing there. The big one is still in you." };
  if (ballsFaced <= 2 && out) return { title: "Golden duck territory", note: "Straight back to the pavilion. Have another go." };
  return { title: "Nightwatchman", note: "Survived more than you scored. Respectable, in its way." };
}

export function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}
