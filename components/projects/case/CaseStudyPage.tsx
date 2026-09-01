import Link from "next/link";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Reveals from "@/components/Reveals";
import { PROJECTS, type Project } from "@/components/projects/projectData";
import {
  CaseSectionBody,
  pickStatement,
  introParagraphs,
  marked,
  ShotStack,
} from "./CaseBlocks";
import "./case.css";

/*
  A project page.

  The old one dressed every case study as a Figma file: a tab bar, a layers
  tree, a properties panel, a dock. It was a strong idea that worked against
  the work, because the frame was louder than anything inside it and every
  screenshot arrived already sitting in somebody else's interface.

  This is the opposite bet. A white wall, a lot of air, and the work at the
  size it deserves. The only voices on the page are the project's name, a
  short argument, and the images; everything structural - the ordinals, the
  parenthesised section names, the hairlines - is set small and grey so it
  organises the page without competing with it.

  The section numbering is generated from position rather than authored, so
  reordering or dropping a section can never leave a stale (03) behind.
*/

/* Section names are authored as Figma frame labels, so they arrive in
   whatever case the file used - some projects say "Overview", others
   "overview". The page sets them all one way rather than exposing that
   inconsistency as a design. */
function sectionName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function otherProjects(current: Project): Project[] {
  const rest = PROJECTS.filter((p) => p.id !== current.id);
  /* prefer a neighbour from the same category, so the pair at the foot of
     the page reads as related work rather than as whatever came next */
  const kin = rest.filter((p) => p.category === current.category);
  const seen = new Set<string>();
  return [...kin, ...rest].filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 2);
}

export default function CaseStudyPage({ project }: { project: Project }) {
  const sections = project.sections ?? [];
  const statement = pickStatement(project);
  const intro = introParagraphs(project);
  const next = otherProjects(project);

  /* the inverted band is a section in its own right, so it takes (01) and
     everything authored follows it */
  let no = statement ? 1 : 0;

  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <Reveals />

      <main className="cs">
        <div className="cs__inner">
          <header className="csHero">
            <div className="csHero__meta">
              <p className="cs__eyebrow csHero__kicker">Projects</p>
              <p className="cs__eyebrow csHero__cat">{project.category}</p>
            </div>

            <h1 className="csHero__title">{project.title}</h1>

            <div className="csHero__intro">
              {intro.map((p, i) => (
                <p className="cs__body" key={i}>
                  {marked(p)}
                </p>
              ))}
            </div>

            {project.cover ? (
              <div className="csHero__cover">
                <img
                  className="csShot"
                  src={project.cover}
                  alt={`${project.title}, cover`}
                  /* the one image on the page worth loading before anything
                     scrolls: it is the largest thing in the first screen */
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            ) : null}
          </header>

          {statement ? (
            <section className="csSec csSec--dark">
              <div className="csSec__head">
                <p className="csSec__no">(01)</p>
                <p className="csSec__name">(About)</p>
              </div>
              <div className="csSec__body">
                <p className="csStatement">
                  <span className="csStatement__lead">{marked(statement.lead)}</span>
                  {statement.rest ? marked(" " + statement.rest) : null}
                </p>
              </div>
            </section>
          ) : null}

          {sections.map((section) => {
            no += 1;
            return (
              <section className="csSec" key={section.name}>
                <div className="csSec__head">
                  <p className="csSec__no">({String(no).padStart(2, "0")})</p>
                  <p className="csSec__name">({sectionName(section.name)})</p>
                </div>
                <div className="csSec__body">
                  {section.heading ? (
                    <h2 className="csSec__heading">{section.heading}</h2>
                  ) : null}
                  <CaseSectionBody blocks={section.blocks} project={project} />
                </div>
              </section>
            );
          })}

          {!sections.length && project.shots?.length ? (
            <section className="csSec">
              <div className="csSec__head">
                <p className="csSec__no">({String(++no).padStart(2, "0")})</p>
                <p className="csSec__name">(The Work)</p>
              </div>
              <div className="csSec__body">
                <ShotStack shots={project.shots} />
              </div>
            </section>
          ) : null}

          {next.length ? (
            <section className="csSec csFoot">
              <div className="csSec__head">
                <p className="csSec__no">({String(no + 1).padStart(2, "0")})</p>
                <p className="csSec__name">(View Other Projects)</p>
              </div>
              <div className="csSec__body">
                <div className="csNext">
                  {next.map((p, i) => (
                    <Link className="csNext__card" href={`/work/${p.id}`} key={p.id}>
                      <img
                        className="csNext__shot"
                        src={p.cover}
                        alt={`${p.title}, cover`}
                        loading="lazy"
                        decoding="async"
                      />
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
      </main>

      <Footer />
    </>
  );
}
