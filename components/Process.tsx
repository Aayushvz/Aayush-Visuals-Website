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
