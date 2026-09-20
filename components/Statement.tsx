"use client";

import { useEffect, useRef, useState } from "react";

/*
  Full-screen dark statement canvas — the section after About.

  Transition: this section is one solid rectangular panel (flat top edge,
  z-index above the About stage) pulled up 100vh, so it physically rises
  over the PINNED About section as the user scrolls — About stays behind,
  never animating itself.

  Inside, three depth planes:
    PLANE 1  .dotsLight — a static CSS dot lattice, nothing more
    PLANE 2  .statement__inner typography (slight scroll drift)
    PLANE 3  .toolTile four premium glass tiles (3D float + cursor tilt)

  The word / ruler reveal is DELAYED — it begins only once the panel has
  clearly entered the viewport (rise ≳ 0.45) and finishes while the section
  is fully visible, so the full sequence plays under the user's eye rather
  than half-completing during the rise.
*/

/*
  `br` breaks the line on a desktop-width screen; `brPhone` breaks it only on
  a phone. They are separate flags because the two compositions break in
  different places: the wide one splits the sentence into three balanced
  lines, the phone one puts "5+ years" alone on the first line and lets the
  rest wrap naturally under it.
*/
const WORDS: { t: string; strong?: boolean; br?: boolean; brPhone?: boolean; isDot?: boolean }[] = [
  { t: "5+", strong: true },
  { t: "years", strong: true, brPhone: true },
  { t: "of" },
  { t: "turning", br: true },
  { t: "complex" },
  { t: "ideas" },
  { t: "into" },
  { t: "products", br: true },
  { t: "people" },
  { t: "want" },
  { t: "to" },
  { t: "use" },
  { t: ".", isDot: true },
];

function FigmaMark() {
  return (
    <svg viewBox="0 0 24 36" fill="none" aria-hidden>
      <path d="M12 0H6a6 6 0 0 0 0 12h6V0Z" fill="#F24E1E" />
      <path d="M12 0h6a6 6 0 0 1 0 12h-6V0Z" fill="#FF7262" />
      <path d="M12 12H6a6 6 0 0 0 0 12h6V12Z" fill="#A259FF" />
      <path d="M18 24a6 6 0 1 0 0-12h-6v6a6 6 0 0 0 6 6Z" fill="#1ABCFE" />
      <path d="M12 24H6a6 6 0 1 0 6 6v-6Z" fill="#0ACF83" />
    </svg>
  );
}

function FramerMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 0h16v8h-8ZM4 8h8l8 8H4ZM4 16h8v8Z" fill="#F2EDE6" />
    </svg>
  );
}

function ClaudeMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <g fill="#D97757">
        <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" />
        <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(45 12 12)" />
        <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(90 12 12)" />
        <rect x="10.8" y="1" width="2.4" height="22" rx="1.2" transform="rotate(135 12 12)" />
      </g>
    </svg>
  );
}

function AdobeSuiteMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14.65 3H22v14.7L14.65 3z" fill="#FF2200" />
      <path d="M9.35 3H2v14.7L9.35 3z" fill="#FA0F00" />
      <path d="M12 8.7L19.7 21H15.4L12 15.6L8.6 21H4.3L12 8.7z" fill="#ED1C24" />
    </svg>
  );
}

const TOOLS = [
  { id: "figma", label: "Figma", icon: <FigmaMark /> },
  { id: "framer", label: "Framer", icon: <FramerMark /> },
  { id: "claude", label: "Claude", icon: <ClaudeMark /> },
  { id: "vector", label: "Adobe Suite", icon: <AdobeSuiteMark /> },
];

