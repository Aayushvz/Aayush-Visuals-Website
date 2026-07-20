"use client";

import { useEffect, useRef, useState } from "react";

/*
  Full-screen dark statement canvas — the section after About.

  Transition: this section is one solid rectangular panel (flat top edge,
  z-index above the About stage) pulled up 100vh, so it physically rises
  over the PINNED About section as the user scrolls — About stays behind,
  never animating itself.

  Inside, three depth planes:
    PLANE 1  .dotsLight base + .statement__dotsCanvas magnetic glow
    PLANE 2  .statement__inner typography (slight scroll drift)
    PLANE 3  .toolTile four premium glass tiles (3D float + cursor tilt)

  The word / ruler reveal is DELAYED — it begins only once the panel has
  clearly entered the viewport (rise ≳ 0.45) and finishes while the section
  is fully visible, so the full sequence plays under the user's eye rather
  than half-completing during the rise.
*/

const WORDS: { t: string; strong?: boolean; br?: boolean; isDot?: boolean }[] = [
  { t: "4+", strong: true },
  { t: "years", strong: true },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const fine = window.matchMedia("(pointer: fine)").matches;

    // last pointer in viewport coords; the loop converts to section-local
    // each frame so it stays correct while the panel is still rising
    const ptr = { cx: -9999, cy: -9999 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    // ---- magnetic dot field ----
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext("2d") : null;
    const GAP = 16;
    const OFF = 8;
    const RADIUS = 165;
    const DECAY = 0.9;
    let cw = 0;
    let ch = 0;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    let heatActive = false;
    if (ctx) ctx.fillStyle = "rgba(244, 241, 234, 1)";

    // ---- per-tile smoothed cursor proximity ----
    const tState = TOOLS.map(() => ({ p: 0, dx: 0, dy: 0 }));

    let raf = 0;
    let shown = false;
    const loop = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const rise = Math.min(1, Math.max(0, 1 - r.top / vh));

      // logos enter once the panel has clearly covered the viewport
      if (!shown && rise > 0.6) {
        shown = true;
        setRevealed(true);
      }

      // DELAYED reveal window: begin at 60% visibility (r.top = 0.4 * vh).
      // Pin/hold continues for 140vh scroll distance (r.top = -1.0 * vh).
      const startTrigger = 0.4 * vh;
      const endTrigger = -1.0 * vh;
      const p = Math.min(1, Math.max(0, (startTrigger - r.top) / (startTrigger - endTrigger)));

      section.style.setProperty("--tp", p.toFixed(4));
      
      const lp = Math.min(1, p * 1.3);
      section.style.setProperty("--lineP", lp.toFixed(4));

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

      // is the pointer over the section right now?
      const inside =
        fine &&
        ptr.cx >= r.left &&
        ptr.cx <= r.right &&
        ptr.cy >= r.top &&
        ptr.cy <= r.bottom;

      // ---- dots ----
      if (canvas && ctx) {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        if (w !== cw || h !== ch) {
          cw = w;
          ch = h;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.max(1, Math.round(w * dpr));
          canvas.height = Math.max(1, Math.round(h * dpr));
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = "rgba(244, 241, 234, 1)";
          cols = Math.ceil(w / GAP) + 1;
          rows = Math.ceil(h / GAP) + 1;
          heat = new Float32Array(cols * rows);
        }

        const px = ptr.cx;
        const py = ptr.cy;

        if (inside || heatActive) {
          ctx.clearRect(0, 0, w, h);
          let anyHeat = false;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const i = row * cols + col;
              if (inside) {
                const dx = col * GAP + OFF - px;
                const dy = row * GAP + OFF - py;
                const d = Math.hypot(dx, dy);
                if (d < RADIUS) {
                  const f = Math.pow(1 - d / RADIUS, 1.8);
                  if (f > heat[i]) heat[i] = f;
                }
              }
              const hv = heat[i];
              heat[i] = hv > 0.01 ? hv * DECAY : 0;
              if (heat[i] > 0) anyHeat = true;
              if (hv > 0.02) {
                ctx.globalAlpha = hv * 0.55;
                ctx.beginPath();
                ctx.arc(col * GAP + OFF, row * GAP + OFF, 1 + hv * 0.7, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.globalAlpha = 1;
          heatActive = inside || anyHeat;
        }
      }

      // ---- tools: proximity-driven 3D tilt + magnetic pull, all lerped ----
      toolRefs.current.forEach((el, i) => {
        if (!el) return;
        const s = tState[i];
        const cx0 = r.left + el.offsetLeft + el.offsetWidth / 2;
        const cy0 = r.top + el.offsetTop + el.offsetHeight / 2;
        const dx = ptr.cx - cx0;
        const dy = ptr.cy - cy0;
        const dist = Math.hypot(dx, dy) || 1;
        const prox = inside ? Math.max(0, 1 - dist / 320) : 0;
        s.p += (prox - s.p) * 0.08;
        s.dx += (dx / dist - s.dx) * 0.08;
        s.dy += (dy / dist - s.dy) * 0.08;
        const pull = s.p;
        const tx = s.dx * 10 * pull;
        const ty = s.dy * 10 * pull - sp * 40;
        const ry = s.dx * 6 * pull; // tilt toward cursor horizontally
        const rx = -s.dy * 6 * pull; // and vertically
        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (fine) window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section
      className={`statement${revealed ? " statement--revealed" : ""}`}
      id="statement"
      ref={sectionRef}
      style={{
        display: "block",
        padding: 0,
        overflow: "visible",
        minHeight: "250svh",
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
            .statement__text { text-wrap: unset !important; }
          }
          @media (max-width: 640px) {
            .statement__br--desktop { display: none; }
          }
        `}</style>

        {/* magnetic light field: additive glow over the static CSS base dots */}
        <canvas className="statement__dotsCanvas" ref={canvasRef} aria-hidden />

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
