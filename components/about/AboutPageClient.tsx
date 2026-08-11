"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Reveals from "@/components/Reveals";
import AsciiPortrait from "./AsciiPortrait";
import StatusBar, { type AboutStatus } from "./StatusBar";
import PixelBackground from "./PixelBackground";
import AboutRulers from "./AboutRulers";
import CollagePanel from "./CollagePanel";
import ExtCta from "@/components/ExtCta";
import LogoStrip from "@/components/LogoStrip";
import Footer from "@/components/Footer";
import HomeContact from "@/components/HomeContact";
import Testimonials from "./Testimonials";

const META_LINE = ["UI/UX Design", "Design Systems", "Product Strategy"];

const FACTS = [
  "4+ years designing digital products",
  "Open for full-time opportunities",
];

const EDUCATION = [
  { icon: "G", title: "Google UX Design Certificate", place: "Google", year: "2024" },
  { icon: "/logos/education/ibm.webp", title: "Generative AI", place: "IBM", year: "2024" },
  { icon: "/logos/education/vit.webp", title: "Bachelor of Technology in Computer Science Engineering", titleShort: "B.Tech", place: "Vellore Institute of Technology, Vellore", year: "2023 - Present" },
  { icon: "/logos/education/dav.webp", title: "Higher Secondary School", place: "DAV Public School", year: "2020-2022" },
  { icon: "/logos/education/bishop-scott.webp", title: "Senior Secondary School", place: "Bishop Scott Boys' School", year: "2020" },
];

const TOOLKIT = [
  { name: "Figma", category: "Design", icon: "/logos/toolkit/figma.svg" },
  { name: "Claude", category: "Development", icon: "/logos/toolkit/claude.svg" },
  { name: "Antigravity", category: "Rapid Prototyping", icon: "/logos/toolkit/antigravity.svg" },
  { name: "NotebookLM", category: "Research", icon: "/logos/toolkit/notebooklm.svg" },
  { name: "VS Code • Neovim", category: "Coding", icon: "/logos/toolkit/vscode-neovim.svg" },
  { name: "Framer", category: "Web / Prototyping", icon: "/logos/toolkit/framer.svg" },
  { name: "Photoshop", category: "Image Editing", icon: "/logos/toolkit/photoshop.svg" },
  { name: "After Effects • Premiere", category: "Video / Motion Editing", icon: "/logos/toolkit/ae-premiere.svg" },
];

/*
  The five disciplines, laid out as a bento. `area` is the grid-area name in
  globals.css — the tiles are deliberately different sizes, and "ai" is the
  filled hero tile that anchors the composition.
*/
const COMPETENCIES = [
  {
    area: "ai",
    title: "AI & Intelligent Systems",
    note: "Conversational and assisted flows where the model is a material, not a bolted-on feature.",
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  },
  {
    area: "strategy",
    title: "Product & UX Strategy",
    note: "Framing, flows, and what not to build",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="3" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="21" />
        <line x1="3" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="21" y2="12" />
      </>
    ),
  },
  {
    area: "systems",
    title: "Design Systems & Scale",
    note: "Token libraries that hold their shape",
    icon: (
      <>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </>
    ),
  },
  {
    area: "research",
    title: "Research & Delivery",
    note: "Interviews that end in shipped screens",
    icon: (
      <>
        <path d="M2 12c2-4 6-7 10-7s8 3 10 7" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    area: "code",
    title: "Engineering & Code",
    note: "React, TypeScript, Framer Motion",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
  },
];

const SECTION_MARKS = [
  { label: "INTRO" },
  { label: "00 - PASSION" },
  { label: "01 - ABOUT ME" },
  { label: "02 - EDUCATION" },
  { label: "03 - FIELD WORK" },
  { label: "04 - SKILLS" },
  { label: "05 - TOOLS" },
  { label: "06 - KIND WORDS" },
  { label: "07 - CONTACT" },
  { label: "FOOTER" },
];

const EXPERIENCE = [
  /* descriptions are kept to roughly one rendered line: five of these have to
     share one viewport with the section header, and a three-line entry is
     what pushes the list past the fold */
  { title: "KPMG India (GovTech)", role: "Product Design Intern", year: "June 2026 – July 2026", desc: "Conversational flow for CPGRAMS, the national grievance chatbot, across 22+ Indian languages." },
  { title: "LayOver", role: "Product Designer", year: "2025 – 2026", desc: "End-to-end UX across 20+ screens for a lounge and food booking app, flow map to component library." },
  { title: "Mike Tyson Invitational", role: "UI/UX Designer", year: "Dec 2025 – Feb 2026", desc: "Turned the \"Iron Forge\" brand into an immersive ticketing and fight-card interface." },
  { title: "Riviera, VIT Vellore", role: "Design Manager", year: "Sep 2025 – Feb 2026", desc: "Defined the identity system and shipped the festival platform UI behind 500k+ visits." },
  { title: "Entrepreneurship Cell, VIT", role: "Head of Design", year: "May 2025 – April 2026", desc: "Mentored a 75+ member design team; the work drove a 22% increase in registrations." },
];

