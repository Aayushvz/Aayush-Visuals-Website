/*
  Remembers which listing a project page was opened from, so its back control
  returns you to that exact spot rather than to the top of /work.

  Why not router.back()? The case-study page's dock has prev/next between
  projects, so after browsing a couple the previous history entry is another
  project, not the listing you came from. The origin has to be recorded
  explicitly at the point of departure.

  The position is stored as an offset *within a known section*, not an
  absolute scrollY: anything above the section that changes height between
  leaving and returning (lazy images resolving, reveal transforms settling)
  would otherwise land you in the wrong place.
*/

const ORIGIN_KEY = "projectOrigin";
const RESTORE_KEY = "pendingScrollRestore";

export type NavOrigin = {
  /** the listing page to go back to */
  path: string;
  /** id of the section that listing lives in */
  sectionId: string;
  /** scroll position relative to that section's top */
  offset: number;
};

/** where back should land when nothing was recorded — a direct link or a new
    tab. Deliberately the Projects section rather than /work's hero, since
    landing on the hero is the exact complaint this module exists to fix. */
export const FALLBACK_ORIGIN: NavOrigin = {
  path: "/work",
  sectionId: "work",
  offset: 0,
};

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // storage disabled or the value got corrupted; not fatal
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the back link just falls back */
  }
}

/** Call from a project listing as the user leaves it for a project page. */
export function saveOrigin(path: string, sectionId = "work") {
  if (typeof window === "undefined") return;
  const section = document.getElementById(sectionId);
  const sectionTop = section
    ? section.getBoundingClientRect().top + window.scrollY
    : 0;
  write(ORIGIN_KEY, {
    path,
    sectionId,
    offset: Math.max(0, Math.round(window.scrollY - sectionTop)),
  } satisfies NavOrigin);
}

export function readOrigin(): NavOrigin | null {
  if (typeof window === "undefined") return null;
  const o = read<NavOrigin>(ORIGIN_KEY);
  return o && typeof o.path === "string" ? o : null;
}

/**
 * Arm a scroll restore for the next route change and return where to go.
 * ScrollRestore picks this up once the destination has laid out.
 */
export function armRestore(): NavOrigin {
  const origin = readOrigin() ?? FALLBACK_ORIGIN;
  write(RESTORE_KEY, origin);
  return origin;
}

export function takeRestore(): NavOrigin | null {
  if (typeof window === "undefined") return null;
  const pending = read<NavOrigin>(RESTORE_KEY);
  try {
    sessionStorage.removeItem(RESTORE_KEY);
  } catch {}
  return pending;
}
