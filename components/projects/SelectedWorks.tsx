"use client";

import PageLink from "@/components/PageLink";
import { SELECTED_PROJECTS } from "./projectData";
import { projectCursorProps } from "./ProjectCursor";
import { saveOrigin } from "@/lib/navOrigin";
import ProjectMedia from "./ProjectMedia";

/*
  Selected-works list: numbered rows that alternate full-width and
  two-column pairs. The cover is always visible in a framed container and
  zooms on hover; metadata (year / name · category) sits beneath with a big
  solid index numeral. Clicking any work opens its full Figma-styled case
  study page at /work/[id], data-driven off the same PROJECTS array.
*/

/* row rhythm from the reference: 01 full · 02/03 pair · 04 full · 05/06 pair
   · 07 full. The indices are positions in SELECTED_PROJECTS, whose running
   order is set in projectData — this file owns the layout, not the lineup. */
const ROWS: { type: "full" | "pair"; items: number[] }[] = [
  { type: "full", items: [0] },
  { type: "pair", items: [1, 2] },
  { type: "full", items: [3] },
  { type: "pair", items: [4, 5] },
  { type: "full", items: [6] },
];

export default function SelectedWorks() {
  return (
    <div className="selWorks__list">
      {ROWS.map((row, ri) => (
        <div key={ri} className={`selWorks__row selWorks__row--${row.type}`}>
          {row.items.map((idx) => {
            const p = SELECTED_PROJECTS[idx];
            const src = p.bgVideoUrl ?? p.cover;
            return (
              <PageLink
                key={p.id}
                className="selWork"
                data-reveal
                href={`/work/${p.id}`}
                aria-label={`View ${p.title} project`}
                /* remember this spot so the project's back control returns
                   here, rather than to the top of /work */
                onClick={() => saveOrigin("/")}
                {...projectCursorProps}
              >
                <div className="selWork__frame">
                  <ProjectMedia
                    className="selWork__img"
                    src={src}
                    alt={p.title}
                    poster={p.cover}
                  />
                </div>
                <div className="selWork__meta">
                  <span className="selWork__year">{p.year}</span>
                  <div className="selWork__info">
                    <h3 className="selWork__name">
                      {p.title}
                      <span className="selWork__cat"> / {p.category}</span>
                    </h3>
                    <span className="selWork__role">{p.role}</span>
                  </div>
                  <span className="selWork__index" aria-hidden>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
              </PageLink>
            );
          })}
        </div>
      ))}
    </div>
  );
}
