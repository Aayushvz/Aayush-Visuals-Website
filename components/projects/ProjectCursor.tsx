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
   case-study pages, where the reader already has the project's name in
   front of them in the page itself. The /work index used this too until the
   named variant below was extended to it. */
export const projectCursorProps = {
  "data-cursor": "project",
} as const;

/*
  The named variant, used by the homepage reel and the /work grid.

  On the homepage the cover is the whole tile and the caption sits below it,
  so a pointer resting on the artwork is not currently reading the name. On
  /work the card's header does carry the title - but not the discipline, so
  the cursor still adds something rather than echoing the card. Either way it
  beats a generic label the reader has already seen six times down the page.

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
