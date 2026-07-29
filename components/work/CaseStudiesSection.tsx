"use client";

import ProjectCard from "./ProjectCard";
import { CASE_STUDIES } from "./worksData";

/*
  Long-form process work, listed below the Projects grid.

  Deliberately has no search field and no category chips: those exist upstairs
  because that grid is long and filterable, whereas this list is a handful of
  deep-dives — controls over two cards would be dead weight. Everything else
  (card, grid, section chrome) is the same as WorksSection, so the two read as
  one page rather than two designs.
*/
export default function CaseStudiesSection() {
  if (CASE_STUDIES.length === 0) return null;

  return (
    <section className="worksSection worksSection--cases" id="case-studies">
      <header className="worksSection__head">
        <h2 className="worksSection__title" data-reveal>
          Case Studies<span className="worksSection__dot">.</span>
        </h2>
        <div className="worksSection__intro" data-reveal>
          <span className="worksSection__meta">
            ({CASE_STUDIES.length.toString().padStart(2, "0")})
          </span>
          <p className="worksSection__desc">
            The long version — research, the insights it earned, the system it
            produced, and the screens it ended up as.
          </p>
        </div>
      </header>

      <div className="worksGrid">
        {CASE_STUDIES.map((item, i) => (
          <ProjectCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
