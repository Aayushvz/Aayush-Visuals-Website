import SelectedWorks from "./projects/SelectedWorks";
import PrefetchWorkMedia from "./projects/PrefetchWorkMedia";
import { PROJECTS } from "./projects/projectData";

export default function ProjectsSection() {
  /* first row's media — the animated WebP that dominates this section's
     weight. Read from the same source SelectedWorks renders from so the two
     can't drift apart. */
  const firstMedia = PROJECTS[0].bgVideoUrl ?? PROJECTS[0].cover;

  return (
    <section className="selWorks" id="work">
      <PrefetchWorkMedia src={firstMedia} />
      <div className="selWorks__head">
        <div className="selWorks__headLeft">
          <h2 className="display selWorks__title" data-reveal>
            Selected
            <br />
            Projects
            <span className="selWorks__tag">from 2020-now</span>
          </h2>
          <span className="selWorks__arrow" aria-hidden data-reveal>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M6 14l6 6 6-6" />
            </svg>
          </span>
        </div>
        <div className="selWorks__headRight">
          <span className="selWorks__count" data-reveal>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            07
          </span>
          <p className="selWorks__note" data-reveal>
            A selection of product, brand and website work across real launches,
            crafted with intention and built for real users.
          </p>
        </div>
      </div>
      <div className="selWorks__divider" aria-hidden />
      <SelectedWorks />
    </section>
  );
}