export default function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const toolRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      section.style.setProperty("--tp", "1");
      section.style.setProperty("--lineP", "1");
      return;
    }

    /*
      Nothing on this panel tracks the pointer any more.

      There used to be a canvas here holding a heat buffer over a 16px dot
      lattice, brightening every dot within 165px of the cursor and decaying
      it behind them. It is gone by request, along with the pointermove
      listener that fed it. The dots the panel shows are .dotsLight, a static
      CSS lattice that was always the base layer underneath, so the panel
      looks the same at rest and simply stops answering the mouse.

      It also takes a real cost out of the frame: the loop was walking every
      cell of that lattice, about seven thousand of them on a 1440x900
      window, on every frame the cursor was anywhere near the section.
    */

    /* Nothing here measures the tiles any more. Their smoothed per-tile
       cursor proximity, and the box geometry it needed, went with the
       tilt below. */

    let raf = 0;
    let shown = false;

    /* This loop reads layout and writes styles every frame. Left
       unconditional it ran for the entire life of the page — including the
       whole scroll past Projects, Services and the footer — which is pure
       main-thread cost with nothing on screen to show for it. Park it
       unless the panel is actually near the viewport.

       Starts true so the very first frames run and seed --tp/--lineP even
       before the observer's first (async) callback — the word reveal reads
       those, and a panel that never got a value would render its text at
       the 0.22 opacity floor. The observer parks it a frame later if the
       panel is nowhere near the viewport. */
    let visible = true;
    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(section);

    /* read per frame in the loop - `matches` is a cached boolean, unlike
       window.innerWidth, which is a layout read */
    const phoneMq = window.matchMedia("(max-width: 640px)");

    let lastTp = "";
    let lastLp = "";
    const lastTileT: string[] = [];

    const loop = () => {
      raf = 0;
      if (!visible) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const rise = Math.min(1, Math.max(0, 1 - r.top / vh));

      // logos enter once the panel has clearly covered the viewport
      if (!shown && rise > 0.6) {
        shown = true;
        setRevealed(true);
      }

      /*
        DELAYED reveal window, measured in viewport travel rather than in
        fractions of the section: it begins at 60% visibility (r.top = 0.4vh)
        and completes once the panel has pushed a further screen past the top.

        Because it is viewport travel, the section has to be TALL ENOUGH for
        r.top to reach the end trigger while the sticky child is still pinned
        - the child unpins at r.top = -(height - vh), so a 1.0vh end trigger
        needs at least 200svh. That coupling is the whole reason the phone
        window is shorter rather than the phone section simply being cut: at
        150svh against the desktop triggers, r.top bottoms out at -0.5vh, `p`
        peaks at 0.64, and the last third of the sentence never brightens and
        the period never pops.

        The phone window is 0.75vh of travel against the desktop's 1.4vh, so
        the same sequence plays out in a little over half the scrolling.
      */
      const phone = phoneMq.matches;
      const startTrigger = (phone ? 0.3 : 0.4) * vh;
      const endTrigger = (phone ? -0.45 : -1.0) * vh;
      const p = Math.min(1, Math.max(0, (startTrigger - r.top) / (startTrigger - endTrigger)));

      /* --tp and --lineP are read by every word span's calc(), so each write
         invalidates style for the whole block. Skip the write when the value
         is unchanged (it is, for most frames of a slow scroll). */
      const tp = p.toFixed(4);
      if (tp !== lastTp) {
        lastTp = tp;
        section.style.setProperty("--tp", tp);
      }

      const lp = Math.min(1, p * 1.3).toFixed(4);
      if (lp !== lastLp) {
        lastLp = lp;
        section.style.setProperty("--lineP", lp);
      }

      // scroll drift of the typography plane is removed to keep it fully pinned
      const sp = Math.min(1, Math.max(0, -r.top / vh));

      // dot animation trigger
      if (dotRef.current) {
        if (p > 0.99) {
          dotRef.current.classList.add("animated-period--active");
        } else {
          dotRef.current.classList.remove("animated-period--active");
        }
      }

      /*
        Tools: scroll parallax only.

        These used to tilt toward the cursor and drift after it, on a
        per-tile lerped proximity, and the CSS gave them a lift and a violet
        border on hover. All of it is gone by request, so the panel no longer
        answers the mouse at all. The one transform left is driven by scroll
        position, which the reader does not aim.
      */
      const tileT = `translate3d(0px, ${(-sp * 40).toFixed(1)}px, 0)`;
      toolRefs.current.forEach((el, i) => {
        if (!el) return;
        if (tileT !== lastTileT[i]) {
          lastTileT[i] = tileT;
          el.style.transform = tileT;
        }
      });

      raf = requestAnimationFrame(loop);
    };

    const onResize = () => wake();
    window.addEventListener("resize", onResize, { passive: true });

    wake();

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      className={`statement${revealed ? " statement--revealed" : ""}`}
      id="statement"
      ref={sectionRef}
      /*
        No minHeight here.

        It used to be 250svh, inline, which beats any stylesheet - so the
        phone rule that tried to shorten this section had never once applied
        and a phone was scrolling two and a half screens to read one
        sentence. The height is the section's scroll budget (everything here
        is scrubbed from progress through it), so it belongs with the rest of
        the composition in globals.css, where a phone can be given less of it.
      */
      style={{
        display: "block",
        padding: 0,
        overflow: "visible",
      }}
    >
      <div 
        className="statement__sticky dotsLight"
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "clamp(72px, 12vh, 120px) clamp(20px, 5vw, 64px)",
        }}
      >
        <style>{`
          .animated-period {
            display: inline-block;
            transform-origin: bottom center;
          }
          .animated-period--active {
            animation: periodPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          @keyframes periodPop {
            0% { transform: scale(1) translateY(0) rotate(0); color: inherit; }
            40% { transform: scale(1.5) translateY(-8px) rotate(10deg); color: #8B5CF6; }
            100% { transform: scale(1) translateY(0) rotate(0); color: inherit; }
          }
          .statement__rulerGap {
            flex: 0 0 min(68vw, 980px) !important;
          }
          @media (min-width: 641px) {
            .statement__br--desktop { display: block; }
            .statement__br--phone { display: none; }
            .statement__text { text-wrap: unset !important; }
          }
          @media (max-width: 640px) {
            .statement__br--desktop { display: none; }
            .statement__br--phone { display: block; }
          }
        `}</style>

        {/* ruler frame — same architecture as the hero (.heroRuler): two
            light vertical rails at the shared --page-rail-inset, plus a flex
            row whose central gap is a protected clearance zone, so the
            horizontal segments grow inward from the rails but can never
            enter the headline area. Segments scaleX scrubbed by --lineP. */}
        <div className="statement__ruler" aria-hidden>
          <span className="statement__rail statement__rail--left" />
          <span className="statement__rail statement__rail--right" />
          <div className="statement__rulerRow">
            <span className="statement__seg statement__seg--left" />
            <span className="statement__rulerGap" />
            <span className="statement__seg statement__seg--right" />
          </div>
        </div>
        
        {/* Mobile wavy line behind the vector tool */}
        <div className="statement__wavyLine" aria-hidden>
          <svg viewBox="0 0 400 100" fill="none" preserveAspectRatio="none">
            <path d="M-10,70 Q90,30 200,80 T410,20" stroke="var(--cream)" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="statement__inner" ref={innerRef}>
          <h2 className="statement__text">
            {WORDS.map((w, i) => (
              <span key={i} style={{ display: "contents" }}>
                <span
                  ref={w.isDot ? dotRef : null}
                  className={`statement__word${w.strong ? " statement__word--strong" : ""}${w.isDot ? " animated-period" : ""}`}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {w.t}
                </span>
                {i < WORDS.length - 1 && !WORDS[i + 1]?.isDot ? " " : ""}
                {w.br ? <br className="statement__br--desktop" /> : null}
                {w.brPhone ? <br className="statement__br--phone" /> : null}
              </span>
            ))}
          </h2>
        </div>

      <div className="statement__tools">
        {TOOLS.map((tool, i) => (
          <div
            key={tool.id}
            className={`toolTile toolTile--${tool.id}`}
            ref={(el) => {
              toolRefs.current[i] = el;
            }}
          >
            <span className="toolTile__enter">
              <span className="toolTile__obj">{tool.icon}</span>
              <span className="toolTile__label">{tool.label}</span>
            </span>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
