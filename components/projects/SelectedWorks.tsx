"use client";

import PageLink from "@/components/PageLink";
import { SELECTED_PROJECTS } from "./projectData";
import { workCursorProps } from "./ProjectCursor";
import { saveOrigin } from "@/lib/navOrigin";
import ProjectMedia from "./ProjectMedia";
import ArrowUpRight from "./ArrowUpRight";

/*
  Selected works: a staggered collage.

  Every frame is 3:2 and every pair is top-aligned. What varies is the
  column split, which alternates wide-left, wide-right down the reel. One
  ratio over two unequal widths makes the wide card resolve taller than the
  narrow one beside it, so no two captions in a row ever share a baseline.
  That is the entire stagger: it is a property of the grid, not of the
  projects, so reordering SELECTED_IDS cannot break the rhythm and no card
  carries a hand-placed offset.

  Six projects, three pairs, every row full. An odd reel would leave one
  card to be handled on its own, which is a second layout to keep honest
  for the sake of a single tile.

  Clicking any work opens its case study at /work/[id].
*/

/* flip leads the row with the narrow slot instead of the wide one */
type Row = { items: [number, number]; flip?: boolean };

/* Positions in SELECTED_PROJECTS, whose running order is set in
   projectData. This file owns the layout, not the lineup. */
const ROWS: Row[] = [
  { items: [0, 1] },
  { items: [2, 3], flip: true },
  { items: [4, 5] },
];

/*
  A row plan that does not cover the reel drops projects off the homepage
  silently: they stay in SELECTED_IDS, they just never render. projectData
  already throws for the neighbouring mistake (an id that names no project);
  this throws for its sibling (a project with no row to sit in). The section
  is prerendered, so both fail the build instead of reaching anyone.
*/
const PLANNED = ROWS.flatMap((row) => row.items);
if (PLANNED.length !== SELECTED_PROJECTS.length) {
  throw new Error(
    `SelectedWorks' ROWS plan covers ${PLANNED.length} slots, but ` +
      `SELECTED_PROJECTS has ${SELECTED_PROJECTS.length}. Add or remove a ` +
      `row so every selected project has somewhere to render.`,
  );
}

function Work({ index }: { index: number }) {
  const p = SELECTED_PROJECTS[index];
  const src = p.bgVideoUrl ?? p.cover;

  return (
    <PageLink
      className="selWork"
      data-reveal
      href={`/work/${p.id}`}
      aria-label={`View ${p.title} project`}
      /* remember this spot so the project's back control returns here,
         rather than to the top of /work */
      onClick={() => saveOrigin("/")}
      /* the cursor names what it is over; the caption is below the cover,
         so a pointer on the artwork is not reading it */
      {...workCursorProps(p.title, p.category)}
    >
      <div className="selWork__frame">
        <ProjectMedia
          className="selWork__img"
          src={src}
          alt={p.title}
          poster={p.cover}
        />
        <span className="selWork__badge" aria-hidden>
          <ArrowUpRight />
        </span>
      </div>
      <div className="selWork__meta">
        <h3 className="selWork__name">{p.title}</h3>
        <span className="selWork__tail">
          <span className="selWork__cat">{p.category}</span>
          {/* Two digits, the way a copyright line is written rather than the
              way a date is. The full year is still on the case study's own
              header, where it is information instead of a mark. */}
          <span className="selWork__year">© {p.year.slice(-2)}</span>
        </span>
      </div>
    </PageLink>
  );
}

export default function SelectedWorks() {
  return (
    <div className="selWorks__list">
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          className={
            row.flip ? "selWorks__row selWorks__row--flip" : "selWorks__row"
          }
        >
          {row.items.map((i) => (
            <Work key={SELECTED_PROJECTS[i].id} index={i} />
          ))}
        </div>
      ))}
    </div>
  );
}
