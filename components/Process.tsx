"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Discover",
    desc: "Deep-dive into goals, users, and constraints. Stakeholder interviews, desk research, and audit.",
    tags: ["USER RESEARCH", "SITE AUDIT", "COMPETITOR ANALYSIS"],
  },
  {
    num: "02",
    title: "Define",
    desc: "Frame the problem clearly. Strategy, positioning, and a shared creative brief before anything visual.",
    tags: ["CREATIVE BRIEF", "MOODBOARD", "BRAND DIRECTION"],
  },
  {
    num: "03",
    title: "Design",
    desc: "Explore, prototype, and craft. Iterative rounds with tight feedback loops until sharp and considered.",
    tags: ["VISUAL IDENTITY", "WEB DESIGN", "PROTOTYPE"],
  },
  {
    num: "04",
    title: "Deliver",
    desc: "Ship production-ready assets with detailed specs. QA, handoff, and launch support baked in.",
    tags: ["DEV HANDOFF", "QUALITY ASSURANCE", "LAUNCH"],
  },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      className={`process${visible ? " process--visible" : ""}`}
      ref={sectionRef}
    >
      {/* Rough brush-stroke edge at top — dark fill flows from Statement above,
          SVG turbulence filter roughens the bottom edge into an organic texture */}
      <div className="process__brushTop" aria-hidden>
        {/* Path corners anchor at y=140 (full SVG height) so turbulence displacement
            can never expose cream background at the left/right edges */}
        {/* Desktop: rough multi-wave brush, 100px tall */}
        <svg className="process__brushSvg--desktop" viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="processBrushFilter" x="-5%" y="-600%" width="110%" height="1300%">
              <feTurbulence type="fractalNoise" baseFrequency="0.055 0.07" numOctaves="5" seed="31" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <path
            d="M0,-500 L1440,-500 L1440,100 C1400,75 1360,64 1320,60 C1280,56 1240,61 1200,58 C1160,55 1120,59 1080,56 C1040,54 1000,58 960,55 C920,52 880,56 840,54 C800,51 760,55 720,52 C680,49 640,54 600,51 C560,48 520,52 480,49 C440,46 400,51 360,48 C320,45 280,49 240,46 C200,44 160,48 120,45 C80,64 40,80 0,100 Z"
            fill="#1a1a1a"
            filter="url(#processBrushFilter)"
          />
        </svg>
        {/* Mobile: gentle single-wave brush, 60px tall, less displacement */}
        <svg className="process__brushSvg--mobile" viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="processBrushFilterMobile" x="-5%" y="-600%" width="110%" height="1300%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04 0.055" numOctaves="3" seed="31" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <path
            d="M0,-500 L1440,-500 L1440,60 C1100,38 800,28 600,32 C400,36 200,44 0,60 Z"
            fill="#1a1a1a"
            filter="url(#processBrushFilterMobile)"
          />
        </svg>
        {/* Dot grid above the SVG fill — same texture as Statement section */}
        <div className="process__brushDots" />
        {/* Light rails over the dark brush area */}
        <span className="process__brushRail process__brushRail--left" />
        <span className="process__brushRail process__brushRail--right" />
      </div>

      <div className="process__rails" aria-hidden>
        <span className="process__rail process__rail--left" />
        <span className="process__rail process__rail--right" />
      </div>

      <div className="process__inner">
        <div className="process__marker">
          <span className="process__markerNum">03</span>
          <span className="process__markerLabel">Process</span>
        </div>
        <h2 className="process__heading">
          Idea to impact,
          <br />
          every step.
        </h2>

        <div className="process__list">
          {STEPS.map((step, i) => (
            <div
              className="process__step"
              key={step.num}
              style={{ "--step-i": i } as React.CSSProperties}
            >
              <div className="process__stepLeft">
                <span className="process__num">{step.num}</span>
                <h3 className="process__title">{step.title}</h3>
              </div>
              <div className="process__stepRight">
                <p className="process__desc">{step.desc}</p>
                <div className="process__tags">
                  {step.tags.map((tag) => (
                    <span className="process__tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
