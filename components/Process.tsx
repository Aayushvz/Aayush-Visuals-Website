"use client";
import { useEffect, useRef, useState } from "react";
import ExtCta from "./ExtCta";

/*
  How a product gets made, as a dial.

  What this replaced: one horizontal dimension line with three stations hung
  off it — Discover / Design / Deliver as three columns of body copy. It was
  honest but flat, and it was describing an engagement rather than the work:
  three paragraphs of what a client can expect to receive. A reader had to
  get through all three before anything came into focus.

  What it is now: the seven things that actually happen between a blank file
  and a shipped product, set clockwise around a ruled dial in the order they
  happen. The claim sits in the middle with the one action attached to it. A
  reader gets the shape of it at a glance and can stop there.

  The dial keeps the section inside the site's own language rather than
  importing a halo diagram wholesale. It is a measuring instrument — minor
  ticks every 5 degrees, accent ticks where a stage begins — which is the
  same drawn-annotation vocabulary as the fixed page rails and the About
  page's rulers. It fades out to the left rather than being drawn as a
  partial arc, so the geometry underneath stays a full circle and the
  satellites are all placed against the same complete field.

  Sequence is real content here, so it is in the geometry: the satellites run
  clockwise from the top, the purple lead sweeps the ring once on entry to
  teach that direction, and the tile colours run warm → violet → green so the
  three stages of the work read as three stretches of the arc without a
  legend underneath having to say so.

  Motion is one orchestrated entrance (ticks sweep, satellites deal clockwise
  behind them) plus a slow ambient drift. It runs off an IntersectionObserver
  rather than scroll position, so the section still costs no scroll distance
  and the parallax handoff to Capabilities below is untouched.
*/

/*
  Satellites, in the order the work happens.

  px / py are fractions of the polar field's two radii (see --hx / --hy), not
  pixels: the field is an ellipse rather than a circle because the pane is a
  100vh sticky and there is far more room sideways than there is down.

  `side` is which edge of the pill is pinned to that point — pills on the
  left of the dial grow leftwards, pills on the right grow rightwards, so
  nothing reaches back across the headline.

  `tone` is the tile gradient. Two warm, three violet, two green, in that
  order round the clock — the grouping is carried by the sequence.

  mx / my are the phone's own coordinates.

  A phone keeps the dial, but the dial moves left of centre and every
  satellite has to fan out into the space on its right — there is nowhere
  near enough width to ring it. Same clockwise order, same anchor rule, read
  as a C rather than a circle. They are separate numbers rather than a
  transform of px / py because no single transform produces a usable fan: the
  arrangement is genuinely different, not the same one squashed.

  `short` is the label at that size. "Framing the real problem" beside a dial
  on a 375px screen leaves about 80px for the words, which is three lines of
  11px type per chip. The full labels are still what the dial carries
  everywhere it has room for them.
*/
const STEPS = [
  { label: "Research and interviews", short: "Research", tone: "amber", px: 0.22, py: -0.93, side: "l", mx: -0.15, my: -1.15 },
  { label: "Framing the real problem", short: "Framing", tone: "orange", px: 0.68, py: -0.29, side: "l", mx: 0.55, my: -0.92 },
  { label: "Flows and wireframes", short: "Wireframes", tone: "violet", px: 0.64, py: 0.44, side: "l", mx: 1.0, my: -0.42 },
  { label: "A design system", short: "Systems", tone: "indigo", px: 0.03, py: 0.99, side: "l", mx: 1.08, my: 0.1 },
  { label: "Prototype and testing", short: "Prototype", tone: "plum", px: -0.56, py: 0.61, side: "r", mx: 0.95, my: 0.62 },
  { label: "Build and handoff", short: "Handoff", tone: "emerald", px: -0.62, py: -0.06, side: "r", mx: 0.45, my: 1.02 },
  { label: "Ship, measure, iterate", short: "Shipping", tone: "teal", px: -0.48, py: -0.75, side: "r", mx: -0.2, my: 1.32 },
] as const;

/* One glyph per satellite, in DOM order with STEPS. Drawn rather than
   imported: at 17px on a 31px tile, a stroked outline in white stays legible
   where a filled pictogram turns into a blob. */