export default function AboutPageClient() {
  const [portraitHover, setPortraitHover] = useState(false);
  const [scrolling, setScrolling] = useState(false);
const [currentSection, setCurrentSection] = useState(SECTION_MARKS[0].label);
  const interacted = useRef(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 650);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("about-page-active");
    return () => {
      document.documentElement.classList.remove("about-page-active");
    };
  }, []);

  useEffect(() => {
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        let bestEl: Element | null = null;
        let bestRatio = 0;
        ratios.forEach((ratio, el) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestEl = el;
          }
        });
        if (bestEl) {
          const idx = sectionRefs.current.indexOf(bestEl as HTMLElement);
          if (idx !== -1) setCurrentSection(SECTION_MARKS[idx].label);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const onHoverChange = (h: boolean) => {
    if (h) interacted.current = true;
    setPortraitHover(h);
  };

  const status: AboutStatus = scrolling
    ? "SCROLLING"
    : portraitHover
      ? "ASCII ACTIVE"
      : interacted.current
        ? "AVAILABLE"
        : "OPEN FOR FULL-TIME OFFERS";

  return (
    <div className="aboutPage">
      <Navbar />
      <MobileNav position="top" />
      <Cursor />
      <Reveals />
      <div className="rails" aria-hidden />

      <div className="aboutPage__content">
        {/* ---- HERO (dark, 100svh, untouched) ---- */}
        <div className="aboutPage__hero" ref={(el) => { sectionRefs.current[0] = el; }}>
        <div className="aboutPage__bgMask" aria-hidden>
          <div className="aboutPage__bgMask--v">
            <PixelBackground />
          </div>
        </div>
        <AboutRulers />
        <div className="aboutPage__canvasBg">
          <AsciiPortrait src="/about/portrait.webp" onHoverChange={onHoverChange} />
        </div>
        <div className="aboutPage__heroSmoke" aria-hidden />
        <main className="aboutPage__main">
          <div className="aboutPage__left">
            <div>
              <p className="aboutPage__role" data-enter style={{ "--d": "0.05s" } as React.CSSProperties}>
                Product Designer and Design Engineer
              </p>
              <p className="aboutPage__meta" data-enter style={{ "--d": "0.13s" } as React.CSSProperties}>
                {META_LINE.map((m, i) => (
                  <span key={m}>
                    {m}
                    {i < META_LINE.length - 1 && (
                      <i className="aboutPage__metaDot" aria-hidden>
                        {" "}•{" "}
                      </i>
                    )}
                  </span>
                ))}
              </p>
            </div>
            <div className="aboutPage__bottom">
              <h1 className="aboutPage__name" data-enter style={{ "--d": "0.2s" } as React.CSSProperties}>
                <span className="aboutPage__iam">i am</span>
                <span className="aboutPage__nameLine1">Aayush</span>
                <span className="aboutPage__nameLine2">
                  Raj<span className="aboutPage__namePeriod">.</span>
                </span>
              </h1>
              <ul className="aboutPage__facts" data-enter style={{ "--d": "0.34s" } as React.CSSProperties}>
                {FACTS.map((f) => (
                  <li key={f}>
                    <i className="aboutPage__factMark" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="aboutPage__right" />
        </main>
      </div>

      {/* ---- SECTIONS BELOW HERO ---- */}

      {/* 1. Logo Strip */}
      <LogoStrip />

      {/* 2. Building with Passion */}
      <section className="aboutSection aboutSection--passion" ref={(el) => { sectionRefs.current[1] = el; }}>        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Building with Passion
          </span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__stage">
        <div className="aboutSection__inner">
          <h2 className="aboutSection__statement" data-reveal>
            I design products end to end, and the systems that hold them
            together.
          </h2>
          <p className="aboutSection__body" data-reveal style={{ "--rd": "0.08s" } as React.CSSProperties}>
            4+ years across UI/UX, brand identity and motion. I work from the
            first flow map to the last hover state, then build it for real in
            React and Framer Motion so nothing gets lost between the file and
            the browser.
          </p>
          <ExtCta href="#get-in-touch" data-reveal style={{ "--rd": "0.16s" } as React.CSSProperties}>
            Get in touch
          </ExtCta>
        </div>
        </div>
      </section>

      {/* 3. The collage panel */}
      <section className="aboutCollage" aria-label="About me" ref={(el) => { sectionRefs.current[2] = el; }}>
        {/* the global fixed .rails are dark-on-dark here, so this section
            carries its own pair — they follow --cl-ink, so they invert with
            the theme rather than being hard white */}
        <div className="railsLight" aria-hidden>
          <span className="railsLight__line railsLight__line--left" />
          <span className="railsLight__line railsLight__line--right" />
        </div>
        <div className="aboutSection__stage">
          <CollagePanel />
        </div>
      </section>

      {/* 4. Education */}
      <section className="aboutSection aboutSection--edu" ref={(el) => { sectionRefs.current[3] = el; }}>        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Education
          </span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__stage">
        <div className="aboutSection__grid">
          <div className="aboutSection__gridLeft">
            <h2 className="aboutSection__heading" data-reveal>education.</h2>
            <p className="aboutSection__desc" data-reveal style={{ "--rd": "0.08s" } as React.CSSProperties}>
              Computer science by degree, design by practice. The engineering
              core taught me how software is actually built; the certificates
              filled in the research craft.
            </p>
            <div className="aboutSection__bullets" data-reveal style={{ "--rd": "0.14s" } as React.CSSProperties}>
              <div className="aboutSection__bullet">
                <span className="aboutSection__bulletIcon" aria-hidden>+</span>
                Systems thinking from the engineering side
              </div>
              <div className="aboutSection__bullet">
                <span className="aboutSection__bulletIcon" aria-hidden>+</span>
                UX research and generative AI, studied formally
              </div>
            </div>
            <ExtCta href="#get-in-touch" data-reveal style={{ "--rd": "0.2s" } as React.CSSProperties}>
              Get in touch
            </ExtCta>
          </div>
          <ul className="aboutSection__gridRight">
            {EDUCATION.map((e, i) => (
              <li className="aboutSection__card" key={e.title} data-reveal style={{ "--rd": `${0.06 * i}s` } as React.CSSProperties}>
                <span className="aboutSection__cardIcon">
                  {e.icon.startsWith("/") ? (
                    <img src={e.icon} alt="" aria-hidden className="aboutSection__cardLogo" />
                  ) : (
                    e.icon
                  )}
                </span>
                <div className="aboutSection__cardInfo">
                  <span className="aboutSection__cardTitle">
                    {e.titleShort ? (
                      <>
                        <span className="aboutSection__cardTitleFull">{e.title}</span>
                        <span className="aboutSection__cardTitleShort">{e.titleShort}</span>
                      </>
                    ) : (
                      e.title
                    )}
                  </span>
                  <span className="aboutSection__cardPlace">{e.place}</span>
                </div>
                <span className="aboutSection__cardYear">{e.year}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </section>

      {/* 4. Purple Banner — sticky full-viewport image; sections below slide over it */}
      <div className="aboutBanner">
        <div className="aboutBanner__bg" aria-hidden />
        <div className="aboutBanner__glow" aria-hidden />
      </div>

      {/* Post-banner block: slides as one unit over the sticky banner */}
      <div className="aboutPostBanner">

      {/* 5. Experience */}
      <section className="aboutSection aboutSection--exp" ref={(el) => { sectionRefs.current[4] = el; }}>        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Field Work
          </span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__stage">
        <div className="aboutSection__grid">
          <div className="aboutSection__gridLeft">
            <h2 className="aboutSection__heading" data-reveal>experience.</h2>
            <p className="aboutSection__desc" data-reveal style={{ "--rd": "0.08s" } as React.CSSProperties}>
              A national government platform, a global boxing brand, and a
              college festival with half a million visits. Each one taught me
              something different about designing at scale.
            </p>
            <ExtCta href="#get-in-touch" data-reveal style={{ "--rd": "0.16s" } as React.CSSProperties}>
              Get in touch
            </ExtCta>
          </div>
          <ol className="aboutSection__gridRight">
            {EXPERIENCE.map((e, i) => (
              <li className="aboutSection__expItem" key={e.title} data-reveal style={{ "--rd": `${0.06 * i}s` } as React.CSSProperties}>
                <div className="aboutSection__expHead">
                  <div>
                    <h3 className="aboutSection__expTitle">{e.title}</h3>
                    <span className="aboutSection__expRole">{e.role}</span>
                  </div>
                  <span className="aboutSection__cardYear">{e.year}</span>
                </div>
                <p className="aboutSection__expDesc">{e.desc}</p>
              </li>
            ))}
          </ol>
        </div>
        </div>
      </section>

      {/* 6. Core Competencies */}
      <section className="aboutCompetencies" ref={(el) => { sectionRefs.current[5] = el; }}>        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Skills
          </span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__stage">
          {/*
            Bento. The heading is a tile rather than a banner above the grid,
            which is what stops the composition reading as "header plus card
            row". The AI tile is the filled one and spans 2x2; the rest sit
            around it at mixed sizes so no two rows repeat the same rhythm.
          */}
          <div className="bento">
            <div className="bento__tile bento__tile--head" data-reveal>
              <h2 className="bento__heading">core competencies.</h2>
              <p className="bento__sub">
                From the first research call to production-ready code.
              </p>
            </div>

            {COMPETENCIES.map((c, i) => (
              <article
                className={`bento__tile bento__tile--${c.area}${c.area === "ai" ? " bento__tile--filled" : ""}`}
                key={c.title}
                data-reveal
                style={{ "--rd": `${0.05 * (i + 1)}s` } as React.CSSProperties}
              >
                {c.area === "ai" && (
                  /* the hero tile's mark: concentric arcs with nodes riding
                     them, drawn rather than iconified so one tile in the grid
                     carries an actual image */
                  <svg className="bento__art" viewBox="0 0 200 140" aria-hidden>
                    <g fill="none" stroke="currentColor" strokeLinecap="round">
                      <circle cx="100" cy="132" r="34" strokeWidth="1.1" opacity=".5" />
                      <circle cx="100" cy="132" r="58" strokeWidth="1.1" opacity=".38" />
                      <circle cx="100" cy="132" r="82" strokeWidth="1.1" opacity=".26" />
                      <circle cx="100" cy="132" r="106" strokeWidth="1.1" opacity=".16" />
                      <path d="M100 132 62 78M100 132l46-42M100 132l-4-74" strokeWidth="1.3" opacity=".45" />
                    </g>
                    <g fill="currentColor">
                      <circle cx="62" cy="78" r="5.5" />
                      <circle cx="146" cy="90" r="4.5" opacity=".8" />
                      <circle cx="96" cy="58" r="6.5" />
                      <circle cx="100" cy="132" r="7" />
                    </g>
                  </svg>
                )}

                <svg
                  className="bento__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {c.icon}
                </svg>

                <h3 className="bento__title">{c.title}</h3>
                <p className="bento__note">{c.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Toolkit */}
      <section className="aboutToolkit" ref={(el) => { sectionRefs.current[6] = el; }}>        <div className="railsLight" aria-hidden>
          <span className="railsLight__line railsLight__line--left" />
          <span className="railsLight__line railsLight__line--right" />
        </div>
        <div className="aboutSection__topBar aboutToolkit__topBar">
          <span className="aboutSection__badge aboutToolkit__badge">
            <span className="aboutSection__badgeDot" />
            Tools
          </span>
          <span className="aboutSection__topRight aboutToolkit__topMeta">&copy;2026</span>
        </div>
        <div className="aboutSection__stage">
        <div className="aboutToolkit__head">
          <h2 className="aboutToolkit__label" data-reveal>my toolkit.</h2>
          <p className="aboutToolkit__sub" data-reveal style={{ "--rd": "0.08s" } as React.CSSProperties}>
            What is open on the second monitor most days, from the first
            wireframe to the deployed build.
          </p>
        </div>
        <ul className="aboutToolkit__grid">
          {TOOLKIT.map((t, i) => (
            <li className="aboutToolkit__card" key={t.name} data-reveal style={{ "--rd": `${0.045 * i}s` } as React.CSSProperties}>
              <img src={t.icon} alt="" aria-hidden className="aboutToolkit__icon" />
              <span className="aboutToolkit__name">{t.name}</span>
              <span className="aboutToolkit__cat">{t.category}</span>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {/* Parallax: testi + contact slide over sticky footer */}
      <div className="aboutParallax">
      <div className="aboutParallax__stage">
      {/* 8. Testimonials */}
      <div ref={(el) => { sectionRefs.current[7] = el; }}>
        <Testimonials />
      </div>

      {/* 9. Contact */}
      <div id="get-in-touch" ref={(el) => { sectionRefs.current[8] = el; }}>
        <HomeContact />
      </div>

      </div>{/* end .aboutParallax__stage */}

      {/* 10. Footer — the wrapper (not .footer) is the sticky element:
          sticky can only move within its direct parent, and this wrapper's
          parent .aboutParallax spans stage + footer */}
      <div className="aboutParallax__footerWrap" ref={(el) => { sectionRefs.current[9] = el; }}>
        <Footer />
      </div>
      </div>{/* end .aboutParallax */}

      </div> {/* end .aboutPostBanner */}
    </div>

    <StatusBar status={status} section={currentSection} />
  </div>
  );
}
