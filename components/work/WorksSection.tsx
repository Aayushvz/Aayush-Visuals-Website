"use client";

import { useMemo, useState } from "react";
import { PROJECTS } from "@/components/projects/projectData";
import ProjectModal from "@/components/projects/ProjectModal";
import ProjectCard from "./ProjectCard";
import { WORKS, WORK_CATEGORIES, filterWorks } from "./worksData";

/*
  The /work projects listing: an editorial header, a working search field, a
  row of category filter chips, and a two-column grid of large project cards.
  Search + category filter together (data-driven via filterWorks). Clicking a
  card opens the site's existing data-driven ProjectModal (no new routes), so
  project detail behaviour stays exactly as it is elsewhere.
*/

export default function WorksSection() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [activeId, setActiveId] = useState<string | null>(null);

  const results = useMemo(() => filterWorks(WORKS, category, query), [category, query]);
  const activeProject = PROJECTS.find((p) => p.id === activeId) ?? null;

  return (
    <section className="worksSection" id="work">
      <header className="worksSection__head">
        <h2 className="worksSection__title" data-reveal>
          Projects<span className="worksSection__dot">.</span>
        </h2>
        <div className="worksSection__intro" data-reveal>
          <span className="worksSection__meta">(2020-26)</span>
          <p className="worksSection__desc">
            A selection of product, brand and website work across real launches,
            crafted with intention and built for real users.
          </p>
        </div>
      </header>

      <div className="worksControls" data-reveal>
        <label className="worksSearch">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="worksSearch__input"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </label>

        <div className="worksFilters" role="tablist" aria-label="Filter projects by category">
          {WORK_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`worksChip${category === c ? " worksChip--active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="worksGrid">
          {results.map((item, i) => (
            <ProjectCard key={item.id} item={item} index={i} onOpen={setActiveId} />
          ))}
        </div>
      ) : (
        <p className="worksEmpty">No projects found.</p>
      )}

      <ProjectModal project={activeProject} onClose={() => setActiveId(null)} />
    </section>
  );
}
