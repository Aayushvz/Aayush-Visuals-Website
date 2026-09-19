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
        The closing action, third time.

        It was a full-width outlined panel first, which drew a border round
        one line of type and a great deal of empty. Stripping it to a bare
        full-width line overcorrected: the label ended up at one edge and
        the count at the other with nine hundred pixels between them, so
        they read as two unrelated fragments and nothing about them said
        they could be clicked.

        A control needs an edge you can point at, and that edge should be
        close to the label rather than at the far side of the page. So it
        is a compact pill at the grid's left edge: label, a hairline
        divider, the count and the arrow. Outline and no fill, which is
        what keeps it under the header's solid .extCta rather than beside
        it (DESIGN.md section 7).
      */}
      <PageLink href="/work" className="selWorks__endCta" data-reveal>
        <span className="selWorks__endCtaName">View all projects</span>
        <span className="selWorks__endCtaNote">
          {/* The bare numeral reads as "View all projects12" aloud, with
              nothing between the label and the count. The visible one is
              hidden from the accessibility tree and the same value is
              restated as a phrase, the way ExtCta handles its own badge. */}
          <span className="selWorks__endCtaCount" aria-hidden>
            {archived}
          </span>
          <span className="srOnly">, {archived} more in the archive</span>
          <span className="selWorks__endCtaIcon" aria-hidden>
            <ArrowUpRight />
          </span>
        </span>
      </PageLink>
    </section>
  );
}
