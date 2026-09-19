/*
  The "View Project" cursor label doesn't live in its own DOM cursor — the
  site already has a single global custom cursor (components/Cursor.tsx)
  that trails the pointer with easing. Rendering a second cursor for this
  section would just fight the first one. Instead this module is the shared
  contract: a tile marks itself with these attributes, and the global
  cursor morphs when it sees them (see Cursor.tsx).
*/

export const PROJECT_CURSOR_LABEL = "View project";

/* The plain variant: a cream pill reading "View project". Used by the
   /work index and by the case-study pages, where the reader already has
   the project's name in front of them in the page itself. */
export const projectCursorProps = {
  "data-cursor": "project",
} as const;

/*
  The named variant, used only by the homepage reel.

  There the cover is the whole tile and the caption sits below it, so a
  pointer resting on the artwork is not currently reading the name. This
  carries it: the cursor names what is under it and what kind of work it
  is, instead of repeating a generic label the reader has already seen six
  times down the page.

  The values ride on the element rather than being looked up by the cursor,
  because the cursor has no idea which project it is over and should not
  have to learn the data layer to find out.
*/
export function workCursorProps(title: string, category: string) {
  return {
    "data-cursor": "work",
    "data-cursor-title": title,
    "data-cursor-sub": category,
  };
}
