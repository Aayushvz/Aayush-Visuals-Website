"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import PageLink from "@/components/PageLink";
import AsciiPortrait from "./AsciiPortrait";
import StatusBar, { type AboutStatus } from "./StatusBar";
import PixelBackground from "./PixelBackground";
import AboutRulers from "./AboutRulers";
import LogoStrip from "@/components/LogoStrip";
import Footer from "@/components/Footer";
import { Scribble } from "@/components/doodles";

const META_LINE = ["UI/UX Design", "Design Systems", "Product Strategy"];

const FACTS = [
  "4+ years designing digital products",
  "Open for full-time opportunities",
];

const EDUCATION = [
  { icon: "G", title: "Google UX Design Certificate", place: "Google", year: "2024" },
  { icon: "/logos/education/ibm.png", title: "Generative AI", place: "IBM", year: "2024" },
  { icon: "/logos/education/vit.png", title: "Bachelor of Technology in Computer Science Engineering", titleShort: "B.Tech", place: "Vellore Institute of Technology, Vellore", year: "2023 - Present" },
  { icon: "/logos/education/dav.png", title: "Higher Secondary School", place: "DAV Public School", year: "2020-2022" },
  { icon: "/logos/education/bishop-scott.png", title: "Senior Secondary School", place: "Bishop Scott Boys' School", year: "2020" },
];

const TOOLKIT = [
  { name: "Figma", category: "Design", icon: "/logos/toolkit/figma.svg" },
  { name: "Claude", category: "Development", icon: "/logos/toolkit/claude.svg" },
  { name: "Antigravity", category: "Rapid Prototyping", icon: "/logos/toolkit/antigravity.svg" },
  { name: "NotebookLM", category: "Research", icon: "/logos/toolkit/notebooklm.svg" },
  { name: "VS Code • Neovim", category: "Coding", icon: "/logos/toolkit/vscode-neovim.svg" },
  { name: "FigJam", category: "Workspace / Collaboration", icon: "/logos/toolkit/figjam.svg" },
  { name: "Photoshop", category: "Image Editing", icon: "/logos/toolkit/photoshop.svg" },
  { name: "After Effects • Premiere", category: "Video / Motion Editing", icon: "/logos/toolkit/ae-premiere.svg" },
];

const SECTION_MARKS = [
  { label: "INTRO" },
  { label: "00 - PASSION" },
  { label: "01 - EDUCATION" },
  { label: "02 - FIELD WORK" },
  { label: "03 - SKILLS" },
  { label: "04 - TOOLS" },
  { label: "05 - CONTACT" },
  { label: "FOOTER" },
];

const EXPERIENCE = [
  { title: "KPMG India (GovTech)", role: "Product Design Intern", year: "June 2026 – July 2026", desc: "Designed the conversational flow for CPGRAMS, a national grievance chatbot with 22+ language support." },
  { title: "LayOver", role: "Product Designer", year: "2025 – 2026", desc: "Owned end-to-end UX design across 20+ screens for a lounge and food booking app." },
  { title: "Mike Tyson Invitational", role: "UI/UX Designer", year: "Dec 2025 – Feb 2026", desc: "Spearheaded the MTI platform design, translating the \"Iron Forge\" brand into an immersive UI." },
  { title: "Riviera, VIT Vellore", role: "Design Manager", year: "Sep 2025 – Feb 2026", desc: "Defined the complete visual identity system and delivered the festival platform UI under 500k+ visits." },
  { title: "Entrepreneurship Cell, VIT", role: "Head of Design", year: "May 2025 – April 2026", desc: "Managed and mentored a 75+ member design team, driving a 22% increase in registrations." },
];

