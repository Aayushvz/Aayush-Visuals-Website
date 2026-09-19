import SelectedWorks from "./projects/SelectedWorks";
import PrefetchWorkMedia from "./projects/PrefetchWorkMedia";
import PageLink from "./PageLink";
import ExtCta from "./ExtCta";
import ArrowUpRight from "./projects/ArrowUpRight";
import { PROJECTS, SELECTED_PROJECTS } from "./projects/projectData";

export default function ProjectsSection() {
  /*
    The reel's heaviest media, which is not necessarily its first.

    One project ships a looping WebM (~0.5MB) that outweighs every static
    cover in this section by roughly ten times. It happens to open the reel
    again right now, so "first" and "heaviest" point at the same tile, but
    that is a property of the current running order, not something to rely
    on. An earlier order had them apart, and picking by position then warmed
    a 56KB cover while the heavy one popped in late, which is the exact
    problem this prefetch exists to solve. Finding it by bgVideoUrl survives
    the next reshuffle.
  */
  const heaviest = SELECTED_PROJECTS.find((p) => p.bgVideoUrl);
  const firstMedia = heaviest?.bgVideoUrl ?? SELECTED_PROJECTS[0].cover;

  /* both numbers are derived, so neither can quietly go stale the next time
     a project is added or the reel is reordered */
  const total = String(PROJECTS.length).padStart(2, "0");
  const archived = PROJECTS.length - SELECTED_PROJECTS.length;

  return (
    <section className="selWorks" id="work">
      <PrefetchWorkMedia src={firstMedia} />
      <div className="selWorks__head">
        <h2 className="display selWorks__title" data-reveal>
          Selected
          <br />
          Projects
          <span className="selWorks__tag">from 2020-now</span>
        </h2>
        <div className="selWorks__headRight">
          <p className="selWorks__note" data-reveal>
            A selection of product, brand and website work across real
            launches.
          </p>
          <ExtCta href="/work" route count={total} data-reveal>
            View all projects
          </ExtCta>
        </div>
      </div>
      <SelectedWorks />
      {/*
        The closing CTA used to be the ledger's eighth line, sharing the
        rows' three columns so that after counting 01 to 07 the numeral
        column resolved into an arrow. Those columns went with the rows, so
        it takes the collage's geometry instead: a full-width panel at the
        cards' own radius, ending on the same badge the cards carry in
        their corners. The section still finishes by pointing somewhere.
      */}
      <PageLink href="/work" className="selWorks__endCta" data-reveal>
        <span className="selWorks__endCtaText">
          <span className="selWorks__endCtaName">View all projects</span>
          <span className="selWorks__endCtaNote">
            {archived} more in the archive
          </span>
        </span>
        <span className="selWorks__endCtaIcon" aria-hidden>
          <ArrowUpRight />
        </span>
      </PageLink>
    </section>
  );
}
