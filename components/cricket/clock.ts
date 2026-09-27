/*
  The match's own clock, so the game can be paused.

  Everything that moves in an over is timed: the run-up, the ball's flight,
  the swing window, the pause before the next ball, the card that clears
  itself. Those used to read performance.now() and window.setTimeout
  directly, and neither can be stopped - opening the menu mid-delivery let
  the ball arrive, go unplayed and bowl the batter out behind the panel.

  So the game reads time from here instead. `now()` is real time minus
  every stretch spent paused, and freezes while paused; `setTimeout` keeps
  each timer's due time on that same clock, so a pause simply holds them and
  a resume re-arms each one for whatever it had left.
*/

type Timer = { id: number; due: number; fn: () => void; handle: number | null };

export type GameClock = ReturnType<typeof createClock>;

export function createClock() {
  let pausedAt: number | null = null;
  let offset = 0;
  let seq = 0;
  const timers = new Map<number, Timer>();

  const now = () => (pausedAt ?? performance.now()) - offset;

  const arm = (t: Timer) => {
    t.handle = window.setTimeout(() => {
      timers.delete(t.id);
      t.fn();
    }, Math.max(0, t.due - now()));
  };

  return {
    now,
    get paused() {
      return pausedAt !== null;
    },
    setTimeout(fn: () => void, ms: number) {
      const t: Timer = { id: ++seq, due: now() + ms, fn, handle: null };
      timers.set(t.id, t);
      if (pausedAt === null) arm(t);
      return t.id;
    },
    clearTimeout(id: number | null | undefined) {
      if (id == null) return;
      const t = timers.get(id);
      if (!t) return;
      if (t.handle !== null) window.clearTimeout(t.handle);
      timers.delete(id);
    },
    pause() {
      if (pausedAt !== null) return;
      pausedAt = performance.now();
      timers.forEach((t) => {
        if (t.handle !== null) window.clearTimeout(t.handle);
        t.handle = null;
      });
    },
    resume() {
      if (pausedAt === null) return;
      offset += performance.now() - pausedAt;
      pausedAt = null;
      timers.forEach(arm);
    },
    /* on unmount: nothing scheduled by a finished match should fire */
    dispose() {
      timers.forEach((t) => t.handle !== null && window.clearTimeout(t.handle));
      timers.clear();
    },
  };
}