const GLYPHS = [
  /* research and interviews — two voices */
  <>
    <path d="M3 6.6A2.6 2.6 0 0 1 5.6 4h7.8A2.6 2.6 0 0 1 16 6.6v3.8a2.6 2.6 0 0 1-2.6 2.6H8.3l-3.5 2.6V13H5.6A2.6 2.6 0 0 1 3 10.4z" />
    <path d="M18.4 8.4h.2A2.4 2.4 0 0 1 21 10.8v4.4a2.4 2.4 0 0 1-2.4 2.4h-.4v2.5l-3.3-2.5h-3.3" />
  </>,
  /* framing the real problem — crop marks closing on one point */
  <>
    <path d="M4 8.6V6a2 2 0 0 1 2-2h2.6" />
    <path d="M20 8.6V6a2 2 0 0 0-2-2h-2.6" />
    <path d="M4 15.4V18a2 2 0 0 0 2 2h2.6" />
    <path d="M20 15.4V18a2 2 0 0 1-2 2h-2.6" />
    <circle cx="12" cy="12" r="2.2" />
  </>,
  /* flows and wireframes — one screen leading to the next */
  <>
    <rect x="2.6" y="4.4" width="8" height="6.4" rx="1.6" />
    <rect x="13.4" y="13.2" width="8" height="6.4" rx="1.6" />
    <path d="M10.6 7.6h4.2a2.6 2.6 0 0 1 2.6 2.6v3" />
    <path d="m15.2 11.2 2.2 2.2 2.2-2.2" />
  </>,
  /* a design system — the kit the screens are built from */
  <>
    <rect x="3" y="4" width="7.6" height="16" rx="1.6" />
    <rect x="13.4" y="4" width="7.6" height="6.6" rx="1.6" />
    <rect x="13.4" y="13.4" width="7.6" height="6.6" rx="1.6" />
  </>,
  /* prototype and testing — run it and watch */
  <>
    <rect x="3" y="4.6" width="18" height="14.8" rx="3.2" />
    <path d="m10.3 9.6 4.6 2.4-4.6 2.4z" />
  </>,
  /* build and handoff — the file a developer opens */
  <>
    <path d="m8.2 8.4-3.8 3.8 3.8 3.8" />
    <path d="m15.8 8.4 3.8 3.8-3.8 3.8" />
    <path d="m13.4 4.8-2.8 14.4" />
  </>,
  /* ship, measure, iterate — the line that tells you whether it worked */
  <>
    <path d="M3.8 19.6h16.4" />
    <path d="m5.2 15.4 4.6-4.6 3.4 3.4 6-6.4" />
    <path d="M14.8 7.8h4.4v4.4" />
  </>,
];

/* The dial. 5-degree minor ticks all the way round, accent ticks where a
   stage begins — 0 / 95 / 250, which is where the warm, violet and green
   stretches start once the seven satellites are spaced around the circle. */
const RING_R = 176;
const STAGE_STARTS = [0, 95, 250];
const round = (n: number) => Math.round(n * 100) / 100;

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5;
  const major = STAGE_STARTS.includes(deg);
  const len = major ? 16 : deg % 25 === 0 ? 9 : 5;
  const rad = (deg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    deg,
    major,
    x1: round(200 + RING_R * sin),
    y1: round(200 - RING_R * cos),
    x2: round(200 + (RING_R - len) * sin),
    y2: round(200 - (RING_R - len) * cos),
  };
});

