import Link from "next/link";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import HomeContact from "@/components/HomeContact";
import { PROJECTS, type Project } from "@/components/projects/projectData";
import {
  buildStory,
  marked,
  Details,
  FeatureBlock,
  ResultRows,
  ShotStack,
  MediaRows,
} from "./CaseBlocks";
import BackToTop from "./BackToTop";
import ExtCta from "@/components/ExtCta";
import type { CSSProperties } from "react";
import "./case.css";

/*
  A project page.

  The old one dressed every case study as a Figma file: a tab bar, a layers
  tree, a properties panel, a dock. It was a strong idea that worked against
  the work, because the frame was louder than anything inside it and every
  screenshot arrived already sitting in somebody else's interface.

  This is the opposite bet. A white wall, a lot of air, and the work at the
  size it deserves.

  The five beats below are fixed rather than driven by the data. Rendering
  every authored section produced a sixteen-part page on the deepest project,
  which is an archive; the reader here is a hiring manager giving it two
  minutes. buildStory() decides what survives into each beat, so every
  project arrives at the same length and the same shape whether it has four
  sections behind it or sixteen.

  Numbering them is only honest because there are five. It was scaffolding
  when it ran to (16).
*/

function otherProjects(current: Project): Project[] {
  const rest = PROJECTS.filter((p) => p.id !== current.id);
  /* prefer a neighbour from the same category, so the pair at the foot of
     the page reads as related work rather than as whatever came next */
  const kin = rest.filter((p) => p.category === current.category);
  const seen = new Set<string>();
  return [...kin, ...rest]
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .slice(0, 2);
}

/*
  The project's own colour, not a house orange.

  The data already carries a per-project accent whose `light` entry was chosen
  to stay legible on a light canvas, which is exactly the problem the two
  hand-picked oranges were solving. So the page takes the project's hue:
  `light` wherever the colour has to be read as text, the louder `solid` or
  `dark` where it is a surface the eye is meant to find. Projects with no
  accent of their own fall back to the site purple rather than to a colour
  that appears nowhere else on the site.
*/
function accentVars(project: Project): CSSProperties {
  const a = project.accent;
  if (!a) return {};
  return {
    "--cs-accent": a.solid ?? a.dark,
    "--cs-accent-ink": a.light,
    /* the CTA carries its own token, so the button matches its page */
    "--ext-accent": a.solid ?? a.dark,
  } as CSSProperties;
}

function liveHref(project: Project): string | null {
  const p = project.preview;
  if (p.kind === "website" || p.kind === "behance") return p.href;
  if ((p.kind === "image" || p.kind === "video") && p.href) return p.href;
  return null;
}

/* the small crosses the comps place in the whitespace; see .csMarks */
function Marks() {
  return (
    <div className="csMarks" aria-hidden>
      <span className="csMark" />
      <span className="csMark csMark--sm" />
      <span className="csMark" />
    </div>
  );
}

function SectionHead({ no, name }: { no: number; name: string }) {
  return (
    <div className="csSec__head">
      <p className="csSec__no">({String(no).padStart(2, "0")})</p>
      <p className="csSec__name">({name})</p>
    </div>
  );
}

