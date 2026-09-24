import Link from "next/link";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import HomeContact from "@/components/HomeContact";
import { PROJECTS, type Project } from "@/components/projects/projectData";
import {
  Board,
  PosterVolume,
  buildStory,
  marked,
  Details,
  Features,
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
      And the one for a dark ground.

      `light` is the variant that survives on paper and `dark` is the one
      that survives on ink - the names describe the canvas, not the colour.
      Until now only the first two were wired up, because nothing on the page
      put accent-coloured TEXT on a dark surface. The reflection band does.
      Measured on #141414: cpgrams' #FE700E is 6.6:1 and Mike Tyson's
      #FF8D3C is 8.0:1, where their `light` variants are 1.6:1 and 1.3:1 -
      unreadable, which is what reusing --cs-accent-ink there would have got.
    */
    "--cs-accent-lit": a.dark ?? a.solid,
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
  /* website captures get browser chrome; see Project.caseFrame */
  const framed = project.caseFrame === "browser";

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

  /*
    The disciplines this project was, as tags.

    `tools` is Figma and Framer - what the work was made WITH, which is a
    different question from what it was. Nothing in the data answered the
    second one, so `services` is read first and the category stands in for it
    otherwise: every project has one, it is already written in the language of
    a discipline ("Website Design", "Brand Identity"), and it means the row
    renders on all twenty projects today rather than on the ones that get the
    new field authored.
  */
  const services = project.services?.length
    ? project.services
    : project.category
      ? [project.category]
      : [];

  /*
    The Challenge column takes the first authored paragraph and no more: this
    is the top of the page, opposite a one-line Role, and the full array runs
    to several paragraphs further down in Details. Projects with no `challenge`
    show Role alone rather than borrowing prose from elsewhere.
  */
  const challenge = project.challenge?.[0];

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
        <main
          className="cs hpParallax__stage"
          data-project={project.id}
          style={accentVars(project)}
        >
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
                <Link className="csBack" href="/work">
                  {/* A bare chevron, drawn rather than the &lsaquo; glyph -
                      which is a different weight in every font that has one,
                      and is missing outright from the trial cut this page is
                      set in. The shaft is gone with the circle that used to
                      hold it: at this size an arrow with a tail reads as an
                      icon, and a chevron reads as punctuation, which is what
                      it is doing in a line of text. */}
                  <span className="csBack__mark" aria-hidden>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 18 9 12l6-6" />
                    </svg>
                  </span>
                  <span className="csBack__label">Projects</span>
                </Link>
                {/*
                  The trail, not just the way back. "Projects" alone said where
                  the reader had been; naming the project after it says where
                  they are, which is what a reader arriving from a shared link
                  has no other way to confirm.

                  The separator is its own element rather than a character in
                  the label because it is not part of either name - it is
                  punctuation between them, and it is dimmed accordingly.
                */}
                <span className="csBack__sep" aria-hidden>/</span>
                <span className="csBack__here">{project.title}</span>
              </div>

              {/*
                The name is the title. The sentence is the line under it.

                Putting the headline in the h1 was the wrong read of the
                guide: its stage order is Title then Hook, two things, and I
                collapsed them into one. A case study opens with what the
                thing is called - that is what the reader came from the works
                grid looking for, and a fourteen-word sentence set at display
                size is a paragraph shouting rather than a name.

                The headline still does its job, one step down: it is the
                first sentence after the name, which is where a hook belongs.
              */}
              {/*
                Name on the left, classification on the right, on one line.

                The category used to sit in the breadcrumb row as a second
                eyebrow, which put the two smallest pieces of text on the page
                beside each other and left the title with nothing opposite it.
                Set against the title instead, it reads as a stamp on a cover
                sheet - what this is, and when - and gives the headline a right
                edge to be measured against.
              */}
              <div className="csHero__top" data-rise style={{ "--i": 1 } as CSSProperties}>
                <div className="csHero__id">
                  {/*
                    The name IS the mark here.

                    A logo chip used to sit above this line. It is gone by
                    request - and it was always working against the page: every
                    one of those assets is pure white, drawn for the dark tiles
                    on the works grid, so on this paper they needed a dark chip
                    built underneath them just to be visible at all. The project
                    name set large does the same job with none of that.
                  */}
                  <h1 className="csHero__title">{project.title}</h1>
                </div>
                <div className="csHero__stamp">
                  {/* the two lead disciplines only, so the stamp always holds
                      one line; the full list is in the Services row below */}
                  <p className="csHero__cat">{services.slice(0, 2).join(" | ")}</p>
                  <p className="csHero__year">{project.year}</p>
                </div>
              </div>

              {/*
                The headline does not appear here.

                It used to sit between the name and the paragraph at 16px,
                which was fine against a 19px lead and became a caption the
                moment the lead went to 24px - a line of type smaller than the
                body beneath it, which is hierarchy upside down. The structure
                this page follows is name, then paragraph. `headline` is still
                authored and still used for metadata; it is just not a third
                thing competing at the top of the page.
              */}

              <div
                className="csHero__intro"
                data-rise
                style={{ "--i": 2 } as CSSProperties}
              >
                {/* the authored lead wins: it is written to say what the
                    project is and who it is for, in the three lines this
                    layout is built around. story.intro is the first two
                    sentences of `description` and is what shows where no lead
                    has been written. */}
                {project.lead ? (
                  <p className="cs__body">{marked(project.lead)}</p>
                ) : (
                  story.intro.map((p, i) => (
                    <p className="cs__body" key={i}>
                      {marked(p)}
                    </p>
                  ))
                )}
              </div>

              {/* Directly under the paragraph, ahead of the brief.

                  It used to sit below Challenge and Role, which put the one
                  thing on this page a reader can ACT on at the bottom of a
                  block of reading - and below the fold on a laptop. The
                  sentence above it is what makes someone want to look at the
                  live site; the button belongs at the end of that sentence,
                  not four hundred words later. Its own design is untouched. */}
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

              {/*
                The facts, as a brief rather than as a list of pairs.

                Role, Year and Tools used to run as three key/value rows under
                the intro. Year has moved to the stamp beside the title, where
                it is read with the category it belongs to, and what is left is
                laid out the way a brief is: the disciplines as tags, then the
                problem and the part played in it, side by side.

                The labels carry their colons. They were once a real cost -
                the trial cut of Aeonik had no colon glyph, so each one
                rendered in General Sans mid-word - and were kept anyway
                because the reference has them. The full cut has since landed
                and the cost is gone; the colons simply render.
              */}
              {services.length ? (
                <div
                  className="csHero__brief"
                  data-rise
                  style={{ "--i": 7 } as CSSProperties}
                >
                  <h2 className="csHero__label">Services:</h2>
                  <ul className="csHero__tags">
                    {services.map((name) => (
                      <li className="csHero__tag" key={name}>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Tools had a row here and does not any more: this block is
                  the brief, and Figma is not a service anyone bought. The
                  field is still authored and still read further down. */}

              {/* the problem and the part played in it, read across rather
                  than down - they are one thought, not two sections */}
              <div
                className="csHero__cols"
                data-rise
                style={{ "--i": 9 } as CSSProperties}
              >
                {challenge ? (
                  <div className="csHero__col">
                    <h2 className="csHero__label">Challenge:</h2>
                    <p className="csHero__colBody">{marked(challenge)}</p>
                  </div>
                ) : null}
                <div className="csHero__col">
                  <h2 className="csHero__label">Role:</h2>
                  {/* `role` is a job title - "Web Designer" - and this column
                      is sized for the three lines of scope the reference puts
                      here. `roleNote` carries that sentence where it has been
                      written; the title stands alone where it has not, rather
                      than being padded out into a claim nobody made. */}
                  <p className="csHero__colBody">
                    {project.roleNote ? marked(project.roleNote) : project.role}
                  </p>
                </div>
              </div>

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

            {/*
              Everything from here to More Work is the board's ground.

              On a project with `caseBoardOnly` the board covers the same
              material as these sections do, in its own order, so running
              both is the argument made twice at two different paces. The
              board is placed after this block in source order, which is
              what puts it directly after the opening statement once these
              are gone.
            */}
            {story.details && !project.caseBoardOnly && !project.posterVolume ? (
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
                    frame={framed}
                  />
                  {/* the numbers that made the case, beside the case they
                      made: research shown anywhere else is an artefact, and
                      research shown here is an argument */}
                  {story.evidence.length ? (
                    <div className="csSec__evidence">
                      <Blocks groups={story.evidence} />
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/*
              The board goes here because the page counts its own sections,
              and this is the one the reader was sent to: Details is 02, so
              "after section 2" is the gap between it and whatever follows.
              Everything below renumbers itself, since `no` is a counter
              rather than a written-down number.
            */}
            {/*
              A board that IS the case study gets no heading and no gap.

              Where the board sits among the page's own sections it is one
              of them and takes a numbered head like the rest. Where it
              replaces them there is nothing left to number it against, and
              a rule, an "(02)", and the interval either side of them put
              three hundred pixels of empty paper between the end of the
              opening statement and the start of the work. The board's own
              cover does the job a section head would have done.
            */}
            {/* a volume is laid out as its own page; see PosterVolume */}
            {project.posterVolume ? (
              <section className="csSec csSec--board">
                <div className="csSec__body">
                  <PosterVolume volume={project.posterVolume} />
                </div>
              </section>
            ) : null}

            {project.caseBoard ? (
              <section
                className={`csSec${project.caseBoardOnly ? " csSec--board" : ""}`}
              >
                {project.caseBoardOnly ? null : (
                  <SectionHead no={++no} name="The full case study" />
                )}
                <div className="csSec__body">
                  <Board board={project.caseBoard} />
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
            {story.chapters.length && !project.caseBoardOnly
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
                      <Features items={chapter.items} frame={framed} />
                    </div>
                  </section>
                ))
              : null}

            {story.highlights.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="Highlights" />
                <div className="csSec__body">
                  <Features items={story.highlights} frame={framed} />
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
            {story.iteration.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="What I tried" />
                <div className="csSec__body">
                  <Blocks groups={story.iteration} />
                </div>
              </section>
            ) : null}

            {/* the visual system as a system, which is a different claim
                from a grid of finished screens */}
            {story.system.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="The system" />
                <div className="csSec__body">
                  <Blocks groups={story.system} />
                </div>
              </section>
            ) : null}

            {story.results && !project.caseBoardOnly ? (
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
            {story.reflection.length && !project.caseBoardOnly ? (
              <section className="csSec csSec--invert">
                <SectionHead no={++no} name="What it taught me" />
                <div className="csSec__body">
                  <Blocks groups={story.reflection} />
                </div>
              </section>
            ) : null}

            {/*
              A project that shows its whole board has already shown these.

              The gallery picks up whatever images the beats above did not
              use, which on a project with a board is a second pass over the
              same pictures - and the board's order was chosen by somebody
              while the gallery's is whatever survived a budget. Two of
              those, one after the other, is the page repeating itself.
            */}
            {story.gallery.length && !project.caseBoard ? (
              <section className="csSec">
                <SectionHead no={++no} name="Gallery" />
                <div className="csSec__body">
                  <MediaRows media={story.gallery} frame={framed} />
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
