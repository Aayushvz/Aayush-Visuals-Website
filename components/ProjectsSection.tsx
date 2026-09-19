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
        The closing action is the reel's seventh caption, not a button.

        It was a full-width outlined panel at the cards' radius, which drew
        a box around a line of text and a great deal of nothing. The line
        was never the problem, so the box went: this now sits on the same
        two anchors every card caption uses, label at the left edge and
        muted meta at the right, and the space above it is what separates
        it rather than a border.
      */}
      <PageLink href="/work" className="selWorks__endCta" data-reveal>
        <span className="selWorks__endCtaName">
          View all projects
          <span className="selWorks__endCtaIcon" aria-hidden>
            <ArrowUpRight />
          </span>
        </span>
        <span className="selWorks__endCtaNote">
          {archived} more in the archive
        </span>
      </PageLink>
    </section>
  );
}
