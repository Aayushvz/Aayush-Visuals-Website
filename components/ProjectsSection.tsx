import SelectedWorks from "./projects/SelectedWorks";
import PrefetchWorkMedia from "./projects/PrefetchWorkMedia";
import ExtCta from "./ExtCta";
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
      {/* the closing action is the same primary button as the header, so
          the section speaks one button language top and bottom */}
      <div className="selWorks__foot">
        <ExtCta href="/work" route count={total} data-reveal>
          View all projects
        </ExtCta>
      </div>
    </section>
  );
}
