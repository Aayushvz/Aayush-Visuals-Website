"use client";

import { useState } from "react";
import { PROJECTS } from "./projectData";
import ProjectTile from "./ProjectTile";
import ProjectModal from "./ProjectModal";

/*
  Ruler-aligned 2-column editorial grid (1-column on mobile). Owns which
  project is open and hands the id down to each tile; the modal is
  data-driven off the same PROJECTS array, so opening it never needs a
  route or a second copy of the content.
*/

const COLUMNS = 2;

export default function ProjectGrid() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeProject = PROJECTS.find((p) => p.id === activeId) ?? null;
  const rows = Math.ceil(PROJECTS.length / COLUMNS);

  return (
    <>
      <div className="projGrid">
        {PROJECTS.map((project, i) => (
          <ProjectTile key={project.id} project={project} index={i} onOpen={setActiveId} />
        ))}
        {/* decorative "+" at each internal row/column crossing — 2-column
            grid only, hidden on the single-column mobile layout via CSS */}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <span
            key={i}
            className="projGrid__cross"
            style={{ top: `${((i + 1) / rows) * 100}%` }}
            aria-hidden
          >
            +
          </span>
        ))}
      </div>
      <ProjectModal project={activeProject} onClose={() => setActiveId(null)} />
    </>
  );
}