export default function CaseStudyPage({ project }: { project: Project }) {
  const story = buildStory(project);
  const next = otherProjects(project);
  const live = liveHref(project);
  /*
    The flat gallery yields to real imagery, not to text.

    This used to be suppressed whenever the project had "a story", and adding
    written Challenge and Solution copy to meal-maestro therefore deleted its
    entire case study: eighteen slices of a 22,306px export, which is the only
    work that project has. Words are not a substitute for the pictures. What
    replaces a strip is other imagery, so only a gallery or a set of named
    highlights stands it down.
  */
  const shots =
    story.gallery.length || story.highlights.length ? undefined : project.shots;

  /* generated from position, so dropping a beat can never leave a stale (03) */
  let no = 0;

  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      {/* The same parallax the rest of the site closes on: an opaque stage
          sliding up over a sticky footer, with contact the last thing on it.
          The footer stays OUTSIDE main so it keeps its contentinfo landmark,
          which is why main is the stage rather than wrapping it. */}
      <div className="hpParallax">
        <main className="cs hpParallax__stage" style={accentVars(project)}>
          <div className="cs__inner">
            <header className="csHero">
              {/*
                The way back.

                The eyebrow here already said "Projects", which named where
                the reader was without offering to take them there. A case
                study is a leaf: arrive on one from a search result or a
                shared link and the only routes out were the site nav and the
                two cards at the very bottom of a long page. This is the same
                word, doing the job it looked like it was doing.
              */}
              <div className="csHero__meta">
                <Link className="cs__eyebrow csBack" href="/work">
                  <span className="csBack__arrow" aria-hidden>
                    &#8592;
                  </span>
                  Projects
                </Link>
                <p className="cs__eyebrow csHero__cat">{project.category}</p>
              </div>

              <h1 className="csHero__title">{project.title}</h1>

              <div className="csHero__intro">
                {story.intro.map((p, i) => (
                  <p className="cs__body" key={i}>
                    {marked(p)}
                  </p>
                ))}
              </div>

              {/* the three facts a hiring manager checks first, in the order
                they check them */}
              <ul className="csHero__facts">
                <li className="csHero__fact">
                  <span className="csHero__factKey">Role</span>
                  <span className="csHero__factVal">{project.role}</span>
                </li>
                <li className="csHero__fact">
                  <span className="csHero__factKey">Year</span>
                  <span className="csHero__factVal">{project.year}</span>
                </li>
                {project.tools?.length ? (
                  <li className="csHero__fact">
                    <span className="csHero__factKey">Tools</span>
                    <span className="csHero__factVal">
                      {project.tools.slice(0, 3).join(", ")}
                    </span>
                  </li>
                ) : null}
              </ul>

              {live ? (
                <div className="csHero__cta">
                  <ExtCta href={live}>
                    {project.cta || "Visit live site"}
                  </ExtCta>
                </div>
              ) : null}

              {project.cover ? (
                <div className="csHero__cover">
                  <img
                    className="csShot"
                    src={project.cover}
                    alt={`${project.title}, cover`}
                    /* the largest thing in the first screen, so it is the one
                     image worth fetching before anything scrolls */
                    fetchPriority="high"
                    decoding="async"
                  />
                </div>
              ) : null}
            </header>

            {story.statement ? (
              <section className="csSec csSec--dark">
                <SectionHead no={++no} name="About" />
                <div className="csSec__body">
                  <p className="csStatement">
                    <span className="csStatement__lead">
                      {marked(story.statement.lead)}
                    </span>
                    {story.statement.rest
                      ? marked(" " + story.statement.rest)
                      : null}
                  </p>
                  {story.about.length ? (
                    <div className="csAbout">
                      {story.about.map((p, i) => (
                        <p className="cs__body" key={i}>
                          {marked(p)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <Marks />
                </div>
              </section>
            ) : null}

            {story.details ? (
              <section className="csSec">
                <SectionHead no={++no} name="Details" />
                <div className="csSec__body">
                  <Details
                    pairs={story.details.pairs}
                    media={story.details.media}
                  />
                </div>
              </section>
            ) : null}

            {/*
              A product made of four interfaces gets four beats, not one.

              Nineteen named screens under a single "Highlights" makes the
              reader work out for themselves where the traveller's app ends
              and the kitchen's portal begins, which is the one piece of
              structure the work has. Projects that are one interface still
              get the single beat below.
            */}
            {story.chapters.length
              ? story.chapters.map((chapter) => (
                  <section className="csSec" key={chapter.name}>
                    <SectionHead no={++no} name={chapter.name} />
                    <div className="csSec__body">
                      {chapter.intro.length ? (
                        <div className="csChapter__lead">
                          {chapter.intro.map((p, i) => (
                            <p className="cs__body" key={i}>
                              {marked(p)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {chapter.items.map((item, i) => (
                        <FeatureBlock item={item} key={i} />
                      ))}
                    </div>
                  </section>
                ))
              : null}

            {story.highlights.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="Highlights" />
                <div className="csSec__body">
                  {story.highlights.map((item, i) => (
                    <FeatureBlock item={item} key={i} />
                  ))}
                </div>
              </section>
            ) : null}

            {story.results ? (
              <section className="csSec">
                <SectionHead no={++no} name="Results" />
                <div className="csSec__body">
                  <ResultRows
                    items={story.results.items}
                    note={story.results.note}
                  />
                  <Marks />
                </div>
              </section>
            ) : null}

            {story.gallery.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="Gallery" />
                <div className="csSec__body">
                  <MediaRows media={story.gallery} />
                </div>
              </section>
            ) : null}

            {shots?.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="The Work" />
                <div className="csSec__body">
                  <ShotStack shots={shots} />
                </div>
              </section>
            ) : null}

            {next.length ? (
              <section className="csSec csFoot">
                <SectionHead no={++no} name="More Work" />
                <div className="csSec__body">
                  <div className="csNext">
                    {next.map((p, i) => (
                      <Link
                        className="csNext__card"
                        href={`/work/${p.id}`}
                        key={p.id}
                      >
                        <div className="csNext__frame">
                          <img
                            className="csNext__shot"
                            src={p.cover}
                            alt={`${p.title}, cover`}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="csNext__meta">
                          <span className="csNext__no">
                            {String(i + 1).padStart(3, "0")}
                          </span>
                          <span>
                            <span className="csNext__title">{p.title}</span>
                            <span className="csNext__cat">{p.category}</span>
                          </span>
                          <span className="csNext__year">{p.year}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <HomeContact />
        </main>

        <Footer />
      </div>

      <BackToTop />
    </>
  );
}
