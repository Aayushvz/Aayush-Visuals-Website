/*
  The XP ledger.

  Persisted to localStorage because a progress bar that resets on reload
  isn't progress — it's decoration. Reads and writes are wrapped: private
  mode and disabled storage both throw on access, and a cricket game losing
  its XP is not worth taking the page down for.

  Level curve is deliberately shallow at the start (a first over should push
  you most of the way through level 1) and widens after, so the bar always
  visibly moves within a six-ball innings.
*/

const KEY = "cricketProgress";

export type Progress = { xp: number; level: number };

export const LEVEL_STEP = 250;

export function levelFor(xp: number) {
  return Math.floor(xp / LEVEL_STEP) + 1;
}

/** 0..1 through the current level */
export function levelFraction(xp: number) {
  return (xp % LEVEL_STEP) / LEVEL_STEP;
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return { xp: 0, level: 1 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { xp: 0, level: 1 };
    const p = JSON.parse(raw) as Partial<Progress>;
    const xp = typeof p.xp === "number" && p.xp >= 0 ? p.xp : 0;
    return { xp, level: levelFor(xp) };
  } catch {
    return { xp: 0, level: 1 };
  }
}

export function writeProgress(xp: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ xp, level: levelFor(xp) }));
  } catch {
    /* storage unavailable — the session still works, it just won't carry */
  }
}