/*
  "animate" draws the section in. "instant" puts it in the same final state
  with every transition switched off, which is the only version that is
  actually safe when nothing is being painted: applying the reveal class is
  not enough on its own, because a transition in a document that is not
  rendering never advances past its start value.
*/
type Reveal = "hidden" | "animate" | "instant";

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const [reveal, setReveal] = useState<Reveal>("hidden");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    /* Reduced motion gets the finished composition immediately. The entrance
       is decoration; the content is the point. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReveal("instant");
      return;
    }

    let settled = false;
    const show = (mode: Reveal) => {
      if (settled) return;
      settled = true;
      setReveal(mode);
    };

    /* Fires once, well before the section pins, so the dial is already drawn
       by the time the reader is looking straight at it. Disconnects on the
       first hit: this is an entrance, not a scroll effect, and there is
       nothing to recompute afterwards. */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        show("animate");
        io.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" }
    );
    io.observe(el);

    /*
      Safety net, and not a theoretical one.

      IntersectionObserver delivers from the rendering steps, so a document
      that is not being painted never gets a callback: a background tab, a
      headless renderer, a print. The section starts at opacity 0 waiting for
      that callback, which means without this it can ship completely blank to
      exactly the readers who cannot tell you it did.

      It resolves to "instant" rather than "animate" deliberately. In those
      same conditions a transition does not advance either, so handing them
      the animated path would leave the section sitting on its opening frame,
      which is the blank page all over again. Timers do keep running, so this
      fires; a real visitor scrolling normally always trips the observer long
      before it.
    */
    const fallback = window.setTimeout(() => show("instant"), 2500);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <section
      className={
        "process" +
        (reveal !== "hidden" ? " process--shown" : "") +
        (reveal === "instant" ? " process--instant" : "")
      }
      ref={sectionRef}
      aria-labelledby="process-heading"
    >
      <div className="process__sticky">
        {/* Torn-paper edge carrying the dark Statement panel above into this
            light one. Untouched: it is what makes the two sections read as
            one continuous sheet. */}
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
          <div className="procHalo">
            {/*
              Dial and claim are one unit. On the desktop dial that is
              incidental — the hub is centred in the field, so anchoring the
              ring here or to the field lands on the same point. On a phone,
              where the satellites drop out of orbit and become a list below,
              it is the whole reason this wrapper exists: the ring has to keep
              its centre on the headline rather than drift down to the middle
              of a column that is now mostly list.
            */}
            <div className="procHalo__hub">
              {/* the dial itself */}
              <div className="procHalo__ring" aria-hidden>
                <svg className="procHalo__ringSvg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                  {TICKS.map((t, i) => (
                    <line
                      key={t.deg}
                      className={"procHalo__tick" + (t.major ? " procHalo__tick--major" : "")}
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      /* --t is the clockwise reveal order the full dial uses.
                       --t2 is the same count anticlockwise, for the phone:
                       there only the left half of the dial is drawn, and a
                       clockwise sweep reaches that half last, so it would
                       appear to fill from the bottom up. */
                    style={{ "--t": i, "--t2": (72 - i) % 72 } as React.CSSProperties}
                    />
                  ))}
                </svg>
                {/* ambient: one faint arc of light going round the dial, slow
                    enough to be atmosphere rather than a spinner */}
                <span className="procHalo__sweep" />
                {/* the lead, exactly once, teaching which way the sequence runs */}
                <span className="procHalo__pen">
                  <span className="procHalo__penDot" />
                </span>
              </div>

              <div className="procHalo__core">
                <span className="procHalo__eyebrow">
                  <span className="procSheet" aria-hidden />
                  <span className="procHalo__eyebrowLabel">Process</span>
                </span>

                <h2 className="process__heading" id="process-heading">
                  How a product gets made.
                </h2>

                <div className="procHalo__cta">
                  {/* Same swap as the satellites: inside a phone-sized dial
                      the full label makes the bar wider than the chord it
                      has to sit on. Only one is ever displayed, so the
                      button is never announced twice. */}
                  <ExtCta href="/work" route>
                    <span className="procHalo__ctaFull">See it in the work</span>
                    <span className="procHalo__ctaShort">See the work</span>
                  </ExtCta>
                </div>
              </div>
            </div>

            <ul className="procHalo__orbit">
              {STEPS.map((s, i) => (
                <li
                  className={"procStep procStep--" + s.side}
                  key={s.label}
                  data-tone={s.tone}
                  style={
                    {
                      "--px": s.px,
                      "--py": s.py,
                      "--mx": s.mx,
                      "--my": s.my,
                      "--i": i,
                    } as React.CSSProperties
                  }
                >
                  <span className="procStep__drift">
                    <span className="procStep__pill">
                      {/* the white surface, which dissolves out to the right
                          from under the label */}
                      <span className="procSheet" aria-hidden />
                      <span className="procStep__tile" aria-hidden>
                        <svg viewBox="0 0 24 24">{GLYPHS[i]}</svg>
                      </span>
                      {/* Both labels ship; CSS shows one. Whichever is
                          displayed is the one assistive tech reads, and
                          display:none keeps the other out of the tree
                          entirely, so the chip is never announced twice. */}
                      <span className="procStep__label">{s.label}</span>
                      <span className="procStep__label procStep__label--short">
                        {s.short}
                      </span>
                    </span>
                  </span>
                </li>
              ))}

            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
