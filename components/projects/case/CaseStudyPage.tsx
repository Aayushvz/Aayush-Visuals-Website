import Link from "next/link";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import { PROJECTS, type Project } from "@/components/projects/projectData";
import {
  buildStory,
  marked,
  Details,
  FeatureBlock,
  ResultRows,
  ShotStack,
  MediaRow,
} from "./CaseBlocks";
import BackToTop from "./BackToTop";
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

function liveHref(project: Project): string | null {
  const p = project.preview;
  if (p.kind === "website" || p.kind === "behance") return p.href;
  if ((p.kind === "image" || p.kind === "video") && p.href) return p.href;
  return null;
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
  const hasStory = Boolean(
    story.details ||
    story.highlights.length ||
    story.results ||
    story.gallery.length,
  );
  const shots = !hasStory ? project.shots : undefined;

  /* generated from position, so dropping a beat can never leave a stale (03) */
  let no = 0;

  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <main className="cs">
        <div className="cs__inner">
          <header className="csHero">
            <div className="csHero__meta">
              <p className="cs__eyebrow">Projects</p>
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
              <a
                className="csLive"
                href={live}
                target="_blank"
                rel="noreferrer"
              >
                {project.cta || "Visit live site"}
                <span className="csLive__arrow" aria-hidden>
                  &#8599;
                </span>
              </a>
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
              </div>
            </section>
          ) : null}

          {story.gallery.length ? (
            <section className="csSec">
              <SectionHead no={++no} name="Gallery" />
              <div className="csSec__body">
                <MediaRow media={story.gallery} />
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

        <BackToTop />
      </main>

      <Footer />
    </>
  );
}
