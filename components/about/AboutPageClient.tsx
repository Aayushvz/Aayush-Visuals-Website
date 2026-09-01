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
import LogoStrip from "@/components/LogoStrip";
import Footer from "@/components/Footer";
import HomeContact from "@/components/HomeContact";
import AboutStory, { AboutStoryLower } from "./AboutStory";
import IntroScene from "./IntroScene";
import Capabilities from "@/components/Capabilities";

const META_LINE = ["UI/UX Design", "Design Systems", "Product Strategy"];

const FACTS = [
  "5+ years designing digital products",
  "Open for full-time opportunities",
];

const SECTION_MARKS = [
  { label: "INTRO" },
  { label: "01 - THE DESIGNER" },
  { label: "02 - BEGINNINGS" },
  { label: "03 - THE JOURNEY" },
  { label: "04 - WHAT I DO" },
  { label: "05 - SELECTED WORK" },
  { label: "06 - CONTACT" },
  { label: "FOOTER" },
];

export default function AboutPageClient() {
  const [portraitHover, setPortraitHover] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  /* the telemetry bar is the hero's own instrument panel, so it lives and
     dies with the hero rather than following you down the whole page */
  const [heroOnScreen, setHeroOnScreen] = useState(true);
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
    const hero = sectionRefs.current[0];
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroOnScreen(entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(hero);
    return () => io.disconnect();
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

  /* one helper instead of ten inline closures, and the only thing the story
     components need to know about the status bar */
  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

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

      {/* the client marquee sits directly under the hero */}
      <LogoStrip />

      {/*
        Then the story opens. One pinned scene holding two compositions: the
        lead block rises in and lifts away while the info panels are already
        arriving underneath it, so the two overlap rather than following one
        another as separate sections.
      */}
      <IntroScene sectionRef={setSectionRef(1)} />

      {/*
        The story. Acts 01-02 sit above the sticky banner; the banner is a
        full-viewport interlude, and everything after it slides up over the
        banner as one block, which is what makes the transition into the
        journey read as a scene change rather than another section boundary.
      */}
      <AboutStory sectionRef={setSectionRef} />

      {/* Skills sits where the banner interlude used to. The banner was a
          sticky full-viewport image the rest of the story slid over; this is
          a 3.5-viewport section that pins and deals internally, so it simply
          occupies the slot in flow instead. */}
      <Capabilities />

      <div className="aboutPostBanner">
        <AboutStoryLower sectionRef={setSectionRef} />

        {/* contact slides over the sticky footer */}
        <div className="aboutParallax">
          <div className="aboutParallax__stage">
            <div id="get-in-touch" ref={setSectionRef(6)}>
              <HomeContact />
            </div>
          </div>

          {/* the wrapper (not .footer) is the sticky element: sticky can only
              move within its direct parent, and this wrapper's parent spans
              stage + footer */}
          <div className="aboutParallax__footerWrap" ref={setSectionRef(7)}>
            <Footer />
          </div>
        </div>
      </div>
    </div>

    <StatusBar status={status} section={currentSection} visible={heroOnScreen} />
  </div>
  );
}
