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

/*
  /about — Aayush Visuals × the Mauricio Juba interaction school.

  One editorial composition, one artefact: the role block sits top-left,
  the name dominates the lower-left almost filling the viewport, a single
  horizontal metadata row runs along the bottom, and the living ASCII
  portrait owns the right side — bleeding from below the navbar down to
  the status bar and slipping UNDER the name's right edge (typography
  always wins the overlap). Near-black canvas with vignette + faded pixel
  clusters + film grain; the shared navbar/cursor/ruler system carries
  over so the page reads as the same product, different room.

  Status priority: SCROLLING > ASCII ACTIVE (portrait hover) >
  AVAILABLE (after first interaction) > OPEN FOR FULL-TIME OFFERS.
*/

const META_LINE = ["Product Design", "UI / UX", "Creative Development"];

const FACTS = [
  "4+ years designing digital products",
  "Open for full-time opportunities",
];

export default function AboutPageClient() {
  const [portraitHover, setPortraitHover] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const interacted = useRef(false);

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
      <PixelBackground />
      <Navbar />
      <MobileNav />
      <Cursor />
      <AboutRulers />

      {/* Full-screen background halftone matrix */}
      <div className="aboutPage__canvasBg">
        <AsciiPortrait src="/about/portrait.png" onHoverChange={onHoverChange} />
      </div>

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
                      {" "}
                      •{" "}
                    </i>
                  )}
                </span>
              ))}
            </p>
          </div>

          <h1 className="aboutPage__name" data-enter style={{ "--d": "0.2s" } as React.CSSProperties}>
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

        {/* placeholder column — the portrait renders in the full-screen
            canvas behind, centred on this zone */}
        <div className="aboutPage__right" />
      </main>

      <StatusBar status={status} />
    </div>
  );
}
