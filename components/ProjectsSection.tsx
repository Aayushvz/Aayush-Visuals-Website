import SelectedWorks from "./projects/SelectedWorks";

export default function ProjectsSection() {
  return (
    <section className="selWorks" id="work">
      <div className="selWorks__head">
        <div className="selWorks__headLeft">
          <h2 className="display selWorks__title" data-reveal>
            Selected
            <br />
            works
            <span className="selWorks__tag">from 2024-now</span>
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
