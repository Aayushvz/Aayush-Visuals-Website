/*
  One scroll lock for the whole document, reference counted.

  Both the preloader and the page wipe need to stop the page moving under
  a full-screen overlay, and both used to do it the obvious way: read
  `document.body.style.overflow`, set it to hidden, put the old value back
  when done. That is correct alone and wrong together. If the second lock
  starts while the first is still held it reads "hidden" as the value to
  return to, and whichever lock releases LAST writes that stale hidden
  back onto a page nobody is covering any more — the document is then
  unscrollable until a reload.

  That is not hypothetical: it is exactly what happened leaving /cricket.
  The wipe locks, the route swaps under it, the preloader mounts for the
  new route and reads the wipe's own lock as the previous state, the wipe
  releases, and four seconds later the preloader finishes and re-locks a
  page that has nothing on it.

  A counter fixes the class of bug rather than that one instance. The
  first caller records the real pre-lock state and applies the lock; later
  callers only raise the count; the state is restored once, when the last
  holder lets go. `lockScroll` hands back its own release function, and
  that function is idempotent — callers that release on both a finish path
  and an unmount cleanup (which is every caller here) must not be able to
  drop the count twice for one lock.
*/

let holders = 0;
let prevOverflow = "";
let prevPaddingRight = "";

export function lockScroll(): () => void {
  if (holders === 0) {
    /* padding stands in for the scrollbar that overflow:hidden removes,
       so locking does not shift the whole layout sideways */
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    prevOverflow = document.body.style.overflow;
    prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  holders += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders > 0) return;
    holders = 0;
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPaddingRight;
  };
}