export default function AboutPageClient() {
  const [portraitHover, setPortraitHover] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
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
      <MobileNav />
      <Cursor />
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
          <AsciiPortrait src="/about/portrait.png" onHoverChange={onHoverChange} />
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
      <section className="aboutSection aboutSection--passion" ref={(el) => { sectionRefs.current[1] = el; }}>
        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Building with Passion
          </span>
          <span className="aboutSection__topCenter">(AV&reg; - 00)</span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__inner">
          <h2 className="aboutSection__statement">
            Product Designer specializing in end-to-end design
            and scalable design systems.
          </h2>
          <a href="#get-in-touch" className="aboutSection__cta">
            <span className="aboutSection__ctaArrow">&#x2192;</span>
            Get in touch
          </a>
          <p className="aboutSection__body">
            4+ years across UI/UX, branding, and motion, building
            with React and Framer Motion.
          </p>
        </div>
      </section>

      {/* 3. Education */}
      <section className="aboutSection aboutSection--edu" ref={(el) => { sectionRefs.current[2] = el; }}>
        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Education
          </span>
          <span className="aboutSection__topCenter">(AV&reg; - 01)</span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__grid">
          <div className="aboutSection__gridLeft">
            <h2 className="aboutSection__heading">education.</h2>
            <p className="aboutSection__desc">
              A journey shaped by curiosity, creative
              excellence, and impactful results.
            </p>
            <div className="aboutSection__bullets">
              <div className="aboutSection__bullet">
                <span className="aboutSection__bulletIcon">+</span>
                Foundations of Knowledge, Fuel for Creativity
              </div>
              <div className="aboutSection__bullet">
                <span className="aboutSection__bulletIcon">+</span>
                Shaping Skills, Inspiring Ambitions
              </div>
            </div>
            <a href="#get-in-touch" className="aboutSection__cta">
              <span className="aboutSection__ctaArrow">&#x2192;</span>
              Get in touch
            </a>
          </div>
          <div className="aboutSection__gridRight">
            {EDUCATION.map((e) => (
              <div className="aboutSection__card" key={e.title}>
                <span className="aboutSection__cardIcon">
                  {e.icon.startsWith("/") ? (
                    <img src={e.icon} alt={e.place} className="aboutSection__cardLogo" />
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
              </div>
            ))}
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
      <section className="aboutSection aboutSection--exp" ref={(el) => { sectionRefs.current[3] = el; }}>
        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Field Work
          </span>
          <span className="aboutSection__topCenter">(AV&reg; - 02)</span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutSection__grid">
          <div className="aboutSection__gridLeft">
            <h2 className="aboutSection__heading">experience.</h2>
            <p className="aboutSection__desc">
              My expertise ensures every project is executed
              with precision and creativity.
            </p>
            <a href="#get-in-touch" className="aboutSection__cta">
              <span className="aboutSection__ctaArrow">&#x2192;</span>
              Get in touch
            </a>
          </div>
          <div className="aboutSection__gridRight">
            {EXPERIENCE.map((e) => (
              <div className="aboutSection__expItem" key={e.title}>
                <div className="aboutSection__expHead">
                  <div>
                    <span className="aboutSection__expTitle">{e.title}</span>
                    <span className="aboutSection__expRole">{e.role}</span>
                  </div>
                  <span className="aboutSection__cardYear">{e.year}</span>
                </div>
                <p className="aboutSection__expDesc">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Core Competencies */}
      <section className="aboutCompetencies" ref={(el) => { sectionRefs.current[4] = el; }}>
        <div className="aboutSection__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Skills
          </span>
          <span className="aboutSection__topCenter">(AV&reg; - 03)</span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <h2 className="aboutCompetencies__label">core competencies.</h2>
        <p className="aboutCompetencies__sub">The disciplines I bring to every project, from research to production-ready code.</p>
        <div className="aboutCompetencies__list">
          <div className="aboutCompetencies__row">
            <svg className="aboutCompetencies__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span className="aboutCompetencies__title">AI & Intelligent Systems</span>
          </div>
          <div className="aboutCompetencies__row">
            <svg className="aboutCompetencies__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/></svg>
            <span className="aboutCompetencies__title">Product & UX Strategy</span>
          </div>
          <div className="aboutCompetencies__row">
            <svg className="aboutCompetencies__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
            <span className="aboutCompetencies__title">Systems & Scale</span>
          </div>
          <div className="aboutCompetencies__row">
            <svg className="aboutCompetencies__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2-4 6-7 10-7s8 3 10 7"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="aboutCompetencies__title">Research & Delivery</span>
          </div>
          <div className="aboutCompetencies__row">
            <svg className="aboutCompetencies__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span className="aboutCompetencies__title">Engineering & Code</span>
          </div>
        </div>
      </section>

      {/* 7. Toolkit */}
      <section className="aboutToolkit" ref={(el) => { sectionRefs.current[5] = el; }}>
        <div className="railsLight" aria-hidden>
          <span className="railsLight__line railsLight__line--left" />
          <span className="railsLight__line railsLight__line--right" />
        </div>
        <div className="aboutSection__topBar aboutToolkit__topBar">
          <span className="aboutSection__badge aboutToolkit__badge">
            <span className="aboutSection__badgeDot" />
            Tools
          </span>
          <span className="aboutSection__topCenter aboutToolkit__topMeta">(AV&reg; - 04)</span>
          <span className="aboutSection__topRight aboutToolkit__topMeta">&copy;2026</span>
        </div>
        <h2 className="aboutToolkit__label">my toolkit.</h2>
        <p className="aboutToolkit__sub">The tools I rely on daily to design, prototype, and ship.</p>
        <div className="aboutToolkit__grid">
          {TOOLKIT.map((t) => (
            <div className="aboutToolkit__card" key={t.name}>
              <img src={t.icon} alt={t.name} className="aboutToolkit__icon" />
              <span className="aboutToolkit__name">{t.name}</span>
              <span className="aboutToolkit__cat">{t.category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Contact */}
      <section className="aboutContact" id="get-in-touch" ref={(el) => { sectionRefs.current[6] = el; }}>
        <div className="aboutSection__topBar aboutContact__topBar">
          <span className="aboutSection__badge">
            <span className="aboutSection__badgeDot" />
            Contact
          </span>
          <span className="aboutSection__topCenter">(AV&reg; - 05)</span>
          <span className="aboutSection__topRight">&copy;2026</span>
        </div>
        <div className="aboutContact__inner">
          <div className="aboutContact__left">
            <div className="aboutContact__headingWrap">
              <h2 className="aboutContact__heading">get in touch.</h2>
              <Scribble className="aboutContact__scribble" />
            </div>
            <p className="aboutContact__desc">
              Have a project in mind or just want to say hello?
              Drop me a message and I&#39;ll get back to you soon.
            </p>
            <div className="aboutContact__socials">
              <a href="https://www.behance.net/AAYUSHVISUALS" target="_blank" rel="noreferrer" className="aboutContact__social">Behance</a>
              <a href="https://www.instagram.com/aayush.visuals" target="_blank" rel="noreferrer" className="aboutContact__social">Instagram</a>
              <a href="https://www.linkedin.com/in/aayushvz" target="_blank" rel="noreferrer" className="aboutContact__social">LinkedIn</a>
            </div>
          </div>
          <form
            className="aboutContact__form"
            action="https://formsubmit.co/ajax/aayushvisuals@gmail.com"
            method="POST"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setContactStatus("sending");
              try {
                const res = await fetch(form.action, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                if (res.ok) {
                  setContactStatus("sent");
                  form.reset();
                  setTimeout(() => setContactStatus("idle"), 3000);
                } else {
                  setContactStatus("error");
                }
              } catch {
                setContactStatus("error");
              }
            }}
          >
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <div className="aboutContact__field">
              <label className="aboutContact__label" htmlFor="contact-name">Name</label>
              <div className="aboutContact__inputWrap">
                <input className="aboutContact__input" type="text" id="contact-name" name="name" required placeholder="Your name" />
              </div>
            </div>
            <div className="aboutContact__field">
              <label className="aboutContact__label" htmlFor="contact-email">Email</label>
              <div className="aboutContact__inputWrap">
                <input className="aboutContact__input" type="email" id="contact-email" name="email" required placeholder="you@example.com" />
              </div>
            </div>
            <div className="aboutContact__field">
              <label className="aboutContact__label" htmlFor="contact-message">Message</label>
              <div className="aboutContact__inputWrap">
                <textarea className="aboutContact__textarea" id="contact-message" name="message" required placeholder="Tell me about your project..." rows={5} />
              </div>
            </div>
            <button className="aboutContact__submit" type="submit" disabled={contactStatus === "sending"}>
              <span className="aboutContact__submitText">
                {contactStatus === "sent"
                  ? "Sent"
                  : contactStatus === "sending"
                    ? "Sending"
                    : contactStatus === "error"
                      ? "Something went wrong, try again"
                      : "Send Message"}
              </span>
              {contactStatus === "sent" ? (
                <svg className="aboutContact__submitCheck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="4 12 9 17 20 6" />
                </svg>
              ) : (
                <span className="aboutContact__submitArrow" aria-hidden>&#x2192;</span>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* 9. Footer */}
      <div ref={(el) => { sectionRefs.current[7] = el; }}>
        <Footer />
      </div>

      </div> {/* end .aboutPostBanner */}
    </div>

    <StatusBar status={status} section={currentSection} />
  </div>
  );
}
