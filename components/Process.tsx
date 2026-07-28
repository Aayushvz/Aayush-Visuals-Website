"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Discover",
    sub: "First, I listen.",
    desc: "Deep research into goals, users, and constraints through stakeholder interviews, competitor audits, and brand analysis.",
    tags: ["USER RESEARCH", "AUDIT", "STRATEGY"],
  },
  {
    num: "02",
    title: "Design",
    sub: "Then, I craft.",
    desc: "Iterative visual exploration with tight feedback loops until every detail is sharp, considered, and true to the vision.",
    tags: ["VISUAL IDENTITY", "PROTOTYPE", "MOTION"],
  },
  {
    num: "03",
    title: "Deliver",
    sub: "Finally, I ship.",
    desc: "Production-ready assets with detailed specs, dev handoff documentation, QA checks, and post-launch support baked in.",
    tags: ["DEV HANDOFF", "QA", "LAUNCH"],
  },
];

/* Gradient tiles: soft hue per step, faint concentric rings, frosted
   glowing outline icon — compass / layers / paper plane */
const ARTWORKS = [
  {
    cls: "discover",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" />
      </svg>
    ),
  },
  {
    cls: "design",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </svg>
    ),
  },
  {
    cls: "deliver",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
    ),
  },
];

export default function Process() {
  const wrapperRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [cardsVisible, setCardsVisible] = useState(0);

  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const progress =
        scrollable <= 0 ? 1 : Math.max(0, Math.min(1, -rect.top / scrollable));

      /* discrete — React bails when the value is unchanged, so this only
         re-renders at the three card thresholds */
      setCardsVisible(progress >= 0.65 ? 3 : progress >= 0.35 ? 2 : progress >= 0.02 ? 1 : 0);

      const scale =
        progress < 0.02 ? 0 :
        progress < 0.35 ? 0.05 + (progress - 0.02) / 0.33 * 0.43 :
        progress < 0.65 ? 0.48 + (progress - 0.35) / 0.30 * 0.46 :
        1;

      /* continuous — written straight to the DOM. Held in React state this
         re-rendered the entire section (every card, tile and SVG filter)
         on every scroll event, which was the section's main scroll cost. */
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${scale})`;
      if (tipRef.current) {
        tipRef.current.style.left = `${scale * 100}%`;
        tipRef.current.style.opacity = scale > 0.01 && scale < 0.99 ? "1" : "0";
      }
    };

    /* rAF-throttled: scroll fires far more often than the screen refreshes,
       and this handler reads layout (getBoundingClientRect/offsetHeight) */
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className={`process${cardsVisible > 0 ? " process--active" : ""}`} ref={wrapperRef}>
      <div className="process__sticky">
        <div className="process__brushTop" aria-hidden>
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
          <svg className="process__brushSvg--mobile" viewBox="0 0 1440 72" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* two-band fractal noise: low horizontal freq = broad tears,
                  high vertical freq = fine dry-brush fibres; strong displace
                  turns the base edge into a torn-paper / dry-brush stroke */}
              <filter id="processBrushFilterMobile" x="-8%" y="-700%" width="116%" height="1500%">
                <feTurbulence type="fractalNoise" baseFrequency="0.019 0.13" numOctaves="4" seed="9" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            </defs>
            <path
              d="M0,-500 L1440,-500 L1440,72 C1400,54 1360,47 1320,44 C1280,41 1240,46 1200,43 C1160,40 1120,46 1080,42 C1040,38 1000,45 960,41 C920,38 880,44 840,41 C800,37 760,43 720,39 C680,36 640,43 600,39 C560,36 520,42 480,38 C440,35 400,41 360,38 C320,34 280,40 240,37 C200,33 160,40 120,36 C80,49 40,62 0,72 Z"
              fill="#1a1a1a"
              filter="url(#processBrushFilterMobile)"
            />
          </svg>
          <div className="process__brushDots" />
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
            Idea to impact, every step.
          </h2>

          <div className={`procCards${cardsVisible > 0 ? " procCards--visible" : ""}`}>
            <div
              className="procLine"
              ref={lineRef}
              style={{ transform: "scaleX(0)" }}
              aria-hidden
            />
            <div
              className="procTip"
              ref={tipRef}
              style={{ left: "0%", opacity: 0 }}
              aria-hidden
            />

            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`procCard${cardsVisible > i ? " procCard--visible" : ""}`}
              >
                <div className="procCard__visual" aria-hidden>
                  <div className={`procTile procTile--${ARTWORKS[i].cls}`}>
                    <svg className="procTile__rings" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
                      <g>
                        <circle cx="160" cy="95" r="46" />
                        <circle cx="160" cy="95" r="82" />
                        <circle cx="160" cy="95" r="118" />
                        <circle cx="160" cy="95" r="154" />
                        <circle cx="160" cy="95" r="190" />
                      </g>
                    </svg>
                    <div className="procTile__icon">{ARTWORKS[i].icon}</div>
                  </div>
                </div>

                <div className="procCard__track">
                  <div className="procCard__dot">
                    <span>{i + 1}</span>
                  </div>
                </div>

                <div className="procCard__content">
                  <p className="procCard__sub">{step.sub}</p>
                  <h3 className="procCard__title">{step.title}</h3>
                  <p className="procCard__desc">{step.desc}</p>
                  <div className="procCard__tags">
                    {step.tags.map((tag) => (
                      <span key={tag} className="procCard__tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
