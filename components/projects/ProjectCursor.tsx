/*
  The "View Project" cursor label doesn't live in its own DOM cursor — the
  site already has a single global custom cursor (components/Cursor.tsx)
  that trails the pointer with easing. Rendering a second cursor for this
  section would just fight the first one. Instead this module is the shared
  contract: ProjectTile marks itself with these attributes, and the global
  cursor morphs into the pill when it sees them (see Cursor.tsx).
*/

export const PROJECT_CURSOR_LABEL = "View project";

export const projectCursorProps = {
  "data-cursor": "project",
} as const;
