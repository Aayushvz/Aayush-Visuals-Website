/*
  Loading and caching for the team sprite sets.

  Both sides wear the same poses — the Falcons kit is generated from the
  Panthers art by a measured hue remap (scripts/recolour-sprites.mjs), so the
  geometry is identical down to the pixel and only the colours differ. That
  is why the frame metadata lives once per role in the generated modules and
  is NOT duplicated per team: `w`, `h` and the foot anchor `ax` describe the
  drawing, and recolouring does not move anything.

  What does differ is the URL, hence a cache keyed by team AND pose. Loading
  is per-team and lazy: a visitor who picks the Falcons never downloads the
  Panthers' 1.2MB of frames, which is the whole reason the two sets sit in
  separate directories rather than one folder with a suffix.
*/

export type TeamKit = "panthers" | "falcons";

export type FrameMeta = { w: number; h: number; ax: number };

export type Loaded = { img: HTMLImageElement; meta: FrameMeta };

const cache = new Map<string, HTMLImageElement>();
const started = new Set<string>();

const key = (team: TeamKit, role: string, pose: string) =>
  `${team}/${role}/${pose}`;

/**
  Begin loading one role's frames for one team. Safe to call repeatedly —
  only the first call per team+role does any work, so this can sit in a
  render path or an effect without guarding.
*/
export function preloadKit(team: TeamKit, role: string, poses: readonly string[]) {
  if (typeof window === "undefined") return;
  const mark = `${team}/${role}`;
  if (started.has(mark)) return;
  started.add(mark);

  for (const pose of poses) {
    const img = new Image();
    img.decoding = "async";
    img.src = `/cricket/${team}/${role}/${pose}.png`;
    cache.set(key(team, role, pose), img);
  }
}

/**
  A decoded frame, or null while it is still in flight. Callers fall back to
  the procedural figure rather than skipping a draw, so the field is never
  empty on the first ball of a match.
*/
export function kitFrame(
  team: TeamKit,
  role: string,
  pose: string,
  meta: FrameMeta | undefined
): Loaded | null {
  if (!meta) return null;
  const img = cache.get(key(team, role, pose));
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  return { img, meta };
}

/** Whether every frame of a role has decoded for this team. */
export function kitReady(team: TeamKit, role: string, poses: readonly string[]) {
  return poses.every((p) => {
    const i = cache.get(key(team, role, p));
    return !!i && i.complete && i.naturalWidth > 0;
  });
}
