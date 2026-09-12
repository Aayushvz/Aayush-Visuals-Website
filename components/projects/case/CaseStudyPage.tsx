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
import { Blocks } from "./CaseSections";
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
    /*
      What reads ON the accent once something is filled with it.

      The primary button paints white glyphs over its accent square, which
      is fine on a smelting red and not fine on Gravitas' mint (2.4:1) or
      Layover's gold (2.3:1). Every project that names an accent already
      names the colour that survives sitting on it, for exactly this reason,
      so the button borrows that rather than assuming white.
    */
    "--cs-on-accent": a.ink ?? "#fff",
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
    <div className="csMarks" data-rise aria-hidden>
      <span className="csMark" />
      <span className="csMark csMark--sm" />
      <span className="csMark" />
    </div>
  );
}

/*
  The rule above a section is drawn rather than printed.

  It is the one element every beat shares, so it is the right place to put
  the page's rhythm: the hairline runs out from the left edge, and the two
  labels arrive behind it. The border itself is kept (transparent) so the
  box never changes height between the drawn and undrawn states.
*/
function SectionHead({ no, name }: { no: number; name: string }) {
  return (
    <div className="csSec__head">
      <p className="csSec__no" data-rise style={{ "--i": 1 } as CSSProperties}>
        ({String(no).padStart(2, "0")})
      </p>
      <p
        className="csSec__name"
        data-rise
        style={{ "--i": 2 } as CSSProperties}
      >
        ({name})
      </p>
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
              <div className="csHero__meta" data-rise>
                <Link className="cs__eyebrow csBack" href="/work">
                  {/* drawn rather than the &larr; glyph, which is a
                      different weight in every font that has it and sits
                      off-centre in a circle */}
                  <span className="csBack__mark" aria-hidden>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </span>
                  <span className="csBack__label">Projects</span>
                </Link>
                <p className="cs__eyebrow csHero__cat">{project.category}</p>
              </div>

              {/* the headline where there is one, the name where there is
                  not; sized down when it is a sentence rather than a word */}
              <h1
                className={`csHero__title${
                  project.headline ? " csHero__title--head" : ""
                }`}
                data-rise
                style={{ "--i": 1 } as CSSProperties}
              >
                {project.headline ?? project.title}
              </h1>

              <div
                className="csHero__intro"
                data-rise
                style={{ "--i": 2 } as CSSProperties}
              >
                {story.intro.map((p, i) => (
                  <p className="cs__body" key={i}>
                    {marked(p)}
                  </p>
                ))}
              </div>

              {/* the three facts a hiring manager checks first, in the order
                they check them */}
              <ul className="csHero__facts">
                <li
                  className="csHero__fact"
                  data-rise
                  style={{ "--i": 3 } as CSSProperties}
                >
                  <span className="csHero__factKey">Role</span>
                  <span className="csHero__factVal">{project.role}</span>
                </li>
                <li
                  className="csHero__fact"
                  data-rise
                  style={{ "--i": 4 } as CSSProperties}
                >
                  <span className="csHero__factKey">Year</span>
                  <span className="csHero__factVal">{project.year}</span>
                </li>
                {project.tools?.length ? (
                  <li
                    className="csHero__fact"
                    data-rise
                    style={{ "--i": 5 } as CSSProperties}
                  >
                    <span className="csHero__factKey">Tools</span>
                    <span className="csHero__factVal">
                      {project.tools.slice(0, 3).join(", ")}
                    </span>
                  </li>
                ) : null}
              </ul>

              {live ? (
                <div
                  className="csHero__cta"
                  data-rise
                  style={{ "--i": 6 } as CSSProperties}
                >
                  <ExtCta href={live}>
                    {project.cta || "Visit live site"}
                  </ExtCta>
                </div>
              ) : null}

              {project.cover ? (
                <div className="csHero__cover">
                  <img
                    className="csShot"
                    data-rise="shot"
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
                  <p className="csStatement" data-rise>
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
                        <p
                          className="cs__body"
                          data-rise
                          style={{ "--i": i + 1 } as CSSProperties}
                          key={i}
                        >
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
                  {/*
                    The context card, which the guide puts with the problem
                    rather than in the hero: what the thing was, how long it
                    took, what was in scope, and what constrained it. These
                    facts were authored on every project as `extraFacts` and
                    had no renderer at all, so a reader could not learn that
                    CPGRAMS was delivered with KPMG for DARPG, or that
                    Layover ran from 2024 to 2026 across four airports.
                  */}
                  {project.extraFacts?.length ? (
                    <dl className="csContext" data-rise>
                      {project.extraFacts.map(([k, v]) => (
                        <div className="csContext__row" key={k}>
                          <dt className="csContext__key">{k}</dt>
                          <dd className="csContext__val">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <Details
                    pairs={story.details.pairs}
                    media={story.details.media}
                  />
                  {/* the numbers that made the case, beside the case they
                      made: research shown anywhere else is an artefact, and
                      research shown here is an argument */}
                  {story.evidence.length ? (
                    <div className="csSec__evidence">
                      <Blocks blocks={story.evidence} />
                    </div>
                  ) : null}
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
                        <div className="csChapter__lead" data-rise>
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

            {/*
              What was tried and thrown away.

              A case study with no visible iteration is suspicious: nobody
              who has built anything believes a finished screen arrived
              first time, so a reader with no failures to look at fills the
              blank in themselves, usually with "got lucky" or "hid the
              messy parts". Both work against the page.
            */}
            {story.iteration.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="What I tried" />
                <div className="csSec__body">
                  <Blocks blocks={story.iteration} />
                </div>
              </section>
            ) : null}

            {/* the visual system as a system, which is a different claim
                from a grid of finished screens */}
            {story.system.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="The system" />
                <div className="csSec__body">
                  <Blocks blocks={story.system} />
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

            {/* honest, and specific enough to be uncomfortable; a
                reflection that only reports successes reads as a project
                that never met any difficulty, which nobody believes */}
            {story.reflection.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="What it taught me" />
                <div className="csSec__body">
                  <Blocks blocks={story.reflection} />
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
                        data-rise
                        data-cursor="project"
                        style={{ "--i": i } as CSSProperties}
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
