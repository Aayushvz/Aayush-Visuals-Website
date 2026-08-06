import SelectedWorks from "./projects/SelectedWorks";
import PrefetchWorkMedia from "./projects/PrefetchWorkMedia";
import PageLink from "./PageLink";
import { PROJECTS, SELECTED_PROJECTS } from "./projects/projectData";

/* the arrow both calls to action share, so they can never drift apart */
function ArrowUpRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export default function ProjectsSection() {
  /*
    The reel's heaviest media, which is not the same thing as its first.
    One project ships an animated WebP (~1.5MB) that outweighs every static
    cover in this section by more than ten times. That project used to open
    the reel, so "first" and "heaviest" pointed at the same tile and the
    difference never surfaced. Reordering the reel separated them: picking
    by position would warm a 56KB cover and leave the heavy one to pop in
    late, which is the exact problem the prefetch exists to solve.
  */
  const heaviest = SELECTED_PROJECTS.find((p) => p.bgVideoUrl);
  const firstMedia = heaviest?.bgVideoUrl ?? SELECTED_PROJECTS[0].cover;

  /* both counts are derived, so neither can quietly go stale the next time
     a project is added or the reel is reordered */
  const pad = (n: number) => String(n).padStart(2, "0");
  const shown = pad(SELECTED_PROJECTS.length);
  const total = pad(PROJECTS.length);

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
            {shown}
          </span>
          <p className="selWorks__note" data-reveal>
            A selection of product, brand and website work across real launches,
            crafted with intention and built for real users.
          </p>
          {/* the count above says how many are on show; this says how many
              there are, which is the reason to click it */}
          <PageLink href="/work" className="selWorks__headCta" data-reveal>
            <span className="selWorks__headCtaText">View all projects</span>
            <span className="selWorks__headCtaNum">{total}</span>
            <span className="selWorks__headCtaIcon">
              <ArrowUpRight />
            </span>
          </PageLink>
        </div>
      </div>
      <div className="selWorks__divider" aria-hidden />
      <SelectedWorks />
      {/*
        The reel is a ruled ledger: every row is [YEAR] [NAME / CATEGORY]
        [BIG NUMERAL], counting 01 up to 07. This is the ledger's next line
        rather than a button parked underneath it — same rule, same columns,
        same oversized right-hand slot. The one substitution is that slot:
        after seven numerals it resolves into an arrow, so the sequence ends
        by pointing somewhere instead of just stopping.
      */}
      <PageLink href="/work" className="selWorks__endCta" data-reveal>
        <span className="selWorks__endCtaYear" aria-hidden>
          All
        </span>
        <span className="selWorks__endCtaInfo">
          <span className="selWorks__endCtaName">
            View all projects
            <span className="selWorks__endCtaCat"> / archive</span>
          </span>
          <span className="selWorks__endCtaRole">
            {total} projects, {SELECTED_PROJECTS.length} of them shown here
          </span>
        </span>
        <span className="selWorks__endCtaIcon" aria-hidden>
          <ArrowUpRight />
        </span>
      </PageLink>
    </section>
  );
}
