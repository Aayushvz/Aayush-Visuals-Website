/*
  Where the heavy media is served from.

  THE PROBLEM THIS EXISTS FOR: Vercel's Deployment Storage meter counts
  every retained deployment, and each one carries a full copy of public/.
  That directory is ~80MB, of which ~15MB is seven .webm screen captures
  for the Mike Tyson case study. So those seven files are not stored once,
  they are stored once per deployment, and about a hundred deployments is
  all it takes to fill a 10GB quota. Shrinking them does not help much
  either: they are already VP9 at 400-620kbps, and their weight is
  duration (one is 65 seconds) rather than a lazy encode.

  A file served from somewhere else is in no deployment at all, which is
  the only version of this that actually scales.

  HOW IT WORKS: paths in projectData stay exactly as they are, rooted and
  portable ("/projects/mike-tyson/homepage.webm"). This rewrites them at
  render time onto NEXT_PUBLIC_MEDIA_BASE when that is set. Unset, every
  path is returned untouched and the site serves from public/ exactly as
  it does today, so this is inert until the day it is switched on and
  reverts by clearing one variable.

  MIGRATION ORDER MATTERS. Upload first, set the variable second, verify
  third, and only then delete the local files. Deleting them before the
  variable is set takes the case study's media down.

  Only video is rewritten. Images stay local on purpose: they are what the
  page needs to paint, they are small individually, and putting them
  behind a third party makes an outage of that third party an outage of
  the page rather than of one figure inside it.
*/

/* no trailing slash, so joining is always exactly one */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "").replace(/\/+$/, "");

const OFFLOADED = /\.(webm|mp4)$/i;

export function mediaSrc(path: string): string {
  if (!BASE) return path;
  /* only rewrite our own rooted paths: an absolute URL is already
     somewhere else, and a relative one is not ours to reason about */
  if (!path.startsWith("/")) return path;
  if (!OFFLOADED.test(path)) return path;
  return `${BASE}${path}`;
}
